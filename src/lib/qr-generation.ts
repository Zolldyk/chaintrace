/**
 * QR code generation utilities for ChainTrace application.
 *
 * Provides comprehensive QR code generation capabilities supporting multiple
 * formats (PNG, SVG), bulk operations, and integration with the product
 * verification system.
 *
 * @since 2.4.0
 */

import QRCode from 'qrcode';
import { validateProductId } from './product-id-generation';
import {
  type QRCodeOptions,
  type QRCodeResult,
  type QRCodeBatchRequest,
  type QRCodeBatchResult,
  type QRCodeVerification,
  type QRCodeUrlConfig,
  QRCodeError,
  type QRCodeFormat,
} from '../types/qr';

/**
 * Default QR code generation options
 */
const DEFAULT_QR_OPTIONS: Required<Omit<QRCodeOptions, 'format'>> = {
  size: 256,
  errorCorrectionLevel: 'M',
  margin: 2,
  color: {
    dark: '#000000',
    light: '#ffffff',
  },
  quality: 85,
  quietZone: true,
};

/**
 * Maximum sizes for different formats to prevent memory issues
 */
const MAX_SIZES: Record<QRCodeFormat, number> = {
  png: 2048,
  svg: 4096,
  jpeg: 2048,
  webp: 2048,
};

/**
 * MIME types for different QR code formats
 */
const MIME_TYPES: Record<QRCodeFormat, string> = {
  png: 'image/png',
  svg: 'image/svg+xml',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

/**
 * Default verification URL configuration
 */
const DEFAULT_URL_CONFIG: QRCodeUrlConfig = {
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://chaintrace.app',
  verificationPath: '/verify',
  includeTracking: true,
  customParams: {},
};

/**
 * Validates QR code generation options
 *
 * @param {QRCodeOptions} options - Options to validate
 * @throws {QRCodeError} When options are invalid
 * @since 2.4.0
 */
function validateQROptions(options: QRCodeOptions): void {
  const { format, size, errorCorrectionLevel, margin, quality } = options;

  // Validate format
  if (!['png', 'svg', 'jpeg', 'webp'].includes(format)) {
    throw new QRCodeError('INVALID_FORMAT', `Unsupported format: ${format}`, {
      supportedFormats: ['png', 'svg', 'jpeg', 'webp'],
    });
  }

  // Validate size
  if (size && (size < 32 || size > MAX_SIZES[format])) {
    throw new QRCodeError(
      'SIZE_TOO_LARGE',
      `Size must be between 32 and ${MAX_SIZES[format]} pixels for ${format}`,
      { requestedSize: size, maxSize: MAX_SIZES[format] }
    );
  }

  // Validate error correction level
  if (
    errorCorrectionLevel &&
    !['L', 'M', 'Q', 'H'].includes(errorCorrectionLevel)
  ) {
    throw new QRCodeError(
      'INVALID_FORMAT',
      `Invalid error correction level: ${errorCorrectionLevel}`,
      { supportedLevels: ['L', 'M', 'Q', 'H'] }
    );
  }

  // Validate margin
  if (margin && (margin < 0 || margin > 10)) {
    throw new QRCodeError('INVALID_FORMAT', 'Margin must be between 0 and 10', {
      requestedMargin: margin,
    });
  }

  // Validate JPEG quality
  if (format === 'jpeg' && quality && (quality < 1 || quality > 100)) {
    throw new QRCodeError(
      'INVALID_FORMAT',
      'JPEG quality must be between 1 and 100',
      { requestedQuality: quality }
    );
  }
}

/**
 * Constructs verification URL for a product ID
 *
 * @param {string} productId - Product ID to create URL for
 * @param {QRCodeUrlConfig} config - URL configuration
 * @returns {string} Complete verification URL
 * @since 2.4.0
 */
function buildVerificationUrl(
  productId: string,
  config: QRCodeUrlConfig = DEFAULT_URL_CONFIG
): string {
  const { baseUrl, verificationPath, includeTracking, customParams } = config;

  // Construct base URL
  const url = new URL(
    `${verificationPath}/${encodeURIComponent(productId)}`,
    baseUrl
  );

  // Add tracking parameters
  if (includeTracking) {
    url.searchParams.set('source', 'qr');
    url.searchParams.set('timestamp', Date.now().toString());
  }

  // Add custom parameters
  if (customParams) {
    Object.entries(customParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return url.toString();
}

/**
 * Gets file extension for a given format
 *
 * @param {QRCodeFormat} format - QR code format
 * @returns {string} File extension
 * @since 2.4.0
 */
function getFileExtension(format: QRCodeFormat): string {
  return format === 'jpeg' ? 'jpg' : format;
}

/**
 * Calculates approximate file size for QR code
 *
 * @param {QRCodeFormat} format - QR code format
 * @param {number} size - QR code size
 * @returns {number} Estimated size in bytes
 * @since 2.4.0
 */
function estimateFileSize(format: QRCodeFormat, size: number): number {
  const pixelCount = size * size;

  switch (format) {
    case 'png':
      return Math.round(pixelCount * 0.5); // PNG compression estimate
    case 'jpeg':
      return Math.round(pixelCount * 0.1); // JPEG compression estimate
    case 'webp':
      return Math.round(pixelCount * 0.08); // WebP compression estimate
    case 'svg':
      return Math.round(size * 50); // SVG is size-independent, rough estimate
    default:
      return pixelCount;
  }
}

/**
 * Generates a QR code for a product ID with comprehensive options and validation.
 *
 * Creates minimal QR codes containing only the product verification URL for
 * optimal scanning reliability. Supports multiple output formats and includes
 * comprehensive metadata for tracking and debugging.
 *
 * @param {string} productId - Product ID to encode in QR code
 * @param {QRCodeOptions} options - Generation options
 * @param {QRCodeUrlConfig} urlConfig - URL configuration for verification
 *
 * @returns {Promise<QRCodeResult>} Generation result with metadata
 *
 * @throws {QRCodeError} When generation fails or validation errors occur
 *
 * @example
 * ```typescript
 * // Basic PNG QR code
 * const pngResult = await generateProductQRCode('CT-2024-123-ABC123', {
 *   format: 'png',
 *   size: 256
 * });
 *
 * // High-quality SVG for printing
 * const svgResult = await generateProductQRCode('CT-2024-123-ABC123', {
 *   format: 'svg',
 *   size: 512,
 *   errorCorrectionLevel: 'H'
 * });
 *
 * // Custom colors and branding
 * const brandedResult = await generateProductQRCode('CT-2024-123-ABC123', {
 *   format: 'png',
 *   size: 300,
 *   color: {
 *     dark: '#2563eb', // ChainTrace blue
 *     light: '#ffffff'
 *   }
 * });
 * ```
 *
 * @since 2.4.0
 * @see {@link generateProductQRCodeBatch} for bulk operations
 * @see {@link validateQRCode} for QR code validation
 */
export async function generateProductQRCode(
  productId: string,
  options: QRCodeOptions,
  urlConfig?: QRCodeUrlConfig
): Promise<QRCodeResult> {
  const startTime = Date.now();

  try {
    // Validate product ID format
    const validation = validateProductId(productId);
    if (!validation.isValid) {
      throw new QRCodeError(
        'INVALID_DATA',
        `Invalid product ID format: ${productId}`,
        { productId, validationErrors: validation.errors }
      );
    }

    // Validate QR options
    validateQROptions(options);

    // Merge with defaults
    const finalOptions = { ...DEFAULT_QR_OPTIONS, ...options };
    const config = { ...DEFAULT_URL_CONFIG, ...urlConfig };

    // Build verification URL (minimal data for scanning reliability)
    const verificationUrl = buildVerificationUrl(productId, config);

    // Configure QRCode library options
    const qrOptions = {
      errorCorrectionLevel: finalOptions.errorCorrectionLevel,
      type: options.format === 'svg' ? 'svg' : 'image/png',
      quality: finalOptions.quality / 100,
      margin: finalOptions.margin,
      color: finalOptions.color,
      width: finalOptions.size,
      ...(finalOptions.quietZone && { quiet: finalOptions.margin }),
    };

    // Generate QR code based on format
    let qrData: string;
    let actualMimeType: string;

    if (options.format === 'svg') {
      qrData = await QRCode.toString(verificationUrl, {
        ...qrOptions,
        type: 'svg',
        width: finalOptions.size,
      });
      actualMimeType = MIME_TYPES.svg;
    } else {
      // Generate as data URL for raster formats
      qrData = await QRCode.toDataURL(verificationUrl, {
        ...qrOptions,
        type: `image/${options.format}` as any,
      });
      actualMimeType = MIME_TYPES[options.format];
    }

    // Calculate actual dimensions
    const dimensions = {
      width: finalOptions.size,
      height: finalOptions.size,
    };

    // Estimate file size
    const estimatedSize = estimateFileSize(options.format, finalOptions.size);

    // Extract QR code metadata (simulated - in real implementation would parse actual QR)
    const metadata = {
      errorLevel: finalOptions.errorCorrectionLevel,
      version: Math.ceil(verificationUrl.length / 25), // Rough approximation
      mode: 'alphanumeric' as const,
    };

    const result: QRCodeResult = {
      data: qrData,
      format: options.format,
      dimensions,
      timestamp: new Date(),
      size: estimatedSize,
      mimeType: actualMimeType,
      encodedData: verificationUrl,
      metadata,
    };

    const processingTime = Date.now() - startTime;
    if (process.env.NODE_ENV === 'development') {
      /* eslint-disable-next-line no-console */
      console.log(`Generated QR code for ${productId} in ${processingTime}ms`);
    }

    return result;
  } catch (error) {
    if (error instanceof QRCodeError) {
      throw error;
    }

    // Handle QRCode library errors
    if (error instanceof Error) {
      throw new QRCodeError(
        'GENERATION_FAILED',
        `QR code generation failed: ${error.message}`,
        {
          productId,
          originalError: error.message,
          processingTime: Date.now() - startTime,
        }
      );
    }

    throw new QRCodeError(
      'UNKNOWN_ERROR',
      'Unexpected error during QR code generation',
      { productId }
    );
  }
}

/**
 * Generates QR codes for multiple product IDs in a single batch operation.
 *
 * Optimized for bulk operations with progress tracking, error handling,
 * and consistent naming conventions. Processes products concurrently
 * while respecting system resource limits.
 *
 * @param {QRCodeBatchRequest} request - Batch generation request
 * @param {QRCodeUrlConfig} urlConfig - URL configuration
 *
 * @returns {Promise<QRCodeBatchResult>} Batch generation results
 *
 * @throws {QRCodeError} When batch validation fails
 *
 * @example
 * ```typescript
 * const batchRequest: QRCodeBatchRequest = {
 *   productIds: ['CT-2024-001-ABC123', 'CT-2024-002-DEF456'],
 *   options: {
 *     format: 'png',
 *     size: 256,
 *     errorCorrectionLevel: 'M'
 *   },
 *   filenamePrefix: 'batch-001',
 *   includeMetadata: true
 * };
 *
 * const results = await generateProductQRCodeBatch(batchRequest);
 * // Log batch generation results if needed
 * ```
 *
 * @since 2.4.0
 */
export async function generateProductQRCodeBatch(
  request: QRCodeBatchRequest,
  urlConfig?: QRCodeUrlConfig
): Promise<QRCodeBatchResult> {
  const startTime = Date.now();

  // Validate batch request
  if (!request.productIds?.length) {
    throw new QRCodeError(
      'INVALID_DATA',
      'Batch request must contain at least one product ID',
      { request }
    );
  }

  if (request.productIds.length > 100) {
    throw new QRCodeError(
      'SIZE_TOO_LARGE',
      'Batch size cannot exceed 100 products',
      { requestedCount: request.productIds.length, maxCount: 100 }
    );
  }

  const results: QRCodeBatchResult['results'] = [];
  const errors: QRCodeBatchResult['errors'] = [];
  const { filenamePrefix = 'qr' } = request;

  // Process all products sequentially for simpler indexing
  for (let i = 0; i < request.productIds.length; i++) {
    const productId = request.productIds[i];
    try {
      const qrCode = await generateProductQRCode(
        productId,
        request.options,
        urlConfig
      );
      const filename = `${filenamePrefix}-${productId}-${i + 1}.${getFileExtension(request.options.format)}`;

      results.push({
        productId,
        qrCode,
        filename,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorDetails =
        error instanceof QRCodeError ? error.details : undefined;

      errors.push({
        productId,
        error: errorMessage,
        details: errorDetails,
      });
    }
  }

  const processingTime = Date.now() - startTime;

  const batchResult: QRCodeBatchResult = {
    results,
    batchMetadata: {
      totalGenerated: request.productIds.length,
      successCount: results.length,
      failureCount: errors.length,
      processingTime,
      timestamp: new Date(),
    },
    errors,
  };

  return batchResult;
}

/**
 * Validates and verifies a QR code data string.
 *
 * Performs comprehensive validation including format checking,
 * product ID extraction, and URL verification.
 *
 * @param {string} qrData - QR code data to validate
 * @param {QRCodeUrlConfig} urlConfig - Expected URL configuration
 *
 * @returns {QRCodeVerification} Validation result
 *
 * @example
 * ```typescript
 * const verification = validateQRCode('https://chaintrace.app/verify/CT-2024-123-ABC123?source=qr');
 *
 * if (verification.isValid) {
 *   // Access product ID from verification result
 * } else {
 *   // Handle QR code errors appropriately
 * }
 * ```
 *
 * @since 2.4.0
 */
export function validateQRCode(
  qrData: string,
  urlConfig: QRCodeUrlConfig = DEFAULT_URL_CONFIG
): QRCodeVerification {
  const verification: QRCodeVerification = {
    isValid: false,
    verifiedAt: new Date(),
    errors: [],
  };

  try {
    // Basic data validation
    if (!qrData || typeof qrData !== 'string') {
      verification.errors.push('QR code data is empty or invalid');
      return verification;
    }

    // Check if data is a valid URL
    let url: URL;
    try {
      url = new URL(qrData);
    } catch {
      verification.errors.push('QR code does not contain a valid URL');
      return verification;
    }

    // Validate base URL
    const expectedBase = new URL(urlConfig.baseUrl);
    if (url.hostname !== expectedBase.hostname) {
      verification.errors.push(
        `Invalid hostname: expected ${expectedBase.hostname}, got ${url.hostname}`
      );
    }

    // Extract product ID from path
    const pathPattern = new RegExp(`^${urlConfig.verificationPath}/(.+)$`);
    const pathMatch = url.pathname.match(pathPattern);

    if (!pathMatch) {
      verification.errors.push(`Invalid verification path: ${url.pathname}`);
      return verification;
    }

    const productId = decodeURIComponent(pathMatch[1]);
    verification.productId = productId;

    // Validate product ID format
    const idValidation = validateProductId(productId);
    if (!idValidation.isValid) {
      verification.errors.push(...idValidation.errors);
    }

    // Check for required tracking parameters (if configured)
    if (urlConfig.includeTracking) {
      if (!url.searchParams.has('source')) {
        verification.errors.push('Missing required tracking parameter: source');
      } else if (url.searchParams.get('source') !== 'qr') {
        verification.errors.push('Invalid tracking source parameter');
      }
    }

    // Validation successful if no errors
    verification.isValid = verification.errors.length === 0;

    return verification;
  } catch (error) {
    verification.errors.push(
      `Unexpected validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return verification;
  }
}

/**
 * Extracts product ID from QR code data URL.
 *
 * Convenience function for quickly extracting product ID from
 * QR code verification URLs without full validation.
 *
 * @param {string} qrData - QR code data string
 * @returns {string | null} Product ID if found, null otherwise
 *
 * @example
 * ```typescript
 * const productId = extractProductIdFromQR('https://chaintrace.app/verify/CT-2024-123-ABC123');
 * // productId: 'CT-2024-123-ABC123'
 * ```
 *
 * @since 2.4.0
 */
export function extractProductIdFromQR(qrData: string): string | null {
  try {
    const url = new URL(qrData);
    const pathMatch = url.pathname.match(/\/verify\/(.+)$/);
    return pathMatch ? decodeURIComponent(pathMatch[1]) : null;
  } catch {
    return null;
  }
}

/**
 * Gets default QR code options for different use cases.
 *
 * Provides pre-configured option sets optimized for common scenarios
 * like web display, printing, or mobile scanning.
 *
 * @param {'web' | 'print' | 'mobile'} preset - Use case preset
 * @returns {QRCodeOptions} Optimized options for the use case
 *
 * @example
 * ```typescript
 * // Web display optimization
 * const webOptions = getDefaultQROptions('web');
 *
 * // High-quality printing
 * const printOptions = getDefaultQROptions('print');
 *
 * // Mobile scanning optimization
 * const mobileOptions = getDefaultQROptions('mobile');
 * ```
 *
 * @since 2.4.0
 */
export function getDefaultQROptions(
  preset: 'web' | 'print' | 'mobile'
): QRCodeOptions {
  const baseOptions = { ...DEFAULT_QR_OPTIONS };

  switch (preset) {
    case 'web':
      return {
        ...baseOptions,
        format: 'png',
        size: 200,
        errorCorrectionLevel: 'M',
      };

    case 'print':
      return {
        ...baseOptions,
        format: 'svg',
        size: 512,
        errorCorrectionLevel: 'H', // Higher error correction for print
        margin: 4, // Larger margin for print reliability
      };

    case 'mobile':
      return {
        ...baseOptions,
        format: 'png',
        size: 256,
        errorCorrectionLevel: 'L', // Lower correction for faster scanning
        margin: 1, // Smaller margin for compact display
      };

    default:
      return { ...baseOptions, format: 'png' };
  }
}

/**
 * Generates filename for a QR code based on product ID and options.
 *
 * Creates consistent, SEO-friendly filenames for QR code downloads
 * and storage operations.
 *
 * @param {string} productId - Product ID
 * @param {QRCodeOptions} options - QR code options
 * @param {string} prefix - Optional filename prefix
 * @returns {string} Generated filename
 *
 * @since 2.4.0
 */
export function generateQRFilename(
  productId: string,
  options: QRCodeOptions,
  prefix: string = 'qr'
): string {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const extension = getFileExtension(options.format);
  const size = options.size || DEFAULT_QR_OPTIONS.size;

  return `${prefix}-${productId}-${size}x${size}-${timestamp}.${extension}`;
}
