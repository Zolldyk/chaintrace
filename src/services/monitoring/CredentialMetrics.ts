/**
 * Comprehensive monitoring and metrics for credential operations
 * Provides performance tracking, error monitoring, and operational insights
 *
 * @since 1.0.0
 */

import { logger } from '@/lib/logger';
import type {
  ComplianceCredential,
  CredentialType,
  CredentialStatus,
} from '@/types/compliance';

/**
 * Credential operation metrics
 */
export interface CredentialMetrics {
  // Performance metrics
  operationDuration: number;
  responseTime: number;
  cacheHitRate?: number;

  // Operational metrics
  credentialsIssued: number;
  credentialsVerified: number;
  credentialsRevoked: number;

  // Error metrics
  errorRate: number;
  timeoutCount: number;
  retryCount: number;

  // Business metrics
  credentialTypeDistribution: Record<CredentialType, number>;
  statusDistribution: Record<CredentialStatus, number>;

  // System metrics
  databaseResponseTime: number;
  hcsResponseTime?: number;
  memoryUsage?: number;
}

/**
 * Metric event types for tracking
 */
export type MetricEvent =
  | 'credential_issued'
  | 'credential_verified'
  | 'credential_retrieved'
  | 'credential_revoked'
  | 'credential_expired'
  | 'search_performed'
  | 'cache_hit'
  | 'cache_miss'
  | 'database_query'
  | 'hcs_log'
  | 'error_occurred'
  | 'timeout_occurred'
  | 'retry_attempted';

/**
 * Metric data structure
 */
export interface MetricData {
  event: MetricEvent;
  timestamp: Date;
  duration?: number;
  success: boolean;
  metadata: Record<string, any>;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
}

/**
 * Performance monitoring for credential service operations
 */
export class CredentialPerformanceMonitor {
  // Removed unused metrics and aggregatedMetrics for now - can be re-added when needed
  private metricsBuffer: MetricData[] = [];
  private readonly bufferSize = 1000;
  private readonly aggregationInterval = 60000; // 1 minute

  constructor() {
    // Start periodic aggregation
    setInterval(() => {
      this.aggregateMetrics();
    }, this.aggregationInterval);
  }

  /**
   * Record a metric event
   */
  recordEvent(data: MetricData): void {
    this.metricsBuffer.push(data);

    // Log significant events
    if (!data.success || data.error) {
      logger.error(
        'Credential operation failed',
        data.error
          ? new Error(data.error.message)
          : new Error('Operation failed'),
        {
          event: data.event,
          duration: data.duration,
          metadata: data.metadata,
        }
      );
    } else if (data.event === 'credential_issued') {
      logger.info('Credential operation completed', {
        event: data.event,
        duration: data.duration,
        metadata: data.metadata,
      });
    }

    // Maintain buffer size
    if (this.metricsBuffer.length > this.bufferSize) {
      this.metricsBuffer = this.metricsBuffer.slice(-this.bufferSize);
    }
  }

  /**
   * Start timing an operation
   */
  startTimer(): () => MetricData['duration'] {
    const startTime = Date.now();
    return () => Date.now() - startTime;
  }

  /**
   * Record credential issuance
   */
  recordCredentialIssued(
    credential: ComplianceCredential,
    duration: number,
    success: boolean,
    error?: any
  ): void {
    this.recordEvent({
      event: 'credential_issued',
      timestamp: new Date(),
      duration,
      success,
      metadata: {
        credentialId: credential.id,
        productId: credential.productId,
        credentialType: credential.credentialType,
        issuer: credential.issuer,
      },
      error: error
        ? {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    });
  }

  /**
   * Record credential verification
   */
  recordCredentialVerified(
    credentialId: string,
    duration: number,
    success: boolean,
    verificationDetails?: any
  ): void {
    this.recordEvent({
      event: 'credential_verified',
      timestamp: new Date(),
      duration,
      success,
      metadata: {
        credentialId,
        ...verificationDetails,
      },
    });
  }

  /**
   * Record credential retrieval
   */
  recordCredentialRetrieved(
    credentialId: string,
    duration: number,
    fromCache: boolean,
    success: boolean
  ): void {
    this.recordEvent({
      event: 'credential_retrieved',
      timestamp: new Date(),
      duration,
      success,
      metadata: {
        credentialId,
        fromCache,
      },
    });

    // Also record cache hit/miss
    this.recordEvent({
      event: fromCache ? 'cache_hit' : 'cache_miss',
      timestamp: new Date(),
      success: true,
      metadata: {
        credentialId,
      },
    });
  }

  /**
   * Record database operation
   */
  recordDatabaseOperation(
    operation: string,
    duration: number,
    success: boolean,
    recordCount?: number
  ): void {
    this.recordEvent({
      event: 'database_query',
      timestamp: new Date(),
      duration,
      success,
      metadata: {
        operation,
        recordCount,
      },
    });
  }

  /**
   * Record HCS operation
   */
  recordHCSOperation(
    operation: string,
    duration: number,
    success: boolean,
    messageId?: string
  ): void {
    this.recordEvent({
      event: 'hcs_log',
      timestamp: new Date(),
      duration,
      success,
      metadata: {
        operation,
        messageId,
      },
    });
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): CredentialMetrics {
    const now = Date.now();
    const recentEvents = this.metricsBuffer.filter(
      m => now - m.timestamp.getTime() < 300000
    ); // Last 5 minutes

    const totalOperations = recentEvents.length;
    const successfulOperations = recentEvents.filter(m => m.success).length;
    const errorRate =
      totalOperations > 0
        ? (totalOperations - successfulOperations) / totalOperations
        : 0;

    const cacheHits = recentEvents.filter(m => m.event === 'cache_hit').length;
    const cacheTotal = recentEvents.filter(
      m => m.event === 'cache_hit' || m.event === 'cache_miss'
    ).length;
    const cacheHitRate = cacheTotal > 0 ? cacheHits / cacheTotal : 0;

    const averageDuration =
      recentEvents
        .filter(m => m.duration)
        .reduce((sum, m) => sum + (m.duration || 0), 0) / recentEvents.length ||
      0;

    const credentialsIssued = recentEvents.filter(
      m => m.event === 'credential_issued' && m.success
    ).length;
    const credentialsVerified = recentEvents.filter(
      m => m.event === 'credential_verified' && m.success
    ).length;
    const credentialsRevoked = recentEvents.filter(
      m => m.event === 'credential_revoked' && m.success
    ).length;

    const dbOperations = recentEvents.filter(m => m.event === 'database_query');
    const avgDbResponseTime =
      dbOperations.length > 0
        ? dbOperations.reduce((sum, m) => sum + (m.duration || 0), 0) /
          dbOperations.length
        : 0;

    const hcsOperations = recentEvents.filter(m => m.event === 'hcs_log');
    const avgHcsResponseTime =
      hcsOperations.length > 0
        ? hcsOperations.reduce((sum, m) => sum + (m.duration || 0), 0) /
          hcsOperations.length
        : 0;

    return {
      operationDuration: averageDuration,
      responseTime: averageDuration,
      cacheHitRate,
      credentialsIssued,
      credentialsVerified,
      credentialsRevoked,
      errorRate,
      timeoutCount: recentEvents.filter(m => m.event === 'timeout_occurred')
        .length,
      retryCount: recentEvents.filter(m => m.event === 'retry_attempted')
        .length,
      credentialTypeDistribution:
        this.getCredentialTypeDistribution(recentEvents),
      statusDistribution: this.getStatusDistribution(recentEvents),
      databaseResponseTime: avgDbResponseTime,
      hcsResponseTime: avgHcsResponseTime,
      memoryUsage: this.getMemoryUsage(),
    };
  }

  /**
   * Get aggregated metrics for a time period
   */
  getAggregatedMetrics(hours: number = 24): Record<string, any> {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    const events = this.metricsBuffer.filter(
      m => m.timestamp.getTime() > cutoff
    );

    return {
      totalOperations: events.length,
      successRate:
        events.length > 0
          ? events.filter(m => m.success).length / events.length
          : 0,
      errorRate:
        events.length > 0
          ? events.filter(m => !m.success).length / events.length
          : 0,
      averageResponseTime:
        events
          .filter(m => m.duration)
          .reduce((sum, m) => sum + (m.duration || 0), 0) / events.length || 0,
      operationsByType: this.groupBy(events, 'event'),
      peakHours: this.getPeakHours(events),
      errorsByType: this.getErrorsByType(events),
    };
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetricsForPrometheus(): string {
    const metrics = this.getCurrentMetrics();

    return `
# HELP credential_operations_total Total number of credential operations
# TYPE credential_operations_total counter
credential_operations_issued ${metrics.credentialsIssued}
credential_operations_verified ${metrics.credentialsVerified}
credential_operations_revoked ${metrics.credentialsRevoked}

# HELP credential_operation_duration_seconds Duration of credential operations
# TYPE credential_operation_duration_seconds histogram
credential_operation_duration_seconds ${metrics.operationDuration / 1000}

# HELP credential_error_rate Error rate for credential operations
# TYPE credential_error_rate gauge
credential_error_rate ${metrics.errorRate}

# HELP credential_cache_hit_rate Cache hit rate for credential operations
# TYPE credential_cache_hit_rate gauge
credential_cache_hit_rate ${metrics.cacheHitRate || 0}

# HELP credential_database_response_time_seconds Database response time
# TYPE credential_database_response_time_seconds gauge
credential_database_response_time_seconds ${metrics.databaseResponseTime / 1000}

# HELP credential_hcs_response_time_seconds HCS response time
# TYPE credential_hcs_response_time_seconds gauge
credential_hcs_response_time_seconds ${(metrics.hcsResponseTime || 0) / 1000}
    `.trim();
  }

  /**
   * Private helper methods
   */
  private aggregateMetrics(): void {
    // Aggregate metrics and clean up old data
    const now = Date.now();
    this.metricsBuffer = this.metricsBuffer.filter(
      m => now - m.timestamp.getTime() < 86400000
    ); // Keep 24 hours
  }

  private getCredentialTypeDistribution(
    events: MetricData[]
  ): Record<CredentialType, number> {
    const distribution: Record<string, number> = {};
    events.forEach(event => {
      if (event.metadata.credentialType) {
        distribution[event.metadata.credentialType] =
          (distribution[event.metadata.credentialType] || 0) + 1;
      }
    });
    return distribution as Record<CredentialType, number>;
  }

  private getStatusDistribution(
    _events: MetricData[]
  ): Record<CredentialStatus, number> {
    // This would be populated from actual credential status data
    return {
      issued: 0,
      active: 0,
      expired: 0,
      revoked: 0,
    };
  }

  private getMemoryUsage(): number {
    // In Node.js environment, this would use process.memoryUsage()
    // In browser, this could use performance.memory
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed / 1024 / 1024; // MB
    }
    return 0;
  }

  private groupBy(
    events: MetricData[],
    key: keyof MetricData
  ): Record<string, number> {
    return events.reduce(
      (groups, event) => {
        const groupKey = String(event[key]);
        groups[groupKey] = (groups[groupKey] || 0) + 1;
        return groups;
      },
      {} as Record<string, number>
    );
  }

  private getPeakHours(events: MetricData[]): Record<string, number> {
    const hourlyDistribution: Record<string, number> = {};
    events.forEach(event => {
      const hour = event.timestamp.getHours().toString().padStart(2, '0');
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
    });
    return hourlyDistribution;
  }

  private getErrorsByType(events: MetricData[]): Record<string, number> {
    const errorDistribution: Record<string, number> = {};
    events
      .filter(e => !e.success && e.error)
      .forEach(event => {
        const errorCode = event.error!.code;
        errorDistribution[errorCode] = (errorDistribution[errorCode] || 0) + 1;
      });
    return errorDistribution;
  }
}

// Global monitoring instance
export const credentialMonitor = new CredentialPerformanceMonitor();
