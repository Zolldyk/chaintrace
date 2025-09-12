/**
 * Mirror Node Service for Hedera API Integration
 *
 * Service for interacting with Hedera Mirror Node API for fast blockchain data queries
 * with rate limiting, error handling, and performance optimization.
 *
 * @class MirrorNodeService
 *
 * @example
 * ```typescript
 * const mirrorNodeService = new MirrorNodeService({
 *   baseUrl: 'https://testnet.mirrornode.hedera.com',
 *   timeout: 30000
 * });
 *
 * const product = await mirrorNodeService.getProductData('PROD-2024-001');
 * // Check product verification status
 * ```
 *
 * @since 1.0.0
 */

import { getHederaConfig } from '@/config/hedera';
import { logger } from '@/lib/logger';

/**
 * Mirror Node service configuration
 */
export interface MirrorNodeConfig {
  /** Mirror Node API base URL */
  baseUrl: string;

  /** Request timeout in milliseconds */
  timeout: number;

  /** Maximum retries for failed requests */
  maxRetries: number;

  /** Rate limiting configuration */
  rateLimits: {
    requestsPerSecond: number;
    burstSize: number;
  };

  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Mirror Node API response wrapper
 */
export interface MirrorNodeResponse<T> {
  /** Response data */
  data: T;

  /** Response metadata */
  links: {
    next?: string;
  };

  /** Request timestamp */
  timestamp: string;
}

/**
 * Account information from Mirror Node
 */
export interface AccountInfo {
  /** Account ID */
  account: string;

  /** Account balance */
  balance: {
    balance: number;
    tokens: Array<{
      token_id: string;
      balance: number;
    }>;
  };

  /** Account public key */
  key?: string;

  /** Account expiration timestamp */
  expiry_timestamp?: string;

  /** Account memo */
  memo?: string;
}

/**
 * Transaction information from Mirror Node
 */
export interface TransactionInfo {
  /** Transaction ID */
  transaction_id: string;

  /** Consensus timestamp */
  consensus_timestamp: string;

  /** Transaction result */
  result: string;

  /** Transaction type */
  name: string;

  /** Node account ID */
  node: string;

  /** Transaction fee */
  charged_tx_fee: number;

  /** Transaction transfers */
  transfers: Array<{
    account: string;
    amount: number;
  }>;

  /** HCS message (if applicable) */
  message?: string;

  /** Token transfers (if applicable) */
  token_transfers?: Array<{
    token_id: string;
    account: string;
    amount: number;
  }>;
}

/**
 * HCS topic information
 */
export interface TopicInfo {
  /** Topic ID */
  topic_id: string;

  /** Topic memo */
  memo?: string;

  /** Admin key */
  admin_key?: string;

  /** Submit key */
  submit_key?: string;

  /** Running hash */
  running_hash: string;

  /** Sequence number */
  sequence_number: number;
}

/**
 * HCS message information
 */
export interface TopicMessage {
  /** Consensus timestamp */
  consensus_timestamp: string;

  /** Topic ID */
  topic_id: string;

  /** Message content (base64 encoded) */
  message: string;

  /** Running hash */
  running_hash: string;

  /** Sequence number */
  sequence_number: number;
}

/**
 * Product verification data (custom interface for ChainTrace)
 */
export interface ProductVerificationData {
  /** Product ID */
  productId: string;

  /** Verification status */
  verified: boolean;

  /** Verification events */
  events: Array<{
    timestamp: string;
    eventType: string;
    actor: string;
    location?: string;
    data?: any;
  }>;

  /** Current status */
  status: 'verified' | 'pending' | 'rejected';

  /** Last update timestamp */
  lastUpdated: string;
}

/**
 * Rate limiting tracker
 */
class RateLimiter {
  private requests: number[] = [];
  private config: MirrorNodeConfig['rateLimits'];

  constructor(config: MirrorNodeConfig['rateLimits']) {
    this.config = config;
  }

  /**
   * Check if request can be made within rate limits
   */
  canMakeRequest(): boolean {
    const now = Date.now();
    const oneSecondAgo = now - 1000;

    // Remove requests older than 1 second
    this.requests = this.requests.filter(timestamp => timestamp > oneSecondAgo);

    // Check if we're within limits
    return this.requests.length < this.config.requestsPerSecond;
  }

  /**
   * Record a request
   */
  recordRequest(): void {
    this.requests.push(Date.now());
  }

  /**
   * Wait until a request can be made
   */
  async waitForSlot(): Promise<void> {
    while (!this.canMakeRequest()) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    this.recordRequest();
  }
}

/**
 * Mirror Node service implementation
 */
export class MirrorNodeService {
  private config: MirrorNodeConfig;
  private rateLimiter: RateLimiter;

  /**
   * Creates a new MirrorNodeService instance
   *
   * @param config - Optional service configuration
   */
  constructor(config?: Partial<MirrorNodeConfig>) {
    const hederaConfig = getHederaConfig();

    this.config = {
      baseUrl: hederaConfig.mirrorNodeUrl,
      timeout: 30000,
      maxRetries: 3,
      rateLimits: {
        requestsPerSecond: 100,
        burstSize: 200,
      },
      debug: false,
      ...config,
    };

    this.rateLimiter = new RateLimiter(this.config.rateLimits);
  }

  /**
   * Make HTTP request to Mirror Node API with rate limiting and retry logic
   *
   * @param endpoint - API endpoint path
   * @param options - Request options
   * @returns Promise resolving to response data
   * @throws {Error} When request fails after retries
   *
   * @since 1.0.0
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        // Wait for rate limiting slot
        await this.rateLimiter.waitForSlot();

        const url = `${this.config.baseUrl}${endpoint}`;
        this.log(`Making request to: ${url}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.config.timeout
        );

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        this.log(`Request successful:`, data);

        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        this.log(`Request attempt ${attempt + 1} failed:`, lastError.message);

        if (attempt < this.config.maxRetries) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(
      `Mirror Node request failed after ${this.config.maxRetries + 1} attempts: ${lastError?.message}`
    );
  }

  /**
   * Get account information from Mirror Node
   *
   * @param accountId - Account ID to query
   * @returns Promise resolving to account information
   *
   * @example
   * ```typescript
   * const account = await mirrorNodeService.getAccountInfo('0.0.12345');
   * // Display account balance
   * ```
   *
   * @since 1.0.0
   */
  async getAccountInfo(accountId: string): Promise<AccountInfo> {
    return await this.makeRequest<AccountInfo>(`/api/v1/accounts/${accountId}`);
  }

  /**
   * Get transaction information from Mirror Node
   *
   * @param transactionId - Transaction ID to query
   * @returns Promise resolving to transaction information
   *
   * @example
   * ```typescript
   * const tx = await mirrorNodeService.getTransaction('0.0.12345-1234567890-123456789');
   * // Check transaction result
   * ```
   *
   * @since 1.0.0
   */
  async getTransaction(transactionId: string): Promise<TransactionInfo> {
    return await this.makeRequest<TransactionInfo>(
      `/api/v1/transactions/${transactionId}`
    );
  }

  /**
   * Get transactions for an account
   *
   * @param accountId - Account ID to query transactions for
   * @param limit - Maximum number of transactions to return
   * @returns Promise resolving to transactions list
   *
   * @example
   * ```typescript
   * const response = await mirrorNodeService.getAccountTransactions('0.0.12345', 10);
   * // Process transaction data
   * ```
   *
   * @since 1.0.0
   */
  async getAccountTransactions(
    accountId: string,
    limit: number = 25
  ): Promise<MirrorNodeResponse<{ transactions: TransactionInfo[] }>> {
    return await this.makeRequest<
      MirrorNodeResponse<{ transactions: TransactionInfo[] }>
    >(`/api/v1/transactions?account.id=${accountId}&limit=${limit}&order=desc`);
  }

  /**
   * Get HCS topic information
   *
   * @param topicId - Topic ID to query
   * @returns Promise resolving to topic information
   *
   * @example
   * ```typescript
   * const topic = await mirrorNodeService.getTopicInfo('0.0.67890');
   * // Check topic sequence
   * ```
   *
   * @since 1.0.0
   */
  async getTopicInfo(topicId: string): Promise<TopicInfo> {
    return await this.makeRequest<TopicInfo>(`/api/v1/topics/${topicId}`);
  }

  /**
   * Get HCS topic messages
   *
   * @param topicId - Topic ID to query messages for
   * @param limit - Maximum number of messages to return
   * @returns Promise resolving to topic messages
   *
   * @example
   * ```typescript
   * const response = await mirrorNodeService.getTopicMessages('0.0.67890', 50);
   * response.data.messages.forEach(msg => {
   *   // Process HCS message content
   * });
   * ```
   *
   * @since 1.0.0
   */
  async getTopicMessages(
    topicId: string,
    limit: number = 25
  ): Promise<{ messages: TopicMessage[]; links: { next?: string } }> {
    return await this.makeRequest<{
      messages: TopicMessage[];
      links: { next?: string };
    }>(`/api/v1/topics/${topicId}/messages?limit=${limit}&order=desc`);
  }

  /**
   * Get product verification data (ChainTrace-specific method)
   *
   * @param productId - Product ID to look up
   * @returns Promise resolving to product verification data
   *
   * @example
   * ```typescript
   * const product = await mirrorNodeService.getProductVerification('PROD-2024-001');
   * if (product.verified) {
   *   // Product verification successful
   * }
   * ```
   *
   * @since 1.0.0
   */
  async getProductVerification(
    productId: string
  ): Promise<ProductVerificationData> {
    try {
      // Get HCS topic messages related to this product
      const hederaConfig = getHederaConfig();
      if (!hederaConfig.hcsTopicId) {
        throw new Error('HCS Topic ID not configured');
      }

      const messagesResponse = await this.getTopicMessages(
        hederaConfig.hcsTopicId,
        100
      );

      // Filter messages for this product
      const productEvents = messagesResponse.messages
        .map(msg => {
          try {
            const messageContent = Buffer.from(
              msg.message,
              'base64'
            ).toString();
            const eventData = JSON.parse(messageContent);
            return {
              ...eventData,
              timestamp: msg.consensus_timestamp,
              sequence: msg.sequence_number,
            };
          } catch (error) {
            return null;
          }
        })
        .filter(event => event && event.productId === productId)
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

      // Determine verification status
      const verified =
        productEvents.length > 0 &&
        productEvents.some(event => event.eventType === 'verified');

      const status = verified
        ? 'verified'
        : productEvents.length > 0
          ? 'pending'
          : 'rejected';

      return {
        productId,
        verified,
        status,
        events: productEvents.map(event => ({
          timestamp: event.timestamp,
          eventType: event.eventType,
          actor: event.actor?.walletAddress || 'unknown',
          location: event.location?.coordinates,
          data: event.data,
        })),
        lastUpdated:
          productEvents.length > 0
            ? productEvents[0].timestamp
            : new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(
        `Failed to get product verification: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Health check for Mirror Node service
   *
   * @returns Promise resolving to health check result
   *
   * @example
   * ```typescript
   * const health = await mirrorNodeService.healthCheck();
   * // Check Mirror Node health status
   * ```
   *
   * @since 1.0.0
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // Simple health check by querying network nodes
      await this.makeRequest('/api/v1/network/nodes');

      return {
        healthy: true,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        healthy: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get service configuration
   *
   * @returns Current service configuration
   *
   * @since 1.0.0
   */
  getConfig(): MirrorNodeConfig {
    return { ...this.config };
  }

  /**
   * Internal logging method
   */
  private log(message: string, data?: any): void {
    if (this.config.debug) {
      logger.debug(message, {
        component: 'MirrorNodeService',
        ...data,
      });
    } else {
      logger.info(message, {
        component: 'MirrorNodeService',
        ...data,
      });
    }
  }
}

/**
 * Singleton instance for global access
 */
let mirrorNodeServiceInstance: MirrorNodeService | null = null;

/**
 * Gets or creates the singleton MirrorNodeService instance
 *
 * @param config - Optional configuration for new instance
 * @returns The singleton MirrorNodeService instance
 *
 * @example
 * ```typescript
 * const mirrorNodeService = getMirrorNodeService();
 * const account = await mirrorNodeService.getAccountInfo('0.0.12345');
 * ```
 *
 * @since 1.0.0
 */
export function getMirrorNodeService(
  config?: Partial<MirrorNodeConfig>
): MirrorNodeService {
  if (!mirrorNodeServiceInstance) {
    mirrorNodeServiceInstance = new MirrorNodeService(config);
  }
  return mirrorNodeServiceInstance;
}

/**
 * Resets the singleton instance (primarily for testing)
 *
 * @since 1.0.0
 */
export function resetMirrorNodeService(): void {
  mirrorNodeServiceInstance = null;
}
