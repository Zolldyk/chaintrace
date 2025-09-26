/**
 * Product-specific credential listing API endpoint
 * GET /api/products/[productId]/credentials
 *
 * @since 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { CredentialService } from '@/services/compliance/CredentialService';
import { CredentialValidator } from '@/services/compliance/CredentialValidator';
import { isValidProductId } from '@/lib/credential-validations';
import type { CredentialSearchParams } from '@/types/compliance';
import { logger } from '@/lib/logger';

/**
 * Get all compliance credentials for a specific product
 *
 * @route GET /api/products/{productId}/credentials
 * @param productId - Unique product identifier
 * @param searchParams - Optional query parameters for filtering and pagination
 * @returns {CredentialSearchResponse} List of credentials with pagination metadata
 * @throws {404} Product not found or no credentials
 * @throws {400} Invalid product ID format
 * @throws {500} Server error during retrieval
 *
 * @example
 * GET /api/products/CT-2024-001-ABC123/credentials?status=active&limit=5
 * Response: {
 *   "credentials": [...],
 *   "totalCount": 3,
 *   "pagination": {
 *     "limit": 5,
 *     "offset": 0,
 *     "hasMore": false
 *   },
 *   "summary": {
 *     "active": 2,
 *     "expired": 1,
 *     "revoked": 0
 *   }
 * }
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();
  const { productId } = await context.params;
  const { searchParams } = new URL(request.url);

  try {
    logger.info('Product credentials request', { productId });

    // Validate product ID format
    if (!isValidProductId(productId)) {
      logger.warn('Invalid product ID format', { productId });
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_PRODUCT_ID',
            message: 'Invalid product ID format. Expected: CT-YYYY-XXX-ABCDEF',
            details: { productId },
          },
        },
        { status: 400 }
      );
    }

    // Parse query parameters
    const searchOptions: CredentialSearchParams = {
      productId,
      status: (searchParams.get('status') as any) || undefined,
      credentialType: (searchParams.get('credentialType') as any) || undefined,
      limit: parseInt(searchParams.get('limit') || '10'),
      offset: parseInt(searchParams.get('offset') || '0'),
      sortBy: (searchParams.get('sortBy') as any) || 'issuedAt',
      sortOrder: (searchParams.get('sortOrder') as any) || 'desc',
    };

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

    // Search for product credentials
    const searchResult =
      await credentialService.searchCredentials(searchOptions);

    if (searchResult.totalCount === 0) {
      logger.info('No credentials found for product', { productId });
      return NextResponse.json(
        {
          credentials: [],
          totalCount: 0,
          pagination: {
            limit: searchOptions.limit,
            offset: searchOptions.offset,
            hasMore: false,
          },
          summary: {
            active: 0,
            expired: 0,
            revoked: 0,
            issued: 0,
          },
          metadata: {
            requestedAt: new Date().toISOString(),
            responseTime: Date.now() - startTime,
            productId,
          },
        },
        { status: 200 }
      );
    }

    // Get credential status summary
    const allProductCredentials =
      await credentialService.getProductCredentials(productId);
    const summary = {
      active: allProductCredentials.filter(c => c.status === 'active').length,
      expired: allProductCredentials.filter(c => c.status === 'expired').length,
      revoked: allProductCredentials.filter(c => c.status === 'revoked').length,
      issued: allProductCredentials.filter(c => c.status === 'issued').length,
    };

    // Get expiration warnings
    const expiringCredentials = credentialValidator.getExpiringCredentials(
      allProductCredentials,
      30 // 30 days warning
    );

    const expiredCredentials = credentialValidator.getExpiredCredentials(
      allProductCredentials
    );

    const responseTime = Date.now() - startTime;

    logger.info('Product credentials retrieved successfully', {
      productId,
      credentialCount: searchResult.totalCount,
      responseTime,
    });

    return NextResponse.json({
      ...searchResult,
      summary,
      expirationInfo: {
        expiring: expiringCredentials,
        expired: expiredCredentials,
      },
      metadata: {
        requestedAt: new Date().toISOString(),
        responseTime,
        productId,
        searchParams: searchOptions,
      },
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error(
      'Product credentials retrieval failed',
      error instanceof Error ? error : new Error('Unknown error'),
      { productId, responseTime }
    );

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve product credentials',
          details: {
            productId,
            timestamp: new Date().toISOString(),
          },
        },
      },
      { status: 500 }
    );
  }
}
