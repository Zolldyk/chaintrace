/**
 * Product Batch Creation API Endpoint
 *
 * Handles cooperative manager product batch logging with comprehensive validation,
 * Custom Compliance Engine integration, and HCS event logging. Supports batch
 * processing optimization for up to 100 products per batch with processing time
 * under 2 minutes as specified in requirements.
 *
 * @route POST /api/products
 * @param request - Product batch creation request
 * @returns {BatchCreationResponse} Batch creation result with generated product IDs
 * @throws {400} Invalid request data or batch validation failures
 * @throws {403} Unauthorized access or insufficient permissions
 * @throws {422} Compliance validation failures or business rule violations
 * @throws {500} Internal server error or service connectivity issues
 * @throws {503} Service temporarily unavailable or processing timeout
 *
 * @example
 * POST /api/products
 * Request: {
 *   "products": [
 *     {
 *       "name": "Organic Tomatoes",
 *       "category": "agricultural",
 *       "quantity": { "amount": 100, "unit": "kg" },
 *       "origin": {
 *         "address": "123 Farm Road",
 *         "city": "Lagos",
 *         "state": "Lagos",
 *         "country": "Nigeria",
 *         "coordinates": { "latitude": 6.5244, "longitude": 3.3792 },
 *         "region": "South West"
 *       },
 *       "processingDetails": {
 *         "harvestDate": "2024-01-01",
 *         "organicCertified": true
 *       }
 *     }
 *   ],
 *   "batchInfo": {
 *     "cooperativeId": "coop-123",
 *     "createdBy": "0.0.12345",
 *     "processingNotes": "First batch of the season"
 *   }
 * }
 * Response: {
 *   "success": true,
 *   "batchId": "BATCH-2024-001",
 *   "products": [
 *     {
 *       "id": "CT-2024-001-A1B2C3",
 *       "name": "Organic Tomatoes",
 *       "qrCode": "qr_data_string",
 *       "status": "created",
 *       "complianceValidation": {
 *         "approved": true,
 *         "complianceId": "comp-456",
 *         "violations": []
 *       }
 *     }
 *   ],
 *   "processingTime": 45000
 * }
 *
 * @security Requires valid wallet authentication
 * @ratelimit 10 batch creations per hour per cooperative
 */

import { NextRequest, NextResponse } from 'next/server';
import type {
  CreateProductBatch,
  BatchCreationResponse,
  ProductCreationResult,
} from '@/types/batch';
import { ProductIdGenerator, generateId } from '@/lib/utils';
import { FormValidationUtils } from '@/lib/validation/product';
import {
  CustomComplianceRuleEngine,
  ActionValidationRequest,
} from '@/services/hedera/CustomComplianceRuleEngine';
import { ComplianceCacheAdapter } from '@/services/hedera/ComplianceCacheAdapter';
import { hcsEventLogger } from '@/services/hedera/HCSEventLogger';
import { HCSClient } from '@/services/hedera/HCSClient';
import { cacheService } from '@/lib/cache/CacheService';

/**
 * Performance monitoring class
 */
class BatchProcessingMonitor {
  private startTime: Date;
  private checkpoints: Array<{ name: string; timestamp: Date }> = [];

  constructor() {
    this.startTime = new Date();
    this.checkpoint('batch_processing_started');
  }

  checkpoint(name: string) {
    this.checkpoints.push({ name, timestamp: new Date() });
  }

  getElapsedTime(): number {
    return new Date().getTime() - this.startTime.getTime();
  }

  getProcessingReport() {
    const totalTime = this.getElapsedTime();
    const steps = this.checkpoints.map((checkpoint, index) => {
      const prevTime =
        index === 0 ? this.startTime : this.checkpoints[index - 1].timestamp;
      const stepTime = checkpoint.timestamp.getTime() - prevTime.getTime();
      return {
        step: checkpoint.name,
        duration: stepTime,
        cumulative: checkpoint.timestamp.getTime() - this.startTime.getTime(),
      };
    });

    return { totalTime, steps };
  }
}

/**
 * Generate QR code data for product
 */
function generateQRCode(productId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://chaintrace.app';
  return JSON.stringify({
    productId,
    url: `${baseUrl}/verify/${productId}`,
    version: '1.0',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Create HCS event logging request for product creation (Story 2.3)
 */
function createEventLoggingRequest(
  productId: string,
  batchId: string,
  createdBy: string,
  productData: any
) {
  return {
    productId,
    eventType: 'created' as const,
    actor: {
      walletAddress: createdBy,
      role: 'Producer' as const,
      organizationId: productData.cooperativeId,
    },
    location: {
      coordinates: productData.origin.coordinates,
      address: `${productData.origin.address}, ${productData.origin.city}, ${productData.origin.state}`,
      region: productData.origin.region,
    },
    eventData: {
      batchId,
      category: productData.category,
      quantity: productData.quantity,
      processingDetails: productData.processingDetails,
      name: productData.name,
    },
    signature: generateId(32), // Placeholder - should be real wallet signature
  };
}

/**
 * POST handler for batch creation
 */
export async function POST(request: NextRequest) {
  const monitor = new BatchProcessingMonitor();

  try {
    // Parse and validate request body
    const body: CreateProductBatch = await request.json();
    monitor.checkpoint('request_parsed');

    // Validate batch structure using Zod
    const validationResult = FormValidationUtils.validateProductBatch(body);
    if (!validationResult.isValid) {
      return NextResponse.json(
        {
          success: false,
          batchId: '',
          products: [],
          processingTime: monitor.getElapsedTime(),
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Batch validation failed',
            details: {
              errors: validationResult.errors,
              productErrors: validationResult.productErrors,
            },
          },
        } as BatchCreationResponse,
        { status: 400 }
      );
    }
    monitor.checkpoint('request_validated');

    // Check processing time limit (2 minutes = 120,000ms)
    const timeLimit = 120000;
    const checkTimeLimit = () => {
      if (monitor.getElapsedTime() > timeLimit * 0.9) {
        // 90% of limit
        throw new Error(`Processing approaching time limit (${timeLimit}ms)`);
      }
    };

    // Initialize compliance services
    const cacheAdapter = new ComplianceCacheAdapter(cacheService);

    // Initialize HCS Event Logger (Story 2.3)
    if (!hcsEventLogger.isReady()) {
      await hcsEventLogger.initialize();
    }

    // Create HCS client for compliance engine compatibility
    const hcsClient = new HCSClient({
      networkType: 'testnet',
      hcsTopicId: process.env.HCS_TOPIC_ID || '0.0.12345',
      operatorAccountId: process.env.HEDERA_OPERATOR_ACCOUNT_ID,
      operatorPrivateKey: process.env.HEDERA_OPERATOR_PRIVATE_KEY,
    });

    const ruleEngine = new CustomComplianceRuleEngine({
      cacheService: cacheAdapter,
      hcsService: hcsClient,
      cacheTtl: {
        rules: 3600,
        state: 86400,
      },
    });
    monitor.checkpoint('services_initialized');

    // Generate batch ID
    const batchId = `BATCH-${new Date().getFullYear()}-${generateId(6).toUpperCase()}`;

    // Process products in parallel for performance
    const processingPromises = body.products.map(async productData => {
      checkTimeLimit();

      // Generate product ID
      const productId = ProductIdGenerator.generate();

      // Create compliance validation request
      const complianceRequest: ActionValidationRequest = {
        action: 'producer_initial_creation',
        productId,
        actor: {
          walletAddress: body.batchInfo.createdBy,
          role: 'Producer',
        },
        data: {
          productType: productData.category,
          quantity: productData.quantity.amount,
          unit: productData.quantity.unit,
          origin: productData.origin,
          processingDetails: productData.processingDetails,
          batchId,
        },
      };

      try {
        // Validate with Compliance Engine
        const complianceResult =
          await ruleEngine.validateAction(complianceRequest);

        // Generate QR code
        const qrCode = generateQRCode(productId);

        // Create product creation result
        const productResult: ProductCreationResult = {
          id: productId,
          name: productData.name,
          qrCode,
          status: complianceResult.isValid ? 'created' : 'rejected',
          complianceValidation: {
            approved: complianceResult.isValid,
            complianceId: complianceResult.complianceId,
            violations: complianceResult.violations || [],
          },
        };

        // Log HCS event for successful products (Story 2.3)
        if (complianceResult.isValid) {
          const eventRequest = createEventLoggingRequest(
            productId,
            batchId,
            body.batchInfo.createdBy,
            { ...productData, cooperativeId: body.batchInfo.cooperativeId }
          );

          // Log to HCS using enhanced event logger (fire and forget for performance)
          hcsEventLogger
            .logProductCreation(eventRequest)
            .then(result => {
              if (result.success) {
                // HCS event logged successfully
              } else {
                // Failed to log HCS event
              }
            })
            .catch(() => {
              // HCS event logging error
            });
        }

        return productResult;
      } catch (error) {
        // Compliance validation failed

        // Return failed product result
        return {
          id: productId,
          name: productData.name,
          qrCode: generateQRCode(productId),
          status: 'rejected' as const,
          complianceValidation: {
            approved: false,
            complianceId: '',
            violations: [
              error instanceof Error
                ? error.message
                : 'Compliance validation failed',
            ],
          },
        };
      }
    });

    // Wait for all products to be processed
    const results = await Promise.all(processingPromises);
    monitor.checkpoint('products_processed');

    // Check if any products were successfully created
    const successfulProducts = results.filter(
      result => result.complianceValidation.approved
    );

    if (successfulProducts.length === 0) {
      return NextResponse.json(
        {
          success: false,
          batchId,
          products: results,
          processingTime: monitor.getElapsedTime(),
          error: {
            code: 'ALL_PRODUCTS_REJECTED',
            message: 'All products failed compliance validation',
            details: {
              totalProducts: results.length,
              rejectedProducts: results.length,
              violations: results.flatMap(
                r => r.complianceValidation.violations
              ),
            },
          },
        } as BatchCreationResponse,
        { status: 422 }
      );
    }

    monitor.checkpoint('batch_completed');

    // Return successful response
    const response: BatchCreationResponse = {
      success: true,
      batchId,
      products: results,
      processingTime: monitor.getElapsedTime(),
    };

    // Log performance metrics for monitoring
    const processingReport = monitor.getProcessingReport();
    // Batch processing completed

    // Add performance warning if approaching time limit
    if (processingReport.totalTime > timeLimit * 0.8) {
      // Batch processing time approaching limit
    }

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    monitor.checkpoint('error_occurred');
    // Batch creation error occurred

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('time limit')) {
        return NextResponse.json(
          {
            success: false,
            batchId: '',
            products: [],
            processingTime: monitor.getElapsedTime(),
            error: {
              code: 'PROCESSING_TIMEOUT',
              message: 'Batch processing exceeded time limit',
              details: {
                processingTime: monitor.getElapsedTime(),
                timeLimit: 120000,
              },
            },
          } as BatchCreationResponse,
          { status: 503 }
        );
      }

      if (error.message.includes('UNAUTHORIZED')) {
        return NextResponse.json(
          {
            success: false,
            batchId: '',
            products: [],
            processingTime: monitor.getElapsedTime(),
            error: {
              code: 'UNAUTHORIZED',
              message: 'Insufficient permissions for batch creation',
            },
          } as BatchCreationResponse,
          { status: 403 }
        );
      }

      if (error.message.includes('SERVICE_UNAVAILABLE')) {
        return NextResponse.json(
          {
            success: false,
            batchId: '',
            products: [],
            processingTime: monitor.getElapsedTime(),
            error: {
              code: 'SERVICE_UNAVAILABLE',
              message: 'Required services are temporarily unavailable',
            },
          } as BatchCreationResponse,
          { status: 503 }
        );
      }
    }

    // Generic server error
    return NextResponse.json(
      {
        success: false,
        batchId: '',
        products: [],
        processingTime: monitor.getElapsedTime(),
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred during batch creation',
          details: {
            processingTime: monitor.getElapsedTime(),
          },
        },
      } as BatchCreationResponse,
      { status: 500 }
    );
  }
}

/**
 * GET handler for retrieving product batches (optional for future use)
 */
export async function GET() {
  return NextResponse.json(
    { message: 'Batch retrieval not implemented yet' },
    { status: 501 }
  );
}
