'use client';

const PAGES = [
  { id:'dashboard',   label:'Dashboard',       color:'#10b981', section:'platform' },
  { id:'map',         label:'Global Map',       color:'#3b82f6', section:'platform', count:25 },
  { id:'lithium',     label:'Lithium',          color:'#10b981', section:'minerals', count:8 },
  { id:'copper',      label:'Copper',           color:'#cd7c3f', section:'minerals', count:9 },
  { id:'cobalt',      label:'Cobalt',           color:'#3b82f6', section:'minerals', count:3 },
  { id:'nickel',      label:'Nickel',           color:'#14b8a6', section:'minerals', count:3 },
  { id:'critical',    label:'Critical Minerals',color:'#8b5cf6', section:'minerals' },
  { id:'rankings',    label:'Rankings',         color:'#f59e0b', section:'analysis' },
  { id:'paleo',       label:'Paleo Map',        color:'#14b8a6', section:'analysis' },
  { id:'deposits',    label:'Deposits',         color:'#64748b', section:'analysis' },
  { id:'ai',          label:'AI Research',      color:'#10b981', section:'intelligence' },
  { id:'sources',     label:'Sources',          color:'#3b82f6', section:'intelligence', count:842 },
];

interface Props { active: string; onNavigate: (id: string) => void; }

export default function Sidebar({ active, onNavigate }: Props) {
  const sections = ['platform','minerals','analysis','intelligence'];
  const sectionLabel = { platform:'PLATFORM', minerals:'MINERALS', analysis:'ANALYSIS', intelligence:'INTELLIGENCE' };

  return (
    <div style={{ background:'#12161c', borderRight:'1px solid rgba(255,255,255,0.07)', overflowY:'auto', height:'100%' }}>
      {sections.map(sec => (
        <div key={sec}>
          <div style={{ fontSize:8, color:'#50606f', letterSpacing:'1.3px', padding:'8px 13px 3px', fontFamily:'SF Mono,monospace' }}>
            {sectionLabel[sec as keyof typeof sectionLabel]}
          </div>
          {PAGES.filter(p => p.section === sec).map(p => (
            <div
              key={p.id}
              onClick={() => onNavigate(p.id)}
              style={{
                display:'flex', alignItems:'center', gap:7, padding:'6px 13px',
                fontSize:10, color: active === p.id ? p.color : '#8e99a8',
                cursor:'pointer', borderLeft:`2px solid ${active === p.id ? p.color : 'transparent'}`,
                background: active === p.id ? `${p.color}08` : 'transparent',
                transition:'all .12s', fontFamily:'SF Mono,monospace', letterSpacing:.2,
              }}
            >
              <div style={{ width:5, height:5, borderRadius:'50%', background:p.color, flexShrink:0 }} />
              <span style={{ flex:1 }}>{p.label}</span>
              {p.count && (
                <span style={{ fontSize:8, color:'#50606f', background:'#1e2633', padding:'1px 4px', borderRadius:8 }}>
                  {p.count}
                </span>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
