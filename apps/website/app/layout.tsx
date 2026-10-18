import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tirth Now — every tirth, right now',
  description:
    'Live aarti times, darshan, stays, rides, sattvic food, SOS and an AI guide for your yatra across Braj — Mathura, Vrindavan, Govardhan, Barsana, Nandgaon and Gokul.',
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32' },
      { url: '/logo-64.png', sizes: '64x64' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = { themeColor: '#f7f6f1' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600;700&family=Tiro+Devanagari+Hindi&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
