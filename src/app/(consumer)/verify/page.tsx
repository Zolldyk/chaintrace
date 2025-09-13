/**
 * Manual product verification page
 *
 * @returns Manual verification page component
 *
 * @since 1.0.0
 */

'use client';

// Disable static generation due to crypto dependencies
export const dynamic = 'force-dynamic';

import * as React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProductLookup } from '@/components/verification';
import { ProductVerificationApiError } from '@/services/verification';
import { ROUTES } from '@/lib/constants';

export default function VerifyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ProductVerificationApiError | null>(null);

  /**
   * Handles product verification search
   */
  const handleProductSearch = async (productId: string) => {
    setLoading(true);
    setError(null);

    try {
      // Navigate to product verification page
      const normalizedProductId = productId.trim().toUpperCase();
      router.push(`/verify/${encodeURIComponent(normalizedProductId)}`);
    } catch (err) {
      if (err instanceof ProductVerificationApiError) {
        setError(err);
      } else {
        setError(
          new ProductVerificationApiError(
            'UNKNOWN_ERROR',
            'An unexpected error occurred',
            500,
            {},
            true
          )
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='mx-auto max-w-2xl'>
        <div className='mb-8 text-center'>
          <h1 className='mb-4 text-2xl font-bold text-gray-900'>
            Product Verification
          </h1>
          <p className='text-gray-600'>
            Enter a product ID to verify its authenticity and view its supply
            chain journey.
          </p>
        </div>

        <div className='rounded-lg border border-gray-200 bg-white p-6 shadow-sm'>
          <ProductLookup
            onSearch={handleProductSearch}
            loading={loading}
            error={
              error
                ? {
                    code: error.code,
                    message: error.message,
                    details: error.details,
                    timestamp: new Date().toISOString(),
                    retryable: error.retryable,
                  }
                : null
            }
            autoFocus={true}
          />
        </div>

        {/* Cross-link to Credential Verification */}
        <div className='mt-8 text-center'>
          <div className='mb-4 flex items-center'>
            <div className='flex-1 border-t border-gray-200'></div>
            <div className='px-4 text-sm text-gray-500'>
              or verify a credential
            </div>
            <div className='flex-1 border-t border-gray-200'></div>
          </div>
          <Link
            href={ROUTES.VERIFY_CREDENTIAL}
            className='inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900'
          >
            <svg
              className='mr-2 h-4 w-4'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
              />
            </svg>
            Verify Compliance Credential
          </Link>
          <p className='mt-2 text-xs text-gray-500'>
            Third-party verification of ChainTrace compliance credentials
          </p>
        </div>
      </div>
    </div>
  );
}
