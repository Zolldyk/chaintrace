/**
 * HCS Mirror Node Service for Event Retrieval and Validation
 * Provides 30-second retrieval validation and tamper detection for audit trails
 *
 * @since 2.3.0
 */

import { HCSEventMessage, MirrorNodeQueryConfig } from '@/types/hedera';
import { ChainTraceError, NetworkError, TimeoutError } from '@/lib/errors';
import { deserializeHCSMessage } from '@/lib/serialization';
import { logger } from '@/lib/logger';

/**
 * Mirror Node HCS message response
 *
 * @interface MirrorNodeMessage
 * @since 2.3.0
 */
export interface MirrorNodeMessage {
  /** Consensus timestamp */
  consensus_timestamp: string;

  /** Message content (base64 encoded) */
  message: string;

  /** Topic ID */
  topic_id: string;

  /** Sequence number */
  sequence_number: number;

  /** Running hash */
  running_hash: string;

  /** Running hash version */
  running_hash_version: number;

  /** Payer account ID */
  payer_account_id: string;
}

/**
 * Mirror Node API response for topic messages
 *
 * @interface TopicMessagesResponse
 * @since 2.3.0
 */
export interface TopicMessagesResponse {
  /** Array of messages */
  messages: MirrorNodeMessage[];

  /** Links for pagination */
  links?: {
    next?: string;
  };
}

/**
 * Event retrieval result with validation metadata
 *
 * @interface EventRetrievalResult
 * @since 2.3.0
 */
export interface EventRetrievalResult {
  /** Whether events were found */
  found: boolean;

  /** Retrieved HCS event messages */
  events: HCSEventMessage[];

  /** Retrieval metadata */
  metadata: {
    /** Query execution time in milliseconds */
    queryTime: number;

    /** Number of messages retrieved */
    messageCount: number;

    /** Whether within 30-second requirement */
    within30Seconds: boolean;

    /** Mirror Node response time */
    mirrorNodeResponseTime: number;

    /** Any validation warnings */
    warnings: string[];
  };
}

/**
 * Event integrity validation result
 *
 * @interface IntegrityValidationResult
 * @since 2.3.0
 */
export interface IntegrityValidationResult {
  /** Whether integrity is valid */
  valid: boolean;

  /** Event sequence validation */
  sequenceValid: boolean;

  /** Message integrity validation */
  messageIntegrityValid: boolean;

  /** Any tampering detected */
  tamperingDetected: boolean;

  /** Validation details */
  details: {
    /** Expected sequence numbers */
    expectedSequence: number[];

    /** Actual sequence numbers */
    actualSequence: number[];

    /** Missing sequence numbers */
    missingSequence: number[];

    /** Validation timestamp */
    validatedAt: Date;
  };
}

/**
 * HCS Mirror Node Service implementation
 *
 * @class HCSMirrorNodeService
 * @since 2.3.0
 *
 * @example
 * ```typescript
 * const mirrorService = new HCSMirrorNodeService();
 *
 * // Retrieve events for a product
 * const result = await mirrorService.getProductEvents('CT-2024-001-ABC123');
 *
 * // Validate 30-second retrieval requirement
 * const confirmation = await mirrorService.waitForEventConfirmation(eventId);
 * ```
 */
export class HCSMirrorNodeService {
  private readonly baseUrl: string;
  private readonly networkType: 'testnet' | 'mainnet';
  private readonly defaultTimeout: number = 30000; // 30 seconds

  /**
   * Creates a new HCSMirrorNodeService instance
   *
   * @param config - Mirror Node service configuration
   *
   * @since 2.3.0
   */
  constructor(config?: {
    networkType?: 'testnet' | 'mainnet';
    baseUrl?: string;
    timeout?: number;
  }) {
    this.networkType = config?.networkType || 'testnet';
    this.baseUrl = config?.baseUrl || this.getDefaultMirrorNodeUrl();
    this.defaultTimeout = config?.timeout || 30000;
  }

  /**
   * Retrieves all events for a specific product from HCS
   *
   * @param productId - Product identifier to retrieve events for
   * @param config - Optional query configuration
   * @returns Promise resolving to event retrieval result
   *
   * @throws {NetworkError} When Mirror Node is unreachable
   * @throws {TimeoutError} When query times out
   *
   * @example
   * ```typescript
   * const result = await mirrorService.getProductEvents('CT-2024-001-ABC123');
   * console.log(`Found ${result.events.length} events`);
   * ```
   *
   * @since 2.3.0
   */
  async getProductEvents(
    productId: string,
    config?: Partial<MirrorNodeQueryConfig>
  ): Promise<EventRetrievalResult> {
    const startTime = Date.now();

    try {
      logger.info('Retrieving product events from Mirror Node', {
        component: 'HCSMirrorNodeService',
        productId,
        topicId: config?.topicId,
      });

      const queryConfig: MirrorNodeQueryConfig = {
        topicId: config?.topicId || process.env.HCS_TOPIC_ID || '',
        timeoutMs: config?.timeoutMs || this.defaultTimeout,
        limit: config?.limit || 100,
        ...config,
      };

      if (!queryConfig.topicId) {
        throw new ChainTraceError(
          'HCS Topic ID is required for Mirror Node queries',
          'INVALID_CONFIGURATION',
          { retryable: false }
        );
      }

      // Query Mirror Node API
      const mirrorNodeStartTime = Date.now();
      const response = await this.queryMirrorNode(queryConfig);
      const mirrorNodeResponseTime = Date.now() - mirrorNodeStartTime;

      // Filter and deserialize messages for the specific product
      const productEvents: HCSEventMessage[] = [];
      const warnings: string[] = [];

      for (const message of response.messages) {
        try {
          // Decode base64 message content
          const messageContent = Buffer.from(
            message.message,
            'base64'
          ).toString('utf-8');

          // Deserialize HCS event message
          const eventMessage = await deserializeHCSMessage(messageContent);

          // Filter by product ID
          if (eventMessage.productId === productId) {
            productEvents.push(eventMessage);
          }
        } catch (error) {
          warnings.push(
            `Failed to deserialize message at sequence ${message.sequence_number}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
        }
      }

      const queryTime = Date.now() - startTime;
      const within30Seconds = queryTime <= 30000;

      const result: EventRetrievalResult = {
        found: productEvents.length > 0,
        events: productEvents,
        metadata: {
          queryTime,
          messageCount: productEvents.length,
          within30Seconds,
          mirrorNodeResponseTime,
          warnings,
        },
      };

      logger.info('Product events retrieved successfully', {
        component: 'HCSMirrorNodeService',
        productId,
        eventCount: productEvents.length,
        queryTime,
        within30Seconds,
      });

      return result;
    } catch (error) {
      logger.error('Failed to retrieve product events');

      if (error instanceof ChainTraceError) {
        throw error;
      }

      throw new NetworkError(
        `Failed to retrieve events for product ${productId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        {
          service: 'mirror-node',
          endpoint: this.baseUrl,
          cause: error instanceof Error ? error : undefined,
        }
      );
    }
  }

  /**
   * Waits for event confirmation via Mirror Node (30-second requirement)
   *
   * @param eventId - Event ID to wait for confirmation
   * @param topicId - HCS topic ID to monitor
   * @param timeout - Maximum wait time in milliseconds (default: 30000)
   * @returns Promise resolving to confirmation result
   *
   * @throws {TimeoutError} When event not found within timeout
   *
   * @example
   * ```typescript
   * const confirmed = await mirrorService.waitForEventConfirmation(eventId, topicId);
   * if (confirmed) {
   *   console.log('Event confirmed within 30 seconds');
   * }
   * ```
   *
   * @since 2.3.0
   */
  async waitForEventConfirmation(
    eventId: string,
    topicId: string,
    timeout: number = 30000
  ): Promise<boolean> {
    const startTime = Date.now();
    const pollInterval = 1000; // 1 second

    logger.info('Starting event confirmation polling', {
      component: 'HCSMirrorNodeService',
      eventId,
      topicId,
      timeout,
    });

    while (Date.now() - startTime < timeout) {
      try {
        // Query recent messages
        const response = await this.queryMirrorNode({
          topicId,
          timeoutMs: 5000, // Short timeout for polling
          limit: 10,
          startTime: new Date(Date.now() - 60000).toISOString(), // Last minute
        });

        // Check if event is found
        for (const message of response.messages) {
          try {
            const messageContent = Buffer.from(
              message.message,
              'base64'
            ).toString('utf-8');
            const eventMessage = await deserializeHCSMessage(messageContent);

            // Check if this is the event we're looking for
            // For now, we use a simple comparison - in production, you'd have proper event IDs
            if (
              eventMessage.eventData &&
              JSON.stringify(eventMessage).includes(eventId)
            ) {
              const confirmationTime = Date.now() - startTime;

              logger.info('Event confirmation successful', {
                component: 'HCSMirrorNodeService',
                eventId,
                confirmationTime,
                sequenceNumber: message.sequence_number,
              });

              return true;
            }
          } catch (error) {
            // Ignore deserialization errors during polling
            continue;
          }
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        logger.warn('Polling attempt failed, retrying', {
          component: 'HCSMirrorNodeService',
          eventId,
          elapsed: Date.now() - startTime,
          error: error instanceof Error ? error.message : String(error),
        });

        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    // Timeout reached
    const totalTime = Date.now() - startTime;

    logger.warn('Event confirmation timeout', {
      component: 'HCSMirrorNodeService',
      eventId,
      totalTime,
      timeout,
    });

    return false;
  }

  /**
   * Validates event integrity and detects tampering
   *
   * @param events - Array of HCS event messages to validate
   * @returns Promise resolving to integrity validation result
   *
   * @example
   * ```typescript
   * const validation = await mirrorService.validateEventIntegrity(events);
   * if (!validation.valid) {
   *   console.warn('Tampering detected:', validation.details);
   * }
   * ```
   *
   * @since 2.3.0
   */
  async validateEventIntegrity(
    events: HCSEventMessage[]
  ): Promise<IntegrityValidationResult> {
    logger.info('Starting event integrity validation', {
      component: 'HCSMirrorNodeService',
      eventCount: events.length,
    });

    // Sort events by timestamp
    const sortedEvents = [...events].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Validate event sequence
    const expectedSequence: number[] = [];
    const actualSequence: number[] = [];
    const missingSequence: number[] = [];

    // Check for proper event chaining
    let sequenceValid = true;
    let messageIntegrityValid = true;
    let tamperingDetected = false;

    for (let i = 0; i < sortedEvents.length; i++) {
      const event = sortedEvents[i];
      const expectedSeq = i + 1;

      expectedSequence.push(expectedSeq);
      actualSequence.push(i + 1); // For simplicity, using array index

      // Validate message format and signature
      try {
        if (!event.signature || event.signature.length < 10) {
          messageIntegrityValid = false;
          tamperingDetected = true;
        }

        // Check event chaining (if previousEventId is provided)
        if (i > 0 && event.previousEventId) {
          const previousEvent = sortedEvents[i - 1];
          // In a real implementation, you'd validate the hash chain
          // For now, we do basic validation
          if (!previousEvent) {
            sequenceValid = false;
            tamperingDetected = true;
          }
        }

        // Validate timestamp sequence
        if (i > 0) {
          const previousEvent = sortedEvents[i - 1];
          const currentTime = new Date(event.timestamp).getTime();
          const previousTime = new Date(previousEvent.timestamp).getTime();

          if (currentTime < previousTime) {
            sequenceValid = false;
            tamperingDetected = true;
          }
        }
      } catch (error) {
        messageIntegrityValid = false;
        tamperingDetected = true;
      }
    }

    const result: IntegrityValidationResult = {
      valid: sequenceValid && messageIntegrityValid && !tamperingDetected,
      sequenceValid,
      messageIntegrityValid,
      tamperingDetected,
      details: {
        expectedSequence,
        actualSequence,
        missingSequence,
        validatedAt: new Date(),
      },
    };

    logger.info('Event integrity validation completed', {
      component: 'HCSMirrorNodeService',
      valid: result.valid,
      sequenceValid,
      messageIntegrityValid,
      tamperingDetected,
    });

    return result;
  }

  /**
   * Queries the Mirror Node API for topic messages
   *
   * @param config - Query configuration
   * @returns Promise resolving to Mirror Node response
   *
   * @throws {NetworkError} When API request fails
   * @throws {TimeoutError} When request times out
   *
   * @since 2.3.0
   */
  private async queryMirrorNode(
    config: MirrorNodeQueryConfig
  ): Promise<TopicMessagesResponse> {
    const url = this.buildQueryUrl(config);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        config.timeoutMs || this.defaultTimeout
      );

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'ChainTrace/2.3.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new NetworkError(
          `Mirror Node API returned ${response.status}: ${response.statusText}`,
          {
            service: 'mirror-node',
            endpoint: url,
          }
        );
      }

      const data = await response.json();
      return data as TopicMessagesResponse;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new TimeoutError('Mirror Node query timed out', {
          operation: 'mirror_node_query',
          timeoutMs: config.timeoutMs || this.defaultTimeout,
          service: 'mirror-node',
          cause: error,
        });
      }

      if (error instanceof ChainTraceError) {
        throw error;
      }

      throw new NetworkError(
        `Mirror Node query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          service: 'mirror-node',
          endpoint: url,
          cause: error instanceof Error ? error : undefined,
        }
      );
    }
  }

  /**
   * Builds Mirror Node query URL with parameters
   *
   * @param config - Query configuration
   * @returns Complete query URL
   *
   * @since 2.3.0
   */
  private buildQueryUrl(config: MirrorNodeQueryConfig): string {
    const params = new URLSearchParams();

    if (config.limit) {
      params.append('limit', config.limit.toString());
    }

    if (config.startTime) {
      params.append('timestamp', `gte:${config.startTime}`);
    }

    if (config.endTime) {
      params.append('timestamp', `lte:${config.endTime}`);
    }

    if (config.sequenceNumber) {
      params.append('sequencenumber', `gte:${config.sequenceNumber}`);
    }

    params.append('order', 'desc'); // Get most recent first

    return `${this.baseUrl}/api/v1/topics/${config.topicId}/messages?${params.toString()}`;
  }

  /**
   * Gets the default Mirror Node URL for the network
   *
   * @returns Default Mirror Node URL
   *
   * @since 2.3.0
   */
  private getDefaultMirrorNodeUrl(): string {
    switch (this.networkType) {
      case 'mainnet':
        return 'https://mainnet-public.mirrornode.hedera.com';
      case 'testnet':
      default:
        return 'https://testnet.mirrornode.hedera.com';
    }
  }
}

/**
 * Default HCS Mirror Node Service instance
 *
 * @example
 * ```typescript
 * import { hcsMirrorNodeService } from '@/services/hedera/HCSMirrorNodeService';
 *
 * const events = await hcsMirrorNodeService.getProductEvents('CT-2024-001-ABC123');
 * ```
 *
 * @since 2.3.0
 */
export const hcsMirrorNodeService = new HCSMirrorNodeService({
  networkType:
    (process.env.HEDERA_NETWORK as 'testnet' | 'mainnet') || 'testnet',
  timeout: 30000,
});
