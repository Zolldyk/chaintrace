/**
 * Message serialization utilities for HCS event logging
 * Handles JSON serialization/deserialization with size validation
 *
 * @since 2.3.0
 */

import { HCSEventMessage } from '@/types/hedera';
import { HCSEventMessageSchema } from '@/lib/validation/product';
import { ChainTraceError } from '@/lib/errors';

/**
 * Maximum message size for HCS (1024 bytes)
 */
export const HCS_MAX_MESSAGE_SIZE = 1024;

/**
 * Message serialization utilities for HCS event logging
 *
 * @class MessageSerializer
 * @since 2.3.0
 *
 * @example
 * ```typescript
 * const serializer = new MessageSerializer();
 *
 * // Serialize event message
 * const serialized = await serializer.serialize(eventMessage);
 * console.log(`Message size: ${serialized.sizeBytes} bytes`);
 *
 * // Deserialize message
 * const deserialized = await serializer.deserialize(serialized.data);
 * ```
 */
export class MessageSerializer {
  /**
   * Serializes an HCS event message to JSON string with size validation
   *
   * @param message - HCS event message to serialize
   * @returns Promise resolving to serialized message data
   *
   * @throws {ApiError} When message exceeds HCS size limit
   * @throws {ApiError} When message validation fails
   *
   * @example
   * ```typescript
   * const message: HCSEventMessage = {
   *   version: '2.3.0',
   *   productId: 'CT-2024-001-ABC123',
   *   eventType: 'created',
   *   timestamp: new Date().toISOString(),
   *   actor: {
   *     walletAddress: '0.0.67890',
   *     role: 'Producer'
   *   },
   *   location: {
   *     coordinates: { latitude: 6.5244, longitude: 3.3792 },
   *     address: '123 Farm Road, Lagos',
   *     region: 'Southwest Nigeria'
   *   },
   *   eventData: { batchId: 'BATCH-001' },
   *   signature: 'signed_hash'
   * };
   *
   * const result = await serializer.serialize(message);
   * ```
   *
   * @since 2.3.0
   */
  async serialize(message: HCSEventMessage): Promise<SerializationResult> {
    try {
      // Validate message structure first
      const validated = HCSEventMessageSchema.parse(message);

      // Serialize to compact JSON
      const serialized = JSON.stringify(validated, null, 0);
      const sizeBytes = new TextEncoder().encode(serialized).length;

      // Check HCS size limit
      if (sizeBytes > HCS_MAX_MESSAGE_SIZE) {
        throw new ChainTraceError(
          `Message size ${sizeBytes} bytes exceeds HCS limit of ${HCS_MAX_MESSAGE_SIZE} bytes`,
          'HCS_MESSAGE_TOO_LARGE',
          {
            statusCode: 400,
            retryable: false,
            context: 'message_serialization',
          }
        );
      }

      return {
        data: serialized,
        sizeBytes,
        isValid: true,
        metadata: {
          serializedAt: new Date(),
          version: validated.version,
          productId: validated.productId,
          eventType: validated.eventType,
        },
      };
    } catch (error) {
      if (error instanceof ChainTraceError) {
        throw error;
      }

      throw new ChainTraceError(
        `Message serialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'HCS_SERIALIZATION_ERROR',
        {
          statusCode: 400,
          retryable: false,
          context: 'message_serialization',
        }
      );
    }
  }

  /**
   * Deserializes an HCS event message from JSON string with validation
   *
   * @param serialized - JSON string to deserialize
   * @returns Promise resolving to validated HCS event message
   *
   * @throws {ApiError} When deserialization fails
   * @throws {ApiError} When message validation fails
   *
   * @example
   * ```typescript
   * const jsonString = '{"version":"2.3.0","productId":"CT-2024-001-ABC123",...}';
   * const message = await serializer.deserialize(jsonString);
   * console.log(message.eventType); // 'created'
   * ```
   *
   * @since 2.3.0
   */
  async deserialize(serialized: string): Promise<HCSEventMessage> {
    try {
      // Parse JSON
      const parsed = JSON.parse(serialized);

      // Validate structure
      const validated = HCSEventMessageSchema.parse(parsed);

      return validated;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new ChainTraceError(
          'Invalid JSON format in HCS message',
          'HCS_SERIALIZATION_ERROR',
          {
            statusCode: 400,
            retryable: false,
            context: 'message_deserialization',
          }
        );
      }

      throw new ChainTraceError(
        `Message deserialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'HCS_SERIALIZATION_ERROR',
        {
          statusCode: 400,
          retryable: false,
          context: 'message_deserialization',
        }
      );
    }
  }

  /**
   * Validates message size without full serialization
   *
   * @param message - Message to check size for
   * @returns Size information and validation result
   *
   * @example
   * ```typescript
   * const sizeCheck = serializer.validateSize(message);
   * if (!sizeCheck.isValid) {
   *   console.warn(`Message too large: ${sizeCheck.sizeBytes} bytes`);
   * }
   * ```
   *
   * @since 2.3.0
   */
  validateSize(message: HCSEventMessage): SizeValidationResult {
    const serialized = JSON.stringify(message, null, 0);
    const sizeBytes = new TextEncoder().encode(serialized).length;

    return {
      sizeBytes,
      maxSizeBytes: HCS_MAX_MESSAGE_SIZE,
      isValid: sizeBytes <= HCS_MAX_MESSAGE_SIZE,
      compressionNeeded: sizeBytes > HCS_MAX_MESSAGE_SIZE,
      utilizationPercent: Math.round((sizeBytes / HCS_MAX_MESSAGE_SIZE) * 100),
    };
  }

  /**
   * Compresses message data by removing optional fields when size exceeds limit
   *
   * @param message - Message to compress
   * @returns Compressed message that fits within HCS limits
   *
   * @throws {ApiError} When message cannot be compressed enough
   *
   * @example
   * ```typescript
   * const compressed = await serializer.compress(largeMessage);
   * console.log('Compression successful:', compressed.metadata.compressionApplied);
   * ```
   *
   * @since 2.3.0
   */
  async compress(message: HCSEventMessage): Promise<{
    message: HCSEventMessage;
    metadata: {
      originalSizeBytes: number;
      compressedSizeBytes: number;
      compressionApplied: boolean;
      removedFields: string[];
    };
  }> {
    const originalSize = this.validateSize(message);

    if (originalSize.isValid) {
      return {
        message,
        metadata: {
          originalSizeBytes: originalSize.sizeBytes,
          compressedSizeBytes: originalSize.sizeBytes,
          compressionApplied: false,
          removedFields: [],
        },
      };
    }

    // Create compressed version by removing optional fields
    const compressed: HCSEventMessage = { ...message };
    const removedFields: string[] = [];

    // Remove optional organization ID
    if (compressed.actor.organizationId) {
      delete compressed.actor.organizationId;
      removedFields.push('actor.organizationId');
    }

    // Remove optional previous event ID if still too large
    const intermediateSize = this.validateSize(compressed);
    if (!intermediateSize.isValid && compressed.previousEventId) {
      delete compressed.previousEventId;
      removedFields.push('previousEventId');
    }

    // Minimize eventData by removing non-essential fields
    const finalSize = this.validateSize(compressed);
    if (!finalSize.isValid) {
      // Try to minimize eventData
      const essentialEventData: Record<string, any> = {};

      // Keep only essential fields
      if (compressed.eventData.batchId) {
        essentialEventData.batchId = compressed.eventData.batchId;
      }
      if (compressed.eventData.quantity) {
        essentialEventData.quantity = compressed.eventData.quantity;
      }
      if (compressed.eventData.category) {
        essentialEventData.category = compressed.eventData.category;
      }

      compressed.eventData = essentialEventData;
      removedFields.push('eventData.nonEssentialFields');
    }

    const compressedSize = this.validateSize(compressed);

    if (!compressedSize.isValid) {
      throw new ChainTraceError(
        `Message cannot be compressed to fit HCS size limit. Final size: ${compressedSize.sizeBytes} bytes`,
        'HCS_MESSAGE_TOO_LARGE',
        {
          statusCode: 400,
          retryable: false,
          context: 'message_compression',
        }
      );
    }

    return {
      message: compressed,
      metadata: {
        originalSizeBytes: originalSize.sizeBytes,
        compressedSizeBytes: compressedSize.sizeBytes,
        compressionApplied: true,
        removedFields,
      },
    };
  }
}

/**
 * Result of message serialization operation
 *
 * @interface SerializationResult
 * @since 2.3.0
 */
export interface SerializationResult {
  /** Serialized JSON string */
  data: string;

  /** Size in bytes */
  sizeBytes: number;

  /** Whether serialization was successful */
  isValid: boolean;

  /** Serialization metadata */
  metadata: {
    /** Serialization timestamp */
    serializedAt: Date;

    /** Message version */
    version: string;

    /** Product ID from message */
    productId: string;

    /** Event type from message */
    eventType: string;
  };
}

/**
 * Result of message size validation
 *
 * @interface SizeValidationResult
 * @since 2.3.0
 */
export interface SizeValidationResult {
  /** Actual size in bytes */
  sizeBytes: number;

  /** Maximum allowed size in bytes */
  maxSizeBytes: number;

  /** Whether size is within limits */
  isValid: boolean;

  /** Whether compression is needed */
  compressionNeeded: boolean;

  /** Size utilization as percentage */
  utilizationPercent: number;
}

/**
 * Default message serializer instance
 * Use this for most serialization operations
 *
 * @example
 * ```typescript
 * import { messageSerializer } from '@/lib/serialization';
 *
 * const result = await messageSerializer.serialize(eventMessage);
 * ```
 *
 * @since 2.3.0
 */
export const messageSerializer = new MessageSerializer();

/**
 * Utility function for quick message serialization
 *
 * @param message - HCS event message to serialize
 * @returns Promise resolving to serialized JSON string
 *
 * @throws {ApiError} When serialization fails
 *
 * @example
 * ```typescript
 * const jsonString = await serializeHCSMessage(eventMessage);
 * ```
 *
 * @since 2.3.0
 */
export async function serializeHCSMessage(
  message: HCSEventMessage
): Promise<string> {
  const result = await messageSerializer.serialize(message);
  return result.data;
}

/**
 * Utility function for quick message deserialization
 *
 * @param serialized - JSON string to deserialize
 * @returns Promise resolving to HCS event message
 *
 * @throws {ApiError} When deserialization fails
 *
 * @example
 * ```typescript
 * const message = await deserializeHCSMessage(jsonString);
 * ```
 *
 * @since 2.3.0
 */
export async function deserializeHCSMessage(
  serialized: string
): Promise<HCSEventMessage> {
  return messageSerializer.deserialize(serialized);
}
