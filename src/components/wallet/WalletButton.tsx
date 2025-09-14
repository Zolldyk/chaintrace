/**
 * Wallet connection button component for Header integration
 *
 * Provides a compact wallet connection interface that fits in the header
 * with dropdown for wallet options and connection status display.
 *
 * @example
 * ```tsx
 * <WalletButton />
 * ```
 *
 * @since 1.0.0
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';

export interface WalletButtonProps {
  /** Custom CSS classes */
  className?: string;
}

/**
 * Compact wallet button for header integration
 */
export function WalletButton({ className = '' }: WalletButtonProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showFullConnector, setShowFullConnector] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    isConnected,
    isConnecting,
    accountId,
    accountAlias,
    walletType,
    error,
    availableWallets,
    connect,
    disconnect,
  } = useWallet({ networkType: 'testnet' });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Handle wallet connection
   */
  const handleConnect = async (walletType?: 'snap' | 'hashpack') => {
    setIsDropdownOpen(false);
    try {
      const result = await connect(walletType);
      if (!result.success) {
        // Connection failed, show error in UI
        console.error('Wallet connection failed:', result.error);
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
    }
  };

  /**
   * Handle wallet disconnection
   */
  const handleDisconnect = async () => {
    setIsDropdownOpen(false);
    await disconnect();
  };

  /**
   * Toggle dropdown visibility
   */
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  /**
   * Format account ID for display
   */
  const formatAccountId = (accountId: string) => {
    if (accountId.length > 12) {
      return `${accountId.substring(0, 8)}...${accountId.substring(accountId.length - 4)}`;
    }
    return accountId;
  };

  // Show full connector modal
  if (showFullConnector) {
    return (
      <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
        <div className='mx-4 w-full max-w-md rounded-lg bg-white p-6'>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='text-lg font-semibold'>Connect Wallet</h2>
            <button
              onClick={() => setShowFullConnector(false)}
              className='text-gray-400 hover:text-gray-600'
            >
              <svg
                className='h-6 w-6'
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
          </div>

          <div className='space-y-3'>
            {availableWallets.includes('snap') && (
              <button
                onClick={() => {
                  handleConnect('snap');
                  setShowFullConnector(false);
                }}
                disabled={isConnecting}
                className='flex w-full items-center rounded-md border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'
              >
                <svg
                  className='mr-3 h-6 w-6'
                  viewBox='0 0 24 24'
                  fill='currentColor'
                >
                  <path d='M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16l-5.568 9.639L6.432 8.16h11.136z' />
                </svg>
                MetaMask Snap
              </button>
            )}

            {availableWallets.includes('hashpack') && (
              <button
                onClick={() => {
                  handleConnect('hashpack');
                  setShowFullConnector(false);
                }}
                disabled={isConnecting}
                className='flex w-full items-center rounded-md border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'
              >
                <div className='mr-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600'>
                  <span className='text-xs font-bold text-white'>H</span>
                </div>
                HashPack
              </button>
            )}

            {availableWallets.length === 0 && (
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
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Main Button */}
      <button
        onClick={
          isConnected ? toggleDropdown : () => setShowFullConnector(true)
        }
        disabled={isConnecting}
        className={`flex items-center space-x-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
          isConnected
            ? 'border border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {isConnecting ? (
          <>
            <svg
              className='h-4 w-4 animate-spin'
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
              />
              <path
                className='opacity-75'
                fill='currentColor'
                d='m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
              />
            </svg>
            <span>Connecting...</span>
          </>
        ) : isConnected ? (
          <>
            <div className='h-2 w-2 rounded-full bg-green-500' />
            <span>{formatAccountId(accountId!)}</span>
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
                d='M19 9l-7 7-7-7'
              />
            </svg>
          </>
        ) : (
          <>
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
                d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
              />
            </svg>
            <span>Connect Wallet</span>
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && isConnected && (
        <div className='absolute right-0 z-50 mt-2 w-64 rounded-md border border-gray-200 bg-white py-1 shadow-lg'>
          <div className='border-b border-gray-100 px-4 py-3'>
            <div className='text-sm font-medium text-gray-900'>
              {accountAlias || 'Connected Account'}
            </div>
            <div className='font-mono text-sm text-gray-500'>{accountId}</div>
            {walletType && (
              <div className='mt-1 text-xs capitalize text-gray-400'>
                {walletType === 'snap' ? 'MetaMask Snap' : 'HashPack'}
              </div>
            )}
          </div>

          {error && (
            <div className='border-b border-gray-100 px-4 py-2'>
              <div className='text-sm text-red-600'>{error}</div>
            </div>
          )}

          <button
            onClick={handleDisconnect}
            className='block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50'
          >
            Disconnect Wallet
          </button>
        </div>
      )}
    </div>
  );
}
