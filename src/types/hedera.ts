/**
 * Hedera blockchain-specific types for ChainTrace application
 *
 * @since 1.4.0
 */

/**
 * Supply chain role types for compliance validation
 *
 * @since 2.1.0
 */
export type SupplyChainRole = 'Producer' | 'Processor' | 'Verifier';

/**
 * Compliance rule interface for supply chain workflow validation
 *
 * @interface ComplianceRule
 * @since 2.1.0
 *
 * @example
 * ```typescript
 * const producerRule: ComplianceRule = {
 *   id: 'producer_initial_creation',
 *   type: 'supply_chain',
 *   roleType: 'Producer',
 *   conditions: {
 *     requiredFields: ['productType', 'quantity', 'origin', 'processingDetails'],
 *     allowedActions: ['product_creation', 'initial_logging']
 *   },
 *   actions: ['validate_metadata', 'log_to_hcs', 'update_sequence_state'],
 *   sequencePosition: 1,
 *   description: 'Validates initial product creation by Producer role'
 * };
 * ```
 */
export interface ComplianceRule {
  /** Unique rule identifier */
  id: string;

  /** Rule category type */
  type: 'supply_chain' | 'carbon_credit' | 'regulatory';

  /** Supply chain role this rule applies to */
  roleType: SupplyChainRole;

  /** Rule conditions and constraints */
  conditions: Record<string, any>;

  /** Actions to execute when rule passes */
  actions: string[];

  /** Position in the workflow sequence */
  sequencePosition: number;

  /** Human-readable rule description */
  description: string;

  /** Optional dependencies on other rules */
  dependencies?: string[];
}

/**
 * Validation result interface for compliance checks
 *
 * @interface ValidationResult
 * @since 2.1.0
 *
 * @example
 * ```typescript
 * const result: ValidationResult = {
 *   isValid: false,
 *   violations: ['SEQUENCE_VIOLATION: Processor action attempted before Producer initialization for product CT-001'],
 *   complianceId: 'COMP-2024-001-ABC123',
 *   reason: 'Workflow sequence violation detected'
 * };
 * ```
 */
export interface ValidationResult {
  /** Whether the validation passed */
  isValid: boolean;

  /** List of violation messages */
  violations: string[];

  /** Unique compliance validation ID */
  complianceId: string;

  /** Reason for validation result */
  reason: string | null;

  /** Validation timestamp */
  validatedAt?: Date;

  /** Additional validation metadata */
  metadata?: {
    /** Current sequence step */
    sequenceStep?: number;

    /** Previous workflow state */
    previousState?: string;

    /** Next required action */
    nextAction?: string;
  };
}

/**
 * Authentication context for compliance operations
 *
 * @interface AuthContext
 * @since 2.1.0
 */
export interface AuthContext {
  /** Wallet address of the authenticated user */
  walletAddress: string;

  /** User's role in the supply chain */
  userRole: SupplyChainRole;

  /** Whether the user is authenticated */
  isAuthenticated: boolean;

  /** Optional permissions list */
  permissions?: string[];

  /** Authentication timestamp */
  authenticatedAt?: Date;
}

/**
 * Product workflow state for sequence tracking
 *
 * @interface ProductWorkflowState
 * @since 2.1.0
 */
export interface ProductWorkflowState {
  /** Product identifier */
  productId: string;

  /** Current workflow step */
  currentStep: number;

  /** Completed workflow stages */
  completedStages: SupplyChainRole[];

  /** Last action timestamp */
  lastActionAt: Date;

  /** Last actor wallet address */
  lastActor: string;

  /** Workflow status */
  status: 'initialized' | 'in_progress' | 'completed' | 'blocked';

  /** Optional workflow metadata */
  metadata?: {
    /** Producer completion timestamp */
    producerCompletedAt?: Date;

    /** Processor completion timestamp */
    processorCompletedAt?: Date;

    /** Verifier completion timestamp */
    verifierCompletedAt?: Date;
  };
}

/**
 * Compliance credential metadata for automated issuance
 *
 * @interface ComplianceCredentialMetadata
 * @since 2.1.0
 */
export interface ComplianceCredentialMetadata {
  /** Credential issuer information */
  issuer: {
    /** Issuer wallet address */
    walletAddress: string;

    /** Issuer role */
    role: SupplyChainRole;
  };

  /** Issuance timestamp (ISO 8601 with timezone) */
  timestamp: string;

  /** Compliance validation details */
  validationDetails: {
    /** Applied rule IDs */
    ruleIds: string[];

    /** Validation results */
    validationResults: ValidationResult[];

    /** Sequence confirmation */
    sequenceConfirmed: boolean;
  };

  /** Product workflow completion status */
  workflowStatus: {
    /** Producer stage completed */
    producerCompleted: boolean;

    /** Processor stage completed */
    processorCompleted: boolean;

    /** Verifier stage approved */
    verifierApproved: boolean;
  };

  /** Credential expiration date */
  expirationDate: string;

  /** Renewal requirements */
  renewalRequirements?: string[];
}

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
 * Compliance event structure for HCS logging
 *
 * @interface ComplianceEvent
 * @since 2.1.0
 *
 * @example
 * ```typescript
 * const complianceEvent: ComplianceEvent = {
 *   action: 'product_verification',
 *   productId: 'CT-2024-001-ABC123',
 *   result: 'APPROVED',
 *   timestamp: '2024-09-05T10:30:00Z',
 *   walletAddress: '0.0.67890',
 *   complianceId: 'COMP-2024-001',
 *   roleType: 'Verifier',
 *   sequenceStep: 3
 * };
 * ```
 */
export interface ComplianceEvent {
  /** Action being validated */
  action: string;

  /** Product identifier */
  productId: string;

  /** Validation result */
  result: 'APPROVED' | 'REJECTED';

  /** Event timestamp (ISO 8601) */
  timestamp: string;

  /** Acting wallet address */
  walletAddress: string;

  /** Compliance validation ID */
  complianceId: string;

  /** Actor's role type */
  roleType: SupplyChainRole;

  /** Sequence step number */
  sequenceStep: number;

  /** Optional violation details */
  violations?: string[];

  /** Optional additional metadata */
  metadata?: Record<string, any>;
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
  SEQUENCE_VIOLATION = 'SEQUENCE_VIOLATION',
  RULES_NOT_FOUND = 'RULES_NOT_FOUND',
  CREDENTIAL_ISSUANCE_FAILED = 'CREDENTIAL_ISSUANCE_FAILED',
  WORKFLOW_STATE_ERROR = 'WORKFLOW_STATE_ERROR',

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
    /** Maximum cache TTL for compliance rules in seconds */
    ruleCacheTtl?: number;
    /** Maximum cache TTL for workflow state in seconds */
    stateCacheTtl?: number;
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
