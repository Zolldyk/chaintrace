/**
 * VerificationStatus component for displaying product verification status with visual indicators.
 *
 * @example
 * ```tsx
 * <VerificationStatus
 *   status="verified"
 *   lastVerified="2024-09-03T10:00:00Z"
 *   showDetails={true}
 * />
 * ```
 *
 * @since 1.0.0
 */

'use client';

import * as React from 'react';
import { cn, formatDate } from '@/lib/utils';
import { VerificationStatus as Status } from '@/types';

export interface VerificationStatusProps {
  /** Current verification status */
  status: Status;

  /** Last verification timestamp */
  lastVerified?: string;

  /** Expiry timestamp for verified products */
  expiresAt?: string;

  /** Whether to show additional details */
  showDetails?: boolean;

  /** Additional CSS classes */
  className?: string;

  /** Size variant */
  size?: 'sm' | 'md' | 'lg';

  /** Whether to show icon */
  showIcon?: boolean;

  /** Custom message override */
  customMessage?: string;
}

/**
 * Status configuration mapping
 */
const statusConfig: Record<
  Status,
  {
    label: string;
    description: string;
    color: string;
    bgColor: string;
    textColor: string;
    icon: React.ReactNode;
  }
> = {
  verified: {
    label: 'Verified',
    description:
      'This product has been successfully verified and is authentic.',
    color: 'text-success-700',
    bgColor: 'bg-success-50 border-success-200',
    textColor: 'text-success-700',
    icon: (
      <svg
        className='h-5 w-5'
        fill='currentColor'
        viewBox='0 0 20 20'
        xmlns='http://www.w3.org/2000/svg'
      >
        <path
          fillRule='evenodd'
          d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
          clipRule='evenodd'
        />
      </svg>
    ),
  },
  pending: {
    label: 'Pending',
    description:
      'This product is currently being verified. Please check back later.',
    color: 'text-warning-700',
    bgColor: 'bg-warning-50 border-warning-200',
    textColor: 'text-warning-700',
    icon: (
      <svg
        className='h-5 w-5'
        fill='currentColor'
        viewBox='0 0 20 20'
        xmlns='http://www.w3.org/2000/svg'
      >
        <path
          fillRule='evenodd'
          d='M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z'
          clipRule='evenodd'
        />
      </svg>
    ),
  },
  unverified: {
    label: 'Unverified',
    description:
      'This product has not been verified yet or verification data is unavailable.',
    color: 'text-secondary-700',
    bgColor: 'bg-secondary-50 border-secondary-200',
    textColor: 'text-secondary-700',
    icon: (
      <svg
        className='h-5 w-5'
        fill='currentColor'
        viewBox='0 0 20 20'
        xmlns='http://www.w3.org/2000/svg'
      >
        <path
          fillRule='evenodd'
          d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z'
          clipRule='evenodd'
        />
      </svg>
    ),
  },
  rejected: {
    label: 'Rejected',
    description:
      'This product failed verification or has been flagged as potentially fraudulent.',
    color: 'text-error-700',
    bgColor: 'bg-error-50 border-error-200',
    textColor: 'text-error-700',
    icon: (
      <svg
        className='h-5 w-5'
        fill='currentColor'
        viewBox='0 0 20 20'
        xmlns='http://www.w3.org/2000/svg'
      >
        <path
          fillRule='evenodd'
          d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
          clipRule='evenodd'
        />
      </svg>
    ),
  },
  expired: {
    label: 'Expired',
    description:
      "This product's verification has expired and needs to be re-verified.",
    color: 'text-warning-700',
    bgColor: 'bg-warning-50 border-warning-200',
    textColor: 'text-warning-700',
    icon: (
      <svg
        className='h-5 w-5'
        fill='currentColor'
        viewBox='0 0 20 20'
        xmlns='http://www.w3.org/2000/svg'
      >
        <path
          fillRule='evenodd'
          d='M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L9.414 11H13a1 1 0 100-2H9.414l1.293-1.293z'
          clipRule='evenodd'
        />
      </svg>
    ),
  },
};

/**
 * VerificationStatus component
 */
export const VerificationStatus = React.forwardRef<
  HTMLDivElement,
  VerificationStatusProps
>(
  (
    {
      status,
      lastVerified,
      expiresAt,
      showDetails = true,
      className,
      size = 'md',
      showIcon = true,
      customMessage,
      ...props
    },
    ref
  ) => {
    /**
     * Determines if verification is expired
     */
    const isExpired = React.useMemo(() => {
      if (!expiresAt) return false;
      return new Date(expiresAt) < new Date();
    }, [expiresAt]);

    /**
     * Gets the display status, handling expired case
     */
    const displayStatus = isExpired ? 'expired' : status;
    const displayConfig = statusConfig[displayStatus];

    /**
     * Formats relative time
     */
    const getRelativeTime = (timestamp: string): string => {
      const now = new Date();
      const date = new Date(timestamp);
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 30) return `${diffDays}d ago`;
      return formatDate(date.getTime());
    };

    return (
      <div
        ref={ref}
        className={cn(
          'animate-slide-up rounded-xl border p-4',
          displayConfig.bgColor,
          {
            'p-2': size === 'sm',
            'p-4': size === 'md',
            'p-6': size === 'lg',
          },
          className
        )}
        role='status'
        aria-label={`Verification status: ${displayConfig.label}`}
        {...props}
      >
        <div className='flex items-start gap-3'>
          {showIcon && (
            <div
              className={cn(
                'flex-shrink-0 rounded-full p-1',
                displayConfig.color,
                {
                  'p-0.5': size === 'sm',
                  'p-1': size === 'md',
                  'p-1.5': size === 'lg',
                }
              )}
              aria-hidden='true'
            >
              {React.cloneElement(displayConfig.icon as React.ReactElement, {
                className: cn(
                  size === 'sm' && 'h-4 w-4',
                  size === 'md' && 'h-5 w-5',
                  size === 'lg' && 'h-6 w-6'
                ),
              })}
            </div>
          )}

          <div className='min-w-0 flex-1'>
            <div className='flex items-center justify-between'>
              <h3
                className={cn('font-semibold', displayConfig.textColor, {
                  'text-sm': size === 'sm',
                  'text-base': size === 'md',
                  'text-lg': size === 'lg',
                })}
              >
                {displayConfig.label}
              </h3>

              {(status === 'verified' || status === 'pending') && (
                <div
                  className={cn(
                    'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium',
                    displayConfig.color,
                    displayConfig.bgColor.replace('bg-', 'bg- bg-opacity-20')
                  )}
                >
                  {status === 'verified' ? '✓' : '⏳'} {displayConfig.label}
                </div>
              )}
            </div>

            {showDetails && (
              <>
                <p
                  className={cn('mt-1', displayConfig.textColor, {
                    'text-xs': size === 'sm',
                    'text-sm': size === 'md',
                    'text-base': size === 'lg',
                  })}
                >
                  {customMessage || displayConfig.description}
                </p>

                {lastVerified && (
                  <p
                    className={cn(
                      'mt-2 text-xs',
                      displayConfig.textColor.replace('-700', '-600')
                    )}
                  >
                    Last verified: {getRelativeTime(lastVerified)}
                  </p>
                )}

                {expiresAt && status === 'verified' && !isExpired && (
                  <p
                    className={cn(
                      'mt-1 text-xs',
                      displayConfig.textColor.replace('-700', '-600')
                    )}
                  >
                    Expires: {formatDate(new Date(expiresAt).getTime())}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
);

VerificationStatus.displayName = 'VerificationStatus';
