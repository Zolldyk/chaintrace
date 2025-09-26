/**
 * Dynamic product verification display page
 *
 * @param params - Route parameters containing productId
 * @returns Product verification display component
 *
 * @since 1.0.0
 */

'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ProductLookup,
  ProductTimeline,
  ProductDetails,
} from '@/components/verification';
import { LoadingState, ErrorState } from '@/components/common';
import { Button } from '@/components/ui/Button';
import {
  ProductWithEvents,
  ProductVerificationResponse,
  ProductVerificationApiError,
  getProductVerificationService,
} from '@/services/verification';
import type { ComplianceCredential } from '@/types/compliance';
import { ROUTES } from '@/lib/constants';

interface ProductVerificationPageProps {
  params: Promise<{
    productId: string;
  }>;
}

export default function ProductVerificationPage({
  params,
}: ProductVerificationPageProps) {
  const router = useRouter();
  const [productId, setProductId] = React.useState<string | null>(null);

  React.useEffect(() => {
    params.then(({ productId }) => {
      setProductId(decodeURIComponent(productId));
    });
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<ProductWithEvents | null>(null);
  const [error, setError] = useState<ProductVerificationApiError | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  /**
   * Fetches product verification data
   */
  const fetchProductVerification = async (skipCache: boolean = false) => {
    if (!productId) return;

    setLoading(true);
    setError(null);

    try {
      const verificationService = getProductVerificationService();
      const response: ProductVerificationResponse =
        await verificationService.verifyProductWithRetry(productId, {
          skipCache,
        });

      setProduct(response.product);
    } catch (err) {
      if (err instanceof ProductVerificationApiError) {
        setError(err);
      } else {
        setError(
          new ProductVerificationApiError(
            'UNKNOWN_ERROR',
            'An unexpected error occurred while fetching product data',
            500,
            {},
            true
          )
        );
      }
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  };

  /**
   * Handles retry button click
   */
  const handleRetry = async () => {
    setRetrying(true);
    await fetchProductVerification(true); // Skip cache on retry
  };

  /**
   * Handles new product search
   */
  const handleNewSearch = async (newProductId: string) => {
    setSearchLoading(true);

    try {
      const normalizedProductId = newProductId.trim().toUpperCase();
      router.push(`/verify/${encodeURIComponent(normalizedProductId)}`);
    } finally {
      setSearchLoading(false);
    }
  };

  // Load verification data on component mount
  useEffect(() => {
    if (productId) {
      fetchProductVerification();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  // Loading state
  if (loading && !retrying) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <div className='mx-auto max-w-4xl'>
          <LoadingState
            message={`Verifying product ${productId || 'Unknown'}...`}
            showSpinner={true}
          />
        </div>
      </div>
    );
  }

  // Error state
  if (error && !product) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <div className='mx-auto max-w-4xl'>
          {/* Search for different product */}
          <div className='mb-8'>
            <div className='mb-6 text-center'>
              <h1 className='mb-2 text-2xl font-bold text-gray-900'>
                Product Verification
              </h1>
              <p className='text-gray-600'>
                Search for a different product or try again
              </p>
            </div>

            <div className='mx-auto max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-sm'>
              <ProductLookup
                onSearch={handleNewSearch}
                loading={searchLoading}
                initialValue={productId || ''}
                placeholder='Enter a different product ID'
              />
            </div>
          </div>

          {/* Error display */}
          <ErrorState
            error={new Error(error.message)}
            onRetry={error.retryable ? handleRetry : undefined}
            showDetails={false}
          />

          <div className='mt-4 text-center'>
            <Button variant='outline' onClick={() => router.push('/verify')}>
              Start New Search
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Success state with product data
  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='mx-auto max-w-4xl space-y-8'>
        {/* Header with search */}
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>
              Product Verification
            </h1>
            <p className='mt-1 text-gray-600'>
              Product ID:{' '}
              <span className='rounded bg-gray-100 px-2 py-1 font-mono text-sm'>
                {productId}
              </span>
            </p>
          </div>

          <Button
            variant='outline'
            onClick={() => router.push('/verify')}
            className='text-sm'
          >
            Search Another Product
          </Button>
        </div>

        {/* Product Details with Credentials */}
        {product && (
          <ProductDetails
            product={product}
            showCredentials={true}
            showDetails={true}
            onCredentialClick={(credential: ComplianceCredential) => {
              window.open(`/verify/credential/${credential.id}`, '_blank');
            }}
            onVerifyCredential={(credential: ComplianceCredential) => {
              window.open(`/verify/credential/${credential.id}`, '_blank');
            }}
          />
        )}

        {/* Product Timeline */}
        {product && (
          <div className='rounded-lg border border-gray-200 bg-white p-6 shadow-sm'>
            <ProductTimeline
              product={product}
              showLocation={true}
              showProductDetails={true}
              showEventData={false}
            />
          </div>
        )}

        {/* Actions */}
        <div className='flex items-center justify-between border-t border-gray-200 pt-4'>
          <div className='flex gap-4'>
            <Button variant='outline' onClick={handleRetry} loading={retrying}>
              {retrying ? 'Refreshing...' : 'Refresh Data'}
            </Button>

            <Button variant='ghost' onClick={() => window.print()}>
              Print Report
            </Button>

            <Link href={ROUTES.VERIFY_CREDENTIAL}>
              <Button
                variant='ghost'
                className='text-blue-600 hover:text-blue-700'
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
                Verify Credential
              </Button>
            </Link>
          </div>

          <div className='text-xs text-gray-500'>
            {product && (
              <p>
                Last updated: {new Date(product.updatedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
