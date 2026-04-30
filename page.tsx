'use client';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { Deposit } from '@/types';
import { DEPOSITS, computeKPIs, isAfrica, getPaleoContext } from '@/lib/localData';

const StratMap = dynamic(() => import('@/components/StratMap'), {
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

// ── Main Page ──────────────────────────────────────────────────
export default function Page() {
  const [mounted, setMounted]         = useState(false);
  const [activePage, setActivePage]   = useState('map');
  const [selectedId, setSelectedId]   = useState<string | null>('ken');
  const [selectedDep, setSelectedDep] = useState<Deposit | null>(() => DEPOSITS.find(d=>d.id==='ken') || null);
  const [searchQ, setSearchQ]         = useState('');
  const [activeMineral, setActiveMineral] = useState<string|null>(null);
  const [africaFilter, setAfricaFilter]   = useState(false);
  const mapFlyToRef = useRef<((lat: number, lon: number, zoom?: number) => void) | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!selectedId) { setSelectedDep(null); return; }
    setSelectedDep(DEPOSITS.find(d => d.id === selectedId) || null);
  }, [selectedId]);

  const filtered = useMemo(() => {
    let d = [...DEPOSITS];
    if (searchQ) {
      const q = searchQ.toLowerCase();
      d = d.filter(x =>
        x.name.toLowerCase().includes(q) ||
        x.country.toLowerCase().includes(q) ||
        x.primary_mineral.toLowerCase().includes(q) ||
        (x.operator||'').toLowerCase().includes(q) ||
        (x.region||'').toLowerCase().includes(q)
      );
    }
    if (activeMineral) d = d.filter(x => x.primary_mineral === activeMineral);
    if (africaFilter)  d = d.filter(x => isAfrica(x));
    return d;
  }, [searchQ, activeMineral, africaFilter]);

  const kpis = useMemo(() => computeKPIs(filtered), [filtered]);
  const allKpis = useMemo(() => computeKPIs(DEPOSITS), []);

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

  if (!mounted) {
    return <div style={{ width:'100vw', height:'100vh', background:'#05070b' }}/>;
  }

  const mc = selectedDep ? (MINERAL_COLORS[selectedDep.primary_mineral] || '#00eaff') : '#00eaff';

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
          {['🔔','⚡','?'].map((ic,i) => (
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
        {/* Active filter indicator */}
        {(africaFilter || activeMineral || searchQ) && (
          <button
            onClick={() => { setAfricaFilter(false); setActiveMineral(null); setSearchQ(''); }}
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
                  return (
                    <div
                      key={item.id}
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
            <div style={{ color:'#334155', cursor:'pointer', fontSize:16, lineHeight:1 }}>›</div>
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
                <button style={{ width:'100%', padding:'11px', background:'rgba(0,234,255,0.08)', border:'1px solid rgba(0,234,255,0.28)', color:'#00eaff', fontSize:12, fontWeight:500, borderRadius:10, cursor:'pointer', fontFamily:'Inter,sans-serif', letterSpacing:.4 }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(0,234,255,0.14)';}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='rgba(0,234,255,0.08)';}}>
                  View Intelligence
                </button>
              </div>

              {/* Action icon row */}
              <div style={{ padding:'8px 16px 16px', display:'flex', gap:6, borderTop:'1px solid rgba(255,255,255,0.05)' }}>
                {[['📄','Report'],['📊','Charts'],['🔗','Share'],['☆','Watch'],['···','More']].map(([ic,tip],i) => (
                  <div key={i} title={tip} style={{ flex:1, height:34, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:14, color:'#334155', transition:'all .15s' }}
                    onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color='#00eaff';(e.currentTarget as HTMLElement).style.borderColor='rgba(0,234,255,0.25)';(e.currentTarget as HTMLElement).style.background='rgba(0,234,255,0.06)';}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color='#334155';(e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,0.07)';(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.03)';}}>
                    {ic}
                  </div>
                ))}
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

      {/* ══════════ BOTTOM METRICS BAR ══════════ */}
      <div style={{ height:110, flexShrink:0, background:'#071018', borderTop:'1px solid rgba(0,234,255,0.12)', display:'flex', gap:8, padding:'8px 10px', overflowX:'auto' }}>
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
  );
}
