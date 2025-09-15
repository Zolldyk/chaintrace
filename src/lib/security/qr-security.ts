/**
 * QR Code Security Utilities
 *
 * Provides comprehensive security validation for QR code generation,
 * content verification, and malicious payload detection.
 *
 * @since 2.4.0
 */

import type { QRCodeResult, QRCodeOptions } from '../../types/qr';

/**
 * Security validation error types
 */
export type QRSecurityErrorCode =
  | 'INVALID_URL'
  | 'MALICIOUS_CONTENT'
  | 'SIZE_LIMIT_EXCEEDED'
  | 'FORMAT_NOT_ALLOWED'
  | 'CONTENT_TOO_COMPLEX'
  | 'SUSPICIOUS_PATTERN';

/**
 * QR code security validation error
 */
export class QRSecurityError extends Error {
  constructor(
    public code: QRSecurityErrorCode,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'QRSecurityError';
  }
}

/**
 * Security validation result
 */
export interface QRSecurityValidation {
  isValid: boolean;
  errors: Array<{
    code: QRSecurityErrorCode;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  riskScore: number; // 0-100, higher = more risky
  recommendations?: string[];
}

/**
 * Security configuration for QR code validation
 */
export interface QRSecurityConfig {
  /** Maximum allowed QR code data size in bytes */
  maxDataSize: number;

  /** Allowed QR code formats */
  allowedFormats: string[];

  /** Maximum URL length for verification URLs */
  maxUrlLength: number;

  /** Allowed domains for verification URLs */
  allowedDomains: string[];

  /** Enable suspicious pattern detection */
  enablePatternDetection: boolean;

  /** Maximum complexity score for QR content */
  maxComplexityScore: number;
}

/**
 * Default security configuration
 */
const DEFAULT_SECURITY_CONFIG: QRSecurityConfig = {
  maxDataSize: 2048, // 2KB max data
  allowedFormats: ['png', 'svg', 'jpeg', 'webp'],
  maxUrlLength: 512,
  allowedDomains: ['chaintrace.app', 'localhost'],
  enablePatternDetection: true,
  maxComplexityScore: 50,
};

/**
 * Known malicious patterns to detect in QR code content
 */
const MALICIOUS_PATTERNS = [
  // Suspicious URL patterns
  /bit\.ly|tinyurl|shorturl|t\.co/i,
  // Potential phishing domains
  /ch[a4]intrace|cha1ntrace|chaintr[a4]ce/i,
  // Script injection attempts
  /<script|javascript:|data:text\/html/i,
  // Suspicious protocols
  /file:|ftp:|telnet:/i,
];

/**
 * Suspicious patterns that may indicate security risks
 */
const SUSPICIOUS_PATTERNS = [
  // Very long query parameters
  /\?[^&]{100,}/,
  // Base64 encoded content in URLs
  /[A-Za-z0-9+/]{50,}=*/,
  // Multiple redirects
  /redirect.*redirect|redir.*redir/i,
  // Suspicious parameter names
  /[?&](token|auth|key|secret|password|admin)/i,
];

/**
 * Validates QR code content for security risks.
 *
 * Performs comprehensive security analysis including:
 * - URL validation and domain checking
 * - Malicious pattern detection
 * - Content size and complexity analysis
 * - Format verification
 *
 * @param qrCode - QR code result to validate
 * @param config - Security configuration (optional)
 * @returns Security validation result
 *
 * @example
 * ```typescript
 * const qrCode = await generateProductQRCode(productId, options);
 * const validation = validateQRSecurity(qrCode);
 *
 * if (!validation.isValid) {
 *   console.error('Security risks detected:', validation.errors);
 * }
 * ```
 *
 * @since 2.4.0
 */
export function validateQRSecurity(
  qrCode: QRCodeResult,
  config: Partial<QRSecurityConfig> = {}
): QRSecurityValidation {
  const finalConfig = { ...DEFAULT_SECURITY_CONFIG, ...config };
  const errors: QRSecurityValidation['errors'] = [];
  let riskScore = 0;
  const recommendations: string[] = [];

  try {
    // 1. Validate format
    if (!finalConfig.allowedFormats.includes(qrCode.format)) {
      errors.push({
        code: 'FORMAT_NOT_ALLOWED',
        message: `QR code format '${qrCode.format}' is not allowed`,
        severity: 'medium',
      });
      riskScore += 20;
    }

    // 2. Validate data size
    const dataSize = calculateQRDataSize(qrCode.data);
    if (dataSize > finalConfig.maxDataSize) {
      errors.push({
        code: 'SIZE_LIMIT_EXCEEDED',
        message: `QR code data size (${dataSize} bytes) exceeds limit (${finalConfig.maxDataSize} bytes)`,
        severity: 'high',
      });
      riskScore += 30;
      recommendations.push('Reduce QR code content size or increase limit');
    }

    // 3. Validate encoded URL
    const urlValidation = validateURL(qrCode.encodedData, finalConfig);
    if (!urlValidation.isValid) {
      errors.push(...urlValidation.errors);
      riskScore += urlValidation.riskScore;
      recommendations.push(...(urlValidation.recommendations || []));
    }

    // 4. Check for malicious patterns
    if (finalConfig.enablePatternDetection) {
      const patternValidation = detectMaliciousPatterns(qrCode.encodedData);
      if (!patternValidation.isValid) {
        errors.push(...patternValidation.errors);
        riskScore += patternValidation.riskScore;
      }
    }

    // 5. Analyze content complexity
    const complexityScore = calculateContentComplexity(qrCode.encodedData);
    if (complexityScore > finalConfig.maxComplexityScore) {
      errors.push({
        code: 'CONTENT_TOO_COMPLEX',
        message: `QR code content complexity (${complexityScore}) exceeds threshold`,
        severity: 'low',
      });
      riskScore += 10;
      recommendations.push(
        'Simplify QR code content or adjust complexity threshold'
      );
    }

    // 6. Additional metadata validation
    if (qrCode.metadata && qrCode.size !== dataSize) {
      // Size mismatch may indicate tampering
      riskScore += 5;
    }

    // Cap risk score at 100
    riskScore = Math.min(riskScore, 100);

    return {
      isValid: errors.length === 0,
      errors,
      riskScore,
      recommendations: recommendations.length > 0 ? recommendations : undefined,
    };
  } catch (error) {
    // If validation itself fails, treat as high risk
    return {
      isValid: false,
      errors: [
        {
          code: 'MALICIOUS_CONTENT',
          message: `Security validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'critical',
        },
      ],
      riskScore: 100,
      recommendations: ['Manual review required'],
    };
  }
}

/**
 * Validates a URL for security risks.
 */
function validateURL(
  url: string,
  config: QRSecurityConfig
): {
  isValid: boolean;
  errors: QRSecurityValidation['errors'];
  riskScore: number;
  recommendations?: string[];
} {
  const errors: QRSecurityValidation['errors'] = [];
  let riskScore = 0;
  const recommendations: string[] = [];

  try {
    // Check URL length
    if (url.length > config.maxUrlLength) {
      errors.push({
        code: 'INVALID_URL',
        message: `URL length (${url.length}) exceeds maximum allowed (${config.maxUrlLength})`,
        severity: 'medium',
      });
      riskScore += 15;
    }

    // Parse URL
    const parsedUrl = new URL(url);

    // Validate domain
    const hostname = parsedUrl.hostname.toLowerCase();
    const isAllowedDomain = config.allowedDomains.some(
      domain => hostname === domain || hostname.endsWith(`.${domain}`)
    );

    if (!isAllowedDomain) {
      errors.push({
        code: 'INVALID_URL',
        message: `Domain '${hostname}' is not in allowed domains list`,
        severity: 'high',
      });
      riskScore += 40;
      recommendations.push(
        `Add '${hostname}' to allowed domains if legitimate`
      );
    }

    // Check protocol
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      errors.push({
        code: 'INVALID_URL',
        message: `Protocol '${parsedUrl.protocol}' is not allowed`,
        severity: 'high',
      });
      riskScore += 35;
    }

    // Check for suspicious paths
    if (
      parsedUrl.pathname.includes('..') ||
      parsedUrl.pathname.includes('%2e%2e')
    ) {
      errors.push({
        code: 'MALICIOUS_CONTENT',
        message: 'URL contains suspicious path traversal patterns',
        severity: 'high',
      });
      riskScore += 30;
    }

    return { isValid: errors.length === 0, errors, riskScore, recommendations };
  } catch (error) {
    errors.push({
      code: 'INVALID_URL',
      message: `Invalid URL format: ${error instanceof Error ? error.message : 'Parse error'}`,
      severity: 'high',
    });
    return { isValid: false, errors, riskScore: 40 };
  }
}

/**
 * Detects malicious patterns in QR code content.
 */
function detectMaliciousPatterns(content: string): {
  isValid: boolean;
  errors: QRSecurityValidation['errors'];
  riskScore: number;
} {
  const errors: QRSecurityValidation['errors'] = [];
  let riskScore = 0;

  // Check for known malicious patterns
  for (const pattern of MALICIOUS_PATTERNS) {
    if (pattern.test(content)) {
      errors.push({
        code: 'MALICIOUS_CONTENT',
        message: 'Content matches known malicious pattern',
        severity: 'critical',
      });
      riskScore += 50;
      break; // One malicious pattern is enough
    }
  }

  // Check for suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(content)) {
      errors.push({
        code: 'SUSPICIOUS_PATTERN',
        message: 'Content contains suspicious patterns',
        severity: 'medium',
      });
      riskScore += 15;
      break; // Don't stack multiple suspicious pattern penalties
    }
  }

  return { isValid: errors.length === 0, errors, riskScore };
}

/**
 * Calculates content complexity score based on various factors.
 */
function calculateContentComplexity(content: string): number {
  let complexity = 0;

  // Base complexity on length
  complexity += Math.min(content.length / 10, 20);

  // Special character complexity
  const specialChars = (content.match(/[^a-zA-Z0-9]/g) || []).length;
  complexity += Math.min(specialChars / 2, 15);

  // URL parameter complexity
  const paramMatches = content.match(/[?&][^=]+=[^&]*/g);
  if (paramMatches) {
    complexity += Math.min(paramMatches.length * 3, 15);
  }

  // Encoded content complexity
  if (content.includes('%') || content.match(/[A-Za-z0-9+/]{20,}=/)) {
    complexity += 10;
  }

  return Math.round(complexity);
}

/**
 * Calculates the actual data size of QR code content.
 */
function calculateQRDataSize(data: string): number {
  if (data.startsWith('data:')) {
    // Data URL - calculate base64 size
    const base64Data = data.split(',')[1] || '';
    return Math.ceil(base64Data.length * 0.75);
  }

  // Direct content
  return new TextEncoder().encode(data).length;
}

/**
 * Sanitizes product ID input to prevent injection attacks.
 *
 * @param productId - Raw product ID input
 * @returns Sanitized product ID or null if invalid
 *
 * @since 2.4.0
 */
export function sanitizeProductId(productId: string): string | null {
  if (!productId || typeof productId !== 'string') {
    return null;
  }

  // Remove any non-alphanumeric characters except hyphens
  const sanitized = productId
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\-]/g, '');

  // Validate format after sanitization
  if (!/^CT-\d{4}-\d{3}-[A-F0-9]{6}$/.test(sanitized)) {
    return null;
  }

  return sanitized;
}

/**
 * Validates and sanitizes QR code options for security.
 *
 * @param options - Raw QR code options
 * @returns Sanitized options or throws error if invalid
 *
 * @since 2.4.0
 */
export function sanitizeQROptions(
  options: Partial<QRCodeOptions>
): QRCodeOptions {
  const sanitized: QRCodeOptions = {
    format: 'PNG',
    size: 256,
    errorCorrectionLevel: 'M',
    margin: 4,
  };

  // Validate and sanitize format
  const allowedFormats = ['png', 'svg', 'jpeg', 'webp'];
  if (options.format && allowedFormats.includes(options.format)) {
    sanitized.format = options.format;
  }

  // Validate and sanitize size (prevent extremely large QR codes)
  if (options.size && typeof options.size === 'number') {
    sanitized.size = Math.min(Math.max(options.size, 64), 2048);
  }

  // Validate error correction level
  const allowedErrorLevels = ['L', 'M', 'Q', 'H'];
  if (
    options.errorCorrectionLevel &&
    allowedErrorLevels.includes(options.errorCorrectionLevel)
  ) {
    sanitized.errorCorrectionLevel = options.errorCorrectionLevel;
  }

  // Validate margin (prevent negative or excessive margins)
  if (options.margin && typeof options.margin === 'number') {
    sanitized.margin = Math.min(Math.max(options.margin, 0), 20);
  }

  return sanitized;
}
