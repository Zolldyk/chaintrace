/**
 * Consumer homepage with product verification lookup
 *
 * @returns Consumer homepage component with QR scanner integration foundation
 *
 * @since 1.0.0
 */

'use client';

// Disable static generation due to crypto dependencies
export const dynamic = 'force-dynamic';

import * as React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProductLookup } from '@/components/verification';
import { ProductVerificationApiError } from '@/services/verification';

export default function ConsumerHomePage() {
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
      // Pre-validate and navigate to verification page
      // The actual verification will happen on the product page
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
      <div className='mx-auto max-w-4xl'>
        {/* Header Section */}
        <div className='mb-8 text-center'>
          <h1 className='mb-4 animate-fade-in text-4xl font-bold text-secondary-700'>
            Verify Product Authenticity
          </h1>
          <p className='mx-auto max-w-2xl text-lg text-secondary-500'>
            Enter a product ID or scan a QR code to verify authenticity and
            trace the complete supply chain journey on the Hedera blockchain.
          </p>
        </div>

        {/* Product Lookup Section */}
        <div className='border-secondary-200 animate-fade-in rounded-xl border bg-white p-6 shadow-card'>
          <div className='mb-6 text-center'>
            <h2 className='mb-2 text-2xl font-semibold text-secondary-600'>
              Manual Product Lookup
            </h2>
            <p className='text-sm text-secondary-500'>
              Enter your product ID below to verify its authenticity
            </p>
          </div>

          <div className='mx-auto max-w-md'>
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
              placeholder='Enter product ID (e.g., PROD-2024-001)'
            />
          </div>
        </div>

        {/* Features Section */}
        <div className='mt-12 grid grid-cols-1 gap-6 md:grid-cols-3'>
          <div className='p-6 text-center'>
            <div className='border-success-200 mx-auto mb-4 flex h-12 w-12 animate-slide-up items-center justify-center rounded-lg border bg-success-50'>
              <svg
                className='h-6 w-6 text-success-700'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                />
              </svg>
            </div>
            <h3 className='mb-2 font-semibold text-secondary-700'>
              Instant Verification
            </h3>
            <p className='text-sm text-secondary-500'>
              Get immediate verification status from the Hedera blockchain
            </p>
          </div>

          <div className='p-6 text-center'>
            <div className='border-primary-200 mx-auto mb-4 flex h-12 w-12 animate-slide-up items-center justify-center rounded-lg border bg-primary-50'>
              <svg
                className='h-6 w-6 text-primary-700'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M13 10V3L4 14h7v7l9-11h-7z'
                />
              </svg>
            </div>
            <h3 className='mb-2 font-semibold text-secondary-700'>
              Supply Chain Journey
            </h3>
            <p className='text-sm text-secondary-500'>
              Trace the complete journey from origin to current location
            </p>
          </div>

          <div className='p-6 text-center'>
            <div className='border-secondary-200 mx-auto mb-4 flex h-12 w-12 animate-slide-up items-center justify-center rounded-lg border bg-secondary-100'>
              <svg
                className='h-6 w-6 text-secondary-600'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
                />
              </svg>
            </div>
            <h3 className='mb-2 font-semibold text-secondary-700'>
              Blockchain Security
            </h3>
            <p className='text-sm text-secondary-500'>
              Tamper-proof verification powered by Hedera&apos;s secure network
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
