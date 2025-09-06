/**
 * Product Verification API Route
 *
 * Standardized endpoint for product verification with comprehensive error handling
 * and response format matching the ProductVerificationResponse interface.
 *
 * @route GET /api/products/[productId]/verify
 *
 * @example
 * GET /api/products/PROD-2024-001/verify
 * Response: {
 *   "product": {
 *     "productId": "PROD-2024-001",
 *     "status": "verified",
 *     "verified": true,
 *     "events": [...],
 *     "createdAt": "2024-01-01T00:00:00Z",
 *     "updatedAt": "2024-01-15T10:30:00Z"
 *   },
 *   "metadata": {
 *     "requestedAt": "2024-01-15T10:30:00Z",
 *     "responseTime": 1250,
 *     "fromCache": false
 *   }
 * }
 *
 * @since 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMirrorNodeService } from '@/services/hedera/MirrorNodeService';
import { logger } from '@/lib/logger';
import {
  ProductVerificationResponse,
  ProductVerificationError,
  ProductLookupError,
  ProductWithEvents,
} from '@/types';

/**
 * Cache for product verification responses
 */
const verificationCache = new Map<
  string,
  {
    data: ProductWithEvents;
    timestamp: number;
    ttl: number;
  }
>();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 1000; // Prevent memory leaks

/**
 * Get cached verification response if available and not expired
 */
function getCachedVerification(productId: string): ProductWithEvents | null {
  const cached = verificationCache.get(productId);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data;
  }
  if (cached) {
    verificationCache.delete(productId);
  }
  return null;
}

/**
 * Cache verification response with TTL and size management
 */
function setCachedVerification(
  productId: string,
  data: ProductWithEvents,
  ttl: number = CACHE_TTL
): void {
  // Simple LRU-like cache management
  if (verificationCache.size >= MAX_CACHE_SIZE) {
    const firstKey = verificationCache.keys().next().value;
    if (firstKey) {
      verificationCache.delete(firstKey);
    }
  }

  verificationCache.set(productId, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

/**
 * Validates product ID format
 */
function validateProductId(productId: string): boolean {
  if (!productId || typeof productId !== 'string') {
    return false;
  }

  const trimmed = productId.trim();
  if (trimmed.length < 3 || trimmed.length > 50) {
    return false;
  }

  // Allow alphanumeric characters, hyphens, and underscores
  const productIdRegex = /^[A-Z0-9][A-Z0-9\-_]{2,}$/i;
  return productIdRegex.test(trimmed);
}

/**
 * Creates a ProductVerificationError response
 */
function createErrorResponse(
  code: ProductLookupError,
  message: string,
  statusCode: number,
  responseTime: number,
  details?: Record<string, any>
): NextResponse<ProductVerificationError> {
  const error: ProductVerificationError = {
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
    retryable: code !== 'INVALID_PRODUCT_ID' && code !== 'PRODUCT_NOT_FOUND',
  };

  logger.error('Product verification error', new Error(`${code}: ${message}`), {
    responseTime,
    statusCode,
    details,
  });

  return NextResponse.json(error, { status: statusCode });
}

/**
 * Transforms Mirror Node product data to our standard format
 */
function transformProductData(
  mirrorNodeData: any,
  productId: string
): ProductWithEvents {
  const now = new Date().toISOString();

  return {
    // Required Product fields
    id: productId,
    batchId: mirrorNodeData.batchId || 'UNKNOWN',
    name: mirrorNodeData.name || 'Unknown Product',
    category: mirrorNodeData.category || 'other',
    status: mirrorNodeData.status || 'unverified',
    origin: mirrorNodeData.origin || {
      address: 'Unknown',
      city: 'Unknown',
      state: 'Unknown',
      country: 'Nigeria',
      coordinates: { latitude: 0, longitude: 0 },
      region: 'Unknown',
    },
    quantity: mirrorNodeData.quantity || { amount: 0, unit: 'pieces' },
    createdAt: new Date(mirrorNodeData.createdAt || now),
    updatedAt: new Date(mirrorNodeData.lastUpdated || now),
    qrCode: mirrorNodeData.qrCode || productId,
    guardianCredentialId: mirrorNodeData.guardianCredentialId || null,
    hcsTopicId: mirrorNodeData.hcsTopicId || '0.0.0',
    metadata: mirrorNodeData.metadata || {},

    // ProductWithEvents additional fields
    productId: productId,
    description: mirrorNodeData.description || undefined,
    verified: mirrorNodeData.verified || false,
    events: mirrorNodeData.events || [],
    lastVerified: mirrorNodeData.verified
      ? mirrorNodeData.lastUpdated
      : undefined,
    expiresAt: mirrorNodeData.expiresAt || undefined,
  };
}

/**
 * GET handler for product verification
 *
 * @param request - Next.js request object
 * @param context - Route context with params
 * @returns Promise resolving to ProductVerificationResponse or error
 *
 * @throws {400} Invalid product ID format
 * @throws {404} Product not found in blockchain records
 * @throws {429} Rate limit exceeded
 * @throws {503} Service temporarily unavailable
 * @throws {500} Internal server error
 *
 * @example
 * GET /api/products/PROD-2024-001/verify?skipCache=false&timeout=30000
 * Response: ProductVerificationResponse
 *
 * @security Public endpoint for product verification
 * @ratelimit Inherits from MirrorNodeService rate limiting
 */
export async function GET(
  request: NextRequest,
  context: { params: { productId: string } }
): Promise<
  NextResponse<ProductVerificationResponse | ProductVerificationError>
> {
  const startTime = Date.now();
  const { productId } = context.params;
  const { searchParams } = new URL(request.url);

  const skipCache = searchParams.get('skipCache') === 'true';
  const timeout = searchParams.get('timeout')
    ? parseInt(searchParams.get('timeout')!)
    : undefined;

  try {
    logger.info('Product verification request', {
      productId,
      skipCache,
      timeout,
      userAgent: request.headers.get('user-agent'),
    });

    // Validate product ID format
    if (!validateProductId(productId)) {
      return createErrorResponse(
        'INVALID_PRODUCT_ID',
        'Invalid product ID format. Product ID must be 3-50 characters long and contain only alphanumeric characters, hyphens, and underscores.',
        400,
        Date.now() - startTime,
        { productId }
      );
    }

    const normalizedProductId = productId.trim().toUpperCase();

    // Check cache first unless skipCache is requested
    let productData: ProductWithEvents | null = null;
    let fromCache = false;

    if (!skipCache) {
      productData = getCachedVerification(normalizedProductId);
      fromCache = productData !== null;
    }

    // Fetch from Mirror Node if not cached or cache skipped
    if (!productData) {
      try {
        const mirrorNodeService = getMirrorNodeService({
          debug: false,
          ...(timeout && { timeout }),
        });

        const mirrorNodeData =
          await mirrorNodeService.getProductVerification(normalizedProductId);

        productData = transformProductData(mirrorNodeData, normalizedProductId);

        // Cache the response
        setCachedVerification(normalizedProductId, productData);
        fromCache = false;
      } catch (error) {
        // Handle Mirror Node service errors
        if (error instanceof Error) {
          if (
            error.message.includes('not found') ||
            error.message.includes('404')
          ) {
            return createErrorResponse(
              'PRODUCT_NOT_FOUND',
              `Product '${productId}' not found in blockchain records. Please verify the product ID is correct.`,
              404,
              Date.now() - startTime,
              { productId }
            );
          }

          if (
            error.message.includes('rate limit') ||
            error.message.includes('429')
          ) {
            return createErrorResponse(
              'RATE_LIMIT_EXCEEDED',
              'Too many requests. Please try again in a few moments.',
              429,
              Date.now() - startTime,
              { productId, retryAfter: 60 }
            );
          }

          if (error.message.includes('timeout')) {
            return createErrorResponse(
              'MIRROR_NODE_TIMEOUT',
              'The verification request timed out. The product may exist but the service is currently slow. Please try again.',
              503,
              Date.now() - startTime,
              { productId, timeout }
            );
          }

          if (error.message.includes('Mirror Node')) {
            return createErrorResponse(
              'MIRROR_NODE_ERROR',
              'Unable to connect to blockchain verification service. Please try again later.',
              503,
              Date.now() - startTime,
              { productId, originalError: error.message }
            );
          }
        }

        // Generic network/unknown error
        return createErrorResponse(
          'UNKNOWN_ERROR',
          'An unexpected error occurred during verification. Please try again later.',
          500,
          Date.now() - startTime,
          { productId }
        );
      }
    }

    // Create successful response
    const responseTime = Date.now() - startTime;
    const response: ProductVerificationResponse = {
      product: productData,
      metadata: {
        requestedAt: new Date().toISOString(),
        responseTime,
        fromCache,
        ...(fromCache && {
          cacheExpiresAt: new Date(Date.now() + CACHE_TTL).toISOString(),
        }),
      },
    };

    logger.info('Product verification success', {
      productId: normalizedProductId,
      responseTime,
      fromCache,
      status: productData.status,
      verified: productData.verified,
    });

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': fromCache
          ? 'public, max-age=300'
          : 'public, max-age=60',
        'X-Response-Time': responseTime.toString(),
        'X-From-Cache': fromCache.toString(),
      },
    });
  } catch (error) {
    logger.error(
      'Unexpected error in product verification endpoint',
      error instanceof Error ? error : new Error(String(error)),
      {
        productId,
        responseTime: Date.now() - startTime,
      }
    );

    return createErrorResponse(
      'UNKNOWN_ERROR',
      'An unexpected server error occurred. Please try again later.',
      500,
      Date.now() - startTime,
      { productId }
    );
  }
}

/**
 * OPTIONS handler for CORS support
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
      'Access-Control-Expose-Headers': 'X-Response-Time, X-From-Cache',
    },
  });
}
