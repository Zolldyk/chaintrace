/**
 * Integration tests for QR Code Generation and HCS Event Logging
 *
 * Tests the complete QR code workflow from generation to storage
 * and verification, including integration with HCS event logging.
 *
 * @since 2.4.0
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { generateSecureProductId } from '../../src/lib/product-id-generation';
import { generateProductQRCode } from '../../src/lib/qr-generation';
import { QRCodeStorageService } from '../../src/services/storage/QRCodeStorageService';
import type { QRCodeOptions, QRCodeResult } from '../../src/types/qr';

// Helper function for batch QR generation
async function generateQRCodeBatch(
  productIds: string[],
  options: QRCodeOptions,
  urlConfig?: { baseUrl?: string; includeSource?: boolean }
) {
  const startTime = Date.now();
  const successful: Array<{ productId: string; qrCode: QRCodeResult }> = [];
  const failed: Array<{ productId: string; error: string }> = [];
  let totalSize = 0;

  for (const productId of productIds) {
    try {
      const qrCode = await generateProductQRCode(productId, options, urlConfig);
      successful.push({ productId, qrCode });
      totalSize += qrCode.size;
    } catch (error) {
      failed.push({
        productId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return {
    successful,
    failed,
    metadata: {
      processingTime: Date.now() - startTime,
      totalSize,
      successCount: successful.length,
      failureCount: failed.length,
    },
  };
}

describe('QR Code Integration Workflow', () => {
  let storageService: QRCodeStorageService;

  beforeAll(async () => {
    // Initialize storage service with test configuration
    storageService = new QRCodeStorageService({
      provider: 'local',
      options: {
        enableLocalBackup: true,
        maxFileSize: 10 * 1024 * 1024, // 10MB for tests
      },
    });
  });

  afterAll(async () => {
    // Cleanup any test resources
  });

  describe('Complete Product QR Workflow', () => {
    test('generates product ID, creates QR code, and stores it', async () => {
      // Step 1: Generate secure product ID
      const productIdResult = generateSecureProductId();
      const productId = productIdResult.id;

      expect(typeof productId).toBe('string');
      expect(productId).toMatch(/^CT-\d{4}-\d{3}-[A-F0-9]{6}$/);
      expect(productIdResult.isValid).toBe(true);

      // Step 2: Generate QR code
      const qrOptions: QRCodeOptions = {
        format: 'png',
        size: 256,
        errorCorrectionLevel: 'M',
        margin: 4,
        includeMetadata: true,
      };

      const qrResult = await generateProductQRCode(productId, qrOptions, {
        baseUrl: 'https://chaintrace.app',
        includeSource: true,
        includeTimestamp: true,
      });

      expect(qrResult.data).toBeDefined();
      expect(qrResult.format).toBe('png');
      expect(qrResult.encodedData).toContain(productId);
      expect(qrResult.encodedData).toContain('chaintrace.app/verify');
      expect(qrResult.metadata.errorLevel).toBe('M');

      // Step 3: Store QR code
      const storageResult = await storageService.storeQRCode(
        qrResult,
        productId
      );

      expect(storageResult.storage.provider).toBe('local');
      expect(storageResult.storage.key).toContain(productId);
      expect(storageResult.metadata.storageSize).toBeGreaterThan(0);
      expect(storageResult.backupCreated).toBe(true);

      // Step 4: Verify storage integrity
      expect(storageResult.storage.url).toContain('file://');
      expect(storageResult.storage.uploadedAt).toBeInstanceOf(Date);
    }, 30000); // 30 second timeout for integration test

    test('handles batch QR generation and storage', async () => {
      // Generate multiple product IDs
      const productIds = [];
      for (let i = 0; i < 5; i++) {
        const productIdResult = generateSecureProductId();
        const productId = productIdResult.id;
        expect(typeof productId).toBe('string');
        expect(productId).toMatch(/^CT-\d{4}-\d{3}-[A-F0-9]{6}$/);
        expect(productIdResult.isValid).toBe(true);
        productIds.push(productId);
      }

      // Batch generate QR codes
      const qrOptions: QRCodeOptions = {
        format: 'png',
        size: 128, // Smaller for batch processing
        errorCorrectionLevel: 'L',
        margin: 2,
      };

      const batchResult = await generateQRCodeBatch(productIds, qrOptions, {
        baseUrl: 'https://chaintrace.app',
        includeSource: true,
      });

      expect(batchResult.successful).toHaveLength(5);
      expect(batchResult.failed).toHaveLength(0);
      expect(batchResult.metadata.processingTime).toBeGreaterThan(0);
      expect(batchResult.metadata.totalSize).toBeGreaterThan(0);

      // Batch store QR codes
      const qrCodesForStorage = batchResult.successful.map((result, index) => ({
        qrCode: result.qrCode,
        productId: productIds[index],
      }));

      const storageResults =
        await storageService.storeQRCodeBatch(qrCodesForStorage);

      expect(storageResults.batchMetadata.successCount).toBe(5);
      expect(storageResults.batchMetadata.failureCount).toBe(0);
      expect(storageResults.stored).toHaveLength(5);
      expect(storageResults.failed).toHaveLength(0);

      // Verify all stored properly
      storageResults.stored.forEach(stored => {
        expect(stored.storage.provider).toBe('local');
        expect(stored.storage.url).toContain('file://');
        expect(stored.productId).toMatch(/^CT-\d{4}-\d{3}-[A-F0-9]{6}$/);
      });
    }, 45000); // 45 second timeout for batch processing

    test('handles different QR code formats consistently', async () => {
      const productId = generateSecureProductId().id;
      const formats: Array<'png' | 'svg' | 'jpeg' | 'webp'> = [
        'png',
        'svg',
        'jpeg',
        'webp',
      ];
      const results: QRCodeResult[] = [];

      // Generate QR codes in all supported formats
      for (const format of formats) {
        const qrOptions: QRCodeOptions = {
          format,
          size: 256,
          errorCorrectionLevel: 'M',
          margin: 4,
        };

        const qrResult = await generateProductQRCode(productId, qrOptions);

        expect(qrResult.format).toBe(format);
        expect(qrResult.encodedData).toContain(productId);
        expect(qrResult.dimensions.width).toBe(256);
        expect(qrResult.dimensions.height).toBe(256);

        results.push(qrResult);
      }

      // Store all formats
      const storagePromises = results.map(qrResult =>
        storageService.storeQRCode(qrResult, productId)
      );

      const storageResults = await Promise.all(storagePromises);

      storageResults.forEach((result, index) => {
        expect(result.storage.provider).toBe('local');
        expect(result.storage.key).toContain(`.${formats[index]}`);
        expect(result.metadata.storageSize).toBeGreaterThan(0);
      });
    }, 30000);
  });

  describe('Error Handling and Recovery', () => {
    test('handles invalid product IDs gracefully', async () => {
      const qrOptions: QRCodeOptions = {
        format: 'png',
        size: 256,
        errorCorrectionLevel: 'M',
      };

      const validQRCode = await generateProductQRCode(
        'CT-2024-123-ABC123',
        qrOptions
      );

      // Try to store with invalid product ID
      await expect(
        storageService.storeQRCode(validQRCode, 'INVALID-ID')
      ).rejects.toThrow('Invalid product ID format');
    });

    test('handles storage failures and provides fallbacks', async () => {
      const productId = generateSecureProductId().id;

      // Generate QR code
      const qrResult = await generateProductQRCode(productId, {
        format: 'png',
        size: 256,
        errorCorrectionLevel: 'M',
      });

      // Create storage service with very small file limit to trigger failure
      const limitedStorageService = new QRCodeStorageService({
        provider: 'local',
        options: {
          maxFileSize: 1, // 1 byte - will definitely fail
          enableLocalBackup: false,
        },
      });

      await expect(
        limitedStorageService.storeQRCode(qrResult, productId)
      ).rejects.toThrow('exceeds maximum allowed size');
    });

    test('validates QR code data integrity', async () => {
      const productId = generateSecureProductId().id;

      // Create QR code with invalid data
      const invalidQRCode: QRCodeResult = {
        data: 'invalid-data-format',
        format: 'png',
        dimensions: { width: 256, height: 256 },
        timestamp: new Date(),
        size: 100,
        mimeType: 'image/png',
        encodedData: `https://chaintrace.app/verify/${productId}`,
        metadata: {
          errorLevel: 'M',
          version: 5,
          mode: 'alphanumeric',
        },
      };

      await expect(
        storageService.storeQRCode(invalidQRCode, '')
      ).rejects.toThrow('Product ID is required');
    });
  });

  describe('Performance and Scalability', () => {
    test('handles large batch operations efficiently', async () => {
      // Generate 25 product IDs for a larger batch
      const productIds = [];
      for (let i = 0; i < 25; i++) {
        const productId = generateSecureProductId().id;
        productIds.push(productId);
      }

      const startTime = Date.now();

      // Batch generate with smaller QR codes for performance
      const batchResult = await generateQRCodeBatch(productIds, {
        format: 'png',
        size: 64, // Very small for performance testing
        errorCorrectionLevel: 'L',
        margin: 1,
      });

      const generationTime = Date.now() - startTime;

      expect(batchResult.successful).toHaveLength(25);
      expect(batchResult.failed).toHaveLength(0);
      expect(generationTime).toBeLessThan(15000); // Should complete within 15 seconds

      // Test concurrent storage with limited concurrency
      const qrCodesForStorage = batchResult.successful.map((result, index) => ({
        qrCode: result.qrCode,
        productId: productIds[index],
      }));

      const storageStartTime = Date.now();

      const storageResults = await storageService.storeQRCodeBatch(
        qrCodesForStorage,
        { concurrency: 5 } // Limit concurrency for testing
      );

      const storageTime = Date.now() - storageStartTime;

      expect(storageResults.batchMetadata.successCount).toBe(25);
      expect(storageResults.batchMetadata.failureCount).toBe(0);
      expect(storageTime).toBeLessThan(20000); // Should complete within 20 seconds

      // Verify processing time was tracked
      expect(storageResults.batchMetadata.processingTime).toBeGreaterThan(0);
      expect(storageResults.batchMetadata.processingTime).toBeLessThan(
        storageTime + 1000
      );
    }, 60000); // 60 second timeout for performance test

    test('maintains consistent QR code quality across batch sizes', async () => {
      const smallBatch = Array.from(
        { length: 3 },
        () => generateSecureProductId().id
      );
      const largeBatch = Array.from(
        { length: 15 },
        () => generateSecureProductId().id
      );

      const qrOptions: QRCodeOptions = {
        format: 'png',
        size: 128,
        errorCorrectionLevel: 'M',
        margin: 3,
      };

      // Generate small batch
      const smallResult = await generateQRCodeBatch(smallBatch, qrOptions);

      // Generate large batch
      const largeResult = await generateQRCodeBatch(largeBatch, qrOptions);

      // Verify quality consistency
      const smallAvgSize =
        smallResult.metadata.totalSize / smallResult.successful.length;
      const largeAvgSize =
        largeResult.metadata.totalSize / largeResult.successful.length;

      // Average sizes should be similar (within 10% tolerance)
      const sizeDifference =
        Math.abs(smallAvgSize - largeAvgSize) /
        Math.max(smallAvgSize, largeAvgSize);
      expect(sizeDifference).toBeLessThan(0.1);

      // All QR codes should have same dimensions and format
      [...smallResult.successful, ...largeResult.successful].forEach(result => {
        expect(result.qrCode.dimensions.width).toBe(128);
        expect(result.qrCode.dimensions.height).toBe(128);
        expect(result.qrCode.format).toBe('png');
        expect(result.qrCode.metadata.errorLevel).toBe('M');
      });
    }, 30000);
  });

  describe('Data Integrity and Validation', () => {
    test('ensures QR codes contain correct product verification URLs', async () => {
      const productId = generateSecureProductId().id;

      const qrResult = await generateProductQRCode(
        productId,
        { format: 'png', size: 256 },
        {
          baseUrl: 'https://test.chaintrace.app',
          includeTracking: false,
          customParams: { source: 'qr' },
        }
      );

      expect(qrResult.encodedData).toBe(
        `https://test.chaintrace.app/verify/${productId}?source=qr`
      );
      expect(qrResult.encodedData).not.toContain('timestamp=');
    });

    test('generates unique storage keys for identical products', async () => {
      const productId = generateSecureProductId().id;
      const qrOptions: QRCodeOptions = {
        format: 'png',
        size: 256,
        errorCorrectionLevel: 'M',
      };

      // Generate same QR code twice
      const qrResult1 = await generateProductQRCode(productId, qrOptions);
      const qrResult2 = await generateProductQRCode(productId, qrOptions);

      // Store both - should get different storage keys due to timestamp
      const storage1 = await storageService.storeQRCode(qrResult1, productId);

      // Wait a moment to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      const storage2 = await storageService.storeQRCode(qrResult2, productId);

      // Keys should be different due to timestamp component
      expect(storage1.storage.key).not.toBe(storage2.storage.key);
      expect(storage1.metadata.storageKey).not.toBe(
        storage2.metadata.storageKey
      );

      // But both should contain the product ID
      expect(storage1.storage.key).toContain(productId);
      expect(storage2.storage.key).toContain(productId);
    });

    test('preserves metadata consistency across the workflow', async () => {
      const productId = generateSecureProductId().id;

      const qrResult = await generateProductQRCode(productId, {
        format: 'svg',
        size: 512,
        errorCorrectionLevel: 'H',
        margin: 8,
      });

      const storageResult = await storageService.storeQRCode(
        qrResult,
        productId
      );

      // Verify QR metadata is preserved in storage
      expect(storageResult.storage.metadata?.contentType).toBe('image/svg+xml');

      // Verify QR generation metadata is consistent
      expect(qrResult.metadata.errorLevel).toBe('H');
      expect(qrResult.format).toBe('svg');
      expect(qrResult.dimensions.width).toBe(512);
      expect(qrResult.dimensions.height).toBe(512);

      // Verify storage metadata references original QR metadata
      expect(storageResult.metadata.storageSize).toBe(qrResult.data.length);
    });
  });
});
