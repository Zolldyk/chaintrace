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
import {
  ProductLookup,
  VerificationStatus,
  ProductTimeline,
} from '@/components/verification';
import { LoadingState, ErrorState } from '@/components/common';
import { Button } from '@/components/ui/Button';
import {
  ProductWithEvents,
  ProductVerificationResponse,
  ProductVerificationApiError,
  getProductVerificationService,
} from '@/services/verification';

interface ProductVerificationPageProps {
  params: {
    productId: string;
  };
}

export default function ProductVerificationPage({
  params,
}: ProductVerificationPageProps) {
  const router = useRouter();
  const productId = decodeURIComponent(params.productId);

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<ProductWithEvents | null>(null);
  const [error, setError] = useState<ProductVerificationApiError | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  /**
   * Fetches product verification data
   */
  const fetchProductVerification = async (skipCache: boolean = false) => {
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
            message={`Verifying product ${productId}...`}
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
                initialValue={productId}
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

        {/* Verification Status */}
        {product && (
          <VerificationStatus
            status={product.status}
            lastVerified={product.lastVerified}
            expiresAt={product.expiresAt}
            showDetails={true}
            size='lg'
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
