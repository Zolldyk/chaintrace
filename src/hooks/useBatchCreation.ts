/**
 * Custom hook for managing batch creation workflow
 *
 * Provides comprehensive state management and business logic for cooperative
 * manager product batch creation, including form validation, compliance
 * integration, local backup, and performance optimization.
 *
 * Features:
 * - Centralized batch form state management
 * - Real-time form validation with Zod schemas
 * - Custom Compliance Engine integration
 * - Automatic local storage backup
 * - Performance monitoring and optimization
 * - Error handling and recovery
 *
 * @example
 * ```tsx
 * function BatchCreationPage() {
 *   const {
 *     formState,
 *     updateProduct,
 *     addProduct,
 *     removeProduct,
 *     submitBatch,
 *     isSubmitting,
 *     error,
 *   } = useBatchCreation({
 *     maxBatchSize: 100,
 *     cooperativeId: 'coop-123',
 *     createdBy: '0.0.12345',
 *   });
 *
 *   return (
 *     <ProductBatchForm
 *       formState={formState}
 *       onUpdateProduct={updateProduct}
 *       onSubmit={submitBatch}
 *       loading={isSubmitting}
 *     />
 *   );
 * }
 * ```
 *
 * @since 1.0.0
 */

import * as React from 'react';
import type {
  BatchFormState,
  CreateProductRequest,
  CreateProductBatch,
  ProductFormValidation,
  ComplianceValidationRequest,
  ComplianceValidationResponse,
  BatchCreationResponse,
  FormBackupData,
  BatchProcessingMetrics,
} from '@/types/batch';
import { FormValidationUtils } from '@/lib/validation/product';
import { debounce } from '@/lib/utils';

/**
 * Hook configuration options
 */
interface UseBatchCreationOptions {
  /** Maximum number of products per batch */
  maxBatchSize?: number;

  /** Default cooperative ID */
  cooperativeId?: string;

  /** Default creator wallet address */
  createdBy?: string;

  /** Enable automatic backup to localStorage */
  enableBackup?: boolean;

  /** Backup interval in milliseconds */
  backupInterval?: number;

  /** Enable compliance validation */
  enableCompliance?: boolean;

  /** Compliance validation debounce delay */
  complianceDebounceMs?: number;

  /** Initial form data for recovery */
  initialData?: Partial<BatchFormState>;
}

/**
 * Hook return type
 */
interface UseBatchCreationReturn {
  /** Current form state */
  formState: BatchFormState;

  /** Update product field value */
  updateProduct: (index: number, field: string, value: any) => void;

  /** Update batch information field */
  updateBatchInfo: (field: string, value: string) => void;

  /** Add new product to batch */
  addProduct: () => void;

  /** Remove product from batch */
  removeProduct: (index: number) => void;

  /** Submit batch for creation */
  submitBatch: () => Promise<BatchCreationResponse>;

  /** Clear all form data */
  clearForm: () => void;

  /** Load form data from backup */
  loadFromBackup: () => boolean;

  /** Manually trigger backup */
  saveBackup: () => void;

  /** Validate entire batch */
  validateBatch: () => { isValid: boolean; errors: string[] };

  /** Re-run compliance validation for specific product */
  revalidateCompliance: (index: number) => Promise<void>;

  /** Bulk operations */
  bulkOperations: {
    selectAll: () => void;
    deselectAll: () => void;
    removeSelected: () => void;
    validateSelected: () => Promise<void>;
  };

  /** Current state flags */
  isSubmitting: boolean;
  hasChanges: boolean;
  isValid: boolean;
  error: string | null;

  /** Performance metrics */
  metrics?: BatchProcessingMetrics;

  /** Selected product indices for bulk operations */
  selectedProducts: number[];
  setSelectedProducts: (indices: number[]) => void;
}

/**
 * Create empty product template
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
    state: 'Lagos',
    country: 'Nigeria',
    coordinates: {
      latitude: 0,
      longitude: 0,
    },
    region: 'South West',
  },
  processingDetails: {},
});

/**
 * Create empty validation state
 */
const createEmptyValidation = (): ProductFormValidation => ({
  errors: {},
  isValid: false,
  complianceStatus: 'pending',
  complianceMessages: [],
});

/**
 * Main hook implementation
 */
export function useBatchCreation(
  options: UseBatchCreationOptions = {}
): UseBatchCreationReturn {
  const {
    maxBatchSize = 100,
    cooperativeId = '',
    createdBy = '',
    enableBackup = true,
    backupInterval = 30000,
    enableCompliance = true,
    complianceDebounceMs = 2000,
    initialData,
  } = options;

  // Selected products for bulk operations
  const [selectedProducts, setSelectedProducts] = React.useState<number[]>([]);

  // Performance metrics tracking
  const [metrics, setMetrics] = React.useState<BatchProcessingMetrics>();

  // Main form state
  const [formState, setFormState] = React.useState<BatchFormState>(() => ({
    products: initialData?.products || [createEmptyProduct()],
    batchInfo: {
      cooperativeId: initialData?.batchInfo?.cooperativeId || cooperativeId,
      createdBy: initialData?.batchInfo?.createdBy || createdBy,
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

  // Track if form has changes
  const [hasChanges, setHasChanges] = React.useState(false);

  // Load backup on mount if available and no initial data
  React.useEffect(() => {
    if (!initialData && enableBackup) {
      loadFromBackup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableBackup, initialData]);

  // Auto-backup timer
  React.useEffect(() => {
    if (!enableBackup) return;

    const interval = setInterval(() => {
      if (hasChanges) {
        saveBackup();
      }
    }, backupInterval);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableBackup, backupInterval, hasChanges]);

  /**
   * Debounced compliance validation function
   */
  const debouncedComplianceValidation = React.useMemo(
    () =>
      debounce(
        async (productIndex: number, productData: CreateProductRequest) => {
          if (!enableCompliance) return;

          setFormState(prev => {
            const updatedValidations = [...prev.productValidations];
            updatedValidations[productIndex] = {
              ...updatedValidations[productIndex],
              complianceStatus: 'validating',
              complianceMessages: ['Validating with Compliance Engine...'],
            };
            return { ...prev, productValidations: updatedValidations };
          });

          try {
            const validationRequest: ComplianceValidationRequest = {
              action: 'producer_initial_creation',
              data: productData,
              productId: `temp-${Date.now()}-${productIndex}`,
            };

            const response = await fetch('/api/compliance/validate-action', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(validationRequest),
            });

            const result: ComplianceValidationResponse = await response.json();

            setFormState(prev => {
              const updatedValidations = [...prev.productValidations];
              updatedValidations[productIndex] = {
                ...updatedValidations[productIndex],
                complianceStatus: result.approved ? 'valid' : 'invalid',
                complianceMessages: result.violations || [],
              };
              return { ...prev, productValidations: updatedValidations };
            });
          } catch (error) {
            setFormState(prev => {
              const updatedValidations = [...prev.productValidations];
              updatedValidations[productIndex] = {
                ...updatedValidations[productIndex],
                complianceStatus: 'error',
                complianceMessages: [
                  'Failed to validate with Compliance Engine',
                ],
              };
              return { ...prev, productValidations: updatedValidations };
            });
          }
        },
        complianceDebounceMs
      ),
    [enableCompliance, complianceDebounceMs]
  );

  /**
   * Update product field value
   */
  const updateProduct = React.useCallback(
    (index: number, field: string, value: any) => {
      setFormState(prev => {
        const updatedProducts = [...prev.products];
        const product = { ...updatedProducts[index] };

        // Handle nested field updates
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

        // Validate field
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

        // Update validity
        updatedValidations[index].isValid =
          Object.keys(updatedValidations[index].errors).length === 0;

        // Trigger compliance validation if product is valid
        if (updatedValidations[index].isValid && product.name) {
          debouncedComplianceValidation(index, product);
        }

        return {
          ...prev,
          products: updatedProducts,
          productValidations: updatedValidations,
        };
      });

      setHasChanges(true);
    },
    [debouncedComplianceValidation]
  );

  /**
   * Update batch information
   */
  const updateBatchInfo = React.useCallback((field: string, value: string) => {
    setFormState(prev => ({
      ...prev,
      batchInfo: {
        ...prev.batchInfo,
        [field]: value,
      },
    }));
    setHasChanges(true);
  }, []);

  /**
   * Add new product
   */
  const addProduct = React.useCallback(() => {
    if (formState.products.length >= maxBatchSize) {
      return;
    }

    setFormState(prev => ({
      ...prev,
      products: [...prev.products, createEmptyProduct()],
      productValidations: [...prev.productValidations, createEmptyValidation()],
    }));
    setHasChanges(true);
  }, [formState.products.length, maxBatchSize]);

  /**
   * Remove product
   */
  const removeProduct = React.useCallback(
    (index: number) => {
      if (formState.products.length <= 1) {
        return;
      }

      setFormState(prev => ({
        ...prev,
        products: prev.products.filter((_, i) => i !== index),
        productValidations: prev.productValidations.filter(
          (_, i) => i !== index
        ),
      }));

      // Update selected products
      setSelectedProducts(prev =>
        prev.filter(i => i !== index).map(i => (i > index ? i - 1 : i))
      );

      setHasChanges(true);
    },
    [formState.products.length]
  );

  /**
   * Validate entire batch
   */
  const validateBatch = React.useCallback(() => {
    const validationResult = FormValidationUtils.validateProductBatch({
      products: formState.products,
      batchInfo: formState.batchInfo,
    });

    setFormState(prev => ({
      ...prev,
      batchValidation: {
        isValid: validationResult.isValid,
        errors: validationResult.errors,
      },
    }));

    return {
      isValid: validationResult.isValid,
      errors: validationResult.errors,
    };
  }, [formState.products, formState.batchInfo]);

  /**
   * Submit batch for creation
   */
  const submitBatch =
    React.useCallback(async (): Promise<BatchCreationResponse> => {
      const startTime = new Date();

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

        // Final validation
        const validation = validateBatch();
        if (!validation.isValid) {
          throw new Error('Batch validation failed');
        }

        // Create batch payload
        const batchPayload: CreateProductBatch = {
          products: formState.products,
          batchInfo: formState.batchInfo,
        };

        // Submit to API
        const response = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batchPayload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Batch creation failed');
        }

        const result: BatchCreationResponse = await response.json();

        // Calculate metrics
        const endTime = new Date();
        const totalTime = endTime.getTime() - startTime.getTime();
        const newMetrics: BatchProcessingMetrics = {
          startTime,
          endTime,
          totalTime,
          productCount: formState.products.length,
          averageTimePerProduct: totalTime / formState.products.length,
          results: {
            successful: result.success ? result.products.length : 0,
            failed: result.success ? 0 : result.products.length,
            errors: result.success
              ? []
              : [result.error?.message || 'Unknown error'],
          },
        };
        setMetrics(newMetrics);

        if (result.success) {
          // Clear form on success
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

          // Clear backup and changes flag
          if (enableBackup) {
            localStorage.removeItem('chaintrace_form_backup');
          }
          setHasChanges(false);
          setSelectedProducts([]);
        }

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Submission failed';
        setFormState(prev => ({
          ...prev,
          submission: {
            isSubmitting: false,
            error: errorMessage,
            progress: 0,
          },
        }));

        throw error;
      }
    }, [formState, validateBatch, enableBackup]);

  /**
   * Clear form data
   */
  const clearForm = React.useCallback(() => {
    setFormState({
      products: [createEmptyProduct()],
      batchInfo: {
        cooperativeId,
        createdBy,
        processingNotes: '',
      },
      productValidations: [createEmptyValidation()],
      batchValidation: {
        isValid: false,
        errors: [],
      },
      submission: {
        isSubmitting: false,
        error: null,
        progress: 0,
      },
      lastBackup: null,
    });
    setSelectedProducts([]);
    setHasChanges(false);
  }, [cooperativeId, createdBy]);

  /**
   * Load from backup
   */
  const loadFromBackup = React.useCallback((): boolean => {
    if (!enableBackup) return false;

    try {
      const backupData = localStorage.getItem('chaintrace_form_backup');
      if (!backupData) return false;

      const backup: FormBackupData = JSON.parse(backupData);

      // Validate backup data structure
      if (!backup.formState || !backup.timestamp) {
        return false;
      }

      // Convert lastBackup string back to Date object if it exists
      const restoredFormState = {
        ...backup.formState,
        lastBackup: backup.formState.lastBackup
          ? new Date(backup.formState.lastBackup)
          : null,
      };

      setFormState(restoredFormState);
      setHasChanges(true);
      return true;
    } catch (error) {
      // Error handled silently
      return false;
    }
  }, [enableBackup]);

  /**
   * Save backup
   */
  const saveBackup = React.useCallback(() => {
    if (!enableBackup) return;

    try {
      const backupData: FormBackupData = {
        formState,
        timestamp: new Date(),
        version: '1.0.0',
        sessionId:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).substring(2)}`,
      };

      localStorage.setItem(
        'chaintrace_form_backup',
        JSON.stringify(backupData)
      );

      setFormState(prev => ({
        ...prev,
        lastBackup: new Date(),
      }));
    } catch (error) {
      // Error handled silently
    }
  }, [enableBackup, formState]);

  /**
   * Re-validate compliance for specific product
   */
  const revalidateCompliance = React.useCallback(
    async (index: number) => {
      const product = formState.products[index];
      if (product && product.name) {
        await debouncedComplianceValidation(index, product);
      }
    },
    [formState.products, debouncedComplianceValidation]
  );

  // Bulk operations
  const bulkOperations = React.useMemo(
    () => ({
      selectAll: () => {
        setSelectedProducts(formState.products.map((_, index) => index));
      },
      deselectAll: () => {
        setSelectedProducts([]);
      },
      removeSelected: () => {
        if (selectedProducts.length === 0) return;

        const remainingProducts = formState.products.filter(
          (_, index) => !selectedProducts.includes(index)
        );
        const remainingValidations = formState.productValidations.filter(
          (_, index) => !selectedProducts.includes(index)
        );

        // Ensure at least one product remains
        if (remainingProducts.length === 0) {
          remainingProducts.push(createEmptyProduct());
          remainingValidations.push(createEmptyValidation());
        }

        setFormState(prev => ({
          ...prev,
          products: remainingProducts,
          productValidations: remainingValidations,
        }));

        setSelectedProducts([]);
        setHasChanges(true);
      },
      validateSelected: async () => {
        if (selectedProducts.length === 0) return;

        for (const index of selectedProducts) {
          revalidateCompliance(index);
        }
      },
    }),
    [
      formState.products,
      formState.productValidations,
      selectedProducts,
      revalidateCompliance,
    ]
  );

  // Computed values
  const isSubmitting = formState.submission.isSubmitting;
  const isValid = formState.batchValidation.isValid;
  const error = formState.submission.error;

  return {
    formState,
    updateProduct,
    updateBatchInfo,
    addProduct,
    removeProduct,
    submitBatch,
    clearForm,
    loadFromBackup,
    saveBackup,
    validateBatch,
    revalidateCompliance,
    bulkOperations,
    isSubmitting,
    hasChanges,
    isValid,
    error,
    metrics,
    selectedProducts,
    setSelectedProducts,
  };
}
