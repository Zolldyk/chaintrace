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
