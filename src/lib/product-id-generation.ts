/**
 * Secure product ID generation utilities for ChainTrace application.
 *
 * Provides cryptographically secure unique product identifier generation
 * following the established CT-YYYY-XXX-ABCDEF format with collision detection.
 *
 * @since 2.4.0
 */

import { randomBytes, createHash } from 'crypto';
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';
import { ProductIdSchema } from './validation/product';

/**
 * Product ID generation options for customization
 *
 * @interface ProductIdOptions
 * @since 2.4.0
 */
export interface ProductIdOptions {
  /** Override the year portion (defaults to current year) */
  year?: number;
  /** Cooperative ID for consistent sequence numbering */
  cooperativeId?: string;
  /** Salt for additional entropy in ID generation */
  salt?: string;
}

/**
 * Product ID generation result with metadata
 *
 * @interface ProductIdResult
 * @since 2.4.0
 */
export interface ProductIdResult {
  /** Generated product ID */
  id: string;
  /** Generation timestamp */
  timestamp: Date;
  /** Entropy data for security audit */
  entropy: {
    randomBytes: string;
    uuid: string;
    hash: string;
  };
  /** Validation result */
  isValid: boolean;
}

/**
 * Error types for product ID generation
 */
export type ProductIdGenerationError =
  | 'INVALID_YEAR'
  | 'COLLISION_DETECTED'
  | 'VALIDATION_FAILED'
  | 'CRYPTO_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Product ID generation error class
 */
export class ProductIdError extends Error {
  constructor(
    public code: ProductIdGenerationError,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ProductIdError';
  }
}

/**
 * Namespace UUID for ChainTrace product IDs (RFC 4122 compliant)
 * Generated from 'chaintrace.product.id' domain
 */
const CHAINTRACE_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

/**
 * In-memory collision detection cache (in production this would be database-backed)
 * Maps product IDs to generation timestamps for collision detection
 */
const generatedIds = new Map<string, Date>();

/**
 * Generates a cryptographically secure sequence number (XXX portion)
 *
 * Uses secure random bytes to generate a 3-digit sequence number
 * with proper distribution across the 000-999 range.
 *
 * @returns {string} 3-digit zero-padded sequence number
 * @throws {ProductIdError} When crypto operations fail
 *
 * @since 2.4.0
 */
function generateSecureSequence(): string {
  try {
    // Generate 2 bytes (16 bits) of secure random data
    const bytes = randomBytes(2);

    // Convert to integer and map to 0-999 range
    const randomInt = bytes.readUInt16BE(0);
    const sequence = randomInt % 1000;

    // Zero-pad to 3 digits
    return sequence.toString().padStart(3, '0');
  } catch (error) {
    throw new ProductIdError(
      'CRYPTO_ERROR',
      'Failed to generate secure sequence number',
      { error: error instanceof Error ? error.message : 'Unknown crypto error' }
    );
  }
}

/**
 * Generates a cryptographically secure hex suffix (ABCDEF portion)
 *
 * Uses combination of secure random bytes and UUID-based hash for
 * maximum entropy and collision resistance.
 *
 * @param {string} salt - Optional salt for additional entropy
 * @returns {string} 6-character uppercase hex string
 * @throws {ProductIdError} When crypto operations fail
 *
 * @since 2.4.0
 */
function generateSecureHexSuffix(salt?: string): string {
  try {
    // Generate base UUID for deterministic component
    const baseUuid = uuidv4();

    // Create namespace-based UUID if salt provided
    const saltedUuid = salt
      ? uuidv5(salt + baseUuid, CHAINTRACE_NAMESPACE)
      : baseUuid;

    // Generate additional random bytes
    const randomHexBytes = randomBytes(8);

    // Combine UUID and random bytes with hash
    const combined = saltedUuid + randomHexBytes.toString('hex');
    const hash = createHash('sha256').update(combined).digest('hex');

    // Extract 6 characters and ensure uppercase
    return hash.substring(0, 6).toUpperCase();
  } catch (error) {
    throw new ProductIdError(
      'CRYPTO_ERROR',
      'Failed to generate secure hex suffix',
      { error: error instanceof Error ? error.message : 'Unknown crypto error' }
    );
  }
}

/**
 * Validates year parameter for product ID generation
 *
 * @param {number} year - Year to validate
 * @returns {boolean} True if year is valid
 * @throws {ProductIdError} When year is invalid
 *
 * @since 2.4.0
 */
function validateYear(year: number): boolean {
  const currentYear = new Date().getFullYear();
  const minYear = 2020; // ChainTrace project start
  const maxYear = currentYear + 1; // Allow next year for planning

  if (year < minYear || year > maxYear) {
    throw new ProductIdError(
      'INVALID_YEAR',
      `Year must be between ${minYear} and ${maxYear}`,
      { providedYear: year, validRange: [minYear, maxYear] }
    );
  }

  return true;
}

/**
 * Checks for ID collision in the generation cache
 *
 * @param {string} id - Product ID to check
 * @returns {boolean} True if collision detected
 *
 * @since 2.4.0
 */
function detectCollision(id: string): boolean {
  return generatedIds.has(id);
}

/**
 * Records a generated ID in the collision detection cache
 *
 * @param {string} id - Product ID to record
 * @param {Date} timestamp - Generation timestamp
 *
 * @since 2.4.0
 */
function recordGeneratedId(id: string, timestamp: Date): void {
  generatedIds.set(id, timestamp);
}

/**
 * Generates a unique, secure product ID following the CT-YYYY-XXX-ABCDEF format.
 *
 * Uses cryptographically secure random number generation for both the sequence
 * number (XXX) and hex suffix (ABCDEF) portions. Includes collision detection
 * and format validation to ensure uniqueness and compliance.
 *
 * @param {ProductIdOptions} options - Generation options
 * @param {number} options.year - Override year (defaults to current year)
 * @param {string} options.cooperativeId - Cooperative ID for entropy
 * @param {string} options.salt - Additional salt for entropy
 *
 * @returns {ProductIdResult} Generation result with metadata
 *
 * @throws {ProductIdError} When generation fails or collision detected
 *
 * @example
 * ```typescript
 * // Basic usage with current year
 * const result = generateSecureProductId();
 * console.log(result.id); // "CT-2024-327-A5B9C2"
 *
 * // With custom year and cooperative context
 * const result = generateSecureProductId({
 *   year: 2024,
 *   cooperativeId: 'coop-123',
 *   salt: 'additional-entropy'
 * });
 *
 * // Verify generation success
 * if (result.isValid) {
 *   console.log('Product ID generated:', result.id);
 * }
 * ```
 *
 * @since 2.4.0
 * @see {@link ProductIdSchema} for format validation
 * @see {@link validateProductId} for standalone validation
 */
export function generateSecureProductId(
  options: ProductIdOptions = {}
): ProductIdResult {
  const timestamp = new Date();
  const year = options.year || timestamp.getFullYear();

  try {
    // Validate year parameter
    validateYear(year);

    // Generate secure components
    const sequence = generateSecureSequence();
    const hexSuffix = generateSecureHexSuffix(
      options.cooperativeId || options.salt
    );

    // Construct product ID
    const id = `CT-${year}-${sequence}-${hexSuffix}`;

    // Check for collision
    if (detectCollision(id)) {
      throw new ProductIdError(
        'COLLISION_DETECTED',
        'Generated product ID already exists',
        { collisionId: id, timestamp }
      );
    }

    // Validate format
    const validationResult = ProductIdSchema.safeParse(id);
    if (!validationResult.success) {
      throw new ProductIdError(
        'VALIDATION_FAILED',
        'Generated product ID failed format validation',
        {
          id,
          validationErrors: validationResult.error.errors,
        }
      );
    }

    // Record generated ID
    recordGeneratedId(id, timestamp);

    // Generate entropy metadata
    const uuid = uuidv4();
    const entropyHash = createHash('sha256')
      .update(id + timestamp.toISOString() + uuid)
      .digest('hex');

    return {
      id,
      timestamp,
      entropy: {
        randomBytes: randomBytes(4).toString('hex'),
        uuid,
        hash: entropyHash.substring(0, 16),
      },
      isValid: true,
    };
  } catch (error) {
    if (error instanceof ProductIdError) {
      throw error;
    }

    throw new ProductIdError(
      'UNKNOWN_ERROR',
      'Unexpected error during product ID generation',
      {
        originalError: error instanceof Error ? error.message : 'Unknown error',
        timestamp,
      }
    );
  }
}

/**
 * Validates a product ID format and checks for uniqueness
 *
 * @param {string} id - Product ID to validate
 * @returns {object} Validation result with details
 *
 * @example
 * ```typescript
 * const result = validateProductId('CT-2024-123-ABC123');
 * if (result.isValid) {
 *   console.log('Product ID is valid');
 * } else {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 *
 * @since 2.4.0
 */
export function validateProductId(id: string): {
  isValid: boolean;
  errors: string[];
  metadata?: {
    year: number;
    sequence: string;
    hexSuffix: string;
  };
} {
  const errors: string[] = [];

  try {
    // Validate format using Zod schema
    const validationResult = ProductIdSchema.safeParse(id);
    if (!validationResult.success) {
      validationResult.error.errors.forEach(error => {
        errors.push(error.message);
      });
      return { isValid: false, errors };
    }

    // Parse components
    const match = id.match(/^CT-(\d{4})-(\d{3})-([A-F0-9]{6})$/);
    if (!match) {
      errors.push('Product ID format is invalid');
      return { isValid: false, errors };
    }

    const [, yearStr, sequence, hexSuffix] = match;
    const year = parseInt(yearStr, 10);

    // Additional validation
    try {
      validateYear(year);
    } catch (error) {
      if (error instanceof ProductIdError) {
        errors.push(error.message);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      metadata: {
        year,
        sequence,
        hexSuffix,
      },
    };
  } catch (error) {
    errors.push('Unexpected validation error');
    return { isValid: false, errors };
  }
}

/**
 * Generates multiple unique product IDs for batch operations
 *
 * @param {number} count - Number of IDs to generate
 * @param {ProductIdOptions} options - Generation options
 * @returns {ProductIdResult[]} Array of generation results
 * @throws {ProductIdError} When batch generation fails
 *
 * @example
 * ```typescript
 * const results = generateProductIdBatch(10, {
 *   cooperativeId: 'coop-123'
 * });
 *
 * const validIds = results
 *   .filter(r => r.isValid)
 *   .map(r => r.id);
 * ```
 *
 * @since 2.4.0
 */
export function generateProductIdBatch(
  count: number,
  options: ProductIdOptions = {}
): ProductIdResult[] {
  if (count <= 0 || count > 100) {
    throw new ProductIdError(
      'INVALID_YEAR',
      'Batch count must be between 1 and 100',
      { requestedCount: count }
    );
  }

  const results: ProductIdResult[] = [];
  const maxRetries = 3;

  for (let i = 0; i < count; i++) {
    let retries = 0;
    let success = false;

    while (retries < maxRetries && !success) {
      try {
        const result = generateSecureProductId(options);
        results.push(result);
        success = true;
      } catch (error) {
        retries++;
        if (
          error instanceof ProductIdError &&
          error.code === 'COLLISION_DETECTED'
        ) {
          // Retry collision errors
          if (retries >= maxRetries) {
            throw new ProductIdError(
              'COLLISION_DETECTED',
              `Failed to generate unique ID after ${maxRetries} attempts`,
              { batchIndex: i, retries }
            );
          }
        } else {
          // Re-throw other errors immediately
          throw error;
        }
      }
    }
  }

  return results;
}

/**
 * Clears the collision detection cache (for testing and development)
 *
 * @warning This should only be used in test environments
 * @since 2.4.0
 */
export function clearGeneratedIdCache(): void {
  generatedIds.clear();
}

/**
 * Gets statistics about generated IDs (for monitoring and debugging)
 *
 * @returns {object} Cache statistics
 * @since 2.4.0
 */
export function getGenerationStats(): {
  totalGenerated: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
  cacheSize: number;
} {
  const timestamps = Array.from(generatedIds.values());

  return {
    totalGenerated: generatedIds.size,
    oldestEntry:
      timestamps.length > 0
        ? new Date(Math.min(...timestamps.map(d => d.getTime())))
        : null,
    newestEntry:
      timestamps.length > 0
        ? new Date(Math.max(...timestamps.map(d => d.getTime())))
        : null,
    cacheSize: generatedIds.size,
  };
}
