/**
 * QR code scanning related type definitions.
 *
 * @since 1.0.0
 */

/**
 * QR Scanner configuration options
 */
export interface QRScannerConfig {
  /** Enable torch/flashlight functionality */
  enableTorch?: boolean;

  /** Scanning timeout in milliseconds */
  timeout?: number;

  /** Preferred video constraints */
  videoConstraints?: MediaTrackConstraints;

  /** Whether to try harder for QR detection (may be slower) */
  tryHarder?: boolean;
}

/**
 * QR Scanner state interface
 */
export interface QRScannerState {
  /** Camera permission status */
  hasPermission: boolean | null;

  /** Whether scanner is actively scanning */
  isScanning: boolean;

  /** Whether torch is supported on device */
  torchSupported: boolean;

  /** Whether torch is currently enabled */
  torchEnabled: boolean;

  /** Current error message, if any */
  error: string | null;
}

/**
 * QR Scan result interface
 */
export interface QRScanResult {
  /** Raw scanned data */
  data: string;

  /** Timestamp when scan completed */
  timestamp: Date;

  /** Whether the scan result is a valid product ID */
  isValid: boolean;

  /** Extracted product ID if applicable */
  productId?: string;

  /** QR code format detected */
  format?: string;
}

/**
 * QR Scanner error types
 */
export enum QRScannerErrorType {
  CAMERA_ACCESS_DENIED = 'CAMERA_ACCESS_DENIED',
  NO_CAMERA_FOUND = 'NO_CAMERA_FOUND',
  BROWSER_NOT_SUPPORTED = 'BROWSER_NOT_SUPPORTED',
  SCANNING_TIMEOUT = 'SCANNING_TIMEOUT',
  INVALID_QR_FORMAT = 'INVALID_QR_FORMAT',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * QR Scanner error interface
 */
export interface QRScannerError {
  /** Error type */
  type: QRScannerErrorType;

  /** Human-readable error message */
  message: string;

  /** Original error object if available */
  originalError?: Error;

  /** Whether error is recoverable */
  recoverable: boolean;
}

/**
 * Camera capabilities interface
 */
export interface CameraCapabilities {
  /** Whether camera is available */
  available: boolean;

  /** Whether torch is supported */
  torchSupported: boolean;

  /** Whether facing mode selection is supported */
  facingModeSupported: boolean;

  /** Available video resolutions */
  resolutions: Array<{
    width: number;
    height: number;
  }>;
}

/**
 * QR Code format validation result
 */
export interface QRValidationResult {
  /** Whether the QR code data is valid */
  valid: boolean;

  /** Extracted product ID if valid */
  productId?: string;

  /** Error message if invalid */
  error?: string;

  /** Detected QR code type (URL, raw text, etc.) */
  type: 'url' | 'product_id' | 'text' | 'unknown';
}

/**
 * QR Scanner event handlers
 */
export interface QRScannerEvents {
  /** Called when QR code is successfully scanned */
  onScan?: (result: QRScanResult) => void;

  /** Called when scanning error occurs */
  onError?: (error: QRScannerError) => void;

  /** Called when scanner is closed/stopped */
  onClose?: () => void;

  /** Called when camera permission state changes */
  onPermissionChange?: (granted: boolean) => void;

  /** Called when torch state changes */
  onTorchChange?: (enabled: boolean) => void;
}

/**
 * Product QR code data structure
 */
export interface ProductQRData {
  /** Product ID */
  productId: string;

  /** Verification URL */
  verificationUrl?: string;

  /** Batch ID if applicable */
  batchId?: string;

  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * QR Code generation options
 */
export interface QRCodeGenerationOptions {
  /** QR code size in pixels */
  size?: number;

  /** Error correction level */
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';

  /** Margin around QR code */
  margin?: number;

  /** Quiet zone around QR code */
  quietZone?: number;

  /** QR code color */
  color?: {
    dark?: string;
    light?: string;
  };

  /** Include logo in center */
  logo?: {
    src: string;
    width?: number;
    height?: number;
  };
}

/**
 * Legacy QR Code options (for backward compatibility)
 */
export interface QRCodeOptions extends QRCodeGenerationOptions {
  /** Output format for generated QR code */
  format: QRCodeFormat;

  /** Image quality for JPEG format (0-1) */
  quality?: number;

  /** Verification path for URL generation */
  verificationPath?: string;
}

/**
 * QR Code generation result
 */
export interface QRCodeResult {
  /** Generated QR code data URL */
  dataUrl?: string;

  /** Raw binary/base64 data for download */
  data: string;

  /** Raw SVG content */
  svg?: string;

  /** QR code size */
  size: number;

  /** Product ID encoded */
  productId: string;

  /** Generation timestamp */
  timestamp: Date;

  /** Error correction level used */
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';

  /** Output format used */
  format: QRCodeFormat;

  /** Whether generation was successful */
  success?: boolean;

  /** Error message if generation failed */
  error?: string;

  /** File name for download */
  filename: string;

  /** QR code dimensions */
  dimensions: {
    width: number;
    height: number;
  };

  /** MIME type of the generated image */
  mimeType: string;

  /** Additional metadata */
  metadata: Record<string, any>;

  /** Encoded data for internal use */
  encodedData: string;
}

/**
 * QR Code format types
 */
export type QRCodeFormat = 'PNG' | 'SVG' | 'JPEG' | 'WebP';

/**
 * Batch QR code generation request
 */
export interface QRCodeBatchRequest {
  /** Product IDs to generate QR codes for */
  productIds: string[];

  /** QR code generation options */
  options?: QRCodeOptions;

  /** Output format */
  format?: QRCodeFormat;

  /** Batch identifier */
  batchId?: string;

  /** Filename prefix for generated files */
  filenamePrefix?: string;

  /** Whether to include metadata */
  includeMetadata?: boolean;
}

/**
 * Batch QR code generation result
 */
export interface QRCodeBatchResult {
  /** Generated QR codes */
  qrCodes: QRCodeResult[];

  /** Batch metadata */
  batchId: string;

  /** Generation timestamp */
  timestamp: Date;

  /** Total codes generated */
  totalGenerated: number;

  /** Failed generations */
  failures: Array<{
    productId: string;
    error: string;
  }>;

  /** Success rate */
  successRate: number;

  /** Batch processing results */
  results: Array<{
    productId: string;
    qrCode: QRCodeResult;
    success: boolean;
  }>;

  /** Batch processing errors */
  errors: Array<{
    productId: string;
    error: string;
  }>;

  /** Batch metadata */
  batchMetadata: {
    totalGenerated: number;
    successCount: number;
    failureCount: number;
    processingTime: number;
    timestamp: Date;
  };
}

/**
 * QR Code verification result
 */
export interface QRCodeVerification {
  /** Whether QR code is valid */
  valid: boolean;

  /** Whether QR code is valid (alias for backward compatibility) */
  isValid?: boolean;

  /** Verified product ID */
  productId?: string;

  /** Verification timestamp */
  verifiedAt: Date;

  /** Error message if invalid */
  error?: string;

  /** Error messages (array for backward compatibility) */
  errors: string[];

  /** Security metadata */
  security?: {
    tampered: boolean;
    originalChecksum?: string;
    currentChecksum?: string;
  };
}

/**
 * QR Code URL configuration
 */
export interface QRCodeUrlConfig {
  /** Base URL for verification */
  baseUrl: string;

  /** Additional query parameters */
  queryParams?: Record<string, string>;

  /** URL scheme (http/https) */
  scheme?: 'http' | 'https';

  /** Whether to include batch information */
  includeBatch?: boolean;

  /** Verification path for URL generation */
  verificationPath?: string;

  /** Whether to include tracking parameters */
  includeTracking?: boolean;

  /** Custom parameters to add to URL */
  customParams?: Record<string, string>;
}

/**
 * QR Code error interface
 */
export interface QRCodeError {
  /** Error code */
  code: string;

  /** Error message */
  message: string;

  /** Error details */
  details?: any;

  /** Whether error is recoverable */
  recoverable: boolean;
}

/**
 * QR Code error class implementation
 */
export class QRCodeError extends Error implements QRCodeError {
  public code: string;
  public details?: any;
  public recoverable: boolean;

  constructor(code: string, message: string, details?: any, recoverable: boolean = false) {
    super(message);
    this.name = 'QRCodeError';
    this.code = code;
    this.details = details;
    this.recoverable = recoverable;
  }
}

/**
 * QR Code storage configuration
 */
export interface QRCodeStorage {
  /** Storage provider */
  provider: 'local' | 'vercel-blob' | 's3' | 'cloudinary';

  /** Storage configuration */
  config?: Record<string, any>;

  /** File naming pattern */
  filePattern?: string;

  /** Whether to store metadata */
  includeMetadata?: boolean;

  /** Public URL for accessing the stored QR code */
  url?: string;

  /** Storage key for the QR code */
  key?: string;

  /** Upload timestamp */
  uploadedAt?: Date;

  /** Additional metadata */
  metadata?: Record<string, any>;
}