/**
 * Sample Data API Endpoint
 *
 * Provides access to sample product data for testing and demonstration
 * purposes. Returns both good and bad product examples with their
 * expected verification results.
 *
 * @route GET /api/samples
 * @since 1.0.0
 */

import { NextResponse } from 'next/server';
import {
  SAMPLE_GOOD_PRODUCT_ID,
  SAMPLE_BAD_PRODUCT_ID,
  SAMPLE_GOOD_PRODUCT,
  SAMPLE_BAD_PRODUCT,
  SAMPLE_GOOD_PRODUCT_VERIFIED,
  SAMPLE_BAD_PRODUCT_UNVERIFIED,
  SAMPLE_MIXED_BATCH,
  SAMPLE_BATCH_VALIDATIONS,
  SAMPLE_BATCH_SUCCESS,
} from '@/lib/sample-data';

/**
 * Sample data response interface
 */
interface SampleDataResponse {
  /** Available sample product IDs for testing */
  productIds: {
    good: string;
    bad: string;
  };

  /** Sample products for batch creation */
  products: {
    good: typeof SAMPLE_GOOD_PRODUCT;
    bad: typeof SAMPLE_BAD_PRODUCT;
    mixedBatch: typeof SAMPLE_MIXED_BATCH;
  };

  /** Expected verification results */
  verificationResults: {
    good: typeof SAMPLE_GOOD_PRODUCT_VERIFIED;
    bad: typeof SAMPLE_BAD_PRODUCT_UNVERIFIED;
  };

  /** Sample batch operations */
  batchOperations: {
    validations: typeof SAMPLE_BATCH_VALIDATIONS;
    successResponse: typeof SAMPLE_BATCH_SUCCESS;
  };

  /** Usage instructions */
  usage: {
    description: string;
    examples: Array<{
      title: string;
      description: string;
      endpoint: string;
      expectedResult: string;
    }>;
  };
}

/**
 * GET handler for sample data
 *
 * @returns Sample data for testing ChainTrace functionality
 */
export async function GET(): Promise<NextResponse<SampleDataResponse>> {
  const response: SampleDataResponse = {
    productIds: {
      good: SAMPLE_GOOD_PRODUCT_ID,
      bad: SAMPLE_BAD_PRODUCT_ID,
    },

    products: {
      good: SAMPLE_GOOD_PRODUCT,
      bad: SAMPLE_BAD_PRODUCT,
      mixedBatch: SAMPLE_MIXED_BATCH,
    },

    verificationResults: {
      good: SAMPLE_GOOD_PRODUCT_VERIFIED,
      bad: SAMPLE_BAD_PRODUCT_UNVERIFIED,
    },

    batchOperations: {
      validations: SAMPLE_BATCH_VALIDATIONS,
      successResponse: SAMPLE_BATCH_SUCCESS,
    },

    usage: {
      description:
        'Sample ChainTrace data for testing and demonstration. Use the provided product IDs to test verification flows.',
      examples: [
        {
          title: 'Verify Good Product',
          description:
            'Test successful product verification with complete supply chain data',
          endpoint: `/api/products/${SAMPLE_GOOD_PRODUCT_ID}/verify`,
          expectedResult:
            'Verified product with complete supply chain events (planted → harvested → processed → quality_tested → verified)',
        },
        {
          title: 'Verify Bad Product',
          description:
            'Test failed product verification with missing/problematic data',
          endpoint: `/api/products/${SAMPLE_BAD_PRODUCT_ID}/verify`,
          expectedResult:
            'Rejected product with incomplete supply chain and failed quality tests',
        },
        {
          title: 'Manual Product Lookup',
          description: 'Use the verify page to manually enter product IDs',
          endpoint: '/verify',
          expectedResult:
            'Interactive verification interface with detailed results',
        },
        {
          title: 'Batch Creation',
          description: 'Use sample products in batch creation form',
          endpoint: '/batch/create',
          expectedResult:
            'Pre-filled forms with realistic product data for testing',
        },
      ],
    },
  };

  return NextResponse.json(response, {
    status: 200,
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Content-Type': 'application/json',
    },
  });
}

/**
 * OPTIONS handler for CORS support
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
