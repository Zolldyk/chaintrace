'use client';

import { useCallback, useState } from 'react';
import {
  ChainTraceError,
  handleError,
  withRetry,
  createUserFriendlyMessage,
  type ErrorHandlerConfig,
} from '@/lib/errors';

/**
 * Error state interface for useErrorHandling hook.
 */
interface ErrorState {
  error: ChainTraceError | null;
  isRetryable: boolean;
  userMessage: {
    title: string;
    description: string;
    resolution: string;
    retryable: boolean;
  } | null;
}

/**
 * Configuration options for useErrorHandling hook.
 */
interface UseErrorHandlingOptions extends ErrorHandlerConfig {
  /** Whether to automatically clear errors after a timeout */
  autoClearErrors?: boolean;
  /** Timeout in milliseconds to auto-clear errors */
  autoClearTimeoutMs?: number;
  /** Whether to log errors to console */
  enableLogging?: boolean;
}

/**
 * Return type for useErrorHandling hook.
 */
interface UseErrorHandlingReturn {
  /** Current error state */
  error: ErrorState['error'];
  /** User-friendly error message */
  userMessage: ErrorState['userMessage'];
  /** Whether the current error is retryable */
  isRetryable: boolean;
  /** Whether there is an active error */
  hasError: boolean;
  /** Function to handle and set an error */
  handleError: (error: unknown, context?: Record<string, any>) => void;
  /** Function to clear the current error */
  clearError: () => void;
  /** Function to execute an operation with automatic retry and error handling */
  executeWithRetry: <T>(
    operation: () => Promise<T>,
    retryOptions?: ErrorHandlerConfig
  ) => Promise<T>;
  /** Function to execute an operation with error handling but no retry */
  executeWithErrorHandling: <T>(
    operation: () => Promise<T>
  ) => Promise<T | null>;
}

/**
 * Custom React hook for comprehensive error handling in components.
 *
 * Provides centralized error management, automatic retry logic, user-friendly
 * error messages, and consistent error state management.
 *
 * @param options - Configuration options for error handling behavior
 * @returns Object with error state and handling functions
 *
 * @example
 * ```tsx
 * function ProductVerification() {
 *   const {
 *     error,
 *     userMessage,
 *     handleError,
 *     clearError,
 *     executeWithRetry
 *   } = useErrorHandling({
 *     maxRetries: 3,
 *     autoClearErrors: true,
 *     autoClearTimeoutMs: 10000
 *   });
 *
 *   const verifyProduct = useCallback(async (productId: string) => {
 *     try {
 *       const result = await executeWithRetry(
 *         () => mirrorNodeService.getProduct(productId)
 *       );
 *       setProduct(result);
 *     } catch (err) {
 *       handleError(err, { operation: 'product_verification', productId });
 *     }
 *   }, [executeWithRetry, handleError]);
 *
 *   if (error) {
 *     return (
 *       <ErrorState
 *         error={error}
 *         onRetry={error.retryable ? () => { clearError(); verifyProduct(productId); } : undefined}
 *       />
 *     );
 *   }
 *
 *   return <div>Product verification content...</div>;
 * }
 * ```
 *
 * @since 1.0.0
 */
export function useErrorHandling(
  options: UseErrorHandlingOptions = {}
): UseErrorHandlingReturn {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isRetryable: false,
    userMessage: null,
  });

  const {
    autoClearErrors = false,
    autoClearTimeoutMs = 10000,
    enableLogging = true,
    ...retryOptions
  } = options;

  /**
   * Handles an error and updates the error state with user-friendly messaging.
   */
  const handleErrorCallback = useCallback(
    (error: unknown, context: Record<string, any> = {}) => {
      // Convert and handle the error
      const errorResponse = handleError(error, context);

      // Create ChainTraceError from response
      const chainTraceError = new ChainTraceError(
        errorResponse.error,
        errorResponse.code,
        {
          statusCode: errorResponse.statusCode,
          retryable: errorResponse.retryable,
          context: errorResponse.context,
        }
      );

      // Generate user-friendly message
      const userMessage = createUserFriendlyMessage(chainTraceError);

      // Update error state
      setErrorState({
        error: chainTraceError,
        isRetryable: chainTraceError.retryable,
        userMessage,
      });

      // Auto-clear error if enabled
      if (autoClearErrors) {
        setTimeout(() => {
          setErrorState({
            error: null,
            isRetryable: false,
            userMessage: null,
          });
        }, autoClearTimeoutMs);
      }

      // Log error if enabled
      if (enableLogging) {
        console.error('Error handled by useErrorHandling:', {
          message: chainTraceError.message,
          code: chainTraceError.code,
          context,
        });
      }
    },
    [autoClearErrors, autoClearTimeoutMs, enableLogging]
  );

  /**
   * Clears the current error state.
   */
  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isRetryable: false,
      userMessage: null,
    });
  }, []);

  /**
   * Executes an operation with automatic retry logic and error handling.
   */
  const executeWithRetry = useCallback(
    async <T>(
      operation: () => Promise<T>,
      specificRetryOptions: ErrorHandlerConfig = {}
    ): Promise<T> => {
      const finalOptions = { ...retryOptions, ...specificRetryOptions };

      try {
        clearError(); // Clear any existing errors
        return await withRetry(operation, finalOptions);
      } catch (error) {
        handleErrorCallback(error, { operation: 'executeWithRetry' });
        throw error; // Re-throw for caller to handle if needed
      }
    },
    [retryOptions, clearError, handleErrorCallback]
  );

  /**
   * Executes an operation with error handling but no automatic retry.
   * Returns null on error instead of throwing.
   */
  const executeWithErrorHandling = useCallback(
    async <T>(operation: () => Promise<T>): Promise<T | null> => {
      try {
        clearError(); // Clear any existing errors
        return await operation();
      } catch (error) {
        handleErrorCallback(error, { operation: 'executeWithErrorHandling' });
        return null;
      }
    },
    [clearError, handleErrorCallback]
  );

  return {
    error: errorState.error,
    userMessage: errorState.userMessage,
    isRetryable: errorState.isRetryable,
    hasError: errorState.error !== null,
    handleError: handleErrorCallback,
    clearError,
    executeWithRetry,
    executeWithErrorHandling,
  };
}

/**
 * Specialized hook for handling network-related operations with enhanced retry logic.
 *
 * @param options - Configuration options with network-specific defaults
 * @returns Error handling functions optimized for network operations
 *
 * @example
 * ```tsx
 * function MirrorNodeData() {
 *   const { executeWithRetry, error } = useNetworkErrorHandling({
 *     maxRetries: 5,
 *     baseDelayMs: 2000
 *   });
 *
 *   const fetchData = async () => {
 *     const data = await executeWithRetry(
 *       () => mirrorNodeService.getAccountInfo('0.0.12345')
 *     );
 *     return data;
 *   };
 *
 *   return <div>Network data component...</div>;
 * }
 * ```
 *
 * @since 1.0.0
 */
export function useNetworkErrorHandling(options: UseErrorHandlingOptions = {}) {
  return useErrorHandling({
    maxRetries: 5,
    baseDelayMs: 2000,
    maxDelayMs: 30000,
    enableLogging: true,
    ...options,
  });
}

/**
 * Specialized hook for handling wallet-related operations.
 *
 * @param options - Configuration options with wallet-specific defaults
 * @returns Error handling functions optimized for wallet operations
 *
 * @example
 * ```tsx
 * function WalletConnector() {
 *   const { executeWithErrorHandling, error, clearError } = useWalletErrorHandling();
 *
 *   const connectWallet = async () => {
 *     const result = await executeWithErrorHandling(
 *       () => walletService.connect()
 *     );
 *     if (result) {
 *       setWalletConnected(true);
 *     }
 *   };
 *
 *   return <div>Wallet connector component...</div>;
 * }
 * ```
 *
 * @since 1.0.0
 */
export function useWalletErrorHandling(options: UseErrorHandlingOptions = {}) {
  return useErrorHandling({
    maxRetries: 1, // Limited retries for wallet operations
    baseDelayMs: 1000,
    autoClearErrors: true,
    autoClearTimeoutMs: 15000, // Clear wallet errors after 15 seconds
    enableLogging: true,
    ...options,
  });
}

/**
 * Hook for handling form validation and submission errors.
 *
 * @param options - Configuration options with form-specific defaults
 * @returns Error handling functions optimized for form operations
 *
 * @example
 * ```tsx
 * function ProductForm() {
 *   const { error, handleError, clearError } = useFormErrorHandling();
 *
 *   const handleSubmit = async (formData: FormData) => {
 *     try {
 *       await apiService.createProduct(formData);
 *       router.push('/products');
 *     } catch (err) {
 *       handleError(err, { operation: 'form_submission', form: 'product_creation' });
 *     }
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       {error && <InlineErrorState message={error.message} onDismiss={clearError} />}
 *       {/\* form fields *\/}
 *     </form>
 *   );
 * }
 * ```
 *
 * @since 1.0.0
 */
export function useFormErrorHandling(options: UseErrorHandlingOptions = {}) {
  return useErrorHandling({
    maxRetries: 0, // No automatic retries for form errors
    autoClearErrors: false, // Keep errors visible until user action
    enableLogging: true,
    ...options,
  });
}
