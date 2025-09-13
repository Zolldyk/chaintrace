/**
 * QRCodeGenerator Component
 *
 * Comprehensive QR code generation interface for cooperative managers.
 * Supports bulk generation, format selection, customization options,
 * and download capabilities with progress tracking.
 *
 * @since 2.4.0
 */

'use client';

import React, { useState, useCallback, useRef, useId } from 'react';
import { clsx } from 'clsx';
import { QRCodeDisplay } from '../ui/QRCodeDisplay';
import {
  announceToScreenReader,
  QR_SCREEN_READER_TEXTS,
  TOUCH_TARGET_SIZES,
  prefersReducedMotion,
  isHighContrastMode,
} from '../../lib/accessibility/qr-accessibility';
import {
  generateProductQRCode,
  generateProductQRCodeBatch,
  generateQRFilename,
} from '../../lib/qr-generation';
import type {
  QRCodeOptions,
  QRCodeResult,
  QRCodeBatchRequest,
  QRCodeBatchResult,
  QRCodeFormat,
} from '../../types/qr';

/**
 * Generation mode selection
 */
type GenerationMode = 'single' | 'batch';

/**
 * Props for QRCodeGenerator component
 */
export interface QRCodeGeneratorProps {
  /** Pre-filled product IDs for generation */
  productIds?: string[];

  /** Default generation options */
  defaultOptions?: Partial<QRCodeOptions>;

  /** Callback when QR codes are generated successfully */
  onGenerated?: (results: QRCodeResult | QRCodeBatchResult) => void;

  /** Callback when generation fails */
  onError?: (error: Error) => void;

  /** Custom CSS classes */
  className?: string;

  /** Whether to show advanced options */
  showAdvancedOptions?: boolean;

  /** Maximum batch size allowed */
  maxBatchSize?: number;
}

/**
 * Generation state for progress tracking
 */
interface GenerationState {
  isGenerating: boolean;
  progress: number;
  currentStep: string;
  results: QRCodeResult[];
  errors: Array<{ productId: string; error: string }>;
}

/**
 * Form validation state
 */
interface ValidationState {
  productIds: string[];
  errors: string[];
  isValid: boolean;
}

/**
 * Format option configuration
 */
const FORMAT_OPTIONS: Array<{
  value: QRCodeFormat;
  label: string;
  description: string;
  recommended: string[];
}> = [
  {
    value: 'png',
    label: 'PNG',
    description: 'Best for web display and general use',
    recommended: ['Web', 'Email', 'Digital'],
  },
  {
    value: 'svg',
    label: 'SVG',
    description: 'Perfect for printing and scaling',
    recommended: ['Print', 'Packaging', 'Large sizes'],
  },
  {
    value: 'jpeg',
    label: 'JPEG',
    description: 'Smaller file size, good compression',
    recommended: ['Mobile', 'Social media'],
  },
  {
    value: 'webp',
    label: 'WebP',
    description: 'Modern format with excellent compression',
    recommended: ['Modern browsers', 'Performance'],
  },
];

/**
 * Size preset options
 */
const SIZE_PRESETS = [
  { value: 200, label: 'Small (200px)', recommended: 'Mobile screens' },
  { value: 256, label: 'Medium (256px)', recommended: 'General use' },
  { value: 400, label: 'Large (400px)', recommended: 'Desktop displays' },
  { value: 512, label: 'Extra Large (512px)', recommended: 'Printing' },
];

/**
 * Error correction level options
 */
const ERROR_LEVELS = [
  { value: 'L', label: 'Low (~7%)', description: 'Fastest scanning' },
  { value: 'M', label: 'Medium (~15%)', description: 'Good balance' },
  { value: 'Q', label: 'Quartile (~25%)', description: 'More reliable' },
  { value: 'H', label: 'High (~30%)', description: 'Maximum reliability' },
] as const;

/**
 * Progress indicator component with enhanced accessibility
 */
const GenerationProgress: React.FC<{
  state: GenerationState;
  total: number;
}> = ({ state, total }) => {
  const percentage = Math.round((state.progress / total) * 100);
  const progressId = useId();
  const reducedMotion = prefersReducedMotion();

  return (
    <div
      className='space-y-3'
      role='region'
      aria-labelledby={`${progressId}-label`}
    >
      <div className='flex items-center justify-between'>
        <span
          id={`${progressId}-label`}
          className='text-sm font-medium text-gray-700 dark:text-gray-300'
        >
          {state.currentStep}
        </span>
        <span
          className='text-sm text-gray-500 dark:text-gray-400'
          aria-label={`${state.progress} of ${total} completed`}
        >
          {state.progress} / {total}
        </span>
      </div>

      <div
        className='h-3 w-full rounded-full bg-gray-200 dark:bg-gray-700'
        role='progressbar'
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-labelledby={`${progressId}-label`}
        aria-describedby={`${progressId}-status`}
      >
        <div
          className={clsx(
            'h-3 rounded-full bg-blue-600',
            !reducedMotion && 'transition-all duration-300 ease-out',
            // High contrast mode improvements
            isHighContrastMode() && 'border border-white'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div id={`${progressId}-status`} className='sr-only' aria-live='polite'>
        {QR_SCREEN_READER_TEXTS.generationProgress(state.progress, total)}
      </div>

      {state.errors.length > 0 && (
        <div
          className='text-sm text-red-600 dark:text-red-400'
          role='alert'
          aria-live='assertive'
        >
          {state.errors.length} error(s) encountered
        </div>
      )}
    </div>
  );
};

/**
 * QRCodeGenerator Component
 *
 * Comprehensive interface for generating QR codes with support for
 * single and batch operations, format customization, and progress tracking.
 */
export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  productIds: initialProductIds = [],
  defaultOptions = {},
  onGenerated,
  onError,
  className,
  showAdvancedOptions = true,
  maxBatchSize = 100,
}) => {
  // Form state
  const [mode, setMode] = useState<GenerationMode>('single');
  const [singleProductId, setSingleProductId] = useState('');
  const [batchProductIds, setBatchProductIds] = useState(
    initialProductIds.join('\n')
  );
  const [options, setOptions] = useState<QRCodeOptions>({
    format: 'png',
    size: 256,
    errorCorrectionLevel: 'M',
    margin: 2,
    ...defaultOptions,
  });

  // Generation state
  const [generationState, setGenerationState] = useState<GenerationState>({
    isGenerating: false,
    progress: 0,
    currentStep: '',
    results: [],
    errors: [],
  });

  // Preview state
  const [previewResult, setPreviewResult] = useState<QRCodeResult | null>(null);

  // Refs and IDs for accessibility
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reducedMotion = prefersReducedMotion();

  // Validation
  const validateInput = useCallback((): ValidationState => {
    const productIds =
      mode === 'single'
        ? [singleProductId.trim()]
        : batchProductIds
            .split('\n')
            .map(id => id.trim())
            .filter(Boolean);

    const errors: string[] = [];

    if (productIds.length === 0) {
      errors.push('At least one product ID is required');
    }

    if (productIds.some(id => !id)) {
      errors.push('All product IDs must be non-empty');
    }

    if (mode === 'batch' && productIds.length > maxBatchSize) {
      errors.push(`Batch size cannot exceed ${maxBatchSize} products`);
    }

    // Validate product ID format (basic check)
    const invalidIds = productIds.filter(
      id => id && !id.match(/^CT-\d{4}-\d{3}-[A-F0-9]{6}$/)
    );

    if (invalidIds.length > 0) {
      errors.push(
        `Invalid product ID format: ${invalidIds.slice(0, 3).join(', ')}${invalidIds.length > 3 ? '...' : ''}`
      );
    }

    return {
      productIds,
      errors,
      isValid: errors.length === 0,
    };
  }, [mode, singleProductId, batchProductIds, maxBatchSize]);

  // Generate QR codes with accessibility announcements
  const handleGenerate = async () => {
    const validation = validateInput();

    if (!validation.isValid) {
      onError?.(new Error(validation.errors.join('; ')));
      announceToScreenReader(
        'Generation failed due to validation errors',
        'assertive'
      );
      return;
    }

    announceToScreenReader('Starting QR code generation...', 'polite');

    setGenerationState({
      isGenerating: true,
      progress: 0,
      currentStep: 'Starting generation...',
      results: [],
      errors: [],
    });

    try {
      if (mode === 'single') {
        setGenerationState(prev => ({
          ...prev,
          currentStep: 'Generating QR code...',
          progress: 1,
        }));

        const result = await generateProductQRCode(
          validation.productIds[0],
          options
        );

        setGenerationState(prev => ({
          ...prev,
          currentStep: 'Complete',
          progress: 1,
          results: [result],
        }));

        setPreviewResult(result);
        onGenerated?.(result);
        announceToScreenReader('QR code generated successfully', 'polite');
      } else {
        // Batch generation
        const batchRequest: QRCodeBatchRequest = {
          productIds: validation.productIds,
          options,
          filenamePrefix: `qr-batch-${Date.now()}`,
          includeMetadata: true,
        };

        // Simulate progress updates (in real implementation, this would be handled by the batch function)
        let progress = 0;
        const progressInterval = setInterval(() => {
          progress = Math.min(progress + 1, validation.productIds.length - 1);
          setGenerationState(prev => ({
            ...prev,
            currentStep: `Generating QR code ${progress + 1} of ${validation.productIds.length}...`,
            progress: progress + 1,
          }));
        }, 100);

        const batchResult = await generateProductQRCodeBatch(batchRequest);
        clearInterval(progressInterval);

        setGenerationState(prev => ({
          ...prev,
          currentStep: 'Batch generation complete',
          progress: validation.productIds.length,
          results: batchResult.results.map(r => r.qrCode),
          errors: batchResult.errors,
        }));

        onGenerated?.(batchResult);

        const successCount = batchResult.results.length;
        const failureCount = batchResult.errors.length;
        announceToScreenReader(
          QR_SCREEN_READER_TEXTS.batchComplete(successCount, failureCount),
          'polite'
        );
      }
    } catch (error) {
      setGenerationState(prev => ({
        ...prev,
        isGenerating: false,
        currentStep: 'Generation failed',
        errors: [
          ...prev.errors,
          {
            productId: 'unknown',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
      }));

      onError?.(
        error instanceof Error ? error : new Error('Generation failed')
      );
      announceToScreenReader('QR code generation failed', 'assertive');
    } finally {
      setGenerationState(prev => ({ ...prev, isGenerating: false }));
    }
  };

  // Download handler
  const handleDownload = useCallback(
    async (qrCode: QRCodeResult, format: QRCodeFormat) => {
      const filename = generateQRFilename(
        'product',
        { format, size: qrCode.dimensions.width },
        'chaintrace'
      );

      if (qrCode.format === 'svg') {
        // Download SVG
        const blob = new Blob([qrCode.data], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Download raster format
        const a = document.createElement('a');
        a.href = qrCode.data;
        a.download = filename;
        a.click();
      }
    },
    []
  );

  // Import from file
  const handleFileImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      const content = e.target?.result as string;
      setBatchProductIds(content);
      setMode('batch');
    };
    reader.readAsText(file);
  };

  const validation = validateInput();
  const canGenerate = validation.isValid && !generationState.isGenerating;

  const isCompactLayout = className?.includes('compact-layout');

  return (
    <div
      className={clsx(isCompactLayout ? 'space-y-4' : 'space-y-6', className)}
    >
      {/* Header */}
      {!isCompactLayout && (
        <div>
          <h2 className='text-2xl font-bold text-gray-900 dark:text-white'>
            QR Code Generator
          </h2>
          <p className='mt-1 text-gray-600 dark:text-gray-400'>
            Generate QR codes for product verification with customizable options
          </p>
        </div>
      )}

      {isCompactLayout && (
        <div>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
            QR Code Generator
          </h3>
          <p className='mt-1 text-sm text-gray-600 dark:text-gray-400'>
            Generate QR codes for product verification with customizable options
          </p>
        </div>
      )}

      {/* Mode Selection */}
      <div
        role='tablist'
        aria-label='QR code generation mode'
        className='flex space-x-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800'
      >
        <button
          role='tab'
          aria-selected={mode === 'single'}
          aria-controls='single-mode-panel'
          onClick={() => {
            setMode('single');
            announceToScreenReader('Single QR code mode selected', 'polite');
          }}
          className={clsx(
            'flex-1 rounded-md px-4 py-2 text-sm font-medium',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            !reducedMotion && 'transition-colors duration-200',
            mode === 'single'
              ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
            // High contrast mode improvements
            isHighContrastMode() &&
              mode === 'single' &&
              'border-2 border-black dark:border-white'
          )}
          style={{ minHeight: TOUCH_TARGET_SIZES.MINIMUM }}
        >
          Single QR Code
        </button>
        <button
          role='tab'
          aria-selected={mode === 'batch'}
          aria-controls='batch-mode-panel'
          onClick={() => {
            setMode('batch');
            announceToScreenReader('Batch generation mode selected', 'polite');
          }}
          className={clsx(
            'flex-1 rounded-md px-4 py-2 text-sm font-medium',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            !reducedMotion && 'transition-colors duration-200',
            mode === 'batch'
              ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
            // High contrast mode improvements
            isHighContrastMode() &&
              mode === 'batch' &&
              'border-2 border-black dark:border-white'
          )}
          style={{ minHeight: TOUCH_TARGET_SIZES.MINIMUM }}
        >
          Batch Generation
        </button>
      </div>

      <div
        className={clsx(
          'grid grid-cols-1 gap-6',
          isCompactLayout ? 'space-y-4' : 'lg:grid-cols-3'
        )}
      >
        {/* Input Section */}
        <div
          className={clsx(
            isCompactLayout ? 'space-y-4' : 'space-y-6 lg:col-span-2'
          )}
        >
          {/* Product ID Input */}
          <div
            id={mode === 'single' ? 'single-mode-panel' : 'batch-mode-panel'}
            role='tabpanel'
            aria-labelledby={`${mode}-mode-tab`}
            className='rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800'
          >
            <h3 className='mb-4 text-lg font-medium text-gray-900 dark:text-white'>
              Product Information
            </h3>

            {mode === 'single' ? (
              <div>
                <label
                  htmlFor='single-product-id'
                  className='mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300'
                >
                  Product ID
                </label>
                <input
                  id='single-product-id'
                  type='text'
                  value={singleProductId}
                  onChange={e => setSingleProductId(e.target.value)}
                  placeholder='CT-2024-001-ABC123'
                  className={clsx(
                    'w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500',
                    'border-gray-300 dark:border-gray-600',
                    'bg-white dark:bg-gray-700',
                    'text-gray-900 dark:text-white',
                    'placeholder-gray-500 dark:placeholder-gray-400'
                  )}
                />
              </div>
            ) : (
              <div>
                <div className='mb-2 flex items-center justify-between'>
                  <label
                    htmlFor='batch-product-ids'
                    className='block text-sm font-medium text-gray-700 dark:text-gray-300'
                  >
                    Product IDs (one per line)
                  </label>
                  <button
                    onClick={handleFileImport}
                    className='text-sm text-blue-600 hover:underline dark:text-blue-400'
                  >
                    Import from file
                  </button>
                </div>
                <textarea
                  id='batch-product-ids'
                  value={batchProductIds}
                  onChange={e => setBatchProductIds(e.target.value)}
                  placeholder={`CT-2024-001-ABC123\nCT-2024-002-DEF456\nCT-2024-003-GHI789`}
                  rows={6}
                  className={clsx(
                    'w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500',
                    'border-gray-300 dark:border-gray-600',
                    'bg-white dark:bg-gray-700',
                    'text-gray-900 dark:text-white',
                    'placeholder-gray-500 dark:placeholder-gray-400'
                  )}
                />
                <div className='mt-2 text-sm text-gray-500 dark:text-gray-400'>
                  {validation.productIds.length} product
                  {validation.productIds.length !== 1 ? 's' : ''} • Max{' '}
                  {maxBatchSize}
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type='file'
              accept='.txt,.csv'
              onChange={handleFileLoad}
              className='hidden'
            />
          </div>

          {/* Generation Options */}
          <div className='rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800'>
            <h3 className='mb-4 text-lg font-medium text-gray-900 dark:text-white'>
              Generation Options
            </h3>

            <div
              className={clsx(
                'grid grid-cols-1 gap-4',
                !isCompactLayout && 'md:grid-cols-2'
              )}
            >
              {/* Format Selection */}
              <div>
                <label className='mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300'>
                  Output Format
                </label>
                <select
                  value={options.format}
                  onChange={e =>
                    setOptions(prev => ({
                      ...prev,
                      format: e.target.value as QRCodeFormat,
                    }))
                  }
                  className={clsx(
                    'w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500',
                    'border-gray-300 dark:border-gray-600',
                    'bg-white dark:bg-gray-700',
                    'text-gray-900 dark:text-white'
                  )}
                >
                  {FORMAT_OPTIONS.map(format => (
                    <option key={format.value} value={format.value}>
                      {format.label} - {format.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Size Selection */}
              <div>
                <label className='mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300'>
                  Size
                </label>
                <select
                  value={options.size}
                  onChange={e =>
                    setOptions(prev => ({
                      ...prev,
                      size: Number(e.target.value),
                    }))
                  }
                  className={clsx(
                    'w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500',
                    'border-gray-300 dark:border-gray-600',
                    'bg-white dark:bg-gray-700',
                    'text-gray-900 dark:text-white'
                  )}
                >
                  {SIZE_PRESETS.map(preset => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label} - {preset.recommended}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Advanced Options */}
            {showAdvancedOptions && (
              <div className='mt-4 border-t border-gray-200 pt-4 dark:border-gray-600'>
                <h4 className='mb-3 text-sm font-medium text-gray-700 dark:text-gray-300'>
                  Advanced Options
                </h4>

                <div
                  className={clsx(
                    'grid grid-cols-1 gap-4',
                    !isCompactLayout && 'md:grid-cols-2'
                  )}
                >
                  <div>
                    <label className='mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300'>
                      Error Correction
                    </label>
                    <select
                      value={options.errorCorrectionLevel}
                      onChange={e =>
                        setOptions(prev => ({
                          ...prev,
                          errorCorrectionLevel: e.target.value as any,
                        }))
                      }
                      className={clsx(
                        'w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500',
                        'border-gray-300 dark:border-gray-600',
                        'bg-white dark:bg-gray-700',
                        'text-gray-900 dark:text-white'
                      )}
                    >
                      {ERROR_LEVELS.map(level => (
                        <option key={level.value} value={level.value}>
                          {level.label} - {level.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className='mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300'>
                      Margin
                    </label>
                    <input
                      type='range'
                      min='0'
                      max='8'
                      value={options.margin}
                      onChange={e =>
                        setOptions(prev => ({
                          ...prev,
                          margin: Number(e.target.value),
                        }))
                      }
                      className='w-full'
                    />
                    <div className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                      {options.margin} pixels
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Validation Errors */}
          {validation.errors.length > 0 && (
            <div className='rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20'>
              <h4 className='mb-2 text-sm font-medium text-red-800 dark:text-red-200'>
                Please fix the following errors:
              </h4>
              <ul className='space-y-1 text-sm text-red-700 dark:text-red-300'>
                {validation.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Generation Progress */}
          {generationState.isGenerating && (
            <div className='rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20'>
              <GenerationProgress
                state={generationState}
                total={validation.productIds.length}
              />
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className={clsx(
              'flex w-full items-center justify-center rounded-md border border-transparent px-4 py-3 text-base font-medium shadow-sm',
              canGenerate
                ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                : 'cursor-not-allowed bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500',
              'transition-colors duration-200'
            )}
          >
            {generationState.isGenerating ? (
              <>
                <svg
                  className='-ml-1 mr-3 h-5 w-5 animate-spin text-white'
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
                    d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                  />
                </svg>
                Generating QR Code{mode === 'batch' ? 's' : ''}...
              </>
            ) : (
              <>Generate QR Code{mode === 'batch' ? 's' : ''}</>
            )}
          </button>
        </div>

        {/* Preview Section */}
        <div className={clsx(isCompactLayout ? 'space-y-4' : 'space-y-6')}>
          <div
            className={clsx(
              'rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800',
              isCompactLayout ? 'p-4' : 'p-6'
            )}
          >
            <h3 className='mb-4 text-lg font-medium text-gray-900 dark:text-white'>
              Preview
            </h3>

            {previewResult ? (
              <QRCodeDisplay
                qrCode={previewResult}
                productId={mode === 'single' ? singleProductId : 'Preview'}
                size='large'
                showDownload
                showMetadata
                onDownload={handleDownload}
              />
            ) : (
              <div
                className={clsx(
                  'flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600',
                  isCompactLayout ? 'h-48' : 'h-64'
                )}
              >
                <div className='text-center'>
                  <svg
                    className='mx-auto h-12 w-12 text-gray-400 dark:text-gray-500'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M12 4v16m8-8H4'
                    />
                  </svg>
                  <span className='mt-2 block text-sm font-medium text-gray-900 dark:text-white'>
                    QR Code Preview
                  </span>
                  <span className='block text-sm text-gray-500 dark:text-gray-400'>
                    Generate a QR code to see preview
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Results Summary */}
          {generationState.results.length > 0 && (
            <div
              className={clsx(
                'rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800',
                isCompactLayout ? 'p-4' : 'p-6'
              )}
            >
              <h3 className='mb-4 text-lg font-medium text-gray-900 dark:text-white'>
                Generation Results
              </h3>

              <div className='space-y-2 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-gray-600 dark:text-gray-400'>
                    Generated:
                  </span>
                  <span className='font-medium text-green-600 dark:text-green-400'>
                    {generationState.results.length}
                  </span>
                </div>

                {generationState.errors.length > 0 && (
                  <div className='flex justify-between'>
                    <span className='text-gray-600 dark:text-gray-400'>
                      Errors:
                    </span>
                    <span className='font-medium text-red-600 dark:text-red-400'>
                      {generationState.errors.length}
                    </span>
                  </div>
                )}

                <div className='flex justify-between'>
                  <span className='text-gray-600 dark:text-gray-400'>
                    Format:
                  </span>
                  <span className='font-medium'>
                    {options.format.toUpperCase()}
                  </span>
                </div>

                <div className='flex justify-between'>
                  <span className='text-gray-600 dark:text-gray-400'>
                    Size:
                  </span>
                  <span className='font-medium'>
                    {options.size}×{options.size}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRCodeGenerator;
