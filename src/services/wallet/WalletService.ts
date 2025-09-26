/**
 * Main Wallet Service for managing Hedera wallet integrations
 *
 * Service for managing wallet connections including MetaMask Snap and HashPack
 * with secure key delegation and authentication flow implementation.
 *
 * @class WalletService
 *
 * @example
 * ```typescript
 * const walletService = new WalletService();
 *
 * // Connect to MetaMask Snap
 * const snapResult = await walletService.connectSnap();
 * if (snapResult.success) {
 *   // Handle successful connection
 * }
 * ```
 *
 * @since 1.0.0
 */

// AccountId import removed as it's not used in this file
import { SnapConnector } from './SnapConnector';
import { HashPackConnector } from './HashPackConnector';
import { logger } from '@/lib/logger';

/**
 * Supported wallet types for connection
 */
export type WalletType = 'snap' | 'hashpack';

/**
 * Wallet connection status
 */
export type WalletStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

/**
 * Wallet connection result interface
 */
export interface WalletConnectionResult {
  /** Whether connection was successful */
  success: boolean;

  /** Connected wallet type */
  walletType?: WalletType;

  /** Connected account ID */
  accountId?: string;

  /** User-friendly account alias */
  accountAlias?: string;

  /** Any error message if connection failed */
  error?: string;

  /** Connection response time in milliseconds */
  responseTime: number;
}

/**
 * Wallet authentication challenge result
 */
export interface AuthChallenge {
  /** Unique challenge identifier */
  challengeId: string;

  /** Challenge message to be signed */
  message: string;

  /** Challenge expiration timestamp */
  expiresAt: Date;
}

/**
 * Wallet signature verification result
 */
export interface SignatureResult {
  /** Whether signature is valid */
  valid: boolean;

  /** Signer account ID */
  accountId?: string;

  /** Any error message if verification failed */
  error?: string;
}

/**
 * Wallet configuration options
 */
export interface WalletConfig {
  /** Wallet type preference */
  preferredWallet?: WalletType;

  /** Network type for wallet connection */
  networkType: 'testnet' | 'mainnet';

  /** Connection timeout in milliseconds */
  timeout?: number;

  /** Whether to auto-reconnect on connection loss */
  autoReconnect?: boolean;
}

/**
 * Wallet service interface for different wallet implementations
 */
export interface WalletConnector {
  /** Connect to the wallet */
  connect(): Promise<WalletConnectionResult>;

  /** Disconnect from the wallet */
  disconnect(): Promise<void>;

  /** Check if wallet is available */
  isAvailable(): Promise<boolean>;

  /** Get current connection status */
  getStatus(): WalletStatus;

  /** Sign a message with the wallet */
  signMessage(message: string): Promise<string>;

  /** Get connected account information */
  getAccountInfo(): Promise<{ accountId: string; balance?: string }>;
}

/**
 * Main wallet service class
 */
export class WalletService {
  private currentWallet: WalletConnector | null = null;
  private status: WalletStatus = 'disconnected';
  private config: WalletConfig;
  private connectors: Map<WalletType, WalletConnector> = new Map();

  /**
   * Creates a new WalletService instance with the specified configuration.
   *
   * @param config - Wallet service configuration
   */
  constructor(config: WalletConfig) {
    this.config = config;
    this.initializeConnectors();
  }

  /**
   * Initialize wallet connectors (Snap and HashPack)
   */
  private initializeConnectors(): void {
    try {
      // Initialize SnapConnector and HashPackConnector
      const snapConnector = new SnapConnector(this.config);
      const hashPackConnector = new HashPackConnector(this.config);

      this.connectors.set('snap', snapConnector);
      this.connectors.set('hashpack', hashPackConnector);
    } catch (error) {
      logger.error(
        'Failed to initialize wallet connectors',
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'WalletService',
        }
      );
    }
  }

  /**
   * Connect to MetaMask Snap wallet
   *
   * @returns Promise resolving to connection result
   * @throws {Error} When Snap is not available or connection fails
   *
   * @example
   * ```typescript
   * const result = await walletService.connectSnap();
   * if (result.success) {
   *   // Handle successful connection
   * } else {
   *   // Handle connection error
   * }
   * ```
   *
   * @since 1.0.0
   */
  async connectSnap(): Promise<WalletConnectionResult> {
    const startTime = Date.now();

    try {
      this.status = 'connecting';

      const snapConnector = this.connectors.get('snap');
      if (!snapConnector) {
        throw new Error('MetaMask Snap connector not available');
      }

      const available = await snapConnector.isAvailable();
      if (!available) {
        throw new Error(
          'MetaMask Snap is not available. Please install MetaMask.'
        );
      }

      const result = await snapConnector.connect();

      if (result.success) {
        this.currentWallet = snapConnector;
        this.status = 'connected';
      } else {
        this.status = 'error';
      }

      return {
        ...result,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      this.status = 'error';
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      return {
        success: false,
        error: errorMessage,
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Connect to HashPack wallet
   *
   * @returns Promise resolving to connection result
   * @throws {Error} When HashPack is not available or connection fails
   *
   * @example
   * ```typescript
   * const result = await walletService.connectHashPack();
   * if (result.success) {
   *   // Handle HashPack connection
   * }
   * ```
   *
   * @since 1.0.0
   */
  async connectHashPack(): Promise<WalletConnectionResult> {
    const startTime = Date.now();

    try {
      this.status = 'connecting';

      const hashPackConnector = this.connectors.get('hashpack');
      if (!hashPackConnector) {
        throw new Error('HashPack connector not available');
      }

      const available = await hashPackConnector.isAvailable();
      if (!available) {
        throw new Error(
          'HashPack wallet is not available. Please install HashPack.'
        );
      }

      const result = await hashPackConnector.connect();

      if (result.success) {
        this.currentWallet = hashPackConnector;
        this.status = 'connected';
      } else {
        this.status = 'error';
      }

      return {
        ...result,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      this.status = 'error';
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      return {
        success: false,
        error: errorMessage,
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Auto-connect to preferred wallet or first available wallet
   *
   * @returns Promise resolving to connection result
   *
   * @example
   * ```typescript
   * const result = await walletService.autoConnect();
   * // Handle auto-connection result
   * ```
   *
   * @since 1.0.0
   */
  async autoConnect(): Promise<WalletConnectionResult> {
    // Try preferred wallet first
    if (this.config.preferredWallet) {
      if (this.config.preferredWallet === 'snap') {
        const result = await this.connectSnap();
        if (result.success) return result;
      } else if (this.config.preferredWallet === 'hashpack') {
        const result = await this.connectHashPack();
        if (result.success) return result;
      }
    }

    // Try all available wallets
    const snapResult = await this.connectSnap();
    if (snapResult.success) return snapResult;

    const hashPackResult = await this.connectHashPack();
    if (hashPackResult.success) return hashPackResult;

    // No wallets available
    return {
      success: false,
      error: 'No compatible wallets available',
      responseTime: 0,
    };
  }

  /**
   * Disconnect from current wallet
   *
   * @returns Promise that resolves when disconnection is complete
   *
   * @example
   * ```typescript
   * await walletService.disconnect();
   * // Handle wallet disconnection
   * ```
   *
   * @since 1.0.0
   */
  async disconnect(): Promise<void> {
    if (this.currentWallet) {
      await this.currentWallet.disconnect();
      this.currentWallet = null;
    }
    this.status = 'disconnected';
  }

  /**
   * Generate authentication challenge for wallet signature
   *
   * @param accountId - Account ID requesting authentication
   * @returns Promise resolving to authentication challenge
   *
   * @example
   * ```typescript
   * const challenge = await walletService.generateChallenge('0.0.12345');
   * // Display signing challenge
   * ```
   *
   * @since 1.0.0
   */
  async generateChallenge(accountId: string): Promise<AuthChallenge> {
    const challengeId = `ct_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const timestamp = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const message = `ChainTrace Authentication Challenge\n\nAccount: ${accountId}\nChallenge ID: ${challengeId}\nTimestamp: ${timestamp}\nNetwork: ${this.config.networkType}\n\nSign this message to authenticate with ChainTrace.`;

    return {
      challengeId,
      message,
      expiresAt,
    };
  }

  /**
   * Sign message with current wallet
   *
   * @param message - Message to sign
   * @returns Promise resolving to signed message
   * @throws {Error} When no wallet is connected or signing fails
   *
   * @example
   * ```typescript
   * const signature = await walletService.signMessage('Hello ChainTrace');
   * // Handle signature result
   * ```
   *
   * @since 1.0.0
   */
  async signMessage(message: string): Promise<string> {
    if (!this.currentWallet) {
      throw new Error('No wallet connected. Please connect a wallet first.');
    }

    if (this.status !== 'connected') {
      throw new Error('Wallet is not in connected state.');
    }

    return await this.currentWallet.signMessage(message);
  }

  /**
   * Verify wallet signature for authentication
   *
   * @param signature - Signature to verify
   * @param message - Original message that was signed
   * @param accountId - Expected signer account ID
   * @returns Promise resolving to signature verification result
   *
   * @example
   * ```typescript
   * const result = await walletService.verifySignature(signature, message, '0.0.12345');
   * if (result.valid) {
   *   // Handle successful verification
   * }
   * ```
   *
   * @since 1.0.0
   */
  async verifySignature(
    _signature: string,
    _message: string,
    accountId: string
  ): Promise<SignatureResult> {
    try {
      // Signature verification logic will be implemented when wallet connectors are ready
      // This is a placeholder for the verification process

      return {
        valid: true,
        accountId: accountId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Signature verification failed';
      return {
        valid: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get current wallet connection status
   *
   * @returns Current wallet status
   *
   * @example
   * ```typescript
   * const status = walletService.getStatus();
   * // Check wallet status
   * ```
   *
   * @since 1.0.0
   */
  getStatus(): WalletStatus {
    return this.status;
  }

  /**
   * Check if a wallet is currently connected
   *
   * @returns True if wallet is connected
   *
   * @example
   * ```typescript
   * if (walletService.isConnected()) {
   *   // Wallet is connected
   * }
   * ```
   *
   * @since 1.0.0
   */
  isConnected(): boolean {
    return this.status === 'connected' && this.currentWallet !== null;
  }

  /**
   * Get connected account information
   *
   * @returns Promise resolving to account information
   * @throws {Error} When no wallet is connected
   *
   * @example
   * ```typescript
   * const account = await walletService.getAccountInfo();
   * // Display account information
   * ```
   *
   * @since 1.0.0
   */
  async getAccountInfo(): Promise<{ accountId: string; balance?: string }> {
    if (!this.currentWallet) {
      throw new Error('No wallet connected');
    }

    return await this.currentWallet.getAccountInfo();
  }

  /**
   * Get available wallet types
   *
   * @returns Promise resolving to array of available wallet types
   *
   * @example
   * ```typescript
   * const available = await walletService.getAvailableWallets();
   * // List available wallets
   * ```
   *
   * @since 1.0.0
   */
  async getAvailableWallets(): Promise<WalletType[]> {
    const available: WalletType[] = [];
    const checks: Promise<{ type: WalletType; isAvailable: boolean }>[] = [];

    // Check all wallets in parallel with timeout
    for (const [type, connector] of this.connectors) {
      const check = Promise.race([
        connector.isAvailable().then(isAvailable => ({ type, isAvailable })),
        new Promise<{ type: WalletType; isAvailable: boolean }>(resolve =>
          setTimeout(() => resolve({ type, isAvailable: false }), 3000)
        ),
      ]);
      checks.push(check);
    }

    try {
      const results = await Promise.all(checks);
      for (const { type, isAvailable } of results) {
        if (isAvailable) {
          available.push(type);
        }
      }
    } catch (error) {
      console.debug('Error checking wallet availability:', error);
    }

    // Always return at least both options for user choice
    if (available.length === 0) {
      return ['snap', 'hashpack'];
    }

    return available;
  }
}

/**
 * Singleton instance for global access
 */
let walletServiceInstance: WalletService | null = null;

/**
 * Gets or creates the singleton WalletService instance
 *
 * @param config - Optional configuration for new instance
 * @returns The singleton WalletService instance
 *
 * @example
 * ```typescript
 * const walletService = getWalletService({
 *   networkType: 'testnet',
 *   preferredWallet: 'snap'
 * });
 * ```
 *
 * @since 1.0.0
 */
export function getWalletService(config?: WalletConfig): WalletService {
  if (!walletServiceInstance && config) {
    walletServiceInstance = new WalletService(config);
  } else if (!walletServiceInstance) {
    throw new Error(
      'WalletService not initialized. Provide configuration on first call.'
    );
  }
  return walletServiceInstance;
}

/**
 * Resets the singleton instance (primarily for testing)
 *
 * @since 1.0.0
 */
export function resetWalletService(): void {
  walletServiceInstance = null;
}
