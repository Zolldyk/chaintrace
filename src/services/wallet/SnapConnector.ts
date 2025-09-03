/**
 * MetaMask Snap Connector for Hedera Wallet Integration
 *
 * Connector implementation for MetaMask Snap wallet integration with
 * secure key delegation and transaction signing capabilities.
 *
 * @class SnapConnector
 *
 * @example
 * ```typescript
 * const config = { networkType: 'testnet' };
 * const snapConnector = new SnapConnector(config);
 *
 * const result = await snapConnector.connect();
 * if (result.success) {
 *   console.log('Connected to Hedera Snap');
 * }
 * ```
 *
 * @since 1.0.0
 */

import type {
  WalletConnector,
  WalletConnectionResult,
  WalletStatus,
  WalletConfig,
} from './WalletService';

/**
 * MetaMask Snap API interface
 * TODO: Update interface based on actual snap API when implementing
 */
/* Temporarily commented out to avoid unused warning
interface _SnapAPI {
  request(args: { method: string; params?: any }): Promise<any>;
}
*/

/**
 * Hedera Snap account information
 */
interface HederaSnapAccount {
  accountId: string;
  publicKey: string;
  balance?: {
    hbars: string;
    tokens: Record<string, string>;
  };
}

/**
 * Snap connection parameters
 */
interface SnapConnectParams {
  network: 'testnet' | 'mainnet';
  mirrorNodeUrl?: string;
}

/**
 * MetaMask Snap connector implementation
 */
export class SnapConnector implements WalletConnector {
  private status: WalletStatus = 'disconnected';
  private config: WalletConfig;
  private snapId = 'npm:@hashgraph/hedera-wallet-snap';
  private account: HederaSnapAccount | null = null;

  /**
   * Creates a new SnapConnector instance
   *
   * @param config - Wallet configuration
   */
  constructor(config: WalletConfig) {
    this.config = config;
  }

  /**
   * Connect to MetaMask Snap wallet
   *
   * @returns Promise resolving to connection result
   * @throws {Error} When MetaMask is not available or connection fails
   *
   * @example
   * ```typescript
   * const result = await snapConnector.connect();
   * if (result.success) {
   *   console.log(`Connected: ${result.accountId}`);
   * }
   * ```
   *
   * @since 1.0.0
   */
  async connect(): Promise<WalletConnectionResult> {
    const startTime = Date.now();

    try {
      this.status = 'connecting';

      // Check if MetaMask is available
      const available = await this.isAvailable();
      if (!available) {
        throw new Error('MetaMask is not installed or available');
      }

      // Connect to the Hedera Snap
      await this.connectToSnap();

      // Get account information
      const accountInfo = await this.getSnapAccountInfo();

      this.account = accountInfo;
      this.status = 'connected';

      return {
        success: true,
        walletType: 'snap',
        accountId: accountInfo.accountId,
        accountAlias: `Hedera Account ${accountInfo.accountId}`,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      this.status = 'error';
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to connect to MetaMask Snap';

      return {
        success: false,
        error: errorMessage,
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Disconnect from MetaMask Snap
   *
   * @returns Promise that resolves when disconnection is complete
   *
   * @since 1.0.0
   */
  async disconnect(): Promise<void> {
    this.account = null;
    this.status = 'disconnected';
    // Note: MetaMask Snap doesn't have explicit disconnect
  }

  /**
   * Check if MetaMask Snap is available
   *
   * @returns Promise resolving to availability status
   *
   * @example
   * ```typescript
   * const available = await snapConnector.isAvailable();
   * if (available) {
   *   console.log('MetaMask Snap is available');
   * }
   * ```
   *
   * @since 1.0.0
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Check if window.ethereum exists (MetaMask)
      if (typeof window === 'undefined' || !window.ethereum) {
        return false;
      }

      // Check if MetaMask is installed
      const provider = window.ethereum as any;
      if (!provider.isMetaMask) {
        return false;
      }

      // Check if Snap API is available
      if (!provider.request) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current connection status
   *
   * @returns Current wallet status
   *
   * @since 1.0.0
   */
  getStatus(): WalletStatus {
    return this.status;
  }

  /**
   * Sign a message with the connected Hedera account
   *
   * @param message - Message to sign
   * @returns Promise resolving to signature string
   * @throws {Error} When not connected or signing fails
   *
   * @example
   * ```typescript
   * const signature = await snapConnector.signMessage('Hello ChainTrace');
   * console.log('Signature:', signature);
   * ```
   *
   * @since 1.0.0
   */
  async signMessage(message: string): Promise<string> {
    if (!this.account || this.status !== 'connected') {
      throw new Error('Snap wallet not connected');
    }

    try {
      const provider = window.ethereum as any;

      const result = await provider.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId: this.snapId,
          request: {
            method: 'hedera_signMessage',
            params: {
              accountId: this.account.accountId,
              message: message,
            },
          },
        },
      });

      return result.signature;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to sign message';
      throw new Error(`Message signing failed: ${errorMessage}`);
    }
  }

  /**
   * Get connected account information
   *
   * @returns Promise resolving to account information
   * @throws {Error} When not connected
   *
   * @example
   * ```typescript
   * const account = await snapConnector.getAccountInfo();
   * console.log(`Account: ${account.accountId}`);
   * ```
   *
   * @since 1.0.0
   */
  async getAccountInfo(): Promise<{ accountId: string; balance?: string }> {
    if (!this.account || this.status !== 'connected') {
      throw new Error('Snap wallet not connected');
    }

    return {
      accountId: this.account.accountId,
      balance: this.account.balance?.hbars,
    };
  }

  /**
   * Execute a Hedera transaction through the Snap
   *
   * @param transactionBytes - Serialized transaction bytes
   * @returns Promise resolving to transaction ID
   * @throws {Error} When transaction execution fails
   *
   * @example
   * ```typescript
   * const txId = await snapConnector.executeTransaction(transactionBytes);
   * console.log('Transaction executed:', txId);
   * ```
   *
   * @since 1.0.0
   */
  async executeTransaction(transactionBytes: Uint8Array): Promise<string> {
    if (!this.account || this.status !== 'connected') {
      throw new Error('Snap wallet not connected');
    }

    try {
      const provider = window.ethereum as any;

      const result = await provider.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId: this.snapId,
          request: {
            method: 'hedera_executeTransaction',
            params: {
              accountId: this.account.accountId,
              transactionBytes: Array.from(transactionBytes),
            },
          },
        },
      });

      return result.transactionId;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Transaction failed';
      throw new Error(`Transaction execution failed: ${errorMessage}`);
    }
  }

  /**
   * Private method to connect to the Hedera Snap
   */
  private async connectToSnap(): Promise<void> {
    const provider = window.ethereum as any;

    // Request connection to the snap
    await provider.request({
      method: 'wallet_requestSnaps',
      params: {
        [this.snapId]: {},
      },
    });

    // Initialize the snap with network configuration
    await provider.request({
      method: 'wallet_invokeSnap',
      params: {
        snapId: this.snapId,
        request: {
          method: 'hedera_initialize',
          params: {
            network: this.config.networkType,
            mirrorNodeUrl: this.getMirrorNodeUrl(),
          } satisfies SnapConnectParams,
        },
      },
    });
  }

  /**
   * Private method to get account information from the snap
   */
  private async getSnapAccountInfo(): Promise<HederaSnapAccount> {
    const provider = window.ethereum as any;

    const result = await provider.request({
      method: 'wallet_invokeSnap',
      params: {
        snapId: this.snapId,
        request: {
          method: 'hedera_getAccount',
          params: {},
        },
      },
    });

    return result;
  }

  /**
   * Get Mirror Node URL for the current network
   */
  private getMirrorNodeUrl(): string {
    return this.config.networkType === 'testnet'
      ? 'https://testnet.mirrornode.hedera.com'
      : 'https://mainnet-public.mirrornode.hedera.com';
  }
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request?: (args: { method: string; params?: any }) => Promise<any>;
    };
  }
}
