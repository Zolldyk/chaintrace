/**
 * Utility functions for the ChainTrace application.
 * General-purpose utility functions used throughout the application.
 *
 * @since 1.0.0
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines class names using clsx and merges Tailwind CSS classes.
 *
 * @param inputs - Class values to combine and merge
 * @returns Merged class name string
 *
 * @example
 * ```typescript
 * const className = cn('px-4 py-2', 'bg-blue-500', {
 *   'text-white': isActive,
 *   'text-gray-500': !isActive
 * });
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats a timestamp into a human-readable date string.
 *
 * @param timestamp - Unix timestamp in seconds or milliseconds
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 *
 * @example
 * ```typescript
 * const formatted = formatDate(1640995200000);
 * // "Jan 1, 2022"
 *
 * const withTime = formatDate(1640995200000, {
 *   dateStyle: 'medium',
 *   timeStyle: 'short'
 * });
 * // "Jan 1, 2022, 12:00 PM"
 * ```
 */
export function formatDate(
  timestamp: number,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }
): string {
  // Handle both seconds and milliseconds timestamps
  const date = new Date(timestamp < 1e12 ? timestamp * 1000 : timestamp);
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

/**
 * Formats a Hedera account ID for display.
 *
 * @param accountId - Hedera account ID (format: "0.0.12345")
 * @returns Formatted account ID for display
 *
 * @example
 * ```typescript
 * const formatted = formatAccountId('0.0.123456789');
 * // "0.0.123...789"
 * ```
 */
export function formatAccountId(accountId: string): string {
  if (!accountId || !accountId.includes('.')) {
    return accountId;
  }

  const parts = accountId.split('.');
  if (parts.length !== 3) {
    return accountId;
  }

  const accountNum = parts[2];
  if (accountNum.length <= 6) {
    return accountId;
  }

  return `${parts[0]}.${parts[1]}.${accountNum.slice(0, 3)}...${accountNum.slice(-3)}`;
}

/**
 * Formats a hash or ID for display by showing first and last characters.
 *
 * @param hash - Hash string to truncate
 * @param prefixLength - Number of characters to show at start (default: 6)
 * @param suffixLength - Number of characters to show at end (default: 4)
 * @returns Truncated hash string
 *
 * @example
 * ```typescript
 * const truncated = truncateHash('0x1234567890abcdef');
 * // "0x1234...cdef"
 * ```
 */
export function truncateHash(
  hash: string,
  prefixLength: number = 6,
  suffixLength: number = 4
): string {
  if (!hash || hash.length <= prefixLength + suffixLength) {
    return hash;
  }

  return `${hash.slice(0, prefixLength)}...${hash.slice(-suffixLength)}`;
}

/**
 * Delays execution for the specified number of milliseconds.
 *
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after the delay
 *
 * @example
 * ```typescript
 * await sleep(1000); // Wait 1 second
 * console.log('Executed after delay');
 * ```
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generates a random ID string.
 *
 * @param length - Length of the generated ID (default: 8)
 * @returns Random ID string
 *
 * @example
 * ```typescript
 * const id = generateId(); // "a1b2c3d4"
 * const longId = generateId(16); // "a1b2c3d4e5f6g7h8"
 * ```
 */
export function generateId(length: number = 8): string {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length)
    .padEnd(length, '0');
}

/**
 * Capitalizes the first letter of a string.
 *
 * @param str - String to capitalize
 * @returns String with first letter capitalized
 *
 * @example
 * ```typescript
 * const result = capitalize('hello world'); // "Hello world"
 * ```
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Checks if a string is a valid Hedera account ID.
 *
 * @param accountId - String to validate
 * @returns True if valid Hedera account ID format
 *
 * @example
 * ```typescript
 * isValidAccountId('0.0.12345'); // true
 * isValidAccountId('invalid'); // false
 * ```
 */
export function isValidAccountId(accountId: string): boolean {
  const pattern = /^0\.0\.\d+$/;
  return pattern.test(accountId);
}

/**
 * Safely parses JSON with error handling.
 *
 * @param jsonString - JSON string to parse
 * @param fallback - Fallback value if parsing fails
 * @returns Parsed object or fallback value
 *
 * @example
 * ```typescript
 * const data = safeJsonParse('{"key": "value"}', {});
 * const invalid = safeJsonParse('invalid json', null);
 * ```
 */
export function safeJsonParse<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString);
  } catch {
    return fallback;
  }
}

/**
 * Debounces a function call by the specified delay.
 *
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 *
 * @example
 * ```typescript
 * const debouncedSearch = debounce((query: string) => {
 *   console.log('Searching:', query);
 * }, 300);
 *
 * debouncedSearch('hello'); // Will only execute after 300ms of no calls
 * ```
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// ============================================================================
// Enhanced utilities for Story 1.4: Core Data Models and Services
// ============================================================================

import type { VerificationStatus } from '../types/product';

/**
 * Product ID generation utilities with ChainTrace format
 */
export class ProductIdGenerator {
  private static readonly PREFIX = 'CT';
  private static readonly YEAR = new Date().getFullYear();
  private static sequenceCounter = 0;

  /**
   * Generate unique product ID in format CT-YYYY-XXX-ABCDEF
   *
   * @example
   * ```typescript
   * const productId = ProductIdGenerator.generate();
   * // Returns: "CT-2024-001-A3B7F2"
   * ```
   */
  static generate(): string {
    this.sequenceCounter = (this.sequenceCounter + 1) % 1000;
    const sequence = this.sequenceCounter.toString().padStart(3, '0');
    const random = this.generateRandomHex(6);

    return `${this.PREFIX}-${this.YEAR}-${sequence}-${random}`;
  }

  /**
   * Validate product ID format
   */
  static validateFormat(productId: string): boolean {
    const pattern = /^CT-\d{4}-\d{3}-[A-F0-9]{6}$/;
    return pattern.test(productId);
  }

  /**
   * Extract components from product ID
   */
  static parse(productId: string): {
    prefix: string;
    year: number;
    sequence: number;
    random: string;
  } | null {
    if (!this.validateFormat(productId)) {
      return null;
    }

    const parts = productId.split('-');
    return {
      prefix: parts[0],
      year: parseInt(parts[1], 10),
      sequence: parseInt(parts[2], 10),
      random: parts[3],
    };
  }

  private static generateRandomHex(length: number): string {
    const chars = 'ABCDEF0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

/**
 * Status mapping functions for ChainTrace Design System
 */
export class StatusMapper {
  private static readonly STATUS_COLORS = {
    created: {
      bg: 'bg-secondary-50',
      border: 'border-secondary-200',
      text: 'text-secondary-700',
    },
    processing: {
      bg: 'bg-warning-50',
      border: 'border-warning-200',
      text: 'text-warning-700',
    },
    verified: {
      bg: 'bg-success-50',
      border: 'border-success-200',
      text: 'text-success-700',
    },
    rejected: {
      bg: 'bg-error-50',
      border: 'border-error-200',
      text: 'text-error-700',
    },
    expired: {
      bg: 'bg-neutral-50',
      border: 'border-neutral-200',
      text: 'text-neutral-700',
    },
    pending: {
      bg: 'bg-warning-50',
      border: 'border-warning-200',
      text: 'text-warning-700',
    },
    unverified: {
      bg: 'bg-neutral-50',
      border: 'border-neutral-200',
      text: 'text-neutral-700',
    },
  } as const;

  private static readonly STATUS_ICONS = {
    created: 'DocumentPlusIcon',
    processing: 'ArrowPathIcon',
    verified: 'CheckCircleIcon',
    rejected: 'XCircleIcon',
    expired: 'ClockIcon',
    pending: 'ClockIcon',
    unverified: 'QuestionMarkCircleIcon',
  } as const;

  private static readonly STATUS_DISPLAY_NAMES = {
    created: 'Created',
    processing: 'Processing',
    verified: 'Verified',
    rejected: 'Rejected',
    expired: 'Expired',
    pending: 'Pending',
    unverified: 'Unverified',
  } as const;

  private static readonly STATUS_PROGRESS = {
    created: 20,
    processing: 60,
    verified: 100,
    rejected: 0,
    expired: 0,
    pending: 40,
    unverified: 0,
  } as const;

  private static readonly STATUS_ANIMATIONS = {
    created: 'animate-fade-in',
    processing: 'animate-pulse',
    verified: 'animate-slide-up',
    rejected: 'animate-bounce',
    expired: 'animate-fade-out',
    pending: 'animate-pulse',
    unverified: 'animate-fade-in',
  } as const;

  /**
   * Map Mirror Node status to ChainTrace verification status
   */
  static mapMirrorNodeStatus(status: string): VerificationStatus {
    const statusMap: Record<string, VerificationStatus> = {
      SUCCESS: 'verified',
      PENDING: 'processing',
      FAILED: 'rejected',
      CREATED: 'created',
      EXPIRED: 'expired',
    };

    return statusMap[status.toUpperCase()] || 'created';
  }

  /**
   * Map Custom Compliance Engine status to ChainTrace verification status
   */
  static mapComplianceEngineStatus(status: string): VerificationStatus {
    const statusMap: Record<string, VerificationStatus> = {
      COMPLIANT: 'verified',
      NON_COMPLIANT: 'rejected',
      UNDER_REVIEW: 'processing',
      SUBMITTED: 'created',
      EXPIRED: 'expired',
    };

    return statusMap[status.toUpperCase()] || 'created';
  }

  /**
   * Get human-readable status display name
   */
  static getStatusDisplayName(status: VerificationStatus): string {
    return this.STATUS_DISPLAY_NAMES[status];
  }

  /**
   * Get ChainTrace semantic colors for status
   */
  static getStatusSemanticColors(status: VerificationStatus): {
    bg: string;
    border: string;
    text: string;
  } {
    return this.STATUS_COLORS[status];
  }

  /**
   * Get Heroicon name for status (NO emojis)
   */
  static getStatusIcon(status: VerificationStatus): string {
    return this.STATUS_ICONS[status];
  }

  /**
   * Get progress percentage for status (0-100)
   */
  static getStatusProgress(status: VerificationStatus): number {
    return this.STATUS_PROGRESS[status];
  }

  /**
   * Get ChainTrace animation class for status
   */
  static getStatusAnimationClass(status: VerificationStatus): string {
    return this.STATUS_ANIMATIONS[status];
  }
}

/**
 * Enhanced error handling utilities
 */
export class ChainTraceError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ChainTraceError';
  }
}

/**
 * Create data validation error
 */
export function createDataValidationError(
  field: string,
  value: any,
  constraint?: string
): ChainTraceError {
  return new ChainTraceError(
    `Validation failed for field '${field}': ${constraint || 'Invalid value'}`,
    'VALIDATION_ERROR',
    { field, value, constraint }
  );
}

/**
 * Create service connection error
 */
export function createServiceConnectionError(
  service: string,
  originalError?: Error
): ChainTraceError {
  return new ChainTraceError(
    `Failed to connect to ${service} service`,
    'SERVICE_CONNECTION_ERROR',
    { service, originalError: originalError?.message }
  );
}

/**
 * Sanitize error for user display (remove sensitive information)
 */
export function sanitizeErrorForUser(error: Error): {
  message: string;
  code: string;
  timestamp: Date;
  supportCode: string;
} {
  // Generate support code for customer service
  const supportCode = `ERR-${Date.now().toString(36).toUpperCase()}`;

  // Map technical errors to user-friendly messages
  let userMessage: string;
  let errorCode: string;

  if (error instanceof ChainTraceError) {
    errorCode = error.code;
    if (error.code === 'VALIDATION_ERROR') {
      userMessage =
        'The information provided is not valid. Please check your input and try again.';
    } else if (error.code === 'SERVICE_CONNECTION_ERROR') {
      userMessage =
        'We are experiencing technical difficulties. Please try again in a moment.';
    } else {
      userMessage = error.message;
    }
  } else if (error.message.includes('timeout')) {
    userMessage =
      'The operation is taking longer than expected. Please try again.';
    errorCode = 'TIMEOUT_ERROR';
  } else if (error.message.includes('not found')) {
    userMessage = 'The requested information could not be found.';
    errorCode = 'NOT_FOUND';
  } else {
    userMessage =
      'An unexpected error occurred. Please try again or contact support.';
    errorCode = 'UNKNOWN_ERROR';
  }

  return {
    message: userMessage,
    code: errorCode,
    timestamp: new Date(),
    supportCode,
  };
}

/**
 * Enhanced timestamp formatting with multiple options
 */
export function formatTimestampAdvanced(
  timestamp: Date | string,
  format: 'relative' | 'absolute' | 'detailed' = 'relative'
): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

  if (format === 'relative') {
    return getRelativeTime(date);
  } else if (format === 'absolute') {
    return date.toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } else {
    return date.toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

/**
 * Get relative time string
 */
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString('en-NG', {
      month: 'short',
      day: 'numeric',
    });
  }
}
