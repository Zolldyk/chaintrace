/**
 * Wallet Connection Component
 *
 * React component for connecting to Hedera wallets including MetaMask Snap
 * and HashPack with user-friendly interface and error handling.
 *
 * @example
 * ```tsx
 * <WalletConnector
 *   onConnect={(result) => console.log(result)}
 *   networkType="testnet"
 * />
 * ```
 *
 * @since 1.0.0
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  getWalletService,
  type WalletConnectionResult,
  type WalletType,
} from '@/services/wallet/WalletService';

/**
 * Wallet connector component props
 */
export interface WalletConnectorProps {
  /** Callback when wallet connection succeeds */
  onConnect?: (result: WalletConnectionResult) => void;

  /** Callback when wallet connection fails */
  onError?: (error: string) => void;

  /** Hedera network type */
  networkType: 'testnet' | 'mainnet';

  /** Preferred wallet type */
  preferredWallet?: WalletType;

  /** Connection timeout in milliseconds */
  timeout?: number;

  /** Custom CSS classes */
  className?: string;
}

/**
 * Wallet connector component for Hedera wallets
 */
export function WalletConnector({
  onConnect,
  onError,
  networkType,
  preferredWallet,
  timeout = 30000,
  className = '',
}: WalletConnectorProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [availableWallets, setAvailableWallets] = useState<WalletType[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Initialize wallet service
  const walletService = getWalletService({
    networkType,
    preferredWallet,
    timeout,
  });

  /**
   * Check which wallets are available
   */
  const checkAvailableWallets = useCallback(async () => {
    try {
      const available = await walletService.getAvailableWallets();
      setAvailableWallets(available);
    } catch (error) {
      // Error handled silently
    }
  }, [walletService]);

  useEffect(() => {
    // Check available wallets on component mount
    checkAvailableWallets();
  }, [checkAvailableWallets]);

  /**
   * Handle wallet connection
   */
  const handleConnect = async (walletType: WalletType) => {
    setIsConnecting(true);
    setError(null);

    try {
      let result: WalletConnectionResult;

      if (walletType === 'snap') {
        result = await walletService.connectSnap();
      } else if (walletType === 'hashpack') {
        result = await walletService.connectHashPack();
      } else {
        throw new Error(`Unsupported wallet type: ${walletType}`);
      }

      if (result.success) {
        onConnect?.(result);
      } else {
        const errorMessage = result.error || 'Connection failed';
        setError(errorMessage);
        onError?.(errorMessage);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Connection failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  /**
   * Handle auto-connect (try preferred or first available wallet)
   */
  const handleAutoConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const result = await walletService.autoConnect();

      if (result.success) {
        onConnect?.(result);
      } else {
        const errorMessage = result.error || 'Auto-connection failed';
        setError(errorMessage);
        onError?.(errorMessage);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Auto-connection failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className={`wallet-connector ${className}`}>
      <div className='space-y-4'>
        <div className='text-center'>
          <h3 className='text-lg font-semibold text-gray-900'>
            Connect your Hedera wallet
          </h3>
          <p className='mt-1 text-sm text-gray-600'>
            Choose a wallet to connect to ChainTrace on {networkType}
          </p>
        </div>

        {error && (
          <div className='rounded-md border border-red-200 bg-red-50 p-3'>
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
                  Connection error
                </h3>
                <div className='mt-1 text-sm text-red-700'>{error}</div>
              </div>
            </div>
          </div>
        )}

        <div className='space-y-2'>
          {/* Auto-connect button */}
          <button
            onClick={handleAutoConnect}
            disabled={isConnecting || availableWallets.length === 0}
            className='flex w-full items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-3 font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
          >
            {isConnecting ? (
              <>
                <svg
                  className='-ml-1 mr-3 h-5 w-5 animate-spin text-white'
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
                Connecting...
              </>
            ) : (
              'Connect wallet'
            )}
          </button>

          {/* Individual wallet buttons */}
          <div className='relative'>
            <div className='absolute inset-0 flex items-center'>
              <div className='w-full border-t border-gray-300' />
            </div>
            <div className='relative flex justify-center text-sm'>
              <span className='bg-white px-2 text-gray-500'>
                or choose specific wallet
              </span>
            </div>
          </div>

          {availableWallets.includes('snap') && (
            <button
              onClick={() => handleConnect('snap')}
              disabled={isConnecting}
              className='flex w-full items-center rounded-md border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'
            >
              <img
                src='/icons/metamask.svg'
                alt='MetaMask'
                className='mr-3 h-6 w-6'
              />
              MetaMask snap
            </button>
          )}

          {availableWallets.includes('hashpack') && (
            <button
              onClick={() => handleConnect('hashpack')}
              disabled={isConnecting}
              className='flex w-full items-center rounded-md border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'
            >
              <img
                src='/icons/hashpack.svg'
                alt='HashPack'
                className='mr-3 h-6 w-6'
              />
              HashPack
            </button>
          )}
        </div>

        {availableWallets.length === 0 && !isConnecting && (
          <div className='py-4 text-center'>
            <p className='text-sm text-gray-500'>
              No compatible wallets found. Please install{' '}
              <a
                href='https://metamask.io/'
                target='_blank'
                rel='noopener noreferrer'
                className='text-blue-600 hover:text-blue-500'
              >
                MetaMask
              </a>{' '}
              or{' '}
              <a
                href='https://www.hashpack.app/'
                target='_blank'
                rel='noopener noreferrer'
                className='text-blue-600 hover:text-blue-500'
              >
                HashPack
              </a>
              .
            </p>
            <button
              onClick={checkAvailableWallets}
              className='mt-2 text-sm text-blue-600 hover:text-blue-500'
            >
              Check again
            </button>
          </div>
        )}

        <div className='text-center text-xs text-gray-500'>
          <p>
            By connecting your wallet, you agree to ChainTrace&apos;s{' '}
            <a href='/terms' className='text-blue-600 hover:text-blue-500'>
              Terms of Service
            </a>{' '}
            and{' '}
            <a href='/privacy' className='text-blue-600 hover:text-blue-500'>
              Privacy policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
