/**
 * Enhanced HCS Event Logging Service for Story 2.3
 * Provides high-level interface for logging supply chain events to HCS
 * with retry mechanisms, validation, and compliance integration
 *
 * @since 2.3.0
 */

import { Client, TopicMessageSubmitTransaction } from '@hashgraph/sdk';
import {
  HCSEventMessage,
  HCSServiceConfig,
  HCSOperationResult,
  RetryConfig,
  SupplyChainRole,
} from '@/types/hedera';
import {
  ChainTraceError,
  HederaError,
  NetworkError,
  TimeoutError,
} from '@/lib/errors';
import { EventType } from '@/types/product';
import {
  messageSerializer,
  MessageSerializer,
  SerializationResult,
} from '@/lib/serialization';
import { getHederaService } from './HederaService';
import { logger } from '@/lib/logger';
import { hcsFailureHandler } from './HCSFailureHandler';

/**
 * Event logging request interface
 *
 * @interface EventLoggingRequest
 * @since 2.3.0
 */
export interface EventLoggingRequest {
  /** Product identifier */
  productId: string;

  /** Type of supply chain event */
  eventType: EventType;

  /** Actor performing the action */
  actor: {
    walletAddress: string;
    role: SupplyChainRole;
    organizationId?: string;
  };

  /** Event location */
  location: {
    coordinates: { latitude: number; longitude: number };
    address: string;
    region: string;
  };

  /** Event-specific data */
  eventData: Record<string, any>;

  /** Previous event ID for chain verification */
  previousEventId?: string;

  /** Cryptographic signature */
  signature: string;
}

/**
 * HCS Retry Manager for handling failed submissions
 *
 * @class HCSRetryManager
 * @since 2.3.0
 *
 * @example
 * ```typescript
 * const retryManager = new HCSRetryManager({
 *   maxRetries: 3,
 *   baseDelay: 1000,
 *   maxDelay: 10000,
 *   backoffMultiplier: 2
 * });
 *
 * const result = await retryManager.executeWithRetry(
 *   () => hcsClient.submitMessage(message)
 * );
 * ```
 */
export class HCSRetryManager {
  constructor(private config: RetryConfig) {}

  /**
   * Executes an operation with exponential backoff retry logic
   *
   * @param operation - Async operation to execute with retries
   * @returns Promise resolving to operation result
   *
   * @throws {ApiError} When all retry attempts are exhausted
   *
   * @example
   * ```typescript
   * const result = await retryManager.executeWithRetry(async () => {
   *   return await hcsService.submitMessage(message);
   * });
   * ```
   *
   * @since 2.3.0
   */
  async executeWithRetry<T>(operation: () => Promise<T>): Promise<{
    result: T;
    metadata: { retryAttempts: number; totalDuration: number };
  }> {
    const startTime = Date.now();
    let lastError: Error = new Error('Unknown error');
    let retryAttempts = 0;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const result = await operation();

        return {
          result,
          metadata: {
            retryAttempts,
            totalDuration: Date.now() - startTime,
          },
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        retryAttempts = attempt;

        // Don't retry on the last attempt
        if (attempt === this.config.maxRetries) {
          break;
        }

        // Check if error is retryable
        if (error instanceof ChainTraceError && !error.retryable) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.config.baseDelay *
            Math.pow(this.config.backoffMultiplier, attempt),
          this.config.maxDelay
        );

        logger.warn('HCS operation failed, retrying', {
          attempt: attempt + 1,
          maxRetries: this.config.maxRetries,
          delayMs: delay,
          error: lastError.message,
        });

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new HederaError(
      `HCS operation failed after ${this.config.maxRetries} retries: ${lastError.message}`,
      {
        hederaStatus: 'HCS_RETRY_EXHAUSTED',
        retryable: false,
      }
    );
  }
}

/**
 * Enhanced HCS Event Logger with compliance integration
 *
 * @class HCSEventLogger
 * @since 2.3.0
 *
 * @example
 * ```typescript
 * const logger = new HCSEventLogger({
 *   topicId: '0.0.12345',
 *   operatorAccountId: '0.0.98765',
 *   operatorPrivateKey: process.env.HEDERA_PRIVATE_KEY!,
 *   networkType: 'testnet'
 * });
 *
 * await logger.initialize();
 *
 * const result = await logger.logProductCreation({
 *   productId: 'CT-2024-001-ABC123',
 *   eventType: 'created',
 *   actor: {
 *     walletAddress: '0.0.67890',
 *     role: 'Producer'
 *   },
 *   location: {
 *     coordinates: { latitude: 6.5244, longitude: 3.3792 },
 *     address: '123 Farm Road, Lagos',
 *     region: 'Southwest Nigeria'
 *   },
 *   eventData: { batchId: 'BATCH-001' },
 *   signature: 'wallet_signature'
 * });
 * ```
 */
export class HCSEventLogger {
  private client: Client | null = null;
  private serializer: MessageSerializer;
  private retryManager: HCSRetryManager;
  private isInitialized = false;

  /**
   * Creates a new HCSEventLogger instance
   *
   * @param config - HCS service configuration
   *
   * @throws {ApiError} When required configuration is missing
   *
   * @since 2.3.0
   */
  constructor(private config: HCSServiceConfig) {
    if (!config.topicId) {
      throw new HederaError('HCS Topic ID is required', {
        hederaStatus: 'INVALID_CONFIGURATION',
        retryable: false,
      });
    }

    if (!config.operatorAccountId || !config.operatorPrivateKey) {
      throw new HederaError(
        'Operator account ID and private key are required',
        {
          hederaStatus: 'INVALID_CONFIGURATION',
          retryable: false,
        }
      );
    }

    this.serializer = messageSerializer;
    this.retryManager = new HCSRetryManager(
      config.retryConfig || {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
      }
    );
  }

  /**
   * Initializes the HCS Event Logger with Hedera client
   *
   * @returns Promise that resolves when logger is ready
   *
   * @throws {ApiError} When initialization fails
   *
   * @example
   * ```typescript
   * await logger.initialize();
   * console.log('HCS Event Logger ready');
   * ```
   *
   * @since 2.3.0
   */
  async initialize(): Promise<void> {
    try {
      const hederaService = getHederaService();
      if (!hederaService.isReady()) {
        await hederaService.validateConnection();
      }

      this.client = hederaService.getClient();
      this.isInitialized = true;

      logger.info('HCS Event Logger initialized', {
        topicId: this.config.topicId,
        networkType: this.config.networkType,
      });
    } catch (error) {
      throw new HederaError(
        `HCS Event Logger initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          hederaStatus: 'INITIALIZATION_FAILED',
          retryable: true,
        }
      );
    }
  }

  /**
   * Logs a product creation event to HCS
   *
   * @param request - Event logging request
   * @returns Promise resolving to operation result
   *
   * @throws {ApiError} When logging fails
   *
   * @example
   * ```typescript
   * const result = await logger.logProductCreation({
   *   productId: 'CT-2024-001-ABC123',
   *   eventType: 'created',
   *   actor: { walletAddress: '0.0.67890', role: 'Producer' },
   *   location: { coordinates: { latitude: 6.5244, longitude: 3.3792 }, address: 'Lagos', region: 'Southwest' },
   *   eventData: { batchId: 'BATCH-001' },
   *   signature: 'signature'
   * });
   * ```
   *
   * @since 2.3.0
   */
  async logProductCreation(
    request: EventLoggingRequest
  ): Promise<HCSOperationResult> {
    return this.logEvent({ ...request, eventType: 'created' });
  }

  /**
   * Logs a processing event to HCS
   *
   * @param request - Event logging request
   * @returns Promise resolving to operation result
   *
   * @throws {ApiError} When logging fails
   *
   * @since 2.3.0
   */
  async logProcessingEvent(
    request: EventLoggingRequest
  ): Promise<HCSOperationResult> {
    return this.logEvent({ ...request, eventType: 'processed' });
  }

  /**
   * Logs a verification event to HCS
   *
   * @param request - Event logging request
   * @returns Promise resolving to operation result
   *
   * @throws {ApiError} When logging fails
   *
   * @since 2.3.0
   */
  async logVerificationEvent(
    request: EventLoggingRequest
  ): Promise<HCSOperationResult> {
    return this.logEvent({ ...request, eventType: 'verified' });
  }

  /**
   * Logs a compliance event to HCS from Custom Compliance Engine
   *
   * @param complianceData - Compliance validation data
   * @returns Promise resolving to operation result
   *
   * @throws {ApiError} When logging fails
   *
   * @example
   * ```typescript
   * const result = await logger.logComplianceEvent({
   *   productId: 'CT-2024-001-ABC123',
   *   action: 'producer_initial_creation',
   *   result: 'APPROVED',
   *   walletAddress: '0.0.67890',
   *   roleType: 'Producer',
   *   complianceId: 'COMP-001',
   *   sequenceStep: 1
   * });
   * ```
   *
   * @since 2.3.0
   */
  async logComplianceEvent(complianceData: {
    productId: string;
    action: string;
    result: 'APPROVED' | 'REJECTED';
    walletAddress: string;
    roleType: SupplyChainRole;
    complianceId: string;
    sequenceStep: number;
    violations?: string[];
    metadata?: Record<string, any>;
  }): Promise<HCSOperationResult> {
    const eventType = this.getEventTypeFromAction(complianceData.action);

    const request: EventLoggingRequest = {
      productId: complianceData.productId,
      eventType,
      actor: {
        walletAddress: complianceData.walletAddress,
        role: complianceData.roleType,
      },
      location: {
        coordinates: { latitude: 0, longitude: 0 }, // Placeholder for compliance events
        address: 'Compliance Engine',
        region: 'System',
      },
      eventData: {
        action: complianceData.action,
        result: complianceData.result,
        complianceId: complianceData.complianceId,
        sequenceStep: complianceData.sequenceStep,
        violations: complianceData.violations,
        ...complianceData.metadata,
      },
      signature: `compliance_${complianceData.complianceId}`, // Placeholder signature for compliance events
    };

    return this.logEvent(request);
  }

  /**
   * Core event logging method with retry mechanism
   *
   * @param request - Event logging request
   * @returns Promise resolving to operation result
   *
   * @throws {ApiError} When logging fails after all retries
   *
   * @since 2.3.0
   */
  private async logEvent(
    request: EventLoggingRequest
  ): Promise<HCSOperationResult> {
    if (!this.isInitialized || !this.client) {
      await this.initialize();
    }

    const startTime = Date.now();

    try {
      // Create HCS event message
      const eventMessage: HCSEventMessage = {
        version: '2.3.0',
        productId: request.productId,
        eventType: request.eventType,
        timestamp: new Date().toISOString(),
        actor: request.actor,
        location: request.location,
        eventData: request.eventData,
        previousEventId: request.previousEventId,
        signature: request.signature,
      };

      // Validate and serialize message
      const serialized = await this.serializer.serialize(eventMessage);

      // Submit to HCS with retry logic
      const { result: hcsResult, metadata: retryMetadata } =
        await this.retryManager.executeWithRetry(async () => {
          return this.submitToHCS(serialized);
        });

      const operationResult: HCSOperationResult = {
        success: true,
        sequenceNumber: hcsResult.sequenceNumber,
        transactionId: hcsResult.transactionId,
        timestamp: new Date(),
        metadata: {
          retryAttempts: retryMetadata.retryAttempts,
          durationMs: Date.now() - startTime,
          messageSizeBytes: serialized.sizeBytes,
        },
      };

      logger.info('HCS event logged successfully', {
        productId: request.productId,
        eventType: request.eventType,
        sequenceNumber: hcsResult.sequenceNumber,
        retryAttempts: retryMetadata.retryAttempts,
      });

      return operationResult;
    } catch (error) {
      const operationResult: HCSOperationResult = {
        success: false,
        timestamp: new Date(),
        error: {
          code:
            error instanceof ChainTraceError ? error.code : 'HCS_SERVICE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: error instanceof ChainTraceError ? error.retryable : false,
        },
        metadata: {
          durationMs: Date.now() - startTime,
        },
      };

      logger.error('HCS event logging failed');

      // Record failure in dead letter queue if not retryable
      if (!operationResult.error?.retryable) {
        try {
          const eventMessage: HCSEventMessage = {
            version: '2.3.0',
            productId: request.productId,
            eventType: request.eventType,
            timestamp: new Date().toISOString(),
            actor: request.actor,
            location: request.location,
            eventData: request.eventData,
            previousEventId: request.previousEventId,
            signature: request.signature,
          };

          await hcsFailureHandler.recordFailure(eventMessage, operationResult);
        } catch (failureRecordError) {
          logger.error('Failed to record HCS failure in dead letter queue');
        }
      }

      return operationResult;
    }
  }

  /**
   * Submits serialized message to HCS topic
   *
   * @param serialized - Serialized message data
   * @returns Promise resolving to HCS submission result
   *
   * @throws {ApiError} When submission fails
   *
   * @since 2.3.0
   */
  private async submitToHCS(serialized: SerializationResult): Promise<{
    sequenceNumber: string;
    transactionId: string;
  }> {
    try {
      const transaction = new TopicMessageSubmitTransaction({
        topicId: this.config.topicId,
        message: serialized.data,
      });

      // Set timeout if configured
      if (this.config.messageTimeoutMs) {
        transaction.setTransactionValidDuration(this.config.messageTimeoutMs);
      }

      const response = await transaction.execute(this.client!);
      const receipt = await response.getReceipt(this.client!);

      if (!receipt.topicSequenceNumber) {
        throw new HederaError(
          'HCS submission successful but sequence number not returned',
          {
            hederaStatus: 'MISSING_SEQUENCE_NUMBER',
            retryable: true,
          }
        );
      }

      return {
        sequenceNumber: receipt.topicSequenceNumber.toString(),
        transactionId: response.transactionId.toString(),
      };
    } catch (error) {
      if (error instanceof ChainTraceError) {
        throw error;
      }

      // Map Hedera SDK errors to our error codes
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('TIMEOUT')) {
        throw new TimeoutError('HCS submission timeout', {
          operation: 'hcs_submit_message',
          service: 'hedera',
          cause: error instanceof Error ? error : undefined,
        });
      }

      if (errorMessage.includes('RATE_LIMIT')) {
        throw new NetworkError('HCS rate limit exceeded', {
          service: 'hedera-hcs',
          cause: error instanceof Error ? error : undefined,
        });
      }

      throw new HederaError(`HCS submission failed: ${errorMessage}`, {
        hederaStatus: 'SUBMISSION_FAILED',
        retryable: true,
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  /**
   * Maps compliance action to event type
   *
   * @param action - Compliance action name
   * @returns Corresponding event type
   *
   * @since 2.3.0
   */
  private getEventTypeFromAction(action: string): EventType {
    switch (action) {
      case 'producer_initial_creation':
      case 'producer_batch_creation':
        return 'created';
      case 'processor_quality_check':
      case 'processor_transformation':
        return 'processed';
      case 'verifier_final_approval':
      case 'verifier_compliance_check':
        return 'verified';
      default:
        return 'created'; // Default fallback
    }
  }

  /**
   * Validates that the logger is ready for use
   *
   * @returns True if logger is initialized and ready
   *
   * @since 2.3.0
   */
  isReady(): boolean {
    return this.isInitialized && this.client !== null;
  }

  /**
   * Disposes of the logger and cleans up resources
   *
   * @returns Promise that resolves when cleanup is complete
   *
   * @since 2.3.0
   */
  async dispose(): Promise<void> {
    this.client = null;
    this.isInitialized = false;

    logger.info('HCS Event Logger disposed');
  }
}

/**
 * Default HCS Event Logger instance for global access
 * Initialized with environment configuration
 *
 * @example
 * ```typescript
 * import { hcsEventLogger } from '@/services/hedera/HCSEventLogger';
 *
 * await hcsEventLogger.initialize();
 * const result = await hcsEventLogger.logProductCreation(request);
 * ```
 *
 * @since 2.3.0
 */
/**
 * Lazy singleton for HCS Event Logger to prevent initialization during build time
 */
let _hcsEventLogger: HCSEventLogger | null = null;

export function getHCSEventLogger(): HCSEventLogger {
  if (!_hcsEventLogger) {
    // Check for required environment variables
    if (
      !process.env.HEDERA_OPERATOR_ACCOUNT_ID ||
      !process.env.HEDERA_OPERATOR_PRIVATE_KEY
    ) {
      throw new HederaError('HCS Event Logger requires Hedera credentials', {
        retryable: false,
        hederaStatus: 'INVALID_CONFIGURATION',
      });
    }

    _hcsEventLogger = new HCSEventLogger({
      topicId: process.env.HCS_TOPIC_ID || '',
      operatorAccountId: process.env.HEDERA_OPERATOR_ACCOUNT_ID || '',
      operatorPrivateKey: process.env.HEDERA_OPERATOR_PRIVATE_KEY || '',
      networkType:
        (process.env.HEDERA_NETWORK as 'testnet' | 'mainnet') || 'testnet',
      messageTimeoutMs: 30000,
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
      },
    });
  }

  return _hcsEventLogger;
}
