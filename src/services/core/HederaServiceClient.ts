/**
 * Base class for all Hedera service clients with common operations and error handling
 *
 * @since 1.4.0
 */

import { Client, AccountId, AccountBalanceQuery } from '@hashgraph/sdk';
import type {
  ServiceHealth,
  ApiError,
  HederaServiceConfig,
} from '../../types/hedera';
import { ApiErrorCode } from '../../types/hedera';

/**
 * Retry configuration for service operations
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;

  /** Base delay between retries in milliseconds */
  baseDelay: number;

  /** Maximum delay between retries in milliseconds */
  maxDelay: number;

  /** Exponential backoff multiplier */
  backoffMultiplier: number;

  /** Whether to add jitter to delays */
  useJitter: boolean;
}

/**
 * Operation context for service calls
 */
export interface OperationContext {
  /** Operation name for logging */
  operationName: string;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Retry configuration override */
  retry?: Partial<RetryConfig>;

  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Abstract base class for Hedera service clients with production-ready error handling,
 * retry logic, monitoring, and health checks
 *
 * @abstract
 * @class HederaServiceClient
 * @since 1.4.0
 */
export abstract class HederaServiceClient {
  protected client: Client;
  protected config: HederaServiceConfig;
  protected networkType: 'testnet' | 'mainnet';
  protected timeout: number;
  protected retryConfig: RetryConfig;

  private healthStatus: ServiceHealth;
  private lastHealthCheck: Date | null = null;

  constructor(config: HederaServiceConfig) {
    this.config = config;
    this.networkType = config.networkType;
    this.timeout = config.timeouts?.mirrorNode || 30000;

    this.retryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      useJitter: true,
    };

    // Initial health status - will be updated on first health check
    this.healthStatus = {
      service: 'Unknown', // Will be set by first health check
      status: 'healthy', // Start optimistically
      lastChecked: new Date(),
      responseTime: 0,
    };

    this.client = this.initializeClient();
  }

  /**
   * Get the service name for identification
   */
  protected abstract getServiceName(): string;

  /**
   * Initialize the Hedera client
   */
  protected initializeClient(): Client {
    let client: Client;

    if (this.networkType === 'testnet') {
      client = Client.forTestnet();
    } else {
      client = Client.forMainnet();
    }

    // Set operator if provided
    if (this.config.operatorAccountId && this.config.operatorPrivateKey) {
      const operatorId = AccountId.fromString(this.config.operatorAccountId);
      client.setOperator(operatorId, this.config.operatorPrivateKey);
    }

    return client;
  }

  /**
   * Validate connection to Hedera network
   */
  async validateConnection(): Promise<boolean> {
    try {
      const startTime = Date.now();

      // Perform a simple query to test connectivity
      if (this.client.operatorAccountId) {
        const balanceQuery = new AccountBalanceQuery().setAccountId(
          this.client.operatorAccountId
        );
        await balanceQuery.execute(this.client);
        const responseTime = Date.now() - startTime;

        this.updateHealthStatus('healthy', responseTime);
        return true;
      } else {
        // If no operator set, just validate client initialization
        this.updateHealthStatus('healthy', Date.now() - startTime);
        return true;
      }
    } catch (error) {
      const responseTime = Date.now() - Date.now();
      this.updateHealthStatus(
        'unhealthy',
        responseTime,
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }
  }

  /**
   * Get current service health status
   */
  async getServiceHealth(): Promise<ServiceHealth> {
    // Update health if it's been more than 1 minute since last check
    const now = new Date();
    if (
      !this.lastHealthCheck ||
      now.getTime() - this.lastHealthCheck.getTime() > 60000
    ) {
      await this.validateConnection();
    }

    return { ...this.healthStatus };
  }

  /**
   * Execute operation with retry logic and error handling
   */
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: OperationContext
  ): Promise<T> {
    const startTime = Date.now();
    const retryConfig = { ...this.retryConfig, ...context.retry };
    let lastError: Error;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        // Apply timeout if specified
        let result: T;
        if (context.timeout) {
          result = await Promise.race([
            operation(),
            this.createTimeoutPromise<T>(context.timeout),
          ]);
        } else {
          result = await operation();
        }

        // Update health on success
        const responseTime = Date.now() - startTime;
        this.updateHealthStatus('healthy', responseTime);

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Log attempt failure
        console.warn(
          `${context.operationName} attempt ${attempt}/${retryConfig.maxAttempts} failed:`,
          lastError.message
        );

        // Don't retry on certain errors
        if (this.shouldNotRetry(lastError)) {
          break;
        }

        // Calculate delay for next attempt
        if (attempt < retryConfig.maxAttempts) {
          const delay = this.calculateRetryDelay(attempt, retryConfig);
          await this.sleep(delay);
        }
      }
    }

    // All attempts failed
    const responseTime = Date.now() - startTime;
    this.updateHealthStatus('unhealthy', responseTime, lastError!);

    throw this.handleApiError(lastError!, context);
  }

  /**
   * Handle and transform API errors into standardized format
   */
  protected handleApiError(error: Error, context: OperationContext): ApiError {
    let code: ApiErrorCode;
    let statusCode: number | undefined;
    let retryable = true;

    // Map Hedera SDK errors to our error codes
    if (error.message.includes('TIMEOUT')) {
      code = ApiErrorCode.NETWORK_TIMEOUT;
      statusCode = 408;
    } else if (error.message.includes('NOT_FOUND')) {
      code = ApiErrorCode.PRODUCT_NOT_FOUND;
      statusCode = 404;
      retryable = false;
    } else if (error.message.includes('INVALID')) {
      code = ApiErrorCode.VALIDATION_FAILED;
      statusCode = 400;
      retryable = false;
    } else if (error.message.includes('UNAUTHORIZED')) {
      code = ApiErrorCode.UNAUTHORIZED_ACCESS;
      statusCode = 401;
      retryable = false;
    } else if (error.message.includes('RATE_LIMIT')) {
      code = ApiErrorCode.RATE_LIMIT_EXCEEDED;
      statusCode = 429;
    } else {
      code = ApiErrorCode.UNKNOWN_ERROR;
      statusCode = 500;
    }

    const apiError = new Error(error.message) as ApiError;
    apiError.code = code;
    apiError.statusCode = statusCode;
    apiError.retryable = retryable;
    apiError.timestamp = new Date();
    apiError.details = {
      originalError: error.message,
      operation: context.operationName,
      service: this.getServiceName(),
      ...context.metadata,
    };

    return apiError;
  }

  /**
   * Update service health status
   */
  private updateHealthStatus(
    status: 'healthy' | 'degraded' | 'unhealthy',
    responseTime: number,
    error?: Error
  ): void {
    this.healthStatus = {
      service: this.getServiceName(),
      status,
      lastChecked: new Date(),
      responseTime,
      details: error
        ? {
            error: error.message,
            metrics: {
              networkType: this.networkType,
              timeout: this.timeout,
            },
          }
        : undefined,
    };

    this.lastHealthCheck = new Date();
  }

  /**
   * Determine if error should not be retried
   */
  private shouldNotRetry(error: Error): boolean {
    const nonRetryablePatterns = [
      'INVALID',
      'NOT_FOUND',
      'UNAUTHORIZED',
      'FORBIDDEN',
      'BAD_REQUEST',
    ];

    return nonRetryablePatterns.some(pattern =>
      error.message.toUpperCase().includes(pattern)
    );
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateRetryDelay(attempt: number, config: RetryConfig): number {
    let delay =
      config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    delay = Math.min(delay, config.maxDelay);

    if (config.useJitter) {
      // Add ±25% jitter
      const jitter = delay * 0.25 * (Math.random() - 0.5) * 2;
      delay += jitter;
    }

    return Math.max(delay, 0);
  }

  /**
   * Sleep for specified milliseconds
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise<T>(timeout: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Close the client connection
   */
  async close(): Promise<void> {
    await this.client.close();
  }
}
