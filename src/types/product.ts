/**
 * Product verification types for ChainTrace application
 *
 * @since 1.0.0
 */

/**
 * Product verification status enumeration
 * Comprehensive status tracking for supply chain verification workflow
 */
export type VerificationStatus =
  | 'created'
  | 'processing'
  | 'verified'
  | 'rejected'
  | 'expired'
  | 'pending'
  | 'unverified';

/**
 * Product categories for classification
 */
export type ProductCategory =
  | 'agricultural'
  | 'processed_food'
  | 'manufactured'
  | 'other';

/**
 * Quantity units for product measurements
 */
export type QuantityUnit = 'kg' | 'tons' | 'pieces' | 'liters' | 'boxes';

/**
 * Event types for product journey tracking
 */
export type EventType =
  | 'created'
  | 'processed'
  | 'quality_check'
  | 'transported'
  | 'verified'
  | 'rejected';

/**
 * Supply chain participant performing actions on products
 *
 * @interface Actor
 * @since 1.4.0
 */
export interface Actor {
  /** Hedera wallet address of the actor */
  walletAddress: string;

  /** Role of the actor in the supply chain */
  role: 'producer' | 'processor' | 'distributor' | 'verifier' | 'regulator';

  /** Actor name or organization identifier */
  name: string;

  /** Contact information */
  contactInfo?: {
    email?: string;
    phone?: string;
  };
}

/**
 * Location interface with Nigeria-focused geographic data
 *
 * @interface Location
 * @since 1.4.0
 */
export interface Location {
  /** Street address */
  address: string;

  /** City name */
  city: string;

  /** Nigerian state */
  state: string;

  /** Country - enforced to Nigeria for MVP */
  country: 'Nigeria';

  /** Geographic coordinates */
  coordinates: {
    latitude: number;
    longitude: number;
  };

  /** Geographic region */
  region: string;
}

/**
 * Cooperative organization managing producer groups
 *
 * @interface Cooperative
 * @since 1.4.0
 */
export interface Cooperative {
  /** Unique cooperative identifier */
  id: string;

  /** Cooperative organization name */
  name: string;

  /** Registration details */
  registration: {
    number: string;
    authority: string;
    date: Date;
  };

  /** Primary contact information */
  contactInfo: {
    email: string;
    phone: string;
    address: Location;
  };

  /** Associated producers */
  producerIds: string[];

  /** Cooperative status */
  status: 'active' | 'inactive' | 'suspended';
}

/**
 * Token reward tracking for HTS reward distribution
 *
 * @interface TokenReward
 * @since 1.4.0
 */
export interface TokenReward {
  /** Unique reward identifier */
  id: string;

  /** Associated product ID */
  productId: string;

  /** Recipient wallet address */
  recipientAddress: string;

  /** Token amount (in smallest unit) */
  amount: string;

  /** HTS token ID */
  tokenId: string;

  /** Reward reason/type */
  rewardType: 'verification' | 'quality' | 'sustainability' | 'compliance';

  /** Distribution timestamp */
  distributedAt: Date;

  /** Hedera transaction ID */
  transactionId: string;

  /** Distribution status */
  status: 'pending' | 'distributed' | 'failed';
}

/**
 * Product event in the supply chain journey with complete audit trail
 *
 * @interface ProductEvent
 * @since 1.4.0
 */
export interface ProductEvent {
  /** Unique event identifier */
  id: string;

  /** Reference to associated product */
  productId: string;

  /** Type of event in the supply chain */
  eventType: EventType;

  /** Entity performing the action */
  actor: Actor;

  /** Precise event occurrence time */
  timestamp: Date;

  /** Geographic coordinates and address */
  location: Location;

  /** Event-specific data */
  data: Record<string, any>;

  /** HCS message ID for blockchain verification */
  hcsMessageId: string;

  /** Hedera transaction ID for blockchain reference */
  transactionId?: string;

  /** Cryptographic signature for integrity */
  signature: string;
}

/**
 * Comprehensive product interface with all required fields from architecture
 *
 * @interface Product
 * @since 1.4.0
 *
 * @example
 * ```typescript
 * const product: Product = {
 *   id: 'CT-2024-001-ABC123',
 *   batchId: 'BATCH-001',
 *   name: 'Organic Tomatoes',
 *   category: 'agricultural',
 *   status: 'created',
 *   origin: {
 *     address: '123 Farm Road',
 *     city: 'Lagos',
 *     state: 'Lagos',
 *     country: 'Nigeria',
 *     coordinates: { latitude: 6.5244, longitude: 3.3792 },
 *     region: 'Southwest'
 *   },
 *   quantity: { amount: 100, unit: 'kg' },
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 *   qrCode: 'qr_data_string',
 *   guardianCredentialId: null,
 *   hcsTopicId: '0.0.12345'
 * };
 * ```
 */
export interface Product {
  /** Unique product identifier (format: CT-YYYY-XXX-ABCDEF) */
  id: string;

  /** Groups products created together by cooperative */
  batchId: string;

  /** Human-readable product name */
  name: string;

  /** Product classification */
  category: ProductCategory;

  /** Current verification state */
  status: VerificationStatus;

  /** Geographic origin with cooperative details */
  origin: Location;

  /** Amount/weight with units */
  quantity: {
    amount: number;
    unit: QuantityUnit;
  };

  /** Initial product logging timestamp */
  createdAt: Date;

  /** Last modification timestamp */
  updatedAt: Date;

  /** Generated QR code data for scanning */
  qrCode: string;

  /** Custom Compliance Engine credential ID */
  guardianCredentialId: string | null;

  /** HCS topic containing event log */
  hcsTopicId: string;

  /** Additional product-specific data */
  metadata?: Record<string, any>;
}

/**
 * Product with full verification data and events
 */
export interface ProductWithEvents extends Product {
  /** Product identifier (inherited from Product but explicit for component usage) */
  productId?: string;

  /** Product name (inherited from Product but explicit for component usage) */
  name: string;

  /** Product description for detailed views */
  description?: string;

  /** Current verification status */
  status: VerificationStatus;

  /** Whether product is verified */
  verified: boolean;

  /** Complete journey of product events */
  events: ProductEvent[];

  /** Last verification timestamp */
  lastVerified?: string;

  /** Verification expiry date */
  expiresAt?: string;
}

/**
 * Product verification request
 */
export interface ProductVerificationRequest {
  /** Product ID to verify */
  productId: string;

  /** Whether to skip cache */
  skipCache?: boolean;

  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Product verification response
 */
export interface ProductVerificationResponse {
  /** Product data with events */
  product: ProductWithEvents;

  /** Response metadata */
  metadata: {
    /** Request timestamp */
    requestedAt: string;

    /** Response time in milliseconds */
    responseTime: number;

    /** Whether data came from cache */
    fromCache: boolean;

    /** Cache expiry timestamp */
    cacheExpiresAt?: string;
  };
}

/**
 * Product lookup error types
 */
export type ProductLookupError =
  | 'PRODUCT_NOT_FOUND'
  | 'INVALID_PRODUCT_ID'
  | 'MIRROR_NODE_TIMEOUT'
  | 'MIRROR_NODE_ERROR'
  | 'NETWORK_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'UNKNOWN_ERROR';

/**
 * Product verification error
 */
export interface ProductVerificationError {
  /** Error code */
  code: ProductLookupError;

  /** Human-readable error message */
  message: string;

  /** Additional error details */
  details?: Record<string, any>;

  /** Error timestamp */
  timestamp: string;

  /** Whether error is retryable */
  retryable: boolean;
}
