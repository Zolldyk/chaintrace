/**
 * HCS message serialization and deserialization utilities
 *
 * @since 1.4.0
 */

import type { HCSMessage } from '../../types/hedera';
import type { ProductEvent } from '../../types/product';

/**
 * Serialization options
 */
export interface SerializationOptions {
  /** Maximum message size in bytes (HCS limit is 6KB) */
  maxSize?: number;

  /** Whether to include metadata in serialization */
  includeMetadata?: boolean;

  /** Compression level (future feature) */
  compression?: 'none' | 'gzip';
}

/**
 * Serialization result
 */
export interface SerializationResult {
  /** Serialized message data */
  data: string;

  /** Size in bytes */
  size: number;

  /** Whether message was compressed */
  compressed: boolean;

  /** Serialization timestamp */
  timestamp: Date;
}

/**
 * HCS message serialization utilities for ChainTrace product events
 *
 * @class HCSMessageSerializer
 * @since 1.4.0
 *
 * @example
 * ```typescript
 * const serializer = new HCSMessageSerializer();
 *
 * // Serialize product event for HCS
 * const message = await serializer.serializeProductEvent(productEvent, {
 *   networkType: 'testnet',
 *   topicId: '0.0.12345'
 * });
 *
 * // Deserialize HCS message
 * const parsed = await serializer.deserialize(message.data);
 * ```
 */
export class HCSMessageSerializer {
  private readonly HCS_SIZE_LIMIT = 6144; // 6KB in bytes
  private readonly DEFAULT_OPTIONS: Required<SerializationOptions> = {
    maxSize: this.HCS_SIZE_LIMIT,
    includeMetadata: true,
    compression: 'none',
  };

  /**
   * Serialize a product event into HCS message format
   */
  async serializeProductEvent(
    event: ProductEvent,
    metadata: {
      networkType: 'testnet' | 'mainnet';
      topicId: string;
      sequenceNumber?: number;
    },
    signature: string,
    options: SerializationOptions = {}
  ): Promise<SerializationResult> {
    const config = { ...this.DEFAULT_OPTIONS, ...options };

    const hcsMessage: HCSMessage = {
      version: '1.0',
      messageType: 'product_event',
      productId: event.productId,
      event,
      signature,
      timestamp: new Date().toISOString(),
      metadata: {
        networkType: metadata.networkType,
        topicId: metadata.topicId,
        sequenceNumber: metadata.sequenceNumber || 0,
      },
    };

    return this.serialize(hcsMessage, config);
  }

  /**
   * Serialize compliance check into HCS message format
   */
  async serializeComplianceCheck(
    productId: string,
    complianceData: any,
    metadata: {
      networkType: 'testnet' | 'mainnet';
      topicId: string;
      sequenceNumber?: number;
    },
    signature: string,
    options: SerializationOptions = {}
  ): Promise<SerializationResult> {
    const config = { ...this.DEFAULT_OPTIONS, ...options };

    const hcsMessage: HCSMessage = {
      version: '1.0',
      messageType: 'compliance_check',
      productId,
      event: complianceData, // Note: This will need proper typing
      signature,
      timestamp: new Date().toISOString(),
      metadata: {
        networkType: metadata.networkType,
        topicId: metadata.topicId,
        sequenceNumber: metadata.sequenceNumber || 0,
      },
    };

    return this.serialize(hcsMessage, config);
  }

  /**
   * Serialize reward distribution into HCS message format
   */
  async serializeRewardDistribution(
    productId: string,
    rewardData: any,
    metadata: {
      networkType: 'testnet' | 'mainnet';
      topicId: string;
      sequenceNumber?: number;
    },
    signature: string,
    options: SerializationOptions = {}
  ): Promise<SerializationResult> {
    const config = { ...this.DEFAULT_OPTIONS, ...options };

    const hcsMessage: HCSMessage = {
      version: '1.0',
      messageType: 'reward_distribution',
      productId,
      event: rewardData, // Note: This will need proper typing
      signature,
      timestamp: new Date().toISOString(),
      metadata: {
        networkType: metadata.networkType,
        topicId: metadata.topicId,
        sequenceNumber: metadata.sequenceNumber || 0,
      },
    };

    return this.serialize(hcsMessage, config);
  }

  /**
   * Generic HCS message serialization
   */
  async serialize(
    message: HCSMessage,
    options: SerializationOptions = {}
  ): Promise<SerializationResult> {
    const config = { ...this.DEFAULT_OPTIONS, ...options };

    // Convert dates to ISO strings for JSON serialization
    const serializedMessage = this.preprocessForSerialization(message);

    // Serialize to JSON
    const jsonData = JSON.stringify(
      serializedMessage,
      null,
      config.includeMetadata ? 2 : 0
    );

    // Check size constraints
    const sizeInBytes = new TextEncoder().encode(jsonData).length;

    if (sizeInBytes > config.maxSize) {
      throw new Error(
        `HCS message size (${sizeInBytes} bytes) exceeds limit (${config.maxSize} bytes). ` +
          'Consider reducing event data or splitting into multiple messages.'
      );
    }

    return {
      data: jsonData,
      size: sizeInBytes,
      compressed: false, // Future feature
      timestamp: new Date(),
    };
  }

  /**
   * Deserialize HCS message from JSON string
   */
  async deserialize(data: string): Promise<HCSMessage> {
    try {
      const parsed = JSON.parse(data);

      // Validate message structure
      this.validateHCSMessage(parsed);

      // Convert ISO strings back to Date objects
      const message = this.postprocessAfterDeserialization(parsed);

      return message;
    } catch (error) {
      throw new Error(
        `Failed to deserialize HCS message: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validate HCS message integrity and signature
   */
  async validateMessage(
    message: HCSMessage,
    expectedSignature?: string
  ): Promise<boolean> {
    try {
      // Validate message structure
      this.validateHCSMessage(message);

      // Validate signature if provided
      if (expectedSignature && message.signature !== expectedSignature) {
        return false;
      }

      // Validate timestamp (not too old, not in future)
      const messageTime = new Date(message.timestamp);
      const now = new Date();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      const maxFuture = 5 * 60 * 1000; // 5 minutes

      if (now.getTime() - messageTime.getTime() > maxAge) {
        throw new Error('Message is too old');
      }

      if (messageTime.getTime() - now.getTime() > maxFuture) {
        throw new Error('Message timestamp is too far in the future');
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract signature payload from HCS message for verification
   */
  getSignaturePayload(message: HCSMessage): string {
    // Create a copy without the signature field for verification
    const { signature, ...messageWithoutSignature } = message;
    return JSON.stringify(messageWithoutSignature);
  }

  /**
   * Preprocess message for JSON serialization
   */
  private preprocessForSerialization(message: HCSMessage): any {
    return JSON.parse(
      JSON.stringify(message, (_key, value) => {
        // Convert Date objects to ISO strings
        if (value instanceof Date) {
          return value.toISOString();
        }

        // Convert BigInt to string (for HTS amounts)
        if (typeof value === 'bigint') {
          return value.toString();
        }

        return value;
      })
    );
  }

  /**
   * Postprocess message after JSON deserialization
   */
  private postprocessAfterDeserialization(parsed: any): HCSMessage {
    return JSON.parse(JSON.stringify(parsed), (key, value) => {
      // Convert ISO date strings back to Date objects
      if (
        typeof value === 'string' &&
        (key.endsWith('At') || key === 'timestamp')
      ) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }

      return value;
    });
  }

  /**
   * Validate HCS message structure
   */
  private validateHCSMessage(message: any): void {
    if (!message || typeof message !== 'object') {
      throw new Error('Invalid message: must be an object');
    }

    if (message.version !== '1.0') {
      throw new Error(`Unsupported message version: ${message.version}`);
    }

    if (
      !['product_event', 'compliance_check', 'reward_distribution'].includes(
        message.messageType
      )
    ) {
      throw new Error(`Invalid message type: ${message.messageType}`);
    }

    if (!message.productId || typeof message.productId !== 'string') {
      throw new Error('Invalid productId: must be a non-empty string');
    }

    if (!message.event) {
      throw new Error('Missing event data');
    }

    if (!message.signature || typeof message.signature !== 'string') {
      throw new Error('Invalid signature: must be a non-empty string');
    }

    if (!message.timestamp) {
      throw new Error('Missing timestamp');
    }

    if (!message.metadata || typeof message.metadata !== 'object') {
      throw new Error('Invalid metadata: must be an object');
    }

    const metadata = message.metadata;
    if (!['testnet', 'mainnet'].includes(metadata.networkType)) {
      throw new Error(`Invalid network type: ${metadata.networkType}`);
    }

    if (!metadata.topicId || typeof metadata.topicId !== 'string') {
      throw new Error('Invalid topicId: must be a non-empty string');
    }

    if (
      typeof metadata.sequenceNumber !== 'number' ||
      metadata.sequenceNumber < 0
    ) {
      throw new Error('Invalid sequenceNumber: must be a non-negative number');
    }
  }
}

/**
 * Default HCS message serializer instance
 */
export const hcsSerializer = new HCSMessageSerializer();
