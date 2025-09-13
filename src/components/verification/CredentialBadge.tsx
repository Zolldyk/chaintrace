/**
 * CredentialBadge component for displaying credential status indicators
 *
 * @example
 * ```tsx
 * <CredentialBadge
 *   status="active"
 *   size="md"
 *   showWarning={true}
 * />
 * ```
 *
 * @since 1.0.0
 */

'use client';

import * as React from 'react';
import type { CredentialStatus } from '@/types/compliance';
import { cn } from '@/lib/utils';

export interface CredentialBadgeProps {
  /** Credential status to display */
  status: CredentialStatus;

  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg';

  /** Whether to show warning indicator */
  showWarning?: boolean;

  /** Additional CSS classes */
  className?: string;

  /** Custom icon override */
  customIcon?: string;

  /** Whether to show status text */
  showText?: boolean;

  /** Whether to animate the badge */
  animated?: boolean;
}

/**
 * Status configuration for visual styling
 */
const statusConfig: Record<
  CredentialStatus,
  {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
    icon: string;
  }
> = {
  active: {
    label: 'Active',
    color: 'green',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-200',
    textColor: 'text-green-800',
    icon: '✓',
  },
  issued: {
    label: 'Issued',
    color: 'blue',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
    icon: '📄',
  },
  expired: {
    label: 'Expired',
    color: 'red',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    icon: '⏰',
  },
  revoked: {
    label: 'Revoked',
    color: 'red',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    icon: '❌',
  },
};

/**
 * Size configuration for different badge sizes
 */
const sizeConfig = {
  xs: {
    container: 'px-2 py-1 text-xs gap-1',
    icon: 'text-xs',
    text: 'text-xs',
  },
  sm: {
    container: 'px-2.5 py-1.5 text-xs gap-1',
    icon: 'text-sm',
    text: 'text-xs',
  },
  md: {
    container: 'px-3 py-1.5 text-sm gap-2',
    icon: 'text-sm',
    text: 'text-sm',
  },
  lg: {
    container: 'px-4 py-2 text-base gap-2',
    icon: 'text-base',
    text: 'text-base',
  },
};

/**
 * Display credential status as a styled badge
 */
export function CredentialBadge({
  status,
  size = 'md',
  showWarning = false,
  className,
  customIcon,
  showText = true,
  animated = false,
}: CredentialBadgeProps) {
  const config = statusConfig[status];
  const sizeStyles = sizeConfig[size];

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full border font-medium',
        config.bgColor,
        config.borderColor,
        config.textColor,
        sizeStyles.container,
        {
          'animate-pulse': animated && status === 'issued',
          'shadow-sm': size === 'lg',
        },
        className
      )}
    >
      {/* Status Icon */}
      <span className={cn(sizeStyles.icon)}>{customIcon || config.icon}</span>

      {/* Status Text */}
      {showText && (
        <span className={cn(sizeStyles.text, 'font-medium')}>
          {config.label}
        </span>
      )}

      {/* Warning Indicator */}
      {showWarning && (
        <span
          className={cn('ml-1', sizeStyles.icon, 'text-yellow-600')}
          title='Warning: Action required'
        >
          ⚠️
        </span>
      )}
    </div>
  );
}

/**
 * Credential status indicator with tooltip
 */
export function CredentialStatusIndicator({
  status,
  showWarning,
  warningMessage,
  className,
}: {
  status: CredentialStatus;
  showWarning?: boolean;
  warningMessage?: string;
  className?: string;
}) {
  const config = statusConfig[status];

  return (
    <div
      className={cn('relative inline-flex items-center', className)}
      title={warningMessage || `Status: ${config.label}`}
    >
      <div
        className={cn('h-3 w-3 rounded-full border-2', {
          'border-green-500 bg-green-400': status === 'active',
          'border-blue-500 bg-blue-400': status === 'issued',
          'border-red-500 bg-red-400':
            status === 'expired' || status === 'revoked',
        })}
      />

      {showWarning && (
        <div className='absolute -right-1 -top-1'>
          <div className='h-3 w-3 rounded-full border-2 border-white bg-yellow-400'>
            <span className='sr-only'>Warning</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact credential badge for list views
 */
export function CredentialCompactBadge({
  status,
  type,
  showWarning,
  className,
}: {
  status: CredentialStatus;
  type?: 'supply_chain' | 'carbon_credit' | 'regulatory_compliance';
  showWarning?: boolean;
  className?: string;
}) {
  const config = statusConfig[status];

  const typeIcons = {
    supply_chain: '🔗',
    carbon_credit: '🌱',
    regulatory_compliance: '📋',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs',
        config.bgColor,
        config.textColor,
        className
      )}
    >
      {type && <span>{typeIcons[type]}</span>}
      <span>{config.icon}</span>
      {showWarning && <span className='text-yellow-600'>⚠️</span>}
    </div>
  );
}

/**
 * Credential verification badge for third-party verification
 */
export function CredentialVerificationBadge({
  isValid,
  verifiedAt,
  className,
}: {
  isValid: boolean;
  verifiedAt?: Date;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium',
        {
          'border border-green-200 bg-green-100 text-green-800': isValid,
          'border border-red-200 bg-red-100 text-red-800': !isValid,
        },
        className
      )}
    >
      <span>{isValid ? '✓' : '❌'}</span>
      <span>{isValid ? 'Verified' : 'Invalid'}</span>
      {verifiedAt && isValid && (
        <span className='text-xs text-green-600'>
          {verifiedAt.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
