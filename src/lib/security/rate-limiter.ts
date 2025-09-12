/**
 * Rate Limiting Utilities for QR Code Generation
 *
 * Provides configurable rate limiting for QR code generation endpoints
 * to prevent abuse and resource exhaustion attacks.
 *
 * @since 2.4.0
 */

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number;

  /** Time window in milliseconds */
  windowMs: number;

  /** Maximum batch size per request */
  maxBatchSize?: number;

  /** Custom identifier function */
  keyGenerator?: (request: any) => string;

  /** Skip rate limiting function */
  skip?: (request: any) => boolean;

  /** Custom response when rate limited */
  onRateLimited?: (request: any) => any;
}

/**
 * Rate limit entry
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * In-memory rate limiter for QR generation endpoints
 *
 * Note: In production, this should be replaced with Redis or similar
 * distributed cache to work across multiple server instances.
 */
export class QRRateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private config: RateLimitConfig;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: RateLimitConfig) {
    this.config = config;

    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000
    );
  }

  /**
   * Check if request should be rate limited
   *
   * @param identifier - Unique identifier for rate limiting (IP, user ID, etc.)
   * @param batchSize - Size of batch request (for bulk operations)
   * @returns Rate limit result
   */
  checkLimit(identifier: string, batchSize = 1): RateLimitResult {
    const now = Date.now();
    const resetTime = now + this.config.windowMs;

    // Check batch size limit
    if (this.config.maxBatchSize && batchSize > this.config.maxBatchSize) {
      return {
        allowed: false,
        limit: this.config.maxRequests,
        remaining: 0,
        resetTime,
        retryAfter: Math.ceil(this.config.windowMs / 1000),
      };
    }

    let entry = this.store.get(identifier);

    // Create new entry if doesn't exist or window expired
    if (!entry || now >= entry.resetTime) {
      entry = {
        count: batchSize,
        resetTime,
        firstRequest: now,
      };
      this.store.set(identifier, entry);

      return {
        allowed: true,
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests - batchSize,
        resetTime,
      };
    }

    // Check if adding this request would exceed limit
    const newCount = entry.count + batchSize;
    if (newCount > this.config.maxRequests) {
      return {
        allowed: false,
        limit: this.config.maxRequests,
        remaining: Math.max(0, this.config.maxRequests - entry.count),
        resetTime: entry.resetTime,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      };
    }

    // Update count
    entry.count = newCount;
    this.store.set(identifier, entry);

    return {
      allowed: true,
      limit: this.config.maxRequests,
      remaining: this.config.maxRequests - newCount,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Reset rate limit for specific identifier
   *
   * @param identifier - Identifier to reset
   */
  reset(identifier: string): void {
    this.store.delete(identifier);
  }

  /**
   * Get current status for identifier
   *
   * @param identifier - Identifier to check
   * @returns Current rate limit status
   */
  getStatus(identifier: string): RateLimitResult | null {
    const entry = this.store.get(identifier);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now >= entry.resetTime) {
      this.store.delete(identifier);
      return null;
    }

    return {
      allowed: entry.count < this.config.maxRequests,
      limit: this.config.maxRequests,
      remaining: Math.max(0, this.config.maxRequests - entry.count),
      resetTime: entry.resetTime,
    };
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Destroy the rate limiter and cleanup
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    this.store.clear();
  }

  /**
   * Get current store size (for monitoring)
   */
  getStoreSize(): number {
    return this.store.size;
  }
}

/**
 * Default rate limit configurations for different endpoints
 */
export const RATE_LIMIT_CONFIGS = {
  /** Individual QR code generation */
  single: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    maxBatchSize: 1,
  },

  /** Batch QR code generation */
  batch: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    maxBatchSize: 50,
  },

  /** QR code verification */
  verify: {
    maxRequests: 500,
    windowMs: 60 * 1000, // 1 minute
    maxBatchSize: 1,
  },

  /** Administrative operations */
  admin: {
    maxRequests: 1000,
    windowMs: 60 * 1000, // 1 minute
    maxBatchSize: 100,
  },
} as const;

/**
 * Create rate limiter middleware for Next.js API routes
 *
 * @param config - Rate limit configuration
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * // In API route
 * const rateLimiter = createRateLimiter(RATE_LIMIT_CONFIGS.batch);
 *
 * export async function POST(request: Request) {
 *   const result = await rateLimiter(request);
 *   if (!result.allowed) {
 *     return new Response('Rate limit exceeded', {
 *       status: 429,
 *       headers: {
 *         'X-RateLimit-Limit': result.limit.toString(),
 *         'X-RateLimit-Remaining': result.remaining.toString(),
 *         'X-RateLimit-Reset': result.resetTime.toString(),
 *         'Retry-After': result.retryAfter?.toString() || '60'
 *       }
 *     });
 *   }
 *
 *   // Process request...
 * }
 * ```
 */
export function createRateLimiter(config: RateLimitConfig) {
  const limiter = new QRRateLimiter(config);

  return async function rateLimitMiddleware(
    request: Request,
    batchSize = 1
  ): Promise<RateLimitResult> {
    try {
      // Generate identifier
      const identifier = config.keyGenerator
        ? config.keyGenerator(request)
        : getDefaultIdentifier(request);

      // Check if should skip
      if (config.skip && config.skip(request)) {
        return {
          allowed: true,
          limit: config.maxRequests,
          remaining: config.maxRequests,
          resetTime: Date.now() + config.windowMs,
        };
      }

      // Check rate limit
      const result = limiter.checkLimit(identifier, batchSize);

      // Call custom handler if rate limited
      if (!result.allowed && config.onRateLimited) {
        config.onRateLimited(request);
      }

      return result;
    } catch (error) {
      // Rate limiter error handled silently

      // Fail open - allow request if rate limiter fails
      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests,
        resetTime: Date.now() + config.windowMs,
      };
    }
  };
}

/**
 * Get default identifier for rate limiting (IP address)
 */
function getDefaultIdentifier(request: Request): string {
  // Try to get real IP from headers (when behind proxy)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to connection remote address
  // Note: This may not work in all deployment environments
  return request.headers.get('x-client-ip') || 'unknown';
}

/**
 * Create rate limit response headers
 *
 * @param result - Rate limit result
 * @returns Headers object
 */
export function createRateLimitHeaders(
  result: RateLimitResult
): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
  };

  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return headers;
}

/**
 * Utility to check if request is from trusted source
 *
 * @param request - Request object
 * @returns True if request is from trusted source
 */
export function isTrustedSource(request: Request): boolean {
  // Check for internal service token
  const token = request.headers.get('x-internal-token');
  if (token === process.env.INTERNAL_SERVICE_TOKEN) {
    return true;
  }

  // Check for localhost/internal IPs
  const ip = getDefaultIdentifier(request);
  const trustedIPs = ['127.0.0.1', '::1', 'localhost'];

  return trustedIPs.includes(ip);
}

/**
 * Export global rate limiter instances for reuse
 */
export const qrRateLimiters = {
  single: new QRRateLimiter(RATE_LIMIT_CONFIGS.single),
  batch: new QRRateLimiter(RATE_LIMIT_CONFIGS.batch),
  verify: new QRRateLimiter(RATE_LIMIT_CONFIGS.verify),
  admin: new QRRateLimiter(RATE_LIMIT_CONFIGS.admin),
};
