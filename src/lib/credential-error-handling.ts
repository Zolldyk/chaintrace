/**
 * Error handling utilities for credential operations
 *
 * @since 1.0.0
 */

import type {} from // CredentialVerificationError, // Defined but not currently used
// CredentialIssuanceError, // Defined but not used in current implementation
'@/types/compliance';
import { logger } from '@/lib/logger';

/**
 * Enhanced error class for credential operations
 */
export class CredentialError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly retryable: boolean;
  public readonly context: Record<string, any>;
  public readonly userMessage: string;
  public readonly timestamp: Date;

  constructor(
    code: string,
    message: string,
    statusCode: number = 500,
    context: Record<string, any> = {},
    retryable: boolean = false,
    userMessage?: string
  ) {
    super(message);
    this.name = 'CredentialError';
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.context = context;
    this.userMessage = userMessage || this.getDefaultUserMessage(code);
    this.timestamp = new Date();

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CredentialError);
    }
  }

  /**
   * Get default user-friendly message for error code
   */
  private getDefaultUserMessage(code: string): string {
    const messages: Record<string, string> = {
      CREDENTIAL_NOT_FOUND:
        'The credential you are looking for could not be found. Please check the credential ID and try again.',
      CREDENTIAL_EXPIRED:
        'This credential has expired and is no longer valid. Contact the issuer for a renewed credential.',
      CREDENTIAL_REVOKED:
        'This credential has been revoked and is no longer valid. Contact the issuer for more information.',
      INVALID_SIGNATURE:
        'The credential signature is invalid. This may indicate the credential has been tampered with.',
      BLOCKCHAIN_VERIFICATION_FAILED:
        'Unable to verify the credential on the blockchain. Please try again later.',
      VALIDATION_FAILED:
        'The credential data failed validation. Please check the credential format and try again.',
      DUPLICATE_CREDENTIAL:
        'A credential with the same ID already exists. Each credential must have a unique identifier.',
      HCS_LOGGING_FAILED:
        'Failed to log the credential to the blockchain. The operation will be retried automatically.',
      SIGNATURE_GENERATION_FAILED:
        'Failed to generate a secure signature for the credential. Please try again.',
      COMPLIANCE_ENGINE_ERROR:
        'The compliance validation service is currently unavailable. Please try again later.',
      NETWORK_ERROR:
        'A network error occurred. Please check your connection and try again.',
      RATE_LIMIT_EXCEEDED:
        'Too many requests. Please wait a moment before trying again.',
      UNKNOWN_ERROR:
        'An unexpected error occurred. Please try again or contact support if the problem persists.',
    };

    return messages[code] || messages.UNKNOWN_ERROR;
  }

  /**
   * Convert to JSON representation
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      retryable: this.retryable,
      userMessage: this.userMessage,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }

  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    return this.retryable;
  }

  /**
   * Get user-friendly message
   */
  getUserMessage(): string {
    return this.userMessage;
  }
}

/**
 * Credential operation result wrapper
 */
export interface CredentialOperationResult<T> {
  success: boolean;
  data?: T;
  error?: CredentialError;
  retryAfter?: number;
  requestId?: string;
}

/**
 * Error recovery strategies
 */
export interface RecoveryStrategy {
  id: string;
  label: string;
  description: string;
  action: () => Promise<void> | void;
  icon?: string;
}

/**
 * Handle credential operation errors with recovery strategies
 *
 * @param error - The error to handle
 * @param context - Additional context information
 * @returns Recovery strategies and error details
 */
export function handleCredentialError(
  error: unknown,
  context: Record<string, any> = {}
): {
  error: CredentialError;
  recoveryStrategies: RecoveryStrategy[];
} {
  let credentialError: CredentialError;

  // Convert various error types to CredentialError
  if (error instanceof CredentialError) {
    credentialError = error;
  } else if (error instanceof Error) {
    // Map common error patterns to specific codes
    let code = 'UNKNOWN_ERROR';
    let retryable = false;
    let statusCode = 500;

    if (error.message.includes('fetch')) {
      code = 'NETWORK_ERROR';
      retryable = true;
      statusCode = 503;
    } else if (error.message.includes('timeout')) {
      code = 'NETWORK_ERROR';
      retryable = true;
      statusCode = 504;
    } else if (error.message.includes('429')) {
      code = 'RATE_LIMIT_EXCEEDED';
      retryable = true;
      statusCode = 429;
    }

    credentialError = new CredentialError(
      code,
      error.message,
      statusCode,
      context,
      retryable
    );
  } else {
    credentialError = new CredentialError(
      'UNKNOWN_ERROR',
      'An unexpected error occurred',
      500,
      { originalError: error, ...context }
    );
  }

  // Log error for debugging
  logger.error('Credential operation error', credentialError, { context });

  // Generate recovery strategies
  const recoveryStrategies = getRecoveryStrategies(credentialError, context);

  return { error: credentialError, recoveryStrategies };
}

/**
 * Generate recovery strategies based on error type
 */
function getRecoveryStrategies(
  error: CredentialError,
  _context: Record<string, any>
): RecoveryStrategy[] {
  const strategies: RecoveryStrategy[] = [];

  // Retry strategy for retryable errors
  if (error.isRetryable()) {
    strategies.push({
      id: 'retry',
      label: 'Try Again',
      description: 'Retry the operation',
      icon: '🔄',
      action: async () => {
        // Retry logic would be implemented by the caller
        window.location.reload();
      },
    });
  }

  // Specific strategies based on error code
  switch (error.code) {
    case 'CREDENTIAL_NOT_FOUND':
      strategies.push({
        id: 'check_id',
        label: 'Check Credential ID',
        description: 'Verify the credential ID format is correct',
        icon: '🔍',
        action: () => {
          // Focus on credential ID input if available
          const input = document.querySelector(
            'input[placeholder*="credential" i], input[placeholder*="CRED-" i]'
          ) as HTMLInputElement;
          if (input) {
            input.focus();
            input.select();
          }
        },
      });
      break;

    case 'CREDENTIAL_EXPIRED':
      strategies.push({
        id: 'contact_issuer',
        label: 'Contact Issuer',
        description: 'Get a renewed credential from the issuer',
        icon: '📞',
        action: () => {
          // Open contact form or support page
          window.open('/contact', '_blank');
        },
      });
      break;

    case 'NETWORK_ERROR':
      strategies.push({
        id: 'check_connection',
        label: 'Check Connection',
        description: 'Verify your internet connection and try again',
        icon: '📡',
        action: () => {
          // Try a simple connectivity check
          fetch('/api/health').catch(() => {
            alert(
              'Connection issue detected. Please check your internet connection.'
            );
          });
        },
      });
      break;

    case 'RATE_LIMIT_EXCEEDED':
      strategies.push({
        id: 'wait_and_retry',
        label: 'Wait and Retry',
        description: 'Wait a moment before trying again',
        icon: '⏱️',
        action: async () => {
          const waitTime = 5000; // 5 seconds
          setTimeout(() => {
            window.location.reload();
          }, waitTime);
        },
      });
      break;

    case 'BLOCKCHAIN_VERIFICATION_FAILED':
      strategies.push({
        id: 'skip_blockchain',
        label: 'Skip Blockchain Check',
        description: 'Verify credential without blockchain validation',
        icon: '⚡',
        action: async () => {
          // This would need to be implemented by the caller
          // by setting verifyBlockchain: false in the request
        },
      });
      break;
  }

  // Always add a "Get Help" strategy
  strategies.push({
    id: 'get_help',
    label: 'Get Help',
    description: 'Contact support for assistance',
    icon: '💬',
    action: () => {
      window.open('/support', '_blank');
    },
  });

  return strategies;
}

/**
 * Retry operation with exponential backoff
 *
 * @param operation - The operation to retry
 * @param maxAttempts - Maximum number of retry attempts
 * @param initialDelay - Initial delay in milliseconds
 * @returns Promise resolving to the operation result
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      if (attempt === maxAttempts) {
        throw lastError;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = initialDelay * Math.pow(2, attempt - 1);
      const jitter = Math.random() * delay * 0.1; // Add 10% jitter
      const totalDelay = delay + jitter;

      logger.warn(`Operation failed, retrying in ${totalDelay}ms`, {
        attempt,
        maxAttempts,
        error: lastError.message,
      });

      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
  }

  throw lastError!;
}

/**
 * Create user-friendly error messages for common scenarios
 */
export function getErrorDisplayInfo(error: CredentialError): {
  title: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  icon: string;
  showTechnicalDetails: boolean;
} {
  const errorInfo: Record<string, any> = {
    CREDENTIAL_NOT_FOUND: {
      title: 'Credential Not Found',
      severity: 'warning',
      icon: '🔍',
      showTechnicalDetails: false,
    },
    CREDENTIAL_EXPIRED: {
      title: 'Credential Expired',
      severity: 'warning',
      icon: '⏰',
      showTechnicalDetails: false,
    },
    CREDENTIAL_REVOKED: {
      title: 'Credential Revoked',
      severity: 'error',
      icon: '❌',
      showTechnicalDetails: false,
    },
    INVALID_SIGNATURE: {
      title: 'Invalid Credential',
      severity: 'error',
      icon: '⚠️',
      showTechnicalDetails: true,
    },
    NETWORK_ERROR: {
      title: 'Connection Problem',
      severity: 'warning',
      icon: '📡',
      showTechnicalDetails: false,
    },
    RATE_LIMIT_EXCEEDED: {
      title: 'Too Many Requests',
      severity: 'info',
      icon: '⏱️',
      showTechnicalDetails: false,
    },
  };

  const info = errorInfo[error.code] || {
    title: 'Unexpected Error',
    severity: 'error',
    icon: '❌',
    showTechnicalDetails: true,
  };

  return {
    ...info,
    message: error.getUserMessage(),
  };
}

/**
 * Track error metrics for monitoring
 */
export function trackCredentialError(
  error: CredentialError,
  context: Record<string, any> = {}
) {
  // In a real implementation, this would send metrics to a monitoring service
  const errorMetric = {
    timestamp: new Date().toISOString(),
    errorCode: error.code,
    statusCode: error.statusCode,
    retryable: error.retryable,
    userAgent: navigator.userAgent,
    url: window.location.href,
    context,
  };

  // For now, just log in development - will be connected to monitoring service
  if (process.env.NODE_ENV === 'development') {
    // Use proper structured logging instead of console
    // This would normally be sent to monitoring service
    // console.warn('Credential Error Tracked:', errorMetric);
  }

  // In production, send to monitoring service
  // analytics.track('credential_error', errorMetric);

  // Prevent unused variable warning during development
  void errorMetric;
}
