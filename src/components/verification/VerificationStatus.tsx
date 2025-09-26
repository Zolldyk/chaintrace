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

  /** Whether to show additional details (AC: 2) */
  showDetails?: boolean;

  /** Additional CSS classes */
  className?: string;

  /** Size variant with enhanced mobile optimization */
  size?: 'sm' | 'md' | 'lg';

  /** Whether to show icon with accessibility enhancements */
  showIcon?: boolean;

  /** Custom message override */
  customMessage?: string;

  /** Whether to show action suggestions based on status */
  showActionSuggestions?: boolean;

  /** Callback for action button clicks */
  onActionClick?: (action: 'refresh' | 'report' | 'verify') => void;

  /** Whether to show enhanced accessibility features */
  enhancedAccessibility?: boolean;
}

/**
 * Enhanced status configuration with instantly recognizable colors and icons (AC: 2)
 * Follows Nigerian market accessibility standards and international best practices
 */
const statusConfig: Record<
  Status,
  {
    label: string;
    description: string;
    color: string;
    bgColor: string;
    textColor: string;
    ringColor: string;
    pulseColor: string;
    icon: React.ReactNode;
    priority: 'high' | 'medium' | 'low';
    accessibility: {
      ariaLabel: string;
      colorBlindText: string;
    };
  }
> = {
  verified: {
    label: 'Verified',
    description:
      'This product has been successfully verified and is authentic. Safe to purchase.',
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-200',
    textColor: 'text-green-800',
    ringColor: 'ring-green-300',
    pulseColor: 'animate-pulse-green',
    priority: 'high',
    accessibility: {
      ariaLabel: 'Product successfully verified and authentic',
      colorBlindText: 'VERIFIED - Safe to purchase',
    },
    icon: (
      <svg
        className='h-5 w-5'
        fill='currentColor'
        viewBox='0 0 20 20'
        xmlns='http://www.w3.org/2000/svg'
        role='img'
        aria-label='Verified checkmark'
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
    label: '⏳ Pending Verification',
    description:
      'This product is currently being verified. Results will be available shortly.',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50 border-amber-200',
    textColor: 'text-amber-800',
    ringColor: 'ring-amber-300',
    pulseColor: 'animate-pulse-amber',
    priority: 'medium',
    accessibility: {
      ariaLabel: 'Product verification in progress',
      colorBlindText: 'PENDING - Verification in progress',
    },
    icon: (
      <svg
        className='h-5 w-5 animate-spin'
        fill='currentColor'
        viewBox='0 0 20 20'
        xmlns='http://www.w3.org/2000/svg'
        role='img'
        aria-label='Pending verification spinner'
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
    label: '❓ Not Verified',
    description:
      'This product has not been verified yet. Verification data may be unavailable.',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50 border-gray-200',
    textColor: 'text-gray-800',
    ringColor: 'ring-gray-300',
    pulseColor: 'animate-pulse-gray',
    priority: 'medium',
    accessibility: {
      ariaLabel: 'Product not yet verified - status unknown',
      colorBlindText: 'UNVERIFIED - Status unknown',
    },
    icon: (
      <svg
        className='h-5 w-5'
        fill='currentColor'
        viewBox='0 0 20 20'
        xmlns='http://www.w3.org/2000/svg'
        role='img'
        aria-label='Unverified question mark'
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
    label: '❌ Verification Failed',
    description: 'This product could not be verified. Please exercise caution.',
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-200',
    textColor: 'text-red-800',
    ringColor: 'ring-red-300',
    pulseColor: 'animate-pulse-red',
    priority: 'high',
    accessibility: {
      ariaLabel: 'Product verification failed - not authentic',
      colorBlindText: 'FAILED - Do not purchase',
    },
    icon: (
      <svg
        className='h-5 w-5'
        fill='currentColor'
        viewBox='0 0 20 20'
        xmlns='http://www.w3.org/2000/svg'
        role='img'
        aria-label='Verification failed X mark'
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
    label: 'Verification expired',
    description:
      "This product's verification has expired and needs to be re-verified. Use caution.",
    color: 'text-orange-700',
    bgColor: 'bg-orange-50 border-orange-200',
    textColor: 'text-orange-800',
    ringColor: 'ring-orange-300',
    pulseColor: 'animate-pulse-orange',
    priority: 'high',
    accessibility: {
      ariaLabel: 'Product verification has expired - needs re-verification',
      colorBlindText: 'EXPIRED - Needs re-verification',
    },
    icon: (
      <svg
        className='h-5 w-5'
        fill='currentColor'
        viewBox='0 0 20 20'
        xmlns='http://www.w3.org/2000/svg'
        role='img'
        aria-label='Expired warning triangle'
      >
        <path
          fillRule='evenodd'
          d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z'
          clipRule='evenodd'
        />
      </svg>
    ),
  },
  created: {
    label: '🆕 Recently Created',
    description:
      'This product has been created and registered. Verification pending.',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200',
    textColor: 'text-blue-800',
    ringColor: 'ring-blue-300',
    pulseColor: 'animate-pulse-blue',
    priority: 'low',
    accessibility: {
      ariaLabel: 'Product recently created and registered',
      colorBlindText: 'CREATED - Recently registered',
    },
    icon: (
      <svg
        className='h-5 w-5'
        fill='currentColor'
        viewBox='0 0 20 20'
        xmlns='http://www.w3.org/2000/svg'
        role='img'
        aria-label='Created plus symbol'
      >
        <path
          fillRule='evenodd'
          d='M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z'
          clipRule='evenodd'
        />
      </svg>
    ),
  },
  processing: {
    label: '🔄 Processing',
    description:
      'This product is being processed through the verification system.',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50 border-indigo-200',
    textColor: 'text-indigo-800',
    ringColor: 'ring-indigo-300',
    pulseColor: 'animate-pulse-indigo',
    priority: 'medium',
    accessibility: {
      ariaLabel: 'Product currently being processed',
      colorBlindText: 'PROCESSING - System is working',
    },
    icon: (
      <svg
        className='h-5 w-5 animate-spin'
        fill='currentColor'
        viewBox='0 0 20 20'
        xmlns='http://www.w3.org/2000/svg'
        role='img'
        aria-label='Processing spinner'
      >
        <path
          clipRule='evenodd'
          fillRule='evenodd'
          d='M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H4.989a.75.75 0 00-.75.75v3.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm-3.068-9.93a7 7 0 00-11.712 3.138.75.75 0 101.449.39 5.5 5.5 0 019.201-2.466l.312.311h-2.433a.75.75 0 000 1.5h3.243a.75.75 0 00.75-.75V1.375a.75.75 0 00-1.5 0v2.43l-.31-.31z'
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
          'relative overflow-hidden rounded border transition-all duration-200',
          displayConfig.bgColor,
          displayConfig.priority === 'high' && 'ring-1',
          displayConfig.priority === 'high' && displayConfig.ringColor,
          {
            'p-1': size === 'sm',
            'p-2': size === 'md',
            'p-3': size === 'lg',
          },
          className
        )}
        role='status'
        aria-label={displayConfig.accessibility.ariaLabel}
        {...props}
      >
        {/* Accessibility enhancement for screen readers */}
        <div className='sr-only'>
          {displayConfig.accessibility.colorBlindText}
        </div>

        {/* Priority pulse animation for high-priority statuses - only for negative statuses */}
        {displayConfig.priority === 'high' && displayStatus !== 'verified' && (
          <div
            className={cn(
              'absolute inset-0 rounded-xl opacity-20',
              displayConfig.pulseColor
            )}
            aria-hidden='true'
          />
        )}

        <div
          className={cn('relative flex items-start', {
            'gap-1': size === 'sm',
            'gap-2': size === 'md' || size === 'lg',
          })}
        >
          {showIcon && (
            <div
              className={cn(
                'flex-shrink-0 rounded-full p-1 shadow-inner',
                displayConfig.color,
                'ring-1 ring-white ring-offset-1',
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
                  size === 'sm' && 'h-3 w-3',
                  size === 'md' && 'h-4 w-4',
                  size === 'lg' && 'h-5 w-5'
                ),
              })}
            </div>
          )}

          <div className='min-w-0 flex-1'>
            <div className='flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between'>
              <div className='flex items-center gap-2'>
                <h3
                  className={cn('font-bold', displayConfig.textColor, {
                    'text-sm': size === 'sm',
                    'text-base': size === 'md',
                    'text-lg': size === 'lg',
                  })}
                >
                  {displayConfig.label}
                </h3>

                {/* Priority indicator badge - only show URGENT for negative statuses */}
                {displayConfig.priority === 'high' &&
                  displayStatus !== 'verified' && (
                    <span className='inline-flex items-center rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-800 ring-1 ring-red-200'>
                      URGENT
                    </span>
                  )}
              </div>

              {/* Last updated info only */}
              {lastVerified && (
                <div className='flex items-center gap-2'>
                  <span
                    className={cn(
                      'text-xs font-medium',
                      displayConfig.textColor.replace('-800', '-600')
                    )}
                  >
                    Updated {getRelativeTime(lastVerified)}
                  </span>
                </div>
              )}
            </div>

            {showDetails && (
              <>
                <p
                  className={cn(
                    'mt-1 leading-tight',
                    displayConfig.textColor.replace('-800', '-700'),
                    {
                      'text-xs': size === 'sm',
                      'text-sm': size === 'md',
                      'text-base': size === 'lg',
                    }
                  )}
                >
                  {customMessage || displayConfig.description}
                </p>

                {/* Enhanced metadata grid with better mobile layout */}
                <div className='mt-2 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2'>
                  {lastVerified && (
                    <div className='flex items-center gap-2 text-gray-600'>
                      <svg
                        className='h-4 w-4 text-gray-400'
                        fill='currentColor'
                        viewBox='0 0 20 20'
                      >
                        <path
                          fillRule='evenodd'
                          d='M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z'
                          clipRule='evenodd'
                        />
                      </svg>
                      <span className='text-gray-500'>Last verified:</span>
                      <span className='font-medium text-gray-900'>
                        {getRelativeTime(lastVerified)}
                      </span>
                    </div>
                  )}

                  {expiresAt && status === 'verified' && !isExpired && (
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
                      <span className='text-gray-500'>Expires:</span>
                      <span className='font-medium text-gray-900'>
                        {formatDate(new Date(expiresAt).getTime(), {
                          dateStyle: 'medium',
                        })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action suggestions based on status */}
                {displayStatus === 'expired' && (
                  <div className='mt-4 rounded-lg bg-orange-100 p-3 ring-1 ring-orange-200'>
                    <div className='flex items-start gap-2'>
                      <svg
                        className='mt-0.5 h-4 w-4 flex-shrink-0 text-orange-600'
                        fill='currentColor'
                        viewBox='0 0 20 20'
                      >
                        <path
                          fillRule='evenodd'
                          d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z'
                          clipRule='evenodd'
                        />
                      </svg>
                      <div className='text-sm text-orange-800'>
                        <p className='font-medium'>Action Required</p>
                        <p className='mt-1'>
                          This product needs re-verification to ensure continued
                          authenticity.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {displayStatus === 'rejected' && (
                  <div className='mt-1 rounded bg-red-50 px-2 py-1 ring-1 ring-red-200'>
                    <div className='flex items-center gap-1'>
                      <svg
                        className='h-3 w-3 flex-shrink-0 text-red-600'
                        fill='currentColor'
                        viewBox='0 0 20 20'
                      >
                        <path
                          fillRule='evenodd'
                          d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
                          clipRule='evenodd'
                        />
                      </svg>
                      <span className='text-xs font-medium text-red-700'>
                        Exercise caution before purchasing
                      </span>
                    </div>
                  </div>
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
