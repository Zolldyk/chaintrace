/**
 * Cache management service for Mirror Node responses and product data
 *
 * @since 1.4.0
 */

import {
  StorageManager,
  LocalStorageManager,
  SessionStorageManager,
} from '../storage/StorageManager';
import type { ProductVerificationResponse } from '../../types/product';
import type { ServiceHealth } from '../../types/hedera';

/**
 * Cache configuration options
 */
export interface CacheConfig {
  /** Default TTL in milliseconds */
  defaultTtl: number;

  /** Maximum cache size (number of items) */
  maxSize?: number;

  /** Storage backend to use */
  storageType: 'localStorage' | 'sessionStorage' | 'memory';

  /** Cache key prefix */
  prefix?: string;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Total number of cached items */
  size: number;

  /** Cache hit rate (0-1) */
  hitRate: number;

  /** Total cache hits */
  hits: number;

  /** Total cache misses */
  misses: number;

  /** Last cache clear timestamp */
  lastCleared: Date | null;
}

/**
 * Cache service for managing Mirror Node responses and product data
 *
 * @class CacheService
 * @since 1.4.0
 *
 * @example
 * ```typescript
 * const cache = new CacheService({
 *   defaultTtl: 300000, // 5 minutes
 *   storageType: 'localStorage'
 * });
 *
 * // Cache product verification result
 * await cache.setProductVerification('CT-2024-001-ABC123', verificationData);
 *
 * // Retrieve from cache
 * const cached = await cache.getProductVerification('CT-2024-001-ABC123');
 * ```
 */
export class CacheService {
  private storage: StorageManager;
  private config: Required<CacheConfig>;
  private stats: CacheStats;

  constructor(config: CacheConfig) {
    this.config = {
      maxSize: 1000,
      prefix: 'cache:',
      ...config,
    };

    // Initialize storage backend
    switch (config.storageType) {
      case 'localStorage':
        this.storage = new LocalStorageManager(this.config.prefix);
        break;
      case 'sessionStorage':
        this.storage = new SessionStorageManager(this.config.prefix);
        break;
      case 'memory':
      default:
        // Use localStorage as fallback since MemoryStorageManager is for testing
        this.storage = new LocalStorageManager(this.config.prefix);
        break;
    }

    // Initialize stats
    this.stats = {
      size: 0,
      hitRate: 0,
      hits: 0,
      misses: 0,
      lastCleared: null,
    };
  }

  /**
   * Cache product verification response with 5-minute TTL
   */
  async setProductVerification(
    productId: string,
    data: ProductVerificationResponse,
    ttl?: number
  ): Promise<void> {
    const key = `product:verification:${productId}`;
    await this.storage.set(key, data, ttl || this.config.defaultTtl);
    await this.updateStats();
  }

  /**
   * Retrieve cached product verification response
   */
  async getProductVerification(
    productId: string
  ): Promise<ProductVerificationResponse | null> {
    const key = `product:verification:${productId}`;
    const data = await this.storage.get<ProductVerificationResponse>(key);

    if (data) {
      this.stats.hits++;
    } else {
      this.stats.misses++;
    }

    this.updateHitRate();
    return data;
  }

  /**
   * Cache service health check with 1-minute TTL
   */
  async setServiceHealth(
    service: string,
    health: ServiceHealth
  ): Promise<void> {
    const key = `service:health:${service}`;
    await this.storage.set(key, health, 60000); // 1 minute TTL
  }

  /**
   * Retrieve cached service health
   */
  async getServiceHealth(service: string): Promise<ServiceHealth | null> {
    const key = `service:health:${service}`;
    const data = await this.storage.get<ServiceHealth>(key);

    if (data) {
      this.stats.hits++;
    } else {
      this.stats.misses++;
    }

    this.updateHitRate();
    return data;
  }

  /**
   * Cache wallet connection state (persistent across sessions)
   */
  async setWalletState(accountId: string, state: any): Promise<void> {
    const key = `wallet:state:${accountId}`;
    // Wallet state doesn't expire automatically
    await this.storage.set(key, state);
  }

  /**
   * Retrieve cached wallet state
   */
  async getWalletState(accountId: string): Promise<any | null> {
    const key = `wallet:state:${accountId}`;
    return await this.storage.get(key);
  }

  /**
   * Cache Mirror Node response with custom TTL
   */
  async setMirrorNodeResponse(
    endpoint: string,
    params: Record<string, any>,
    response: any,
    ttl?: number
  ): Promise<void> {
    const key = `mirrornode:${endpoint}:${this.hashParams(params)}`;
    await this.storage.set(key, response, ttl || this.config.defaultTtl);
    await this.updateStats();
  }

  /**
   * Retrieve cached Mirror Node response
   */
  async getMirrorNodeResponse(
    endpoint: string,
    params: Record<string, any>
  ): Promise<any | null> {
    const key = `mirrornode:${endpoint}:${this.hashParams(params)}`;
    const data = await this.storage.get(key);

    if (data) {
      this.stats.hits++;
    } else {
      this.stats.misses++;
    }

    this.updateHitRate();
    return data;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    await this.storage.clear();
    this.stats = {
      size: 0,
      hitRate: 0,
      hits: 0,
      misses: 0,
      lastCleared: new Date(),
    };
  }

  /**
   * Clear expired cache entries
   */
  async clearExpired(): Promise<void> {
    const keys = await this.storage.keys();
    for (const key of keys) {
      // This will automatically remove expired items
      await this.storage.get(key);
    }
    await this.updateStats();
  }

  /**
   * Clear cache entries matching pattern
   */
  async clearPattern(pattern: string): Promise<void> {
    const keys = await this.storage.keys(pattern);
    for (const key of keys) {
      await this.storage.remove(key);
    }
    await this.updateStats();
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Check if cache has reached size limit and cleanup if needed
   */
  async enforceMaxSize(): Promise<void> {
    if (!this.config.maxSize) {
      return;
    }

    const keys = await this.storage.keys();
    if (keys.length > this.config.maxSize) {
      // Remove oldest entries (simple LRU approximation)
      const toRemove = keys.slice(0, keys.length - this.config.maxSize);
      for (const key of toRemove) {
        await this.storage.remove(key);
      }
      await this.updateStats();
    }
  }

  /**
   * Generate cache key hash for parameters
   */
  private hashParams(params: Record<string, any>): string {
    const sorted = Object.keys(params)
      .sort()
      .reduce(
        (result, key) => {
          result[key] = params[key];
          return result;
        },
        {} as Record<string, any>
      );

    return btoa(JSON.stringify(sorted)).replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * Update cache statistics
   */
  private async updateStats(): Promise<void> {
    const keys = await this.storage.keys();
    this.stats.size = keys.length;
    this.updateHitRate();
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }
}

/**
 * Default cache service instance
 */
export const cacheService = new CacheService({
  defaultTtl: 300000, // 5 minutes
  storageType: 'localStorage',
  maxSize: 1000,
});
