/**
 * E2E tests for complete product verification workflow
 *
 * Tests the full user journey from homepage to product verification,
 * including responsive design, error handling, and accessibility.
 *
 * @since 1.0.0
 */

import { test, expect, Page } from '@playwright/test';

/**
 * Mock API responses for testing
 */
const mockProductData = {
  product: {
    productId: 'PROD-2024-001',
    name: 'Test Product',
    description: 'A test product for verification',
    category: 'Electronics',
    status: 'verified',
    verified: true,
    createdAt: '2024-09-01T08:00:00Z',
    updatedAt: '2024-09-03T10:00:00Z',
    lastVerified: '2024-09-03T10:00:00Z',
    expiresAt: '2024-12-01T00:00:00Z',
    origin: {
      address: '123 Manufacturing St, Factory City, FC 12345',
      country: 'United States',
    },
    events: [
      {
        eventType: 'created',
        timestamp: '2024-09-01T08:00:00Z',
        actor: {
          name: 'John Manufacturer',
          role: 'Quality Inspector',
          walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        },
        location: {
          address: '123 Manufacturing St, Factory City, FC 12345',
          country: 'United States',
        },
        transactionId: '0xabcdef1234567890abcdef1234567890abcdef12',
      },
      {
        eventType: 'verified',
        timestamp: '2024-09-02T10:30:00Z',
        actor: {
          name: 'Jane Verifier',
          role: 'Quality Assurance',
        },
        transactionId: '0xfedcba0987654321fedcba0987654321fedcba09',
      },
    ],
  },
  metadata: {
    requestedAt: '2024-09-03T10:30:00Z',
    responseTime: 1250,
    fromCache: false,
  },
};

const mockErrorResponse = {
  code: 'PRODUCT_NOT_FOUND',
  message:
    "Product 'INVALID-001' not found in blockchain records. Please verify the product ID is correct.",
  timestamp: '2024-09-03T10:30:00Z',
  retryable: false,
};

/**
 * Helper function to setup API mocking
 */
async function setupApiMocks(page: Page) {
  // Mock successful product verification
  await page.route('**/api/products/PROD-2024-001/verify', route => {
    route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Response-Time': '1250',
        'X-From-Cache': 'false',
      },
      body: JSON.stringify(mockProductData),
    });
  });

  // Mock product not found error
  await page.route('**/api/products/INVALID-001/verify', route => {
    route.fulfill({
      status: 404,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockErrorResponse),
    });
  });

  // Mock timeout error
  await page.route('**/api/products/TIMEOUT-001/verify', route => {
    // Simulate a timeout by delaying the response
    setTimeout(() => {
      route.fulfill({
        status: 503,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: 'MIRROR_NODE_TIMEOUT',
          message:
            'The verification request timed out. The product may exist but the service is currently slow. Please try again.',
          timestamp: new Date().toISOString(),
          retryable: true,
        }),
      });
    }, 5000);
  });

  // Mock rate limit error
  await page.route('**/api/products/RATELIMIT-001/verify', route => {
    route.fulfill({
      status: 429,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again in a few moments.',
        timestamp: new Date().toISOString(),
        retryable: true,
        details: { retryAfter: 60 },
      }),
    });
  });
}

test.describe('Product Verification E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test.describe('Homepage Verification Flow', () => {
    test('should complete successful verification from homepage', async ({
      page,
    }) => {
      // Navigate to homepage
      await page.goto('/');

      // Verify homepage content
      await expect(page.locator('h1')).toContainText(
        'Verify Product Authenticity'
      );
      await expect(
        page.locator('text=Enter a product ID or scan a QR code')
      ).toBeVisible();

      // Find the product lookup form
      const productInput = page.locator(
        'input[placeholder*="Enter product ID"]'
      );
      const submitButton = page.locator('button:has-text("Verify Product")');

      await expect(productInput).toBeVisible();
      await expect(submitButton).toBeVisible();

      // Enter valid product ID
      await productInput.fill('PROD-2024-001');
      await expect(submitButton).toBeEnabled();

      // Submit the form
      await submitButton.click();

      // Should navigate to verification page
      await expect(page).toHaveURL('/verify/PROD-2024-001');

      // Wait for verification to complete
      await expect(page.locator('text=Verifying product')).toBeVisible();
      await expect(page.locator('text=Verified')).toBeVisible();

      // Verify product details are displayed
      await expect(page.locator('text=Test Product')).toBeVisible();
      await expect(
        page.locator('text=A test product for verification')
      ).toBeVisible();
      await expect(
        page.locator('text=Product ID: PROD-2024-001')
      ).toBeVisible();

      // Verify timeline is displayed
      await expect(page.locator('text=Supply Chain Journey')).toBeVisible();
      await expect(page.locator('text=Created')).toBeVisible();
      await expect(page.locator('text=John Manufacturer')).toBeVisible();
    });

    test('should handle QR scanner placeholder', async ({ page }) => {
      await page.goto('/');

      // Verify QR scanner section
      await expect(page.locator('text=QR Code Scanner')).toBeVisible();
      await expect(
        page.locator(
          'text=QR code scanning will be available in future updates'
        )
      ).toBeVisible();
      await expect(page.locator('text=Coming Soon')).toBeVisible();
    });

    test('should display feature information', async ({ page }) => {
      await page.goto('/');

      // Verify feature cards
      await expect(page.locator('text=Instant Verification')).toBeVisible();
      await expect(page.locator('text=Supply Chain Journey')).toBeVisible();
      await expect(page.locator('text=Blockchain Security')).toBeVisible();
    });
  });

  test.describe('Manual Verification Page', () => {
    test('should complete verification from manual page', async ({ page }) => {
      // Navigate to manual verification page
      await page.goto('/verify');

      // Verify page content
      await expect(page.locator('h1')).toContainText('Product Verification');
      await expect(
        page.locator('text=Enter a product ID to verify')
      ).toBeVisible();

      // Enter product ID and verify
      const productInput = page.locator(
        'input[placeholder*="Enter product ID"]'
      );
      await productInput.fill('PROD-2024-001');

      const submitButton = page.locator('button:has-text("Verify Product")');
      await submitButton.click();

      // Should navigate to product page
      await expect(page).toHaveURL('/verify/PROD-2024-001');
      await expect(page.locator('text=Verified')).toBeVisible();
    });
  });

  test.describe('Product Verification Details Page', () => {
    test('should display complete product verification details', async ({
      page,
    }) => {
      // Navigate directly to product page
      await page.goto('/verify/PROD-2024-001');

      // Wait for loading to complete
      await expect(page.locator('text=Verifying product')).toBeVisible();
      await expect(page.locator('text=Verified')).toBeVisible();

      // Verify verification status display
      const verificationStatus = page.locator('[role="status"]');
      await expect(verificationStatus).toContainText('Verified');
      await expect(
        page.locator('text=This product has been successfully verified')
      ).toBeVisible();

      // Verify product details
      await expect(page.locator('text=Test Product')).toBeVisible();
      await expect(
        page.locator('text=A test product for verification')
      ).toBeVisible();
      await expect(page.locator('text=Category: Electronics')).toBeVisible();

      // Verify timeline events
      await expect(page.locator('text=Supply Chain Journey')).toBeVisible();
      await expect(page.locator('text=Created')).toBeVisible();
      await expect(page.locator('text=Verified')).toBeVisible();

      // Verify actor information
      await expect(page.locator('text=John Manufacturer')).toBeVisible();
      await expect(page.locator('text=Jane Verifier')).toBeVisible();

      // Verify transaction IDs are displayed (truncated)
      await expect(page.locator('text=0xabcd...ef12')).toBeVisible();
      await expect(page.locator('text=0xfedc...ba09')).toBeVisible();

      // Verify action buttons
      await expect(
        page.locator('button:has-text("Refresh Data")')
      ).toBeVisible();
      await expect(
        page.locator('button:has-text("Print Report")')
      ).toBeVisible();
      await expect(
        page.locator('button:has-text("Search Another Product")')
      ).toBeVisible();
    });

    test('should handle refresh functionality', async ({ page }) => {
      await page.goto('/verify/PROD-2024-001');
      await expect(page.locator('text=Verified')).toBeVisible();

      // Click refresh button
      const refreshButton = page.locator('button:has-text("Refresh Data")');
      await refreshButton.click();

      // Should show refreshing state
      await expect(
        page.locator('button:has-text("Refreshing...")')
      ).toBeVisible();

      // Should complete refresh
      await expect(page.locator('text=Verified')).toBeVisible();
      await expect(refreshButton).toContainText('Refresh Data');
    });

    test('should handle print functionality', async ({ page }) => {
      await page.goto('/verify/PROD-2024-001');
      await expect(page.locator('text=Verified')).toBeVisible();

      // Mock window.print
      await page.evaluate(() => {
        window.print = () => console.log('Print triggered');
      });

      // Click print button
      const printButton = page.locator('button:has-text("Print Report")');
      await printButton.click();

      // Verify print was triggered (in real browser, print dialog would open)
    });

    test('should navigate back to search', async ({ page }) => {
      await page.goto('/verify/PROD-2024-001');
      await expect(page.locator('text=Verified')).toBeVisible();

      // Click "Search Another Product" button
      const searchButton = page.locator(
        'button:has-text("Search Another Product")'
      );
      await searchButton.click();

      // Should navigate to verification page
      await expect(page).toHaveURL('/verify');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle product not found error', async ({ page }) => {
      await page.goto('/verify/INVALID-001');

      // Wait for error to appear
      await expect(
        page.locator('text=Search for a different product')
      ).toBeVisible();
      await expect(
        page.locator("text=Product 'INVALID-001' not found")
      ).toBeVisible();

      // Verify error state elements
      await expect(page.locator('input[value="INVALID-001"]')).toBeVisible();
      await expect(
        page.locator('button:has-text("Start New Search")')
      ).toBeVisible();

      // Should not show retry button for non-retryable errors
      await expect(
        page.locator('button:has-text("Try Again")')
      ).not.toBeVisible();
    });

    test('should handle timeout error with retry', async ({ page }) => {
      await page.goto('/verify/TIMEOUT-001');

      // Wait for timeout error
      await expect(page.locator('text=timed out')).toBeVisible({
        timeout: 10000,
      });

      // Should show retry button for retryable errors
      await expect(page.locator('button:has-text("Try Again")')).toBeVisible();
    });

    test('should handle rate limit error', async ({ page }) => {
      await page.goto('/verify/RATELIMIT-001');

      // Wait for rate limit error
      await expect(page.locator('text=Too many requests')).toBeVisible();
      await expect(page.locator('button:has-text("Try Again")')).toBeVisible();
    });

    test('should retry failed requests', async ({ page }) => {
      await page.goto('/verify/TIMEOUT-001');

      // Wait for timeout error
      await expect(page.locator('text=timed out')).toBeVisible({
        timeout: 10000,
      });

      // Mock successful retry
      await page.route('**/api/products/TIMEOUT-001/verify', route => {
        route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...mockProductData,
            product: { ...mockProductData.product, productId: 'TIMEOUT-001' },
          }),
        });
      });

      // Click retry button
      const retryButton = page.locator('button:has-text("Try Again")');
      await retryButton.click();

      // Should show success after retry
      await expect(page.locator('text=Verified')).toBeVisible();
    });
  });

  test.describe('Form Validation', () => {
    test('should validate product ID format on homepage', async ({ page }) => {
      await page.goto('/');

      const productInput = page.locator(
        'input[placeholder*="Enter product ID"]'
      );
      const submitButton = page.locator('button:has-text("Verify Product")');

      // Test empty input
      await productInput.fill('');
      await productInput.blur();
      await expect(submitButton).toBeDisabled();

      // Test invalid format
      await productInput.fill('x');
      await productInput.blur();
      await expect(
        page.locator('text=Please enter a valid product ID')
      ).toBeVisible();
      await expect(submitButton).toBeDisabled();

      // Test valid format
      await productInput.fill('PROD-2024-001');
      await productInput.blur();
      await expect(
        page.locator('text=Please enter a valid product ID')
      ).not.toBeVisible();
      await expect(submitButton).toBeEnabled();
    });

    test('should validate product ID format on verify page', async ({
      page,
    }) => {
      await page.goto('/verify');

      const productInput = page.locator(
        'input[placeholder*="Enter product ID"]'
      );
      const submitButton = page.locator('button:has-text("Verify Product")');

      // Test validation similar to homepage
      await productInput.fill('xx');
      await productInput.blur();
      await expect(
        page.locator('text=Please enter a valid product ID')
      ).toBeVisible();
      await expect(submitButton).toBeDisabled();
    });
  });

  test.describe('Loading States', () => {
    test('should show loading states during verification', async ({ page }) => {
      // Mock delayed response
      await page.route('**/api/products/SLOW-001/verify', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...mockProductData,
            product: { ...mockProductData.product, productId: 'SLOW-001' },
          }),
        });
      });

      await page.goto('/verify/SLOW-001');

      // Should show loading state
      await expect(
        page.locator('text=Verifying product SLOW-001')
      ).toBeVisible();

      // Should complete loading
      await expect(page.locator('text=Verified')).toBeVisible();
    });

    test('should show loading states in form submission', async ({ page }) => {
      await page.goto('/');

      // Mock delayed navigation
      await page.route('**/verify/SLOW-001', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        route.continue();
      });

      const productInput = page.locator(
        'input[placeholder*="Enter product ID"]'
      );
      const submitButton = page.locator('button:has-text("Verify Product")');

      await productInput.fill('SLOW-001');
      await submitButton.click();

      // Should show searching state
      await expect(
        page.locator('button:has-text("Searching...")')
      ).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels and roles', async ({ page }) => {
      await page.goto('/verify/PROD-2024-001');
      await expect(page.locator('text=Verified')).toBeVisible();

      // Check verification status ARIA
      const statusElement = page.locator('[role="status"]');
      await expect(statusElement).toHaveAttribute(
        'aria-label',
        /Verification status/
      );

      // Check form labels
      await page.goto('/');
      const productInput = page.locator(
        'input[placeholder*="Enter product ID"]'
      );
      await expect(productInput).toHaveAttribute('aria-describedby');
      await expect(productInput).toHaveAttribute('aria-invalid', 'false');
    });

    test('should handle keyboard navigation', async ({ page }) => {
      await page.goto('/');

      const productInput = page.locator(
        'input[placeholder*="Enter product ID"]'
      );
      const submitButton = page.locator('button:has-text("Verify Product")');

      // Tab navigation should work
      await productInput.focus();
      await expect(productInput).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(submitButton).toBeFocused();

      // Enter key should submit form
      await productInput.focus();
      await productInput.fill('PROD-2024-001');
      await page.keyboard.press('Enter');

      await expect(page).toHaveURL('/verify/PROD-2024-001');
    });

    test('should announce errors to screen readers', async ({ page }) => {
      await page.goto('/verify/INVALID-001');

      await expect(
        page.locator("text=Product 'INVALID-001' not found")
      ).toBeVisible();

      // Error message should have role="alert" for screen readers
      const errorElement = page
        .locator("text=Product 'INVALID-001' not found")
        .first();
      await expect(
        errorElement.locator('xpath=ancestor::*[@role="alert"]')
      ).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should work correctly on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      // Verify mobile layout
      await expect(page.locator('h1')).toContainText(
        'Verify Product Authenticity'
      );

      const productInput = page.locator(
        'input[placeholder*="Enter product ID"]'
      );
      await expect(productInput).toBeVisible();

      // Form should still work on mobile
      await productInput.fill('PROD-2024-001');
      const submitButton = page.locator('button:has-text("Verify Product")');
      await submitButton.click();

      await expect(page).toHaveURL('/verify/PROD-2024-001');
      await expect(page.locator('text=Verified')).toBeVisible();
    });

    test('should work correctly on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/verify/PROD-2024-001');

      await expect(page.locator('text=Verified')).toBeVisible();
      await expect(page.locator('text=Test Product')).toBeVisible();
      await expect(page.locator('text=Supply Chain Journey')).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should handle browser back/forward navigation', async ({ page }) => {
      await page.goto('/');

      // Navigate to verification
      const productInput = page.locator(
        'input[placeholder*="Enter product ID"]'
      );
      await productInput.fill('PROD-2024-001');
      await page.locator('button:has-text("Verify Product")').click();

      await expect(page).toHaveURL('/verify/PROD-2024-001');

      // Go back
      await page.goBack();
      await expect(page).toHaveURL('/');

      // Go forward
      await page.goForward();
      await expect(page).toHaveURL('/verify/PROD-2024-001');
    });

    test('should handle direct URL access', async ({ page }) => {
      // Direct access to product page should work
      await page.goto('/verify/PROD-2024-001');
      await expect(page.locator('text=Verified')).toBeVisible();

      // Direct access to verify page should work
      await page.goto('/verify');
      await expect(page.locator('h1')).toContainText('Product Verification');
    });
  });
});
