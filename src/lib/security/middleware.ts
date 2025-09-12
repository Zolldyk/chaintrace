/**
 * Security Middleware for QR Code API Endpoints
 *
 * Comprehensive security middleware that integrates rate limiting,
 * input sanitization, QR code validation, and threat detection.
 *
 * @since 2.4.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateQRSecurity, type QRSecurityConfig } from './qr-security';
import {
  createRateLimiter,
  createRateLimitHeaders,
  RATE_LIMIT_CONFIGS,
  type RateLimitConfig,
} from './rate-limiter';
import {
  sanitizeProductId,
  sanitizeUrlParams,
  isInputSafe,
  type SanitizationResult,
} from './input-sanitizer';
import type { QRCodeResult } from '../../types/qr';

/**
 * Security middleware configuration
 */
export interface SecurityMiddlewareConfig {
  /** Rate limiting configuration */
  rateLimit?: RateLimitConfig;

  /** QR code security validation configuration */
  qrSecurity?: Partial<QRSecurityConfig>;

  /** Enable input sanitization */
  sanitizeInput?: boolean;

  /** Enable request logging */
  enableLogging?: boolean;

  /** Custom security checks */
  customChecks?: Array<(request: NextRequest) => Promise<SecurityCheckResult>>;

  /** Whitelist of trusted IPs */
  trustedIPs?: string[];

  /** Enable CORS protection */
  corsProtection?: boolean;
}

/**
 * Security check result
 */
export interface SecurityCheckResult {
  passed: boolean;
  reason?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  action?: 'allow' | 'block' | 'log';
}

/**
 * Security context for requests
 */
export interface SecurityContext {
  clientIP: string;
  userAgent: string;
  timestamp: Date;
  endpoint: string;
  rateLimit: {
    limit: number;
    remaining: number;
    resetTime: number;
  };
  threats: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }>;
  sanitizedInputs: Record<string, any>;
}

/**
 * Default security configuration
 */
const DEFAULT_SECURITY_CONFIG: SecurityMiddlewareConfig = {
  rateLimit: RATE_LIMIT_CONFIGS.single,
  sanitizeInput: true,
  enableLogging: true,
  corsProtection: true,
  trustedIPs: ['127.0.0.1', '::1'],
};

/**
 * Create security middleware for QR code API endpoints.
 *
 * @param config - Security configuration
 * @returns Security middleware function
 *
 * @example
 * ```typescript
 * // In API route
 * const securityMiddleware = createSecurityMiddleware({
 *   rateLimit: RATE_LIMIT_CONFIGS.batch,
 *   qrSecurity: { maxDataSize: 4096 }
 * });
 *
 * export async function POST(request: NextRequest) {
 *   const securityResult = await securityMiddleware(request);
 *
 *   if (!securityResult.allowed) {
 *     return securityResult.response;
 *   }
 *
 *   const context = securityResult.context;
 *   // Use sanitized inputs from context.sanitizedInputs
 *
 *   // Process request...
 * }
 * ```
 */
export function createSecurityMiddleware(
  config: SecurityMiddlewareConfig = {}
) {
  const finalConfig = { ...DEFAULT_SECURITY_CONFIG, ...config };

  // Create rate limiter if configured
  const rateLimiter = finalConfig.rateLimit
    ? createRateLimiter(finalConfig.rateLimit)
    : null;

  return async function securityMiddleware(
    request: NextRequest,
    batchSize = 1
  ): Promise<{
    allowed: boolean;
    context: SecurityContext;
    response?: NextResponse;
  }> {
    const startTime = Date.now();
    const clientIP = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const endpoint = new URL(request.url).pathname;

    // Initialize security context
    const context: SecurityContext = {
      clientIP,
      userAgent,
      timestamp: new Date(),
      endpoint,
      rateLimit: {
        limit: finalConfig.rateLimit?.maxRequests || 100,
        remaining: 0,
        resetTime: Date.now() + (finalConfig.rateLimit?.windowMs || 60000),
      },
      threats: [],
      sanitizedInputs: {},
    };

    try {
      // 1. Check trusted IPs
      if (finalConfig.trustedIPs && finalConfig.trustedIPs.includes(clientIP)) {
        // Skip most security checks for trusted IPs
        context.rateLimit.remaining = context.rateLimit.limit;
        return { allowed: true, context };
      }

      // 2. Rate limiting
      if (rateLimiter) {
        const rateLimitResult = await rateLimiter(request, batchSize);

        context.rateLimit = {
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime,
        };

        if (!rateLimitResult.allowed) {
          if (finalConfig.enableLogging) {
            console.warn(
              `Rate limit exceeded for IP ${clientIP} on ${endpoint}`
            );
          }

          const response = new NextResponse(
            JSON.stringify({
              error: 'Rate limit exceeded',
              message: `Too many requests. Try again in ${rateLimitResult.retryAfter || 60} seconds.`,
              code: 'RATE_LIMIT_EXCEEDED',
            }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                ...createRateLimitHeaders(rateLimitResult),
              },
            }
          );

          return { allowed: false, context, response };
        }
      }

      // 3. Basic request validation
      const basicValidation = await performBasicValidation(request, context);
      if (!basicValidation.passed) {
        const response = new NextResponse(
          JSON.stringify({
            error: 'Security validation failed',
            message: basicValidation.reason,
            code: 'SECURITY_VIOLATION',
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        );

        return { allowed: false, context, response };
      }

      // 4. Input sanitization
      if (finalConfig.sanitizeInput) {
        await sanitizeRequestInputs(request, context);
      }

      // 5. Custom security checks
      if (finalConfig.customChecks) {
        for (const check of finalConfig.customChecks) {
          const checkResult = await check(request);
          if (!checkResult.passed) {
            if (
              checkResult.severity === 'critical' ||
              checkResult.action === 'block'
            ) {
              const response = new NextResponse(
                JSON.stringify({
                  error: 'Security check failed',
                  message: checkResult.reason || 'Access denied',
                  code: 'SECURITY_CHECK_FAILED',
                }),
                {
                  status: 403,
                  headers: { 'Content-Type': 'application/json' },
                }
              );

              return { allowed: false, context, response };
            }

            // Log non-blocking security issues
            context.threats.push({
              type: 'custom_check',
              severity: checkResult.severity || 'medium',
              description: checkResult.reason || 'Custom security check failed',
            });
          }
        }
      }

      // 6. Log security context if enabled
      if (finalConfig.enableLogging) {
        const processingTime = Date.now() - startTime;
        console.log(
          `Security check passed for ${clientIP} on ${endpoint} (${processingTime}ms)`
        );

        if (context.threats.length > 0) {
          console.warn(
            `Security threats detected for ${clientIP}:`,
            context.threats
          );
        }
      }

      return { allowed: true, context };
    } catch (error) {
      console.error('Security middleware error:', error);

      // Fail closed - deny access on security middleware failure
      const response = new NextResponse(
        JSON.stringify({
          error: 'Security system error',
          message: 'Unable to process request securely',
          code: 'SECURITY_SYSTEM_ERROR',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );

      return { allowed: false, context, response };
    }
  };
}

/**
 * Perform basic request validation.
 */
async function performBasicValidation(
  request: NextRequest,
  context: SecurityContext
): Promise<SecurityCheckResult> {
  try {
    // Check request size
    const contentLength = request.headers.get('content-length');
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      const maxSize = 10 * 1024 * 1024; // 10MB max

      if (size > maxSize) {
        return {
          passed: false,
          reason: `Request size ${size} exceeds maximum ${maxSize} bytes`,
          severity: 'high',
          action: 'block',
        };
      }
    }

    // Check for suspicious user agents
    const userAgent = context.userAgent.toLowerCase();
    const suspiciousAgents = [
      'scanner',
      'crawler',
      'spider',
      'bot',
      'curl',
      'wget',
      'postman',
    ];

    const isSuspiciousAgent = suspiciousAgents.some(agent =>
      userAgent.includes(agent)
    );

    if (isSuspiciousAgent) {
      context.threats.push({
        type: 'suspicious_user_agent',
        severity: 'low',
        description: `Suspicious user agent: ${context.userAgent}`,
      });
    }

    // Check request headers for anomalies
    const headers = request.headers;

    // Missing common headers might indicate automation
    if (!headers.get('accept') || !headers.get('accept-language')) {
      context.threats.push({
        type: 'missing_headers',
        severity: 'low',
        description: 'Missing common browser headers',
      });
    }

    // Check for suspicious header values
    const referer = headers.get('referer');
    if (referer && !isInputSafe(referer)) {
      return {
        passed: false,
        reason: 'Suspicious referer header detected',
        severity: 'high',
        action: 'block',
      };
    }

    return { passed: true };
  } catch (error) {
    return {
      passed: false,
      reason: `Basic validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'critical',
      action: 'block',
    };
  }
}

/**
 * Sanitize request inputs and store in context.
 */
async function sanitizeRequestInputs(
  request: NextRequest,
  context: SecurityContext
): Promise<void> {
  try {
    const url = new URL(request.url);

    // Sanitize URL parameters
    const params: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    const paramSanitization = sanitizeUrlParams(params);
    if (paramSanitization.isValid && paramSanitization.sanitized) {
      context.sanitizedInputs.urlParams = paramSanitization.sanitized;
    }

    // Sanitize request body if present
    if (request.body && request.method !== 'GET') {
      try {
        const body = await request.json();

        // Sanitize product IDs in body
        if (body.productId) {
          const sanitization = sanitizeProductId(body.productId);
          if (sanitization.isValid) {
            context.sanitizedInputs.productId = sanitization.sanitized;
          }
        }

        // Sanitize batch product IDs
        if (body.productIds && Array.isArray(body.productIds)) {
          const sanitizedIds: string[] = [];
          for (const id of body.productIds) {
            const sanitization = sanitizeProductId(id);
            if (sanitization.isValid && sanitization.sanitized) {
              sanitizedIds.push(sanitization.sanitized);
            }
          }
          context.sanitizedInputs.productIds = sanitizedIds;
        }

        // Store sanitized body
        context.sanitizedInputs.body = body;
      } catch (error) {
        // If body parsing fails, log but don't fail the request
        console.warn('Failed to parse request body for sanitization:', error);
      }
    }
  } catch (error) {
    console.error('Input sanitization failed:', error);
    // Don't fail the request on sanitization errors
  }
}

/**
 * Validate QR code results for security issues.
 *
 * @param qrCodes - QR code results to validate
 * @param config - Security configuration
 * @returns Validation results
 */
export async function validateQRCodeResults(
  qrCodes: QRCodeResult | QRCodeResult[],
  config: Partial<QRSecurityConfig> = {}
): Promise<{
  passed: boolean;
  results: Array<{
    qrCode: QRCodeResult;
    validation: ReturnType<typeof validateQRSecurity>;
  }>;
  summary: {
    total: number;
    passed: number;
    failed: number;
    highRisk: number;
  };
}> {
  const qrArray = Array.isArray(qrCodes) ? qrCodes : [qrCodes];
  const results = qrArray.map(qrCode => ({
    qrCode,
    validation: validateQRSecurity(qrCode, config),
  }));

  const summary = {
    total: results.length,
    passed: results.filter(r => r.validation.isValid).length,
    failed: results.filter(r => !r.validation.isValid).length,
    highRisk: results.filter(r => r.validation.riskScore > 70).length,
  };

  return {
    passed: summary.failed === 0 && summary.highRisk === 0,
    results,
    summary,
  };
}

/**
 * Get client IP address from request.
 */
function getClientIP(request: NextRequest): string {
  // Try various headers for real IP (when behind proxy/CDN)
  const possibleHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'cf-connecting-ip', // Cloudflare
    'x-cluster-client-ip',
    'x-forwarded',
    'forwarded-for',
    'forwarded',
  ];

  for (const header of possibleHeaders) {
    const value = request.headers.get(header);
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first one
      return value.split(',')[0].trim();
    }
  }

  // Fallback to connection info (may not be available in all environments)
  return request.ip || 'unknown';
}

/**
 * CORS protection middleware.
 */
export function createCORSMiddleware(allowedOrigins: string[] = []) {
  return function corsMiddleware(request: NextRequest): NextResponse | null {
    const origin = request.headers.get('origin');

    // Allow same-origin requests
    if (!origin) {
      return null;
    }

    // Check allowed origins
    const isAllowedOrigin =
      allowedOrigins.length === 0 ||
      allowedOrigins.includes(origin) ||
      allowedOrigins.includes('*');

    if (!isAllowedOrigin) {
      return new NextResponse('CORS: Origin not allowed', {
        status: 403,
        headers: {
          'Access-Control-Allow-Origin': 'null',
          'Content-Type': 'text/plain',
        },
      });
    }

    return null; // Allow request to proceed
  };
}

/**
 * Create comprehensive security headers.
 */
export function createSecurityHeaders(): Record<string, string> {
  return {
    // XSS Protection
    'X-XSS-Protection': '1; mode=block',

    // Content Type Options
    'X-Content-Type-Options': 'nosniff',

    // Frame Options
    'X-Frame-Options': 'DENY',

    // Referrer Policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Content Security Policy
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;",

    // Strict Transport Security (only for HTTPS)
    ...(process.env.NODE_ENV === 'production' && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    }),
  };
}
