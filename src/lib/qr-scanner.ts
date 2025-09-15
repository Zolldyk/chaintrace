/**
 * QR Scanner utility functions for validation and data extraction.
 *
 * @since 1.0.0
 */

import { QRValidationResult, QRScanResult, ProductQRData } from '@/types/qr';

/**
 * Validates QR code data and extracts product information.
 *
 * @param data - Raw QR code data
 * @returns Validation result with extracted product ID
 *
 * @example
 * ```typescript
 * const result = validateQRCode('CT-2024-123-ABC123');
 * if (result.valid) {
 *   console.log('Product ID:', result.productId);
 * }
 * ```
 */
export function validateQRCode(data: string): QRValidationResult {
  if (!data || typeof data !== 'string') {
    return {
      valid: false,
      error: 'Invalid QR code data',
      type: 'unknown',
    };
  }

  const trimmedData = data.trim();

  // Check if it's a ChainTrace product ID format: CT-YYYY-XXX-ABCDEF
  const ctPattern = /^CT-\d{4}-\d{3}-[A-F0-9]{6}$/;
  if (ctPattern.test(trimmedData)) {
    return {
      valid: true,
      productId: trimmedData,
      type: 'product_id',
    };
  }

  // Check if it's a verification URL
  if (trimmedData.includes('/verify/')) {
    const urlMatch = trimmedData.match(/\/verify\/([^?&#]+)/);
    if (urlMatch && urlMatch[1]) {
      const extractedId = urlMatch[1];

      // Validate the extracted product ID
      if (ctPattern.test(extractedId)) {
        return {
          valid: true,
          productId: extractedId,
          type: 'url',
        };
      }
    }

    return {
      valid: false,
      error: 'Invalid product ID in verification URL',
      type: 'url',
    };
  }

  // Check for legacy product ID formats (strict validation)
  const legacyPattern = /^[A-Z]{2,4}-[A-Z0-9]{3,}-[A-Z0-9]{3,}$/i;
  if (legacyPattern.test(trimmedData)) {
    return {
      valid: true,
      productId: trimmedData.toUpperCase(),
      type: 'product_id',
    };
  }

  // Check if it might be a JSON object with product data
  try {
    const parsed = JSON.parse(trimmedData);
    if (parsed.productId && typeof parsed.productId === 'string') {
      const productValidation = validateQRCode(parsed.productId);
      if (productValidation.valid) {
        return {
          valid: true,
          productId: productValidation.productId,
          type: 'text',
        };
      }
    }
  } catch {
    // Not JSON, continue with other checks
  }

  return {
    valid: false,
    error: 'QR code does not contain a valid product ID',
    type: 'text',
  };
}

/**
 * Extracts product data from QR code content.
 *
 * @param data - Raw QR code data
 * @returns Extracted product data or null if invalid
 *
 * @example
 * ```typescript
 * const productData = extractProductData('https://app.chaintrace.com/verify/CT-2024-123-ABC123');
 * console.log(productData?.productId); // 'CT-2024-123-ABC123'
 * ```
 */
export function extractProductData(data: string): ProductQRData | null {
  const validation = validateQRCode(data);

  if (!validation.valid || !validation.productId) {
    return null;
  }

  const productData: ProductQRData = {
    productId: validation.productId,
  };

  // If it's a URL, extract additional information
  if (validation.type === 'url') {
    try {
      const url = new URL(data);
      productData.verificationUrl = data;

      // Extract batch ID if present in query parameters
      const batchId = url.searchParams.get('batch');
      if (batchId) {
        productData.batchId = batchId;
      }

      // Extract any other metadata from query parameters
      const metadata: Record<string, any> = {};
      url.searchParams.forEach((value, key) => {
        if (key !== 'batch') {
          metadata[key] = value;
        }
      });

      if (Object.keys(metadata).length > 0) {
        productData.metadata = metadata;
      }
    } catch {
      // Invalid URL, but we still have the product ID
    }
  }

  // If it's JSON data, extract additional fields
  if (validation.type === 'text') {
    try {
      const parsed = JSON.parse(data);
      if (parsed.batchId) {
        productData.batchId = parsed.batchId;
      }
      if (parsed.metadata) {
        productData.metadata = parsed.metadata;
      }
    } catch {
      // Not JSON or invalid JSON
    }
  }

  return productData;
}

/**
 * Creates a QR scan result object from raw scan data.
 *
 * @param data - Raw scanned data
 * @param format - Detected QR code format
 * @returns Formatted scan result
 *
 * @example
 * ```typescript
 * const result = createScanResult('CT-2024-123-ABC123', 'QR_CODE');
 * console.log(result.isValid); // true
 * ```
 */
export function createScanResult(data: string, format?: string): QRScanResult {
  const validation = validateQRCode(data);

  return {
    data,
    timestamp: new Date(),
    isValid: validation.valid,
    productId: validation.productId,
    format,
  };
}

/**
 * Checks if the browser supports camera access for QR scanning.
 *
 * @returns Promise resolving to camera support status
 *
 * @example
 * ```typescript
 * const supported = await isCameraScanningSupported();
 * if (supported) {
 *   // Show QR scanner option
 * }
 * ```
 */
export async function isCameraScanningSupported(): Promise<boolean> {
  try {
    // Check if MediaDevices API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return false;
    }

    // Check if camera devices are available
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasCamera = devices.some(device => device.kind === 'videoinput');

    return hasCamera;
  } catch {
    return false;
  }
}

/**
 * Generates a verification URL for a product ID.
 *
 * @param productId - Product ID to generate URL for
 * @param baseUrl - Base URL for the application
 * @param options - Additional URL options
 * @returns Complete verification URL
 *
 * @example
 * ```typescript
 * const url = generateVerificationUrl('CT-2024-123-ABC123', 'https://app.chaintrace.com');
 * console.log(url); // 'https://app.chaintrace.com/verify/CT-2024-123-ABC123'
 * ```
 */
export function generateVerificationUrl(
  productId: string,
  baseUrl: string = '',
  options: {
    batchId?: string;
    metadata?: Record<string, string>;
  } = {}
): string {
  // Handle empty base URL case
  const fullUrl = baseUrl ? `${baseUrl}/verify/${productId}` : `/verify/${productId}`;

  // Only use URL constructor if we have a full URL with protocol
  if (baseUrl && (baseUrl.startsWith('http://') || baseUrl.startsWith('https://'))) {
    const url = new URL(fullUrl);

    if (options.batchId) {
      url.searchParams.set('batch', options.batchId);
    }

    if (options.metadata) {
      Object.entries(options.metadata).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    return url.toString();
  } else {
    // Build URL manually for relative paths
    const params = new URLSearchParams();

    if (options.batchId) {
      params.set('batch', options.batchId);
    }

    if (options.metadata) {
      Object.entries(options.metadata).forEach(([key, value]) => {
        params.set(key, value);
      });
    }

    const queryString = params.toString();
    return queryString ? `${fullUrl}?${queryString}` : fullUrl;
  }
}

/**
 * Formats QR scanner error messages for user display.
 *
 * @param error - Error from QR scanner
 * @returns User-friendly error message
 *
 * @example
 * ```typescript
 * const message = formatScannerError(new Error('Camera access denied'));
 * console.log(message); // 'Camera access is required for QR scanning'
 * ```
 */
export function formatScannerError(error: Error | string): string {
  const message = typeof error === 'string' ? error : error.message;

  if (message.includes('Permission denied') || message.includes('access denied')) {
    return 'Camera access is required for QR scanning. Please enable camera permissions and try again.';
  }

  if (message.includes('NotFoundError') || message.includes('no camera')) {
    return 'No camera found on this device. Please use a device with a camera for QR scanning.';
  }

  if (message.includes('NotSupportedError') || message.includes('not supported')) {
    return 'QR scanning is not supported in this browser. Please try a different browser or enter the product ID manually.';
  }

  if (message.includes('timeout')) {
    return 'QR scanning timed out. Please try scanning again or enter the product ID manually.';
  }

  if (message.includes('invalid') || message.includes('format')) {
    return 'Invalid QR code format. Please scan a valid ChainTrace product QR code.';
  }

  return 'QR scanning failed. Please try again or enter the product ID manually.';
}