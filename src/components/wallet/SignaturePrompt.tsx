/**
 * Signature Prompt Component
 *
 * React component for prompting users to sign messages or transactions
 * with their connected Hedera wallet.
 *
 * @example
 * ```tsx
 * <SignaturePrompt
 *   message="Sign this authentication challenge"
 *   onSign={(signature) => console.log('Signed:', signature)}
 *   onCancel={() => console.log('Cancelled')}
 * />
 * ```
 *
 * @since 1.0.0
 */

'use client';

import React, { useState } from 'react';
import { getWalletService } from '@/services/wallet/WalletService';

/**
 * Signature prompt component props
 */
export interface SignaturePromptProps {
  /** Message to be signed */
  message: string;

  /** Optional title for the prompt */
  title?: string;

  /** Optional description */
  description?: string;

  /** Callback when signature is completed */
  onSign?: (signature: string) => void;

  /** Callback when signing is cancelled */
  onCancel?: () => void;

  /** Callback when signing fails */
  onError?: (error: string) => void;

  /** Whether the prompt is visible */
  isVisible?: boolean;

  /** Whether signing is required (no cancel button) */
  required?: boolean;

  /** Custom CSS classes */
  className?: string;
}

/**
 * Signature prompt component for wallet signing operations
 */
export function SignaturePrompt({
  message,
  title = 'Sign Message',
  description = 'Please sign this message with your connected wallet to continue.',
  onSign,
  onCancel,
  onError,
  isVisible = true,
  required = false,
  className = '',
}: SignaturePromptProps) {
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get wallet service instance
  const walletService = React.useMemo(() => {
    try {
      return getWalletService();
    } catch (error) {
      return null;
    }
  }, []);

  /**
   * Handle message signing
   */
  const handleSign = async () => {
    if (!walletService) {
      const errorMessage = 'Wallet service not available';
      setError(errorMessage);
      onError?.(errorMessage);
      return;
    }

    if (!walletService.isConnected()) {
      const errorMessage =
        'No wallet connected. Please connect your wallet first.';
      setError(errorMessage);
      onError?.(errorMessage);
      return;
    }

    setIsSigning(true);
    setError(null);

    try {
      const signature = await walletService.signMessage(message);
      onSign?.(signature);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to sign message';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsSigning(false);
    }
  };

  /**
   * Handle cancellation
   */
  const handleCancel = () => {
    if (!required) {
      onCancel?.();
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`signature-prompt ${className}`}>
      {/* Backdrop */}
      <div className='fixed inset-0 z-50 h-full w-full overflow-y-auto bg-gray-600 bg-opacity-50'>
        <div className='relative top-20 mx-auto w-96 rounded-md border bg-white p-5 shadow-lg'>
          <div className='mt-3'>
            {/* Header */}
            <div className='mb-4 flex items-center justify-between'>
              <div className='flex items-center'>
                <div className='mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100'>
                  <svg
                    className='h-6 w-6 text-blue-600'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth='2'
                      d='M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z'
                    />
                  </svg>
                </div>
              </div>
              {!required && (
                <button
                  onClick={handleCancel}
                  className='text-gray-400 hover:text-gray-600'
                >
                  <svg
                    className='h-6 w-6'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth='2'
                      d='M6 18L18 6M6 6l12 12'
                    />
                  </svg>
                </button>
              )}
            </div>

            {/* Title and Description */}
            <div className='mb-4 text-center'>
              <h3 className='mb-2 text-lg font-medium text-gray-900'>
                {title}
              </h3>
              <p className='text-sm text-gray-600'>{description}</p>
            </div>

            {/* Message Display */}
            <div className='mb-4'>
              <label className='mb-2 block text-sm font-medium text-gray-700'>
                Message to Sign:
              </label>
              <div className='rounded-md border border-gray-200 bg-gray-50 p-3'>
                <pre className='whitespace-pre-wrap break-words font-mono text-xs text-gray-700'>
                  {message}
                </pre>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className='mb-4 rounded-md border border-red-200 bg-red-50 p-3'>
                <div className='flex'>
                  <div className='flex-shrink-0'>
                    <svg
                      className='h-5 w-5 text-red-400'
                      viewBox='0 0 20 20'
                      fill='currentColor'
                    >
                      <path
                        fillRule='evenodd'
                        d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
                        clipRule='evenodd'
                      />
                    </svg>
                  </div>
                  <div className='ml-3'>
                    <h3 className='text-sm font-medium text-red-800'>
                      Signing Error
                    </h3>
                    <div className='mt-1 text-sm text-red-700'>{error}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className='flex space-x-3'>
              <button
                onClick={handleSign}
                disabled={isSigning}
                className='inline-flex flex-1 items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
              >
                {isSigning ? (
                  <>
                    <svg
                      className='-ml-1 mr-2 h-4 w-4 animate-spin text-white'
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
                      ></circle>
                      <path
                        className='opacity-75'
                        fill='currentColor'
                        d='m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                      ></path>
                    </svg>
                    Signing...
                  </>
                ) : (
                  <>
                    <svg
                      className='-ml-1 mr-2 h-4 w-4'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth='2'
                        d='M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z'
                      />
                    </svg>
                    Sign Message
                  </>
                )}
              </button>

              {!required && (
                <button
                  onClick={handleCancel}
                  disabled={isSigning}
                  className='inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'
                >
                  Cancel
                </button>
              )}
            </div>

            {/* Help Text */}
            <div className='mt-4 text-center text-xs text-gray-500'>
              <p>
                This action will prompt your wallet to sign the message above.
                Make sure you trust the source before signing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
