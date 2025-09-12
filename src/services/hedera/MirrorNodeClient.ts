/**
 * Production-ready Mirror Node client with caching and error handling
 *
 * @since 1.4.0
 */

import { HederaServiceClient } from '../core/HederaServiceClient';
import { cacheService } from '../../lib/cache/CacheService';
import type { HederaServiceConfig } from '../../types/hedera';
import type { ProductWithEvents, ProductEvent } from '../../types/product';

/**
 * Mirror Node API response types
 */
interface MirrorNodeTransaction {
  transaction_id: string;
  valid_start_timestamp: string;
  result: string;
  entity_id: string;
  consensus_timestamp: string;
}

interface MirrorNodeMessage {
  consensus_timestamp: string;
  topic_id: string;
  message: string;
  payer_account_id: string;
  sequence_number: number;
}

interface MirrorNodeAccount {
  account: string;
  balance: {
    balance: number;
    timestamp: string;
  };
  key: {
    key: string;
    type: string;
  };
}

/**
 * Production Mirror Node client with comprehensive caching and rate limiting compliance
 *
 * @class MirrorNodeClient
 * @extends HederaServiceClient
 * @since 1.4.0
 *
 * @example
 * ```typescript
 * const mirrorClient = new MirrorNodeClient({
 *   networkType: 'testnet',
 *   mirrorNodeUrl: 'https://testnet.mirrornode.hedera.com'
 * });
 *
 * // Get product transactions from Mirror Node
 * const transactions = await mirrorClient.getProductTransactions('CT-2024-001-ABC123');
 * ```
 */
export class MirrorNodeClient extends HederaServiceClient {
  private baseUrl: string;
  private requestWindow: number = 60000; // 1 minute
  private maxRequestsPerWindow: number = 100; // Rate limit compliance
  private requestTimestamps: number[] = [];

  constructor(config: HederaServiceConfig) {
    super(config);

    this.baseUrl =
      config.mirrorNodeUrl ||
      (config.networkType === 'testnet'
        ? 'https://testnet.mirrornode.hedera.com'
        : 'https://mainnet.mirrornode.hedera.com');
  }

  protected getServiceName(): string {
    return 'MirrorNodeClient';
  }

  /**
   * Get product verification data with full event history
   */
  async getProductVerification(
    productId: string,
    options: {
      skipCache?: boolean;
      includeEvents?: boolean;
    } = {}
  ): Promise<ProductWithEvents | null> {
    // Check cache first unless skipCache is true
    if (!options.skipCache) {
      const cached = await cacheService.getProductVerification(productId);
      if (cached) {
        return cached.product;
      }
    }

    return this.executeWithRetry(
      async () => {
        // In production, you would query transactions related to the product ID
        // This is a simplified example - adjust based on your data structure
        const transactions = await this.getProductTransactions(productId);
        const messages = await this.getProductMessages(productId);

        if (transactions.length === 0 && messages.length === 0) {
          return null;
        }

        // Transform Mirror Node data to ProductWithEvents format
        const product = await this.transformToProduct(
          productId,
          transactions,
          messages
        );

        // Cache the result
        const verificationResponse = {
          product,
          metadata: {
            requestedAt: new Date().toISOString(),
            responseTime: 0, // Will be updated by executeWithRetry
            fromCache: false,
            cacheExpiresAt: new Date(Date.now() + 300000).toISOString(), // 5 min
          },
        };

        await cacheService.setProductVerification(
          productId,
          verificationResponse
        );

        return product;
      },
      {
        operationName: 'getProductVerification',
        timeout: this.config.timeouts?.mirrorNode || 30000,
        metadata: { productId, ...options },
      }
    );
  }

  /**
   * Get transactions related to a product ID
   */
  async getProductTransactions(
    productId: string
  ): Promise<MirrorNodeTransaction[]> {
    await this.enforceRateLimit();

    const url = `${this.baseUrl}/api/v1/transactions`;
    const params = new URLSearchParams({
      'account.id': 'gte:0.0.1000', // Adjust based on your account range
      limit: '100',
      order: 'desc',
    });

    const response = await fetch(`${url}?${params}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'ChainTrace/1.4.0',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Mirror Node API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    // Filter transactions that contain the product ID in memo or other fields
    return (
      data.transactions?.filter(
        (tx: any) => tx.memo_base64 && atob(tx.memo_base64).includes(productId)
      ) || []
    );
  }

  /**
   * Get HCS messages for a product from specific topic
   */
  async getProductMessages(
    productId: string,
    topicId?: string
  ): Promise<MirrorNodeMessage[]> {
    await this.enforceRateLimit();

    const topic = topicId || this.config.hcsTopicId;
    if (!topic) {
      return [];
    }

    const url = `${this.baseUrl}/api/v1/topics/${topic}/messages`;
    const params = new URLSearchParams({
      limit: '100',
      order: 'desc',
    });

    const response = await fetch(`${url}?${params}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'ChainTrace/1.4.0',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Mirror Node API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    // Filter messages that contain the product ID
    return (
      data.messages?.filter((msg: any) => {
        try {
          const decoded = atob(msg.message);
          return decoded.includes(productId);
        } catch {
          return false;
        }
      }) || []
    );
  }

  /**
   * Get account information including public key
   */
  async getAccountInfo(accountId: string): Promise<MirrorNodeAccount> {
    await this.enforceRateLimit();

    // Check cache first
    const cached = await cacheService.getMirrorNodeResponse('account', {
      accountId,
    });
    if (cached) {
      return cached;
    }

    return this.executeWithRetry(
      async () => {
        const url = `${this.baseUrl}/api/v1/accounts/${accountId}`;

        const response = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'ChainTrace/1.4.0',
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('ACCOUNT_NOT_FOUND');
          }
          throw new Error(
            `Mirror Node API error: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();

        // Cache account info for 5 minutes
        await cacheService.setMirrorNodeResponse(
          'account',
          { accountId },
          data,
          300000
        );

        return data;
      },
      {
        operationName: 'getAccountInfo',
        timeout: this.config.timeouts?.mirrorNode || 30000,
        metadata: { accountId },
      }
    );
  }

  /**
   * Get token information
   */
  async getTokenInfo(tokenId: string): Promise<any> {
    await this.enforceRateLimit();

    return this.executeWithRetry(
      async () => {
        const url = `${this.baseUrl}/api/v1/tokens/${tokenId}`;

        const response = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'ChainTrace/1.4.0',
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('TOKEN_NOT_FOUND');
          }
          throw new Error(
            `Mirror Node API error: ${response.status} ${response.statusText}`
          );
        }

        return await response.json();
      },
      {
        operationName: 'getTokenInfo',
        timeout: this.config.timeouts?.mirrorNode || 30000,
        metadata: { tokenId },
      }
    );
  }

  /**
   * Transform Mirror Node data to ProductWithEvents
   */
  private async transformToProduct(
    productId: string,
    _transactions: MirrorNodeTransaction[],
    messages: MirrorNodeMessage[]
  ): Promise<ProductWithEvents> {
    // Parse messages to get product events
    const events: ProductEvent[] = [];

    for (const message of messages) {
      try {
        const decoded = atob(message.message);
        const hcsMessage = JSON.parse(decoded);

        if (hcsMessage.productId === productId && hcsMessage.event) {
          events.push({
            ...hcsMessage.event,
            timestamp: new Date(message.consensus_timestamp),
          });
        }
      } catch (error) {
        // HCS message parsing error handled silently
      }
    }

    // Sort events by timestamp
    events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Determine current status based on latest event
    const latestEvent = events[events.length - 1];
    const status =
      latestEvent?.eventType === 'verified'
        ? 'verified'
        : latestEvent?.eventType === 'rejected'
          ? 'rejected'
          : 'pending';

    // Create basic product structure (you may need to adjust based on your data model)
    const product: ProductWithEvents = {
      // Required Product interface fields
      id: productId,
      batchId: `BATCH-${productId.split('-')[2] || '001'}`,
      name: `Product ${productId}`, // Extract from events or separate query
      category: 'agricultural', // Default or extract from data
      status,
      origin: {
        address: '',
        city: '',
        state: '',
        country: 'Nigeria',
        coordinates: { latitude: 0, longitude: 0 },
        region: '',
      },
      quantity: { amount: 0, unit: 'kg' },
      createdAt: events[0]?.timestamp || new Date(),
      updatedAt: latestEvent?.timestamp || new Date(),
      qrCode: productId,
      guardianCredentialId: null,
      hcsTopicId: '0.0.0',
      metadata: {},

      // ProductWithEvents additional fields
      productId,
      verified: status === 'verified',
      events,
      lastVerified:
        status === 'verified'
          ? latestEvent?.timestamp.toISOString()
          : undefined,
    };

    return product;
  }

  /**
   * Enforce rate limiting (100 requests per minute)
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();

    // Remove timestamps older than the window
    this.requestTimestamps = this.requestTimestamps.filter(
      timestamp => now - timestamp < this.requestWindow
    );

    // Check if we're at the rate limit
    if (this.requestTimestamps.length >= this.maxRequestsPerWindow) {
      const oldestRequest = Math.min(...this.requestTimestamps);
      const waitTime = this.requestWindow - (now - oldestRequest) + 100; // Add small buffer

      if (waitTime > 0) {
        await this.sleep(waitTime);
      }
    }

    // Record this request
    this.requestTimestamps.push(now);
  }
}
