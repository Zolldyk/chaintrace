/**
 * Custom React hook for QR code scanning functionality.
 *
 * @example
 * ```tsx
 * const {
 *   isScanning,
 *   startScanning,
 *   stopScanning,
 *   scanResult,
 *   error
 * } = useQRScanner({
 *   onScan: (data) => console.log('Scanned:', data),
 *   timeout: 30000
 * });
 * ```
 *
 * @since 1.0.0
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  QRScannerConfig,
  QRScanResult,
  QRScannerError,
  QRScannerErrorType,
} from '@/types/qr';
import {
  validateQRCode,
  createScanResult,
  isCameraScanningSupported,
  formatScannerError,
} from '@/lib/qr-scanner';

export interface UseQRScannerOptions extends QRScannerConfig {
  /** Callback when QR code is successfully scanned */
  onScan?: (result: QRScanResult) => void;

  /** Callback when scanning error occurs */
  onError?: (error: QRScannerError) => void;

  /** Whether to automatically validate scanned QR codes */
  autoValidate?: boolean;

  /** Whether to automatically stop scanning after successful scan */
  autoStop?: boolean;
}

export interface UseQRScannerReturn {
  /** Whether scanning is currently active */
  isScanning: boolean;

  /** Whether camera is supported on this device */
  cameraSupported: boolean | null;

  /** Current scan result */
  scanResult: QRScanResult | null;

  /** Current error state */
  error: QRScannerError | null;

  /** Start QR code scanning */
  startScanning: () => Promise<void>;

  /** Stop QR code scanning */
  stopScanning: () => void;

  /** Clear current error */
  clearError: () => void;

  /** Clear scan result */
  clearResult: () => void;

  /** Reset scanner to initial state */
  reset: () => void;

  /** Handle QR code scan */
  handleScan: (data: string) => void;
}

/**
 * Custom hook for QR code scanning functionality
 */
export function useQRScanner(
  options: UseQRScannerOptions = {}
): UseQRScannerReturn {
  const {
    onScan,
    onError,
    autoValidate = true,
    autoStop = true,
    timeout = 30000,
  } = options;

  const [isScanning, setIsScanning] = useState(false);
  const [cameraSupported, setCameraSupported] = useState<boolean | null>(null);
  const [scanResult, setScanResult] = useState<QRScanResult | null>(null);
  const [error, setError] = useState<QRScannerError | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScanRef = useRef<string | null>(null);

  /**
   * Check camera support on mount
   */
  useEffect(() => {
    const checkSupport = async () => {
      try {
        const supported = await isCameraScanningSupported();
        setCameraSupported(supported);
      } catch (err) {
        setCameraSupported(false);
      }
    };

    checkSupport();
  }, []);

  /**
   * Handle successful QR code scan
   */
  const handleScan = useCallback(
    (data: string) => {
      // Prevent duplicate scans
      if (lastScanRef.current === data) {
        return;
      }

      lastScanRef.current = data;

      const result = createScanResult(data, 'QR_CODE');

      // Auto-validate if enabled
      if (autoValidate) {
        const validation = validateQRCode(data);
        if (!validation.valid) {
          const scanError: QRScannerError = {
            type: QRScannerErrorType.INVALID_QR_FORMAT,
            message: validation.error || 'Invalid QR code format',
            recoverable: true,
          };
          setError(scanError);
          onError?.(scanError);
          return;
        }
      }

      setScanResult(result);
      setError(null);

      // Auto-stop if enabled
      if (autoStop) {
        stopScanning();
      }

      onScan?.(result);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [autoValidate, autoStop, onScan, onError]
  ); // stopScanning causes circular dependency

  /**
   * Handle scanning errors
   */
  const handleError = useCallback(
    (err: Error | string) => {
      const message = formatScannerError(err);
      const errorType = getErrorType(err);

      const scanError: QRScannerError = {
        type: errorType,
        message,
        originalError: err instanceof Error ? err : undefined,
        recoverable: errorType !== QRScannerErrorType.BROWSER_NOT_SUPPORTED,
      };

      setError(scanError);
      setIsScanning(false);
      onError?.(scanError);
    },
    [onError]
  );

  /**
   * Start QR code scanning
   */
  const startScanning = useCallback(async () => {
    if (isScanning) return;

    try {
      setError(null);
      setScanResult(null);
      lastScanRef.current = null;

      // Check camera support first
      if (cameraSupported === false) {
        throw new Error('Camera not supported');
      }

      setIsScanning(true);

      // Set timeout if specified
      if (timeout > 0) {
        timeoutRef.current = setTimeout(() => {
          const timeoutError: QRScannerError = {
            type: QRScannerErrorType.SCANNING_TIMEOUT,
            message: 'Scanning timeout - please try again',
            recoverable: true,
          };
          setError(timeoutError);
          setIsScanning(false);
          onError?.(timeoutError);
        }, timeout);
      }
    } catch (err) {
      handleError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [isScanning, cameraSupported, timeout, onError, handleError]);

  /**
   * Stop QR code scanning
   */
  const stopScanning = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setIsScanning(false);
    lastScanRef.current = null;
  }, []);

  /**
   * Clear current error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Clear scan result
   */
  const clearResult = useCallback(() => {
    setScanResult(null);
    lastScanRef.current = null;
  }, []);

  /**
   * Reset scanner to initial state
   */
  const reset = useCallback(() => {
    stopScanning();
    clearError();
    clearResult();
  }, [stopScanning, clearError, clearResult]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Cleanup function doesn't need stopScanning in deps to avoid circular dependency
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsScanning(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // stopScanning causes circular dependency

  return {
    isScanning,
    cameraSupported,
    scanResult,
    error,
    startScanning,
    stopScanning,
    clearError,
    clearResult,
    reset,
    handleScan,
  };
}

/**
 * Determines error type from error message
 */
function getErrorType(error: Error | string): QRScannerErrorType {
  const message = typeof error === 'string' ? error : error.message;

  if (
    message.includes('Permission denied') ||
    message.includes('access denied')
  ) {
    return QRScannerErrorType.CAMERA_ACCESS_DENIED;
  }

  if (message.includes('NotFoundError') || message.includes('no camera')) {
    return QRScannerErrorType.NO_CAMERA_FOUND;
  }

  if (
    message.includes('NotSupportedError') ||
    message.includes('not supported')
  ) {
    return QRScannerErrorType.BROWSER_NOT_SUPPORTED;
  }

  if (message.includes('timeout')) {
    return QRScannerErrorType.SCANNING_TIMEOUT;
  }

  if (message.includes('invalid') || message.includes('format')) {
    return QRScannerErrorType.INVALID_QR_FORMAT;
  }

  return QRScannerErrorType.UNKNOWN_ERROR;
}
