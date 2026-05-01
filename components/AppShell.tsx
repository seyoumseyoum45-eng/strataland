'use client';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { Deposit } from '../types';
import { DEPOSITS, computeKPIs, isAfrica, getPaleoContext } from '../lib/localData';

const StratMap = dynamic(() => import('../components/StratMap'), {
  ssr: false,
  loading: () => (
    <div style={{ width:'100%', height:'100%', background:'#05070b', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(0,255,213,0.4)', fontSize:11, letterSpacing:2 }}>
      LOADING MAP LAYER...
    </div>
  ),
});

// ── Constants ──────────────────────────────────────────────────
const MINERALS = ['Lithium','Copper','Cobalt','Nickel','Rare Earths','Uranium','Graphite','Manganese'];
const MINERAL_COLORS: Record<string,string> = {
  'Lithium':'#25f5a6', 'Copper':'#ff7a22', 'Cobalt':'#3f8cff',
  'Nickel':'#27d8b2', 'Rare Earths':'#a855f7', 'Uranium':'#f6b93b',
  'Graphite':'#94a3b8', 'Manganese':'#22d3ee', 'Tantalum':'#ffffff',
};

// ── Sidebar nav items ─────────────────────────────────────────
const NAV = [
  { section:'PLATFORM', items:[
    { id:'dashboard', label:'Dashboard',       icon:'⊞' },
    { id:'map',       label:'Global Map',       icon:'◎' },
    { id:'watchlist', label:'Watchlist',        icon:'★' },
  ]},
  { section:'REGIONS', items:[
    { id:'africa',    label:'Africa Focus',     icon:'🌍', accent:'#22d3ee' },
  ]},
  { section:'MINERALS', items: ['Lithium','Copper','Cobalt','Nickel','Rare Earths','Uranium','Graphite','Manganese'].map(m => ({ id:m.toLowerCase().replace(' ','-'), label:m, icon:'●', mineral:m })) },
  { section:'ANALYTICS', items:[
    { id:'rankings',  label:'Rankings',         icon:'↑↓' },
    { id:'prices',    label:'Price Signals',     icon:'〜' },
    { id:'risk',      label:'Supply Risk',       icon:'⚠' },
    { id:'pipeline',  label:'Discovery Pipeline',icon:'⬡' },
  ]},
  { section:'INTELLIGENCE', items:[
    { id:'ai',      label:'AI Research',         icon:'◈' },
    { id:'sources', label:'Sources',             icon:'☰' },
  ]},
];

// ── Mini sparkline SVG ─────────────────────────────────────────
function Sparkline({ color, up }: { color: string; up: boolean }) {
  const pts = up
    ? '0,18 8,14 16,15 24,10 32,11 40,7 48,8 56,4 64,5 72,2'
    : '0,4 8,7 16,6 24,10 32,9 40,13 48,12 56,15 64,14 72,18';
  return (
    <svg width="74" height="20" viewBox="0 0 74 20" fill="none" style={{ display:'block' }}>
      <polyline points={pts} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.85"/>
    </svg>
  );
}

// ── Mini bar chart for "Deposits by Status" ────────────────────
function StatusBar({ label, count, total, color }: { label:string; count:number; total:number; color:string }) {
  const pct = Math.round((count/total)*100);
  return (
    <div style={{ marginBottom:6 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
        <span style={{ fontSize:11, color:'#94a3b8', display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:color, display:'inline-block', flexShrink:0 }}/>
          {label}
        </span>
        <span style={{ fontSize:11, color:'#e2e8f0', fontWeight:500 }}>{count}</span>
      </div>
      <div style={{ height:3, background:'rgba(255,255,255,0.06)', borderRadius:2, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:2, transition:'width .6s' }}/>
      </div>
    </div>
  );
}

// ── Gauge SVG for Supply Risk ──────────────────────────────────
function Gauge({ value }: { value: number }) {
  const angle = -130 + (value / 100) * 260;
  const rad   = (angle * Math.PI) / 180;
  const cx = 40, cy = 44, r = 32;
  const nx  = cx + r * Math.cos(rad);
  const ny  = cy + r * Math.sin(rad);
  return (
    <svg width="80" height="56" viewBox="0 0 80 56">
      <path d="M 10 44 A 32 32 0 0 1 70 44" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" strokeLinecap="round"/>
      <path d="M 10 44 A 32 32 0 0 1 70 44" fill="none" stroke="#ffd600" strokeWidth="5" strokeLinecap="round"
        strokeDasharray={`${(value/100)*100.5} 100.5`} opacity="0.8"/>
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#ffd600" strokeWidth="2" strokeLinecap="round"/>
      <circle cx={cx} cy={cy} r="3" fill="#ffd600"/>
    </svg>
  );
}

// ── Donut SVG for Critical Minerals ───────────────────────────
function Donut({ value, max }: { value: number; max: number }) {
  const r = 22, circ = 2 * Math.PI * r;
  const dash = (value / max) * circ;
  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5"/>
      <circle cx="28" cy="28" r={r} fill="none" stroke="#00ffd5" strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ * 0.25} strokeLinecap="round" opacity="0.85"/>
      <text x="28" y="33" textAnchor="middle" fill="#00ffd5" fontSize="13" fontWeight="700" fontFamily="Inter,sans-serif">{value}</text>
    </svg>
  );
}

// ── Globe SVG ─────────────────────────────────────────────────
function GlobeIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="20" stroke="rgba(0,255,213,0.3)" strokeWidth="1"/>
      <ellipse cx="24" cy="24" rx="11" ry="20" stroke="rgba(0,255,213,0.2)" strokeWidth="1"/>
      <line x1="4" y1="24" x2="44" y2="24" stroke="rgba(0,255,213,0.2)" strokeWidth="1"/>
      <line x1="4" y1="16" x2="44" y2="16" stroke="rgba(0,255,213,0.12)" strokeWidth="0.5"/>
      <line x1="4" y1="32" x2="44" y2="32" stroke="rgba(0,255,213,0.12)" strokeWidth="0.5"/>
    </svg>
  );
}

// ── Main App Shell (client-only, loaded with ssr:false from page.tsx) ─────
export default function AppShell() {
  // No mounted guard needed — this component is never server-rendered.

  // ── Constants (must be declared before any useMemo/useEffect that uses them) ──
  const YEAR_MIN = 2010;
  const YEAR_MAX = 2024;

  // ── Core UI state ──────────────────────────────────────────────
  const [activePage, setActivePage]       = useState('map');
  const [selectedId, setSelectedId]       = useState<string | null>('ken');
  const [selectedDep, setSelectedDep]     = useState<Deposit | null>(
    DEPOSITS.find(d => d.id === 'ken') || null
  );
  const [searchQ, setSearchQ]             = useState('');
  const [activeMineral, setActiveMineral] = useState<string|null>(null);
  const [africaFilter, setAfricaFilter]   = useState(false);
  const [sortBy, setSortBy]               = useState<'opp'|'diff'|'conf'|'default'>('default');
  const mapFlyToRef = useRef<((lat: number, lon: number, zoom?: number) => void) | null>(null);

  // ── Timeline state (declared before filtered so useMemo can reference it) ──
  const [timelineYear, setTimelineYear] = useState<number>(YEAR_MAX);
  const [isPlaying, setIsPlaying]       = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Watchlist — persisted to localStorage ─────────────────────
  // Safe: AppShell is ssr:false, so localStorage is always available here.
  const [watchlistIds, setWatchlistIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('strataland_watchlist');
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch { return []; }
  });

  // Persist watchlist to localStorage on every change.
  useEffect(() => {
    try { localStorage.setItem('strataland_watchlist', JSON.stringify(watchlistIds)); }
    catch { /* storage unavailable — silent */ }
  }, [watchlistIds]);

  const toggleWatchlist = useCallback((id: string) => {
    setWatchlistIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  // Derive full Deposit objects for watchlist items, preserving add-order.
  const watchlistDeposits = useMemo(() =>
    watchlistIds.map(id => DEPOSITS.find(d => d.id === id)).filter(Boolean) as Deposit[],
  [watchlistIds]);

  // ── Keep selectedDep in sync with selectedId ──────────────────
  useEffect(() => {
    if (!selectedId) { setSelectedDep(null); return; }
    setSelectedDep(DEPOSITS.find(d => d.id === selectedId) || null);
  }, [selectedId]);

  // ── Filtered + sorted deposit list ────────────────────────────
  // All state variables used here (timelineYear, YEAR_MAX, sortBy, etc.)
  // must be declared above this useMemo.
  const filtered = useMemo(() => {
    let d = [...DEPOSITS];

    // Search: name, country, region, primary_mineral, secondary_minerals, operator, owner
    if (searchQ) {
      const q = searchQ.toLowerCase();
      d = d.filter(x =>
        x.name.toLowerCase().includes(q) ||
        x.country.toLowerCase().includes(q) ||
        x.primary_mineral.toLowerCase().includes(q) ||
        (x.region || '').toLowerCase().includes(q) ||
        (x.operator || '').toLowerCase().includes(q) ||
        (x.owner || '').toLowerCase().includes(q) ||
        x.secondary_minerals.some(s => s.toLowerCase().includes(q))
      );
    }
    if (activeMineral) d = d.filter(x => x.primary_mineral === activeMineral);
    if (africaFilter)  d = d.filter(x => isAfrica(x));
    if (timelineYear < YEAR_MAX) d = d.filter(x => x.last_updated_year <= timelineYear);

    if (sortBy === 'opp')  d = [...d].sort((a, b) => b.opportunity_score - a.opportunity_score);
    if (sortBy === 'diff') d = [...d].sort((a, b) => a.difficulty_score  - b.difficulty_score);
    if (sortBy === 'conf') {
      const rank = { high: 0, medium: 1, low: 2, unknown: 3 };
      d = [...d].sort((a, b) => rank[a.data_confidence] - rank[b.data_confidence]);
    }
    return d;
  }, [searchQ, activeMineral, africaFilter, sortBy, timelineYear]);

  // If the selected deposit is filtered out, advance to first visible deposit.
  useEffect(() => {
    if (!filtered.length) { setSelectedId(null); return; }
    if (!selectedId) { setSelectedId(filtered[0].id); return; }
    const stillVisible = filtered.some(d => d.id === selectedId);
    if (!stillVisible) setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  const kpis    = useMemo(() => computeKPIs(filtered), [filtered]);
  const allKpis = useMemo(() => computeKPIs(DEPOSITS), []);

  // Debug log
  useEffect(() => {
    console.log('Loading local deposits dataset');
    console.log('Deposits loaded:', DEPOSITS.length);
  }, []);

  // ── Playback interval ─────────────────────────────────────────
  useEffect(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (!isPlaying) return;
    intervalRef.current = setInterval(() => {
      setTimelineYear(prev => {
        if (prev >= YEAR_MAX) { setIsPlaying(false); return YEAR_MAX; }
        return prev + 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying]);

  const handleNav = useCallback((id: string) => {
    setActivePage(id);
    const mineralMap: Record<string,string> = { lithium:'Lithium', copper:'Copper', cobalt:'Cobalt', nickel:'Nickel', 'rare-earths':'Rare Earths', uranium:'Uranium', graphite:'Graphite', manganese:'Manganese' };
    if (mineralMap[id]) { setActiveMineral(mineralMap[id]); setAfricaFilter(false); }
    else if (id === 'map' || id === 'dashboard') { setActiveMineral(null); setAfricaFilter(false); }
    else if (id === 'africa') {
      setActiveMineral(null);
      setAfricaFilter(true);
      // Fly to Africa centre
      if (mapFlyToRef.current) mapFlyToRef.current(5, 22, 4);
    }
  }, []);

  const mc = selectedDep ? (MINERAL_COLORS[selectedDep.primary_mineral] || '#00eaff') : '#00eaff';
  const [modalOpen, setModalOpen] = useState(false);

  // Close modal on Escape key
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setModalOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen]);

  // ── Alert engine ───────────────────────────────────────────────
  // Alerts are derived from DEPOSITS using fixed trigger rules.
  // No API calls. No backend. Pure computed values from local data.
  const [alertsOpen, setAlertsOpen] = useState(false);
  const alertBellRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!alertsOpen) return;
    const handler = (e: MouseEvent) => {
      if (alertBellRef.current && !alertBellRef.current.contains(e.target as Node))
        setAlertsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [alertsOpen]);

  interface Alert { id: string; level: 'critical'|'warning'|'info'; category: string; message: string; mineral: string; country: string; }

  const alerts: Alert[] = useMemo(() => {
    const out: Alert[] = [];
    DEPOSITS.forEach(dep => {
      if (dep.opportunity_score > 80)
        out.push({ id:`opp-${dep.id}`, level:'info', category:'High Opportunity', message:`Opportunity score ${dep.opportunity_score} — significant upside flagged`, mineral:dep.primary_mineral, country:dep.country });
      if (dep.country_risk_score > 70)
        out.push({ id:`risk-${dep.id}`, level:'critical', category:'Country Risk', message:`Country risk score ${dep.country_risk_score} — elevated geopolitical exposure`, mineral:dep.primary_mineral, country:dep.country });
      if (dep.data_confidence === 'low')
        out.push({ id:`conf-${dep.id}`, level:'warning', category:'Low Confidence', message:`Data confidence LOW — independent verification required`, mineral:dep.primary_mineral, country:dep.country });
      if (dep.infrastructure_score > 60 && dep.status !== 'producing')
        out.push({ id:`infra-${dep.id}`, level:'info', category:'Infrastructure Ready', message:`Infrastructure score ${dep.infrastructure_score} — development-ready conditions`, mineral:dep.primary_mineral, country:dep.country });
    });
    // Sort: critical first, then warning, then info
    const order = { critical:0, warning:1, info:2 };
    return out.sort((a, b) => order[a.level] - order[b.level]);
  }, []);

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', width:'100vw', background:'#05070b', overflow:'hidden', fontFamily:'Inter,sans-serif' }}>

      {/* ══════════ TOP NAV BAR ══════════ */}
      <div style={{ height:52, flexShrink:0, background:'#0b0f17', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', paddingLeft:0, paddingRight:16, gap:0, zIndex:100 }}>

        {/* Logo — 260px to align with sidebar */}
        <div style={{ width:260, flexShrink:0, display:'flex', alignItems:'center', gap:10, padding:'0 20px', borderRight:'1px solid rgba(255,255,255,0.06)', height:'100%' }}>
          {/* Triangular logo mark */}
          <svg width="32" height="32" viewBox="0 0 32 32">
            <polygon points="16,2 30,28 2,28" fill="none" stroke="#00ffd5" strokeWidth="1.5" strokeLinejoin="round"/>
            <polygon points="16,9 25,24 7,24" fill="rgba(0,255,213,0.12)" stroke="#00ffd5" strokeWidth="1" strokeLinejoin="round"/>
          </svg>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:'#00ffd5', letterSpacing:'.5px', lineHeight:1.1 }}>STRATALAND</div>
            <div style={{ fontSize:9, color:'rgba(0,255,213,0.5)', letterSpacing:'1.5px', textTransform:'uppercase' }}>Critical Minerals Intelligence</div>
          </div>
        </div>

        {/* Search bar — centered */}
        <div style={{ flex:1, display:'flex', justifyContent:'center', padding:'0 20px' }}>
          <div style={{ position:'relative', width:'100%', maxWidth:480 }}>
            <svg style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', opacity:.4 }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              type="text"
              placeholder="Search deposits, regions, minerals..."
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              style={{
                width:'100%', height:40, background:'#0f1623',
                border:'1px solid rgba(255,255,255,0.08)', borderRadius:10,
                color:'#e2e8f0', fontSize:13, paddingLeft:36, paddingRight:14,
                outline:'none', fontFamily:'Inter,sans-serif',
              }}
              onFocus={e => (e.target.style.borderColor='rgba(0,255,213,0.3)')}
              onBlur={e  => (e.target.style.borderColor='rgba(255,255,255,0.08)')}
            />
          </div>
        </div>

        {/* Right icons */}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>

          {/* Alert bell */}
          <div ref={alertBellRef} style={{ position:'relative' }}>
            <div
              onClick={() => setAlertsOpen(v => !v)}
              style={{ width:34, height:34, borderRadius:8, background: alertsOpen ? 'rgba(0,234,255,0.1)' : '#0f1623', border:`1px solid ${alertsOpen ? 'rgba(0,234,255,0.3)' : 'rgba(255,255,255,0.07)'}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:14, color: alertsOpen ? '#00eaff' : '#94a3b8', position:'relative', transition:'all .15s', userSelect:'none' }}
            >
              🔔
              {/* Badge */}
              {alerts.length > 0 && (
                <span style={{ position:'absolute', top:-4, right:-4, width:16, height:16, borderRadius:'50%', background:'#ef4444', fontSize:9, fontWeight:700, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', border:'1.5px solid #05070b', letterSpacing:-.3, lineHeight:1 }}>
                  {alerts.length > 9 ? '9+' : alerts.length}
                </span>
              )}
            </div>

            {/* Dropdown */}
            {alertsOpen && (
              <div
                onClick={e => e.stopPropagation()}
                style={{ position:'absolute', top:42, right:0, width:380, maxHeight:480, background:'#0b0f17', border:'1px solid rgba(0,234,255,0.18)', borderRadius:12, boxShadow:'0 8px 40px rgba(0,0,0,0.7), 0 0 24px rgba(0,234,255,0.05)', zIndex:1000, display:'flex', flexDirection:'column', overflow:'hidden' }}
              >
                {/* Dropdown header */}
                <div style={{ padding:'12px 16px 10px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
                  <div>
                    <div style={{ fontSize:10, color:'#00eaff', letterSpacing:'1.5px', fontWeight:700 }}>ALERT ENGINE</div>
                    <div style={{ fontSize:10, color:'#334155', marginTop:1 }}>{alerts.length} alert{alerts.length !== 1 ? 's' : ''} · auto-generated from deposit scores</div>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    {[['critical','#ef4444'], ['warning','#f6b93b'], ['info','#3f8cff']].map(([lvl, col]) => {
                      const n = alerts.filter(a => a.level === lvl).length;
                      return n > 0 ? (
                        <span key={lvl} style={{ padding:'2px 7px', background:`${col}18`, border:`1px solid ${col}40`, borderRadius:10, fontSize:9, fontWeight:700, color:col, letterSpacing:.3 }}>
                          {n} {lvl}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>

                {/* Alert list */}
                <div style={{ overflowY:'auto', flex:1 }}>
                  {alerts.length === 0 ? (
                    <div style={{ padding:24, textAlign:'center', color:'#334155', fontSize:12 }}>No alerts triggered</div>
                  ) : alerts.map(alert => {
                    const lvlColor = alert.level === 'critical' ? '#ef4444' : alert.level === 'warning' ? '#f6b93b' : '#3f8cff';
                    const minColor = MINERAL_COLORS[alert.mineral] || '#94a3b8';
                    return (
                      <div
                        key={alert.id}
                        onClick={() => {
                          // Find deposit and select it
                          const dep = DEPOSITS.find(d => d.primary_mineral === alert.mineral && d.country === alert.country);
                          if (dep) { setSelectedId(dep.id); setAlertsOpen(false); }
                        }}
                        style={{ padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.04)', cursor:'pointer', transition:'background .1s', display:'flex', gap:10, alignItems:'flex-start' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        {/* Level indicator */}
                        <div style={{ width:3, borderRadius:2, background:lvlColor, alignSelf:'stretch', flexShrink:0, minHeight:36, boxShadow:`0 0 6px ${lvlColor}60` }}/>
                        <div style={{ flex:1, minWidth:0 }}>
                          {/* Category + mineral badge row */}
                          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3, flexWrap:'wrap' }}>
                            <span style={{ fontSize:10, fontWeight:700, color:lvlColor, letterSpacing:.4 }}>
                              {alert.level.toUpperCase()} · {alert.category.toUpperCase()}
                            </span>
                            <span style={{ padding:'1px 7px', background:`${minColor}14`, border:`1px solid ${minColor}35`, borderRadius:10, fontSize:9, color:minColor, fontWeight:600 }}>
                              {alert.mineral}
                            </span>
                          </div>
                          {/* Message */}
                          <div style={{ fontSize:11, color:'#64748b', lineHeight:1.45, marginBottom:2 }}>{alert.message}</div>
                          {/* Country */}
                          <div style={{ fontSize:10, color:'#334155' }}>📍 {alert.country}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div style={{ padding:'8px 16px', borderTop:'1px solid rgba(255,255,255,0.05)', fontSize:10, color:'#1e3a4a', flexShrink:0 }}>
                  Alerts are derived from local deposit scores · No external data
                </div>
              </div>
            )}
          </div>

          {/* Static utility icons */}
          {(['⚡','?'] as const).map((ic, i) => (
            <div key={i} style={{ width:34, height:34, borderRadius:8, background:'#0f1623', border:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:14, color:'#94a3b8' }}>{ic}</div>
          ))}
          <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#00ffd5,#0088aa)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#05070b', cursor:'pointer', marginLeft:4 }}>SA</div>
        </div>
      </div>

      {/* ══════════ FILTER PILLS ROW ══════════ */}
      <div style={{ height:44, flexShrink:0, background:'#0b0f17', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', paddingLeft:272, paddingRight:16, gap:6, overflowX:'auto' }}>
        {/* Africa quick filter */}
        <button
          onClick={() => { setAfricaFilter(v => !v); if (!africaFilter && mapFlyToRef.current) mapFlyToRef.current(5, 22, 4); if (africaFilter && mapFlyToRef.current) mapFlyToRef.current(20, 10, 3); }}
          style={{
            padding:'5px 14px', borderRadius:20, fontSize:12, fontWeight:600,
            border: africaFilter ? '1px solid #22d3ee' : '1px solid rgba(34,211,238,0.25)',
            background: africaFilter ? 'rgba(34,211,238,0.18)' : 'rgba(34,211,238,0.06)',
            color: africaFilter ? '#22d3ee' : '#64748b',
            cursor:'pointer', whiteSpace:'nowrap', flexShrink:0, transition:'all .15s',
            boxShadow: africaFilter ? '0 0 10px rgba(34,211,238,0.25)' : 'none',
            fontFamily:'Inter,sans-serif',
          }}
        >🌍 Africa</button>
        <div style={{ width:1, height:20, background:'rgba(255,255,255,0.08)', flexShrink:0 }}/>
        {/* Mineral filters */}
        {['All', ...MINERALS].map(m => {
          const isAll = m === 'All';
          const isActive = isAll ? (activeMineral===null && !africaFilter) : activeMineral===m;
          const color = isAll ? '#00eaff' : (MINERAL_COLORS[m] || '#00eaff');
          return (
            <button
              key={m}
              onClick={() => { setActiveMineral(isAll ? null : (activeMineral===m ? null : m)); if (isAll) setAfricaFilter(false); }}
              style={{
                padding:'5px 14px', borderRadius:20, fontSize:12, fontWeight:500,
                border: isActive ? `1px solid ${color}` : '1px solid rgba(0,234,255,0.12)',
                background: isActive ? `${color}1e` : '#0e1621',
                color: isActive ? color : '#475569',
                cursor:'pointer', whiteSpace:'nowrap', flexShrink:0, transition:'all .15s',
                boxShadow: isActive ? `0 0 8px ${color}28` : 'none',
                fontFamily:'Inter,sans-serif',
              }}
            >{m}</button>
          );
        })}
        <button style={{ padding:'5px 12px', borderRadius:20, fontSize:12, border:'1px solid rgba(0,234,255,0.12)', background:'#0e1621', color:'#475569', cursor:'pointer', flexShrink:0, fontFamily:'Inter,sans-serif' }}>+ More</button>

        {/* Sort control */}
        <div style={{ width:1, height:20, background:'rgba(255,255,255,0.08)', flexShrink:0, marginLeft:4 }}/>
        <span style={{ fontSize:10, color:'#334155', flexShrink:0, letterSpacing:.5 }}>SORT:</span>
        {([
          ['default', 'Default'],
          ['opp',     '↑ Opportunity'],
          ['diff',    '↓ Difficulty'],
          ['conf',    '↑ Confidence'],
        ] as const).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setSortBy(val)}
            style={{
              padding:'4px 11px', borderRadius:20, fontSize:11, fontWeight:500,
              border: sortBy === val ? '1px solid rgba(0,234,255,0.5)' : '1px solid rgba(0,234,255,0.1)',
              background: sortBy === val ? 'rgba(0,234,255,0.12)' : '#0e1621',
              color: sortBy === val ? '#00eaff' : '#475569',
              cursor:'pointer', whiteSpace:'nowrap', flexShrink:0, transition:'all .12s',
              fontFamily:'Inter,sans-serif',
            }}
          >{label}</button>
        ))}

        {/* Active filter indicator */}
        {(africaFilter || activeMineral || searchQ || sortBy !== 'default') && (
          <button
            onClick={() => { setAfricaFilter(false); setActiveMineral(null); setSearchQ(''); setSortBy('default'); }}
            style={{ padding:'5px 10px', borderRadius:20, fontSize:11, border:'1px solid rgba(255,100,100,0.3)', background:'rgba(255,100,100,0.08)', color:'#f87171', cursor:'pointer', flexShrink:0, fontFamily:'Inter,sans-serif', marginLeft:4 }}
          >✕ Clear</button>
        )}
      </div>

      {/* ══════════ MAIN BODY ══════════ */}
      <div style={{ flex:1, display:'flex', minHeight:0 }}>

        {/* ── SIDEBAR ── */}
        <div style={{ width:260, flexShrink:0, background:'#0b0f17', borderRight:'1px solid rgba(255,255,255,0.06)', display:'flex', flexDirection:'column', overflowY:'auto', height:'100%' }}>
          <div style={{ flex:1, padding:'8px 0' }}>
            {NAV.map(({ section, items }) => (
              <div key={section} style={{ marginBottom:4 }}>
                <div style={{ fontSize:10, color:'#2d3f55', letterSpacing:'1.4px', padding:'12px 20px 6px', fontWeight:600 }}>{section}</div>
                {items.map((item: any) => {
                  const isActive = activePage === item.id;
                  const mc2 = item.mineral ? MINERAL_COLORS[item.mineral] : '#00ffd5';
                  // Watchlist gets a live count badge
                  const isWatchlist = item.id === 'watchlist';
                  return (
                    <div key={item.id}>
                      <div
                        onClick={() => handleNav(item.id)}
                        style={{
                          display:'flex', alignItems:'center', gap:10, padding:'8px 20px',
                          cursor:'pointer', borderLeft:`2px solid ${isActive ? mc2 : 'transparent'}`,
                          background: isActive ? `${mc2}0d` : 'transparent',
                          color: isActive ? mc2 : '#64748b',
                          fontSize:13, fontWeight: isActive ? 500 : 400,
                          transition:'all .12s',
                        }}
                        onMouseEnter={e => { if(!isActive) { (e.currentTarget as HTMLElement).style.color='#94a3b8'; (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.02)'; }}}
                        onMouseLeave={e => { if(!isActive) { (e.currentTarget as HTMLElement).style.color='#64748b'; (e.currentTarget as HTMLElement).style.background='transparent'; }}}
                      >
                        <span style={{ fontSize:item.mineral ? 10 : 13, color: item.mineral ? mc2 : 'inherit', flexShrink:0, width:14, textAlign:'center', opacity:.85 }}>
                          {item.mineral ? '●' : item.icon}
                        </span>
                        <span style={{ flex:1 }}>{item.label}</span>
                        {item.id === 'map' && (
                          <span style={{ fontSize:9, background:'rgba(0,255,213,0.15)', color:'#00ffd5', padding:'2px 6px', borderRadius:4, fontWeight:600 }}>LIVE</span>
                        )}
                        {isWatchlist && watchlistIds.length > 0 && (
                          <span style={{ fontSize:9, background:'rgba(251,191,36,0.15)', color:'#fbbf24', padding:'2px 7px', borderRadius:10, fontWeight:700 }}>
                            {watchlistIds.length}
                          </span>
                        )}
                      </div>

                      {/* Inline watchlist panel — only visible when watchlist is active */}
                      {isWatchlist && activePage === 'watchlist' && (
                        <div style={{ background:'rgba(0,0,0,0.2)', borderTop:'1px solid rgba(255,255,255,0.04)', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                          {watchlistDeposits.length === 0 ? (
                            <div style={{ padding:'16px 20px', textAlign:'center' }}>
                              <div style={{ fontSize:18, opacity:.2, marginBottom:6 }}>★</div>
                              <div style={{ fontSize:11, color:'#334155', lineHeight:1.5 }}>No deposits watched.<br/>Click ★ on any deposit<br/>to add it here.</div>
                            </div>
                          ) : (
                            watchlistDeposits.map(dep => {
                              const depColor = MINERAL_COLORS[dep.primary_mineral] || '#94a3b8';
                              const isSel = selectedId === dep.id;
                              return (
                                <div
                                  key={dep.id}
                                  onClick={() => {
                                    setSelectedId(dep.id);
                                    setActivePage('map');
                                    if (mapFlyToRef.current) mapFlyToRef.current(dep.latitude, dep.longitude, 6);
                                  }}
                                  style={{
                                    padding:'9px 20px 9px 28px', cursor:'pointer', transition:'background .12s',
                                    borderLeft:`2px solid ${isSel ? depColor : 'transparent'}`,
                                    background: isSel ? `${depColor}0d` : 'transparent',
                                    display:'flex', flexDirection:'column', gap:2,
                                  }}
                                  onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                                  onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                                >
                                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
                                    <span style={{ fontSize:12, color: isSel ? '#e2e8f0' : '#94a3b8', fontWeight: isSel ? 600 : 400, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
                                      {dep.name}
                                    </span>
                                    <span
                                      onClick={e => { e.stopPropagation(); toggleWatchlist(dep.id); }}
                                      title="Remove from watchlist"
                                      style={{ fontSize:11, color:'#fbbf24', cursor:'pointer', flexShrink:0, opacity:.7, padding:'1px 3px' }}
                                    >★</span>
                                  </div>
                                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                                    <span style={{ width:5, height:5, borderRadius:'50%', background:depColor, flexShrink:0 }}/>
                                    <span style={{ fontSize:10, color:'#475569' }}>{dep.primary_mineral}</span>
                                    <span style={{ fontSize:10, color:'#334155' }}>·</span>
                                    <span style={{ fontSize:10, color:'#334155', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{dep.country}</span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* System Status */}
          <div style={{ padding:'14px 20px 16px', borderTop:'1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize:9, color:'#2d3f55', letterSpacing:'1.4px', fontWeight:600, marginBottom:8 }}>SYSTEM STATUS</div>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:'#00ffa6', boxShadow:'0 0 6px #00ffa6', animation:'coreBlink 2s ease-in-out infinite', flexShrink:0 }}/>
              <span style={{ fontSize:11, color:'#00ffa6', fontWeight:600, letterSpacing:'.5px' }}>OPERATIONAL</span>
            </div>
            <div style={{ fontSize:10, color:'#2d3f55' }}>Last updated</div>
            <div style={{ fontSize:10, color:'#475569' }}>May 4, 2025 10:42 AM UTC</div>
            <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:4, color:'#00ffd5', fontSize:10, cursor:'pointer', opacity:.6 }}>›› View system logs</div>
          </div>
        </div>

        {/* ── MAP ── */}
        <div style={{ flex:1, position:'relative', minWidth:0 }}>
          <StratMap
            deposits={filtered}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMapReady={(flyTo) => { mapFlyToRef.current = flyTo; }}
          />

          {/* Mineral type legend on map */}
          <div style={{ position:'absolute', bottom:16, left:16, background:'rgba(11,15,23,0.9)', border:'1px solid rgba(0,255,213,0.15)', padding:'12px 14px', borderRadius:10, zIndex:500, backdropFilter:'blur(4px)' }}>
            <div style={{ fontSize:9, color:'#475569', letterSpacing:'1.2px', marginBottom:8, fontWeight:600 }}>MINERAL TYPE</div>
            {MINERALS.map(m => (
              <div key={m} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5, fontSize:11, color:'#94a3b8', cursor:'pointer' }} onClick={() => setActiveMineral(activeMineral===m?null:m)}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:MINERAL_COLORS[m], boxShadow:`0 0 5px ${MINERAL_COLORS[m]}80`, flexShrink:0 }}/>
                {m}
              </div>
            ))}
          </div>

          {/* Map toolbar top-left */}
          <div style={{ position:'absolute', top:12, left:12, display:'flex', flexDirection:'column', gap:4, zIndex:500 }}>
            {['⛶','⧉'].map((ic,i) => (
              <div key={i} style={{ width:32, height:32, background:'rgba(14,22,33,0.9)', border:'1px solid rgba(0,255,213,0.15)', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#00ffd5', fontSize:14, backdropFilter:'blur(4px)' }}>{ic}</div>
            ))}
          </div>

          {/* 2D/target controls top-right */}
          <div style={{ position:'absolute', top:12, right:12, display:'flex', gap:4, zIndex:500 }}>
            <div style={{ padding:'6px 12px', background:'rgba(14,22,33,0.9)', border:'1px solid rgba(0,255,213,0.25)', borderRadius:7, color:'#00ffd5', fontSize:11, fontWeight:600, cursor:'pointer', backdropFilter:'blur(4px)' }}>2D</div>
            <div style={{ width:32, height:32, background:'rgba(14,22,33,0.9)', border:'1px solid rgba(0,255,213,0.15)', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#00ffd5', fontSize:14, backdropFilter:'blur(4px)' }}>⊕</div>
          </div>
        </div>

        {/* ── RIGHT INTELLIGENCE PANEL ── */}
        <div style={{ width:360, flexShrink:0, background:'#071018', borderLeft:'1px solid rgba(0,255,213,0.18)', display:'flex', flexDirection:'column', overflowY:'auto' }}>

          {/* Header */}
          <div style={{ padding:'14px 16px 12px', borderBottom:'1px solid rgba(0,255,213,0.1)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ fontSize:10, color:'#00eaff', letterSpacing:'1.4px', fontWeight:600 }}>SELECTED DEPOSIT</div>
            <div style={{ fontSize:10, color:'#334155', letterSpacing:.5 }}>
              {filtered.length} deposit{filtered.length !== 1 ? 's' : ''} loaded
            </div>
          </div>

          {selectedDep ? (
            <>
              {/* Deposit name & mineral badge */}
              <div style={{ padding:'14px 16px 10px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:6 }}>
                  <div style={{ fontSize:18, fontWeight:700, color:'#fff', lineHeight:1.2, flex:1, letterSpacing:-.2 }}>{selectedDep.name}</div>
                  <span style={{ padding:'4px 10px', background:`${mc}22`, border:`1px solid ${mc}60`, borderRadius:20, fontSize:11, fontWeight:600, color:mc, flexShrink:0, whiteSpace:'nowrap', marginTop:2 }}>{selectedDep.primary_mineral}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#475569' }}>
                  <span style={{ fontSize:13 }}>🌍</span>
                  <span>{selectedDep.region ? `${selectedDep.region}, ` : ''}{selectedDep.country}</span>
                </div>
              </div>

              {/* Terrain image preview — rich satellite-style placeholder */}
              <div style={{ margin:'12px 16px 10px', borderRadius:12, overflow:'hidden', position:'relative', height:150, border:`1px solid ${mc}40`, background:`linear-gradient(160deg,#071a26 0%,#0b2233 30%,#0e2a1a 55%,#152b0e 75%,#1c2808 100%)` }}>
                {/* Terrain texture layer */}
                <div style={{ position:'absolute', inset:0, background:`radial-gradient(ellipse at 30% 40%,rgba(20,80,40,0.5) 0%,transparent 60%),radial-gradient(ellipse at 70% 60%,rgba(10,40,60,0.4) 0%,transparent 50%)` }}/>
                {/* Scan lines */}
                <div style={{ position:'absolute', inset:0, backgroundImage:`repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,234,255,0.015) 3px,rgba(0,234,255,0.015) 4px)` }}/>
                {/* Target radar */}
                <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ position:'relative', width:80, height:80 }}>
                    <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:`1px solid ${mc}35` }}/>
                    <div style={{ position:'absolute', inset:10, borderRadius:'50%', border:`1px solid ${mc}50` }}/>
                    <div style={{ position:'absolute', inset:22, borderRadius:'50%', border:`1px solid ${mc}70` }}/>
                    {/* Cross-hair lines */}
                    <div style={{ position:'absolute', top:'50%', left:0, right:0, height:1, background:`linear-gradient(90deg,transparent,${mc}60,${mc}80,${mc}60,transparent)`, transform:'translateY(-50%)' }}/>
                    <div style={{ position:'absolute', left:'50%', top:0, bottom:0, width:1, background:`linear-gradient(180deg,transparent,${mc}60,${mc}80,${mc}60,transparent)`, transform:'translateX(-50%)' }}/>
                    <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:10, height:10, borderRadius:'50%', background:mc, boxShadow:`0 0 10px ${mc},0 0 20px ${mc}60` }}/>
                  </div>
                </div>
                {/* Coord label */}
                <div style={{ position:'absolute', bottom:8, left:10, fontSize:9, color:'rgba(0,234,255,0.6)', letterSpacing:.8, fontFamily:'Inter,sans-serif' }}>
                  {selectedDep.latitude.toFixed(3)}° {selectedDep.latitude >= 0 ? 'N' : 'S'} &nbsp; {Math.abs(selectedDep.longitude).toFixed(3)}° {selectedDep.longitude >= 0 ? 'E' : 'W'}
                </div>
                <div style={{ position:'absolute', top:8, right:8, fontSize:9, color:mc, background:`${mc}18`, padding:'2px 8px', borderRadius:10, letterSpacing:.6, border:`1px solid ${mc}35` }}>
                  SAT VIEW
                </div>
                <div style={{ position:'absolute', bottom:8, right:8, fontSize:9, color:'rgba(0,234,255,0.45)', letterSpacing:.5 }}>
                  LIVE ●
                </div>
              </div>

              {/* Key Facts */}
              <div style={{ padding:'2px 16px 12px' }}>
                <div style={{ fontSize:10, color:'#00eaff', letterSpacing:'1.4px', fontWeight:600, marginBottom:10, opacity:.7 }}>KEY FACTS</div>
                {[
                  { label:'Status',    val: selectedDep.status.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()) },
                  { label:'Resource',  val: selectedDep.resource_size_tonnes ? (selectedDep.resource_size_tonnes >= 1e9 ? `${(selectedDep.resource_size_tonnes/1e9).toFixed(1)} Bt` : `${(selectedDep.resource_size_tonnes/1e6).toFixed(0)} Mt`) : 'Measured & Indicated' },
                  { label:'Size',      val: selectedDep.opportunity_score >= 85 ? 'World-class' : selectedDep.opportunity_score >= 70 ? 'Major' : 'Significant' },
                  { label: selectedDep.grade_unit.includes('Li') ? 'Li₂O Grade' : 'Grade', val: selectedDep.grade_percent ? `${selectedDep.grade_percent} ${selectedDep.grade_unit}` : '—' },
                  { label:'Ownership', val: selectedDep.operator || selectedDep.owner || '—' },
                  { label:'Last Updated', val: 'May 4, 2025' },
                ].map(({ label, val }) => (
                  <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize:12, color:'#475569', flexShrink:0 }}>{label}</span>
                    <span style={{ fontSize:12, color:'#e2e8f0', textAlign:'right', maxWidth:190, lineHeight:1.4 }}>{val}</span>
                  </div>
                ))}
              </div>

              {/* Score bars */}
              <div style={{ padding:'0 16px 12px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
                {[
                  { label:'Opportunity', val:selectedDep.opportunity_score,     color:'#25f5a6' },
                  { label:'Difficulty',  val:selectedDep.difficulty_score,      color:'#f6b93b' },
                  { label:'Underutil.',  val:selectedDep.underutilization_score, color:'#a855f7' },
                ].map(({label,val,color}) => (
                  <div key={label} style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${color}30`, borderRadius:8, padding:'8px 6px', textAlign:'center' }}>
                    <div style={{ fontSize:8, color:'#475569', letterSpacing:.5, marginBottom:4 }}>{label.toUpperCase()}</div>
                    <div style={{ fontSize:22, fontWeight:700, color, lineHeight:1, textShadow:`0 0 12px ${color}60` }}>{val}</div>
                    <div style={{ height:2, background:'rgba(255,255,255,0.06)', borderRadius:1, marginTop:5, overflow:'hidden' }}>
                      <div style={{ width:`${val}%`, height:'100%', background:color, borderRadius:1, boxShadow:`0 0 4px ${color}` }}/>
                    </div>
                  </div>
                ))}
              </div>

              {/* View Full Report */}
              <div style={{ padding:'0 16px 10px' }}>
                <button
                  style={{ width:'100%', padding:'11px', background:'transparent', border:`1px solid ${mc}55`, color:mc, fontSize:12, fontWeight:500, borderRadius:10, cursor:'pointer', fontFamily:'Inter,sans-serif', letterSpacing:.4, transition:'all .2s' }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=`${mc}15`;(e.currentTarget as HTMLElement).style.boxShadow=`0 0 12px ${mc}25`;}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='transparent';(e.currentTarget as HTMLElement).style.boxShadow='none';}}>
                  View Full Report
                </button>
              </div>

              {/* Intelligence Summary */}
              <div style={{ margin:'0 16px 10px', padding:'12px 14px', background:'rgba(0,234,255,0.04)', border:'1px solid rgba(0,234,255,0.14)', borderRadius:10 }}>
                <div style={{ fontSize:10, color:'#00eaff', letterSpacing:'1.4px', fontWeight:600, marginBottom:8, opacity:.7 }}>INTELLIGENCE SUMMARY</div>
                <p style={{ fontSize:12, color:'#94a3b8', lineHeight:1.65, margin:0 }}>
                  {selectedDep.ai_summary || `${selectedDep.name} is a significant ${selectedDep.primary_mineral.toLowerCase()} deposit in ${selectedDep.country}, representing a key asset in the global critical minerals supply chain.`}
                </p>
              </div>

              {/* Paleo / Geologic Context */}
              {(() => {
                const paleo = getPaleoContext(selectedDep);
                return (
                  <div style={{ margin:'0 16px 10px', padding:'12px 14px', background:'rgba(168,85,247,0.04)', border:'1px solid rgba(168,85,247,0.2)', borderRadius:10 }}>
                    <div style={{ fontSize:10, color:'#a855f7', letterSpacing:'1.4px', fontWeight:600, marginBottom:6, opacity:.85 }}>PALEO / GEOLOGIC CONTEXT</div>
                    <div style={{ fontSize:12, color:'#c4b5fd', fontWeight:500, marginBottom:6 }}>{paleo.label}</div>
                    <p style={{ fontSize:11, color:'#64748b', lineHeight:1.6, margin:0 }}>{paleo.note}</p>
                    {selectedDep.paleo_setting && (
                      <div style={{ marginTop:8, paddingTop:8, borderTop:'1px solid rgba(168,85,247,0.15)', fontSize:11, color:'#7c3aed', opacity:.7, fontStyle:'italic' }}>
                        {selectedDep.paleo_setting}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* View Intelligence */}
              <div style={{ padding:'0 16px 12px' }}>
                <button
                  onClick={() => setModalOpen(true)}
                  style={{ width:'100%', padding:'11px', background:'rgba(0,234,255,0.08)', border:'1px solid rgba(0,234,255,0.28)', color:'#00eaff', fontSize:12, fontWeight:500, borderRadius:10, cursor:'pointer', fontFamily:'Inter,sans-serif', letterSpacing:.4 }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(0,234,255,0.14)';}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='rgba(0,234,255,0.08)';}}>
                  View Intelligence
                </button>
              </div>

              {/* Action icon row */}
              <div style={{ padding:'8px 16px 16px', display:'flex', gap:6, borderTop:'1px solid rgba(255,255,255,0.05)' }}>
                {([['📄','Report'],['📊','Charts'],['🔗','Share'],['···','More']] as [string,string][]).map(([ic,tip]) => (
                  <div key={tip} title={tip} style={{ flex:1, height:34, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:14, color:'#334155', transition:'all .15s' }}
                    onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color='#00eaff';(e.currentTarget as HTMLElement).style.borderColor='rgba(0,234,255,0.25)';(e.currentTarget as HTMLElement).style.background='rgba(0,234,255,0.06)';}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color='#334155';(e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,0.07)';(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.03)';}}>
                    {ic}
                  </div>
                ))}
                {/* Watchlist star — filled yellow when watched */}
                {(() => {
                  const watched = watchlistIds.includes(selectedDep.id);
                  return (
                    <div
                      title={watched ? 'Remove from Watchlist' : 'Add to Watchlist'}
                      onClick={() => toggleWatchlist(selectedDep.id)}
                      style={{
                        flex:1, height:34, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center',
                        cursor:'pointer', fontSize:16, transition:'all .15s',
                        background: watched ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.03)',
                        border: watched ? '1px solid rgba(251,191,36,0.4)' : '1px solid rgba(255,255,255,0.07)',
                        color: watched ? '#fbbf24' : '#334155',
                        boxShadow: watched ? '0 0 8px rgba(251,191,36,0.25)' : 'none',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.color='#fbbf24';
                        (e.currentTarget as HTMLElement).style.borderColor='rgba(251,191,36,0.4)';
                        (e.currentTarget as HTMLElement).style.background='rgba(251,191,36,0.1)';
                      }}
                      onMouseLeave={e => {
                        if (!watchlistIds.includes(selectedDep.id)) {
                          (e.currentTarget as HTMLElement).style.color='#334155';
                          (e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,0.07)';
                          (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.03)';
                        } else {
                          (e.currentTarget as HTMLElement).style.color='#fbbf24';
                          (e.currentTarget as HTMLElement).style.borderColor='rgba(251,191,36,0.4)';
                          (e.currentTarget as HTMLElement).style.background='rgba(251,191,36,0.12)';
                        }
                      }}
                    >
                      {watched ? '★' : '☆'}
                    </div>
                  );
                })()}
              </div>
            </>
          ) : (
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, color:'#1e3a4a', textAlign:'center' }}>
              <div style={{ fontSize:40, marginBottom:14, opacity:.3 }}>◎</div>
              <div style={{ fontSize:13, color:'#334155', marginBottom:6 }}>No deposit selected</div>
              <div style={{ fontSize:11, color:'#1e3a4a', lineHeight:1.6 }}>Click any marker on the map<br/>to load deposit intelligence</div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════ BOTTOM SECTION: TIMELINE + METRICS ══════════ */}
      <div style={{ flexShrink:0, background:'#071018', borderTop:'1px solid rgba(0,234,255,0.12)' }}>

        {/* ── Timeline control strip ── */}
        <div style={{ height:52, display:'flex', alignItems:'center', gap:12, padding:'0 14px', borderBottom:'1px solid rgba(0,234,255,0.07)' }}>
          {/* Play / Pause */}
          <button
            onClick={() => {
              if (isPlaying) { setIsPlaying(false); }
              else {
                // If at max, rewind then play
                if (timelineYear >= YEAR_MAX) setTimelineYear(YEAR_MIN);
                setIsPlaying(true);
              }
            }}
            style={{
              width:34, height:34, borderRadius:8, flexShrink:0,
              background: isPlaying ? 'rgba(0,234,255,0.15)' : 'rgba(0,234,255,0.06)',
              border: `1px solid ${isPlaying ? 'rgba(0,234,255,0.5)' : 'rgba(0,234,255,0.2)'}`,
              color:'#00eaff', cursor:'pointer', fontSize:16, display:'flex',
              alignItems:'center', justifyContent:'center',
              boxShadow: isPlaying ? '0 0 10px rgba(0,234,255,0.2)' : 'none',
              transition:'all .15s', fontFamily:'Inter,sans-serif',
            }}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          {/* Year label */}
          <div style={{ flexShrink:0, minWidth:46, textAlign:'center' }}>
            <div style={{ fontSize:18, fontWeight:700, color:'#00eaff', lineHeight:1, letterSpacing:-0.5, textShadow:'0 0 14px rgba(0,234,255,0.4)' }}>
              {timelineYear === YEAR_MAX ? 'NOW' : timelineYear}
            </div>
            <div style={{ fontSize:9, color:'#334155', letterSpacing:.5, marginTop:2 }}>YEAR</div>
          </div>

          {/* Slider track */}
          <div style={{ flex:1, position:'relative', height:34, display:'flex', alignItems:'center' }}>
            {/* Year tick marks */}
            <div style={{ position:'absolute', top:0, left:0, right:0, display:'flex', justifyContent:'space-between', pointerEvents:'none' }}>
              {Array.from({ length: YEAR_MAX - YEAR_MIN + 1 }, (_, i) => YEAR_MIN + i).map(y => (
                <div key={y} style={{
                  display:'flex', flexDirection:'column', alignItems:'center', gap:1,
                  opacity: y <= timelineYear ? 1 : 0.2,
                }}>
                  <div style={{
                    width: y % 5 === 0 ? 2 : 1,
                    height: y % 5 === 0 ? 8 : 4,
                    background: y <= timelineYear ? '#00eaff' : '#1e3a4a',
                    borderRadius:1,
                  }}/>
                  {y % 5 === 0 && (
                    <div style={{ fontSize:8, color: y <= timelineYear ? '#00eaff' : '#1e3a4a', letterSpacing:.3, marginTop:1 }}>
                      {y === YEAR_MAX ? 'NOW' : y}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Actual range input */}
            <input
              type="range"
              min={YEAR_MIN}
              max={YEAR_MAX}
              value={timelineYear}
              onChange={e => { setIsPlaying(false); setTimelineYear(Number(e.target.value)); }}
              style={{
                position:'absolute', left:0, right:0, bottom:0,
                width:'100%', height:20,
                appearance:'none', WebkitAppearance:'none',
                background:'transparent', cursor:'pointer', outline:'none',
              }}
            />
          </div>

          {/* Deposit count badge */}
          <div style={{ flexShrink:0, textAlign:'right', minWidth:64 }}>
            <div style={{ fontSize:17, fontWeight:700, color:'#e2e8f0', lineHeight:1 }}>{filtered.length}</div>
            <div style={{ fontSize:9, color:'#334155', letterSpacing:.5, marginTop:2 }}>VISIBLE</div>
          </div>

          {/* Reset to present */}
          {timelineYear < YEAR_MAX && (
            <button
              onClick={() => { setIsPlaying(false); setTimelineYear(YEAR_MAX); }}
              style={{
                flexShrink:0, padding:'5px 10px', borderRadius:8, fontSize:10,
                border:'1px solid rgba(0,234,255,0.2)', background:'rgba(0,234,255,0.05)',
                color:'#00eaff', cursor:'pointer', fontFamily:'Inter,sans-serif', transition:'all .15s',
              }}
              title="Jump to present"
            >Now</button>
          )}
        </div>

        {/* ── KPI tiles row ── */}
        <div style={{ height:110, display:'flex', gap:8, padding:'8px 10px', overflowX:'auto' }}>
        {([
          {
            key:'deposits', label:'DEPOSITS TRACKED',
            content: (
              <div style={{ display:'flex', alignItems:'flex-end', gap:10, flex:1, minWidth:0 }}>
                <div>
                  <div style={{ fontSize:32, fontWeight:700, color:'#00eaff', lineHeight:1, letterSpacing:-1.5, textShadow:'0 0 20px rgba(0,234,255,0.4)' }}>{kpis.total_deposits}</div>
                  <div style={{ fontSize:10, color:'#334155', marginTop:4 }}>{(africaFilter || activeMineral) ? `of ${allKpis.total_deposits} total` : 'in database'}</div>
                </div>
                <div style={{ marginBottom:6, flex:1 }}><Sparkline color="#00eaff" up={true}/></div>
              </div>
            ),
          },
          {
            key:'africa', label:'AFRICAN DEPOSITS',
            content: (
              <div style={{ display:'flex', alignItems:'center', gap:8, flex:1 }}>
                <div>
                  <div style={{ fontSize:32, fontWeight:700, color:'#22d3ee', lineHeight:1, letterSpacing:-1, textShadow:'0 0 16px rgba(34,211,238,0.35)' }}>{allKpis.african_deposits}</div>
                  <div style={{ fontSize:10, color:'#334155', marginTop:4 }}>in database</div>
                </div>
                <button
                  onClick={() => { const next = !africaFilter; setAfricaFilter(next); if (next && mapFlyToRef.current) mapFlyToRef.current(5, 22, 4); else if (!next && mapFlyToRef.current) mapFlyToRef.current(20, 10, 3); }}
                  style={{ padding:'5px 10px', borderRadius:8, fontSize:10, border: africaFilter ? '1px solid #22d3ee' : '1px solid rgba(34,211,238,0.25)', background: africaFilter ? 'rgba(34,211,238,0.15)' : 'rgba(34,211,238,0.05)', color: africaFilter ? '#22d3ee' : '#475569', cursor:'pointer', fontFamily:'Inter,sans-serif', transition:'all .15s', whiteSpace:'nowrap' }}>
                  {africaFilter ? '✓ Active' : 'Focus'}
                </button>
              </div>
            ),
          },
          {
            key:'countries', label:'COUNTRIES COVERED',
            content: (
              <div style={{ display:'flex', alignItems:'center', gap:10, flex:1 }}>
                <div>
                  <div style={{ fontSize:32, fontWeight:700, color:'#e2e8f0', lineHeight:1, letterSpacing:-1 }}>{kpis.countries_covered}</div>
                  <div style={{ fontSize:10, color:'#334155', marginTop:4 }}>countries</div>
                </div>
                <GlobeIcon/>
              </div>
            ),
          },
          {
            key:'minerals', label:'CRITICAL MINERALS',
            content: (
              <div style={{ display:'flex', alignItems:'center', gap:10, flex:1 }}>
                <div>
                  <div style={{ fontSize:32, fontWeight:700, color:'#e2e8f0', lineHeight:1, letterSpacing:-1 }}>{kpis.minerals_covered}</div>
                  <div style={{ fontSize:10, color:'#334155', marginTop:4 }}>tracked</div>
                </div>
                <Donut value={kpis.minerals_covered} max={9}/>
              </div>
            ),
          },
          {
            key:'status', label:'BY STATUS',
            content: (
              <div style={{ flex:1, display:'flex', gap:10 }}>
                <div style={{ flex:1 }}>
                  <StatusBar label="Producing"   count={kpis.producing}         total={kpis.total_deposits || 1} color="#25f5a6"/>
                  <StatusBar label="Undeveloped" count={kpis.undeveloped}       total={kpis.total_deposits || 1} color="#a855f7"/>
                </div>
                <div style={{ flex:1 }}>
                  <StatusBar label="High Opp."   count={kpis.high_opportunity}  total={kpis.total_deposits || 1} color="#ff7a22"/>
                  <StatusBar label="High Conf."  count={kpis.high_confidence}   total={kpis.total_deposits || 1} color="#3f8cff"/>
                </div>
              </div>
            ),
          },
          {
            key:'risk', label:'SUPPLY RISK INDEX',
            content: (
              <div style={{ display:'flex', alignItems:'center', gap:8, flex:1 }}>
                <Gauge value={52}/>
                <div>
                  <div style={{ fontSize:19, fontWeight:700, color:'#f6b93b', letterSpacing:.3, textShadow:'0 0 12px rgba(246,185,59,0.4)' }}>MEDIUM</div>
                  <div style={{ fontSize:10, color:'#334155', marginTop:2 }}>52 / 100</div>
                </div>
              </div>
            ),
          },
          {
            key:'outlook', label:'MARKET OUTLOOK',
            content: (
              <div style={{ display:'flex', alignItems:'flex-end', gap:10, flex:1 }}>
                <div>
                  <div style={{ fontSize:19, fontWeight:700, color:'#25f5a6', letterSpacing:.3, textShadow:'0 0 12px rgba(37,245,166,0.4)' }}>POSITIVE</div>
                  <div style={{ fontSize:10, color:'#334155', marginTop:2 }}>Next 12 months</div>
                </div>
                <div style={{ marginBottom:4, flex:1 }}><Sparkline color="#25f5a6" up={true}/></div>
              </div>
            ),
          },
        ] as {key:string; label:string; content:React.ReactNode}[]).map(({ key, label, content }) => (
          <div
            key={key}
            style={{
              flex:1, minWidth:120, padding:'10px 12px',
              background:'rgba(0,234,255,0.03)',
              border:'1px solid rgba(0,234,255,0.1)',
              borderRadius:10,
              display:'flex', flexDirection:'column', justifyContent:'space-between',
              cursor:'pointer', transition:'all .15s',
            }}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(0,234,255,0.06)';(e.currentTarget as HTMLElement).style.borderColor='rgba(0,234,255,0.22)';}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='rgba(0,234,255,0.03)';(e.currentTarget as HTMLElement).style.borderColor='rgba(0,234,255,0.1)';}}
          >
            <div style={{ fontSize:9, color:'#1e4a5a', letterSpacing:'1.3px', fontWeight:600, marginBottom:6 }}>{label}</div>
            {content}
          </div>
        ))}
        </div>
      </div>

      {/* ══════════ INTELLIGENCE MODAL ══════════ */}
      {modalOpen && selectedDep && (() => {
        const dep     = selectedDep;
        const color   = MINERAL_COLORS[dep.primary_mineral] || '#00eaff';
        const paleo   = getPaleoContext(dep);
        const watched = watchlistIds.includes(dep.id);

        const riskLevel = dep.difficulty_score >= 75 ? 'HIGH' : dep.difficulty_score >= 50 ? 'MEDIUM' : 'LOW';
        const riskColor = dep.difficulty_score >= 75 ? '#ef4444' : dep.difficulty_score >= 50 ? '#f6b93b' : '#25f5a6';
        const oppLevel  = dep.opportunity_score >= 80 ? 'EXCEPTIONAL' : dep.opportunity_score >= 65 ? 'STRONG' : 'MODERATE';
        const confColor = dep.data_confidence === 'high' ? '#25f5a6' : dep.data_confidence === 'medium' ? '#f6b93b' : '#94a3b8';

        const supplyNotes: Record<string, string> = {
          Lithium:      'Critical for lithium-ion battery cathodes and electrolytes. Demand driven by EV and grid storage growth.',
          Copper:       'Essential for electrification, EV motors, grid infrastructure, and renewables. No viable substitute at scale.',
          Cobalt:       'Key cathode material in NMC and NCA chemistries. Supply concentrated in DRC — geopolitical risk is elevated.',
          Nickel:       'Critical for high-energy-density NMC cathodes and stainless steel. Class 1 supply is the strategic bottleneck.',
          'Rare Earths': 'NdPr permanent magnets are irreplaceable in EV traction motors and wind turbines. China controls ~85% of processing.',
          Uranium:      'Fuel for nuclear power. Demand rising as net-zero targets and SMR programmes expand globally.',
          Graphite:     'Dominant anode material in Li-ion batteries. ~90% of battery-grade spherical graphite processed in China.',
          Manganese:    'Emerging cathode material in LMFP batteries. Also essential for steel. Supply relatively diversified.',
          Tantalum:     'Critical for capacitors in electronics and aerospace. Supply concentrated in DRC and Rwanda — conflict mineral risk.',
        };

        const ScoreBar = ({ label, value, color: c }: { label: string; value: number; color: string }) => (
          <div style={{ marginBottom:8 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
              <span style={{ fontSize:11, color:'#64748b' }}>{label}</span>
              <span style={{ fontSize:11, color:c, fontWeight:600 }}>{value}</span>
            </div>
            <div style={{ height:3, background:'rgba(255,255,255,0.06)', borderRadius:2, overflow:'hidden' }}>
              <div style={{ width:`${value}%`, height:'100%', background:c, borderRadius:2, boxShadow:`0 0 6px ${c}80` }}/>
            </div>
          </div>
        );

        return (
          <div
            onClick={() => setModalOpen(false)}
            style={{ position:'fixed', inset:0, zIndex:2000, background:'rgba(2,7,13,0.82)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{ width:'100%', maxWidth:760, maxHeight:'88vh', background:'#071018', border:'1px solid rgba(0,234,255,0.22)', borderRadius:16, display:'flex', flexDirection:'column', boxShadow:'0 0 60px rgba(0,234,255,0.08), 0 24px 80px rgba(0,0,0,0.8)', overflow:'hidden' }}
            >
              {/* Header */}
              <div style={{ padding:'18px 24px 16px', borderBottom:'1px solid rgba(0,234,255,0.1)', display:'flex', alignItems:'flex-start', gap:14, flexShrink:0 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:9, color:'#00eaff', letterSpacing:'1.6px', fontWeight:600, marginBottom:4, opacity:.7 }}>INTELLIGENCE REPORT</div>
                  <div style={{ fontSize:20, fontWeight:700, color:'#fff', letterSpacing:-.3, lineHeight:1.2, marginBottom:6 }}>{dep.name}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                    <span style={{ padding:'3px 10px', background:`${color}18`, border:`1px solid ${color}50`, borderRadius:20, fontSize:11, fontWeight:600, color }}>{dep.primary_mineral}</span>
                    {dep.secondary_minerals.filter(Boolean).map(s => (
                      <span key={s} style={{ padding:'2px 8px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, fontSize:10, color:'#64748b' }}>{s}</span>
                    ))}
                    <span style={{ fontSize:11, color:'#475569' }}>· {dep.country}{dep.region ? `, ${dep.region}` : ''}</span>
                  </div>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  style={{ width:32, height:32, borderRadius:8, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'#475569', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontFamily:'Inter,sans-serif', transition:'all .15s' }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color='#fff';(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.08)';}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color='#475569';(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.04)';}}
                >✕</button>
              </div>

              {/* Scrollable body */}
              <div style={{ overflowY:'auto', padding:'20px 24px 28px', flex:1 }}>

                {/* 1+2: Executive Summary + Strategic Importance */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
                  <div style={{ background:'rgba(0,234,255,0.03)', border:'1px solid rgba(0,234,255,0.1)', borderRadius:10, padding:'14px 16px' }}>
                    <div style={{ fontSize:9, color:'#00eaff', letterSpacing:'1.6px', fontWeight:700, marginBottom:8, opacity:.7 }}>EXECUTIVE SUMMARY</div>
                    <p style={{ fontSize:12, color:'#94a3b8', lineHeight:1.7, margin:0 }}>
                      {dep.ai_summary || `${dep.name} is a ${dep.primary_mineral.toLowerCase()} deposit in ${dep.country}. Further intelligence assessment is pending.`}
                    </p>
                  </div>
                  <div style={{ background:'rgba(0,234,255,0.03)', border:'1px solid rgba(0,234,255,0.1)', borderRadius:10, padding:'14px 16px' }}>
                    <div style={{ fontSize:9, color:'#00eaff', letterSpacing:'1.6px', fontWeight:700, marginBottom:8, opacity:.7 }}>STRATEGIC IMPORTANCE</div>
                    <div style={{ display:'flex', gap:7, marginBottom:10, flexWrap:'wrap' }}>
                      <span style={{ padding:'4px 10px', background:`${color}12`, border:`1px solid ${color}35`, borderRadius:8, fontSize:11, color }}>Opportunity: <strong>{oppLevel}</strong></span>
                      <span style={{ padding:'4px 10px', background:`${riskColor}12`, border:`1px solid ${riskColor}35`, borderRadius:8, fontSize:11, color:riskColor }}>Risk: <strong>{riskLevel}</strong></span>
                    </div>
                    <p style={{ fontSize:12, color:'#94a3b8', lineHeight:1.7, margin:0 }}>
                      {supplyNotes[dep.primary_mineral] || `${dep.primary_mineral} is a critical mineral with significant strategic importance to global clean energy and technology supply chains.`}
                    </p>
                  </div>
                </div>

                {/* 3: Paleo / Geologic Context */}
                <div style={{ background:'rgba(168,85,247,0.04)', border:'1px solid rgba(168,85,247,0.18)', borderRadius:10, padding:'14px 16px', marginBottom:14 }}>
                  <div style={{ fontSize:9, color:'#a855f7', letterSpacing:'1.6px', fontWeight:700, marginBottom:6, opacity:.8 }}>PALEO / GEOLOGIC CONTEXT</div>
                  <div style={{ fontSize:13, color:'#c4b5fd', fontWeight:500, marginBottom:6 }}>{paleo.label}</div>
                  <p style={{ fontSize:12, color:'#64748b', lineHeight:1.65, margin:0 }}>{paleo.note}</p>
                  {dep.paleo_setting && (
                    <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid rgba(168,85,247,0.12)', fontSize:11, color:'#7c3aed', opacity:.8, fontStyle:'italic' }}>{dep.paleo_setting}</div>
                  )}
                </div>

                {/* 4: Development Risk */}
                <div style={{ background:'rgba(246,185,59,0.03)', border:'1px solid rgba(246,185,59,0.14)', borderRadius:10, padding:'14px 16px', marginBottom:14 }}>
                  <div style={{ fontSize:9, color:'#f6b93b', letterSpacing:'1.6px', fontWeight:700, marginBottom:12, opacity:.8 }}>DEVELOPMENT RISK</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 24px' }}>
                    <div>
                      <ScoreBar label="Difficulty Score"   value={dep.difficulty_score}           color="#f6b93b" />
                      <ScoreBar label="Country Risk"       value={dep.country_risk_score}         color="#ef4444" />
                      <ScoreBar label="Infrastructure Gap" value={100 - dep.infrastructure_score} color="#f97316" />
                    </div>
                    <div>
                      <ScoreBar label="Environmental Risk" value={dep.environmental_risk_score}   color="#a855f7" />
                      <ScoreBar label="Underutilization"   value={dep.underutilization_score}     color="#22d3ee" />
                      <ScoreBar label="Opportunity Score"  value={dep.opportunity_score}          color="#25f5a6" />
                    </div>
                  </div>
                  <div style={{ marginTop:10, padding:'8px 10px', background:'rgba(246,185,59,0.06)', borderRadius:7, fontSize:11, color:'#94a3b8', lineHeight:1.5 }}>
                    Overall risk classification: <span style={{ color:riskColor, fontWeight:600 }}>{riskLevel}</span>
                    {dep.status === 'construction' && ' · Under active construction — execution risk present.'}
                    {dep.status === 'exploration'  && ' · Early-stage — technical risk remains elevated.'}
                    {dep.status === 'producing'    && ' · Operating mine — execution risk largely de-risked.'}
                    {dep.status === 'feasibility'  && ' · Feasibility stage — pre-decision, financing risk active.'}
                  </div>
                </div>

                {/* 5: Supply Chain Relevance */}
                <div style={{ background:'rgba(37,245,166,0.03)', border:'1px solid rgba(37,245,166,0.14)', borderRadius:10, padding:'14px 16px', marginBottom:14 }}>
                  <div style={{ fontSize:9, color:'#25f5a6', letterSpacing:'1.6px', fontWeight:700, marginBottom:10, opacity:.8 }}>SUPPLY CHAIN RELEVANCE</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:12 }}>
                    {dep.flags.filter(Boolean).map(f => (
                      <span key={f} style={{ padding:'3px 9px', background:'rgba(37,245,166,0.08)', border:'1px solid rgba(37,245,166,0.2)', borderRadius:20, fontSize:10, color:'#25f5a6', letterSpacing:.3 }}>{f.replace(/_/g,' ')}</span>
                    ))}
                    {dep.flags.length === 0 && <span style={{ fontSize:11, color:'#334155' }}>No supply chain flags recorded.</span>}
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                    {([
                      ['Status',    dep.status.replace(/_/g,' ')],
                      ['Resource',  dep.resource_size_tonnes ? (dep.resource_size_tonnes >= 1e9 ? `${(dep.resource_size_tonnes/1e9).toFixed(1)} Bt` : `${(dep.resource_size_tonnes/1e6).toFixed(0)} Mt`) : '—'],
                      ['Grade',     dep.grade_percent ? `${dep.grade_percent} ${dep.grade_unit}` : '—'],
                      ['Owner',     dep.owner    || '—'],
                      ['Operator',  dep.operator || '—'],
                      ['Stage',     dep.development_stage || '—'],
                    ] as [string,string][]).map(([lbl, val]) => (
                      <div key={lbl} style={{ background:'rgba(0,0,0,0.2)', borderRadius:7, padding:'8px 10px' }}>
                        <div style={{ fontSize:9, color:'#334155', letterSpacing:.5, marginBottom:3 }}>{lbl.toUpperCase()}</div>
                        <div style={{ fontSize:11, color:'#94a3b8', lineHeight:1.4, wordBreak:'break-word' }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 6: Confidence Assessment */}
                <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, padding:'14px 16px', marginBottom:14 }}>
                  <div style={{ fontSize:9, color:'#64748b', letterSpacing:'1.6px', fontWeight:700, marginBottom:8, opacity:.8 }}>CONFIDENCE ASSESSMENT</div>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                    <span style={{ padding:'5px 14px', background:`${confColor}14`, border:`1px solid ${confColor}45`, borderRadius:8, fontSize:13, fontWeight:700, color:confColor, letterSpacing:.5 }}>{dep.data_confidence.toUpperCase()}</span>
                    <span style={{ fontSize:12, color:'#64748b' }}>{dep.source_count} source{dep.source_count !== 1 ? 's' : ''} · Last updated {dep.last_updated_year}</span>
                  </div>
                  <p style={{ fontSize:12, color:'#475569', lineHeight:1.65, margin:0 }}>
                    {dep.data_confidence === 'high'   && 'Multiple independent primary sources confirm key resource parameters. NI 43-101 or JORC-compliant resource estimates available. Suitable for comparative analysis.'}
                    {dep.data_confidence === 'medium' && 'Data drawn from company announcements, government surveys, and secondary literature. Core parameters are plausible but require verification against primary filings before investment-grade use.'}
                    {dep.data_confidence === 'low'    && 'Limited public data. Estimates are indicative only, based on historical reports or analogous deposits. Independent verification required. Treat all resource figures as preliminary.'}
                  </p>
                </div>

                {/* 8: Sources */}
                {(() => {
                  // Mock source records derived deterministically from deposit fields.
                  // Scaled to dep.source_count so the count shown in section 6 matches.
                  type SourceConf = 'High' | 'Medium' | 'Low';
                  interface MockSource { name: string; type: string; year: number; confidence: SourceConf; }

                  const confMap: Record<string, SourceConf> = { high:'High', medium:'Medium', low:'Low' };
                  const depConf: SourceConf = confMap[dep.data_confidence] ?? 'Low';

                  // Base pool — ordered by authority. Sliced to dep.source_count.
                  const pool: MockSource[] = [
                    { name:'USGS Mineral Resources Program',       type:'Government',  year: dep.last_updated_year,      confidence:'High'   },
                    { name:'Company Technical Report (NI 43-101)', type:'Corporate',   year: dep.last_updated_year - 1,  confidence: depConf  },
                    { name:'BGS World Mineral Statistics',         type:'Government',  year: dep.last_updated_year - 1,  confidence:'High'   },
                    { name:'Operator Project Disclosure',          type:'Corporate',   year: dep.last_updated_year,      confidence: depConf  },
                    { name:'Academic Geology Study',               type:'Research',    year: dep.last_updated_year - 2,  confidence:'Medium' },
                    { name:'National Geological Survey',           type:'Government',  year: dep.last_updated_year - 1,  confidence:'High'   },
                    { name:'IEA Critical Minerals Report',         type:'Government',  year: 2023,                       confidence:'High'   },
                    { name:'Company Annual Report',                type:'Corporate',   year: dep.last_updated_year,      confidence: depConf  },
                    { name:'Peer-Reviewed Journal Article',        type:'Research',    year: dep.last_updated_year - 3,  confidence:'Medium' },
                    { name:'Stock Exchange Filing',                type:'Regulatory',  year: dep.last_updated_year,      confidence: depConf  },
                    { name:'Wood Mackenzie Commodity Report',      type:'Analyst',     year: dep.last_updated_year - 1,  confidence:'Medium' },
                    { name:'S&P Global Market Intelligence',       type:'Analyst',     year: dep.last_updated_year,      confidence:'Medium' },
                    { name:'Regional Government Mining Registry',  type:'Government',  year: dep.last_updated_year - 2,  confidence:'Medium' },
                    { name:'Environmental Impact Assessment',      type:'Regulatory',  year: dep.last_updated_year - 1,  confidence:'Medium' },
                    { name:'Historical Exploration Report',        type:'Research',    year: dep.last_updated_year - 4,  confidence:'Low'    },
                    { name:'Industry Trade Publication',           type:'Media',       year: dep.last_updated_year - 1,  confidence:'Low'    },
                    { name:'Benchmark Mineral Intelligence',       type:'Analyst',     year: dep.last_updated_year,      confidence:'Medium' },
                    { name:'UN Comtrade Trade Statistics',         type:'Government',  year: dep.last_updated_year - 1,  confidence:'High'   },
                  ];

                  const sources = pool.slice(0, Math.max(1, Math.min(dep.source_count, pool.length)));

                  const typeColor: Record<string, string> = {
                    Government: '#3f8cff',
                    Corporate:  '#25f5a6',
                    Research:   '#a855f7',
                    Regulatory: '#22d3ee',
                    Analyst:    '#f6b93b',
                    Media:      '#94a3b8',
                  };
                  const srcConfColor: Record<string, string> = {
                    High:   '#25f5a6',
                    Medium: '#f6b93b',
                    Low:    '#94a3b8',
                  };

                  return (
                    <div style={{ background:'rgba(63,140,255,0.03)', border:'1px solid rgba(63,140,255,0.14)', borderRadius:10, padding:'14px 16px', marginBottom:14 }}>
                      <div style={{ fontSize:9, color:'#3f8cff', letterSpacing:'1.6px', fontWeight:700, marginBottom:12, opacity:.8 }}>SOURCES</div>

                      {/* Column headers */}
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 100px 52px 58px', gap:'0 10px', padding:'0 10px 6px', borderBottom:'1px solid rgba(255,255,255,0.05)', marginBottom:6 }}>
                        {['SOURCE', 'TYPE', 'YEAR', 'CONF.'].map(h => (
                          <div key={h} style={{ fontSize:8, color:'#1e3a4a', letterSpacing:'1.2px', fontWeight:600 }}>{h}</div>
                        ))}
                      </div>

                      {/* Source rows */}
                      {sources.map((src, i) => (
                        <div
                          key={i}
                          style={{
                            display:'grid', gridTemplateColumns:'1fr 100px 52px 58px', gap:'0 10px',
                            padding:'7px 10px', borderRadius:7, transition:'background .1s',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(63,140,255,0.06)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                          <div style={{ fontSize:12, color:'#94a3b8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={src.name}>
                            {src.name}
                          </div>
                          <div>
                            <span style={{
                              fontSize:10, padding:'2px 7px', borderRadius:10, fontWeight:500,
                              background: `${typeColor[src.type] || '#94a3b8'}14`,
                              border:     `1px solid ${typeColor[src.type] || '#94a3b8'}35`,
                              color:       typeColor[src.type] || '#94a3b8',
                            }}>{src.type}</span>
                          </div>
                          <div style={{ fontSize:12, color:'#475569' }}>{(src.year && !isNaN(src.year)) ? src.year : dep.last_updated_year}</div>
                          <div style={{ fontSize:11, fontWeight:600, color: srcConfColor[src.confidence] || '#94a3b8' }}>
                            {src.confidence}
                          </div>
                        </div>
                      ))}

                      <div style={{ marginTop:8, paddingTop:8, borderTop:'1px solid rgba(255,255,255,0.04)', fontSize:10, color:'#1e3a4a', lineHeight:1.5 }}>
                        {dep.source_count} reference{dep.source_count !== 1 ? 's' : ''} indexed · Mock data for demonstration · Real source verification required before use
                      </div>
                    </div>
                  );
                })()}

                {/* 7: Watchlist Status */}
                <div style={{ background: watched ? 'rgba(251,191,36,0.05)' : 'rgba(255,255,255,0.02)', border:`1px solid ${watched ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.06)'}`, borderRadius:10, padding:'14px 16px' }}>
                  <div style={{ fontSize:9, color: watched ? '#fbbf24' : '#334155', letterSpacing:'1.6px', fontWeight:700, marginBottom:8, opacity:.8 }}>WATCHLIST STATUS</div>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <span style={{ fontSize:24 }}>{watched ? '★' : '☆'}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color: watched ? '#fbbf24' : '#475569', marginBottom:2 }}>{watched ? 'In your Watchlist' : 'Not in Watchlist'}</div>
                      <div style={{ fontSize:11, color:'#334155' }}>
                        {watched ? `${dep.name} is tracked. You have ${watchlistIds.length} deposit${watchlistIds.length !== 1 ? 's' : ''} on your watchlist.` : 'Add this deposit to track it across sessions.'}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleWatchlist(dep.id)}
                      style={{ padding:'8px 16px', borderRadius:8, fontSize:12, fontWeight:500, background: watched ? 'rgba(251,191,36,0.12)' : 'rgba(0,234,255,0.08)', border:`1px solid ${watched ? 'rgba(251,191,36,0.4)' : 'rgba(0,234,255,0.28)'}`, color: watched ? '#fbbf24' : '#00eaff', cursor:'pointer', fontFamily:'Inter,sans-serif', transition:'all .15s', flexShrink:0 }}
                    >{watched ? '★ Remove' : '☆ Add to Watchlist'}</button>
                  </div>
                </div>

              </div>{/* end scrollable body */}
            </div>{/* end modal panel */}
          </div>/* end backdrop */
        );
      })()}

    </div>
  );
}
