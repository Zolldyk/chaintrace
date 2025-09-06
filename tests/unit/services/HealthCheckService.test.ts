/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import {
  HealthCheckService,
  getHealthCheckService,
  resetHealthCheckService,
  type HealthCheckConfig,
} from '../../../src/services/health/HealthCheckService';

// Mock fetch globally
const mockFetch = vi.fn() as Mock;
global.fetch = mockFetch;

// Mock environment variables
const mockEnv = {
  OPERATOR_ID: '0.0.6628267',
  OPERATOR_KEY: 'test-private-key',
  HEDERA_ACCOUNT_ID: '0.0.6628267',
  HEDERA_PRIVATE_KEY: 'test-private-key',
  NEXT_PUBLIC_HEDERA_NETWORK: 'testnet',
  NEXT_PUBLIC_MIRROR_NODE_URL: 'https://testnet.mirrornode.hedera.com',
  HCS_TOPIC_ID: '0.0.6714150',
  HTS_TOKEN_ID: '0.0.6715040',
  NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-supabase-key',
  COMPLIANCE_ENGINE_URL: 'https://test-compliance.example.com',
  COMPLIANCE_API_KEY: 'test-compliance-key',
};

// Mock Hedera SDK
vi.mock('@hashgraph/sdk', () => ({
  Client: {
    forTestnet: vi.fn(),
  },
  AccountId: {
    fromString: vi.fn(id => ({ toString: () => id })),
  },
  PrivateKey: {
    fromString: vi.fn(key => key),
  },
  AccountBalanceQuery: vi.fn(),
}));

// Import mocked Client and AccountBalanceQuery for reference
import { Client, AccountBalanceQuery } from '@hashgraph/sdk';
const mockedClient = vi.mocked(Client);
const mockedAccountBalanceQuery = vi.mocked(AccountBalanceQuery);

// Create a configurable ComplianceService mock
const mockComplianceHealthCheck = vi.fn().mockResolvedValue({
  status: 'healthy',
  responseTime: 150,
  timestamp: '2024-01-01T12:00:00Z',
});

// Mock ComplianceService
vi.mock('../../../src/services/hedera/ComplianceService', () => ({
  ComplianceService: vi.fn().mockImplementation(() => ({
    healthCheck: mockComplianceHealthCheck,
  })),
}));

describe('HealthCheckService', () => {
  let healthCheckService: HealthCheckService;
  let mockConfig: HealthCheckConfig;

  beforeEach(() => {
    // Reset environment variables
    Object.entries(mockEnv).forEach(([key, value]) => {
      process.env[key] = value;
    });

    mockConfig = {
      timeout: 10000,
      parallel: true,
      services: ['hedera', 'mirror-node', 'compliance'],
      criticalServices: ['hedera', 'mirror-node'],
    };

    healthCheckService = new HealthCheckService(mockConfig);

    // Reset mocks
    mockFetch.mockReset();
    resetHealthCheckService();
  });

  afterEach(() => {
    vi.clearAllTimers();
    // Clean up environment variables
    Object.keys(mockEnv).forEach(key => {
      delete process.env[key];
    });
  });

  describe('constructor', () => {
    it('should create instance with default configuration', () => {
      const service = new HealthCheckService();
      expect(service).toBeInstanceOf(HealthCheckService);
    });

    it('should create instance with custom configuration', () => {
      const service = new HealthCheckService({
        timeout: 5000,
        services: ['hedera', 'mirror-node'],
      });

      expect(service.getConfig().timeout).toBe(5000);
      expect(service.getConfig().services).toEqual(['hedera', 'mirror-node']);
    });

    it('should merge configuration with defaults', () => {
      const service = new HealthCheckService({ timeout: 15000 });
      const config = service.getConfig();

      expect(config.timeout).toBe(15000);
      expect(config.parallel).toBe(true); // Default value
      expect(config.services).toEqual([
        'hedera',
        'mirror-node',
        'hcs',
        'hts',
        'compliance',
        'database',
      ]); // Default
    });
  });

  describe('checkOverallHealth', () => {
    it('should return healthy status when all services are healthy', async () => {
      // Mock successful responses for all services
      setupSuccessfulMocks();

      const result = await healthCheckService.checkOverallHealth();

      expect(result.status).toBe('healthy');
      expect(result.totalServices).toBeGreaterThan(0);
      expect(result.healthyServices).toBe(result.totalServices);
      expect(result.unhealthyServices).toBe(0);
      expect(result.services).toHaveLength(result.totalServices);
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThan(0);
    });

    it('should return degraded status when non-critical services are unhealthy', async () => {
      // Reset mocks and set up specific responses for each service
      mockFetch.mockReset();

      // Mock Compliance service to fail (non-critical service)
      mockComplianceHealthCheck.mockResolvedValueOnce({
        status: 'unhealthy',
        responseTime: 5000,
        timestamp: '2024-01-01T12:00:00Z',
        error: 'Compliance service down',
      });

      // Mock responses for other services - all succeed:
      // Mirror Node - success (critical service)
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ current_rate: { hbar_equivalent: 12 } }),
      });

      // Mock Hedera SDK success (critical service)
      mockHederaSDKSuccess();

      const result = await healthCheckService.checkOverallHealth();

      expect(result.status).toBe('degraded'); // Should be degraded since compliance service is unhealthy
      expect(result.healthyServices).toBeGreaterThan(0);
      expect(result.unhealthyServices).toBeGreaterThan(0);
    });

    it('should return unhealthy status when critical services are down', async () => {
      // Mock critical service failure
      mockFetch.mockRejectedValue(new Error('Mirror Node down'));
      mockHederaSDKFailure();

      const result = await healthCheckService.checkOverallHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.unhealthyServices).toBeGreaterThan(0);
    });

    it('should handle parallel execution correctly', async () => {
      const parallelService = new HealthCheckService({
        ...mockConfig,
        parallel: true,
      });
      setupSuccessfulMocks();

      const startTime = Date.now();
      const result = await parallelService.checkOverallHealth();
      const duration = Date.now() - startTime;

      expect(result.status).toBeDefined();
      expect(duration).toBeLessThan(5000); // Should be faster than sequential
    });

    it('should handle sequential execution correctly', async () => {
      const sequentialService = new HealthCheckService({
        ...mockConfig,
        parallel: false,
      });
      setupSuccessfulMocks();

      const result = await sequentialService.checkOverallHealth();

      expect(result.status).toBeDefined();
      expect(result.totalServices).toBeGreaterThan(0);
    });

    it('should calculate response times correctly', async () => {
      setupSuccessfulMocks();

      const result = await healthCheckService.checkOverallHealth();

      expect(result.totalResponseTime).toBeGreaterThan(0);
      result.services.forEach(service => {
        expect(service.responseTime).toBeGreaterThan(0);
      });
    });
  });

  describe('checkHederaHealth', () => {
    it('should return healthy status with sufficient balance', async () => {
      mockHederaSDKSuccess(5.0); // 5 HBAR balance

      const result = await healthCheckService.checkHederaHealth();

      expect(result.service).toBe('hedera');
      expect(result.status).toBe('healthy');
      expect(result.critical).toBe(true);
      expect(result.details?.balance).toContain('5.0000 HBAR');
      expect(result.details?.hasInsufficientBalance).toBe(false);
    });

    it('should return degraded status with low balance', async () => {
      mockHederaSDKSuccess(0.5); // 0.5 HBAR balance (below 1 HBAR threshold)

      const result = await healthCheckService.checkHederaHealth();

      expect(result.service).toBe('hedera');
      expect(result.status).toBe('degraded');
      expect(result.details?.hasInsufficientBalance).toBe(true);
    });

    it('should return unhealthy status when credentials are missing', async () => {
      delete process.env.OPERATOR_ID;
      delete process.env.HEDERA_ACCOUNT_ID;

      const result = await healthCheckService.checkHederaHealth();

      expect(result.service).toBe('hedera');
      expect(result.status).toBe('unhealthy');
      expect(result.error).toContain('credentials not configured');
    });

    it('should return unhealthy status on connection failure', async () => {
      mockHederaSDKFailure();

      const result = await healthCheckService.checkHederaHealth();

      expect(result.service).toBe('hedera');
      expect(result.status).toBe('unhealthy');
      expect(result.error).toBeDefined();
    });

    it('should return degraded status on slow response', async () => {
      mockHederaSDKSuccess(5.0, 12000); // 12 second response time

      const result = await healthCheckService.checkHederaHealth();

      expect(result.service).toBe('hedera');
      expect(result.status).toBe('degraded');
      expect(result.responseTime).toBeGreaterThan(10000);
    }, 15000); // 15 second timeout
  });

  describe('checkMirrorNodeHealth', () => {
    it('should return healthy status on successful response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          current_rate: { hbar_equivalent: 12 },
          next_rate: { hbar_equivalent: 12 },
        }),
      });

      const result = await healthCheckService.checkMirrorNodeHealth();

      expect(result.service).toBe('mirror-node');
      expect(result.status).toBe('healthy');
      expect(result.critical).toBe(true);
      expect(result.details?.endpoint).toBe(
        'https://testnet.mirrornode.hedera.com'
      );
      expect(result.details?.exchangeRate).toBeDefined();
    });

    it('should return degraded status on slow response', async () => {
      // Mock slow response
      mockFetch.mockImplementationOnce(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ current_rate: { hbar_equivalent: 12 } }),
                }),
              6000
            )
          )
      );

      const result = await healthCheckService.checkMirrorNodeHealth();

      expect(result.service).toBe('mirror-node');
      expect(result.status).toBe('degraded');
      expect(result.responseTime).toBeGreaterThan(5000);
    }, 8000); // 8 second timeout

    it('should return unhealthy status on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await healthCheckService.checkMirrorNodeHealth();

      expect(result.service).toBe('mirror-node');
      expect(result.status).toBe('unhealthy');
      expect(result.error).toContain('Mirror Node returned 500');
    });

    it('should return unhealthy status on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await healthCheckService.checkMirrorNodeHealth();

      expect(result.service).toBe('mirror-node');
      expect(result.status).toBe('unhealthy');
      expect(result.error).toContain('Network error');
    });
  });

  describe('checkHCSHealth', () => {
    it('should return healthy status when topic is accessible', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          topic_id: '0.0.6714150',
          memo: 'ChainTrace Product Events Topic',
        }),
      });

      const result = await healthCheckService.checkHCSHealth();

      expect(result.service).toBe('hcs');
      expect(result.status).toBe('healthy');
      expect(result.critical).toBe(false);
      expect(result.details?.topicId).toBe('0.0.6714150');
      expect(result.details?.topicMemo).toBeDefined();
    });

    it('should return unhealthy status when topic ID is not configured', async () => {
      delete process.env.HCS_TOPIC_ID;

      const result = await healthCheckService.checkHCSHealth();

      expect(result.service).toBe('hcs');
      expect(result.status).toBe('unhealthy');
      expect(result.error).toContain('HCS topic ID not configured');
    });

    it('should return unhealthy status when topic query fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await healthCheckService.checkHCSHealth();

      expect(result.service).toBe('hcs');
      expect(result.status).toBe('unhealthy');
      expect(result.error).toContain('HCS topic query failed: 404');
    });
  });

  describe('checkHTSHealth', () => {
    it('should return healthy status when token is accessible', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token_id: '0.0.6715040',
          name: 'ChainTrace Token',
          symbol: 'CTRACE',
          total_supply: '1000000',
        }),
      });

      const result = await healthCheckService.checkHTSHealth();

      expect(result.service).toBe('hts');
      expect(result.status).toBe('healthy');
      expect(result.critical).toBe(false);
      expect(result.details?.tokenId).toBe('0.0.6715040');
      expect(result.details?.tokenName).toBe('ChainTrace Token');
      expect(result.details?.tokenSymbol).toBe('CTRACE');
    });

    it('should return unhealthy status when token ID is not configured', async () => {
      delete process.env.HTS_TOKEN_ID;

      const result = await healthCheckService.checkHTSHealth();

      expect(result.service).toBe('hts');
      expect(result.status).toBe('unhealthy');
      expect(result.error).toContain('HTS token ID not configured');
    });
  });

  describe('checkComplianceHealth', () => {
    it('should return healthy status when compliance service is available', async () => {
      const result = await healthCheckService.checkComplianceHealth();

      expect(result.service).toBe('compliance');
      expect(result.status).toBe('healthy');
      expect(result.critical).toBe(false);
      expect(result.responseTime).toBe(150);
    });
  });

  describe('checkDatabaseHealth', () => {
    it('should return healthy status when database is accessible', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await healthCheckService.checkDatabaseHealth();

      expect(result.service).toBe('database');
      expect(result.status).toBe('healthy');
      expect(result.critical).toBe(false);
      expect(result.details?.provider).toBe('supabase');
    });

    it('should return unhealthy status when database configuration is missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const result = await healthCheckService.checkDatabaseHealth();

      expect(result.service).toBe('database');
      expect(result.status).toBe('unhealthy');
      expect(result.error).toContain('Supabase configuration missing');
    });

    it('should return degraded status on slow database response', async () => {
      mockFetch.mockImplementationOnce(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({}),
                }),
              3000
            )
          )
      );

      const result = await healthCheckService.checkDatabaseHealth();

      expect(result.service).toBe('database');
      expect(result.status).toBe('degraded');
      expect(result.responseTime).toBeGreaterThan(2000);
    });
  });

  describe('getUptime', () => {
    it('should return uptime in milliseconds', async () => {
      // Add small delay to ensure uptime > 0
      await new Promise(resolve => setTimeout(resolve, 1));
      const uptime = healthCheckService.getUptime();
      expect(uptime).toBeGreaterThan(0);
      expect(typeof uptime).toBe('number');
    });
  });

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const config = healthCheckService.getConfig();

      expect(config.timeout).toBe(mockConfig.timeout);
      expect(config.parallel).toBe(mockConfig.parallel);
      expect(config.services).toEqual(mockConfig.services);
      expect(config.criticalServices).toEqual(mockConfig.criticalServices);
    });
  });

  describe('singleton functions', () => {
    it('should return same instance from getHealthCheckService', () => {
      const instance1 = getHealthCheckService();
      const instance2 = getHealthCheckService();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance with config', () => {
      const instance1 = getHealthCheckService();
      const instance2 = getHealthCheckService({ timeout: 5000 });

      expect(instance1).not.toBe(instance2);
    });

    it('should reset singleton instance', () => {
      const instance1 = getHealthCheckService();
      resetHealthCheckService();
      const instance2 = getHealthCheckService();

      expect(instance1).not.toBe(instance2);
    });
  });

  // Helper functions
  function setupSuccessfulMocks() {
    // Mock Mirror Node success with small delay for response time
    mockFetch.mockImplementation(
      () =>
        new Promise(
          resolve =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    current_rate: { hbar_equivalent: 12 },
                    topic_id: '0.0.6714150',
                    memo: 'Test topic',
                    token_id: '0.0.6715040',
                    name: 'CTRACE',
                    symbol: 'CTRACE',
                  }),
                }),
              10
            ) // 10ms delay to ensure responseTime > 0
        )
    );

    // Mock Hedera SDK success with small delay
    mockHederaSDKSuccess(5.0, 10); // 10ms delay
  }

  function mockHederaSDKSuccess(balance = 5.0, delay = 100) {
    const mockClient = {
      setOperator: vi.fn(),
    };

    const mockBalanceQueryInstance = {
      setAccountId: vi.fn().mockReturnThis(),
      execute: vi.fn().mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  hbars: {
                    toTinybars: () => ({
                      toNumber: () => balance * 100000000, // Convert to tinybars
                    }),
                  },
                }),
              delay
            )
          )
      ),
    };

    // Use the mocked Client reference
    mockedClient.forTestnet.mockReturnValue(mockClient as any);
    mockedAccountBalanceQuery.mockImplementation(
      () => mockBalanceQueryInstance as any
    );
  }

  function mockHederaSDKFailure() {
    const mockClient = {
      setOperator: vi.fn(),
    };

    const mockBalanceQueryInstance = {
      setAccountId: vi.fn().mockReturnThis(),
      execute: vi.fn().mockRejectedValue(new Error('Connection failed')),
    };

    // Use the mocked Client reference
    mockedClient.forTestnet.mockReturnValue(mockClient as any);
    mockedAccountBalanceQuery.mockImplementation(
      () => mockBalanceQueryInstance as any
    );
  }
});
