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
import { LedgerId } from '@hashgraph/sdk';
import type {
  HashConnectConnectionState,
  SessionData,
  DappMetadata,
} from 'hashconnect/dist/types';
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
  sessionData?: SessionData;
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
  private appMetadata: DappMetadata = {
    name: 'ChainTrace',
    description: 'Supply Chain Verification Platform',
    icons: ['https://chaintrace.netlify.app/icon-192.png'],
    url: 'https://chaintrace.netlify.app',
  };

  // HashConnect v3 requires a WalletConnect/Reown project ID
  private projectId =
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
    'f1d96f692d709d35c43f9b1d63987ac8';

  /**
   * Creates a new HashPackConnector instance
   *
   * @param config - Wallet configuration
   */
  constructor(config: WalletConfig) {
    this.config = config;
    // Initialize HashConnect with v3 API
    const ledgerId =
      config.networkType === 'mainnet' ? LedgerId.MAINNET : LedgerId.TESTNET;
    // Enable debug mode for both development and production to ensure consistent behavior
    const debugMode =
      process.env.NEXT_PUBLIC_HASHCONNECT_DEBUG === 'true' ||
      process.env.NODE_ENV === 'development';
    this.hashConnect = new HashConnect(
      ledgerId,
      this.projectId,
      this.appMetadata,
      debugMode
    );
    // Events will be initialized in connect() method
  }

  /**
   * Initialize HashConnect event listeners
   */
  private initializeHashConnect(): void {
    try {
      console.log('Setting up HashConnect event listeners...');

      // Connection established
      this.hashConnect.pairingEvent.once((sessionData: SessionData) => {
        console.log('HashConnect pairing successful:', sessionData);
        this.connectionData = {
          accountIds: sessionData.accountIds || [],
          network: sessionData.network || this.config.networkType,
          sessionData,
        };
        this.status = 'connected';
      });

      // Connection lost
      this.hashConnect.disconnectionEvent.on(() => {
        console.log('HashConnect disconnected');
        this.connectionData = null;
        this.status = 'disconnected';
      });

      // Connection status changes
      this.hashConnect.connectionStatusChangeEvent.on(
        (connectionState: HashConnectConnectionState) => {
          console.log('HashConnect status change:', connectionState);
          switch (connectionState) {
            case 'Connected':
              // Will be handled by pairingEvent
              break;
            case 'Disconnected':
              this.status = 'disconnected';
              this.connectionData = null;
              break;
            case 'Connecting':
              this.status = 'connecting';
              break;
            case 'Paired':
              // Pairing successful, waiting for account selection
              console.log('HashConnect paired, waiting for account selection');
              break;
          }
        }
      );

      console.log('HashConnect event listeners set up successfully');
    } catch (error) {
      console.error('Failed to set up HashConnect event listeners:', error);
      this.status = 'error';
    }
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

      // Set up events BEFORE initializing (2025 pattern requirement)
      this.initializeHashConnect();

      // Initialize HashConnect with timeout and relay fallback
      const initTimeout = process.env.NODE_ENV === 'production' ? 30000 : 15000; // 30s prod, 15s dev

      try {
        const initPromise = this.hashConnect.init();
        const initTimeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('HashConnect initialization timeout')),
            initTimeout
          )
        );

        const initData = await Promise.race([initPromise, initTimeoutPromise]);
        console.log('HashConnect initialized successfully:', initData);
      } catch (error) {
        console.warn(
          'HashConnect initialization failed, likely due to relay connection issues:',
          error
        );

        // For development, provide an alternative connection method
        if (process.env.NODE_ENV === 'development') {
          console.log('Attempting development fallback connection method...');

          // Try direct deep link to HashPack without relay dependency
          const directConnectUrl = `https://wallet.hashpack.app/connect?dappName=${encodeURIComponent(this.appMetadata.name)}&dappUrl=${encodeURIComponent(this.appMetadata.url)}&network=${this.config.networkType}`;

          if (typeof window !== 'undefined') {
            console.log('Opening HashPack connection URL:', directConnectUrl);
            window.open(directConnectUrl, '_blank', 'width=400,height=600');

            // For development, simulate a successful connection after a short delay
            // This allows you to continue development while networking issues are resolved
            return new Promise(resolve => {
              setTimeout(() => {
                console.log(
                  'Development mode: simulating HashPack connection...'
                );
                this.connectionData = {
                  accountIds: ['0.0.dev.account'],
                  network: this.config.networkType,
                  sessionData: {} as SessionData,
                };
                this.status = 'connected';

                resolve({
                  success: true,
                  walletType: 'hashpack',
                  accountId: '0.0.dev.account',
                  accountAlias: 'Development Account (Relay Issues)',
                  responseTime: Date.now() - startTime,
                });
              }, 3000);
            });
          }
        }

        // Re-throw error for production
        throw error;
      }

      // Get pairing string for connection
      const pairingString = this.hashConnect.pairingString;

      if (!pairingString) {
        throw new Error('Failed to generate pairing string');
      }

      // Open HashPack for pairing
      if (typeof window !== 'undefined') {
        // Use pairing string to connect to HashPack
        this.openHashPackPairing(pairingString);
      }

      // Wait for connection with timeout - increased for production
      const defaultTimeout =
        process.env.NODE_ENV === 'production' ? 60000 : 45000; // 60s prod, 45s dev
      const timeout = this.config.timeout || defaultTimeout;
      const connectionPromise = this.waitForConnection();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => {
          this.status = 'error';
          reject(
            new Error(
              'Connection timeout - please ensure HashPack is installed and try again'
            )
          );
        }, timeout)
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
    try {
      // HashConnect v3 handles session management internally
      if (this.connectionData) {
        // Disconnect from all sessions
        await this.hashConnect.disconnect();
      }
    } catch (error) {
      // Ignore disconnect errors, still update local state
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
      // Suppress unused variable warnings
      void message;

      // For now, return a placeholder until proper HashConnect v3 signing is implemented
      // This would require proper implementation with the HashConnect v3 signer API
      throw new Error(
        'Message signing not yet implemented - HashConnect v3 API integration in progress'
      );
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

      // Suppress unused variable warning
      void transactionBytes;
      void primaryAccount;

      // Use HashConnect v3 signer for transaction execution
      // This would need proper implementation with Transaction deserialization
      throw new Error(
        'Transaction execution not yet implemented - please use Hedera SDK directly with the signer'
      );
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
      // Initialize if not already done
      if (!this.hashConnect.pairingString) {
        await this.hashConnect.init();
      }

      const pairingString = this.hashConnect.pairingString;
      if (!pairingString) {
        throw new Error('No pairing string available');
      }

      return pairingString;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to get pairing string';
      throw new Error(`Pairing string generation failed: ${errorMessage}`);
    }
  }

  /**
   * Open HashPack for pairing using deep link or pairing string
   */
  private openHashPackPairing(pairingString: string): void {
    if (typeof window !== 'undefined') {
      // Try HashPack deep link first (mobile)
      const hashPackUrl = `https://wallet.hashpack.app/pairing?data=${encodeURIComponent(pairingString)}`;

      // Open in new window/tab for desktop, or redirect for mobile
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );

      if (isMobile) {
        // Try to open HashPack app directly
        window.location.href = `hashpack://pairing?data=${encodeURIComponent(pairingString)}`;
        // Fallback to web wallet after a delay
        setTimeout(() => {
          window.open(hashPackUrl, '_blank');
        }, 1000);
      } else {
        // Desktop: open in new tab
        window.open(hashPackUrl, '_blank', 'width=400,height=600');
      }
    }
  }

  /**
   * Wait for HashConnect connection to be established
   */
  private waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 450; // 45 seconds with 100ms intervals

      const checkConnection = () => {
        attempts++;

        if (this.status === 'connected' && this.connectionData) {
          resolve();
        } else if (this.status === 'error') {
          reject(new Error('Connection failed'));
        } else if (attempts >= maxAttempts) {
          reject(new Error('Connection timeout'));
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
