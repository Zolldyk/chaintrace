/**
 * End-to-end tests for QR scanner mobile browser compatibility
 * Tests across Chrome, Firefox, and Safari mobile browsers
 *
 * @file tests/e2e/qr-scanner-mobile.spec.ts
 * @since 1.0.0
 */

import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';

// Define mobile device configurations for testing
const mobileDevices = [
  {
    name: 'iPhone 13',
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
  },
  {
    name: 'Samsung Galaxy S21',
    viewport: { width: 360, height: 800 },
    userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
  },
  {
    name: 'iPad',
    viewport: { width: 768, height: 1024 },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
  }
];

// Mock camera permissions and media stream
const mockCameraSetup = async (page: Page) => {
  await page.addInitScript(() => {
    // Mock getUserMedia to simulate camera access
    navigator.mediaDevices = {
      ...navigator.mediaDevices,
      getUserMedia: async (constraints) => {
        // Create a mock video stream
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');

        // Draw a simple QR code pattern for testing
        if (ctx) {
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, 640, 480);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(220, 190, 200, 100);
          ctx.fillStyle = '#000000';
          ctx.font = '20px Arial';
          ctx.fillText('CT-2024-001-ABC123', 240, 250);
        }

        const stream = canvas.captureStream(30);
        return stream;
      },
      enumerateDevices: async () => [
        {
          deviceId: 'camera1',
          kind: 'videoinput',
          label: 'Mock Camera',
          groupId: 'group1'
        }
      ]
    };

    // Mock permissions API
    navigator.permissions = {
      query: async (permission) => ({
        state: 'granted',
        addEventListener: () => {},
        removeEventListener: () => {}
      })
    };
  });
};

// Test across different mobile browsers
test.describe('QR Scanner Mobile Compatibility', () => {
  mobileDevices.forEach(device => {
    test.describe(`${device.name} Device`, () => {
      let context: BrowserContext;
      let page: Page;

      test.beforeEach(async ({ browser }) => {
        context = await browser.newContext({
          viewport: device.viewport,
          userAgent: device.userAgent,
          permissions: ['camera'],
          hasTouch: true
        });
        page = await context.newPage();

        // Setup camera mocks
        await mockCameraSetup(page);

        // Navigate to homepage
        await page.goto('/');
      });

      test.afterEach(async () => {
        await context.close();
      });

      test('should display QR scanner interface correctly', async () => {
        // Look for QR scanner button on homepage
        const scanButton = page.locator('[data-testid="qr-scan-button"], button:has-text("Scan QR Code")').first();
        await expect(scanButton).toBeVisible();

        // Click to activate scanner
        await scanButton.click();

        // Wait for camera interface to load
        await expect(page.locator('[data-testid="qr-scanner-container"]')).toBeVisible({ timeout: 5000 });

        // Check for scanning instructions
        await expect(page.locator('text=Position QR code')).toBeVisible();

        // Check for video preview
        await expect(page.locator('video')).toBeVisible();
      });

      test('should handle camera permission requests', async () => {
        // Navigate to manual verification page which has QR option
        await page.goto('/verify');

        // Click QR scanner toggle
        const scannerToggle = page.locator('button:has-text("Scan QR Code")');
        await scannerToggle.click();

        // Should show scanner interface without permission errors
        await expect(page.locator('[data-testid="qr-scanner-container"]')).toBeVisible({ timeout: 3000 });

        // Should not show permission denied error
        await expect(page.locator('text=Camera access denied')).not.toBeVisible();
      });

      test('should provide fallback to manual entry', async () => {
        await page.goto('/verify');

        // Activate QR scanner
        const scannerToggle = page.locator('button:has-text("Scan QR Code")');
        await scannerToggle.click();

        // Wait for scanner to be active
        await expect(page.locator('[data-testid="qr-scanner-container"]')).toBeVisible();

        // Look for manual entry fallback button
        const manualEntryButton = page.locator('button:has-text("Enter Manually"), button:has-text("Manual Entry")');
        await expect(manualEntryButton).toBeVisible();

        // Click fallback option
        await manualEntryButton.click();

        // Should show manual entry form
        await expect(page.locator('input[placeholder*="Product ID"], input[name="productId"]')).toBeVisible();
      });

      test('should be responsive on mobile viewport', async () => {
        await page.goto('/');

        // Activate QR scanner
        const scanButton = page.locator('[data-testid="qr-scan-button"], button:has-text("Scan QR Code")').first();
        await scanButton.click();

        // Check scanner container takes full width on mobile
        const scannerContainer = page.locator('[data-testid="qr-scanner-container"]');
        await expect(scannerContainer).toBeVisible();

        const boundingBox = await scannerContainer.boundingBox();
        expect(boundingBox?.width).toBeGreaterThan(device.viewport.width * 0.8); // Should use most of screen width

        // Check controls are touch-friendly (minimum 44px tap targets)
        const controls = page.locator('[data-testid="qr-scanner-controls"] button');
        const controlCount = await controls.count();

        for (let i = 0; i < controlCount; i++) {
          const control = controls.nth(i);
          const controlBox = await control.boundingBox();
          if (controlBox) {
            expect(controlBox.height).toBeGreaterThanOrEqual(44);
            expect(controlBox.width).toBeGreaterThanOrEqual(44);
          }
        }
      });

      test('should handle torch/flashlight functionality', async () => {
        await page.goto('/verify');

        // Activate QR scanner
        const scannerToggle = page.locator('button:has-text("Scan QR Code")');
        await scannerToggle.click();

        await expect(page.locator('[data-testid="qr-scanner-container"]')).toBeVisible();

        // Look for torch toggle (may not be available on all devices)
        const torchButton = page.locator('[data-testid="torch-toggle"], button:has-text("Flash"), button[aria-label*="torch"]');

        // If torch is available, test it
        if (await torchButton.isVisible()) {
          await torchButton.click();

          // Should show torch is active (either visual indicator or aria-pressed)
          await expect(torchButton).toHaveAttribute('aria-pressed', 'true');

          // Click again to turn off
          await torchButton.click();
          await expect(torchButton).toHaveAttribute('aria-pressed', 'false');
        }
      });

      test('should display clear error messages for scanning issues', async () => {
        // Override camera mock to simulate access denied
        await page.addInitScript(() => {
          navigator.mediaDevices.getUserMedia = async () => {
            throw new DOMException('Permission denied', 'NotAllowedError');
          };
        });

        await page.goto('/verify');

        // Try to activate scanner
        const scannerToggle = page.locator('button:has-text("Scan QR Code")');
        await scannerToggle.click();

        // Should show clear error message
        await expect(page.locator('text=Camera access denied, text=Permission denied')).toBeVisible({ timeout: 3000 });

        // Should show fallback option
        await expect(page.locator('button:has-text("Enter Manually")')).toBeVisible();
      });

      test('should handle orientation changes gracefully', async () => {
        await page.goto('/');

        // Start in portrait mode
        await page.setViewportSize({ width: device.viewport.width, height: device.viewport.height });

        // Activate QR scanner
        const scanButton = page.locator('[data-testid="qr-scan-button"], button:has-text("Scan QR Code")').first();
        await scanButton.click();

        await expect(page.locator('[data-testid="qr-scanner-container"]')).toBeVisible();

        // Switch to landscape mode
        await page.setViewportSize({ width: device.viewport.height, height: device.viewport.width });

        // Scanner should still be functional
        await expect(page.locator('[data-testid="qr-scanner-container"]')).toBeVisible();
        await expect(page.locator('video')).toBeVisible();

        // Controls should still be accessible
        await expect(page.locator('[data-testid="qr-scanner-controls"]')).toBeVisible();
      });
    });
  });
});

test.describe('Cross-Browser QR Scanner Features', () => {
  test('should work with simulated QR scan across browsers', async ({ page, browserName }) => {
    await mockCameraSetup(page);

    await page.goto('/verify');

    // Activate QR scanner
    const scannerToggle = page.locator('button:has-text("Scan QR Code")');
    await scannerToggle.click();

    await expect(page.locator('[data-testid="qr-scanner-container"]')).toBeVisible();

    // Simulate successful QR scan by triggering the success callback
    await page.evaluate(() => {
      // Find the QR scanner component and trigger a mock scan success
      const event = new CustomEvent('qr-scan-success', {
        detail: {
          productId: 'CT-2024-001-TEST',
          qrData: 'https://chaintrace.com/verify/CT-2024-001-TEST'
        }
      });

      const scannerContainer = document.querySelector('[data-testid="qr-scanner-container"]');
      if (scannerContainer) {
        scannerContainer.dispatchEvent(event);
      }
    });

    // Should navigate to verification page
    await expect(page).toHaveURL(/.*\/verify\/CT-2024-001-TEST/, { timeout: 5000 });
  });

  test('should handle invalid QR codes appropriately', async ({ page }) => {
    await mockCameraSetup(page);

    await page.goto('/verify');

    // Activate QR scanner
    const scannerToggle = page.locator('button:has-text("Scan QR Code")');
    await scannerToggle.click();

    await expect(page.locator('[data-testid="qr-scanner-container"]')).toBeVisible();

    // Simulate invalid QR scan
    await page.evaluate(() => {
      const event = new CustomEvent('qr-scan-error', {
        detail: {
          message: 'Invalid QR code format',
          code: 'INVALID_QR_FORMAT'
        }
      });

      const scannerContainer = document.querySelector('[data-testid="qr-scanner-container"]');
      if (scannerContainer) {
        scannerContainer.dispatchEvent(event);
      }
    });

    // Should show error message
    await expect(page.locator('text=Invalid QR code format')).toBeVisible({ timeout: 3000 });

    // Should remain on the same page
    await expect(page).toHaveURL(/.*\/verify$/);
  });

  test('should be accessible via keyboard navigation', async ({ page }) => {
    await page.goto('/verify');

    // Tab to QR scanner button
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should be able to activate scanner with Enter
    await page.keyboard.press('Enter');

    await expect(page.locator('[data-testid="qr-scanner-container"]')).toBeVisible();

    // Should be able to tab to fallback button
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toContainText(/Manual Entry|Enter Manually/);

    // Should be able to activate fallback with Enter
    await page.keyboard.press('Enter');
    await expect(page.locator('input[name="productId"]')).toBeVisible();
  });
});