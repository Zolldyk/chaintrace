/**
 * Mirror Node Product Verification API Route
 *
 * Edge Function for fast product verification lookup via Mirror Node API
 * with caching and performance optimization for sub-30 second response times.
 *
 * @route GET /api/hedera/mirror-node/[productId]
 *
 * @example
 * GET /api/hedera/mirror-node/PROD-2024-001-ABC123
 * Response: {
 *   "success": true,
 *   "data": {
 *     "productId": "PROD-2024-001-ABC123",
 *     "verified": true,
 *     "status": "verified",
 *     "events": [...],
 *     "lastUpdated": "2024-01-15T10:30:00Z"
 *   },
 *   "responseTime": 245,
 *   "cached": false
 * }
 *
 * @since 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMirrorNodeService } from '@/services/hedera/MirrorNodeService';

/**
 * API response structure
 */
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  responseTime: number;
  cached?: boolean;
}

/**
 * Cache for Mirror Node responses (simple in-memory cache for Edge Function)
 */
const responseCache = new Map<
  string,
  {
    data: any;
    timestamp: number;
    ttl: number;
  }
>();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached response if available and not expired
 */
function getCachedResponse(key: string): any | null {
  const cached = responseCache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data;
  }
  if (cached) {
    responseCache.delete(key);
  }
  return null;
}

/**
 * Cache response with TTL
 */
function setCachedResponse(
  key: string,
  data: any,
  ttl: number = CACHE_TTL
): void {
  responseCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

/**
 * Validate product ID format
 */
function validateProductId(productId: string): boolean {
  // ChainTrace product ID format: PROD-YYYY-NNN-XXXXX
  const productIdRegex = /^[A-Z]{2,6}-\d{4}-\d{3}-[A-Z0-9]{5,10}$/i;
  return productIdRegex.test(productId);
}

/**
 * GET handler for product verification lookup
 *
 * @param request - Next.js request object
 * @param context - Route context with params
 * @returns Promise resolving to JSON response
 *
 * @throws {400} Invalid product ID format
 * @throws {404} Product not found in Mirror Node records
 * @throws {500} Mirror Node service connectivity issues
 * @throws {429} Rate limiting exceeded - try again later
 *
 * @example
 * GET /api/hedera/mirror-node/PROD-2024-001
 * Response: {
 *   "success": true,
 *   "data": {
 *     "verified": true,
 *     "status": "COMPLIANT",
 *     "events": [...]
 *   }
 * }
 *
 * @security Requires valid product ID format for regulatory access
 * @ratelimit 100 requests per minute per IP via Mirror Node service
 */
export async function GET(
  _request: NextRequest,
  context: { params: { productId: string } }
): Promise<NextResponse<ApiResponse>> {
  const startTime = Date.now();
  const { productId } = context.params;

  try {
    // Validate product ID format
    if (!validateProductId(productId)) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error:
            'Invalid product ID format. Expected format: PROD-YYYY-NNN-XXXXX',
          responseTime: Date.now() - startTime,
        },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = `product:${productId.toUpperCase()}`;
    const cachedData = getCachedResponse(cacheKey);

    if (cachedData) {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: cachedData,
        responseTime: Date.now() - startTime,
        cached: true,
      });
    }

    // Get Mirror Node service
    const mirrorNodeService = getMirrorNodeService({ debug: false });

    // Query product verification data
    const productData = await mirrorNodeService.getProductVerification(
      productId.toUpperCase()
    );

    // Cache the response
    setCachedResponse(cacheKey, productData);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: productData,
      responseTime: Date.now() - startTime,
      cached: false,
    });
  } catch (error) {
    // Error handled silently

    // Determine error type and status code
    let statusCode = 500;
    let errorMessage = 'Internal server error';

    if (error instanceof Error) {
      if (
        error.message.includes('not found') ||
        error.message.includes('404')
      ) {
        statusCode = 404;
        errorMessage = 'Product not found in blockchain records';
      } else if (
        error.message.includes('rate limit') ||
        error.message.includes('429')
      ) {
        statusCode = 429;
        errorMessage = 'Rate limit exceeded. Please try again later.';
      } else if (error.message.includes('timeout')) {
        statusCode = 503;
        errorMessage = 'Mirror Node service temporarily unavailable';
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: errorMessage,
        responseTime: Date.now() - startTime,
      },
      { status: statusCode }
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
    },
  });
}
