/**
 * ExpirationWarning component for displaying credential expiration indicators
 *
 * @example
 * ```tsx
 * <ExpirationWarning
 *   expirationInfo={expirationInfo}
 *   variant="banner"
 *   showActions={true}
 * />
 * ```
 *
 * @since 1.0.0
 */

'use client';

import * as React from 'react';
import { Button } from './Button';
import type { CredentialExpirationInfo } from '@/types/compliance';
import { cn } from '@/lib/utils';

export interface ExpirationWarningProps {
  /** Expiration information to display */
  expirationInfo: CredentialExpirationInfo;

  /** Visual variant */
  variant?: 'inline' | 'banner' | 'card' | 'toast';

  /** Whether to show action buttons */
  showActions?: boolean;

  /** Whether the warning can be dismissed */
  dismissible?: boolean;

  /** Additional CSS classes */
  className?: string;

  /** Callback when action button is clicked */
  onAction?: (
    credentialId: string,
    action: 'renew' | 'view' | 'dismiss'
  ) => void;

  /** Callback when warning is dismissed */
  onDismiss?: (credentialId: string) => void;

  /** Custom action button text */
  actionText?: string;

  /** Whether to show detailed information */
  showDetails?: boolean;
}

/**
 * Warning level configuration
 */
const warningConfig = {
  none: {
    color: 'gray',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-800',
    icon: '📋',
    urgency: 'low',
  },
  info: {
    color: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
    icon: 'ℹ️',
    urgency: 'low',
  },
  warning: {
    color: 'yellow',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-800',
    icon: '⚠️',
    urgency: 'medium',
  },
  critical: {
    color: 'red',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    icon: '🚨',
    urgency: 'high',
  },
};

/**
 * Display expiration warning with appropriate urgency styling
 */
export function ExpirationWarning({
  expirationInfo,
  variant = 'inline',
  showActions = true,
  dismissible = false,
  className,
  onAction,
  onDismiss,
  actionText,
  showDetails = false,
}: ExpirationWarningProps) {
  const [dismissed, setDismissed] = React.useState(false);

  if (dismissed || expirationInfo.warningLevel === 'none') {
    return null;
  }

  const config = warningConfig[expirationInfo.warningLevel];

  const handleAction = (action: 'renew' | 'view' | 'dismiss') => {
    onAction?.(expirationInfo.credentialId, action);
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.(expirationInfo.credentialId);
  };

  const getWarningMessage = () => {
    if (expirationInfo.isExpired) {
      return `Credential expired ${Math.abs(expirationInfo.daysUntilExpiration)} days ago`;
    } else {
      return `Credential expires in ${expirationInfo.daysUntilExpiration} days`;
    }
  };

  const getDetailedMessage = () => {
    const expDate = expirationInfo.expiresAt.toLocaleDateString();
    if (expirationInfo.isExpired) {
      return `This ${expirationInfo.credentialType.replace('_', ' ')} credential expired on ${expDate} and is no longer valid.`;
    } else {
      return `This ${expirationInfo.credentialType.replace('_', ' ')} credential will expire on ${expDate}.`;
    }
  };

  if (variant === 'banner') {
    return (
      <div
        className={cn(
          'border-l-4 border-l-current p-4',
          config.bgColor,
          config.textColor,
          className
        )}
      >
        <div className='flex items-start justify-between'>
          <div className='flex items-start gap-3'>
            <span className='text-xl'>{config.icon}</span>
            <div>
              <div className='font-medium'>{getWarningMessage()}</div>
              {showDetails && (
                <div className='mt-1 text-sm opacity-90'>
                  {getDetailedMessage()}
                </div>
              )}
              <div className='mt-1 text-sm'>
                Product:{' '}
                <span className='font-mono'>{expirationInfo.productId}</span>
              </div>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            {showActions && (
              <>
                <Button
                  onClick={() => handleAction('view')}
                  variant='outline'
                  size='sm'
                  className='text-xs'
                >
                  View
                </Button>
                {!expirationInfo.isExpired && (
                  <Button
                    onClick={() => handleAction('renew')}
                    variant='outline'
                    size='sm'
                    className='text-xs'
                  >
                    {actionText || 'Renew'}
                  </Button>
                )}
              </>
            )}
            {dismissible && (
              <Button
                onClick={handleDismiss}
                variant='ghost'
                size='sm'
                className='p-1 text-xs'
              >
                ✕
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div
        className={cn(
          'rounded-lg border p-4',
          config.bgColor,
          config.borderColor,
          config.textColor,
          className
        )}
      >
        <div className='flex items-start gap-3'>
          <span className='text-2xl'>{config.icon}</span>
          <div className='flex-1'>
            <div className='mb-1 font-semibold'>
              Credential Expiration{' '}
              {expirationInfo.isExpired ? 'Alert' : 'Warning'}
            </div>
            <div className='mb-2 text-sm'>{getDetailedMessage()}</div>
            <div className='mb-3 text-xs text-opacity-80'>
              Credential ID:{' '}
              <span className='font-mono'>{expirationInfo.credentialId}</span>
            </div>
            {showActions && (
              <div className='flex gap-2'>
                <Button
                  onClick={() => handleAction('view')}
                  variant='outline'
                  size='sm'
                >
                  View Credential
                </Button>
                {!expirationInfo.isExpired && (
                  <Button
                    onClick={() => handleAction('renew')}
                    variant='primary'
                    size='sm'
                  >
                    {actionText || 'Renew Now'}
                  </Button>
                )}
              </div>
            )}
          </div>
          {dismissible && (
            <Button
              onClick={handleDismiss}
              variant='ghost'
              size='sm'
              className='p-1'
            >
              ✕
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'toast') {
    return (
      <div
        className={cn(
          'max-w-sm rounded-md border p-3 shadow-lg',
          config.bgColor,
          config.borderColor,
          config.textColor,
          className
        )}
      >
        <div className='flex items-center gap-2'>
          <span>{config.icon}</span>
          <div className='min-w-0 flex-1'>
            <div className='truncate text-sm font-medium'>
              {getWarningMessage()}
            </div>
            <div className='truncate text-xs opacity-80'>
              {expirationInfo.credentialId}
            </div>
          </div>
          <div className='flex gap-1'>
            {showActions && (
              <Button
                onClick={() => handleAction('view')}
                variant='ghost'
                size='sm'
                className='p-1 text-xs'
              >
                View
              </Button>
            )}
            {dismissible && (
              <Button
                onClick={handleDismiss}
                variant='ghost'
                size='sm'
                className='p-1 text-xs'
              >
                ✕
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default inline variant
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm',
        config.bgColor,
        config.textColor,
        className
      )}
    >
      <span>{config.icon}</span>
      <span>{getWarningMessage()}</span>
      {showActions && (
        <Button
          onClick={() => handleAction('view')}
          variant='ghost'
          size='sm'
          className='ml-1 p-1 text-xs'
        >
          View
        </Button>
      )}
      {dismissible && (
        <Button
          onClick={handleDismiss}
          variant='ghost'
          size='sm'
          className='p-1 text-xs'
        >
          ✕
        </Button>
      )}
    </div>
  );
}

/**
 * Expiration warning summary for multiple credentials
 */
export function ExpirationWarningSummary({
  expirationInfos,
  variant = 'card',
  maxItems = 5,
  className,
  onAction,
}: {
  expirationInfos: CredentialExpirationInfo[];
  variant?: 'card' | 'banner';
  maxItems?: number;
  className?: string;
  onAction?: (credentialId: string, action: 'view' | 'renew') => void;
}) {
  const sortedInfos = expirationInfos
    .filter(info => info.warningLevel !== 'none')
    .sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration);

  if (sortedInfos.length === 0) {
    return null;
  }

  const displayedInfos = sortedInfos.slice(0, maxItems);
  const hiddenCount = sortedInfos.length - displayedInfos.length;

  const criticalCount = sortedInfos.filter(
    info => info.warningLevel === 'critical'
  ).length;
  const warningCount = sortedInfos.filter(
    info => info.warningLevel === 'warning'
  ).length;

  return (
    <div
      className={cn(
        variant === 'card'
          ? 'rounded-lg border border-yellow-200 bg-yellow-50 p-4'
          : 'border-l-4 border-l-yellow-400 bg-yellow-50 p-4',
        className
      )}
    >
      <div className='flex items-start gap-3'>
        <span className='text-2xl'>⚠️</span>
        <div className='flex-1'>
          <div className='mb-2 font-semibold text-yellow-800'>
            Credential Expiration Alerts
          </div>
          <div className='mb-3 text-sm text-yellow-700'>
            {criticalCount > 0 && (
              <span>{criticalCount} expired or expiring soon</span>
            )}
            {criticalCount > 0 && warningCount > 0 && <span>, </span>}
            {warningCount > 0 && (
              <span>{warningCount} expiring within 30 days</span>
            )}
          </div>
          <div className='space-y-2'>
            {displayedInfos.map(info => (
              <div
                key={info.credentialId}
                className='flex items-center justify-between text-sm'
              >
                <div>
                  <span className='font-mono text-xs'>{info.credentialId}</span>
                  <span className='ml-2'>
                    {info.isExpired
                      ? `Expired ${Math.abs(info.daysUntilExpiration)} days ago`
                      : `${info.daysUntilExpiration} days remaining`}
                  </span>
                </div>
                <div className='flex gap-1'>
                  <Button
                    onClick={() => onAction?.(info.credentialId, 'view')}
                    variant='ghost'
                    size='sm'
                    className='text-xs'
                  >
                    View
                  </Button>
                  {!info.isExpired && (
                    <Button
                      onClick={() => onAction?.(info.credentialId, 'renew')}
                      variant='outline'
                      size='sm'
                      className='text-xs'
                    >
                      Renew
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {hiddenCount > 0 && (
            <div className='mt-2 text-xs text-yellow-600'>
              +{hiddenCount} more credential{hiddenCount === 1 ? '' : 's'}{' '}
              requiring attention
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
