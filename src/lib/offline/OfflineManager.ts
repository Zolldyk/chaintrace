/**
 * Offline data management and synchronization capabilities
 *
 * @since 1.4.0
 */

import { StorageManager, LocalStorageManager } from '../storage/StorageManager';

/**
 * Offline operation types
 */
export type OfflineOperation =
  | 'product_create'
  | 'product_update'
  | 'event_log'
  | 'verification_request';

/**
 * Queued operation for offline sync
 */
export interface QueuedOperation {
  /** Unique operation ID */
  id: string;

  /** Type of operation */
  type: OfflineOperation;

  /** Operation payload */
  payload: any;

  /** Timestamp when queued */
  queuedAt: Date;

  /** Number of retry attempts */
  retryCount: number;

  /** Maximum retry attempts */
  maxRetries: number;

  /** Operation priority (higher = more important) */
  priority: number;

  /** Whether operation requires network */
  requiresNetwork: boolean;
}

/**
 * Offline sync status
 */
export interface SyncStatus {
  /** Whether currently syncing */
  syncing: boolean;

  /** Number of queued operations */
  queuedOperations: number;

  /** Last successful sync timestamp */
  lastSync: Date | null;

  /** Sync error if any */
  lastError: string | null;

  /** Network connectivity status */
  isOnline: boolean;
}

/**
 * Offline manager for handling data synchronization and queuing
 *
 * @class OfflineManager
 * @since 1.4.0
 *
 * @example
 * ```typescript
 * const offlineManager = new OfflineManager();
 *
 * // Queue operation for later sync
 * await offlineManager.queueOperation('product_create', productData);
 *
 * // Sync when network is available
 * await offlineManager.sync();
 * ```
 */
export class OfflineManager {
  private storage: StorageManager;
  private syncStatus: SyncStatus;
  private syncCallbacks: Array<(operation: QueuedOperation) => Promise<void>> =
    [];

  constructor() {
    this.storage = new LocalStorageManager('offline:');
    this.syncStatus = {
      syncing: false,
      queuedOperations: 0,
      lastSync: null,
      lastError: null,
      isOnline: navigator.onLine,
    };

    // Listen for online/offline events
    this.setupNetworkListeners();

    // Initialize queue count
    this.updateQueueCount();
  }

  /**
   * Queue an operation for later synchronization
   */
  async queueOperation(
    type: OfflineOperation,
    payload: any,
    options: {
      priority?: number;
      maxRetries?: number;
      requiresNetwork?: boolean;
    } = {}
  ): Promise<string> {
    const operation: QueuedOperation = {
      id: this.generateOperationId(),
      type,
      payload,
      queuedAt: new Date(),
      retryCount: 0,
      maxRetries: options.maxRetries ?? 3,
      priority: options.priority ?? 0,
      requiresNetwork: options.requiresNetwork ?? true,
    };

    const queueKey = `queue:${operation.id}`;
    await this.storage.set(queueKey, operation);

    await this.updateQueueCount();

    // Auto-sync if online
    if (this.syncStatus.isOnline && !this.syncStatus.syncing) {
      // Don't await to avoid blocking
      this.sync().catch(console.error);
    }

    return operation.id;
  }

  /**
   * Get all queued operations
   */
  async getQueuedOperations(): Promise<QueuedOperation[]> {
    const keys = await this.storage.keys('queue:*');
    const operations: QueuedOperation[] = [];

    for (const key of keys) {
      const operation = await this.storage.get<QueuedOperation>(key);
      if (operation) {
        operations.push(operation);
      }
    }

    // Sort by priority (higher first) then by queued time
    return operations.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.queuedAt.getTime() - b.queuedAt.getTime();
    });
  }

  /**
   * Remove operation from queue
   */
  async removeOperation(operationId: string): Promise<void> {
    const queueKey = `queue:${operationId}`;
    await this.storage.remove(queueKey);
    await this.updateQueueCount();
  }

  /**
   * Register callback for processing sync operations
   */
  onSync(callback: (operation: QueuedOperation) => Promise<void>): void {
    this.syncCallbacks.push(callback);
  }

  /**
   * Synchronize all queued operations
   */
  async sync(): Promise<void> {
    if (this.syncStatus.syncing || !this.syncStatus.isOnline) {
      return;
    }

    this.syncStatus.syncing = true;
    this.syncStatus.lastError = null;

    try {
      const operations = await this.getQueuedOperations();

      for (const operation of operations) {
        if (operation.requiresNetwork && !this.syncStatus.isOnline) {
          continue; // Skip network operations when offline
        }

        try {
          // Process operation through registered callbacks
          for (const callback of this.syncCallbacks) {
            await callback(operation);
          }

          // Remove successful operation
          await this.removeOperation(operation.id);
        } catch (error) {
          console.error(`Failed to sync operation ${operation.id}:`, error);

          // Increment retry count
          operation.retryCount++;

          if (operation.retryCount >= operation.maxRetries) {
            // Move to failed operations
            await this.moveToFailed(operation);
            await this.removeOperation(operation.id);
          } else {
            // Update operation with new retry count
            const queueKey = `queue:${operation.id}`;
            await this.storage.set(queueKey, operation);
          }
        }
      }

      this.syncStatus.lastSync = new Date();
    } catch (error) {
      this.syncStatus.lastError =
        error instanceof Error ? error.message : 'Unknown sync error';
      console.error('Sync failed:', error);
    } finally {
      this.syncStatus.syncing = false;
      await this.updateQueueCount();
    }
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Clear all queued operations
   */
  async clearQueue(): Promise<void> {
    const keys = await this.storage.keys('queue:*');
    for (const key of keys) {
      await this.storage.remove(key);
    }
    await this.updateQueueCount();
  }

  /**
   * Get failed operations
   */
  async getFailedOperations(): Promise<QueuedOperation[]> {
    const keys = await this.storage.keys('failed:*');
    const operations: QueuedOperation[] = [];

    for (const key of keys) {
      const operation = await this.storage.get<QueuedOperation>(key);
      if (operation) {
        operations.push(operation);
      }
    }

    return operations;
  }

  /**
   * Retry failed operation
   */
  async retryFailedOperation(operationId: string): Promise<void> {
    const failedKey = `failed:${operationId}`;
    const operation = await this.storage.get<QueuedOperation>(failedKey);

    if (operation) {
      // Reset retry count and move back to queue
      operation.retryCount = 0;
      await this.storage.remove(failedKey);

      const queueKey = `queue:${operationId}`;
      await this.storage.set(queueKey, operation);

      await this.updateQueueCount();
    }
  }

  /**
   * Setup network connectivity listeners
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.syncStatus.isOnline = true;
      // Auto-sync when coming back online
      this.sync().catch(console.error);
    });

    window.addEventListener('offline', () => {
      this.syncStatus.isOnline = false;
    });
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update queued operations count
   */
  private async updateQueueCount(): Promise<void> {
    const keys = await this.storage.keys('queue:*');
    this.syncStatus.queuedOperations = keys.length;
  }

  /**
   * Move operation to failed operations
   */
  private async moveToFailed(operation: QueuedOperation): Promise<void> {
    const failedKey = `failed:${operation.id}`;
    await this.storage.set(failedKey, operation);
  }
}

/**
 * Default offline manager instance
 */
export const offlineManager = new OfflineManager();
