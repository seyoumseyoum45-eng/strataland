'use client';

// =============================================================
// STRATALAND — StratMap Component
// Leaflet + OpenStreetMap + Natural Earth GeoJSON boundaries
// PostGIS-backed deposit markers with clustering
//
// Dependencies (install via npm):
//   leaflet ^1.9
//   leaflet.markercluster ^1.5
//   @types/leaflet
// =============================================================

import { useEffect, useRef, useCallback } from 'react';
import type { Map as LMap, LayerGroup, GeoJSON as LGeoJSON } from 'leaflet';
import type { DepositGeoJSON, DepositFeatureProperties, MapFilters } from '@/types';

// ── Constants ─────────────────────────────────────────────────

const OSM_TILE_URL   = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_TILE_ATTR  = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Stamen Toner Lite — cleaner dark alternative (no API key)
const DARK_TILE_URL  = 'https://stamen-tiles-{s}.a.ssl.fastly.net/toner-background/{z}/{x}/{y}.png';
const DARK_TILE_ATTR = 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under CC BY 3.0. Data &copy; OpenStreetMap contributors';

// Natural Earth GeoJSON — low-res world boundaries (~250KB, hosted on public CDN)
const NATURAL_EARTH_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';

// Graticule grid definition
const GRATICULE_LATS = [-90, -60, -30, 0, 30, 60, 90];
const GRATICULE_LONS = [-180, -120, -60, 0, 60, 120, 180];

// Deposit status → border color for marker ring
const STATUS_RING: Record<string, string> = {
  producing:          '#10b981',
  past_producing:     '#f59e0b',
  undeveloped:        '#64748b',
  exploration:        '#3b82f6',
  feasibility:        '#8b5cf6',
  construction:       '#f97316',
  care_and_maintenance:'#94a3b8',
  unknown:            '#334155',
};

// Marker pixel sizes by resource magnitude
const MARKER_SIZES: Record<string, number> = {
  xl: 18,
  lg: 14,
  md: 10,
  sm:  7,
};

// ── Props ─────────────────────────────────────────────────────

interface StratMapProps {
  /** GeoJSON from /api/deposits/geojson */
  geojson: DepositGeoJSON | null;
  /** Currently selected deposit id */
  selectedId?: string | null;
  /** Called when user clicks a deposit marker */
  onDepositSelect?: (id: string) => void;
  /** Active filters — used to re-fetch/filter client-side */
  filters?: Partial<MapFilters>;
  /** Map theme */
  theme?: 'dark' | 'light';
  /** Initial map centre */
  center?: [number, number];
  /** Initial zoom level */
  zoom?: number;
  className?: string;
}

// ── Component ─────────────────────────────────────────────────

export default function StratMap({
  geojson,
  selectedId,
  onDepositSelect,
  filters,
  theme = 'dark',
  center = [20, 10],
  zoom = 3,
  className = '',
}: StratMapProps) {
  const containerRef   = useRef<HTMLDivElement>(null);
  const mapRef         = useRef<LMap | null>(null);
  const markersRef     = useRef<any>(null);   // MarkerClusterGroup
  const countriesRef   = useRef<LGeoJSON | null>(null);
  const graticuleRef   = useRef<LayerGroup | null>(null);
  const tileLayerRef   = useRef<any>(null);

  // ── Build SVG marker HTML ──────────────────────────────────
  const buildMarkerIcon = useCallback(
    (props: DepositFeatureProperties, isSelected: boolean) => {
      const L = (window as any).L as typeof import('leaflet');
      const size  = MARKER_SIZES[props.marker_size] ?? 10;
      const ring  = STATUS_RING[props.status]  ?? '#64748b';
      const fill  = props.mineral_color        ?? '#64748b';
      const glow  = isSelected ? `box-shadow:0 0 0 3px ${fill}55,0 0 12px ${fill}88;` : '';
      const scale = isSelected ? 'transform:scale(1.5);' : '';
      const total = size + 8; // total div size including ring padding

      const html = `
        <div style="
          width:${total}px;height:${total}px;
          border-radius:50%;
          border:1.5px solid ${ring};
          display:flex;align-items:center;justify-content:center;
          background:rgba(10,12,15,0.7);
          transition:transform .15s,box-shadow .15s;
          ${glow}${scale}
        ">
          <div style="
            width:${size}px;height:${size}px;
            border-radius:50%;
            background:${fill};
          "></div>
        </div>
      `;

      return L.divIcon({
        html,
        className: '',
        iconSize:   [total, total],
        iconAnchor: [total / 2, total / 2],
        popupAnchor:[0, -(total / 2)],
      });
    },
    []
  );

  // ── Build popup HTML ───────────────────────────────────────
  const buildPopup = useCallback((props: DepositFeatureProperties): string => {
    const ring  = STATUS_RING[props.status] ?? '#64748b';
    const fill  = props.mineral_color       ?? '#64748b';
    const confColor = props.data_confidence === 'high'
      ? '#10b981' : props.data_confidence === 'medium' ? '#f59e0b' : '#ef4444';

    const statusLabel = props.status.replace(/_/g, ' ').toUpperCase();
    const confLabel   = props.data_confidence.toUpperCase();

    const secondaryHTML = props.secondary_minerals?.length
      ? `<div style="margin-top:6px;font-size:9px;color:#5c6670;">
           Also: ${props.secondary_minerals.slice(0, 4).join(' · ')}
         </div>`
      : '';

    const flagHTML = props.flags?.length
      ? `<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:3px;">
           ${props.flags.slice(0,3).map(f =>
             `<span style="font-size:8px;padding:1px 5px;border-radius:2px;background:rgba(255,255,255,0.06);color:#9aa3af;letter-spacing:.3px;">${f.replace(/_/g,' ')}</span>`
           ).join('')}
         </div>`
      : '';

    return `
      <div style="
        font-family:'SF Mono',Consolas,monospace;
        background:#111418;
        border:1px solid rgba(255,255,255,0.1);
        border-radius:4px;
        padding:12px 14px;
        min-width:220px;
        color:#e8eaed;
      ">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <div style="width:10px;height:10px;border-radius:50%;background:${fill};flex-shrink:0;"></div>
          <div style="font-size:13px;font-weight:600;letter-spacing:.3px;line-height:1.2;">${props.name}</div>
        </div>

        <div style="font-size:10px;color:#cd7c3f;margin-bottom:8px;letter-spacing:.3px;">
          ▶ ${props.country}${props.region ? ` · ${props.region}` : ''}
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:10px;">
          <tr>
            <td style="color:#5c6670;padding:3px 0;letter-spacing:.4px;">PRIMARY MINERAL</td>
            <td style="text-align:right;color:#e8eaed;font-weight:500;">${props.primary_mineral}</td>
          </tr>
          <tr>
            <td style="color:#5c6670;padding:3px 0;letter-spacing:.4px;">TYPE</td>
            <td style="text-align:right;color:#9aa3af;">${props.deposit_type}</td>
          </tr>
          <tr>
            <td style="color:#5c6670;padding:3px 0;letter-spacing:.4px;">STATUS</td>
            <td style="text-align:right;">
              <span style="font-size:9px;font-weight:700;letter-spacing:.5px;color:${ring};background:${ring}22;padding:1px 6px;border-radius:2px;">${statusLabel}</span>
            </td>
          </tr>
          <tr>
            <td style="color:#5c6670;padding:3px 0;letter-spacing:.4px;">RESOURCE</td>
            <td style="text-align:right;color:#9aa3af;">${props.resource_size_label}</td>
          </tr>
        </table>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:8px 0;">
          <div style="background:#161b21;border:1px solid rgba(255,255,255,0.07);padding:6px;border-radius:3px;">
            <div style="font-size:8px;color:#5c6670;letter-spacing:.5px;margin-bottom:2px;">OPPORTUNITY</div>
            <div style="font-size:16px;font-weight:700;color:#10b981;">${props.opportunity_score ?? '—'}</div>
          </div>
          <div style="background:#161b21;border:1px solid rgba(255,255,255,0.07);padding:6px;border-radius:3px;">
            <div style="font-size:8px;color:#5c6670;letter-spacing:.5px;margin-bottom:2px;">DIFFICULTY</div>
            <div style="font-size:16px;font-weight:700;color:#f59e0b;">${props.difficulty_score ?? '—'}</div>
          </div>
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;font-size:9px;color:#5c6670;">
          <span>DATA CONFIDENCE: <strong style="color:${confColor}">${confLabel}</strong></span>
          <span>${props.source_count} source${props.source_count !== 1 ? 's' : ''}</span>
        </div>

        ${secondaryHTML}
        ${flagHTML}

        <div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.06);">
          <button
            onclick="window.strataSelectDeposit('${props.id}')"
            style="
              width:100%;padding:6px;
              background:rgba(16,185,129,0.1);
              border:1px solid #059669;
              color:#10b981;
              font-family:inherit;font-size:10px;
              letter-spacing:.5px;border-radius:3px;
              cursor:pointer;
            "
          >VIEW FULL DEPOSIT ▶</button>
        </div>
      </div>
    `;
  }, []);

  // ── Initialise Leaflet once ────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || mapRef.current) return;

    // Leaflet must be loaded client-side
    Promise.all([
      import('leaflet'),
      // @ts-ignore — no typings for clustering plugin
      import('leaflet.markercluster'),
    ]).then(([L]) => {
      if (!containerRef.current || mapRef.current) return;

      // Fix default icon path for Next.js bundling
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      // ── Create map ──────────────────────────────────────────
      const map = L.map(containerRef.current!, {
        center,
        zoom,
        zoomControl: false,
        attributionControl: false,
        preferCanvas: true,        // better perf for 10k+ markers
        worldCopyJump: true,
        maxBoundsViscosity: 0.8,
      });

      mapRef.current = map;

      // ── Tile layer ──────────────────────────────────────────
      const tileUrl  = theme === 'dark' ? DARK_TILE_URL  : OSM_TILE_URL;
      const tileAttr = theme === 'dark' ? DARK_TILE_ATTR : OSM_TILE_ATTR;

      tileLayerRef.current = L.tileLayer(tileUrl, {
        attribution: tileAttr,
        maxZoom: 18,
        opacity: theme === 'dark' ? 0.55 : 0.8,
        className: 'strataland-tiles',
      }).addTo(map);

      // ── Attribution (minimal) ───────────────────────────────
      L.control.attribution({ position: 'bottomright', prefix: '' }).addTo(map);

      // ── Zoom control (custom position) ─────────────────────
      L.control.zoom({ position: 'topright' }).addTo(map);

      // ── Natural Earth country boundaries ───────────────────
      fetch(NATURAL_EARTH_URL)
        .then((r) => r.json())
        .then((worldGeoJSON) => {
          countriesRef.current = L.geoJSON(worldGeoJSON, {
            style: {
              color:       theme === 'dark' ? 'rgba(100,116,139,0.55)' : 'rgba(100,116,139,0.4)',
              weight:      0.6,
              fillColor:   theme === 'dark' ? '#1a2030' : '#e8eaed',
              fillOpacity: theme === 'dark' ? 0.85 : 0.3,
              opacity:     1,
            },
          }).addTo(map);
        })
        .catch((err) => console.error('[StratMap] Failed to load Natural Earth GeoJSON:', err));

      // ── Graticule (lat/lon grid) ────────────────────────────
      const graticuleGroup = L.layerGroup().addTo(map);
      graticuleRef.current = graticuleGroup;

      const gridStyle = {
        color:    'rgba(255,255,255,0.06)',
        weight:   0.5,
        opacity:  1,
        dashArray: undefined as any,
      };
      const equatorStyle  = { ...gridStyle, color: 'rgba(255,255,255,0.18)', weight: 1 };
      const meridianStyle = { ...gridStyle, color: 'rgba(255,255,255,0.18)', weight: 1 };

      // Latitude lines (horizontal)
      GRATICULE_LATS.forEach((lat) => {
        const style = lat === 0 ? equatorStyle : gridStyle;
        L.polyline([
          [lat, -180],
          [lat,  180],
        ], style).addTo(graticuleGroup);

        // Equator label
        if (lat === 0) {
          L.marker([lat + 1.5, -175], {
            icon: L.divIcon({
              html: `<span style="font-family:'SF Mono',monospace;font-size:9px;color:rgba(255,255,255,0.35);letter-spacing:.8px;white-space:nowrap;">EQUATOR</span>`,
              className: '',
              iconAnchor: [0, 0],
            }),
            interactive: false,
          }).addTo(graticuleGroup);
        }

        // Latitude degree label
        const label = lat === 0 ? '' : `${Math.abs(lat)}°${lat > 0 ? 'N' : 'S'}`;
        if (label) {
          L.marker([lat, -178], {
            icon: L.divIcon({
              html: `<span style="font-family:'SF Mono',monospace;font-size:8px;color:rgba(255,255,255,0.22);white-space:nowrap;">${label}</span>`,
              className: '',
              iconAnchor: [0, 6],
            }),
            interactive: false,
          }).addTo(graticuleGroup);
        }
      });

      // Longitude lines (vertical)
      GRATICULE_LONS.forEach((lon) => {
        const style = lon === 0 ? meridianStyle : gridStyle;
        L.polyline([
          [-90, lon],
          [ 90, lon],
        ], style).addTo(graticuleGroup);

        // Prime Meridian label
        if (lon === 0) {
          L.marker([82, lon + 1], {
            icon: L.divIcon({
              html: `<span style="font-family:'SF Mono',monospace;font-size:9px;color:rgba(255,255,255,0.35);letter-spacing:.8px;white-space:nowrap;">PRIME MERIDIAN</span>`,
              className: '',
              iconAnchor: [0, 0],
            }),
            interactive: false,
          }).addTo(graticuleGroup);
        }

        // Longitude degree label
        const label = lon === 0 ? '' : `${Math.abs(lon)}°${lon > 0 ? 'E' : 'W'}`;
        if (label) {
          L.marker([-87, lon], {
            icon: L.divIcon({
              html: `<span style="font-family:'SF Mono',monospace;font-size:8px;color:rgba(255,255,255,0.22);white-space:nowrap;">${label}</span>`,
              className: '',
              iconAnchor: [12, 0],
            }),
            interactive: false,
          }).addTo(graticuleGroup);
        }
      });

      // ── Marker cluster group ────────────────────────────────
      const clusterGroup = (L as any).markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        disableClusteringAtZoom: 8,

        // Custom cluster icon — matches StrataLand dark theme
        iconCreateFunction: (cluster: any) => {
          const count = cluster.getChildCount();
          const size  = count > 100 ? 44 : count > 20 ? 36 : 28;
          return L.divIcon({
            html: `
              <div style="
                width:${size}px;height:${size}px;border-radius:50%;
                background:rgba(16,185,129,0.15);
                border:1px solid rgba(16,185,129,0.5);
                display:flex;align-items:center;justify-content:center;
                font-family:'SF Mono',monospace;font-size:${size < 36 ? 9 : 11}px;
                color:#10b981;font-weight:700;
              ">${count}</div>
            `,
            className: '',
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          });
        },
      });

      markersRef.current = clusterGroup;
      map.addLayer(clusterGroup);

      // ── Global callback for popup button ───────────────────
      (window as any).strataSelectDeposit = (id: string) => {
        map.closePopup();
        onDepositSelect?.(id);
      };
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync deposit markers when geojson changes ──────────────
  useEffect(() => {
    if (!mapRef.current || !markersRef.current || !geojson) return;

    const L = (window as any).L as typeof import('leaflet');
    if (!L) return;

    markersRef.current.clearLayers();

    geojson.features.forEach((feature) => {
      const { properties: props } = feature;
      const [lon, lat] = feature.geometry.coordinates;

      const isSelected = props.id === selectedId;
      const icon = buildMarkerIcon(props, isSelected);
      const popup = L.popup({
        className:   'strataland-popup',
        maxWidth:    280,
        closeButton: false,
        offset:      [0, -5],
      }).setContent(buildPopup(props));

      const marker = L.marker([lat, lon], { icon })
        .bindPopup(popup)
        .on('click', () => {
          onDepositSelect?.(props.id);
        });

      markersRef.current.addLayer(marker);
    });
  }, [geojson, selectedId, buildMarkerIcon, buildPopup, onDepositSelect]);

  // ── Pan to selected deposit ────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !selectedId || !geojson) return;
    const feature = geojson.features.find(
      (f) => f.properties.id === selectedId
    );
    if (!feature) return;
    const [lon, lat] = feature.geometry.coordinates;
    mapRef.current.setView([lat, lon], Math.max(mapRef.current.getZoom(), 6), {
      animate: true,
      duration: 0.8,
    });
  }, [selectedId, geojson]);

  // ── CSS injected once ──────────────────────────────────────
  useEffect(() => {
    const id = 'strataland-map-styles';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      .strataland-tiles { filter: brightness(0.65) saturate(0.3) hue-rotate(190deg); }
      .strataland-popup .leaflet-popup-content-wrapper {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
      }
      .strataland-popup .leaflet-popup-content { margin: 0 !important; }
      .strataland-popup .leaflet-popup-tip-container { display: none; }
      .leaflet-container { background: #0a0c0f; cursor: crosshair; }
      .marker-cluster-small, .marker-cluster-medium, .marker-cluster-large {
        background: transparent !important;
      }
      .marker-cluster-small div, .marker-cluster-medium div, .marker-cluster-large div {
        background: transparent !important;
      }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`strataland-map-root ${className}`}
      style={{ width: '100%', height: '100%', background: '#0a0c0f' }}
      aria-label="StrataLand global mineral deposit map"
      role="application"
    />
  );
}
