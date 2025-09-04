/**
 * Consumer layout for public verification interface
 *
 * @param children - Child components to render
 * @returns Consumer layout component
 *
 * @since 1.0.0
 */

import * as React from 'react';
import { Header, Footer } from '@/components/layout';

interface ConsumerLayoutProps {
  children: React.ReactNode;
}

export default function ConsumerLayout({ children }: ConsumerLayoutProps) {
  return (
    <div className='min-h-screen bg-gray-50'>
      <Header />

      <main className='flex-1'>{children}</main>

      <Footer />
    </div>
  );
}
