/**
 * QR Code types and interfaces for ChainTrace application
 *
 * Provides comprehensive type definitions for QR code generation,
 * storage, and verification workflows.
 *
 * @since 2.4.0
 */

/**
 * Supported QR code output formats for download and printing
 */
export type QRCodeFormat = 'png' | 'svg' | 'jpeg' | 'webp';

/**
 * QR code error correction levels
 * Higher levels provide better error tolerance but larger code size
 */
export type QRCodeErrorLevel = 'L' | 'M' | 'Q' | 'H';

/**
 * QR code generation options for customization
 *
 * @interface QRCodeOptions
 * @since 2.4.0
 */
export interface QRCodeOptions {
  /** Output format for the QR code */
  format: QRCodeFormat;

  /** Size of the QR code in pixels (for raster formats) */
  size?: number;

  /** Error correction level */
  errorCorrectionLevel?: QRCodeErrorLevel;

  /** Margin around the QR code */
  margin?: number;

  /** Color configuration */
  color?: {
    /** Foreground (dark) color */
    dark?: string;
    /** Background (light) color */
    light?: string;
  };

  /** Quality for JPEG format (0-100) */
  quality?: number;

  /** Include quiet zone around the code */
  quietZone?: boolean;
}

/**
 * QR code generation result with metadata
 *
 * @interface QRCodeResult
 * @since 2.4.0
 */
export interface QRCodeResult {
  /** Generated QR code data (base64 or SVG string) */
  data: string;

  /** Format of the generated code */
  format: QRCodeFormat;

  /** Size information */
  dimensions: {
    width: number;
    height: number;
  };

  /** Generation timestamp */
  timestamp: Date;

  /** File size in bytes */
  size: number;

  /** MIME type for the format */
  mimeType: string;

  /** Original input data that was encoded */
  encodedData: string;

  /** Generation metadata */
  metadata: {
    /** Error correction level used */
    errorLevel: QRCodeErrorLevel;
    /** QR code version (size) */
    version: number;
    /** Data mode used */
    mode: string;
  };
}

/**
 * Bulk QR code generation request
 *
 * @interface QRCodeBatchRequest
 * @since 2.4.0
 */
export interface QRCodeBatchRequest {
  /** Product IDs to generate QR codes for */
  productIds: string[];

  /** Generation options applied to all codes */
  options: QRCodeOptions;

  /** Optional prefix for generated file names */
  filenamePrefix?: string;

  /** Include individual metadata files */
  includeMetadata?: boolean;
}

/**
 * Bulk QR code generation result
 *
 * @interface QRCodeBatchResult
 * @since 2.4.0
 */
export interface QRCodeBatchResult {
  /** Individual QR code results */
  results: Array<{
    productId: string;
    qrCode: QRCodeResult;
    filename: string;
  }>;

  /** Overall batch metadata */
  batchMetadata: {
    /** Total number of codes generated */
    totalGenerated: number;
    /** Number of successful generations */
    successCount: number;
    /** Number of failed generations */
    failureCount: number;
    /** Batch processing time in milliseconds */
    processingTime: number;
    /** Batch generation timestamp */
    timestamp: Date;
  };

  /** Any errors encountered during batch processing */
  errors: Array<{
    productId: string;
    error: string;
    details?: Record<string, any>;
  }>;
}

/**
 * QR code storage information
 *
 * @interface QRCodeStorage
 * @since 2.4.0
 */
export interface QRCodeStorage {
  /** Storage provider (Vercel Blob, local, etc.) */
  provider: 'vercel-blob' | 'local' | 's3' | 'cloudinary';

  /** Storage URL or path */
  url: string;

  /** Storage key/identifier */
  key: string;

  /** Upload timestamp */
  uploadedAt: Date;

  /** Storage metadata */
  metadata: {
    /** File size in bytes */
    size: number;
    /** Content type */
    contentType: string;
    /** Storage region/location */
    region?: string;
    /** Expiry date (if applicable) */
    expiresAt?: Date;
  };
}

/**
 * QR code verification result
 *
 * @interface QRCodeVerification
 * @since 2.4.0
 */
export interface QRCodeVerification {
  /** Whether the QR code is valid */
  isValid: boolean;

  /** Decoded product ID */
  productId?: string;

  /** Verification timestamp */
  verifiedAt: Date;

  /** QR code format detected */
  detectedFormat?: QRCodeFormat;

  /** Verification errors (if any) */
  errors: string[];

  /** Additional verification metadata */
  metadata?: {
    /** QR code version detected */
    version: number;
    /** Error correction level */
    errorLevel: QRCodeErrorLevel;
    /** Data capacity used */
    dataCapacity: number;
  };
}

/**
 * Error types for QR code operations
 */
export type QRCodeErrorType =
  | 'INVALID_FORMAT'
  | 'GENERATION_FAILED'
  | 'INVALID_DATA'
  | 'SIZE_TOO_LARGE'
  | 'STORAGE_ERROR'
  | 'NETWORK_ERROR'
  | 'VALIDATION_FAILED'
  | 'UNKNOWN_ERROR';

/**
 * QR code operation error class
 */
export class QRCodeError extends Error {
  constructor(
    public code: QRCodeErrorType,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'QRCodeError';
  }
}

/**
 * QR code scanning/reading result
 *
 * @interface QRCodeScanResult
 * @since 2.4.0
 */
export interface QRCodeScanResult {
  /** Successfully decoded data */
  data: string;

  /** Detected QR code format */
  format: string;

  /** Scan timestamp */
  scannedAt: Date;

  /** Confidence level of the scan (0-100) */
  confidence: number;

  /** Additional scan metadata */
  metadata?: {
    /** QR code version */
    version: number;
    /** Error correction level */
    errorLevel: QRCodeErrorLevel;
    /** Scan source (camera, file, etc.) */
    source: 'camera' | 'file' | 'clipboard';
  };
}

/**
 * QR code verification URL configuration
 *
 * @interface QRCodeUrlConfig
 * @since 2.4.0
 */
export interface QRCodeUrlConfig {
  /** Base URL for verification pages */
  baseUrl: string;

  /** URL pattern for product verification */
  verificationPath: string;

  /** Include tracking parameters */
  includeTracking?: boolean;

  /** Custom URL parameters */
  customParams?: Record<string, string>;
}

/**
 * QR code print settings for physical output
 *
 * @interface QRCodePrintSettings
 * @since 2.4.0
 */
export interface QRCodePrintSettings {
  /** Print size in millimeters */
  printSize: {
    width: number;
    height: number;
  };

  /** Print resolution in DPI */
  dpi: number;

  /** Include product information text */
  includeText?: boolean;

  /** Print layout configuration */
  layout?: {
    /** Number of codes per page */
    codesPerPage: number;
    /** Page orientation */
    orientation: 'portrait' | 'landscape';
    /** Margin settings */
    margins: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
  };
}

/**
 * QR code analytics data
 *
 * @interface QRCodeAnalytics
 * @since 2.4.0
 */
export interface QRCodeAnalytics {
  /** Number of times the QR code was scanned */
  scanCount: number;

  /** First scan timestamp */
  firstScanned?: Date;

  /** Last scan timestamp */
  lastScanned?: Date;

  /** Geographic distribution of scans */
  scanLocations?: Array<{
    country: string;
    region: string;
    count: number;
  }>;

  /** Device types used for scanning */
  deviceTypes?: Array<{
    type: 'mobile' | 'tablet' | 'desktop';
    count: number;
  }>;

  /** Scanner applications used */
  scannerApps?: Array<{
    app: string;
    count: number;
  }>;
}
