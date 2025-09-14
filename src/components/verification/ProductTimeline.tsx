/**
 * ProductTimeline component for displaying product information and supply chain journey.
 *
 * @example
 * ```tsx
 * <ProductTimeline
 *   product={productWithEvents}
 *   showLocation={true}
 *   maxEvents={10}
 * />
 * ```
 *
 * @since 1.0.0
 */

'use client';

import * as React from 'react';
import { cn, formatDate, truncateHash } from '@/lib/utils';
import { ProductWithEvents, ProductEvent } from '@/types';

export interface ProductTimelineProps {
  /** Product data with events */
  product: ProductWithEvents;

  /** Whether to show location information (AC: 3) */
  showLocation?: boolean;

  /** Maximum number of events to display */
  maxEvents?: number;

  /** Whether to show event data details */
  showEventData?: boolean;

  /** Additional CSS classes */
  className?: string;

  /** Whether to show product details header */
  showProductDetails?: boolean;

  /** Whether events are loading */
  loading?: boolean;

  /** Callback for when user wants to expand timeline */
  onExpandTimeline?: () => void;

  /** Whether to show enhanced mobile optimizations (AC: 5) */
  mobileOptimized?: boolean;
}

/**
 * Enhanced event type configuration for rich visualization
 * Expanded to include more event types with better icons and colors (AC: 1)
 */
const eventTypeConfig: Record<
  string,
  {
    label: string;
    color: string;
    bgColor: string;
    ringColor: string;
    icon: React.ReactNode;
    category: 'production' | 'logistics' | 'quality' | 'compliance';
  }
> = {
  created: {
    label: 'Product Created',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    ringColor: 'ring-blue-300',
    category: 'production',
    icon: (
      <svg
        className='h-4 w-4'
        fill='currentColor'
        viewBox='0 0 20 20'
        aria-hidden='true'
      >
        <path
          fillRule='evenodd'
          d='M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 011.4 1.05l-.682 3.815a1 1 0 01-.8.8l-3.815.682a1 1 0 01-1.05-1.4l.8-1.599L10 6.677V8a1 1 0 11-2 0V6.677L4.046 8.453l.8 1.599a1 1 0 01-1.05 1.4L.98 10.77a1 1 0 01-.8-.8L.862 6.155a1 1 0 011.4-1.05l1.599.8L7.815 4.323V3a1 1 0 011-1z'
          clipRule='evenodd'
        />
      </svg>
    ),
  },
  processed: {
    label: 'Processed',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    ringColor: 'ring-orange-300',
    category: 'production',
    icon: (
      <svg
        className='h-4 w-4'
        fill='currentColor'
        viewBox='0 0 20 20'
        aria-hidden='true'
      >
        <path d='M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z' />
      </svg>
    ),
  },
  quality_check: {
    label: 'Quality Check',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    ringColor: 'ring-amber-300',
    category: 'quality',
    icon: (
      <svg
        className='h-4 w-4'
        fill='currentColor'
        viewBox='0 0 20 20'
        aria-hidden='true'
      >
        <path
          fillRule='evenodd'
          d='M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
          clipRule='evenodd'
        />
      </svg>
    ),
  },
  verified: {
    label: 'Verified',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    ringColor: 'ring-green-300',
    category: 'compliance',
    icon: (
      <svg
        className='h-4 w-4'
        fill='currentColor'
        viewBox='0 0 20 20'
        aria-hidden='true'
      >
        <path
          fillRule='evenodd'
          d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
          clipRule='evenodd'
        />
      </svg>
    ),
  },
  transported: {
    label: 'In Transit',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    ringColor: 'ring-indigo-300',
    category: 'logistics',
    icon: (
      <svg
        className='h-4 w-4'
        fill='currentColor'
        viewBox='0 0 20 20'
        aria-hidden='true'
      >
        <path d='M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z' />
        <path d='M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707L16 7.586A1 1 0 0015.414 7H14z' />
      </svg>
    ),
  },
  shipped: {
    label: 'Shipped',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    ringColor: 'ring-blue-300',
    category: 'logistics',
    icon: (
      <svg
        className='h-4 w-4'
        fill='currentColor'
        viewBox='0 0 20 20'
        aria-hidden='true'
      >
        <path d='M5.5 16a3.5 3.5 0 01-.369-6.974 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z' />
        <path d='M12.621 11.621a.75.75 0 011.06 0l2 2a.75.75 0 010 1.06l-2 2a.75.75 0 11-1.06-1.06L13.939 14l-1.318-1.318a.75.75 0 010-1.061z' />
        <path d='M9.5 14a.75.75 0 01.75-.75h4a.75.75 0 010 1.5h-4a.75.75 0 01-.75-.75z' />
      </svg>
    ),
  },
  received: {
    label: 'Received',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    ringColor: 'ring-purple-300',
    category: 'logistics',
    icon: (
      <svg
        className='h-4 w-4'
        fill='currentColor'
        viewBox='0 0 20 20'
        aria-hidden='true'
      >
        <path
          fillRule='evenodd'
          d='M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zM8 6a2 2 0 114 0v1H8V6zm0 3a1 1 0 012 0 1 1 0 11-2 0z'
          clipRule='evenodd'
        />
      </svg>
    ),
  },
  rejected: {
    label: 'Failed Verification',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    ringColor: 'ring-red-300',
    category: 'compliance',
    icon: (
      <svg
        className='h-4 w-4'
        fill='currentColor'
        viewBox='0 0 20 20'
        aria-hidden='true'
      >
        <path
          fillRule='evenodd'
          d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
          clipRule='evenodd'
        />
      </svg>
    ),
  },
  inspected: {
    label: 'Inspected',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
    ringColor: 'ring-cyan-300',
    category: 'quality',
    icon: (
      <svg
        className='h-4 w-4'
        fill='currentColor'
        viewBox='0 0 20 20'
        aria-hidden='true'
      >
        <path d='M10 12a2 2 0 100-4 2 2 0 000 4z' />
        <path
          fillRule='evenodd'
          d='M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z'
          clipRule='evenodd'
        />
      </svg>
    ),
  },
  default: {
    label: 'Supply Chain Event',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    ringColor: 'ring-gray-300',
    category: 'production',
    icon: (
      <svg
        className='h-4 w-4'
        fill='currentColor'
        viewBox='0 0 20 20'
        aria-hidden='true'
      >
        <path
          fillRule='evenodd'
          d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z'
          clipRule='evenodd'
        />
      </svg>
    ),
  },
};

/**
 * Enhanced event item component with rich visualization and mobile optimization (AC: 1, 5)
 */
const TimelineEvent: React.FC<{
  event: ProductEvent;
  isLast: boolean;
  showLocation: boolean;
  showEventData: boolean;
}> = ({ event, isLast, showLocation, showEventData }) => {
  const config =
    eventTypeConfig[event.eventType.toLowerCase()] || eventTypeConfig.default;
  const [showDetails, setShowDetails] = React.useState(false);

  // Format duration since event
  const getTimeSince = () => {
    try {
      const eventTime = new Date(event.timestamp);
      const now = new Date();
      const diffMs = now.getTime() - eventTime.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffHours < 1) return 'Just now';
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return formatDate(eventTime.getTime(), { dateStyle: 'short' });
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className='relative flex gap-3 sm:gap-4'>
      {/* Timeline connector line */}
      {!isLast && (
        <div
          className='absolute left-4 top-10 h-full w-0.5 bg-gradient-to-b from-gray-200 via-gray-100 to-transparent sm:left-5'
          aria-hidden='true'
        />
      )}

      {/* Enhanced event icon with category ring */}
      <div className='relative flex-shrink-0'>
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full border-2 sm:h-10 sm:w-10',
            config.bgColor,
            config.ringColor,
            'shadow-sm ring-2 ring-offset-2 ring-offset-white'
          )}
          title={`${config.label} - ${config.category}`}
        >
          <div className={cn(config.color, 'transition-colors duration-200')}>
            {React.cloneElement(config.icon as React.ReactElement, {
              className: 'h-4 w-4 sm:h-5 sm:w-5',
              'aria-label': config.label,
            })}
          </div>
        </div>

        {/* Category indicator dot */}
        <div
          className={cn(
            'absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white shadow-sm',
            config.category === 'production' && 'bg-blue-400',
            config.category === 'logistics' && 'bg-indigo-400',
            config.category === 'quality' && 'bg-amber-400',
            config.category === 'compliance' && 'bg-green-400'
          )}
          aria-label={`Category: ${config.category}`}
        />
      </div>

      {/* Event content with mobile optimization */}
      <div className='min-w-0 flex-1 pb-6 sm:pb-8'>
        {/* Event header with responsive layout */}
        <div className='flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4'>
          <div className='flex items-center gap-2'>
            <h4 className='text-sm font-semibold text-gray-900 sm:text-base'>
              {config.label}
            </h4>
            {/* Category badge for mobile */}
            <span className='inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize text-gray-600 ring-1 ring-gray-200 sm:hidden'>
              {config.category}
            </span>
          </div>

          <div className='flex items-center gap-2 text-xs text-gray-500 sm:text-sm'>
            <time
              dateTime={(() => {
                try {
                  if (event.timestamp instanceof Date) {
                    return isNaN(event.timestamp.getTime())
                      ? ''
                      : event.timestamp.toISOString();
                  }
                  const date = new Date(event.timestamp);
                  return isNaN(date.getTime()) ? '' : date.toISOString();
                } catch {
                  return '';
                }
              })()}
              title={(() => {
                try {
                  const date = new Date(event.timestamp);
                  return isNaN(date.getTime())
                    ? 'Invalid date'
                    : formatDate(date.getTime(), {
                        dateStyle: 'full',
                        timeStyle: 'medium',
                      });
                } catch {
                  return 'Invalid date';
                }
              })()}
            >
              {getTimeSince()}
            </time>

            {/* Touch-friendly details toggle for mobile */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className='touch-manipulation rounded-full p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:hidden'
              aria-label={showDetails ? 'Hide details' : 'Show details'}
            >
              <svg
                className='h-4 w-4'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d={showDetails ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Actor information with enhanced display */}
        {event.actor && (
          <div className='mt-2 flex flex-col gap-1 text-xs text-gray-600 sm:flex-row sm:items-center sm:gap-3'>
            <div className='flex items-center gap-2'>
              <svg
                className='h-3 w-3 text-gray-400'
                fill='currentColor'
                viewBox='0 0 20 20'
              >
                <path
                  fillRule='evenodd'
                  d='M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z'
                  clipRule='evenodd'
                />
              </svg>
              <span className='font-medium'>
                {event.actor.name || event.actor.role}
              </span>
            </div>
            {event.actor.walletAddress && (
              <span className='inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1 font-mono text-xs ring-1 ring-gray-200'>
                <svg
                  className='h-3 w-3 text-gray-400'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6l-2-2v-2l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 1 1 0 000-2z'
                    clipRule='evenodd'
                  />
                </svg>
                {truncateHash(event.actor.walletAddress)}
              </span>
            )}
          </div>
        )}

        {/* Enhanced location display with coordinates fallback (AC: 3) */}
        {showLocation && event.location && (
          <div className='mt-2 flex items-start gap-2 text-xs text-gray-600'>
            <svg
              className='mt-0.5 h-3 w-3 flex-shrink-0 text-gray-400'
              fill='currentColor'
              viewBox='0 0 20 20'
            >
              <path
                fillRule='evenodd'
                d='M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z'
                clipRule='evenodd'
              />
            </svg>
            <div className='flex-1'>
              {event.location.address ? (
                <>
                  <div className='font-medium'>{event.location.address}</div>
                  {(event.location.city || event.location.state) && (
                    <div className='text-gray-500'>
                      {[
                        event.location.city,
                        event.location.state,
                        event.location.country,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </div>
                  )}
                </>
              ) : event.location.coordinates ? (
                <div className='font-mono'>
                  {event.location.coordinates.latitude?.toFixed(4)},{' '}
                  {event.location.coordinates.longitude?.toFixed(4)}
                </div>
              ) : (
                <div className='text-gray-500'>Location unavailable</div>
              )}
            </div>
          </div>
        )}

        {/* Transaction ID with blockchain link */}
        {event.transactionId && (
          <div className='mt-2 flex items-center gap-2 text-xs'>
            <svg
              className='h-3 w-3 text-gray-400'
              fill='currentColor'
              viewBox='0 0 20 20'
            >
              <path
                fillRule='evenodd'
                d='M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z'
                clipRule='evenodd'
              />
            </svg>
            <span className='text-gray-500'>Tx:</span>
            <span className='inline-flex items-center gap-1 rounded bg-gray-50 px-2 py-0.5 font-mono text-xs ring-1 ring-gray-200'>
              {truncateHash(event.transactionId)}
              <button
                onClick={() =>
                  navigator.clipboard?.writeText(event.transactionId!)
                }
                className='text-gray-400 hover:text-gray-600'
                title='Copy transaction ID'
              >
                <svg
                  className='h-3 w-3'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z'
                  />
                </svg>
              </button>
            </span>
          </div>
        )}

        {/* Enhanced event data display with better mobile UX */}
        {showEventData && event.data && Object.keys(event.data).length > 0 && (
          <div
            className={cn(
              'mt-3 transition-all duration-200',
              showDetails || !window.matchMedia ? 'block' : 'hidden sm:block'
            )}
          >
            <details className='group' open={showDetails}>
              <summary
                className='hidden cursor-pointer text-xs text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:block'
                onClick={e => {
                  e.preventDefault();
                  setShowDetails(!showDetails);
                }}
              >
                <span className='group-open:hidden'>
                  Show technical details
                </span>
                <span className='hidden group-open:inline'>
                  Hide technical details
                </span>
                <svg
                  className='ml-1 inline h-3 w-3 transition-transform group-open:rotate-180'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M19 9l-7 7-7-7'
                  />
                </svg>
              </summary>
              <div className='mt-2 overflow-hidden rounded-lg bg-gray-50 ring-1 ring-gray-200'>
                <div className='max-h-32 overflow-auto p-3 font-mono text-xs sm:max-h-48'>
                  <pre className='whitespace-pre-wrap text-gray-700'>
                    {JSON.stringify(event.data, null, 2)}
                  </pre>
                </div>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Enhanced loading skeleton with improved mobile design
 */
const TimelineLoadingSkeleton: React.FC = () => (
  <div className='space-y-6 sm:space-y-8'>
    {Array.from({ length: 3 }).map((_, index) => (
      <div key={index} className='relative flex gap-3 sm:gap-4'>
        {/* Skeleton connector line */}
        {index < 2 && (
          <div
            className='absolute left-4 top-10 h-full w-0.5 bg-gray-100 sm:left-5'
            aria-hidden='true'
          />
        )}

        {/* Skeleton icon with ring */}
        <div className='relative flex-shrink-0'>
          <div className='h-8 w-8 animate-pulse rounded-full bg-gray-200 ring-2 ring-gray-100 ring-offset-2 sm:h-10 sm:w-10' />
          <div className='bg-gray-150 absolute -bottom-1 -right-1 h-3 w-3 animate-pulse rounded-full' />
        </div>

        {/* Skeleton content with mobile optimization */}
        <div className='min-w-0 flex-1 space-y-3'>
          <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
            <div className='h-4 w-32 animate-pulse rounded bg-gray-200 sm:h-5 sm:w-40' />
            <div className='bg-gray-150 h-3 w-16 animate-pulse rounded sm:h-4 sm:w-20' />
          </div>
          <div className='bg-gray-150 h-3 w-24 animate-pulse rounded sm:w-32' />
          <div className='h-3 w-48 animate-pulse rounded bg-gray-100 sm:w-64' />
          <div className='hidden h-3 w-36 animate-pulse rounded bg-gray-100 sm:block' />
        </div>
      </div>
    ))}
  </div>
);

/**
 * ProductTimeline component
 */
export const ProductTimeline = React.forwardRef<
  HTMLDivElement,
  ProductTimelineProps
>(
  (
    {
      product,
      showLocation = true,
      maxEvents,
      showEventData = false,
      className,
      showProductDetails = true,
      loading = false,
      ...props
    },
    ref
  ) => {
    const displayedEvents = maxEvents
      ? product.events.slice(0, maxEvents)
      : product.events;

    if (loading) {
      return (
        <div ref={ref} className={cn('space-y-6', className)} {...props}>
          {showProductDetails && (
            <div className='space-y-2'>
              <div className='h-6 w-1/2 animate-pulse rounded bg-gray-200' />
              <div className='h-4 w-2/3 animate-pulse rounded bg-gray-100' />
            </div>
          )}
          <TimelineLoadingSkeleton />
        </div>
      );
    }

    return (
      <div ref={ref} className={cn('space-y-6', className)} {...props}>
        {showProductDetails && (
          <div className='border-b border-gray-200 pb-6'>
            <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
              <div className='min-w-0 flex-1'>
                <h2 className='text-lg font-bold text-gray-900 sm:text-xl'>
                  {product.name || product.productId}
                </h2>
                {product.description && (
                  <p className='mt-2 text-sm leading-relaxed text-gray-600 sm:text-base'>
                    {product.description}
                  </p>
                )}
              </div>

              <div className='flex-shrink-0 text-right'>
                <div className='inline-flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 ring-1 ring-gray-200'>
                  <svg
                    className='h-3 w-3'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z'
                      clipRule='evenodd'
                    />
                  </svg>
                  ID: {product.productId}
                </div>
                {product.category && (
                  <div className='mt-2 text-xs capitalize text-gray-500 sm:text-sm'>
                    Category:{' '}
                    <span className='font-medium'>{product.category}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced metadata grid with better mobile layout */}
            <div className='mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3 sm:gap-4'>
              <div className='flex items-center gap-2 text-gray-600'>
                <svg
                  className='h-4 w-4 text-gray-400'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z'
                    clipRule='evenodd'
                  />
                </svg>
                <span className='text-gray-500'>Created:</span>
                <span className='font-medium text-gray-900'>
                  {formatDate(new Date(product.createdAt).getTime(), {
                    dateStyle: 'medium',
                  })}
                </span>
              </div>

              {product.origin && (
                <div className='flex items-center gap-2 text-gray-600'>
                  <svg
                    className='h-4 w-4 text-gray-400'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span className='text-gray-500'>Origin:</span>
                  <span className='font-medium text-gray-900'>
                    {product.origin.address ||
                      `${product.origin.city || ''}, ${product.origin.country || 'Unknown'}`}
                  </span>
                </div>
              )}

              {product.events && product.events.length > 0 && (
                <div className='flex items-center gap-2 text-gray-600'>
                  <svg
                    className='h-4 w-4 text-gray-400'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span className='text-gray-500'>Last Updated:</span>
                  <span className='font-medium text-gray-900'>
                    {(() => {
                      const lastEvent = product.events.sort(
                        (a, b) =>
                          new Date(b.timestamp).getTime() -
                          new Date(a.timestamp).getTime()
                      )[0];
                      return formatDate(
                        new Date(lastEvent.timestamp).getTime(),
                        { dateStyle: 'medium' }
                      );
                    })()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div>
          {/* Enhanced timeline header with event summary */}
          <div className='mb-6'>
            <div className='flex items-center justify-between'>
              <h3 className='text-base font-semibold text-gray-900 sm:text-lg'>
                Supply Chain Journey
              </h3>
              {displayedEvents.length > 0 && (
                <div className='flex items-center gap-2 text-sm text-gray-500'>
                  <svg
                    className='h-4 w-4'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span>
                    {displayedEvents.length} event
                    {displayedEvents.length === 1 ? '' : 's'}
                  </span>
                </div>
              )}
            </div>

            {/* Event categories summary for desktop */}
            {displayedEvents.length > 0 && (
              <div className='mt-3 hidden flex-wrap gap-2 sm:flex'>
                {Array.from(
                  new Set(
                    displayedEvents.map(e => {
                      const config =
                        eventTypeConfig[e.eventType.toLowerCase()] ||
                        eventTypeConfig.default;
                      return config.category;
                    })
                  )
                ).map(category => (
                  <span
                    key={category}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium capitalize ring-1',
                      category === 'production' &&
                        'bg-blue-50 text-blue-700 ring-blue-200',
                      category === 'logistics' &&
                        'bg-indigo-50 text-indigo-700 ring-indigo-200',
                      category === 'quality' &&
                        'bg-amber-50 text-amber-700 ring-amber-200',
                      category === 'compliance' &&
                        'bg-green-50 text-green-700 ring-green-200'
                    )}
                  >
                    <div
                      className={cn(
                        'h-2 w-2 rounded-full',
                        category === 'production' && 'bg-blue-400',
                        category === 'logistics' && 'bg-indigo-400',
                        category === 'quality' && 'bg-amber-400',
                        category === 'compliance' && 'bg-green-400'
                      )}
                    />
                    {category}
                  </span>
                ))}
              </div>
            )}
          </div>

          {displayedEvents.length === 0 ? (
            <div className='py-12 text-center'>
              <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100'>
                <svg
                  className='h-8 w-8 text-gray-400'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={1.5}
                    d='M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
                  />
                </svg>
              </div>
              <h4 className='mt-4 text-sm font-medium text-gray-900'>
                No Supply Chain Events
              </h4>
              <p className='mt-2 text-sm text-gray-500'>
                This product does not have any recorded supply chain events yet.
                <br className='hidden sm:inline' />
                Events will appear here as they are logged to the blockchain.
              </p>
            </div>
          ) : (
            <div className='relative'>
              {/* Timeline events with enhanced spacing */}
              <div className='space-y-6 sm:space-y-8'>
                {displayedEvents.map((event, index) => (
                  <TimelineEvent
                    key={`${event.timestamp}-${index}`}
                    event={event}
                    isLast={index === displayedEvents.length - 1}
                    showLocation={showLocation}
                    showEventData={showEventData}
                  />
                ))}
              </div>

              {/* Enhanced "show more" with better mobile UX */}
              {maxEvents && product.events.length > maxEvents && (
                <div className='mt-8 text-center'>
                  <button
                    type='button'
                    className='inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                  >
                    <svg
                      className='h-4 w-4'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M19 9l-7 7-7-7'
                      />
                    </svg>
                    View {product.events.length - maxEvents} more event
                    {product.events.length - maxEvents === 1 ? '' : 's'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);

ProductTimeline.displayName = 'ProductTimeline';
