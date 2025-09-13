/**
 * Compliance credential types for ChainTrace application
 *
 * @since 1.0.0
 */

/**
 * Compliance credential status enumeration
 * Tracks the lifecycle status of issued compliance credentials
 */
export type CredentialStatus = 'issued' | 'active' | 'expired' | 'revoked';

/**
 * Types of compliance credentials that can be issued
 * Aligned with Custom Compliance Engine policy types
 */
export type CredentialType =
  | 'supply_chain'
  | 'carbon_credit'
  | 'regulatory_compliance';

/**
 * Verification levels for compliance credentials
 * Determines the depth and rigor of compliance validation
 */
export type VerificationLevel = 'basic' | 'enhanced' | 'premium';

/**
 * Compliance credential metadata containing validation details
 *
 * @interface CredentialMetadata
 * @since 1.0.0
 */
export interface CredentialMetadata {
  /** Specific validation details from Custom Compliance Engine */
  validationDetails: Record<string, any>;

  /** List of compliance rules that were validated */
  complianceRules: string[];

  /** Level of verification performed */
  verificationLevel: VerificationLevel;

  /** Policy ID from Custom Compliance Engine that triggered this credential */
  policyId?: string;

  /** Validation timestamp */
  validatedAt: Date;

  /** Validation score or confidence level (0-100) */
  validationScore?: number;
}

/**
 * Core compliance credential interface
 * Represents a verifiable credential issued upon successful compliance validation
 *
 * @interface ComplianceCredential
 * @since 1.0.0
 *
 * @example
 * ```typescript
 * const credential: ComplianceCredential = {
 *   id: 'CRED-2024-001-ABC123',
 *   productId: 'CT-2024-001-ABC123',
 *   issuer: 'ChainTrace Compliance Engine',
 *   issuedAt: new Date(),
 *   expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
 *   status: 'active',
 *   credentialType: 'supply_chain',
 *   metadata: {
 *     validationDetails: { },
 *     complianceRules: ['organic_certification', 'fair_trade'],
 *     verificationLevel: 'enhanced'
 *   },
 *   signature: 'signature_hash_string',
 *   hcsMessageId: '0.0.12345-1234567890'
 * };
 * ```
 */
export interface ComplianceCredential {
  /** Unique credential identifier */
  id: string;

  /** Associated product ID that this credential validates */
  productId: string;

  /** Issuing authority (typically ChainTrace or Custom Compliance Engine) */
  issuer: string;

  /** Timestamp when credential was issued */
  issuedAt: Date;

  /** Expiration date (null for non-expiring credentials) */
  expiresAt: Date | null;

  /** Current credential status */
  status: CredentialStatus;

  /** Type of compliance credential */
  credentialType: CredentialType;

  /** Detailed credential metadata */
  metadata: CredentialMetadata;

  /** Cryptographic signature for credential integrity */
  signature: string;

  /** HCS message ID for blockchain audit trail */
  hcsMessageId: string;

  /** Optional Hedera transaction ID if issued via transaction */
  transactionId?: string;
}

/**
 * Request interface for credential issuance
 *
 * @interface CredentialIssuanceRequest
 * @since 1.0.0
 */
export interface CredentialIssuanceRequest {
  /** Product ID to issue credential for */
  productId: string;

  /** Type of credential to issue */
  credentialType: CredentialType;

  /** Validation results from compliance engine */
  validationResults: Record<string, any>;

  /** Compliance rules that were validated */
  complianceRules: string[];

  /** Verification level achieved */
  verificationLevel: VerificationLevel;

  /** Policy ID from Custom Compliance Engine */
  policyId?: string;

  /** Expiration date for the credential */
  expiresAt?: Date;
}

/**
 * Response interface for credential issuance
 *
 * @interface CredentialIssuanceResponse
 * @since 1.0.0
 */
export interface CredentialIssuanceResponse {
  /** Issued credential */
  credential: ComplianceCredential;

  /** HCS logging result */
  hcsResult: {
    messageId: string;
    transactionId?: string;
    timestamp: Date;
  };

  /** QR code data for credential verification */
  qrCode?: string;
}

/**
 * Request interface for third-party credential verification
 *
 * @interface CredentialVerificationRequest
 * @since 1.0.0
 */
export interface CredentialVerificationRequest {
  /** Credential ID to verify */
  credentialId: string;

  /** Optional signature verification */
  verifySignature?: boolean;

  /** Optional blockchain verification */
  verifyBlockchain?: boolean;
}

/**
 * Response interface for credential verification
 *
 * @interface CredentialVerificationResponse
 * @since 1.0.0
 */
export interface CredentialVerificationResponse {
  /** Whether the credential is valid */
  isValid: boolean;

  /** Verified credential data (if valid) */
  credential?: ComplianceCredential;

  /** Verification details */
  verification: {
    /** Whether signature is valid */
    signatureValid: boolean;

    /** Whether credential is not expired */
    notExpired: boolean;

    /** Whether credential is not revoked */
    notRevoked: boolean;

    /** Blockchain verification result */
    blockchainValid?: boolean;

    /** Verification timestamp */
    verifiedAt: Date;
  };

  /** Error details if invalid */
  error?: {
    code: CredentialVerificationError;
    message: string;
    details?: Record<string, any>;
  };
}

/**
 * Credential verification error types
 */
export type CredentialVerificationError =
  | 'CREDENTIAL_NOT_FOUND'
  | 'CREDENTIAL_EXPIRED'
  | 'CREDENTIAL_REVOKED'
  | 'INVALID_SIGNATURE'
  | 'BLOCKCHAIN_VERIFICATION_FAILED'
  | 'UNKNOWN_ERROR';

/**
 * Credential issuance error types
 */
export type CredentialIssuanceError =
  | 'VALIDATION_FAILED'
  | 'DUPLICATE_CREDENTIAL'
  | 'HCS_LOGGING_FAILED'
  | 'SIGNATURE_GENERATION_FAILED'
  | 'COMPLIANCE_ENGINE_ERROR'
  | 'NETWORK_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'UNKNOWN_ERROR';

/**
 * Interface for credential search and filtering
 *
 * @interface CredentialSearchParams
 * @since 1.0.0
 */
export interface CredentialSearchParams {
  /** Filter by product ID */
  productId?: string;

  /** Filter by credential type */
  credentialType?: CredentialType;

  /** Filter by status */
  status?: CredentialStatus;

  /** Filter by issuer */
  issuer?: string;

  /** Filter by date range */
  issuedAfter?: Date;
  issuedBefore?: Date;

  /** Pagination parameters */
  limit?: number;
  offset?: number;

  /** Sort order */
  sortBy?: 'issuedAt' | 'expiresAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Response interface for credential search
 *
 * @interface CredentialSearchResponse
 * @since 1.0.0
 */
export interface CredentialSearchResponse {
  /** Found credentials */
  credentials: ComplianceCredential[];

  /** Total count of matching credentials */
  totalCount: number;

  /** Pagination information */
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * Interface for credential expiration notifications
 *
 * @interface CredentialExpirationInfo
 * @since 1.0.0
 */
export interface CredentialExpirationInfo {
  /** Credential ID */
  credentialId: string;

  /** Product ID */
  productId: string;

  /** Expiration date */
  expiresAt: Date;

  /** Days until expiration */
  daysUntilExpiration: number;

  /** Credential type */
  credentialType: CredentialType;

  /** Whether credential is already expired */
  isExpired: boolean;

  /** Warning level based on days remaining */
  warningLevel: 'none' | 'info' | 'warning' | 'critical';
}

/**
 * Credential timeline entry for UI display
 *
 * @interface CredentialTimelineEntry
 * @since 1.0.0
 */
export interface CredentialTimelineEntry {
  /** Entry ID */
  id: string;

  /** Credential ID */
  credentialId: string;

  /** Event type */
  eventType: 'issued' | 'activated' | 'expired' | 'revoked' | 'verified';

  /** Event timestamp */
  timestamp: Date;

  /** Actor who performed the action */
  actor?: string;

  /** Event description */
  description: string;

  /** Additional event data */
  data?: Record<string, any>;
}
