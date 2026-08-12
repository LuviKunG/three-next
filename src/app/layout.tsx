import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'three-next Test Page',
  description: 'A test page for three-next. The three-next is developed by Thanut Panichyotai (@LuviKunG)',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <body>{children}</body>
    </html>
  );
}
