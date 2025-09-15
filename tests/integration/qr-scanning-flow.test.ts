/**
 * Integration tests for complete QR scan to verification workflow
 * Tests the flow: QR scan → validation → navigation → product display
 *
 * @file tests/integration/qr-scanning-flow.test.ts
 * @since 1.0.0
 */

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import QRScanner from '@/components/ui/QRScanner';
import ProductLookup from '@/components/verification/ProductLookup';
import { validateProductId, parseQRCodeData } from '@/lib/qr-scanner';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock MediaDevices API
const mockMediaDevices = {
  getUserMedia: vi.fn(),
  enumerateDevices: vi.fn().mockResolvedValue([
    {
      deviceId: 'camera1',
      kind: 'videoinput',
      label: 'Mock Camera',
    },
  ]),
};

Object.defineProperty(navigator, 'mediaDevices', {
  value: mockMediaDevices,
  writable: true,
});

// Mock ZXing browser library
vi.mock('@zxing/browser', () => ({
  BrowserQRCodeReader: vi.fn().mockImplementation(() => ({
    decodeFromVideoDevice: vi.fn(),
    reset: vi.fn(),
    getVideoInputDevices: vi.fn().mockResolvedValue([
      { deviceId: 'camera1', label: 'Mock Camera' },
    ]),
  })),
  IScannerControls: {},
}));

// Mock video element
const createMockVideoElement = () => ({
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  srcObject: null,
  videoWidth: 640,
  videoHeight: 480,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
});

global.HTMLVideoElement = vi.fn().mockImplementation(() => createMockVideoElement());

describe('QR Scanning to Verification Integration', () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as MockedFunction<typeof useRouter>).mockReturnValue({
      push: mockPush,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    });

    // Reset media devices mock
    mockMediaDevices.getUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
      getVideoTracks: () => [{ stop: vi.fn() }],
    } as any);
  });

  describe('Complete Scan to Verification Flow', () => {
    it('should successfully scan QR code and navigate to verification page', async () => {
      const mockProductId = 'CT-2024-001-ABC123';
      const mockQRData = `https://chaintrace.com/verify/${mockProductId}`;

      // Mock successful QR scan
      const { BrowserQRCodeReader } = await import('@zxing/browser');
      const mockReader = new BrowserQRCodeReader();
      (mockReader.decodeFromVideoDevice as any).mockImplementation(
        (deviceId: string, videoElement: HTMLVideoElement, callback: Function) => {
          // Simulate successful scan after short delay
          setTimeout(() => {
            callback({ getText: () => mockQRData });
          }, 100);

          return {
            stop: vi.fn(),
          };
        }
      );

      const onScanSuccess = vi.fn();
      const onScanError = vi.fn();

      render(
        <QRScanner
          onScanSuccess={onScanSuccess}
          onScanError={onScanError}
          isActive={true}
        />
      );

      // Wait for camera initialization
      await waitFor(() => {
        expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({
          video: { facingMode: 'environment' },
        });
      });

      // Wait for QR scan simulation
      await waitFor(() => {
        expect(onScanSuccess).toHaveBeenCalledWith(mockProductId, mockQRData);
      }, { timeout: 2000 });

      expect(onScanError).not.toHaveBeenCalled();
    });

    it('should handle QR validation and auto-navigation in ProductLookup', async () => {
      const mockProductId = 'CT-2024-001-ABC123';

      render(<ProductLookup />);

      // Get QR scanner toggle button and activate scanner
      const scannerToggle = screen.getByRole('button', { name: /scan qr code/i });
      fireEvent.click(scannerToggle);

      // Wait for scanner to be active
      await waitFor(() => {
        expect(screen.getByText(/position qr code/i)).toBeInTheDocument();
      });

      // Simulate QR scan result
      const mockQRData = `https://chaintrace.com/verify/${mockProductId}`;
      const { BrowserQRCodeReader } = await import('@zxing/browser');
      const mockReader = new BrowserQRCodeReader();

      // Trigger scan success callback directly
      const scannerComponent = screen.getByTestId('qr-scanner-container');
      fireEvent(scannerComponent, new CustomEvent('qr-scan-success', {
        detail: { productId: mockProductId, qrData: mockQRData }
      }));

      // Verify navigation was called
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(`/verify/${mockProductId}`);
      });
    });

    it('should validate scanned QR codes before navigation', async () => {
      // Test valid ChainTrace QR format
      const validQR = 'https://chaintrace.com/verify/CT-2024-001-ABC123';
      const result = parseQRCodeData(validQR);

      expect(result.isValid).toBe(true);
      expect(result.productId).toBe('CT-2024-001-ABC123');
      expect(result.format).toBe('chaintrace_url');

      // Test invalid QR format
      const invalidQR = 'https://example.com/invalid';
      const invalidResult = parseQRCodeData(invalidQR);

      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.productId).toBeNull();
      expect(invalidResult.error).toContain('Invalid QR code format');
    });

    it('should handle scan errors and provide fallback options', async () => {
      const onScanSuccess = vi.fn();
      const onScanError = vi.fn();

      // Mock camera access denied
      mockMediaDevices.getUserMedia.mockRejectedValue(
        new Error('Permission denied')
      );

      render(
        <QRScanner
          onScanSuccess={onScanSuccess}
          onScanError={onScanError}
          isActive={true}
        />
      );

      await waitFor(() => {
        expect(onScanError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('Camera access'),
            code: 'CAMERA_ACCESS_DENIED'
          })
        );
      });

      expect(onScanSuccess).not.toHaveBeenCalled();
    });

    it('should handle malformed QR codes gracefully', async () => {
      const mockMalformedQR = 'invalid-qr-data-123';

      const { BrowserQRCodeReader } = await import('@zxing/browser');
      const mockReader = new BrowserQRCodeReader();
      (mockReader.decodeFromVideoDevice as any).mockImplementation(
        (deviceId: string, videoElement: HTMLVideoElement, callback: Function) => {
          setTimeout(() => {
            callback({ getText: () => mockMalformedQR });
          }, 100);

          return { stop: vi.fn() };
        }
      );

      const onScanSuccess = vi.fn();
      const onScanError = vi.fn();

      render(
        <QRScanner
          onScanSuccess={onScanSuccess}
          onScanError={onScanError}
          isActive={true}
        />
      );

      await waitFor(() => {
        expect(onScanError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('Invalid QR code format'),
            code: 'INVALID_QR_FORMAT'
          })
        );
      });

      expect(onScanSuccess).not.toHaveBeenCalled();
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

  describe('Error Recovery and Fallback', () => {
    it('should provide manual entry fallback when scanning fails', async () => {
      render(<ProductLookup />);

      // Activate QR scanner
      const scannerToggle = screen.getByRole('button', { name: /scan qr code/i });
      fireEvent.click(scannerToggle);

      // Wait for scanner to be active
      await waitFor(() => {
        expect(screen.getByText(/position qr code/i)).toBeInTheDocument();
      });

      // Find and click fallback to manual entry
      const manualEntryButton = screen.getByRole('button', { name: /enter manually/i });
      fireEvent.click(manualEntryButton);

      // Verify manual entry form is shown
      await waitFor(() => {
        expect(screen.getByLabelText(/product id/i)).toBeInTheDocument();
      });
    });

    it('should handle timeout scenarios gracefully', async () => {
      const onScanSuccess = vi.fn();
      const onScanError = vi.fn();

      // Mock scanning that never completes
      const { BrowserQRCodeReader } = await import('@zxing/browser');
      const mockReader = new BrowserQRCodeReader();
      (mockReader.decodeFromVideoDevice as any).mockImplementation(
        () => ({ stop: vi.fn() })
      );

      render(
        <QRScanner
          onScanSuccess={onScanSuccess}
          onScanError={onScanError}
          isActive={true}
          timeout={1000} // 1 second timeout for test
        />
      );

      // Wait for timeout
      await waitFor(() => {
        expect(onScanError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('Scanning timeout'),
            code: 'SCANNING_TIMEOUT'
          })
        );
      }, { timeout: 2000 });
    });
  });

  describe('Cross-Browser QR Format Support', () => {
    it('should handle different QR code formats consistently', () => {
      const testCases = [
        {
          qr: 'https://chaintrace.com/verify/CT-2024-001-ABC123',
          expected: { isValid: true, productId: 'CT-2024-001-ABC123', format: 'chaintrace_url' }
        },
        {
          qr: 'CT-2024-001-ABC123',
          expected: { isValid: true, productId: 'CT-2024-001-ABC123', format: 'chaintrace_id' }
        },
        {
          qr: 'PROD-2024-001',
          expected: { isValid: true, productId: 'PROD-2024-001', format: 'legacy_id' }
        },
        {
          qr: 'https://app.chaintrace.com/verify/CT-2024-001-ABC123',
          expected: { isValid: true, productId: 'CT-2024-001-ABC123', format: 'chaintrace_url' }
        }
      ];

      testCases.forEach(({ qr, expected }) => {
        const result = parseQRCodeData(qr);
        expect(result.isValid).toBe(expected.isValid);
        expect(result.productId).toBe(expected.productId);
        expect(result.format).toBe(expected.format);
      });
    });
  });
});