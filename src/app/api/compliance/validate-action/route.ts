import { NextRequest, NextResponse } from 'next/server';
import {
  ComplianceService,
  ComplianceValidationRequest,
} from '@/services/hedera/ComplianceService';

/**
 * Compliance action validation endpoint
 *
 * @route POST /api/compliance/validate-action
 * @param request - Compliance validation request with action details
 * @returns {ComplianceValidationResult} Validation result with compliance status
 * @throws {400} Invalid request parameters or missing required fields
 * @throws {401} Unauthorized access or invalid authentication
 * @throws {500} Compliance engine connectivity issues or internal errors
 * @throws {429} Rate limiting exceeded - try again later
 *
 * @example
 * POST /api/compliance/validate-action
 * Request: {
 *   "action": "product_verification",
 *   "productId": "CT-2024-001-ABC123",
 *   "actor": {
 *     "walletAddress": "0.0.67890",
 *     "role": "verifier"
 *   },
 *   "data": {
 *     "verificationMethod": "qr_scan",
 *     "location": "warehouse_a"
 *   }
 * }
 * Response: {
 *   "isCompliant": true,
 *   "complianceScore": 0.95,
 *   "violations": [],
 *   "recommendations": ["Consider updating verification timestamp"],
 *   "validatedAt": "2024-01-01T12:00:00Z"
 * }
 *
 * @security Requires valid wallet signature for regulatory access
 * @ratelimit 100 requests per minute per IP
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = (await request.json()) as ComplianceValidationRequest;

    // Validate required fields
    if (!body.action || !body.productId || !body.actor) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: action, productId, and actor are required',
        },
        { status: 400 }
      );
    }

    if (!body.actor.walletAddress || !body.actor.role) {
      return NextResponse.json(
        { error: 'Actor must include walletAddress and role' },
        { status: 400 }
      );
    }

    // Initialize compliance service
    const complianceService = new ComplianceService({
      baseUrl: process.env.COMPLIANCE_ENGINE_URL || 'http://localhost:3001',
      apiKey: process.env.COMPLIANCE_API_KEY || 'dev-key-123',
      timeout: 30000,
    });

    // Validate the action
    const validationResult = await complianceService.validateAction(body);

    // Return validation result
    return NextResponse.json(validationResult, { status: 200 });
  } catch (error) {
    console.error('Compliance validation error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return NextResponse.json(
          { error: 'Compliance engine timeout - service may be unavailable' },
          { status: 503 }
        );
      }

      if (error.message.includes('HTTP 401')) {
        return NextResponse.json(
          { error: 'Unauthorized access to compliance engine' },
          { status: 401 }
        );
      }

      if (error.message.includes('HTTP 429')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded - please try again later' },
          { status: 429 }
        );
      }
    }

    // Generic server error
    return NextResponse.json(
      { error: 'Internal server error during compliance validation' },
      { status: 500 }
    );
  }
}
