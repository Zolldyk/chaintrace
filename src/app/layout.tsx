import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ChainTrace - Supply Chain Verification',
  description:
    'Blockchain-powered supply chain verification platform using Hedera',
  keywords: [
    'blockchain',
    'supply chain',
    'verification',
    'hedera',
    'transparency',
  ],
  authors: [{ name: 'ChainTrace Team' }],
  creator: 'ChainTrace',
  publisher: 'ChainTrace',
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32', type: 'image/x-icon' },
      { url: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
    apple: [{ url: '/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' }],
    other: [
      {
        rel: 'icon',
        url: '/icon-192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
      },
      {
        rel: 'icon',
        url: '/icon-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
      },
    ],
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  ),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    title: 'ChainTrace - Supply Chain Verification',
    description:
      'Blockchain-powered supply chain verification platform using Hedera',
    siteName: 'ChainTrace',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChainTrace - Supply Chain Verification',
    description:
      'Blockchain-powered supply chain verification platform using Hedera',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <div id='root'>{children}</div>
      </body>
    </html>
  );
}
