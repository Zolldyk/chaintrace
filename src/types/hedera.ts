/**
 * Hedera blockchain-specific types for ChainTrace application
 *
 * @since 1.4.0
 */

/**
 * Standard HCS message structure for ChainTrace events
 *
 * @interface HCSMessage
 * @since 1.4.0
 *
 * @example
 * ```typescript
 * const hcsMessage: HCSMessage = {
 *   version: '1.0',
 *   messageType: 'product_event',
 *   productId: 'CT-2024-001-ABC123',
 *   event: productEventData,
 *   signature: 'signed_message_hash',
 *   timestamp: '2024-09-05T10:30:00Z',
 *   metadata: {
 *     networkType: 'testnet',
 *     topicId: '0.0.12345',
 *     sequenceNumber: 42
 *   }
 * };
 * ```
 */
export interface HCSMessage {
  /** Message format version */
  version: '1.0';

  /** Type of message being sent */
  messageType: 'product_event' | 'compliance_check' | 'reward_distribution';

  /** Associated product identifier */
  productId: string;

  /** Product event data */
  event: import('./product').ProductEvent;

  /** Wallet-signed message hash */
  signature: string;

  /** ISO 8601 timestamp */
  timestamp: string;

  /** Hedera-specific metadata */
  metadata: {
    /** Network environment */
    networkType: 'testnet' | 'mainnet';

    /** HCS topic ID */
    topicId: string;

    /** Message sequence number */
    sequenceNumber: number;
  };
}

/**
 * Service health status information
 *
 * @interface ServiceHealth
 * @since 1.4.0
 */
export interface ServiceHealth {
  /** Service name */
  service: string;

  /** Current status */
  status: 'healthy' | 'degraded' | 'unhealthy';

  /** Last health check timestamp */
  lastChecked: Date;

  /** Response time in milliseconds */
  responseTime: number;

  /** Additional health details */
  details?: {
    /** Error message if unhealthy */
    error?: string;

    /** Service-specific metrics */
    metrics?: Record<string, any>;
  };
}

/**
 * API error information with ChainTrace error codes
 *
 * @interface ApiError
 * @since 1.4.0
 */
export interface ApiError extends Error {
  /** ChainTrace-specific error code */
  code: ApiErrorCode;

  /** HTTP status code */
  statusCode?: number;

  /** Additional error details */
  details?: Record<string, any>;

  /** Whether the operation can be retried */
  retryable: boolean;

  /** Error timestamp */
  timestamp: Date;
}

/**
 * Standardized API error codes for consistent client-side handling
 */
export enum ApiErrorCode {
  // Validation errors
  INVALID_PRODUCT_ID = 'INVALID_PRODUCT_ID',
  INVALID_WALLET_ADDRESS = 'INVALID_WALLET_ADDRESS',
  VALIDATION_FAILED = 'VALIDATION_FAILED',

  // Service errors
  MIRROR_NODE_TIMEOUT = 'MIRROR_NODE_TIMEOUT',
  MIRROR_NODE_UNAVAILABLE = 'MIRROR_NODE_UNAVAILABLE',
  HCS_SERVICE_ERROR = 'HCS_SERVICE_ERROR',
  HTS_SERVICE_ERROR = 'HTS_SERVICE_ERROR',
  COMPLIANCE_ENGINE_ERROR = 'COMPLIANCE_ENGINE_ERROR',

  // Data errors
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  DUPLICATE_PRODUCT_ID = 'DUPLICATE_PRODUCT_ID',
  INVALID_EVENT_DATA = 'INVALID_EVENT_DATA',

  // Network errors
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  CONNECTION_FAILED = 'CONNECTION_FAILED',

  // Authentication errors
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  SIGNATURE_VERIFICATION_FAILED = 'SIGNATURE_VERIFICATION_FAILED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',

  // Generic errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Hedera network configuration
 *
 * @interface HederaServiceConfig
 * @since 1.4.0
 */
export interface HederaServiceConfig {
  /** Network type */
  networkType: 'testnet' | 'mainnet';

  /** Operator account ID */
  operatorAccountId?: string;

  /** Operator private key (for backend services) */
  operatorPrivateKey?: string;

  /** Mirror Node endpoint URL */
  mirrorNodeUrl?: string;

  /** HCS topic ID for product events */
  hcsTopicId?: string;

  /** HTS token ID for rewards */
  htsTokenId?: string;

  /** Custom Compliance Engine configuration */
  complianceEngine?: {
    endpoint: string;
    apiKey: string;
  };

  /** Timeout configuration */
  timeouts?: {
    mirrorNode: number;
    hcs: number;
    hts: number;
    compliance: number;
  };
}

/**
 * Wallet connection configuration
 *
 * @interface WalletConfig
 * @since 1.4.0
 *
 * @example
 * ```typescript
 * const config: WalletConfig = {
 *   walletType: 'snap',
 *   networkType: 'testnet',
 *   autoReconnect: true,
 *   timeoutMs: 10000
 * };
 *
 * await walletService.connect(config);
 * ```
 */
export interface WalletConfig {
  /** Type of Hedera wallet to connect */
  walletType: 'snap' | 'hashpack';

  /** Hedera network environment */
  networkType: 'testnet' | 'mainnet';

  /** Optional specific account ID to connect to */
  accountId?: string;

  /** Whether to automatically reconnect on connection loss */
  autoReconnect?: boolean;

  /** Connection timeout in milliseconds */
  timeoutMs?: number;
}

/**
 * Wallet connection state
 *
 * @interface WalletState
 * @since 1.4.0
 */
export interface WalletState {
  /** Whether wallet is connected */
  isConnected: boolean;

  /** Connected account ID */
  accountId: string | null;

  /** Wallet type */
  walletType: 'snap' | 'hashpack' | null;

  /** Network type */
  networkType: 'testnet' | 'mainnet' | null;

  /** Connection status */
  status: 'disconnected' | 'connecting' | 'connected' | 'error';

  /** Last error if any */
  error: string | null;

  /** Connection timestamp */
  connectedAt: Date | null;
}
