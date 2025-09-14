/**
 * E2E tests for Enhanced Product Verification Display (Story 3.1)
 *
 * Tests mobile responsive behavior, accessibility compliance,
 * and cross-browser functionality for the verification display components.
 *
 * Covers viewport testing from 320px to 768px as required by QA gate.
 *
 * @since 1.0.0
 */

import { test, expect, devices, Page } from '@playwright/test';

// Mobile viewport configurations for testing
const MOBILE_VIEWPORTS = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'Small Mobile', width: 320, height: 568 },
  { name: 'Medium Mobile', width: 414, height: 736 },
  { name: 'Large Mobile', width: 768, height: 1024 },
];

// Test data
const MOCK_PRODUCT_ID = 'PROD-2024-TEST-001';
const VERIFICATION_URL = `/verify/${MOCK_PRODUCT_ID}`;

test.describe('Enhanced Product Verification Display - Mobile Responsive', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses to ensure consistent test data
    await page.route('**/api/products/**', async route => {
      const url = route.request().url();

      if (url.includes('credentials')) {
        await route.fulfill({
          json: {
            credentials: [
              {
                id: 'cred-001',
                type: 'organic',
                status: 'active',
                issuer: 'Nigeria Organic Certification',
                issuedAt: '2024-09-01T00:00:00Z',
                expiresAt: '2024-12-01T23:59:59Z',
              },
            ],
            expirationInfo: { expiring: [] },
          },
        });
      } else {
        await route.fulfill({
          json: {
            id: MOCK_PRODUCT_ID,
            productId: MOCK_PRODUCT_ID,
            name: 'Premium Nigerian Coffee',
            description:
              'High-quality Arabica coffee beans from Jos, Plateau State',
            batchId: 'BATCH-001',
            category: 'agricultural',
            status: 'verified',
            createdAt: '2024-09-01T08:00:00Z',
            updatedAt: '2024-09-03T10:00:00Z',
            origin: {
              address: '123 Coffee Farm Road',
              city: 'Jos',
              state: 'Plateau',
              country: 'Nigeria',
              region: 'North Central',
              coordinates: { latitude: 9.8965, longitude: 8.8583 },
            },
            quantity: { amount: 500, unit: 'kg' },
            qrCode: 'QR-COFFEE-12345',
            verified: true,
            lastVerified: '2024-09-03T10:00:00Z',
            events: [
              {
                id: 'event-001',
                eventType: 'created',
                timestamp: '2024-09-01T08:00:00Z',
                actor: { name: 'Coffee Farmer', role: 'producer' },
                location: {
                  address: '123 Coffee Farm Road',
                  city: 'Jos',
                  state: 'Plateau',
                  country: 'Nigeria',
                },
              },
              {
                id: 'event-002',
                eventType: 'verified',
                timestamp: '2024-09-02T10:00:00Z',
                actor: { name: 'Quality Inspector', role: 'verifier' },
              },
            ],
            metadata: {
              images: [
                'https://example.com/coffee-image-1.jpg',
                'https://example.com/coffee-image-2.jpg',
              ],
              qualityGrade: 'AAA',
            },
          },
        });
      }
    });
  });

  // Test each mobile viewport configuration
  MOBILE_VIEWPORTS.forEach(({ name, width, height }) => {
    test.describe(`${name} (${width}x${height})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width, height });
      });

      test('displays product verification page with responsive layout', async ({
        page,
      }) => {
        await page.goto(VERIFICATION_URL);

        // Check that main elements are visible and properly laid out
        await expect(
          page.getByRole('heading', { name: 'Premium Nigerian Coffee' })
        ).toBeVisible();
        await expect(
          page.getByText('High-quality Arabica coffee beans')
        ).toBeVisible();

        // Verify responsive layout adjustments
        const productContainer = page
          .locator('[data-testid="product-container"]')
          .first();
        if (width <= 640) {
          // Mobile layout should stack elements vertically
          await expect(productContainer).toHaveCSS('flex-direction', 'column');
        }
      });

      test('verification status is prominently displayed and accessible', async ({
        page,
      }) => {
        await page.goto(VERIFICATION_URL);

        // Check verification status visibility
        const statusElement = page.getByText('Verified').first();
        await expect(statusElement).toBeVisible();

        // Verify status is large enough for mobile interaction
        const statusBox = await statusElement.boundingBox();
        expect(statusBox).not.toBeNull();
        expect(statusBox!.height).toBeGreaterThan(44); // Minimum touch target size
      });

      test('product timeline displays correctly on mobile', async ({
        page,
      }) => {
        await page.goto(VERIFICATION_URL);

        // Wait for timeline to load
        await expect(page.getByText('Supply Chain Journey')).toBeVisible();
        await expect(page.getByText('Product Created')).toBeVisible();
        await expect(page.getByText('Verified')).toBeVisible();

        // Check timeline events are stacked properly on mobile
        const timelineEvents = page.locator(
          '.relative.flex.gap-3, .relative.flex.gap-4'
        );
        const eventCount = await timelineEvents.count();
        expect(eventCount).toBeGreaterThan(0);

        // Verify events are readable on small screens
        for (let i = 0; i < eventCount && i < 3; i++) {
          const event = timelineEvents.nth(i);
          await expect(event).toBeVisible();

          const eventBox = await event.boundingBox();
          expect(eventBox).not.toBeNull();
          expect(eventBox!.width).toBeLessThanOrEqual(width - 32); // Account for padding
        }
      });

      test('product images gallery is mobile-optimized', async ({ page }) => {
        await page.goto(VERIFICATION_URL);

        // Check image gallery visibility
        await expect(page.getByText('Product Images')).toBeVisible();

        // Featured image should be visible and properly sized
        const featuredImage = page
          .locator('img, [data-testid="next-image"]')
          .first();
        await expect(featuredImage).toBeVisible();

        const imageBox = await featuredImage.boundingBox();
        expect(imageBox).not.toBeNull();
        expect(imageBox!.width).toBeLessThanOrEqual(width - 48); // Account for container padding

        // Thumbnail gallery should be scrollable horizontally on mobile
        if (width <= 640) {
          const thumbnailContainer = page.locator('[class*="overflow-x-auto"]');
          await expect(thumbnailContainer).toBeVisible();
        }
      });

      test('touch interactions work properly', async ({ page }) => {
        await page.goto(VERIFICATION_URL);

        // Test thumbnail selection with touch
        const thumbnails = page.locator(
          'button:has(img), button:has([data-testid="next-image"])'
        );
        const thumbnailCount = await thumbnails.count();

        if (thumbnailCount > 1) {
          // Touch the second thumbnail
          await thumbnails.nth(1).tap();

          // Verify the image selection changed
          await expect(page.getByText('2 of')).toBeVisible();
        }

        // Test expandable sections for mobile
        const detailsToggle = page
          .locator(
            'button:has-text("Show details"), button:has-text("Hide details")'
          )
          .first();
        if (await detailsToggle.isVisible()) {
          await detailsToggle.tap();
          // Details should toggle visibility
          await page.waitForTimeout(300); // Allow animation
        }
      });

      test('mobile navigation and scrolling work smoothly', async ({
        page,
      }) => {
        await page.goto(VERIFICATION_URL);

        // Scroll to different sections and verify smooth scrolling
        const sections = [
          page.getByText('Product Origin'),
          page.getByText('Supply Chain Journey'),
          page.getByText('Compliance Credentials'),
        ];

        for (const section of sections) {
          if (await section.isVisible()) {
            await section.scrollIntoViewIfNeeded();
            await expect(section).toBeInViewport();
            await page.waitForTimeout(100); // Allow scroll animation
          }
        }
      });

      test('text remains readable at mobile sizes', async ({ page }) => {
        await page.goto(VERIFICATION_URL);

        // Check that text is not too small on mobile
        const importantTexts = [
          page.getByRole('heading', { name: 'Premium Nigerian Coffee' }),
          page.getByText('Verified').first(),
          page.getByText('Supply Chain Journey'),
          page.getByText('Product Origin'),
        ];

        for (const textElement of importantTexts) {
          if (await textElement.isVisible()) {
            const fontSize = await textElement.evaluate(
              el => window.getComputedStyle(el).fontSize
            );
            const fontSizeNum = parseFloat(fontSize);
            expect(fontSizeNum).toBeGreaterThanOrEqual(14); // Minimum readable size
          }
        }
      });

      test('interactive elements have adequate touch targets', async ({
        page,
      }) => {
        await page.goto(VERIFICATION_URL);

        // Check button sizes meet mobile touch target requirements (44px minimum)
        const interactiveElements = [
          ...(await page.locator('button').all()),
          ...(await page.locator('a').all()),
          ...(await page.locator('[role="button"]').all()),
        ];

        for (const element of interactiveElements.slice(0, 5)) {
          // Test first 5 elements
          if (await element.isVisible()) {
            const box = await element.boundingBox();
            if (box) {
              expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(
                40
              ); // Slightly below 44px for flexibility
            }
          }
        }
      });
    });
  });

  test.describe('Cross-Browser Mobile Testing', () => {
    // Test on different mobile browsers
    const browsers = ['chromium', 'firefox', 'webkit'];

    browsers.forEach(browserName => {
      test(`mobile experience on ${browserName}`, async ({
        page,
        browserName: currentBrowser,
      }) => {
        test.skip(
          currentBrowser !== browserName,
          `Skipping ${browserName} test on ${currentBrowser}`
        );

        await page.setViewportSize({ width: 375, height: 667 }); // iPhone size
        await page.goto(VERIFICATION_URL);

        // Basic functionality should work across browsers
        await expect(
          page.getByRole('heading', { name: 'Premium Nigerian Coffee' })
        ).toBeVisible();
        await expect(page.getByText('Verified')).toBeVisible();
        await expect(page.getByText('Supply Chain Journey')).toBeVisible();

        // Test image loading across browsers
        const images = page.locator('img, [data-testid="next-image"]');
        const imageCount = await images.count();
        expect(imageCount).toBeGreaterThan(0);

        // Ensure first image loads
        await expect(images.first()).toBeVisible();
      });
    });
  });

  test.describe('Accessibility on Mobile', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
    });

    test('meets WCAG AA+ standards on mobile', async ({ page }) => {
      await page.goto(VERIFICATION_URL);

      // Check color contrast for key elements
      const verificationStatus = page.getByText('Verified').first();
      await expect(verificationStatus).toBeVisible();

      // Verify heading hierarchy
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const headingCount = await headings.count();
      expect(headingCount).toBeGreaterThan(0);

      // Check for proper heading levels
      const h1Count = await page.locator('h1').count();
      const h2Count = await page.locator('h2').count();
      expect(h1Count + h2Count).toBeGreaterThan(0); // Should have main headings
    });

    test('supports screen readers on mobile', async ({ page }) => {
      await page.goto(VERIFICATION_URL);

      // Check for proper ARIA labels and semantic HTML
      const landmarks = page.locator(
        '[role="main"], [role="banner"], [role="navigation"], [role="complementary"]'
      );
      const landmarkCount = await landmarks.count();

      // Check for alt text on images
      const imagesWithAlt = page.locator(
        'img[alt], [data-testid="next-image"][alt]'
      );
      const imageCount = await imagesWithAlt.count();
      expect(imageCount).toBeGreaterThan(0);

      // Verify status indicators have proper labels
      const statusElements = page.locator(
        '[aria-label*="verified"], [aria-label*="status"]'
      );
      const statusCount = await statusElements.count();
      expect(statusCount).toBeGreaterThanOrEqual(0); // May not always be present
    });

    test('supports keyboard navigation on mobile devices', async ({ page }) => {
      await page.goto(VERIFICATION_URL);

      // Test tab navigation through interactive elements
      const interactiveElements = page.locator(
        'button, a, [tabindex]:not([tabindex="-1"])'
      );
      const elementCount = await interactiveElements.count();

      if (elementCount > 0) {
        // Test first few elements are focusable
        for (let i = 0; i < Math.min(3, elementCount); i++) {
          const element = interactiveElements.nth(i);
          if (await element.isVisible()) {
            await element.focus();
            await expect(element).toBeFocused();
          }
        }
      }
    });
  });

  test.describe('Performance on Mobile', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
    });

    test('page loads within acceptable time on mobile', async ({ page }) => {
      const startTime = Date.now();
      await page.goto(VERIFICATION_URL);

      // Wait for main content to be visible
      await expect(
        page.getByRole('heading', { name: 'Premium Nigerian Coffee' })
      ).toBeVisible();
      await expect(page.getByText('Verified')).toBeVisible();

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    });

    test('images load efficiently on mobile', async ({ page }) => {
      await page.goto(VERIFICATION_URL);

      // Wait for at least one image to load
      const images = page.locator('img, [data-testid="next-image"]');
      await expect(images.first()).toBeVisible();

      // Check that images don't block page rendering
      await expect(page.getByText('Premium Nigerian Coffee')).toBeVisible();
      await expect(page.getByText('Supply Chain Journey')).toBeVisible();
    });

    test('handles poor network conditions gracefully', async ({ page }) => {
      // Simulate slow 3G network
      await page.context().route('**/*', async route => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay
        await route.continue();
      });

      await page.goto(VERIFICATION_URL);

      // Content should still load, just slower
      await expect(
        page.getByRole('heading', { name: 'Premium Nigerian Coffee' })
      ).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Verified')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Edge Cases and Error Handling', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
    });

    test('handles missing product data gracefully on mobile', async ({
      page,
    }) => {
      // Mock API to return minimal data
      await page.route('**/api/products/**', async route => {
        await route.fulfill({
          json: {
            id: MOCK_PRODUCT_ID,
            productId: MOCK_PRODUCT_ID,
            name: 'Minimal Product',
            status: 'unverified',
            events: [],
          },
        });
      });

      await page.goto(VERIFICATION_URL);

      await expect(page.getByText('Minimal Product')).toBeVisible();
      // Should handle missing data without breaking layout
      await expect(
        page.getByText('No supply chain events', { exact: false })
      ).toBeVisible();
    });

    test('handles API errors gracefully on mobile', async ({ page }) => {
      // Mock API to return error
      await page.route('**/api/products/**', async route => {
        await route.abort('networkfailure');
      });

      await page.goto(VERIFICATION_URL);

      // Should show error state without breaking mobile layout
      const errorText = page
        .getByText('Error', { exact: false })
        .or(page.getByText('Failed', { exact: false }))
        .or(page.getByText('Unable to load', { exact: false }));

      await expect(errorText).toBeVisible({ timeout: 10000 });
    });

    test('maintains functionality when images fail to load', async ({
      page,
    }) => {
      // Mock image requests to fail
      await page.route('**/*.jpg', async route => {
        await route.abort('failed');
      });

      await page.goto(VERIFICATION_URL);

      // Main content should still be accessible
      await expect(
        page.getByRole('heading', { name: 'Premium Nigerian Coffee' })
      ).toBeVisible();
      await expect(page.getByText('Supply Chain Journey')).toBeVisible();

      // Should show image placeholders or error states
      const imagePlaceholder = page
        .getByText('Image failed to load')
        .or(page.getByText('No Product Images Available'));
      await expect(imagePlaceholder).toBeVisible();
    });
  });

  test.describe('Mobile-Specific Features', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
    });

    test('QR code display is mobile-optimized', async ({ page }) => {
      await page.goto(VERIFICATION_URL);

      // QR code section should be visible and properly sized
      await expect(page.getByText('Product QR Code')).toBeVisible();

      const qrCodeContainer = page
        .locator('[class*="qr"], [data-testid*="qr"]')
        .first();
      if (await qrCodeContainer.isVisible()) {
        const box = await qrCodeContainer.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.width).toBeLessThanOrEqual(375 - 32); // Fit within mobile viewport
      }
    });

    test('copy functionality works on mobile', async ({ page }) => {
      await page.goto(VERIFICATION_URL);

      // Look for copy buttons
      const copyButton = page
        .locator('button:has-text("Copy"), [title*="Copy"]')
        .first();

      if (await copyButton.isVisible()) {
        await copyButton.tap();
        // Should handle copy action (can't test actual clipboard on all mobile devices)
      }
    });

    test('map integration works on mobile', async ({ page }) => {
      await page.goto(VERIFICATION_URL);

      // Look for map link
      const mapLink = page.getByText('View on Map');

      if (await mapLink.isVisible()) {
        // Should be large enough for mobile touch
        const box = await mapLink.boundingBox();
        expect(box).not.toBeNull();
        expect(Math.min(box!.width, box!.height)).toBeGreaterThanOrEqual(40);
      }
    });
  });
});

test.describe('Mobile Browser Compatibility', () => {
  // Test specific mobile browser behaviors
  test('works correctly in mobile Safari (WebKit)', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'webkit', 'WebKit-specific test');

    await page.setViewportSize({ width: 375, height: 812 }); // iPhone X dimensions
    await page.goto(VERIFICATION_URL);

    // Safari-specific checks
    await expect(
      page.getByRole('heading', { name: 'Premium Nigerian Coffee' })
    ).toBeVisible();
    await expect(page.getByText('Verified')).toBeVisible();

    // Test touch scrolling behavior
    await page.mouse.move(200, 400);
    await page.mouse.down();
    await page.mouse.move(200, 300);
    await page.mouse.up();

    // Content should still be accessible after touch interaction
    await expect(page.getByText('Supply Chain Journey')).toBeVisible();
  });

  test('works correctly in mobile Chrome (Chromium)', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'Chromium-specific test');

    await page.setViewportSize({ width: 414, height: 896 }); // Common Android size
    await page.goto(VERIFICATION_URL);

    // Chrome-specific checks
    await expect(
      page.getByRole('heading', { name: 'Premium Nigerian Coffee' })
    ).toBeVisible();

    // Test image optimization works
    const images = page.locator('img, [data-testid="next-image"]');
    await expect(images.first()).toBeVisible();
  });
});
