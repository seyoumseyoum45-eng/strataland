'use client';
import type { Deposit } from '@/types';

const MINERAL_COLOR: Record<string, string> = {
  Lithium:'#10b981', Copper:'#cd7c3f', Cobalt:'#3b82f6',
  Nickel:'#14b8a6', 'Rare Earths':'#8b5cf6', Uranium:'#f59e0b',
  Graphite:'#64748b', Manganese:'#ef4444',
};

const STATUS_RING: Record<string, string> = {
  producing:'#10b981', past_producing:'#f59e0b', undeveloped:'#64748b',
  exploration:'#3b82f6', feasibility:'#8b5cf6', construction:'#f97316',
};

function fmt(n: number | null, unit = ''): string {
  if (n == null) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} Bt${unit}`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)} Mt${unit}`;
  return `${n.toLocaleString()}${unit}`;
}

interface Props {
  deposit: Deposit | null;
  onViewDeposit?: (id: string) => void;
  onCompare?: (id: string) => void;
  onSources?: (id: string) => void;
  onPaleo?: (id: string) => void;
}

export default function IntelPanel({ deposit, onViewDeposit, onCompare, onSources, onPaleo }: Props) {
  const s = {
    panel: { background:'#12161c', borderLeft:'1px solid rgba(255,255,255,0.07)', display:'flex', flexDirection:'column' as const, overflow:'hidden' },
    header: { padding:'10px 13px', borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0 },
    headerLabel: { fontSize:8, color:'#50606f', letterSpacing:'1px', marginBottom:6 },
    name: { fontSize:13, fontWeight:700, color:'#e4e8ed', letterSpacing:.3, marginBottom:2 },
    loc: { fontSize:10, color:'#cd7c3f' },
    body: { padding:'11px 13px', overflowY:'auto' as const, flex:1 },
    row: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 0', borderBottom:'1px solid rgba(255,255,255,0.06)' },
    key: { fontSize:8, color:'#50606f', letterSpacing:.4 },
    val: { fontSize:10, color:'#8e99a8', fontWeight:500, textAlign:'right' as const, maxWidth:160 },
    badge: (color: string) => ({ padding:'2px 6px', borderRadius:2, fontSize:8, fontWeight:700, letterSpacing:.5, background:`${color}22`, color }),
    scores: { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:5, margin:'8px 0' },
    scoreCard: { background:'#181e27', border:'1px solid rgba(255,255,255,0.07)', padding:'6px 7px', borderRadius:2 },
    scoreLabel: { fontSize:7, color:'#50606f', letterSpacing:.5, marginBottom:2 },
    scoreVal: (color: string) => ({ fontSize:17, fontWeight:700, color }),
    bar: { height:2, background:'#1e2633', borderRadius:1, marginTop:3, overflow:'hidden' },
    fill: (w: number, color: string) => ({ width:`${w}%`, height:'100%', background:color, borderRadius:1 }),
    aiBox: { background:'#181e27', border:'1px solid rgba(255,255,255,0.07)', borderLeft:'2px solid #10b981', padding:'8px 10px', borderRadius:'0 2px 2px 0', margin:'8px 0' },
    aiLabel: { fontSize:8, color:'#10b981', letterSpacing:.8, marginBottom:4 },
    aiText: { fontSize:9, color:'#8e99a8', lineHeight:1.6 },
    actions: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:4, marginTop:8 },
    btn: (primary?: boolean) => ({
      background: primary ? 'rgba(16,185,129,0.1)' : '#181e27',
      border: `1px solid ${primary ? '#059669' : 'rgba(255,255,255,0.07)'}`,
      color: primary ? '#10b981' : '#8e99a8',
      padding:'6px 4px', fontSize:9, fontFamily:'inherit', cursor:'pointer',
      borderRadius:2, letterSpacing:.3, transition:'all .15s',
    }),
    rankBox: { marginTop:10 },
    rankTitle: { fontSize:8, color:'#50606f', letterSpacing:.8, marginBottom:6, paddingBottom:4, borderBottom:'1px solid rgba(255,255,255,0.06)' },
    rankRow: { display:'flex', alignItems:'center', gap:5, padding:'4px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' },
    empty: { padding:'20px 13px', color:'#50606f', fontSize:10, lineHeight:1.6 },
  };

  if (!deposit) {
    return (
      <div style={s.panel}>
        <div style={s.header}>
          <div style={s.headerLabel}>● SELECT A DEPOSIT</div>
          <div style={{ ...s.name, fontSize:11, color:'#50606f', fontWeight:400 }}>Click any marker on the map</div>
        </div>
        <div style={s.empty}>
          Use the mineral filters to narrow the view. Click any deposit marker to load its full intelligence briefing here.
        </div>
      </div>
    );
  }

  const mc = MINERAL_COLOR[deposit.primary_mineral] || '#64748b';
  const ring = STATUS_RING[deposit.status] || '#64748b';
  const confColor = deposit.data_confidence === 'high' ? '#10b981' : deposit.data_confidence === 'medium' ? '#f59e0b' : '#ef4444';

  return (
    <div style={s.panel}>
      <div style={s.header}>
        <div style={s.headerLabel}>● SELECTED DEPOSIT</div>
        <div style={{ display:'flex', alignItems:'flex-start', gap:7, marginBottom:4 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:mc, flexShrink:0, marginTop:3 }} />
          <div style={s.name}>{deposit.name}</div>
        </div>
        <div style={s.loc}>▶ {deposit.country}{deposit.region ? ` · ${deposit.region}` : ''}</div>
        <div style={{ fontSize:8, color:'#50606f', marginTop:3 }}>
          {deposit.latitude.toFixed(4)}°, {deposit.longitude.toFixed(4)}°
        </div>
      </div>

      <div style={s.body}>
        <div style={s.row}>
          <span style={s.key}>PRIMARY MINERAL</span>
          <span style={s.badge(mc)}>{deposit.primary_mineral.toUpperCase()}</span>
        </div>
        <div style={s.row}>
          <span style={s.key}>STATUS</span>
          <span style={s.badge(ring)}>{deposit.status.replace(/_/g,' ').toUpperCase()}</span>
        </div>
        <div style={s.row}><span style={s.key}>DEPOSIT TYPE</span><span style={s.val}>{deposit.deposit_type}</span></div>
        {deposit.secondary_minerals?.length > 0 && (
          <div style={s.row}><span style={s.key}>SECONDARY</span><span style={{ ...s.val, fontSize:9 }}>{deposit.secondary_minerals.slice(0,4).join(' · ')}</span></div>
        )}
        <div style={s.row}><span style={s.key}>OPERATOR</span><span style={{ ...s.val, fontSize:9, maxWidth:140 }}>{deposit.operator || '—'}</span></div>
        <div style={s.row}><span style={s.key}>RESOURCE SIZE</span><span style={s.val}>{fmt(deposit.resource_size_tonnes)}</span></div>
        {deposit.grade_percent && (
          <div style={s.row}><span style={s.key}>GRADE</span><span style={s.val}>{deposit.grade_percent} {deposit.grade_unit}</span></div>
        )}
        <div style={{ ...s.row, borderBottom:'none' }}>
          <span style={s.key}>DATA CONFIDENCE</span>
          <span style={{ fontSize:9, fontWeight:700, color:confColor }}>{deposit.data_confidence.toUpperCase()}</span>
        </div>

        <div style={s.scores}>
          <div style={s.scoreCard}>
            <div style={s.scoreLabel}>OPPORTUNITY</div>
            <div style={s.scoreVal('#10b981')}>{deposit.opportunity_score}</div>
            <div style={s.bar}><div style={s.fill(deposit.opportunity_score, '#10b981')} /></div>
          </div>
          <div style={s.scoreCard}>
            <div style={s.scoreLabel}>DIFFICULTY</div>
            <div style={s.scoreVal('#f59e0b')}>{deposit.difficulty_score}</div>
            <div style={s.bar}><div style={s.fill(deposit.difficulty_score, '#f59e0b')} /></div>
          </div>
          <div style={s.scoreCard}>
            <div style={s.scoreLabel}>UNDERUTIL.</div>
            <div style={s.scoreVal('#8b5cf6')}>{deposit.underutilization_score}</div>
            <div style={s.bar}><div style={s.fill(deposit.underutilization_score, '#8b5cf6')} /></div>
          </div>
        </div>

        {deposit.ai_summary && (
          <div style={s.aiBox}>
            <div style={s.aiLabel}>✦ AI SUMMARY</div>
            <div style={s.aiText}>{deposit.ai_summary}</div>
          </div>
        )}

        {deposit.paleo_setting && (
          <div style={{ ...s.aiBox, borderLeftColor:'#8b5cf6', marginTop:0 }}>
            <div style={{ ...s.aiLabel, color:'#8b5cf6' }}>◈ PALEO SETTING</div>
            <div style={s.aiText}>{deposit.paleo_setting}</div>
          </div>
        )}

        {deposit.flags?.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginBottom:8 }}>
            {deposit.flags.map(f => (
              <span key={f} style={{ fontSize:8, padding:'2px 5px', borderRadius:2, background:'rgba(255,255,255,0.05)', color:'#50606f', letterSpacing:.3 }}>
                {f.replace(/_/g,' ')}
              </span>
            ))}
          </div>
        )}

        <div style={{ fontSize:8, color:'#50606f', marginBottom:8 }}>
          {deposit.source_count} source{deposit.source_count !== 1 ? 's' : ''} · Infra score: {deposit.infrastructure_score} · Country risk: {deposit.country_risk_score}
        </div>

        <div style={s.actions}>
          <button style={s.btn(true)} onClick={() => onViewDeposit?.(deposit.id)}>View Deposit ▶</button>
          <button style={s.btn()} onClick={() => onCompare?.(deposit.id)}>Compare ▶</button>
          <button style={s.btn()} onClick={() => onSources?.(deposit.id)}>Source Reports</button>
          <button style={s.btn()} onClick={() => onPaleo?.(deposit.id)}>Paleo Context</button>
        </div>
      </div>
    </div>
  );
}
