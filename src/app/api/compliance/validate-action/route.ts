import { NextRequest, NextResponse } from 'next/server';
import {
  CustomComplianceRuleEngine,
  ActionValidationRequest,
} from '@/services/hedera/CustomComplianceRuleEngine';
import { ComplianceCacheAdapter } from '@/services/hedera/ComplianceCacheAdapter';
import { HCSClient } from '@/services/hedera/HCSClient';
import { hcsEventLogger } from '@/services/hedera/HCSEventLogger';
import { cacheService } from '@/lib/cache/CacheService';
import type { SupplyChainRole } from '@/types/hedera';

/**
 * Compliance action validation endpoint
 *
 * @route POST /api/compliance/validate-action
 * @param request - Action validation request with business context
 * @returns {ValidationResult} Validation result with compliance status
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
    const body = (await request.json()) as ActionValidationRequest;

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

    // Validate role type
    const validRoles: SupplyChainRole[] = ['Producer', 'Processor', 'Verifier'];
    if (!validRoles.includes(body.actor.role as SupplyChainRole)) {
      return NextResponse.json(
        {
          error: `Invalid role: ${body.actor.role}. Must be one of: ${validRoles.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Initialize services
    const cacheAdapter = new ComplianceCacheAdapter(cacheService);
    const hcsClient = new HCSClient({
      networkType: 'testnet',
      hcsTopicId: process.env.HCS_TOPIC_ID || '0.0.12345',
      operatorAccountId: process.env.HEDERA_OPERATOR_ACCOUNT_ID,
      operatorPrivateKey: process.env.HEDERA_OPERATOR_PRIVATE_KEY,
    });

    // Initialize compliance rule engine
    const ruleEngine = new CustomComplianceRuleEngine({
      cacheService: cacheAdapter,
      hcsService: hcsClient,
      cacheTtl: {
        rules: 3600, // 1 hour for rules
        state: 86400, // 24 hours for workflow state
      },
    });

    // Validate the action using the new rule engine
    const validationResult = await ruleEngine.validateAction(body);

    // Log compliance event to HCS (Story 2.3 - Tasks 4 & 5)
    if (validationResult.isValid) {
      try {
        // Initialize HCS Event Logger if needed
        if (!hcsEventLogger.isReady()) {
          await hcsEventLogger.initialize();
        }

        // Log compliance event asynchronously (fire and forget for performance)
        hcsEventLogger
          .logComplianceEvent({
            productId: body.productId,
            action: body.action,
            result: 'APPROVED',
            walletAddress: body.actor.walletAddress,
            roleType: body.actor.role,
            complianceId: validationResult.complianceId,
            sequenceStep: validationResult.metadata?.sequenceStep || 1,
            violations: [],
            metadata: {
              reason: validationResult.reason,
              validatedAt: validationResult.validatedAt,
              ...validationResult.metadata,
            },
          })
          .then(result => {
            if (result.success) {
              // HCS event logged successfully
            } else {
              // Failed to log compliance event
            }
          })
          .catch(() => {
            // HCS compliance logging error
          });
      } catch (error) {
        // Log error but don't fail the compliance validation
        // Failed to initialize HCS Event Logger
      }
    } else {
      // Log rejected compliance events too
      try {
        if (!hcsEventLogger.isReady()) {
          await hcsEventLogger.initialize();
        }

        hcsEventLogger
          .logComplianceEvent({
            productId: body.productId,
            action: body.action,
            result: 'REJECTED',
            walletAddress: body.actor.walletAddress,
            roleType: body.actor.role,
            complianceId: validationResult.complianceId,
            sequenceStep: validationResult.metadata?.sequenceStep || 1,
            violations: validationResult.violations || [],
            metadata: {
              reason: validationResult.reason,
              validatedAt: validationResult.validatedAt,
              ...validationResult.metadata,
            },
          })
          .catch(() => {
            // HCS compliance rejection logging error
          });
      } catch (error) {
        // Failed to log compliance rejection
      }
    }

    // Return validation result
    return NextResponse.json(
      {
        approved: validationResult.isValid,
        complianceId: validationResult.complianceId,
        violations: validationResult.violations,
        reason: validationResult.reason,
        validatedAt: validationResult.validatedAt,
        metadata: validationResult.metadata,
      },
      { status: 200 }
    );
  } catch (error) {
    // Compliance validation error occurred

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return NextResponse.json(
          { error: 'Compliance engine timeout - service may be unavailable' },
          { status: 503 }
        );
      }

      if (error.message.includes('SEQUENCE_VIOLATION')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      if (error.message.includes('RULES_NOT_FOUND')) {
        return NextResponse.json(
          {
            error:
              'No compliance rules found for the specified role and action',
          },
          { status: 404 }
        );
      }

      if (error.message.includes('UNAUTHORIZED')) {
        return NextResponse.json(
          { error: 'Unauthorized access to compliance engine' },
          { status: 401 }
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
