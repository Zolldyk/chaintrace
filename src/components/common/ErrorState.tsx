'use client';

import React from 'react';
import {
  ChainTraceError,
  createUserFriendlyMessage,
  NetworkError,
  AuthenticationError,
  TimeoutError,
} from '@/lib/errors';

/**
 * Props interface for ErrorState component.
 *
 * @interface ErrorStateProps
 */
interface ErrorStateProps {
  error: ChainTraceError | Error;
  onRetry?: (() => void) | undefined;
  showDetails?: boolean | undefined;
  size?: 'sm' | 'md' | 'lg' | undefined;
  variant?: 'default' | 'minimal' | 'inline' | undefined;
  className?: string | undefined;
}

/**
 * ErrorState component for displaying user-friendly error messages with appropriate actions.
 *
 * Provides consistent error display across the application with contextual messaging
 * and recovery options based on error type.
 *
 * @component ErrorState
 *
 * @example
 * ```tsx
 * <ErrorState
 *   error={new NetworkError('Failed to connect to Mirror Node')}
 *   onRetry={() => refetchData()}
 *   size="md"
 *   variant="default"
 * />
 * ```
 *
 * @since 1.0.0
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  onRetry,
  showDetails = false,
  size = 'md',
  variant = 'default',
  className = '',
}) => {
  // Convert generic Error to ChainTraceError for consistent handling
  const chainTraceError =
    error instanceof ChainTraceError
      ? error
      : new ChainTraceError(error.message, 'UNKNOWN_ERROR', {
          statusCode: 500,
          retryable: true,
          cause: error,
        });

  const userMessage = createUserFriendlyMessage(chainTraceError);

  // Size classes
  const sizeClasses = {
    sm: {
      container: 'p-3',
      icon: 'w-8 h-8',
      title: 'text-sm font-medium',
      description: 'text-xs',
      button: 'px-3 py-1 text-xs',
    },
    md: {
      container: 'p-4',
      icon: 'w-10 h-10',
      title: 'text-base font-semibold',
      description: 'text-sm',
      button: 'px-4 py-2 text-sm',
    },
    lg: {
      container: 'p-6',
      icon: 'w-12 h-12',
      title: 'text-lg font-semibold',
      description: 'text-base',
      button: 'px-6 py-3 text-base',
    },
  };

  const classes = sizeClasses[size];

  // Variant styles
  const variantClasses = {
    default: 'bg-red-50 border border-red-200 rounded-lg',
    minimal: 'bg-transparent',
    inline: 'bg-red-50 border-l-4 border-red-400 pl-4',
  };

  // Error type specific icons and colors
  const getErrorIcon = () => {
    if (error instanceof NetworkError) {
      return (
        <svg
          className={`${classes.icon} text-orange-600`}
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0'
          />
        </svg>
      );
    }

    if (error instanceof AuthenticationError) {
      return (
        <svg
          className={`${classes.icon} text-yellow-600`}
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
          />
        </svg>
      );
    }

    if (error instanceof TimeoutError) {
      return (
        <svg
          className={`${classes.icon} text-blue-600`}
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
          />
        </svg>
      );
    }

    // Default error icon
    return (
      <svg
        className={`${classes.icon} text-red-600`}
        fill='none'
        stroke='currentColor'
        viewBox='0 0 24 24'
      >
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
        />
      </svg>
    );
  };

  const getTextColorClass = () => {
    if (error instanceof NetworkError) return 'text-orange-800';
    if (error instanceof AuthenticationError) return 'text-yellow-800';
    if (error instanceof TimeoutError) return 'text-blue-800';
    return 'text-red-800';
  };

  const getDescriptionColorClass = () => {
    if (error instanceof NetworkError) return 'text-orange-700';
    if (error instanceof AuthenticationError) return 'text-yellow-700';
    if (error instanceof TimeoutError) return 'text-blue-700';
    return 'text-red-700';
  };

  return (
    <div
      className={`${variantClasses[variant]} ${classes.container} ${className}`}
    >
      <div
        className={`flex ${variant === 'inline' ? 'items-start' : 'items-center justify-center'} text-center`}
      >
        {variant !== 'minimal' && (
          <div className={`${variant === 'inline' ? 'mr-3 mt-1' : 'mb-4'}`}>
            {getErrorIcon()}
          </div>
        )}

        <div className={variant === 'inline' ? 'flex-1' : ''}>
          <h3 className={`${classes.title} ${getTextColorClass()} mb-2`}>
            {userMessage.title}
          </h3>

          <p
            className={`${classes.description} ${getDescriptionColorClass()} mb-4`}
          >
            {userMessage.description}
          </p>

          <p
            className={`${classes.description} ${getDescriptionColorClass()} mb-4 font-medium`}
          >
            {userMessage.resolution}
          </p>

          <div className='space-y-2'>
            {userMessage.retryable && onRetry && (
              <button
                onClick={onRetry}
                className={`${classes.button} rounded-md bg-blue-600 text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
              >
                Try Again
              </button>
            )}

            <button
              onClick={() => window.location.reload()}
              className={`${classes.button} ml-2 rounded-md bg-gray-600 text-white transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2`}
            >
              Refresh Page
            </button>
          </div>

          {showDetails && (
            <details className='mt-4 text-left'>
              <summary
                className={`cursor-pointer ${classes.description} ${getDescriptionColorClass()} hover:opacity-80`}
              >
                Technical Details
              </summary>
              <div className='mt-2 max-h-32 overflow-auto rounded bg-gray-100 p-3 font-mono text-xs text-gray-800'>
                <div className='mb-1 font-semibold'>
                  Error: {chainTraceError.message}
                </div>
                <div className='mb-1'>Code: {chainTraceError.code}</div>
                <div className='mb-1'>
                  Timestamp: {chainTraceError.timestamp}
                </div>
                {chainTraceError.context && (
                  <div className='mb-1'>Context: {chainTraceError.context}</div>
                )}
                {chainTraceError.stack && (
                  <div>
                    <div className='mb-1 mt-2 font-semibold'>Stack Trace:</div>
                    <pre className='whitespace-pre-wrap text-xs'>
                      {chainTraceError.stack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Specialized ErrorState component for network connectivity issues.
 *
 * @component NetworkErrorState
 *
 * @example
 * ```tsx
 * <NetworkErrorState
 *   service="Mirror Node"
 *   onRetry={() => refetchData()}
 * />
 * ```
 *
 * @since 1.0.0
 */
export const NetworkErrorState: React.FC<{
  service?: string | undefined;
  onRetry?: (() => void) | undefined;
  className?: string | undefined;
}> = ({ service = 'the service', onRetry, className }) => {
  const networkError = new NetworkError(`Unable to connect to ${service}`, {
    service,
  });

  return (
    <ErrorState
      error={networkError}
      onRetry={onRetry}
      className={className}
      variant='default'
    />
  );
};

/**
 * Specialized ErrorState component for authentication failures.
 *
 * @component AuthErrorState
 *
 * @example
 * ```tsx
 * <AuthErrorState
 *   onReconnect={() => reconnectWallet()}
 * />
 * ```
 *
 * @since 1.0.0
 */
export const AuthErrorState: React.FC<{
  onReconnect?: (() => void) | undefined;
  className?: string | undefined;
}> = ({ onReconnect, className }) => {
  const authError = new AuthenticationError('Wallet connection required');

  return (
    <ErrorState
      error={authError}
      onRetry={onReconnect}
      className={className}
      variant='default'
    />
  );
};

/**
 * Inline ErrorState component for form field or component-level errors.
 *
 * @component InlineErrorState
 *
 * @example
 * ```tsx
 * <InlineErrorState
 *   message="Invalid product ID format"
 *   onDismiss={() => clearError()}
 * />
 * ```
 *
 * @since 1.0.0
 */
export const InlineErrorState: React.FC<{
  message: string;
  onDismiss?: () => void;
  className?: string;
}> = ({ message, onDismiss, className }) => {
  return (
    <div className={`border-l-4 border-red-400 bg-red-50 p-3 ${className}`}>
      <div className='flex items-start justify-between'>
        <div className='flex'>
          <svg
            className='mr-2 mt-0.5 h-4 w-4 text-red-400'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 8v4m0 4h.01'
            />
          </svg>
          <p className='text-sm text-red-700'>{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className='text-red-400 hover:text-red-600 focus:outline-none'
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
                d='M6 18L18 6M6 6l12 12'
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};
