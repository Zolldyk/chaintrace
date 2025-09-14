/**
 * ProductDetails component with integrated credential display
 *
 * @example
 * ```tsx
 * <ProductDetails
 *   product={productWithEvents}
 *   showCredentials={true}
 * />
 * ```
 *
 * @since 1.0.0
 */

'use client';

import * as React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { VerificationStatus } from './VerificationStatus';
import { CredentialDisplay } from './CredentialDisplay';
import { CredentialBadge } from './CredentialBadge';
import { ExpirationWarning } from '@/components/ui/ExpirationWarning';
import type { ProductWithEvents } from '@/types/product';
import type {
  ComplianceCredential,
  CredentialExpirationInfo,
} from '@/types/compliance';
import { formatCredential } from '@/lib/credential-formatting';
import { cn } from '@/lib/utils';

export interface ProductDetailsProps {
  /** Product with verification events */
  product: ProductWithEvents;

  /** Whether to show credential information (AC: 4) */
  showCredentials?: boolean;

  /** Whether to show detailed product information (AC: 3) */
  showDetails?: boolean;

  /** Additional CSS classes */
  className?: string;

  /** Callback when credential is clicked */
  onCredentialClick?: (credential: ComplianceCredential) => void;

  /** Callback when credential verification is requested */
  onVerifyCredential?: (credential: ComplianceCredential) => void;

  /** Whether to show interactive map features (AC: 3) */
  showInteractiveMap?: boolean;

  /** Whether to enable enhanced mobile optimizations (AC: 5) */
  mobileOptimized?: boolean;

  /** Callback when user wants to view location on external map */
  onViewLocation?: (coordinates: {
    latitude: number;
    longitude: number;
  }) => void;
}

/**
 * Enhanced product details with credential integration
 */
export function ProductDetails({
  product,
  showCredentials = true,
  showDetails = true,
  className,
  onCredentialClick,
  onVerifyCredential,
}: ProductDetailsProps) {
  const [credentials, setCredentials] = React.useState<ComplianceCredential[]>(
    []
  );
  const [credentialsLoading, setCredentialsLoading] = React.useState(false);
  const [credentialsError, setCredentialsError] = React.useState<string | null>(
    null
  );
  const [expirationWarnings, setExpirationWarnings] = React.useState<
    CredentialExpirationInfo[]
  >([]);

  // Fetch credentials for the product
  const fetchCredentials = React.useCallback(async () => {
    if (!showCredentials) return;

    setCredentialsLoading(true);
    setCredentialsError(null);

    try {
      const response = await fetch(`/api/products/${product.id}/credentials`);

      if (!response.ok) {
        throw new Error(`Failed to fetch credentials: ${response.status}`);
      }

      const data = await response.json();
      setCredentials(data.credentials || []);
      setExpirationWarnings(data.expirationInfo?.expiring || []);
    } catch (error) {
      setCredentialsError(
        error instanceof Error ? error.message : 'Failed to load credentials'
      );
    } finally {
      setCredentialsLoading(false);
    }
  }, [product.id, showCredentials]);

  React.useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  const handleCredentialAction = (
    credentialId: string,
    action: 'view' | 'renew' | 'dismiss'
  ) => {
    const credential = credentials.find(c => c.id === credentialId);
    if (!credential) return;

    if (action === 'view' && onCredentialClick) {
      onCredentialClick(credential);
    } else if (action === 'dismiss') {
      // Handle dismiss action - remove from warnings
      setExpirationWarnings(prev =>
        prev.filter(w => w.credentialId !== credentialId)
      );
    }
    // Note: 'renew' action would be handled by a dedicated renewal flow
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Main Product Information */}
      <Card className='p-6'>
        <div className='mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
          <div className='min-w-0 flex-1'>
            <div className='mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4'>
              <h2 className='text-2xl font-bold text-gray-900 sm:text-3xl'>
                {product.name}
              </h2>
              {/* Mobile-friendly category badge */}
              <span className='inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 ring-1 ring-blue-200 sm:text-base'>
                <svg
                  className='h-4 w-4'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path d='M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z' />
                </svg>
                <span className='capitalize'>{product.category}</span>
              </span>
            </div>

            {/* Enhanced ID display with copy functionality */}
            <div className='flex flex-col gap-2 text-sm text-gray-600 sm:flex-row sm:items-center sm:gap-6'>
              <div className='flex items-center gap-2'>
                <span>Product ID:</span>
                <div className='inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 font-mono text-sm ring-1 ring-gray-200'>
                  <span className='text-gray-900'>{product.id}</span>
                  <button
                    onClick={() => navigator.clipboard?.writeText(product.id)}
                    className='text-gray-400 hover:text-gray-600 focus:outline-none'
                    title='Copy Product ID'
                  >
                    <svg
                      className='h-3 w-3'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z'
                      />
                    </svg>
                  </button>
                </div>
              </div>
              {product.batchId && (
                <div className='flex items-center gap-2'>
                  <span>Batch ID:</span>
                  <div className='inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 font-mono text-sm ring-1 ring-gray-200'>
                    <span className='text-gray-900'>{product.batchId}</span>
                    <button
                      onClick={() =>
                        navigator.clipboard?.writeText(product.batchId!)
                      }
                      className='text-gray-400 hover:text-gray-600 focus:outline-none'
                      title='Copy Batch ID'
                    >
                      <svg
                        className='h-3 w-3'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z'
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced verification status with mobile optimization */}
          <div className='flex-shrink-0'>
            <VerificationStatus
              status={product.status}
              lastVerified={product.lastVerified}
              expiresAt={product.expiresAt}
              size='lg'
              showDetails={true}
              showActionSuggestions={true}
              enhancedAccessibility={true}
            />
          </div>
        </div>

        {product.description && (
          <p className='mb-4 text-gray-700'>{product.description}</p>
        )}

        {showDetails && (
          <div className='mt-6 space-y-6'>
            {/* Enhanced Origin Information with Interactive Elements (AC: 3) */}
            <div className='rounded-lg border border-gray-200 p-4 sm:p-6'>
              <div className='mb-4 flex items-center gap-2'>
                <svg
                  className='h-5 w-5 text-blue-600'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z'
                    clipRule='evenodd'
                  />
                </svg>
                <h4 className='text-base font-semibold text-gray-900'>
                  Product Origin
                </h4>
              </div>

              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <div className='space-y-3'>
                  {product.origin.address && (
                    <div>
                      <dt className='text-sm font-medium text-gray-500'>
                        Address
                      </dt>
                      <dd className='mt-1 text-sm text-gray-900'>
                        {product.origin.address}
                      </dd>
                    </div>
                  )}

                  <div className='grid grid-cols-2 gap-3'>
                    {product.origin.city && (
                      <div>
                        <dt className='text-sm font-medium text-gray-500'>
                          City
                        </dt>
                        <dd className='mt-1 text-sm font-semibold text-gray-900'>
                          {product.origin.city}
                        </dd>
                      </div>
                    )}
                    {product.origin.state && (
                      <div>
                        <dt className='text-sm font-medium text-gray-500'>
                          State
                        </dt>
                        <dd className='mt-1 text-sm font-semibold text-gray-900'>
                          {product.origin.state}
                        </dd>
                      </div>
                    )}
                  </div>

                  <div>
                    <dt className='text-sm font-medium text-gray-500'>
                      Country
                    </dt>
                    <dd className='mt-1 flex items-center gap-2 text-sm font-semibold text-gray-900'>
                      <span className='text-lg'>🇳🇬</span>
                      {product.origin.country}
                    </dd>
                  </div>

                  {product.origin.region && (
                    <div>
                      <dt className='text-sm font-medium text-gray-500'>
                        Region
                      </dt>
                      <dd className='mt-1 text-sm text-gray-900'>
                        {product.origin.region}
                      </dd>
                    </div>
                  )}
                </div>

                {/* Interactive Map Placeholder with Coordinates (AC: 3) */}
                <div className='rounded-lg bg-gray-50 p-4'>
                  {product.origin.coordinates ? (
                    <div className='space-y-3'>
                      <div className='flex items-center justify-between'>
                        <h5 className='text-sm font-medium text-gray-900'>
                          Location Coordinates
                        </h5>
                        <button
                          onClick={() => {
                            const { latitude, longitude } =
                              product.origin.coordinates!;
                            window.open(
                              `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
                              '_blank'
                            );
                          }}
                          className='inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500'
                        >
                          <svg
                            className='h-3 w-3'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
                            />
                          </svg>
                          View on Map
                        </button>
                      </div>

                      <div className='grid grid-cols-1 gap-2 text-xs'>
                        <div className='flex items-center justify-between rounded bg-white px-2 py-1.5'>
                          <span className='text-gray-500'>Latitude:</span>
                          <span className='font-mono font-medium text-gray-900'>
                            {product.origin.coordinates.latitude.toFixed(6)}°
                          </span>
                        </div>
                        <div className='flex items-center justify-between rounded bg-white px-2 py-1.5'>
                          <span className='text-gray-500'>Longitude:</span>
                          <span className='font-mono font-medium text-gray-900'>
                            {product.origin.coordinates.longitude.toFixed(6)}°
                          </span>
                        </div>
                      </div>

                      {/* Simple visual map representation */}
                      <div className='relative mt-3 h-24 rounded border-2 border-dashed border-gray-300 bg-gradient-to-br from-green-50 to-blue-50'>
                        <div className='absolute inset-0 flex items-center justify-center'>
                          <div className='flex items-center gap-2 text-xs text-gray-600'>
                            <div className='h-2 w-2 animate-pulse rounded-full bg-red-500'></div>
                            <span>Product Location</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className='flex h-32 flex-col items-center justify-center text-center text-gray-500'>
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
                          d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z'
                        />
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M15 11a3 3 0 11-6 0 3 3 0 016 0z'
                        />
                      </svg>
                      <p className='mt-2 text-sm'>
                        Location coordinates not available
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Enhanced Product Metadata Grid */}
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
              <div className='rounded-lg border border-gray-200 p-4'>
                <div className='mb-2 flex items-center gap-2'>
                  <svg
                    className='h-4 w-4 text-gray-400'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <dt className='text-sm font-medium text-gray-500'>
                    Quantity
                  </dt>
                </div>
                <dd className='text-lg font-bold text-gray-900'>
                  {product.quantity.amount}{' '}
                  <span className='text-sm font-normal text-gray-600'>
                    {product.quantity.unit}
                  </span>
                </dd>
              </div>

              <div className='rounded-lg border border-gray-200 p-4'>
                <div className='mb-2 flex items-center gap-2'>
                  <svg
                    className='h-4 w-4 text-gray-400'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <dt className='text-sm font-medium text-gray-500'>Created</dt>
                </div>
                <dd className='text-sm font-semibold text-gray-900'>
                  {new Date(product.createdAt).toLocaleDateString('en-NG', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </dd>
                <dd className='mt-1 text-xs text-gray-500'>
                  {new Date(product.createdAt).toLocaleTimeString('en-NG', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </dd>
              </div>

              <div className='rounded-lg border border-gray-200 p-4'>
                <div className='mb-2 flex items-center gap-2'>
                  <svg
                    className='h-4 w-4 text-gray-400'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <dt className='text-sm font-medium text-gray-500'>
                    Last Updated
                  </dt>
                </div>
                <dd className='text-sm font-semibold text-gray-900'>
                  {new Date(product.updatedAt).toLocaleDateString('en-NG', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </dd>
                <dd className='mt-1 text-xs text-gray-500'>
                  {(() => {
                    const now = new Date();
                    const updated = new Date(product.updatedAt);
                    const diffMs = now.getTime() - updated.getTime();
                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

                    if (diffDays > 0)
                      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
                    if (diffHours > 0)
                      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
                    return 'Recently updated';
                  })()}
                </dd>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Compliance Credentials Section */}
      {showCredentials && (
        <Card className='p-6'>
          <div className='mb-4 flex items-center justify-between'>
            <h3 className='text-lg font-semibold text-gray-900'>
              Compliance Credentials
            </h3>
            {credentials.length > 0 && (
              <div className='text-sm text-gray-500'>
                {credentials.length} credential
                {credentials.length === 1 ? '' : 's'}
              </div>
            )}
          </div>

          {/* Expiration Warnings */}
          {expirationWarnings.length > 0 && (
            <div className='mb-4'>
              {expirationWarnings.map(warning => (
                <ExpirationWarning
                  key={warning.credentialId}
                  expirationInfo={warning}
                  variant='banner'
                  showActions={true}
                  onAction={handleCredentialAction}
                  className='mb-2'
                />
              ))}
            </div>
          )}

          {/* Credentials Loading State */}
          {credentialsLoading && (
            <div className='py-6 text-center'>
              <div className='mb-2 inline-block h-6 w-6 animate-spin rounded-full border-4 border-current border-t-transparent text-blue-600'></div>
              <div className='text-sm text-gray-600'>
                Loading credentials...
              </div>
            </div>
          )}

          {/* Credentials Error State */}
          {credentialsError && (
            <div className='py-6 text-center'>
              <div className='mb-2 text-red-600'>❌</div>
              <div className='mb-2 text-sm text-red-600'>
                {credentialsError}
              </div>
              <Button onClick={fetchCredentials} variant='outline' size='sm'>
                Retry
              </Button>
            </div>
          )}

          {/* Credentials Display */}
          {!credentialsLoading && !credentialsError && (
            <>
              {credentials.length === 0 ? (
                <div className='py-6 text-center text-gray-500'>
                  <div className='mb-2 text-2xl'>📋</div>
                  <div className='text-sm'>
                    No compliance credentials found for this product
                  </div>
                </div>
              ) : (
                <div className='space-y-4'>
                  {credentials.map(credential => (
                    <CredentialDisplay
                      key={credential.id}
                      credential={credential}
                      compact={credentials.length > 2}
                      showQRCode={false}
                      onVerify={onVerifyCredential}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Credentials Summary */}
          {credentials.length > 0 && (
            <div className='mt-4 border-t border-gray-200 pt-4'>
              <div className='flex items-center justify-between'>
                <div className='text-sm text-gray-600'>
                  Credential Status Summary
                </div>
                <div className='flex items-center gap-2'>
                  {credentials.filter(c => c.status === 'active').length >
                    0 && (
                    <CredentialBadge
                      status='active'
                      size='xs'
                      showText={false}
                    />
                  )}
                  {credentials.filter(c => c.status === 'expired').length >
                    0 && (
                    <CredentialBadge
                      status='expired'
                      size='xs'
                      showText={false}
                    />
                  )}
                  {credentials.filter(c => c.status === 'revoked').length >
                    0 && (
                    <CredentialBadge
                      status='revoked'
                      size='xs'
                      showText={false}
                    />
                  )}
                </div>
              </div>
              <div className='mt-1 text-xs text-gray-500'>
                {credentials.filter(c => c.status === 'active').length} active,{' '}
                {credentials.filter(c => c.status === 'expired').length}{' '}
                expired,{' '}
                {credentials.filter(c => c.status === 'revoked').length} revoked
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

/**
 * Credential quick view component for compact display
 */
export function ProductCredentialSummary({
  productId,
  maxDisplay = 3,
  className,
  onViewAll,
}: {
  productId: string;
  maxDisplay?: number;
  className?: string;
  onViewAll?: () => void;
}) {
  const [credentials, setCredentials] = React.useState<ComplianceCredential[]>(
    []
  );
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const fetchCredentials = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/products/${productId}/credentials?limit=${maxDisplay + 1}`
        );
        if (response.ok) {
          const data = await response.json();
          setCredentials(data.credentials || []);
        }
      } catch (error) {
        // Silently handle error for summary component
      } finally {
        setLoading(false);
      }
    };

    fetchCredentials();
  }, [productId, maxDisplay]);

  if (loading) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className='h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent'></div>
        <span className='text-sm text-gray-600'>Loading credentials...</span>
      </div>
    );
  }

  if (credentials.length === 0) {
    return (
      <div className={cn('text-sm text-gray-500', className)}>
        No credentials available
      </div>
    );
  }

  const displayedCredentials = credentials.slice(0, maxDisplay);
  const hiddenCount = Math.max(0, credentials.length - maxDisplay);

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {displayedCredentials.map(credential => {
        const formatted = formatCredential(credential);
        return (
          <div
            key={credential.id}
            className='inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs'
            title={formatted.display.title}
          >
            <span>{formatted.display.type.icon}</span>
            <CredentialBadge
              status={credential.status}
              size='xs'
              showText={false}
            />
          </div>
        );
      })}
      {hiddenCount > 0 && onViewAll && (
        <Button
          onClick={onViewAll}
          variant='ghost'
          size='sm'
          className='h-auto px-2 py-1 text-xs'
        >
          +{hiddenCount} more
        </Button>
      )}
    </div>
  );
}
