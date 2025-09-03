/**
 * HTS Token Distribution API Route
 *
 * API endpoint for distributing CTRACE token rewards with validation,
 * rate limiting, and comprehensive error handling.
 *
 * @route POST /api/hedera/hts/distribute-rewards
 *
 * @example
 * POST /api/hedera/hts/distribute-rewards
 * Body: {
 *   "distributions": [
 *     {
 *       "accountId": "0.0.12345",
 *       "amount": 100,
 *       "reason": "Product verification reward"
 *     },
 *     {
 *       "accountId": "0.0.67890",
 *       "amount": 50,
 *       "reason": "Quality compliance reward"
 *     }
 *   ]
 * }
 *
 * Response: {
 *   "success": true,
 *   "data": {
 *     "transactionId": "0.0.12345-1234567890-123456789",
 *     "successfulDistributions": 2,
 *     "totalAmountDistributed": "150.00000000"
 *   }
 * }
 *
 * @since 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getHTSService,
  type RewardDistribution,
} from '@/services/hedera/HTSService';

/**
 * Request body validation schema
 */
const DistributionRequestSchema = z.object({
  distributions: z
    .array(
      z.object({
        accountId: z
          .string()
          .regex(/^0\.0\.\d+$/, 'Invalid Hedera account ID format'),
        amount: z
          .number()
          .min(0.00000001, 'Amount must be at least 0.00000001')
          .max(10000, 'Amount cannot exceed 10,000 tokens per recipient'),
        reason: z
          .string()
          .min(1, 'Reason is required')
          .max(200, 'Reason cannot exceed 200 characters')
          .optional(),
        metadata: z.record(z.any()).optional(),
      })
    )
    .min(1, 'At least one distribution is required')
    .max(100, 'Cannot distribute to more than 100 accounts at once'),
});

/**
 * API response structure
 */
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  responseTime: number;
}

/**
 * Rate limiting tracker for token distributions
 */
const distributionTracker = new Map<
  string,
  {
    count: number;
    totalAmount: number;
    resetTime: number;
  }
>();

const HOURLY_DISTRIBUTION_LIMIT = 1000000; // 1M tokens per hour per IP
const HOURLY_TRANSACTION_LIMIT = 10; // 10 distribution transactions per hour per IP

/**
 * Check if client can distribute tokens within rate limits
 */
function checkDistributionLimits(
  clientId: string,
  requestedAmount: number
): {
  allowed: boolean;
  error?: string;
} {
  const now = Date.now();
  const oneHourAgo = now - 3600000; // 1 hour in milliseconds

  // Get or initialize client's distribution history
  let tracking = distributionTracker.get(clientId);

  if (!tracking || tracking.resetTime < oneHourAgo) {
    tracking = {
      count: 0,
      totalAmount: 0,
      resetTime: now,
    };
  }

  // Check transaction count limit
  if (tracking.count >= HOURLY_TRANSACTION_LIMIT) {
    return {
      allowed: false,
      error: `Transaction limit exceeded. Maximum ${HOURLY_TRANSACTION_LIMIT} distributions per hour.`,
    };
  }

  // Check total amount limit
  if (tracking.totalAmount + requestedAmount > HOURLY_DISTRIBUTION_LIMIT) {
    return {
      allowed: false,
      error: `Amount limit exceeded. Maximum ${HOURLY_DISTRIBUTION_LIMIT} tokens per hour.`,
    };
  }

  return { allowed: true };
}

/**
 * Record a successful distribution for rate limiting
 */
function recordDistribution(clientId: string, amount: number): void {
  const now = Date.now();
  let tracking = distributionTracker.get(clientId);

  if (!tracking || tracking.resetTime < now - 3600000) {
    tracking = {
      count: 0,
      totalAmount: 0,
      resetTime: now,
    };
  }

  tracking.count += 1;
  tracking.totalAmount += amount;
  distributionTracker.set(clientId, tracking);
}

/**
 * POST handler for distributing CTRACE token rewards
 *
 * @param request - Next.js request object
 * @returns Promise resolving to JSON response
 *
 * @throws {400} Invalid request body or distribution data
 * @throws {429} Rate limiting exceeded
 * @throws {500} HTS service or transaction errors
 * @throws {503} Token service not available
 *
 * @example
 * POST /api/hedera/hts/distribute-rewards
 * Body: {
 *   "distributions": [
 *     { "accountId": "0.0.12345", "amount": 100, "reason": "Verification reward" }
 *   ]
 * }
 *
 * @security Requires valid account IDs and reasonable token amounts
 * @ratelimit 10 transactions per hour, 1M tokens per hour per client IP
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  const startTime = Date.now();

  try {
    // Get client IP for rate limiting
    const clientIp =
      request.ip ||
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      'unknown';

    // Parse and validate request body
    const body = await request.json();

    let validatedData;
    try {
      validatedData = DistributionRequestSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(
          err => `${err.path.join('.')}: ${err.message}`
        );
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: `Validation failed: ${errorMessages.join(', ')}`,
            responseTime: Date.now() - startTime,
          },
          { status: 400 }
        );
      }
      throw error;
    }

    // Calculate total distribution amount
    const totalAmount = validatedData.distributions.reduce(
      (sum, dist) => sum + dist.amount,
      0
    );

    // Check rate limiting
    const limitCheck = checkDistributionLimits(clientIp, totalAmount);
    if (!limitCheck.allowed) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: limitCheck.error || 'Rate limit exceeded',
          responseTime: Date.now() - startTime,
        },
        { status: 429 }
      );
    }

    // Get HTS service and initialize if needed
    const htsService = getHTSService({ debug: false });

    if (!htsService.isInitialized()) {
      await htsService.initialize();
    }

    // Validate token access
    const accessResult = await htsService.validateTokenAccess();
    if (!accessResult.accessible) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: `Token service not accessible: ${accessResult.error}`,
          responseTime: Date.now() - startTime,
        },
        { status: 503 }
      );
    }

    // Check treasury balance
    if (accessResult.treasuryBalance) {
      const treasuryBalance = parseFloat(accessResult.treasuryBalance.balance);
      if (treasuryBalance < totalAmount) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: `Insufficient treasury balance. Required: ${totalAmount}, Available: ${treasuryBalance}`,
            responseTime: Date.now() - startTime,
          },
          { status: 400 }
        );
      }
    }

    // Prepare distributions
    const distributions: RewardDistribution[] = validatedData.distributions.map(
      dist => ({
        accountId: dist.accountId,
        amount: dist.amount,
        reason: dist.reason || 'Token reward',
        ...(dist.metadata !== undefined && { metadata: dist.metadata }),
      })
    );

    // Execute distribution
    const result = await htsService.distributeRewards(distributions);

    if (!result.success) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: `Token distribution failed: ${result.error}`,
          responseTime: Date.now() - startTime,
        },
        { status: 500 }
      );
    }

    // Record successful distribution for rate limiting
    recordDistribution(clientIp, totalAmount);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        transactionId: result.transactionId,
        consensusTimestamp: result.consensusTimestamp,
        successfulDistributions: result.successfulDistributions,
        totalAmountDistributed: result.totalAmountDistributed,
        failedDistributions: result.failedDistributions,
        tokenInfo: accessResult.tokenInfo,
      },
      responseTime: Date.now() - startTime,
    });
  } catch (error) {
    console.error('HTS distribute-rewards API error:', error);

    let statusCode = 500;
    let errorMessage = 'Internal server error';

    if (error instanceof Error) {
      if (
        error.message.includes('not initialized') ||
        error.message.includes('Token ID not configured')
      ) {
        statusCode = 503;
        errorMessage = 'Token service not available';
      } else if (
        error.message.includes('invalid') ||
        error.message.includes('validation')
      ) {
        statusCode = 400;
        errorMessage = error.message;
      } else if (error.message.includes('insufficient')) {
        statusCode = 400;
        errorMessage = error.message;
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
 * GET handler for token balance checking
 *
 * @param request - Next.js request object
 * @returns Promise resolving to token balance information
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'accountId parameter is required',
          responseTime: Date.now() - startTime,
        },
        { status: 400 }
      );
    }

    // Validate account ID format
    const accountIdRegex = /^0\.0\.\d+$/;
    if (!accountIdRegex.test(accountId)) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Invalid Hedera account ID format',
          responseTime: Date.now() - startTime,
        },
        { status: 400 }
      );
    }

    const htsService = getHTSService();

    if (!htsService.isInitialized()) {
      await htsService.initialize();
    }

    const balance = await htsService.getTokenBalance(accountId);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: balance,
      responseTime: Date.now() - startTime,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: `Failed to get token balance: ${errorMessage}`,
        responseTime: Date.now() - startTime,
      },
      { status: 500 }
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
