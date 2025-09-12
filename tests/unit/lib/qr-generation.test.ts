/**
 * Unit tests for QR code generation utilities
 *
 * @since 2.4.0
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import {
  generateProductQRCode,
  generateProductQRCodeBatch,
  validateQRCode,
  extractProductIdFromQR,
  getDefaultQROptions,
  generateQRFilename,
} from '../../../src/lib/qr-generation';
import {
  QRCodeError,
  type QRCodeOptions,
  type QRCodeBatchRequest,
  type QRCodeUrlConfig,
} from '../../../src/types/qr';

// Mock QRCode library
vi.mock('qrcode', () => ({
  default: {
    toString: vi.fn().mockImplementation(async (data: string, options: any) => {
      const dataHash = Buffer.from(data).toString('base64').substring(0, 8);
      if (options.type === 'svg') {
        return `<svg width="${options.width}" height="${options.width}"><rect width="100%" height="100%" fill="${options.color?.light || '#fff'}"/><text>${dataHash}</text></svg>`;
      }
      return `mock-qr-string-${dataHash}`;
    }),
    toDataURL: vi
      .fn()
      .mockImplementation(async (data: string, options: any) => {
        const format = options.type?.split('/')[1] || 'png';
        const dataHash = Buffer.from(data).toString('base64').substring(0, 8);
        return `data:image/${format};base64,mockbase64data${dataHash}==`;
      }),
  },
}));

describe('QR Code Generation', () => {
  const validProductId = 'CT-2024-123-ABC123';
  const validOptions: QRCodeOptions = {
    format: 'png',
    size: 256,
    errorCorrectionLevel: 'M',
  };

  describe('generateProductQRCode', () => {
    test('should generate valid QR code with default options', async () => {
      const result = await generateProductQRCode(validProductId, validOptions);

      expect(result).toMatchObject({
        data: expect.stringMatching(/^data:image\/png;base64,/),
        format: 'png',
        dimensions: { width: 256, height: 256 },
        timestamp: expect.any(Date),
        size: expect.any(Number),
        mimeType: 'image/png',
        encodedData: expect.stringContaining(validProductId),
        metadata: {
          errorLevel: 'M',
          version: expect.any(Number),
          mode: 'alphanumeric',
        },
      });
    });

    test('should generate SVG QR code', async () => {
      const svgOptions: QRCodeOptions = { ...validOptions, format: 'svg' };
      const result = await generateProductQRCode(validProductId, svgOptions);

      expect(result.format).toBe('svg');
      expect(result.mimeType).toBe('image/svg+xml');
      expect(result.data).toContain('<svg');
    });

    test('should include verification URL in QR data', async () => {
      const result = await generateProductQRCode(validProductId, validOptions);

      expect(result.encodedData).toContain('/verify/');
      expect(result.encodedData).toContain(validProductId);
      expect(result.encodedData).toContain('source=qr');
    });

    test('should apply custom URL configuration', async () => {
      const customUrlConfig: QRCodeUrlConfig = {
        baseUrl: 'https://custom.example.com',
        verificationPath: '/check',
        includeTracking: false,
      };

      const result = await generateProductQRCode(
        validProductId,
        validOptions,
        customUrlConfig
      );

      expect(result.encodedData).toContain('custom.example.com');
      expect(result.encodedData).toContain('/check/');
      expect(result.encodedData).not.toContain('source=qr');
    });

    test('should validate product ID format', async () => {
      const invalidProductId = 'INVALID-ID';

      await expect(
        generateProductQRCode(invalidProductId, validOptions)
      ).rejects.toThrow(QRCodeError);
    });

    test('should validate QR code options', async () => {
      const invalidOptions: QRCodeOptions = {
        format: 'invalid-format' as any,
        size: 5000, // Too large
      };

      await expect(
        generateProductQRCode(validProductId, invalidOptions)
      ).rejects.toThrow(QRCodeError);
    });

    test('should handle custom colors', async () => {
      const colorOptions: QRCodeOptions = {
        ...validOptions,
        color: {
          dark: '#2563eb',
          light: '#f8fafc',
        },
      };

      const result = await generateProductQRCode(validProductId, colorOptions);
      expect(result.data).toBeDefined();
    });

    test('should validate size limits per format', async () => {
      const oversizedPng: QRCodeOptions = { format: 'png', size: 3000 };
      const oversizedSvg: QRCodeOptions = { format: 'svg', size: 5000 };

      await expect(
        generateProductQRCode(validProductId, oversizedPng)
      ).rejects.toThrow(QRCodeError);

      await expect(
        generateProductQRCode(validProductId, oversizedSvg)
      ).rejects.toThrow(QRCodeError);
    });

    test('should validate JPEG quality', async () => {
      const invalidQualityOptions: QRCodeOptions = {
        format: 'jpeg',
        quality: 150, // Invalid quality
      };

      await expect(
        generateProductQRCode(validProductId, invalidQualityOptions)
      ).rejects.toThrow(QRCodeError);
    });
  });

  describe('generateProductQRCodeBatch', () => {
    const batchRequest: QRCodeBatchRequest = {
      productIds: [
        'CT-2024-001-ABC123',
        'CT-2024-002-DEF456',
        'CT-2024-003-ABC789',
      ],
      options: validOptions,
      filenamePrefix: 'test-batch',
      includeMetadata: true,
    };

    test('should generate batch QR codes successfully', async () => {
      const result = await generateProductQRCodeBatch(batchRequest);

      expect(result.results).toHaveLength(3);
      expect(result.batchMetadata.successCount).toBe(3);
      expect(result.batchMetadata.failureCount).toBe(0);
      expect(result.errors).toHaveLength(0);

      result.results.forEach((item, index) => {
        expect(item.productId).toBe(batchRequest.productIds[index]);
        expect(item.qrCode.format).toBe('png');
        expect(item.filename).toContain('test-batch');
        expect(item.filename).toContain(item.productId);
      });
    });

    test('should handle mixed success and failure', async () => {
      const mixedRequest: QRCodeBatchRequest = {
        productIds: ['CT-2024-001-ABC123', 'INVALID-ID', 'CT-2024-003-ABC789'],
        options: validOptions,
      };

      const result = await generateProductQRCodeBatch(mixedRequest);

      expect(result.batchMetadata.successCount).toBe(2);
      expect(result.batchMetadata.failureCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].productId).toBe('INVALID-ID');
    });

    test('should validate batch size limits', async () => {
      const oversizedRequest: QRCodeBatchRequest = {
        productIds: Array.from(
          { length: 101 },
          (_, i) => `CT-2024-${String(i).padStart(3, '0')}-ABC123`
        ),
        options: validOptions,
      };

      await expect(
        generateProductQRCodeBatch(oversizedRequest)
      ).rejects.toThrow(QRCodeError);
    });

    test('should require at least one product ID', async () => {
      const emptyRequest: QRCodeBatchRequest = {
        productIds: [],
        options: validOptions,
      };

      await expect(generateProductQRCodeBatch(emptyRequest)).rejects.toThrow(
        QRCodeError
      );
    });

    test('should generate consistent filenames', async () => {
      const result = await generateProductQRCodeBatch(batchRequest);

      result.results.forEach((item, index) => {
        expect(item.filename).toMatch(
          /^test-batch-CT-2024-\d{3}-[A-F0-9]{6}-\d+\.png$/
        );
        expect(item.filename).toContain(item.productId);
      });
    });

    test('should track processing time', async () => {
      const result = await generateProductQRCodeBatch(batchRequest);

      expect(typeof result.batchMetadata.processingTime).toBe('number');
      expect(result.batchMetadata.processingTime).toBeGreaterThanOrEqual(0);
      expect(result.batchMetadata.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('validateQRCode', () => {
    const validQRUrl =
      'https://chaintrace.app/verify/CT-2024-123-ABC123?source=qr&timestamp=1234567890';
    const urlConfig: QRCodeUrlConfig = {
      baseUrl: 'https://chaintrace.app',
      verificationPath: '/verify',
      includeTracking: true,
    };

    test('should validate correct QR code URL', () => {
      const result = validateQRCode(validQRUrl, urlConfig);

      expect(result.isValid).toBe(true);
      expect(result.productId).toBe('CT-2024-123-ABC123');
      expect(result.errors).toHaveLength(0);
      expect(result.verifiedAt).toBeInstanceOf(Date);
    });

    test('should reject invalid URLs', () => {
      const invalidUrls = [
        '',
        'not-a-url',
        'http://wrong-domain.com/verify/CT-2024-123-ABC123',
        'https://chaintrace.app/wrong-path/CT-2024-123-ABC123',
        'https://chaintrace.app/verify/INVALID-ID',
      ];

      invalidUrls.forEach(url => {
        const result = validateQRCode(url, urlConfig);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    test('should validate tracking parameters when required', () => {
      const urlWithoutTracking =
        'https://chaintrace.app/verify/CT-2024-123-ABC123';
      const result = validateQRCode(urlWithoutTracking, urlConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('tracking'))).toBe(
        true
      );
    });

    test('should extract product ID correctly', () => {
      const result = validateQRCode(validQRUrl, urlConfig);

      expect(result.productId).toBe('CT-2024-123-ABC123');
    });

    test('should handle malformed data gracefully', () => {
      const malformedData = [null, undefined, {}, [], 123];

      malformedData.forEach(data => {
        const result = validateQRCode(data as any, urlConfig);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    test('should work without tracking when disabled', () => {
      const noTrackingConfig: QRCodeUrlConfig = {
        ...urlConfig,
        includeTracking: false,
      };

      const urlWithoutTracking =
        'https://chaintrace.app/verify/CT-2024-123-ABC123';
      const result = validateQRCode(urlWithoutTracking, noTrackingConfig);

      expect(result.isValid).toBe(true);
      expect(result.productId).toBe('CT-2024-123-ABC123');
    });
  });

  describe('extractProductIdFromQR', () => {
    test('should extract product ID from valid URL', () => {
      const url = 'https://chaintrace.app/verify/CT-2024-123-ABC123?source=qr';
      const productId = extractProductIdFromQR(url);

      expect(productId).toBe('CT-2024-123-ABC123');
    });

    test('should return null for invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'https://chaintrace.app/wrong-path/CT-2024-123-ABC123',
        'https://example.com/verify/',
        '',
      ];

      invalidUrls.forEach(url => {
        const productId = extractProductIdFromQR(url);
        expect(productId).toBeNull();
      });
    });

    test('should handle URL encoded product IDs', () => {
      const encodedUrl = 'https://chaintrace.app/verify/CT-2024-123-ABC123';
      const productId = extractProductIdFromQR(encodedUrl);

      expect(productId).toBe('CT-2024-123-ABC123');
    });
  });

  describe('getDefaultQROptions', () => {
    test('should return web-optimized options', () => {
      const options = getDefaultQROptions('web');

      expect(options).toMatchObject({
        format: 'png',
        size: 200,
        errorCorrectionLevel: 'M',
      });
    });

    test('should return print-optimized options', () => {
      const options = getDefaultQROptions('print');

      expect(options).toMatchObject({
        format: 'svg',
        size: 512,
        errorCorrectionLevel: 'H',
        margin: 4,
      });
    });

    test('should return mobile-optimized options', () => {
      const options = getDefaultQROptions('mobile');

      expect(options).toMatchObject({
        format: 'png',
        size: 256,
        errorCorrectionLevel: 'L',
        margin: 1,
      });
    });

    test('should return default options for unknown preset', () => {
      const options = getDefaultQROptions('unknown' as any);

      expect(options.format).toBe('png');
      expect(options.size).toBeDefined();
    });
  });

  describe('generateQRFilename', () => {
    test('should generate consistent filename', () => {
      const filename = generateQRFilename(validProductId, validOptions);
      const today = new Date().toISOString().split('T')[0];

      expect(filename).toMatch(
        new RegExp(`^qr-${validProductId}-256x256-${today}\\.png$`)
      );
    });

    test('should use custom prefix', () => {
      const filename = generateQRFilename(
        validProductId,
        validOptions,
        'custom'
      );

      expect(filename.startsWith('custom-')).toBe(true);
    });

    test('should handle different formats correctly', () => {
      const jpegOptions: QRCodeOptions = { format: 'jpeg', size: 300 };
      const filename = generateQRFilename(validProductId, jpegOptions);

      expect(filename).toContain('300x300');
      expect(filename.endsWith('.jpg')).toBe(true); // jpeg -> jpg extension
    });

    test('should handle SVG format', () => {
      const svgOptions: QRCodeOptions = { format: 'svg', size: 512 };
      const filename = generateQRFilename(validProductId, svgOptions);

      expect(filename.endsWith('.svg')).toBe(true);
    });
  });

  describe('error handling', () => {
    test('should throw QRCodeError with appropriate codes', async () => {
      try {
        await generateProductQRCode('INVALID-ID', validOptions);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(QRCodeError);
        expect((error as QRCodeError).code).toBe('INVALID_DATA');
        expect((error as QRCodeError).details).toBeDefined();
      }
    });

    test('should include helpful error details', async () => {
      try {
        await generateProductQRCode(validProductId, {
          format: 'invalid-format' as any,
        });
        expect.fail('Should have thrown error');
      } catch (error) {
        const qrError = error as QRCodeError;
        expect(qrError.details).toMatchObject({
          supportedFormats: expect.any(Array),
        });
      }
    });

    test('should validate error properties', () => {
      const error = new QRCodeError('GENERATION_FAILED', 'Test error', {
        test: 'data',
      });

      expect(error.name).toBe('QRCodeError');
      expect(error.code).toBe('GENERATION_FAILED');
      expect(error.message).toBe('Test error');
      expect(error.details).toEqual({ test: 'data' });
    });
  });

  describe('integration scenarios', () => {
    test('should handle realistic bulk generation', async () => {
      // Generate valid hex suffixes (A-F, 0-9 only)
      const productIds = Array.from({ length: 10 }, (_, i) => {
        const hexChars = '0123456789ABCDEF';
        const suffix = Array.from(
          { length: 6 },
          () => hexChars[Math.floor(Math.random() * hexChars.length)]
        ).join('');
        return `CT-2024-${String(i + 1).padStart(3, '0')}-${suffix}`;
      });

      const batchRequest: QRCodeBatchRequest = {
        productIds,
        options: {
          format: 'png',
          size: 256,
          errorCorrectionLevel: 'M',
        },
        filenamePrefix: 'batch-test',
      };

      const result = await generateProductQRCodeBatch(batchRequest);

      expect(result.batchMetadata.successCount).toBe(10);
      expect(result.results).toHaveLength(10);
      expect(result.errors).toHaveLength(0);

      // All QR codes should contain the correct product IDs
      result.results.forEach((item, index) => {
        expect(item.qrCode.encodedData).toContain(productIds[index]);
        expect(item.productId).toBe(productIds[index]);
      });

      // Verify all products were processed with unique product IDs
      const processedIds = result.results.map(r => r.productId);
      const uniqueIds = new Set(processedIds);
      expect(uniqueIds.size).toBe(10);
    });

    test('should handle different format combinations', async () => {
      const formats: Array<{ format: any; size: number }> = [
        { format: 'png', size: 200 },
        { format: 'svg', size: 300 },
        { format: 'jpeg', size: 256 },
        { format: 'webp', size: 400 },
      ];

      for (const config of formats) {
        const result = await generateProductQRCode(validProductId, config);
        expect(result.format).toBe(config.format);
        expect(result.dimensions.width).toBe(config.size);
      }
    });

    test('should maintain consistency across regeneration', async () => {
      const options = { format: 'png' as const, size: 256 };

      const result1 = await generateProductQRCode(validProductId, options);
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 5));
      const result2 = await generateProductQRCode(validProductId, options);

      // Should have same format and dimensions but different timestamps
      expect(result1.format).toBe(result2.format);
      expect(result1.dimensions).toEqual(result2.dimensions);

      // URLs should contain the same product ID but different timestamps
      expect(result1.encodedData).toContain(validProductId);
      expect(result2.encodedData).toContain(validProductId);
      expect(result1.timestamp.getTime()).not.toBe(result2.timestamp.getTime());
    });
  });
});
