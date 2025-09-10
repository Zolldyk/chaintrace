/**
 * Integration tests for products API route
 * 
 * Tests batch creation API endpoint with compliance validation,
 * performance requirements, and error handling scenarios.
 *
 * @since 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST } from '@/app/api/products/route';
import { NextRequest } from 'next/server';
import type { CreateProductBatch, BatchCreationResponse } from '@/types/batch';

// Mock the Hedera services
vi.mock('@/services/hedera/CustomComplianceRuleEngine', () => ({
  CustomComplianceRuleEngine: vi.fn().mockImplementation(() => ({
    validateAction: vi.fn().mockResolvedValue({
      isValid: true,
      complianceId: 'comp-123',
      violations: [],
      reason: 'Valid product',
      validatedAt: new Date(),
      metadata: {},
    }),
  })),
}));

vi.mock('@/services/hedera/ComplianceCacheAdapter', () => ({
  ComplianceCacheAdapter: vi.fn(),
}));

vi.mock('@/services/hedera/HCSClient', () => ({
  HCSClient: vi.fn().mockImplementation(() => ({
    submitMessage: vi.fn().mockResolvedValue('message-id-123'),
  })),
}));

vi.mock('@/lib/cache/CacheService', () => ({
  cacheService: {
    clear: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
  },
}));

// Mock environment variables
process.env.HCS_TOPIC_ID = '0.0.12345';
process.env.HEDERA_OPERATOR_ACCOUNT_ID = '0.0.67890';
process.env.HEDERA_OPERATOR_PRIVATE_KEY = 'mock-private-key';

describe('/api/products POST', () => {
  let validBatchRequest: CreateProductBatch;

  beforeEach(() => {
    vi.clearAllMocks();
    
    validBatchRequest = {
      products: [
        {
          name: 'Organic Tomatoes',
          category: 'agricultural',
          quantity: { amount: 100, unit: 'kg' },
          origin: {
            address: '123 Farm Road',
            city: 'Lagos',
            state: 'Lagos',
            country: 'Nigeria',
            coordinates: { latitude: 6.5244, longitude: 3.3792 },
            region: 'South West',
          },
          processingDetails: {
            harvestDate: '2024-01-01',
            organicCertified: true,
          },
        },
      ],
      batchInfo: {
        cooperativeId: '123e4567-e89b-12d3-a456-426614174000',
        createdBy: '0.0.12345',
        processingNotes: 'First batch of the season',
      },
    };
  });

  const createRequest = (body: any) => {
    return new NextRequest('http://localhost:3000/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  it('should create batch successfully with valid data', async () => {
    const request = createRequest(validBatchRequest);
    const response = await POST(request);

    expect(response.status).toBe(201);
    
    const data: BatchCreationResponse = await response.json();
    expect(data.success).toBe(true);
    expect(data.batchId).toMatch(/^BATCH-\d{4}-[A-Z0-9]{6}$/);
    expect(data.products).toHaveLength(1);
    expect(data.products[0].id).toMatch(/^CT-\d{4}-\d{3}-[A-F0-9]{6}$/);
    expect(data.products[0].complianceValidation.approved).toBe(true);
    expect(data.processingTime).toBeGreaterThan(0);
  });

  it('should reject request with invalid batch structure', async () => {
    const invalidRequest = {
      products: [], // Empty products array
      batchInfo: validBatchRequest.batchInfo,
    };

    const request = createRequest(invalidRequest);
    const response = await POST(request);

    expect(response.status).toBe(400);
    
    const data: BatchCreationResponse = await response.json();
    expect(data.success).toBe(false);
    expect(data.error?.code).toBe('VALIDATION_ERROR');
    expect(data.error?.details?.errors).toContain('At least one product is required');
  });

  it('should reject batch exceeding product limit', async () => {
    const oversizedBatch = {
      ...validBatchRequest,
      products: new Array(101).fill(validBatchRequest.products[0]),
    };

    const request = createRequest(oversizedBatch);
    const response = await POST(request);

    expect(response.status).toBe(400);
    
    const data: BatchCreationResponse = await response.json();
    expect(data.success).toBe(false);
    expect(data.error?.details?.errors).toContain('Batch cannot contain more than 100 products');
  });

  it('should reject batch exceeding weight limit', async () => {
    const heavyBatch = {
      ...validBatchRequest,
      products: [
        {
          ...validBatchRequest.products[0],
          quantity: { amount: 600, unit: 'kg' },
        },
        {
          ...validBatchRequest.products[0],
          quantity: { amount: 500, unit: 'kg' },
        },
      ],
    };

    const request = createRequest(heavyBatch);
    const response = await POST(request);

    expect(response.status).toBe(400);
    
    const data: BatchCreationResponse = await response.json();
    expect(data.success).toBe(false);
    expect(data.error?.details?.errors).toContain('Total batch weight cannot exceed 1000kg (daily production limit)');
  });

  it('should handle compliance validation failures', async () => {
    // Mock compliance engine to return failure
    const { CustomComplianceRuleEngine } = await import('@/services/hedera/CustomComplianceRuleEngine');
    (CustomComplianceRuleEngine as any).mockImplementation(() => ({
      validateAction: vi.fn().mockResolvedValue({
        isValid: false,
        complianceId: '',
        violations: ['Product does not meet organic certification requirements'],
        reason: 'Compliance validation failed',
        validatedAt: new Date(),
        metadata: {},
      }),
    }));

    const request = createRequest(validBatchRequest);
    const response = await POST(request);

    expect(response.status).toBe(422);
    
    const data: BatchCreationResponse = await response.json();
    expect(data.success).toBe(false);
    expect(data.error?.code).toBe('ALL_PRODUCTS_REJECTED');
    expect(data.products[0].complianceValidation.approved).toBe(false);
    expect(data.products[0].complianceValidation.violations).toContain(
      'Product does not meet organic certification requirements'
    );
  });

  it('should handle mixed compliance results', async () => {
    let callCount = 0;
    // Mock compliance engine to return mixed results
    const { CustomComplianceRuleEngine } = await import('@/services/hedera/CustomComplianceRuleEngine');
    (CustomComplianceRuleEngine as any).mockImplementation(() => ({
      validateAction: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            isValid: true,
            complianceId: 'comp-123',
            violations: [],
            reason: 'Valid product',
            validatedAt: new Date(),
          });
        } else {
          return Promise.resolve({
            isValid: false,
            complianceId: '',
            violations: ['Failed quality check'],
            reason: 'Quality standards not met',
            validatedAt: new Date(),
          });
        }
      }),
    }));

    const mixedBatch = {
      ...validBatchRequest,
      products: [
        validBatchRequest.products[0],
        {
          ...validBatchRequest.products[0],
          name: 'Rejected Product',
        },
      ],
    };

    const request = createRequest(mixedBatch);
    const response = await POST(request);

    expect(response.status).toBe(201);
    
    const data: BatchCreationResponse = await response.json();
    expect(data.success).toBe(true);
    expect(data.products).toHaveLength(2);
    expect(data.products[0].complianceValidation.approved).toBe(true);
    expect(data.products[1].complianceValidation.approved).toBe(false);
  });

  it('should validate processing time requirements', async () => {
    // Create a larger batch to test processing time
    const largeBatch = {
      ...validBatchRequest,
      products: new Array(50).fill(validBatchRequest.products[0]).map((product, index) => ({
        ...product,
        name: `Product ${index + 1}`,
      })),
    };

    const startTime = Date.now();
    const request = createRequest(largeBatch);
    const response = await POST(request);
    const endTime = Date.now();

    expect(response.status).toBe(201);
    
    const data: BatchCreationResponse = await response.json();
    expect(data.success).toBe(true);
    expect(data.processingTime).toBeGreaterThan(0);
    
    // Processing time should be under 2 minutes (120,000ms) as per requirements
    const actualTime = endTime - startTime;
    expect(actualTime).toBeLessThan(120000);
  });

  it('should handle invalid cooperative ID format', async () => {
    const invalidBatch = {
      ...validBatchRequest,
      batchInfo: {
        ...validBatchRequest.batchInfo,
        cooperativeId: 'invalid-uuid-format',
      },
    };

    const request = createRequest(invalidBatch);
    const response = await POST(request);

    expect(response.status).toBe(400);
    
    const data: BatchCreationResponse = await response.json();
    expect(data.success).toBe(false);
    expect(data.error?.code).toBe('VALIDATION_ERROR');
  });

  it('should handle invalid Hedera account ID format', async () => {
    const invalidBatch = {
      ...validBatchRequest,
      batchInfo: {
        ...validBatchRequest.batchInfo,
        createdBy: 'invalid-account-id',
      },
    };

    const request = createRequest(invalidBatch);
    const response = await POST(request);

    expect(response.status).toBe(400);
    
    const data: BatchCreationResponse = await response.json();
    expect(data.success).toBe(false);
    expect(data.error?.code).toBe('VALIDATION_ERROR');
  });

  it('should handle compliance engine connection errors', async () => {
    // Mock compliance engine to throw error
    const { CustomComplianceRuleEngine } = await import('@/services/hedera/CustomComplianceRuleEngine');
    (CustomComplianceRuleEngine as any).mockImplementation(() => ({
      validateAction: vi.fn().mockRejectedValue(new Error('Service unavailable')),
    }));

    const request = createRequest(validBatchRequest);
    const response = await POST(request);

    expect(response.status).toBe(422);
    
    const data: BatchCreationResponse = await response.json();
    expect(data.success).toBe(false);
    expect(data.products[0].complianceValidation.approved).toBe(false);
    expect(data.products[0].complianceValidation.violations[0]).toContain('Service unavailable');
  });

  it('should validate product name format', async () => {
    const invalidBatch = {
      ...validBatchRequest,
      products: [
        {
          ...validBatchRequest.products[0],
          name: 'Product@#$%', // Invalid characters
        },
      ],
    };

    const request = createRequest(invalidBatch);
    const response = await POST(request);

    expect(response.status).toBe(400);
    
    const data: BatchCreationResponse = await response.json();
    expect(data.success).toBe(false);
    expect(data.error?.code).toBe('VALIDATION_ERROR');
  });

  it('should validate Nigerian states correctly', async () => {
    const invalidBatch = {
      ...validBatchRequest,
      products: [
        {
          ...validBatchRequest.products[0],
          origin: {
            ...validBatchRequest.products[0].origin,
            state: 'California', // Invalid Nigerian state
          },
        },
      ],
    };

    const request = createRequest(invalidBatch);
    const response = await POST(request);

    expect(response.status).toBe(400);
    
    const data: BatchCreationResponse = await response.json();
    expect(data.success).toBe(false);
    expect(data.error?.code).toBe('VALIDATION_ERROR');
  });

  it('should generate valid QR codes for successful products', async () => {
    const request = createRequest(validBatchRequest);
    const response = await POST(request);

    expect(response.status).toBe(201);
    
    const data: BatchCreationResponse = await response.json();
    expect(data.products[0].qrCode).toBeDefined();
    
    // QR code should be valid JSON
    const qrData = JSON.parse(data.products[0].qrCode);
    expect(qrData.productId).toBe(data.products[0].id);
    expect(qrData.url).toContain(`/verify/${data.products[0].id}`);
    expect(qrData.version).toBe('1.0');
  });

  it('should handle malformed JSON request', async () => {
    const request = new NextRequest('http://localhost:3000/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid-json',
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
    
    const data: BatchCreationResponse = await response.json();
    expect(data.success).toBe(false);
    expect(data.error?.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('should validate coordinate ranges', async () => {
    const invalidBatch = {
      ...validBatchRequest,
      products: [
        {
          ...validBatchRequest.products[0],
          origin: {
            ...validBatchRequest.products[0].origin,
            coordinates: {
              latitude: 91, // Invalid latitude
              longitude: 3.3792,
            },
          },
        },
      ],
    };

    const request = createRequest(invalidBatch);
    const response = await POST(request);

    expect(response.status).toBe(400);
    
    const data: BatchCreationResponse = await response.json();
    expect(data.success).toBe(false);
    expect(data.error?.code).toBe('VALIDATION_ERROR');
  });

  it('should handle empty request body', async () => {
    const request = new NextRequest('http://localhost:3000/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    
    const data: BatchCreationResponse = await response.json();
    expect(data.success).toBe(false);
    expect(data.error?.code).toBe('VALIDATION_ERROR');
  });

  it('should validate quantity constraints', async () => {
    const invalidBatch = {
      ...validBatchRequest,
      products: [
        {
          ...validBatchRequest.products[0],
          quantity: {
            amount: -10, // Invalid negative quantity
            unit: 'kg',
          },
        },
      ],
    };

    const request = createRequest(invalidBatch);
    const response = await POST(request);

    expect(response.status).toBe(400);
    
    const data: BatchCreationResponse = await response.json();
    expect(data.success).toBe(false);
    expect(data.error?.code).toBe('VALIDATION_ERROR');
  });

  it('should track performance metrics in response', async () => {
    const request = createRequest(validBatchRequest);
    const response = await POST(request);

    expect(response.status).toBe(201);
    
    const data: BatchCreationResponse = await response.json();
    expect(data.processingTime).toBeGreaterThan(0);
    expect(data.processingTime).toBeLessThan(120000); // Under 2 minutes
  });
});