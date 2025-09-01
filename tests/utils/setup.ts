/**
 * Test setup configuration for Vitest.
 * Sets up testing environment and global configurations.
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables for tests
process.env.NEXT_PUBLIC_HEDERA_NETWORK = 'testnet';
process.env.NEXT_PUBLIC_MIRROR_NODE_URL =
  'https://testnet.mirrornode.hedera.com';
process.env.HEDERA_ACCOUNT_ID = '0.0.12345';
process.env.HEDERA_PRIVATE_KEY = 'test-private-key';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.GUARDIAN_API_URL = 'https://guardian-api.hedera.com';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Mock Next.js image component
vi.mock('next/image', () => ({
  default: (props: any) => {
    return props;
  },
}));

// Global test utilities
global.console = {
  ...console,
  // Uncomment to silence console during tests
  // log: vi.fn(),
  // debug: vi.fn(),
  // info: vi.fn(),
  // warn: vi.fn(),
  // error: vi.fn(),
};
