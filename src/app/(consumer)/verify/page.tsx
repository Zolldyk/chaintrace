/**
 * Manual product verification page
 *
 * @returns Manual verification page component
 *
 * @since 1.0.0
 */

'use client';

import * as React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProductLookup } from '@/components/verification';
import { ProductVerificationApiError } from '@/services/verification';

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
      </div>
    </div>
  );
}
