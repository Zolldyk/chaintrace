/**
 * HederaService Unit Tests
 *
 * Comprehensive unit tests for the main HederaService class including
 * connection validation, health checks, and service lifecycle management.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  HederaService,
  getHederaService,
  resetHederaService,
} from '@/services/hedera/HederaService';

// Mock the Hedera SDK
vi.mock('@hashgraph/sdk', () => ({
  Client: {
    forTestnet: vi.fn().mockReturnValue({
      setOperator: vi.fn(),
      setRequestTimeout: vi.fn(),
      setMaxAttempts: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
      operatorAccountId: '0.0.12345',
    }),
    forMainnet: vi.fn().mockReturnValue({
      setOperator: vi.fn(),
      setRequestTimeout: vi.fn(),
      setMaxAttempts: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
      operatorAccountId: '0.0.12345',
    }),
  },
  AccountId: {
    fromString: vi.fn().mockReturnValue('0.0.12345'),
  },
  PrivateKey: {
    fromString: vi.fn().mockReturnValue('mock-private-key'),
  },
  AccountBalanceQuery: vi.fn(),
  Status: {},
}));

// Mock the config
vi.mock('@/config/hedera', () => ({
  getHederaConfig: vi.fn(() => ({
    networkType: 'testnet',
    mirrorNodeUrl: 'https://testnet.mirrornode.hedera.com',
    operatorAccountId: '0.0.12345',
    operatorPrivateKey: 'test-private-key',
    operationTimeout: 10000,
    maxRetries: 3,
    hcsTopicId: '0.0.67890',
    htsTokenId: '0.0.54321',
  })),
  createHederaClient: vi.fn().mockReturnValue({
    setOperator: vi.fn(),
    setRequestTimeout: vi.fn(),
    setMaxAttempts: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
    operatorAccountId: '0.0.12345',
  }),
}));

describe('HederaService', () => {
  let mockBalance: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    resetHederaService();

    // Create mock balance
    mockBalance = {
      hbars: {
        toString: () => '10 ℏ',
        toTinybars: () => 1000000000,
      },
    };
  });

  afterEach(() => {
    resetHederaService();
  });

  describe('constructor', () => {
    it('should create HederaService with default configuration', () => {
      const service = new HederaService();
      expect(service).toBeInstanceOf(HederaService);
    });

    it('should create HederaService with custom options', () => {
      const customOptions = {
        networkType: 'mainnet' as const,
        debug: true,
      };

      const service = new HederaService(customOptions);
      expect(service).toBeInstanceOf(HederaService);
    });
  });

  describe('validateConnection', () => {
    it('should successfully validate connection with valid credentials', async () => {
      // Setup mock query
      const mockQuery = {
        setAccountId: vi.fn().mockReturnThis(),
        execute: vi
          .fn()
          .mockImplementation(
            () =>
              new Promise(resolve => setTimeout(() => resolve(mockBalance), 10))
          ),
      };
      const { AccountBalanceQuery } = await import('@hashgraph/sdk');
      vi.mocked(AccountBalanceQuery).mockImplementation(() => mockQuery as any);

      const service = new HederaService();
      const result = await service.validateConnection();

      expect(result.connected).toBe(true);
      expect(result.networkType).toBe('testnet');
      expect(result.balance).toEqual(mockBalance.hbars);
      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.error).toBeUndefined();
    });

    it('should handle connection failure gracefully', async () => {
      // Setup mock query to throw error
      const mockQuery = {
        setAccountId: vi.fn().mockReturnThis(),
        execute: vi
          .fn()
          .mockImplementation(
            () =>
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Network timeout')), 10)
              )
          ),
      };
      const { AccountBalanceQuery } = await import('@hashgraph/sdk');
      vi.mocked(AccountBalanceQuery).mockImplementation(() => mockQuery as any);

      const service = new HederaService();
      const result = await service.validateConnection();

      expect(result.connected).toBe(false);
      expect(result.networkType).toBe('testnet');
      expect(result.error).toBe('Network timeout');
      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.balance).toBeUndefined();
    });
  });

  describe('checkServiceHealth', () => {
    it('should return health status for all services', async () => {
      // Setup successful connection
      const mockQuery = {
        setAccountId: vi.fn().mockReturnThis(),
        execute: vi
          .fn()
          .mockImplementation(
            () =>
              new Promise(resolve => setTimeout(() => resolve(mockBalance), 10))
          ),
      };
      const { AccountBalanceQuery } = await import('@hashgraph/sdk');
      vi.mocked(AccountBalanceQuery).mockImplementation(() => mockQuery as any);

      const service = new HederaService();
      const healthChecks = await service.checkServiceHealth();

      expect(healthChecks).toHaveLength(1); // Currently only SDK check
      expect(healthChecks[0].service).toBe('Hedera SDK');
      expect(healthChecks[0].status).toBe('healthy');
      expect(healthChecks[0].responseTime).toBeGreaterThan(0);
      expect(healthChecks[0].timestamp).toBeInstanceOf(Date);
    });

    it('should report unhealthy status on connection failure', async () => {
      // Setup failed connection
      const mockQuery = {
        setAccountId: vi.fn().mockReturnThis(),
        execute: vi.fn().mockRejectedValue(new Error('Connection failed')),
      };
      const { AccountBalanceQuery } = await import('@hashgraph/sdk');
      vi.mocked(AccountBalanceQuery).mockImplementation(() => mockQuery as any);

      const service = new HederaService();
      const healthChecks = await service.checkServiceHealth();

      expect(healthChecks[0].status).toBe('unhealthy');
      expect(healthChecks[0].error).toBe('Connection failed');
    });
  });

  describe('service lifecycle', () => {
    it('should not be ready initially', () => {
      const service = new HederaService();
      expect(service.isReady()).toBe(false);
    });

    it('should be ready after successful connection validation', async () => {
      // Setup successful connection
      const mockQuery = {
        setAccountId: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue(mockBalance),
      };
      const { AccountBalanceQuery } = await import('@hashgraph/sdk');
      vi.mocked(AccountBalanceQuery).mockImplementation(() => mockQuery as any);

      const service = new HederaService();
      await service.validateConnection();

      expect(service.isReady()).toBe(true);
    });

    it('should throw error when getting client before initialization', () => {
      const service = new HederaService();

      expect(() => service.getClient()).toThrow(
        'HederaService not initialized. Call validateConnection() first.'
      );
    });

    it('should return client after initialization', async () => {
      // Setup successful connection
      const mockQuery = {
        setAccountId: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue(mockBalance),
      };
      const { AccountBalanceQuery } = await import('@hashgraph/sdk');
      vi.mocked(AccountBalanceQuery).mockImplementation(() => mockQuery as any);

      const service = new HederaService();
      await service.validateConnection();

      const client = service.getClient();
      expect(client).toBeDefined();
      expect(client.operatorAccountId).toBe('0.0.12345');
    });

    it('should close client connection successfully', async () => {
      const service = new HederaService();
      await expect(service.close()).resolves.toBeUndefined();
      expect(service.isReady()).toBe(false);
    });
  });

  describe('configuration', () => {
    it('should return configuration copy', () => {
      const service = new HederaService();
      const config = service.getConfig();

      expect(config.networkType).toBe('testnet');
      expect(config.operatorAccountId).toBe('0.0.12345');

      // Ensure it's a copy, not reference
      config.networkType = 'mainnet';
      expect(service.getConfig().networkType).toBe('testnet');
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance on multiple calls', () => {
      const service1 = getHederaService();
      const service2 = getHederaService();

      expect(service1).toBe(service2);
    });

    it('should create new instance after reset', () => {
      const service1 = getHederaService();
      resetHederaService();
      const service2 = getHederaService();

      expect(service1).not.toBe(service2);
    });

    it('should pass options to new singleton instance', () => {
      const options = { debug: true };
      const service = getHederaService(options);

      expect(service).toBeInstanceOf(HederaService);
    });
  });
});
