/**
 * ProductFormatGuide component for displaying format hints and examples.
 *
 * @example
 * ```tsx
 * <ProductFormatGuide
 *   visible={showFormatHints}
 *   onToggle={() => setShowFormatHints(!showFormatHints)}
 *   currentInput="CT-2024"
 * />
 * ```
 *
 * @since 1.0.0
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { FormatHint } from '@/types/search';

export interface ProductFormatGuideProps {
  /** Whether the guide is visible */
  visible: boolean;

  /** Callback to toggle visibility */
  onToggle?: () => void;

  /** Current user input for context-specific hints */
  currentInput?: string;

  /** Additional CSS classes */
  className?: string;

  /** Whether to show the toggle button */
  showToggle?: boolean;

  /** Compact mode for reduced space usage */
  compact?: boolean;
}

/**
 * Format hints data
 */
const FORMAT_HINTS: FormatHint[] = [
  {
    id: 'chaintrace-format',
    text: 'ChainTrace products follow the format: CT-YYYY-XXX-XXXXXX',
    example: 'CT-2024-123-ABC123',
    showWhen: 'always',
    priority: 10,
  },
  {
    id: 'year-part',
    text: 'YYYY represents the production year (e.g., 2024)',
    example: 'CT-2024-123-ABC123',
    showWhen: 'focus',
    priority: 8,
  },
  {
    id: 'sequence-part',
    text: 'XXX is a 3-digit sequence number (001-999)',
    example: 'CT-2024-123-ABC123',
    showWhen: 'focus',
    priority: 7,
  },
  {
    id: 'hex-part',
    text: 'XXXXXX is a 6-character hexadecimal code (A-F, 0-9)',
    example: 'CT-2024-123-ABC123',
    showWhen: 'focus',
    priority: 6,
  },
  {
    id: 'legacy-format',
    text: 'Legacy formats are also supported (e.g., ABC-123-DEF)',
    example: 'FARM-001-BATCH',
    showWhen: 'invalid',
    priority: 5,
  },
  {
    id: 'case-insensitive',
    text: 'Product IDs are case-insensitive',
    example: 'ct-2024-123-abc123 → CT-2024-123-ABC123',
    showWhen: 'focus',
    priority: 4,
  },
];

/**
 * ProductFormatGuide component for helping users understand product ID formats.
 */
export const ProductFormatGuide = React.forwardRef<
  HTMLDivElement,
  ProductFormatGuideProps
>(
  (
    {
      visible,
      onToggle,
      currentInput = '',
      className,
      showToggle = true,
      compact = false,
      ...props
    },
    ref
  ) => {
    // Get relevant hints based on current context
    const relevantHints = React.useMemo(() => {
      const context = getInputContext(currentInput);

      return FORMAT_HINTS.filter(hint => {
        switch (hint.showWhen) {
          case 'always':
            return true;
          case 'empty':
            return currentInput.length === 0;
          case 'invalid':
            return context === 'invalid';
          case 'focus':
            return currentInput.length > 0 || context === 'focus';
          default:
            return true;
        }
      })
        .sort((a, b) => b.priority - a.priority)
        .slice(0, compact ? 3 : 6);
    }, [currentInput, compact]);

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-md border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20',
          visible ? 'animate-fade-in' : 'hidden',
          className
        )}
        {...props}
      >
        {/* Header */}
        <div className='flex items-center justify-between p-3 pb-2'>
          <div className='flex items-center space-x-2'>
            <svg
              className='h-5 w-5 text-blue-600 dark:text-blue-400'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
            <h3 className='text-sm font-medium text-blue-900 dark:text-blue-100'>
              Product ID Format Guide
            </h3>
          </div>

          {showToggle && onToggle && (
            <button
              onClick={onToggle}
              className='text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300'
              aria-label='Close format guide'
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
            </button>
          )}
        </div>

        {/* Content */}
        <div className='px-3 pb-3'>
          {compact ? (
            <CompactFormatGuide hints={relevantHints} />
          ) : (
            <DetailedFormatGuide
              hints={relevantHints}
              currentInput={currentInput}
            />
          )}

          {/* Interactive examples */}
          {!compact && (
            <div className='mt-3 border-t border-blue-200 pt-3 dark:border-blue-700'>
              <InteractiveExamples currentInput={currentInput} />
            </div>
          )}
        </div>
      </div>
    );
  }
);

ProductFormatGuide.displayName = 'ProductFormatGuide';

/**
 * Compact format guide for minimal space usage
 */
function CompactFormatGuide({ hints }: { hints: FormatHint[] }) {
  return (
    <div className='space-y-2'>
      {hints.slice(0, 2).map(hint => (
        <div key={hint.id} className='flex items-start space-x-2'>
          <div className='mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500' />
          <div>
            <p className='text-sm text-blue-800 dark:text-blue-200'>
              {hint.text}
            </p>
            <code className='rounded bg-blue-100 px-1.5 py-0.5 font-mono text-xs text-blue-700 dark:bg-blue-800 dark:text-blue-300'>
              {hint.example}
            </code>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Detailed format guide with full explanations
 */
function DetailedFormatGuide({
  hints,
  currentInput,
}: {
  hints: FormatHint[];
  currentInput: string;
}) {
  return (
    <div className='space-y-3'>
      {/* Primary format breakdown */}
      <div className='rounded border border-blue-200 bg-white p-3 dark:border-blue-700 dark:bg-gray-800'>
        <div className='mb-2 text-sm font-medium text-blue-900 dark:text-blue-100'>
          ChainTrace Format Breakdown:
        </div>
        <FormatBreakdown input={currentInput} />
      </div>

      {/* Format hints */}
      <div className='space-y-2'>
        {hints.map(hint => (
          <div key={hint.id} className='flex items-start space-x-3'>
            <div className='mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500' />
            <div className='flex-1'>
              <p className='text-sm text-blue-800 dark:text-blue-200'>
                {hint.text}
              </p>
              <div className='mt-1'>
                <code className='rounded bg-blue-100 px-2 py-1 font-mono text-xs text-blue-700 dark:bg-blue-800 dark:text-blue-300'>
                  {hint.example}
                </code>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Interactive format breakdown component
 */
function FormatBreakdown({ input }: { input: string }) {
  const parts = React.useMemo(() => {
    const defaultParts = [
      { label: 'Prefix', value: 'CT', description: 'ChainTrace identifier' },
      { label: 'Year', value: 'YYYY', description: 'Production year' },
      { label: 'Sequence', value: 'XXX', description: '3-digit sequence' },
      { label: 'Code', value: 'XXXXXX', description: '6-character hex code' },
    ];

    if (!input || input.length < 3) {
      return defaultParts;
    }

    // Parse current input
    const cleanInput = input.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const updatedParts = [...defaultParts];

    if (cleanInput.startsWith('CT')) {
      if (cleanInput.length > 2) {
        updatedParts[1] = {
          ...updatedParts[1],
          value: cleanInput.slice(2, 6) || 'YYYY',
        };
      }
      if (cleanInput.length > 6) {
        updatedParts[2] = {
          ...updatedParts[2],
          value: cleanInput.slice(6, 9) || 'XXX',
        };
      }
      if (cleanInput.length > 9) {
        updatedParts[3] = {
          ...updatedParts[3],
          value: cleanInput.slice(9, 15) || 'XXXXXX',
        };
      }
    }

    return updatedParts;
  }, [input]);

  return (
    <div className='text-center font-mono'>
      <div className='flex items-center justify-center space-x-1 text-lg'>
        {parts.map((part, index) => (
          <React.Fragment key={part.label}>
            {index > 0 && <span className='text-blue-400'>-</span>}
            <span
              className={cn(
                'rounded px-1 py-0.5 transition-colors',
                part.value !== ['CT', 'YYYY', 'XXX', 'XXXXXX'][index]
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
              )}
              title={part.description}
            >
              {part.value}
            </span>
          </React.Fragment>
        ))}
      </div>
      <div className='mt-2 space-x-4 text-xs text-blue-600 dark:text-blue-400'>
        {parts.map(part => (
          <span key={part.label} className='inline-block'>
            {part.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Interactive examples section
 */
function InteractiveExamples({ currentInput: _ }: { currentInput: string }) {
  const examples = [
    'CT-2024-123-ABC123',
    'CT-2023-456-DEF456',
    'FARM-001-BATCH',
  ];

  return (
    <div>
      <div className='mb-2 text-sm font-medium text-blue-900 dark:text-blue-100'>
        Example Product IDs:
      </div>
      <div className='flex flex-wrap gap-2'>
        {examples.map(example => (
          <button
            key={example}
            className='rounded border border-blue-200 bg-white px-2 py-1 font-mono text-xs text-blue-700 transition-colors hover:bg-blue-50 dark:border-blue-700 dark:bg-gray-800 dark:text-blue-300 dark:hover:bg-blue-900/20'
            onClick={() => {
              // Could emit an event to set the example as input
              navigator.clipboard?.writeText(example);
            }}
            title='Click to copy'
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Determines the input context for showing relevant hints
 */
function getInputContext(
  input: string
): 'empty' | 'invalid' | 'focus' | 'valid' {
  if (!input) return 'empty';

  const trimmed = input.trim();

  // Check if it matches ChainTrace format
  const ctPattern = /^CT-\d{4}-\d{3}-[A-F0-9]{6}$/i;
  if (ctPattern.test(trimmed)) return 'valid';

  // Check if it matches legacy format
  const legacyPattern = /^[A-Z]{2,4}-[A-Z0-9]{3,}-[A-Z0-9]{3,}$/i;
  if (legacyPattern.test(trimmed)) return 'valid';

  // Check if it's a partial ChainTrace format
  const partialPattern = /^CT(-\d{0,4}(-\d{0,3}(-[A-F0-9]{0,6})?)?)?$/i;
  if (partialPattern.test(trimmed)) return 'focus';

  return 'invalid';
}
