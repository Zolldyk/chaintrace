/**
 * Loading state components for ChainTrace application.
 *
 * @example
 * ```tsx
 * <LoadingSpinner size="lg" />
 * <LoadingSkeleton className="h-4 w-32" />
 * <LoadingCard />
 * ```
 *
 * @since 1.0.0
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Loading spinner component
 */
export interface LoadingSpinnerProps {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';

  /** Additional CSS classes */
  className?: string;

  /** Optional label for accessibility */
  label?: string;

  /** Color variant */
  color?: 'primary' | 'secondary' | 'muted';
}

export const LoadingSpinner = React.forwardRef<
  HTMLDivElement,
  LoadingSpinnerProps
>(
  (
    {
      size = 'md',
      className,
      label = 'Loading...',
      color = 'primary',
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
      xl: 'h-12 w-12',
    };

    const colorClasses = {
      primary: 'text-blue-600',
      secondary: 'text-gray-600',
      muted: 'text-gray-400',
    };

    return (
      <div
        ref={ref}
        className={cn('inline-flex items-center justify-center', className)}
        role='status'
        aria-label={label}
        {...props}
      >
        <svg
          className={cn('animate-spin', sizeClasses[size], colorClasses[color])}
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
        <span className='sr-only'>{label}</span>
      </div>
    );
  }
);

LoadingSpinner.displayName = 'LoadingSpinner';

/**
 * Loading skeleton component
 */
export interface LoadingSkeletonProps {
  /** Additional CSS classes */
  className?: string;

  /** Whether to animate */
  animate?: boolean;

  /** Rounded variant */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

export const LoadingSkeleton = React.forwardRef<
  HTMLDivElement,
  LoadingSkeletonProps
>(({ className, animate = true, rounded = 'md', ...props }, ref) => {
  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  };

  return (
    <div
      ref={ref}
      className={cn(
        'bg-gray-200',
        animate && 'animate-pulse',
        roundedClasses[rounded],
        className
      )}
      role='status'
      aria-label='Loading content'
      {...props}
    />
  );
});

LoadingSkeleton.displayName = 'LoadingSkeleton';

/**
 * Loading card skeleton
 */
export interface LoadingCardProps {
  /** Whether to show header */
  showHeader?: boolean;

  /** Whether to show avatar */
  showAvatar?: boolean;

  /** Number of content lines */
  lines?: number;

  /** Additional CSS classes */
  className?: string;
}

export const LoadingCard = React.forwardRef<HTMLDivElement, LoadingCardProps>(
  (
    { showHeader = true, showAvatar = false, lines = 3, className, ...props },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border border-gray-200 bg-white p-4 shadow-sm',
          className
        )}
        role='status'
        aria-label='Loading card content'
        {...props}
      >
        {showHeader && (
          <div className='mb-4 flex items-center gap-3'>
            {showAvatar && (
              <LoadingSkeleton className='h-10 w-10' rounded='full' />
            )}
            <div className='flex-1 space-y-2'>
              <LoadingSkeleton className='h-4 w-3/4' />
              <LoadingSkeleton className='h-3 w-1/2' />
            </div>
          </div>
        )}

        <div className='space-y-2'>
          {Array.from({ length: lines }).map((_, index) => (
            <LoadingSkeleton
              key={index}
              className={cn('h-3', index === lines - 1 ? 'w-2/3' : 'w-full')}
            />
          ))}
        </div>
      </div>
    );
  }
);

LoadingCard.displayName = 'LoadingCard';

/**
 * Loading timeline skeleton
 */
export interface LoadingTimelineProps {
  /** Number of timeline items */
  items?: number;

  /** Additional CSS classes */
  className?: string;
}

export const LoadingTimeline = React.forwardRef<
  HTMLDivElement,
  LoadingTimelineProps
>(({ items = 3, className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn('space-y-6', className)}
      role='status'
      aria-label='Loading timeline'
      {...props}
    >
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className='relative flex gap-4'>
          {index < items - 1 && (
            <div
              className='absolute left-4 top-8 h-full w-0.5 bg-gray-200'
              aria-hidden='true'
            />
          )}

          <LoadingSkeleton className='h-8 w-8' rounded='full' />

          <div className='flex-1 space-y-2 pb-6'>
            <div className='flex items-center justify-between'>
              <LoadingSkeleton className='h-4 w-24' />
              <LoadingSkeleton className='h-3 w-16' />
            </div>
            <LoadingSkeleton className='h-3 w-32' />
            <LoadingSkeleton className='h-3 w-48' />
          </div>
        </div>
      ))}
    </div>
  );
});

LoadingTimeline.displayName = 'LoadingTimeline';

/**
 * Loading state with message
 */
export interface LoadingStateProps {
  /** Loading message */
  message?: string;

  /** Whether to show spinner */
  showSpinner?: boolean;

  /** Spinner size */
  spinnerSize?: LoadingSpinnerProps['size'];

  /** Additional CSS classes */
  className?: string;
}

export const LoadingState = React.forwardRef<HTMLDivElement, LoadingStateProps>(
  (
    {
      message = 'Loading...',
      showSpinner = true,
      spinnerSize = 'lg',
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center gap-4 py-8 text-center',
          className
        )}
        role='status'
        aria-live='polite'
        {...props}
      >
        {showSpinner && <LoadingSpinner size={spinnerSize} />}

        <div className='space-y-1'>
          <p className='text-sm font-medium text-gray-900'>{message}</p>
          <p className='text-xs text-gray-500'>
            Please wait while we fetch the information...
          </p>
        </div>
      </div>
    );
  }
);

LoadingState.displayName = 'LoadingState';

/**
 * Loading button state
 */
export interface LoadingButtonProps {
  /** Whether button is in loading state */
  loading?: boolean;

  /** Loading text */
  loadingText?: string;

  /** Button content when not loading */
  children: React.ReactNode;

  /** Button props */
  [key: string]: any;
}

export const LoadingButton = React.forwardRef<
  HTMLButtonElement,
  LoadingButtonProps
>(
  (
    {
      loading = false,
      loadingText = 'Loading...',
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button ref={ref} disabled={disabled || loading} {...props}>
        {loading ? (
          <div className='flex items-center justify-center gap-2'>
            <LoadingSpinner size='sm' />
            <span>{loadingText}</span>
          </div>
        ) : (
          children
        )}
      </button>
    );
  }
);

LoadingButton.displayName = 'LoadingButton';
