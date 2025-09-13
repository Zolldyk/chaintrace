/**
 * End-to-end tests for credential verification flow
 *
 * @since 1.0.0
 */

import { test, expect } from '@playwright/test';

test.describe('Credential Verification Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the verification page
    await page.goto('/verify/credential');
  });

  test.describe('Manual Credential Verification', () => {
    test('should allow manual credential ID entry and verification', async ({
      page,
    }) => {
      // Check page title and content
      await expect(page.locator('h1')).toContainText(
        'Verify Compliance Credential'
      );

      // Enter a credential ID
      const credentialInput = page.locator('input[placeholder*="CRED-"]');
      await expect(credentialInput).toBeVisible();
      await credentialInput.fill('CRED-2024-001-ABC123');

      // Click verify button
      const verifyButton = page.locator('button:has-text("Verify")');
      await expect(verifyButton).toBeEnabled();
      await verifyButton.click();

      // Wait for verification to complete
      await expect(page.locator('text=Verifying...')).toBeVisible();

      // Check for results (either success or error state)
      await expect(
        page.locator(
          '[data-testid="verification-result"], .text-red-600, .text-green-600'
        )
      ).toBeVisible({ timeout: 10000 });
    });

    test('should show error for invalid credential ID format', async ({
      page,
    }) => {
      const credentialInput = page.locator('input[placeholder*="CRED-"]');
      await credentialInput.fill('invalid-credential-id');

      const verifyButton = page.locator('button:has-text("Verify")');
      await verifyButton.click();

      // Should show format error
      await expect(
        page.locator('text=Invalid credential ID format')
      ).toBeVisible();
    });

    test('should handle empty credential ID', async ({ page }) => {
      const verifyButton = page.locator('button:has-text("Verify")');

      // Button should be disabled when input is empty
      await expect(verifyButton).toBeDisabled();
    });
  });

  test.describe('QR Code Scanning', () => {
    test('should open QR scanner modal', async ({ page }) => {
      const qrButton = page.locator('button:has-text("Scan QR Code")');
      await expect(qrButton).toBeVisible();
      await qrButton.click();

      // Modal should open
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page.locator('text=Scan Credential QR Code')).toBeVisible();
    });

    test('should close QR scanner modal', async ({ page }) => {
      // Open modal
      await page.locator('button:has-text("Scan QR Code")').click();
      await expect(page.locator('[role="dialog"]')).toBeVisible();

      // Close modal
      const closeButton = page
        .locator(
          '[role="dialog"] button:has-text("×"), [role="dialog"] button[aria-label="Close"]'
        )
        .first();
      await closeButton.click();

      // Modal should be closed
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    });

    test('should handle QR code data parsing', async ({ page }) => {
      // Open QR scanner
      await page.locator('button:has-text("Scan QR Code")').click();

      // Enter QR data in demo input
      const qrDataInput = page.locator('input[placeholder*="QR code"]');
      const validQRData = JSON.stringify({
        type: 'credential_verification',
        credentialId: 'CRED-2024-001-ABC123',
        productId: 'CT-2024-001-ABC123',
        verificationUrl: '/verify/credential/CRED-2024-001-ABC123',
      });

      await qrDataInput.fill(validQRData);
      await page.locator('button:has-text("Parse")').click();

      // Should auto-fill credential ID and start verification
      await expect(page.locator('input[placeholder*="CRED-"]')).toHaveValue(
        'CRED-2024-001-ABC123'
      );
    });
  });

  test.describe('Verification Results Display', () => {
    test('should display verification progress', async ({ page }) => {
      // Enter credential and verify
      await page
        .locator('input[placeholder*="CRED-"]')
        .fill('CRED-2024-001-ABC123');
      await page.locator('button:has-text("Verify")').click();

      // Should show progress steps
      await expect(page.locator('text=Fetching Credential')).toBeVisible();
      await expect(page.locator('text=Verifying Signature')).toBeVisible();
      await expect(page.locator('text=Blockchain Verification')).toBeVisible();
      await expect(page.locator('text=Status Check')).toBeVisible();
    });

    test('should display successful verification result', async ({ page }) => {
      // Mock successful verification by intercepting API call
      await page.route('/api/compliance/credentials/verify', async route => {
        const request = route.request();
        const body = JSON.parse(request.postData() || '{}');

        if (body.credentialId === 'CRED-2024-001-VALID') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              isValid: true,
              credential: {
                id: 'CRED-2024-001-VALID',
                productId: 'CT-2024-001-ABC123',
                issuer: 'ChainTrace Compliance Engine',
                issuedAt: new Date().toISOString(),
                status: 'active',
                credentialType: 'supply_chain',
                metadata: {
                  complianceRules: ['organic_certification'],
                  verificationLevel: 'enhanced',
                  validatedAt: new Date().toISOString(),
                  validationDetails: {},
                },
                signature: 'test-signature',
                hcsMessageId: '0.0.7777777-123456',
              },
              verification: {
                signatureValid: true,
                notExpired: true,
                notRevoked: true,
                verifiedAt: new Date().toISOString(),
              },
            }),
          });
        } else {
          await route.continue();
        }
      });

      // Verify valid credential
      await page
        .locator('input[placeholder*="CRED-"]')
        .fill('CRED-2024-001-VALID');
      await page.locator('button:has-text("Verify")').click();

      // Should show success result
      await expect(page.locator('text=Verified')).toBeVisible();
      await expect(page.locator('text=Credential Verified')).toBeVisible();
    });

    test('should display failed verification result', async ({ page }) => {
      // Mock failed verification
      await page.route('/api/compliance/credentials/verify', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            isValid: false,
            verification: {
              signatureValid: false,
              notExpired: true,
              notRevoked: true,
              verifiedAt: new Date().toISOString(),
            },
            error: {
              code: 'INVALID_SIGNATURE',
              message: 'The credential signature is invalid',
            },
          }),
        });
      });

      await page
        .locator('input[placeholder*="CRED-"]')
        .fill('CRED-2024-001-INVALID');
      await page.locator('button:has-text("Verify")').click();

      // Should show error result
      await expect(page.locator('text=Invalid')).toBeVisible();
      await expect(
        page.locator('text=The credential signature is invalid')
      ).toBeVisible();
    });
  });

  test.describe('Recent Verifications', () => {
    test('should track recent verifications', async ({ page }) => {
      // Mock successful verification
      await page.route('/api/compliance/credentials/verify', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            isValid: true,
            credential: {
              id: 'CRED-2024-001-RECENT',
              productId: 'CT-2024-001-ABC123',
              issuer: 'ChainTrace',
              issuedAt: new Date().toISOString(),
              status: 'active',
              credentialType: 'supply_chain',
              metadata: {
                complianceRules: ['test'],
                verificationLevel: 'basic',
                validatedAt: new Date().toISOString(),
                validationDetails: {},
              },
              signature: 'test',
              hcsMessageId: 'test',
            },
            verification: {
              signatureValid: true,
              notExpired: true,
              notRevoked: true,
              verifiedAt: new Date().toISOString(),
            },
          }),
        });
      });

      // Perform verification
      await page
        .locator('input[placeholder*="CRED-"]')
        .fill('CRED-2024-001-RECENT');
      await page.locator('button:has-text("Verify")').click();

      // Wait for completion
      await expect(page.locator('text=Verified')).toBeVisible();

      // Should show in recent verifications
      await expect(page.locator('text=Recent Verifications')).toBeVisible();
      await expect(page.locator('text=CRED-2024-001-RECENT')).toBeVisible();
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Page should be responsive
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('input[placeholder*="CRED-"]')).toBeVisible();
      await expect(
        page.locator('button:has-text("Scan QR Code")')
      ).toBeVisible();

      // Input should be properly sized
      const input = page.locator('input[placeholder*="CRED-"]');
      await input.fill('CRED-2024-001-ABC123');
      await expect(input).toHaveValue('CRED-2024-001-ABC123');
    });
  });

  test.describe('Error Recovery', () => {
    test('should allow retry after network error', async ({ page }) => {
      let requestCount = 0;

      // Mock network error on first request, success on second
      await page.route('/api/compliance/credentials/verify', async route => {
        requestCount++;
        if (requestCount === 1) {
          await route.abort('failed');
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              isValid: true,
              credential: {
                id: 'CRED-2024-001-RETRY',
                productId: 'CT-2024-001-ABC123',
                issuer: 'ChainTrace',
                issuedAt: new Date().toISOString(),
                status: 'active',
                credentialType: 'supply_chain',
                metadata: {
                  complianceRules: ['test'],
                  verificationLevel: 'basic',
                  validatedAt: new Date().toISOString(),
                  validationDetails: {},
                },
                signature: 'test',
                hcsMessageId: 'test',
              },
              verification: {
                signatureValid: true,
                notExpired: true,
                notRevoked: true,
                verifiedAt: new Date().toISOString(),
              },
            }),
          });
        }
      });

      // First attempt should fail
      await page
        .locator('input[placeholder*="CRED-"]')
        .fill('CRED-2024-001-RETRY');
      await page.locator('button:has-text("Verify")').click();

      // Should show error and retry option
      await expect(page.locator('text=Try Again, text=Retry')).toBeVisible();

      // Click retry
      await page
        .locator('button:has-text("Try Again"), button:has-text("Retry")')
        .first()
        .click();

      // Should succeed on retry
      await expect(page.locator('text=Verified')).toBeVisible();
    });
  });
});

test.describe('Direct Credential Verification Page', () => {
  test('should load specific credential verification page', async ({
    page,
  }) => {
    const credentialId = 'CRED-2024-001-ABC123';

    // Mock the API response
    await page.route(`/api/compliance/credentials/verify`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          isValid: true,
          credential: {
            id: credentialId,
            productId: 'CT-2024-001-ABC123',
            issuer: 'ChainTrace Compliance Engine',
            issuedAt: new Date().toISOString(),
            status: 'active',
            credentialType: 'supply_chain',
            metadata: {
              complianceRules: ['organic_certification'],
              verificationLevel: 'enhanced',
              validatedAt: new Date().toISOString(),
              validationDetails: {},
            },
            signature: 'test-signature',
            hcsMessageId: '0.0.7777777-123456',
          },
          verification: {
            signatureValid: true,
            notExpired: true,
            notRevoked: true,
            verifiedAt: new Date().toISOString(),
          },
        }),
      });
    });

    // Navigate to specific credential page
    await page.goto(`/verify/credential/${credentialId}`);

    // Should show credential ID in header
    await expect(page.locator(`text=${credentialId}`)).toBeVisible();

    // Should show verification result
    await expect(page.locator('text=Credential Verified')).toBeVisible();
    await expect(page.locator('text=Verification Summary')).toBeVisible();
  });

  test('should handle invalid credential ID in URL', async ({ page }) => {
    await page.goto('/verify/credential/invalid-credential-id');

    // Should show error for invalid format
    await expect(
      page.locator('text=Invalid credential ID format')
    ).toBeVisible();
  });
});
