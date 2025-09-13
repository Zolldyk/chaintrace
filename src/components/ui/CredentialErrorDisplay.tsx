/**
 * CredentialErrorDisplay component for comprehensive error handling
 *
 * @example
 * ```tsx
 * <CredentialErrorDisplay
 *   error={credentialError}
 *   onRetry={handleRetry}
 *   showRecoveryOptions={true}
 * />
 * ```
 *
 * @since 1.0.0
 */

'use client';

import * as React from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { logger } from '@/lib/logger';
import { Modal } from './Modal';
import type {
  CredentialError,
  RecoveryStrategy,
} from '@/lib/credential-error-handling';
import {
  handleCredentialError,
  getErrorDisplayInfo,
  trackCredentialError,
} from '@/lib/credential-error-handling';
import { cn } from '@/lib/utils';

export interface CredentialErrorDisplayProps {
  /** The credential error to display */
  error: CredentialError | Error | unknown;

  /** Additional context for error handling */
  context?: Record<string, any>;

  /** Whether to show recovery options */
  showRecoveryOptions?: boolean;

  /** Whether to show technical details */
  showTechnicalDetails?: boolean;

  /** Whether the error display can be dismissed */
  dismissible?: boolean;

  /** Additional CSS classes */
  className?: string;

  /** Callback when retry is requested */
  onRetry?: () => void;

  /** Callback when error is dismissed */
  onDismiss?: () => void;

  /** Callback when recovery strategy is executed */
  onRecoveryAction?: (strategy: RecoveryStrategy) => void;

  /** Custom recovery strategies */
  customRecoveryStrategies?: RecoveryStrategy[];
}

/**
 * Comprehensive error display with recovery options
 */
export function CredentialErrorDisplay({
  error,
  context = {},
  showRecoveryOptions = true,
  showTechnicalDetails = false,
  dismissible = false,
  className,
  onRetry: _onRetry,
  onDismiss,
  onRecoveryAction,
  customRecoveryStrategies = [],
}: CredentialErrorDisplayProps) {
  const [showDetails, setShowDetails] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);

  // Process the error and get recovery strategies
  const { error: credentialError, recoveryStrategies } = React.useMemo(() => {
    const result = handleCredentialError(error, context);
    return {
      ...result,
      recoveryStrategies: [
        ...result.recoveryStrategies,
        ...customRecoveryStrategies,
      ],
    };
  }, [error, context, customRecoveryStrategies]);

  // Get display information
  const displayInfo = React.useMemo(() => {
    return getErrorDisplayInfo(credentialError);
  }, [credentialError]);

  // Track error for monitoring
  React.useEffect(() => {
    trackCredentialError(credentialError, context);
  }, [credentialError, context]);

  // Handle dismiss
  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  // Handle recovery action
  const handleRecoveryAction = async (strategy: RecoveryStrategy) => {
    try {
      await strategy.action();
      onRecoveryAction?.(strategy);
    } catch (actionError) {
      // Recovery action failed - handled silently or can be logged properly
      logger.error(
        'Recovery action failed',
        actionError instanceof Error
          ? actionError
          : new Error(String(actionError))
      );
    }
  };

  if (dismissed) {
    return null;
  }

  return (
    <Card
      className={cn(
        'border-l-4 p-6',
        {
          'border-l-red-500 bg-red-50': displayInfo.severity === 'error',
          'border-l-yellow-500 bg-yellow-50':
            displayInfo.severity === 'warning',
          'border-l-blue-500 bg-blue-50': displayInfo.severity === 'info',
        },
        className
      )}
    >
      <div className='flex items-start gap-4'>
        {/* Error Icon */}
        <div className='flex-shrink-0'>
          <span className='text-2xl'>{displayInfo.icon}</span>
        </div>

        {/* Error Content */}
        <div className='min-w-0 flex-1'>
          {/* Header */}
          <div className='flex items-start justify-between'>
            <div>
              <h3
                className={cn('text-lg font-semibold', {
                  'text-red-800': displayInfo.severity === 'error',
                  'text-yellow-800': displayInfo.severity === 'warning',
                  'text-blue-800': displayInfo.severity === 'info',
                })}
              >
                {displayInfo.title}
              </h3>
              <p
                className={cn('mt-1 text-sm', {
                  'text-red-700': displayInfo.severity === 'error',
                  'text-yellow-700': displayInfo.severity === 'warning',
                  'text-blue-700': displayInfo.severity === 'info',
                })}
              >
                {displayInfo.message}
              </p>
            </div>

            {/* Dismiss Button */}
            {dismissible && (
              <Button
                onClick={handleDismiss}
                variant='ghost'
                size='sm'
                className='-mr-1 -mt-1 p-1'
              >
                ✕
              </Button>
            )}
          </div>

          {/* Error Code and Timestamp */}
          <div className='mt-2 text-xs opacity-75'>
            <span>Error: {credentialError.code}</span>
            <span className='mx-2'>•</span>
            <span>{credentialError.timestamp.toLocaleTimeString()}</span>
          </div>

          {/* Recovery Options */}
          {showRecoveryOptions && recoveryStrategies.length > 0 && (
            <div className='mt-4'>
              <div className='mb-2 text-sm font-medium'>
                What would you like to do?
              </div>
              <div className='flex flex-wrap gap-2'>
                {recoveryStrategies.slice(0, 3).map(strategy => (
                  <Button
                    key={strategy.id}
                    onClick={() => handleRecoveryAction(strategy)}
                    variant='outline'
                    size='sm'
                    className='text-xs'
                  >
                    {strategy.icon && (
                      <span className='mr-1'>{strategy.icon}</span>
                    )}
                    {strategy.label}
                  </Button>
                ))}
                {recoveryStrategies.length > 3 && (
                  <Button
                    onClick={() => setShowDetails(true)}
                    variant='ghost'
                    size='sm'
                    className='text-xs'
                  >
                    More options...
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Technical Details Toggle */}
          {(displayInfo.showTechnicalDetails || showTechnicalDetails) && (
            <div className='mt-3'>
              <Button
                onClick={() => setShowDetails(true)}
                variant='ghost'
                size='sm'
                className='text-xs'
              >
                Show technical details
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Error Modal */}
      <ErrorDetailsModal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        error={credentialError}
        recoveryStrategies={recoveryStrategies}
        onRecoveryAction={handleRecoveryAction}
      />
    </Card>
  );
}

/**
 * Compact error display for inline use
 */
export function CredentialErrorBanner({
  error,
  onRetry,
  className,
}: {
  error: CredentialError | Error | unknown;
  onRetry?: () => void;
  className?: string;
}) {
  const { error: credentialError } = handleCredentialError(error);
  const displayInfo = getErrorDisplayInfo(credentialError);

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border p-3',
        {
          'border-red-200 bg-red-50 text-red-800':
            displayInfo.severity === 'error',
          'border-yellow-200 bg-yellow-50 text-yellow-800':
            displayInfo.severity === 'warning',
          'border-blue-200 bg-blue-50 text-blue-800':
            displayInfo.severity === 'info',
        },
        className
      )}
    >
      <span className='text-lg'>{displayInfo.icon}</span>
      <div className='min-w-0 flex-1'>
        <div className='text-sm font-medium'>{displayInfo.title}</div>
        <div className='text-xs opacity-90'>{displayInfo.message}</div>
      </div>
      {onRetry && credentialError.isRetryable() && (
        <Button
          onClick={onRetry}
          variant='outline'
          size='sm'
          className='text-xs'
        >
          Retry
        </Button>
      )}
    </div>
  );
}

/**
 * Error details modal with full recovery options
 */
function ErrorDetailsModal({
  isOpen,
  onClose,
  error,
  recoveryStrategies,
  onRecoveryAction,
}: {
  isOpen: boolean;
  onClose: () => void;
  error: CredentialError;
  recoveryStrategies: RecoveryStrategy[];
  onRecoveryAction: (strategy: RecoveryStrategy) => void;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className='space-y-6 p-6'>
        {/* Error Summary */}
        <div>
          <h3 className='mb-2 text-lg font-semibold text-gray-900'>
            Error Summary
          </h3>
          <div className='space-y-2 rounded-lg bg-gray-50 p-4'>
            <div className='flex justify-between text-sm'>
              <span className='font-medium'>Error Code:</span>
              <span className='font-mono'>{error.code}</span>
            </div>
            <div className='flex justify-between text-sm'>
              <span className='font-medium'>Status:</span>
              <span>{error.statusCode}</span>
            </div>
            <div className='flex justify-between text-sm'>
              <span className='font-medium'>Retryable:</span>
              <span>{error.isRetryable() ? 'Yes' : 'No'}</span>
            </div>
            <div className='flex justify-between text-sm'>
              <span className='font-medium'>Timestamp:</span>
              <span>{error.timestamp.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Recovery Strategies */}
        <div>
          <h3 className='mb-3 text-lg font-semibold text-gray-900'>
            Recovery Options
          </h3>
          <div className='space-y-3'>
            {recoveryStrategies.map(strategy => (
              <div
                key={strategy.id}
                className='flex items-start gap-3 rounded-lg border border-gray-200 p-3'
              >
                {strategy.icon && (
                  <span className='text-lg'>{strategy.icon}</span>
                )}
                <div className='flex-1'>
                  <div className='font-medium text-gray-900'>
                    {strategy.label}
                  </div>
                  <div className='text-sm text-gray-600'>
                    {strategy.description}
                  </div>
                </div>
                <Button
                  onClick={() => onRecoveryAction(strategy)}
                  variant='outline'
                  size='sm'
                >
                  Execute
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Details */}
        <details className='space-y-2'>
          <summary className='cursor-pointer font-medium text-gray-900'>
            Technical Details
          </summary>
          <div className='rounded-lg bg-gray-100 p-4'>
            <pre className='whitespace-pre-wrap text-xs text-gray-700'>
              {JSON.stringify(error.toJSON(), null, 2)}
            </pre>
          </div>
        </details>

        {/* Actions */}
        <div className='flex justify-end'>
          <Button onClick={onClose} variant='outline'>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Loading state with error boundary
 */
export function CredentialLoadingState({
  message = 'Loading...',
  timeout = 30000,
  onTimeout,
  className,
}: {
  message?: string;
  timeout?: number;
  onTimeout?: () => void;
  className?: string;
}) {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onTimeout?.();
    }, timeout);

    return () => clearTimeout(timer);
  }, [timeout, onTimeout]);

  return (
    <div className={cn('py-8 text-center', className)}>
      <div className='mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-current border-t-transparent text-blue-600'></div>
      <div className='mb-2 text-lg font-medium text-gray-900'>{message}</div>
      <div className='text-sm text-gray-500'>
        This is taking longer than expected...
      </div>
    </div>
  );
}
