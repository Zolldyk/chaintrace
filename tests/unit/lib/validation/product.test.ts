/**
 * Unit tests for product validation schemas
 *
 * @since 1.4.0
 */

import { describe, it, expect } from 'vitest';
import {
  ProductIdSchema,
  HederaAccountIdSchema,
  LocationSchema,
  ActorSchema,
  ProductEventSchema,
  ProductSchema,
  HCSMessageSchema,
} from '../../../../src/lib/validation/product';

describe('ProductIdSchema', () => {
  it('should validate correct product ID format', () => {
    const validIds = ['CT-2024-001-A3B7F2', 'CT-2023-999-FEDCBA'];

    validIds.forEach(id => {
      expect(() => ProductIdSchema.parse(id)).not.toThrow();
    });
  });

  it('should reject invalid product ID format', () => {
    const invalidIds = [
      'XX-2024-001-A3B7F2', // Wrong prefix
      'CT-24-001-A3B7F2', // Wrong year format
      'CT-2024-1-A3B7F2', // Wrong sequence format
      'CT-2024-001-A3B7', // Too short random
      'invalid', // Completely wrong
    ];

    invalidIds.forEach(id => {
      expect(() => ProductIdSchema.parse(id)).toThrow();
    });
  });
});

describe('HederaAccountIdSchema', () => {
  it('should validate correct Hedera account ID format', () => {
    const validIds = ['0.0.12345', '0.0.1', '0.0.987654321'];

    validIds.forEach(id => {
      expect(() => HederaAccountIdSchema.parse(id)).not.toThrow();
    });
  });

  it('should reject invalid Hedera account ID format', () => {
    const invalidIds = [
      '1.0.12345', // Wrong shard
      '0.1.12345', // Wrong realm
      '0.0.abc', // Non-numeric account
      'invalid', // Completely wrong
    ];

    invalidIds.forEach(id => {
      expect(() => HederaAccountIdSchema.parse(id)).toThrow();
    });
  });
});

describe('LocationSchema', () => {
  it('should validate complete location data', () => {
    const validLocation = {
      address: '123 Test Street',
      city: 'Lagos',
      state: 'Lagos',
      country: 'Nigeria',
      coordinates: {
        latitude: 6.5244,
        longitude: 3.3792,
      },
      region: 'Southwest',
    };

    expect(() => LocationSchema.parse(validLocation)).not.toThrow();
  });

  it('should require Nigeria as country', () => {
    const invalidLocation = {
      address: '123 Test Street',
      city: 'Lagos',
      state: 'Lagos',
      country: 'Ghana', // Wrong country
      coordinates: {
        latitude: 6.5244,
        longitude: 3.3792,
      },
      region: 'Southwest',
    };

    expect(() => LocationSchema.parse(invalidLocation)).toThrow();
  });

  it('should validate coordinate ranges', () => {
    const invalidCoordinates = {
      address: '123 Test Street',
      city: 'Lagos',
      state: 'Lagos',
      country: 'Nigeria',
      coordinates: {
        latitude: 91, // Out of range
        longitude: 3.3792,
      },
      region: 'Southwest',
    };

    expect(() => LocationSchema.parse(invalidCoordinates)).toThrow();
  });
});

describe('ActorSchema', () => {
  it('should validate complete actor data', () => {
    const validActor = {
      walletAddress: '0.0.12345',
      role: 'producer' as const,
      name: 'Test Actor',
      contactInfo: {
        email: 'test@example.com',
        phone: '+234-123-456-7890',
      },
    };

    expect(() => ActorSchema.parse(validActor)).not.toThrow();
  });

  it('should require valid role', () => {
    const invalidActor = {
      walletAddress: '0.0.12345',
      role: 'invalid_role',
      name: 'Test Actor',
    };

    expect(() => ActorSchema.parse(invalidActor)).toThrow();
  });

  it('should validate optional contact info', () => {
    const actorMinimal = {
      walletAddress: '0.0.12345',
      role: 'producer' as const,
      name: 'Test Actor',
    };

    expect(() => ActorSchema.parse(actorMinimal)).not.toThrow();
  });
});

describe('ProductEventSchema', () => {
  it('should validate complete product event', () => {
    const validEvent = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      productId: 'CT-2024-001-A3B7F2',
      eventType: 'verified' as const,
      actor: {
        walletAddress: '0.0.12345',
        role: 'verifier' as const,
        name: 'Test Verifier',
      },
      timestamp: new Date(),
      location: {
        address: '123 Test Street',
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria',
        coordinates: { latitude: 6.5244, longitude: 3.3792 },
        region: 'Southwest',
      },
      data: { quality: 'A+' },
      hcsMessageId: 'test-message-id',
      signature: 'test-signature',
    };

    expect(() => ProductEventSchema.parse(validEvent)).not.toThrow();
  });

  it('should require valid event type', () => {
    const invalidEvent = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      productId: 'CT-2024-001-A3B7F2',
      eventType: 'invalid_type',
      actor: {
        walletAddress: '0.0.12345',
        role: 'verifier' as const,
        name: 'Test Verifier',
      },
      timestamp: new Date(),
      location: {
        address: '123 Test Street',
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria',
        coordinates: { latitude: 6.5244, longitude: 3.3792 },
        region: 'Southwest',
      },
      data: {},
      hcsMessageId: 'test-message-id',
      signature: 'test-signature',
    };

    expect(() => ProductEventSchema.parse(invalidEvent)).toThrow();
  });
});

describe('ProductSchema', () => {
  it('should validate complete product data', () => {
    const validProduct = {
      id: 'CT-2024-001-A3B7F2',
      batchId: 'BATCH-001',
      name: 'Organic Tomatoes',
      category: 'agricultural' as const,
      status: 'verified' as const,
      origin: {
        address: '123 Farm Road',
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria',
        coordinates: { latitude: 6.5244, longitude: 3.3792 },
        region: 'Southwest',
      },
      quantity: {
        amount: 100,
        unit: 'kg' as const,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      qrCode: 'qr-code-data',
      guardianCredentialId: null,
      hcsTopicId: '0.0.67890',
      metadata: { organic: true },
    };

    expect(() => ProductSchema.parse(validProduct)).not.toThrow();
  });

  it('should require positive quantity', () => {
    const invalidProduct = {
      id: 'CT-2024-001-A3B7F2',
      batchId: 'BATCH-001',
      name: 'Organic Tomatoes',
      category: 'agricultural' as const,
      status: 'verified' as const,
      origin: {
        address: '123 Farm Road',
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria',
        coordinates: { latitude: 6.5244, longitude: 3.3792 },
        region: 'Southwest',
      },
      quantity: {
        amount: -10, // Invalid negative amount
        unit: 'kg' as const,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      qrCode: 'qr-code-data',
      guardianCredentialId: null,
      hcsTopicId: '0.0.67890',
    };

    expect(() => ProductSchema.parse(invalidProduct)).toThrow();
  });
});

describe('HCSMessageSchema', () => {
  it('should validate complete HCS message', () => {
    const validMessage = {
      version: '1.0' as const,
      messageType: 'product_event' as const,
      productId: 'CT-2024-001-A3B7F2',
      event: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        productId: 'CT-2024-001-A3B7F2',
        eventType: 'verified' as const,
        actor: {
          walletAddress: '0.0.12345',
          role: 'verifier' as const,
          name: 'Test Verifier',
        },
        timestamp: new Date(),
        location: {
          address: '123 Test Street',
          city: 'Lagos',
          state: 'Lagos',
          country: 'Nigeria',
          coordinates: { latitude: 6.5244, longitude: 3.3792 },
          region: 'Southwest',
        },
        data: {},
        hcsMessageId: 'test-message-id',
        signature: 'test-signature',
      },
      signature: 'message-signature',
      timestamp: new Date().toISOString(),
      metadata: {
        networkType: 'testnet' as const,
        topicId: '0.0.67890',
        sequenceNumber: 1,
      },
    };

    expect(() => HCSMessageSchema.parse(validMessage)).not.toThrow();
  });

  it('should require valid version', () => {
    const invalidMessage = {
      version: '2.0', // Invalid version
      messageType: 'product_event' as const,
      productId: 'CT-2024-001-A3B7F2',
      event: {},
      signature: 'test-signature',
      timestamp: new Date().toISOString(),
      metadata: {
        networkType: 'testnet' as const,
        topicId: '0.0.67890',
        sequenceNumber: 1,
      },
    };

    expect(() => HCSMessageSchema.parse(invalidMessage)).toThrow();
  });
});
