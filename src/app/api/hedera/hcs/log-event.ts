/**
 * HCS Event Logging API Route
 *
 * API endpoint for logging product events to Hedera Consensus Service (HCS)
 * with proper validation, error handling, and response formatting.
 *
 * @route POST /api/hedera/hcs/log-event
 *
 * @example
 * POST /api/hedera/hcs/log-event
 * Body: {
 *   "productId": "PROD-2024-001-ABC123",
 *   "eventType": "verified",
 *   "actor": {
 *     "walletAddress": "0.0.12345",
 *     "role": "verifier"
 *   },
 *   "location": {
 *     "coordinates": "40.7128,-74.0060",
 *     "facility": "NYC Processing Center"
 *   }
 * }
 *
 * Response: {
 *   "success": true,
 *   "data": {
 *     "transactionId": "0.0.12345-1234567890-123456789",
 *     "consensusTimestamp": "1234567890.123456789",
 *     "sequenceNumber": 42
 *   }
 * }
 *
 * @since 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getHCSService, type ProductEvent } from '@/services/hedera/HCSService';

/**
 * Request body validation schema
 */
const EventLogRequestSchema = z.object({
  productId: z
    .string()
    .min(5, 'Product ID must be at least 5 characters')
    .max(50, 'Product ID must be at most 50 characters')
    .regex(/^[A-Z0-9\-]+$/i, 'Product ID contains invalid characters'),

  eventType: z.enum([
    'created',
    'verified',
    'rejected',
    'updated',
    'transferred',
    'compliance_checked',
  ]),

  actor: z.object({
    walletAddress: z
      .string()
      .min(1, 'Wallet address is required')
      .regex(/^0\.0\.\d+$/, 'Invalid Hedera account ID format'),
    role: z.enum(['producer', 'verifier', 'regulator', 'system']),
    name: z.string().optional(),
  }),

  location: z
    .object({
      coordinates: z.string().optional(),
      address: z.string().optional(),
      facility: z.string().optional(),
    })
    .optional(),

  data: z.record(z.any()).optional(),

  metadata: z
    .object({
      source: z.string().default('api'),
      version: z.string().default('1.0.0'),
      description: z.string().optional(),
    })
    .optional(),
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
 * Rate limiting tracker for HCS submissions
 */
const submissionTracker = new Map<string, number[]>();
const RATE_LIMIT_PER_MINUTE = 10; // 10 submissions per minute per IP

/**
 * Check if client can submit messages within rate limits
 */
function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  // Get or initialize client's submission history
  let submissions = submissionTracker.get(clientId) || [];

  // Remove submissions older than 1 minute
  submissions = submissions.filter(timestamp => timestamp > oneMinuteAgo);

  // Update the tracker
  submissionTracker.set(clientId, submissions);

  // Check if within limits
  return submissions.length < RATE_LIMIT_PER_MINUTE;
}

/**
 * Record a submission for rate limiting
 */
function recordSubmission(clientId: string): void {
  const submissions = submissionTracker.get(clientId) || [];
  submissions.push(Date.now());
  submissionTracker.set(clientId, submissions);
}

/**
 * POST handler for logging product events to HCS
 *
 * @param request - Next.js request object
 * @returns Promise resolving to JSON response
 *
 * @throws {400} Invalid request body or product data
 * @throws {429} Rate limiting exceeded
 * @throws {500} HCS service or transaction errors
 *
 * @example
 * POST /api/hedera/hcs/log-event
 * Body: {
 *   "productId": "PROD-2024-001",
 *   "eventType": "verified",
 *   "actor": {
 *     "walletAddress": "0.0.12345",
 *     "role": "verifier"
 *   }
 * }
 *
 * @security Requires valid product event structure
 * @ratelimit 10 submissions per minute per client IP
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  const startTime = Date.now();

  try {
    // Get client IP for rate limiting
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Check rate limiting
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Rate limit exceeded. Maximum 10 submissions per minute.',
          responseTime: Date.now() - startTime,
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();

    let validatedData;
    try {
      validatedData = EventLogRequestSchema.parse(body);
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

    // Create product event object
    const productEvent: ProductEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      productId: validatedData.productId.toUpperCase(),
      eventType: validatedData.eventType,
      actor: {
        walletAddress: validatedData.actor.walletAddress,
        role: validatedData.actor.role,
        ...(validatedData.actor.name !== undefined && {
          name: validatedData.actor.name,
        }),
      },
      timestamp: new Date().toISOString(),
      ...(validatedData.location !== undefined && {
        location: validatedData.location,
      }),
      ...(validatedData.data !== undefined && { data: validatedData.data }),
      metadata: {
        source: 'api',
        version: '1.0.0',
        ...(validatedData.metadata?.description !== undefined && {
          description: validatedData.metadata.description,
        }),
      },
    };

    // Get HCS service and log event
    const hcsService = getHCSService({ debug: false });

    if (!hcsService.isInitialized()) {
      await hcsService.initialize();
    }

    const result = await hcsService.logProductEvent(productEvent);

    if (!result.success) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: `HCS submission failed: ${result.error}`,
          responseTime: Date.now() - startTime,
        },
        { status: 500 }
      );
    }

    // Record successful submission for rate limiting
    recordSubmission(clientIp);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        eventId: productEvent.id,
        transactionId: result.transactionId,
        consensusTimestamp: result.consensusTimestamp,
        sequenceNumber: result.sequenceNumber,
        runningHash: result.runningHash,
      },
      responseTime: Date.now() - startTime,
    });
  } catch (error) {
    // Error handled silently

    let statusCode = 500;
    let errorMessage = 'Internal server error';

    if (error instanceof Error) {
      if (
        error.message.includes('not initialized') ||
        error.message.includes('Topic ID not configured')
      ) {
        statusCode = 503;
        errorMessage = 'HCS service not available';
      } else if (
        error.message.includes('invalid') ||
        error.message.includes('validation')
      ) {
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
 * GET handler for HCS service status
 *
 * @param request - Next.js request object
 * @returns Promise resolving to service status
 */
export async function GET(): Promise<NextResponse<ApiResponse>> {
  const startTime = Date.now();

  try {
    const hcsService = getHCSService();

    if (!hcsService.isInitialized()) {
      await hcsService.initialize();
    }

    const accessResult = await hcsService.validateTopicAccess();

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        service: 'HCS',
        status: accessResult.accessible ? 'healthy' : 'unhealthy',
        topicId: hcsService.getConfig().topicId,
        accessible: accessResult.accessible,
        error: accessResult.error,
      },
      responseTime: Date.now() - startTime,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: `HCS service status check failed: ${errorMessage}`,
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
