/**
 * Unit tests for CustomComplianceRuleEngine
 * 
 * @description Tests compliance rule validation, sequence enforcement, 
 * and role-specific business logic for Producer → Processor → Verifier workflow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CustomComplianceRuleEngine,
  ActionValidationRequest
} from '../../../../src/services/hedera/CustomComplianceRuleEngine';
import { ComplianceCacheAdapter } from '../../../../src/services/hedera/ComplianceCacheAdapter';
import type { ValidationResult } from '../../../../src/types/hedera';
import { cacheService } from '../../../../src/lib/cache/CacheService';

// Mock HCSClient
const mockHCSClient = {
  submitComplianceCheck: vi.fn().mockResolvedValue({
    transactionId: 'test-tx-123',
    topicId: '0.0.12345',
    submittedAt: new Date(),
    messageSize: 1024
  })
};

describe('CustomComplianceRuleEngine', () => {
  let ruleEngine: CustomComplianceRuleEngine;
  let cacheAdapter: ComplianceCacheAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    
    cacheAdapter = new ComplianceCacheAdapter(cacheService);
    ruleEngine = new CustomComplianceRuleEngine({
      cacheService: cacheAdapter,
      hcsService: mockHCSClient as any,
      cacheTtl: {
        rules: 3600,
        state: 86400
      }
    });
  });

  describe('Rule Loading', () => {
    it('should load Producer rules successfully', async () => {
      const rules = await ruleEngine.loadComplianceRules('Producer', 'product_creation');
      
      expect(rules).toBeDefined();
      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0].roleType).toBe('Producer');
      expect(rules[0].sequencePosition).toBe(1);
      expect(rules[0].conditions.requiredFields).toContain('productType');
    });

    it('should load Processor rules successfully', async () => {
      const rules = await ruleEngine.loadComplianceRules('Processor', 'product_processing');
      
      expect(rules).toBeDefined();
      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0].roleType).toBe('Processor');
      expect(rules[0].sequencePosition).toBe(2);
      expect(rules[0].dependencies).toContain('producer_initial_creation');
    });

    it('should load Verifier rules successfully', async () => {
      const rules = await ruleEngine.loadComplianceRules('Verifier', 'product_verification');
      
      expect(rules).toBeDefined();
      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0].roleType).toBe('Verifier');
      expect(rules[0].sequencePosition).toBe(3);
      expect(rules[0].dependencies).toContain('producer_initial_creation');
      expect(rules[0].dependencies).toContain('processor_transformation');
    });
  });

  describe('Producer Role Validation', () => {
    it('should validate valid Producer action', async () => {
      const request: ActionValidationRequest = {
        action: 'product_creation',
        productId: 'CT-2024-001-ABC123',
        actor: {
          walletAddress: '0.0.12345',
          role: 'Producer'
        },
        data: {
          productType: 'organic_cocoa',
          quantity: 100,
          origin: {
            country: 'NG',
            region: 'Lagos',
            farm_id: 'FARM-001'
          },
          processingDetails: {
            harvest_date: '2024-01-15',
            processing_method: 'sun_dried',
            quality_grade: 'Grade_A'
          }
        }
      };

      const result = await ruleEngine.validateAction(request);

      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.complianceId).toBeDefined();
      expect(mockHCSClient.submitComplianceCheck).toHaveBeenCalled();
    });

    it('should reject Producer action with missing required fields', async () => {
      const request: ActionValidationRequest = {
        action: 'product_creation',
        productId: 'CT-2024-001-ABC123',
        actor: {
          walletAddress: '0.0.12345',
          role: 'Producer'
        },
        data: {
          productType: 'organic_cocoa'
          // Missing quantity, origin, processingDetails
        }
      };

      const result = await ruleEngine.validateAction(request);

      expect(result.isValid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations.some(v => v.includes('Missing required field'))).toBe(true);
    });

    it('should reject Producer action with invalid product type', async () => {
      const request: ActionValidationRequest = {
        action: 'product_creation',
        productId: 'CT-2024-001-ABC123',
        actor: {
          walletAddress: '0.0.12345',
          role: 'Producer'
        },
        data: {
          productType: 'invalid_product_type',
          quantity: 100,
          origin: {
            country: 'NG',
            region: 'Lagos',
            farm_id: 'FARM-001'
          },
          processingDetails: {
            harvest_date: '2024-01-15',
            processing_method: 'sun_dried',
            quality_grade: 'Grade_A'
          }
        }
      };

      const result = await ruleEngine.validateAction(request);

      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.includes('Product type must be one of the allowed agricultural categories'))).toBe(true);
    });

    it('should reject Producer action exceeding daily production limit', async () => {
      const request: ActionValidationRequest = {
        action: 'product_creation',
        productId: 'CT-2024-001-ABC123',
        actor: {
          walletAddress: '0.0.12345',
          role: 'Producer'
        },
        data: {
          productType: 'organic_cocoa',
          quantity: 1500, // Exceeds 1000kg limit
          origin: {
            country: 'NG',
            region: 'Lagos',
            farm_id: 'FARM-001'
          },
          processingDetails: {
            harvest_date: '2024-01-15',
            processing_method: 'sun_dried',
            quality_grade: 'Grade_A'
          }
        }
      };

      const result = await ruleEngine.validateAction(request);

      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.includes('Daily production limit exceeded'))).toBe(true);
    });
  });

  describe('Sequence Enforcement', () => {
    it('should enforce Producer → Processor sequence violation', async () => {
      const request: ActionValidationRequest = {
        action: 'product_processing',
        productId: 'CT-2024-002-DEF456',
        actor: {
          walletAddress: '0.0.67890',
          role: 'Processor'
        },
        data: {
          processingType: 'fermentation',
          duration: 72,
          location: {
            facility_id: 'FAC-NG-2024-0001',
            coordinates: { lat: 6.5244, lng: 3.3792 },
            country: 'NG'
          },
          inputProducts: [
            {
              productId: 'CT-2024-002-DEF456',
              quantity: 100,
              quality_grade: 'Grade_A'
            }
          ],
          outputProducts: [
            {
              productId: 'CT-2024-002-PRO789',
              quantity: 95,
              quality_grade: 'Grade_A',
              packaging: 'bulk_sacks'
            }
          ]
        }
      };

      const result = await ruleEngine.validateAction(request);

      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => 
        v.includes('SEQUENCE_VIOLATION: Processor action attempted before Producer initialization')
      )).toBe(true);
    });

    it('should enforce Processor → Verifier sequence violation', async () => {
      const request: ActionValidationRequest = {
        action: 'product_verification',
        productId: 'CT-2024-003-GHI789',
        actor: {
          walletAddress: '0.0.11111',
          role: 'Verifier'
        },
        data: {
          verificationMethod: 'on_site_inspection',
          certificationLevel: 'organic',
          verificationStandards: {
            compliance_framework: [
              {
                standard_name: 'IFOAM',
                version: '2021',
                compliance_score: 85
              }
            ],
            testing_protocols: {
              physical_inspection: true,
              chemical_analysis: true,
              documentation_review: true
            },
            quality_benchmarks: {
              grade_minimum: 'Grade_A'
            }
          },
          auditResults: {
            audit_score: 88,
            critical_findings: [],
            corrective_actions: [],
            certification_recommendation: 'approve'
          }
        }
      };

      const result = await ruleEngine.validateAction(request);

      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => 
        v.includes('SEQUENCE_VIOLATION: Verifier action attempted before Producer initialization') ||
        v.includes('SEQUENCE_VIOLATION: Verifier action attempted before Processor completion')
      )).toBe(true);
    });

    it('should prevent multiple Producer actions without Processor intervention', async () => {
      const productId = 'CT-2024-004-JKL012';
      
      // First Producer action (should succeed)
      const firstRequest: ActionValidationRequest = {
        action: 'product_creation',
        productId,
        actor: {
          walletAddress: '0.0.12345',
          role: 'Producer'
        },
        data: {
          productType: 'organic_cocoa',
          quantity: 100,
          origin: {
            country: 'NG',
            region: 'Lagos',
            farm_id: 'FARM-001'
          },
          processingDetails: {
            harvest_date: '2024-01-15',
            processing_method: 'sun_dried',
            quality_grade: 'Grade_A'
          }
        }
      };

      const firstResult = await ruleEngine.validateAction(firstRequest);
      expect(firstResult.isValid).toBe(true);

      // Second Producer action without Processor (should fail)
      const secondRequest: ActionValidationRequest = {
        action: 'product_creation',
        productId,
        actor: {
          walletAddress: '0.0.12345',
          role: 'Producer'
        },
        data: {
          productType: 'organic_cocoa',
          quantity: 50,
          origin: {
            country: 'NG',
            region: 'Lagos',
            farm_id: 'FARM-001'
          },
          processingDetails: {
            harvest_date: '2024-01-16',
            processing_method: 'sun_dried',
            quality_grade: 'Grade_A'
          }
        }
      };

      const secondResult = await ruleEngine.validateAction(secondRequest);
      
      expect(secondResult.isValid).toBe(false);
      expect(secondResult.violations.some(v => 
        v.includes('SEQUENCE_VIOLATION: Multiple Producer actions detected for product') &&
        v.includes('without Processor intervention')
      )).toBe(true);
    });
  });

  describe('HCS Integration', () => {
    it('should log compliance events to HCS successfully', async () => {
      const request: ActionValidationRequest = {
        action: 'product_creation',
        productId: 'CT-2024-005-MNO345',
        actor: {
          walletAddress: '0.0.12345',
          role: 'Producer'
        },
        data: {
          productType: 'organic_cocoa',
          quantity: 100,
          origin: {
            country: 'NG',
            region: 'Lagos',
            farm_id: 'FARM-001'
          },
          processingDetails: {
            harvest_date: '2024-01-15',
            processing_method: 'sun_dried',
            quality_grade: 'Grade_A'
          }
        }
      };

      await ruleEngine.validateAction(request);

      expect(mockHCSClient.submitComplianceCheck).toHaveBeenCalledWith(
        request.productId,
        expect.objectContaining({
          action: request.action,
          productId: request.productId,
          result: 'APPROVED',
          walletAddress: request.actor.walletAddress,
          roleType: request.actor.role,
          sequenceStep: 1
        }),
        expect.any(String)
      );
    });

    it('should log compliance violations to HCS', async () => {
      const request: ActionValidationRequest = {
        action: 'product_creation',
        productId: 'CT-2024-006-PQR678',
        actor: {
          walletAddress: '0.0.12345',
          role: 'Producer'
        },
        data: {
          productType: 'invalid_type',
          quantity: 100
          // Missing required fields
        }
      };

      await ruleEngine.validateAction(request);

      expect(mockHCSClient.submitComplianceCheck).toHaveBeenCalledWith(
        request.productId,
        expect.objectContaining({
          action: request.action,
          productId: request.productId,
          result: 'REJECTED',
          walletAddress: request.actor.walletAddress,
          roleType: request.actor.role,
          sequenceStep: 0,
          violations: expect.any(Array)
        }),
        expect.any(String)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid role types gracefully', async () => {
      const request: ActionValidationRequest = {
        action: 'invalid_action',
        productId: 'CT-2024-007-STU901',
        actor: {
          walletAddress: '0.0.12345',
          role: 'InvalidRole' as any
        },
        data: {}
      };

      const result = await ruleEngine.validateAction(request);

      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.includes('RULES_NOT_FOUND'))).toBe(true);
    });

    it('should handle missing action data gracefully', async () => {
      const request: ActionValidationRequest = {
        action: 'product_creation',
        productId: 'CT-2024-008-VWX234',
        actor: {
          walletAddress: '0.0.12345',
          role: 'Producer'
        }
        // Missing data field
      };

      const result = await ruleEngine.validateAction(request);

      expect(result.isValid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Requirements', () => {
    it('should validate action within 5 seconds', async () => {
      const startTime = Date.now();
      
      const request: ActionValidationRequest = {
        action: 'product_creation',
        productId: 'CT-2024-009-YZA567',
        actor: {
          walletAddress: '0.0.12345',
          role: 'Producer'
        },
        data: {
          productType: 'organic_cocoa',
          quantity: 100,
          origin: {
            country: 'NG',
            region: 'Lagos',
            farm_id: 'FARM-001'
          },
          processingDetails: {
            harvest_date: '2024-01-15',
            processing_method: 'sun_dried',
            quality_grade: 'Grade_A'
          }
        }
      };

      const result = await ruleEngine.validateAction(request);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(5000); // Must complete within 5 seconds
    });
  });
});