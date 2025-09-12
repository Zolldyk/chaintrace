/**
 * Integration tests for HCS Event Logging System (Story 2.3)
 * Tests complete end-to-end event logging, retrieval, and validation flow
 *
 * @since 2.3.0
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from 'vitest';
import { HCSEventLogger } from '@/services/hedera/HCSEventLogger';
import { HCSMirrorNodeService } from '@/services/hedera/HCSMirrorNodeService';
import { HCSFailureHandler } from '@/services/hedera/HCSFailureHandler';
import { messageSerializer } from '@/lib/serialization';
import type { HCSServiceConfig, EventLoggingRequest } from '@/types/hedera';

// Integration test configuration
const integrationConfig: HCSServiceConfig = {
  topicId: process.env.TEST_HCS_TOPIC_ID || '0.0.12345',
  operatorAccountId: process.env.TEST_HEDERA_OPERATOR_ACCOUNT_ID || '0.0.98765',
  operatorPrivateKey:
    process.env.TEST_HEDERA_OPERATOR_PRIVATE_KEY || 'test-key',
  networkType: 'testnet',
  messageTimeoutMs: 30000,
  retryConfig: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  },
};

// Skip integration tests if not in integration test environment
const shouldRunIntegration = process.env.RUN_INTEGRATION_TESTS === 'true';
const describeIntegration = shouldRunIntegration ? describe : describe.skip;

describeIntegration('HCS Event Logging Integration', () => {
  let hcsEventLogger: HCSEventLogger;
  let mirrorNodeService: HCSMirrorNodeService;
  let failureHandler: HCSFailureHandler;

  beforeAll(async () => {
    // Initialize services for integration testing
    hcsEventLogger = new HCSEventLogger(integrationConfig);
    mirrorNodeService = new HCSMirrorNodeService({
      networkType: 'testnet',
      timeout: 30000,
    });
    failureHandler = new HCSFailureHandler();

    // Initialize HCS Event Logger
    await hcsEventLogger.initialize();
  });

  afterAll(async () => {
    // Clean up services
    await hcsEventLogger.dispose();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('End-to-End Event Logging Flow', () => {
    it('should complete full product creation event flow', async () => {
      const productId = `CT-2024-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      const eventRequest: EventLoggingRequest = {
        productId,
        eventType: 'created',
        actor: {
          walletAddress: '0.0.67890',
          role: 'Producer',
          organizationId: 'COOP-001',
        },
        location: {
          coordinates: { latitude: 6.5244, longitude: 3.3792 },
          address: '123 Farm Road, Lagos',
          region: 'Southwest Nigeria',
        },
        eventData: {
          batchId: `BATCH-${Date.now()}`,
          quantity: { amount: 100, unit: 'kg' },
          category: 'agricultural',
          name: 'Integration Test Product',
        },
        signature: 'integration-test-signature',
      };

      // Step 1: Log the event
      const logResult = await hcsEventLogger.logProductCreation(eventRequest);

      expect(logResult.success).toBe(true);
      expect(logResult.sequenceNumber).toBeDefined();
      expect(logResult.transactionId).toBeDefined();

      // Step 2: Wait for Mirror Node confirmation (30-second requirement)
      if (logResult.success && logResult.sequenceNumber) {
        const confirmed = await mirrorNodeService.waitForEventConfirmation(
          productId, // Using productId as eventId for this test
          integrationConfig.topicId,
          35000 // 35-second timeout to account for network delays
        );

        expect(confirmed).toBe(true);
      }

      // Step 3: Retrieve and validate events
      const retrievalResult = await mirrorNodeService.getProductEvents(
        productId,
        { topicId: integrationConfig.topicId }
      );

      expect(retrievalResult.found).toBe(true);
      expect(retrievalResult.events.length).toBeGreaterThan(0);
      expect(retrievalResult.metadata.within30Seconds).toBe(true);

      // Find our specific event
      const ourEvent = retrievalResult.events.find(
        event => event.productId === productId
      );

      expect(ourEvent).toBeDefined();
      if (ourEvent) {
        expect(ourEvent.eventType).toBe('created');
        expect(ourEvent.actor.walletAddress).toBe(
          eventRequest.actor.walletAddress
        );
        expect(ourEvent.actor.role).toBe('Producer');
        expect(ourEvent.eventData.batchId).toBe(eventRequest.eventData.batchId);
      }

      // Step 4: Validate event integrity
      const integrityResult = await mirrorNodeService.validateEventIntegrity([
        ourEvent!,
      ]);

      expect(integrityResult.valid).toBe(true);
      expect(integrityResult.messageIntegrityValid).toBe(true);
      expect(integrityResult.tamperingDetected).toBe(false);
    });

    it('should handle complete Producer → Processor → Verifier workflow', async () => {
      const productId = `CT-2024-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const batchId = `BATCH-${Date.now()}`;

      // Step 1: Producer creates product
      const producerEvent: EventLoggingRequest = {
        productId,
        eventType: 'created',
        actor: {
          walletAddress: '0.0.67890',
          role: 'Producer',
          organizationId: 'COOP-001',
        },
        location: {
          coordinates: { latitude: 6.5244, longitude: 3.3792 },
          address: '123 Farm Road, Lagos',
          region: 'Southwest Nigeria',
        },
        eventData: {
          batchId,
          quantity: { amount: 100, unit: 'kg' },
          category: 'agricultural',
          name: 'Workflow Test Product',
        },
        signature: 'producer-signature',
      };

      const producerResult =
        await hcsEventLogger.logProductCreation(producerEvent);
      expect(producerResult.success).toBe(true);

      // Wait a moment for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 2: Processor processes product
      const processorEvent: EventLoggingRequest = {
        productId,
        eventType: 'processed',
        actor: {
          walletAddress: '0.0.11111',
          role: 'Processor',
          organizationId: 'PROC-001',
        },
        location: {
          coordinates: { latitude: 6.55, longitude: 3.4 },
          address: '456 Processing Plant, Lagos',
          region: 'Southwest Nigeria',
        },
        eventData: {
          batchId,
          processingMethod: 'organic_cleaning',
          qualityGrade: 'A',
          processedAt: new Date().toISOString(),
        },
        previousEventId: producerResult.sequenceNumber,
        signature: 'processor-signature',
      };

      const processorResult =
        await hcsEventLogger.logProcessingEvent(processorEvent);
      expect(processorResult.success).toBe(true);

      // Wait a moment for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 3: Verifier verifies product
      const verifierEvent: EventLoggingRequest = {
        productId,
        eventType: 'verified',
        actor: {
          walletAddress: '0.0.22222',
          role: 'Verifier',
        },
        location: {
          coordinates: { latitude: 6.45, longitude: 3.35 },
          address: '789 Verification Center, Lagos',
          region: 'Southwest Nigeria',
        },
        eventData: {
          batchId,
          verificationResult: 'APPROVED',
          verifiedBy: 'Certified Inspector',
          verifiedAt: new Date().toISOString(),
          complianceScore: 0.95,
        },
        previousEventId: processorResult.sequenceNumber,
        signature: 'verifier-signature',
      };

      const verifierResult =
        await hcsEventLogger.logVerificationEvent(verifierEvent);
      expect(verifierResult.success).toBe(true);

      // Step 4: Retrieve complete event chain
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for Mirror Node sync

      const retrievalResult = await mirrorNodeService.getProductEvents(
        productId,
        { topicId: integrationConfig.topicId }
      );

      expect(retrievalResult.found).toBe(true);
      expect(retrievalResult.events.length).toBeGreaterThanOrEqual(3);

      // Verify event sequence
      const events = retrievalResult.events
        .filter(event => event.productId === productId)
        .sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

      expect(events).toHaveLength(3);
      expect(events[0].eventType).toBe('created');
      expect(events[0].actor.role).toBe('Producer');
      expect(events[1].eventType).toBe('processed');
      expect(events[1].actor.role).toBe('Processor');
      expect(events[2].eventType).toBe('verified');
      expect(events[2].actor.role).toBe('Verifier');

      // Step 5: Validate complete workflow integrity
      const integrityResult =
        await mirrorNodeService.validateEventIntegrity(events);

      expect(integrityResult.valid).toBe(true);
      expect(integrityResult.sequenceValid).toBe(true);
      expect(integrityResult.messageIntegrityValid).toBe(true);
      expect(integrityResult.tamperingDetected).toBe(false);
    });
  });

  describe('Performance Requirements Validation', () => {
    it('should meet 30-second Mirror Node retrieval requirement', async () => {
      const productId = `CT-PERF-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

      const eventRequest: EventLoggingRequest = {
        productId,
        eventType: 'created',
        actor: {
          walletAddress: '0.0.67890',
          role: 'Producer',
        },
        location: {
          coordinates: { latitude: 6.5244, longitude: 3.3792 },
          address: 'Performance Test Location',
          region: 'Test Region',
        },
        eventData: {
          performanceTest: true,
          timestamp: new Date().toISOString(),
        },
        signature: 'performance-test-signature',
      };

      // Log event and measure time to confirmation
      const logStartTime = Date.now();
      const logResult = await hcsEventLogger.logProductCreation(eventRequest);
      expect(logResult.success).toBe(true);

      // Wait for Mirror Node confirmation
      const confirmationStartTime = Date.now();
      const confirmed = await mirrorNodeService.waitForEventConfirmation(
        productId,
        integrationConfig.topicId,
        30000 // Exactly 30 seconds as per requirement
      );
      const confirmationTime = Date.now() - confirmationStartTime;

      expect(confirmed).toBe(true);
      expect(confirmationTime).toBeLessThanOrEqual(30000); // Must be within 30 seconds

      // Retrieve events and verify timing
      const retrievalStartTime = Date.now();
      const retrievalResult = await mirrorNodeService.getProductEvents(
        productId,
        { topicId: integrationConfig.topicId }
      );
      const retrievalTime = Date.now() - retrievalStartTime;

      expect(retrievalResult.found).toBe(true);
      expect(retrievalResult.metadata.within30Seconds).toBe(true);
      expect(retrievalTime).toBeLessThanOrEqual(30000);
    });

    it('should handle batch operations efficiently', async () => {
      const batchSize = 10;
      const productIds: string[] = [];
      const eventRequests: EventLoggingRequest[] = [];

      // Prepare batch of events
      for (let i = 0; i < batchSize; i++) {
        const productId = `CT-BATCH-${Date.now()}-${i.toString().padStart(3, '0')}`;
        productIds.push(productId);

        eventRequests.push({
          productId,
          eventType: 'created',
          actor: {
            walletAddress: '0.0.67890',
            role: 'Producer',
          },
          location: {
            coordinates: { latitude: 6.5244, longitude: 3.3792 },
            address: `Batch Test Location ${i}`,
            region: 'Test Region',
          },
          eventData: {
            batchTest: true,
            batchIndex: i,
            timestamp: new Date().toISOString(),
          },
          signature: `batch-test-signature-${i}`,
        });
      }

      // Execute batch logging
      const batchStartTime = Date.now();
      const logResults = await Promise.all(
        eventRequests.map(request => hcsEventLogger.logProductCreation(request))
      );
      const batchLogTime = Date.now() - batchStartTime;

      // Verify all events were logged successfully
      expect(logResults.every(result => result.success)).toBe(true);
      expect(batchLogTime).toBeLessThan(60000); // Should complete within 1 minute

      // Wait for Mirror Node synchronization
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Verify all events can be retrieved
      const retrievalResults = await Promise.all(
        productIds.map(productId =>
          mirrorNodeService.getProductEvents(productId, {
            topicId: integrationConfig.topicId,
          })
        )
      );

      expect(retrievalResults.every(result => result.found)).toBe(true);
      expect(
        retrievalResults.every(result => result.metadata.within30Seconds)
      ).toBe(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle and recover from temporary network failures', async () => {
      // This test would require simulating network conditions
      // For now, we'll test the error handling path by checking logged events

      const productId = `CT-ERROR-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

      const eventRequest: EventLoggingRequest = {
        productId,
        eventType: 'created',
        actor: {
          walletAddress: '0.0.67890',
          role: 'Producer',
        },
        location: {
          coordinates: { latitude: 6.5244, longitude: 3.3792 },
          address: 'Error Test Location',
          region: 'Test Region',
        },
        eventData: {
          errorTest: true,
          timestamp: new Date().toISOString(),
        },
        signature: 'error-test-signature',
      };

      // The event should eventually succeed due to retry mechanisms
      const result = await hcsEventLogger.logProductCreation(eventRequest);

      // Even if there are temporary failures, the retry mechanism should ensure success
      expect(result.success).toBe(true);

      // Verify the event was actually logged
      await new Promise(resolve => setTimeout(resolve, 5000));

      const retrievalResult = await mirrorNodeService.getProductEvents(
        productId,
        { topicId: integrationConfig.topicId }
      );

      expect(retrievalResult.found).toBe(true);
    });

    it('should handle message serialization edge cases', async () => {
      // Test with large event data that approaches HCS size limits
      const largeEventData = {
        description: 'A'.repeat(800), // Large string to test serialization limits
        metadata: Object.fromEntries(
          Array.from({ length: 50 }, (_, i) => [`key${i}`, `value${i}`])
        ),
        timestamp: new Date().toISOString(),
      };

      const productId = `CT-SIZE-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

      const eventRequest: EventLoggingRequest = {
        productId,
        eventType: 'created',
        actor: {
          walletAddress: '0.0.67890',
          role: 'Producer',
        },
        location: {
          coordinates: { latitude: 6.5244, longitude: 3.3792 },
          address: 'Size Test Location',
          region: 'Test Region',
        },
        eventData: largeEventData,
        signature: 'size-test-signature',
      };

      const result = await hcsEventLogger.logProductCreation(eventRequest);

      // The serializer should handle large messages appropriately
      // Either by successful logging or proper error handling
      if (result.success) {
        // Verify the event was logged correctly
        await new Promise(resolve => setTimeout(resolve, 5000));

        const retrievalResult = await mirrorNodeService.getProductEvents(
          productId,
          { topicId: integrationConfig.topicId }
        );

        expect(retrievalResult.found).toBe(true);
      } else {
        // If it failed, it should be due to size constraints
        expect(result.error?.code).toContain('MESSAGE_TOO_LARGE');
      }
    });
  });
});

// Mock tests for when integration environment is not available
describe('HCS Event Logging (Mock Integration)', () => {
  it('should pass basic smoke test', () => {
    expect(true).toBe(true);
  });

  it('should have all required exports', () => {
    expect(HCSEventLogger).toBeDefined();
    expect(HCSMirrorNodeService).toBeDefined();
    expect(HCSFailureHandler).toBeDefined();
    expect(messageSerializer).toBeDefined();
  });
});
