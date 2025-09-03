'use client';

import React, { Component, ReactNode } from 'react';
import { ChainTraceError, createUserFriendlyMessage } from '@/lib/errors';

/**
 * Props interface for ErrorBoundary component.
 *
 * @interface ErrorBoundaryProps
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showDetails?: boolean;
}

/**
 * State interface for ErrorBoundary component.
 *
 * @interface ErrorBoundaryState
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error | undefined;
  errorInfo?: React.ErrorInfo | undefined;
}

/**
 * React Error Boundary component for graceful error handling and UI degradation.
 *
 * Catches JavaScript errors anywhere in the child component tree, logs those errors,
 * and displays a fallback UI instead of the component tree that crashed.
 *
 * @class ErrorBoundary
 * @extends Component<ErrorBoundaryProps, ErrorBoundaryState>
 *
 * @example
 * ```tsx
 * <ErrorBoundary
 *   fallback={<div>Something went wrong with this component</div>}
 *   onError={(error, errorInfo) => console.error('Boundary caught:', error)}
 * >
 *   <SomeComponent />
 * </ErrorBoundary>
 * ```
 *
 * @since 1.0.0
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  /**
   * Static method called when an error is thrown in a child component.
   * Updates the state to trigger the error UI.
   *
   * @param error - Error that was thrown
   * @returns Updated state object
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Lifecycle method called after an error has been thrown by a descendant component.
   * Used to log error information and call the onError callback if provided.
   *
   * @param error - Error that was thrown
   * @param errorInfo - Additional information about the error
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error Info:', errorInfo);

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to external error reporting service if available
    if (
      typeof window !== 'undefined' &&
      'gtag' in window &&
      typeof (window as any).gtag === 'function'
    ) {
      (window as any).gtag('event', 'exception', {
        description: error.message,
        fatal: false,
        error_boundary: true,
      });
    }
  }

  /**
   * Resets the error boundary state to allow retry.
   */
  resetError = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Custom fallback UI provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Generate user-friendly error message
      const chainTraceError =
        this.state.error instanceof ChainTraceError
          ? this.state.error
          : new ChainTraceError(this.state.error.message, 'COMPONENT_ERROR', {
              statusCode: 500,
              retryable: true,
              cause: this.state.error,
            });

      const userMessage = createUserFriendlyMessage(chainTraceError);

      // Default error UI
      return (
        <div className='flex min-h-[200px] items-center justify-center rounded-lg border border-red-200 bg-red-50 p-6'>
          <div className='max-w-md text-center'>
            <div className='mb-4 text-red-600'>
              <svg
                className='mx-auto h-12 w-12'
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
            </div>

            <h2 className='mb-2 text-lg font-semibold text-red-800'>
              {userMessage.title}
            </h2>

            <p className='mb-4 text-red-700'>{userMessage.description}</p>

            <p className='mb-4 text-sm text-red-600'>
              {userMessage.resolution}
            </p>

            <div className='space-y-2'>
              {userMessage.retryable && (
                <button
                  onClick={this.resetError}
                  className='w-full rounded-md bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700'
                >
                  Try Again
                </button>
              )}

              <button
                onClick={() => window.location.reload()}
                className='w-full rounded-md bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700'
              >
                Refresh Page
              </button>
            </div>

            {this.props.showDetails && (
              <details className='mt-4 text-left'>
                <summary className='cursor-pointer text-sm text-red-600 hover:text-red-800'>
                  Technical Details
                </summary>
                <div className='mt-2 max-h-32 overflow-auto rounded bg-red-100 p-3 font-mono text-xs text-red-800'>
                  <div className='mb-1 font-semibold'>
                    Error: {this.state.error.message}
                  </div>
                  {this.state.error instanceof ChainTraceError && (
                    <div className='mb-1'>Code: {this.state.error.code}</div>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <div className='mb-1 mt-2 font-semibold'>
                        Component Stack:
                      </div>
                      <pre className='whitespace-pre-wrap'>
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook for handling async errors in React components.
 *
 * @returns Function to handle errors that will trigger error boundary
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const handleError = useErrorHandler();
 *
 *   const handleAsyncOperation = async () => {
 *     try {
 *       await someAsyncOperation();
 *     } catch (error) {
 *       handleError(error);
 *     }
 *   };
 *
 *   return <button onClick={handleAsyncOperation}>Do Something</button>;
 * }
 * ```
 *
 * @since 1.0.0
 */
export function useErrorHandler() {
  return (error: Error) => {
    // Throw error in next tick to trigger error boundary
    setTimeout(() => {
      throw error;
    }, 0);
  };
}

/**
 * Higher-order component that wraps a component with an ErrorBoundary.
 *
 * @param WrappedComponent - Component to wrap with error boundary
 * @param errorBoundaryProps - Props to pass to the ErrorBoundary
 * @returns Component wrapped with ErrorBoundary
 *
 * @example
 * ```tsx
 * const SafeComponent = withErrorBoundary(MyComponent, {
 *   fallback: <div>Error in MyComponent</div>
 * });
 * ```
 *
 * @since 1.0.0
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WithErrorBoundaryComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithErrorBoundaryComponent;
}
