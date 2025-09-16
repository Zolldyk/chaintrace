/**
 * AutoComplete dropdown component for product ID suggestions.
 *
 * @example
 * ```tsx
 * <AutoCompleteDropdown
 *   suggestions={suggestions}
 *   selectedIndex={selectedIndex}
 *   onSelect={(suggestion) => console.log('Selected:', suggestion)}
 *   visible={showSuggestions}
 * />
 * ```
 *
 * @since 1.0.0
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { AutoCompleteSuggestion } from '@/types/search';

export interface AutoCompleteDropdownProps {
  /** Array of suggestions to display */
  suggestions: AutoCompleteSuggestion[];

  /** Currently selected suggestion index */
  selectedIndex: number;

  /** Callback when a suggestion is selected */
  onSelect: (suggestion: AutoCompleteSuggestion) => void;

  /** Whether the dropdown is visible */
  visible: boolean;

  /** Additional CSS classes */
  className?: string;

  /** Maximum height of the dropdown */
  maxHeight?: string;

  /** Loading state */
  loading?: boolean;

  /** Empty state message */
  emptyMessage?: string;
}

/**
 * AutoComplete dropdown component with keyboard navigation and accessibility.
 */
export const AutoCompleteDropdown = React.forwardRef<
  HTMLDivElement,
  AutoCompleteDropdownProps
>(
  (
    {
      suggestions,
      selectedIndex,
      onSelect,
      visible,
      className,
      maxHeight = '200px',
      loading = false,
      emptyMessage = 'No suggestions found',
      ...props
    },
    ref
  ) => {
    const listRef = React.useRef<HTMLUListElement>(null);

    /**
     * Scroll selected item into view
     */
    React.useEffect(() => {
      if (selectedIndex >= 0 && listRef.current) {
        const selectedItem = listRef.current.children[
          selectedIndex
        ] as HTMLElement;
        if (selectedItem) {
          selectedItem.scrollIntoView({
            block: 'nearest',
            behavior: 'smooth',
          });
        }
      }
    }, [selectedIndex]);

    if (!visible) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={cn(
          'border-secondary-300 absolute left-0 right-0 top-full z-50 mt-1 animate-fade-in rounded-md border bg-white shadow-lg',
          'dark:border-secondary-600 dark:bg-gray-800',
          className
        )}
        style={{ maxHeight }}
        role='listbox'
        aria-label='Product ID suggestions'
        {...props}
      >
        {loading ? (
          <div className='flex items-center justify-center py-3'>
            <svg
              className='text-secondary-400 h-5 w-5 animate-spin'
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
            <span className='ml-2 text-sm text-secondary-500'>
              Loading suggestions...
            </span>
          </div>
        ) : suggestions.length === 0 ? (
          <div className='px-4 py-3 text-center text-sm text-secondary-500'>
            {emptyMessage}
          </div>
        ) : (
          <ul
            ref={listRef}
            className='max-h-full overflow-y-auto py-1'
            role='listbox'
          >
            {suggestions.map((suggestion, index) => (
              <li
                key={`${suggestion.productId}-${index}`}
                className={cn(
                  'relative cursor-pointer select-none px-4 py-2 text-sm',
                  'hover:bg-secondary-50 dark:hover:bg-secondary-700',
                  'focus:bg-secondary-50 dark:focus:bg-secondary-700',
                  selectedIndex === index &&
                    'text-primary-900 dark:bg-primary-900 bg-primary-50 dark:text-primary-100'
                )}
                onClick={() => onSelect(suggestion)}
                onMouseEnter={() => {
                  // Could emit an event here to update selected index
                }}
                role='option'
                aria-selected={selectedIndex === index}
              >
                <div className='flex items-center justify-between'>
                  <div className='min-w-0 flex-1'>
                    <div className='flex items-center space-x-2'>
                      {/* Product ID */}
                      <span className='truncate font-mono text-sm'>
                        {suggestion.productId}
                      </span>

                      {/* History indicator */}
                      {suggestion.fromHistory && (
                        <span className='text-secondary-800 dark:text-secondary-200 inline-flex items-center rounded bg-secondary-100 px-1.5 py-0.5 text-xs font-medium dark:bg-secondary-700'>
                          <svg
                            className='mr-1 h-3 w-3'
                            fill='currentColor'
                            viewBox='0 0 20 20'
                          >
                            <path
                              fillRule='evenodd'
                              d='M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z'
                              clipRule='evenodd'
                            />
                          </svg>
                          Recent
                        </span>
                      )}

                      {/* Verification status */}
                      {suggestion.verificationStatus && (
                        <VerificationStatusBadge
                          status={suggestion.verificationStatus}
                        />
                      )}
                    </div>

                    {/* Product label if different from ID */}
                    {suggestion.label !== suggestion.productId && (
                      <div className='mt-1 truncate text-xs text-secondary-500'>
                        {suggestion.label}
                      </div>
                    )}

                    {/* Last verified timestamp */}
                    {suggestion.lastVerified && (
                      <div className='text-secondary-400 mt-1 text-xs'>
                        Last verified:{' '}
                        {formatRelativeTime(suggestion.lastVerified)}
                      </div>
                    )}
                  </div>

                  {/* Match score indicator (only show for fuzzy matches) */}
                  {suggestion.matchScore < 1 && (
                    <div className='ml-2 flex-shrink-0'>
                      <div
                        className='h-2 w-2 rounded-full'
                        style={{
                          backgroundColor: getMatchScoreColor(
                            suggestion.matchScore
                          ),
                        }}
                        title={`Match: ${Math.round(suggestion.matchScore * 100)}%`}
                      />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Footer with keyboard hints */}
        {suggestions.length > 0 && (
          <div className='border-secondary-200 dark:bg-secondary-800 border-t bg-secondary-50 px-4 py-2 dark:border-secondary-600'>
            <div className='flex items-center justify-between text-xs text-secondary-500'>
              <span>Use ↑↓ to navigate</span>
              <span>Enter to select • Tab to complete • Esc to close</span>
            </div>
          </div>
        )}
      </div>
    );
  }
);

AutoCompleteDropdown.displayName = 'AutoCompleteDropdown';

/**
 * Verification status badge component
 */
function VerificationStatusBadge({ status }: { status: string }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-secondary-100 text-secondary-800 dark:bg-secondary-700 dark:text-secondary-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <svg className='h-3 w-3' fill='currentColor' viewBox='0 0 20 20'>
            <path
              fillRule='evenodd'
              d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
              clipRule='evenodd'
            />
          </svg>
        );
      case 'pending':
        return (
          <svg className='h-3 w-3' fill='currentColor' viewBox='0 0 20 20'>
            <path
              fillRule='evenodd'
              d='M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z'
              clipRule='evenodd'
            />
          </svg>
        );
      case 'error':
        return (
          <svg className='h-3 w-3' fill='currentColor' viewBox='0 0 20 20'>
            <path
              fillRule='evenodd'
              d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
              clipRule='evenodd'
            />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium',
        getStatusColor(status)
      )}
    >
      {getStatusIcon(status)}
      <span className='ml-1 capitalize'>{status}</span>
    </span>
  );
}

/**
 * Formats a date as relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Gets color for match score indicator
 */
function getMatchScoreColor(score: number): string {
  if (score >= 0.9) return '#10b981'; // green-500
  if (score >= 0.7) return '#f59e0b'; // amber-500
  return '#ef4444'; // red-500
}
