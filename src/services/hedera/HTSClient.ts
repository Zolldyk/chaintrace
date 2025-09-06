/**
 * Production HTS (Hedera Token Service) client for token operations
 *
 * @since 1.4.0
 */

import {
  TokenId,
  AccountId,
  TransferTransaction,
  TokenAssociateTransaction,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  AccountBalanceQuery,
} from '@hashgraph/sdk';
import { HederaServiceClient } from '../core/HederaServiceClient';
import type { HederaServiceConfig } from '../../types/hedera';

/**
 * Token transfer result
 */
export interface TokenTransferResult {
  /** Transaction ID */
  transactionId: string;

  /** Token ID */
  tokenId: string;

  /** Recipient account ID */
  recipientId: string;

  /** Transfer amount */
  amount: string;

  /** Transfer timestamp */
  transferredAt: Date;

  /** Transaction status */
  status: 'success' | 'pending' | 'failed';
}

/**
 * Token balance information
 */
export interface TokenBalance {
  /** Token ID */
  tokenId: string;

  /** Account ID */
  accountId: string;

  /** Current balance */
  balance: string;

  /** Last updated timestamp */
  lastUpdated: Date;
}

/**
 * Production HTS client for token operations and reward distribution
 *
 * @class HTSClient
 * @extends HederaServiceClient
 * @since 1.4.0
 *
 * @example
 * ```typescript
 * const htsClient = new HTSClient({
 *   networkType: 'testnet',
 *   operatorAccountId: '0.0.12345',
 *   operatorPrivateKey: 'your-private-key',
 *   htsTokenId: '0.0.67890'
 * });
 *
 * // Distribute reward tokens
 * const result = await htsClient.distributeReward({
 *   recipientAddress: '0.0.54321',
 *   amount: '100',
 *   rewardType: 'verification'
 * });
 * ```
 */
export class HTSClient extends HederaServiceClient {
  private defaultTokenId: TokenId | null = null;

  constructor(config: HederaServiceConfig) {
    super(config);

    if (config.htsTokenId) {
      this.defaultTokenId = TokenId.fromString(config.htsTokenId);
    }
  }

  protected getServiceName(): string {
    return 'HTSClient';
  }

  /**
   * Distribute reward tokens to recipient
   */
  async distributeReward(reward: {
    recipientAddress: string;
    amount: string;
    tokenId?: string;
    rewardType: 'verification' | 'quality' | 'sustainability' | 'compliance';
    memo?: string;
  }): Promise<TokenTransferResult> {
    const tokenId = reward.tokenId
      ? TokenId.fromString(reward.tokenId)
      : this.defaultTokenId;

    if (!tokenId) {
      throw new Error('HTS token ID must be provided');
    }

    const recipientId = AccountId.fromString(reward.recipientAddress);

    return this.executeWithRetry(
      async () => {
        // Create transfer transaction
        const transferTx = new TransferTransaction()
          .addTokenTransfer(
            tokenId,
            this.client.operatorAccountId!,
            -parseInt(reward.amount)
          )
          .addTokenTransfer(tokenId, recipientId, parseInt(reward.amount));

        // Add memo if provided
        if (reward.memo) {
          transferTx.setTransactionMemo(reward.memo);
        }

        // Execute the transaction
        const txResponse = await transferTx.execute(this.client);
        const receipt = await txResponse.getReceipt(this.client);

        return {
          transactionId: txResponse.transactionId.toString(),
          tokenId: tokenId.toString(),
          recipientId: recipientId.toString(),
          amount: reward.amount,
          transferredAt: new Date(),
          status:
            receipt.status.toString() === 'SUCCESS' ? 'success' : 'failed',
        };
      },
      {
        operationName: 'distributeReward',
        timeout: this.config.timeouts?.hts || 30000,
        metadata: {
          tokenId: tokenId.toString(),
          recipientId: recipientId.toString(),
          amount: reward.amount,
          rewardType: reward.rewardType,
        },
      }
    );
  }

  /**
   * Get token balance for an account
   */
  async getTokenBalance(
    accountId: string,
    tokenId?: string
  ): Promise<TokenBalance> {
    const token = tokenId ? TokenId.fromString(tokenId) : this.defaultTokenId;

    if (!token) {
      throw new Error('HTS token ID must be provided');
    }

    const account = AccountId.fromString(accountId);

    return this.executeWithRetry(
      async () => {
        // Query account balance
        const balanceQuery = new AccountBalanceQuery().setAccountId(account);
        const balance = await balanceQuery.execute(this.client);
        const tokenBalance = balance.tokens?.get(token) || 0;

        return {
          tokenId: token.toString(),
          accountId: account.toString(),
          balance: tokenBalance.toString(),
          lastUpdated: new Date(),
        };
      },
      {
        operationName: 'getTokenBalance',
        timeout: this.config.timeouts?.hts || 30000,
        metadata: { accountId, tokenId: token.toString() },
      }
    );
  }

  /**
   * Associate token with account (required before receiving tokens)
   */
  async associateToken(accountId: string, tokenIds: string[]): Promise<string> {
    const account = AccountId.fromString(accountId);
    const tokens = tokenIds.map(id => TokenId.fromString(id));

    return this.executeWithRetry(
      async () => {
        const associateTx = new TokenAssociateTransaction()
          .setAccountId(account)
          .setTokenIds(tokens);

        const txResponse = await associateTx.execute(this.client);
        const receipt = await txResponse.getReceipt(this.client);

        if (receipt.status.toString() !== 'SUCCESS') {
          throw new Error(
            `Token association failed: ${receipt.status.toString()}`
          );
        }

        return txResponse.transactionId.toString();
      },
      {
        operationName: 'associateToken',
        timeout: this.config.timeouts?.hts || 30000,
        metadata: { accountId, tokenIds },
      }
    );
  }

  /**
   * Create reward token (for setup/admin operations)
   */
  async createRewardToken(config: {
    name: string;
    symbol: string;
    decimals: number;
    initialSupply: number;
    treasuryAccountId: string;
  }): Promise<string> {
    if (!this.client.operatorAccountId) {
      throw new Error('Operator account required for token creation');
    }

    const treasuryId = AccountId.fromString(config.treasuryAccountId);

    return this.executeWithRetry(
      async () => {
        const createTx = new TokenCreateTransaction()
          .setTokenName(config.name)
          .setTokenSymbol(config.symbol)
          .setDecimals(config.decimals)
          .setInitialSupply(config.initialSupply)
          .setTreasuryAccountId(treasuryId)
          .setTokenType(TokenType.FungibleCommon)
          .setSupplyType(TokenSupplyType.Finite)
          .setMaxSupply(1000000) // Adjust as needed
          .freezeWith(this.client);

        const txResponse = await createTx.execute(this.client);
        const receipt = await txResponse.getReceipt(this.client);

        if (receipt.status.toString() !== 'SUCCESS') {
          throw new Error(
            `Token creation failed: ${receipt.status.toString()}`
          );
        }

        if (!receipt.tokenId) {
          throw new Error('Token ID not returned from creation');
        }

        return receipt.tokenId.toString();
      },
      {
        operationName: 'createRewardToken',
        timeout: this.config.timeouts?.hts || 45000, // Longer timeout for creation
        metadata: config,
      }
    );
  }

  /**
   * Batch distribute rewards to multiple recipients
   */
  async batchDistributeRewards(
    rewards: Array<{
      recipientAddress: string;
      amount: string;
      rewardType: 'verification' | 'quality' | 'sustainability' | 'compliance';
    }>,
    tokenId?: string
  ): Promise<TokenTransferResult[]> {
    const token = tokenId ? TokenId.fromString(tokenId) : this.defaultTokenId;

    if (!token) {
      throw new Error('HTS token ID must be provided');
    }

    return this.executeWithRetry(
      async () => {
        const results: TokenTransferResult[] = [];

        // Process in batches to avoid transaction limits
        const batchSize = 10;
        for (let i = 0; i < rewards.length; i += batchSize) {
          const batch = rewards.slice(i, i + batchSize);

          // Create transfer transaction for this batch
          let transferTx = new TransferTransaction();

          for (const reward of batch) {
            const recipientId = AccountId.fromString(reward.recipientAddress);
            transferTx = transferTx
              .addTokenTransfer(
                token,
                this.client.operatorAccountId!,
                -parseInt(reward.amount)
              )
              .addTokenTransfer(token, recipientId, parseInt(reward.amount));
          }

          const txResponse = await transferTx.execute(this.client);
          const receipt = await txResponse.getReceipt(this.client);

          // Record results for this batch
          for (const reward of batch) {
            results.push({
              transactionId: txResponse.transactionId.toString(),
              tokenId: token.toString(),
              recipientId: reward.recipientAddress,
              amount: reward.amount,
              transferredAt: new Date(),
              status:
                receipt.status.toString() === 'SUCCESS' ? 'success' : 'failed',
            });
          }
        }

        return results;
      },
      {
        operationName: 'batchDistributeRewards',
        timeout: this.config.timeouts?.hts || 60000, // Longer timeout for batch
        metadata: {
          tokenId: token.toString(),
          batchSize: rewards.length,
        },
      }
    );
  }
}
