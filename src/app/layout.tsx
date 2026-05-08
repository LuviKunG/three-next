import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Three.js Next.js App',
  description: 'A simple Three.js application built with Next.js',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <body>{children}</body>
    </html>
  );
}
