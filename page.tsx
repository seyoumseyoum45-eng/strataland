'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';
import IntelPanel from '@/components/IntelPanel';
import type { Deposit, KPIs } from '@/types';
import { DEPOSITS, computeKPIs, MINERAL_COLOR } from '@/lib/localData';

const StratMap = dynamic(() => import('@/components/StratMap'), {
  ssr: false,
  loading: () => (
    <div style={{ width:'100%', height:'100%', background:'#0b0e12', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'SF Mono,monospace', fontSize:11, color:'#50606f', letterSpacing:'1px' }}>
      LOADING MAP LAYER...
    </div>
  ),
});

const MINERALS = ['Lithium','Copper','Cobalt','Nickel','Rare Earths','Uranium','Graphite','Manganese'];
const STATUS_OPTS = ['producing','exploration','undeveloped','construction','feasibility','past_producing'];
const STATUS_RING: Record<string,string> = { producing:'#10b981',past_producing:'#f59e0b',undeveloped:'#64748b',exploration:'#3b82f6',feasibility:'#8b5cf6',construction:'#f97316' };
const CONF_OPTS = ['high','medium','low'];

export default function GlobalMapPage() {
  // Hydration fix: suppress SSR render of the whole interactive shell.
  // The page contains browser-only state (filters, map, KPI counts) that
  // would differ between server HTML and client — causing React's mismatch error.
  // Returning null until mounted makes the server emit an empty shell that
  // React then hydrates cleanly without any text/attribute comparison.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [activePage, setActivePage]       = useState('map');
  const [deposits, setDeposits]           = useState<Deposit[]>(DEPOSITS);
  const [selectedId, setSelectedId]       = useState<string | null>(null);
  const [selectedDeposit, setSelected]    = useState<Deposit | null>(null);
  const [kpis, setKpis]                   = useState<KPIs>(computeKPIs(DEPOSITS));
  const [searchQ, setSearchQ]             = useState('');
  const [filterMinerals, setFMinerals]    = useState<string[]>([]);
  const [filterStatuses, setFStatuses]    = useState<string[]>([]);
  const [filterConf, setFConf]            = useState<string[]>([]);
  const [minOpp, setMinOpp]               = useState(0);
  const [maxDiff, setMaxDiff]             = useState(100);
  const [showFilters, setShowFilters]     = useState(false);

  // Apply filters
  const filtered = useMemo(() => {
    let d = [...DEPOSITS];
    if (searchQ) {
      const q = searchQ.toLowerCase();
      d = d.filter(x => x.name.toLowerCase().includes(q) || x.country.toLowerCase().includes(q) || x.primary_mineral.toLowerCase().includes(q) || (x.operator||'').toLowerCase().includes(q));
    }
    if (filterMinerals.length) d = d.filter(x => filterMinerals.includes(x.primary_mineral));
    if (filterStatuses.length) d = d.filter(x => filterStatuses.includes(x.status));
    if (filterConf.length)     d = d.filter(x => filterConf.includes(x.data_confidence));
    if (minOpp > 0)  d = d.filter(x => x.opportunity_score >= minOpp);
    if (maxDiff < 100) d = d.filter(x => x.difficulty_score <= maxDiff);
    return d;
  }, [searchQ, filterMinerals, filterStatuses, filterConf, minOpp, maxDiff]);

  const filteredKpis = useMemo(() => computeKPIs(filtered), [filtered]);

  useEffect(() => {
    if (!selectedId) { setSelected(null); return; }
    const dep = DEPOSITS.find(d => d.id === selectedId);
    setSelected(dep || null);
  }, [selectedId]);

  // Handle sidebar nav — mineral shortcuts
  const handleNav = useCallback((id: string) => {
    setActivePage(id);
    if (id === 'lithium')  { setFMinerals(['Lithium']); setFStatuses([]); }
    else if (id === 'copper') { setFMinerals(['Copper']); setFStatuses([]); }
    else if (id === 'cobalt') { setFMinerals(['Cobalt']); setFStatuses([]); }
    else if (id === 'nickel') { setFMinerals(['Nickel']); setFStatuses([]); }
    else if (id === 'map' || id === 'dashboard') { setFMinerals([]); setFStatuses([]); }
  }, []);

  const toggleMineral = (m: string) => setFMinerals(p => p.includes(m) ? p.filter(x=>x!==m) : [...p,m]);
  const toggleStatus  = (s: string) => setFStatuses(p => p.includes(s) ? p.filter(x=>x!==s) : [...p,s]);
  const toggleConf    = (c: string) => setFConf(p => p.includes(c) ? p.filter(x=>x!==c) : [...p,c]);
  const clearAll = () => { setFMinerals([]); setFStatuses([]); setFConf([]); setMinOpp(0); setMaxDiff(100); setSearchQ(''); };
  const hasFilters = filterMinerals.length||filterStatuses.length||filterConf.length||minOpp>0||maxDiff<100||searchQ;

  const css = `
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#0b0e12;font-family:'SF Mono',ui-monospace,Consolas,monospace;font-size:11px;overflow:hidden}
    input{background:#181e27;border:1px solid rgba(255,255,255,0.08);color:#e4e8ed;padding:5px 10px;font-size:10px;font-family:inherit;outline:none;border-radius:2px;}
    input:focus{border-color:#10b981}
    input::placeholder{color:#50606f}
    .pill{background:#1e2633;border:1px solid rgba(255,255,255,0.07);padding:2px 8px;font-size:9px;color:#8e99a8;border-radius:20px;cursor:pointer;letter-spacing:.3px;white-space:nowrap;transition:all .12s;font-family:inherit}
    .pill:hover{border-color:rgba(255,255,255,0.15);color:#e4e8ed}
    button:hover{opacity:.85}
    ::-webkit-scrollbar{width:3px;height:3px}
    ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:2px}
  `;

  // Don't render any interactive UI on the server — prevents hydration mismatch
  if (!mounted) {
    return (
      <div style={{ width:'100vw', height:'100vh', background:'#0b0e12', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'SF Mono,monospace', fontSize:11, color:'#50606f', letterSpacing:1 }}>
        INITIALISING...
      </div>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div style={{ display:'grid', gridTemplateColumns:'168px 1fr 272px', gridTemplateRows:'40px 1fr auto 80px', height:'100vh', background:'#0b0e12', color:'#e4e8ed' }}>

        {/* ── TOP BAR ── */}
        <div style={{ gridColumn:'1/-1', background:'#12161c', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', height:40 }}>
          {/* Brand */}
          <div style={{ width:168, padding:'0 13px', borderRight:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:7, height:'100%', flexShrink:0 }}>
            <div style={{ width:5, height:5, background:'#10b981', borderRadius:'50%', animation:'pulse 2s infinite', flexShrink:0 }} />
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'#10b981', letterSpacing:'1.8px' }}>STRATALAND</div>
              <div style={{ fontSize:7, color:'#50606f', letterSpacing:.7 }}>CRITICAL MINERALS INTELLIGENCE</div>
            </div>
          </div>
          {/* Search */}
          <div style={{ flex:1, padding:'0 12px', display:'flex', alignItems:'center', gap:8, overflow:'hidden' }}>
            <input
              placeholder="⌖  Search deposits, countries, minerals, operators..."
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              style={{ width:260 }}
            />
            {MINERALS.slice(0,6).map(m => (
              <span
                key={m}
                className="pill"
                style={filterMinerals.includes(m) ? { borderColor: MINERAL_COLOR[m]||'#10b981', color: MINERAL_COLOR[m]||'#10b981' } : {}}
                onClick={() => toggleMineral(m)}
              >{m}</span>
            ))}
            <span className="pill" style={filterStatuses.includes('producing') ? {borderColor:'#10b981',color:'#10b981'} : {}} onClick={() => toggleStatus('producing')}>Producing</span>
            <span className="pill" style={filterStatuses.includes('exploration') ? {borderColor:'#3b82f6',color:'#3b82f6'} : {}} onClick={() => toggleStatus('exploration')}>Exploration</span>
            <span className="pill" onClick={() => setShowFilters(v=>!v)} style={showFilters ? {borderColor:'#8b5cf6',color:'#8b5cf6'} : {}}>Filters ▾</span>
            {hasFilters ? <span className="pill" style={{color:'#50606f'}} onClick={clearAll}>✕ Clear</span> : null}
          </div>
          {/* Status */}
          <div style={{ padding:'0 12px', display:'flex', alignItems:'center', gap:12, fontSize:9, color:'#50606f', flexShrink:0 }}>
            <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:4, height:4, background:'#10b981', borderRadius:'50%', display:'inline-block' }}/>LIVE</span>
            <span>DATA: Q1 2025</span>
            <span style={{ color:'#10b981' }}>{filtered.length} DEPOSITS</span>
          </div>
        </div>

        {/* ── EXPANDED FILTERS ── */}
        {showFilters && (
          <div style={{ gridColumn:'1/-1', background:'#111418', borderBottom:'1px solid rgba(255,255,255,0.07)', padding:'8px 180px 8px 13px', display:'flex', gap:16, alignItems:'center', flexWrap:'wrap' }}>
            <div style={{ display:'flex', gap:4, alignItems:'center' }}>
              <span style={{ fontSize:8, color:'#50606f', letterSpacing:.5, whiteSpace:'nowrap' }}>STATUS:</span>
              {STATUS_OPTS.map(s => (
                <span key={s} className="pill"
                  style={filterStatuses.includes(s) ? {borderColor:STATUS_RING[s]||'#64748b', color:STATUS_RING[s]||'#64748b'} : {}}
                  onClick={() => toggleStatus(s)}
                >{s.replace(/_/g,' ')}</span>
              ))}
            </div>
            <div style={{ display:'flex', gap:4, alignItems:'center' }}>
              <span style={{ fontSize:8, color:'#50606f', letterSpacing:.5, whiteSpace:'nowrap' }}>CONFIDENCE:</span>
              {CONF_OPTS.map(c => (
                <span key={c} className="pill"
                  style={filterConf.includes(c) ? {borderColor: c==='high'?'#10b981':c==='medium'?'#f59e0b':'#ef4444', color: c==='high'?'#10b981':c==='medium'?'#f59e0b':'#ef4444'} : {}}
                  onClick={() => toggleConf(c)}
                >{c}</span>
              ))}
            </div>
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              <span style={{ fontSize:8, color:'#50606f', whiteSpace:'nowrap' }}>MIN OPP: {minOpp}</span>
              <input type="range" min={0} max={100} step={5} value={minOpp} onChange={e=>setMinOpp(+e.target.value)} style={{ width:80, padding:0 }}/>
            </div>
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              <span style={{ fontSize:8, color:'#50606f', whiteSpace:'nowrap' }}>MAX DIFF: {maxDiff}</span>
              <input type="range" min={0} max={100} step={5} value={maxDiff} onChange={e=>setMaxDiff(+e.target.value)} style={{ width:80, padding:0 }}/>
            </div>
          </div>
        )}

        {/* ── SIDEBAR ── */}
        <Sidebar active={activePage} onNavigate={handleNav} />

        {/* ── MAP ── */}
        <div style={{ position:'relative', background:'#0b0e12', overflow:'hidden' }}>
          <StratMap deposits={filtered} selectedId={selectedId} onSelect={setSelectedId} />

          {/* Map overlay badges */}
          <div style={{ position:'absolute', bottom:10, left:10, background:'rgba(11,14,18,0.9)', border:'1px solid rgba(255,255,255,0.07)', padding:'8px 10px', borderRadius:3, zIndex:1000, pointerEvents:'none' }}>
            <div style={{ fontSize:8, color:'#50606f', letterSpacing:'1px', marginBottom:5 }}>MINERAL TYPE</div>
            {Object.entries(MINERAL_COLOR).map(([name, color]) => (
              <div key={name} style={{ display:'flex', alignItems:'center', gap:5, marginBottom:3, fontSize:9, color:'#8e99a8' }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:color, flexShrink:0 }}/>
                {name}
              </div>
            ))}
            <div style={{ marginTop:5, paddingTop:5, borderTop:'1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize:8, color:'#50606f', letterSpacing:'1px', marginBottom:4 }}>STATUS RING</div>
              {[['Producing','#10b981'],['Exploration','#3b82f6'],['Construction','#f97316'],['Undeveloped','#64748b']].map(([s,c])=>(
                <div key={s} style={{ display:'flex', alignItems:'center', gap:5, marginBottom:3, fontSize:9, color:'#8e99a8' }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', border:`1.5px solid ${c}`, background:'transparent', flexShrink:0 }}/>
                  {s}
                </div>
              ))}
            </div>
          </div>

          <div style={{ position:'absolute', top:8, left:'50%', transform:'translateX(-50%)', background:'rgba(11,14,18,0.8)', border:'1px solid rgba(255,255,255,0.07)', padding:'3px 10px', borderRadius:2, fontSize:8, color:'#50606f', letterSpacing:.4, zIndex:1000, whiteSpace:'nowrap', pointerEvents:'none' }}>
            EPSG:4326 · Carto Dark Matter · Natural Earth · Leaflet 1.9
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <IntelPanel
          deposit={selectedDeposit}
          onViewDeposit={id => alert(`Opening full deposit view for: ${id} — wire to /deposits/${id} page`)}
          onCompare={id => alert(`Compare: ${id}`)}
          onSources={id => alert(`Sources: ${id}`)}
          onPaleo={id => alert(`Paleo context: ${id}`)}
        />

        {/* ── KPI BAR ── */}
        <div style={{ gridColumn:'1/-1', background:'#12161c', borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', height:80 }}>
          {[
            { label:'DEPOSITS TRACKED',   val: filteredKpis.total_deposits.toLocaleString(), sub:`of ${DEPOSITS.length} total`,       color:'#10b981' },
            { label:'COUNTRIES COVERED',  val: filteredKpis.countries_covered.toString(),    sub:'across 6 continents',               color:'#e4e8ed' },
            { label:'CRITICAL MINERALS',  val: filteredKpis.minerals_covered.toString(),     sub:'IEA priority list',                 color:'#e4e8ed' },
            { label:'PRODUCING MINES',    val: filteredKpis.producing.toLocaleString(),       sub:'active extraction',                 color:'#cd7c3f' },
            { label:'UNDEVELOPED ASSETS', val: filteredKpis.undeveloped.toLocaleString(),     sub:'pre-production',                    color:'#f59e0b' },
            { label:'HIGH OPPORTUNITY',   val: filteredKpis.high_opportunity.toLocaleString(),sub:'score ≥ 75',                        color:'#10b981' },
            { label:'AVG OPP. SCORE',     val: filteredKpis.avg_opportunity.toString(),       sub:'across filtered set',              color:'#8b5cf6' },
          ].map(({ label, val, sub, color }, i, arr) => (
            <div
              key={label}
              style={{
                flex:1, padding:'8px 12px', borderRight: i < arr.length-1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                display:'flex', flexDirection:'column', justifyContent:'center',
                cursor:'pointer', transition:'background .12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background='rgba(255,255,255,0.018)')}
              onMouseLeave={e => (e.currentTarget.style.background='transparent')}
            >
              <div style={{ fontSize:7, color:'#50606f', letterSpacing:.7, marginBottom:2 }}>{label}</div>
              <div style={{ fontSize:16, fontWeight:700, color, letterSpacing:-.5 }}>{val}</div>
              <div style={{ fontSize:7, color:'#50606f', marginTop:1 }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
      `}</style>
    </>
  );
}
