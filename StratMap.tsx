'use client';
// ─────────────────────────────────────────────────────────────
// StratMap — Leaflet map, client-only, no SSR, no markercluster
// Fixes:
//   1. Hydration  — component only mounts after client render
//   2. Double-init — initDone ref prevents second L.map() call
//   3. Cluster    — removed; plain L.layerGroup used instead
// ─────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react';
import type { Deposit } from '@/types';

interface Props {
  deposits: Deposit[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const STATUS_RING: Record<string, string> = {
  producing: '#10b981', past_producing: '#f59e0b',
  undeveloped: '#64748b', exploration: '#3b82f6',
  feasibility: '#8b5cf6', construction: '#f97316',
  care_and_maintenance: '#94a3b8', unknown: '#334155',
};

function resourceLabel(t: number | null): string {
  if (!t) return '—';
  if (t >= 1e9) return `${(t / 1e9).toFixed(1)} Bt`;
  return `${(t / 1e6).toFixed(0)} Mt`;
}

function markerRadius(t: number | null): number {
  if (!t) return 6;
  if (t > 5e9) return 11;
  if (t > 1e9) return 9;
  if (t > 2e8) return 7;
  return 6;
}

// Inject Leaflet CSS once into <head> without dynamic import
// (avoids the CSS import race condition that causes hydration mismatch)
function ensureLeafletCSS() {
  const id = 'leaflet-css';
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
  document.head.appendChild(link);
}

function ensureAppCSS() {
  const id = 'strataland-map-css';
  if (document.getElementById(id)) return;
  const s = document.createElement('style');
  s.id = id;
  s.textContent = `
    .leaflet-container { background: #0b0e12 !important; font-family: 'SF Mono', monospace; }
    .leaflet-popup-content-wrapper { background: transparent !important; border: none !important; padding: 0 !important; box-shadow: none !important; border-radius: 0 !important; }
    .leaflet-popup-content { margin: 0 !important; }
    .leaflet-popup-tip-container { display: none !important; }
    .leaflet-control-attribution { background: rgba(11,14,18,0.8) !important; color: #50606f !important; font-size: 9px !important; }
    .leaflet-control-attribution a { color: #50606f !important; }
    .leaflet-control-zoom a { background: #12161c !important; color: #8e99a8 !important; border-color: rgba(255,255,255,0.1) !important; }
    .leaflet-control-zoom a:hover { background: #1e2633 !important; color: #10b981 !important; }
    .strataland-marker-wrap { cursor: pointer; }
  `;
  document.head.appendChild(s);
}

export default function StratMap({ deposits, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const markerLayerRef = useRef<any>(null);  // plain L.layerGroup — no clustering
  const leafletRef   = useRef<any>(null);
  const initDone     = useRef(false);        // extra guard against double-init

  // ── Fix 1: only render the container div on the client ──────
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // ── Initialise map exactly once ──────────────────────────────
  useEffect(() => {
    if (!mounted) return;
    if (initDone.current) return;          // Fix 2: hard guard
    if (!containerRef.current) return;

    initDone.current = true;

    const initMap = async () => {
      ensureLeafletCSS();
      ensureAppCSS();

      // Dynamic import — Leaflet must never run on the server
      const L = (await import('leaflet')).default ?? (await import('leaflet'));
      leafletRef.current = L;

      // Safety: if Leaflet somehow already attached to this node, bail
      if ((containerRef.current as any)._leaflet_id) return;

      const map = L.map(containerRef.current!, {
        center: [20, 15],
        zoom: 3,
        zoomControl: false,
        attributionControl: true,
        minZoom: 2,
        maxZoom: 18,
        worldCopyJump: true,
      });
      mapRef.current = map;

      // Carto Dark Matter — real dark world basemap, no API key needed
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 19,
        }
      ).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Natural Earth country outlines (TopoJSON → GeoJSON via topojson-client)
      try {
        const [topoRes, { feature }] = await Promise.all([
          fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'),
          import('topojson-client'),
        ]);
        const topology = await topoRes.json();
        const geojson = feature(topology, topology.objects.countries);
        L.geoJSON(geojson as any, {
          style: { color: 'rgba(148,163,184,0.35)', weight: 0.5, fill: false },
        }).addTo(map);
      } catch {
        // Network unavailable — map tiles still work
      }

      // Graticule
      const graticule = L.layerGroup().addTo(map);
      const gridStyle = { color: 'rgba(255,255,255,0.06)', weight: 0.5 };
      const mainStyle = { color: 'rgba(255,255,255,0.2)',  weight: 0.8 };

      [-90, -60, -30, 0, 30, 60, 90].forEach(lat => {
        L.polyline([[lat, -180], [lat, 180]], lat === 0 ? mainStyle : gridStyle).addTo(graticule);
        if (lat === 0) {
          L.marker([2, -175], { icon: L.divIcon({ html: `<span style="font-family:'SF Mono',monospace;font-size:9px;color:rgba(255,255,255,0.45);letter-spacing:.8px;white-space:nowrap;text-shadow:0 1px 3px #000">EQUATOR</span>`, className: '', iconAnchor: [0, 0] as any }), interactive: false }).addTo(graticule);
        } else {
          L.marker([lat, -178], { icon: L.divIcon({ html: `<span style="font-family:'SF Mono',monospace;font-size:8px;color:rgba(255,255,255,0.3);white-space:nowrap;text-shadow:0 1px 2px #000">${Math.abs(lat)}°${lat > 0 ? 'N' : 'S'}</span>`, className: '', iconAnchor: [0, 7] as any }), interactive: false }).addTo(graticule);
        }
      });
      [-180, -120, -60, 0, 60, 120, 180].forEach(lon => {
        L.polyline([[-90, lon], [90, lon]], lon === 0 ? mainStyle : gridStyle).addTo(graticule);
        if (lon === 0) {
          L.marker([80, 1], { icon: L.divIcon({ html: `<span style="font-family:'SF Mono',monospace;font-size:9px;color:rgba(255,255,255,0.45);letter-spacing:.6px;white-space:nowrap;text-shadow:0 1px 3px #000">PRIME MERIDIAN</span>`, className: '', iconAnchor: [0, 0] as any }), interactive: false }).addTo(graticule);
        } else {
          L.marker([-85, lon], { icon: L.divIcon({ html: `<span style="font-family:'SF Mono',monospace;font-size:8px;color:rgba(255,255,255,0.3);white-space:nowrap;text-shadow:0 1px 2px #000">${Math.abs(lon)}°${lon > 0 ? 'E' : 'W'}</span>`, className: '', iconAnchor: [16, 0] as any }), interactive: false }).addTo(graticule);
        }
      });

      // Fix 3: plain layerGroup — no markerClusterGroup
      const markerLayer = L.layerGroup().addTo(map);
      markerLayerRef.current = markerLayer;
    };

    initMap().catch(console.error);

    return () => {
      // Full teardown on unmount — prevents the "already initialized" error
      // if React StrictMode double-invokes effects in development
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerLayerRef.current = null;
      leafletRef.current = null;
      initDone.current = false;
    };
  }, [mounted]);

  // ── Redraw markers whenever deposits or selectedId changes ───
  useEffect(() => {
    const L     = leafletRef.current;
    const layer = markerLayerRef.current;
    if (!L || !layer) return;

    layer.clearLayers();

    deposits.forEach(dep => {
      const ring  = STATUS_RING[dep.status] || '#64748b';
      const fill  = dep.mineral_color || '#64748b';
      const r     = markerRadius(dep.resource_size_tonnes);
      const isSel = dep.id === selectedId;
      const outer = r + 4;
      const total = outer * 2 + 4;

      const icon = L.divIcon({
        html: `<div style="width:${total}px;height:${total}px;display:flex;align-items:center;justify-content:center;">
          <div style="width:${outer*2}px;height:${outer*2}px;border-radius:50%;border:${isSel?'2':'1'}px solid ${ring};background:rgba(11,14,18,${isSel?'0.9':'0.6'});display:flex;align-items:center;justify-content:center;${isSel?`box-shadow:0 0 0 3px ${fill}30;`:''}">
            <div style="width:${r*2}px;height:${r*2}px;border-radius:50%;background:${fill};${isSel?'transform:scale(1.2);':''}"></div>
          </div>
        </div>`,
        className:   'strataland-marker-wrap',
        iconSize:    [total, total],
        iconAnchor:  [total / 2, total / 2],
        popupAnchor: [0, -(total / 2) - 4],
      });

      const confColor  = dep.data_confidence === 'high' ? '#10b981' : dep.data_confidence === 'medium' ? '#f59e0b' : '#ef4444';
      const statusLabel = dep.status.replace(/_/g, ' ').toUpperCase();

      const popup = `
        <div style="font-family:'SF Mono',monospace;background:#111418;border:1px solid rgba(255,255,255,0.1);border-radius:4px;padding:12px 14px;min-width:230px;max-width:260px;color:#e4e8ed;font-size:11px;">
          <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;">
            <div style="width:9px;height:9px;border-radius:50%;background:${fill};flex-shrink:0;margin-top:2px;"></div>
            <div style="font-size:13px;font-weight:700;line-height:1.3;">${dep.name}</div>
          </div>
          <div style="font-size:10px;color:#cd7c3f;margin-bottom:8px;">▶ ${dep.country}${dep.region ? ` · ${dep.region}` : ''}</div>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="color:#50606f;padding:3px 0;font-size:9px;">MINERAL</td><td style="text-align:right;color:#e4e8ed;font-weight:700;font-size:10px;">${dep.primary_mineral}</td></tr>
            <tr><td style="color:#50606f;padding:3px 0;font-size:9px;">TYPE</td><td style="text-align:right;color:#8e99a8;font-size:10px;">${dep.deposit_type}</td></tr>
            <tr><td style="color:#50606f;padding:3px 0;font-size:9px;">STATUS</td><td style="text-align:right;"><span style="font-size:8px;font-weight:700;color:${ring};background:${ring}22;padding:1px 5px;border-radius:2px;">${statusLabel}</span></td></tr>
            <tr><td style="color:#50606f;padding:3px 0;font-size:9px;">RESOURCE</td><td style="text-align:right;color:#8e99a8;font-size:10px;">${resourceLabel(dep.resource_size_tonnes)}</td></tr>
          </table>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;margin:8px 0;">
            <div style="background:#161b21;border:1px solid rgba(255,255,255,0.07);padding:5px;border-radius:2px;text-align:center;"><div style="font-size:7px;color:#50606f;">OPP</div><div style="font-size:15px;font-weight:700;color:#10b981;">${dep.opportunity_score}</div></div>
            <div style="background:#161b21;border:1px solid rgba(255,255,255,0.07);padding:5px;border-radius:2px;text-align:center;"><div style="font-size:7px;color:#50606f;">DIFF</div><div style="font-size:15px;font-weight:700;color:#f59e0b;">${dep.difficulty_score}</div></div>
            <div style="background:#161b21;border:1px solid rgba(255,255,255,0.07);padding:5px;border-radius:2px;text-align:center;"><div style="font-size:7px;color:#50606f;">CONF</div><div style="font-size:11px;font-weight:700;color:${confColor};">${dep.data_confidence.slice(0,3).toUpperCase()}</div></div>
          </div>
          <button onclick="window.__strataSelect('${dep.id}')" style="width:100%;padding:6px;background:rgba(16,185,129,0.1);border:1px solid #059669;color:#10b981;font-family:'SF Mono',monospace;font-size:9px;letter-spacing:.5px;border-radius:2px;cursor:pointer;">VIEW FULL INTELLIGENCE ▶</button>
        </div>`;

      L.marker([dep.latitude, dep.longitude], { icon })
        .bindPopup(L.popup({ className: 'strataland-popup', closeButton: false, maxWidth: 280, offset: [0, -6] }).setContent(popup))
        .on('click', () => onSelect(dep.id))
        .addTo(layer);
    });

    (window as any).__strataSelect = (id: string) => {
      mapRef.current?.closePopup();
      onSelect(id);
    };
  }, [deposits, selectedId, onSelect]);

  // ── Fly to selected deposit ──────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !selectedId) return;
    const dep = deposits.find(d => d.id === selectedId);
    if (!dep) return;
    mapRef.current.flyTo(
      [dep.latitude, dep.longitude],
      Math.max(mapRef.current.getZoom(), 5),
      { duration: 0.9 }
    );
  }, [selectedId, deposits]);

  // ── Fix 1 cont: don't render the div at all until client-side
  if (!mounted) {
    return (
      <div style={{ width: '100%', height: '100%', background: '#0b0e12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: 11, color: '#50606f', letterSpacing: 1 }}>
        LOADING MAP...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', background: '#0b0e12' }}
      aria-label="StrataLand global mineral deposit map"
    />
  );
}
