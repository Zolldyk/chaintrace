/**
 * QR Scanner component using @zxing/browser for cross-browser QR code detection.
 *
 * @example
 * ```tsx
 * <QRScanner
 *   onScan={(data) => console.log('Scanned:', data)}
 *   onError={(error) => console.error('Error:', error)}
 *   onClose={() => setIsScanning(false)}
 * />
 * ```
 *
 * @since 1.0.0
 * @see {@link https://github.com/zxing-js/browser} ZXing Browser Documentation
 */

'use client';

import * as React from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export interface QRScannerProps {
  /** Callback when QR code is successfully scanned */
  onScan: (data: string) => void;

  /** Callback when scanning error occurs */
  onError: (error: string) => void;

  /** Callback when scanner is closed */
  onClose: () => void;

  /** Additional CSS classes */
  className?: string;

  /** Whether to enable torch/flashlight if available */
  enableTorch?: boolean;

  /** Scanning timeout in milliseconds */
  timeout?: number;
}

export interface QRScannerState {
  hasPermission: boolean | null;
  isScanning: boolean;
  torchSupported: boolean;
  torchEnabled: boolean;
  error: string | null;
}

/**
 * QR Scanner component with @zxing/browser integration
 */
export const QRScanner: React.FC<QRScannerProps> = ({
  onScan,
  onError,
  onClose,
  className,
  enableTorch = true,
  timeout = 30000,
}) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const readerRef = React.useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const [state, setState] = React.useState<QRScannerState>({
    hasPermission: null,
    isScanning: false,
    torchSupported: false,
    torchEnabled: false,
    error: null,
  });

  /**
   * Initialize QR code reader with proper configuration
   */
  const initializeReader = React.useCallback(() => {
    if (readerRef.current) return readerRef.current;

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    return reader;
  }, []);

  /**
   * Start camera and begin scanning
   */
  const startScanning = React.useCallback(async () => {
    try {
      setState(prev => ({ ...prev, hasPermission: null, error: null }));

      const reader = initializeReader();

      // Request camera with preferred settings
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment', // Use back camera for mobile
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // Check torch support
        const videoTrack = stream.getVideoTracks()[0];
        const capabilities = videoTrack.getCapabilities?.();
        const supportsTorch = !!(capabilities && 'torch' in capabilities);

        setState(prev => ({
          ...prev,
          hasPermission: true,
          isScanning: true,
          torchSupported: supportsTorch && enableTorch,
        }));

        // Start decoding with error handling
        reader
          .decodeFromVideoDevice(undefined, videoRef.current, (result, error) => {
            if (result) {
              const scannedText = result.getText();
              onScan(scannedText);
              return;
            }

            // Only log actual decoding errors, not "not found" results
            if (error && !error.message.includes('No QR code found')) {
              // Log decode errors for debugging
            }
          })
          .catch(() => {
            setState(prev => ({ ...prev, error: 'Failed to start QR scanning' }));
            onError('Failed to start QR scanning');
          });

        // Set timeout for scanning
        if (timeout > 0) {
          timeoutRef.current = setTimeout(() => {
            setState(prev => ({ ...prev, error: 'Scanning timeout' }));
            onError('Scanning timeout - please try again');
          }, timeout);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Camera access denied';
      setState(prev => ({
        ...prev,
        hasPermission: false,
        error: errorMessage,
      }));
      onError(errorMessage);
    }
  }, [initializeReader, onScan, onError, enableTorch, timeout]);

  /**
   * Stop scanning and clean up resources
   */
  const stopScanning = React.useCallback(() => {
    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Stop reader
    if (readerRef.current) {
      try {
        // The BrowserMultiFormatReader doesn't have a reset method
        // We'll rely on cleanup in the effect return
        readerRef.current = null;
      } catch {
        // Silently handle cleanup errors
      }
    }

    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isScanning: false,
      torchEnabled: false,
    }));
  }, []);

  /**
   * Toggle torch/flashlight
   */
  const toggleTorch = React.useCallback(async () => {
    if (!streamRef.current || !state.torchSupported) return;

    try {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      const newTorchState = !state.torchEnabled;

      await videoTrack.applyConstraints({
        advanced: [{ torch: newTorchState } as any],
      });

      setState(prev => ({ ...prev, torchEnabled: newTorchState }));
    } catch {
      // Silently handle torch toggle errors
    }
  }, [state.torchSupported, state.torchEnabled]);

  /**
   * Initialize scanning on mount
   */
  React.useEffect(() => {
    startScanning();

    return () => {
      stopScanning();
    };
  }, [startScanning, stopScanning]);

  /**
   * Handle close button click
   */
  const handleClose = () => {
    stopScanning();
    onClose();
  };

  if (state.hasPermission === null) {
    return (
      <div className={cn('flex h-64 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800', className)}>
        <div className='text-center'>
          <svg
            className='mx-auto h-8 w-8 animate-spin text-gray-400'
            xmlns='http://www.w3.org/2000/svg'
            fill='none'
            viewBox='0 0 24 24'
          >
            <circle
              className='opacity-25'
              cx='12'
              cy='12'
              r='10'
              stroke='currentColor'
              strokeWidth='4'
            />
            <path
              className='opacity-75'
              fill='currentColor'
              d='m4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
            />
          </svg>
          <p className='mt-2 text-sm text-gray-600 dark:text-gray-400'>
            Requesting camera permission...
          </p>
        </div>
      </div>
    );
  }

  if (state.hasPermission === false || state.error) {
    return (
      <div className={cn('rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20', className)}>
        <svg
          className='mx-auto mb-4 h-12 w-12 text-red-600 dark:text-red-400'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.96-.833-2.732 0L3.732 16.5C2.962 18.333 3.924 20 5.464 20z'
          />
        </svg>
        <h3 className='mb-2 text-lg font-medium text-red-800 dark:text-red-200'>
          Camera Access Required
        </h3>
        <p className='mb-4 text-sm text-red-700 dark:text-red-300'>
          {state.error || 'Camera access is required for QR scanning. Please enable camera permissions and try again.'}
        </p>
        <div className='flex justify-center gap-3'>
          <Button variant='outline' size='sm' onClick={handleClose}>
            Cancel
          </Button>
          <Button variant='primary' size='sm' onClick={startScanning}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className='h-64 w-full rounded-lg bg-black object-cover'
      />

      {/* Scanning overlay with targeting frame */}
      <div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
        <div className='relative'>
          {/* Scanning frame */}
          <div className='h-48 w-48 rounded-lg border-2 border-white/80 bg-transparent'>
            {/* Corner indicators */}
            <div className='absolute -left-1 -top-1 h-6 w-6 border-l-4 border-t-4 border-white' />
            <div className='absolute -right-1 -top-1 h-6 w-6 border-r-4 border-t-4 border-white' />
            <div className='absolute -bottom-1 -left-1 h-6 w-6 border-b-4 border-l-4 border-white' />
            <div className='absolute -bottom-1 -right-1 h-6 w-6 border-b-4 border-r-4 border-white' />
          </div>

          {/* Scanning line animation */}
          <div className='absolute inset-0 overflow-hidden rounded-lg'>
            <div className='animate-scan-line absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent' />
          </div>
        </div>
      </div>

      {/* Controls overlay */}
      <div className='absolute left-4 right-4 top-4 flex items-center justify-between'>
        <div className='flex gap-2'>
          {state.torchSupported && (
            <Button
              variant='secondary'
              size='sm'
              onClick={toggleTorch}
              className='bg-black/50 text-white hover:bg-black/75'
            >
              <svg
                className={cn('h-4 w-4', state.torchEnabled && 'text-yellow-400')}
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'
                />
              </svg>
            </Button>
          )}
        </div>

        <Button
          variant='secondary'
          size='sm'
          onClick={handleClose}
          className='bg-black/50 text-white hover:bg-black/75'
        >
          <svg
            className='h-4 w-4'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M6 18L18 6M6 6l12 12'
            />
          </svg>
        </Button>
      </div>

      {/* Instructions */}
      <div className='absolute bottom-4 left-4 right-4 text-center'>
        <div className='rounded-lg bg-black/50 px-4 py-2'>
          <p className='text-sm text-white'>
            Position the QR code within the frame to scan
          </p>
        </div>
      </div>
    </div>
  );
};

QRScanner.displayName = 'QRScanner';