/**
 * Dynamic wrapper for WalletButton with working implementation
 *
 * This component tries to load the working wallet implementation first,
 * then falls back to lightweight version only if everything fails.
 *
 * @since 2.4.0
 */

'use client';

import React, { useState, useEffect } from 'react';
import type { WalletButtonProps } from './WalletButton';
import { WalletButtonLightweight } from './WalletButtonLightweight';

/**
 * Fallback component while WalletButton is loading
 */
function WalletButtonFallback({ className = '' }: { className?: string }) {
  return (
    <button
      disabled
      className={`flex cursor-not-allowed items-center space-x-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 opacity-50 ${className}`}
    >
      <svg
        className='h-4 w-4 animate-pulse'
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
      <span>Loading...</span>
    </button>
  );
}

/**
 * Dynamically imported WalletButton component with working implementation
 */
export function WalletButtonDynamic(props: WalletButtonProps) {
  const [WorkingWalletButton, setWorkingWalletButton] =
    useState<React.ComponentType<WalletButtonProps> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    // Only import WalletButton on the client side
    if (typeof window !== 'undefined') {
      // Try to load the working wallet implementation first
      const loadTimeout = setTimeout(() => {
        console.warn(
          'Working wallet loading timeout, using lightweight fallback'
        );
        setLoadFailed(true);
        setIsLoading(false);
      }, 3000);

      // Try working implementation first
      import('./WorkingWalletButton')
        .then(module => {
          clearTimeout(loadTimeout);
          setWorkingWalletButton(() => module.WorkingWalletButton);
          setIsLoading(false);
        })
        .catch(workingError => {
          console.warn(
            'Failed to load WorkingWalletButton, trying original:',
            workingError
          );

          // Try original implementation
          import('./WalletButton')
            .then(module => {
              clearTimeout(loadTimeout);
              setWorkingWalletButton(() => module.WalletButton);
              setIsLoading(false);
            })
            .catch(error => {
              clearTimeout(loadTimeout);
              console.warn(
                'Failed to load any wallet implementation, using lightweight fallback:',
                error
              );
              setLoadFailed(true);
              setIsLoading(false);
            });
        });
    }
  }, []);

  // Use lightweight component if all loading failed
  if (loadFailed) {
    return <WalletButtonLightweight {...props} />;
  }

  // Show loading state
  if (isLoading || !WorkingWalletButton) {
    return <WalletButtonFallback className={props.className} />;
  }

  // Use working wallet component
  return <WorkingWalletButton {...props} />;
}
