/**
 * Individual credential retrieval API endpoint
 * GET /api/compliance/credentials/[credentialId]
 *
 * @since 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { CredentialService } from '@/services/compliance/CredentialService';
import { isValidCredentialId } from '@/lib/credential-validations';
import { logger } from '@/lib/logger';

/**
 * Retrieve a specific compliance credential by ID
 *
 * @route GET /api/compliance/credentials/{credentialId}
 * @param credentialId - Unique credential identifier
 * @returns {ComplianceCredential} Complete credential data with verification status
 * @throws {404} Credential not found
 * @throws {400} Invalid credential ID format
 * @throws {500} Server error during retrieval
 *
 * @example
 * GET /api/compliance/credentials/CRED-2024-001-ABC123
 * Response: {
 *   "credential": {
 *     "id": "CRED-2024-001-ABC123",
 *     "productId": "CT-2024-001-ABC123",
 *     "status": "active",
 *     "credentialType": "supply_chain"
 *   },
 *   "metadata": {
 *     "requestedAt": "2024-09-13T10:00:00Z",
 *     "responseTime": 145
 *   }
 * }
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ credentialId: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();
  const { credentialId } = await context.params;

  try {
    logger.info('Credential retrieval request', { credentialId });

    // Validate credential ID format
    if (!isValidCredentialId(credentialId)) {
      logger.warn('Invalid credential ID format', { credentialId });
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_CREDENTIAL_ID',
            message:
              'Invalid credential ID format. Expected: CRED-YYYY-XXX-ABCDEF',
            details: { credentialId },
          },
        },
        { status: 400 }
      );
    }

    // Initialize credential service
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

    // Retrieve credential
    const credential = await credentialService.getCredential(credentialId);

    if (!credential) {
      logger.warn('Credential not found', { credentialId });
      return NextResponse.json(
        {
          error: {
            code: 'CREDENTIAL_NOT_FOUND',
            message: `Credential not found: ${credentialId}`,
            details: { credentialId },
          },
        },
        { status: 404 }
      );
    }

    const responseTime = Date.now() - startTime;

    logger.info('Credential retrieved successfully', {
      credentialId,
      productId: credential.productId,
      status: credential.status,
      responseTime,
    });

    return NextResponse.json({
      credential,
      metadata: {
        requestedAt: new Date().toISOString(),
        responseTime,
        credentialId,
      },
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error(
      'Credential retrieval failed',
      error instanceof Error ? error : new Error('Unknown error'),
      { credentialId, responseTime }
    );

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve credential',
          details: {
            credentialId,
            timestamp: new Date().toISOString(),
          },
        },
      },
      { status: 500 }
    );
  }
}
