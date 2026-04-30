"use client";
// StratMap — real Leaflet map, client-only
// Preserves: stable init, double-init guard, SSR safety
// Upgrades:  radar pulse markers, cyan country borders, intelligence grid
import { useEffect, useRef, useState } from 'react';
import type { Deposit } from '@/types';

interface Props {
  deposits?: Deposit[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMapReady?: (flyTo: (lat: number, lon: number, zoom?: number) => void) => void;
}

// Intelligence-grade mineral colors — exact spec
const MINERAL_COLORS: Record<string, string> = {
  'Lithium':     '#25f5a6',
  'Copper':      '#ff7a22',
  'Cobalt':      '#3f8cff',
  'Nickel':      '#27d8b2',
  'Rare Earths': '#a855f7',
  'Uranium':     '#f6b93b',
  'Graphite':    '#94a3b8',
  'Manganese':   '#22d3ee',
  'Tantalum':    '#ffffff',
};

function getMineralColor(mineral: string): string {
  return MINERAL_COLORS[mineral] || '#00ffd5';
}

function markerRadius(t: number | null): number {
  if (!t) return 8;
  if (t > 5e9) return 14;
  if (t > 1e9) return 11;
  if (t > 2e8) return 9;
  return 8;
}

function resourceLabel(t: number | null): string {
  if (!t) return '—';
  if (t >= 1e9) return `${(t / 1e9).toFixed(1)} Bt`;
  return `${(t / 1e6).toFixed(0)} Mt`;
}

function ensureLeafletCSS() {
  if (document.getElementById('leaflet-css')) return;
  const link = document.createElement('link');
  link.id = 'leaflet-css';
  link.rel = 'stylesheet';
  link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
  document.head.appendChild(link);
}

function ensureMapCSS() {
  if (document.getElementById('strataland-map-css')) return;
  const s = document.createElement('style');
  s.id = 'strataland-map-css';
  s.textContent = `
    .leaflet-container { background: #010a12 !important; }

    /* ── Ocean colour fix ──────────────────────────────────────
       Carto Dark Matter tiles are gray-dominant.
       hue-rotate(195deg) pushes ocean toward navy/teal.
       saturate(0.9) keeps it from going too blue-green.
       brightness(0.72) darkens everything — ocean becomes near-black.
       contrast(1.15) restores land/coast sharpness.
    ─────────────────────────────────────────────────────────── */
    .leaflet-tile-pane {
      filter: hue-rotate(195deg) saturate(0.9) brightness(0.72) contrast(1.15);
    }

    /* Dark translucent overlay — pane sits above tiles, below markers */
    .leaflet-overlay-pane { pointer-events: none; }

    /* Popup reset */
    .leaflet-popup-content-wrapper {
      background: transparent !important; border: none !important;
      padding: 0 !important; box-shadow: none !important; border-radius: 0 !important;
    }
    .leaflet-popup-content { margin: 0 !important; }
    .leaflet-popup-tip-container { display: none !important; }

    /* Attribution */
    .leaflet-control-attribution {
      background: rgba(1,10,18,0.9) !important; color: #1e3a4a !important; font-size: 9px !important;
    }
    .leaflet-control-attribution a { color: #1e3a4a !important; }

    /* Zoom */
    .leaflet-control-zoom {
      border: 1px solid rgba(0,234,255,0.2) !important; border-radius: 8px !important;
      overflow: hidden; margin-bottom: 16px !important; margin-right: 14px !important;
    }
    .leaflet-control-zoom a {
      background: #060e18 !important; color: #00eaff !important;
      border-color: rgba(0,234,255,0.08) !important;
      width: 34px !important; height: 34px !important; line-height: 34px !important;
      font-size: 18px !important; font-weight: 300 !important;
    }
    .leaflet-control-zoom a:hover { background: #0c1a28 !important; color: #fff !important; }

    /* Marker */
    .radar-marker-wrap { overflow: visible !important; cursor: pointer; background: transparent !important; }

    /* Animations */
    @keyframes radarPulse  {
      0%   { transform:scale(1);   opacity:0.75 }
      80%  { transform:scale(3.8); opacity:0    }
      100% { transform:scale(3.8); opacity:0    }
    }
    @keyframes radarPulse2 {
      0%   { transform:scale(1);   opacity:0.45 }
      80%  { transform:scale(2.4); opacity:0    }
      100% { transform:scale(2.4); opacity:0    }
    }
    @keyframes coreBlink {
      0%,100% { opacity:1;   transform:scale(1)    }
      50%     { opacity:0.7; transform:scale(0.92) }
    }
    @keyframes selGlow {
      0%,100% { box-shadow: var(--sel-glow-a) }
      50%     { box-shadow: var(--sel-glow-b) }
    }
    .rp-ring1 { animation: radarPulse  2.2s cubic-bezier(0,0.6,0.4,1)        infinite; transform-origin:center; }
    .rp-ring2 { animation: radarPulse2 2.2s cubic-bezier(0,0.6,0.4,1) 0.9s   infinite; transform-origin:center; }
    .rp-core  { animation: coreBlink   2.4s ease-in-out                        infinite; }
    .rp-sel   { animation: selGlow     1.8s ease-in-out                        infinite; }
  `;
  document.head.appendChild(s);
}

export default function StratMap({ deposits = [], selectedId, onSelect, onMapReady }: Props) {
  const containerRef   = useRef<HTMLDivElement>(null);
  const mapRef         = useRef<any>(null);
  const markerLayerRef = useRef<any>(null);
  const leafletRef     = useRef<any>(null);
  const initDone       = useRef(false);
  // Tracks whether initMap() has fully completed — used to re-trigger
  // marker drawing after the async init resolves (fixes the race where
  // deposits arrive before markerLayerRef is populated).
  const [mapReady, setMapReady] = useState(false);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // ── Map init — runs exactly once after client mount ──────────
  useEffect(() => {
    if (!mounted || initDone.current || !containerRef.current) return;
    initDone.current = true;

    const initMap = async () => {
      ensureLeafletCSS();
      ensureMapCSS();

      const L = (await import('leaflet')).default ?? await import('leaflet');
      leafletRef.current = L;

      if ((containerRef.current as any)?._leaflet_id) return;

      const map = L.map(containerRef.current!, {
        center: [20, 10],
        zoom: 3,
        zoomControl: false,
        attributionControl: true,
        minZoom: 2,
        maxZoom: 18,
        worldCopyJump: true,
      });
      mapRef.current = map;

      // Carto Dark Matter basemap
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      // Dark ocean overlay — sits in the overlayPane which is above tiles but below markers.
      // This deepens the ocean without affecting land/coast labels from the tile layer.
      const overlayEl = document.createElement('div');
      overlayEl.style.cssText = `
        position:absolute;inset:0;pointer-events:none;z-index:200;
        background:radial-gradient(ellipse at 50% 60%,
          rgba(0,8,20,0.0) 0%,
          rgba(0,8,20,0.35) 55%,
          rgba(0,4,14,0.55) 100%);
      `;
      map.getPanes().overlayPane.appendChild(overlayEl);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Natural Earth — glowing cyan country borders + dark land fill
      try {
        const [topoRes, { feature }] = await Promise.all([
          fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'),
          import('topojson-client'),
        ]);
        const topology = await topoRes.json();
        const geojson = feature(topology, topology.objects.countries);
        L.geoJSON(geojson as any, {
          style: {
            color:       '#00eaff',
            weight:      1,
            opacity:     0.65,
            fill:        true,
            fillColor:   '#071018',
            fillOpacity: 0.82,
          },
        }).addTo(map);
      } catch { /* tiles still work */ }

      // Intelligence graticule — very subtle, not neon
      const grid = L.layerGroup().addTo(map);
      const gStyle  = { color: 'rgba(0,200,255,0.06)', weight: 0.4 };
      const eqStyle = { color: 'rgba(0,200,255,0.18)', weight: 0.7 };
      const pmStyle = { color: 'rgba(0,200,255,0.14)', weight: 0.6 };

      [-90,-60,-30,0,30,60,90].forEach(lat => {
        L.polyline([[lat,-180],[lat,180]], lat===0 ? eqStyle : gStyle).addTo(grid);
        if (lat===0) {
          L.marker([1.8,-174], { icon: L.divIcon({ html:`<span style="font-family:Inter,sans-serif;font-size:8px;color:rgba(0,200,255,0.38);letter-spacing:1.2px;white-space:nowrap">EQUATOR</span>`, className:'', iconAnchor:[0,0] as any }), interactive:false }).addTo(grid);
        } else if (lat !== -90 && lat !== 90) {
          L.marker([lat,-177], { icon: L.divIcon({ html:`<span style="font-family:Inter,sans-serif;font-size:7px;color:rgba(0,200,255,0.18);white-space:nowrap">${Math.abs(lat)}°${lat>0?'N':'S'}</span>`, className:'', iconAnchor:[0,6] as any }), interactive:false }).addTo(grid);
        }
      });
      [-180,-120,-60,0,60,120,180].forEach(lon => {
        L.polyline([[-85,lon],[85,lon]], lon===0 ? pmStyle : gStyle).addTo(grid);
        if (lon===0) {
          L.marker([79,1], { icon: L.divIcon({ html:`<span style="font-family:Inter,sans-serif;font-size:8px;color:rgba(0,200,255,0.35);letter-spacing:.8px;white-space:nowrap">0°</span>`, className:'', iconAnchor:[0,0] as any }), interactive:false }).addTo(grid);
        } else if (Math.abs(lon) <= 120 && lon !== -180 && lon !== 180) {
          L.marker([-87,lon], { icon: L.divIcon({ html:`<span style="font-family:Inter,sans-serif;font-size:7px;color:rgba(0,200,255,0.16);white-space:nowrap">${Math.abs(lon)}°${lon>0?'E':'W'}</span>`, className:'', iconAnchor:[12,0] as any }), interactive:false }).addTo(grid);
        }
      });

      // Ocean labels — muted cyan, wide letter-spacing, low opacity, pointer-events none
      const OL = `font-family:Inter,sans-serif;font-size:11px;font-weight:400;color:rgba(0,195,255,0.28);letter-spacing:5px;text-transform:uppercase;white-space:nowrap;pointer-events:none;user-select:none`;
      [
        { lat:44,  lon:-38,  text:'NORTH ATLANTIC OCEAN' },
        { lat:-28, lon:-25,  text:'SOUTH ATLANTIC OCEAN' },
        { lat:-8,  lon:74,   text:'INDIAN OCEAN'         },
        { lat:-52, lon:42,   text:'SOUTHERN OCEAN'       },
        { lat:76,  lon:-20,  text:'ARCTIC OCEAN'         },
        { lat:-26, lon:-118, text:'SOUTH PACIFIC OCEAN'  },
        { lat:33,  lon:162,  text:'NORTH PACIFIC OCEAN'  },
      ].forEach(({ lat, lon, text }) => {
        L.marker([lat, lon], {
          icon: L.divIcon({ html:`<span style="${OL}">${text}</span>`, className:'', iconAnchor:[55,8] as any }),
          interactive: false,
          zIndexOffset: -1000,
        }).addTo(grid);
      });

      // Marker layer
      const markerLayer = L.layerGroup().addTo(map);
      markerLayerRef.current = markerLayer;

      // Expose flyTo for external navigation (Africa filter etc.)
      if (onMapReady) {
        onMapReady((lat: number, lon: number, zoom = 4) => {
          map.flyTo([lat, lon], zoom, { duration: 1.2 });
        });
      }

      // Signal that the map and marker layer are ready.
      // This triggers the marker useEffect to run with current deposits.
      setMapReady(true);
    };

    initMap().catch(console.error);

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      markerLayerRef.current = null;
      leafletRef.current = null;
      initDone.current = false;
      setMapReady(false);
    };
  }, [mounted]);

  // ── Redraw radar markers ──────────────────────────────────────
  // Depends on mapReady so this re-runs once the async initMap()
  // finishes — preventing the race condition where deposits arrive
  // before markerLayerRef is populated.
  useEffect(() => {
    const L     = leafletRef.current;
    const layer = markerLayerRef.current;
    if (!L || !layer) return;

    layer.clearLayers();

    console.log('Deposits loaded:', (deposits ?? []).length);

    (deposits ?? []).forEach(dep => {
      const color  = getMineralColor(dep.primary_mineral);
      const r      = markerRadius(dep.resource_size_tonnes);
      const isSel  = dep.id === selectedId;
      // Ring radii: outer static, two animated expanding rings
      const ringR  = r + 8;   // static outer ring
      const total  = (ringR + 6) * 2;

      // Selected: target-lock cross-hair + stronger glow
      const selStyle = isSel
        ? `box-shadow:0 0 0 3px ${color}60,0 0 20px ${color}80,0 0 40px ${color}30;transform:scale(1.15);`
        : `box-shadow:0 0 ${r+4}px ${color}90,0 0 ${r}px ${color};`;

      const html = `
        <div style="width:${total}px;height:${total}px;display:flex;align-items:center;justify-content:center;position:relative;overflow:visible;">
          ${isSel ? `
          <div style="position:absolute;width:${(ringR+10)*2}px;height:2px;background:linear-gradient(90deg,transparent,${color}40,${color}70,${color}40,transparent);top:50%;transform:translateY(-50%);pointer-events:none;"></div>
          <div style="position:absolute;height:${(ringR+10)*2}px;width:2px;background:linear-gradient(180deg,transparent,${color}40,${color}70,${color}40,transparent);left:50%;transform:translateX(-50%);pointer-events:none;"></div>
          ` : ''}
          <div class="rp-ring1" style="position:absolute;width:${ringR*2}px;height:${ringR*2}px;border-radius:50%;border:1.5px solid ${color};transform-origin:center;pointer-events:none;"></div>
          <div class="rp-ring2" style="position:absolute;width:${(r+4)*2}px;height:${(r+4)*2}px;border-radius:50%;border:1px solid ${color};transform-origin:center;pointer-events:none;"></div>
          <div style="position:absolute;width:${(r+6)*2}px;height:${(r+6)*2}px;border-radius:50%;border:1px solid ${color}45;pointer-events:none;"></div>
          <div class="${isSel ? 'rp-sel' : 'rp-core'}" style="
            --sel-glow-a:0 0 0 3px ${color}60,0 0 20px ${color}80,0 0 40px ${color}30;
            --sel-glow-b:0 0 0 4px ${color}80,0 0 30px ${color}cc,0 0 60px ${color}50;
            width:${r*2}px;height:${r*2}px;border-radius:50%;
            background:radial-gradient(circle at 35% 35%,#fff 0%,${color} 40%,${color}cc 100%);
            ${selStyle}
            z-index:10;flex-shrink:0;transition:transform .2s;"></div>
        </div>`;

      const icon = L.divIcon({
        html,
        className:   'radar-marker-wrap',
        iconSize:    [total, total],
        iconAnchor:  [total/2, total/2],
        popupAnchor: [0, -(total/2) - 6],
      });

      const statusLabel = dep.status.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
      const confColor   = dep.data_confidence==='high' ? '#00ffa6' : dep.data_confidence==='medium' ? '#ffd600' : '#ff4444';

      const popup = `
        <div style="font-family:Inter,sans-serif;background:#0b0f17;border:1px solid rgba(0,255,213,0.2);border-radius:10px;padding:14px 16px;min-width:240px;max-width:270px;color:#e2e8f0;font-size:12px;box-shadow:0 0 24px rgba(0,255,213,0.1);">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
            <div style="width:10px;height:10px;border-radius:50%;background:${color};box-shadow:0 0 8px ${color};flex-shrink:0;"></div>
            <div style="font-size:14px;font-weight:600;color:#fff;line-height:1.3;">${dep.name}</div>
          </div>
          <div style="font-size:11px;color:#00ffd5;margin-bottom:10px;opacity:0.8;">
            ${dep.country}${dep.region ? ` · ${dep.region}` : ''}
          </div>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="color:#475569;padding:3px 0;font-size:10px;">Mineral</td><td style="text-align:right;color:#fff;font-weight:600;font-size:11px;">${dep.primary_mineral}</td></tr>
            <tr><td style="color:#475569;padding:3px 0;font-size:10px;">Type</td><td style="text-align:right;color:#94a3b8;font-size:11px;">${dep.deposit_type}</td></tr>
            <tr><td style="color:#475569;padding:3px 0;font-size:10px;">Status</td><td style="text-align:right;"><span style="font-size:10px;font-weight:600;color:${color};background:${color}18;padding:2px 7px;border-radius:20px;">${statusLabel}</span></td></tr>
            <tr><td style="color:#475569;padding:3px 0;font-size:10px;">Resource</td><td style="text-align:right;color:#94a3b8;font-size:11px;">${resourceLabel(dep.resource_size_tonnes)}</td></tr>
          </table>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin:10px 0 12px;">
            <div style="background:#0e1621;border:1px solid rgba(0,255,213,0.1);padding:6px 4px;border-radius:6px;text-align:center;">
              <div style="font-size:8px;color:#475569;letter-spacing:.4px;margin-bottom:2px;">OPP</div>
              <div style="font-size:16px;font-weight:700;color:#00ffa6;">${dep.opportunity_score}</div>
            </div>
            <div style="background:#0e1621;border:1px solid rgba(0,255,213,0.1);padding:6px 4px;border-radius:6px;text-align:center;">
              <div style="font-size:8px;color:#475569;letter-spacing:.4px;margin-bottom:2px;">DIFF</div>
              <div style="font-size:16px;font-weight:700;color:#ffd600;">${dep.difficulty_score}</div>
            </div>
            <div style="background:#0e1621;border:1px solid rgba(0,255,213,0.1);padding:6px 4px;border-radius:6px;text-align:center;">
              <div style="font-size:8px;color:#475569;letter-spacing:.4px;margin-bottom:2px;">CONF</div>
              <div style="font-size:12px;font-weight:700;color:${confColor};">${dep.data_confidence.slice(0,3).toUpperCase()}</div>
            </div>
          </div>
          <button onclick="window.__strataSelect('${dep.id}')" style="width:100%;padding:8px;background:linear-gradient(135deg,rgba(0,255,213,0.12),rgba(0,255,213,0.06));border:1px solid rgba(0,255,213,0.35);color:#00ffd5;font-family:Inter,sans-serif;font-size:11px;font-weight:500;letter-spacing:.5px;border-radius:7px;cursor:pointer;transition:all .2s;">VIEW INTELLIGENCE ›</button>
        </div>`;

      L.marker([dep.latitude, dep.longitude], { icon })
        .bindPopup(L.popup({ className:'strataland-popup', closeButton:false, maxWidth:290, offset:[0,-6] }).setContent(popup))
        .on('click', () => onSelect(dep.id))
        .addTo(layer);
    });

    (window as any).__strataSelect = (id: string) => {
      mapRef.current?.closePopup();
      onSelect(id);
    };
  }, [deposits, selectedId, onSelect, mapReady]);

  // ── Fly to selected ──────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !selectedId) return;
    const dep = (deposits ?? []).find(d => d.id === selectedId);
    if (!dep) return;
    mapRef.current.flyTo([dep.latitude, dep.longitude], Math.max(mapRef.current.getZoom(), 5), { duration: 0.8 });
  }, [selectedId, deposits]);

  if (!mounted) {
    return (
      <div style={{ width:'100%', height:'100%', background:'#05070b', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(0,255,213,0.4)', fontSize:11, letterSpacing:2, fontFamily:'Inter,sans-serif' }}>
        LOADING MAP LAYER...
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width:'100%', height:'100%', background:'#010a12' }} aria-label="StrataLand mineral deposit map" />
  );
}
