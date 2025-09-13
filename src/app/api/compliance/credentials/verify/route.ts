/**
 * Third-party credential verification API endpoint
 * POST /api/compliance/credentials/verify
 *
 * @since 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { CredentialService } from '@/services/compliance/CredentialService';
import { CredentialValidator } from '@/services/compliance/CredentialValidator';
import {
  validateCredentialData,
  CredentialVerificationRequestSchema,
} from '@/lib/credential-validations';
import type { CredentialVerificationRequest } from '@/types/compliance';
import { logger } from '@/lib/logger';

/**
 * Verify a compliance credential's authenticity and status
 *
 * @route POST /api/compliance/credentials/verify
 * @param request - Credential verification request body
 * @returns {CredentialVerificationResponse} Verification result with validity status
 * @throws {400} Invalid request format or missing parameters
 * @throws {500} Server error during verification
 *
 * @example
 * POST /api/compliance/credentials/verify
 * Body: {
 *   "credentialId": "CRED-2024-001-ABC123",
 *   "verifySignature": true,
 *   "verifyBlockchain": true
 * }
 * Response: {
 *   "isValid": true,
 *   "credential": { ... },
 *   "verification": {
 *     "signatureValid": true,
 *     "notExpired": true,
 *     "notRevoked": true,
 *     "blockchainValid": true,
 *     "verifiedAt": "2024-09-13T10:00:00Z"
 *   }
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    logger.info('Credential verification request received');

    // Parse and validate request body
    const body = await request.json();
    const validation = validateCredentialData(
      body,
      CredentialVerificationRequestSchema
    );

    if (!validation.success) {
      logger.warn('Invalid verification request', {
        errors: validation.errors,
      });
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid verification request format',
            details: { errors: validation.errors },
          },
        },
        { status: 400 }
      );
    }

    const verificationRequest: CredentialVerificationRequest = validation.data;

    logger.info('Processing credential verification', {
      credentialId: verificationRequest.credentialId,
      verifySignature: verificationRequest.verifySignature,
      verifyBlockchain: verificationRequest.verifyBlockchain,
    });

    // Initialize services
    const credentialService = new CredentialService({
      networkType:
        process.env.HEDERA_NETWORK === 'mainnet' ? 'mainnet' : 'testnet',
      credentialTopicId: process.env.CREDENTIAL_TOPIC_ID || '0.0.7777777',
      defaultExpirationDays: 365,
      signingKey: process.env.CREDENTIAL_SIGNING_KEY || 'default-signing-key',
      maxCredentialsPerProduct: 10,
      operatorAccountId: process.env.HEDERA_OPERATOR_ACCOUNT_ID,
      operatorPrivateKey: process.env.HEDERA_OPERATOR_PRIVATE_KEY,
    });

    const credentialValidator = new CredentialValidator();

    // Perform credential verification
    const verificationResult =
      await credentialService.verifyCredential(verificationRequest);

    // Additional validation using validator service
    if (verificationResult.credential) {
      const validationResult = await credentialValidator.validateCredential(
        verificationResult.credential
      );

      // Add validation score to response metadata
      verificationResult.verification = {
        ...verificationResult.verification,
        validationScore: validationResult.score,
        validationErrors: validationResult.errors,
        validationWarnings: validationResult.warnings,
      } as any;
    }

    const responseTime = Date.now() - startTime;

    logger.info('Credential verification completed', {
      credentialId: verificationRequest.credentialId,
      isValid: verificationResult.isValid,
      responseTime,
    });

    return NextResponse.json({
      ...verificationResult,
      metadata: {
        requestedAt: new Date().toISOString(),
        responseTime,
        credentialId: verificationRequest.credentialId,
      },
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error(
      'Credential verification failed',
      error instanceof Error ? error : new Error('Unknown error'),
      { responseTime }
    );

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to verify credential',
          details: {
            timestamp: new Date().toISOString(),
            responseTime,
          },
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Get verification endpoint information
 *
 * @route GET /api/compliance/credentials/verify
 * @returns Information about the verification endpoint
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    endpoint: '/api/compliance/credentials/verify',
    method: 'POST',
    description: 'Verify compliance credential authenticity and status',
    parameters: {
      credentialId: {
        type: 'string',
        required: true,
        format: 'CRED-YYYY-XXX-ABCDEF',
        description: 'Unique credential identifier',
      },
      verifySignature: {
        type: 'boolean',
        required: false,
        default: true,
        description: 'Whether to verify cryptographic signature',
      },
      verifyBlockchain: {
        type: 'boolean',
        required: false,
        default: false,
        description: 'Whether to verify blockchain presence',
      },
    },
    responses: {
      200: {
        description: 'Verification completed successfully',
        schema: 'CredentialVerificationResponse',
      },
      400: {
        description: 'Invalid request format',
        schema: 'ErrorResponse',
      },
      500: {
        description: 'Internal server error',
        schema: 'ErrorResponse',
      },
    },
    example: {
      request: {
        credentialId: 'CRED-2024-001-ABC123',
        verifySignature: true,
        verifyBlockchain: true,
      },
      response: {
        isValid: true,
        verification: {
          signatureValid: true,
          notExpired: true,
          notRevoked: true,
          blockchainValid: true,
          verifiedAt: '2024-09-13T10:00:00Z',
        },
      },
    },
  });
}
