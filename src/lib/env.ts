/**
 * Environment variable validation utility for ChainTrace application.
 * Validates all required environment variables and provides typed access.
 *
 * @example
 * ```typescript
 * import { env } from '@/lib/env';
 *
 * // Type-safe access to environment variables
 * console.log(env.NEXT_PUBLIC_HEDERA_NETWORK); // 'testnet' | 'mainnet'
 * console.log(env.SUPABASE_URL); // string
 * ```
 *
 * @since 1.0.0
 */

import { z } from 'zod';

/**
 * Environment variable validation schema using Zod.
 * Defines required types and validation rules for all environment variables.
 */
const envSchema = z.object({
  // Hedera Network Configuration
  NEXT_PUBLIC_HEDERA_NETWORK: z
    .enum(['testnet', 'mainnet'])
    .default('testnet')
    .describe('Hedera network environment'),

  NEXT_PUBLIC_MIRROR_NODE_URL: z
    .string()
    .url()
    .default('https://testnet.mirrornode.hedera.com')
    .describe('Hedera Mirror Node API endpoint'),

  HEDERA_ACCOUNT_ID: z
    .string()
    .regex(/^0\.0\.\d+$/, 'Invalid Hedera account ID format')
    .describe('Hedera operator account ID'),

  HEDERA_PRIVATE_KEY: z
    .string()
    .min(1)
    .describe('Hedera operator private key (DER encoded)'),

  // Supabase Configuration
  SUPABASE_URL: z.string().url().describe('Supabase project URL'),

  SUPABASE_ANON_KEY: z
    .string()
    .min(1)
    .describe('Supabase anonymous public key'),

  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1)
    .optional()
    .describe('Supabase service role key for server operations'),

  // Custom Compliance Engine
  GUARDIAN_API_URL: z
    .string()
    .url()
    .default('https://guardian-api.hedera.com')
    .describe('Guardian API endpoint for compliance validation'),

  GUARDIAN_API_KEY: z
    .string()
    .min(1)
    .optional()
    .describe('Guardian API authentication key'),

  // Application Configuration
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url()
    .default('http://localhost:3000')
    .describe('Application base URL'),

  JWT_SECRET: z
    .string()
    .min(32)
    .optional()
    .describe('JWT secret for session management'),

  // Optional Services
  VERCEL_ANALYTICS_ID: z
    .string()
    .optional()
    .describe('Vercel Analytics project ID'),

  SENTRY_DSN: z
    .string()
    .url()
    .optional()
    .describe('Sentry DSN for error tracking'),

  // Development Configuration
  DEBUG: z
    .string()
    .optional()
    .transform(val => val === 'true')
    .describe('Enable debug logging'),

  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development')
    .describe('Node.js environment'),

  // Security Configuration
  CORS_ORIGINS: z
    .string()
    .optional()
    .transform(val => val?.split(',') || [])
    .describe('Allowed CORS origins (comma-separated)'),

  RATE_LIMIT_RPM: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : 100))
    .describe('Rate limit requests per minute'),
});

/**
 * Validated environment variables with proper types.
 * All variables are validated at application startup.
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Validates environment variables and returns typed configuration object.
 *
 * @throws {z.ZodError} When required environment variables are missing or invalid
 * @returns Validated environment configuration
 *
 * @example
 * ```typescript
 * try {
 *   const config = validateEnv();
 *   console.log('Environment validation passed');
 * } catch (error) {
 *   console.error('Environment validation failed:', error.message);
 *   process.exit(1);
 * }
 * ```
 */
function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join('\n');

      throw new Error(
        `Environment variable validation failed:\n${missingVars}\n\n` +
          'Please check your .env.local file and ensure all required variables are set.\n' +
          'See .env.example for a complete list of required variables.'
      );
    }
    throw error as Error;
  }
}

/**
 * Validated and typed environment variables.
 * Access all environment variables through this object for type safety.
 *
 * @example
 * ```typescript
 * import { env } from '@/lib/env';
 *
 * // Type-safe access
 * const network = env.NEXT_PUBLIC_HEDERA_NETWORK; // 'testnet' | 'mainnet'
 * const supabaseUrl = env.SUPABASE_URL; // string
 * const isDebug = env.DEBUG; // boolean
 * ```
 */
export const env = validateEnv();

/**
 * Checks if the application is running in development mode.
 *
 * @returns True if NODE_ENV is 'development'
 */
export const isDevelopment = () => env.NODE_ENV === 'development';

/**
 * Checks if the application is running in production mode.
 *
 * @returns True if NODE_ENV is 'production'
 */
export const isProduction = () => env.NODE_ENV === 'production';

/**
 * Checks if the application is running in test mode.
 *
 * @returns True if NODE_ENV is 'test'
 */
export const isTest = () => env.NODE_ENV === 'test';

/**
 * Gets the Hedera network configuration for client initialization.
 *
 * @returns Network configuration object
 *
 * @example
 * ```typescript
 * const networkConfig = getHederaNetworkConfig();
 * const client = Client.forNetwork(networkConfig.nodes);
 * ```
 */
export const getHederaNetworkConfig = () => {
  const isMainnet = env.NEXT_PUBLIC_HEDERA_NETWORK === 'mainnet';

  return {
    network: env.NEXT_PUBLIC_HEDERA_NETWORK,
    mirrorNodeUrl: env.NEXT_PUBLIC_MIRROR_NODE_URL,
    nodes: isMainnet
      ? { '35.237.200.180:50211': '0.0.3' } // Mainnet node
      : { '34.94.106.61:50211': '0.0.3' }, // Testnet node
    operatorId: env.HEDERA_ACCOUNT_ID,
    operatorKey: env.HEDERA_PRIVATE_KEY,
  };
};

// Validate environment variables at module load time
// This ensures the application fails fast if configuration is invalid
if (typeof window === 'undefined') {
  // Only validate on server-side to avoid exposing secrets to client
  try {
    validateEnv();
    console.log('✅ Environment variables validated successfully');
  } catch (error) {
    console.error(
      '❌ Environment validation failed:',
      (error as Error).message
    );
    if (env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}
