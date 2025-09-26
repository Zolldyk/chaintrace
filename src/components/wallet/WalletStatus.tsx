/**
 * Wallet Status Component
 *
 * React component for displaying current wallet connection status
 * with account information and connection management.
 *
 * @example
 * ```tsx
 * <WalletStatus
 *   onDisconnect={() => console.log('Disconnected')}
 *   showBalance={true}
 * />
 * ```
 *
 * @since 1.0.0
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  getWalletService,
  type WalletStatus as Status,
} from '@/services/wallet/WalletService';

/**
 * Wallet status component props
 */
export interface WalletStatusProps {
  /** Callback when wallet is disconnected */
  onDisconnect?: () => void;

  /** Whether to show account balance */
  showBalance?: boolean;

  /** Whether to show disconnect button */
  showDisconnect?: boolean;

  /** Custom CSS classes */
  className?: string;
}

/**
 * Account information interface
 */
interface AccountInfo {
  accountId: string;
  balance?: string;
}

/**
 * Wallet status display component
 */
export function WalletStatus({
  onDisconnect,
  showBalance = false,
  showDisconnect = true,
  className = '',
}: WalletStatusProps) {
  const [status, setStatus] = useState<Status>('disconnected');
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get wallet service instance (will throw if not initialized)
  const walletService = React.useMemo(() => {
    try {
      return getWalletService();
    } catch (error) {
      return null;
    }
  }, []);

  /**
   * Update wallet status and account information
   */
  const updateStatus = React.useCallback(async () => {
    if (!walletService) return;

    try {
      const currentStatus = walletService.getStatus();
      setStatus(currentStatus);

      if (currentStatus === 'connected' && walletService.isConnected()) {
        if (showBalance || !accountInfo) {
          setIsLoading(true);
          const info = await walletService.getAccountInfo();
          setAccountInfo(info);
        }
      } else {
        setAccountInfo(null);
      }

      setError(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to get wallet status';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [walletService, showBalance, accountInfo]);

  useEffect(() => {
    if (walletService) {
      updateStatus();

      // Poll status every 5 seconds
      const interval = setInterval(updateStatus, 5000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [walletService, updateStatus]);

  /**
   * Handle wallet disconnection
   */
  const handleDisconnect = async () => {
    if (!walletService) return;

    try {
      setIsLoading(true);
      await walletService.disconnect();
      setAccountInfo(null);
      setStatus('disconnected');
      onDisconnect?.();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to disconnect';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get status display information
   */
  const getStatusInfo = () => {
    switch (status) {
      case 'connected':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-50 border-green-200',
          icon: (
            <svg
              className='h-5 w-5 text-green-400'
              fill='currentColor'
              viewBox='0 0 20 20'
            >
              <path
                fillRule='evenodd'
                d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                clipRule='evenodd'
              />
            </svg>
          ),
          text: 'Connected',
        };
      case 'connecting':
        return {
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50 border-yellow-200',
          icon: (
            <svg
              className='h-5 w-5 animate-spin text-yellow-400'
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
          ),
          text: 'Connecting...',
        };
      case 'error':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-50 border-red-200',
          icon: (
            <svg
              className='h-5 w-5 text-red-400'
              fill='currentColor'
              viewBox='0 0 20 20'
            >
              <path
                fillRule='evenodd'
                d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
                clipRule='evenodd'
              />
            </svg>
          ),
          text: 'Connection error',
        };
      case 'disconnected':
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-50 border-gray-200',
          icon: (
            <svg
              className='h-5 w-5 text-gray-400'
              fill='currentColor'
              viewBox='0 0 20 20'
            >
              <path
                fillRule='evenodd'
                d='M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z'
                clipRule='evenodd'
              />
            </svg>
          ),
          text: 'Not connected',
        };
    }
  };

  const statusInfo = getStatusInfo();

  if (!walletService) {
    return null;
  }

  return (
    <div className={`wallet-status ${className}`}>
      <div className={`rounded-md border p-4 ${statusInfo.bgColor}`}>
        <div className='flex items-center justify-between'>
          <div className='flex items-center'>
            <div className='flex-shrink-0'>{statusInfo.icon}</div>
            <div className='ml-3'>
              <h3 className={`text-sm font-medium ${statusInfo.color}`}>
                Wallet Status
              </h3>
              <div className={`text-sm ${statusInfo.color} mt-1`}>
                {statusInfo.text}
              </div>
            </div>
          </div>

          {showDisconnect && status === 'connected' && (
            <button
              onClick={handleDisconnect}
              disabled={isLoading}
              className='text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50'
            >
              Disconnect
            </button>
          )}
        </div>

        {accountInfo && (
          <div className='mt-3 border-t border-gray-200 pt-3'>
            <div className='text-sm text-gray-700'>
              <div className='flex items-center justify-between'>
                <span className='font-medium'>Account:</span>
                <span className='rounded bg-gray-100 px-2 py-1 font-mono text-xs'>
                  {accountInfo.accountId}
                </span>
              </div>

              {showBalance && accountInfo.balance && (
                <div className='mt-2 flex items-center justify-between'>
                  <span className='font-medium'>Balance:</span>
                  <span className='font-mono text-xs'>
                    {accountInfo.balance}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className='mt-3 border-t border-red-200 pt-3'>
            <div className='text-sm text-red-700'>
              <span className='font-medium'>Error:</span> {error}
            </div>
          </div>
        )}

        {isLoading && (
          <div className='mt-3 border-t border-gray-200 pt-3'>
            <div className='flex items-center text-sm text-gray-600'>
              <svg
                className='mr-2 h-4 w-4 animate-spin'
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
              Loading...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
