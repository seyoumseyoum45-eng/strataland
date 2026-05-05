'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// MODULE-LEVEL CONSTANTS — all declared here, above every hook and component.
// No browser globals (document/window/localStorage) at this scope.
// ─────────────────────────────────────────────────────────────────────────────

const MA_STOPS: readonly number[] = [750, 500, 250, 120, 100, 50, 0];

interface PeriodMeta {
  ma: number; label: string; epoch: string; ageRange: string;
  temperature: string; seaLevel: string; oceanColor: string;
  center: [number, number]; zoom: number;
  insights: string[]; driftNote: string;
  prospScore: number; prospLevel: 'High' | 'Moderate' | 'Low';
  prospHigh: number; prospMod: number; prospLow: number;
  geojsonPath: string;
}

const PERIODS: readonly PeriodMeta[] = [
  { ma:0,   label:'Present Day',         epoch:'Holocene',               ageRange:'0 Ma',         temperature:'Modern',      seaLevel:'Modern',         oceanColor:'#0d2035', center:[15,10],  zoom:2, geojsonPath:'/data/paleo/0.geojson',
    insights:['Active porphyry copper belts in Andes and Pacific Rim','Lithium brine systems in Andean Puna plateau','Carbonatite REE provinces in Africa and Scandinavia'],
    driftNote:'Modern plate configuration.', prospScore:72, prospLevel:'High', prospHigh:28, prospMod:44, prospLow:28 },
  { ma:50,  label:'Eocene',              epoch:'Early Eocene',           ageRange:'56 – 34 Ma',   temperature:'Warm ↑',      seaLevel:'High ↑',         oceanColor:'#0c1e38', center:[15,20],  zoom:2, geojsonPath:'/data/paleo/50.geojson',
    insights:['India-Asia collision forming Himalayan REE belts','Atlantic spreading creating new porphyry copper systems','Early laterite nickel formation in tropical belts'],
    driftNote:'India colliding with Eurasia. South America separated from Africa.', prospScore:74, prospLevel:'High', prospHigh:30, prospMod:42, prospLow:28 },
  { ma:100, label:'Late Cretaceous',     epoch:'Late Cretaceous',        ageRange:'100 – 66 Ma',  temperature:'Warm ↑↑',     seaLevel:'Very High ↑↑',  oceanColor:'#0c1e38', center:[15,20],  zoom:2, geojsonPath:'/data/paleo/100.geojson',
    insights:['Gondwana breakup creating East African Rift pegmatite belts','Caribbean LIP — nickel laterites','Laramide porphyry copper arc forming in western North America'],
    driftNote:'Africa moving north. India separating from Madagascar.', prospScore:76, prospLevel:'High', prospHigh:32, prospMod:41, prospLow:27 },
  { ma:120, label:'Early Cretaceous',    epoch:'Early Cretaceous',       ageRange:'145 – 100 Ma', temperature:'Warmer ↑',    seaLevel:'High ↑',         oceanColor:'#0d2040', center:[10,25],  zoom:2, geojsonPath:'/data/paleo/120.geojson',
    insights:['Pegmatite-hosted Li, Ta, Nb deposits in Gondwana collision zones','Carbonatite-related REE deposits in African rift margins','Sedimentary-hosted base metals in rift basin sequences'],
    driftNote:'Africa moved ~1,650 km north since 120 Ma. Gondwana actively rifting.', prospScore:78, prospLevel:'High', prospHigh:23, prospMod:41, prospLow:36 },
  { ma:250, label:'Triassic / Pangaea',  epoch:'Early Triassic',         ageRange:'252 – 247 Ma', temperature:'Hot ↑↑↑',     seaLevel:'Moderate',       oceanColor:'#0e2242', center:[25,30],  zoom:2, geojsonPath:'/data/paleo/250.geojson',
    insights:['Siberian Traps flood basalt — Ni-Cu-PGE sulphides forming','Tethys passive margin sedimentary copper belts','Early carbonatite intrusions along Pangaea suture zones'],
    driftNote:'Pangaea fully assembled. Tethys Ocean closing. Siberian LIP eruption event.', prospScore:65, prospLevel:'Moderate', prospHigh:18, prospMod:47, prospLow:35 },
  { ma:500, label:'Cambrian',            epoch:'Middle Cambrian',        ageRange:'509 – 497 Ma', temperature:'Warm ↑',      seaLevel:'High ↑',         oceanColor:'#102445', center:[0,20],   zoom:2, geojsonPath:'/data/paleo/500.geojson',
    insights:['Gondwana assembling — major LCT pegmatite provinces forming','Proterozoic sedimentary basins hosting Cu-Co stratiform mineralisation','Precambrian cratons concentrating REE in carbonatite intrusions'],
    driftNote:'Gondwana assembly underway. Iapetus Ocean opening.', prospScore:58, prospLevel:'Moderate', prospHigh:14, prospMod:44, prospLow:42 },
  { ma:750, label:'Cryogenian / Rodinia',epoch:'Cryogenian (Snowball Earth)',ageRange:'720 – 635 Ma',temperature:'Cold ↓↓↓', seaLevel:'Low ↓↓',         oceanColor:'#0f2244', center:[10,30],  zoom:2, geojsonPath:'/data/paleo/750.geojson',
    insights:['Rodinia supercontinent breakup generating major pegmatite belts','East African Orogen forming Li-Ta-Nb pegmatite provinces','Katangan Basin — earliest Cu-Co stratabound mineralisation'],
    driftNote:'Rodinia breaking apart. Snowball Earth glaciation. Proto-Africa near South Pole.', prospScore:52, prospLevel:'Moderate', prospHigh:12, prospMod:40, prospLow:48 },
] as const;

function getPeriod(ma: number): PeriodMeta {
  return (PERIODS as readonly PeriodMeta[]).find(p => p.ma === ma) ?? PERIODS[0];
}

function sliderToMa(sliderVal: number): number {
  const targetMa = 750 - sliderVal;
  return (MA_STOPS as number[]).reduce((best, cur) =>
    Math.abs(cur - targetMa) < Math.abs(best - targetMa) ? cur : best
  );
}

const TOP_REGIONS: Record<number, { name: string; score: number }[]> = {
  0:   [{name:'Atacama Lithium Province',score:91},{name:'Central African Copperbelt',score:88},{name:'Mount Weld REE Complex',score:83},{name:'Pilbara Pegmatite Belt',score:79},{name:'Adola-Kenticha Belt',score:74}],
  50:  [{name:'Proto-Himalayan REE Belt',score:88},{name:'East African Carbonatite Arc',score:84},{name:'Laramide Porphyry Belt',score:81},{name:'Tethyan Ophiolite Belt',score:76},{name:'West African Craton',score:71}],
  100: [{name:'Gondwana Rift Pegmatite Belt',score:90},{name:'Caribbean Laterite Province',score:85},{name:'Congo Craton Margin',score:82},{name:'East African Orogen',score:79},{name:'Mozambique Belt',score:74}],
  120: [{name:'Katanga Craton (DRC)',score:89},{name:'West African Craton',score:82},{name:'East African Orogen',score:78},{name:'Congo Craton Margin',score:75},{name:'Mozambique Belt',score:72}],
  250: [{name:'Siberian LIP Ni-Cu Province',score:84},{name:'Tethys Passive Margin',score:78},{name:'Variscan REE Belt',score:73},{name:'Gondwana Suture Zone',score:69},{name:'Uralian Ophiolite Belt',score:65}],
  500: [{name:'Gondwana Assembly Zone',score:80},{name:'Katangan Sedimentary Basin',score:76},{name:'Pan-African Pegmatite Arc',score:72},{name:'Iapetus Margin',score:66},{name:'South China Craton',score:62}],
  750: [{name:'East African Orogen (proto)',score:77},{name:'Katangan Proto-Basin',score:73},{name:'Kibaran Belt',score:70},{name:'Damara Orogen',score:65},{name:'Mozambique Belt (proto)',score:61}],
};

// ─────────────────────────────────────────────────────────────────────────────
// GEOJSON ADAPTER
// Fetches paleo GeoJSON.
// PRIMARY:  /api/paleo/{ma}  — Next.js API route that reads directly from
//   public/data/paleo/{ma}.geojson via the filesystem. Works regardless of
//   static-file serving configuration or server restart timing.
// FALLBACK: /data/paleo/{ma}.geojson — standard Next.js public folder path.
//   Useful in production after a full build.
// cache: "no-store" on primary so a cold 404 never gets stuck in browser cache.
// ─────────────────────────────────────────────────────────────────────────────
type GeoResult = { type: 'FeatureCollection'; features: unknown[] } | null;

async function loadPaleoGeoJSON(ma: number): Promise<GeoResult> {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : '';

  // Try API route first — bypasses static file serving entirely
  const apiUrl     = `${origin}/api/paleo/${ma}`;
  const staticUrl  = `${origin}/data/paleo/${ma}.geojson`;

  console.log('STRATALAND Paleo fetch:', apiUrl);

  for (const url of [apiUrl, staticUrl]) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        console.warn(`STRATALAND Paleo fetch ${res.status}:`, url);
        continue; // try fallback
      }
      const data = await res.json();
      console.log('STRATALAND Paleo loaded:', {
        ma,
        url,
        type: data?.type,
        featureCount: data?.features?.length ?? 0,
      });
      if (data?.type !== 'FeatureCollection') {
        console.error('STRATALAND Paleo: not a FeatureCollection:', data?.type);
        return null;
      }
      if (!Array.isArray(data.features) || data.features.length === 0) {
        console.error('STRATALAND Paleo: 0 features in', url);
        return null;
      }
      return data as GeoResult;
    } catch (err: any) {
      console.error('STRATALAND Paleo fetch error:', url, err?.message ?? String(err));
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// DEBUG INFO — shared between PaleoMap and PaleoExplorer via callback
// ─────────────────────────────────────────────────────────────────────────────
interface DebugInfo {
  activeMa: number;
  fetchUrl: string;
  fetchStatus: 'IDLE' | 'FETCHING' | 'SUCCESS' | 'ERROR' | '404' | 'JSON_INVALID' | 'FEATURE_COUNT_0';
  featureCount: number;
  renderStatus: 'IDLE' | 'RENDERED' | 'BOUNDS_INVALID' | 'RENDER_FAILED';
  errorMessage: string;
}

const EMPTY_DEBUG: DebugInfo = {
  activeMa: 0, fetchUrl: '', fetchStatus: 'IDLE',
  featureCount: 0, renderStatus: 'IDLE', errorMessage: '',
};
// Two-effect architecture:
//   Effect 1 (deps=[]) — creates the Leaflet map instance once, never recreated.
//   Effect 2 (deps=[ma]) — clears old layers, fetches GeoJSON, renders new layer.
// This avoids the init-guard race that caused layers not to show.
// ─────────────────────────────────────────────────────────────────────────────
function PaleoMap({ ma, mini = false, onDebug }: {
  ma: number;
  mini?: boolean;
  onDebug?: (info: Partial<DebugInfo>) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const layersRef    = useRef<any[]>([]);
  const [mapReady, setMapReady]   = useState(false);
  const [mapStatus, setMapStatus] = useState<'loading'|'ready'|'no-data'|'no-features'|'bad-bounds'|'error'>('loading');
  const [errorMsg,  setErrorMsg]  = useState('');

  const period    = getPeriod(ma);
  const isPresent = ma === 0;

  // ── Effect 1: create map once ──────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !containerRef.current) return;

      // Inject Leaflet CSS once
      if (!document.getElementById('leaflet-css-paleo')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css-paleo';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({ iconRetinaUrl: '', iconUrl: '', shadowUrl: '' });

      const initialPeriod = getPeriod(ma);
      const map = L.map(containerRef.current!, {
        center: initialPeriod.center,
        zoom:   initialPeriod.zoom,
        zoomControl:      !mini,
        attributionControl: false,
        dragging:         !mini,
        scrollWheelZoom:  !mini,
        doubleClickZoom:  !mini,
        keyboard:         !mini,
        touchZoom:        !mini,
        minZoom: 1,
        maxZoom: 10,
      });
      mapRef.current = map;
      if (!cancelled) setMapReady(true);
    })().catch(err => {
      console.error('[PaleoMap] Map init error:', err);
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setMapReady(false);
      setMapStatus('loading');
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect 2: swap layers when ma changes ─────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    let cancelled = false;

    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled) return;

      // Clear previous data layers
      layersRef.current.forEach(l => { try { map.removeLayer(l); } catch {} });
      layersRef.current = [];

      setMapStatus('loading');
      setErrorMsg('');

      const p = getPeriod(ma);

      if (ma === 0) {
        // Present Day: real tiles + Natural Earth outlines
        // Remove any existing tile layers first
        map.eachLayer((l: any) => { try { map.removeLayer(l); } catch {} });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          subdomains: 'abcd', maxZoom: 19,
        }).addTo(map);
        (map.getPanes().tilePane as HTMLElement).style.filter =
          'hue-rotate(195deg) saturate(0.9) brightness(0.72) contrast(1.15)';

        map.flyTo(p.center, p.zoom, { duration: 0.8 });

        try {
          const [topoRes, { feature }] = await Promise.all([
            fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'),
            import('topojson-client'),
          ]);
          if (cancelled) return;
          const topo = await topoRes.json();
          const outline = L.geoJSON(
            feature(topo, topo.objects.countries) as any,
            { style: { color: '#00eaff', weight: 1, opacity: 0.55, fill: false } }
          ).addTo(map);
          layersRef.current.push(outline);
        } catch { /* tiles still show */ }

        if (!cancelled) setMapStatus('ready');

      } else {
        // Paleo period: fetch GeoJSON via loadPaleoGeoJSON (absolute URL, no-cache)
        const container = map.getContainer() as HTMLElement;
        container.style.background = p.oceanColor;
        (map.getPanes().mapPane as HTMLElement).style.background = p.oceanColor;

        // Remove any tile layers left over from Present Day
        map.eachLayer((l: any) => {
          if (l.options && (l.options.subdomains !== undefined || l._url !== undefined)) {
            try { map.removeLayer(l); } catch {}
          }
        });

        // Capture ma at effect entry so the log reflects which period was requested
        const activeMa = ma;
        const fetchUrl =
          typeof window !== 'undefined'
            ? `${window.location.origin}/api/paleo/${activeMa}`
            : `/api/paleo/${activeMa}`;

        onDebug?.({ activeMa, fetchUrl, fetchStatus: 'FETCHING', featureCount: 0, renderStatus: 'IDLE', errorMessage: '' });

        const data = await loadPaleoGeoJSON(activeMa);
        if (cancelled) return;

        if (!data) {
          const msg = `Fetch failed: /data/paleo/${activeMa}.geojson`;
          onDebug?.({ fetchStatus: 'ERROR', renderStatus: 'IDLE', errorMessage: msg });
          map.flyTo(p.center, p.zoom, { duration: 0.8 });
          setErrorMsg(msg);
          setMapStatus('no-data');
          return;
        }

        onDebug?.({ fetchStatus: 'SUCCESS', featureCount: (data as any).features.length });

        try {
          const layer = L.geoJSON(data as any, {
            style: {
              color:       '#64ffda',
              weight:      2,
              fillColor:   '#7CFF4F',
              fillOpacity: 0.45,
            },
          });
          layer.addTo(map);
          layersRef.current.push(layer);

          const bounds = layer.getBounds();
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [40, 40] });
            console.log('STRATALAND Paleo rendered:', { ma: activeMa, boundsValid: true });
            onDebug?.({ renderStatus: 'RENDERED', errorMessage: '' });
            setMapStatus('ready');
          } else {
            console.warn('[PaleoMap] Layer bounds are invalid — flying to default centre');
            map.flyTo(p.center, p.zoom, { duration: 0.8 });
            onDebug?.({ renderStatus: 'BOUNDS_INVALID', errorMessage: 'GeoJSON loaded but bounds are invalid.' });
            setMapStatus('bad-bounds');
          }
        } catch (err: any) {
          const msg = `GeoJSON loaded but render failed: ${err?.message ?? String(err)}`;
          console.error('[PaleoMap] Render error:', msg);
          onDebug?.({ renderStatus: 'RENDER_FAILED', errorMessage: msg });
          map.flyTo(p.center, p.zoom, { duration: 0.8 });
          setErrorMsg(msg);
          setMapStatus('error');
        }
      }
    })().catch(err => {
      if (!cancelled) {
        const msg = err?.message ?? String(err);
        console.error('[PaleoMap] Layer effect error:', msg);
        setErrorMsg(msg);
        setMapStatus('error');
      }
    });

    return () => { cancelled = true; };
  }, [mapReady, ma]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Status message for non-ready states ───────────────────────────────────
  const statusMsg: Record<string, { title: string; body: string; color: string }> = {
    'no-data':    { title: 'DATA NOT YET LOADED', color: '#f6b93b',
                    body: errorMsg || `GeoJSON not found: /data/paleo/${ma}.geojson` },
    'no-features':{ title: 'EMPTY DATASET',       color: '#f6b93b',
                    body: 'GeoJSON loaded but contains no features.' },
    'bad-bounds': { title: 'BOUNDS UNAVAILABLE',  color: '#94a3b8',
                    body: 'GeoJSON loaded but bounds are invalid — check coordinate system.' },
    'error':      { title: 'LOAD ERROR',           color: '#ef4444',
                    body: errorMsg || 'An unexpected error occurred.' },
  };
  const overlay = statusMsg[mapStatus];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', background: period.oceanColor }} />

      {/* Placeholder / error overlay */}
      {overlay && !mini && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: `${period.oceanColor}cc` }}>
          <div style={{ background: 'rgba(6,11,20,0.9)', border: '1px solid rgba(0,234,255,0.2)', borderRadius: 12, padding: '28px 36px', textAlign: 'center', maxWidth: 440 }}>
            <div style={{ fontSize: 9, color: overlay.color, letterSpacing: '1.5px', fontWeight: 700, marginBottom: 8 }}>{overlay.title}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 10 }}>{period.label} — {period.ma} Ma</div>
            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>{overlay.body}</div>
            {mapStatus === 'no-data' && (
              <div style={{ marginTop: 14, fontSize: 10, color: '#334155', fontFamily: 'monospace' }}>
                Expected: /data/paleo/{period.ma}.geojson
              </div>
            )}
          </div>
        </div>
      )}

      {/* Period badge */}
      {!mini && mapStatus === 'ready' && (
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 600, padding: '4px 12px', background: 'rgba(6,10,20,0.9)', border: '1px solid rgba(0,234,255,0.2)', borderRadius: 6, fontSize: 10, color: '#00eaff', fontFamily: 'Inter,sans-serif', letterSpacing: 0.4 }}>
          {ma === 0 ? 'PRESENT DAY' : `${ma} Ma · ${period.label.toUpperCase()}`}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROSPECTIVITY GAUGE
// ─────────────────────────────────────────────────────────────────────────────
function ProspGauge({ score, level }: { score: number; level: string }) {
  const r = 48, cx = 64, cy = 64, circ = 2 * Math.PI * r;
  const gaugeDash = circ * 0.75;
  const col = level === 'High' ? '#22c55e' : level === 'Moderate' ? '#f97316' : '#60a5fa';
  return (
    <svg width="128" height="128" viewBox="0 0 128 128">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10"
        strokeDasharray={`${gaugeDash} ${circ}`} strokeLinecap="round" transform={`rotate(-225 ${cx} ${cy})`} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth="10"
        strokeDasharray={`${gaugeDash * score / 100} ${circ}`} strokeLinecap="round"
        transform={`rotate(-225 ${cx} ${cy})`} style={{ filter: `drop-shadow(0 0 6px ${col}80)` }} />
      <text x={cx} y={cy - 4} textAnchor="middle" fill="#fff" fontSize="22" fontWeight="700" fontFamily="Inter,sans-serif">{score}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill={col} fontSize="11" fontWeight="600" fontFamily="Inter,sans-serif">{level}</text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function PaleoExplorer() {
  const [selectedMa, setSelectedMa] = useState<number>(120);
  const [debug, setDebug] = useState<DebugInfo>({ ...EMPTY_DEBUG, activeMa: 120 });

  const handleDebug = useCallback((info: Partial<DebugInfo>) => {
    setDebug(prev => ({ ...prev, ...info }));
  }, []);

  // handleSliderChange uses sliderToMa and MA_STOPS — both declared at module level above
  const handleSliderChange = useCallback((e: { target: { value: string } }) => {
    setSelectedMa(sliderToMa(Number(e.target.value)));
  }, []);

  const forceLoad120 = useCallback(() => {
    setDebug({ ...EMPTY_DEBUG, activeMa: 120 });
    setSelectedMa(120);
  }, []);

  const period    = getPeriod(selectedMa);
  const regions   = TOP_REGIONS[selectedMa] ?? TOP_REGIONS[0];
  const sliderPct = (750 - selectedMa) / 750;

  // Status colour for debug panel
  const statusColor = (s: string) => {
    if (s === 'SUCCESS' || s === 'RENDERED') return '#25f5a6';
    if (s === 'FETCHING' || s === 'IDLE')    return '#94a3b8';
    return '#ef4444';
  };

  return (
    <div style={{ width: '100%', height: '100%', background: '#060b14', color: '#e2e8f0', fontFamily: 'Inter,sans-serif', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '14px 24px 12px', borderBottom: '1px solid rgba(0,234,255,0.1)', flexShrink: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', letterSpacing: -0.3 }}>PaleoGeographic Explorer</div>
        <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>Explore ancient Earth, deposit formation environments, and mineral prospectivity</div>
      </div>

      {/* Geologic Time Slider */}
      <div style={{ padding: '12px 24px 10px', background: '#080d18', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flexShrink: 0, minWidth: 180 }}>
            <div style={{ fontSize: 9, color: '#00eaff', letterSpacing: '1.5px', fontWeight: 700, marginBottom: 3 }}>GEOLOGIC TIME</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', letterSpacing: -0.3, lineHeight: 1 }}>
              {selectedMa === 0 ? 'Present Day' : `${selectedMa} Million Years Ago`}
            </div>
            <div style={{ fontSize: 11, color: '#25f5a6', marginTop: 2 }}>{period.epoch}</div>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              {['750 Ma', '500 Ma', '250 Ma', '100 Ma', '50 Ma', 'Present'].map(t => (
                <span key={t} style={{ fontSize: 9, color: '#334155' }}>{t}</span>
              ))}
            </div>
            <div style={{ position: 'relative', height: 20, display: 'flex', alignItems: 'center' }}>
              <div style={{ position: 'absolute', left: 0, width: `${sliderPct * 100}%`, height: 3, background: 'rgba(0,234,255,0.3)', borderRadius: 2 }} />
              <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }} />
              {(MA_STOPS as number[]).map(ma => {
                const pct = (750 - ma) / 750;
                const active = ma === selectedMa;
                return (
                  <div key={ma} onClick={() => setSelectedMa(ma)} style={{
                    position: 'absolute', left: `${pct * 100}%`, transform: 'translateX(-50%)',
                    width: active ? 14 : 8, height: active ? 14 : 8, borderRadius: '50%',
                    background: active ? '#00eaff' : '#1e3a4a',
                    border: active ? '2px solid #00eaff' : '1px solid #334155',
                    boxShadow: active ? '0 0 10px rgba(0,234,255,0.6)' : 'none',
                    cursor: 'pointer', transition: 'all .15s', zIndex: 2,
                  }} />
                );
              })}
              {/* Range input: value 0=left(750 Ma) to 750=right(Present) */}
              <input type="range" min={0} max={750} value={750 - selectedMa}
                onChange={handleSliderChange}
                style={{ position: 'absolute', width: '100%', opacity: 0, height: 20, cursor: 'pointer', zIndex: 3 }} />
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* Left: Map + bottom panels */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          {/* Map */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 280 }}>
            <PaleoMap ma={selectedMa} onDebug={handleDebug} />

            {/* ── DEBUG PANEL (top-left, always visible) ── */}
            <div style={{
              position: 'absolute', top: 12, left: 12, zIndex: 900,
              background: 'rgba(2,6,14,0.96)', border: '1px solid rgba(0,234,255,0.35)',
              borderRadius: 8, padding: '10px 14px', minWidth: 280,
              fontFamily: 'monospace', fontSize: 11,
              backdropFilter: 'blur(8px)',
            }}>
              <div style={{ fontSize: 9, color: '#00eaff', letterSpacing: '1.4px', fontWeight: 700, marginBottom: 8 }}>
                PALEO DEBUG
              </div>
              {([
                ['activeMa',     String(debug.activeMa)],
                ['fetchUrl',     debug.fetchUrl || '—'],
                ['fetchStatus',  debug.fetchStatus],
                ['featureCount', String(debug.featureCount)],
                ['renderStatus', debug.renderStatus],
                ...(debug.errorMessage ? [['error', debug.errorMessage]] : []),
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: 8, marginBottom: 4, lineHeight: 1.4 }}>
                  <span style={{ color: '#475569', minWidth: 96, flexShrink: 0 }}>{k}</span>
                  <span style={{ color: statusColor(v), wordBreak: 'break-all' }}>{v}</span>
                </div>
              ))}
              <button
                onClick={forceLoad120}
                style={{
                  marginTop: 8, width: '100%', padding: '6px 0',
                  background: 'rgba(0,234,255,0.12)', border: '1px solid rgba(0,234,255,0.45)',
                  borderRadius: 5, color: '#00eaff', fontSize: 11,
                  fontFamily: 'Inter,sans-serif', cursor: 'pointer', letterSpacing: 0.3,
                }}
              >
                Force Load 120
              </button>
            </div>
            {/* Legend */}
            <div style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 500, background: 'rgba(6,11,20,0.92)', border: '1px solid rgba(0,234,255,0.18)', borderRadius: 8, padding: '10px 14px', backdropFilter: 'blur(6px)' }}>
              <div style={{ fontSize: 9, color: '#00eaff', letterSpacing: '1.3px', fontWeight: 700, marginBottom: 8 }}>MAP LEGEND</div>
              {[['#a78bfa','Known Deposits'],['#f87171','High Prospectivity'],['#fbbf24','Moderate Prospectivity'],['#34d399','Low Prospectivity']].map(([color, label]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5, fontSize: 10, color: '#94a3b8' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 4px ${color}80` }} />{label}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom panels strip */}
          <div style={{ height: 220, flexShrink: 0, borderTop: '1px solid rgba(0,234,255,0.1)', display: 'flex', background: '#070d18' }}>

            {/* Panel 1: Comparison */}
            <div style={{ flex: 1, borderRight: '1px solid rgba(255,255,255,0.06)', padding: '12px 14px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 9, color: '#00eaff', letterSpacing: '1.4px', fontWeight: 700, marginBottom: 8 }}>PALEO → PRESENT COMPARISON</div>
              <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 9, color: '#475569' }}>{selectedMa === 0 ? 'Present' : `${selectedMa} Ma`}</div>
                  <div style={{ flex: 1, borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(0,234,255,0.1)' }}><PaleoMap ma={selectedMa} mini /></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', color: '#334155', fontSize: 14, flexShrink: 0 }}>↔</div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 9, color: '#475569' }}>Present</div>
                  <div style={{ flex: 1, borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(0,234,255,0.1)' }}><PaleoMap ma={0} mini /></div>
                </div>
              </div>
              <div style={{ marginTop: 5, fontSize: 10, color: '#475569' }}><span style={{ color: '#00eaff' }}>ℹ </span>{period.driftNote}</div>
            </div>

            {/* Panel 2: Heatmap placeholder */}
            <div style={{ flex: 1.2, borderRight: '1px solid rgba(255,255,255,0.06)', padding: '12px 14px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 9, color: '#00eaff', letterSpacing: '1.4px', fontWeight: 700, marginBottom: 8 }}>PROSPECTIVITY HEATMAP (AI MODEL)</div>
              <div style={{ flex: 1, borderRadius: 6, overflow: 'hidden', background: '#0a0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="100%" height="100%" viewBox="0 0 280 148" preserveAspectRatio="xMidYMid slice">
                  <defs>
                    <radialGradient id="hm1" cx="40%" cy="45%" r="35%"><stop offset="0%" stopColor="#ef4444" stopOpacity="0.9"/><stop offset="100%" stopColor="transparent" stopOpacity="0"/></radialGradient>
                    <radialGradient id="hm2" cx="65%" cy="38%" r="28%"><stop offset="0%" stopColor="#ef4444" stopOpacity="0.8"/><stop offset="100%" stopColor="transparent" stopOpacity="0"/></radialGradient>
                    <radialGradient id="hm3" cx="55%" cy="65%" r="32%"><stop offset="0%" stopColor="#f97316" stopOpacity="0.75"/><stop offset="100%" stopColor="transparent" stopOpacity="0"/></radialGradient>
                    <radialGradient id="hm4" cx="20%" cy="60%" r="22%"><stop offset="0%" stopColor="#eab308" stopOpacity="0.65"/><stop offset="100%" stopColor="transparent" stopOpacity="0"/></radialGradient>
                    <linearGradient id="hmscale" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#22c55e"/><stop offset="50%" stopColor="#f97316"/><stop offset="100%" stopColor="#ef4444"/></linearGradient>
                  </defs>
                  <rect width="280" height="148" fill="#0a0f1a"/>
                  <rect width="280" height="148" fill="url(#hm4)"/>
                  <rect width="280" height="148" fill="url(#hm3)"/>
                  <rect width="280" height="148" fill="url(#hm2)"/>
                  <rect width="280" height="148" fill="url(#hm1)"/>
                  <rect x="20" y="136" width="240" height="5" rx="2" fill="url(#hmscale)"/>
                  <text x="20" y="132" fill="#475569" fontSize="7" fontFamily="Inter,sans-serif">Low</text>
                  <text x="248" y="132" fill="#475569" fontSize="7" fontFamily="Inter,sans-serif">High</text>
                </svg>
              </div>
            </div>

            {/* Panel 3: Top regions */}
            <div style={{ flex: 1, borderRight: '1px solid rgba(255,255,255,0.06)', padding: '12px 14px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 9, color: '#00eaff', letterSpacing: '1.4px', fontWeight: 700, marginBottom: 8 }}>TOP PROSPECTIVE REGIONS</div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {regions.map(({ name, score }, i) => (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, padding: '4px 6px', background: 'rgba(255,255,255,0.02)', borderRadius: 4 }}>
                    <span style={{ fontSize: 10, color: '#334155', fontWeight: 700, minWidth: 14 }}>{i + 1}</span>
                    <span style={{ flex: 1, fontSize: 10, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                    <span style={{ padding: '1px 6px', background: 'rgba(37,245,166,0.1)', border: '1px solid rgba(37,245,166,0.3)', borderRadius: 8, fontSize: 9, color: '#25f5a6', fontWeight: 700 }}>{score}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel 4: Data coverage */}
            <div style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 9, color: '#00eaff', letterSpacing: '1.4px', fontWeight: 700, marginBottom: 8 }}>DATA COVERAGE</div>
              {([['Geologic Maps',87,'#25f5a6',null],['Geochemistry',64,'#f97316',null],['Remote Sensing',92,'#25f5a6',null],['Paleo Model Confidence',78,'#fbbf24','High']] as [string,number,string,string|null][]).map(([label,pct,color,tag]) => (
                <div key={label} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: '#475569' }}>{label}</span>
                    <span style={{ fontSize: 10, color, fontWeight: 600 }}>{tag ?? `${pct}%`}</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Prototype label */}
          <div style={{ padding: '5px 20px', background: '#050a12', borderTop: '1px solid rgba(251,191,36,0.08)', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: 9, color: '#92400e', fontWeight: 600 }}>⚠</span>
            <span style={{ fontSize: 9, color: '#78716c', fontStyle: 'italic' }}>
              Prototype reconstruction — awaiting GPlates / PALEOMAP GeoJSON export for paleo periods.
            </span>
          </div>

          {/* Data sources footer */}
          <div style={{ padding: '7px 20px', background: '#050a12', borderTop: '1px solid rgba(0,234,255,0.07)', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 9, color: '#334155' }}>Data sources:</span>
            {['GPlates / EarthByte','PALEOMAP','USGS MRDS','Macrostrat','Sentinel-2','OneGeology'].map((src, i, arr) => (
              <React.Fragment key={src}>
                <span style={{ fontSize: 9, color: '#475569' }}>{src}</span>
                {i < arr.length - 1 && <span style={{ color: '#1e3a4a', fontSize: 10 }}>·</span>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ width: 240, flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.06)', overflowY: 'auto', background: '#070d18' }}>

          <div style={{ borderBottom: '1px solid rgba(0,234,255,0.1)', padding: '14px 16px' }}>
            <div style={{ fontSize: 9, color: '#00eaff', letterSpacing: '1.5px', fontWeight: 700, opacity: 0.75, marginBottom: 8 }}>TIME PERIOD DETAILS</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>{period.label}</div>
            <div style={{ fontSize: 11, color: '#475569', marginBottom: 12 }}>{period.ma === 0 ? '0 Ma' : `${period.ma} Ma`}</div>
            {([['Period',period.label.split(' ').slice(-1)[0]??'—'],['Epoch',period.epoch],['Age Range',period.ageRange],['Global Temperature',period.temperature],['Sea Level',period.seaLevel]] as [string,string][]).map(([k,v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <span style={{ fontSize: 11, color: '#475569' }}>{k}</span>
                <span style={{ fontSize: 11, textAlign: 'right', color: v.includes('↑↑↑')?'#ef4444':v.includes('↑↑')?'#f97316':v.includes('↑')?'#fbbf24':v.includes('↓↓')?'#60a5fa':'#94a3b8' }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ borderBottom: '1px solid rgba(0,234,255,0.1)', padding: '14px 16px' }}>
            <div style={{ fontSize: 9, color: '#00eaff', letterSpacing: '1.5px', fontWeight: 700, opacity: 0.75, marginBottom: 8 }}>DEPOSIT ENVIRONMENT INSIGHTS</div>
            <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6, marginBottom: 10 }}>
              {period.ma > 200 ? 'Continental assembly and supercontinent dynamics created favorable environments for:' : 'Continental rifting and tectonic activity created favorable environments for:'}
            </p>
            {period.insights.map(ins => (
              <div key={ins} style={{ display: 'flex', gap: 6, fontSize: 11, color: '#94a3b8', lineHeight: 1.5, marginBottom: 5 }}>
                <span style={{ color: '#00eaff', flexShrink: 0 }}>·</span>{ins}
              </div>
            ))}
          </div>

          <div style={{ borderBottom: '1px solid rgba(0,234,255,0.1)', padding: '14px 16px' }}>
            <div style={{ fontSize: 9, color: '#00eaff', letterSpacing: '1.5px', fontWeight: 700, opacity: 0.75, marginBottom: 8 }}>AI PROSPECTIVITY SUMMARY</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <ProspGauge score={period.prospScore} level={period.prospLevel} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: '#475569', marginBottom: 6 }}>Overall Score</div>
                {([['High',period.prospHigh,'#ef4444'],['Moderate',period.prospMod,'#f97316'],['Low',period.prospLow,'#22c55e']] as [string,number,string][]).map(([label,pct,color]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: '#475569', flex: 1 }}>{label}</span>
                    <span style={{ fontSize: 10, color, fontWeight: 600 }}>{pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 9, color: '#334155', letterSpacing: '1.2px', fontWeight: 600, marginBottom: 8 }}>JUMP TO PERIOD</div>
            {(PERIODS as readonly PeriodMeta[]).map(p => (
              <button key={p.ma} onClick={() => setSelectedMa(p.ma)}
                style={{ width: '100%', padding: '6px 10px', borderRadius: 6, fontSize: 11, fontFamily: 'Inter,sans-serif', cursor: 'pointer', textAlign: 'left', marginBottom: 4,
                  background: selectedMa === p.ma ? 'rgba(0,234,255,0.1)' : 'transparent',
                  border: `1px solid ${selectedMa === p.ma ? 'rgba(0,234,255,0.3)' : 'rgba(255,255,255,0.05)'}`,
                  color: selectedMa === p.ma ? '#00eaff' : '#475569' }}>
                <span style={{ fontWeight: 600 }}>{p.ma === 0 ? 'Present' : `${p.ma} Ma`}</span>
                <span style={{ marginLeft: 8, color: selectedMa === p.ma ? '#4db8cc' : '#334155' }}>{p.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
