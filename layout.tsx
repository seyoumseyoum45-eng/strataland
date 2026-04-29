import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'STRATALAND — Critical Minerals Intelligence',
  description: 'Global mineral deposit intelligence platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body>
        {children}
      </body>
    </html>
  );
}
