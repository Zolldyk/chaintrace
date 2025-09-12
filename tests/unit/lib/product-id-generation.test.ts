/**
 * Unit tests for secure product ID generation utilities
 *
 * @since 2.4.0
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import {
  generateSecureProductId,
  validateProductId,
  generateProductIdBatch,
  clearGeneratedIdCache,
  getGenerationStats,
  ProductIdError,
  type ProductIdOptions,
  type ProductIdResult,
} from '../../../src/lib/product-id-generation';

describe('Product ID Generation', () => {
  beforeEach(() => {
    clearGeneratedIdCache();
  });

  describe('generateSecureProductId', () => {
    test('should generate valid product ID with default options', () => {
      const result = generateSecureProductId();

      expect(result).toMatchObject({
        id: expect.stringMatching(/^CT-\d{4}-\d{3}-[A-F0-9]{6}$/),
        timestamp: expect.any(Date),
        entropy: {
          randomBytes: expect.stringMatching(/^[a-f0-9]{8}$/),
          uuid: expect.stringMatching(/^[a-f0-9-]{36}$/),
          hash: expect.stringMatching(/^[a-f0-9]{16}$/),
        },
        isValid: true,
      });
    });

    test('should generate ID with current year by default', () => {
      const result = generateSecureProductId();
      const currentYear = new Date().getFullYear();

      expect(result.id).toMatch(
        new RegExp(`^CT-${currentYear}-\\d{3}-[A-F0-9]{6}$`)
      );
    });

    test('should generate ID with custom year', () => {
      const customYear = 2025;
      const result = generateSecureProductId({ year: customYear });

      expect(result.id).toMatch(
        new RegExp(`^CT-${customYear}-\\d{3}-[A-F0-9]{6}$`)
      );
    });

    test('should include cooperative ID in entropy when provided', () => {
      const cooperativeId = 'coop-test-123';
      const result1 = generateSecureProductId({ cooperativeId });
      const result2 = generateSecureProductId({ cooperativeId });

      // Results should be different even with same cooperative ID
      expect(result1.id).not.toBe(result2.id);
      // But both should be valid
      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
    });

    test('should generate different IDs on multiple calls', () => {
      const result1 = generateSecureProductId();
      const result2 = generateSecureProductId();

      expect(result1.id).not.toBe(result2.id);
      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
    });

    test('should throw error for invalid year', () => {
      expect(() => generateSecureProductId({ year: 2019 })).toThrow(
        ProductIdError
      );
      expect(() => generateSecureProductId({ year: 2030 })).toThrow(
        ProductIdError
      );
    });

    test('should validate generated IDs against schema', () => {
      // Generate multiple IDs to test consistency
      for (let i = 0; i < 10; i++) {
        const result = generateSecureProductId();
        expect(result.isValid).toBe(true);

        // Double-check with validation function
        const validation = validateProductId(result.id);
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      }
    });

    test('should use salt for additional entropy', () => {
      const salt = 'test-salt-value';
      const result1 = generateSecureProductId({ salt });
      const result2 = generateSecureProductId({ salt });

      // Results should still be different even with same salt
      expect(result1.id).not.toBe(result2.id);
      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
    });

    test('should record generated IDs for collision detection', () => {
      const result = generateSecureProductId();
      const stats = getGenerationStats();

      expect(stats.totalGenerated).toBe(1);
      expect(stats.cacheSize).toBe(1);
      expect(stats.newestEntry).toEqual(result.timestamp);
    });
  });

  describe('validateProductId', () => {
    test('should validate correct product ID format', () => {
      const validIds = [
        'CT-2024-123-ABC123',
        'CT-2023-000-000000',
        'CT-2025-999-FFFFFF',
      ];

      validIds.forEach(id => {
        const result = validateProductId(id);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.metadata).toBeDefined();
      });
    });

    test('should extract metadata from valid IDs', () => {
      const id = 'CT-2024-456-DEF789';
      const result = validateProductId(id);

      expect(result.metadata).toEqual({
        year: 2024,
        sequence: '456',
        hexSuffix: 'DEF789',
      });
    });

    test('should reject invalid formats', () => {
      const invalidIds = [
        'INVALID-ID',
        'CT-24-123-ABC123', // Wrong year format
        'CT-2024-12-ABC123', // Wrong sequence format
        'CT-2024-123-abc123', // Lowercase hex
        'CT-2024-123-ABC12', // Wrong hex length
        'CT-2024-1234-ABC123', // Wrong sequence length
        '',
      ];

      invalidIds.forEach(id => {
        const result = validateProductId(id);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    test('should validate year constraints', () => {
      const currentYear = new Date().getFullYear();
      const validId = `CT-${currentYear}-123-ABC123`;
      const oldId = 'CT-2019-123-ABC123'; // Too old
      const futureId = 'CT-2030-123-ABC123'; // Too far in future

      expect(validateProductId(validId).isValid).toBe(true);
      expect(validateProductId(oldId).isValid).toBe(false);
      expect(validateProductId(futureId).isValid).toBe(false);
    });

    test('should handle edge cases gracefully', () => {
      const edgeCases = [null, undefined, {}, [], 123];

      edgeCases.forEach(testCase => {
        const result = validateProductId(testCase as any);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('generateProductIdBatch', () => {
    test('should generate specified number of unique IDs', () => {
      const count = 5;
      const results = generateProductIdBatch(count);

      expect(results).toHaveLength(count);

      // All should be valid
      results.forEach(result => {
        expect(result.isValid).toBe(true);
      });

      // All should be unique
      const ids = results.map(r => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(count);
    });

    test('should apply options to all generated IDs', () => {
      const options: ProductIdOptions = { year: 2025 };
      const results = generateProductIdBatch(3, options);

      results.forEach(result => {
        expect(result.id).toMatch(/^CT-2025-\d{3}-[A-F0-9]{6}$/);
        expect(result.isValid).toBe(true);
      });
    });

    test('should reject invalid batch counts', () => {
      expect(() => generateProductIdBatch(0)).toThrow(ProductIdError);
      expect(() => generateProductIdBatch(-1)).toThrow(ProductIdError);
      expect(() => generateProductIdBatch(101)).toThrow(ProductIdError);
    });

    test('should handle batch generation edge cases', () => {
      // Single ID batch
      const singleResult = generateProductIdBatch(1);
      expect(singleResult).toHaveLength(1);
      expect(singleResult[0].isValid).toBe(true);

      // Maximum allowed batch
      const maxResults = generateProductIdBatch(100);
      expect(maxResults).toHaveLength(100);

      // All should be unique
      const ids = maxResults.map(r => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(100);
    });

    test('should update generation stats correctly', () => {
      const count = 3;
      generateProductIdBatch(count);

      const stats = getGenerationStats();
      expect(stats.totalGenerated).toBe(count);
      expect(stats.cacheSize).toBe(count);
      expect(stats.oldestEntry).toBeDefined();
      expect(stats.newestEntry).toBeDefined();
    });
  });

  describe('collision detection', () => {
    test('should track generated IDs', () => {
      expect(getGenerationStats().totalGenerated).toBe(0);

      generateSecureProductId();
      expect(getGenerationStats().totalGenerated).toBe(1);

      generateSecureProductId();
      expect(getGenerationStats().totalGenerated).toBe(2);
    });

    test('should clear cache when requested', () => {
      generateProductIdBatch(5);
      expect(getGenerationStats().totalGenerated).toBe(5);

      clearGeneratedIdCache();
      expect(getGenerationStats().totalGenerated).toBe(0);
    });

    test('should provide accurate generation statistics', () => {
      const initialStats = getGenerationStats();
      expect(initialStats).toEqual({
        totalGenerated: 0,
        oldestEntry: null,
        newestEntry: null,
        cacheSize: 0,
      });

      const result1 = generateSecureProductId();
      const midStats = getGenerationStats();
      expect(midStats.totalGenerated).toBe(1);
      expect(midStats.oldestEntry).toEqual(result1.timestamp);
      expect(midStats.newestEntry).toEqual(result1.timestamp);

      const result2 = generateSecureProductId();
      const finalStats = getGenerationStats();
      expect(finalStats.totalGenerated).toBe(2);
      expect(finalStats.oldestEntry).toEqual(result1.timestamp);
      expect(finalStats.newestEntry).toEqual(result2.timestamp);
    });
  });

  describe('error handling', () => {
    test('should throw ProductIdError with appropriate codes', () => {
      // Invalid year error
      try {
        generateSecureProductId({ year: 2019 });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(ProductIdError);
        expect((error as ProductIdError).code).toBe('INVALID_YEAR');
        expect((error as ProductIdError).details).toBeDefined();
      }
    });

    test('should include helpful error details', () => {
      try {
        generateSecureProductId({ year: 2050 });
        expect.fail('Should have thrown error');
      } catch (error) {
        const productIdError = error as ProductIdError;
        expect(productIdError.details).toMatchObject({
          providedYear: 2050,
          validRange: expect.any(Array),
        });
      }
    });

    test('should validate error properties', () => {
      const error = new ProductIdError('COLLISION_DETECTED', 'Test collision', {
        id: 'test',
      });

      expect(error.name).toBe('ProductIdError');
      expect(error.code).toBe('COLLISION_DETECTED');
      expect(error.message).toBe('Test collision');
      expect(error.details).toEqual({ id: 'test' });
    });
  });

  describe('security properties', () => {
    test('should generate cryptographically strong IDs', () => {
      const results = generateProductIdBatch(20);
      const sequences = results.map(r => r.id.split('-')[2]);
      const hexSuffixes = results.map(r => r.id.split('-')[3]);

      // Sequences should have good distribution
      const uniqueSequences = new Set(sequences);
      expect(uniqueSequences.size).toBeGreaterThan(15); // Expect high uniqueness

      // Hex suffixes should be completely unique
      const uniqueHex = new Set(hexSuffixes);
      expect(uniqueHex.size).toBe(20);
    });

    test('should include proper entropy metadata', () => {
      const result = generateSecureProductId();

      expect(result.entropy.randomBytes).toMatch(/^[a-f0-9]{8}$/);
      expect(result.entropy.uuid).toMatch(
        /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/
      );
      expect(result.entropy.hash).toMatch(/^[a-f0-9]{16}$/);
    });

    test('should produce unpredictable sequences', () => {
      // Generate many IDs and check for patterns
      const results = generateProductIdBatch(50);
      const sequences = results.map(r => parseInt(r.id.split('-')[2], 10));

      // Check that we don't have obvious patterns (like sequential)
      let sequential = 0;
      for (let i = 1; i < sequences.length; i++) {
        if (sequences[i] === sequences[i - 1] + 1) {
          sequential++;
        }
      }

      // Should have very few sequential numbers by chance
      expect(sequential).toBeLessThan(5);
    });
  });

  describe('performance', () => {
    test('should generate IDs within reasonable time', () => {
      const start = Date.now();
      generateProductIdBatch(100);
      const end = Date.now();

      // Should complete in under 1 second
      expect(end - start).toBeLessThan(1000);
    });

    test('should handle concurrent generation', async () => {
      const promises = Array.from({ length: 10 }, () =>
        Promise.resolve(generateSecureProductId())
      );

      const results = await Promise.all(promises);

      // All should be unique
      const ids = results.map(r => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);

      // All should be valid
      results.forEach(result => {
        expect(result.isValid).toBe(true);
      });
    });
  });
});
