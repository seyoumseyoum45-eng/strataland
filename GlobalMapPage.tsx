'use client';

// =============================================================
// STRATALAND — Global Map Page
// Fetches deposit GeoJSON from the API, manages filter state,
// and coordinates StratMap with the right-panel and KPI bar.
// =============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { DepositGeoJSON, DepositSummary, MapFilters, Mineral } from '@/types';

// Leaflet must be loaded client-side only (no SSR)
const StratMap = dynamic(() => import('./StratMap'), {
  ssr: false,
  loading: () => (
    <div style={{
      width: '100%', height: '100%',
      background: '#0a0c0f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'SF Mono', Consolas, monospace",
      fontSize: '11px', color: '#5c6670', letterSpacing: '1px',
    }}>
      INITIALISING MAP LAYER...
    </div>
  ),
});

// ── Types ─────────────────────────────────────────────────────

interface KPIs {
  total_deposits: number;
  producing: number;
  undeveloped: number;
  countries_covered: number;
  minerals_covered: number;
  high_opportunity: number;
  high_confidence: number;
}

interface FilterState {
  minerals: string[];
  statuses: string[];
  min_opportunity: number;
  max_difficulty: number;
}

// ── Styles ────────────────────────────────────────────────────

const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg0:#0a0c0f; --bg1:#111418; --bg2:#161b21; --bg3:#1c2330;
    --border:rgba(255,255,255,0.07); --border2:rgba(255,255,255,0.13);
    --t1:#e8eaed; --t2:#9aa3af; --t3:#5c6670;
    --em:#10b981; --am:#f59e0b; --cu:#cd7c3f; --bl:#3b82f6; --sl:#64748b;
  }
  body { background:var(--bg0); color:var(--t1);
         font-family:'SF Mono',Consolas,monospace; font-size:12px; overflow:hidden; }
  .app { display:grid; grid-template-columns:180px 1fr 280px;
         grid-template-rows:44px 1fr 86px; height:100vh; }
  .topbar { grid-column:1/-1; background:var(--bg1); border-bottom:1px solid var(--border);
            display:flex; align-items:center; }
  .brand { width:180px; padding:0 14px; border-right:1px solid var(--border);
           display:flex; align-items:center; gap:8px; flex-shrink:0; }
  .brand-pulse { width:6px; height:6px; background:var(--em); border-radius:50%;
                 animation:pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1}50%{opacity:.35} }
  .search { flex:1; padding:0 14px; display:flex; align-items:center; gap:10px; }
  .search input { background:var(--bg2); border:1px solid var(--border); color:var(--t1);
                  padding:5px 10px; font-size:11px; font-family:inherit; width:240px;
                  outline:none; border-radius:3px; }
  .search input:focus { border-color:var(--em); }
  .pill { background:var(--bg3); border:1px solid var(--border); padding:3px 9px;
          font-size:9px; color:var(--t2); border-radius:20px; cursor:pointer;
          letter-spacing:.4px; transition:all .15s; user-select:none; }
  .pill:hover,.pill.active { border-color:var(--em); color:var(--em); }
  .top-right { padding:0 14px; display:flex; align-items:center; gap:14px; font-size:9px; color:var(--t3); }
  .live { display:flex; align-items:center; gap:4px; }
  .live::before { content:''; width:4px; height:4px; background:var(--em);
                  border-radius:50%; display:inline-block; }
  .sidebar { background:var(--bg1); border-right:1px solid var(--border);
             padding:10px 0; overflow-y:auto; }
  .nav-sec-label { font-size:9px; color:var(--t3); letter-spacing:1.4px;
                   padding:8px 14px 4px; text-transform:uppercase; }
  .nav-item { display:flex; align-items:center; gap:7px; padding:6px 14px;
              font-size:11px; color:var(--t2); cursor:pointer;
              border-left:2px solid transparent; transition:all .12s; letter-spacing:.2px; }
  .nav-item:hover { color:var(--t1); background:rgba(255,255,255,0.02); }
  .nav-item.active { color:var(--em); border-left-color:var(--em);
                     background:rgba(16,185,129,0.05); }
  .nav-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
  .nav-count { margin-left:auto; font-size:9px; color:var(--t3);
               background:var(--bg3); padding:1px 5px; border-radius:10px; }
  .main { position:relative; background:var(--bg0); overflow:hidden; }
  .map-wrap { position:absolute; inset:0; }
  .map-overlay { position:absolute; z-index:1000; pointer-events:none; }
  .legend { bottom:14px; left:14px; background:rgba(10,12,15,0.88);
            border:1px solid var(--border); padding:8px 10px; border-radius:4px; pointer-events:all; }
  .legend-title { font-size:9px; color:var(--t3); letter-spacing:1px; margin-bottom:5px; }
  .legend-row { display:flex; align-items:center; gap:6px; margin-bottom:3px;
                font-size:10px; color:var(--t2); }
  .legend-dot { border-radius:50%; flex-shrink:0; }
  .coord-display { top:10px; left:50%; transform:translateX(-50%);
                   background:rgba(10,12,15,0.75); border:1px solid var(--border);
                   padding:4px 10px; border-radius:3px; font-size:9px; color:var(--t3);
                   letter-spacing:.5px; white-space:nowrap; }
  .right-panel { background:var(--bg1); border-left:1px solid var(--border); overflow-y:auto; }
  .rp-header { padding:10px 13px; border-bottom:1px solid var(--border); }
  .rp-title-label { font-size:9px; color:var(--t3); letter-spacing:1px; margin-bottom:6px; }
  .rp-name { font-size:14px; font-weight:600; color:var(--t1); margin-bottom:2px; }
  .rp-loc  { font-size:10px; color:var(--cu); }
  .rp-body { padding:12px 13px; }
  .info-row { display:flex; justify-content:space-between; align-items:center;
              padding:4px 0; border-bottom:1px solid var(--border); }
  .ik { font-size:9px; color:var(--t3); letter-spacing:.4px; }
  .iv { font-size:10px; color:var(--t2); font-weight:500; }
  .badge { padding:2px 6px; border-radius:2px; font-size:9px; font-weight:700;
           letter-spacing:.5px; text-transform:uppercase; }
  .score-pair { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin:8px 0; }
  .score-card { background:var(--bg2); border:1px solid var(--border); padding:7px; border-radius:3px; }
  .sc-label { font-size:8px; color:var(--t3); letter-spacing:.5px; margin-bottom:3px; }
  .sc-val   { font-size:18px; font-weight:700; }
  .sc-bar   { height:2px; background:var(--bg3); border-radius:1px; margin-top:4px; overflow:hidden; }
  .sc-fill  { height:100%; border-radius:1px; }
  .ai-box { background:var(--bg2); border:1px solid var(--border);
            border-left:2px solid var(--em); padding:8px 10px;
            border-radius:0 3px 3px 0; margin:8px 0; }
  .ai-label { font-size:9px; color:var(--em); letter-spacing:.8px; margin-bottom:4px; }
  .ai-text  { font-size:10px; color:var(--t2); line-height:1.5; }
  .action-grid { display:grid; grid-template-columns:1fr 1fr; gap:5px; margin-top:8px; }
  .action-btn { background:var(--bg2); border:1px solid var(--border); color:var(--t2);
                padding:6px; font-size:9px; font-family:inherit; cursor:pointer;
                border-radius:3px; letter-spacing:.4px; transition:all .15s; text-align:center; }
  .action-btn:hover { border-color:var(--em); color:var(--em); }
  .action-btn.primary { background:rgba(16,185,129,0.08);
                        border-color:#059669; color:var(--em); }
  .bottombar { grid-column:1/-1; background:var(--bg1); border-top:1px solid var(--border);
               display:flex; }
  .kpi { flex:1; padding:8px 14px; border-right:1px solid var(--border);
         display:flex; flex-direction:column; justify-content:center;
         cursor:pointer; transition:background .12s; }
  .kpi:hover { background:rgba(255,255,255,0.02); }
  .kpi:last-child { border-right:none; }
  .kpi-label { font-size:9px; color:var(--t3); letter-spacing:.7px; margin-bottom:2px; }
  .kpi-val   { font-size:17px; font-weight:700; color:var(--t1); }
  .kpi-sub   { font-size:8px; color:var(--t3); margin-top:1px; }
  ::-webkit-scrollbar { width:3px; }
  ::-webkit-scrollbar-thumb { background:var(--border2); border-radius:2px; }
  .loading-marker { display:flex; align-items:center; gap:6px; font-size:10px; color:var(--t3); }
  .spinner { width:10px; height:10px; border:1px solid var(--t3);
             border-top-color:var(--em); border-radius:50%;
             animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
`;

// ── MINERAL CONFIG ────────────────────────────────────────────
const MINERAL_CONFIG: Record<string, { color: string }> = {
  Lithium:     { color: '#10b981' },
  Copper:      { color: '#cd7c3f' },
  Cobalt:      { color: '#3b82f6' },
  Nickel:      { color: '#14b8a6' },
  'Rare Earths':{ color: '#8b5cf6' },
  Uranium:     { color: '#f59e0b' },
  Graphite:    { color: '#64748b' },
  Manganese:   { color: '#ef4444' },
};

const FILTER_MINERALS = Object.keys(MINERAL_CONFIG);

// ── Main Component ─────────────────────────────────────────────

export default function GlobalMapPage() {
  const [geojson, setGeojson]           = useState<DepositGeoJSON | null>(null);
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [selectedDeposit, setSelected]  = useState<DepositSummary | null>(null);
  const [kpis, setKpis]                 = useState<KPIs | null>(null);
  const [loading, setLoading]           = useState(true);
  const [filters, setFilters]           = useState<FilterState>({
    minerals: [],
    statuses: [],
    min_opportunity: 0,
    max_difficulty: 100,
  });

  // ── Fetch GeoJSON ──────────────────────────────────────────
  const fetchGeoJSON = useCallback(async (f: FilterState) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (f.minerals.length)  params.set('minerals', f.minerals.join(','));
      if (f.statuses.length)  params.set('statuses', f.statuses.join(','));
      if (f.min_opportunity)  params.set('min_opp',  f.min_opportunity.toString());
      if (f.max_difficulty < 100) params.set('max_diff', f.max_difficulty.toString());

      const res = await fetch(`/api/deposits/geojson?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: DepositGeoJSON = await res.json();
      setGeojson(data);
    } catch (err) {
      console.error('[fetchGeoJSON]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch KPIs ─────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/kpis')
      .then((r) => r.json())
      .then((d) => setKpis(d.data))
      .catch(console.error);
  }, []);

  // ── Initial + filter-driven load ──────────────────────────
  useEffect(() => {
    fetchGeoJSON(filters);
  }, [filters, fetchGeoJSON]);

  // ── Fetch deposit detail when selected ────────────────────
  useEffect(() => {
    if (!selectedId) { setSelected(null); return; }

    // First, try to get from in-memory GeoJSON props (fast)
    const feature = geojson?.features.find((f) => f.properties.id === selectedId);
    if (feature) {
      // Cast properties to DepositSummary shape for the panel
      setSelected(feature.properties as unknown as DepositSummary);
    }

    // Then fetch full detail in background
    fetch(`/api/deposits/${selectedId}`)
      .then((r) => r.json())
      .then((d) => setSelected(d.data))
      .catch(console.error);
  }, [selectedId, geojson]);

  // ── Toggle mineral filter ──────────────────────────────────
  const toggleMineral = (m: string) => {
    setFilters((f) => ({
      ...f,
      minerals: f.minerals.includes(m)
        ? f.minerals.filter((x) => x !== m)
        : [...f.minerals, m],
    }));
  };

  const toggleStatus = (s: string) => {
    setFilters((f) => ({
      ...f,
      statuses: f.statuses.includes(s)
        ? f.statuses.filter((x) => x !== s)
        : [...f.statuses, s],
    }));
  };

  const clearFilters = () => setFilters({
    minerals: [], statuses: [], min_opportunity: 0, max_difficulty: 100,
  });

  const featuresShown = geojson?.features.length ?? 0;

  return (
    <>
      <style>{css}</style>
      <div className="app">

        {/* ── TOP BAR ── */}
        <div className="topbar">
          <div className="brand">
            <div className="brand-pulse" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--em)', letterSpacing: 2 }}>STRATALAND</div>
              <div style={{ fontSize: 8, color: 'var(--t3)', letterSpacing: '.8px' }}>CRITICAL MINERALS INTELLIGENCE</div>
            </div>
          </div>
          <div className="search">
            <input placeholder="⌖  Search deposits, regions, minerals..." />
            {FILTER_MINERALS.map((m) => (
              <span
                key={m}
                className={`pill ${filters.minerals.includes(m) ? 'active' : ''}`}
                style={filters.minerals.includes(m) ? { color: MINERAL_CONFIG[m].color, borderColor: MINERAL_CONFIG[m].color } : {}}
                onClick={() => toggleMineral(m)}
              >
                {m}
              </span>
            ))}
            <span
              className={`pill ${filters.statuses.includes('producing') ? 'active' : ''}`}
              onClick={() => toggleStatus('producing')}
            >Producing</span>
            <span
              className={`pill ${filters.statuses.includes('undeveloped') ? 'active' : ''}`}
              onClick={() => toggleStatus('undeveloped')}
            >Undeveloped</span>
            {(filters.minerals.length || filters.statuses.length) ? (
              <span className="pill" style={{ color: 'var(--t3)' }} onClick={clearFilters}>✕ Clear</span>
            ) : null}
          </div>
          <div className="top-right">
            <div className="live">LIVE FEED</div>
            <div>DATA: Q1 2025</div>
            {loading && <div className="loading-marker"><div className="spinner" /><span>Loading...</span></div>}
            <div style={{ color: 'var(--em)', fontSize: 9 }}>{featuresShown.toLocaleString()} DEPOSITS</div>
          </div>
        </div>

        {/* ── SIDEBAR ── */}
        <div className="sidebar">
          <div className="nav-sec-label">Platform</div>
          <div className="nav-item"><div className="nav-dot" style={{ background: 'var(--em)' }} />Dashboard</div>
          <div className="nav-item active"><div className="nav-dot" style={{ background: 'var(--bl)' }} />Global Map<span className="nav-count">{featuresShown.toLocaleString()}</span></div>
          <div className="nav-sec-label" style={{ marginTop: 6 }}>Minerals</div>
          {FILTER_MINERALS.map((m) => (
            <div
              key={m}
              className={`nav-item ${filters.minerals.includes(m) ? 'active' : ''}`}
              onClick={() => toggleMineral(m)}
              style={filters.minerals.includes(m) ? { color: MINERAL_CONFIG[m].color, borderLeftColor: MINERAL_CONFIG[m].color } : {}}
            >
              <div className="nav-dot" style={{ background: MINERAL_CONFIG[m].color }} />
              {m}
            </div>
          ))}
          <div className="nav-sec-label" style={{ marginTop: 6 }}>Analysis</div>
          <div className="nav-item"><div className="nav-dot" style={{ background: 'var(--am)' }} />Rankings</div>
          <div className="nav-item"><div className="nav-dot" style={{ background: 'var(--cu)' }} />Paleo Map</div>
          <div className="nav-item"><div className="nav-dot" style={{ background: 'var(--sl)' }} />Deposits</div>
          <div className="nav-sec-label" style={{ marginTop: 6 }}>Intelligence</div>
          <div className="nav-item"><div className="nav-dot" style={{ background: 'var(--em)' }} />AI Research</div>
          <div className="nav-item"><div className="nav-dot" style={{ background: 'var(--bl)' }} />Sources</div>
        </div>

        {/* ── MAIN MAP ── */}
        <div className="main">
          <div className="map-wrap">
            <StratMap
              geojson={geojson}
              selectedId={selectedId}
              onDepositSelect={setSelectedId}
              filters={filters}
              theme="dark"
            />
          </div>

          {/* Coord display overlay */}
          <div className="map-overlay coord-display" style={{ top: 10, left: '50%', transform: 'translateX(-50%)' }}>
            EPSG:4326 &nbsp;·&nbsp; Natural Earth v5.1.2 &nbsp;·&nbsp; OSM Tiles
          </div>

          {/* Mineral legend */}
          <div className="map-overlay legend">
            <div className="legend-title">MINERAL TYPE</div>
            {Object.entries(MINERAL_CONFIG).map(([name, { color }]) => (
              <div key={name} className="legend-row">
                <div className="legend-dot" style={{ width: 7, height: 7, background: color }} />
                {name}
              </div>
            ))}
            <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
              <div className="legend-title">STATUS RING</div>
              {[['Producing','#10b981'],['Exploration','#3b82f6'],['Undeveloped','#64748b'],['Construction','#f97316']].map(([s, c]) => (
                <div key={s} className="legend-row">
                  <div style={{ width: 8, height: 8, borderRadius: '50%', border: `1.5px solid ${c}`, background: 'transparent' }} />
                  {s}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
              <div className="legend-title">MARKER SIZE</div>
              {[['·','Small (< 200Mt)'], ['●','Medium (200Mt–1Bt)'], ['⬤','Large (1–5Bt)'], ['⬤⬤','World-class (> 5Bt)']].map(([sym, label]) => (
                <div key={label} className="legend-row">{sym} {label}</div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="right-panel">
          {selectedDeposit ? (
            <>
              <div className="rp-header">
                <div className="rp-title-label">● SELECTED DEPOSIT</div>
                <div className="rp-name">{selectedDeposit.name}</div>
                <div className="rp-loc">▶ {selectedDeposit.country}{selectedDeposit.region ? ` · ${selectedDeposit.region}` : ''}</div>
              </div>
              <div className="rp-body">
                <div className="info-row">
                  <span className="ik">PRIMARY MINERAL</span>
                  <span className="badge" style={{ background: `${MINERAL_CONFIG[selectedDeposit.primary_mineral]?.color ?? '#64748b'}22`, color: MINERAL_CONFIG[selectedDeposit.primary_mineral]?.color ?? '#64748b' }}>
                    {selectedDeposit.primary_mineral.toUpperCase()}
                  </span>
                </div>
                <div className="info-row">
                  <span className="ik">STATUS</span>
                  <span className="badge" style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--em)' }}>
                    {selectedDeposit.status?.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
                <div className="info-row">
                  <span className="ik">DEPOSIT TYPE</span>
                  <span className="iv">{selectedDeposit.deposit_type}</span>
                </div>
                <div className="info-row">
                  <span className="ik">OPERATOR</span>
                  <span className="iv" style={{ fontSize: 9, maxWidth: 160, textAlign: 'right' }}>{selectedDeposit.operator ?? '—'}</span>
                </div>
                <div className="info-row" style={{ borderBottom: 'none' }}>
                  <span className="ik">DATA CONFIDENCE</span>
                  <span className="iv" style={{ color: selectedDeposit.data_confidence === 'high' ? 'var(--em)' : selectedDeposit.data_confidence === 'medium' ? 'var(--am)' : 'var(--t3)' }}>
                    {selectedDeposit.data_confidence?.toUpperCase()}
                  </span>
                </div>

                <div className="score-pair">
                  <div className="score-card">
                    <div className="sc-label">OPPORTUNITY</div>
                    <div className="sc-val" style={{ color: 'var(--em)' }}>{selectedDeposit.opportunity_score ?? '—'}</div>
                    <div className="sc-bar"><div className="sc-fill" style={{ width: `${selectedDeposit.opportunity_score ?? 0}%`, background: 'var(--em)' }} /></div>
                  </div>
                  <div className="score-card">
                    <div className="sc-label">DIFFICULTY</div>
                    <div className="sc-val" style={{ color: 'var(--am)' }}>{selectedDeposit.difficulty_score ?? '—'}</div>
                    <div className="sc-bar"><div className="sc-fill" style={{ width: `${selectedDeposit.difficulty_score ?? 0}%`, background: 'var(--am)' }} /></div>
                  </div>
                </div>

                {selectedDeposit.ai_summary && (
                  <div className="ai-box">
                    <div className="ai-label">✦ AI SUMMARY</div>
                    <div className="ai-text">{selectedDeposit.ai_summary}</div>
                  </div>
                )}

                <div className="action-grid">
                  <button className="action-btn primary">View Deposit ▶</button>
                  <button className="action-btn">Compare ▶</button>
                  <button className="action-btn">Source Reports</button>
                  <button className="action-btn">Paleo Context</button>
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: '20px 14px', color: 'var(--t3)', fontSize: 10, lineHeight: 1.6 }}>
              <div style={{ fontSize: 9, letterSpacing: 1, marginBottom: 10 }}>● SELECT A DEPOSIT</div>
              Click any marker on the map to load deposit intelligence. Use the mineral filters above to narrow the view.
              <div style={{ marginTop: 14, color: 'var(--t3)', fontSize: 9 }}>
                {featuresShown.toLocaleString()} deposits loaded
              </div>
            </div>
          )}
        </div>

        {/* ── KPI BAR ── */}
        <div className="bottombar">
          {[
            { label: 'DEPOSITS TRACKED',    val: kpis?.total_deposits?.toLocaleString() ?? '—',  sub: 'Global inventory',       color: 'var(--em)' },
            { label: 'COUNTRIES COVERED',   val: kpis?.countries_covered?.toString()   ?? '—',  sub: '6 continents',            color: 'var(--t1)' },
            { label: 'CRITICAL MINERALS',   val: kpis?.minerals_covered?.toString()    ?? '—',  sub: 'IEA priority list',       color: 'var(--t1)' },
            { label: 'PRODUCING MINES',     val: kpis?.producing?.toLocaleString()     ?? '—',  sub: 'Active extraction',       color: 'var(--cu)' },
            { label: 'UNDEVELOPED ASSETS',  val: kpis?.undeveloped?.toLocaleString()   ?? '—',  sub: 'Pre-production',          color: 'var(--am)' },
            { label: 'HIGH OPPORTUNITY',    val: kpis?.high_opportunity?.toLocaleString() ?? '—', sub: 'Score ≥ 75',            color: 'var(--em)' },
            { label: 'HIGH CONFIDENCE',     val: kpis?.high_confidence?.toLocaleString() ?? '—', sub: 'JORC / NI43-101 backed', color: 'var(--bl)' },
          ].map(({ label, val, sub, color }) => (
            <div key={label} className="kpi">
              <div className="kpi-label">{label}</div>
              <div className="kpi-val" style={{ color }}>{val}</div>
              <div className="kpi-sub">{sub}</div>
            </div>
          ))}
        </div>

      </div>
    </>
  );
}
