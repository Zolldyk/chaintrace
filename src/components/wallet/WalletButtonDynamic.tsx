/**
 * Dynamic wrapper for WalletButton to prevent crypto bundle issues
 *
 * This component dynamically imports WalletButton only on the client side
 * to avoid bundling crypto dependencies during static generation.
 *
 * @since 2.4.0
 */

'use client';

import React, { useState, useEffect } from 'react';
import type { WalletButtonProps } from './WalletButton';

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
 * Dynamically imported WalletButton component
 */
export function WalletButtonDynamic(props: WalletButtonProps) {
  const [WalletButton, setWalletButton] =
    useState<React.ComponentType<WalletButtonProps> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Only import WalletButton on the client side
    if (typeof window !== 'undefined') {
      import('./WalletButton')
        .then(module => {
          setWalletButton(() => module.WalletButton);
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Failed to load WalletButton:', error);
          setIsLoading(false);
        });
    }
  }, []);

  if (isLoading || !WalletButton) {
    return <WalletButtonFallback className={props.className} />;
  }

  return <WalletButton {...props} />;
}
