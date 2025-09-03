/**
 * Service for monitoring health and availability of all ChainTrace services.
 *
 * Provides comprehensive health checking functionality for Hedera services,
 * external APIs, database connections, and application components with
 * performance monitoring and fallback mechanisms.
 *
 * @class HealthCheckService
 *
 * @example
 * ```typescript
 * const healthService = new HealthCheckService();
 *
 * // Check overall system health
 * const overallHealth = await healthService.checkOverallHealth();
 * console.log(`System Status: ${overallHealth.status}`);
 *
 * // Check specific service health
 * const mirrorNodeHealth = await healthService.checkMirrorNodeHealth();
 * console.log(`Mirror Node: ${mirrorNodeHealth.status}`);
 * ```
 *
 * @since 1.0.0
 */

import { ComplianceService } from '@/services/hedera/ComplianceService';
import { NetworkError } from '@/lib/errors';
import { logger } from '@/lib/logger';

/**
 * Health status enumeration.
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

/**
 * Health check result interface.
 */
export interface HealthCheckResult {
  /** Service or component name */
  service: string;
  /** Current health status */
  status: HealthStatus;
  /** Response time in milliseconds */
  responseTime: number;
  /** Timestamp of health check */
  timestamp: string;
  /** Additional details about the health check */
  details?: Record<string, any>;
  /** Error message if unhealthy */
  error?: string;
  /** Whether the service is critical to system operation */
  critical: boolean;
}

/**
 * Overall system health summary.
 */
export interface SystemHealthSummary {
  /** Overall system status */
  status: HealthStatus;
  /** Total response time for all checks */
  totalResponseTime: number;
  /** Number of healthy services */
  healthyServices: number;
  /** Number of degraded services */
  degradedServices: number;
  /** Number of unhealthy services */
  unhealthyServices: number;
  /** Total number of services checked */
  totalServices: number;
  /** Timestamp of health check */
  timestamp: string;
  /** Individual service health results */
  services: HealthCheckResult[];
  /** System uptime in milliseconds */
  uptime: number;
}

/**
 * Health check configuration.
 */
export interface HealthCheckConfig {
  /** Timeout for individual health checks in milliseconds */
  timeout: number;
  /** Whether to run health checks in parallel */
  parallel: boolean;
  /** Services to include in health checks */
  services: string[];
  /** Critical services that affect overall system status */
  criticalServices: string[];
}

/**
 * Default health check configuration.
 */
const DEFAULT_HEALTH_CONFIG: HealthCheckConfig = {
  timeout: 10000,
  parallel: true,
  services: ['hedera', 'mirror-node', 'hcs', 'hts', 'compliance', 'database'],
  criticalServices: ['hedera', 'mirror-node'],
};

/**
 * Service health monitoring and checking implementation.
 */
export class HealthCheckService {
  private config: HealthCheckConfig;
  private startTime: number;
  private serviceInstances: Map<string, any>;

  constructor(config: Partial<HealthCheckConfig> = {}) {
    this.config = { ...DEFAULT_HEALTH_CONFIG, ...config };
    this.startTime = Date.now();
    this.serviceInstances = new Map();

    this.initializeServiceInstances();
  }

  /**
   * Initializes service instances for health checking.
   *
   * @private
   */
  private initializeServiceInstances() {
    try {
      // Initialize Hedera services for health checking
      // Note: Using test configuration for health checks
      this.serviceInstances.set(
        'compliance',
        new ComplianceService({
          baseUrl: process.env.COMPLIANCE_ENGINE_URL || 'http://localhost:3001',
          apiKey: process.env.COMPLIANCE_API_KEY || 'dev-key-123',
          timeout: this.config.timeout,
        })
      );
    } catch (error) {
      logger.error(
        'Failed to initialize some service instances for health checks',
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'HealthCheckService',
        }
      );
    }
  }

  /**
   * Checks the overall health of all configured services.
   *
   * @returns Promise resolving to system health summary
   *
   * @example
   * ```typescript
   * const health = await healthService.checkOverallHealth();
   * if (health.status === 'healthy') {
   *   console.log('All systems operational');
   * } else {
   *   console.log(`${health.unhealthyServices} services need attention`);
   * }
   * ```
   *
   * @since 1.0.0
   */
  async checkOverallHealth(): Promise<SystemHealthSummary> {
    const startTime = Date.now();

    // Run individual service health checks
    const healthChecks = this.config.services.map(serviceName =>
      this.checkServiceHealth(serviceName)
    );

    let results: HealthCheckResult[];

    if (this.config.parallel) {
      results = await Promise.allSettled(healthChecks).then(settled =>
        settled.map(result =>
          result.status === 'fulfilled'
            ? result.value
            : this.createFailedHealthResult('unknown', 'Health check failed')
        )
      );
    } else {
      results = [];
      for (const check of healthChecks) {
        try {
          const result = await check;
          results.push(result);
        } catch (error) {
          results.push(
            this.createFailedHealthResult('unknown', 'Health check failed')
          );
        }
      }
    }

    // Calculate summary statistics
    const totalResponseTime = Date.now() - startTime;
    const healthyServices = results.filter(r => r.status === 'healthy').length;
    const degradedServices = results.filter(
      r => r.status === 'degraded'
    ).length;
    const unhealthyServices = results.filter(
      r => r.status === 'unhealthy'
    ).length;

    // Determine overall system status
    let overallStatus: HealthStatus = 'healthy';

    // Check if any critical services are unhealthy
    const criticalServiceResults = results.filter(r =>
      this.config.criticalServices.includes(r.service)
    );
    const unhealthyCriticalServices = criticalServiceResults.filter(
      r => r.status === 'unhealthy'
    );

    if (unhealthyCriticalServices.length > 0) {
      overallStatus = 'unhealthy';
    } else if (unhealthyServices > 0 || degradedServices > results.length / 2) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      totalResponseTime,
      healthyServices,
      degradedServices,
      unhealthyServices,
      totalServices: results.length,
      timestamp: new Date().toISOString(),
      services: results,
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Checks health of a specific service.
   *
   * @param serviceName - Name of service to check
   * @returns Promise resolving to health check result
   *
   * @private
   */
  private async checkServiceHealth(
    serviceName: string
  ): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      switch (serviceName) {
        case 'hedera':
          return await this.checkHederaHealth();
        case 'mirror-node':
          return await this.checkMirrorNodeHealth();
        case 'hcs':
          return await this.checkHCSHealth();
        case 'hts':
          return await this.checkHTSHealth();
        case 'compliance':
          return await this.checkComplianceHealth();
        case 'database':
          return await this.checkDatabaseHealth();
        default:
          return this.createFailedHealthResult(
            serviceName,
            `Unknown service: ${serviceName}`
          );
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        service: serviceName,
        status: 'unhealthy',
        responseTime,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        critical: this.config.criticalServices.includes(serviceName),
      };
    }
  }

  /**
   * Checks Hedera SDK connection health.
   *
   * @returns Promise resolving to Hedera health check result
   *
   * @example
   * ```typescript
   * const hederaHealth = await healthService.checkHederaHealth();
   * console.log(`Hedera Network: ${hederaHealth.status}`);
   * console.log(`Response Time: ${hederaHealth.responseTime}ms`);
   * ```
   *
   * @since 1.0.0
   */
  async checkHederaHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Create a lightweight test client
      const { Client, AccountId, PrivateKey, AccountBalanceQuery } =
        await import('@hashgraph/sdk');

      const operatorId =
        process.env.OPERATOR_ID || process.env.HEDERA_ACCOUNT_ID;
      const operatorKey =
        process.env.OPERATOR_KEY || process.env.HEDERA_PRIVATE_KEY;

      if (!operatorId || !operatorKey) {
        return {
          service: 'hedera',
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          error: 'Hedera credentials not configured',
          critical: true,
        };
      }

      const client = Client.forTestnet();
      client.setOperator(
        AccountId.fromString(operatorId),
        PrivateKey.fromString(operatorKey)
      );

      // Test connection with a simple balance query
      const accountId = AccountId.fromString(operatorId);
      const balance = await new AccountBalanceQuery()
        .setAccountId(accountId)
        .execute(client);

      const responseTime = Date.now() - startTime;

      // Determine status based on response time and balance
      let status: HealthStatus = 'healthy';
      if (responseTime > 10000) {
        status = 'degraded';
      }

      // Check if we have sufficient balance for operations (threshold: 1 HBAR)
      const hbarBalance = balance.hbars.toTinybars().toNumber() / 100000000; // Convert to HBAR
      const hasInsufficientBalance = hbarBalance < 1;

      return {
        service: 'hedera',
        status: hasInsufficientBalance ? 'degraded' : status,
        responseTime,
        timestamp: new Date().toISOString(),
        details: {
          accountId: operatorId,
          balance: `${hbarBalance.toFixed(4)} HBAR`,
          networkType: 'testnet',
          hasInsufficientBalance,
        },
        critical: true,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        service: 'hedera',
        status: 'unhealthy',
        responseTime,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown Hedera error',
        critical: true,
      };
    }
  }

  /**
   * Checks Mirror Node API health.
   *
   * @returns Promise resolving to Mirror Node health check result
   *
   * @since 1.0.0
   */
  async checkMirrorNodeHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const mirrorNodeUrl =
        process.env.NEXT_PUBLIC_MIRROR_NODE_URL ||
        'https://testnet.mirrornode.hedera.com';

      // Test with network info endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout
      );

      const response = await fetch(
        `${mirrorNodeUrl}/api/v1/network/exchangerate`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'User-Agent': 'ChainTrace-HealthCheck/1.0.0',
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new NetworkError(
          `Mirror Node returned ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();
      const responseTime = Date.now() - startTime;

      // Determine status based on response time
      let status: HealthStatus = 'healthy';
      if (responseTime > 5000) {
        status = 'degraded';
      }

      return {
        service: 'mirror-node',
        status,
        responseTime,
        timestamp: new Date().toISOString(),
        details: {
          endpoint: mirrorNodeUrl,
          exchangeRate: data.current_rate,
        },
        critical: true,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        service: 'mirror-node',
        status: 'unhealthy',
        responseTime,
        timestamp: new Date().toISOString(),
        error:
          error instanceof Error ? error.message : 'Unknown Mirror Node error',
        critical: true,
      };
    }
  }

  /**
   * Checks Hedera Consensus Service health.
   *
   * @returns Promise resolving to HCS health check result
   *
   * @since 1.0.0
   */
  async checkHCSHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const topicId = process.env.HCS_TOPIC_ID;

      if (!topicId) {
        return {
          service: 'hcs',
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          error: 'HCS topic ID not configured',
          critical: false,
        };
      }

      // Test HCS connectivity by querying topic info via Mirror Node
      const mirrorNodeUrl =
        process.env.NEXT_PUBLIC_MIRROR_NODE_URL ||
        'https://testnet.mirrornode.hedera.com';

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout
      );

      const response = await fetch(
        `${mirrorNodeUrl}/api/v1/topics/${topicId}`,
        {
          method: 'GET',
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new NetworkError(`HCS topic query failed: ${response.status}`);
      }

      const topicInfo = await response.json();
      const responseTime = Date.now() - startTime;

      let status: HealthStatus = 'healthy';
      if (responseTime > 3000) {
        status = 'degraded';
      }

      return {
        service: 'hcs',
        status,
        responseTime,
        timestamp: new Date().toISOString(),
        details: {
          topicId,
          topicMemo: topicInfo.memo,
        },
        critical: false,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        service: 'hcs',
        status: 'unhealthy',
        responseTime,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown HCS error',
        critical: false,
      };
    }
  }

  /**
   * Checks Hedera Token Service health.
   *
   * @returns Promise resolving to HTS health check result
   *
   * @since 1.0.0
   */
  async checkHTSHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const tokenId = process.env.HTS_TOKEN_ID;

      if (!tokenId) {
        return {
          service: 'hts',
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          error: 'HTS token ID not configured',
          critical: false,
        };
      }

      // Test HTS connectivity by querying token info via Mirror Node
      const mirrorNodeUrl =
        process.env.NEXT_PUBLIC_MIRROR_NODE_URL ||
        'https://testnet.mirrornode.hedera.com';

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout
      );

      const response = await fetch(
        `${mirrorNodeUrl}/api/v1/tokens/${tokenId}`,
        {
          method: 'GET',
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new NetworkError(`HTS token query failed: ${response.status}`);
      }

      const tokenInfo = await response.json();
      const responseTime = Date.now() - startTime;

      let status: HealthStatus = 'healthy';
      if (responseTime > 3000) {
        status = 'degraded';
      }

      return {
        service: 'hts',
        status,
        responseTime,
        timestamp: new Date().toISOString(),
        details: {
          tokenId,
          tokenName: tokenInfo.name,
          tokenSymbol: tokenInfo.symbol,
          totalSupply: tokenInfo.total_supply,
        },
        critical: false,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        service: 'hts',
        status: 'unhealthy',
        responseTime,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown HTS error',
        critical: false,
      };
    }
  }

  /**
   * Checks Custom Compliance Engine health.
   *
   * @returns Promise resolving to compliance engine health check result
   *
   * @since 1.0.0
   */
  async checkComplianceHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const complianceService = this.serviceInstances.get(
        'compliance'
      ) as ComplianceService;

      if (!complianceService) {
        return {
          service: 'compliance',
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          error: 'Compliance service not initialized',
          critical: false,
        };
      }

      const healthResult = await complianceService.healthCheck();

      return {
        service: 'compliance',
        status: healthResult.status,
        responseTime: healthResult.responseTime,
        timestamp: healthResult.timestamp,
        error: healthResult.error,
        critical: false,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        service: 'compliance',
        status: 'unhealthy',
        responseTime,
        timestamp: new Date().toISOString(),
        error:
          error instanceof Error
            ? error.message
            : 'Unknown compliance engine error',
        critical: false,
      };
    }
  }

  /**
   * Checks database health (Supabase).
   *
   * @returns Promise resolving to database health check result
   *
   * @since 1.0.0
   */
  async checkDatabaseHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        return {
          service: 'database',
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          error: 'Supabase configuration missing',
          critical: false,
        };
      }

      // Test database connectivity with a simple query
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout
      );

      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        throw new NetworkError(
          `Database health check failed: ${response.status}`
        );
      }

      let status: HealthStatus = 'healthy';
      if (responseTime > 2000) {
        status = 'degraded';
      }

      return {
        service: 'database',
        status,
        responseTime,
        timestamp: new Date().toISOString(),
        details: {
          provider: 'supabase',
          endpoint: supabaseUrl,
        },
        critical: false,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        service: 'database',
        status: 'unhealthy',
        responseTime,
        timestamp: new Date().toISOString(),
        error:
          error instanceof Error ? error.message : 'Unknown database error',
        critical: false,
      };
    }
  }

  /**
   * Creates a failed health check result.
   *
   * @private
   * @param serviceName - Name of the service
   * @param errorMessage - Error message
   * @returns Failed health check result
   */
  private createFailedHealthResult(
    serviceName: string,
    errorMessage: string
  ): HealthCheckResult {
    return {
      service: serviceName,
      status: 'unhealthy',
      responseTime: 0,
      timestamp: new Date().toISOString(),
      error: errorMessage,
      critical: this.config.criticalServices.includes(serviceName),
    };
  }

  /**
   * Gets system uptime in milliseconds.
   *
   * @returns System uptime since service initialization
   *
   * @since 1.0.0
   */
  getUptime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Gets health check configuration.
   *
   * @returns Current health check configuration
   *
   * @since 1.0.0
   */
  getConfig(): HealthCheckConfig {
    return { ...this.config };
  }
}

/**
 * Singleton instance of health check service.
 */
let healthCheckService: HealthCheckService | null = null;

/**
 * Gets or creates the singleton health check service instance.
 *
 * @param config - Optional configuration for new instance
 * @returns HealthCheckService instance
 *
 * @example
 * ```typescript
 * const healthService = getHealthCheckService({
 *   timeout: 15000,
 *   services: ['hedera', 'mirror-node', 'compliance']
 * });
 *
 * const health = await healthService.checkOverallHealth();
 * ```
 *
 * @since 1.0.0
 */
export function getHealthCheckService(
  config?: Partial<HealthCheckConfig>
): HealthCheckService {
  if (!healthCheckService || config) {
    healthCheckService = new HealthCheckService(config);
  }
  return healthCheckService;
}

/**
 * Resets the singleton health check service instance.
 *
 * @since 1.0.0
 */
export function resetHealthCheckService(): void {
  healthCheckService = null;
}
