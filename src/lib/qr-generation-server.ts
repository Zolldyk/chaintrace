/**
 * Server-only QR code utilities that require Node.js crypto operations
 *
 * This module contains QR generation functions that depend on Node.js crypto
 * and should only be used on the server side to avoid build-time bundling issues.
 *
 * @since 2.4.0
 */

import type { QRCodeOptions, QRCodeFormat } from '../types/qr';

/**
 * Gets file extension for a given format (crypto-free version)
 */
function getFileExtension(format: QRCodeFormat): string {
  return format === 'jpeg' ? 'jpg' : format;
}

/**
 * Generates filename for a QR code (server-only, uses simple hash instead of crypto)
 *
 * This is a server-side version that can safely use crypto operations
 * without causing build-time issues.
 *
 * @param {string} productId - Product ID
 * @param {QRCodeOptions} options - QR code options (must include format)
 * @param {string} prefix - Optional filename prefix
 * @returns {string} Generated filename
 * @since 2.4.0
 */
export function generateQRFilenameServer(
  productId: string,
  options: QRCodeOptions & { format: QRCodeFormat }, // Ensure format is provided
  prefix: string = 'qr'
): string {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const extension = getFileExtension(options.format);
  const size = options.size || 256;

  return `${prefix}-${productId}-${size}x${size}-${timestamp}.${extension}`;
}

/**
 * Generates a storage key for QR codes (server-only)
 *
 * Uses a simple deterministic hash instead of crypto to avoid bundling issues
 * but provides server-side functionality when needed.
 */
export function generateStorageKeyServer(
  productId: string,
  format: string
): string {
  const timestamp = Date.now();
  // Simple hash function instead of crypto-based Buffer
  let hash = 0;
  for (let i = 0; i < productId.length; i++) {
    const char = productId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const base64Hash = Buffer.from(Math.abs(hash).toString()).toString(
    'base64url'
  );
  return `qr-codes/${productId}/${base64Hash}-${timestamp}.${format}`;
}
