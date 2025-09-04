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

  /** Whether to show location information */
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
}

/**
 * Event type configuration for styling and icons
 */
const eventTypeConfig: Record<
  string,
  {
    label: string;
    color: string;
    bgColor: string;
    icon: React.ReactNode;
  }
> = {
  created: {
    label: 'Created',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: (
      <svg className='h-4 w-4' fill='currentColor' viewBox='0 0 20 20'>
        <path
          fillRule='evenodd'
          d='M10 3a1 1 0 011 1v5h5a1 1 0 110 2H4a1 1 0 110-2h5V4a1 1 0 011-1z'
          clipRule='evenodd'
        />
      </svg>
    ),
  },
  verified: {
    label: 'Verified',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: (
      <svg className='h-4 w-4' fill='currentColor' viewBox='0 0 20 20'>
        <path
          fillRule='evenodd'
          d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
          clipRule='evenodd'
        />
      </svg>
    ),
  },
  shipped: {
    label: 'Shipped',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    icon: (
      <svg className='h-4 w-4' fill='currentColor' viewBox='0 0 20 20'>
        <path d='M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z' />
      </svg>
    ),
  },
  received: {
    label: 'Received',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    icon: (
      <svg className='h-4 w-4' fill='currentColor' viewBox='0 0 20 20'>
        <path
          fillRule='evenodd'
          d='M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z'
          clipRule='evenodd'
        />
      </svg>
    ),
  },
  inspected: {
    label: 'Inspected',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    icon: (
      <svg className='h-4 w-4' fill='currentColor' viewBox='0 0 20 20'>
        <path d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' />
      </svg>
    ),
  },
  default: {
    label: 'Event',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: (
      <svg className='h-4 w-4' fill='currentColor' viewBox='0 0 20 20'>
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
 * Event item component
 */
const TimelineEvent: React.FC<{
  event: ProductEvent;
  isLast: boolean;
  showLocation: boolean;
  showEventData: boolean;
}> = ({ event, isLast, showLocation, showEventData }) => {
  const config =
    eventTypeConfig[event.eventType.toLowerCase()] || eventTypeConfig.default;

  return (
    <div className='relative flex gap-4'>
      {!isLast && (
        <div
          className='absolute left-4 top-8 h-full w-0.5 bg-gray-200'
          aria-hidden='true'
        />
      )}

      <div className={cn('flex-shrink-0 rounded-full p-2', config.bgColor)}>
        <div className={config.color}>{config.icon}</div>
      </div>

      <div className='min-w-0 flex-1 pb-6'>
        <div className='flex items-center justify-between'>
          <h4 className='text-sm font-medium text-gray-900'>{config.label}</h4>
          <time
            className='text-xs text-gray-500'
            dateTime={event.timestamp}
            title={formatDate(new Date(event.timestamp).getTime(), {
              dateStyle: 'full',
              timeStyle: 'medium',
            })}
          >
            {formatDate(new Date(event.timestamp).getTime())}
          </time>
        </div>

        {event.actor && (
          <div className='mt-1 flex items-center gap-2 text-xs text-gray-600'>
            <span className='font-medium'>
              {event.actor.name || event.actor.role}
            </span>
            {event.actor.walletAddress && (
              <span className='rounded bg-gray-100 px-1.5 py-0.5 font-mono'>
                {truncateHash(event.actor.walletAddress)}
              </span>
            )}
          </div>
        )}

        {showLocation && event.location && (
          <div className='mt-1 text-xs text-gray-600'>
            <svg
              className='mr-1 inline h-3 w-3'
              fill='currentColor'
              viewBox='0 0 20 20'
            >
              <path
                fillRule='evenodd'
                d='M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z'
                clipRule='evenodd'
              />
            </svg>
            {event.location.address ||
              `${event.location.coordinates?.latitude}, ${event.location.coordinates?.longitude}`}
          </div>
        )}

        {event.transactionId && (
          <div className='mt-1 text-xs text-gray-500'>
            <span className='mr-1'>Tx:</span>
            <span className='rounded bg-gray-50 px-1 py-0.5 font-mono text-xs'>
              {truncateHash(event.transactionId)}
            </span>
          </div>
        )}

        {showEventData && event.data && Object.keys(event.data).length > 0 && (
          <div className='mt-2 text-xs'>
            <details className='group'>
              <summary className='cursor-pointer text-gray-500 hover:text-gray-700'>
                <span className='group-open:hidden'>Show details</span>
                <span className='hidden group-open:inline'>Hide details</span>
              </summary>
              <div className='mt-1 rounded bg-gray-50 p-2 font-mono text-xs'>
                <pre className='whitespace-pre-wrap'>
                  {JSON.stringify(event.data, null, 2)}
                </pre>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Loading skeleton for timeline
 */
const TimelineLoadingSkeleton: React.FC = () => (
  <div className='space-y-6'>
    {Array.from({ length: 3 }).map((_, index) => (
      <div key={index} className='relative flex gap-4'>
        <div className='h-8 w-8 flex-shrink-0 animate-pulse rounded-full bg-gray-200' />
        <div className='flex-1 space-y-2'>
          <div className='h-4 w-1/3 animate-pulse rounded bg-gray-200' />
          <div className='h-3 w-1/2 animate-pulse rounded bg-gray-100' />
          <div className='h-3 w-2/3 animate-pulse rounded bg-gray-100' />
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
          <div className='border-b border-gray-200 pb-4'>
            <div className='flex items-center justify-between'>
              <div>
                <h2 className='text-lg font-semibold text-gray-900'>
                  {product.name || product.productId}
                </h2>
                {product.description && (
                  <p className='mt-1 text-sm text-gray-600'>
                    {product.description}
                  </p>
                )}
              </div>

              <div className='text-right text-xs text-gray-500'>
                <div>Product ID: {product.productId}</div>
                {product.category && (
                  <div className='mt-1'>Category: {product.category}</div>
                )}
              </div>
            </div>

            <div className='mt-3 flex items-center gap-4 text-xs text-gray-600'>
              <div>
                Created: {formatDate(new Date(product.createdAt).getTime())}
              </div>
              {product.origin && (
                <div>
                  Origin: {product.origin.address || product.origin.country}
                </div>
              )}
            </div>
          </div>
        )}

        <div>
          <h3 className='mb-4 text-sm font-medium text-gray-900'>
            Supply Chain Journey
          </h3>

          {displayedEvents.length === 0 ? (
            <div className='py-8 text-center'>
              <svg
                className='mx-auto h-12 w-12 text-gray-400'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
                />
              </svg>
              <p className='mt-2 text-sm text-gray-500'>
                No supply chain events recorded yet.
              </p>
            </div>
          ) : (
            <div className='space-y-0'>
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
          )}

          {maxEvents && product.events.length > maxEvents && (
            <div className='mt-4 text-center'>
              <button
                type='button'
                className='text-sm text-blue-600 hover:text-blue-800'
              >
                View {product.events.length - maxEvents} more events
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
);

ProductTimeline.displayName = 'ProductTimeline';
