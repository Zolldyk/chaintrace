/**
 * Unit tests for HCS Event Logger (Story 2.3)
 * Tests HCS event logging, retry mechanisms, and error handling
 *
 * @since 2.3.0
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type MockedFunction,
} from 'vitest';
import {
  HCSEventLogger,
  HCSRetryManager,
} from '@/services/hedera/HCSEventLogger';
import { messageSerializer } from '@/lib/serialization';
import { HederaError, TimeoutError, NetworkError } from '@/lib/errors';
import type { HCSServiceConfig, HCSOperationResult } from '@/types/hedera';

// Mock dependencies
vi.mock('@/services/hedera/HederaService', () => ({
  getHederaService: vi.fn(() => ({
    isReady: vi.fn(() => true),
    validateConnection: vi.fn(),
    getClient: vi.fn(() => mockHederaClient),
  })),
}));

vi.mock('@/lib/serialization', () => ({
  messageSerializer: {
    serialize: vi.fn(),
    deserialize: vi.fn(),
  },
  deserializeHCSMessage: vi.fn(),
}));

vi.mock('@/services/hedera/HCSFailureHandler', () => ({
  hcsFailureHandler: {
    recordFailure: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock Hedera SDK
const mockHederaClient = {
  execute: vi.fn(),
  getReceipt: vi.fn(),
};

const mockTransaction = {
  execute: vi.fn(),
  setTransactionValidDuration: vi.fn(),
};

const mockReceipt = {
  topicSequenceNumber: {
    toString: () => '123',
  },
};

const mockResponse = {
  transactionId: {
    toString: () => 'test-transaction-id',
  },
  getReceipt: vi.fn(() => Promise.resolve(mockReceipt)),
};

vi.mock('@hashgraph/sdk', () => ({
  Client: vi.fn(),
  TopicMessageSubmitTransaction: vi.fn(() => mockTransaction),
}));

describe('HCSEventLogger', () => {
  let hcsEventLogger: HCSEventLogger;
  let mockConfig: HCSServiceConfig;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    mockConfig = {
      topicId: '0.0.12345',
      operatorAccountId: '0.0.98765',
      operatorPrivateKey: 'test-private-key',
      networkType: 'testnet',
      messageTimeoutMs: 30000,
      retryConfig: {
        maxRetries: 3,
        baseDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2,
      },
    };

    hcsEventLogger = new HCSEventLogger(mockConfig);

    // Setup successful serialization by default
    (messageSerializer.serialize as MockedFunction<any>).mockResolvedValue({
      data: JSON.stringify({ test: 'message' }),
      sizeBytes: 100,
      isValid: true,
      metadata: {
        serializedAt: new Date(),
        version: '2.3.0',
        productId: 'CT-2024-001-ABC123',
        eventType: 'created',
      },
    });

    // Setup successful HCS submission by default
    mockTransaction.execute.mockResolvedValue(mockResponse);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should create instance with valid configuration', () => {
      expect(hcsEventLogger).toBeInstanceOf(HCSEventLogger);
    });

    it('should throw error when topic ID is missing', () => {
      const invalidConfig = { ...mockConfig, topicId: '' };

      expect(() => new HCSEventLogger(invalidConfig)).toThrow(HederaError);
      expect(() => new HCSEventLogger(invalidConfig)).toThrow(
        'HCS Topic ID is required'
      );
    });

    it('should throw error when operator credentials are missing', () => {
      const invalidConfig = {
        ...mockConfig,
        operatorAccountId: '',
        operatorPrivateKey: '',
      };

      expect(() => new HCSEventLogger(invalidConfig)).toThrow(HederaError);
      expect(() => new HCSEventLogger(invalidConfig)).toThrow(
        'Operator account ID and private key are required'
      );
    });
  });

  describe('Product Creation Event Logging', () => {
    const eventRequest = {
      productId: 'CT-2024-001-ABC123',
      eventType: 'created' as const,
      actor: {
        walletAddress: '0.0.67890',
        role: 'Producer' as const,
        organizationId: 'COOP-001',
      },
      location: {
        coordinates: { latitude: 6.5244, longitude: 3.3792 },
        address: '123 Farm Road, Lagos',
        region: 'Southwest Nigeria',
      },
      eventData: {
        batchId: 'BATCH-001',
        quantity: { amount: 100, unit: 'kg' },
        category: 'agricultural',
      },
      signature: 'test-signature',
    };

    it('should successfully log product creation event', async () => {
      await hcsEventLogger.initialize();

      const result = await hcsEventLogger.logProductCreation(eventRequest);

      expect(result.success).toBe(true);
      expect(result.sequenceNumber).toBe('123');
      expect(result.transactionId).toBe('test-transaction-id');
      expect(messageSerializer.serialize).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: eventRequest.productId,
          eventType: 'created',
          actor: eventRequest.actor,
        })
      );
    });

    it('should handle serialization failures', async () => {
      (messageSerializer.serialize as MockedFunction<any>).mockRejectedValue(
        new Error('Serialization failed')
      );

      await hcsEventLogger.initialize();

      const result = await hcsEventLogger.logProductCreation(eventRequest);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Serialization failed');
    });

    it('should handle HCS submission failures', async () => {
      mockTransaction.execute.mockRejectedValue(
        new Error('HCS submission failed')
      );

      await hcsEventLogger.initialize();

      const result = await hcsEventLogger.logProductCreation(eventRequest);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('HCS submission failed');
    });

    it('should auto-initialize if not ready', async () => {
      const result = await hcsEventLogger.logProductCreation(eventRequest);

      expect(result.success).toBe(true);
      expect(hcsEventLogger.isReady()).toBe(true);
    });
  });

  describe('Compliance Event Logging', () => {
    const complianceData = {
      productId: 'CT-2024-001-ABC123',
      action: 'producer_initial_creation',
      result: 'APPROVED' as const,
      walletAddress: '0.0.67890',
      roleType: 'Producer' as const,
      complianceId: 'COMP-001',
      sequenceStep: 1,
      violations: [],
      metadata: { testData: 'value' },
    };

    it('should successfully log compliance event', async () => {
      await hcsEventLogger.initialize();

      const result = await hcsEventLogger.logComplianceEvent(complianceData);

      expect(result.success).toBe(true);
      expect(result.sequenceNumber).toBe('123');
      expect(messageSerializer.serialize).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: complianceData.productId,
          eventType: 'created',
          actor: {
            walletAddress: complianceData.walletAddress,
            role: complianceData.roleType,
          },
        })
      );
    });

    it('should map compliance actions to event types correctly', async () => {
      const testCases = [
        { action: 'producer_initial_creation', expectedEventType: 'created' },
        { action: 'processor_quality_check', expectedEventType: 'processed' },
        { action: 'verifier_final_approval', expectedEventType: 'verified' },
        { action: 'unknown_action', expectedEventType: 'created' }, // fallback
      ];

      await hcsEventLogger.initialize();

      for (const testCase of testCases) {
        const data = { ...complianceData, action: testCase.action };
        await hcsEventLogger.logComplianceEvent(data);

        expect(messageSerializer.serialize).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: testCase.expectedEventType,
          })
        );
      }
    });
  });

  describe('Error Handling and Retry Logic', () => {
    it('should handle timeout errors appropriately', async () => {
      mockTransaction.execute.mockRejectedValue(new Error('Request timeout'));

      await hcsEventLogger.initialize();

      const result = await hcsEventLogger.logProductCreation({
        productId: 'CT-2024-001-ABC123',
        eventType: 'created',
        actor: { walletAddress: '0.0.67890', role: 'Producer' },
        location: {
          coordinates: { latitude: 0, longitude: 0 },
          address: 'Test',
          region: 'Test',
        },
        eventData: {},
        signature: 'test',
      });

      expect(result.success).toBe(false);
      expect(result.error?.retryable).toBe(true);
    });

    it('should handle rate limit errors', async () => {
      mockTransaction.execute.mockRejectedValue(
        new Error('Rate limit exceeded')
      );

      await hcsEventLogger.initialize();

      const result = await hcsEventLogger.logProductCreation({
        productId: 'CT-2024-001-ABC123',
        eventType: 'created',
        actor: { walletAddress: '0.0.67890', role: 'Producer' },
        location: {
          coordinates: { latitude: 0, longitude: 0 },
          address: 'Test',
          region: 'Test',
        },
        eventData: {},
        signature: 'test',
      });

      expect(result.success).toBe(false);
      expect(result.error?.retryable).toBe(true);
    });

    it('should record non-retryable failures in dead letter queue', async () => {
      const { hcsFailureHandler } = await import(
        '@/services/hedera/HCSFailureHandler'
      );

      (messageSerializer.serialize as MockedFunction<any>).mockRejectedValue(
        new HederaError('Invalid message format', { retryable: false })
      );

      await hcsEventLogger.initialize();

      const result = await hcsEventLogger.logProductCreation({
        productId: 'CT-2024-001-ABC123',
        eventType: 'created',
        actor: { walletAddress: '0.0.67890', role: 'Producer' },
        location: {
          coordinates: { latitude: 0, longitude: 0 },
          address: 'Test',
          region: 'Test',
        },
        eventData: {},
        signature: 'test',
      });

      expect(result.success).toBe(false);
      expect(hcsFailureHandler.recordFailure).toHaveBeenCalled();
    });
  });

  describe('Performance Requirements', () => {
    it('should complete event logging within reasonable time', async () => {
      await hcsEventLogger.initialize();

      const startTime = Date.now();

      const result = await hcsEventLogger.logProductCreation({
        productId: 'CT-2024-001-ABC123',
        eventType: 'created',
        actor: { walletAddress: '0.0.67890', role: 'Producer' },
        location: {
          coordinates: { latitude: 0, longitude: 0 },
          address: 'Test',
          region: 'Test',
        },
        eventData: {},
        signature: 'test',
      });

      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.metadata?.durationMs).toBeDefined();
    });

    it('should handle multiple concurrent event logging requests', async () => {
      await hcsEventLogger.initialize();

      const eventRequests = Array.from({ length: 10 }, (_, i) => ({
        productId: `CT-2024-001-ABC${i.toString().padStart(3, '0')}`,
        eventType: 'created' as const,
        actor: { walletAddress: '0.0.67890', role: 'Producer' as const },
        location: {
          coordinates: { latitude: 0, longitude: 0 },
          address: 'Test',
          region: 'Test',
        },
        eventData: { index: i },
        signature: `test-${i}`,
      }));

      const startTime = Date.now();

      const results = await Promise.all(
        eventRequests.map(request => hcsEventLogger.logProductCreation(request))
      );

      const duration = Date.now() - startTime;

      // All requests should succeed
      expect(results.every(result => result.success)).toBe(true);

      // Should complete all requests within reasonable time
      expect(duration).toBeLessThan(10000); // 10 seconds for 10 concurrent requests
    });
  });
});

describe('HCSRetryManager', () => {
  let retryManager: HCSRetryManager;

  beforeEach(() => {
    retryManager = new HCSRetryManager({
      maxRetries: 3,
      baseDelay: 100,
      maxDelay: 1000,
      backoffMultiplier: 2,
    });
  });

  describe('Retry Logic', () => {
    it('should succeed on first attempt when operation succeeds', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');

      const result = await retryManager.executeWithRetry(mockOperation);

      expect(result.result).toBe('success');
      expect(result.metadata.retryAttempts).toBe(0);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry retryable errors with exponential backoff', async () => {
      const mockOperation = vi
        .fn()
        .mockRejectedValueOnce(
          new HederaError('Network error', { retryable: true })
        )
        .mockRejectedValueOnce(
          new HederaError('Network error', { retryable: true })
        )
        .mockResolvedValueOnce('success');

      const startTime = Date.now();
      const result = await retryManager.executeWithRetry(mockOperation);
      const duration = Date.now() - startTime;

      expect(result.result).toBe('success');
      expect(result.metadata.retryAttempts).toBe(2);
      expect(mockOperation).toHaveBeenCalledTimes(3);

      // Should have applied delay between retries
      expect(duration).toBeGreaterThan(300); // At least 100ms + 200ms delays
    });

    it('should not retry non-retryable errors', async () => {
      const mockOperation = vi
        .fn()
        .mockRejectedValue(
          new HederaError('Validation error', { retryable: false })
        );

      await expect(
        retryManager.executeWithRetry(mockOperation)
      ).rejects.toThrow(HederaError);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should throw after max retries exceeded', async () => {
      const mockOperation = vi
        .fn()
        .mockRejectedValue(new NetworkError('Persistent network error'));

      await expect(
        retryManager.executeWithRetry(mockOperation)
      ).rejects.toThrow(HederaError);
      expect(mockOperation).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('should respect maximum delay limit', async () => {
      const highRetryManager = new HCSRetryManager({
        maxRetries: 10,
        baseDelay: 100,
        maxDelay: 500,
        backoffMultiplier: 3,
      });

      const mockOperation = vi
        .fn()
        .mockRejectedValue(new NetworkError('Network error'));

      const startTime = Date.now();

      try {
        await highRetryManager.executeWithRetry(mockOperation);
      } catch (error) {
        // Expected to fail
      }

      const duration = Date.now() - startTime;

      // Even with high backoff multiplier, total time should be reasonable due to maxDelay
      expect(duration).toBeLessThan(10000); // Should not take more than 10 seconds
    });
  });

  describe('Error Categorization', () => {
    it('should handle different error types appropriately', async () => {
      const errorTypes = [
        new TimeoutError('Operation timeout'),
        new NetworkError('Network failure'),
        new HederaError('Hedera SDK error', { retryable: true }),
        new Error('Generic error'),
      ];

      for (const error of errorTypes) {
        const mockOperation = vi.fn().mockRejectedValue(error);

        try {
          await retryManager.executeWithRetry(mockOperation);
        } catch (thrownError) {
          // All should eventually throw after retries
          expect(thrownError).toBeDefined();
        }

        // Should have attempted retries for retryable errors
        if (error instanceof HederaError && error.retryable) {
          expect(mockOperation).toHaveBeenCalledTimes(4); // Initial + 3 retries
        }
      }
    });
  });
});
