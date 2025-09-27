/**
 * Working wallet button component with simplified wallet integration
 *
 * Provides a fully functional wallet connection interface using the
 * SimpleWalletService for reliable operation without heavy dependencies.
 *
 * @since 2.4.1
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSimpleWallet } from '@/hooks/useSimpleWallet';

export interface WorkingWalletButtonProps {
  /** Custom CSS classes */
  className?: string;
}

/**
 * Working wallet button for header integration
 */
export function WorkingWalletButton({
  className = '',
}: WorkingWalletButtonProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showConnector, setShowConnector] = useState(false);
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
  } = useSimpleWallet({ networkType: 'testnet' });

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
    setShowConnector(false);
    setIsDropdownOpen(false);

    try {
      const result = await connect(walletType);
      if (!result.success) {
        console.warn('Wallet connection failed:', result.error);
      }
    } catch (error) {
      console.warn('Wallet connection error:', error);
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

  // Show connector modal
  if (showConnector) {
    return (
      <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
        <div className='mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl'>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='text-lg font-semibold text-gray-900'>
              Connect Wallet
            </h2>
            <button
              onClick={() => setShowConnector(false)}
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
                    Connection Error
                  </h3>
                  <div className='mt-1 text-sm text-red-700'>{error}</div>
                </div>
              </div>
            </div>
          )}

          <div className='space-y-3'>
            {availableWallets.includes('snap') && (
              <button
                onClick={() => handleConnect('snap')}
                disabled={isConnecting}
                className='flex w-full items-center rounded-md border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'
              >
                <div className='mr-3 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500'>
                  <span className='text-xs font-bold text-white'>M</span>
                </div>
                <div className='text-left'>
                  <div className='font-medium'>MetaMask</div>
                  <div className='text-sm text-gray-500'>
                    Connect using MetaMask browser extension
                  </div>
                </div>
              </button>
            )}

            {availableWallets.includes('hashpack') && (
              <button
                onClick={() => handleConnect('hashpack')}
                disabled={isConnecting}
                className='flex w-full items-center rounded-md border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'
              >
                <div className='mr-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600'>
                  <span className='text-xs font-bold text-white'>H</span>
                </div>
                <div className='text-left'>
                  <div className='font-medium'>HashPack</div>
                  <div className='text-sm text-gray-500'>
                    Connect using HashPack wallet
                  </div>
                </div>
              </button>
            )}

            {isConnecting && (
              <div className='py-4'>
                <div className='mb-3 flex items-center justify-center'>
                  <svg
                    className='mr-3 h-5 w-5 animate-spin text-blue-600'
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
                  <span className='text-sm text-gray-600'>
                    Connecting to wallet...
                  </span>
                </div>
                <div className='text-center'>
                  <p className='mb-2 text-xs text-gray-500'>
                    Please complete the connection in the opened HashPack tab
                  </p>
                  <p className='text-xs text-gray-400'>
                    This window will automatically update when connected
                  </p>
                </div>
              </div>
            )}

            {availableWallets.length === 0 && !isConnecting && (
              <div className='py-4 text-center'>
                <p className='text-sm text-gray-500'>
                  No compatible wallets detected. Please install{' '}
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

          <div className='mt-4 text-center text-xs text-gray-500'>
            <p>
              Secure wallet connection powered by Hedera blockchain technology
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Main Button */}
      <button
        onClick={isConnected ? toggleDropdown : () => setShowConnector(true)}
        disabled={isConnecting}
        className={`flex items-center space-x-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
          isConnected
            ? 'border border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
            : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
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
        <div className='absolute right-0 z-50 mt-2 w-80 rounded-md border border-gray-200 bg-white py-1 shadow-lg'>
          <div className='border-b border-gray-100 px-4 py-3'>
            <div className='text-sm font-medium text-gray-900'>
              {accountAlias || 'Connected Account'}
            </div>
            <div className='break-all font-mono text-sm text-gray-500'>
              {formatAccountId(accountId!)}
            </div>
            {/* Show full address on hover */}
            {accountId && accountId.length > 12 && (
              <div className='mt-1 text-xs text-gray-400' title={accountId}>
                Hover to see full address
              </div>
            )}
            {walletType && (
              <div className='mt-1 text-xs capitalize text-gray-400'>
                Connected via {walletType === 'snap' ? 'MetaMask' : 'HashPack'}
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
