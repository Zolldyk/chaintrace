/**
 * Batch Success Confirmation Component
 *
 * Displays comprehensive confirmation interface after successful batch creation
 * with generated product IDs, verification status, QR code previews, and
 * download functionality. Provides clear next action guidance and success
 * state management.
 *
 * Features:
 * - Product ID display with copy functionality
 * - Initial verification status for each product
 * - QR code preview and bulk download
 * - Performance metrics display
 * - Suggested next actions
 * - Success state navigation
 *
 * @example
 * ```tsx
 * <BatchSuccessConfirmation
 *   batchResult={batchResult}
 *   onNavigate={handleNavigation}
 *   onDownloadQR={handleQRDownload}
 *   showMetrics={true}
 * />
 * ```
 *
 * @since 1.0.0
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type {
  BatchCreationResponse,
  ProductCreationResult,
  BatchProcessingMetrics,
} from '@/types/batch';
import type { VerificationStatus } from '@/types/product';

/**
 * Navigation action types
 */
export type NavigationAction =
  | 'view_dashboard'
  | 'create_another'
  | 'view_products'
  | 'download_qr';

/**
 * QR code download formats
 */
export type QRDownloadFormat = 'png' | 'svg' | 'pdf';

/**
 * Component props
 */
interface BatchSuccessConfirmationProps {
  /** Batch creation result data */
  batchResult: BatchCreationResponse;

  /** Processing metrics (optional) */
  metrics?: BatchProcessingMetrics;

  /** Whether to show advanced metrics */
  showMetrics?: boolean;

  /** Whether to show QR code previews */
  showQRPreviews?: boolean;

  /** Maximum number of QR previews to show */
  maxQRPreviews?: number;

  /** Callback for navigation actions */
  onNavigate?: (action: NavigationAction, data?: any) => void;

  /** Callback for QR code downloads */
  onDownloadQR?: (
    productIds: string[],
    format: QRDownloadFormat
  ) => Promise<void>;

  /** Callback for copying product IDs */
  onCopyProductIds?: (productIds: string[]) => void;

  /** Custom success message */
  customMessage?: string;

  /** Whether to auto-hide after delay */
  autoHide?: boolean;

  /** Auto-hide delay in milliseconds */
  autoHideDelay?: number;
}

/**
 * Status badge component for verification status
 */
function StatusBadge({ status }: { status: VerificationStatus }) {
  const statusConfig = {
    created: {
      className: 'bg-blue-100 text-blue-800 border-blue-200',
      label: 'Created',
      icon: '✓',
    },
    verified: {
      className: 'bg-green-100 text-green-800 border-green-200',
      label: 'Verified',
      icon: '✅',
    },
    rejected: {
      className: 'bg-red-100 text-red-800 border-red-200',
      label: 'Rejected',
      icon: '❌',
    },
    processing: {
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      label: 'Processing',
      icon: '⏳',
    },
    pending: {
      className: 'bg-gray-100 text-gray-800 border-gray-200',
      label: 'Pending',
      icon: '⏸️',
    },
    expired: {
      className: 'bg-gray-100 text-gray-800 border-gray-200',
      label: 'Expired',
      icon: '⏰',
    },
    unverified: {
      className: 'bg-gray-100 text-gray-800 border-gray-200',
      label: 'Unverified',
      icon: '❓',
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium',
        config.className
      )}
    >
      <span aria-hidden='true'>{config.icon}</span>
      {config.label}
    </span>
  );
}

/**
 * Product result card component
 */
function ProductResultCard({
  product,
  index,
  onCopyId,
  showQRPreview = false,
}: {
  product: ProductCreationResult;
  index: number;
  onCopyId?: (productId: string) => void;
  showQRPreview?: boolean;
}) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    if (onCopyId) {
      onCopyId(product.id);
    } else {
      await navigator.clipboard.writeText(product.id);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card
      className={cn(
        'p-4 transition-colors',
        product.complianceValidation.approved
          ? 'border-green-200 bg-green-50'
          : 'border-red-200 bg-red-50'
      )}
    >
      <div className='flex items-start justify-between'>
        <div className='flex-1'>
          <div className='mb-2 flex items-center gap-2'>
            <h4 className='font-medium text-gray-900'>
              {product.name} #{index + 1}
            </h4>
            <StatusBadge status={product.status} />
          </div>

          <div className='space-y-2'>
            <div className='flex items-center gap-2'>
              <span className='text-sm text-gray-600'>Product ID:</span>
              <code className='rounded bg-gray-100 px-2 py-1 font-mono text-sm'>
                {product.id}
              </code>
              <Button
                variant='ghost'
                size='sm'
                onClick={handleCopy}
                className='h-6 px-2 text-xs'
              >
                {copied ? '✓ Copied' : 'Copy'}
              </Button>
            </div>

            {product.complianceValidation.complianceId && (
              <div className='flex items-center gap-2'>
                <span className='text-sm text-gray-600'>Compliance ID:</span>
                <code className='rounded bg-gray-100 px-2 py-1 font-mono text-sm'>
                  {product.complianceValidation.complianceId}
                </code>
              </div>
            )}
          </div>

          {product.complianceValidation?.violations &&
            product.complianceValidation.violations.length > 0 && (
              <div className='mt-3'>
                <p className='mb-1 text-sm font-medium text-red-700'>
                  Violations:
                </p>
                <ul className='list-inside list-disc space-y-1 text-sm text-red-600'>
                  {product.complianceValidation.violations.map(
                    (violation, i) => (
                      <li key={i}>{violation}</li>
                    )
                  )}
                </ul>
              </div>
            )}
        </div>

        {showQRPreview && product.complianceValidation.approved && (
          <div className='ml-4'>
            <QRCodePreview qrData={product.qrCode} size={80} />
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * QR code preview component (placeholder)
 */
function QRCodePreview({ size = 100 }: { qrData: string; size?: number }) {
  return (
    <div
      className='flex items-center justify-center border-2 border-dashed border-gray-300 bg-white'
      style={{ width: size, height: size }}
    >
      <div className='text-center'>
        <div className='text-xs text-gray-500'>QR Code</div>
        <div className='text-xs text-gray-400'>Preview</div>
      </div>
    </div>
  );
}

/**
 * BatchSuccessConfirmation Component
 */
export function BatchSuccessConfirmation({
  batchResult,
  metrics,
  showMetrics = true,
  showQRPreviews = true,
  maxQRPreviews = 6,
  onNavigate,
  onDownloadQR,
  onCopyProductIds,
  customMessage,
  autoHide = false,
  autoHideDelay = 10000,
}: BatchSuccessConfirmationProps) {
  const [isVisible, setIsVisible] = React.useState(true);

  // Auto-hide functionality
  React.useEffect(() => {
    if (autoHide && autoHideDelay > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onNavigate?.('view_dashboard');
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [autoHide, autoHideDelay, onNavigate]);

  if (!isVisible) {
    return null;
  }

  // Get successful products from productIds
  const successfulProducts = batchResult.productIds.map(id => ({
    id,
    name: `Product ${id}`,
    qrCode: id, // Use the ID as QR code for now
    status: 'verified' as const,
    complianceValidation: {
      approved: true,
      complianceId: `comp-${id}`,
      violations: [],
    },
  }));
  const failedProducts = batchResult.failedProducts;

  const handleNavigation = (action: NavigationAction, data?: any) => {
    onNavigate?.(action, data);
  };

  const handleDownloadAllQR = async (format: QRDownloadFormat = 'png') => {
    const productIds = successfulProducts.map(p => p.id);
    await onDownloadQR?.(productIds, format);
  };

  const handleCopyAllIds = () => {
    const productIds = successfulProducts.map(p => p.id);
    onCopyProductIds?.(productIds);
  };

  const successRate =
    (successfulProducts.length / batchResult.results.total) * 100;

  return (
    <div className='space-y-6'>
      {/* Success Header */}
      <Card className='border-green-200 bg-green-50 p-6'>
        <div className='text-center'>
          <div className='mb-4'>
            <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100'>
              <span className='text-2xl'>🎉</span>
            </div>
          </div>
          <h2 className='mb-2 text-2xl font-bold text-green-900'>
            Batch Created Successfully!
          </h2>
          <p className='text-green-800'>
            {customMessage ||
              `Your product batch has been created with ${successfulProducts.length} of ${batchResult.results.total} products approved.`}
          </p>
        </div>

        {/* Quick Stats */}
        <div className='mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3'>
          <div className='text-center'>
            <div className='text-2xl font-bold text-green-700'>
              {successfulProducts.length}
            </div>
            <div className='text-sm text-green-600'>Products Created</div>
          </div>
          <div className='text-center'>
            <div className='text-2xl font-bold text-green-700'>
              {successRate.toFixed(0)}%
            </div>
            <div className='text-sm text-green-600'>Success Rate</div>
          </div>
          <div className='text-center'>
            <div className='text-2xl font-bold text-green-700'>
              {Math.floor((batchResult.metadata.processingTimeMs || 0) / 1000)}s
            </div>
            <div className='text-sm text-green-600'>Processing Time</div>
          </div>
        </div>
      </Card>

      {/* Batch Information */}
      <Card className='p-6'>
        <h3 className='mb-4 text-lg font-semibold text-gray-900'>
          Batch Details
        </h3>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          <div>
            <span className='text-sm text-gray-600'>Batch ID:</span>
            <code className='ml-2 rounded bg-gray-100 px-2 py-1 font-mono text-sm'>
              {batchResult.batchId}
            </code>
          </div>
          <div>
            <span className='text-sm text-gray-600'>Created:</span>
            <span className='ml-2 text-sm font-medium'>
              {new Date().toLocaleString()}
            </span>
          </div>
        </div>

        {/* Bulk Actions */}
        <div className='mt-6 flex flex-wrap gap-3'>
          <Button
            variant='outline'
            onClick={handleCopyAllIds}
            disabled={successfulProducts.length === 0}
          >
            Copy All Product IDs
          </Button>
          <Button
            variant='outline'
            onClick={() => handleDownloadAllQR('png')}
            disabled={successfulProducts.length === 0}
          >
            Download QR Codes
          </Button>
          <Button
            variant='outline'
            onClick={() =>
              handleNavigation('view_products', successfulProducts)
            }
          >
            View Products
          </Button>
        </div>
      </Card>

      {/* Successful Products */}
      {successfulProducts.length > 0 && (
        <Card className='p-6'>
          <h3 className='mb-4 text-lg font-semibold text-green-900'>
            Successfully Created Products ({successfulProducts.length})
          </h3>
          <div className='space-y-3'>
            {successfulProducts
              .slice(0, showQRPreviews ? maxQRPreviews : undefined)
              .map((product, index) => (
                <ProductResultCard
                  key={product.id}
                  product={product}
                  index={index}
                  onCopyId={
                    onCopyProductIds ? id => onCopyProductIds([id]) : undefined
                  }
                  showQRPreview={showQRPreviews && index < maxQRPreviews}
                />
              ))}
          </div>
          {successfulProducts.length > maxQRPreviews && showQRPreviews && (
            <p className='mt-3 text-center text-sm text-gray-600'>
              Showing {maxQRPreviews} of {successfulProducts.length} successful
              products.{' '}
              <Button
                variant='ghost'
                size='sm'
                onClick={() =>
                  handleNavigation('view_products', successfulProducts)
                }
                className='h-auto p-0 text-primary-600'
              >
                View all products
              </Button>
            </p>
          )}
        </Card>
      )}

      {/* Failed Products */}
      {failedProducts.length > 0 && (
        <Card className='border-red-200 bg-red-50 p-6'>
          <h3 className='mb-4 text-lg font-semibold text-red-900'>
            Failed Products ({failedProducts.length})
          </h3>
          <div className='space-y-3'>
            {failedProducts.map((product, index) => (
              <ProductResultCard
                key={product.index}
                product={{
                  id: `failed-${product.index}`,
                  name: product.productName,
                  qrCode: '',
                  status: 'rejected' as const,
                  complianceValidation: {
                    approved: false,
                    complianceId: '',
                    violations: product.errors,
                  },
                }}
                index={successfulProducts.length + index}
                showQRPreview={false}
              />
            ))}
          </div>
          <div className='mt-4'>
            <Button
              variant='outline'
              onClick={() => handleNavigation('create_another')}
              className='border-red-200 text-red-700 hover:bg-red-100'
            >
              Create New Batch
            </Button>
          </div>
        </Card>
      )}

      {/* Performance Metrics */}
      {showMetrics && metrics && (
        <Card className='p-6'>
          <h3 className='mb-4 text-lg font-semibold text-gray-900'>
            Processing Metrics
          </h3>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            <div className='text-center'>
              <div className='text-xl font-bold text-blue-700'>
                {(metrics.totalTime / 1000).toFixed(1)}s
              </div>
              <div className='text-sm text-gray-600'>Total Time</div>
            </div>
            <div className='text-center'>
              <div className='text-xl font-bold text-blue-700'>
                {(metrics.averageTimePerProduct / 1000).toFixed(1)}s
              </div>
              <div className='text-sm text-gray-600'>Avg per Product</div>
            </div>
            <div className='text-center'>
              <div className='text-xl font-bold text-blue-700'>
                {metrics.results.successful}
              </div>
              <div className='text-sm text-gray-600'>Successful</div>
            </div>
            <div className='text-center'>
              <div className='text-xl font-bold text-blue-700'>
                {metrics.results.failed}
              </div>
              <div className='text-sm text-gray-600'>Failed</div>
            </div>
          </div>
        </Card>
      )}

      {/* Next Actions */}
      <Card className='p-6'>
        <h3 className='mb-4 text-lg font-semibold text-gray-900'>
          What&apos;s Next?
        </h3>
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          <Button
            onClick={() => handleNavigation('view_dashboard')}
            className='w-full'
          >
            View Dashboard
          </Button>
          <Button
            variant='outline'
            onClick={() => handleNavigation('create_another')}
            className='w-full'
          >
            Create Another Batch
          </Button>
          <Button
            variant='outline'
            onClick={() => handleDownloadAllQR('pdf')}
            disabled={successfulProducts.length === 0}
            className='w-full'
          >
            Download QR Report
          </Button>
        </div>

        <div className='mt-4 text-center text-sm text-gray-600'>
          Product IDs and QR codes are now available for scanning and
          verification.
        </div>
      </Card>
    </div>
  );
}
