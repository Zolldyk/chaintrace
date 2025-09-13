/**
 * Database configuration for ChainTrace application
 * Supabase PostgreSQL setup with connection management
 *
 * @since 1.0.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
  /** Supabase project URL */
  url: string;

  /** Supabase anon key */
  anonKey: string;

  /** Service role key for server-side operations */
  serviceRoleKey?: string;

  /** Database schema name */
  schema: string;

  /** Connection pool configuration */
  poolSize: number;

  /** Query timeout in milliseconds */
  timeout: number;
}

/**
 * Environment variable validation schema for database
 */
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'Supabase anon key is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  DATABASE_SCHEMA: z.string().default('public'),
});

/**
 * Get validated database configuration from environment
 */
export function getDatabaseConfig(): DatabaseConfig {
  const env = envSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    DATABASE_SCHEMA: process.env.DATABASE_SCHEMA,
  });

  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    schema: env.DATABASE_SCHEMA,
    poolSize: 10,
    timeout: 30000, // 30 seconds
  };
}

/**
 * Create Supabase client for client-side operations
 */
export function createSupabaseClient(): SupabaseClient {
  const config = getDatabaseConfig();

  return createClient(config.url, config.anonKey, {
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'X-Client-Info': 'chaintrace@1.0.0',
      },
    },
  });
}

/**
 * Create Supabase client for server-side operations (with service role key)
 */
export function createSupabaseServiceClient(): SupabaseClient {
  const config = getDatabaseConfig();

  if (!config.serviceRoleKey) {
    throw new Error('Service role key is required for server-side operations');
  }

  return createClient(config.url, config.serviceRoleKey, {
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'X-Client-Info': 'chaintrace-server@1.0.0',
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Database table names
 */
export const DB_TABLES = {
  CREDENTIALS: 'compliance_credentials',
  CREDENTIAL_TIMELINE: 'credential_timeline',
  PRODUCTS: 'products',
  PRODUCT_EVENTS: 'product_events',
} as const;
