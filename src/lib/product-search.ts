/**
 * Product search utility functions for enhanced manual entry interface.
 *
 * @since 1.0.0
 */

import {
  ProductIdFormatState,
  SearchValidationResult,
  AutoCompleteSuggestion,
  SearchHistoryItem,
  SearchError,
  SearchErrorType,
} from '@/types/search';

/**
 * Product ID format patterns
 */
const PRODUCT_ID_PATTERNS = {
  // ChainTrace format: CT-YYYY-XXX-ABCDEF
  CHAINTRACE: /^CT-\d{4}-\d{3}-[A-F0-9]{6}$/,
  // Legacy format support
  LEGACY: /^[A-Z]{2,4}-[A-Z0-9]{3,}-[A-Z0-9]{3,}$/i,
  // Partial format for real-time validation
  PARTIAL_CT: /^CT(-\d{0,4}(-\d{0,3}(-[A-F0-9]{0,6})?)?)?$/i,
};

/**
 * Formats product ID input with real-time formatting and validation.
 *
 * @param input - Raw user input
 * @returns Formatted product ID state
 *
 * @example
 * ```typescript
 * const state = formatProductId('ct2024123abc123');
 * console.log(state.formattedValue); // 'CT-2024-123-ABC123'
 * console.log(state.isValid); // true
 * ```
 */
export function formatProductId(input: string): ProductIdFormatState {
  if (!input) {
    return {
      rawValue: '',
      formattedValue: '',
      isValid: false,
      suggestions: ['CT-YYYY-XXX-XXXXXX'],
    };
  }

  const cleanInput = input.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  // Auto-format ChainTrace pattern
  if (cleanInput.startsWith('CT') || cleanInput.length <= 12) {
    const formatted = autoFormatChainTrace(cleanInput);
    const isValid = PRODUCT_ID_PATTERNS.CHAINTRACE.test(
      formatted.replace(/[_\s]/g, '')
    );

    return {
      rawValue: input,
      formattedValue: formatted,
      isValid,
      errorMessage: isValid
        ? undefined
        : 'Product ID must follow format: CT-YYYY-XXX-XXXXXX',
      suggestions: isValid ? [] : generateFormatSuggestions(cleanInput),
    };
  }

  // Handle legacy formats
  const isLegacyValid = PRODUCT_ID_PATTERNS.LEGACY.test(input);

  return {
    rawValue: input,
    formattedValue: input.toUpperCase(),
    isValid: isLegacyValid,
    errorMessage: isLegacyValid ? undefined : 'Invalid product ID format',
    suggestions: isLegacyValid ? [] : ['CT-YYYY-XXX-XXXXXX'],
  };
}

/**
 * Auto-formats input to ChainTrace pattern: CT-YYYY-XXX-XXXXXX
 *
 * @param cleanInput - Cleaned alphanumeric input
 * @returns Formatted string with hyphens and placeholders
 */
function autoFormatChainTrace(cleanInput: string): string {
  let formatted = '';

  // Start with CT
  if (cleanInput.length === 0) return 'CT-____-___-______';
  if (cleanInput.length === 1 && cleanInput !== 'C')
    return 'CT-____-___-______';
  if (cleanInput.length === 2 && cleanInput !== 'CT')
    return 'CT-____-___-______';

  formatted = 'CT';

  // Add year (4 digits)
  if (cleanInput.length > 2) {
    formatted += '-' + cleanInput.slice(2, 6);
    if (cleanInput.length < 6) {
      formatted += '_'.repeat(6 - cleanInput.length);
    }
  } else {
    formatted += '-____';
  }

  // Add sequence (3 digits)
  if (cleanInput.length > 6) {
    formatted += '-' + cleanInput.slice(6, 9);
    if (cleanInput.length < 9) {
      formatted += '_'.repeat(9 - cleanInput.length);
    }
  } else {
    formatted += '-___';
  }

  // Add hex code (6 characters)
  if (cleanInput.length > 9) {
    formatted += '-' + cleanInput.slice(9, 15);
    if (cleanInput.length < 15) {
      formatted += '_'.repeat(15 - cleanInput.length);
    }
  } else {
    formatted += '-______';
  }

  return formatted;
}

/**
 * Generates format suggestions based on input.
 *
 * @param input - User input
 * @returns Array of suggested formats
 */
function generateFormatSuggestions(input: string): string[] {
  const suggestions = ['CT-YYYY-XXX-XXXXXX'];

  // Add current year suggestion
  const currentYear = new Date().getFullYear();
  suggestions.push(`CT-${currentYear}-123-ABC123`);

  // If input has some valid parts, suggest completion
  if (input.length >= 2) {
    const cleanInput = input.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (cleanInput.startsWith('CT')) {
      const partial = autoFormatChainTrace(cleanInput).replace(/_/g, '');
      if (partial.length > 3) {
        suggestions.unshift(partial + '...');
      }
    }
  }

  return suggestions;
}

/**
 * Validates product ID format with detailed error messages.
 *
 * @param productId - Product ID to validate
 * @returns Validation result with suggestions
 *
 * @example
 * ```typescript
 * const result = validateProductId('CT-2024-123-ABC123');
 * console.log(result.valid); // true
 * ```
 */
export function validateProductId(productId: string): SearchValidationResult {
  if (!productId || !productId.trim()) {
    return {
      valid: false,
      error: 'Product ID is required',
      formatHints: ['Enter a product ID in format: CT-YYYY-XXX-XXXXXX'],
    };
  }

  const trimmed = productId.trim();

  // Check ChainTrace format
  if (PRODUCT_ID_PATTERNS.CHAINTRACE.test(trimmed)) {
    return { valid: true };
  }

  // Check legacy format
  if (PRODUCT_ID_PATTERNS.LEGACY.test(trimmed)) {
    return { valid: true };
  }

  // Provide specific error messages
  if (trimmed.startsWith('CT-')) {
    return {
      valid: false,
      error: 'Invalid ChainTrace product ID format',
      suggestions: generateFixSuggestions(trimmed),
      formatHints: [
        'Format: CT-YYYY-XXX-XXXXXX',
        'Example: CT-2024-123-ABC123',
      ],
    };
  }

  return {
    valid: false,
    error: 'Invalid product ID format',
    suggestions: ['CT-2024-123-ABC123'],
    formatHints: [
      'ChainTrace format: CT-YYYY-XXX-XXXXXX',
      'Legacy format: ABC-123-DEF',
    ],
  };
}

/**
 * Generates suggestions for fixing malformed product IDs.
 *
 * @param malformed - Malformed product ID
 * @returns Array of suggested fixes
 */
function generateFixSuggestions(malformed: string): string[] {
  const suggestions: string[] = [];

  // Try to fix common issues
  const parts = malformed.split('-');

  if (parts.length >= 2 && parts[0] === 'CT') {
    // Fix year part
    if (parts[1] && parts[1].length !== 4) {
      const year = parts[1].padStart(4, '0').slice(0, 4);
      suggestions.push(`CT-${year}-123-ABC123`);
    }

    // Fix sequence part
    if (parts[2] && parts[2].length !== 3) {
      const seq = parts[2].padStart(3, '0').slice(0, 3);
      suggestions.push(`CT-2024-${seq}-ABC123`);
    }

    // Fix hex part
    if (parts[3] && parts[3].length !== 6) {
      const hex = parts[3].toUpperCase().padEnd(6, 'A').slice(0, 6);
      suggestions.push(`CT-2024-123-${hex}`);
    }
  }

  return suggestions.slice(0, 3); // Limit to 3 suggestions
}

/**
 * Performs fuzzy matching for auto-complete suggestions.
 *
 * @param query - Search query
 * @param candidates - Array of candidate strings
 * @param threshold - Minimum match score (0-1)
 * @returns Array of matches with scores
 *
 * @example
 * ```typescript
 * const matches = fuzzyMatch('ct2024', ['CT-2024-123-ABC123', 'CT-2023-456-DEF456']);
 * console.log(matches[0].score); // 0.85
 * ```
 */
export function fuzzyMatch(
  query: string,
  candidates: string[],
  threshold: number = 0.6
): Array<{ candidate: string; score: number }> {
  const queryLower = query.toLowerCase();
  const matches: Array<{ candidate: string; score: number }> = [];

  for (const candidate of candidates) {
    const candidateLower = candidate.toLowerCase();
    const score = calculateFuzzyScore(queryLower, candidateLower);

    if (score >= threshold) {
      matches.push({ candidate, score });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

/**
 * Calculates fuzzy match score between two strings.
 *
 * @param query - Search query
 * @param target - Target string
 * @returns Match score between 0 and 1
 */
function calculateFuzzyScore(query: string, target: string): number {
  if (query === target) return 1;
  if (query.length === 0) return 0;

  // Check for substring match
  if (target.includes(query)) {
    return 0.8 + 0.2 * (query.length / target.length);
  }

  // Check for character sequence match
  let matchCount = 0;
  let targetIndex = 0;

  for (let i = 0; i < query.length; i++) {
    const char = query[i];
    const nextIndex = target.indexOf(char, targetIndex);

    if (nextIndex !== -1) {
      matchCount++;
      targetIndex = nextIndex + 1;
    }
  }

  return (matchCount / query.length) * 0.6;
}

/**
 * Creates auto-complete suggestions from search history and known products.
 *
 * @param query - Current search query
 * @param history - Search history items
 * @param maxSuggestions - Maximum number of suggestions to return
 * @returns Array of auto-complete suggestions
 *
 * @example
 * ```typescript
 * const suggestions = createAutoCompleteSuggestions('CT-2024', history, 5);
 * console.log(suggestions.length); // <= 5
 * ```
 */
export function createAutoCompleteSuggestions(
  query: string,
  history: SearchHistoryItem[],
  maxSuggestions: number = 5
): AutoCompleteSuggestion[] {
  const suggestions: AutoCompleteSuggestion[] = [];

  if (!query || query.length < 2) {
    // Show recent successful searches
    return history
      .filter(item => item.wasSuccessful)
      .slice(0, maxSuggestions)
      .map(item => ({
        productId: item.productId,
        label: item.productName || item.productId,
        matchScore: 1,
        fromHistory: true,
        verificationStatus: item.verificationStatus,
        lastVerified: item.searchedAt,
      }));
  }

  // Get matches from history
  const historyProducts = history.map(item => item.productId);
  const historyMatches = fuzzyMatch(query, historyProducts, 0.5);

  historyMatches.slice(0, maxSuggestions).forEach(match => {
    const historyItem = history.find(
      item => item.productId === match.candidate
    );
    if (historyItem) {
      suggestions.push({
        productId: match.candidate,
        label: historyItem.productName || match.candidate,
        matchScore: match.score,
        fromHistory: true,
        verificationStatus: historyItem.verificationStatus,
        lastVerified: historyItem.searchedAt,
      });
    }
  });

  // Add format suggestions if input looks like it's being typed
  if (
    query.toUpperCase().startsWith('CT') &&
    suggestions.length < maxSuggestions
  ) {
    const formatSuggestion = autoFormatChainTrace(
      query.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    );
    if (formatSuggestion !== query && !formatSuggestion.includes('_')) {
      suggestions.push({
        productId: formatSuggestion,
        label: `${formatSuggestion} (format suggestion)`,
        matchScore: 0.7,
        fromHistory: false,
      });
    }
  }

  return suggestions.slice(0, maxSuggestions);
}

/**
 * Creates a search error with appropriate type and suggestions.
 *
 * @param error - Raw error object or message
 * @param productId - Product ID that caused the error
 * @returns Formatted search error
 *
 * @example
 * ```typescript
 * const searchError = createSearchError(new Error('Network timeout'), 'CT-2024-123-ABC123');
 * console.log(searchError.type); // 'TIMEOUT'
 * ```
 */
export function createSearchError(
  error: Error | string | unknown,
  productId?: string
): SearchError {
  const message = error instanceof Error ? error.message : String(error);

  // Determine error type based on message
  let type: SearchErrorType = 'UNKNOWN_ERROR';
  let retryable = false;
  let suggestions: string[] = [];

  if (message.includes('timeout') || message.includes('TIMEOUT')) {
    type = 'TIMEOUT';
    retryable = true;
    suggestions = ['Check your internet connection and try again'];
  } else if (message.includes('rate limit') || message.includes('RATE_LIMIT')) {
    type = 'RATE_LIMITED';
    retryable = true;
    suggestions = ['Please wait a moment before searching again'];
  } else if (message.includes('not found') || message.includes('NOT_FOUND')) {
    type = 'NOT_FOUND';
    retryable = false;
    suggestions = [
      'Double-check the product ID',
      'Try scanning the QR code instead',
      'Contact the producer if the product should exist',
    ];
  } else if (message.includes('network') || message.includes('NETWORK')) {
    type = 'NETWORK_ERROR';
    retryable = true;
    suggestions = ['Check your internet connection and try again'];
  } else if (message.includes('format') || message.includes('invalid')) {
    type = 'INVALID_FORMAT';
    retryable = false;
    suggestions = [
      'Use format: CT-YYYY-XXX-XXXXXX',
      'Example: CT-2024-123-ABC123',
    ];
  }

  return {
    type,
    message: message || 'An unknown error occurred',
    retryable,
    suggestions,
    details: productId ? { productId } : undefined,
  };
}

/**
 * Debounces a function to prevent excessive calls during rapid input.
 *
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 *
 * @example
 * ```typescript
 * const debouncedValidate = debounce(validateProductId, 300);
 * debouncedValidate('CT-2024-123-ABC123');
 * ```
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
}
