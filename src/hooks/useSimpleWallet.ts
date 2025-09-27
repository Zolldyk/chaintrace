/**
 * Simple wallet hook with working implementation
 *
 * Provides wallet connection state and functions using the SimpleWalletService
 * with proper error handling and state management.
 *
 * @since 2.4.1
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getSimpleWalletService,
  type WalletConnectionResult,
  type WalletStatus,
  type WalletType,
} from '@/services/wallet/SimpleWalletService';

export interface UseSimpleWalletResult {
  /** Current wallet connection status */
  status: WalletStatus;

  /** Whether a wallet is currently connected */
  isConnected: boolean;

  /** Connected account ID */
  accountId: string | null;

  /** Connected account alias/display name */
  accountAlias: string | null;

  /** Connected wallet type */
  walletType: WalletType | null;

  /** Any connection error message */
  error: string | null;

  /** Whether connection is in progress */
  isConnecting: boolean;

  /** Available wallet types */
  availableWallets: WalletType[];

  /** Connect to a specific wallet type */
  connect: (walletType?: WalletType) => Promise<WalletConnectionResult>;

  /** Disconnect from current wallet */
  disconnect: () => Promise<void>;

  /** Sign a message with the connected wallet */
  signMessage: (message: string) => Promise<string>;

  /** Get current account information */
  getAccountInfo: () => Promise<{ accountId: string; balance?: string }>;

  /** Refresh available wallets */
  refreshAvailableWallets: () => Promise<void>;
}

/**
 * Wallet hook configuration
 */
export interface UseSimpleWalletConfig {
  /** Network type for wallet connections */
  networkType?: 'testnet' | 'mainnet';

  /** Preferred wallet type */
  preferredWallet?: WalletType;

  /** Connection timeout in milliseconds */
  timeout?: number;

  /** Auto-connect on mount */
  autoConnect?: boolean;
}

/**
 * React hook for simple wallet state management
 */
export function useSimpleWallet(
  config: UseSimpleWalletConfig = {}
): UseSimpleWalletResult {
  const {
    networkType = 'testnet',
    preferredWallet,
    timeout = 30000,
    autoConnect = false,
  } = config;

  // Wallet state
  const [status, setStatus] = useState<WalletStatus>('disconnected');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [accountAlias, setAccountAlias] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<WalletType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [availableWallets, setAvailableWallets] = useState<WalletType[]>([]);

  // Derived state
  const isConnected = status === 'connected' && accountId !== null;
  const isConnecting = status === 'connecting';

  // Initialize wallet service
  const walletService = getSimpleWalletService({
    networkType,
    preferredWallet,
    timeout,
  });

  /**
   * Refresh available wallets
   */
  const refreshAvailableWallets = useCallback(async () => {
    try {
      const available = await walletService.getAvailableWallets();
      setAvailableWallets(available);
    } catch (err) {
      console.warn('Failed to refresh available wallets:', err);
      // Provide fallback options
      setAvailableWallets(['snap', 'hashpack']);
    }
  }, [walletService]);

  /**
   * Connect to a wallet
   */
  const connect = useCallback(
    async (targetWalletType?: WalletType): Promise<WalletConnectionResult> => {
      try {
        setStatus('connecting');
        setError(null);

        let result: WalletConnectionResult;

        if (targetWalletType === 'snap') {
          result = await walletService.connectSnap();
        } else if (targetWalletType === 'hashpack') {
          result = await walletService.connectHashPack();
        } else {
          // Auto-connect to preferred or first available wallet
          result = await walletService.autoConnect();
        }

        if (result.success) {
          setStatus('connected');
          setAccountId(result.accountId || null);
          setAccountAlias(result.accountAlias || null);
          setWalletType(result.walletType || null);
          setError(null);
        } else {
          setStatus('error');
          setError(result.error || 'Connection failed');
          setAccountId(null);
          setAccountAlias(null);
          setWalletType(null);
        }

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown connection error';
        setStatus('error');
        setError(errorMessage);
        setAccountId(null);
        setAccountAlias(null);
        setWalletType(null);

        return {
          success: false,
          error: errorMessage,
          responseTime: 0,
        };
      }
    },
    [walletService]
  );

  /**
   * Disconnect from wallet
   */
  const disconnect = useCallback(async (): Promise<void> => {
    try {
      await walletService.disconnect();
      setStatus('disconnected');
      setAccountId(null);
      setAccountAlias(null);
      setWalletType(null);
      setError(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Disconnect failed';
      setError(errorMessage);
    }
  }, [walletService]);

  /**
   * Sign message with connected wallet
   */
  const signMessage = useCallback(
    async (message: string): Promise<string> => {
      if (!isConnected) {
        throw new Error('No wallet connected');
      }

      try {
        return await walletService.signMessage(message);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Signing failed';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [walletService, isConnected]
  );

  /**
   * Get account information
   */
  const getAccountInfo = useCallback(async () => {
    if (!isConnected) {
      throw new Error('No wallet connected');
    }

    try {
      return await walletService.getAccountInfo();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to get account info';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [walletService, isConnected]);

  // Initialize available wallets on mount
  useEffect(() => {
    refreshAvailableWallets();
  }, [refreshAvailableWallets]);

  // Auto-connect if enabled
  useEffect(() => {
    if (
      autoConnect &&
      !isConnected &&
      availableWallets.length > 0 &&
      status === 'disconnected'
    ) {
      connect();
    }
  }, [autoConnect, isConnected, availableWallets.length, status, connect]);

  // Sync with wallet service state
  useEffect(() => {
    const currentStatus = walletService.getStatus();
    const currentAccount = walletService.getAccount();
    const currentWalletType = walletService.getWalletType();

    if (currentStatus !== status) {
      setStatus(currentStatus);
    }

    if (currentAccount !== accountId) {
      setAccountId(currentAccount);
      if (currentAccount) {
        setAccountAlias(
          `${currentWalletType} Account ${currentAccount.substring(0, 6)}...`
        );
      } else {
        setAccountAlias(null);
      }
    }

    if (currentWalletType !== walletType) {
      setWalletType(currentWalletType);
    }
  }, [status, accountId, walletType, walletService]);

  // Add visibility change listener for HashPack connection detection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleVisibilityChange = async () => {
      // When user returns to tab, check for HashPack connections
      if (
        !document.hidden &&
        (status === 'connecting' || status === 'disconnected')
      ) {
        try {
          // Check for HashPack connection
          const { checkHashPackConnection } = await import(
            '@/services/wallet/HashPackIntegration'
          );
          const connection = await checkHashPackConnection();

          if (connection.success && connection.accountId) {
            // Update wallet service state
            const currentWalletService = walletService as any;
            currentWalletService.currentAccount = connection.accountId;
            currentWalletService.currentWalletType = 'hashpack';
            currentWalletService.status = 'connected';

            // Update local state
            setStatus('connected');
            setAccountId(connection.accountId);
            setAccountAlias(`HashPack Account ${connection.accountId}`);
            setWalletType('hashpack');
            setError(null);
          }
        } catch (err) {
          console.debug(
            'Error checking HashPack connection on visibility change:',
            err
          );
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [status, walletService]);

  // Periodic check for HashPack connections when connecting
  useEffect(() => {
    if (status !== 'connecting') return;

    const checkInterval = setInterval(async () => {
      try {
        const { checkHashPackConnection } = await import(
          '@/services/wallet/HashPackIntegration'
        );
        const connection = await checkHashPackConnection();

        if (connection.success && connection.accountId) {
          // Update wallet service state
          const currentWalletService = walletService as any;
          currentWalletService.currentAccount = connection.accountId;
          currentWalletService.currentWalletType = 'hashpack';
          currentWalletService.status = 'connected';

          // Update local state
          setStatus('connected');
          setAccountId(connection.accountId);
          setAccountAlias(`HashPack Account ${connection.accountId}`);
          setWalletType('hashpack');
          setError(null);
        }
      } catch (err) {
        console.debug('Error in periodic HashPack check:', err);
      }
    }, 2000); // Check every 2 seconds while connecting

    return () => clearInterval(checkInterval);
  }, [status, walletService]);

  return {
    status,
    isConnected,
    accountId,
    accountAlias,
    walletType,
    error,
    isConnecting,
    availableWallets,
    connect,
    disconnect,
    signMessage,
    getAccountInfo,
    refreshAvailableWallets,
  };
}
