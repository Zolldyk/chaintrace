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
        throw new Error(
          'MetaMask is not installed or available. Please install MetaMask browser extension.'
        );
      }

      // Check if snap is already connected
      const installedSnaps = await this.getInstalledSnaps();
      const isSnapInstalled = installedSnaps && installedSnaps[this.snapId];

      if (!isSnapInstalled) {
        // Install the snap if not already installed
        await this.installSnap();
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
      const errorMessage = this.getDetailedErrorMessage(error);

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
        console.debug('MetaMask not detected: window.ethereum not available');
        return false;
      }

      // Check if MetaMask is installed
      const provider = window.ethereum as any;
      if (!provider.isMetaMask) {
        console.debug('MetaMask not detected: provider.isMetaMask is false');
        return false;
      }

      // Check if Snap API is available
      if (!provider.request) {
        console.debug(
          'MetaMask Snap API not available: provider.request not found'
        );
        return false;
      }

      // Try to call wallet_getSnaps to verify snap support
      try {
        await provider.request({ method: 'wallet_getSnaps' });
        return true;
      } catch (error) {
        console.debug('MetaMask Snap support not available:', error);
        return false;
      }
    } catch (error) {
      console.debug('Error checking MetaMask availability:', error);
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
   * Get installed snaps
   */
  private async getInstalledSnaps(): Promise<Record<string, any> | null> {
    try {
      const provider = window.ethereum as any;
      return await provider.request({
        method: 'wallet_getSnaps',
      });
    } catch (error) {
      console.error('Failed to get installed snaps:', error);
      return null;
    }
  }

  /**
   * Install the Hedera snap
   */
  private async installSnap(): Promise<void> {
    const provider = window.ethereum as any;

    await provider.request({
      method: 'wallet_requestSnaps',
      params: {
        [this.snapId]: {},
      },
    });
  }

  /**
   * Get detailed error message with context
   */
  private getDetailedErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      // Check for specific MetaMask error codes
      const metamaskError = error as any;
      if (metamaskError.code) {
        switch (metamaskError.code) {
          case 4001:
            return 'User rejected the connection request';
          case 4100:
            return 'The requested account and/or method has not been authorized by the user';
          case 4200:
            return 'The requested method is not supported by this Ethereum provider';
          case 4900:
            return 'The provider is disconnected from all chains';
          case 4901:
            return 'The provider is disconnected from the specified chain';
          case -32002:
            return 'A request is already pending. Please wait and try again.';
          case -32603:
            return 'Internal error occurred. Please try again.';
          default:
            return `MetaMask error (${metamaskError.code}): ${error.message}`;
        }
      }

      // Check for snap-specific errors
      if (error.message.includes('snap')) {
        if (error.message.includes('not found')) {
          return 'Hedera Wallet Snap not found. The snap may not be available or installed correctly.';
        }
        if (error.message.includes('rejected')) {
          return 'Snap installation was rejected by user';
        }
        if (error.message.includes('network')) {
          return 'Network connection error while connecting to snap';
        }
      }

      // Check for Hedera-specific errors
      if (error.message.includes('Mirror Node')) {
        return 'Hedera account not found or not properly set up. You may need to create a new Hedera account or ensure your account has sufficient HBAR balance.';
      }

      if (error.message.includes('account info')) {
        return 'Unable to retrieve Hedera account information. Please ensure your account is properly set up and has been activated with HBAR.';
      }

      return error.message;
    }

    return 'Failed to connect to MetaMask Snap';
  }

  /**
   * Private method to connect to the Hedera Snap
   */
  private async connectToSnap(): Promise<void> {
    const provider = window.ethereum as any;

    try {
      // In development mode, skip complex initialization that might fail
      // and just verify the snap is accessible
      const isDevelopment = process.env.NODE_ENV === 'development';

      if (isDevelopment) {
        console.debug(
          'Development mode: skipping snap initialization, will use fallback account'
        );
        // Just verify we can communicate with the snap
        try {
          await provider.request({
            method: 'wallet_invokeSnap',
            params: {
              snapId: this.snapId,
              request: {
                method: 'getCurrentAccount',
                params: {},
              },
            },
          });
        } catch (testError) {
          console.debug(
            'Snap communication test failed, will use mock account:',
            testError
          );
          // This is expected if no account exists, we'll handle it in getSnapAccountInfo
        }
        return;
      }

      // Production mode: verify snap is working with a simple hello call
      try {
        await provider.request({
          method: 'wallet_invokeSnap',
          params: {
            snapId: this.snapId,
            request: {
              method: 'hello',
              params: {},
            },
          },
        });
      } catch (initError: any) {
        console.debug('Snap initialization failed:', initError);

        console.debug('Snap hello call failed, but proceeding:', initError);
        // Even if hello fails, we can still try to get account info
        // This might happen if the snap is installed but not fully set up
      }
    } catch (error) {
      console.debug('Snap connection had issues, but continuing:', error);
      // Don't fail the entire connection for initialization issues
      // The real test is whether we can get account info
    }
  }

  /**
   * Private method to get account information from the snap
   */
  private async getSnapAccountInfo(): Promise<HederaSnapAccount> {
    const provider = window.ethereum as any;

    try {
      // First try the standard method
      let result = await provider.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId: this.snapId,
          request: {
            method: 'getCurrentAccount',
            params: {},
          },
        },
      });

      if (result && result.accountId) {
        return result;
      }

      console.debug(
        'Standard getAccount failed, trying alternative methods...'
      );

      // Try alternative method names that might be used by the snap
      const alternativeMethods = [
        'getAccountInfo',
        'getAccountBalance',
        'hello',
      ];

      for (const method of alternativeMethods) {
        try {
          result = await provider.request({
            method: 'wallet_invokeSnap',
            params: {
              snapId: this.snapId,
              request: {
                method,
                params: {},
              },
            },
          });

          if (result && result.accountId) {
            console.debug(`Success with method: ${method}`);
            return result;
          }
        } catch (methodError) {
          console.debug(`Method ${method} failed:`, methodError);
          continue;
        }
      }

      // If all methods fail, create a development fallback account
      console.debug(
        'All account methods failed, using development fallback...'
      );
      throw new Error('NO_ACCOUNT_FOUND');
    } catch (error: any) {
      console.debug('Account retrieval failed:', error);

      // Handle specific error cases
      if (error.code === -32001 || error.message === 'NO_ACCOUNT_FOUND') {
        // For development purposes, return a mock account when no real account exists
        const isDevelopment = process.env.NODE_ENV === 'development';

        if (isDevelopment) {
          console.warn(
            'No Hedera account found. Using development mock account for testing.'
          );

          return {
            accountId: '0.0.12345', // Mock development account
            publicKey: 'mock_public_key_for_development',
            balance: {
              hbars: '100',
              tokens: {},
            },
          };
        }

        // In production, provide clear error message
        throw new Error(
          'Hedera account not found. Please create a Hedera account first or ensure you have sufficient HBAR balance.'
        );
      }

      if (error instanceof Error && error.message.includes('method')) {
        throw new Error(
          'Hedera Wallet Snap method not supported. Please ensure you have the latest version of the snap installed.'
        );
      }

      throw new Error(
        `Failed to get account information: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
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
