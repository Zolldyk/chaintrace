/**
 * HCS Failure Handler for Dead Letter Queue and Manual Retry Management
 * Handles permanently failed HCS events and provides manual retry interface
 *
 * @since 2.3.0
 */

import { HCSEventMessage, HCSOperationResult } from '@/types/hedera';
import { HederaError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { cacheService } from '@/lib/cache/CacheService';

/**
 * Failed HCS operation record
 *
 * @interface FailedHCSOperation
 * @since 2.3.0
 */
export interface FailedHCSOperation {
  /** Unique failure ID */
  id: string;

  /** Original HCS event message */
  eventMessage: HCSEventMessage;

  /** Number of retry attempts made */
  retryAttempts: number;

  /** First failure timestamp */
  firstFailedAt: Date;

  /** Last retry attempt timestamp */
  lastRetryAt: Date;

  /** Last error details */
  lastError: {
    code: string;
    message: string;
    retryable: boolean;
  };

  /** Failure reason category */
  failureCategory:
    | 'network'
    | 'validation'
    | 'rate_limit'
    | 'service'
    | 'unknown';

  /** Whether this failure has been manually reviewed */
  reviewed: boolean;

  /** Optional manual review notes */
  reviewNotes?: string;

  /** Priority level for manual retry */
  priority: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * HCS Failure Statistics
 *
 * @interface FailureStatistics
 * @since 2.3.0
 */
export interface FailureStatistics {
  /** Total number of failed operations */
  totalFailures: number;

  /** Failures by category */
  failuresByCategory: Record<string, number>;

  /** Failures by error code */
  failuresByErrorCode: Record<string, number>;

  /** Recent failure trend (last 24 hours) */
  recentFailures: number;

  /** Average retry attempts before failure */
  averageRetryAttempts: number;

  /** Success rate after manual retry */
  manualRetrySuccessRate: number;
}

/**
 * HCS Failure Handler for managing failed operations
 *
 * @class HCSFailureHandler
 * @since 2.3.0
 *
 * @example
 * ```typescript
 * const failureHandler = new HCSFailureHandler();
 *
 * // Record a failed operation
 * await failureHandler.recordFailure(eventMessage, result);
 *
 * // Get failed operations for manual review
 * const failures = await failureHandler.getFailedOperations({ priority: 'high' });
 *
 * // Manually retry failed operations
 * const retryResult = await failureHandler.manualRetry(failureId);
 * ```
 */
export class HCSFailureHandler {
  private readonly DEAD_LETTER_CACHE_KEY = 'hcs:dead_letter_queue';
  private readonly FAILURE_STATS_CACHE_KEY = 'hcs:failure_stats';
  private readonly CACHE_TTL = 86400 * 7; // 7 days

  /**
   * Records a permanently failed HCS operation to the dead letter queue
   *
   * @param eventMessage - Original HCS event message that failed
   * @param operationResult - Failed operation result with error details
   * @returns Promise resolving to failure record ID
   *
   * @throws {ApiError} When recording fails
   *
   * @example
   * ```typescript
   * const failureId = await failureHandler.recordFailure(eventMessage, {
   *   success: false,
   *   error: {
   *     code: 'HCS_RETRY_EXHAUSTED',
   *     message: 'Failed after 3 retries',
   *     retryable: false
   *   }
   * });
   * ```
   *
   * @since 2.3.0
   */
  async recordFailure(
    eventMessage: HCSEventMessage,
    operationResult: HCSOperationResult
  ): Promise<string> {
    try {
      const failureId = `hcs_failure_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      const failureRecord: FailedHCSOperation = {
        id: failureId,
        eventMessage,
        retryAttempts: operationResult.metadata?.retryAttempts || 0,
        firstFailedAt: new Date(),
        lastRetryAt: new Date(),
        lastError: operationResult.error || {
          code: 'UNKNOWN_ERROR',
          message: 'Unknown error occurred',
          retryable: false,
        },
        failureCategory: this.categorizeFailure(
          operationResult.error?.code || 'UNKNOWN_ERROR'
        ),
        reviewed: false,
        priority: this.determinePriority(eventMessage, operationResult),
      };

      // Store in dead letter queue
      await this.addToDeadLetterQueue(failureRecord);

      // Update failure statistics
      await this.updateFailureStatistics(failureRecord);

      logger.error('HCS operation recorded in dead letter queue');

      return failureId;
    } catch (error) {
      throw new HederaError(
        `Failed to record HCS failure: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          hederaStatus: 'FAILURE_RECORD_ERROR',
          retryable: true,
          cause: error instanceof Error ? error : undefined,
        }
      );
    }
  }

  /**
   * Retrieves failed operations from the dead letter queue
   *
   * @param filters - Optional filters for failed operations
   * @returns Promise resolving to array of failed operations
   *
   * @example
   * ```typescript
   * // Get all high priority failures
   * const highPriorityFailures = await failureHandler.getFailedOperations({
   *   priority: 'high',
   *   limit: 10
   * });
   *
   * // Get unreviewed failures
   * const unreviewedFailures = await failureHandler.getFailedOperations({
   *   reviewed: false
   * });
   * ```
   *
   * @since 2.3.0
   */
  async getFailedOperations(filters?: {
    priority?: 'low' | 'medium' | 'high' | 'critical';
    failureCategory?: string;
    reviewed?: boolean;
    productId?: string;
    limit?: number;
    offset?: number;
  }): Promise<FailedHCSOperation[]> {
    try {
      const allFailures = await this.getDeadLetterQueue();

      let filteredFailures = allFailures;

      // Apply filters
      if (filters) {
        if (filters.priority) {
          filteredFailures = filteredFailures.filter(
            f => f.priority === filters.priority
          );
        }
        if (filters.failureCategory) {
          filteredFailures = filteredFailures.filter(
            f => f.failureCategory === filters.failureCategory
          );
        }
        if (filters.reviewed !== undefined) {
          filteredFailures = filteredFailures.filter(
            f => f.reviewed === filters.reviewed
          );
        }
        if (filters.productId) {
          filteredFailures = filteredFailures.filter(
            f => f.eventMessage.productId === filters.productId
          );
        }
      }

      // Sort by priority and failure time
      filteredFailures.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const priorityDiff =
          priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.firstFailedAt.getTime() - a.firstFailedAt.getTime();
      });

      // Apply pagination
      const offset = filters?.offset || 0;
      const limit = filters?.limit || 100;

      return filteredFailures.slice(offset, offset + limit);
    } catch (error) {
      logger.error('Failed to retrieve failed operations');
      return [];
    }
  }

  /**
   * Manually retries a failed HCS operation
   *
   * @param failureId - ID of the failed operation to retry
   * @param hcsEventLogger - HCS Event Logger instance for retry
   * @returns Promise resolving to retry result
   *
   * @throws {ApiError} When retry fails or failure not found
   *
   * @example
   * ```typescript
   * const retryResult = await failureHandler.manualRetry(failureId, hcsEventLogger);
   * if (retryResult.success) {
   *   console.log('Manual retry successful');
   * }
   * ```
   *
   * @since 2.3.0
   */
  async manualRetry(
    failureId: string,
    hcsEventLogger: any // Using any to avoid circular dependency
  ): Promise<HCSOperationResult> {
    try {
      const failures = await this.getDeadLetterQueue();
      const failure = failures.find(f => f.id === failureId);

      if (!failure) {
        throw new HederaError(`Failed operation not found: ${failureId}`, {
          hederaStatus: 'FAILURE_NOT_FOUND',
          retryable: false,
        });
      }

      logger.info('Starting manual retry for failed HCS operation');

      // Create event logging request from the failed message
      const eventRequest = {
        productId: failure.eventMessage.productId,
        eventType: failure.eventMessage.eventType,
        actor: failure.eventMessage.actor,
        location: failure.eventMessage.location,
        eventData: failure.eventMessage.eventData,
        previousEventId: failure.eventMessage.previousEventId,
        signature: failure.eventMessage.signature,
      };

      // Attempt the retry
      const retryResult = await hcsEventLogger.logEvent(eventRequest);

      if (retryResult.success) {
        // Remove from dead letter queue on success
        await this.removeFromDeadLetterQueue(failureId);

        logger.info('Manual retry successful');
      } else {
        // Update failure record with retry attempt
        failure.lastRetryAt = new Date();
        failure.retryAttempts += 1;
        if (retryResult.error) {
          failure.lastError = retryResult.error;
        }

        await this.updateFailureInQueue(failure);

        logger.warn('Manual retry failed');
      }

      return retryResult;
    } catch (error) {
      throw new HederaError(
        `Manual retry failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          hederaStatus: 'MANUAL_RETRY_FAILED',
          retryable: true,
          cause: error instanceof Error ? error : undefined,
        }
      );
    }
  }

  /**
   * Marks a failed operation as reviewed with optional notes
   *
   * @param failureId - ID of the failed operation
   * @param notes - Optional review notes
   * @returns Promise that resolves when review is recorded
   *
   * @example
   * ```typescript
   * await failureHandler.markAsReviewed(failureId, 'Investigated - network issue resolved');
   * ```
   *
   * @since 2.3.0
   */
  async markAsReviewed(failureId: string, notes?: string): Promise<void> {
    try {
      const failures = await this.getDeadLetterQueue();
      const failure = failures.find(f => f.id === failureId);

      if (!failure) {
        throw new HederaError(`Failed operation not found: ${failureId}`, {
          hederaStatus: 'FAILURE_NOT_FOUND',
          retryable: false,
        });
      }

      failure.reviewed = true;
      failure.reviewNotes = notes;

      await this.updateFailureInQueue(failure);

      logger.info('Failed operation marked as reviewed');
    } catch (error) {
      throw new HederaError(
        `Failed to mark operation as reviewed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          hederaStatus: 'REVIEW_UPDATE_FAILED',
          retryable: true,
          cause: error instanceof Error ? error : undefined,
        }
      );
    }
  }

  /**
   * Gets failure statistics for monitoring and alerting
   *
   * @returns Promise resolving to failure statistics
   *
   * @example
   * ```typescript
   * const stats = await failureHandler.getFailureStatistics();
   * console.log(`Total failures: ${stats.totalFailures}`);
   * ```
   *
   * @since 2.3.0
   */
  async getFailureStatistics(): Promise<FailureStatistics> {
    try {
      // Note: Using basic cache operations - may need interface adjustment
      const cached = await (cacheService as any).get(
        this.FAILURE_STATS_CACHE_KEY
      );
      if (cached) {
        return JSON.parse(cached);
      }

      // Calculate statistics from current failures
      const failures = await this.getDeadLetterQueue();

      const stats: FailureStatistics = {
        totalFailures: failures.length,
        failuresByCategory: {},
        failuresByErrorCode: {},
        recentFailures: 0,
        averageRetryAttempts: 0,
        manualRetrySuccessRate: 0,
      };

      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      failures.forEach(failure => {
        // Count by category
        stats.failuresByCategory[failure.failureCategory] =
          (stats.failuresByCategory[failure.failureCategory] || 0) + 1;

        // Count by error code
        stats.failuresByErrorCode[failure.lastError.code] =
          (stats.failuresByErrorCode[failure.lastError.code] || 0) + 1;

        // Count recent failures
        if (failure.firstFailedAt > twentyFourHoursAgo) {
          stats.recentFailures++;
        }
      });

      // Calculate averages
      if (failures.length > 0) {
        stats.averageRetryAttempts =
          failures.reduce((sum, f) => sum + f.retryAttempts, 0) /
          failures.length;
      }

      // Cache the statistics
      await (cacheService as any).set(
        this.FAILURE_STATS_CACHE_KEY,
        JSON.stringify(stats),
        { ttl: 300 } // 5 minutes cache
      );

      return stats;
    } catch (error) {
      logger.error('Failed to calculate failure statistics');

      // Return empty statistics on error
      return {
        totalFailures: 0,
        failuresByCategory: {},
        failuresByErrorCode: {},
        recentFailures: 0,
        averageRetryAttempts: 0,
        manualRetrySuccessRate: 0,
      };
    }
  }

  /**
   * Categorizes failure based on error code
   *
   * @param errorCode - Error code to categorize
   * @returns Failure category
   *
   * @since 2.3.0
   */
  private categorizeFailure(
    errorCode: string
  ): 'network' | 'validation' | 'rate_limit' | 'service' | 'unknown' {
    if (
      errorCode.includes('NETWORK') ||
      errorCode.includes('TIMEOUT') ||
      errorCode.includes('CONNECTION')
    ) {
      return 'network';
    }
    if (
      errorCode.includes('VALIDATION') ||
      errorCode.includes('INVALID') ||
      errorCode.includes('SERIALIZATION')
    ) {
      return 'validation';
    }
    if (errorCode.includes('RATE_LIMIT')) {
      return 'rate_limit';
    }
    if (errorCode.includes('SERVICE') || errorCode.includes('UNAVAILABLE')) {
      return 'service';
    }
    return 'unknown';
  }

  /**
   * Determines priority level for failed operation
   *
   * @param eventMessage - Failed event message
   * @param operationResult - Failed operation result
   * @returns Priority level
   *
   * @since 2.3.0
   */
  private determinePriority(
    eventMessage: HCSEventMessage,
    _operationResult: HCSOperationResult
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Critical events (verification, compliance)
    if (
      eventMessage.eventType === 'verified' ||
      eventMessage.actor.role === 'Verifier'
    ) {
      return 'critical';
    }

    // High priority for creation events
    if (eventMessage.eventType === 'created') {
      return 'high';
    }

    // Medium priority for processing events
    if (eventMessage.eventType === 'processed') {
      return 'medium';
    }

    // Low priority for other events
    return 'low';
  }

  /**
   * Retrieves the dead letter queue from cache
   *
   * @returns Promise resolving to array of failed operations
   *
   * @since 2.3.0
   */
  private async getDeadLetterQueue(): Promise<FailedHCSOperation[]> {
    try {
      const cached = await (cacheService as any).get(
        this.DEAD_LETTER_CACHE_KEY
      );
      if (!cached) {
        return [];
      }

      const parsed = JSON.parse(cached);

      // Convert date strings back to Date objects
      return parsed.map((failure: any) => ({
        ...failure,
        firstFailedAt: new Date(failure.firstFailedAt),
        lastRetryAt: new Date(failure.lastRetryAt),
      }));
    } catch (error) {
      logger.error('Failed to retrieve dead letter queue');
      return [];
    }
  }

  /**
   * Adds a failure record to the dead letter queue
   *
   * @param failure - Failure record to add
   * @returns Promise that resolves when added
   *
   * @since 2.3.0
   */
  private async addToDeadLetterQueue(
    failure: FailedHCSOperation
  ): Promise<void> {
    const queue = await this.getDeadLetterQueue();
    queue.push(failure);

    await (cacheService as any).set(
      this.DEAD_LETTER_CACHE_KEY,
      JSON.stringify(queue),
      { ttl: this.CACHE_TTL }
    );
  }

  /**
   * Updates a failure record in the queue
   *
   * @param updatedFailure - Updated failure record
   * @returns Promise that resolves when updated
   *
   * @since 2.3.0
   */
  private async updateFailureInQueue(
    updatedFailure: FailedHCSOperation
  ): Promise<void> {
    const queue = await this.getDeadLetterQueue();
    const index = queue.findIndex(f => f.id === updatedFailure.id);

    if (index !== -1) {
      queue[index] = updatedFailure;

      await (cacheService as any).set(
        this.DEAD_LETTER_CACHE_KEY,
        JSON.stringify(queue),
        { ttl: this.CACHE_TTL }
      );
    }
  }

  /**
   * Removes a failure record from the dead letter queue
   *
   * @param failureId - ID of failure to remove
   * @returns Promise that resolves when removed
   *
   * @since 2.3.0
   */
  private async removeFromDeadLetterQueue(failureId: string): Promise<void> {
    const queue = await this.getDeadLetterQueue();
    const filteredQueue = queue.filter(f => f.id !== failureId);

    await (cacheService as any).set(
      this.DEAD_LETTER_CACHE_KEY,
      JSON.stringify(filteredQueue),
      { ttl: this.CACHE_TTL }
    );
  }

  /**
   * Updates failure statistics
   *
   * @param failure - New failure record
   * @returns Promise that resolves when updated
   *
   * @since 2.3.0
   */
  private async updateFailureStatistics(
    _failure: FailedHCSOperation
  ): Promise<void> {
    // Invalidate statistics cache to force recalculation
    await (cacheService as any).delete(this.FAILURE_STATS_CACHE_KEY);
  }
}

/**
 * Default HCS Failure Handler instance
 *
 * @example
 * ```typescript
 * import { hcsFailureHandler } from '@/services/hedera/HCSFailureHandler';
 *
 * await hcsFailureHandler.recordFailure(eventMessage, result);
 * ```
 *
 * @since 2.3.0
 */
export const hcsFailureHandler = new HCSFailureHandler();
