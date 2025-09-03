/**
 * Main Hedera Service for managing all Hedera blockchain interactions
 *
 * Service for managing Hedera blockchain interactions including HCS logging,
 * HTS token operations, and Custom Compliance Engine integration.
 *
 * @class HederaService
 *
 * @example
 * ```typescript
 * const hederaService = new HederaService({
 *   networkType: 'testnet',
 *   operatorAccountId: '0.0.12345'
 * });
 *
 * // Validate connection
 * const isConnected = await hederaService.validateConnection();
 * if (isConnected) {
 *   console.log('Successfully connected to Hedera network');
 * }
 * ```
 *
 * @since 1.0.0
 */

import { Client, AccountId, AccountBalanceQuery, Hbar } from '@hashgraph/sdk';
import {
  getHederaConfig,
  createHederaClient,
  type HederaConfig,
} from '@/config/hedera';
import { logger } from '@/lib/logger';

/**
 * Connection validation result interface
 */
export interface ConnectionResult {
  /** Whether connection was successful */
  connected: boolean;

  /** Network type that was connected to */
  networkType: 'testnet' | 'mainnet';

  /** Account balance in HBAR */
  balance?: Hbar;

  /** Any error message if connection failed */
  error?: string;

  /** Response time in milliseconds */
  responseTime: number;
}

/**
 * Service health check result
 */
export interface ServiceHealth {
  /** Service name */
  service: string;

  /** Health status */
  status: 'healthy' | 'degraded' | 'unhealthy';

  /** Response time in milliseconds */
  responseTime: number;

  /** Any error details */
  error?: string;

  /** Last check timestamp */
  timestamp: Date;
}

/**
 * Hedera service configuration options
 */
export interface HederaServiceOptions extends Partial<HederaConfig> {
  /** Custom client instance */
  client?: Client;

  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Main Hedera service class for blockchain operations
 */
export class HederaService {
  private client: Client;
  private config: HederaConfig;
  private isInitialized = false;
  private debug = false;

  /**
   * Creates a new HederaService instance with the specified configuration.
   *
   * @param options - Service configuration options
   * @throws {Error} When required configuration is missing
   */
  constructor(options: HederaServiceOptions = {}) {
    this.config = { ...getHederaConfig(), ...options };
    this.client = options.client || createHederaClient(this.config);
    this.debug = options.debug || false;

    this.log('HederaService initialized', {
      networkType: this.config.networkType,
      operatorId: this.config.operatorAccountId,
    });
  }

  /**
   * Validates connection to the Hedera network and checks account balance
   *
   * @returns Promise resolving to connection validation result
   * @throws {Error} When validation fails due to configuration issues
   *
   * @example
   * ```typescript
   * const result = await hederaService.validateConnection();
   * if (result.connected) {
   *   console.log(`Connected with balance: ${result.balance?.toTinybars()}`);
   * } else {
   *   console.error('Connection failed:', result.error);
   * }
   * ```
   *
   * @since 1.0.0
   */
  async validateConnection(): Promise<ConnectionResult> {
    const startTime = Date.now();

    try {
      this.log('Validating Hedera connection...');

      // Parse operator account ID
      const operatorId = AccountId.fromString(this.config.operatorAccountId);

      // Query account balance to validate connection
      const balance = await new AccountBalanceQuery()
        .setAccountId(operatorId)
        .execute(this.client);

      const responseTime = Date.now() - startTime;

      this.log('Connection validation successful', {
        balance: balance.hbars.toString(),
        responseTime: `${responseTime}ms`,
      });

      this.isInitialized = true;

      return {
        connected: true,
        networkType: this.config.networkType,
        balance: balance.hbars,
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.log('Connection validation failed', { error: errorMessage });

      return {
        connected: false,
        networkType: this.config.networkType,
        error: errorMessage,
        responseTime,
      };
    }
  }

  /**
   * Checks the health of core Hedera services
   *
   * @returns Promise resolving to array of service health results
   *
   * @example
   * ```typescript
   * const healthChecks = await hederaService.checkServiceHealth();
   * healthChecks.forEach(check => {
   *   console.log(`${check.service}: ${check.status} (${check.responseTime}ms)`);
   * });
   * ```
   *
   * @since 1.0.0
   */
  async checkServiceHealth(): Promise<ServiceHealth[]> {
    const results: ServiceHealth[] = [];

    // Check SDK connection
    const connectionResult = await this.validateConnection();
    results.push({
      service: 'Hedera SDK',
      status: connectionResult.connected ? 'healthy' : 'unhealthy',
      responseTime: connectionResult.responseTime,
      error: connectionResult.error,
      timestamp: new Date(),
    });

    // Additional health checks can be added here for:
    // - Mirror Node API
    // - HCS Topic access
    // - HTS Token access
    // - Custom Compliance Engine

    return results;
  }

  /**
   * Gets the current Hedera client instance
   *
   * @returns The configured Hedera client
   * @throws {Error} When service is not initialized
   *
   * @example
   * ```typescript
   * const client = hederaService.getClient();
   * const accountId = client.operatorAccountId;
   * ```
   *
   * @since 1.0.0
   */
  getClient(): Client {
    if (!this.isInitialized) {
      throw new Error(
        'HederaService not initialized. Call validateConnection() first.'
      );
    }
    return this.client;
  }

  /**
   * Gets the current service configuration
   *
   * @returns The current Hedera configuration
   *
   * @example
   * ```typescript
   * const config = hederaService.getConfig();
   * console.log(`Network: ${config.networkType}`);
   * ```
   *
   * @since 1.0.0
   */
  getConfig(): HederaConfig {
    return { ...this.config };
  }

  /**
   * Checks if the service is properly initialized
   *
   * @returns True if service is initialized and ready to use
   *
   * @example
   * ```typescript
   * if (!hederaService.isReady()) {
   *   await hederaService.validateConnection();
   * }
   * ```
   *
   * @since 1.0.0
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Safely closes the Hedera client connection
   *
   * @returns Promise that resolves when client is closed
   *
   * @example
   * ```typescript
   * await hederaService.close();
   * console.log('Hedera service closed');
   * ```
   *
   * @since 1.0.0
   */
  async close(): Promise<void> {
    try {
      await this.client.close();
      this.isInitialized = false;
      this.log('HederaService closed successfully');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.log('Error closing HederaService', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Internal logging method
   */
  private log(message: string, data?: any): void {
    if (this.debug) {
      logger.debug(message, {
        service: 'HederaService',
        data: data || undefined,
      });
    }
  }
}

/**
 * Singleton instance for global access
 */
let hederaServiceInstance: HederaService | null = null;

/**
 * Gets or creates the singleton HederaService instance
 *
 * @param options - Optional configuration for new instance
 * @returns The singleton HederaService instance
 *
 * @example
 * ```typescript
 * const hederaService = getHederaService();
 * await hederaService.validateConnection();
 * ```
 *
 * @since 1.0.0
 */
export function getHederaService(
  options?: HederaServiceOptions
): HederaService {
  if (!hederaServiceInstance) {
    hederaServiceInstance = new HederaService(options);
  }
  return hederaServiceInstance;
}

/**
 * Resets the singleton instance (primarily for testing)
 *
 * @since 1.0.0
 */
export function resetHederaService(): void {
  hederaServiceInstance = null;
}
