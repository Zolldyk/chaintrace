/**
 * Product verification types for ChainTrace application
 *
 * @since 1.0.0
 */

/**
 * Product verification status enumeration
 */
export type VerificationStatus =
  | 'verified'
  | 'unverified'
  | 'pending'
  | 'rejected'
  | 'expired';

/**
 * Product event actor information
 */
export interface Actor {
  /** Wallet address of the actor */
  walletAddress: string;

  /** Role of the actor in the supply chain */
  role: string;

  /** Optional actor name or identifier */
  name?: string;
}

/**
 * Location information for product events
 */
export interface Location {
  /** Geographic coordinates */
  coordinates?: {
    latitude: number;
    longitude: number;
  };

  /** Human-readable address */
  address?: string;

  /** Country code */
  country?: string;

  /** Region or state */
  region?: string;
}

/**
 * Product event in the supply chain journey
 */
export interface ProductEvent {
  /** Event timestamp */
  timestamp: string;

  /** Type of event */
  eventType: string;

  /** Actor who performed the event */
  actor: Actor;

  /** Location where event occurred */
  location?: Location;

  /** Additional event data */
  data?: Record<string, any>;

  /** Transaction ID on Hedera */
  transactionId?: string;
}

/**
 * Basic product information
 */
export interface Product {
  /** Unique product identifier */
  productId: string;

  /** Product name or title */
  name?: string;

  /** Product description */
  description?: string;

  /** Product category */
  category?: string;

  /** Product origin location */
  origin?: Location;

  /** Creation timestamp */
  createdAt: string;

  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Product with full verification data and events
 */
export interface ProductWithEvents extends Product {
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
