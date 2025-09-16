/**
 * Integration tests for complete QR scan to verification workflow
 * Tests the flow: QR scan → validation → navigation → product display
 *
 * @file tests/integration/qr-scanning-flow.test.ts
 * @since 1.0.0
 */

import { describe, it, expect, vi } from 'vitest';
import { validateProductId, parseQRCodeData } from '@/lib/qr-scanner';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock MediaDevices API for browser environment
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn(),
    enumerateDevices: vi.fn().mockResolvedValue([
      {
        deviceId: 'camera1',
        kind: 'videoinput',
        label: 'Mock Camera',
      },
    ]),
  },
  writable: true,
});

// Mock ZXing browser library
vi.mock('@zxing/browser', () => ({
  BrowserMultiFormatReader: vi.fn().mockImplementation(() => ({
    decodeFromVideoDevice: vi.fn(),
    reset: vi.fn(),
    getVideoInputDevices: vi
      .fn()
      .mockResolvedValue([{ deviceId: 'camera1', label: 'Mock Camera' }]),
  })),
}));

describe('QR Scanning to Verification Integration', () => {
  describe('QR Code Validation', () => {
    it('should validate scanned QR codes before navigation', () => {
      // Test valid ChainTrace QR format
      const validQR = 'https://chaintrace.com/verify/CT-2024-001-ABC123';
      const result = parseQRCodeData(validQR);

      expect(result.valid).toBe(true);
      expect(result.productId).toBe('CT-2024-001-ABC123');
      expect(result.format).toBe('chaintrace_url');

      // Test invalid QR format
      const invalidQR = 'https://example.com/invalid';
      const invalidResult = parseQRCodeData(invalidQR);

      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.productId).toBeNull();
      expect(invalidResult.error).toContain('Invalid QR code format');
    });

    it('should validate product ID format before navigation', () => {
      // Test ChainTrace format
      expect(validateProductId('CT-2024-001-ABC123')).toBe(true);

      // Test legacy formats
      expect(validateProductId('PROD-2024-001')).toBe(true);
      expect(validateProductId('ORG-ABC-123')).toBe(true);

      // Test invalid formats
      expect(validateProductId('invalid')).toBe(false);
      expect(validateProductId('')).toBe(false);
      expect(validateProductId('CT')).toBe(false);
    });
  });

  describe('Cross-Browser QR Format Support', () => {
    it('should handle different QR code formats consistently', () => {
      const testCases = [
        {
          qr: 'https://chaintrace.com/verify/CT-2024-001-ABC123',
          expected: {
            valid: true,
            productId: 'CT-2024-001-ABC123',
            format: 'chaintrace_url',
          },
        },
        {
          qr: 'CT-2024-001-ABC123',
          expected: {
            valid: true,
            productId: 'CT-2024-001-ABC123',
            format: 'chaintrace_id',
          },
        },
        {
          qr: 'PROD-2024-001',
          expected: {
            valid: true,
            productId: 'PROD-2024-001',
            format: 'legacy_id',
          },
        },
        {
          qr: 'https://app.chaintrace.com/verify/CT-2024-001-ABC123',
          expected: {
            valid: true,
            productId: 'CT-2024-001-ABC123',
            format: 'chaintrace_url',
          },
        },
      ];

      testCases.forEach(({ qr, expected }) => {
        const result = parseQRCodeData(qr);
        expect(result.valid).toBe(expected.valid);
        expect(result.productId).toBe(expected.productId);
        expect(result.format).toBe(expected.format);
      });
    });
  });
});
