/**
 * Footer component for ChainTrace application.
 * Provides links and information in the page footer.
 *
 * @example
 * ```tsx
 * <Footer />
 * ```
 */

import Link from 'next/link';
import { APP_METADATA, ROUTES } from '@/lib/constants';

export interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={`border-secondary-200 border-t bg-secondary-50 ${className || ''}`}
    >
      <div className='container mx-auto px-4 py-12'>
        <div className='grid grid-cols-1 gap-8 md:grid-cols-4'>
          {/* Brand */}
          <div className='space-y-4'>
            <div className='flex items-center space-x-2'>
              <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600'>
                <span className='text-lg font-bold text-white'>C</span>
              </div>
              <span className='text-xl font-bold text-primary-600'>
                {APP_METADATA.NAME}
              </span>
            </div>
            <p className='text-sm text-secondary-500'>
              {APP_METADATA.DESCRIPTION}
            </p>
          </div>

          {/* Product Links */}
          <div className='space-y-4'>
            <h3 className='font-semibold text-secondary-700'>Product</h3>
            <ul className='space-y-2 text-sm'>
              <li>
                <Link
                  href={ROUTES.VERIFY}
                  className='text-secondary-500 hover:text-primary-600'
                >
                  Verify Products
                </Link>
              </li>
              <li>
                <Link
                  href={ROUTES.VERIFY_CREDENTIAL}
                  className='text-secondary-500 hover:text-primary-600'
                >
                  Verify Credential
                </Link>
              </li>
              <li>
                <Link
                  href={ROUTES.MANAGER_DASHBOARD}
                  className='text-secondary-500 hover:text-primary-600'
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href={ROUTES.COMPLIANCE_DASHBOARD}
                  className='text-secondary-500 hover:text-primary-600'
                >
                  Compliance
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div className='space-y-4'>
            <h3 className='font-semibold text-secondary-700'>Company</h3>
            <ul className='space-y-2 text-sm'>
              <li>
                <Link
                  href='/about'
                  className='text-secondary-500 hover:text-primary-600'
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href='/contact'
                  className='text-secondary-500 hover:text-primary-600'
                >
                  Contact
                </Link>
              </li>
              <li>
                <a
                  href={APP_METADATA.GITHUB_URL}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-secondary-500 hover:text-primary-600'
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>

          {/* Support Links */}
          <div className='space-y-4'>
            <h3 className='font-semibold text-secondary-700'>Support</h3>
            <ul className='space-y-2 text-sm'>
              <li>
                <Link
                  href='/help'
                  className='text-secondary-500 hover:text-primary-600'
                >
                  Help Center
                </Link>
              </li>
              <li>
                <a
                  href={`mailto:${APP_METADATA.SUPPORT_EMAIL}`}
                  className='text-secondary-500 hover:text-primary-600'
                >
                  Support
                </a>
              </li>
              <li>
                <Link
                  href='/privacy'
                  className='text-secondary-500 hover:text-primary-600'
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className='border-secondary-200 mt-8 border-t pt-8'>
          <div className='flex flex-col items-center justify-between sm:flex-row'>
            <p className='text-sm text-secondary-500'>
              © {currentYear} {APP_METADATA.NAME}. All rights reserved.
            </p>
            <p className='mt-2 text-sm text-secondary-500 sm:mt-0'>
              Built with Hedera blockchain technology
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
