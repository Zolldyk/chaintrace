/**
 * Manager layout for cooperative manager interface
 *
 * Provides the layout structure for manager-specific pages including
 * dashboard, batch creation, and other manager functionality.
 *
 * @param children - Child components to render
 * @returns Manager layout component
 *
 * @since 1.0.0
 */

import * as React from 'react';
import { Header, Footer } from '@/components/layout';

interface ManagerLayoutProps {
  children: React.ReactNode;
}

export default function ManagerLayout({ children }: ManagerLayoutProps) {
  return (
    <div className='min-h-screen bg-gray-50'>
      <Header />

      <main className='flex-1'>{children}</main>

      <Footer />
    </div>
  );
}
