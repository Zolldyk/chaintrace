/**
 * Unit tests for HCS Mirror Node Service (Story 2.3)
 * Tests event retrieval, 30-second confirmation, and integrity validation
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
import { HCSMirrorNodeService } from '@/services/hedera/HCSMirrorNodeService';
import { NetworkError, TimeoutError } from '@/lib/errors';
import type { HCSEventMessage } from '@/types/hedera';

// Mock dependencies
vi.mock('@/lib/serialization', () => ({
  deserializeHCSMessage: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch globally
const mockFetch = vi.fn() as MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('HCSMirrorNodeService', () => {
  let mirrorService: HCSMirrorNodeService;

  beforeEach(() => {
    vi.clearAllMocks();

    mirrorService = new HCSMirrorNodeService({
      networkType: 'testnet',
      timeout: 30000,
    });

    // Mock environment variables
    process.env.HCS_TOPIC_ID = '0.0.12345';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should create instance with default testnet configuration', () => {
      const service = new HCSMirrorNodeService();
      expect(service).toBeInstanceOf(HCSMirrorNodeService);
    });

    it('should create instance with mainnet configuration', () => {
      const service = new HCSMirrorNodeService({ networkType: 'mainnet' });
      expect(service).toBeInstanceOf(HCSMirrorNodeService);
    });

    it('should accept custom timeout configuration', () => {
      const service = new HCSMirrorNodeService({ timeout: 60000 });
      expect(service).toBeInstanceOf(HCSMirrorNodeService);
    });
  });

  describe('Product Event Retrieval', () => {
    const mockMirrorNodeResponse = {
      messages: [
        {
          consensus_timestamp: '1234567890.123456789',
          message: Buffer.from(
            JSON.stringify({
              version: '2.3.0',
              productId: 'CT-2024-001-ABC123',
              eventType: 'created',
              timestamp: '2024-09-10T10:30:00.000Z',
              actor: {
                walletAddress: '0.0.67890',
                role: 'Producer',
              },
              location: {
                coordinates: { latitude: 6.5244, longitude: 3.3792 },
                address: '123 Farm Road, Lagos',
                region: 'Southwest Nigeria',
              },
              eventData: { batchId: 'BATCH-001' },
              signature: 'test-signature',
            })
          ).toString('base64'),
          topic_id: '0.0.12345',
          sequence_number: 1,
          running_hash: 'test-hash',
          running_hash_version: 3,
          payer_account_id: '0.0.98765',
        },
        {
          consensus_timestamp: '1234567890.223456789',
          message: Buffer.from(
            JSON.stringify({
              version: '2.3.0',
              productId: 'CT-2024-001-XYZ789',
              eventType: 'verified',
              timestamp: '2024-09-10T10:35:00.000Z',
              actor: {
                walletAddress: '0.0.11111',
                role: 'Verifier',
              },
              location: {
                coordinates: { latitude: 6.5244, longitude: 3.3792 },
                address: 'Verification Center',
                region: 'Southwest Nigeria',
              },
              eventData: { verificationResult: 'APPROVED' },
              signature: 'verifier-signature',
            })
          ).toString('base64'),
          topic_id: '0.0.12345',
          sequence_number: 2,
          running_hash: 'test-hash-2',
          running_hash_version: 3,
          payer_account_id: '0.0.98765',
        },
      ],
    };

    beforeEach(() => {
      // Mock successful Mirror Node API response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMirrorNodeResponse),
      } as Response);

      // Mock deserialization
      const { deserializeHCSMessage } = require('@/lib/serialization');
      (deserializeHCSMessage as MockedFunction<any>).mockImplementation(
        (serialized: string) => {
          return Promise.resolve(JSON.parse(serialized));
        }
      );
    });

    it('should successfully retrieve events for a specific product', async () => {
      const result = await mirrorService.getProductEvents('CT-2024-001-ABC123');

      expect(result.found).toBe(true);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].productId).toBe('CT-2024-001-ABC123');
      expect(result.events[0].eventType).toBe('created');
      expect(result.metadata.within30Seconds).toBe(true);
      expect(result.metadata.messageCount).toBe(1);
    });

    it('should filter events by product ID correctly', async () => {
      const result = await mirrorService.getProductEvents('CT-2024-001-XYZ789');

      expect(result.found).toBe(true);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].productId).toBe('CT-2024-001-XYZ789');
      expect(result.events[0].eventType).toBe('verified');
    });

    it('should return empty result for non-existent product', async () => {
      const result = await mirrorService.getProductEvents(
        'NONEXISTENT-PRODUCT'
      );

      expect(result.found).toBe(false);
      expect(result.events).toHaveLength(0);
      expect(result.metadata.messageCount).toBe(0);
    });

    it('should handle Mirror Node API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(
        mirrorService.getProductEvents('CT-2024-001-ABC123')
      ).rejects.toThrow(NetworkError);
    });

    it('should handle network timeouts', async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('AbortError')), 100);
          })
      );

      // Create service with short timeout for testing
      const fastService = new HCSMirrorNodeService({ timeout: 100 });

      await expect(
        fastService.getProductEvents('CT-2024-001-ABC123')
      ).rejects.toThrow(NetworkError);
    });

    it('should track query performance metrics', async () => {
      const startTime = Date.now();

      const result = await mirrorService.getProductEvents('CT-2024-001-ABC123');

      expect(result.metadata.queryTime).toBeGreaterThan(0);
      expect(result.metadata.queryTime).toBeLessThan(
        Date.now() - startTime + 1000
      );
      expect(result.metadata.mirrorNodeResponseTime).toBeGreaterThan(0);
    });

    it('should handle message deserialization errors gracefully', async () => {
      const { deserializeHCSMessage } = require('@/lib/serialization');
      (deserializeHCSMessage as MockedFunction<any>).mockRejectedValue(
        new Error('Invalid message format')
      );

      const result = await mirrorService.getProductEvents('CT-2024-001-ABC123');

      expect(result.found).toBe(false);
      expect(result.events).toHaveLength(0);
      expect(result.metadata.warnings).toHaveLength(2); // One warning per message
      expect(result.metadata.warnings[0]).toContain(
        'Failed to deserialize message'
      );
    });

    it('should throw error when topic ID is missing', async () => {
      delete process.env.HCS_TOPIC_ID;

      await expect(
        mirrorService.getProductEvents('CT-2024-001-ABC123')
      ).rejects.toThrow('HCS Topic ID is required');
    });
  });

  describe('Event Confirmation (30-second requirement)', () => {
    const mockEventId = 'test-event-123';
    const mockTopicId = '0.0.12345';

    it('should confirm event within timeout when found', async () => {
      const mockResponseWithEvent = {
        messages: [
          {
            consensus_timestamp: '1234567890.123456789',
            message: Buffer.from(
              JSON.stringify({
                productId: 'CT-2024-001-ABC123',
                eventData: { eventId: mockEventId },
              })
            ).toString('base64'),
            topic_id: mockTopicId,
            sequence_number: 1,
            running_hash: 'test-hash',
            running_hash_version: 3,
            payer_account_id: '0.0.98765',
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponseWithEvent),
      } as Response);

      const { deserializeHCSMessage } = require('@/lib/serialization');
      (deserializeHCSMessage as MockedFunction<any>).mockResolvedValue({
        productId: 'CT-2024-001-ABC123',
        eventData: { eventId: mockEventId },
      });

      const startTime = Date.now();
      const confirmed = await mirrorService.waitForEventConfirmation(
        mockEventId,
        mockTopicId,
        5000 // 5-second timeout for testing
      );
      const duration = Date.now() - startTime;

      expect(confirmed).toBe(true);
      expect(duration).toBeLessThan(5000);
    });

    it('should timeout when event is not found', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ messages: [] }),
      } as Response);

      const startTime = Date.now();
      const confirmed = await mirrorService.waitForEventConfirmation(
        'nonexistent-event',
        mockTopicId,
        2000 // 2-second timeout for testing
      );
      const duration = Date.now() - startTime;

      expect(confirmed).toBe(false);
      expect(duration).toBeGreaterThan(1900); // Should wait nearly full timeout
      expect(duration).toBeLessThan(3000);
    });

    it('should handle intermittent polling failures gracefully', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              messages: [
                {
                  consensus_timestamp: '1234567890.123456789',
                  message: Buffer.from(
                    JSON.stringify({
                      eventData: { eventId: mockEventId },
                    })
                  ).toString('base64'),
                  topic_id: mockTopicId,
                  sequence_number: 1,
                  running_hash: 'test-hash',
                  running_hash_version: 3,
                  payer_account_id: '0.0.98765',
                },
              ],
            }),
        } as Response);
      });

      const { deserializeHCSMessage } = require('@/lib/serialization');
      (deserializeHCSMessage as MockedFunction<any>).mockResolvedValue({
        eventData: { eventId: mockEventId },
      });

      const confirmed = await mirrorService.waitForEventConfirmation(
        mockEventId,
        mockTopicId,
        5000
      );

      expect(confirmed).toBe(true);
      expect(callCount).toBeGreaterThan(2); // Should have retried after failures
    });
  });

  describe('Event Integrity Validation', () => {
    const createMockEvent = (
      productId: string,
      timestamp: string,
      signature: string,
      previousEventId?: string
    ): HCSEventMessage => ({
      version: '2.3.0',
      productId,
      eventType: 'created',
      timestamp,
      actor: {
        walletAddress: '0.0.67890',
        role: 'Producer',
      },
      location: {
        coordinates: { latitude: 0, longitude: 0 },
        address: 'Test Address',
        region: 'Test Region',
      },
      eventData: {},
      signature,
      previousEventId,
    });

    it('should validate clean event sequence', async () => {
      const events = [
        createMockEvent('CT-001', '2024-09-10T10:00:00.000Z', 'sig1'),
        createMockEvent('CT-001', '2024-09-10T10:01:00.000Z', 'sig2', 'event1'),
        createMockEvent('CT-001', '2024-09-10T10:02:00.000Z', 'sig3', 'event2'),
      ];

      const result = await mirrorService.validateEventIntegrity(events);

      expect(result.valid).toBe(true);
      expect(result.sequenceValid).toBe(true);
      expect(result.messageIntegrityValid).toBe(true);
      expect(result.tamperingDetected).toBe(false);
    });

    it('should detect invalid signatures', async () => {
      const events = [
        createMockEvent('CT-001', '2024-09-10T10:00:00.000Z', ''), // Invalid signature
        createMockEvent('CT-001', '2024-09-10T10:01:00.000Z', 'short'), // Too short signature
      ];

      const result = await mirrorService.validateEventIntegrity(events);

      expect(result.valid).toBe(false);
      expect(result.messageIntegrityValid).toBe(false);
      expect(result.tamperingDetected).toBe(true);
    });

    it('should detect timestamp sequence violations', async () => {
      const events = [
        createMockEvent('CT-001', '2024-09-10T10:02:00.000Z', 'sig1'), // Later timestamp
        createMockEvent('CT-001', '2024-09-10T10:01:00.000Z', 'sig2'), // Earlier timestamp
      ];

      const result = await mirrorService.validateEventIntegrity(events);

      expect(result.valid).toBe(false);
      expect(result.sequenceValid).toBe(false);
      expect(result.tamperingDetected).toBe(true);
    });

    it('should validate event chain integrity', async () => {
      const events = [
        createMockEvent('CT-001', '2024-09-10T10:00:00.000Z', 'sig1'),
        createMockEvent(
          'CT-001',
          '2024-09-10T10:01:00.000Z',
          'sig2',
          'missing-event'
        ), // Invalid chain
      ];

      const result = await mirrorService.validateEventIntegrity(events);

      expect(result.valid).toBe(false);
      expect(result.sequenceValid).toBe(false);
      expect(result.tamperingDetected).toBe(true);
    });

    it('should sort events by timestamp before validation', async () => {
      const events = [
        createMockEvent('CT-001', '2024-09-10T10:02:00.000Z', 'sig3'),
        createMockEvent('CT-001', '2024-09-10T10:00:00.000Z', 'sig1'),
        createMockEvent('CT-001', '2024-09-10T10:01:00.000Z', 'sig2'),
      ];

      const result = await mirrorService.validateEventIntegrity(events);

      expect(result.valid).toBe(true);
      expect(result.details.expectedSequence).toEqual([1, 2, 3]);
      expect(result.details.actualSequence).toEqual([1, 2, 3]);
    });

    it('should provide detailed validation information', async () => {
      const events = [
        createMockEvent('CT-001', '2024-09-10T10:00:00.000Z', 'sig1'),
      ];

      const result = await mirrorService.validateEventIntegrity(events);

      expect(result.details.validatedAt).toBeInstanceOf(Date);
      expect(result.details.expectedSequence).toEqual([1]);
      expect(result.details.actualSequence).toEqual([1]);
      expect(result.details.missingSequence).toEqual([]);
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle large event sets efficiently', async () => {
      // Create 1000 mock messages
      const largeResponse = {
        messages: Array.from({ length: 1000 }, (_, i) => ({
          consensus_timestamp: `123456789${i.toString().padStart(4, '0')}.123456789`,
          message: Buffer.from(
            JSON.stringify({
              version: '2.3.0',
              productId: 'CT-2024-001-ABC123',
              eventType: 'created',
              timestamp: new Date(Date.now() + i * 1000).toISOString(),
              actor: { walletAddress: '0.0.67890', role: 'Producer' },
              location: {
                coordinates: { latitude: 0, longitude: 0 },
                address: 'Test',
                region: 'Test',
              },
              eventData: { index: i },
              signature: `signature-${i}`,
            })
          ).toString('base64'),
          topic_id: '0.0.12345',
          sequence_number: i + 1,
          running_hash: `hash-${i}`,
          running_hash_version: 3,
          payer_account_id: '0.0.98765',
        })),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(largeResponse),
      } as Response);

      const { deserializeHCSMessage } = require('@/lib/serialization');
      (deserializeHCSMessage as MockedFunction<any>).mockImplementation(
        (serialized: string) => Promise.resolve(JSON.parse(serialized))
      );

      const startTime = Date.now();
      const result = await mirrorService.getProductEvents('CT-2024-001-ABC123');
      const duration = Date.now() - startTime;

      expect(result.found).toBe(true);
      expect(result.events).toHaveLength(1000);
      expect(duration).toBeLessThan(10000); // Should process 1000 events within 10 seconds
    });

    it('should meet 30-second retrieval requirement', async () => {
      const mockResponseQuick = {
        messages: [
          {
            consensus_timestamp: '1234567890.123456789',
            message: Buffer.from(
              JSON.stringify({
                productId: 'CT-2024-001-ABC123',
                eventType: 'created',
              })
            ).toString('base64'),
            topic_id: '0.0.12345',
            sequence_number: 1,
            running_hash: 'test-hash',
            running_hash_version: 3,
            payer_account_id: '0.0.98765',
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponseQuick),
      } as Response);

      const { deserializeHCSMessage } = require('@/lib/serialization');
      (deserializeHCSMessage as MockedFunction<any>).mockImplementation(
        (serialized: string) => Promise.resolve(JSON.parse(serialized))
      );

      const startTime = Date.now();
      const result = await mirrorService.getProductEvents('CT-2024-001-ABC123');
      const duration = Date.now() - startTime;

      expect(result.metadata.within30Seconds).toBe(true);
      expect(result.metadata.queryTime).toBeLessThan(30000);
      expect(duration).toBeLessThan(30000);
    });

    it('should handle concurrent requests efficiently', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ messages: [] }),
      } as Response);

      const concurrentRequests = Array.from({ length: 10 }, (_, i) =>
        mirrorService.getProductEvents(
          `CT-2024-001-ABC${i.toString().padStart(3, '0')}`
        )
      );

      const startTime = Date.now();
      const results = await Promise.all(concurrentRequests);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(10);
      expect(results.every(result => result.metadata.within30Seconds)).toBe(
        true
      );
      expect(duration).toBeLessThan(30000); // All concurrent requests within 30 seconds
    });
  });
});
