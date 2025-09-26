/**
 * Navigation component for ChainTrace application.
 * Provides responsive navigation menu.
 *
 * @example
 * ```tsx
 * <Navigation />
 * ```
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';

export interface NavigationProps {
  className?: string;
}

export function Navigation({ className }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const navigationItems = [
    { href: ROUTES.VERIFY, label: 'Verify product', icon: '🔍' },
    { href: ROUTES.MANAGER_DASHBOARD, label: 'Dashboard', icon: '📊' },
    { href: ROUTES.COMPLIANCE_DASHBOARD, label: 'Compliance', icon: '📋' },
  ];

  const isActivePath = (href: string) => pathname.startsWith(href);

  return (
    <nav className={cn('border-b border-gray-200 bg-white', className)}>
      <div className='container mx-auto px-4'>
        {/* Desktop Navigation */}
        <div className='hidden h-16 items-center justify-between md:flex'>
          <div className='flex items-center space-x-8'>
            {navigationItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActivePath(item.href)
                    ? 'border-blue-200 bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className='md:hidden'>
          <div className='flex h-16 items-center justify-between'>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className='inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500'
            >
              <span className='sr-only'>Open main menu</span>
              {isOpen ? (
                <svg
                  className='block h-6 w-6'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M6 18L18 6M6 6l12 12'
                  />
                </svg>
              ) : (
                <svg
                  className='block h-6 w-6'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M4 6h16M4 12h16M4 18h16'
                  />
                </svg>
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {isOpen && (
            <div className='border-t border-gray-200 pb-4'>
              <div className='space-y-1 pb-2 pt-4'>
                {navigationItems.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'flex items-center space-x-3 rounded-md px-3 py-2 text-base font-medium transition-colors',
                      isActivePath(item.href)
                        ? 'border-blue-200 bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
