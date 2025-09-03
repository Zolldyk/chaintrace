/**
 * Hedera Consensus Service (HCS) Integration
 *
 * Service for managing HCS topic operations including message submission,
 * event logging, and real-time message listening for ChainTrace product events.
 *
 * @class HCSService
 *
 * @example
 * ```typescript
 * const hcsService = new HCSService({
 *   topicId: '0.0.6714150',
 *   networkType: 'testnet'
 * });
 *
 * // Log product event
 * const messageId = await hcsService.logProductEvent({
 *   productId: 'PROD-2024-001-ABC123',
 *   eventType: 'verified',
 *   actor: { walletAddress: '0.0.12345', role: 'verifier' }
 * });
 * ```
 *
 * @since 1.0.0
 */

import {
  Client,
  TopicMessageSubmitTransaction,
  TopicMessageQuery,
  TopicMessage,
} from '@hashgraph/sdk';
import { getHederaService } from './HederaService';
import { getHederaConfig } from '@/config/hedera';
import { logger } from '@/lib/logger';

/**
 * HCS service configuration
 */
export interface HCSConfig {
  /** HCS Topic ID for product events */
  topicId: string;

  /** Network type */
  networkType: 'testnet' | 'mainnet';

  /** Maximum message size in bytes */
  maxMessageSize: number;

  /** Message submission timeout */
  submitTimeout: number;

  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Product event interface for HCS messages
 */
export interface ProductEvent {
  /** Unique event identifier */
  id: string;

  /** Product identifier */
  productId: string;

  /** Event type */
  eventType:
    | 'created'
    | 'verified'
    | 'rejected'
    | 'updated'
    | 'transferred'
    | 'compliance_checked';

  /** Actor information */
  actor: {
    walletAddress: string;
    role: 'producer' | 'verifier' | 'regulator' | 'system';
    name?: string | undefined;
  };

  /** Event timestamp */
  timestamp: string;

  /** Location information */
  location?:
    | {
        coordinates?: string | undefined;
        address?: string | undefined;
        facility?: string | undefined;
      }
    | undefined;

  /** Additional event data */
  data?: Record<string, any> | undefined;

  /** Event metadata */
  metadata?:
    | {
        source: string;
        version: string;
        description?: string | undefined;
      }
    | undefined;
}

/**
 * HCS message submission result
 */
export interface MessageSubmissionResult {
  /** Whether submission was successful */
  success: boolean;

  /** Transaction ID */
  transactionId?: string;

  /** Consensus timestamp */
  consensusTimestamp?: string;

  /** Topic sequence number */
  sequenceNumber?: number;

  /** Running hash */
  runningHash?: string;

  /** Any error message */
  error?: string;

  /** Submission response time */
  responseTime: number;
}

/**
 * Message listener callback type
 */
export type MessageListener = (message: TopicMessage) => void;

/**
 * Hedera Consensus Service implementation
 */
export class HCSService {
  private config: HCSConfig;
  private client: Client | null = null;
  private listeners: Map<string, MessageListener> = new Map();
  private messageQueries: Map<string, TopicMessageQuery> = new Map();

  /**
   * Creates a new HCSService instance
   *
   * @param config - HCS service configuration
   */
  constructor(config?: Partial<HCSConfig>) {
    const hederaConfig = getHederaConfig();

    this.config = {
      topicId: hederaConfig.hcsTopicId || '',
      networkType: hederaConfig.networkType,
      maxMessageSize: 1024, // 1KB max message size
      submitTimeout: 30000, // 30 seconds
      debug: false,
      ...config,
    };

    if (!this.config.topicId) {
      throw new Error(
        'HCS Topic ID not configured. Set HCS_TOPIC_ID environment variable.'
      );
    }
  }

  /**
   * Initialize the HCS service with Hedera client
   *
   * @returns Promise that resolves when service is initialized
   *
   * @example
   * ```typescript
   * await hcsService.initialize();
   * console.log('HCS service ready');
   * ```
   *
   * @since 1.0.0
   */
  async initialize(): Promise<void> {
    try {
      // Get Hedera service and client
      const hederaService = getHederaService();
      if (!hederaService.isReady()) {
        await hederaService.validateConnection();
      }

      this.client = hederaService.getClient();
      this.log('HCS Service initialized', { topicId: this.config.topicId });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`HCS Service initialization failed: ${errorMessage}`);
    }
  }

  /**
   * Log a product event to the HCS topic
   *
   * @param event - Product event data
   * @returns Promise resolving to message submission result
   *
   * @example
   * ```typescript
   * const result = await hcsService.logProductEvent({
   *   id: 'evt_001',
   *   productId: 'PROD-2024-001',
   *   eventType: 'verified',
   *   actor: { walletAddress: '0.0.12345', role: 'verifier' },
   *   timestamp: new Date().toISOString()
   * });
   * ```
   *
   * @since 1.0.0
   */
  async logProductEvent(event: ProductEvent): Promise<MessageSubmissionResult> {
    const startTime = Date.now();

    try {
      if (!this.client) {
        await this.initialize();
      }

      // Prepare message content
      const messageContent = JSON.stringify(event);
      const messageBytes = Buffer.from(messageContent, 'utf-8');

      // Validate message size
      if (messageBytes.length > this.config.maxMessageSize) {
        throw new Error(
          `Message size (${messageBytes.length} bytes) exceeds limit (${this.config.maxMessageSize} bytes)`
        );
      }

      this.log('Submitting product event to HCS', {
        productId: event.productId,
        eventType: event.eventType,
        messageSize: messageBytes.length,
      });

      // Create and execute transaction
      const transaction = new TopicMessageSubmitTransaction({
        topicId: this.config.topicId,
        message: messageContent,
      });

      const response = await transaction.execute(this.client!);
      const receipt = await response.getReceipt(this.client!);

      const result: MessageSubmissionResult = {
        success: true,
        transactionId: response.transactionId.toString(),
        consensusTimestamp: undefined, // Consensus timestamp not directly available on TransactionReceipt
        sequenceNumber: receipt.topicSequenceNumber?.toNumber(),
        runningHash: receipt.topicRunningHash
          ? Buffer.from(receipt.topicRunningHash).toString('hex')
          : undefined,
        responseTime: Date.now() - startTime,
      };

      this.log('Product event logged successfully', result);
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      return {
        success: false,
        error: errorMessage,
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Submit a custom message to the HCS topic
   *
   * @param message - Message content (string or object)
   * @returns Promise resolving to message submission result
   *
   * @example
   * ```typescript
   * const result = await hcsService.submitMessage({
   *   type: 'system_notification',
   *   data: { message: 'System maintenance scheduled' }
   * });
   * ```
   *
   * @since 1.0.0
   */
  async submitMessage(
    message: string | object
  ): Promise<MessageSubmissionResult> {
    const startTime = Date.now();

    try {
      if (!this.client) {
        await this.initialize();
      }

      const messageContent =
        typeof message === 'string' ? message : JSON.stringify(message);
      const messageBytes = Buffer.from(messageContent, 'utf-8');

      if (messageBytes.length > this.config.maxMessageSize) {
        throw new Error(
          `Message size exceeds limit: ${messageBytes.length} > ${this.config.maxMessageSize}`
        );
      }

      const transaction = new TopicMessageSubmitTransaction({
        topicId: this.config.topicId,
        message: messageContent,
      });

      const response = await transaction.execute(this.client!);
      const receipt = await response.getReceipt(this.client!);

      return {
        success: true,
        transactionId: response.transactionId.toString(),
        consensusTimestamp: undefined, // Consensus timestamp not directly available on TransactionReceipt
        sequenceNumber: receipt.topicSequenceNumber?.toNumber(),
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      return {
        success: false,
        error: errorMessage,
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Start listening for new messages on the HCS topic
   *
   * @param listenerId - Unique identifier for this listener
   * @param callback - Function to call when new messages arrive
   * @param startTime - Optional start time for message listening
   *
   * @example
   * ```typescript
   * hcsService.startMessageListener('main', (message) => {
   *   console.log('New message:', Buffer.from(message.contents).toString());
   * });
   * ```
   *
   * @since 1.0.0
   */
  startMessageListener(
    listenerId: string,
    callback: MessageListener,
    startTime?: Date
  ): void {
    try {
      if (!this.client) {
        throw new Error(
          'HCS Service not initialized. Call initialize() first.'
        );
      }

      // Stop existing listener if any
      this.stopMessageListener(listenerId);

      const query = new TopicMessageQuery()
        .setTopicId(this.config.topicId)
        .setStartTime(startTime || new Date());

      query.subscribe(
        this.client,
        message => {
          if (message) {
            callback(message);
          }
        },
        error => {
          this.log('HCS message subscription error', { error });
        }
      );

      this.listeners.set(listenerId, callback);
      this.messageQueries.set(listenerId, query);

      this.log(`Started message listener: ${listenerId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to start message listener: ${errorMessage}`);
    }
  }

  /**
   * Stop a message listener
   *
   * @param listenerId - Listener identifier to stop
   *
   * @example
   * ```typescript
   * hcsService.stopMessageListener('main');
   * ```
   *
   * @since 1.0.0
   */
  stopMessageListener(listenerId: string): void {
    const query = this.messageQueries.get(listenerId);
    if (query) {
      // Note: Hedera SDK doesn't have explicit unsubscribe method
      // The query will stop when the service is disposed
      this.messageQueries.delete(listenerId);
      this.listeners.delete(listenerId);

      this.log(`Stopped message listener: ${listenerId}`);
    }
  }

  /**
   * Stop all message listeners
   *
   * @example
   * ```typescript
   * hcsService.stopAllListeners();
   * ```
   *
   * @since 1.0.0
   */
  stopAllListeners(): void {
    for (const listenerId of this.listeners.keys()) {
      this.stopMessageListener(listenerId);
    }
    this.log('Stopped all message listeners');
  }

  /**
   * Validate HCS topic accessibility
   *
   * @returns Promise resolving to validation result
   *
   * @example
   * ```typescript
   * const result = await hcsService.validateTopicAccess();
   * if (result.accessible) {
   *   console.log('Topic is accessible');
   * }
   * ```
   *
   * @since 1.0.0
   */
  async validateTopicAccess(): Promise<{
    accessible: boolean;
    error?: string;
    responseTime: number;
  }> {
    const startTime = Date.now();

    try {
      // Test message submission
      const testEvent: ProductEvent = {
        id: `test_${Date.now()}`,
        productId: 'TEST-ACCESS-VALIDATION',
        eventType: 'created',
        actor: {
          walletAddress: 'system',
          role: 'system',
        },
        timestamp: new Date().toISOString(),
        metadata: {
          source: 'hcs-service',
          version: '1.0.0',
          description: 'HCS topic access validation test',
        },
      };

      const result = await this.logProductEvent(testEvent);

      return {
        accessible: result.success,
        error: result.error,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      return {
        accessible: false,
        error: errorMessage,
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Get service configuration
   *
   * @returns Current HCS service configuration
   *
   * @since 1.0.0
   */
  getConfig(): HCSConfig {
    return { ...this.config };
  }

  /**
   * Check if service is initialized
   *
   * @returns True if service is ready to use
   *
   * @since 1.0.0
   */
  isInitialized(): boolean {
    return this.client !== null;
  }

  /**
   * Clean up service resources
   *
   * @returns Promise that resolves when cleanup is complete
   *
   * @since 1.0.0
   */
  async dispose(): Promise<void> {
    this.stopAllListeners();
    this.client = null;
    this.log('HCS Service disposed');
  }

  /**
   * Internal logging method
   */
  private log(message: string, data?: any): void {
    if (this.config.debug) {
      logger.debug(message, {
        component: 'HCSService',
        ...data,
      });
    } else {
      logger.info(message, {
        component: 'HCSService',
        ...data,
      });
    }
  }
}

/**
 * Singleton instance for global access
 */
let hcsServiceInstance: HCSService | null = null;

/**
 * Gets or creates the singleton HCSService instance
 *
 * @param config - Optional configuration for new instance
 * @returns The singleton HCSService instance
 *
 * @example
 * ```typescript
 * const hcsService = getHCSService();
 * await hcsService.initialize();
 * ```
 *
 * @since 1.0.0
 */
export function getHCSService(config?: Partial<HCSConfig>): HCSService {
  if (!hcsServiceInstance) {
    hcsServiceInstance = new HCSService(config);
  }
  return hcsServiceInstance;
}

/**
 * Resets the singleton instance (primarily for testing)
 *
 * @since 1.0.0
 */
export function resetHCSService(): void {
  if (hcsServiceInstance) {
    hcsServiceInstance.dispose();
  }
  hcsServiceInstance = null;
}
