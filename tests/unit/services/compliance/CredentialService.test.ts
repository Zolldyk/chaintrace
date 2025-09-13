/**
 * Unit tests for CredentialService
 *
 * @since 1.0.0
 */

import {
  describe,
  test,
  expect,
  beforeEach,
  vi,
  type MockedFunction,
} from 'vitest';
import { CredentialService } from '@/services/compliance/CredentialService';
import type {
  ComplianceCredential,
  CredentialIssuanceRequest,
  CredentialVerificationRequest,
} from '@/types/compliance';
import { generateCredentialId } from '@/lib/credential-validations';

// Mock dependencies
vi.mock('@/services/hedera/ComplianceServiceClient');
vi.mock('@/services/hedera/HCSService');
vi.mock('@/services/core/HederaServiceClient', () => ({
  HederaServiceClient: vi.fn().mockImplementation(config => ({
    config,
    executeWithRetry: vi.fn().mockImplementation(async fn => fn()),
    getServiceName: vi.fn().mockReturnValue('MockedService'),
  })),
}));
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('CredentialService', () => {
  let credentialService: CredentialService;
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = {
      networkType: 'testnet' as const,
      credentialTopicId: '0.0.7777777',
      defaultExpirationDays: 365,
      signingKey: 'test-signing-key',
      maxCredentialsPerProduct: 10,
      operatorAccountId: '0.0.12345',
      operatorPrivateKey: 'test-private-key',
    };

    credentialService = new CredentialService(mockConfig);
  });

  describe('issueCredential', () => {
    test('should issue a credential successfully', async () => {
      const request: CredentialIssuanceRequest = {
        productId: 'CT-2024-001-ABC123',
        credentialType: 'supply_chain',
        validationResults: { score: 95, compliant: true },
        complianceRules: ['organic_certification'],
        verificationLevel: 'enhanced',
      };

      const result = await credentialService.issueCredential(request);

      expect(result.credential).toBeDefined();
      expect(result.credential.productId).toBe(request.productId);
      expect(result.credential.credentialType).toBe(request.credentialType);
      expect(result.credential.status).toBe('issued');
      expect(result.credential.signature).toBeTruthy();
      expect(result.hcsResult.messageId).toBeTruthy();
    });

    test('should validate credential limits', async () => {
      const request: CredentialIssuanceRequest = {
        productId: 'CT-2024-001-ABC123',
        credentialType: 'supply_chain',
        validationResults: { score: 95 },
        complianceRules: ['test_rule'],
        verificationLevel: 'basic',
      };

      // Issue credentials up to the limit
      for (let i = 0; i < mockConfig.maxCredentialsPerProduct; i++) {
        await credentialService.issueCredential({
          ...request,
          productId: `CT-2024-001-ABC12${i}`,
        });
      }

      // Attempt to exceed the limit should fail
      await expect(credentialService.issueCredential(request)).rejects.toThrow(
        'Maximum credentials limit reached'
      );
    });

    test('should reject invalid credential requests', async () => {
      const invalidRequest = {
        productId: 'invalid-id',
        credentialType: 'supply_chain' as const,
        validationResults: {},
        complianceRules: [],
        verificationLevel: 'basic' as const,
      };

      await expect(
        credentialService.issueCredential(invalidRequest)
      ).rejects.toThrow('Invalid credential request');
    });
  });

  describe('getCredential', () => {
    test('should retrieve an existing credential', async () => {
      // First issue a credential
      const request: CredentialIssuanceRequest = {
        productId: 'CT-2024-001-ABC123',
        credentialType: 'supply_chain',
        validationResults: { score: 95 },
        complianceRules: ['test_rule'],
        verificationLevel: 'basic',
      };

      const issuanceResult = await credentialService.issueCredential(request);
      const credentialId = issuanceResult.credential.id;

      // Then retrieve it
      const retrieved = await credentialService.getCredential(credentialId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(credentialId);
      expect(retrieved?.productId).toBe(request.productId);
    });

    test('should return null for non-existent credential', async () => {
      const nonExistentId = generateCredentialId();
      const result = await credentialService.getCredential(nonExistentId);
      expect(result).toBeNull();
    });

    test('should update expired credentials', async () => {
      // Create an expired credential by setting expiry in the past
      const request: CredentialIssuanceRequest = {
        productId: 'CT-2024-001-ABC123',
        credentialType: 'supply_chain',
        validationResults: { score: 95 },
        complianceRules: ['test_rule'],
        verificationLevel: 'basic',
        expiresAt: new Date(Date.now() - 86400000), // 1 day ago
      };

      const issuanceResult = await credentialService.issueCredential(request);
      const credentialId = issuanceResult.credential.id;

      const retrieved = await credentialService.getCredential(credentialId);

      expect(retrieved?.status).toBe('expired');
    });
  });

  describe('verifyCredential', () => {
    test('should verify a valid credential', async () => {
      // Issue a credential
      const request: CredentialIssuanceRequest = {
        productId: 'CT-2024-001-ABC123',
        credentialType: 'supply_chain',
        validationResults: { score: 95 },
        complianceRules: ['test_rule'],
        verificationLevel: 'basic',
      };

      const issuanceResult = await credentialService.issueCredential(request);
      const credentialId = issuanceResult.credential.id;

      // Verify it
      const verificationRequest: CredentialVerificationRequest = {
        credentialId,
        verifySignature: true,
        verifyBlockchain: false,
      };

      const result =
        await credentialService.verifyCredential(verificationRequest);

      expect(result.isValid).toBe(true);
      expect(result.credential).toBeDefined();
      expect(result.verification.signatureValid).toBe(true);
      expect(result.verification.notExpired).toBe(true);
      expect(result.verification.notRevoked).toBe(true);
    });

    test('should reject verification of non-existent credential', async () => {
      const nonExistentId = generateCredentialId();
      const verificationRequest: CredentialVerificationRequest = {
        credentialId: nonExistentId,
      };

      const result =
        await credentialService.verifyCredential(verificationRequest);

      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe('CREDENTIAL_NOT_FOUND');
    });

    test('should detect expired credentials', async () => {
      // Create an expired credential
      const request: CredentialIssuanceRequest = {
        productId: 'CT-2024-001-ABC123',
        credentialType: 'supply_chain',
        validationResults: { score: 95 },
        complianceRules: ['test_rule'],
        verificationLevel: 'basic',
        expiresAt: new Date(Date.now() - 86400000), // 1 day ago
      };

      const issuanceResult = await credentialService.issueCredential(request);
      const credentialId = issuanceResult.credential.id;

      const verificationRequest: CredentialVerificationRequest = {
        credentialId,
      };

      const result =
        await credentialService.verifyCredential(verificationRequest);

      expect(result.isValid).toBe(false);
      expect(result.verification.notExpired).toBe(false);
    });
  });

  describe('searchCredentials', () => {
    beforeEach(async () => {
      // Create test credentials
      const baseRequest: CredentialIssuanceRequest = {
        productId: 'CT-2024-001-ABC123',
        credentialType: 'supply_chain',
        validationResults: { score: 95 },
        complianceRules: ['test_rule'],
        verificationLevel: 'basic',
      };

      // Issue multiple credentials
      await credentialService.issueCredential(baseRequest);
      await credentialService.issueCredential({
        ...baseRequest,
        productId: 'CT-2024-002-DEF456',
        credentialType: 'carbon_credit',
      });
      await credentialService.issueCredential({
        ...baseRequest,
        productId: 'CT-2024-003-GHI789',
        credentialType: 'regulatory_compliance',
      });
    });

    test('should search credentials by product ID', async () => {
      const result = await credentialService.searchCredentials({
        productId: 'CT-2024-001-ABC123',
      });

      expect(result.totalCount).toBe(1);
      expect(result.credentials[0].productId).toBe('CT-2024-001-ABC123');
    });

    test('should search credentials by type', async () => {
      const result = await credentialService.searchCredentials({
        credentialType: 'carbon_credit',
      });

      expect(result.totalCount).toBe(1);
      expect(result.credentials[0].credentialType).toBe('carbon_credit');
    });

    test('should paginate search results', async () => {
      const result = await credentialService.searchCredentials({
        limit: 2,
        offset: 0,
      });

      expect(result.credentials.length).toBe(2);
      expect(result.totalCount).toBe(3);
      expect(result.pagination.hasMore).toBe(true);
    });

    test('should sort search results', async () => {
      const result = await credentialService.searchCredentials({
        sortBy: 'issuedAt',
        sortOrder: 'asc',
      });

      expect(result.credentials.length).toBe(3);
      // Verify ascending order by checking timestamps
      for (let i = 1; i < result.credentials.length; i++) {
        expect(result.credentials[i].issuedAt.getTime()).toBeGreaterThanOrEqual(
          result.credentials[i - 1].issuedAt.getTime()
        );
      }
    });
  });

  describe('revokeCredential', () => {
    test('should revoke a credential', async () => {
      // Issue a credential
      const request: CredentialIssuanceRequest = {
        productId: 'CT-2024-001-ABC123',
        credentialType: 'supply_chain',
        validationResults: { score: 95 },
        complianceRules: ['test_rule'],
        verificationLevel: 'basic',
      };

      const issuanceResult = await credentialService.issueCredential(request);
      const credentialId = issuanceResult.credential.id;

      // Revoke it
      const revokedCredential = await credentialService.revokeCredential(
        credentialId,
        'Test revocation'
      );

      expect(revokedCredential.status).toBe('revoked');

      // Verify revocation
      const retrieved = await credentialService.getCredential(credentialId);
      expect(retrieved?.status).toBe('revoked');
    });

    test('should reject revocation of non-existent credential', async () => {
      const nonExistentId = generateCredentialId();

      await expect(
        credentialService.revokeCredential(nonExistentId, 'Test revocation')
      ).rejects.toThrow('Credential not found');
    });

    test('should reject double revocation', async () => {
      // Issue and revoke a credential
      const request: CredentialIssuanceRequest = {
        productId: 'CT-2024-001-ABC123',
        credentialType: 'supply_chain',
        validationResults: { score: 95 },
        complianceRules: ['test_rule'],
        verificationLevel: 'basic',
      };

      const issuanceResult = await credentialService.issueCredential(request);
      const credentialId = issuanceResult.credential.id;

      await credentialService.revokeCredential(
        credentialId,
        'First revocation'
      );

      // Attempt to revoke again
      await expect(
        credentialService.revokeCredential(credentialId, 'Second revocation')
      ).rejects.toThrow('Credential already revoked');
    });
  });

  describe('getProductCredentials', () => {
    test('should get all credentials for a product', async () => {
      const productId = 'CT-2024-001-ABC123';

      // Issue multiple credentials for the same product
      const baseRequest: CredentialIssuanceRequest = {
        productId,
        credentialType: 'supply_chain',
        validationResults: { score: 95 },
        complianceRules: ['test_rule'],
        verificationLevel: 'basic',
      };

      await credentialService.issueCredential(baseRequest);
      await credentialService.issueCredential({
        ...baseRequest,
        credentialType: 'carbon_credit',
      });

      const credentials =
        await credentialService.getProductCredentials(productId);

      expect(credentials.length).toBe(2);
      expect(
        credentials.every(
          (c: ComplianceCredential) => c.productId === productId
        )
      ).toBe(true);
    });

    test('should return empty array for product with no credentials', async () => {
      const credentials = await credentialService.getProductCredentials(
        'CT-2024-999-NOEXIST'
      );
      expect(credentials).toEqual([]);
    });
  });
});
