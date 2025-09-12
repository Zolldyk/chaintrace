/**
 * Centralized error handling utilities for ChainTrace application.
 *
 * Provides comprehensive error types, handling utilities, and recovery mechanisms
 * for all Hedera service integrations and API operations.
 *
 * @since 1.0.0
 */

/**
 * Base error class for all ChainTrace application errors.
 *
 * @class ChainTraceError
 * @extends Error
 *
 * @example
 * ```typescript
 * throw new ChainTraceError('Operation failed', 'OPERATION_FAILED', {
 *   context: 'user_action',
 *   retryable: true
 * });
 * ```
 */
export class ChainTraceError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly retryable: boolean;
  public readonly timestamp: string;
  public readonly context?: string;
  public readonly cause?: Error;

  constructor(
    message: string,
    code: string,
    options: {
      statusCode?: number;
      retryable?: boolean;
      context?: string;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'ChainTraceError';
    this.code = code;
    this.statusCode = options.statusCode || 500;
    this.retryable = options.retryable || false;
    this.timestamp = new Date().toISOString();
    this.context = options.context;

    if (options.cause) {
      this.cause = options.cause;
    }

    // Maintain proper stack trace for V8 (Chrome/Node.js)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ChainTraceError);
    }
  }
}

/**
 * Error class for network connectivity issues.
 *
 * @class NetworkError
 * @extends ChainTraceError
 *
 * @example
 * ```typescript
 * throw new NetworkError('Failed to connect to Mirror Node API', {
 *   service: 'mirror-node',
 *   endpoint: 'https://testnet.mirrornode.hedera.com'
 * });
 * ```
 */
export class NetworkError extends ChainTraceError {
  public readonly service?: string;
  public readonly endpoint?: string;

  constructor(
    message: string,
    options: {
      service?: string;
      endpoint?: string;
      cause?: Error;
    } = {}
  ) {
    super(message, 'NETWORK_ERROR', {
      statusCode: 503,
      retryable: true,
      context: 'network_connectivity',
      cause: options.cause,
    });

    this.name = 'NetworkError';
    this.service = options.service;
    this.endpoint = options.endpoint;
  }
}

/**
 * Error class for authentication and authorization failures.
 *
 * @class AuthenticationError
 * @extends ChainTraceError
 *
 * @example
 * ```typescript
 * throw new AuthenticationError('Wallet signature verification failed', {
 *   walletAddress: '0.0.12345',
 *   requiredRole: 'verifier'
 * });
 * ```
 */
export class AuthenticationError extends ChainTraceError {
  public readonly walletAddress?: string;
  public readonly requiredRole?: string;

  constructor(
    message: string,
    options: {
      walletAddress?: string;
      requiredRole?: string;
      cause?: Error;
    } = {}
  ) {
    super(message, 'AUTHENTICATION_ERROR', {
      statusCode: 401,
      retryable: false,
      context: 'authentication',
      cause: options.cause,
    });

    this.name = 'AuthenticationError';
    this.walletAddress = options.walletAddress;
    this.requiredRole = options.requiredRole;
  }
}

/**
 * Error class for input validation failures.
 *
 * @class ValidationError
 * @extends ChainTraceError
 *
 * @example
 * ```typescript
 * throw new ValidationError('Invalid product ID format', {
 *   field: 'productId',
 *   value: 'invalid-id',
 *   expectedFormat: 'CT-YYYY-NNN-XXXXXX'
 * });
 * ```
 */
export class ValidationError extends ChainTraceError {
  public readonly field?: string;
  public readonly value?: any;
  public readonly expectedFormat?: string;

  constructor(
    message: string,
    options: {
      field?: string;
      value?: any;
      expectedFormat?: string;
      cause?: Error;
    } = {}
  ) {
    super(message, 'VALIDATION_ERROR', {
      statusCode: 400,
      retryable: false,
      context: 'input_validation',
      cause: options.cause,
    });

    this.name = 'ValidationError';
    this.field = options.field;
    this.value = options.value;
    this.expectedFormat = options.expectedFormat;
  }
}

/**
 * Error class for rate limiting and quota exceeded scenarios.
 *
 * @class RateLimitError
 * @extends ChainTraceError
 *
 * @example
 * ```typescript
 * throw new RateLimitError('Mirror Node rate limit exceeded', {
 *   service: 'mirror-node',
 *   limit: 100,
 *   resetTime: new Date(Date.now() + 60000)
 * });
 * ```
 */
export class RateLimitError extends ChainTraceError {
  public readonly service?: string;
  public readonly limit?: number;
  public readonly resetTime?: Date;

  constructor(
    message: string,
    options: {
      service?: string;
      limit?: number;
      resetTime?: Date;
      cause?: Error;
    } = {}
  ) {
    super(message, 'RATE_LIMIT_ERROR', {
      statusCode: 429,
      retryable: true,
      context: 'rate_limiting',
      cause: options.cause,
    });

    this.name = 'RateLimitError';
    this.service = options.service;
    this.limit = options.limit;
    this.resetTime = options.resetTime;
  }
}

/**
 * Error class for service timeout scenarios.
 *
 * @class TimeoutError
 * @extends ChainTraceError
 *
 * @example
 * ```typescript
 * throw new TimeoutError('Hedera SDK operation timed out', {
 *   operation: 'submitMessage',
 *   timeoutMs: 30000,
 *   service: 'hcs'
 * });
 * ```
 */
export class TimeoutError extends ChainTraceError {
  public readonly operation?: string;
  public readonly timeoutMs?: number;
  public readonly service?: string;

  constructor(
    message: string,
    options: {
      operation?: string;
      timeoutMs?: number;
      service?: string;
      cause?: Error;
    } = {}
  ) {
    super(message, 'TIMEOUT_ERROR', {
      statusCode: 504,
      retryable: true,
      context: 'operation_timeout',
      cause: options.cause,
    });

    this.name = 'TimeoutError';
    this.operation = options.operation;
    this.timeoutMs = options.timeoutMs;
    this.service = options.service;
  }
}

/**
 * Error class for Hedera-specific blockchain errors.
 *
 * @class HederaError
 * @extends ChainTraceError
 *
 * @example
 * ```typescript
 * throw new HederaError('Insufficient HBAR balance for transaction', {
 *   hederaStatus: 'INSUFFICIENT_PAYER_BALANCE',
 *   accountId: '0.0.12345',
 *   requiredAmount: '0.05 HBAR'
 * });
 * ```
 */
export class HederaError extends ChainTraceError {
  public readonly hederaStatus?: string;
  public readonly accountId?: string;
  public readonly transactionId?: string;

  constructor(
    message: string,
    options: {
      hederaStatus?: string;
      accountId?: string;
      transactionId?: string;
      retryable?: boolean;
      cause?: Error;
    } = {}
  ) {
    super(message, 'HEDERA_ERROR', {
      statusCode: 400,
      retryable: options.retryable || false,
      context: 'hedera_blockchain',
      cause: options.cause,
    });

    this.name = 'HederaError';
    this.hederaStatus = options.hederaStatus;
    this.accountId = options.accountId;
    this.transactionId = options.transactionId;
  }
}

/**
 * Error class for wallet operation failures.
 *
 * @class WalletError
 * @extends ChainTraceError
 *
 * @example
 * ```typescript
 * throw new WalletError('User rejected transaction signing', {
 *   walletType: 'metamask-snap',
 *   operation: 'sign_transaction',
 *   userRejected: true
 * });
 * ```
 */
export class WalletError extends ChainTraceError {
  public readonly walletType?: string;
  public readonly operation?: string;
  public readonly userRejected?: boolean;

  constructor(
    message: string,
    options: {
      walletType?: string;
      operation?: string;
      userRejected?: boolean;
      cause?: Error;
    } = {}
  ) {
    super(message, 'WALLET_ERROR', {
      statusCode: options.userRejected ? 400 : 500,
      retryable: true, // User rejection is retryable in ChainTrace - user can try again
      context: 'wallet_operation',
      cause: options.cause,
    });

    this.name = 'WalletError';
    this.walletType = options.walletType;
    this.operation = options.operation;
    this.userRejected = options.userRejected;
  }
}

/**
 * Configuration for error handling behavior.
 *
 * @interface ErrorHandlerConfig
 */
export interface ErrorHandlerConfig {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  enableLogging?: boolean;
  logLevel?: 'error' | 'warn' | 'info' | 'debug';
}

/**
 * Default configuration for error handling.
 */
export const DEFAULT_ERROR_CONFIG: Required<ErrorHandlerConfig> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  enableLogging: true,
  logLevel: 'error',
};

/**
 * Retry configuration for different error types.
 */
export const RETRY_CONFIG = {
  NETWORK_ERROR: { maxRetries: 3, baseDelayMs: 1000 },
  TIMEOUT_ERROR: { maxRetries: 2, baseDelayMs: 2000 },
  RATE_LIMIT_ERROR: { maxRetries: 5, baseDelayMs: 5000 },
  HEDERA_ERROR: { maxRetries: 1, baseDelayMs: 3000 },
  WALLET_ERROR: { maxRetries: 0, baseDelayMs: 0 },
  AUTHENTICATION_ERROR: { maxRetries: 0, baseDelayMs: 0 },
  VALIDATION_ERROR: { maxRetries: 0, baseDelayMs: 0 },
} as const;

/**
 * Implements exponential backoff delay calculation.
 *
 * @param attempt - Current attempt number (0-based)
 * @param baseDelayMs - Base delay in milliseconds
 * @param maxDelayMs - Maximum delay in milliseconds
 * @returns Delay in milliseconds for the attempt
 *
 * @example
 * ```typescript
 * const delay = calculateBackoffDelay(2, 1000, 30000); // ~4000ms with jitter
 * await new Promise(resolve => setTimeout(resolve, delay));
 * ```
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelayMs: number = 1000,
  maxDelayMs: number = 30000
): number {
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 0.1 * exponentialDelay; // Add up to 10% jitter
  const delay = Math.min(exponentialDelay + jitter, maxDelayMs);
  return Math.floor(delay);
}

/**
 * Executes a function with automatic retry logic for retryable errors.
 *
 * @param operation - Async function to execute
 * @param options - Retry configuration options
 * @returns Promise that resolves to the operation result
 *
 * @throws {ChainTraceError} When max retries exceeded or non-retryable error
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   async () => await mirrorNodeService.getProduct('CT-123'),
 *   { maxRetries: 3, baseDelayMs: 1000 }
 * );
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: ErrorHandlerConfig = {}
): Promise<T> {
  const config = { ...DEFAULT_ERROR_CONFIG, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      const isRetryable = error instanceof ChainTraceError && error.retryable;
      const isLastAttempt = attempt === config.maxRetries;

      if (config.enableLogging && process.env.NODE_ENV === 'development') {
        const level = isLastAttempt ? 'error' : 'warn';
        /* eslint-disable-next-line no-console */
        console[level](`Operation attempt ${attempt + 1} failed:`, {
          error: lastError.message,
          code: error instanceof ChainTraceError ? error.code : 'UNKNOWN',
          retryable: isRetryable,
          willRetry: isRetryable && !isLastAttempt,
        });
      }

      // Don't retry if not retryable or last attempt
      if (!isRetryable || isLastAttempt) {
        break;
      }

      // Calculate and apply delay
      const delay = calculateBackoffDelay(
        attempt,
        config.baseDelayMs,
        config.maxDelayMs
      );

      if (config.enableLogging && config.logLevel === 'debug') {
        if (process.env.NODE_ENV === 'development') {
          /* eslint-disable-next-line no-console */
          console.debug(`Retrying in ${delay}ms...`);
        }
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // All retries exhausted
  if (lastError) {
    throw lastError;
  }
  throw new Error('All retries exhausted with no error captured');
}

/**
 * Handles errors with user-friendly message conversion and logging.
 *
 * @param error - Error to handle
 * @param context - Additional context information
 * @returns Sanitized error response for client consumption
 *
 * @example
 * ```typescript
 * try {
 *   await hederaService.submitTransaction(tx);
 * } catch (error) {
 *   const response = handleError(error, {
 *     operation: 'transaction_submission',
 *     userId: '0.0.12345'
 *   });
 *   return NextResponse.json(response, { status: response.statusCode });
 * }
 * ```
 */
export function handleError(
  error: unknown,
  context: Record<string, any> = {}
): {
  error: string;
  code: string;
  statusCode: number;
  retryable: boolean;
  timestamp: string;
  context?: string;
} {
  // Convert unknown errors to ChainTraceError
  let chainTraceError: ChainTraceError;

  if (error instanceof ChainTraceError) {
    chainTraceError = error;
  } else if (error instanceof Error) {
    // Try to categorize common error types
    chainTraceError = categorizeError(error);
  } else {
    chainTraceError = new ChainTraceError(
      'An unexpected error occurred',
      'UNKNOWN_ERROR',
      { statusCode: 500, retryable: false }
    );
  }

  // Log error with context
  if (process.env.NODE_ENV === 'development') {
    /* eslint-disable-next-line no-console */
    console.error('Error handled:', {
      message: chainTraceError.message,
      code: chainTraceError.code,
      statusCode: chainTraceError.statusCode,
      retryable: chainTraceError.retryable,
      context: { ...context, errorContext: chainTraceError.context },
      stack: chainTraceError.stack,
    });
  }

  // Return sanitized error response
  return {
    error: sanitizeErrorMessage(chainTraceError.message),
    code: chainTraceError.code,
    statusCode: chainTraceError.statusCode,
    retryable: chainTraceError.retryable,
    timestamp: chainTraceError.timestamp,
    context: chainTraceError.context,
  };
}

/**
 * Categorizes generic errors into ChainTrace error types.
 *
 * @private
 * @param error - Generic error to categorize
 * @returns ChainTraceError with appropriate category
 */
function categorizeError(error: Error): ChainTraceError {
  const message = error.message.toLowerCase();

  // Network-related errors
  if (
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('enotfound') ||
    message.includes('etimedout') ||
    message.includes('econnrefused')
  ) {
    return new NetworkError(error.message, { cause: error });
  }

  // Timeout errors
  if (
    message.includes('timeout') ||
    message.includes('aborted') ||
    error.name === 'AbortError'
  ) {
    return new TimeoutError(error.message, { cause: error });
  }

  // Rate limiting
  if (
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('429')
  ) {
    return new RateLimitError(error.message, { cause: error });
  }

  // Authentication/Authorization
  if (
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('authentication') ||
    message.includes('401') ||
    message.includes('403')
  ) {
    return new AuthenticationError(error.message, { cause: error });
  }

  // Validation errors
  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('bad request') ||
    message.includes('400')
  ) {
    return new ValidationError(error.message, { cause: error });
  }

  // Hedera-specific errors
  if (
    message.includes('hedera') ||
    message.includes('hbar') ||
    message.includes('consensus') ||
    message.includes('mirror')
  ) {
    return new HederaError(error.message, { cause: error });
  }

  // Wallet-related errors
  if (
    message.includes('wallet') ||
    message.includes('metamask') ||
    message.includes('hashpack') ||
    message.includes('user rejected')
  ) {
    return new WalletError(error.message, {
      userRejected:
        message.includes('user rejected') || message.includes('denied'),
      cause: error,
    });
  }

  // Default to generic ChainTrace error
  return new ChainTraceError(error.message, 'UNKNOWN_ERROR', {
    statusCode: 500,
    retryable: false,
    cause: error,
  });
}

/**
 * Sanitizes error messages for safe client consumption.
 *
 * @private
 * @param message - Error message to sanitize
 * @returns Sanitized error message
 */
function sanitizeErrorMessage(message: string): string {
  // Remove potentially sensitive information
  return message
    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP_ADDRESS]') // IP addresses
    .replace(/\b[A-Za-z0-9]{64,}\b/g, '[HASH]') // Long hashes/keys
    .replace(/password\s*=\s*[^\s]+/gi, 'password=[REDACTED]') // Passwords
    .replace(/key\s*=\s*[^\s]+/gi, 'key=[REDACTED]') // API keys
    .replace(/token\s*=\s*[^\s]+/gi, 'token=[REDACTED]'); // Tokens
}

/**
 * Creates user-friendly error messages with resolution steps.
 *
 * @param error - ChainTraceError to create message for
 * @returns User-friendly error message with resolution steps
 *
 * @example
 * ```typescript
 * const error = new NetworkError('Failed to connect to Mirror Node');
 * const message = createUserFriendlyMessage(error);
 * // Access user-friendly error messages
 * const title = message.title; // "Connection Problem"
 * const description = message.description; // "Unable to connect to the blockchain network"
 * const resolution = message.resolution; // "Please check your internet connection and try again"
 * ```
 */
export function createUserFriendlyMessage(error: ChainTraceError): {
  title: string;
  description: string;
  resolution: string;
  retryable: boolean;
} {
  switch (error.code) {
    case 'NETWORK_ERROR':
      return {
        title: 'Connection Problem',
        description: 'Unable to connect to the blockchain network services',
        resolution:
          'Please check your internet connection and try again in a few moments',
        retryable: true,
      };

    case 'AUTHENTICATION_ERROR':
      return {
        title: 'Authentication Required',
        description:
          'Your wallet connection or credentials need to be verified',
        resolution: 'Please reconnect your wallet and try again',
        retryable: false,
      };

    case 'VALIDATION_ERROR':
      return {
        title: 'Invalid Input',
        description: 'The information provided is not in the correct format',
        resolution: 'Please check your input and try again',
        retryable: false,
      };

    case 'RATE_LIMIT_ERROR':
      const rateLimitError = error as RateLimitError;
      const resetTime = rateLimitError.resetTime
        ? ` Try again after ${rateLimitError.resetTime.toLocaleTimeString()}`
        : ' Please wait a few minutes before trying again';
      return {
        title: 'Too Many Requests',
        description: 'You have made too many requests in a short period',
        resolution: resetTime,
        retryable: true,
      };

    case 'TIMEOUT_ERROR':
      return {
        title: 'Request Timeout',
        description: 'The operation took longer than expected to complete',
        resolution:
          'Please try again - the network may be experiencing high traffic',
        retryable: true,
      };

    case 'HEDERA_ERROR':
      return {
        title: 'Blockchain Error',
        description:
          'There was an issue processing your transaction on the Hedera network',
        resolution:
          'Please check your account balance and network status, then try again',
        retryable: error.retryable,
      };

    case 'WALLET_ERROR':
      const walletError = error as WalletError;
      if (walletError.userRejected) {
        return {
          title: 'Transaction Cancelled',
          description: 'You cancelled the transaction in your wallet',
          resolution:
            'To proceed, please approve the transaction when prompted',
          retryable: true,
        };
      }
      return {
        title: 'Wallet Problem',
        description: 'There was an issue communicating with your wallet',
        resolution: 'Please ensure your wallet is connected and try again',
        retryable: true,
      };

    default:
      return {
        title: 'Unexpected Error',
        description:
          'An unexpected error occurred while processing your request',
        resolution:
          'Please try again or contact support if the problem persists',
        retryable: error.retryable,
      };
  }
}
