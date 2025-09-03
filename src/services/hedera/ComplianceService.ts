/**
 * Service for managing Custom Compliance Engine integration including business rule
 * validation, compliance credential issuance, and supply chain verification.
 *
 * @class ComplianceService
 *
 * @example
 * ```typescript
 * const complianceService = new ComplianceService({
 *   baseUrl: process.env.COMPLIANCE_ENGINE_URL,
 *   apiKey: process.env.COMPLIANCE_API_KEY
 * });
 *
 * // Validate business action against compliance rules
 * const result = await complianceService.validateAction({
 *   action: 'product_verification',
 *   productId: 'CT-2024-001-ABC123',
 *   actor: { walletAddress: '0.0.67890', role: 'verifier' }
 * });
 * ```
 *
 * @since 1.0.0
 */
export class ComplianceService {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;

  /**
   * Creates a new ComplianceService instance with the specified configuration.
   *
   * @param config - Service configuration including base URL and API credentials
   * @throws {ConfigurationError} When required configuration is missing
   */
  constructor(config: ComplianceServiceConfig) {
    if (!config.baseUrl) {
      throw new Error('Compliance Engine base URL is required');
    }
    if (!config.apiKey) {
      throw new Error('Compliance Engine API key is required');
    }

    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 30000;
  }

  /**
   * Validates a business action against configured compliance rules.
   *
   * @param action - Action validation request with business context
   * @returns Promise resolving to validation result with compliance status
   *
   * @throws {ApiError} When compliance engine is unavailable or validation fails
   * @throws {ValidationError} When action parameters are invalid
   *
   * @example
   * ```typescript
   * const validation = await complianceService.validateAction({
   *   action: 'product_verification',
   *   productId: 'CT-2024-001-ABC123',
   *   actor: { walletAddress: '0.0.67890', role: 'verifier' },
   *   data: { verificationMethod: 'qr_scan', location: 'warehouse_a' }
   * });
   * console.log(validation.isCompliant); // true | false
   * ```
   *
   * @since 1.0.0
   * @see {@link ComplianceValidationRequest} for request structure details
   */
  async validateAction(
    request: ComplianceValidationRequest
  ): Promise<ComplianceValidationResult> {
    try {
      const response = await this.makeRequest(
        '/api/compliance/validate-action',
        {
          method: 'POST',
          body: JSON.stringify(request),
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return response as ComplianceValidationResult;
    } catch (error) {
      throw new Error(
        `Compliance validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Issues a compliance credential for verified business actions.
   *
   * @param request - Credential issuance request with verification proof
   * @returns Promise resolving to issued credential with blockchain reference
   *
   * @throws {ApiError} When credential issuance fails
   * @throws {ValidationError} When verification proof is invalid
   *
   * @example
   * ```typescript
   * const credential = await complianceService.issueCredential({
   *   productId: 'CT-2024-001-ABC123',
   *   credentialType: 'organic_verification',
   *   issuer: { walletAddress: '0.0.12345', role: 'certifier' },
   *   evidence: { documentHash: 'abc123...', signature: 'def456...' }
   * });
   * console.log(credential.credentialId); // 'CRED-2024-001'
   * ```
   *
   * @since 1.0.0
   * @see {@link ComplianceCredentialRequest} for request structure details
   */
  async issueCredential(
    request: ComplianceCredentialRequest
  ): Promise<ComplianceCredential> {
    try {
      const response = await this.makeRequest('/api/compliance/carbon-credit', {
        method: 'POST',
        body: JSON.stringify(request),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response as ComplianceCredential;
    } catch (error) {
      throw new Error(
        `Compliance credential issuance failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validates supply chain verification against business rule templates.
   *
   * @param request - Supply chain verification request with product journey data
   * @returns Promise resolving to verification result with compliance status
   *
   * @throws {ApiError} When supply chain validation fails
   * @throws {ValidationError} When journey data is incomplete
   *
   * @example
   * ```typescript
   * const verification = await complianceService.validateSupplyChain({
   *   productId: 'CT-2024-001-ABC123',
   *   journey: [
   *     { stage: 'harvest', timestamp: '2024-01-01T00:00:00Z', actor: '0.0.11111' },
   *     { stage: 'processing', timestamp: '2024-01-02T00:00:00Z', actor: '0.0.22222' }
   *   ],
   *   businessRules: ['organic_certification', 'traceability_complete']
   * });
   * console.log(verification.complianceScore); // 0.95
   * ```
   *
   * @since 1.0.0
   * @see {@link SupplyChainValidationRequest} for request structure details
   */
  async validateSupplyChain(
    request: SupplyChainValidationRequest
  ): Promise<SupplyChainValidationResult> {
    try {
      const response = await this.makeRequest('/api/compliance/supply-chain', {
        method: 'POST',
        body: JSON.stringify(request),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response as SupplyChainValidationResult;
    } catch (error) {
      throw new Error(
        `Supply chain validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Retrieves available business rule templates for compliance configuration.
   *
   * @param category - Optional category filter for business rules
   * @returns Promise resolving to list of available business rule templates
   *
   * @throws {ApiError} When template retrieval fails
   *
   * @example
   * ```typescript
   * const templates = await complianceService.getBusinessRuleTemplates('supply_chain');
   * console.log(templates.length); // Number of available templates
   * console.log(templates[0].id); // 'organic_certification_v1'
   * ```
   *
   * @since 1.0.0
   * @see {@link BusinessRuleTemplate} for template structure details
   */
  async getBusinessRuleTemplates(
    category?: string
  ): Promise<BusinessRuleTemplate[]> {
    try {
      const url = category
        ? `/api/compliance/templates?category=${encodeURIComponent(category)}`
        : '/api/compliance/templates';

      const response = await this.makeRequest(url, {
        method: 'GET',
      });

      return response as BusinessRuleTemplate[];
    } catch (error) {
      throw new Error(
        `Business rule template retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Tests connectivity to the Custom Compliance Engine.
   *
   * @returns Promise resolving to health check result
   *
   * @throws {ApiError} When health check fails
   *
   * @example
   * ```typescript
   * const health = await complianceService.healthCheck();
   * console.log(health.status); // 'healthy' | 'degraded' | 'unhealthy'
   * console.log(health.responseTime); // Response time in milliseconds
   * ```
   *
   * @since 1.0.0
   */
  async healthCheck(): Promise<ComplianceHealthResult> {
    const startTime = Date.now();

    try {
      await this.makeRequest('/api/compliance/health', {
        method: 'GET',
      });

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        status: 'unhealthy',
        responseTime,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Makes an HTTP request to the Compliance Engine with proper authentication and error handling.
   *
   * @private
   * @param endpoint - API endpoint path
   * @param options - Fetch request options
   * @returns Promise resolving to parsed response data
   */
  private async makeRequest(
    endpoint: string,
    options: RequestInit
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${this.apiKey}`,
          'User-Agent': 'ChainTrace/1.0.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }

      throw error;
    }
  }
}

/**
 * Configuration interface for Compliance Engine connection.
 *
 * @interface ComplianceServiceConfig
 *
 * @property baseUrl - Base URL for Compliance Engine API
 * @property apiKey - API key for authentication
 * @property timeout - Optional request timeout in milliseconds (default: 30000)
 *
 * @example
 * ```typescript
 * const config: ComplianceServiceConfig = {
 *   baseUrl: 'https://compliance.chaintrace.com',
 *   apiKey: process.env.COMPLIANCE_API_KEY,
 *   timeout: 30000
 * };
 * ```
 *
 * @since 1.0.0
 */
export interface ComplianceServiceConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
}

/**
 * Request interface for compliance action validation.
 *
 * @interface ComplianceValidationRequest
 *
 * @property action - Type of business action to validate
 * @property productId - Product identifier being acted upon
 * @property actor - Actor performing the action with wallet and role info
 * @property data - Additional context data for validation
 * @property businessRules - Optional specific business rules to apply
 *
 * @since 1.0.0
 */
export interface ComplianceValidationRequest {
  action: string;
  productId: string;
  actor: {
    walletAddress: string;
    role: string;
    permissions?: string[];
  };
  data?: Record<string, any>;
  businessRules?: string[];
}

/**
 * Result interface for compliance action validation.
 *
 * @interface ComplianceValidationResult
 *
 * @property isCompliant - Whether the action meets compliance requirements
 * @property complianceScore - Numeric compliance score (0.0 to 1.0)
 * @property violations - List of compliance violations if any
 * @property recommendations - Suggested actions for compliance improvement
 * @property validatedAt - Timestamp of validation
 *
 * @since 1.0.0
 */
export interface ComplianceValidationResult {
  isCompliant: boolean;
  complianceScore: number;
  violations: ComplianceViolation[];
  recommendations: string[];
  validatedAt: string;
}

/**
 * Interface for compliance rule violations.
 *
 * @interface ComplianceViolation
 *
 * @property ruleId - Identifier of the violated business rule
 * @property severity - Severity level of the violation
 * @property message - Human-readable violation description
 * @property remediation - Suggested steps to resolve the violation
 *
 * @since 1.0.0
 */
export interface ComplianceViolation {
  ruleId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  remediation: string;
}

/**
 * Request interface for compliance credential issuance.
 *
 * @interface ComplianceCredentialRequest
 *
 * @property productId - Product identifier for credential
 * @property credentialType - Type of compliance credential to issue
 * @property issuer - Issuing authority information
 * @property evidence - Supporting evidence for credential issuance
 * @property validityPeriod - Optional validity period in days
 *
 * @since 1.0.0
 */
export interface ComplianceCredentialRequest {
  productId: string;
  credentialType: string;
  issuer: {
    walletAddress: string;
    role: string;
    authority: string;
  };
  evidence: {
    documentHash?: string;
    signature: string;
    witnesses?: string[];
  };
  validityPeriod?: number;
}

/**
 * Interface for issued compliance credentials.
 *
 * @interface ComplianceCredential
 *
 * @property credentialId - Unique identifier for the credential
 * @property productId - Associated product identifier
 * @property credentialType - Type of compliance credential
 * @property status - Current status of the credential
 * @property issuedAt - Issuance timestamp
 * @property expiresAt - Expiration timestamp if applicable
 * @property blockchainRef - Reference to blockchain transaction
 *
 * @since 1.0.0
 */
export interface ComplianceCredential {
  credentialId: string;
  productId: string;
  credentialType: string;
  status: 'active' | 'expired' | 'revoked';
  issuedAt: string;
  expiresAt?: string;
  blockchainRef: {
    transactionId: string;
    consensusTimestamp: string;
  };
}

/**
 * Request interface for supply chain validation.
 *
 * @interface SupplyChainValidationRequest
 *
 * @property productId - Product identifier to validate
 * @property journey - Array of supply chain events
 * @property businessRules - Business rules to apply for validation
 * @property validationLevel - Depth of validation to perform
 *
 * @since 1.0.0
 */
export interface SupplyChainValidationRequest {
  productId: string;
  journey: SupplyChainEvent[];
  businessRules: string[];
  validationLevel?: 'basic' | 'standard' | 'comprehensive';
}

/**
 * Interface for supply chain events.
 *
 * @interface SupplyChainEvent
 *
 * @property stage - Supply chain stage identifier
 * @property timestamp - Event timestamp
 * @property actor - Actor responsible for the event
 * @property location - Geographic location of the event
 * @property data - Additional event-specific data
 *
 * @since 1.0.0
 */
export interface SupplyChainEvent {
  stage: string;
  timestamp: string;
  actor: string;
  location?: {
    country: string;
    region: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  data?: Record<string, any>;
}

/**
 * Result interface for supply chain validation.
 *
 * @interface SupplyChainValidationResult
 *
 * @property isValid - Whether the supply chain passes validation
 * @property complianceScore - Overall compliance score (0.0 to 1.0)
 * @property stageResults - Validation results for each supply chain stage
 * @property gaps - Identified gaps in the supply chain
 * @property certifications - Applicable certifications and their status
 *
 * @since 1.0.0
 */
export interface SupplyChainValidationResult {
  isValid: boolean;
  complianceScore: number;
  stageResults: StageValidationResult[];
  gaps: SupplyChainGap[];
  certifications: CertificationStatus[];
}

/**
 * Interface for stage-specific validation results.
 *
 * @interface StageValidationResult
 *
 * @property stage - Supply chain stage identifier
 * @property isValid - Whether this stage passes validation
 * @property score - Compliance score for this stage
 * @property issues - Any issues identified at this stage
 *
 * @since 1.0.0
 */
export interface StageValidationResult {
  stage: string;
  isValid: boolean;
  score: number;
  issues: string[];
}

/**
 * Interface for supply chain gaps.
 *
 * @interface SupplyChainGap
 *
 * @property type - Type of gap identified
 * @property description - Description of the gap
 * @property severity - Severity level of the gap
 * @property recommendations - Recommended actions to address the gap
 *
 * @since 1.0.0
 */
export interface SupplyChainGap {
  type: 'missing_stage' | 'documentation_gap' | 'time_gap' | 'geographic_gap';
  description: string;
  severity: 'low' | 'medium' | 'high';
  recommendations: string[];
}

/**
 * Interface for certification status.
 *
 * @interface CertificationStatus
 *
 * @property certificationId - Certification identifier
 * @property name - Human-readable certification name
 * @property status - Current certification status
 * @property validUntil - Expiration date if applicable
 * @property issuer - Certification issuing authority
 *
 * @since 1.0.0
 */
export interface CertificationStatus {
  certificationId: string;
  name: string;
  status: 'valid' | 'expired' | 'pending' | 'revoked';
  validUntil?: string;
  issuer: string;
}

/**
 * Interface for business rule templates.
 *
 * @interface BusinessRuleTemplate
 *
 * @property id - Unique template identifier
 * @property name - Human-readable template name
 * @property description - Template description
 * @property category - Business rule category
 * @property version - Template version
 * @property parameters - Configurable parameters for the rule
 *
 * @since 1.0.0
 */
export interface BusinessRuleTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  parameters: BusinessRuleParameter[];
}

/**
 * Interface for business rule parameters.
 *
 * @interface BusinessRuleParameter
 *
 * @property name - Parameter name
 * @property type - Parameter data type
 * @property description - Parameter description
 * @property required - Whether parameter is required
 * @property defaultValue - Default value if applicable
 *
 * @since 1.0.0
 */
export interface BusinessRuleParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  defaultValue?: any;
}

/**
 * Interface for compliance health check results.
 *
 * @interface ComplianceHealthResult
 *
 * @property status - Health status of the compliance engine
 * @property responseTime - Response time in milliseconds
 * @property timestamp - Health check timestamp
 * @property error - Error message if status is unhealthy
 *
 * @since 1.0.0
 */
export interface ComplianceHealthResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  timestamp: string;
  error?: string;
}
