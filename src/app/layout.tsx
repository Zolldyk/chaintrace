import type { Metadata } from 'next';
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
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
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
      <body className={inter.className}>
        <div id='root'>{children}</div>
      </body>
    </html>
  );
}
