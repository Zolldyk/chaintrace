/**
 * Regulatory layout for regulatory officer interface
 *
 * Provides the layout structure for regulatory-specific pages including
 * compliance dashboard, reports, and other regulatory functionality.
 *
 * @param children - Child components to render
 * @returns Regulatory layout component
 *
 * @since 1.0.0
 */

import * as React from 'react';
import { Header, Footer } from '@/components/layout';

interface RegulatoryLayoutProps {
  children: React.ReactNode;
}

export default function RegulatoryLayout({ children }: RegulatoryLayoutProps) {
  return (
    <div className='min-h-screen bg-gray-50'>
      <Header />

      <main className='flex-1'>{children}</main>

      <Footer />
    </div>
  );
}
