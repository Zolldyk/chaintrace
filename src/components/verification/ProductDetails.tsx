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

  /** Whether to show credential information */
  showCredentials?: boolean;

  /** Whether to show detailed product information */
  showDetails?: boolean;

  /** Additional CSS classes */
  className?: string;

  /** Callback when credential is clicked */
  onCredentialClick?: (credential: ComplianceCredential) => void;

  /** Callback when credential verification is requested */
  onVerifyCredential?: (credential: ComplianceCredential) => void;
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
        <div className='mb-4 flex items-start justify-between'>
          <div>
            <h2 className='mb-2 text-2xl font-bold text-gray-900'>
              {product.name}
            </h2>
            <div className='space-y-1 text-sm text-gray-600'>
              <div>
                Product ID: <span className='font-mono'>{product.id}</span>
              </div>
              {product.batchId && (
                <div>
                  Batch ID: <span className='font-mono'>{product.batchId}</span>
                </div>
              )}
              <div>
                Category: <span className='capitalize'>{product.category}</span>
              </div>
            </div>
          </div>
          <VerificationStatus
            status={product.status}
            lastVerified={product.lastVerified}
            expiresAt={product.expiresAt}
            size='lg'
            showDetails={true}
          />
        </div>

        {product.description && (
          <p className='mb-4 text-gray-700'>{product.description}</p>
        )}

        {showDetails && (
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <div>
              <dt className='text-sm font-medium text-gray-500'>Origin</dt>
              <dd className='text-sm text-gray-900'>
                {product.origin.city}, {product.origin.state},{' '}
                {product.origin.country}
              </dd>
            </div>
            <div>
              <dt className='text-sm font-medium text-gray-500'>Quantity</dt>
              <dd className='text-sm text-gray-900'>
                {product.quantity.amount} {product.quantity.unit}
              </dd>
            </div>
            <div>
              <dt className='text-sm font-medium text-gray-500'>Created</dt>
              <dd className='text-sm text-gray-900'>
                {new Date(product.createdAt).toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt className='text-sm font-medium text-gray-500'>
                Last Updated
              </dt>
              <dd className='text-sm text-gray-900'>
                {new Date(product.updatedAt).toLocaleDateString()}
              </dd>
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
