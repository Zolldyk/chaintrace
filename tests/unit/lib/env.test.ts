/**
 * Tests for environment variable validation.
 */

import { describe, expect, it, beforeEach, vi } from 'vitest';

describe('env validation', () => {
  beforeEach(() => {
    // Clear modules cache to allow re-importing with different env vars
    vi.resetModules();
  });

  it('should validate required environment variables', async () => {
    // Set required environment variables
    process.env.HEDERA_ACCOUNT_ID = '0.0.12345';
    process.env.HEDERA_PRIVATE_KEY = 'test-private-key';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';

    const { env } = await import('@/lib/env');

    expect(env.HEDERA_ACCOUNT_ID).toBe('0.0.12345');
    expect(env.HEDERA_PRIVATE_KEY).toBe('test-private-key');
    expect(env.SUPABASE_URL).toBe('https://test.supabase.co');
    expect(env.SUPABASE_ANON_KEY).toBe('test-anon-key');
  });

  it('should use default values for optional variables', async () => {
    // Set only required variables
    process.env.HEDERA_ACCOUNT_ID = '0.0.12345';
    process.env.HEDERA_PRIVATE_KEY = 'test-private-key';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';

    const { env } = await import('@/lib/env');

    expect(env.NEXT_PUBLIC_HEDERA_NETWORK).toBe('testnet');
    expect(env.NEXT_PUBLIC_MIRROR_NODE_URL).toBe(
      'https://testnet.mirrornode.hedera.com'
    );
    expect(env.NEXT_PUBLIC_APP_URL).toBe('http://localhost:3000');
  });

  it('should validate Hedera account ID format', async () => {
    process.env.HEDERA_ACCOUNT_ID = 'invalid-format';
    process.env.HEDERA_PRIVATE_KEY = 'test-private-key';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';

    // Expect validation to throw an error
    await expect(async () => {
      await import('@/lib/env');
    }).rejects.toThrow();
  });

  it('should validate URL formats', async () => {
    process.env.HEDERA_ACCOUNT_ID = '0.0.12345';
    process.env.HEDERA_PRIVATE_KEY = 'test-private-key';
    process.env.SUPABASE_URL = 'invalid-url';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';

    // Expect validation to throw an error
    await expect(async () => {
      await import('@/lib/env');
    }).rejects.toThrow();
  });
});
