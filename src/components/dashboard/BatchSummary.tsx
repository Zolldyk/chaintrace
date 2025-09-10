/**
 * Batch Summary Component
 *
 * Provides a comprehensive overview of batch operations including totals,
 * validation status, and performance metrics. Supports batch-level operations
 * like select all, bulk actions, and batch size validation.
 *
 * Features:
 * - Real-time batch statistics calculation
 * - Validation status overview
 * - Performance optimization warnings
 * - Bulk operation controls
 * - Batch size limit monitoring
 *
 * @example
 * ```tsx
 * <BatchSummary
 *   products={products}
 *   validations={validations}
 *   onSelectAll={handleSelectAll}
 *   onBulkAction={handleBulkAction}
 *   maxBatchSize={100}
 * />
 * ```
 *
 * @since 1.0.0
 */

import * as React from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type {
  CreateProductRequest,
  ProductFormValidation,
  BatchProcessingMetrics,
} from '@/types/batch';
import type { QuantityUnit } from '@/types/product';

/**
 * Batch statistics interface
 */
interface BatchStatistics {
  /** Total number of products */
  totalProducts: number;

  /** Number of valid products */
  validProducts: number;

  /** Number of invalid products */
  invalidProducts: number;

  /** Total weight in kg */
  totalWeight: number;

  /** Total volume in liters */
  totalVolume: number;

  /** Total pieces count */
  totalPieces: number;

  /** Estimated processing time in seconds */
  estimatedProcessingTime: number;

  /** Category breakdown */
  categoryBreakdown: Record<string, number>;

  /** Unit breakdown */
  unitBreakdown: Record<QuantityUnit, number>;
}

/**
 * Bulk action types
 */
export type BulkActionType =
  | 'selectAll'
  | 'deselectAll'
  | 'removeSelected'
  | 'validateSelected'
  | 'clearAll';

/**
 * BatchSummary component props
 */
interface BatchSummaryProps {
  /** Array of products in the batch */
  products: CreateProductRequest[];

  /** Validation state for each product */
  validations: ProductFormValidation[];

  /** Selected product indices for bulk operations */
  selectedProducts?: number[];

  /** Maximum batch size limit */
  maxBatchSize?: number;

  /** Whether batch operations are disabled */
  disabled?: boolean;

  /** Callback for bulk actions */
  onBulkAction?: (action: BulkActionType, indices?: number[]) => void;

  /** Callback for product selection changes */
  onSelectionChange?: (selectedIndices: number[]) => void;

  /** Processing metrics for performance display */
  processingMetrics?: BatchProcessingMetrics;

  /** Whether to show advanced statistics */
  showAdvanced?: boolean;
}

/**
 * Convert quantity to kilograms for weight calculations
 */
const convertToKilograms = (amount: number, unit: QuantityUnit): number => {
  switch (unit) {
    case 'kg':
      return amount;
    case 'tons':
      return amount * 1000;
    case 'pieces':
    case 'liters':
    case 'boxes':
      return 0; // These units don't contribute to weight
    default:
      return 0;
  }
};

/**
 * Convert quantity to liters for volume calculations
 */
const convertToLiters = (amount: number, unit: QuantityUnit): number => {
  switch (unit) {
    case 'liters':
      return amount;
    case 'kg':
    case 'tons':
    case 'pieces':
    case 'boxes':
      return 0; // These units don't contribute to volume
    default:
      return 0;
  }
};

/**
 * Calculate batch statistics from products array
 */
const calculateBatchStatistics = (
  products: CreateProductRequest[]
): BatchStatistics => {
  const stats: BatchStatistics = {
    totalProducts: products.length,
    validProducts: 0,
    invalidProducts: 0,
    totalWeight: 0,
    totalVolume: 0,
    totalPieces: 0,
    estimatedProcessingTime: 0,
    categoryBreakdown: {},
    unitBreakdown: {
      kg: 0,
      tons: 0,
      pieces: 0,
      liters: 0,
      boxes: 0,
    },
  };

  products.forEach(product => {
    // Weight calculation
    stats.totalWeight += convertToKilograms(
      product.quantity.amount,
      product.quantity.unit
    );

    // Volume calculation
    stats.totalVolume += convertToLiters(
      product.quantity.amount,
      product.quantity.unit
    );

    // Pieces calculation
    if (product.quantity.unit === 'pieces') {
      stats.totalPieces += product.quantity.amount;
    }

    // Category breakdown
    stats.categoryBreakdown[product.category] =
      (stats.categoryBreakdown[product.category] || 0) + 1;

    // Unit breakdown
    stats.unitBreakdown[product.quantity.unit] += product.quantity.amount;
  });

  // Estimate processing time (base 5 seconds per product + weight factor)
  stats.estimatedProcessingTime =
    products.length * 5 + Math.floor(stats.totalWeight / 10);

  return stats;
};

/**
 * BatchSummary Component
 */
export function BatchSummary({
  products,
  validations,
  selectedProducts = [],
  maxBatchSize = 100,
  disabled = false,
  onBulkAction,
  onSelectionChange,
  processingMetrics,
  showAdvanced = false,
}: BatchSummaryProps) {
  // Calculate batch statistics
  const stats = React.useMemo(
    () => calculateBatchStatistics(products),
    [products]
  );

  // Calculate validation statistics
  const validationStats = React.useMemo(() => {
    let validCount = 0;
    let invalidCount = 0;
    let complianceValidCount = 0;
    let complianceInvalidCount = 0;

    validations.forEach(validation => {
      if (validation.isValid) {
        validCount++;
      } else {
        invalidCount++;
      }

      if (validation.complianceStatus === 'valid') {
        complianceValidCount++;
      } else if (validation.complianceStatus === 'invalid') {
        complianceInvalidCount++;
      }
    });

    return {
      valid: validCount,
      invalid: invalidCount,
      complianceValid: complianceValidCount,
      complianceInvalid: complianceInvalidCount,
    };
  }, [validations]);

  // Check if batch is approaching limits
  const approachingLimit = products.length > maxBatchSize * 0.8;
  const exceedsWeightLimit = stats.totalWeight > 800; // Warning at 80% of 1000kg limit
  const exceedsTimeLimit = stats.estimatedProcessingTime > 100; // Warning at 100 seconds

  const handleBulkAction = (action: BulkActionType) => {
    switch (action) {
      case 'selectAll':
        onSelectionChange?.(products.map((_, index) => index));
        break;
      case 'deselectAll':
        onSelectionChange?.([]);
        break;
      case 'clearAll':
        if (window.confirm('Are you sure you want to clear all products?')) {
          onBulkAction?.(action);
        }
        break;
      default:
        onBulkAction?.(action, selectedProducts);
        break;
    }
  };

  return (
    <div className='space-y-8'>
      {/* Main Statistics Card */}
      <Card className='p-6'>
        <div className='mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <h3 className='text-lg font-semibold text-gray-900'>Batch Summary</h3>
          <div className='flex flex-wrap gap-3'>
            <Button
              variant='outline'
              size='md'
              onClick={() => handleBulkAction('selectAll')}
              disabled={disabled || selectedProducts.length === products.length}
            >
              Select All
            </Button>
            <Button
              variant='outline'
              size='md'
              onClick={() => handleBulkAction('deselectAll')}
              disabled={disabled || selectedProducts.length === 0}
            >
              Deselect All
            </Button>
            <Button
              variant='outline'
              size='md'
              onClick={() => handleBulkAction('clearAll')}
              disabled={disabled || products.length === 0}
              className='text-red-600 hover:border-red-300 hover:text-red-700'
            >
              Clear All
            </Button>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className='grid grid-cols-2 gap-6 md:grid-cols-4'>
          <div className='text-center'>
            <div className='text-2xl font-bold text-primary-600'>
              {stats.totalProducts}
            </div>
            <div className='text-sm text-gray-500'>Products</div>
          </div>

          <div className='text-center'>
            <div className='text-2xl font-bold text-green-600'>
              {validationStats.valid}
            </div>
            <div className='text-sm text-gray-500'>Valid</div>
          </div>

          <div className='text-center'>
            <div className='text-2xl font-bold text-red-600'>
              {validationStats.invalid}
            </div>
            <div className='text-sm text-gray-500'>Invalid</div>
          </div>

          <div className='text-center'>
            <div className='text-2xl font-bold text-blue-600'>
              {selectedProducts.length}
            </div>
            <div className='text-sm text-gray-500'>Selected</div>
          </div>
        </div>

        {/* Totals */}
        <div className='mt-10 grid grid-cols-1 gap-6 md:grid-cols-3'>
          <div className='rounded-lg bg-gray-50 p-4'>
            <div className='text-lg font-semibold text-gray-900'>
              {stats.totalWeight.toFixed(1)} kg
            </div>
            <div className='text-sm text-gray-500'>Total Weight</div>
          </div>

          <div className='rounded-lg bg-gray-50 p-4'>
            <div className='text-lg font-semibold text-gray-900'>
              {stats.totalVolume.toFixed(1)} L
            </div>
            <div className='text-sm text-gray-500'>Total Volume</div>
          </div>

          <div className='rounded-lg bg-gray-50 p-4'>
            <div className='text-lg font-semibold text-gray-900'>
              {Math.floor(stats.estimatedProcessingTime / 60)}m{' '}
              {stats.estimatedProcessingTime % 60}s
            </div>
            <div className='text-sm text-gray-500'>Est. Processing Time</div>
          </div>
        </div>
      </Card>

      {/* Warnings and Limits */}
      {(approachingLimit || exceedsWeightLimit || exceedsTimeLimit) && (
        <Card className='border-yellow-200 bg-yellow-50 p-4'>
          <h4 className='mb-2 font-medium text-yellow-800'>Batch Warnings</h4>
          <div className='space-y-1 text-sm text-yellow-700'>
            {approachingLimit && (
              <div>
                ⚠️ Batch size approaching limit ({products.length}/
                {maxBatchSize})
              </div>
            )}
            {exceedsWeightLimit && (
              <div>
                ⚠️ Total weight approaching daily limit (
                {stats.totalWeight.toFixed(1)}/1000 kg)
              </div>
            )}
            {exceedsTimeLimit && (
              <div>
                ⚠️ Processing time may exceed 2 minutes (
                {Math.floor(stats.estimatedProcessingTime / 60)}m{' '}
                {stats.estimatedProcessingTime % 60}s)
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Compliance Status */}
      <Card className='p-6'>
        <h4 className='mb-3 font-medium text-gray-900'>
          Compliance Validation
        </h4>
        <div className='grid grid-cols-2 gap-6'>
          <div className='flex items-center justify-between'>
            <span className='text-sm text-gray-600'>Validated</span>
            <span className='font-medium text-green-600'>
              {validationStats.complianceValid}
            </span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-sm text-gray-600'>Failed</span>
            <span className='font-medium text-red-600'>
              {validationStats.complianceInvalid}
            </span>
          </div>
        </div>

        {validationStats.complianceInvalid > 0 && (
          <Button
            variant='outline'
            size='sm'
            className='mt-3 w-full'
            onClick={() => handleBulkAction('validateSelected')}
            disabled={disabled}
          >
            Re-validate Failed Products
          </Button>
        )}
      </Card>

      {/* Advanced Statistics */}
      {showAdvanced && (
        <Card className='p-6'>
          <h4 className='mb-3 font-medium text-gray-900'>
            Advanced Statistics
          </h4>

          {/* Category Breakdown */}
          <div className='mb-4'>
            <h5 className='mb-2 text-sm font-medium text-gray-700'>
              By Category
            </h5>
            <div className='space-y-2'>
              {Object.entries(stats.categoryBreakdown).map(
                ([category, count]) => (
                  <div key={category} className='flex justify-between text-sm'>
                    <span className='capitalize text-gray-600'>
                      {category.replace('_', ' ')}
                    </span>
                    <span className='font-medium'>{count}</span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Unit Breakdown */}
          <div>
            <h5 className='mb-2 text-sm font-medium text-gray-700'>By Unit</h5>
            <div className='space-y-2'>
              {Object.entries(stats.unitBreakdown)
                .filter(([, amount]) => amount > 0)
                .map(([unit, amount]) => (
                  <div key={unit} className='flex justify-between text-sm'>
                    <span className='text-gray-600'>{unit}</span>
                    <span className='font-medium'>{amount.toFixed(1)}</span>
                  </div>
                ))}
            </div>
          </div>
        </Card>
      )}

      {/* Processing Metrics (if available) */}
      {processingMetrics && (
        <Card className='p-6'>
          <h4 className='mb-3 font-medium text-gray-900'>
            Processing Performance
          </h4>
          <div className='grid grid-cols-2 gap-4 text-sm'>
            <div>
              <span className='text-gray-600'>Total Time:</span>
              <span className='ml-2 font-medium'>
                {(processingMetrics.totalTime / 1000).toFixed(1)}s
              </span>
            </div>
            <div>
              <span className='text-gray-600'>Avg per Product:</span>
              <span className='ml-2 font-medium'>
                {(processingMetrics.averageTimePerProduct / 1000).toFixed(1)}s
              </span>
            </div>
            <div>
              <span className='text-gray-600'>Success Rate:</span>
              <span className='ml-2 font-medium'>
                {(
                  (processingMetrics.results.successful /
                    processingMetrics.productCount) *
                  100
                ).toFixed(1)}
                %
              </span>
            </div>
            <div>
              <span className='text-gray-600'>Products:</span>
              <span className='ml-2 font-medium'>
                {processingMetrics.productCount}
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
