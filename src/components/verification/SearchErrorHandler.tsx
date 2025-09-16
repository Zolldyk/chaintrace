/**
 * SearchErrorHandler component for displaying enhanced error messages with suggestions.
 *
 * @example
 * ```tsx
 * <SearchErrorHandler
 *   error={searchError}
 *   onRetry={() => performSearch()}
 *   onSuggestionClick={(suggestion) => applySuggestion(suggestion)}
 * />
 * ```
 *
 * @since 1.0.0
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { SearchError } from '@/types/search';

export interface SearchErrorHandlerProps {
  /** Search error to display */
  error: SearchError | null;

  /** Callback when retry is clicked */
  onRetry?: () => void;

  /** Callback when a suggestion is clicked */
  onSuggestionClick?: (suggestion: string) => void;

  /** Additional CSS classes */
  className?: string;

  /** Whether to show suggestions */
  showSuggestions?: boolean;

  /** Whether to show retry button */
  showRetry?: boolean;
}

/**
 * SearchErrorHandler component for enhanced error display with actionable suggestions.
 */
export const SearchErrorHandler = React.forwardRef<
  HTMLDivElement,
  SearchErrorHandlerProps
>(
  (
    {
      error,
      onRetry,
      onSuggestionClick,
      className,
      showSuggestions = true,
      showRetry = true,
      ...props
    },
    ref
  ) => {
    if (!error) return null;

    const errorConfig = getErrorConfig(error.type);

    return (
      <div
        ref={ref}
        className={cn(
          'animate-fade-in rounded-md border border-red-200 bg-red-50 p-4',
          'dark:border-red-800 dark:bg-red-900/20',
          className
        )}
        role='alert'
        aria-live='polite'
        {...props}
      >
        {/* Error header */}
        <div className='flex items-start space-x-3'>
          <div className='flex-shrink-0'>{errorConfig.icon}</div>

          <div className='min-w-0 flex-1'>
            {/* Error title */}
            <h3 className='text-sm font-medium text-red-800 dark:text-red-200'>
              {errorConfig.title}
            </h3>

            {/* Error message */}
            <div className='mt-1 text-sm text-red-700 dark:text-red-300'>
              {error.message}
            </div>

            {/* Additional details */}
            {error.details && (
              <div className='mt-2 text-xs text-red-600 dark:text-red-400'>
                <details className='cursor-pointer'>
                  <summary className='hover:text-red-700 dark:hover:text-red-300'>
                    Show details
                  </summary>
                  <pre className='mt-1 whitespace-pre-wrap font-mono'>
                    {JSON.stringify(error.details, null, 2)}
                  </pre>
                </details>
              </div>
            )}

            {/* Suggestions */}
            {showSuggestions &&
              error.suggestions &&
              error.suggestions.length > 0 && (
                <div className='mt-3'>
                  <div className='mb-2 text-sm font-medium text-red-800 dark:text-red-200'>
                    Suggestions:
                  </div>
                  <ul className='space-y-1'>
                    {error.suggestions.map((suggestion, index) => (
                      <li key={index} className='flex items-start space-x-2'>
                        <span className='mt-0.5 text-red-500'>•</span>
                        {onSuggestionClick && suggestion.startsWith('CT-') ? (
                          <button
                            onClick={() => onSuggestionClick(suggestion)}
                            className='text-left text-sm text-red-700 underline hover:text-red-900 dark:text-red-300 dark:hover:text-red-100'
                          >
                            {suggestion}
                          </button>
                        ) : (
                          <span className='text-sm text-red-700 dark:text-red-300'>
                            {suggestion}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Actions */}
            <div className='mt-4 flex items-center space-x-3'>
              {showRetry && error.retryable && onRetry && (
                <button
                  onClick={onRetry}
                  className='inline-flex items-center rounded border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:border-red-600 dark:bg-red-900/10 dark:text-red-300 dark:hover:bg-red-900/20'
                >
                  <svg
                    className='mr-1.5 h-4 w-4'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                    />
                  </svg>
                  Try Again
                </button>
              )}

              {/* Help link */}
              <button
                onClick={() => {
                  // TODO: Implement help modal or navigation to help page
                  // Navigate to help documentation for specific error type
                }}
                className='text-sm text-red-600 underline hover:text-red-700 dark:text-red-400 dark:hover:text-red-300'
              >
                Get help with this error
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

SearchErrorHandler.displayName = 'SearchErrorHandler';

/**
 * Gets configuration for different error types
 */
function getErrorConfig(errorType: string) {
  const configs = {
    INVALID_FORMAT: {
      title: 'Invalid Product ID Format',
      icon: (
        <svg
          className='h-5 w-5 text-red-400'
          fill='currentColor'
          viewBox='0 0 20 20'
        >
          <path
            fillRule='evenodd'
            d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
            clipRule='evenodd'
          />
        </svg>
      ),
    },
    NETWORK_ERROR: {
      title: 'Network Connection Error',
      icon: (
        <svg
          className='h-5 w-5 text-red-400'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z'
          />
        </svg>
      ),
    },
    NOT_FOUND: {
      title: 'Product Not Found',
      icon: (
        <svg
          className='h-5 w-5 text-red-400'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
          />
        </svg>
      ),
    },
    RATE_LIMITED: {
      title: 'Too Many Requests',
      icon: (
        <svg
          className='h-5 w-5 text-red-400'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z'
          />
        </svg>
      ),
    },
    TIMEOUT: {
      title: 'Request Timeout',
      icon: (
        <svg
          className='h-5 w-5 text-red-400'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
          />
        </svg>
      ),
    },
    UNKNOWN_ERROR: {
      title: 'Unexpected Error',
      icon: (
        <svg
          className='h-5 w-5 text-red-400'
          fill='currentColor'
          viewBox='0 0 20 20'
        >
          <path
            fillRule='evenodd'
            d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
            clipRule='evenodd'
          />
        </svg>
      ),
    },
  };

  return configs[errorType as keyof typeof configs] || configs.UNKNOWN_ERROR;
}
