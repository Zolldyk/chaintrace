/**
 * Header component for ChainTrace application.
 * Provides navigation and branding across all pages.
 *
 * @example
 * ```tsx
 * <Header />
 * ```
 */

import Link from 'next/link';
import { ROUTES } from '@/lib/constants';
import { WalletButtonDynamic } from '@/components/wallet/WalletButtonDynamic';

export interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  return (
    <header
      className={`border-secondary-200 border-b bg-white ${className || ''}`}
    >
      <div className='container mx-auto px-4'>
        <div className='flex h-16 items-center justify-between'>
          {/* Logo and Brand */}
          <div className='flex items-center'>
            <Link href={ROUTES.HOME} className='flex items-center space-x-2'>
              <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600'>
                <span className='text-lg font-bold text-white'>C</span>
              </div>
              <span className='text-xl font-bold text-primary-600'>
                ChainTrace
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className='hidden items-center space-x-8 md:flex'>
            <Link
              href={ROUTES.VERIFY}
              className='font-medium text-secondary-600 transition-colors hover:text-primary-600'
            >
              Verify Product
            </Link>
            <Link
              href={ROUTES.VERIFY_CREDENTIAL}
              className='font-medium text-secondary-600 transition-colors hover:text-primary-600'
            >
              Verify Credential
            </Link>
            <Link
              href={ROUTES.MANAGER_DASHBOARD}
              className='font-medium text-secondary-600 transition-colors hover:text-primary-600'
            >
              Manager Dashboard
            </Link>
            <Link
              href={ROUTES.COMPLIANCE_DASHBOARD}
              className='font-medium text-secondary-600 transition-colors hover:text-primary-600'
            >
              Compliance
            </Link>
          </nav>

          {/* Actions */}
          <div className='flex items-center space-x-4'>
            <WalletButtonDynamic />
          </div>
        </div>
      </div>
    </header>
  );
}
