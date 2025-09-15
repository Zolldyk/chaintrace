import {
  validateQRCode,
  extractProductData,
  createScanResult,
  generateVerificationUrl,
  formatScannerError,
} from '@/lib/qr-scanner';

describe('QR Scanner Utilities', () => {
  describe('validateQRCode', () => {
    it('validates ChainTrace product ID format', () => {
      const result = validateQRCode('CT-2024-123-ABC123');

      expect(result.valid).toBe(true);
      expect(result.productId).toBe('CT-2024-123-ABC123');
      expect(result.type).toBe('product_id');
    });

    it('validates legacy product ID format', () => {
      const result = validateQRCode('PROD-2024-001');

      expect(result.valid).toBe(true);
      expect(result.productId).toBe('PROD-2024-001');
      expect(result.type).toBe('product_id');
    });

    it('extracts product ID from verification URL', () => {
      const result = validateQRCode('https://app.chaintrace.com/verify/CT-2024-123-ABC123');

      expect(result.valid).toBe(true);
      expect(result.productId).toBe('CT-2024-123-ABC123');
      expect(result.type).toBe('url');
    });

    it('rejects invalid QR code data', () => {
      const result = validateQRCode('invalid-data-123');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('QR code does not contain a valid product ID');
      expect(result.type).toBe('text');
    });

    it('handles empty input', () => {
      const result = validateQRCode('');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid QR code data');
      expect(result.type).toBe('unknown');
    });

    it('validates JSON product data', () => {
      const jsonData = JSON.stringify({ productId: 'CT-2024-123-ABC123' });
      const result = validateQRCode(jsonData);

      expect(result.valid).toBe(true);
      expect(result.productId).toBe('CT-2024-123-ABC123');
      expect(result.type).toBe('text');
    });
  });

  describe('extractProductData', () => {
    it('extracts data from simple product ID', () => {
      const data = extractProductData('CT-2024-123-ABC123');

      expect(data).toEqual({
        productId: 'CT-2024-123-ABC123',
      });
    });

    it('extracts data from verification URL with batch ID', () => {
      const data = extractProductData('https://app.chaintrace.com/verify/CT-2024-123-ABC123?batch=BATCH001');

      expect(data).toEqual({
        productId: 'CT-2024-123-ABC123',
        verificationUrl: 'https://app.chaintrace.com/verify/CT-2024-123-ABC123?batch=BATCH001',
        batchId: 'BATCH001',
      });
    });

    it('returns null for invalid data', () => {
      const data = extractProductData('invalid-data-123');

      expect(data).toBeNull();
    });

    it('extracts metadata from URL query parameters', () => {
      const data = extractProductData('https://app.chaintrace.com/verify/CT-2024-123-ABC123?source=qr&campaign=test');

      expect(data).toEqual({
        productId: 'CT-2024-123-ABC123',
        verificationUrl: 'https://app.chaintrace.com/verify/CT-2024-123-ABC123?source=qr&campaign=test',
        metadata: {
          source: 'qr',
          campaign: 'test',
        },
      });
    });
  });

  describe('createScanResult', () => {
    it('creates valid scan result', () => {
      const result = createScanResult('CT-2024-123-ABC123', 'QR_CODE');

      expect(result.data).toBe('CT-2024-123-ABC123');
      expect(result.isValid).toBe(true);
      expect(result.productId).toBe('CT-2024-123-ABC123');
      expect(result.format).toBe('QR_CODE');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('creates invalid scan result', () => {
      const result = createScanResult('invalid-data-123');

      expect(result.data).toBe('invalid-data-123');
      expect(result.isValid).toBe(false);
      expect(result.productId).toBeUndefined();
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('generateVerificationUrl', () => {
    it('generates basic verification URL', () => {
      const url = generateVerificationUrl('CT-2024-123-ABC123', 'https://app.chaintrace.com');

      expect(url).toBe('https://app.chaintrace.com/verify/CT-2024-123-ABC123');
    });

    it('generates URL with batch ID', () => {
      const url = generateVerificationUrl(
        'CT-2024-123-ABC123',
        'https://app.chaintrace.com',
        { batchId: 'BATCH001' }
      );

      expect(url).toBe('https://app.chaintrace.com/verify/CT-2024-123-ABC123?batch=BATCH001');
    });

    it('generates URL with metadata', () => {
      const url = generateVerificationUrl(
        'CT-2024-123-ABC123',
        'https://app.chaintrace.com',
        { metadata: { source: 'qr', campaign: 'test' } }
      );

      expect(url).toBe('https://app.chaintrace.com/verify/CT-2024-123-ABC123?source=qr&campaign=test');
    });

    it('handles empty base URL', () => {
      const url = generateVerificationUrl('CT-2024-123-ABC123');

      expect(url).toBe('/verify/CT-2024-123-ABC123');
    });
  });

  describe('formatScannerError', () => {
    it('formats permission denied error', () => {
      const message = formatScannerError(new Error('Permission denied'));

      expect(message).toBe('Camera access is required for QR scanning. Please enable camera permissions and try again.');
    });

    it('formats camera not found error', () => {
      const message = formatScannerError('NotFoundError: no camera available');

      expect(message).toBe('No camera found on this device. Please use a device with a camera for QR scanning.');
    });

    it('formats browser not supported error', () => {
      const message = formatScannerError('NotSupportedError: not supported');

      expect(message).toBe('QR scanning is not supported in this browser. Please try a different browser or enter the product ID manually.');
    });

    it('formats timeout error', () => {
      const message = formatScannerError('Scanning timeout occurred');

      expect(message).toBe('QR scanning timed out. Please try scanning again or enter the product ID manually.');
    });

    it('formats invalid QR code error', () => {
      const message = formatScannerError('Invalid QR code format');

      expect(message).toBe('Invalid QR code format. Please scan a valid ChainTrace product QR code.');
    });

    it('formats generic error', () => {
      const message = formatScannerError('Some unknown error');

      expect(message).toBe('QR scanning failed. Please try again or enter the product ID manually.');
    });
  });
});