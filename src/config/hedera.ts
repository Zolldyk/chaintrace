/**
 * Hedera Network Configuration
 *
 * Provides network configuration for all Hedera services including SDK setup,
 * Mirror Node connectivity, and service-specific settings.
 *
 * @example
 * ```typescript
 * const config = getHederaConfig();
 * console.log(config.networkType); // 'testnet' | 'mainnet'
 * ```
 *
 * @since 1.0.0
 */

import { Client, AccountId, PrivateKey } from '@hashgraph/sdk';
import { z } from 'zod';

/**
 * Hedera network configuration interface
 */
export interface HederaConfig {
  /** Network type - testnet or mainnet */
  networkType: 'testnet' | 'mainnet';

  /** Mirror Node API base URL */
  mirrorNodeUrl: string;

  /** Operator account ID for service operations */
  operatorAccountId: string;

  /** Operator private key for signing transactions */
  operatorPrivateKey: string;

  /** Maximum timeout for SDK operations in milliseconds */
  operationTimeout: number;

  /** Maximum retries for failed operations */
  maxRetries: number;

  /** HCS Topic ID for product events */
  hcsTopicId?: string;

  /** HTS Token ID for rewards */
  htsTokenId?: string;
}

/**
 * Environment variable validation schema
 */
const envSchema = z.object({
  NEXT_PUBLIC_HEDERA_NETWORK: z.enum(['testnet', 'mainnet']).default('testnet'),
  NEXT_PUBLIC_MIRROR_NODE_URL: z
    .string()
    .url()
    .default('https://testnet.mirrornode.hedera.com'),
  HEDERA_ACCOUNT_ID: z
    .string()
    .regex(/^0\.0\.\d+$/, 'Invalid Hedera Account ID format'),
  HEDERA_PRIVATE_KEY: z.string().min(64, 'Invalid private key length'),
  HCS_TOPIC_ID: z
    .string()
    .regex(/^0\.0\.\d+$/)
    .optional(),
  HTS_TOKEN_ID: z
    .string()
    .regex(/^0\.0\.\d+$/)
    .optional(),
});

/**
 * Validates and returns Hedera configuration from environment variables
 *
 * @returns Complete Hedera configuration object
 * @throws {Error} When required environment variables are missing or invalid
 *
 * @example
 * ```typescript
 * try {
 *   const config = getHederaConfig();
 *   console.log(`Connected to ${config.networkType} network`);
 * } catch (error) {
 *   console.error('Configuration error:', error.message);
 * }
 * ```
 *
 * @since 1.0.0
 */
export function getHederaConfig(): HederaConfig {
  const env = envSchema.parse({
    NEXT_PUBLIC_HEDERA_NETWORK: process.env.NEXT_PUBLIC_HEDERA_NETWORK,
    NEXT_PUBLIC_MIRROR_NODE_URL: process.env.NEXT_PUBLIC_MIRROR_NODE_URL,
    HEDERA_ACCOUNT_ID: process.env.HEDERA_ACCOUNT_ID,
    HEDERA_PRIVATE_KEY: process.env.HEDERA_PRIVATE_KEY,
    HCS_TOPIC_ID: process.env.HCS_TOPIC_ID,
    HTS_TOKEN_ID: process.env.HTS_TOKEN_ID,
  });

  return {
    networkType: env.NEXT_PUBLIC_HEDERA_NETWORK,
    mirrorNodeUrl: env.NEXT_PUBLIC_MIRROR_NODE_URL,
    operatorAccountId: env.HEDERA_ACCOUNT_ID,
    operatorPrivateKey: env.HEDERA_PRIVATE_KEY,
    operationTimeout: 10000, // 10 seconds
    maxRetries: 3,
    hcsTopicId: env.HCS_TOPIC_ID,
    htsTokenId: env.HTS_TOKEN_ID,
  };
}

/**
 * Creates and configures a Hedera SDK client with proper network settings
 *
 * @param config - Optional configuration override
 * @returns Configured Hedera Client instance
 * @throws {Error} When client configuration fails
 *
 * @example
 * ```typescript
 * const client = createHederaClient();
 *
 * // Custom configuration
 * const customClient = createHederaClient({
 *   networkType: 'mainnet',
 *   operationTimeout: 15000
 * });
 * ```
 *
 * @since 1.0.0
 */
export function createHederaClient(config?: Partial<HederaConfig>): Client {
  const hederaConfig = { ...getHederaConfig(), ...config };

  let client: Client;

  if (hederaConfig.networkType === 'testnet') {
    client = Client.forTestnet();
  } else {
    client = Client.forMainnet();
  }

  // Set operator account
  const operatorId = AccountId.fromString(hederaConfig.operatorAccountId);
  const operatorKey = PrivateKey.fromString(hederaConfig.operatorPrivateKey);

  client.setOperator(operatorId, operatorKey);

  // Configure timeouts
  client.setRequestTimeout(hederaConfig.operationTimeout);
  client.setMaxAttempts(hederaConfig.maxRetries);

  return client;
}

/**
 * Network-specific configuration constants
 */
export const NETWORK_CONFIG = {
  testnet: {
    mirrorNodeUrl: 'https://testnet.mirrornode.hedera.com',
    explorerUrl: 'https://hashscan.io/testnet',
    networkId: 'testnet',
  },
  mainnet: {
    mirrorNodeUrl: 'https://mainnet-public.mirrornode.hedera.com',
    explorerUrl: 'https://hashscan.io/mainnet',
    networkId: 'mainnet',
  },
} as const;

/**
 * Rate limiting configuration for different services
 */
export const RATE_LIMITS = {
  mirrorNode: {
    requestsPerSecond: 100,
    burstSize: 200,
  },
  hcs: {
    transactionsPerSecond: 10,
    burstSize: 20,
  },
  hts: {
    transactionsPerSecond: 10,
    burstSize: 20,
  },
} as const;
