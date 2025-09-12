/**
 * HashPack Wallet Connector for Hedera Integration
 *
 * Connector implementation for HashPack wallet integration with
 * HashConnect protocol support for mobile and desktop wallets.
 *
 * @class HashPackConnector
 *
 * @example
 * ```typescript
 * const config = { networkType: 'testnet' };
 * const hashPackConnector = new HashPackConnector(config);
 *
 * const result = await hashPackConnector.connect();
 * if (result.success) {
 *   // Connected to HashPack
 * }
 * ```
 *
 * @since 1.0.0
 */

import { HashConnect } from 'hashconnect';
import type {
  WalletConnector,
  WalletConnectionResult,
  WalletStatus,
  WalletConfig,
} from './WalletService';

/**
 * HashConnect connection data
 */
interface HashConnectData {
  accountIds: string[];
  network: string;
  topic: string;
}

/**
 * HashConnect transaction response
 * TODO: Update interface based on actual hashconnect API when implementing
 */
/* Temporarily commented out to avoid unused warning
interface _HashConnectTransactionResponse {
  success: boolean;
  response?: {
    transactionId: string;
  };
  error?: string;
}
*/

/**
 * HashPack connector implementation using HashConnect protocol
 */
export class HashPackConnector implements WalletConnector {
  private status: WalletStatus = 'disconnected';
  private config: WalletConfig;
  private hashConnect: HashConnect;
  private connectionData: HashConnectData | null = null;
  private appMetadata = {
    name: 'ChainTrace',
    description: 'Supply Chain Verification Platform',
    icons: ['/icon-192.png'],
    url: 'https://chaintrace.app',
  };

  /**
   * Creates a new HashPackConnector instance
   *
   * @param config - Wallet configuration
   */
  constructor(config: WalletConfig) {
    this.config = config;
    // TODO: Update HashConnect constructor parameters based on hashconnect v1.6+ API
    // Temporary placeholder parameters to satisfy constructor requirements
    this.hashConnect = new (HashConnect as any)(
      true, // debug
      'testnet', // network
      this.appMetadata // metadata (placeholder)
    );
    this.initializeHashConnect();
  }

  /**
   * Initialize HashConnect event listeners
   */
  private initializeHashConnect(): void {
    // Connection established
    this.hashConnect.pairingEvent.on((data: any) => {
      this.connectionData = { ...data, topic: data.topic || '' };
      this.status = 'connected';
    });

    // Connection lost
    this.hashConnect.disconnectionEvent.on(() => {
      this.connectionData = null;
      this.status = 'disconnected';
    });

    // TODO: Update to current HashConnect API version
    // Transaction events need API version compatibility check
    // this.hashConnect.transactionEvent.on((data: any) => {
    //   // HashConnect transaction data available
    // });
  }

  /**
   * Connect to HashPack wallet
   *
   * @returns Promise resolving to connection result
   * @throws {Error} When HashPack connection fails
   *
   * @example
   * ```typescript
   * const result = await hashPackConnector.connect();
   * if (result.success) {
   *   // Handle connection result
   * }
   * ```
   *
   * @since 1.0.0
   */
  async connect(): Promise<WalletConnectionResult> {
    const startTime = Date.now();

    try {
      this.status = 'connecting';

      // Check if HashConnect is available
      const available = await this.isAvailable();
      if (!available) {
        throw new Error('HashConnect is not available');
      }

      // TODO: Update HashConnect.init() API call for hashconnect v1.6+
      await (this.hashConnect as any).init(this.appMetadata);

      // TODO: Fix HashConnect API compatibility
      // const pairingString = this.hashConnect.generatePairingString(this.appMetadata);

      // Wait for connection with timeout
      const timeout = this.config.timeout || 30000; // 30 seconds default
      const connectionPromise = this.waitForConnection();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), timeout)
      );

      await Promise.race([connectionPromise, timeoutPromise]);

      if (!this.connectionData || this.connectionData.accountIds.length === 0) {
        throw new Error('No accounts found after connection');
      }

      const primaryAccount = this.connectionData.accountIds[0];

      return {
        success: true,
        walletType: 'hashpack',
        accountId: primaryAccount,
        accountAlias: `HashPack Account ${primaryAccount}`,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      this.status = 'error';
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to connect to HashPack';

      return {
        success: false,
        error: errorMessage,
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Disconnect from HashPack wallet
   *
   * @returns Promise that resolves when disconnection is complete
   *
   * @since 1.0.0
   */
  async disconnect(): Promise<void> {
    if (this.connectionData) {
      // TODO: Update HashConnect.disconnect() API call for hashconnect v1.6+
      (this.hashConnect as any).disconnect(this.connectionData.topic);
    }
    this.connectionData = null;
    this.status = 'disconnected';
  }

  /**
   * Check if HashConnect/HashPack is available
   *
   * @returns Promise resolving to availability status
   *
   * @example
   * ```typescript
   * const available = await hashPackConnector.isAvailable();
   * if (available) {
   *   // HashPack is available
   * }
   * ```
   *
   * @since 1.0.0
   */
  async isAvailable(): Promise<boolean> {
    try {
      // HashConnect library should be available if imported
      return typeof HashConnect !== 'undefined';
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
   * Sign a message with the connected HashPack account
   *
   * @param message - Message to sign
   * @returns Promise resolving to signature string
   * @throws {Error} When not connected or signing fails
   *
   * @example
   * ```typescript
   * const signature = await hashPackConnector.signMessage('Hello ChainTrace');
   * // Handle signature result
   * ```
   *
   * @since 1.0.0
   */
  async signMessage(message: string): Promise<string> {
    if (!this.connectionData || this.status !== 'connected') {
      throw new Error('HashPack wallet not connected');
    }

    try {
      const primaryAccount = this.connectionData.accountIds[0];

      const signingData = {
        topic: this.connectionData.topic,
        byteArray: new TextEncoder().encode(message),
        metadata: {
          accountToSign: primaryAccount,
          returnTransaction: false,
        },
      };

      // TODO: Update HashConnect.sign() API call for hashconnect v1.6+
      const response = await (this.hashConnect as any).sign(signingData);

      if (!response.success || !response.response) {
        throw new Error(response.error || 'Signing failed');
      }

      // HashConnect returns signature data - format as needed
      return response.response.signature || '';
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
   * const account = await hashPackConnector.getAccountInfo();
   * // Display account information
   * ```
   *
   * @since 1.0.0
   */
  async getAccountInfo(): Promise<{ accountId: string; balance?: string }> {
    if (!this.connectionData || this.status !== 'connected') {
      throw new Error('HashPack wallet not connected');
    }

    const primaryAccount = this.connectionData.accountIds[0];

    return {
      accountId: primaryAccount,
      balance: undefined, // Balance fetching would require Mirror Node query
    };
  }

  /**
   * Execute a Hedera transaction through HashPack
   *
   * @param transactionBytes - Serialized transaction bytes
   * @returns Promise resolving to transaction ID
   * @throws {Error} When transaction execution fails
   *
   * @example
   * ```typescript
   * const txId = await hashPackConnector.executeTransaction(transactionBytes);
   * // Handle transaction result
   * ```
   *
   * @since 1.0.0
   */
  async executeTransaction(transactionBytes: Uint8Array): Promise<string> {
    if (!this.connectionData || this.status !== 'connected') {
      throw new Error('HashPack wallet not connected');
    }

    try {
      const primaryAccount = this.connectionData.accountIds[0];

      const transactionData = {
        topic: this.connectionData.topic,
        byteArray: transactionBytes,
        metadata: {
          accountToSign: primaryAccount,
          returnTransaction: false,
        },
      };

      // TODO: Update HashConnect.sendTransaction() API call and response handling for hashconnect v1.6+
      const response = await (this.hashConnect as any).sendTransaction(
        transactionData
      );

      // TODO: Update response structure based on actual hashconnect API
      if (!(response as any).success || !(response as any).response) {
        throw new Error((response as any).error || 'Transaction failed');
      }

      return (response as any).response.transactionId;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Transaction failed';
      throw new Error(`Transaction execution failed: ${errorMessage}`);
    }
  }

  /**
   * Get HashConnect pairing string for QR code or manual pairing
   *
   * @returns Promise resolving to pairing string
   *
   * @example
   * ```typescript
   * const pairingString = await hashPackConnector.getPairingString();
   * // Display pairing string
   * ```
   *
   * @since 1.0.0
   */
  async getPairingString(): Promise<string> {
    try {
      // TODO: Update HashConnect.init() parameters and return type for hashconnect v1.6+
      const initData = await (this.hashConnect as any).init(
        this.appMetadata,
        this.config.networkType,
        false
      );
      return (initData as any).pairingString;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to get pairing string';
      throw new Error(`Pairing string generation failed: ${errorMessage}`);
    }
  }

  /**
   * Wait for HashConnect connection to be established
   */
  private waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkConnection = () => {
        if (this.status === 'connected' && this.connectionData) {
          resolve();
        } else if (this.status === 'error') {
          reject(new Error('Connection failed'));
        } else {
          setTimeout(checkConnection, 100);
        }
      };
      checkConnection();
    });
  }

  /**
   * Get available HashPack extensions or mobile apps
   *
   * @returns Promise resolving to available connection methods
   *
   * @since 1.0.0
   */
  async getAvailableExtensions(): Promise<string[]> {
    // This would check for HashPack browser extension or mobile app availability
    const extensions: string[] = [];

    // Check for HashPack browser extension
    if (typeof window !== 'undefined' && (window as any).hashpack) {
      extensions.push('browser-extension');
    }

    // HashConnect supports mobile pairing via QR code
    extensions.push('mobile-app');

    return extensions;
  }
}
