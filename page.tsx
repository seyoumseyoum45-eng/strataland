// Server component — no 'use client' directive.
// Renders a stable loading shell on the server.
// The entire interactive app (AppShell) is loaded client-only via ssr:false,
// so React never compares server-rendered interactive content against the
// client render — eliminating all hydration mismatches.
import dynamic from 'next/dynamic';

const AppShell = dynamic(
  () => import('@/components/AppShell'),
  {
    ssr: false,
    loading: () => (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: '#05070b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(0,255,213,0.4)',
        fontSize: 11,
        letterSpacing: 2,
        fontFamily: 'Inter, monospace',
      }}>
        LOADING STRATALAND...
      </div>
    ),
  }
);

export default function Page() {
  return <AppShell />;
}
