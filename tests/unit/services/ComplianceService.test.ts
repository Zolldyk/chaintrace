/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import {
  ComplianceService,
  ComplianceServiceConfig,
  ComplianceValidationRequest,
  ComplianceCredentialRequest,
  SupplyChainValidationRequest,
} from '../../../src/services/hedera/ComplianceService';

// Mock fetch globally
const mockFetch = vi.fn() as Mock;
global.fetch = mockFetch;

describe('ComplianceService', () => {
  let complianceService: ComplianceService;
  let mockConfig: ComplianceServiceConfig;

  beforeEach(() => {
    mockConfig = {
      baseUrl: 'https://test-compliance.example.com',
      apiKey: 'test-api-key-12345',
      timeout: 30000,
    };

    complianceService = new ComplianceService(mockConfig);

    // Reset mocks
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('constructor', () => {
    it('should create instance with valid configuration', () => {
      expect(complianceService).toBeInstanceOf(ComplianceService);
    });

    it('should throw error when baseUrl is missing', () => {
      expect(() => {
        new ComplianceService({ ...mockConfig, baseUrl: '' });
      }).toThrow('Compliance Engine base URL is required');
    });

    it('should throw error when apiKey is missing', () => {
      expect(() => {
        new ComplianceService({ ...mockConfig, apiKey: '' });
      }).toThrow('Compliance Engine API key is required');
    });

    it('should use default timeout when not provided', () => {
      const service = new ComplianceService({
        baseUrl: 'https://test.com',
        apiKey: 'test-key',
      });
      expect(service).toBeInstanceOf(ComplianceService);
    });
  });

  describe('validateAction', () => {
    const mockValidationRequest: ComplianceValidationRequest = {
      action: 'product_verification',
      productId: 'CT-2024-TEST-001',
      actor: {
        walletAddress: '0.0.12345',
        role: 'verifier',
        permissions: ['verify_products'],
      },
      data: {
        verificationMethod: 'qr_scan',
        location: 'warehouse_a',
      },
      businessRules: ['traceability_complete'],
    };

    it('should successfully validate an action', async () => {
      const mockResponse = {
        isCompliant: true,
        complianceScore: 0.95,
        violations: [],
        recommendations: ['Update verification timestamp'],
        validatedAt: '2024-01-01T12:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await complianceService.validateAction(
        mockValidationRequest
      );

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-compliance.example.com/api/compliance/validate-action',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockValidationRequest),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-api-key-12345',
            'User-Agent': 'ChainTrace/1.0.0',
          }),
        })
      );
    });

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      await expect(
        complianceService.validateAction(mockValidationRequest)
      ).rejects.toThrow('Compliance validation failed: HTTP 400: Bad Request');
    });

    it('should handle network timeout', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      await expect(
        complianceService.validateAction(mockValidationRequest)
      ).rejects.toThrow(
        'Compliance validation failed: Request timeout after 30000ms'
      );
    });

    it('should handle validation with violations', async () => {
      const mockResponse = {
        isCompliant: false,
        complianceScore: 0.65,
        violations: [
          {
            ruleId: 'organic_certification',
            severity: 'high' as const,
            message: 'Organic certification not found',
            remediation: 'Obtain valid organic certification',
          },
        ],
        recommendations: ['Add organic certification', 'Update documentation'],
        validatedAt: '2024-01-01T12:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await complianceService.validateAction(
        mockValidationRequest
      );

      expect(result.isCompliant).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].severity).toBe('high');
      expect(result.complianceScore).toBe(0.65);
    });
  });

  describe('issueCredential', () => {
    const mockCredentialRequest: ComplianceCredentialRequest = {
      productId: 'CT-2024-TEST-001',
      credentialType: 'organic_verification',
      issuer: {
        walletAddress: '0.0.54321',
        role: 'certifier',
        authority: 'Organic Certification Body',
      },
      evidence: {
        documentHash: 'abc123def456789',
        signature: 'test_signature_data',
        witnesses: ['0.0.11111', '0.0.22222'],
      },
      validityPeriod: 365,
    };

    it('should successfully issue a credential', async () => {
      const mockResponse = {
        credentialId: 'CRED-2024-001-ORG',
        productId: 'CT-2024-TEST-001',
        credentialType: 'organic_verification',
        status: 'active' as const,
        issuedAt: '2024-01-01T12:00:00Z',
        expiresAt: '2024-12-31T12:00:00Z',
        blockchainRef: {
          transactionId: '0.0.123456@1704110400.123456789',
          consensusTimestamp: '1704110400.123456789',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await complianceService.issueCredential(
        mockCredentialRequest
      );

      expect(result).toEqual(mockResponse);
      expect(result.credentialId).toBe('CRED-2024-001-ORG');
      expect(result.status).toBe('active');
      expect(result.blockchainRef.transactionId).toBe(
        '0.0.123456@1704110400.123456789'
      );
    });

    it('should handle credential issuance failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
      });

      await expect(
        complianceService.issueCredential(mockCredentialRequest)
      ).rejects.toThrow(
        'Compliance credential issuance failed: HTTP 422: Unprocessable Entity'
      );
    });
  });

  describe('validateSupplyChain', () => {
    const mockSupplyChainRequest: SupplyChainValidationRequest = {
      productId: 'CT-2024-TEST-001',
      journey: [
        {
          stage: 'harvest',
          timestamp: '2024-01-01T08:00:00Z',
          actor: '0.0.11111',
          location: {
            country: 'US',
            region: 'California',
            coordinates: {
              lat: 36.7783,
              lng: -119.4179,
            },
          },
          data: {
            harvestMethod: 'organic',
            quantity: '1000kg',
          },
        },
        {
          stage: 'processing',
          timestamp: '2024-01-02T10:00:00Z',
          actor: '0.0.22222',
          location: {
            country: 'US',
            region: 'California',
          },
          data: {
            processMethod: 'cold_pressed',
            batchSize: '950kg',
          },
        },
      ],
      businessRules: ['organic_certification', 'traceability_complete'],
      validationLevel: 'comprehensive',
    };

    it('should successfully validate supply chain', async () => {
      const mockResponse = {
        isValid: true,
        complianceScore: 0.95,
        stageResults: [
          {
            stage: 'harvest',
            isValid: true,
            score: 0.98,
            issues: [],
          },
          {
            stage: 'processing',
            isValid: true,
            score: 0.92,
            issues: ['Minor documentation gap'],
          },
        ],
        gaps: [],
        certifications: [
          {
            certificationId: 'USDA-ORG-2024',
            name: 'USDA Organic Certification',
            status: 'valid' as const,
            validUntil: '2024-12-31T23:59:59Z',
            issuer: 'USDA National Organic Program',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await complianceService.validateSupplyChain(
        mockSupplyChainRequest
      );

      expect(result).toEqual(mockResponse);
      expect(result.isValid).toBe(true);
      expect(result.stageResults).toHaveLength(2);
      expect(result.certifications).toHaveLength(1);
      expect(result.complianceScore).toBe(0.95);
    });

    it('should handle supply chain with gaps', async () => {
      const mockResponse = {
        isValid: false,
        complianceScore: 0.72,
        stageResults: [
          {
            stage: 'harvest',
            isValid: true,
            score: 0.95,
            issues: [],
          },
          {
            stage: 'processing',
            isValid: false,
            score: 0.48,
            issues: ['Missing temperature logs', 'Incomplete batch tracking'],
          },
        ],
        gaps: [
          {
            type: 'documentation_gap' as const,
            description: 'Missing temperature monitoring during processing',
            severity: 'medium' as const,
            recommendations: [
              'Install temperature sensors',
              'Implement continuous monitoring',
            ],
          },
        ],
        certifications: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await complianceService.validateSupplyChain(
        mockSupplyChainRequest
      );

      expect(result.isValid).toBe(false);
      expect(result.gaps).toHaveLength(1);
      expect(result.gaps[0].type).toBe('documentation_gap');
      expect(result.gaps[0].severity).toBe('medium');
      expect(result.stageResults[1].isValid).toBe(false);
    });
  });

  describe('getBusinessRuleTemplates', () => {
    it('should retrieve all business rule templates', async () => {
      const mockTemplates = [
        {
          id: 'organic_certification_v1',
          name: 'Organic Certification Validation',
          description: 'Validates organic certification requirements',
          category: 'organic',
          version: '1.0',
          parameters: [
            {
              name: 'certificationBody',
              type: 'string' as const,
              description: 'Name of the certification body',
              required: true,
            },
          ],
        },
        {
          id: 'traceability_complete_v1',
          name: 'Complete Traceability Validation',
          description: 'Ensures complete product traceability',
          category: 'traceability',
          version: '1.0',
          parameters: [
            {
              name: 'minimumStages',
              type: 'number' as const,
              description: 'Minimum number of required stages',
              required: true,
              defaultValue: 3,
            },
          ],
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplates,
      });

      const result = await complianceService.getBusinessRuleTemplates();

      expect(result).toEqual(mockTemplates);
      expect(result).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-compliance.example.com/api/compliance/templates',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should retrieve templates by category', async () => {
      const mockTemplates = [
        {
          id: 'organic_certification_v1',
          name: 'Organic Certification Validation',
          description: 'Validates organic certification requirements',
          category: 'organic',
          version: '1.0',
          parameters: [],
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplates,
      });

      const result =
        await complianceService.getBusinessRuleTemplates('organic');

      expect(result).toEqual(mockTemplates);
      expect(result).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-compliance.example.com/api/compliance/templates?category=organic',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when service is available', async () => {
      // Add small delay to ensure responseTime > 0
      mockFetch.mockImplementationOnce(
        () =>
          new Promise(
            resolve =>
              setTimeout(
                () =>
                  resolve({
                    ok: true,
                    json: async () => ({}),
                  }),
                10
              ) // 10ms delay
          )
      );

      const result = await complianceService.healthCheck();

      expect(result.status).toBe('healthy');
      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.timestamp).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should return unhealthy status when service is unavailable', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await complianceService.healthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeDefined();
      expect(result.error).toBe('Connection refused');
    });

    it('should handle timeout during health check', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      const result = await complianceService.healthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.error).toContain('Request timeout after 30000ms');
    });
  });

  describe('error handling', () => {
    const mockRequest: ComplianceValidationRequest = {
      action: 'test_action',
      productId: 'TEST-001',
      actor: {
        walletAddress: '0.0.12345',
        role: 'tester',
      },
    };

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        complianceService.validateAction(mockRequest)
      ).rejects.toThrow('Compliance validation failed: Network error');
    });

    it('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(
        complianceService.validateAction(mockRequest)
      ).rejects.toThrow('Compliance validation failed: Invalid JSON');
    });

    it('should handle fetch abort/timeout', async () => {
      const abortError = new Error('Operation aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      await expect(
        complianceService.validateAction(mockRequest)
      ).rejects.toThrow(
        'Compliance validation failed: Request timeout after 30000ms'
      );
    });
  });

  describe('authentication', () => {
    it('should include proper authorization headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const mockRequest: ComplianceValidationRequest = {
        action: 'test_action',
        productId: 'TEST-001',
        actor: {
          walletAddress: '0.0.12345',
          role: 'tester',
        },
      };

      await complianceService.validateAction(mockRequest);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key-12345',
            'User-Agent': 'ChainTrace/1.0.0',
          }),
        })
      );
    });
  });
});
