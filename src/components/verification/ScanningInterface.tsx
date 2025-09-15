/**
 * Scanning interface component providing enhanced visual feedback during QR scanning.
 *
 * @example
 * ```tsx
 * <ScanningInterface
 *   isScanning={true}
 *   onScan={(data) => console.log('Scanned:', data)}
 *   onCancel={() => setIsScanning(false)}
 * />
 * ```
 *
 * @since 1.0.0
 */

'use client';

import * as React from 'react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { QRScanner } from '@/components/ui/QRScanner';
import { validateQRCode } from '@/lib/qr-scanner';

export interface ScanningInterfaceProps {
  /** Whether scanning is currently active */
  isScanning: boolean;

  /** Callback when QR code is successfully scanned */
  onScan: (data: string) => void;

  /** Callback when scanning is cancelled */
  onCancel: () => void;

  /** Additional CSS classes */
  className?: string;

  /** Custom title for scanning interface */
  title?: string;

  /** Custom instructions for scanning */
  instructions?: string;

  /** Whether to show scanning tips */
  showTips?: boolean;

  /** Whether to enable torch control */
  enableTorch?: boolean;

  /** Scanning timeout in milliseconds */
  timeout?: number;
}

export interface ScanningTip {
  icon: string;
  text: string;
}

const SCANNING_TIPS: ScanningTip[] = [
  {
    icon: '💡',
    text: 'Ensure good lighting for better QR code detection',
  },
  {
    icon: '📱',
    text: 'Hold your device steady while scanning',
  },
  {
    icon: '🎯',
    text: 'Position the QR code within the scanning frame',
  },
  {
    icon: '🔄',
    text: 'Try different angles if scanning fails',
  },
];

/**
 * Scanning interface component with enhanced visual feedback
 */
export const ScanningInterface: React.FC<ScanningInterfaceProps> = ({
  isScanning,
  onScan,
  onCancel,
  className,
  title = 'Scan QR Code',
  instructions = 'Position the QR code within the frame to scan',
  showTips = false,
  enableTorch = true,
  timeout = 30000,
}) => {
  const [scanningStatus, setScanningStatus] = useState<'ready' | 'scanning' | 'processing'>('ready');
  const [scanError, setScanError] = useState<string | null>(null);

  /**
   * Handle successful QR scan with validation
   */
  const handleScan = (data: string) => {
    setScanningStatus('processing');
    setScanError(null);

    // Add a small delay to show processing state
    setTimeout(() => {
      const validation = validateQRCode(data);

      if (validation.valid && validation.productId) {
        onScan(validation.productId);
      } else {
        setScanError(validation.error || 'Invalid QR code format');
        setScanningStatus('scanning');
      }
    }, 500);
  };

  /**
   * Handle scanning errors
   */
  const handleError = (error: string) => {
    setScanError(error);
    setScanningStatus('ready');
  };

  /**
   * Handle scanner close
   */
  const handleClose = () => {
    setScanningStatus('ready');
    setScanError(null);
    onCancel();
  };

  /**
   * Clear error and retry scanning
   */
  const retryScanning = () => {
    setScanError(null);
    setScanningStatus('scanning');
  };

  if (!isScanning) {
    return null;
  }

  return (
    <div className={cn('w-full max-w-md space-y-4', className)}>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <h3 className='text-lg font-medium text-secondary-900 dark:text-secondary-100'>
          {title}
        </h3>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={handleClose}
          disabled={scanningStatus === 'processing'}
        >
          Cancel
        </Button>
      </div>

      {/* Scanner */}
      <div className='relative'>
        <QRScanner
          onScan={handleScan}
          onError={handleError}
          onClose={handleClose}
          enableTorch={enableTorch}
          timeout={timeout}
        />

        {/* Processing overlay */}
        {scanningStatus === 'processing' && (
          <div className='absolute inset-0 flex items-center justify-center rounded-lg bg-black/50'>
            <div className='flex flex-col items-center text-white'>
              <svg
                className='h-8 w-8 animate-spin'
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
              <p className='mt-2 text-sm'>Processing...</p>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className='text-center'>
        <p className='text-sm text-secondary-600 dark:text-secondary-400'>
          {instructions}
        </p>
      </div>

      {/* Error display */}
      {scanError && (
        <div className='rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20'>
          <div className='flex items-start gap-3'>
            <svg
              className='h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400'
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
            <div className='flex-1'>
              <h4 className='text-sm font-medium text-red-800 dark:text-red-200'>
                Scanning Error
              </h4>
              <p className='mt-1 text-sm text-red-700 dark:text-red-300'>
                {scanError}
              </p>
              <div className='mt-3'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={retryScanning}
                  className='border-red-300 text-red-700 hover:bg-red-100 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-900/50'
                >
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scanning tips */}
      {showTips && (
        <div className='rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20'>
          <h4 className='mb-3 text-sm font-medium text-blue-800 dark:text-blue-200'>
            Scanning Tips
          </h4>
          <div className='grid gap-2'>
            {SCANNING_TIPS.map((tip, index) => (
              <div key={index} className='flex items-start gap-3'>
                <span className='text-lg'>{tip.icon}</span>
                <p className='text-sm text-blue-700 dark:text-blue-300'>
                  {tip.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual entry fallback */}
      <div className='relative'>
        <div className='absolute inset-0 flex items-center'>
          <div className='w-full border-t border-secondary-300 dark:border-secondary-600' />
        </div>
        <div className='relative flex justify-center text-sm'>
          <span className='bg-white px-2 text-secondary-500 dark:bg-gray-900 dark:text-secondary-400'>
            Having trouble scanning?
          </span>
        </div>
      </div>

      <div className='text-center'>
        <Button
          variant='ghost'
          size='sm'
          onClick={handleClose}
          className='text-secondary-600 hover:text-secondary-800 dark:text-secondary-400 dark:hover:text-secondary-200'
        >
          Enter product ID manually
        </Button>
      </div>
    </div>
  );
};

ScanningInterface.displayName = 'ScanningInterface';