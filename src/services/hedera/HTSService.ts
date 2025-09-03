/**
 * Hedera Token Service (HTS) Integration
 *
 * Service for managing HTS token operations including token distribution,
 * balance checking, and reward management for the CTRACE token.
 *
 * @class HTSService
 *
 * @example
 * ```typescript
 * const htsService = new HTSService({
 *   tokenId: '0.0.6715040',
 *   networkType: 'testnet'
 * });
 *
 * // Distribute rewards
 * const result = await htsService.distributeRewards([
 *   { accountId: '0.0.12345', amount: 100 },
 *   { accountId: '0.0.67890', amount: 50 }
 * ]);
 * ```
 *
 * @since 1.0.0
 */

import {
  Client,
  TokenId,
  AccountId,
  TokenAssociateTransaction,
  TransferTransaction,
  TokenInfoQuery,
  AccountBalanceQuery,
} from '@hashgraph/sdk';
import { getHederaService } from './HederaService';
import { getHederaConfig } from '@/config/hedera';
import { logger } from '@/lib/logger';

/**
 * HTS service configuration
 */
export interface HTSConfig {
  /** HTS Token ID for CTRACE token */
  tokenId: string;

  /** Network type */
  networkType: 'testnet' | 'mainnet';

  /** Token treasury account ID */
  treasuryAccountId: string;

  /** Maximum tokens per distribution */
  maxDistributionAmount: number;

  /** Token decimals for calculations */
  decimals: number;

  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Token information interface
 */
export interface TokenInfo {
  /** Token ID */
  tokenId: string;

  /** Token name */
  name: string;

  /** Token symbol */
  symbol: string;

  /** Token decimals */
  decimals: number;

  /** Total supply */
  totalSupply: string;

  /** Treasury account */
  treasuryAccountId: string;

  /** Admin key */
  adminKey?: string;

  /** Supply key */
  supplyKey?: string;

  /** Token memo */
  memo?: string;
}

/**
 * Token balance information
 */
export interface TokenBalance {
  /** Account ID */
  accountId: string;

  /** Token balance */
  balance: string;

  /** Balance in smallest unit */
  balanceInTinyTokens: string;

  /** Token ID */
  tokenId: string;
}

/**
 * Reward distribution entry
 */
export interface RewardDistribution {
  /** Recipient account ID */
  accountId: string;

  /** Reward amount (in tokens, not tiny tokens) */
  amount: number;

  /** Optional reason for the reward */
  reason?: string;

  /** Optional metadata */
  metadata?: Record<string, any>;
}

/**
 * Distribution result
 */
export interface DistributionResult {
  /** Whether distribution was successful */
  success: boolean;

  /** Transaction ID */
  transactionId?: string;

  /** Consensus timestamp */
  consensusTimestamp?: string;

  /** Number of successful distributions */
  successfulDistributions: number;

  /** Total amount distributed */
  totalAmountDistributed: string;

  /** Failed distributions */
  failedDistributions: Array<{
    accountId: string;
    amount: number;
    error: string;
  }>;

  /** Any error message */
  error?: string;

  /** Distribution response time */
  responseTime: number;
}

/**
 * Token association result
 */
export interface AssociationResult {
  /** Whether association was successful */
  success: boolean;

  /** Transaction ID */
  transactionId?: string;

  /** Consensus timestamp */
  consensusTimestamp?: string;

  /** Error message if failed */
  error?: string;

  /** Response time */
  responseTime: number;
}

/**
 * Hedera Token Service implementation
 */
export class HTSService {
  private config: HTSConfig;
  private client: Client | null = null;
  private tokenId: TokenId | null = null;

  /**
   * Creates a new HTSService instance
   *
   * @param config - HTS service configuration
   */
  constructor(config?: Partial<HTSConfig>) {
    const hederaConfig = getHederaConfig();

    this.config = {
      tokenId: hederaConfig.htsTokenId || '',
      networkType: hederaConfig.networkType,
      treasuryAccountId: hederaConfig.operatorAccountId,
      maxDistributionAmount: 1000000, // 1M tokens max per distribution
      decimals: 8, // Default to 8 decimals for CTRACE
      debug: false,
      ...config,
    };

    if (!this.config.tokenId) {
      throw new Error(
        'HTS Token ID not configured. Set HTS_TOKEN_ID environment variable.'
      );
    }

    this.tokenId = TokenId.fromString(this.config.tokenId);
  }

  /**
   * Initialize the HTS service with Hedera client
   *
   * @returns Promise that resolves when service is initialized
   *
   * @example
   * ```typescript
   * await htsService.initialize();
   * console.log('HTS service ready');
   * ```
   *
   * @since 1.0.0
   */
  async initialize(): Promise<void> {
    try {
      // Get Hedera service and client
      const hederaService = getHederaService();
      if (!hederaService.isReady()) {
        await hederaService.validateConnection();
      }

      this.client = hederaService.getClient();
      this.log('HTS Service initialized', { tokenId: this.config.tokenId });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`HTS Service initialization failed: ${errorMessage}`);
    }
  }

  /**
   * Get token information from Hedera network
   *
   * @returns Promise resolving to token information
   *
   * @example
   * ```typescript
   * const tokenInfo = await htsService.getTokenInfo();
   * console.log(`Token: ${tokenInfo.name} (${tokenInfo.symbol})`);
   * ```
   *
   * @since 1.0.0
   */
  async getTokenInfo(): Promise<TokenInfo> {
    if (!this.client || !this.tokenId) {
      await this.initialize();
    }

    try {
      const tokenInfoQuery = new TokenInfoQuery().setTokenId(this.tokenId!);

      const tokenInfo = await tokenInfoQuery.execute(this.client!);

      return {
        tokenId: this.config.tokenId,
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        decimals: tokenInfo.decimals,
        totalSupply: tokenInfo.totalSupply.toString(),
        treasuryAccountId: tokenInfo.treasuryAccountId?.toString() || '',
        adminKey: tokenInfo.adminKey?.toString(),
        supplyKey: tokenInfo.supplyKey?.toString(),
        memo: tokenInfo.tokenMemo,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get token info: ${errorMessage}`);
    }
  }

  /**
   * Get token balance for an account
   *
   * @param accountId - Account ID to check balance for
   * @returns Promise resolving to token balance
   *
   * @example
   * ```typescript
   * const balance = await htsService.getTokenBalance('0.0.12345');
   * console.log(`Balance: ${balance.balance} CTRACE`);
   * ```
   *
   * @since 1.0.0
   */
  async getTokenBalance(accountId: string): Promise<TokenBalance> {
    if (!this.client || !this.tokenId) {
      await this.initialize();
    }

    try {
      const accountBalanceQuery = new AccountBalanceQuery().setAccountId(
        AccountId.fromString(accountId)
      );

      const balance = await accountBalanceQuery.execute(this.client!);

      const tokenBalance = balance.tokens?.get(this.tokenId!) || 0;
      const balanceInTokens = (
        Number(tokenBalance) / Math.pow(10, this.config.decimals)
      ).toFixed(this.config.decimals);

      return {
        accountId,
        balance: balanceInTokens,
        balanceInTinyTokens: tokenBalance.toString(),
        tokenId: this.config.tokenId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get token balance: ${errorMessage}`);
    }
  }

  /**
   * Associate token with an account
   *
   * @param accountId - Account ID to associate token with
   * @returns Promise resolving to association result
   *
   * @example
   * ```typescript
   * const result = await htsService.associateToken('0.0.12345');
   * if (result.success) {
   *   console.log('Token associated successfully');
   * }
   * ```
   *
   * @since 1.0.0
   */
  async associateToken(accountId: string): Promise<AssociationResult> {
    const startTime = Date.now();

    if (!this.client || !this.tokenId) {
      await this.initialize();
    }

    try {
      const associateTransaction = new TokenAssociateTransaction()
        .setAccountId(AccountId.fromString(accountId))
        .setTokenIds([this.tokenId!]);

      const response = await associateTransaction.execute(this.client!);
      await response.getReceipt(this.client!); // Wait for transaction confirmation

      return {
        success: true,
        transactionId: response.transactionId.toString(),
        consensusTimestamp: undefined, // Consensus timestamp not directly available on TransactionReceipt
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Check if token is already associated
      if (errorMessage.includes('TOKEN_ALREADY_ASSOCIATED')) {
        return {
          success: true,
          responseTime: Date.now() - startTime,
        };
      }

      return {
        success: false,
        error: errorMessage,
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Distribute rewards to multiple accounts
   *
   * @param distributions - Array of reward distributions
   * @returns Promise resolving to distribution result
   *
   * @example
   * ```typescript
   * const result = await htsService.distributeRewards([
   *   { accountId: '0.0.12345', amount: 100, reason: 'Product verification' },
   *   { accountId: '0.0.67890', amount: 50, reason: 'Quality compliance' }
   * ]);
   * ```
   *
   * @since 1.0.0
   */
  async distributeRewards(
    distributions: RewardDistribution[]
  ): Promise<DistributionResult> {
    const startTime = Date.now();

    if (!this.client || !this.tokenId) {
      await this.initialize();
    }

    try {
      // Validate distributions
      const totalAmount = distributions.reduce(
        (sum, dist) => sum + dist.amount,
        0
      );

      if (totalAmount > this.config.maxDistributionAmount) {
        throw new Error(
          `Total distribution amount (${totalAmount}) exceeds maximum (${this.config.maxDistributionAmount})`
        );
      }

      if (distributions.length === 0) {
        throw new Error('No distributions provided');
      }

      this.log('Distributing rewards', {
        recipients: distributions.length,
        totalAmount,
      });

      // Convert amounts to tiny tokens
      const transfers = distributions.map(dist => ({
        accountId: AccountId.fromString(dist.accountId),
        amount: Math.floor(dist.amount * Math.pow(10, this.config.decimals)),
      }));

      // Create token transfer transaction
      const transferTransaction = new TransferTransaction();

      // Add treasury as sender for all amounts
      const treasuryId = AccountId.fromString(this.config.treasuryAccountId);
      const totalTinyTokens = transfers.reduce(
        (sum, transfer) => sum + transfer.amount,
        0
      );

      transferTransaction.addTokenTransfer(
        this.tokenId!,
        treasuryId,
        -totalTinyTokens
      );

      // Add each recipient
      for (const transfer of transfers) {
        transferTransaction.addTokenTransfer(
          this.tokenId!,
          transfer.accountId,
          transfer.amount
        );
      }

      // Execute transaction
      const response = await transferTransaction.execute(this.client!);
      await response.getReceipt(this.client!); // Wait for transaction confirmation

      const result: DistributionResult = {
        success: true,
        transactionId: response.transactionId.toString(),
        consensusTimestamp: undefined, // Consensus timestamp not directly available on TransactionReceipt
        successfulDistributions: distributions.length,
        totalAmountDistributed: totalAmount.toFixed(this.config.decimals),
        failedDistributions: [],
        responseTime: Date.now() - startTime,
      };

      this.log('Rewards distributed successfully', result);
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      return {
        success: false,
        error: errorMessage,
        successfulDistributions: 0,
        totalAmountDistributed: '0',
        failedDistributions: distributions.map(dist => ({
          accountId: dist.accountId,
          amount: dist.amount,
          error: errorMessage,
        })),
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Get multiple token balances efficiently
   *
   * @param accountIds - Array of account IDs to check
   * @returns Promise resolving to array of token balances
   *
   * @example
   * ```typescript
   * const balances = await htsService.getMultipleBalances(['0.0.12345', '0.0.67890']);
   * balances.forEach(balance => {
   *   console.log(`${balance.accountId}: ${balance.balance} CTRACE`);
   * });
   * ```
   *
   * @since 1.0.0
   */
  async getMultipleBalances(accountIds: string[]): Promise<TokenBalance[]> {
    const balances: TokenBalance[] = [];

    // Process in batches to avoid overwhelming the network
    const batchSize = 10;
    for (let i = 0; i < accountIds.length; i += batchSize) {
      const batch = accountIds.slice(i, i + batchSize);

      const batchPromises = batch.map(accountId =>
        this.getTokenBalance(accountId).catch(error => ({
          accountId,
          balance: '0',
          balanceInTinyTokens: '0',
          tokenId: this.config.tokenId,
          error: error.message,
        }))
      );

      const batchResults = await Promise.all(batchPromises);
      balances.push(...batchResults);
    }

    return balances;
  }

  /**
   * Validate token treasury accessibility
   *
   * @returns Promise resolving to validation result
   *
   * @example
   * ```typescript
   * const result = await htsService.validateTokenAccess();
   * if (result.accessible) {
   *   console.log('Token treasury is accessible');
   * }
   * ```
   *
   * @since 1.0.0
   */
  async validateTokenAccess(): Promise<{
    accessible: boolean;
    tokenInfo?: TokenInfo;
    treasuryBalance?: TokenBalance;
    error?: string;
    responseTime: number;
  }> {
    const startTime = Date.now();

    try {
      // Get token information
      const tokenInfo = await this.getTokenInfo();

      // Get treasury balance
      const treasuryBalance = await this.getTokenBalance(
        this.config.treasuryAccountId
      );

      return {
        accessible: true,
        tokenInfo,
        treasuryBalance,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      return {
        accessible: false,
        error: errorMessage,
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Get service configuration
   *
   * @returns Current HTS service configuration
   *
   * @since 1.0.0
   */
  getConfig(): HTSConfig {
    return { ...this.config };
  }

  /**
   * Check if service is initialized
   *
   * @returns True if service is ready to use
   *
   * @since 1.0.0
   */
  isInitialized(): boolean {
    return this.client !== null;
  }

  /**
   * Clean up service resources
   *
   * @returns Promise that resolves when cleanup is complete
   *
   * @since 1.0.0
   */
  async dispose(): Promise<void> {
    this.client = null;
    this.log('HTS Service disposed');
  }

  /**
   * Internal logging method
   */
  private log(message: string, data?: any): void {
    if (this.config.debug) {
      logger.debug(message, {
        component: 'HTSService',
        ...data,
      });
    } else {
      logger.info(message, {
        component: 'HTSService',
        ...data,
      });
    }
  }
}

/**
 * Singleton instance for global access
 */
let htsServiceInstance: HTSService | null = null;

/**
 * Gets or creates the singleton HTSService instance
 *
 * @param config - Optional configuration for new instance
 * @returns The singleton HTSService instance
 *
 * @example
 * ```typescript
 * const htsService = getHTSService();
 * await htsService.initialize();
 * ```
 *
 * @since 1.0.0
 */
export function getHTSService(config?: Partial<HTSConfig>): HTSService {
  if (!htsServiceInstance) {
    htsServiceInstance = new HTSService(config);
  }
  return htsServiceInstance;
}

/**
 * Resets the singleton instance (primarily for testing)
 *
 * @since 1.0.0
 */
export function resetHTSService(): void {
  if (htsServiceInstance) {
    htsServiceInstance.dispose();
  }
  htsServiceInstance = null;
}
