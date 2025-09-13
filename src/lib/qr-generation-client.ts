/**
 * Client-safe QR code generation utilities for ChainTrace application.
 *
 * This is a subset of qr-generation.ts that doesn't depend on Node.js crypto
 * for client-side usage during build time.
 *
 * @since 2.4.0
 */

import QRCode from 'qrcode';

/**
 * QR code generation options
 */
export interface QRCodeOptions {
  /** QR code format */
  format: 'png' | 'svg' | 'utf8';
  /** Error correction level */
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  /** QR code size in pixels */
  width?: number;
  /** Background color */
  color?: {
    dark?: string;
    light?: string;
  };
}

/**
 * QR code generation result
 */
export interface QRCodeResult {
  /** Generated QR code data */
  data: string;
  /** Format of the generated QR code */
  format: string;
  /** Generation timestamp */
  timestamp: Date;
  /** Source URL that was encoded */
  sourceUrl: string;
}

/**
 * Generate QR code for product verification URL (client-safe version)
 *
 * @param baseUrl - Base URL for verification
 * @param productId - Product ID to encode (assumed valid)
 * @param options - QR code options
 * @returns Promise resolving to QR code result
 */
export async function generateProductQR(
  baseUrl: string,
  productId: string,
  options: QRCodeOptions = { format: 'png' }
): Promise<QRCodeResult> {
  const verificationUrl = `${baseUrl}/verify/${encodeURIComponent(productId)}`;

  const qrOptions = {
    errorCorrectionLevel: options.errorCorrectionLevel || ('M' as const),
    width: options.width || 200,
    color: {
      dark: options.color?.dark || '#000000',
      light: options.color?.light || '#FFFFFF',
    },
  };

  let data: string;

  switch (options.format) {
    case 'svg':
      data = await QRCode.toString(verificationUrl, {
        type: 'svg',
        ...qrOptions,
      });
      break;
    case 'utf8':
      data = await QRCode.toString(verificationUrl, {
        type: 'utf8',
        ...qrOptions,
      });
      break;
    case 'png':
    default:
      data = await QRCode.toDataURL(verificationUrl, {
        type: 'image/png',
        ...qrOptions,
      });
      break;
  }

  return {
    data,
    format: options.format,
    timestamp: new Date(),
    sourceUrl: verificationUrl,
  };
}

/**
 * Basic product ID format validation (client-safe)
 * Simple regex-based validation without crypto dependencies
 */
export function validateProductIdFormat(productId: string): boolean {
  // Basic CT-YYYY-XXX-ABCDEF format validation
  const pattern = /^CT-\d{4}-\d{3}-[A-F0-9]{6}$/;
  return pattern.test(productId);
}
