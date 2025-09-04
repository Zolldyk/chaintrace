/**
 * Consumer homepage with product verification lookup
 *
 * @returns Consumer homepage component with QR scanner integration foundation
 *
 * @since 1.0.0
 */

'use client';

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
          <h1 className='mb-4 text-3xl font-bold text-gray-900'>
            Verify Product Authenticity
          </h1>
          <p className='mx-auto max-w-2xl text-lg text-gray-600'>
            Enter a product ID or scan a QR code to verify authenticity and
            trace the complete supply chain journey on the Hedera blockchain.
          </p>
        </div>

        {/* QR Scanner Placeholder Section */}
        <div className='mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm'>
          <div className='text-center'>
            <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100'>
              <svg
                className='h-8 w-8 text-gray-400'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h2M4 8h4m12 0h2M4 16h4m12 0h2'
                />
              </svg>
            </div>
            <h3 className='mb-2 text-lg font-medium text-gray-900'>
              QR Code Scanner
            </h3>
            <p className='mb-4 text-sm text-gray-600'>
              QR code scanning will be available in future updates
            </p>
            <div className='inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700'>
              <svg className='h-3 w-3' fill='currentColor' viewBox='0 0 20 20'>
                <path
                  fillRule='evenodd'
                  d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z'
                  clipRule='evenodd'
                />
              </svg>
              Coming Soon
            </div>
          </div>
        </div>

        {/* Product Lookup Section */}
        <div className='rounded-lg border border-gray-200 bg-white p-6 shadow-sm'>
          <div className='mb-6 text-center'>
            <h2 className='mb-2 text-xl font-semibold text-gray-900'>
              Manual Product Lookup
            </h2>
            <p className='text-sm text-gray-600'>
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
            <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100'>
              <svg
                className='h-6 w-6 text-green-600'
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
            <h3 className='mb-2 font-semibold text-gray-900'>
              Instant Verification
            </h3>
            <p className='text-sm text-gray-600'>
              Get immediate verification status from the Hedera blockchain
            </p>
          </div>

          <div className='p-6 text-center'>
            <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100'>
              <svg
                className='h-6 w-6 text-blue-600'
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
            <h3 className='mb-2 font-semibold text-gray-900'>
              Supply Chain Journey
            </h3>
            <p className='text-sm text-gray-600'>
              Trace the complete journey from origin to current location
            </p>
          </div>

          <div className='p-6 text-center'>
            <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100'>
              <svg
                className='h-6 w-6 text-purple-600'
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
            <h3 className='mb-2 font-semibold text-gray-900'>
              Blockchain Security
            </h3>
            <p className='text-sm text-gray-600'>
              Tamper-proof verification powered by Hedera&apos;s secure network
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
