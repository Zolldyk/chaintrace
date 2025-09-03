import { NextRequest, NextResponse } from 'next/server';
import {
  ComplianceService,
  ComplianceCredentialRequest,
} from '@/services/hedera/ComplianceService';

/**
 * Compliance credential issuance endpoint
 *
 * @route POST /api/compliance/carbon-credit
 * @param request - Credential issuance request with verification proof
 * @returns {ComplianceCredential} Issued credential with blockchain reference
 * @throws {400} Invalid request parameters or missing required fields
 * @throws {401} Unauthorized access or invalid authentication
 * @throws {500} Compliance engine connectivity issues or internal errors
 * @throws {429} Rate limiting exceeded - try again later
 *
 * @example
 * POST /api/compliance/carbon-credit
 * Request: {
 *   "productId": "CT-2024-001-ABC123",
 *   "credentialType": "organic_verification",
 *   "issuer": {
 *     "walletAddress": "0.0.12345",
 *     "role": "certifier",
 *     "authority": "Organic Certification Body"
 *   },
 *   "evidence": {
 *     "documentHash": "abc123def456...",
 *     "signature": "signature_data...",
 *     "witnesses": ["0.0.11111", "0.0.22222"]
 *   },
 *   "validityPeriod": 365
 * }
 * Response: {
 *   "credentialId": "CRED-2024-001-ORG",
 *   "productId": "CT-2024-001-ABC123",
 *   "credentialType": "organic_verification",
 *   "status": "active",
 *   "issuedAt": "2024-01-01T12:00:00Z",
 *   "expiresAt": "2024-12-31T12:00:00Z",
 *   "blockchainRef": {
 *     "transactionId": "0.0.123456@1704110400.123456789",
 *     "consensusTimestamp": "1704110400.123456789"
 *   }
 * }
 *
 * @security Requires valid wallet signature for credential issuance
 * @ratelimit 50 requests per minute per IP
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = (await request.json()) as ComplianceCredentialRequest;

    // Validate required fields
    if (
      !body.productId ||
      !body.credentialType ||
      !body.issuer ||
      !body.evidence
    ) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: productId, credentialType, issuer, and evidence are required',
        },
        { status: 400 }
      );
    }

    if (
      !body.issuer.walletAddress ||
      !body.issuer.role ||
      !body.issuer.authority
    ) {
      return NextResponse.json(
        { error: 'Issuer must include walletAddress, role, and authority' },
        { status: 400 }
      );
    }

    if (!body.evidence.signature) {
      return NextResponse.json(
        { error: 'Evidence must include signature' },
        { status: 400 }
      );
    }

    // Initialize compliance service
    const complianceService = new ComplianceService({
      baseUrl: process.env.COMPLIANCE_ENGINE_URL || 'http://localhost:3001',
      apiKey: process.env.COMPLIANCE_API_KEY || 'dev-key-123',
      timeout: 30000,
    });

    // Issue the credential
    const credential = await complianceService.issueCredential(body);

    // Return issued credential
    return NextResponse.json(credential, { status: 201 });
  } catch (error) {
    console.error('Compliance credential issuance error:', error);

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

      if (error.message.includes('HTTP 403')) {
        return NextResponse.json(
          { error: 'Insufficient permissions for credential issuance' },
          { status: 403 }
        );
      }

      if (error.message.includes('HTTP 429')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded - please try again later' },
          { status: 429 }
        );
      }

      if (error.message.includes('validation')) {
        return NextResponse.json(
          {
            error:
              'Credential validation failed - check evidence and signatures',
          },
          { status: 422 }
        );
      }
    }

    // Generic server error
    return NextResponse.json(
      { error: 'Internal server error during credential issuance' },
      { status: 500 }
    );
  }
}
