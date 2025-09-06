/**
 * Production Custom Compliance Engine client for regulatory validation
 *
 * @since 1.4.0
 */

import { HederaServiceClient } from '../core/HederaServiceClient';
import type { HederaServiceConfig } from '../../types/hedera';
import type { Product } from '../../types/product';

/**
 * Compliance validation result
 */
export interface ComplianceValidationResult {
  /** Whether product passes compliance checks */
  compliant: boolean;

  /** Compliance score (0-100) */
  score: number;

  /** List of violations found */
  violations: ComplianceViolation[];

  /** Validation timestamp */
  validatedAt: Date;

  /** Guardian credential ID */
  credentialId: string;

  /** Validation expiry */
  expiresAt: Date;
}

/**
 * Compliance violation information
 */
export interface ComplianceViolation {
  /** Violation code */
  code: string;

  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';

  /** Human-readable description */
  description: string;

  /** Recommended remediation actions */
  remediation: string[];

  /** Related regulation/standard */
  regulation: string;
}

/**
 * Compliance credentials for Custom Compliance Engine access
 */
interface ComplianceCredentials {
  /** API key for authentication */
  apiKey: string;

  /** Credential expiry timestamp */
  expiresAt: Date;

  /** Access scope */
  scope: string[];
}

/**
 * Production Custom Compliance Engine client for regulatory validation
 *
 * @class ComplianceServiceClient
 * @extends HederaServiceClient
 * @since 1.4.0
 *
 * @example
 * ```typescript
 * const complianceClient = new ComplianceServiceClient({
 *   networkType: 'testnet',
 *   complianceEngine: {
 *     endpoint: 'https://compliance.chaintrace.io/api/v1',
 *     apiKey: 'your-api-key'
 *   }
 * });
 *
 * // Validate product compliance
 * const result = await complianceClient.validateProductCompliance(product);
 * ```
 */
export class ComplianceServiceClient extends HederaServiceClient {
  private apiEndpoint: string;
  private apiKey: string;
  private credentials: ComplianceCredentials | null = null;

  constructor(config: HederaServiceConfig) {
    super(config);

    if (!config.complianceEngine) {
      throw new Error('Compliance Engine configuration is required');
    }

    this.apiEndpoint = config.complianceEngine.endpoint;
    this.apiKey = config.complianceEngine.apiKey;
  }

  protected getServiceName(): string {
    return 'ComplianceServiceClient';
  }

  /**
   * Validate product compliance against regulatory standards
   */
  async validateProductCompliance(
    product: Product,
    options: {
      includeSupplyChain?: boolean;
      regulations?: string[];
      skipCache?: boolean;
    } = {}
  ): Promise<ComplianceValidationResult> {
    await this.ensureValidCredentials();

    return this.executeWithRetry(
      async () => {
        const response = await fetch(`${this.apiEndpoint}/validate/product`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.credentials!.apiKey}`,
            'X-ChainTrace-Version': '1.4.0',
          },
          body: JSON.stringify({
            product,
            options: {
              includeSupplyChain: options.includeSupplyChain || false,
              regulations: options.regulations || ['NAFDAC', 'SON', 'FMEnv'],
              skipCache: options.skipCache || false,
            },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Compliance validation failed: ${response.status} ${errorText}`
          );
        }

        const validationData = await response.json();

        return {
          compliant: validationData.compliant,
          score: validationData.score,
          violations: validationData.violations || [],
          validatedAt: new Date(validationData.validatedAt),
          credentialId: validationData.credentialId,
          expiresAt: new Date(validationData.expiresAt),
        };
      },
      {
        operationName: 'validateProductCompliance',
        timeout: this.config.timeouts?.compliance || 45000,
        metadata: {
          productId: product.id,
          regulations: options.regulations,
        },
      }
    );
  }

  /**
   * Validate supply chain action compliance
   */
  async validateActionCompliance(action: {
    type: 'create' | 'process' | 'transport' | 'verify';
    productId: string;
    actorId: string;
    location: any;
    timestamp: Date;
    data: Record<string, any>;
  }): Promise<ComplianceValidationResult> {
    await this.ensureValidCredentials();

    return this.executeWithRetry(
      async () => {
        const response = await fetch(`${this.apiEndpoint}/validate/action`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.credentials!.apiKey}`,
            'X-ChainTrace-Version': '1.4.0',
          },
          body: JSON.stringify({ action }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Action validation failed: ${response.status} ${errorText}`
          );
        }

        const validationData = await response.json();

        return {
          compliant: validationData.compliant,
          score: validationData.score,
          violations: validationData.violations || [],
          validatedAt: new Date(validationData.validatedAt),
          credentialId: validationData.credentialId,
          expiresAt: new Date(validationData.expiresAt),
        };
      },
      {
        operationName: 'validateActionCompliance',
        timeout: this.config.timeouts?.compliance || 30000,
        metadata: {
          actionType: action.type,
          productId: action.productId,
          actorId: action.actorId,
        },
      }
    );
  }

  /**
   * Get compliance credentials for Guardian integration
   */
  async getComplianceCredentials(
    accountId: string,
    scope: string[] = ['validate', 'audit', 'report']
  ): Promise<ComplianceCredentials> {
    return this.executeWithRetry(
      async () => {
        const response = await fetch(`${this.apiEndpoint}/auth/credentials`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
            'X-ChainTrace-Version': '1.4.0',
          },
          body: JSON.stringify({
            accountId,
            scope,
            duration: '24h', // 24-hour TTL for credentials
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Credential request failed: ${response.status} ${errorText}`
          );
        }

        const credentialData = await response.json();

        return {
          apiKey: credentialData.apiKey,
          expiresAt: new Date(credentialData.expiresAt),
          scope: credentialData.scope,
        };
      },
      {
        operationName: 'getComplianceCredentials',
        timeout: this.config.timeouts?.compliance || 30000,
        metadata: { accountId, scope },
      }
    );
  }

  /**
   * Generate compliance report for product
   */
  async generateComplianceReport(
    productId: string,
    reportType: 'audit' | 'regulatory' | 'sustainability' = 'regulatory'
  ): Promise<{
    reportId: string;
    reportUrl: string;
    generatedAt: Date;
    expiresAt: Date;
  }> {
    await this.ensureValidCredentials();

    return this.executeWithRetry(
      async () => {
        const response = await fetch(`${this.apiEndpoint}/reports/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.credentials!.apiKey}`,
            'X-ChainTrace-Version': '1.4.0',
          },
          body: JSON.stringify({
            productId,
            reportType,
            format: 'pdf',
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Report generation failed: ${response.status} ${errorText}`
          );
        }

        const reportData = await response.json();

        return {
          reportId: reportData.reportId,
          reportUrl: reportData.downloadUrl,
          generatedAt: new Date(reportData.generatedAt),
          expiresAt: new Date(reportData.expiresAt),
        };
      },
      {
        operationName: 'generateComplianceReport',
        timeout: this.config.timeouts?.compliance || 60000, // Longer for report generation
        metadata: { productId, reportType },
      }
    );
  }

  /**
   * Check compliance service health
   */
  async checkComplianceServiceHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, any>;
    lastChecked: Date;
  }> {
    return this.executeWithRetry(
      async () => {
        const response = await fetch(`${this.apiEndpoint}/health`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'X-ChainTrace-Version': '1.4.0',
          },
        });

        if (!response.ok) {
          throw new Error(`Health check failed: ${response.status}`);
        }

        return await response.json();
      },
      {
        operationName: 'checkComplianceServiceHealth',
        timeout: 10000,
        retry: { maxAttempts: 2 },
      }
    );
  }

  /**
   * Ensure valid credentials are available
   */
  private async ensureValidCredentials(): Promise<void> {
    if (!this.credentials || this.credentials.expiresAt <= new Date()) {
      // Get new credentials - this would typically use the operator account
      if (this.client.operatorAccountId) {
        this.credentials = await this.getComplianceCredentials(
          this.client.operatorAccountId.toString()
        );
      } else {
        throw new Error('Operator account required for compliance operations');
      }
    }
  }
}
