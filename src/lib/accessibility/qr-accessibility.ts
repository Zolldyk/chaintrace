/**
 * QR Code Accessibility Utilities
 *
 * Comprehensive accessibility utilities for QR code components,
 * ensuring WCAG AA+ compliance and inclusive design.
 *
 * @since 2.4.0
 */

import React from 'react';

/**
 * Color contrast ratios for WCAG compliance
 */
export const CONTRAST_RATIOS = {
  AA_NORMAL: 4.5,
  AA_LARGE: 3,
  AAA_NORMAL: 7,
  AAA_LARGE: 4.5,
} as const;

/**
 * Minimum touch target sizes (in pixels)
 */
export const TOUCH_TARGET_SIZES = {
  MINIMUM: 44, // WCAG 2.1 AA minimum
  RECOMMENDED: 48, // Better for accessibility
  COMFORTABLE: 56, // iOS/Material Design recommendation
} as const;

/**
 * Screen reader text for QR code descriptions
 */
export const QR_SCREEN_READER_TEXTS = {
  qrCodeFor: (productId: string) => `QR code for product ${productId}`,
  qrCodeContains: (url: string) => `Contains verification URL: ${url}`,
  downloadAs: (format: string) => `Download QR code as ${format.toUpperCase()}`,
  generationProgress: (current: number, total: number) =>
    `Generating QR code ${current} of ${total}`,
  batchComplete: (successful: number, failed: number) =>
    `Batch generation complete. ${successful} successful, ${failed} failed`,
  scannerActive: 'QR code scanner is active. Point camera at QR code to scan',
  scannerPermission: 'Camera permission required for QR code scanning',
  loadingQrCode: 'Loading QR code...',
  qrCodeError: (productId: string) =>
    `QR code generation failed for product ${productId}`,
  formatRecommendation: (format: string, use: string) =>
    `${format} format recommended for ${use}`,
  sizeRecommendation: (size: number, use: string) =>
    `${size} pixel size recommended for ${use}`,
} as const;

/**
 * ARIA role mappings for QR components
 */
export const ARIA_ROLES = {
  QR_DISPLAY: 'img',
  QR_BUTTON: 'button',
  QR_SCANNER: 'region',
  PROGRESS_BAR: 'progressbar',
  STATUS_ALERT: 'alert',
  STATUS_LIVE: 'status',
  FORM_GROUP: 'group',
  TABPANEL: 'tabpanel',
  TAB: 'tab',
} as const;

/**
 * Keyboard navigation key codes
 */
export const KEY_CODES = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
} as const;

/**
 * Focus management utilities
 */
export class FocusManager {
  private previousActiveElement: Element | null = null;

  /**
   * Save current focus for restoration later
   */
  saveFocus(): void {
    this.previousActiveElement = document.activeElement;
  }

  /**
   * Restore previously saved focus
   */
  restoreFocus(): void {
    if (this.previousActiveElement && 'focus' in this.previousActiveElement) {
      (this.previousActiveElement as HTMLElement).focus();
    }
  }

  /**
   * Set focus to first focusable element in container
   */
  focusFirst(container: HTMLElement): void {
    const focusable = this.getFocusableElements(container);
    if (focusable.length > 0) {
      focusable[0].focus();
    }
  }

  /**
   * Set focus to last focusable element in container
   */
  focusLast(container: HTMLElement): void {
    const focusable = this.getFocusableElements(container);
    if (focusable.length > 0) {
      focusable[focusable.length - 1].focus();
    }
  }

  /**
   * Get all focusable elements in container
   */
  getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      'details summary',
      '[contenteditable="true"]',
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors)).filter(
      element => {
        const htmlElement = element as HTMLElement;
        return htmlElement.offsetWidth > 0 && htmlElement.offsetHeight > 0;
      }
    ) as HTMLElement[];
  }

  /**
   * Trap focus within container
   */
  trapFocus(container: HTMLElement, event: KeyboardEvent): void {
    const focusable = this.getFocusableElements(container);

    if (focusable.length === 0) return;

    const firstFocusable = focusable[0];
    const lastFocusable = focusable[focusable.length - 1];

    if (event.key === KEY_CODES.TAB) {
      if (event.shiftKey) {
        if (document.activeElement === firstFocusable) {
          event.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          event.preventDefault();
          firstFocusable.focus();
        }
      }
    }
  }
}

/**
 * Announce message to screen readers
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Generate comprehensive alt text for QR code
 */
export function generateQRAltText(
  productId: string,
  encodedData: string,
  format: string,
  size: { width: number; height: number }
): string {
  return [
    QR_SCREEN_READER_TEXTS.qrCodeFor(productId),
    QR_SCREEN_READER_TEXTS.qrCodeContains(encodedData),
    `Format: ${format.toUpperCase()}`,
    `Dimensions: ${size.width} by ${size.height} pixels`,
  ].join('. ');
}

/**
 * Check if element meets minimum touch target size
 */
export function validateTouchTarget(element: HTMLElement): {
  isValid: boolean;
  currentSize: { width: number; height: number };
  recommendations: string[];
} {
  const rect = element.getBoundingClientRect();
  const { width, height } = rect;

  const minSize = TOUCH_TARGET_SIZES.MINIMUM;
  const recommendations: string[] = [];

  const isWidthValid = width >= minSize;
  const isHeightValid = height >= minSize;

  if (!isWidthValid) {
    recommendations.push(
      `Increase width to at least ${minSize}px (currently ${Math.round(width)}px)`
    );
  }

  if (!isHeightValid) {
    recommendations.push(
      `Increase height to at least ${minSize}px (currently ${Math.round(height)}px)`
    );
  }

  if (
    width < TOUCH_TARGET_SIZES.RECOMMENDED ||
    height < TOUCH_TARGET_SIZES.RECOMMENDED
  ) {
    recommendations.push(
      `Consider using ${TOUCH_TARGET_SIZES.RECOMMENDED}px for better accessibility`
    );
  }

  return {
    isValid: isWidthValid && isHeightValid,
    currentSize: { width: Math.round(width), height: Math.round(height) },
    recommendations,
  };
}

/**
 * Generate ARIA describedby text for QR code metadata
 */
export function generateQRDescribedBy(
  productId: string,
  format: string,
  timestamp: Date,
  errorLevel?: string
): string {
  const parts = [
    `Product ID: ${productId}`,
    `Format: ${format.toUpperCase()}`,
    `Generated on: ${timestamp.toLocaleDateString()}`,
  ];

  if (errorLevel) {
    parts.push(`Error correction: ${errorLevel}`);
  }

  return parts.join(', ');
}

/**
 * High contrast mode detection
 */
export function isHighContrastMode(): boolean {
  // Check for Windows high contrast mode
  if (window.matchMedia) {
    return (
      window.matchMedia('(-ms-high-contrast: active)').matches ||
      window.matchMedia('(forced-colors: active)').matches ||
      window.matchMedia('(prefers-contrast: high)').matches
    );
  }
  return false;
}

/**
 * Reduced motion preference detection
 */
export function prefersReducedMotion(): boolean {
  if (window.matchMedia) {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return false;
}

/**
 * Color scheme preference detection
 */
export function getPreferredColorScheme(): 'light' | 'dark' | 'auto' {
  if (window.matchMedia) {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
  }
  return 'auto';
}

/**
 * Create accessible loading state
 */
export function createAccessibleLoadingState(
  loadingText: string = 'Loading...'
) {
  return {
    role: 'status',
    'aria-live': 'polite' as const,
    'aria-label': loadingText,
    children: [
      // Hidden text for screen readers
      React.createElement('span', { className: 'sr-only' }, loadingText),
    ],
  };
}

/**
 * Create accessible error state
 */
export function createAccessibleErrorState(
  errorMessage: string,
  productId?: string
) {
  const ariaLabel = productId
    ? QR_SCREEN_READER_TEXTS.qrCodeError(productId)
    : 'An error occurred';

  return {
    role: 'alert' as const,
    'aria-label': ariaLabel,
    'aria-describedby': 'error-description',
    children: [
      React.createElement(
        'span',
        {
          id: 'error-description',
          className: 'sr-only',
        },
        errorMessage
      ),
    ],
  };
}

/**
 * Keyboard event handler for interactive QR codes
 */
export function handleQRKeyboardInteraction(
  event: React.KeyboardEvent,
  onClick?: () => void
): void {
  if (!onClick) return;

  if (event.key === KEY_CODES.ENTER || event.key === KEY_CODES.SPACE) {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  }
}

/**
 * Create accessible progress indicator
 */
export function createAccessibleProgress(
  current: number,
  total: number,
  label?: string
) {
  const percentage = Math.round((current / total) * 100);
  const defaultLabel = QR_SCREEN_READER_TEXTS.generationProgress(
    current,
    total
  );

  return {
    role: 'progressbar' as const,
    'aria-valuenow': percentage,
    'aria-valuemin': 0,
    'aria-valuemax': 100,
    'aria-label': label || defaultLabel,
    'aria-describedby': 'progress-description',
  };
}

/**
 * Validate component accessibility
 */
export interface AccessibilityValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

export function validateComponentAccessibility(
  element: HTMLElement,
  componentType: 'qr-display' | 'qr-generator' | 'qr-scanner'
): AccessibilityValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Check for required ARIA attributes
  switch (componentType) {
    case 'qr-display':
      if (!element.getAttribute('aria-label') && !element.getAttribute('alt')) {
        errors.push('QR display must have aria-label or alt text');
      }
      break;

    case 'qr-generator':
      const form = element.querySelector('form');
      if (form && !form.getAttribute('aria-label')) {
        warnings.push('Form should have aria-label for better accessibility');
      }
      break;

    case 'qr-scanner':
      if (!element.getAttribute('role')) {
        errors.push('QR scanner should have appropriate role attribute');
      }
      break;
  }

  // Check interactive elements for touch targets
  const interactiveElements = element.querySelectorAll(
    'button, [tabindex], [role="button"]'
  );
  interactiveElements.forEach(el => {
    const touchTargetCheck = validateTouchTarget(el as HTMLElement);
    if (!touchTargetCheck.isValid) {
      warnings.push(
        `Interactive element has insufficient touch target size: ${touchTargetCheck.recommendations.join(', ')}`
      );
    }
  });

  // Check for focus indicators
  const focusableElements = new FocusManager().getFocusableElements(element);
  if (focusableElements.length > 0) {
    recommendations.push(
      'Ensure all focusable elements have visible focus indicators'
    );
  }

  // Check for color contrast (would need actual color analysis in real implementation)
  recommendations.push('Verify color contrast meets WCAG AA standards');

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    recommendations,
  };
}

const qrAccessibilityDefaults = {
  CONTRAST_RATIOS,
  TOUCH_TARGET_SIZES,
  QR_SCREEN_READER_TEXTS,
  ARIA_ROLES,
  KEY_CODES,
  FocusManager,
  announceToScreenReader,
  generateQRAltText,
  validateTouchTarget,
  generateQRDescribedBy,
  isHighContrastMode,
  prefersReducedMotion,
  getPreferredColorScheme,
  handleQRKeyboardInteraction,
  validateComponentAccessibility,
};

export default qrAccessibilityDefaults;
