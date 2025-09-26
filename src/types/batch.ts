/**
 * Batch creation types for cooperative manager product logging
 *
 * @since 1.0.0
 */

import type {
  ProductCategory,
  QuantityUnit,
  Location,
  VerificationStatus,
} from './product';

/**
 * Interface for creating a single product request
 */
export interface CreateProductRequest {
  /** Human-readable product name */
  name: string;

  /** Product description */
  description?: string;

  /** Product classification */
  category: ProductCategory;

  /** Product quantity information */
  quantity: {
    amount: number;
    unit: QuantityUnit;
  };

  /** Geographic origin with cooperative details */
  origin: Location;

  /** Quality grade */
  qualityGrade?: string;

  /** Production date */
  productionDate?: Date;

  /** Expiry date */
  expiryDate?: Date;

  /** Certifications */
  certifications?: string[];

  /** Additional product metadata */
  metadata?: Record<string, any>;

  /** Additional processing information */
  processingDetails?: Record<string, any>;
}

/**
 * Interface for batch-level information
 */
export interface BatchInfo {
  /** Cooperative identifier */
  cooperativeId: string;

  /** Creator wallet address */
  createdBy: string;

  /** Optional processing notes for the batch */
  processingNotes?: string;
}

/**
 * Interface for creating a product batch
 */
export interface CreateProductBatch {
  /** Array of products to create */
  products: CreateProductRequest[];

  /** Batch-level information */
  batchInfo: BatchInfo;
}

/**
 * Compliance rule validation result
 */
export interface ComplianceRuleResult {
  ruleId: string;
  status: 'passed' | 'failed';
  message: string;
}

/**
 * Compliance validation details
 */
export interface ComplianceDetails {
  rules: ComplianceRuleResult[];
  overallStatus: 'compliant' | 'non-compliant';
  lastChecked: string;
}

/**
 * Form validation state for individual product rows
 */
export interface ProductFormValidation {
  /** Product index in the batch */
  productIndex: number;

  /** Whether the entire product is valid */
  isValid: boolean;

  /** Field-specific validation errors */
  errors: string[];

  /** Compliance validation status */
  complianceStatus: 'pending' | 'validating' | 'valid' | 'invalid' | 'error';

  /** Detailed compliance validation results */
  complianceDetails: ComplianceDetails;
}

/**
 * Form state for the entire batch
 */
export interface BatchFormState {
  /** Array of product data */
  products: CreateProductRequest[];

  /** Batch information */
  batchInfo: BatchInfo;

  /** Validation state for each product */
  productValidations: ProductFormValidation[];

  /** Overall batch validation state */
  batchValidation: {
    isValid: boolean;
    errors: string[];
  };

  /** Form submission state */
  submission: {
    isSubmitting: boolean;
    error: string | null;
    progress: number;
  };

  /** Local storage backup timestamp */
  lastBackup: Date | null;
}

/**
 * Product creation response from API
 */
export interface ProductCreationResult {
  /** Generated product ID */
  id: string;

  /** Product name */
  name: string;

  /** Generated QR code data */
  qrCode: string;

  /** Initial verification status */
  status: VerificationStatus;

  /** Compliance validation result */
  complianceValidation: {
    approved: boolean;
    complianceId: string;
    violations?: string[];
  };
}

/**
 * Failed product information
 */
export interface FailedProduct {
  index: number;
  productName: string;
  errors: string[];
}

/**
 * Batch processing results
 */
export interface BatchResults {
  successful: number;
  failed: number;
  total: number;
}

/**
 * Batch processing metadata
 */
export interface BatchMetadata {
  processingTimeMs: number;
  validationTimeMs: number;
  hcsSubmissionTimeMs: number;
  totalWeightKg: number;
  totalVolumeL: number;
}

/**
 * Batch creation response from API
 */
export interface BatchCreationResponse {
  /** Whether batch creation was successful */
  success: boolean;

  /** Generated batch ID */
  batchId: string;

  /** Creation timestamp */
  createdAt: string;

  /** Batch processing results summary */
  results: BatchResults;

  /** Array of product IDs (successful and failed) */
  productIds: string[];

  /** Array of failed products with error details */
  failedProducts: FailedProduct[];

  /** HCS transaction ID */
  hcsTransactionId: string;

  /** Processing metadata */
  metadata: BatchMetadata;

  /** Error information if unsuccessful */
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

/**
 * Compliance validation request for real-time validation
 */
export interface ComplianceValidationRequest {
  /** Compliance action type */
  action: 'producer_initial_creation';

  /** Product data to validate */
  data: CreateProductRequest;

  /** Temporary product ID for validation */
  productId: string;
}

/**
 * Compliance validation response
 */
export interface ComplianceValidationResponse {
  /** Whether validation passed */
  approved: boolean;

  /** Compliance credential ID */
  complianceId: string;

  /** Array of violation messages */
  violations: string[];

  /** Additional validation details */
  details?: Record<string, any>;
}

/**
 * Local storage backup structure
 */
export interface FormBackupData {
  /** Backed up form state */
  formState: BatchFormState;

  /** Backup timestamp */
  timestamp: Date;

  /** Form version for compatibility */
  version: string;

  /** User session identifier */
  sessionId: string;
}

/**
 * Batch processing performance metrics
 */
export interface BatchProcessingMetrics {
  /** Start time of processing */
  startTime: Date;

  /** End time of processing */
  endTime: Date;

  /** Total processing time in milliseconds */
  totalTime: number;

  /** Number of products in batch */
  productCount: number;

  /** Average time per product */
  averageTimePerProduct: number;

  /** Success/failure statistics */
  results: {
    successful: number;
    failed: number;
    errors: string[];
  };
}

/**
 * Form error types for user-friendly error handling
 */
export type FormError = {
  /** Field that has the error */
  field: string;

  /** Error message */
  message: string;

  /** Suggested action for user */
  suggestedAction: 'fix_input' | 'retry' | 'contact_support';

  /** Type of validation error */
  violationType?: 'validation' | 'compliance' | 'network';
};

/**
 * Success notification structure
 */
export interface SuccessNotification {
  /** Type of success event */
  type: 'batch_created';

  /** Success message */
  message: string;

  /** Array of generated product IDs */
  productIds: string[];

  /** URL for QR code download */
  qrCodeDownloadUrl: string;

  /** Suggested next action */
  nextAction: 'view_dashboard' | 'create_another' | 'generate_qr';
}

/**
 * Props interface for ProductBatchForm component
 */
export interface ProductBatchFormProps {
  /** Callback when form is submitted */
  onSubmit: (batch: CreateProductBatch) => Promise<void>;

  /** Whether form is in loading state */
  loading?: boolean;

  /** Maximum number of products per batch */
  maxBatchSize?: number;

  /** Default cooperative ID */
  defaultCooperativeId?: string;

  /** Default creator wallet address */
  defaultCreatedBy?: string;

  /** Callback for form state changes */
  onFormStateChange?: (state: BatchFormState) => void;

  /** Callback for backup events */
  onBackup?: (data: FormBackupData) => void;

  /** Initial form data for recovery */
  initialData?: Partial<BatchFormState>;
}
