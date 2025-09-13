/**
 * Compliance credential management service
 * Handles automatic credential issuance upon successful compliance validation
 *
 * @since 1.0.0
 */

import { HederaServiceClient } from '../core/HederaServiceClient';
// import { ComplianceServiceClient } from '../hedera/ComplianceServiceClient'; // Reserved for future use
import { HCSService } from '../hedera/HCSService';
import { CredentialRepository } from '../database/CredentialRepository';
import { createSupabaseServiceClient } from '@/config/database';
import { credentialMonitor } from '../monitoring/CredentialMetrics';
import type { HederaServiceConfig } from '../../types/hedera';
import type {
  ComplianceCredential,
  CredentialIssuanceRequest,
  CredentialIssuanceResponse,
  CredentialVerificationRequest,
  CredentialVerificationResponse,
  CredentialSearchParams,
  CredentialSearchResponse,
} from '../../types/compliance';
import {
  generateCredentialId,
  isCredentialExpired,
  validateCredentialData,
  CredentialIssuanceRequestSchema,
} from '../../lib/credential-validations';
import { logger } from '@/lib/logger';
// Conditional crypto import for server-side only
const getCrypto = () => {
  if (typeof window === 'undefined') {
    return require('crypto');
  } else {
    throw new Error('Crypto operations not available on client-side');
  }
};

/**
 * Credential service configuration
 */
export interface CredentialServiceConfig extends HederaServiceConfig {
  /** HCS topic for credential events */
  credentialTopicId: string;

  /** Default credential expiration (in days) */
  defaultExpirationDays: number;

  /** Credential signing private key */
  signingKey: string;

  /** Maximum credentials per product */
  maxCredentialsPerProduct: number;
}

/**
 * Credential issuance error types
 */
export type CredentialIssuanceError =
  | 'VALIDATION_FAILED'
  | 'DUPLICATE_CREDENTIAL'
  | 'HCS_LOGGING_FAILED'
  | 'SIGNATURE_GENERATION_FAILED'
  | 'COMPLIANCE_ENGINE_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Compliance credential management service
 *
 * @class CredentialService
 * @extends HederaServiceClient
 * @since 1.0.0
 *
 * @example
 * ```typescript
 * const credentialService = new CredentialService({
 *   networkType: 'testnet',
 *   credentialTopicId: '0.0.7777777',
 *   defaultExpirationDays: 365,
 *   signingKey: 'your-signing-key'
 * });
 *
 * // Issue credential after compliance validation
 * const credential = await credentialService.issueCredential({
 *   productId: 'CT-2024-001-ABC123',
 *   credentialType: 'supply_chain',
 *   validationResults: { score: 95, compliant: true },
 *   complianceRules: ['organic_certification', 'fair_trade'],
 *   verificationLevel: 'enhanced'
 * });
 * ```
 */
export class CredentialService extends HederaServiceClient {
  // private complianceClient: ComplianceServiceClient; // Reserved for future compliance validation
  private hcsService: HCSService;
  private credentialRepository: CredentialRepository;
  private credentialTopicId: string;
  private defaultExpirationDays: number;
  private signingKey: string;
  private maxCredentialsPerProduct: number;

  // Cache for frequently accessed data (kept for performance)
  private formattedCredentialCache = new Map<string, any>();

  constructor(config: CredentialServiceConfig) {
    super(config);

    this.credentialTopicId = config.credentialTopicId;
    this.defaultExpirationDays = config.defaultExpirationDays || 365;
    this.signingKey = config.signingKey;
    this.maxCredentialsPerProduct = config.maxCredentialsPerProduct || 10;

    // Initialize dependent services
    // this.complianceClient = new ComplianceServiceClient(config); // Reserved for future use
    this.hcsService = new HCSService({
      topicId: this.credentialTopicId,
      networkType: config.networkType,
      maxMessageSize: 1024,
      submitTimeout: 30000,
    });

    // Initialize database repository with Supabase client
    const supabaseClient = createSupabaseServiceClient();
    this.credentialRepository = new CredentialRepository(supabaseClient);
  }

  protected getServiceName(): string {
    return 'CredentialService';
  }

  /**
   * Issue a compliance credential after successful validation
   *
   * @param request - Credential issuance request
   * @returns Promise resolving to issued credential and HCS result
   * @throws {Error} When credential issuance fails
   *
   * @example
   * ```typescript
   * const response = await credentialService.issueCredential({
   *   productId: 'CT-2024-001-ABC123',
   *   credentialType: 'supply_chain',
   *   validationResults: { score: 95, compliant: true },
   *   complianceRules: ['organic_certification'],
   *   verificationLevel: 'enhanced'
   * });
   * console.log('Credential issued:', response.credential.id);
   * ```
   */
  async issueCredential(
    request: CredentialIssuanceRequest
  ): Promise<CredentialIssuanceResponse> {
    const startTime = Date.now();
    let credential: ComplianceCredential | undefined;

    try {
      // Validate request data
      const validation = validateCredentialData(
        request,
        CredentialIssuanceRequestSchema
      );
      if (!validation.success) {
        throw new Error(
          `Invalid credential request: ${(validation as { success: false; errors: string[] }).errors.join(', ')}`
        );
      }

      const validatedRequest = validation.data as CredentialIssuanceRequest;

      const result = await this.executeWithRetry(
        async () => {
          logger.info('Starting credential issuance', {
            productId: validatedRequest.productId,
            credentialType: validatedRequest.credentialType,
          });

          // Check if product already has maximum credentials
          await this.validateCredentialLimits(validatedRequest.productId);

          // Generate credential
          const credential = await this.generateCredential(validatedRequest);

          // Sign credential
          credential.signature = await this.signCredential(credential);

          // Log to HCS for audit trail
          const hcsResult = await this.logCredentialToHCS(credential, 'issued');

          // Store credential
          await this.storeCredential(credential);

          logger.info('Credential issued successfully', {
            credentialId: credential.id,
            productId: credential.productId,
            hcsMessageId: hcsResult.messageId,
          });

          return {
            credential,
            hcsResult,
            qrCode: this.generateCredentialQRCode(credential),
          };
        },
        {
          operationName: 'issueCredential',
          timeout: this.config.timeouts?.compliance || 60000,
          metadata: {
            productId: validatedRequest.productId,
            credentialType: validatedRequest.credentialType,
          },
        }
      );

      credential = result.credential;

      // Record successful issuance
      const duration = Date.now() - startTime;
      credentialMonitor.recordCredentialIssued(credential, duration, true);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Record failed issuance
      if (credential) {
        credentialMonitor.recordCredentialIssued(
          credential,
          duration,
          false,
          error
        );
      }

      logger.error(
        'Credential issuance failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          productId: request.productId,
          credentialType: request.credentialType,
        }
      );
      throw error;
    }
  }

  /**
   * Retrieve a credential by ID
   *
   * @param credentialId - Credential ID to retrieve
   * @returns Promise resolving to credential or null if not found
   */
  async getCredential(
    credentialId: string
  ): Promise<ComplianceCredential | null> {
    return this.executeWithRetry(
      async () => {
        const credential =
          await this.credentialRepository.findById(credentialId);
        if (!credential) {
          return null;
        }

        // Update status if expired
        if (
          isCredentialExpired(credential) &&
          credential.status !== 'expired'
        ) {
          credential.status = 'expired';
          await this.logCredentialToHCS(credential, 'expired');
          await this.credentialRepository.updateStatus(credentialId, 'expired');
        }

        return credential;
      },
      {
        operationName: 'getCredential',
        timeout: 5000,
        metadata: { credentialId },
      }
    );
  }

  /**
   * Search credentials by various parameters
   *
   * @param params - Search parameters
   * @returns Promise resolving to search results
   */
  async searchCredentials(
    params: CredentialSearchParams
  ): Promise<CredentialSearchResponse> {
    return this.executeWithRetry(
      async () => {
        // Check cache first for common searches
        const cacheKey = JSON.stringify(params);
        if (this.formattedCredentialCache.has(cacheKey)) {
          return this.formattedCredentialCache.get(cacheKey);
        }

        // Use database repository for search
        const result = await this.credentialRepository.search(params);

        // Cache result for performance
        this.formattedCredentialCache.set(cacheKey, result);

        return result;
      },
      {
        operationName: 'searchCredentials',
        timeout: 10000,
        metadata: { searchParams: params },
      }
    );
  }

  /**
   * Verify a credential's authenticity and status
   *
   * @param request - Verification request
   * @returns Promise resolving to verification result
   */
  async verifyCredential(
    request: CredentialVerificationRequest
  ): Promise<CredentialVerificationResponse> {
    return this.executeWithRetry(
      async () => {
        const credential = await this.getCredential(request.credentialId);

        if (!credential) {
          return {
            isValid: false,
            verification: {
              signatureValid: false,
              notExpired: false,
              notRevoked: false,
              verifiedAt: new Date(),
            },
            error: {
              code: 'CREDENTIAL_NOT_FOUND',
              message: 'Credential not found',
            },
          };
        }

        // Perform verification checks
        const signatureValid =
          request.verifySignature !== false
            ? await this.verifyCredentialSignature(credential)
            : true;

        const notExpired = !isCredentialExpired(credential);
        const notRevoked = credential.status !== 'revoked';
        const blockchainValid = request.verifyBlockchain
          ? await this.verifyCredentialOnBlockchain(credential)
          : undefined;

        const isValid =
          signatureValid &&
          notExpired &&
          notRevoked &&
          (blockchainValid === undefined || blockchainValid);

        // Log verification event
        await this.logCredentialToHCS(credential, 'verified');

        const verification = {
          signatureValid,
          notExpired,
          notRevoked,
          blockchainValid,
          verifiedAt: new Date(),
        };

        if (!isValid) {
          let errorCode:
            | 'CREDENTIAL_EXPIRED'
            | 'CREDENTIAL_REVOKED'
            | 'INVALID_SIGNATURE'
            | 'BLOCKCHAIN_VERIFICATION_FAILED';
          let errorMessage: string;

          if (!notExpired) {
            errorCode = 'CREDENTIAL_EXPIRED';
            errorMessage = 'Credential has expired';
          } else if (!notRevoked) {
            errorCode = 'CREDENTIAL_REVOKED';
            errorMessage = 'Credential has been revoked';
          } else if (!signatureValid) {
            errorCode = 'INVALID_SIGNATURE';
            errorMessage = 'Credential signature is invalid';
          } else {
            errorCode = 'BLOCKCHAIN_VERIFICATION_FAILED';
            errorMessage = 'Blockchain verification failed';
          }

          return {
            isValid: false,
            verification,
            error: {
              code: errorCode,
              message: errorMessage,
            },
          };
        }

        return {
          isValid: true,
          credential,
          verification,
        };
      },
      {
        operationName: 'verifyCredential',
        timeout: 30000,
        metadata: { credentialId: request.credentialId },
      }
    );
  }

  /**
   * Revoke a credential
   *
   * @param credentialId - Credential ID to revoke
   * @param reason - Reason for revocation
   * @returns Promise resolving to revoked credential
   */
  async revokeCredential(
    credentialId: string,
    reason: string
  ): Promise<ComplianceCredential> {
    return this.executeWithRetry(
      async () => {
        const credential = await this.getCredential(credentialId);
        if (!credential) {
          throw new Error(`Credential not found: ${credentialId}`);
        }

        if (credential.status === 'revoked') {
          throw new Error(`Credential already revoked: ${credentialId}`);
        }

        // Update credential status
        credential.status = 'revoked';

        // Log revocation to HCS
        await this.logCredentialToHCS(credential, 'revoked', { reason });

        // Store updated credential
        await this.storeCredential(credential);

        logger.info('Credential revoked', {
          credentialId,
          reason,
        });

        return credential;
      },
      {
        operationName: 'revokeCredential',
        timeout: 15000,
        metadata: { credentialId, reason },
      }
    );
  }

  /**
   * Get credentials for a specific product
   *
   * @param productId - Product ID
   * @returns Promise resolving to product credentials
   */
  async getProductCredentials(
    productId: string
  ): Promise<ComplianceCredential[]> {
    const searchResult = await this.searchCredentials({
      productId,
      limit: this.maxCredentialsPerProduct,
      sortBy: 'issuedAt',
      sortOrder: 'desc',
    });

    return searchResult.credentials;
  }

  /**
   * Generate a new credential from request data
   */
  private async generateCredential(
    request: CredentialIssuanceRequest
  ): Promise<ComplianceCredential> {
    const credentialId = generateCredentialId();
    const now = new Date();
    const expiresAt =
      request.expiresAt ||
      new Date(
        now.getTime() + this.defaultExpirationDays * 24 * 60 * 60 * 1000
      );

    return {
      id: credentialId,
      productId: request.productId,
      issuer: 'ChainTrace Compliance Engine',
      issuedAt: now,
      expiresAt,
      status: 'issued',
      credentialType: request.credentialType,
      metadata: {
        validationDetails: request.validationResults,
        complianceRules: request.complianceRules,
        verificationLevel: request.verificationLevel,
        policyId: request.policyId,
        validatedAt: now,
      },
      signature: '', // Will be set by signCredential
      hcsMessageId: '', // Will be set by HCS logging
    };
  }

  /**
   * Sign a credential for integrity verification
   */
  private async signCredential(
    credential: ComplianceCredential
  ): Promise<string> {
    const credentialData = {
      id: credential.id,
      productId: credential.productId,
      issuer: credential.issuer,
      issuedAt: credential.issuedAt.toISOString(),
      expiresAt: credential.expiresAt?.toISOString() || null,
      credentialType: credential.credentialType,
      metadata: credential.metadata,
    };

    const dataString = JSON.stringify(credentialData);
    const crypto = getCrypto();
    return crypto
      .createHash('sha256')
      .update(dataString + this.signingKey)
      .digest('hex');
  }

  /**
   * Verify credential signature
   */
  private async verifyCredentialSignature(
    credential: ComplianceCredential
  ): Promise<boolean> {
    try {
      const expectedSignature = await this.signCredential({
        ...credential,
        signature: '', // Exclude signature from verification
      });
      return expectedSignature === credential.signature;
    } catch (error) {
      logger.error(
        'Signature verification failed',
        error instanceof Error ? error : new Error(String(error)),
        { credentialId: credential.id }
      );
      return false;
    }
  }

  /**
   * Verify credential exists on blockchain
   */
  private async verifyCredentialOnBlockchain(
    credential: ComplianceCredential
  ): Promise<boolean> {
    try {
      // This would query the HCS topic for the credential issuance message
      // For now, we'll return true if the credential has an HCS message ID
      return !!credential.hcsMessageId;
    } catch (error) {
      logger.error(
        'Blockchain verification failed',
        error instanceof Error ? error : new Error(String(error)),
        { credentialId: credential.id }
      );
      return false;
    }
  }

  /**
   * Log credential event to HCS for audit trail
   */
  private async logCredentialToHCS(
    credential: ComplianceCredential,
    eventType: 'issued' | 'verified' | 'expired' | 'revoked',
    additionalData?: Record<string, any>
  ): Promise<{ messageId: string; timestamp: Date }> {
    try {
      const eventData = {
        credentialId: credential.id,
        productId: credential.productId,
        eventType,
        credentialType: credential.credentialType,
        timestamp: new Date().toISOString(),
        issuer: credential.issuer,
        ...additionalData,
      };

      const result = await this.hcsService.logProductEvent({
        id: `cred-${credential.id}-${eventType}`,
        productId: credential.productId,
        eventType: 'compliance_checked' as any,
        actor: {
          walletAddress: 'system',
          role: 'system',
        },
        timestamp: new Date().toISOString(),
        data: eventData,
      });

      if (eventType === 'issued' && result.transactionId) {
        credential.hcsMessageId = result.transactionId;
      }

      return { messageId: result.transactionId || '', timestamp: new Date() };
    } catch (error) {
      logger.error(
        'Failed to log credential to HCS',
        error instanceof Error ? error : new Error(String(error)),
        { credentialId: credential.id, eventType }
      );
      throw new Error(`HCS logging failed: ${error}`);
    }
  }

  /**
   * Store credential in database
   */
  private async storeCredential(
    credential: ComplianceCredential
  ): Promise<void> {
    await this.credentialRepository.create(credential);

    // Add timeline entry for credential issuance
    await this.credentialRepository.addTimelineEntry({
      id: `${credential.id}-issued`,
      credentialId: credential.id,
      eventType: 'issued',
      timestamp: credential.issuedAt,
      actor: credential.issuer,
      description: `Credential issued for product ${credential.productId}`,
      data: {
        credentialType: credential.credentialType,
        verificationLevel: credential.metadata.verificationLevel,
      },
    });

    // Clear related cache entries to ensure consistency
    this.formattedCredentialCache.delete(credential.id);
    this.formattedCredentialCache.delete(`product:${credential.productId}`);
  }

  /**
   * Validate credential limits for a product
   */
  private async validateCredentialLimits(productId: string): Promise<void> {
    const existingCount =
      await this.credentialRepository.countByProductId(productId);
    if (existingCount >= this.maxCredentialsPerProduct) {
      throw new Error(
        `Maximum credentials limit reached for product ${productId}: ${this.maxCredentialsPerProduct}`
      );
    }
  }

  /**
   * Generate QR code data for credential verification
   */
  private generateCredentialQRCode(credential: ComplianceCredential): string {
    const qrData = {
      type: 'credential',
      credentialId: credential.id,
      productId: credential.productId,
      verificationUrl: `/api/compliance/credentials/${credential.id}/verify`,
    };
    return JSON.stringify(qrData);
  }

  /**
   * Clear cache entries to manage memory usage
   *
   * @param pattern - Optional pattern to clear specific cache entries
   */
  public clearCache(pattern?: string): void {
    if (!pattern) {
      this.formattedCredentialCache.clear();
      logger.info('Credential cache cleared completely');
      return;
    }

    const keysToDelete: string[] = [];
    for (const key of Array.from(this.formattedCredentialCache.keys())) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.formattedCredentialCache.delete(key));
    logger.info('Credential cache cleared for pattern', {
      pattern,
      deletedKeys: keysToDelete.length,
    });
  }

  /**
   * Get cache statistics for monitoring
   *
   * @returns Cache statistics
   */
  public getCacheStats(): { size: number; memoryUsage: string } {
    const size = this.formattedCredentialCache.size;
    const memoryUsage = `${Math.round(JSON.stringify(Array.from(this.formattedCredentialCache.entries())).length / 1024)}KB`;

    return { size, memoryUsage };
  }
}
