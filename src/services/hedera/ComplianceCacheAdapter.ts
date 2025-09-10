/**
 * Cache adapter for compliance rule engine operations.
 * Provides a generic cache interface wrapping the existing CacheService.
 *
 * @class ComplianceCacheAdapter
 * @since 2.1.0
 *
 * @example
 * ```typescript
 * const cacheAdapter = new ComplianceCacheAdapter(cacheService);
 * await cacheAdapter.set('key', { data: 'value' }, 3600);
 * const value = await cacheAdapter.get('key');
 * ```
 */

import type { CacheService } from '../../lib/cache/CacheService';

/**
 * Generic cache interface for compliance operations
 *
 * @interface ComplianceCache
 * @since 2.1.0
 */
export interface ComplianceCache {
  /**
   * Store a value in cache with optional TTL
   *
   * @param key - Cache key
   * @param value - Value to store
   * @param options - Cache options including TTL
   * @returns Promise that resolves when value is stored
   */
  set<T>(key: string, value: T, options?: { ttl?: number }): Promise<void>;

  /**
   * Retrieve a value from cache
   *
   * @param key - Cache key
   * @returns Promise resolving to cached value or null if not found
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Remove a value from cache
   *
   * @param key - Cache key
   * @returns Promise that resolves when value is removed
   */
  remove(key: string): Promise<void>;

  /**
   * Clear cache entries matching a pattern
   *
   * @param pattern - Key pattern to match
   * @returns Promise that resolves when matching entries are cleared
   */
  clearPattern(pattern: string): Promise<void>;
}

/**
 * Cache adapter implementation using existing CacheService
 *
 * @class ComplianceCacheAdapter
 * @implements ComplianceCache
 * @since 2.1.0
 */
export class ComplianceCacheAdapter implements ComplianceCache {
  private cache: Map<string, { value: any; expiresAt: number }>;

  constructor(_cacheService: CacheService) {
    // Use in-memory cache for compliance-specific operations
    // The CacheService parameter is kept for future integration
    this.cache = new Map();
  }

  /**
   * Store a value in cache with TTL
   *
   * @param key - Cache key
   * @param value - Value to store
   * @param options - Cache options
   * @returns Promise that resolves when stored
   */
  async set<T>(key: string, value: T, options?: { ttl?: number }): Promise<void> {
    const ttl = options?.ttl || 3600; // Default 1 hour
    const expiresAt = Date.now() + (ttl * 1000);

    this.cache.set(key, {
      value,
      expiresAt
    });
  }

  /**
   * Retrieve a value from cache
   *
   * @param key - Cache key
   * @returns Promise resolving to cached value or null
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Remove a value from cache
   *
   * @param key - Cache key
   * @returns Promise that resolves when removed
   */
  async remove(key: string): Promise<void> {
    this.cache.delete(key);
  }

  /**
   * Clear cache entries matching a pattern
   *
   * @param pattern - Key pattern to match (simple prefix matching)
   * @returns Promise that resolves when cleared
   */
  async clearPattern(pattern: string): Promise<void> {
    const keysToRemove: string[] = [];

    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      this.cache.delete(key);
    }
  }

  /**
   * Clean up expired entries
   *
   * @returns Promise that resolves when cleanup is complete
   */
  async cleanup(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
    }
  }

  /**
   * Get cache statistics
   *
   * @returns Cache statistics object
   */
  getStats(): {
    size: number;
    expiredCount: number;
  } {
    const now = Date.now();
    let expiredCount = 0;

    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) {
        expiredCount++;
      }
    }

    return {
      size: this.cache.size,
      expiredCount
    };
  }
}