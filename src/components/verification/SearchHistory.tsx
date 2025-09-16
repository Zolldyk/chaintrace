/**
 * SearchHistory component for displaying and managing recent product searches.
 *
 * @example
 * ```tsx
 * <SearchHistory
 *   history={searchHistory}
 *   onSelect={(productId) => console.log('Selected:', productId)}
 *   onClear={() => console.log('Cleared')}
 *   visible={showHistory}
 * />
 * ```
 *
 * @since 1.0.0
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { SearchHistoryItem } from '@/types/search';

export interface SearchHistoryProps {
  /** Array of search history items */
  history: SearchHistoryItem[];

  /** Callback when a history item is selected */
  onSelect: (productId: string) => void;

  /** Callback when history is cleared */
  onClear: () => void;

  /** Callback when a specific item is removed */
  onRemove?: (productId: string) => void;

  /** Whether the history is visible */
  visible: boolean;

  /** Additional CSS classes */
  className?: string;

  /** Maximum number of items to display */
  maxItems?: number;

  /** Whether to show only successful searches */
  onlySuccessful?: boolean;
}

/**
 * SearchHistory component for managing recent product searches.
 */
export const SearchHistory = React.forwardRef<
  HTMLDivElement,
  SearchHistoryProps
>(
  (
    {
      history,
      onSelect,
      onClear,
      onRemove,
      visible,
      className,
      maxItems = 10,
      onlySuccessful = true,
      ...props
    },
    ref
  ) => {
    // Filter and limit history items
    const filteredHistory = React.useMemo(() => {
      const filtered = onlySuccessful
        ? history.filter(item => item.wasSuccessful)
        : history;
      return filtered.slice(0, maxItems);
    }, [history, onlySuccessful, maxItems]);

    if (!visible || filteredHistory.length === 0) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={cn(
          'border-secondary-300 animate-fade-in rounded-md border bg-white p-4 shadow-sm',
          'dark:border-secondary-600 dark:bg-gray-800',
          className
        )}
        {...props}
      >
        {/* Header */}
        <div className='mb-3 flex items-center justify-between'>
          <h3 className='text-secondary-900 text-sm font-medium dark:text-secondary-100'>
            Recent Searches
          </h3>
          <button
            onClick={onClear}
            className='dark:text-secondary-400 dark:hover:text-secondary-200 text-xs text-secondary-500 transition-colors hover:text-secondary-700'
            aria-label='Clear search history'
          >
            Clear all
          </button>
        </div>

        {/* History items */}
        <div className='space-y-2'>
          {filteredHistory.map((item, index) => (
            <SearchHistoryItem
              key={`${item.productId}-${item.searchedAt.getTime()}`}
              item={item}
              onSelect={() => onSelect(item.productId)}
              onRemove={onRemove ? () => onRemove(item.productId) : undefined}
              isFirst={index === 0}
            />
          ))}
        </div>

        {/* Footer info */}
        {history.length > filteredHistory.length && (
          <div className='border-secondary-200 mt-3 border-t pt-3 dark:border-secondary-600'>
            <p className='text-center text-xs text-secondary-500'>
              Showing {filteredHistory.length} of {history.length} searches
            </p>
          </div>
        )}
      </div>
    );
  }
);

SearchHistory.displayName = 'SearchHistory';

/**
 * Individual search history item component
 */
interface SearchHistoryItemProps {
  item: SearchHistoryItem;
  onSelect: () => void;
  onRemove?: () => void;
  isFirst?: boolean;
}

function SearchHistoryItem({
  item,
  onSelect,
  onRemove,
  isFirst = false,
}: SearchHistoryItemProps) {
  return (
    <div
      className={cn(
        'group flex cursor-pointer items-center justify-between rounded-md p-2 transition-colors hover:bg-secondary-50 dark:hover:bg-secondary-700',
        isFirst && 'border-l-2 border-primary-500'
      )}
      onClick={onSelect}
      role='button'
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-label={`Search for ${item.productId}`}
    >
      <div className='min-w-0 flex-1'>
        <div className='flex items-center space-x-2'>
          {/* Product ID */}
          <span className='text-secondary-900 truncate font-mono text-sm dark:text-secondary-100'>
            {item.productId}
          </span>

          {/* Verification status */}
          <VerificationStatusBadge status={item.verificationStatus} />
        </div>

        {/* Product name */}
        {item.productName && (
          <div className='dark:text-secondary-400 mt-1 truncate text-xs text-secondary-500'>
            {item.productName}
          </div>
        )}

        {/* Search time */}
        <div className='text-secondary-400 mt-1 text-xs dark:text-secondary-500'>
          {formatRelativeTime(item.searchedAt)}
        </div>
      </div>

      {/* Actions */}
      <div className='flex items-center space-x-1 opacity-0 transition-opacity group-hover:opacity-100'>
        {/* Quick search button */}
        <button
          onClick={e => {
            e.stopPropagation();
            onSelect();
          }}
          className='text-secondary-400 dark:hover:text-secondary-300 p-1 transition-colors hover:text-secondary-600 dark:text-secondary-500'
          aria-label='Search again'
          title='Search again'
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
              d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
            />
          </svg>
        </button>

        {/* Remove button */}
        {onRemove && (
          <button
            onClick={e => {
              e.stopPropagation();
              onRemove();
            }}
            className='text-secondary-400 p-1 transition-colors hover:text-red-500 dark:text-secondary-500 dark:hover:text-red-400'
            aria-label='Remove from history'
            title='Remove from history'
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
    </div>
  );
}

/**
 * Verification status badge component
 */
function VerificationStatusBadge({ status }: { status?: string }) {
  if (!status) return null;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'verified':
        return {
          color:
            'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
          icon: (
            <svg className='h-3 w-3' fill='currentColor' viewBox='0 0 20 20'>
              <path
                fillRule='evenodd'
                d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                clipRule='evenodd'
              />
            </svg>
          ),
          label: 'Verified',
        };
      case 'pending':
        return {
          color:
            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
          icon: (
            <svg className='h-3 w-3' fill='currentColor' viewBox='0 0 20 20'>
              <path
                fillRule='evenodd'
                d='M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z'
                clipRule='evenodd'
              />
            </svg>
          ),
          label: 'Pending',
        };
      case 'unverified':
        return {
          color:
            'bg-secondary-100 text-secondary-800 dark:bg-secondary-700 dark:text-secondary-200',
          icon: (
            <svg className='h-3 w-3' fill='currentColor' viewBox='0 0 20 20'>
              <path
                fillRule='evenodd'
                d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z'
                clipRule='evenodd'
              />
            </svg>
          ),
          label: 'Unverified',
        };
      case 'error':
        return {
          color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
          icon: (
            <svg className='h-3 w-3' fill='currentColor' viewBox='0 0 20 20'>
              <path
                fillRule='evenodd'
                d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
                clipRule='evenodd'
              />
            </svg>
          ),
          label: 'Error',
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig(status);
  if (!config) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium',
        config.color
      )}
      title={`Status: ${config.label}`}
    >
      {config.icon}
      <span className='sr-only ml-1'>{config.label}</span>
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
