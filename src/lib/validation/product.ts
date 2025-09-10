/**
 * Zod validation schemas for product data models
 *
 * @since 1.4.0
 */

import { z } from 'zod';

/**
 * Product ID format validation (CT-YYYY-XXX-ABCDEF)
 */
export const ProductIdSchema = z
  .string()
  .regex(
    /^CT-\d{4}-\d{3}-[A-F0-9]{6}$/,
    'Product ID must follow format: CT-YYYY-XXX-ABCDEF'
  );

/**
 * Hedera account ID validation (0.0.XXXXX)
 */
export const HederaAccountIdSchema = z
  .string()
  .regex(/^0\.0\.\d+$/, 'Hedera account ID must follow format: 0.0.XXXXX');

/**
 * Location validation schema
 */
export const LocationSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  country: z.literal('Nigeria'),
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  region: z.string().min(1, 'Region is required'),
});

/**
 * Actor validation schema
 */
export const ActorSchema = z.object({
  walletAddress: HederaAccountIdSchema,
  role: z.enum([
    'producer',
    'processor',
    'distributor',
    'verifier',
    'regulator',
  ]),
  name: z.string().min(1, 'Actor name is required'),
  contactInfo: z
    .object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
    })
    .optional(),
});

/**
 * Product event validation schema
 */
export const ProductEventSchema = z.object({
  id: z.string().uuid(),
  productId: ProductIdSchema,
  eventType: z.enum([
    'created',
    'processed',
    'quality_check',
    'transported',
    'verified',
    'rejected',
  ]),
  actor: ActorSchema,
  timestamp: z.date(),
  location: LocationSchema,
  data: z.record(z.any()),
  hcsMessageId: z.string().min(1),
  signature: z.string().min(1),
});

/**
 * Product validation schema
 */
export const ProductSchema = z.object({
  id: ProductIdSchema,
  batchId: z.string().min(1, 'Batch ID is required'),
  name: z.string().min(1, 'Product name is required'),
  category: z.enum(['agricultural', 'processed_food', 'manufactured', 'other']),
  status: z.enum(['created', 'processing', 'verified', 'rejected', 'expired']),
  origin: LocationSchema,
  quantity: z.object({
    amount: z.number().positive('Quantity amount must be positive'),
    unit: z.enum(['kg', 'tons', 'pieces', 'liters', 'boxes']),
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
  qrCode: z.string().min(1, 'QR code is required'),
  guardianCredentialId: z.string().nullable(),
  hcsTopicId: z.string().regex(/^0\.0\.\d+$/, 'Invalid HCS topic ID format'),
  metadata: z.record(z.any()).optional(),
});

/**
 * Cooperative validation schema
 */
export const CooperativeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Cooperative name is required'),
  registration: z.object({
    number: z.string().min(1, 'Registration number is required'),
    authority: z.string().min(1, 'Registration authority is required'),
    date: z.date(),
  }),
  contactInfo: z.object({
    email: z.string().email(),
    phone: z.string().min(1),
    address: LocationSchema,
  }),
  producerIds: z.array(z.string().uuid()),
  status: z.enum(['active', 'inactive', 'suspended']),
});

/**
 * Token reward validation schema
 */
export const TokenRewardSchema = z.object({
  id: z.string().uuid(),
  productId: ProductIdSchema,
  recipientAddress: HederaAccountIdSchema,
  amount: z.string().regex(/^\d+$/, 'Amount must be a valid number string'),
  tokenId: z.string().regex(/^0\.0\.\d+$/, 'Invalid HTS token ID format'),
  rewardType: z.enum([
    'verification',
    'quality',
    'sustainability',
    'compliance',
  ]),
  distributedAt: z.date(),
  transactionId: z.string().min(1, 'Transaction ID is required'),
  status: z.enum(['pending', 'distributed', 'failed']),
});

/**
 * HCS Message validation schema
 */
export const HCSMessageSchema = z.object({
  version: z.literal('1.0'),
  messageType: z.enum([
    'product_event',
    'compliance_check',
    'reward_distribution',
  ]),
  productId: ProductIdSchema,
  event: ProductEventSchema,
  signature: z.string().min(1, 'Signature is required'),
  timestamp: z.string().datetime(),
  metadata: z.object({
    networkType: z.enum(['testnet', 'mainnet']),
    topicId: z.string().regex(/^0\.0\.\d+$/, 'Invalid topic ID format'),
    sequenceNumber: z.number().int().positive(),
  }),
});

// ============================================================================
// Batch Creation Validation Schemas
// Added for Story 2.2: Cooperative Manager Product Logging Interface
// ============================================================================

/**
 * Processing details validation schema for Custom Compliance Engine
 */
export const ProcessingDetailsSchema = z
  .object({
    harvestDate: z.string().or(z.date()).optional(),
    processingMethod: z.string().min(1).optional(),
    qualityGrade: z.enum(['A', 'B', 'C', 'Premium']).optional(),
    organicCertified: z.boolean().optional(),
    certificationBody: z.string().optional(),
    storageConditions: z.string().optional(),
    packagingDate: z.string().or(z.date()).optional(),
    expiryDate: z.string().or(z.date()).optional(),
    batchNotes: z.string().max(500).optional(),
  })
  .strict();

/**
 * Create product request validation schema
 */
export const CreateProductRequestSchema = z.object({
  name: z
    .string()
    .min(1, 'Product name is required')
    .max(100, 'Product name must be less than 100 characters')
    .regex(
      /^[a-zA-Z0-9\s\-_.,()]+$/,
      'Product name contains invalid characters'
    ),
  category: z.enum(['agricultural', 'processed_food', 'manufactured', 'other']),
  quantity: z.object({
    amount: z
      .number()
      .positive('Quantity amount must be positive')
      .max(10000, 'Quantity cannot exceed 10,000 units'),
    unit: z.enum(['kg', 'tons', 'pieces', 'liters', 'boxes']),
  }),
  origin: LocationSchema,
  processingDetails: ProcessingDetailsSchema,
});

/**
 * Batch information validation schema
 */
export const BatchInfoSchema = z.object({
  cooperativeId: z.string().uuid('Invalid cooperative ID format'),
  createdBy: HederaAccountIdSchema,
  processingNotes: z
    .string()
    .max(1000, 'Processing notes must be less than 1000 characters')
    .optional(),
});

/**
 * Create product batch validation schema
 */
export const CreateProductBatchSchema = z.object({
  products: z
    .array(CreateProductRequestSchema)
    .min(1, 'At least one product is required')
    .max(100, 'Batch cannot contain more than 100 products')
    .refine(
      products => {
        // Validate total batch weight doesn't exceed daily limits
        const totalWeight = products.reduce((sum, product) => {
          const weight =
            product.quantity.unit === 'kg'
              ? product.quantity.amount
              : product.quantity.unit === 'tons'
                ? product.quantity.amount * 1000
                : 0; // Other units don't count toward weight limit
          return sum + weight;
        }, 0);
        return totalWeight <= 1000; // 1000kg daily limit from compliance rules
      },
      {
        message:
          'Total batch weight cannot exceed 1000kg (daily production limit)',
      }
    ),
  batchInfo: BatchInfoSchema,
});

/**
 * Form field validation for real-time validation
 */
export const ProductFormFieldValidationSchema = z.object({
  field: z.string(),
  value: z.any(),
  productIndex: z.number().int().min(0),
});

/**
 * Compliance validation request schema
 */
export const ComplianceValidationRequestSchema = z.object({
  action: z.literal('producer_initial_creation'),
  data: CreateProductRequestSchema,
  productId: z.string().min(1, 'Product ID is required for validation'),
});

/**
 * Local storage backup validation schema
 */
export const FormBackupDataSchema = z.object({
  formState: z.object({
    products: z.array(CreateProductRequestSchema),
    batchInfo: BatchInfoSchema,
    productValidations: z.array(
      z.object({
        errors: z.record(z.string()),
        isValid: z.boolean(),
        complianceStatus: z.enum([
          'pending',
          'validating',
          'valid',
          'invalid',
          'error',
        ]),
        complianceMessages: z.array(z.string()),
      })
    ),
    batchValidation: z.object({
      isValid: z.boolean(),
      errors: z.array(z.string()),
    }),
    submission: z.object({
      isSubmitting: z.boolean(),
      error: z.string().nullable(),
      progress: z.number().min(0).max(100),
    }),
    lastBackup: z.date().nullable(),
  }),
  timestamp: z.date(),
  version: z.string(),
  sessionId: z.string().uuid(),
});

/**
 * Nigerian states validation for location dropdown
 */
export const NigerianStatesSchema = z.enum([
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara',
  'FCT', // Federal Capital Territory
]);

/**
 * Enhanced location schema with Nigerian states validation
 */
export const EnhancedLocationSchema = LocationSchema.extend({
  state: NigerianStatesSchema,
  region: z.enum([
    'North Central',
    'North East',
    'North West',
    'South East',
    'South South',
    'South West',
  ]),
});

/**
 * Form validation utilities
 */
export class FormValidationUtils {
  /**
   * Validate individual product form field
   */
  static validateProductField(
    field: string,
    value: any,
    productIndex: number
  ): { isValid: boolean; error?: string } {
    try {
      ProductFormFieldValidationSchema.parse({
        field,
        value,
        productIndex,
      });

      // Additional custom validations based on field
      switch (field) {
        case 'name':
          if (typeof value !== 'string' || value.trim().length === 0) {
            return { isValid: false, error: 'Product name is required' };
          }
          if (value.length > 100) {
            return {
              isValid: false,
              error: 'Product name must be less than 100 characters',
            };
          }
          break;

        case 'quantity.amount':
          if (typeof value !== 'number' || value <= 0) {
            return {
              isValid: false,
              error: 'Quantity must be a positive number',
            };
          }
          if (value > 10000) {
            return {
              isValid: false,
              error: 'Quantity cannot exceed 10,000 units',
            };
          }
          break;

        case 'origin.coordinates.latitude':
          if (typeof value !== 'number' || value < -90 || value > 90) {
            return {
              isValid: false,
              error: 'Latitude must be between -90 and 90',
            };
          }
          break;

        case 'origin.coordinates.longitude':
          if (typeof value !== 'number' || value < -180 || value > 180) {
            return {
              isValid: false,
              error: 'Longitude must be between -180 and 180',
            };
          }
          break;
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid field value',
      };
    }
  }

  /**
   * Validate entire product batch
   */
  static validateProductBatch(batch: any): {
    isValid: boolean;
    errors: string[];
    productErrors: Array<Record<string, string>>;
  } {
    try {
      CreateProductBatchSchema.parse(batch);
      return {
        isValid: true,
        errors: [],
        productErrors: [],
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: string[] = [];
        const productErrors: Array<Record<string, string>> = [];

        error.errors.forEach(err => {
          const path = err.path.join('.');
          if (path.startsWith('products.')) {
            // Product-specific error
            const match = path.match(/^products\.(\d+)\.(.+)$/);
            if (match) {
              const index = parseInt(match[1], 10);
              const field = match[2];
              if (!productErrors[index]) {
                productErrors[index] = {};
              }
              productErrors[index][field] = err.message;
            }
          } else {
            // Batch-level error
            errors.push(err.message);
          }
        });

        return {
          isValid: false,
          errors,
          productErrors,
        };
      }
      return {
        isValid: false,
        errors: ['Unknown validation error'],
        productErrors: [],
      };
    }
  }

  /**
   * Check if Nigerian state is valid
   */
  static isValidNigerianState(state: string): boolean {
    try {
      NigerianStatesSchema.parse(state);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get Nigerian states list
   */
  static getNigerianStates(): string[] {
    return NigerianStatesSchema.options;
  }

  /**
   * Get regions list
   */
  static getRegions(): string[] {
    return [
      'North Central',
      'North East',
      'North West',
      'South East',
      'South South',
      'South West',
    ];
  }
}
