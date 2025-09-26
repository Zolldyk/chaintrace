/**
 * 404 Not Found page for ChainTrace application
 *
 * @since 1.0.0
 */

import Link from 'next/link';
import { ROUTES } from '@/lib/constants';

export default function NotFound() {
  return (
    <div className='flex min-h-screen items-center justify-center bg-gray-50'>
      <div className='w-full max-w-md text-center'>
        <div className='mb-8'>
          <h1 className='text-9xl font-bold text-primary-600'>404</h1>
          <h2 className='mt-4 text-2xl font-semibold text-gray-900'>
            Page Not Found
          </h2>
          <p className='mt-2 text-gray-600'>
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </p>
        </div>

        <div className='space-y-4'>
          <Link
            href={ROUTES.HOME}
            className='inline-block w-full rounded-lg bg-primary-600 px-6 py-3 font-medium text-white transition-colors hover:bg-primary-700'
          >
            Return to Homepage
          </Link>

          <Link
            href={ROUTES.VERIFY}
            className='inline-block w-full rounded-lg border border-primary-600 px-6 py-3 font-medium text-primary-600 transition-colors hover:bg-primary-50'
          >
            Verify a Product
          </Link>
        </div>

        <div className='mt-8 text-sm text-gray-500'>
          <p>Looking for something specific?</p>
          <div className='mt-2 space-x-4'>
            <Link
              href={ROUTES.MANAGER_DASHBOARD}
              className='text-primary-600 hover:text-primary-700'
            >
              Manager Dashboard
            </Link>
            <Link
              href={ROUTES.COMPLIANCE_DASHBOARD}
              className='text-primary-600 hover:text-primary-700'
            >
              Compliance
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
