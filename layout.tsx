import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'STRATALAND — Critical Minerals Intelligence',
  description: 'Global mineral deposit intelligence platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body style={{ margin: 0, padding: 0, overflow: 'hidden', background: '#0b0e12' }}>
        {children}
      </body>
    </html>
  );
}
