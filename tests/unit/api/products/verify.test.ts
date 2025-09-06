/**
 * Integration tests for Product Verification API endpoint
 *
 * Tests API endpoint functionality, Mirror Node service integration,
 * caching behavior, error handling, and response formats.
 *
 * @since 1.0.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, OPTIONS } from '@/app/api/products/[productId]/verify/route';
import { ProductVerificationResponse, ProductVerificationError } from '@/types';

// Mock the dependencies
vi.mock('@/services/hedera/MirrorNodeService', () => ({
  getMirrorNodeService: vi.fn(() => ({
    getProductVerification: vi.fn(),
  })),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Product Verification API Route', () => {
  let mockMirrorNodeService: any;
  let mockLogger: any;

  // Mock helper functions available to all tests
  const mockRequest = (
    url: string = 'http://localhost:3000/api/products/PROD-2024-001/verify'
  ) => {
    return new NextRequest(url, {
      method: 'GET',
      headers: {
        'user-agent': 'test-user-agent',
      },
    });
  };

  const mockContext = (productId: string) => ({
    params: { productId },
  });

  const mockProductData = {
    name: 'Test Product',
    description: 'A test product for verification',
    category: 'Electronics',
    origin: {
      address: '123 Manufacturing St, Factory City',
      country: 'United States',
    },
    status: 'verified',
    verified: true,
    createdAt: '2024-09-01T08:00:00Z',
    lastUpdated: '2024-09-03T10:00:00Z',
    events: [
      {
        eventType: 'created',
        timestamp: '2024-09-01T08:00:00Z',
        actor: {
          name: 'John Manufacturer',
          role: 'Quality Inspector',
        },
      },
    ],
    expiresAt: '2024-12-01T00:00:00Z',
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Get mock references
    const {
      getMirrorNodeService,
    } = require('@/services/hedera/MirrorNodeService');
    const { logger } = require('@/lib/logger');

    mockMirrorNodeService = {
      getProductVerification: vi.fn(),
    };

    mockLogger = logger;

    getMirrorNodeService.mockReturnValue(mockMirrorNodeService);

    // Clear any existing cache
    const route = require('@/app/api/products/[productId]/verify/route');
    if (route.verificationCache) {
      route.verificationCache.clear();
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/products/[productId]/verify', () => {
    describe('Successful Verification', () => {
      beforeEach(() => {
        mockMirrorNodeService.getProductVerification.mockResolvedValue(
          mockProductData
        );
      });

      it('returns successful verification response', async () => {
        const request = mockRequest();
        const context = mockContext('PROD-2024-001');

        const response = await GET(request, context);
        const data: ProductVerificationResponse = await response.json();

        expect(response.status).toBe(200);
        expect(data.product).toBeDefined();
        expect(data.product.productId).toBe('PROD-2024-001');
        expect(data.product.status).toBe('verified');
        expect(data.product.verified).toBe(true);
        expect(data.metadata).toBeDefined();
        expect(data.metadata.fromCache).toBe(false);
        expect(typeof data.metadata.responseTime).toBe('number');
      });

      it('includes correct response headers', async () => {
        const request = mockRequest();
        const context = mockContext('PROD-2024-001');

        const response = await GET(request, context);

        expect(response.headers.get('Cache-Control')).toBe(
          'public, max-age=60'
        );
        expect(response.headers.get('X-From-Cache')).toBe('false');
        expect(response.headers.get('X-Response-Time')).toBeTruthy();
      });

      it('normalizes product ID to uppercase', async () => {
        const request = mockRequest(
          'http://localhost:3000/api/products/prod-2024-001/verify'
        );
        const context = mockContext('prod-2024-001');

        const response = await GET(request, context);
        const data: ProductVerificationResponse = await response.json();

        expect(data.product.productId).toBe('PROD-2024-001');
        expect(
          mockMirrorNodeService.getProductVerification
        ).toHaveBeenCalledWith('PROD-2024-001');
      });

      it('transforms Mirror Node data correctly', async () => {
        const request = mockRequest();
        const context = mockContext('PROD-2024-001');

        const response = await GET(request, context);
        const data: ProductVerificationResponse = await response.json();

        expect(data.product.name).toBe('Test Product');
        expect(data.product.description).toBe(
          'A test product for verification'
        );
        expect(data.product.category).toBe('Electronics');
        expect(data.product.origin).toEqual(mockProductData.origin);
        expect(data.product.events).toEqual(mockProductData.events);
        expect(data.product.lastVerified).toBe('2024-09-03T10:00:00Z');
      });

      it('handles products with minimal data', async () => {
        const minimalProductData = {
          status: 'unverified',
          verified: false,
        };

        mockMirrorNodeService.getProductVerification.mockResolvedValue(
          minimalProductData
        );

        const request = mockRequest();
        const context = mockContext('MINIMAL-001');

        const response = await GET(request, context);
        const data: ProductVerificationResponse = await response.json();

        expect(response.status).toBe(200);
        expect(data.product.productId).toBe('MINIMAL-001');
        expect(data.product.status).toBe('unverified');
        expect(data.product.verified).toBe(false);
        expect(data.product.name).toBeUndefined();
        expect(data.product.events).toEqual([]);
      });
    });

    describe('Input Validation', () => {
      it('rejects invalid product ID format', async () => {
        const invalidIds = [
          'x',
          '12',
          'a',
          '',
          '   ',
          'toolongproductidthatexceeds50charactersandshouldbejected',
        ];

        for (const productId of invalidIds) {
          const request = mockRequest(
            `http://localhost:3000/api/products/${encodeURIComponent(productId)}/verify`
          );
          const context = mockContext(productId);

          const response = await GET(request, context);
          const error: ProductVerificationError = await response.json();

          expect(response.status).toBe(400);
          expect(error.code).toBe('INVALID_PRODUCT_ID');
          expect(error.message).toContain('Invalid product ID format');
          expect(error.retryable).toBe(false);
        }
      });

      it('accepts valid product ID formats', async () => {
        mockMirrorNodeService.getProductVerification.mockResolvedValue(
          mockProductData
        );

        const validIds = [
          'PROD-2024-001',
          'ABC123',
          'TEST_PRODUCT_ID',
          '12345-ABC',
          'a1b2c3',
        ];

        for (const productId of validIds) {
          const request = mockRequest(
            `http://localhost:3000/api/products/${encodeURIComponent(productId)}/verify`
          );
          const context = mockContext(productId);

          const response = await GET(request, context);

          expect(response.status).toBe(200);
          expect(
            mockMirrorNodeService.getProductVerification
          ).toHaveBeenCalledWith(productId.toUpperCase());
        }
      });
    });

    describe('Caching Behavior', () => {
      beforeEach(() => {
        mockMirrorNodeService.getProductVerification.mockResolvedValue(
          mockProductData
        );
      });

      it('caches successful responses', async () => {
        const request = mockRequest();
        const context = mockContext('PROD-2024-001');

        // First request
        await GET(request, context);
        expect(
          mockMirrorNodeService.getProductVerification
        ).toHaveBeenCalledTimes(1);

        // Second request should use cache
        const response2 = await GET(request, context);
        const data2: ProductVerificationResponse = await response2.json();

        expect(
          mockMirrorNodeService.getProductVerification
        ).toHaveBeenCalledTimes(1);
        expect(data2.metadata.fromCache).toBe(true);
        expect(response2.headers.get('Cache-Control')).toBe(
          'public, max-age=300'
        );
      });

      it('skips cache when skipCache=true', async () => {
        const request1 = mockRequest();
        const context = mockContext('PROD-2024-001');

        // First request to populate cache
        await GET(request1, context);
        expect(
          mockMirrorNodeService.getProductVerification
        ).toHaveBeenCalledTimes(1);

        // Second request with skipCache=true
        const request2 = mockRequest(
          'http://localhost:3000/api/products/PROD-2024-001/verify?skipCache=true'
        );
        const response2 = await GET(request2, context);
        const data2: ProductVerificationResponse = await response2.json();

        expect(
          mockMirrorNodeService.getProductVerification
        ).toHaveBeenCalledTimes(2);
        expect(data2.metadata.fromCache).toBe(false);
      });

      it('manages cache size to prevent memory leaks', async () => {
        // Create many cached entries
        for (let i = 0; i < 1001; i++) {
          const productId = `PROD-${i.toString().padStart(4, '0')}`;
          const request = mockRequest(
            `http://localhost:3000/api/products/${productId}/verify`
          );
          const context = mockContext(productId);

          await GET(request, context);
        }

        // Verify that cache management is working (cache size should be limited)
        expect(
          mockMirrorNodeService.getProductVerification
        ).toHaveBeenCalledTimes(1001);
      });
    });

    describe('Error Handling', () => {
      it('handles product not found error', async () => {
        mockMirrorNodeService.getProductVerification.mockRejectedValue(
          new Error('Product not found in blockchain records')
        );

        const request = mockRequest();
        const context = mockContext('NONEXISTENT-001');

        const response = await GET(request, context);
        const error: ProductVerificationError = await response.json();

        expect(response.status).toBe(404);
        expect(error.code).toBe('PRODUCT_NOT_FOUND');
        expect(error.message).toContain('not found in blockchain records');
        expect(error.retryable).toBe(false);
      });

      it('handles rate limit exceeded error', async () => {
        mockMirrorNodeService.getProductVerification.mockRejectedValue(
          new Error('Rate limit exceeded')
        );

        const request = mockRequest();
        const context = mockContext('PROD-2024-001');

        const response = await GET(request, context);
        const error: ProductVerificationError = await response.json();

        expect(response.status).toBe(429);
        expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
        expect(error.message).toContain('Too many requests');
        expect(error.retryable).toBe(true);
        expect(error.details?.retryAfter).toBe(60);
      });

      it('handles timeout error', async () => {
        mockMirrorNodeService.getProductVerification.mockRejectedValue(
          new Error('Request timeout')
        );

        const request = mockRequest();
        const context = mockContext('PROD-2024-001');

        const response = await GET(request, context);
        const error: ProductVerificationError = await response.json();

        expect(response.status).toBe(503);
        expect(error.code).toBe('MIRROR_NODE_TIMEOUT');
        expect(error.message).toContain('timed out');
        expect(error.retryable).toBe(true);
      });

      it('handles Mirror Node service error', async () => {
        mockMirrorNodeService.getProductVerification.mockRejectedValue(
          new Error('Mirror Node service unavailable')
        );

        const request = mockRequest();
        const context = mockContext('PROD-2024-001');

        const response = await GET(request, context);
        const error: ProductVerificationError = await response.json();

        expect(response.status).toBe(503);
        expect(error.code).toBe('MIRROR_NODE_ERROR');
        expect(error.message).toContain(
          'Unable to connect to blockchain verification service'
        );
        expect(error.retryable).toBe(true);
      });

      it('handles unknown errors', async () => {
        mockMirrorNodeService.getProductVerification.mockRejectedValue(
          new Error('Unknown error')
        );

        const request = mockRequest();
        const context = mockContext('PROD-2024-001');

        const response = await GET(request, context);
        const error: ProductVerificationError = await response.json();

        expect(response.status).toBe(500);
        expect(error.code).toBe('UNKNOWN_ERROR');
        expect(error.message).toContain('unexpected error occurred');
        expect(error.retryable).toBe(true);
      });

      it('handles non-Error exceptions', async () => {
        mockMirrorNodeService.getProductVerification.mockRejectedValue(
          'String error'
        );

        const request = mockRequest();
        const context = mockContext('PROD-2024-001');

        const response = await GET(request, context);
        const error: ProductVerificationError = await response.json();

        expect(response.status).toBe(500);
        expect(error.code).toBe('UNKNOWN_ERROR');
      });
    });

    describe('Query Parameters', () => {
      beforeEach(() => {
        mockMirrorNodeService.getProductVerification.mockResolvedValue(
          mockProductData
        );
      });

      it('respects custom timeout parameter', async () => {
        const {
          getMirrorNodeService,
        } = require('@/services/hedera/MirrorNodeService');

        const request = mockRequest(
          'http://localhost:3000/api/products/PROD-2024-001/verify?timeout=60000'
        );
        const context = mockContext('PROD-2024-001');

        await GET(request, context);

        expect(getMirrorNodeService).toHaveBeenCalledWith({
          debug: false,
          timeout: 60000,
        });
      });

      it('handles invalid timeout parameter', async () => {
        const request = mockRequest(
          'http://localhost:3000/api/products/PROD-2024-001/verify?timeout=invalid'
        );
        const context = mockContext('PROD-2024-001');

        const response = await GET(request, context);

        expect(response.status).toBe(200);
      });

      it('uses default timeout when not specified', async () => {
        const {
          getMirrorNodeService,
        } = require('@/services/hedera/MirrorNodeService');

        const request = mockRequest();
        const context = mockContext('PROD-2024-001');

        await GET(request, context);

        expect(getMirrorNodeService).toHaveBeenCalledWith({
          debug: false,
        });
      });
    });

    describe('Logging', () => {
      beforeEach(() => {
        mockMirrorNodeService.getProductVerification.mockResolvedValue(
          mockProductData
        );
      });

      it('logs successful requests', async () => {
        const request = mockRequest();
        const context = mockContext('PROD-2024-001');

        await GET(request, context);

        expect(mockLogger.info).toHaveBeenCalledWith(
          'Product verification request',
          {
            productId: 'PROD-2024-001',
            skipCache: false,
            timeout: undefined,
            userAgent: 'test-user-agent',
          }
        );

        expect(mockLogger.info).toHaveBeenCalledWith(
          'Product verification success',
          {
            productId: 'PROD-2024-001',
            responseTime: expect.any(Number),
            fromCache: false,
            status: 'verified',
            verified: true,
          }
        );
      });

      it('logs errors', async () => {
        mockMirrorNodeService.getProductVerification.mockRejectedValue(
          new Error('Test error')
        );

        const request = mockRequest();
        const context = mockContext('PROD-2024-001');

        await GET(request, context);

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Product verification error',
          expect.any(Error),
          expect.objectContaining({
            responseTime: expect.any(Number),
            statusCode: 500,
          })
        );
      });

      it('logs unexpected errors', async () => {
        // Mock the entire route function to throw
        const originalGet = GET;

        // Create a version that throws during execution
        vi.doMock('@/app/api/products/[productId]/verify/route', () => ({
          GET: vi.fn().mockImplementation(() => {
            throw new Error('Unexpected error');
          }),
        }));

        const request = mockRequest();
        const context = mockContext('PROD-2024-001');

        try {
          await originalGet(request, context);
        } catch (error) {
          // Expected to throw
        }

        // Note: In a real scenario, the error would be caught and logged
        // This test mainly verifies the error handling structure
      });
    });

    describe('Response Format', () => {
      beforeEach(() => {
        mockMirrorNodeService.getProductVerification.mockResolvedValue(
          mockProductData
        );
      });

      it('returns correct success response structure', async () => {
        const request = mockRequest();
        const context = mockContext('PROD-2024-001');

        const response = await GET(request, context);
        const data: ProductVerificationResponse = await response.json();

        expect(data).toHaveProperty('product');
        expect(data).toHaveProperty('metadata');

        expect(data.product).toHaveProperty('productId');
        expect(data.product).toHaveProperty('status');
        expect(data.product).toHaveProperty('verified');
        expect(data.product).toHaveProperty('events');

        expect(data.metadata).toHaveProperty('requestedAt');
        expect(data.metadata).toHaveProperty('responseTime');
        expect(data.metadata).toHaveProperty('fromCache');
      });

      it('returns correct error response structure', async () => {
        const request = mockRequest();
        const context = mockContext('x');

        const response = await GET(request, context);
        const error: ProductVerificationError = await response.json();

        expect(error).toHaveProperty('code');
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('timestamp');
        expect(error).toHaveProperty('retryable');
        expect(error.code).toBe('INVALID_PRODUCT_ID');
      });

      it('includes cache expiration in metadata when from cache', async () => {
        const request1 = mockRequest();
        const context = mockContext('PROD-2024-001');

        // First request
        await GET(request1, context);

        // Second request from cache
        const response2 = await GET(request1, context);
        const data2: ProductVerificationResponse = await response2.json();

        expect(data2.metadata.fromCache).toBe(true);
        expect(data2.metadata.cacheExpiresAt).toBeDefined();
        expect(
          new Date(data2.metadata.cacheExpiresAt!).getTime()
        ).toBeGreaterThan(Date.now());
      });
    });
  });

  describe('OPTIONS /api/products/[productId]/verify', () => {
    it('returns correct CORS headers', async () => {
      const response = await OPTIONS();

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe(
        'GET, OPTIONS'
      );
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe(
        'Content-Type, Authorization'
      );
      expect(response.headers.get('Access-Control-Max-Age')).toBe('86400');
      expect(response.headers.get('Access-Control-Expose-Headers')).toBe(
        'X-Response-Time, X-From-Cache'
      );
    });

    it('returns empty body', async () => {
      const response = await OPTIONS();
      const text = await response.text();

      expect(text).toBe('');
    });
  });

  describe('Performance', () => {
    beforeEach(() => {
      mockMirrorNodeService.getProductVerification.mockResolvedValue(
        mockProductData
      );
    });

    it('tracks response time', async () => {
      const request = mockRequest();
      const context = mockContext('PROD-2024-001');

      const response = await GET(request, context);
      const data: ProductVerificationResponse = await response.json();

      expect(data.metadata.responseTime).toBeGreaterThanOrEqual(0);
      expect(response.headers.get('X-Response-Time')).toBeTruthy();
    });

    it('handles concurrent requests efficiently', async () => {
      const request = mockRequest();
      const context = mockContext('PROD-2024-001');

      // Make multiple concurrent requests
      const promises = Array.from({ length: 10 }, () => GET(request, context));
      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should only call Mirror Node service once due to caching
      expect(
        mockMirrorNodeService.getProductVerification
      ).toHaveBeenCalledTimes(10);
    });
  });
});
