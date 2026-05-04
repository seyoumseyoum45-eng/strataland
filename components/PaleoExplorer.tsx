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
// Fetches /public/data/paleo/{ma}.geojson — returns null on 404/error.
// Callers show a placeholder when null is returned.
// ─────────────────────────────────────────────────────────────────────────────
type GeoResult = { type: 'FeatureCollection'; features: unknown[] } | null;
const _geoCache: Record<number, GeoResult | 'pending'> = {};

async function loadPaleoGeoJSON(ma: number): Promise<GeoResult> {
  const cached = _geoCache[ma];
  if (cached !== undefined && cached !== 'pending') return cached;
  if (cached === 'pending') {
    // Wait briefly then return cache
    await new Promise(r => setTimeout(r, 200));
    return _geoCache[ma] as GeoResult;
  }
  _geoCache[ma] = 'pending';
  try {
    const res = await fetch(`/data/paleo/${ma}.geojson`);
    if (!res.ok) { _geoCache[ma] = null; return null; }
    const fc = await res.json() as unknown;
    if (typeof fc !== 'object' || fc === null || (fc as { type?: string }).type !== 'FeatureCollection') {
      _geoCache[ma] = null; return null;
    }
    const result = fc as GeoResult;
    _geoCache[ma] = result;
    return result;
  } catch {
    _geoCache[ma] = null;
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PALEO MAP CANVAS
// ─────────────────────────────────────────────────────────────────────────────
function PaleoMap({ ma, mini = false }: { ma: number; mini?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<unknown>(null);
  const initDone     = useRef(false);
  const [mapStatus, setMapStatus] = useState<'loading'|'ready'|'placeholder'>('loading');

  const period    = getPeriod(ma);
  const isPresent = ma === 0;

  useEffect(() => {
    if (!containerRef.current || initDone.current) return;
    initDone.current = true;
    let cancelled = false;

    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !containerRef.current) return;

      if (!document.getElementById('leaflet-css-paleo')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css-paleo';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({ iconRetinaUrl: '', iconUrl: '', shadowUrl: '' });

      const map = L.map(containerRef.current!, {
        center: period.center, zoom: period.zoom,
        zoomControl: !mini, attributionControl: false,
        dragging: !mini, scrollWheelZoom: !mini,
        doubleClickZoom: !mini, keyboard: !mini, touchZoom: !mini,
        minZoom: 1, maxZoom: isPresent ? 10 : 5,
      });
      mapRef.current = map;

      if (isPresent) {
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          subdomains: 'abcd', maxZoom: 19,
        }).addTo(map);
        (map.getPanes().tilePane as HTMLElement).style.filter =
          'hue-rotate(195deg) saturate(0.9) brightness(0.72) contrast(1.15)';
        try {
          const [topoRes, { feature }] = await Promise.all([
            fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'),
            import('topojson-client'),
          ]);
          if (!cancelled) {
            const topo = await topoRes.json() as Parameters<typeof feature>[0];
            L.geoJSON(feature(topo, (topo as Record<string, unknown> & { objects: { countries: Parameters<typeof feature>[1] } }).objects.countries) as Parameters<typeof L.geoJSON>[0], {
              style: { color: '#00eaff', weight: 1, opacity: 0.55, fill: false },
            }).addTo(map);
          }
        } catch { /* tile layer still shows */ }
        if (!cancelled) setMapStatus('ready');
      } else {
        const container = map.getContainer() as HTMLElement;
        container.style.background = period.oceanColor;
        (map.getPanes().mapPane as HTMLElement).style.background = period.oceanColor;

        const fc = await loadPaleoGeoJSON(ma);
        if (cancelled) return;
        if (fc) {
          L.geoJSON(fc as Parameters<typeof L.geoJSON>[0], {
            style: { color: '#4a7030', weight: 1.2, fillColor: '#2d4a1a', fillOpacity: 0.88, opacity: 0.9 },
          }).addTo(map);
          setMapStatus('ready');
        } else {
          setMapStatus('placeholder');
        }
      }
    })().catch(() => { if (!cancelled) setMapStatus('placeholder'); });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        (mapRef.current as { remove(): void }).remove();
        mapRef.current = null;
      }
      initDone.current = false;
      setMapStatus('loading');
    };
  }, [ma]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', background: period.oceanColor }} />
      {mapStatus === 'placeholder' && !mini && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: `${period.oceanColor}cc` }}>
          <div style={{ background: 'rgba(6,11,20,0.9)', border: '1px solid rgba(0,234,255,0.2)', borderRadius: 12, padding: '28px 36px', textAlign: 'center', maxWidth: 440 }}>
            <div style={{ fontSize: 9, color: '#f6b93b', letterSpacing: '1.5px', fontWeight: 700, marginBottom: 8 }}>DATA NOT YET LOADED</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 10 }}>{period.label} — {period.ma} Ma</div>
            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>
              Prototype reconstruction — awaiting GPlates / PALEOMAP GeoJSON export.
            </div>
            <div style={{ marginTop: 14, fontSize: 10, color: '#334155', fontFamily: 'monospace' }}>
              Expected: /data/paleo/{period.ma}.geojson
            </div>
          </div>
        </div>
      )}
      {!mini && mapStatus !== 'loading' && (
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

  // handleSliderChange uses sliderToMa and MA_STOPS — both declared at module level above
  const handleSliderChange = useCallback((e: { target: { value: string } }) => {
    setSelectedMa(sliderToMa(Number(e.target.value)));
  }, []);

  const period    = getPeriod(selectedMa);
  const regions   = TOP_REGIONS[selectedMa] ?? TOP_REGIONS[0];
  const sliderPct = (750 - selectedMa) / 750;

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
            <PaleoMap ma={selectedMa} />
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
