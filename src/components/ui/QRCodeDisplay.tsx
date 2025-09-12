/**
 * QRCodeDisplay Component
 *
 * Displays generated QR codes with comprehensive accessibility features,
 * responsive design, and download capabilities. Follows ChainTrace design
 * system with Tailwind CSS and Headless UI patterns.
 *
 * @since 2.4.0
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import type { QRCodeResult, QRCodeFormat } from '../../types/qr';
import {
  generateQRAltText,
  generateQRDescribedBy,
  handleQRKeyboardInteraction,
  announceToScreenReader,
  QR_SCREEN_READER_TEXTS,
  TOUCH_TARGET_SIZES,
  validateTouchTarget,
  prefersReducedMotion,
  isHighContrastMode,
} from '../../lib/accessibility/qr-accessibility';

/**
 * Props for QRCodeDisplay component
 */
export interface QRCodeDisplayProps {
  /** QR code generation result to display */
  qrCode: QRCodeResult;

  /** Product ID for accessibility and labeling */
  productId: string;

  /** Size variant for responsive display */
  size?: 'small' | 'medium' | 'large';

  /** Whether to show download button */
  showDownload?: boolean;

  /** Whether to show metadata information */
  showMetadata?: boolean;

  /** Custom CSS classes */
  className?: string;

  /** Loading state */
  isLoading?: boolean;

  /** Error message if QR generation failed */
  error?: string;

  /** Callback when download is triggered */
  onDownload?: (qrCode: QRCodeResult, format: QRCodeFormat) => void;

  /** Callback when QR code is clicked/tapped */
  onClick?: (qrCode: QRCodeResult) => void;
}

/**
 * Size configuration for responsive display
 */
const SIZE_CONFIG = {
  small: {
    container: 'w-24 h-24',
    image: 'w-full h-full',
    text: 'text-xs',
    button: 'text-xs px-2 py-1',
    minTouchTarget: '44px',
  },
  medium: {
    container: 'w-32 h-32 sm:w-40 sm:h-40',
    image: 'w-full h-full',
    text: 'text-sm',
    button: 'text-sm px-3 py-2',
    minTouchTarget: '44px',
  },
  large: {
    container: 'w-48 h-48 sm:w-64 sm:h-64',
    image: 'w-full h-full',
    text: 'text-base',
    button: 'text-base px-4 py-2',
    minTouchTarget: '48px',
  },
};

/**
 * Loading skeleton component with enhanced accessibility
 */
const QRCodeSkeleton: React.FC<{ size: keyof typeof SIZE_CONFIG }> = ({
  size,
}) => {
  const config = SIZE_CONFIG[size];
  const reducedMotion = prefersReducedMotion();

  return (
    <div
      className={clsx(
        'rounded-lg bg-gray-200 dark:bg-gray-700',
        !reducedMotion && 'animate-pulse',
        config.container
      )}
      role='status'
      aria-live='polite'
      aria-label={QR_SCREEN_READER_TEXTS.loadingQrCode}
    >
      <div className='flex h-full items-center justify-center'>
        <svg
          className={clsx(
            'h-8 w-8 text-gray-400 dark:text-gray-600',
            !reducedMotion && 'animate-pulse'
          )}
          fill='currentColor'
          viewBox='0 0 20 20'
          aria-hidden='true'
          focusable='false'
        >
          <path d='M3 3h14v14H3V3zm2 2v10h10V5H5zm2 2h2v2H7V7zm4 0h2v2h-2V7zm-4 4h2v2H7v-2zm4 0h2v2h-2v-2z' />
        </svg>
      </div>
      <span className='sr-only'>{QR_SCREEN_READER_TEXTS.loadingQrCode}</span>
    </div>
  );
};

/**
 * Error display component
 */
const QRCodeError: React.FC<{
  error: string;
  size: keyof typeof SIZE_CONFIG;
  productId: string;
}> = ({ error, size, productId }) => {
  const config = SIZE_CONFIG[size];

  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center rounded-lg border-2 border-red-300 bg-red-50 p-4 dark:border-red-600 dark:bg-red-900/20',
        config.container
      )}
      role='alert'
      aria-label={`QR code generation failed for product ${productId}`}
    >
      <svg
        className='mb-2 h-6 w-6 text-red-600 dark:text-red-400'
        fill='none'
        viewBox='0 0 24 24'
        stroke='currentColor'
        aria-hidden='true'
      >
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.96-.833-2.732 0L3.732 16.5C2.962 18.333 3.924 20 5.464 20z'
        />
      </svg>
      <span
        className={clsx(
          'text-center text-red-700 dark:text-red-300',
          config.text
        )}
      >
        QR Error
      </span>
      <span className='sr-only'>{error}</span>
    </div>
  );
};

/**
 * Download button component with enhanced accessibility
 */
const DownloadButton: React.FC<{
  qrCode: QRCodeResult;
  size: keyof typeof SIZE_CONFIG;
  onDownload?: (qrCode: QRCodeResult, format: QRCodeFormat) => void;
}> = ({ qrCode, size, onDownload }) => {
  const config = SIZE_CONFIG[size];
  const [isDownloading, setIsDownloading] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = prefersReducedMotion();

  const handleDownload = async () => {
    if (isDownloading || !onDownload) return;

    setIsDownloading(true);
    announceToScreenReader('Starting download...', 'polite');

    try {
      await onDownload(qrCode, qrCode.format);
      announceToScreenReader(
        `QR code downloaded as ${qrCode.format.toUpperCase()}`,
        'polite'
      );
    } catch (error) {
      // Download failed
      announceToScreenReader('Download failed. Please try again.', 'assertive');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    handleQRKeyboardInteraction(event, handleDownload);
  };

  // Validate touch target size
  useEffect(() => {
    if (buttonRef.current) {
      const validation = validateTouchTarget(buttonRef.current);
      if (!validation.isValid) {
        // Download button touch target validation failed
      }
    }
  }, []);

  return (
    <button
      ref={buttonRef}
      onClick={handleDownload}
      onKeyDown={handleKeyDown}
      disabled={isDownloading}
      className={clsx(
        'inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600',
        'bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700',
        'font-medium text-gray-700 dark:text-gray-200',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800',
        'focus-visible:ring-2 focus-visible:ring-blue-500', // Enhanced focus visibility
        'disabled:cursor-not-allowed disabled:opacity-50',
        !reducedMotion && 'transition-all duration-200',
        config.button,
        // High contrast mode improvements
        isHighContrastMode() && 'border-2 focus:border-4'
      )}
      style={{
        minHeight: Math.max(
          parseInt(config.minTouchTarget),
          TOUCH_TARGET_SIZES.MINIMUM
        ),
        minWidth: Math.max(
          parseInt(config.minTouchTarget),
          TOUCH_TARGET_SIZES.MINIMUM
        ),
      }}
      aria-label={QR_SCREEN_READER_TEXTS.downloadAs(qrCode.format)}
      aria-describedby={`download-help-${qrCode.format}`}
    >
      {isDownloading ? (
        <>
          <svg
            className={clsx(
              '-ml-1 mr-2 h-4 w-4',
              !reducedMotion && 'animate-spin'
            )}
            fill='none'
            viewBox='0 0 24 24'
            aria-hidden='true'
            focusable='false'
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
              d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
            />
          </svg>
          <span>Downloading...</span>
          <span className='sr-only'>Download in progress, please wait</span>
        </>
      ) : (
        <>
          <svg
            className='mr-2 h-4 w-4'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
            aria-hidden='true'
            focusable='false'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4'
            />
          </svg>
          <span>Download</span>
        </>
      )}

      {/* Hidden help text */}
      <span id={`download-help-${qrCode.format}`} className='sr-only'>
        Downloads the QR code as a {qrCode.format.toUpperCase()} file
      </span>
    </button>
  );
};

/**
 * Metadata display component
 */
const QRCodeMetadata: React.FC<{
  qrCode: QRCodeResult;
  productId: string;
  size: keyof typeof SIZE_CONFIG;
}> = ({ qrCode, productId, size }) => {
  const config = SIZE_CONFIG[size];

  return (
    <div className='mt-3 space-y-1'>
      <div className={clsx('text-gray-600 dark:text-gray-400', config.text)}>
        <span className='font-medium'>Product:</span> {productId}
      </div>
      <div className={clsx('text-gray-600 dark:text-gray-400', config.text)}>
        <span className='font-medium'>Format:</span>{' '}
        {qrCode.format.toUpperCase()}
      </div>
      <div className={clsx('text-gray-600 dark:text-gray-400', config.text)}>
        <span className='font-medium'>Size:</span> {qrCode.dimensions.width}×
        {qrCode.dimensions.height}
      </div>
      <div className={clsx('text-gray-600 dark:text-gray-400', config.text)}>
        <span className='font-medium'>Generated:</span>{' '}
        {qrCode.timestamp.toLocaleDateString()}
      </div>
    </div>
  );
};

/**
 * QRCodeDisplay Component
 *
 * Displays QR codes with comprehensive accessibility, responsive design,
 * and interaction capabilities following ChainTrace design patterns.
 *
 * @example
 * ```tsx
 * // Basic display
 * <QRCodeDisplay
 *   qrCode={qrResult}
 *   productId="CT-2024-123-ABC123"
 * />
 *
 * // With download and metadata
 * <QRCodeDisplay
 *   qrCode={qrResult}
 *   productId="CT-2024-123-ABC123"
 *   size="large"
 *   showDownload
 *   showMetadata
 *   onDownload={handleDownload}
 * />
 *
 * // Loading state
 * <QRCodeDisplay
 *   qrCode={null}
 *   productId="CT-2024-123-ABC123"
 *   isLoading
 * />
 * ```
 */
export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  qrCode,
  productId,
  size = 'medium',
  showDownload = false,
  showMetadata = false,
  className,
  isLoading = false,
  error,
  onDownload,
  onClick,
}) => {
  const config = SIZE_CONFIG[size];

  // Refs and accessibility state (must be at top level)
  const qrDisplayRef = useRef<HTMLDivElement>(null);
  const metadataId = `qr-metadata-${productId}`;
  const reducedMotion = prefersReducedMotion();

  const handleQRClick = () => {
    if (onClick) {
      onClick(qrCode);
      announceToScreenReader(`QR code for ${productId} activated`, 'polite');
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    handleQRKeyboardInteraction(
      event,
      onClick ? () => handleQRClick() : undefined
    );
  };

  // Validate touch target on mount
  useEffect(() => {
    if (qrDisplayRef.current && onClick) {
      const validation = validateTouchTarget(qrDisplayRef.current);
      if (!validation.isValid) {
        // QR display touch target validation failed
      }
    }
  }, [onClick]);

  // Generate comprehensive accessibility attributes
  const qrAltText = qrCode
    ? generateQRAltText(
        productId,
        qrCode.encodedData,
        qrCode.format,
        qrCode.dimensions
      )
    : '';

  const qrDescribedBy = qrCode
    ? generateQRDescribedBy(
        productId,
        qrCode.format,
        qrCode.timestamp,
        qrCode.metadata?.errorLevel
      )
    : '';

  // Loading state
  if (isLoading) {
    return (
      <div className={clsx('flex flex-col items-center', className)}>
        <QRCodeSkeleton size={size} />
        {showMetadata && (
          <div className='mt-3 animate-pulse space-y-1'>
            <div className='h-4 w-32 rounded bg-gray-200 dark:bg-gray-700' />
            <div className='h-4 w-24 rounded bg-gray-200 dark:bg-gray-700' />
          </div>
        )}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={clsx('flex flex-col items-center', className)}>
        <QRCodeError error={error} size={size} productId={productId} />
        {showMetadata && (
          <div className='mt-3'>
            <div
              className={clsx('text-gray-500 dark:text-gray-400', config.text)}
            >
              Failed to generate QR code
            </div>
          </div>
        )}
      </div>
    );
  }

  // No QR code data
  if (!qrCode) {
    return (
      <div className={clsx('flex flex-col items-center', className)}>
        <div
          className={clsx(
            'flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600',
            config.container
          )}
        >
          <div className='text-center'>
            <svg
              className='mx-auto mb-2 h-8 w-8 text-gray-400 dark:text-gray-600'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
              aria-hidden='true'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 4v16m8-8H4'
              />
            </svg>
            <span
              className={clsx('text-gray-500 dark:text-gray-400', config.text)}
            >
              No QR Code
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('flex flex-col items-center', className)}>
      {/* QR Code Display */}
      <div
        ref={qrDisplayRef}
        className={clsx(
          'relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700',
          'bg-white p-2 dark:bg-gray-800',
          onClick && [
            'cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            'focus-visible:ring-2 focus-visible:ring-blue-500',
            !reducedMotion && 'transition-all duration-200 hover:shadow-lg',
            reducedMotion && 'hover:shadow-lg',
          ],
          config.container,
          // High contrast mode improvements
          isHighContrastMode() && 'border-2',
          onClick && isHighContrastMode() && 'focus:border-4'
        )}
        onClick={onClick ? handleQRClick : undefined}
        onKeyDown={onClick ? handleKeyDown : undefined}
        tabIndex={onClick ? 0 : -1}
        role={onClick ? 'button' : 'img'}
        aria-label={qrAltText}
        aria-describedby={
          showMetadata
            ? metadataId
            : qrDescribedBy
              ? `qr-description-${productId}`
              : undefined
        }
        style={
          onClick
            ? {
                minHeight: TOUCH_TARGET_SIZES.MINIMUM,
                minWidth: TOUCH_TARGET_SIZES.MINIMUM,
              }
            : undefined
        }
      >
        {qrCode.format === 'svg' ? (
          <div
            className={config.image}
            dangerouslySetInnerHTML={{ __html: qrCode.data }}
            aria-hidden='true'
          />
        ) : (
          <img
            src={qrCode.data}
            alt={qrAltText}
            className={clsx(config.image, 'object-contain')}
            style={{
              imageRendering: 'pixelated', // Maintain crisp QR code edges
              maxWidth: '100%',
              height: 'auto',
            }}
            loading='lazy'
            decoding='async'
          />
        )}

        {/* Click indicator */}
        {onClick && (
          <div className='absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity duration-200 hover:opacity-100'>
            <div className='rounded-full bg-white/90 p-2 dark:bg-gray-800/90'>
              <svg
                className='h-6 w-6 text-gray-700 dark:text-gray-200'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
                aria-hidden='true'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
                />
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
                />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Download Button */}
      {showDownload && onDownload && (
        <div className='mt-3'>
          <DownloadButton qrCode={qrCode} size={size} onDownload={onDownload} />
        </div>
      )}

      {/* Metadata */}
      {showMetadata && (
        <div id={metadataId} role='region' aria-label='QR code details'>
          <QRCodeMetadata qrCode={qrCode} productId={productId} size={size} />
        </div>
      )}

      {/* Hidden description for screen readers when metadata is not shown */}
      {!showMetadata && qrDescribedBy && (
        <div id={`qr-description-${productId}`} className='sr-only'>
          {qrDescribedBy}
        </div>
      )}

      {/* Skip link for keyboard users */}
      {onClick && (
        <div className='sr-only'>
          Press Enter or Space to interact with QR code
        </div>
      )}
    </div>
  );
};

export default QRCodeDisplay;
