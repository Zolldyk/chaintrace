/**
 * Input Sanitization Utilities
 *
 * Comprehensive input validation and sanitization for ChainTrace application.
 * Prevents injection attacks, validates data formats, and sanitizes user input.
 *
 * @since 2.4.0
 */

/**
 * Sanitization error types
 */
export type SanitizationErrorCode =
  | 'INVALID_FORMAT'
  | 'MALICIOUS_CONTENT'
  | 'SIZE_LIMIT_EXCEEDED'
  | 'ENCODING_ERROR'
  | 'SUSPICIOUS_PATTERN';

/**
 * Input sanitization error
 */
export class SanitizationError extends Error {
  constructor(
    public code: SanitizationErrorCode,
    message: string,
    public originalInput?: string
  ) {
    super(message);
    this.name = 'SanitizationError';
  }
}

/**
 * Sanitization result
 */
export interface SanitizationResult<T = string> {
  isValid: boolean;
  sanitized: T | null;
  errors: string[];
  warnings: string[];
}

/**
 * Product ID sanitization options
 */
export interface ProductIdSanitizationOptions {
  /** Allow legacy format IDs */
  allowLegacyFormat?: boolean;

  /** Maximum length for product IDs */
  maxLength?: number;

  /** Strict format validation */
  strictFormat?: boolean;
}

/**
 * Batch input sanitization options
 */
export interface BatchSanitizationOptions {
  /** Maximum batch size */
  maxBatchSize?: number;

  /** Skip invalid items instead of failing */
  skipInvalid?: boolean;

  /** Maximum total size for batch */
  maxTotalSize?: number;
}

/**
 * Sanitizes and validates a product ID input.
 *
 * Handles various input formats, removes malicious content,
 * and validates against the expected ChainTrace format.
 *
 * @param input - Raw product ID input
 * @param options - Sanitization options
 * @returns Sanitization result
 *
 * @example
 * ```typescript
 * const result = sanitizeProductId('  ct-2024-123-abc123  ');
 * if (result.isValid) {
 *   console.log('Sanitized ID:', result.sanitized); // "CT-2024-123-ABC123"
 * }
 * ```
 *
 * @since 2.4.0
 */
export function sanitizeProductId(
  input: unknown,
  options: ProductIdSanitizationOptions = {}
): SanitizationResult<string> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Basic type validation
    if (typeof input !== 'string') {
      errors.push(`Invalid input type: expected string, got ${typeof input}`);
      return { isValid: false, sanitized: null, errors, warnings };
    }

    const rawInput = input as string;

    // Check for null or empty input
    if (!rawInput || rawInput.trim().length === 0) {
      errors.push('Product ID cannot be empty');
      return { isValid: false, sanitized: null, errors, warnings };
    }

    // Check length limits
    const maxLength = options.maxLength || 50;
    if (rawInput.length > maxLength) {
      errors.push(
        `Product ID too long: ${rawInput.length} characters (max: ${maxLength})`
      );
      return { isValid: false, sanitized: null, errors, warnings };
    }

    // Initial sanitization
    let sanitized = rawInput.trim().toUpperCase();

    // Remove potentially malicious characters
    const originalLength = sanitized.length;
    sanitized = sanitized.replace(/[^\w\-]/g, ''); // Keep only alphanumeric and hyphens

    if (sanitized.length !== originalLength) {
      warnings.push('Removed invalid characters from product ID');
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /script/i,
      /javascript/i,
      /vbscript/i,
      /onload/i,
      /onerror/i,
      /%[0-9a-f]{2}/i, // URL encoding
      /&[#a-z0-9]+;/i, // HTML entities
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(sanitized)) {
        errors.push('Product ID contains suspicious patterns');
        return { isValid: false, sanitized: null, errors, warnings };
      }
    }

    // Validate format
    if (options.strictFormat !== false) {
      // ChainTrace format: CT-YYYY-XXX-ABCDEF
      const ctFormatRegex = /^CT-\d{4}-\d{3}-[A-F0-9]{6}$/;

      if (ctFormatRegex.test(sanitized)) {
        // Valid ChainTrace format
        return { isValid: true, sanitized, errors, warnings };
      }

      // Check for legacy format if allowed
      if (options.allowLegacyFormat) {
        const legacyFormatRegex = /^[A-Z0-9][A-Z0-9\-]{2,}$/;
        if (legacyFormatRegex.test(sanitized)) {
          warnings.push('Using legacy product ID format');
          return { isValid: true, sanitized, errors, warnings };
        }
      }

      errors.push(
        'Product ID does not match expected format (CT-YYYY-XXX-ABCDEF)'
      );
      return { isValid: false, sanitized: null, errors, warnings };
    }

    return { isValid: true, sanitized, errors, warnings };
  } catch (error) {
    errors.push(
      `Sanitization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return { isValid: false, sanitized: null, errors, warnings };
  }
}

/**
 * Sanitizes a batch of product IDs.
 *
 * @param inputs - Array of raw product ID inputs
 * @param options - Batch sanitization options
 * @returns Sanitization results for each input
 */
export function sanitizeProductIdBatch(
  inputs: unknown[],
  options: BatchSanitizationOptions & ProductIdSanitizationOptions = {}
): {
  results: Array<SanitizationResult<string> & { originalIndex: number }>;
  summary: {
    total: number;
    valid: number;
    invalid: number;
    warnings: number;
  };
} {
  const maxBatchSize = options.maxBatchSize || 100;

  if (inputs.length > maxBatchSize) {
    throw new SanitizationError(
      'SIZE_LIMIT_EXCEEDED',
      `Batch size ${inputs.length} exceeds maximum ${maxBatchSize}`
    );
  }

  const results = inputs.map((input, index) => ({
    ...sanitizeProductId(input, options),
    originalIndex: index,
  }));

  // Calculate summary
  const summary = {
    total: results.length,
    valid: results.filter(r => r.isValid).length,
    invalid: results.filter(r => !r.isValid).length,
    warnings: results.filter(r => r.warnings.length > 0).length,
  };

  // Filter out invalid items if skipInvalid is true
  if (options.skipInvalid) {
    const validResults = results.filter(r => r.isValid);
    return { results: validResults, summary };
  }

  return { results, summary };
}

/**
 * Sanitizes URL parameters for QR code generation.
 *
 * @param params - URL search parameters
 * @returns Sanitized parameters
 */
export function sanitizeUrlParams(
  params: Record<string, string | undefined>
): SanitizationResult<Record<string, string>> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const sanitized: Record<string, string> = {};

  try {
    const allowedParams = ['source', 'timestamp', 'ref', 'campaign'];
    const maxParamLength = 200;

    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) {
        continue;
      }

      // Validate parameter name
      if (!allowedParams.includes(key)) {
        warnings.push(`Ignored unknown parameter: ${key}`);
        continue;
      }

      // Sanitize value
      let sanitizedValue = String(value).trim();

      // Check length
      if (sanitizedValue.length > maxParamLength) {
        errors.push(
          `Parameter '${key}' value too long: ${sanitizedValue.length} characters`
        );
        continue;
      }

      // Remove potentially dangerous characters
      const originalValue = sanitizedValue;
      sanitizedValue = sanitizedValue
        .replace(/[<>'"&]/g, '') // Remove HTML-dangerous chars
        .replace(/javascript:|data:|vbscript:/gi, '') // Remove dangerous protocols
        .replace(/[^\w\-._~:/?#[\]@!$&'()*+,;=]/g, ''); // Keep only URL-safe chars

      if (sanitizedValue !== originalValue) {
        warnings.push(`Sanitized parameter '${key}' value`);
      }

      // Special validation for specific parameters
      switch (key) {
        case 'source':
          if (!['qr', 'link', 'email', 'sms'].includes(sanitizedValue)) {
            warnings.push(
              `Invalid source value: ${sanitizedValue}, defaulting to 'qr'`
            );
            sanitizedValue = 'qr';
          }
          break;

        case 'timestamp':
          if (!/^\d+$/.test(sanitizedValue)) {
            warnings.push(`Invalid timestamp format: ${sanitizedValue}`);
            continue;
          }
          break;
      }

      sanitized[key] = sanitizedValue;
    }

    return {
      isValid: errors.length === 0,
      sanitized,
      errors,
      warnings,
    };
  } catch (error) {
    return {
      isValid: false,
      sanitized: {},
      errors: [
        `URL parameter sanitization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ],
      warnings,
    };
  }
}

/**
 * Sanitizes file upload input for QR code storage.
 *
 * @param file - File object or file data
 * @param allowedTypes - Allowed MIME types
 * @param maxSize - Maximum file size in bytes
 * @returns Sanitization result
 */
export function sanitizeFileInput(
  file: any,
  allowedTypes: string[] = [
    'image/png',
    'image/jpeg',
    'image/svg+xml',
    'image/webp',
  ],
  maxSize: number = 5 * 1024 * 1024 // 5MB
): SanitizationResult<any> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    if (!file) {
      errors.push('File is required');
      return { isValid: false, sanitized: null, errors, warnings };
    }

    // Check file size
    if (file.size && file.size > maxSize) {
      errors.push(`File size ${file.size} exceeds maximum ${maxSize} bytes`);
    }

    // Check MIME type
    if (file.type && !allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed`);
    }

    // Sanitize filename if present
    if (file.name) {
      const originalName = file.name;
      const sanitizedName = originalName
        .replace(/[^a-zA-Z0-9.-]/g, '') // Keep only safe chars
        .substring(0, 100); // Limit length

      if (sanitizedName !== originalName) {
        warnings.push('Sanitized filename');
        file.name = sanitizedName;
      }
    }

    return {
      isValid: errors.length === 0,
      sanitized: file,
      errors,
      warnings,
    };
  } catch (error) {
    return {
      isValid: false,
      sanitized: null,
      errors: [
        `File sanitization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ],
      warnings,
    };
  }
}

/**
 * Detects and prevents common injection attack patterns.
 *
 * @param input - Input string to check
 * @returns True if input appears safe
 */
export function isInputSafe(input: string): boolean {
  const injectionPatterns = [
    // SQL injection patterns
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,

    // XSS patterns
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,

    // Command injection patterns
    /[;&|`$(){}]/,

    // Path traversal
    /\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c/gi,

    // LDAP injection
    /[()&|!]/,

    // NoSQL injection
    /\$\w+/g,
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(input)) {
      return false;
    }
  }

  return true;
}

/**
 * Escapes special characters for safe HTML output.
 *
 * @param input - String to escape
 * @returns HTML-escaped string
 */
export function escapeHtml(input: string): string {
  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
  };

  return input.replace(
    /[&<>"'/]/g,
    char => htmlEscapes[char as keyof typeof htmlEscapes]
  );
}

/**
 * Validates and sanitizes JSON input.
 *
 * @param input - Raw JSON string or object
 * @param maxDepth - Maximum object depth allowed
 * @param maxKeys - Maximum number of keys allowed
 * @returns Sanitization result
 */
export function sanitizeJsonInput(
  input: unknown,
  maxDepth: number = 10,
  maxKeys: number = 100
): SanitizationResult<any> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    let parsed: any;

    if (typeof input === 'string') {
      try {
        parsed = JSON.parse(input);
      } catch (error) {
        errors.push('Invalid JSON format');
        return { isValid: false, sanitized: null, errors, warnings };
      }
    } else {
      parsed = input;
    }

    // Check object depth
    const depth = getObjectDepth(parsed);
    if (depth > maxDepth) {
      errors.push(`Object depth ${depth} exceeds maximum ${maxDepth}`);
    }

    // Count total keys
    const keyCount = countObjectKeys(parsed);
    if (keyCount > maxKeys) {
      errors.push(`Object has ${keyCount} keys, exceeds maximum ${maxKeys}`);
    }

    return {
      isValid: errors.length === 0,
      sanitized: parsed,
      errors,
      warnings,
    };
  } catch (error) {
    return {
      isValid: false,
      sanitized: null,
      errors: [
        `JSON sanitization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ],
      warnings,
    };
  }
}

/**
 * Calculate object depth recursively.
 */
function getObjectDepth(obj: any, currentDepth = 1): number {
  if (obj === null || typeof obj !== 'object') {
    return currentDepth;
  }

  let maxDepth = currentDepth;
  for (const value of Object.values(obj)) {
    const depth = getObjectDepth(value, currentDepth + 1);
    maxDepth = Math.max(maxDepth, depth);
  }

  return maxDepth;
}

/**
 * Count total keys in object recursively.
 */
function countObjectKeys(obj: any): number {
  if (obj === null || typeof obj !== 'object') {
    return 0;
  }

  let count = Object.keys(obj).length;
  for (const value of Object.values(obj)) {
    count += countObjectKeys(value);
  }

  return count;
}
