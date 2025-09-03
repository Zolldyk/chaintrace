import { NextRequest, NextResponse } from 'next/server';
import {
  ComplianceService,
  SupplyChainValidationRequest,
} from '@/services/hedera/ComplianceService';

/**
 * Supply chain validation endpoint
 *
 * @route POST /api/compliance/supply-chain
 * @param request - Supply chain validation request with journey data
 * @returns {SupplyChainValidationResult} Validation result with compliance analysis
 * @throws {400} Invalid request parameters or missing required fields
 * @throws {401} Unauthorized access or invalid authentication
 * @throws {500} Compliance engine connectivity issues or internal errors
 * @throws {429} Rate limiting exceeded - try again later
 *
 * @example
 * POST /api/compliance/supply-chain
 * Request: {
 *   "productId": "CT-2024-001-ABC123",
 *   "journey": [
 *     {
 *       "stage": "harvest",
 *       "timestamp": "2024-01-01T00:00:00Z",
 *       "actor": "0.0.11111",
 *       "location": {
 *         "country": "US",
 *         "region": "California",
 *         "coordinates": { "lat": 36.7783, "lng": -119.4179 }
 *       },
 *       "data": { "harvestMethod": "organic", "quantity": "1000kg" }
 *     },
 *     {
 *       "stage": "processing",
 *       "timestamp": "2024-01-02T00:00:00Z",
 *       "actor": "0.0.22222",
 *       "location": {
 *         "country": "US",
 *         "region": "California"
 *       },
 *       "data": { "processMethod": "cold_pressed", "batchSize": "950kg" }
 *     }
 *   ],
 *   "businessRules": ["organic_certification", "traceability_complete"],
 *   "validationLevel": "comprehensive"
 * }
 * Response: {
 *   "isValid": true,
 *   "complianceScore": 0.95,
 *   "stageResults": [
 *     {
 *       "stage": "harvest",
 *       "isValid": true,
 *       "score": 0.98,
 *       "issues": []
 *     },
 *     {
 *       "stage": "processing",
 *       "isValid": true,
 *       "score": 0.92,
 *       "issues": ["Minor documentation gap in batch tracking"]
 *     }
 *   ],
 *   "gaps": [],
 *   "certifications": [
 *     {
 *       "certificationId": "USDA-ORG-2024",
 *       "name": "USDA Organic Certification",
 *       "status": "valid",
 *       "validUntil": "2024-12-31T23:59:59Z",
 *       "issuer": "USDA National Organic Program"
 *     }
 *   ]
 * }
 *
 * @security Requires valid wallet signature for supply chain access
 * @ratelimit 50 requests per minute per IP
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = (await request.json()) as SupplyChainValidationRequest;

    // Validate required fields
    if (!body.productId || !body.journey || !body.businessRules) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: productId, journey, and businessRules are required',
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.journey) || body.journey.length === 0) {
      return NextResponse.json(
        { error: 'Journey must be a non-empty array of supply chain events' },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.businessRules) || body.businessRules.length === 0) {
      return NextResponse.json(
        {
          error: 'BusinessRules must be a non-empty array of rule identifiers',
        },
        { status: 400 }
      );
    }

    // Validate journey events
    for (const [index, event] of body.journey.entries()) {
      if (!event.stage || !event.timestamp || !event.actor) {
        return NextResponse.json(
          {
            error: `Journey event at index ${index} missing required fields: stage, timestamp, actor`,
          },
          { status: 400 }
        );
      }

      // Validate timestamp format
      try {
        new Date(event.timestamp);
      } catch {
        return NextResponse.json(
          {
            error: `Journey event at index ${index} has invalid timestamp format`,
          },
          { status: 400 }
        );
      }
    }

    // Initialize compliance service
    const complianceService = new ComplianceService({
      baseUrl: process.env.COMPLIANCE_ENGINE_URL || 'http://localhost:3001',
      apiKey: process.env.COMPLIANCE_API_KEY || 'dev-key-123',
      timeout: 45000, // Longer timeout for supply chain validation
    });

    // Validate the supply chain
    const validationResult = await complianceService.validateSupplyChain(body);

    // Return validation result
    return NextResponse.json(validationResult, { status: 200 });
  } catch (error) {
    console.error('Supply chain validation error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return NextResponse.json(
          {
            error:
              'Compliance engine timeout - supply chain validation may take longer than expected',
          },
          { status: 503 }
        );
      }

      if (error.message.includes('HTTP 401')) {
        return NextResponse.json(
          { error: 'Unauthorized access to compliance engine' },
          { status: 401 }
        );
      }

      if (error.message.includes('HTTP 422')) {
        return NextResponse.json(
          {
            error:
              'Supply chain data validation failed - check journey events and business rules',
          },
          { status: 422 }
        );
      }

      if (error.message.includes('HTTP 429')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded - please try again later' },
          { status: 429 }
        );
      }

      if (error.message.includes('business rule')) {
        return NextResponse.json(
          {
            error:
              'Invalid business rule specified - check available rule templates',
          },
          { status: 400 }
        );
      }
    }

    // Generic server error
    return NextResponse.json(
      { error: 'Internal server error during supply chain validation' },
      { status: 500 }
    );
  }
}

/**
 * Get available business rule templates endpoint
 *
 * @route GET /api/compliance/supply-chain
 * @param category - Optional query parameter to filter templates by category
 * @returns {BusinessRuleTemplate[]} List of available business rule templates
 * @throws {500} Compliance engine connectivity issues
 *
 * @example
 * GET /api/compliance/supply-chain?category=organic
 * Response: [
 *   {
 *     "id": "organic_certification_v1",
 *     "name": "Organic Certification Validation",
 *     "description": "Validates organic certification requirements throughout supply chain",
 *     "category": "organic",
 *     "version": "1.0",
 *     "parameters": [
 *       {
 *         "name": "certificationBody",
 *         "type": "string",
 *         "description": "Name of the certification body",
 *         "required": true
 *       }
 *     ]
 *   }
 * ]
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;

    // Initialize compliance service
    const complianceService = new ComplianceService({
      baseUrl: process.env.COMPLIANCE_ENGINE_URL || 'http://localhost:3001',
      apiKey: process.env.COMPLIANCE_API_KEY || 'dev-key-123',
      timeout: 30000,
    });

    // Get business rule templates
    const templates =
      await complianceService.getBusinessRuleTemplates(category);

    // Return templates
    return NextResponse.json(templates, { status: 200 });
  } catch (error) {
    console.error('Business rule templates retrieval error:', error);

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
    }

    // Generic server error
    return NextResponse.json(
      { error: 'Internal server error during template retrieval' },
      { status: 500 }
    );
  }
}
