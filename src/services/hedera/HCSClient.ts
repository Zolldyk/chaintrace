/**
 * Production HCS (Hedera Consensus Service) client for topic message operations
 *
 * @since 1.4.0
 */

import {
  TopicMessageSubmitTransaction,
  TopicId,
  TopicMessageQuery,
} from '@hashgraph/sdk';
import { HederaServiceClient } from '../core/HederaServiceClient';
import { hcsSerializer } from '../../lib/serialization/HCSMessageSerializer';
import type { HederaServiceConfig, HCSMessage } from '../../types/hedera';
import type { ProductEvent } from '../../types/product';

/**
 * Message submission result
 */
export interface MessageSubmissionResult {
  /** Transaction ID */
  transactionId: string;

  /** HCS topic ID */
  topicId: string;

  /** Message sequence number */
  sequenceNumber?: number;

  /** Submission timestamp */
  submittedAt: Date;

  /** Message size in bytes */
  messageSize: number;
}

/**
 * Production HCS client for reliable message submission and subscription
 *
 * @class HCSClient
 * @extends HederaServiceClient
 * @since 1.4.0
 *
 * @example
 * ```typescript
 * const hcsClient = new HCSClient({
 *   networkType: 'testnet',
 *   operatorAccountId: '0.0.12345',
 *   operatorPrivateKey: 'your-private-key',
 *   hcsTopicId: '0.0.67890'
 * });
 *
 * // Submit product event to HCS
 * const result = await hcsClient.submitProductEvent(productEvent, signature);
 * ```
 */
export class HCSClient extends HederaServiceClient {
  private defaultTopicId: TopicId | null = null;

  constructor(config: HederaServiceConfig) {
    super(config);

    if (config.hcsTopicId) {
      this.defaultTopicId = TopicId.fromString(config.hcsTopicId);
    }
  }

  protected getServiceName(): string {
    return 'HCSClient';
  }

  /**
   * Submit product event to HCS topic
   */
  async submitProductEvent(
    event: ProductEvent,
    signature: string,
    options: {
      topicId?: string;
      sequenceNumber?: number;
    } = {}
  ): Promise<MessageSubmissionResult> {
    const topicId = options.topicId
      ? TopicId.fromString(options.topicId)
      : this.defaultTopicId;

    if (!topicId) {
      throw new Error('HCS topic ID must be provided');
    }

    return this.executeWithRetry(
      async () => {
        // Serialize the event for HCS
        const serialized = await hcsSerializer.serializeProductEvent(
          event,
          {
            networkType: this.networkType,
            topicId: topicId.toString(),
            sequenceNumber: options.sequenceNumber || 0,
          },
          signature
        );

        // Create and execute the transaction
        const transaction = new TopicMessageSubmitTransaction()
          .setTopicId(topicId)
          .setMessage(serialized.data);

        const txResponse = await transaction.execute(this.client);
        const receipt = await txResponse.getReceipt(this.client);

        return {
          transactionId: txResponse.transactionId.toString(),
          topicId: topicId.toString(),
          sequenceNumber: receipt.topicSequenceNumber?.toNumber(),
          submittedAt: new Date(),
          messageSize: serialized.size,
        };
      },
      {
        operationName: 'submitProductEvent',
        timeout: this.config.timeouts?.hcs || 30000,
        metadata: {
          eventType: event.eventType,
          productId: event.productId,
          topicId: topicId.toString(),
        },
      }
    );
  }

  /**
   * Submit compliance check to HCS topic
   */
  async submitComplianceCheck(
    productId: string,
    complianceData: any,
    signature: string,
    topicId?: string
  ): Promise<MessageSubmissionResult> {
    const topic = topicId ? TopicId.fromString(topicId) : this.defaultTopicId;

    if (!topic) {
      throw new Error('HCS topic ID must be provided');
    }

    return this.executeWithRetry(
      async () => {
        const serialized = await hcsSerializer.serializeComplianceCheck(
          productId,
          complianceData,
          {
            networkType: this.networkType,
            topicId: topic.toString(),
          },
          signature
        );

        const transaction = new TopicMessageSubmitTransaction()
          .setTopicId(topic)
          .setMessage(serialized.data);

        const txResponse = await transaction.execute(this.client);
        const receipt = await txResponse.getReceipt(this.client);

        return {
          transactionId: txResponse.transactionId.toString(),
          topicId: topic.toString(),
          sequenceNumber: receipt.topicSequenceNumber?.toNumber(),
          submittedAt: new Date(),
          messageSize: serialized.size,
        };
      },
      {
        operationName: 'submitComplianceCheck',
        timeout: this.config.timeouts?.hcs || 30000,
        metadata: { productId, topicId: topic.toString() },
      }
    );
  }

  /**
   * Subscribe to topic messages (for real-time updates)
   */
  subscribeToTopic(
    topicId: string,
    onMessage: (message: HCSMessage) => void,
    onError?: (error: Error) => void
  ): () => void {
    const topic = TopicId.fromString(topicId);

    const query = new TopicMessageQuery().setTopicId(topic).setStartTime(0);

    const subscription = query.subscribe(
      this.client,
      message => {
        try {
          // Check if message and contents are valid
          if (!message || !message.contents) {
            if (onError) {
              onError(new Error('Received empty message from HCS topic'));
            }
            return;
          }

          // Deserialize the message
          const messageStr = Buffer.from(message.contents).toString('utf8');
          const hcsMessage = JSON.parse(messageStr);
          onMessage(hcsMessage);
        } catch (error) {
          if (onError) {
            onError(error instanceof Error ? error : new Error(String(error)));
          }
        }
      },
      error => {
        if (onError) {
          // Convert TopicMessage error to proper Error
          const errorMessage =
            error instanceof Error
              ? error
              : new Error(`HCS subscription error: ${String(error)}`);
          onError(errorMessage);
        }
      }
    );

    // Return unsubscribe function
    return () => {
      subscription.unsubscribe();
    };
  }

  /**
   * Validate message ordering and sequence
   */
  async validateMessageSequence(
    topicId: string,
    expectedSequence: number
  ): Promise<boolean> {
    return this.executeWithRetry(
      async () => {
        // This would typically query the Mirror Node to check the last sequence number
        // Implementation depends on your specific validation requirements
        return true; // Simplified for this example
      },
      {
        operationName: 'validateMessageSequence',
        timeout: 5000,
        metadata: { topicId, expectedSequence },
      }
    );
  }
}
