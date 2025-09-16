/**
 * Accessibility helper utilities for keyboard navigation and screen reader support.
 *
 * @since 1.0.0
 */

import { KeyboardShortcut } from '@/types/search';

/**
 * Default keyboard shortcuts for the search interface
 */
export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  {
    keys: ['Enter'],
    action: 'search',
    description: 'Perform search or select highlighted suggestion',
    enabled: true,
  },
  {
    keys: ['Escape'],
    action: 'close_suggestions',
    description: 'Close suggestions dropdown',
    enabled: true,
  },
  {
    keys: ['ArrowDown', 'ArrowUp'],
    action: 'navigate_suggestions',
    description: 'Navigate through suggestions',
    enabled: true,
  },
  {
    keys: ['Tab'],
    action: 'autocomplete',
    description: 'Auto-complete with first suggestion',
    enabled: true,
  },
  {
    keys: ['Ctrl', 'k'],
    action: 'focus_search',
    description: 'Focus search input',
    enabled: true,
  },
  {
    keys: ['Ctrl', 'h'],
    action: 'toggle_history',
    description: 'Toggle search history',
    enabled: true,
  },
  {
    keys: ['Ctrl', '?'],
    action: 'show_help',
    description: 'Show format help',
    enabled: true,
  },
];

/**
 * ARIA live region announcer for screen readers.
 *
 * @class AriaAnnouncer
 *
 * @example
 * ```typescript
 * const announcer = new AriaAnnouncer();
 * announcer.announce('Product search completed');
 * announcer.announcePolite('5 suggestions available');
 * ```
 *
 * @since 1.0.0
 */
export class AriaAnnouncer {
  private assertiveRegion: HTMLElement | null = null;
  private politeRegion: HTMLElement | null = null;

  constructor() {
    this.createLiveRegions();
  }

  /**
   * Announces a message with assertive priority (interrupts screen reader).
   *
   * @param message - Message to announce
   *
   * @example
   * ```typescript
   * announcer.announce('Error: Invalid product ID format');
   * ```
   */
  public announce(message: string): void {
    if (this.assertiveRegion) {
      this.assertiveRegion.textContent = message;
      // Clear after announcement to allow re-announcement of same message
      setTimeout(() => {
        if (this.assertiveRegion) {
          this.assertiveRegion.textContent = '';
        }
      }, 1000);
    }
  }

  /**
   * Announces a message with polite priority (waits for screen reader to finish).
   *
   * @param message - Message to announce
   *
   * @example
   * ```typescript
   * announcer.announcePolite('Search suggestions updated');
   * ```
   */
  public announcePolite(message: string): void {
    if (this.politeRegion) {
      this.politeRegion.textContent = message;
      setTimeout(() => {
        if (this.politeRegion) {
          this.politeRegion.textContent = '';
        }
      }, 1000);
    }
  }

  /**
   * Announces search results count.
   *
   * @param count - Number of results
   * @param type - Type of results
   */
  public announceSearchResults(
    count: number,
    type: 'suggestions' | 'history' = 'suggestions'
  ): void {
    const message =
      count === 0
        ? `No ${type} available`
        : count === 1
          ? `1 ${type.slice(0, -1)} available`
          : `${count} ${type} available`;

    this.announcePolite(message);
  }

  /**
   * Announces validation state changes.
   *
   * @param isValid - Whether input is valid
   * @param errorMessage - Error message if invalid
   */
  public announceValidation(isValid: boolean, errorMessage?: string): void {
    if (isValid) {
      this.announcePolite('Product ID format is valid');
    } else if (errorMessage) {
      this.announce(`Validation error: ${errorMessage}`);
    }
  }

  /**
   * Announces navigation changes in suggestions.
   *
   * @param selectedIndex - Currently selected index
   * @param totalCount - Total number of suggestions
   * @param suggestion - Current suggestion text
   */
  public announceNavigation(
    selectedIndex: number,
    totalCount: number,
    suggestion?: string
  ): void {
    if (selectedIndex >= 0 && suggestion) {
      const position = `${selectedIndex + 1} of ${totalCount}`;
      this.announcePolite(`${suggestion}, ${position}`);
    }
  }

  /**
   * Creates invisible live regions for screen reader announcements.
   */
  private createLiveRegions(): void {
    if (typeof window === 'undefined') return;

    // Create assertive live region
    this.assertiveRegion = document.createElement('div');
    this.assertiveRegion.setAttribute('aria-live', 'assertive');
    this.assertiveRegion.setAttribute('aria-atomic', 'true');
    this.assertiveRegion.setAttribute('role', 'status');
    this.assertiveRegion.className = 'sr-only';
    this.assertiveRegion.id = 'chaintrace-search-assertive-announcer';
    document.body.appendChild(this.assertiveRegion);

    // Create polite live region
    this.politeRegion = document.createElement('div');
    this.politeRegion.setAttribute('aria-live', 'polite');
    this.politeRegion.setAttribute('aria-atomic', 'true');
    this.politeRegion.setAttribute('role', 'status');
    this.politeRegion.className = 'sr-only';
    this.politeRegion.id = 'chaintrace-search-polite-announcer';
    document.body.appendChild(this.politeRegion);
  }

  /**
   * Cleanup live regions on destruction.
   */
  public destroy(): void {
    if (this.assertiveRegion && this.assertiveRegion.parentNode) {
      this.assertiveRegion.parentNode.removeChild(this.assertiveRegion);
    }
    if (this.politeRegion && this.politeRegion.parentNode) {
      this.politeRegion.parentNode.removeChild(this.politeRegion);
    }
  }
}

/**
 * Keyboard navigation handler for complex components.
 *
 * @class KeyboardNavigationHandler
 *
 * @example
 * ```typescript
 * const handler = new KeyboardNavigationHandler();
 * handler.addShortcut(['Ctrl', 'k'], () => focusSearchInput());
 * handler.handleKeydown(event);
 * ```
 *
 * @since 1.0.0
 */
export class KeyboardNavigationHandler {
  private shortcuts: Map<string, () => void> = new Map();
  private pressedKeys: Set<string> = new Set();

  /**
   * Adds a keyboard shortcut.
   *
   * @param keys - Array of key names
   * @param callback - Function to execute
   *
   * @example
   * ```typescript
   * handler.addShortcut(['Ctrl', 'Enter'], () => performSearch());
   * ```
   */
  public addShortcut(keys: string[], callback: () => void): void {
    const shortcutKey = this.normalizeShortcut(keys);
    this.shortcuts.set(shortcutKey, callback);
  }

  /**
   * Removes a keyboard shortcut.
   *
   * @param keys - Array of key names to remove
   */
  public removeShortcut(keys: string[]): void {
    const shortcutKey = this.normalizeShortcut(keys);
    this.shortcuts.delete(shortcutKey);
  }

  /**
   * Handles keydown events and executes matching shortcuts.
   *
   * @param event - Keyboard event
   * @returns Whether the event was handled
   */
  public handleKeydown(event: KeyboardEvent): boolean {
    this.pressedKeys.add(event.key);

    // Build current key combination
    const currentKeys: string[] = [];

    if (event.ctrlKey) currentKeys.push('Ctrl');
    if (event.shiftKey) currentKeys.push('Shift');
    if (event.altKey) currentKeys.push('Alt');
    if (event.metaKey) currentKeys.push('Meta');

    // Add the main key if it's not a modifier
    if (!['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) {
      currentKeys.push(event.key);
    }

    const shortcutKey = this.normalizeShortcut(currentKeys);
    const callback = this.shortcuts.get(shortcutKey);

    if (callback) {
      event.preventDefault();
      callback();
      return true;
    }

    return false;
  }

  /**
   * Handles keyup events to track released keys.
   *
   * @param event - Keyboard event
   */
  public handleKeyup(event: KeyboardEvent): void {
    this.pressedKeys.delete(event.key);
  }

  /**
   * Normalizes shortcut keys into a consistent string format.
   *
   * @param keys - Array of key names
   * @returns Normalized shortcut string
   */
  private normalizeShortcut(keys: string[]): string {
    return keys
      .map(key => key.toLowerCase())
      .sort()
      .join('+');
  }

  /**
   * Clears all registered shortcuts.
   */
  public clear(): void {
    this.shortcuts.clear();
    this.pressedKeys.clear();
  }
}

/**
 * Focus management utilities for complex interfaces.
 */
export class FocusManager {
  private focusStack: HTMLElement[] = [];

  /**
   * Pushes current focus to stack and focuses new element.
   *
   * @param element - Element to focus
   */
  public pushFocus(element: HTMLElement): void {
    const currentFocus = document.activeElement as HTMLElement;
    if (currentFocus) {
      this.focusStack.push(currentFocus);
    }
    element.focus();
  }

  /**
   * Restores focus to previous element in stack.
   */
  public popFocus(): void {
    const previousFocus = this.focusStack.pop();
    if (previousFocus) {
      previousFocus.focus();
    }
  }

  /**
   * Traps focus within a container element.
   *
   * @param container - Container element
   * @param event - Keyboard event
   * @returns Whether focus was trapped
   */
  public trapFocus(container: HTMLElement, event: KeyboardEvent): boolean {
    if (event.key !== 'Tab') return false;

    const focusableElements = this.getFocusableElements(container);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        lastElement?.focus();
        event.preventDefault();
        return true;
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        firstElement?.focus();
        event.preventDefault();
        return true;
      }
    }

    return false;
  }

  /**
   * Gets all focusable elements within a container.
   *
   * @param container - Container element
   * @returns Array of focusable elements
   */
  public getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(', ');

    return Array.from(
      container.querySelectorAll(focusableSelectors)
    ) as HTMLElement[];
  }

  /**
   * Clears the focus stack.
   */
  public clear(): void {
    this.focusStack = [];
  }
}

/**
 * Generates accessible descriptions for complex UI states.
 *
 * @param state - Current UI state
 * @returns Accessible description
 *
 * @example
 * ```typescript
 * const description = generateAccessibleDescription({
 *   suggestions: 5,
 *   selectedIndex: 2,
 *   isLoading: false
 * });
 * ```
 */
export function generateAccessibleDescription(state: {
  suggestions?: number;
  selectedIndex?: number;
  isLoading?: boolean;
  hasError?: boolean;
  errorMessage?: string;
}): string {
  const parts: string[] = [];

  if (state.isLoading) {
    parts.push('Loading suggestions');
  } else if (state.hasError && state.errorMessage) {
    parts.push(`Error: ${state.errorMessage}`);
  } else if (state.suggestions !== undefined) {
    if (state.suggestions === 0) {
      parts.push('No suggestions available');
    } else {
      parts.push(`${state.suggestions} suggestions available`);

      if (state.selectedIndex !== undefined && state.selectedIndex >= 0) {
        parts.push(
          `Item ${state.selectedIndex + 1} of ${state.suggestions} selected`
        );
      }
    }
  }

  return parts.join('. ');
}

/**
 * Creates proper ARIA attributes for combobox components.
 *
 * @param options - Configuration options
 * @returns Object with ARIA attributes
 *
 * @example
 * ```typescript
 * const ariaProps = createComboboxAriaProps({
 *   isExpanded: true,
 *   hasPopup: 'listbox',
 *   controls: 'suggestions-list'
 * });
 * ```
 */
export function createComboboxAriaProps(options: {
  isExpanded: boolean;
  hasPopup?: 'listbox' | 'menu' | 'tree' | 'grid' | 'dialog';
  controls?: string;
  describedBy?: string;
  activeDescendant?: string;
}) {
  return {
    role: 'combobox',
    'aria-expanded': options.isExpanded,
    'aria-haspopup': options.hasPopup || 'listbox',
    'aria-controls': options.controls,
    'aria-describedby': options.describedBy,
    'aria-activedescendant': options.activeDescendant,
    'aria-autocomplete': 'list' as const,
  };
}

/**
 * Debounces screen reader announcements to prevent spam.
 */
export class DebouncedAnnouncer {
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  private announcer: AriaAnnouncer;

  constructor(announcer: AriaAnnouncer) {
    this.announcer = announcer;
  }

  /**
   * Announces a message with debouncing.
   *
   * @param key - Unique key for this announcement type
   * @param message - Message to announce
   * @param delay - Debounce delay in milliseconds
   * @param assertive - Whether to use assertive or polite announcement
   */
  public announce(
    key: string,
    message: string,
    delay: number = 500,
    assertive: boolean = false
  ): void {
    // Clear existing timeout for this key
    const existingTimeout = this.timeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      if (assertive) {
        this.announcer.announce(message);
      } else {
        this.announcer.announcePolite(message);
      }
      this.timeouts.delete(key);
    }, delay);

    this.timeouts.set(key, timeout);
  }

  /**
   * Clears all pending announcements.
   */
  public clear(): void {
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts.clear();
  }
}
