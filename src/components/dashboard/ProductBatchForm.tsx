/**
 * Product Batch Creation Form Component
 *
 * A comprehensive form for cooperative managers to log product batches with all
 * required information and real-time compliance validation. Supports batch
 * operations, local data backup, and integration with the Custom Compliance Engine.
 *
 * Features:
 * - Dynamic product row addition/removal
 * - Real-time form validation using Zod schemas
 * - Custom Compliance Engine integration for validation
 * - Local storage backup for form state persistence
 * - Batch processing performance optimization
 * - Nigerian states and regions dropdown support
 *
 * @example
 * ```tsx
 * <ProductBatchForm
 *   onSubmit={handleBatchSubmission}
 *   loading={isSubmitting}
 *   maxBatchSize={100}
 *   defaultCooperativeId="coop-123"
 *   defaultCreatedBy="0.0.12345"
 * />
 * ```
 *
 * @since 1.0.0
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import type {
  ProductBatchFormProps,
  CreateProductRequest,
  BatchFormState,
  ProductFormValidation,
} from '@/types/batch';
import type { ProductCategory, QuantityUnit } from '@/types/product';
import { FormValidationUtils } from '@/lib/validation/product';

/**
 * Product category options for form dropdown
 */
const PRODUCT_CATEGORIES: Array<{ value: ProductCategory; label: string }> = [
  { value: 'agricultural', label: 'Agricultural' },
  { value: 'processed_food', label: 'Processed Food' },
  { value: 'manufactured', label: 'Manufactured' },
  { value: 'other', label: 'Other' },
];

/**
 * Quantity unit options for form dropdown
 */
const QUANTITY_UNITS: Array<{ value: QuantityUnit; label: string }> = [
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'tons', label: 'Tons' },
  { value: 'pieces', label: 'Pieces' },
  { value: 'liters', label: 'Liters' },
  { value: 'boxes', label: 'Boxes' },
];

/**
 * Nigerian regions for form dropdown
 */
const REGIONS = FormValidationUtils.getRegions().map(region => ({
  value: region,
  label: region,
}));

/**
 * Nigerian states for form dropdown
 */
const NIGERIAN_STATES = FormValidationUtils.getNigerianStates().map(state => ({
  value: state,
  label: state,
}));

/**
 * Default empty product for new rows
 */
const createEmptyProduct = (): CreateProductRequest => ({
  name: '',
  category: 'agricultural',
  quantity: {
    amount: 0,
    unit: 'kg',
  },
  origin: {
    address: '',
    city: '',
    state: 'Lagos', // Default to Lagos
    country: 'Nigeria',
    coordinates: {
      latitude: 0,
      longitude: 0,
    },
    region: 'South West', // Default region for Lagos
  },
  processingDetails: {},
});

/**
 * Create empty validation state for product
 */
const createEmptyValidation = (): ProductFormValidation => ({
  errors: {},
  isValid: false,
  complianceStatus: 'pending',
  complianceMessages: [],
});

/**
 * ProductBatchForm Component
 */
export function ProductBatchForm({
  onSubmit,
  loading = false,
  maxBatchSize = 100,
  defaultCooperativeId = '',
  defaultCreatedBy = '',
  onFormStateChange,
  onBackup,
  initialData,
}: ProductBatchFormProps) {
  // Form state management
  const [formState, setFormState] = React.useState<BatchFormState>(() => ({
    products: initialData?.products || [createEmptyProduct()],
    batchInfo: {
      cooperativeId:
        initialData?.batchInfo?.cooperativeId || defaultCooperativeId,
      createdBy: initialData?.batchInfo?.createdBy || defaultCreatedBy,
      processingNotes: initialData?.batchInfo?.processingNotes || '',
    },
    productValidations: initialData?.productValidations || [
      createEmptyValidation(),
    ],
    batchValidation: initialData?.batchValidation || {
      isValid: false,
      errors: [],
    },
    submission: initialData?.submission || {
      isSubmitting: false,
      error: null,
      progress: 0,
    },
    lastBackup: initialData?.lastBackup || null,
  }));

  // Auto-backup every 30 seconds
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (formState.products.some(p => p.name.trim() !== '')) {
        const backupData = {
          formState,
          timestamp: new Date(),
          version: '1.0.0',
          sessionId: Date.now().toString(),
        };

        try {
          localStorage.setItem(
            'chaintrace_form_backup',
            JSON.stringify(backupData)
          );
          setFormState(prev => ({ ...prev, lastBackup: new Date() }));
          onBackup?.(backupData);
        } catch (error) {
          console.warn('Failed to backup form data:', error);
        }
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [formState, onBackup]);

  // Notify parent of form state changes
  React.useEffect(() => {
    onFormStateChange?.(formState);
  }, [formState, onFormStateChange]);

  /**
   * Add new product row to the form
   */
  const addProduct = () => {
    if (formState.products.length >= maxBatchSize) {
      return;
    }

    setFormState(prev => ({
      ...prev,
      products: [...prev.products, createEmptyProduct()],
      productValidations: [...prev.productValidations, createEmptyValidation()],
    }));
  };

  /**
   * Remove product row from the form
   */
  const removeProduct = (index: number) => {
    if (formState.products.length <= 1) {
      return; // Always keep at least one product
    }

    setFormState(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index),
      productValidations: prev.productValidations.filter((_, i) => i !== index),
    }));
  };

  /**
   * Update product field value
   */
  const updateProduct = (index: number, field: string, value: any) => {
    setFormState(prev => {
      const updatedProducts = [...prev.products];
      const product = { ...updatedProducts[index] };

      // Handle nested field updates (e.g., 'quantity.amount', 'origin.address')
      const fieldParts = field.split('.');
      let obj = product as any;
      for (let i = 0; i < fieldParts.length - 1; i++) {
        if (!obj[fieldParts[i]]) {
          obj[fieldParts[i]] = {};
        }
        obj = obj[fieldParts[i]];
      }
      obj[fieldParts[fieldParts.length - 1]] = value;

      updatedProducts[index] = product;

      // Validate the updated field
      const validation = FormValidationUtils.validateProductField(
        field,
        value,
        index
      );
      const updatedValidations = [...prev.productValidations];
      updatedValidations[index] = {
        ...updatedValidations[index],
        errors: {
          ...updatedValidations[index].errors,
          [field]: validation.error || '',
        },
      };

      // Remove empty error messages
      Object.keys(updatedValidations[index].errors).forEach(key => {
        if (!updatedValidations[index].errors[key]) {
          delete updatedValidations[index].errors[key];
        }
      });

      // Update product validity
      updatedValidations[index].isValid =
        Object.keys(updatedValidations[index].errors).length === 0;

      return {
        ...prev,
        products: updatedProducts,
        productValidations: updatedValidations,
      };
    });
  };

  /**
   * Update batch information field
   */
  const updateBatchInfo = (
    field: keyof typeof formState.batchInfo,
    value: string
  ) => {
    setFormState(prev => ({
      ...prev,
      batchInfo: {
        ...prev.batchInfo,
        [field]: value,
      },
    }));
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate entire batch before submission
    const validationResult = FormValidationUtils.validateProductBatch({
      products: formState.products,
      batchInfo: formState.batchInfo,
    });

    if (!validationResult.isValid) {
      setFormState(prev => ({
        ...prev,
        batchValidation: {
          isValid: false,
          errors: validationResult.errors,
        },
        productValidations: prev.productValidations.map(
          (validation, index) => ({
            ...validation,
            errors: validationResult.productErrors[index] || {},
          })
        ),
      }));
      return;
    }

    try {
      setFormState(prev => ({
        ...prev,
        submission: {
          ...prev.submission,
          isSubmitting: true,
          error: null,
          progress: 0,
        },
      }));

      await onSubmit({
        products: formState.products,
        batchInfo: formState.batchInfo,
      });

      // Clear form on successful submission
      setFormState(prev => ({
        ...prev,
        products: [createEmptyProduct()],
        productValidations: [createEmptyValidation()],
        batchInfo: {
          ...prev.batchInfo,
          processingNotes: '',
        },
        submission: {
          isSubmitting: false,
          error: null,
          progress: 100,
        },
      }));

      // Clear backup
      localStorage.removeItem('chaintrace_form_backup');
    } catch (error) {
      setFormState(prev => ({
        ...prev,
        submission: {
          isSubmitting: false,
          error: error instanceof Error ? error.message : 'Submission failed',
          progress: 0,
        },
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      {/* Batch Information Section */}
      <Card className='p-6'>
        <h2 className='mb-4 text-lg font-semibold text-gray-900'>
          Batch Information
        </h2>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <Input
            label='Cooperative ID'
            value={formState.batchInfo.cooperativeId}
            onChange={e => updateBatchInfo('cooperativeId', e.target.value)}
            required
            placeholder='Enter cooperative ID'
          />
          <Input
            label='Created By (Wallet Address)'
            value={formState.batchInfo.createdBy}
            onChange={e => updateBatchInfo('createdBy', e.target.value)}
            required
            placeholder='0.0.12345'
          />
        </div>
        <div className='mt-4'>
          <Input
            label='Processing Notes'
            value={formState.batchInfo.processingNotes}
            onChange={e => updateBatchInfo('processingNotes', e.target.value)}
            placeholder='Optional notes about batch processing'
            description='Add any relevant information about this batch'
          />
        </div>
      </Card>

      {/* Products Section */}
      <Card className='p-6'>
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-lg font-semibold text-gray-900'>
            Products ({formState.products.length})
          </h2>
          <Button
            type='button'
            variant='outline'
            onClick={addProduct}
            disabled={formState.products.length >= maxBatchSize}
          >
            Add Product
          </Button>
        </div>

        <div className='space-y-6'>
          {formState.products.map((product, index) => (
            <ProductRow
              key={index}
              product={product}
              index={index}
              validation={formState.productValidations[index]}
              onUpdate={updateProduct}
              onRemove={() => removeProduct(index)}
              canRemove={formState.products.length > 1}
            />
          ))}
        </div>
      </Card>

      {/* Batch Validation Errors */}
      {formState.batchValidation.errors.length > 0 && (
        <Card className='border-red-200 bg-red-50 p-4'>
          <h3 className='mb-2 font-medium text-red-800'>
            Batch Validation Errors
          </h3>
          <ul className='list-inside list-disc space-y-1 text-sm text-red-700'>
            {formState.batchValidation.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Card>
      )}

      {/* Submission Error */}
      {formState.submission.error && (
        <Card className='border-red-200 bg-red-50 p-4'>
          <p className='text-sm text-red-700'>{formState.submission.error}</p>
        </Card>
      )}

      {/* Submit Button */}
      <div className='flex justify-end'>
        <Button
          type='submit'
          loading={loading || formState.submission.isSubmitting}
          disabled={!formState.batchValidation.isValid}
          size='lg'
        >
          Create Batch ({formState.products.length} products)
        </Button>
      </div>

      {/* Backup Status */}
      {formState.lastBackup && (
        <p className='text-center text-xs text-gray-500'>
          Last backup: {formState.lastBackup.toLocaleTimeString()}
        </p>
      )}
    </form>
  );
}

/**
 * Individual product row component
 */
interface ProductRowProps {
  product: CreateProductRequest;
  index: number;
  validation: ProductFormValidation;
  onUpdate: (index: number, field: string, value: any) => void;
  onRemove: () => void;
  canRemove: boolean;
}

function ProductRow({
  product,
  index,
  validation,
  onUpdate,
  onRemove,
  canRemove,
}: ProductRowProps) {
  return (
    <Card className='border-l-4 border-l-primary-500 bg-gray-50 p-4'>
      <div className='mb-4 flex items-center justify-between'>
        <h3 className='font-medium text-gray-900'>Product {index + 1}</h3>
        {canRemove && (
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={onRemove}
            className='text-red-600 hover:text-red-700'
          >
            Remove
          </Button>
        )}
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {/* Basic Product Information */}
        <Input
          label='Product Name'
          value={product.name}
          onChange={e => onUpdate(index, 'name', e.target.value)}
          error={validation.errors.name}
          required
          placeholder='Enter product name'
        />

        <Select
          label='Category'
          value={product.category}
          onChange={value => onUpdate(index, 'category', value)}
          options={PRODUCT_CATEGORIES}
          error={validation.errors.category}
          required
        />

        <div className='grid grid-cols-2 gap-2'>
          <Input
            label='Quantity'
            type='number'
            value={product.quantity.amount || ''}
            onChange={e =>
              onUpdate(
                index,
                'quantity.amount',
                parseFloat(e.target.value) || 0
              )
            }
            error={validation.errors['quantity.amount']}
            required
            min='0'
            step='0.01'
          />
          <Select
            label='Unit'
            value={product.quantity.unit}
            onChange={value => onUpdate(index, 'quantity.unit', value)}
            options={QUANTITY_UNITS}
            error={validation.errors['quantity.unit']}
            required
          />
        </div>

        {/* Origin Information */}
        <Input
          label='Address'
          value={product.origin.address}
          onChange={e => onUpdate(index, 'origin.address', e.target.value)}
          error={validation.errors['origin.address']}
          required
          placeholder='Street address'
        />

        <Input
          label='City'
          value={product.origin.city}
          onChange={e => onUpdate(index, 'origin.city', e.target.value)}
          error={validation.errors['origin.city']}
          required
          placeholder='City name'
        />

        <Select
          label='State'
          value={product.origin.state}
          onChange={value => onUpdate(index, 'origin.state', value)}
          options={NIGERIAN_STATES}
          error={validation.errors['origin.state']}
          required
        />

        <Select
          label='Region'
          value={product.origin.region}
          onChange={value => onUpdate(index, 'origin.region', value)}
          options={REGIONS}
          error={validation.errors['origin.region']}
          required
        />

        <div className='grid grid-cols-2 gap-2'>
          <Input
            label='Latitude'
            type='number'
            value={product.origin.coordinates.latitude || ''}
            onChange={e =>
              onUpdate(
                index,
                'origin.coordinates.latitude',
                parseFloat(e.target.value) || 0
              )
            }
            error={validation.errors['origin.coordinates.latitude']}
            placeholder='6.5244'
            step='0.000001'
            min='-90'
            max='90'
          />
          <Input
            label='Longitude'
            type='number'
            value={product.origin.coordinates.longitude || ''}
            onChange={e =>
              onUpdate(
                index,
                'origin.coordinates.longitude',
                parseFloat(e.target.value) || 0
              )
            }
            error={validation.errors['origin.coordinates.longitude']}
            placeholder='3.3792'
            step='0.000001'
            min='-180'
            max='180'
          />
        </div>
      </div>

      {/* Compliance Status */}
      {validation.complianceStatus !== 'pending' && (
        <div className='mt-4'>
          <div
            className={cn('rounded-md border p-3 text-sm', {
              'border-green-200 bg-green-50 text-green-800':
                validation.complianceStatus === 'valid',
              'border-red-200 bg-red-50 text-red-800':
                validation.complianceStatus === 'invalid',
              'border-yellow-200 bg-yellow-50 text-yellow-800':
                validation.complianceStatus === 'validating',
              'border-gray-200 bg-gray-50 text-gray-800':
                validation.complianceStatus === 'error',
            })}
          >
            <p className='font-medium'>
              Compliance Status: {validation.complianceStatus}
            </p>
            {validation.complianceMessages.length > 0 && (
              <ul className='mt-1 list-inside list-disc space-y-1'>
                {validation.complianceMessages.map((message, i) => (
                  <li key={i}>{message}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
