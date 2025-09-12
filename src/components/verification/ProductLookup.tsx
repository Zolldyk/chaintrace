/**
 * ProductLookup component for product ID input and search functionality.
 *
 * @example
 * ```tsx
 * <ProductLookup
 *   onSearch={(productId) => console.log('Searching for:', productId)}
 *   loading={false}
 * />
 * ```
 *
 * @since 1.0.0
 */

'use client';

import * as React from 'react';
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { ProductVerificationError } from '@/types';

export interface ProductLookupProps {
  /** Callback when search is triggered */
  onSearch: (productId: string) => void;

  /** Whether search is in progress */
  loading?: boolean;

  /** Error state for the lookup */
  error?: ProductVerificationError | null;

  /** Initial product ID value */
  initialValue?: string;

  /** Additional CSS classes */
  className?: string;

  /** Placeholder text for input */
  placeholder?: string;

  /** Whether to auto-focus the input */
  autoFocus?: boolean;

  /** Whether to enable QR code scanning */
  enableQrScanning?: boolean;

  /** Callback when QR code scanning starts/stops */
  onQrScanToggle?: (scanning: boolean) => void;
}

/**
 * Input component with proper styling
 */
const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }
>(({ className, error, ...props }, ref) => {
  return (
    <input
      className={cn(
        'border-secondary-300 placeholder:text-secondary-400 flex h-10 w-full animate-fade-in rounded-md border bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        error && 'border-error-500 focus:border-error-500 focus:ring-error-500',
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = 'Input';

/**
 * QR Scanner component for scanning QR codes
 */
const QRScanner: React.FC<{
  onScan: (data: string) => void;
  onError: (error: string) => void;
  onClose: () => void;
}> = ({ onScan, onError, onClose }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = React.useState<boolean | null>(
    null
  );
  const [scanning, setScanning] = React.useState(false);

  React.useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Use back camera for mobile
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setHasPermission(true);
          setScanning(true);
        }
      } catch (error) {
        setHasPermission(false);
        onError('Camera access denied or not available');
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setScanning(false);
    };
  }, [onError]);

  // Simple QR detection (in a real implementation, you'd use a proper QR code library)
  React.useEffect(() => {
    if (!scanning || !videoRef.current || !canvasRef.current) return;

    const interval = setInterval(() => {
      // Mock QR detection - in real implementation, would use a QR library
      // For demo purposes, we'll show the interface but not actual scanning
    }, 100);

    return () => clearInterval(interval);
  }, [scanning, onScan]);

  if (hasPermission === null) {
    return (
      <div className='flex h-48 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800'>
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

  if (hasPermission === false) {
    return (
      <div className='rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20'>
        <svg
          className='mx-auto mb-2 h-8 w-8 text-red-600 dark:text-red-400'
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
        <p className='text-sm text-red-700 dark:text-red-300'>
          Camera access is required for QR scanning
        </p>
        <p className='mt-1 text-xs text-red-600 dark:text-red-400'>
          Please enable camera permissions and try again
        </p>
      </div>
    );
  }

  return (
    <div className='relative'>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className='h-48 w-full rounded-lg bg-black object-cover'
      />
      <canvas ref={canvasRef} className='hidden' />

      {/* Scanning overlay */}
      <div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
        <div className='animate-pulse rounded-lg border-2 border-white p-4'>
          <div className='flex h-32 w-32 items-center justify-center rounded-lg border border-white/50'>
            <svg
              className='h-8 w-8 text-white'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h2M4 4h5v5H4V4z'
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className='absolute right-2 top-2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/75'
        type='button'
      >
        <svg
          className='h-5 w-5'
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
      </button>
    </div>
  );
};

/**
 * ProductLookup component for entering and searching product IDs
 */
export const ProductLookup = React.forwardRef<
  HTMLDivElement,
  ProductLookupProps
>(
  (
    {
      onSearch,
      loading = false,
      error = null,
      initialValue = '',
      className,
      placeholder = 'Enter product ID (e.g., CT-2024-123-ABC123)',
      autoFocus = false,
      enableQrScanning = true,
      onQrScanToggle,
      ...props
    },
    ref
  ) => {
    const [productId, setProductId] = useState<string>(initialValue);
    const [touched, setTouched] = useState<boolean>(false);
    const [isScanning, setIsScanning] = useState<boolean>(false);
    const [cameraSupported, setCameraSupported] = useState<boolean | null>(
      null
    );

    /**
     * Check if camera is supported
     */
    React.useEffect(() => {
      if (enableQrScanning) {
        const checkCameraSupport = async () => {
          try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const hasCamera = devices.some(
              device => device.kind === 'videoinput'
            );
            setCameraSupported(
              hasCamera && !!navigator.mediaDevices.getUserMedia
            );
          } catch (error) {
            setCameraSupported(false);
          }
        };

        if (navigator.mediaDevices) {
          checkCameraSupport();
        } else {
          setCameraSupported(false);
        }
      }
    }, [enableQrScanning]);

    /**
     * Validates product ID format - now supports CT-YYYY-XXX-ABCDEF format
     */
    const validateProductId = (id: string): boolean => {
      if (!id.trim()) return false;

      // ChainTrace format: CT-YYYY-XXX-ABCDEF
      const ctPattern = /^CT-\d{4}-\d{3}-[A-F0-9]{6}$/;
      if (ctPattern.test(id.trim())) return true;

      // Legacy format support - basic validation
      const legacyPattern = /^[A-Z0-9][A-Z0-9\-_]{2,}$/i;
      return legacyPattern.test(id.trim());
    };

    /**
     * Handles form submission
     */
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setTouched(true);

      const trimmedId = productId.trim();
      if (validateProductId(trimmedId)) {
        onSearch(trimmedId);
      }
    };

    /**
     * Handles input change
     */
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setProductId(e.target.value);
      if (touched && error) {
        // Clear error when user starts typing after an error
        setTouched(false);
      }
    };

    /**
     * Handles key press events
     */
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSubmit(e);
      }
    };

    /**
     * Handles QR code scanning
     */
    const handleQrScan = useCallback(
      (data: string) => {
        // Extract product ID from QR code data
        let extractedId = data;

        // If it's a URL, extract the product ID from it
        if (data.includes('/verify/')) {
          const matches = data.match(/\/verify\/([^?]+)/);
          if (matches && matches[1]) {
            extractedId = matches[1];
          }
        }

        setProductId(extractedId);
        setIsScanning(false);
        onQrScanToggle?.(false);

        // Auto-submit if valid
        if (validateProductId(extractedId)) {
          onSearch(extractedId);
        }
      },
      [onSearch, onQrScanToggle, validateProductId]
    );

    /**
     * Handles QR scanning errors
     */
    const handleQrError = useCallback((_error: string) => {
      // Error handled silently - could show error to user here if needed
    }, []);

    /**
     * Toggles QR scanning mode
     */
    const toggleQrScanning = () => {
      const newScanning = !isScanning;
      setIsScanning(newScanning);
      onQrScanToggle?.(newScanning);
    };

    const hasError =
      error !== null || (touched && !validateProductId(productId));
    const errorMessage =
      error?.message ||
      (touched && !validateProductId(productId)
        ? 'Please enter a valid product ID'
        : '');

    return (
      <div
        ref={ref}
        className={cn('mx-auto w-full max-w-md', className)}
        {...props}
      >
        {isScanning ? (
          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <h3 className='text-secondary-900 text-lg font-medium dark:text-secondary-100'>
                Scan QR Code
              </h3>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={toggleQrScanning}
              >
                Cancel
              </Button>
            </div>
            <QRScanner
              onScan={handleQrScan}
              onError={handleQrError}
              onClose={toggleQrScanning}
            />
            <p className='dark:text-secondary-400 text-center text-sm text-secondary-600'>
              Position the QR code within the frame to scan
            </p>
          </div>
        ) : (
          <>
            {/* QR Scan Button */}
            {enableQrScanning && cameraSupported && (
              <div className='mb-4 text-center'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={toggleQrScanning}
                  className='flex items-center gap-2'
                  disabled={loading}
                >
                  <svg
                    className='h-5 w-5'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h2M4 4h5v5H4V4z'
                    />
                  </svg>
                  Scan QR Code
                </Button>
              </div>
            )}

            {/* OR Divider */}
            {enableQrScanning && cameraSupported && (
              <div className='relative mb-4'>
                <div className='absolute inset-0 flex items-center'>
                  <div className='border-secondary-300 w-full border-t dark:border-secondary-600' />
                </div>
                <div className='relative flex justify-center text-sm'>
                  <span className='dark:text-secondary-400 bg-white px-2 text-secondary-500 dark:bg-gray-900'>
                    or enter manually
                  </span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className='space-y-4'>
              <div className='space-y-2'>
                <label
                  htmlFor='product-id-input'
                  className='dark:text-secondary-300 text-base font-medium leading-none text-secondary-700 peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                >
                  Product ID
                </label>

                <div className='relative'>
                  <Input
                    id='product-id-input'
                    type='text'
                    placeholder={placeholder}
                    value={productId}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyPress}
                    onBlur={() => setTouched(true)}
                    error={hasError}
                    disabled={loading}
                    autoFocus={autoFocus}
                    className='pr-12'
                    aria-describedby={hasError ? 'product-id-error' : undefined}
                    aria-invalid={hasError}
                  />

                  {loading && (
                    <div className='absolute right-3 top-1/2 -translate-y-1/2'>
                      <svg
                        className='text-secondary-400 h-4 w-4 animate-spin'
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
                    </div>
                  )}
                </div>

                {hasError && (
                  <p
                    id='product-id-error'
                    className='dark:text-error-400 flex items-center gap-1 text-sm text-error-700'
                    role='alert'
                  >
                    <svg
                      className='h-4 w-4 flex-shrink-0'
                      fill='currentColor'
                      viewBox='0 0 20 20'
                      xmlns='http://www.w3.org/2000/svg'
                    >
                      <path
                        fillRule='evenodd'
                        d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
                        clipRule='evenodd'
                      />
                    </svg>
                    {errorMessage}
                  </p>
                )}
              </div>

              <Button
                type='submit'
                className='w-full'
                loading={loading}
                disabled={loading || !validateProductId(productId)}
              >
                {loading ? 'Searching...' : 'Verify Product'}
              </Button>
            </form>

            <div className='dark:text-secondary-400 mt-4 animate-fade-in text-center text-xs text-secondary-500'>
              <p>
                Enter a product ID to verify its authenticity and view its
                supply chain journey.
              </p>
              {enableQrScanning && cameraSupported && (
                <p className='mt-1'>
                  You can scan a QR code or enter the product ID manually.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    );
  }
);

ProductLookup.displayName = 'ProductLookup';
