/**
 * Browser storage management interface and implementations
 *
 * @since 1.4.0
 */

/**
 * Generic storage interface for different storage backends
 *
 * @interface StorageManager
 * @since 1.4.0
 *
 * @example
 * ```typescript
 * const storage = new LocalStorageManager();
 * await storage.set('product:CT-2024-001-ABC123', productData, 300000); // 5 min TTL
 * const product = await storage.get<Product>('product:CT-2024-001-ABC123');
 * ```
 */
export interface StorageManager {
  /**
   * Store a value with optional TTL
   * @param key - Storage key
   * @param value - Value to store
   * @param ttl - Time to live in milliseconds
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void>;

  /**
   * Retrieve a value by key
   * @param key - Storage key
   * @returns Value or null if not found/expired
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Remove a value by key
   * @param key - Storage key
   */
  remove(key: string): Promise<void>;

  /**
   * Clear all storage
   */
  clear(): Promise<void>;

  /**
   * Check if key exists and is not expired
   * @param key - Storage key
   */
  has(key: string): Promise<boolean>;

  /**
   * Get all keys matching pattern
   * @param pattern - Key pattern (simple glob)
   */
  keys(pattern?: string): Promise<string[]>;
}

/**
 * Storage item with metadata
 */
interface StorageItem<T = any> {
  value: T;
  timestamp: number;
  ttl?: number;
}

/**
 * Local storage implementation with TTL support
 *
 * @class LocalStorageManager
 * @implements {StorageManager}
 * @since 1.4.0
 */
export class LocalStorageManager implements StorageManager {
  private prefix: string;

  constructor(prefix = 'chaintrace:') {
    this.prefix = prefix;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const item: StorageItem<T> = {
        value,
        timestamp: Date.now(),
        ttl,
      };

      const serialized = JSON.stringify(item, (_key, value) => {
        // Handle Date objects
        if (value instanceof Date) {
          return { __type: 'Date', value: value.toISOString() };
        }
        return value;
      });

      localStorage.setItem(this.prefix + key, serialized);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        // Clear expired items and try again
        await this.clearExpired();
        try {
          const item: StorageItem<T> = {
            value,
            timestamp: Date.now(),
            ttl,
          };
          localStorage.setItem(this.prefix + key, JSON.stringify(item));
        } catch {
          throw new Error('Storage quota exceeded after cleanup');
        }
      } else {
        throw error;
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const serialized = localStorage.getItem(this.prefix + key);
      if (!serialized) {
        return null;
      }

      const item: StorageItem<T> = JSON.parse(serialized, (_key, value) => {
        // Handle Date objects
        if (value && typeof value === 'object' && value.__type === 'Date') {
          return new Date(value.value);
        }
        return value;
      });

      // Check if expired
      if (item.ttl && Date.now() > item.timestamp + item.ttl) {
        await this.remove(key);
        return null;
      }

      return item.value;
    } catch {
      // Invalid JSON or other error, remove the key
      await this.remove(key);
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    localStorage.removeItem(this.prefix + key);
  }

  async clear(): Promise<void> {
    const keys = await this.keys();
    for (const key of keys) {
      localStorage.removeItem(this.prefix + key);
    }
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  async keys(pattern?: string): Promise<string[]> {
    const allKeys: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        const unprefixed = key.substring(this.prefix.length);
        if (!pattern || this.matchesPattern(unprefixed, pattern)) {
          allKeys.push(unprefixed);
        }
      }
    }

    return allKeys;
  }

  /**
   * Clear expired items from storage
   */
  private async clearExpired(): Promise<void> {
    const keys = await this.keys();
    for (const key of keys) {
      // This will automatically remove expired items
      await this.get(key);
    }
  }

  /**
   * Simple pattern matching (supports * wildcards)
   */
  private matchesPattern(str: string, pattern: string): boolean {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(str);
  }
}

/**
 * Session storage implementation with TTL support
 *
 * @class SessionStorageManager
 * @implements {StorageManager}
 * @since 1.4.0
 */
export class SessionStorageManager implements StorageManager {
  private prefix: string;

  constructor(prefix = 'chaintrace:') {
    this.prefix = prefix;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const item: StorageItem<T> = {
      value,
      timestamp: Date.now(),
      ttl,
    };

    const serialized = JSON.stringify(item, (_key, value) => {
      if (value instanceof Date) {
        return { __type: 'Date', value: value.toISOString() };
      }
      return value;
    });

    sessionStorage.setItem(this.prefix + key, serialized);
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const serialized = sessionStorage.getItem(this.prefix + key);
      if (!serialized) {
        return null;
      }

      const item: StorageItem<T> = JSON.parse(serialized, (_key, value) => {
        if (value && typeof value === 'object' && value.__type === 'Date') {
          return new Date(value.value);
        }
        return value;
      });

      // Check if expired
      if (item.ttl && Date.now() > item.timestamp + item.ttl) {
        await this.remove(key);
        return null;
      }

      return item.value;
    } catch {
      await this.remove(key);
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    sessionStorage.removeItem(this.prefix + key);
  }

  async clear(): Promise<void> {
    const keys = await this.keys();
    for (const key of keys) {
      sessionStorage.removeItem(this.prefix + key);
    }
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  async keys(pattern?: string): Promise<string[]> {
    const allKeys: string[] = [];

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        const unprefixed = key.substring(this.prefix.length);
        if (!pattern || this.matchesPattern(unprefixed, pattern)) {
          allKeys.push(unprefixed);
        }
      }
    }

    return allKeys;
  }

  private matchesPattern(str: string, pattern: string): boolean {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(str);
  }
}

/**
 * In-memory storage implementation for testing
 *
 * @class MemoryStorageManager
 * @implements {StorageManager}
 * @since 1.4.0
 */
export class MemoryStorageManager implements StorageManager {
  private storage = new Map<string, StorageItem>();

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    this.storage.set(key, {
      value,
      timestamp: Date.now(),
      ttl,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const item = this.storage.get(key);
    if (!item) {
      return null;
    }

    // Check if expired
    if (item.ttl && Date.now() > item.timestamp + item.ttl) {
      this.storage.delete(key);
      return null;
    }

    return item.value as T;
  }

  async remove(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  async keys(pattern?: string): Promise<string[]> {
    const allKeys = Array.from(this.storage.keys());
    if (!pattern) {
      return allKeys;
    }

    return allKeys.filter(key => this.matchesPattern(key, pattern));
  }

  private matchesPattern(str: string, pattern: string): boolean {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(str);
  }
}
