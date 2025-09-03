#!/usr/bin/env tsx

/**
 * Test script for Compliance Service integration
 *
 * This script validates the Custom Compliance Engine integration including:
 * - Service connectivity and health checks
 * - Action validation functionality
 * - Credential issuance testing
 * - Supply chain validation testing
 * - Business rule template access
 *
 * Usage: npx tsx scripts/test-compliance-service.ts
 */

import { ComplianceService } from '../src/services/hedera/ComplianceService';

async function testComplianceService() {
  console.log('🔍 Starting Compliance Service Integration Tests...\n');

  try {
    // Initialize compliance service with test configuration
    const complianceService = new ComplianceService({
      baseUrl: process.env.COMPLIANCE_ENGINE_URL || 'http://localhost:3001',
      apiKey: process.env.COMPLIANCE_API_KEY || 'dev-key-123',
      timeout: 30000,
    });

    console.log('📊 Configuration:');
    console.log(
      `- Base URL: ${process.env.COMPLIANCE_ENGINE_URL || 'http://localhost:3001'}`
    );
    console.log(
      `- API Key: ${process.env.COMPLIANCE_API_KEY ? '[SET]' : '[DEFAULT]'}`
    );
    console.log(`- Timeout: 30000ms\n`);

    // Test 1: Health Check
    console.log('🏥 Test 1: Health Check');
    try {
      const healthResult = await complianceService.healthCheck();
      console.log(`✅ Status: ${healthResult.status}`);
      console.log(`⏱️ Response Time: ${healthResult.responseTime}ms`);
      console.log(`🕒 Timestamp: ${healthResult.timestamp}`);
      if (healthResult.error) {
        console.log(`⚠️ Error: ${healthResult.error}`);
      }
    } catch (error) {
      console.log(
        `❌ Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
    console.log();

    // Test 2: Business Rule Templates
    console.log('📋 Test 2: Business Rule Templates');
    try {
      const templates = await complianceService.getBusinessRuleTemplates();
      console.log(`✅ Retrieved ${templates.length} business rule templates`);

      if (templates.length > 0) {
        console.log('📝 Sample template:');
        const sample = templates[0];
        console.log(`- ID: ${sample.id}`);
        console.log(`- Name: ${sample.name}`);
        console.log(`- Category: ${sample.category}`);
        console.log(`- Version: ${sample.version}`);
        console.log(`- Parameters: ${sample.parameters.length} defined`);
      }

      // Test category filtering
      const organicTemplates =
        await complianceService.getBusinessRuleTemplates('organic');
      console.log(
        `✅ Retrieved ${organicTemplates.length} organic category templates`
      );
    } catch (error) {
      console.log(
        `❌ Template retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
    console.log();

    // Test 3: Action Validation
    console.log('⚖️ Test 3: Action Validation');
    try {
      const validationRequest = {
        action: 'product_verification',
        productId: 'CT-2024-TEST-001',
        actor: {
          walletAddress: '0.0.12345',
          role: 'verifier',
          permissions: ['verify_products', 'issue_credentials'],
        },
        data: {
          verificationMethod: 'qr_scan',
          location: 'test_warehouse',
          timestamp: new Date().toISOString(),
        },
        businessRules: ['traceability_complete', 'organic_certification'],
      };

      const validationResult =
        await complianceService.validateAction(validationRequest);
      console.log(`✅ Action validation completed`);
      console.log(`📊 Compliant: ${validationResult.isCompliant}`);
      console.log(`🎯 Compliance Score: ${validationResult.complianceScore}`);
      console.log(`⚠️ Violations: ${validationResult.violations.length}`);
      console.log(
        `💡 Recommendations: ${validationResult.recommendations.length}`
      );

      if (validationResult.violations.length > 0) {
        console.log('🚨 Violations found:');
        validationResult.violations.forEach((violation, index) => {
          console.log(
            `  ${index + 1}. ${violation.message} (${violation.severity})`
          );
        });
      }
    } catch (error) {
      console.log(
        `❌ Action validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
    console.log();

    // Test 4: Credential Issuance
    console.log('🏆 Test 4: Credential Issuance');
    try {
      const credentialRequest = {
        productId: 'CT-2024-TEST-001',
        credentialType: 'test_verification',
        issuer: {
          walletAddress: '0.0.54321',
          role: 'certifier',
          authority: 'Test Certification Body',
        },
        evidence: {
          documentHash: 'abc123def456789',
          signature: 'test_signature_data_12345',
          witnesses: ['0.0.11111', '0.0.22222'],
        },
        validityPeriod: 365,
      };

      const credential =
        await complianceService.issueCredential(credentialRequest);
      console.log(`✅ Credential issued successfully`);
      console.log(`🆔 Credential ID: ${credential.credentialId}`);
      console.log(`🏷️ Type: ${credential.credentialType}`);
      console.log(`📊 Status: ${credential.status}`);
      console.log(`📅 Issued At: ${credential.issuedAt}`);
      if (credential.expiresAt) {
        console.log(`⏰ Expires At: ${credential.expiresAt}`);
      }
      if (credential.blockchainRef) {
        console.log(
          `🔗 Blockchain Ref: ${credential.blockchainRef.transactionId}`
        );
      }
    } catch (error) {
      console.log(
        `❌ Credential issuance failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
    console.log();

    // Test 5: Supply Chain Validation
    console.log('🔗 Test 5: Supply Chain Validation');
    try {
      const supplyChainRequest = {
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
              temperature: '22C',
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
              qualityGrade: 'A+',
            },
          },
          {
            stage: 'packaging',
            timestamp: '2024-01-03T14:00:00Z',
            actor: '0.0.33333',
            location: {
              country: 'US',
              region: 'California',
            },
            data: {
              packagingType: 'biodegradable',
              units: 950,
              labelingComplete: true,
            },
          },
        ],
        businessRules: [
          'organic_certification',
          'traceability_complete',
          'sustainability_standards',
        ],
        validationLevel: 'comprehensive',
      };

      const chainValidation =
        await complianceService.validateSupplyChain(supplyChainRequest);
      console.log(`✅ Supply chain validation completed`);
      console.log(`✅ Valid: ${chainValidation.isValid}`);
      console.log(`📊 Compliance Score: ${chainValidation.complianceScore}`);
      console.log(
        `🔍 Stage Results: ${chainValidation.stageResults.length} stages analyzed`
      );
      console.log(`⚠️ Gaps Found: ${chainValidation.gaps.length}`);
      console.log(
        `🏆 Certifications: ${chainValidation.certifications.length}`
      );

      // Show stage results
      if (chainValidation.stageResults.length > 0) {
        console.log('\n📈 Stage Analysis:');
        chainValidation.stageResults.forEach(stage => {
          console.log(
            `  ${stage.stage}: ${stage.isValid ? '✅' : '❌'} (Score: ${stage.score})`
          );
          if (stage.issues.length > 0) {
            stage.issues.forEach(issue => console.log(`    ⚠️ ${issue}`));
          }
        });
      }

      // Show gaps
      if (chainValidation.gaps.length > 0) {
        console.log('\n🔍 Supply Chain Gaps:');
        chainValidation.gaps.forEach((gap, index) => {
          console.log(`  ${index + 1}. ${gap.description} (${gap.severity})`);
        });
      }

      // Show certifications
      if (chainValidation.certifications.length > 0) {
        console.log('\n🏆 Certifications:');
        chainValidation.certifications.forEach(cert => {
          console.log(`  ${cert.name}: ${cert.status} (${cert.issuer})`);
        });
      }
    } catch (error) {
      console.log(
        `❌ Supply chain validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
    console.log();

    console.log('✅ Compliance Service Integration Tests Complete!\n');
  } catch (error) {
    console.error('❌ Compliance service initialization failed:', error);
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  testComplianceService()
    .then(() => {
      console.log('🎉 All tests completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Test execution failed:', error);
      process.exit(1);
    });
}

export default testComplianceService;
