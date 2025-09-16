/**
 * Search History Service for managing local storage of search history and preferences.
 *
 * @since 1.0.0
 */

import {
  SearchHistoryItem,
  SearchHistoryConfig,
  SearchStorageData,
} from '@/types/search';

/**
 * Default configuration for search history
 */
const DEFAULT_CONFIG: SearchHistoryConfig = {
  maxItems: 10,
  expirationMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  includeFailures: false,
  storageKey: 'chaintrace_search_history',
};

/**
 * Default storage data structure
 */
const DEFAULT_STORAGE_DATA: SearchStorageData = {
  history: [],
  preferences: {
    showFormatHints: true,
    enableSuggestions: true,
    maxHistoryItems: 10,
  },
  lastCleanup: new Date(),
  version: '1.0.0',
};

/**
 * Service for managing search history and user preferences in local storage.
 *
 * @class SearchHistoryService
 *
 * @example
 * ```typescript
 * const historyService = new SearchHistoryService();
 *
 * // Add a successful search to history
 * historyService.addSearchItem({
 *   productId: 'CT-2024-123-ABC123',
 *   productName: 'Organic Tomatoes',
 *   searchedAt: new Date(),
 *   wasSuccessful: true,
 *   verificationStatus: 'verified'
 * });
 *
 * // Get recent searches
 * const recentSearches = historyService.getRecentSearches();
 * ```
 *
 * @since 1.0.0
 */
export class SearchHistoryService {
  private config: SearchHistoryConfig;
  private storageData: SearchStorageData | null = null;

  /**
   * Creates a new SearchHistoryService instance.
   *
   * @param config - Optional configuration overrides
   */
  constructor(config?: Partial<SearchHistoryConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadFromStorage();
  }

  /**
   * Adds a search item to the history.
   *
   * @param item - Search history item to add
   *
   * @example
   * ```typescript
   * historyService.addSearchItem({
   *   productId: 'CT-2024-123-ABC123',
   *   searchedAt: new Date(),
   *   wasSuccessful: true,
   *   verificationStatus: 'verified'
   * });
   * ```
   */
  public addSearchItem(item: SearchHistoryItem): void {
    if (!this.storageData) {
      this.storageData = { ...DEFAULT_STORAGE_DATA };
    }

    // Don't add failures if configured not to
    if (!item.wasSuccessful && !this.config.includeFailures) {
      return;
    }

    // Remove existing item with same product ID to avoid duplicates
    this.storageData.history = this.storageData.history.filter(
      existing => existing.productId !== item.productId
    );

    // Add new item to the beginning
    this.storageData.history.unshift(item);

    // Trim to max items
    if (this.storageData.history.length > this.config.maxItems) {
      this.storageData.history = this.storageData.history.slice(
        0,
        this.config.maxItems
      );
    }

    this.saveToStorage();
  }

  /**
   * Retrieves recent search history.
   *
   * @param limit - Maximum number of items to return
   * @returns Array of recent search history items
   *
   * @example
   * ```typescript
   * const recent = historyService.getRecentSearches(5);
   * console.log(recent.length); // <= 5
   * ```
   */
  public getRecentSearches(limit?: number): SearchHistoryItem[] {
    if (!this.storageData) {
      return [];
    }

    this.cleanupExpiredItems();

    const recentSearches = this.storageData.history.slice(
      0,
      limit || this.config.maxItems
    );

    // Convert date strings back to Date objects if needed
    return recentSearches.map(item => ({
      ...item,
      searchedAt: new Date(item.searchedAt),
    }));
  }

  /**
   * Retrieves successful searches only.
   *
   * @param limit - Maximum number of items to return
   * @returns Array of successful search history items
   *
   * @example
   * ```typescript
   * const successful = historyService.getSuccessfulSearches();
   * ```
   */
  public getSuccessfulSearches(limit?: number): SearchHistoryItem[] {
    return this.getRecentSearches()
      .filter(item => item.wasSuccessful)
      .slice(0, limit || 10);
  }

  /**
   * Searches history for items matching a query.
   *
   * @param query - Search query
   * @param limit - Maximum number of results
   * @returns Array of matching search history items
   *
   * @example
   * ```typescript
   * const matches = historyService.searchHistory('CT-2024');
   * ```
   */
  public searchHistory(query: string, limit: number = 5): SearchHistoryItem[] {
    const recentSearches = this.getRecentSearches();
    const queryLower = query.toLowerCase();

    return recentSearches
      .filter(
        item =>
          item.productId.toLowerCase().includes(queryLower) ||
          (item.productName &&
            item.productName.toLowerCase().includes(queryLower))
      )
      .slice(0, limit);
  }

  /**
   * Clears all search history.
   *
   * @example
   * ```typescript
   * historyService.clearHistory();
   * ```
   */
  public clearHistory(): void {
    if (!this.storageData) {
      this.storageData = { ...DEFAULT_STORAGE_DATA };
    }

    this.storageData.history = [];
    this.saveToStorage();
  }

  /**
   * Removes a specific item from history.
   *
   * @param productId - Product ID to remove
   *
   * @example
   * ```typescript
   * historyService.removeSearchItem('CT-2024-123-ABC123');
   * ```
   */
  public removeSearchItem(productId: string): void {
    if (!this.storageData) {
      return;
    }

    this.storageData.history = this.storageData.history.filter(
      item => item.productId !== productId
    );

    this.saveToStorage();
  }

  /**
   * Updates user preferences.
   *
   * @param preferences - Preference updates
   *
   * @example
   * ```typescript
   * historyService.updatePreferences({
   *   showFormatHints: false,
   *   maxHistoryItems: 20
   * });
   * ```
   */
  public updatePreferences(
    preferences: Partial<SearchStorageData['preferences']>
  ): void {
    if (!this.storageData) {
      this.storageData = { ...DEFAULT_STORAGE_DATA };
    }

    this.storageData.preferences = {
      ...this.storageData.preferences,
      ...preferences,
    };

    // Update config max items if changed
    if (
      preferences.maxHistoryItems &&
      preferences.maxHistoryItems !== this.config.maxItems
    ) {
      this.config.maxItems = preferences.maxHistoryItems;

      // Trim history if necessary
      if (this.storageData.history.length > this.config.maxItems) {
        this.storageData.history = this.storageData.history.slice(
          0,
          this.config.maxItems
        );
      }
    }

    this.saveToStorage();
  }

  /**
   * Gets current user preferences.
   *
   * @returns Current user preferences
   *
   * @example
   * ```typescript
   * const prefs = historyService.getPreferences();
   * console.log(prefs.showFormatHints);
   * ```
   */
  public getPreferences(): SearchStorageData['preferences'] {
    if (!this.storageData) {
      return DEFAULT_STORAGE_DATA.preferences;
    }

    return { ...this.storageData.preferences };
  }

  /**
   * Gets search statistics.
   *
   * @returns Search statistics object
   *
   * @example
   * ```typescript
   * const stats = historyService.getSearchStats();
   * console.log(stats.totalSearches);
   * ```
   */
  public getSearchStats(): {
    totalSearches: number;
    successfulSearches: number;
    successRate: number;
    mostSearchedProducts: Array<{ productId: string; count: number }>;
  } {
    const history = this.getRecentSearches(100); // Get more for stats

    const totalSearches = history.length;
    const successfulSearches = history.filter(
      item => item.wasSuccessful
    ).length;
    const successRate =
      totalSearches > 0 ? successfulSearches / totalSearches : 0;

    // Count product occurrences
    const productCounts = new Map<string, number>();
    history.forEach(item => {
      const count = productCounts.get(item.productId) || 0;
      productCounts.set(item.productId, count + 1);
    });

    const mostSearchedProducts = Array.from(productCounts.entries())
      .map(([productId, count]) => ({ productId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalSearches,
      successfulSearches,
      successRate,
      mostSearchedProducts,
    };
  }

  /**
   * Loads data from local storage.
   */
  private loadFromStorage(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        this.storageData = { ...DEFAULT_STORAGE_DATA };
        return;
      }

      const stored = localStorage.getItem(this.config.storageKey);
      if (!stored) {
        this.storageData = { ...DEFAULT_STORAGE_DATA };
        return;
      }

      const parsed = JSON.parse(stored) as SearchStorageData;

      // Validate and migrate data if necessary
      this.storageData = this.validateAndMigrateData(parsed);

      // Cleanup expired items on load
      this.cleanupExpiredItems();
    } catch (error) {
      console.warn('Failed to load search history from storage:', error);
      this.storageData = { ...DEFAULT_STORAGE_DATA };
    }
  }

  /**
   * Saves data to local storage.
   */
  private saveToStorage(): void {
    try {
      if (
        typeof window === 'undefined' ||
        !window.localStorage ||
        !this.storageData
      ) {
        return;
      }

      localStorage.setItem(
        this.config.storageKey,
        JSON.stringify(this.storageData)
      );
    } catch (error) {
      console.warn('Failed to save search history to storage:', error);
    }
  }

  /**
   * Validates and migrates storage data for compatibility.
   *
   * @param data - Raw storage data
   * @returns Validated and migrated data
   */
  private validateAndMigrateData(data: any): SearchStorageData {
    const migrated: SearchStorageData = {
      history: [],
      preferences: { ...DEFAULT_STORAGE_DATA.preferences },
      lastCleanup: new Date(),
      version: '1.0.0',
    };

    // Migrate history
    if (Array.isArray(data.history)) {
      migrated.history = data.history
        .filter((item: any) => item && typeof item.productId === 'string')
        .map((item: any) => ({
          productId: item.productId,
          productName: item.productName || undefined,
          searchedAt: new Date(item.searchedAt || Date.now()),
          wasSuccessful: Boolean(item.wasSuccessful),
          verificationStatus: item.verificationStatus || 'unverified',
        }));
    }

    // Migrate preferences
    if (data.preferences && typeof data.preferences === 'object') {
      migrated.preferences = {
        showFormatHints: Boolean(data.preferences.showFormatHints ?? true),
        enableSuggestions: Boolean(data.preferences.enableSuggestions ?? true),
        maxHistoryItems: Math.max(
          1,
          Math.min(50, Number(data.preferences.maxHistoryItems) || 10)
        ),
      };
    }

    // Migrate cleanup timestamp
    if (data.lastCleanup) {
      migrated.lastCleanup = new Date(data.lastCleanup);
    }

    return migrated;
  }

  /**
   * Removes expired items from history.
   */
  private cleanupExpiredItems(): void {
    if (!this.storageData) {
      return;
    }

    const now = Date.now();
    const expirationThreshold = now - this.config.expirationMs;

    // Check if cleanup is needed (daily cleanup)
    const lastCleanup = new Date(this.storageData.lastCleanup).getTime();
    const dayInMs = 24 * 60 * 60 * 1000;

    if (now - lastCleanup < dayInMs) {
      return; // No cleanup needed yet
    }

    // Remove expired items
    const originalLength = this.storageData.history.length;
    this.storageData.history = this.storageData.history.filter(item => {
      const itemTime = new Date(item.searchedAt).getTime();
      return itemTime > expirationThreshold;
    });

    // Update cleanup timestamp
    this.storageData.lastCleanup = new Date();

    // Save if items were removed
    if (this.storageData.history.length !== originalLength) {
      this.saveToStorage();
    }
  }
}
