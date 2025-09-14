/**
 * Wallet state management hook for ChainTrace application
 *
 * Provides wallet connection state, connection functions, and user
 * account information with React state management integration.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { connect, disconnect, isConnected, accountId } = useWallet();
 *
 *   return (
 *     <div>
 *       {isConnected ? (
 *         <span>Connected: {accountId}</span>
 *       ) : (
 *         <button onClick={connect}>Connect Wallet</button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 *
 * @since 1.0.0
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getWalletService,
  type WalletConnectionResult,
  type WalletStatus,
  type WalletType,
} from '@/services/wallet/WalletService';

export interface UseWalletResult {
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
export interface UseWalletConfig {
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
 * React hook for wallet state management
 */
export function useWallet(config: UseWalletConfig = {}): UseWalletResult {
  const {
    networkType = 'testnet',
    preferredWallet,
    timeout = 45000,
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
  const walletService = getWalletService({
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
      // Silently handle error - this is not critical
      setAvailableWallets([]);
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
        }

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown connection error';
        setStatus('error');
        setError(errorMessage);

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
    if (autoConnect && !isConnected && availableWallets.length > 0) {
      connect();
    }
  }, [autoConnect, isConnected, availableWallets.length, connect]);

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
