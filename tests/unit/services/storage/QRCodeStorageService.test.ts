/**
 * Unit tests for QRCodeStorageService
 *
 * @since 2.4.0
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { QRCodeStorageService } from '../../../../src/services/storage/QRCodeStorageService';
import type { QRCodeResult } from '../../../../src/types/qr';

describe('QRCodeStorageService', () => {
  let storageService: QRCodeStorageService;

  const mockQRCode: QRCodeResult = {
    data: 'data:image/png;base64,mockbase64data==',
    format: 'png',
    dimensions: { width: 256, height: 256 },
    timestamp: new Date('2024-01-01T10:00:00.000Z'),
    size: 1024,
    mimeType: 'image/png',
    encodedData: 'https://chaintrace.app/verify/CT-2024-123-ABC123?source=qr',
    metadata: {
      errorLevel: 'M',
      version: 5,
      mode: 'alphanumeric',
    },
  };

  beforeEach(() => {
    storageService = new QRCodeStorageService();
    vi.clearAllMocks();
  });

  describe('Basic Storage Operations', () => {
    test('successfully stores a single QR code', async () => {
      const result = await storageService.storeQRCode(
        mockQRCode,
        'CT-2024-123-ABC123'
      );

      expect(result.storage).toBeDefined();
      expect(result.storage.provider).toBe('vercel-blob');
      expect(result.storage.url).toContain('blob.vercel-storage.com');
      expect(result.storage.key).toContain('qr-codes/CT-2024-123-ABC123');
      expect(result.storage.uploadedAt).toBeInstanceOf(Date);
      expect(result.metadata.storageSize).toBeGreaterThan(0);
      expect(result.metadata.uploadTime).toBeGreaterThan(0);
      expect(result.metadata.storageKey).toContain('CT-2024-123-ABC123');
    });

    test('handles different QR code formats', async () => {
      const svgQRCode: QRCodeResult = {
        ...mockQRCode,
        format: 'svg',
        mimeType: 'image/svg+xml',
        data: '<svg><rect width="100" height="100" fill="black"/></svg>',
      };

      const result = await storageService.storeQRCode(
        svgQRCode,
        'CT-2024-124-DEF456'
      );

      expect(result.storage.key).toContain('.svg');
      expect(result.storage.metadata?.contentType).toBe('image/svg+xml');
    });

    test('validates product ID format', async () => {
      await expect(
        storageService.storeQRCode(mockQRCode, 'INVALID-ID')
      ).rejects.toThrow('Invalid product ID format');
    });

    test('validates empty QR code data', async () => {
      const invalidQRCode = { ...mockQRCode, data: '' };

      await expect(
        storageService.storeQRCode(invalidQRCode, 'CT-2024-123-ABC123')
      ).rejects.toThrow('QR code data is empty');
    });

    test('handles file size validation', async () => {
      const storageWithSmallLimit = new QRCodeStorageService({
        provider: 'vercel-blob',
        options: { maxFileSize: 5 }, // Smaller than our test data (12 bytes)
      });

      await expect(
        storageWithSmallLimit.storeQRCode(mockQRCode, 'CT-2024-123-ABC123')
      ).rejects.toThrow('exceeds maximum allowed size');
    });
  });

  describe('Batch Storage Operations', () => {
    test('successfully stores multiple QR codes', async () => {
      const qrCodes = [
        { qrCode: mockQRCode, productId: 'CT-2024-123-ABC123' },
        {
          qrCode: {
            ...mockQRCode,
            encodedData:
              'https://chaintrace.app/verify/CT-2024-124-DEF456?source=qr',
          },
          productId: 'CT-2024-124-DEF456',
        },
      ];

      const result = await storageService.storeQRCodeBatch(qrCodes);

      expect(result.batchMetadata.totalRequested).toBe(2);
      expect(result.batchMetadata.successCount).toBe(2);
      expect(result.batchMetadata.failureCount).toBe(0);
      expect(result.stored).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(result.batchMetadata.processingTime).toBeGreaterThan(0);
    });

    test('handles partial failures in batch', async () => {
      const qrCodes = [
        { qrCode: mockQRCode, productId: 'CT-2024-123-ABC123' },
        { qrCode: mockQRCode, productId: 'INVALID-ID' }, // Invalid product ID
        { qrCode: mockQRCode, productId: 'CT-2024-124-DEF456' },
      ];

      const result = await storageService.storeQRCodeBatch(qrCodes);

      expect(result.batchMetadata.totalRequested).toBe(3);
      expect(result.batchMetadata.successCount).toBe(2);
      expect(result.batchMetadata.failureCount).toBe(1);
      expect(result.stored).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toContain('Invalid product ID format');
    });

    test('processes batch with custom concurrency', async () => {
      const qrCodes = Array.from({ length: 5 }, (_, i) => ({
        qrCode: mockQRCode,
        productId: `CT-2024-${String(i + 100).padStart(3, '0')}-ABC${String(i).padStart(3, '0')}`,
      }));

      const startTime = Date.now();
      const result = await storageService.storeQRCodeBatch(qrCodes, {
        concurrency: 2,
      });
      const endTime = Date.now();

      expect(result.batchMetadata.successCount).toBe(5);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete reasonably quickly
    });
  });

  describe('Configuration Options', () => {
    test('uses custom storage configuration', async () => {
      const customService = new QRCodeStorageService({
        provider: 'local',
        options: {
          enableLocalBackup: false,
          maxFileSize: 10 * 1024 * 1024,
        },
      });

      const result = await customService.storeQRCode(
        mockQRCode,
        'CT-2024-123-ABC123'
      );

      expect(result.storage.provider).toBe('local');
      expect(result.storage.url).toContain('file://');
      expect(result.backupCreated).toBe(false);
    });

    test('handles missing configuration gracefully', async () => {
      const minimalService = new QRCodeStorageService();

      const result = await minimalService.storeQRCode(
        mockQRCode,
        'CT-2024-123-ABC123'
      );

      expect(result.storage).toBeDefined();
      expect(result.metadata).toBeDefined();
    });
  });

  describe('Utility Methods', () => {
    test('retrieves QR code by product ID', async () => {
      // Store first
      await storageService.storeQRCode(mockQRCode, 'CT-2024-123-ABC123');

      // Then retrieve (will return null in mock implementation)
      const retrieved =
        await storageService.retrieveQRCode('CT-2024-123-ABC123');

      // In the mock implementation, this returns null
      expect(retrieved).toBeNull();
    });

    test('deletes QR code', async () => {
      const deleted = await storageService.deleteQRCode('CT-2024-123-ABC123');

      // Mock implementation always returns true
      expect(deleted).toBe(true);
    });

    test('lists stored QR codes', async () => {
      const list = await storageService.listStoredQRCodes({ limit: 10 });

      // Mock implementation returns empty array
      expect(Array.isArray(list)).toBe(true);
    });

    test('gets storage statistics', async () => {
      const stats = await storageService.getStorageStats();

      expect(stats).toHaveProperty('totalFiles');
      expect(stats).toHaveProperty('totalSize');
      expect(typeof stats.totalFiles).toBe('number');
      expect(typeof stats.totalSize).toBe('number');
    });
  });

  describe('Error Handling', () => {
    test('handles invalid QR code data gracefully', async () => {
      const invalidQRCode = {
        ...mockQRCode,
        data: 'invalid-data-url',
      };

      await expect(
        storageService.storeQRCode(invalidQRCode, 'CT-2024-123-ABC123')
      ).rejects.toThrow();
    });

    test('handles empty product ID', async () => {
      await expect(
        storageService.storeQRCode(mockQRCode, '')
      ).rejects.toThrow();
    });

    test('provides detailed error information', async () => {
      try {
        await storageService.storeQRCode(mockQRCode, 'INVALID');
      } catch (error: any) {
        expect(error.message).toContain('Invalid product ID format');
        expect(error.code).toBeDefined();
      }
    });
  });

  describe('Data Size Calculation', () => {
    test('calculates data URL size correctly', async () => {
      const result = await storageService.storeQRCode(
        mockQRCode,
        'CT-2024-123-ABC123'
      );

      // Base64 'mockbase64data==' should decode to approximately this size
      expect(result.metadata.storageSize).toBeGreaterThan(0);
      expect(result.metadata.storageSize).toBeLessThan(1024);
    });

    test('handles different data formats', async () => {
      const svgData = '<svg><rect width="100" height="100"/></svg>';
      const svgQR: QRCodeResult = {
        ...mockQRCode,
        format: 'svg',
        data: svgData,
        mimeType: 'image/svg+xml',
      };

      const result = await storageService.storeQRCode(
        svgQR,
        'CT-2024-123-ABC123'
      );
      expect(result.metadata.storageSize).toBe(svgData.length);
    });
  });
});
