/**
 * Custom hook for managing product search functionality with enhanced features.
 *
 * @since 1.0.0
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  SearchState,
  AutoCompleteSuggestion,
  SearchHistoryItem,
  ProductIdFormatState,
  UseProductSearchReturn,
} from '@/types/search';
import {
  formatProductId,
  validateProductId,
  createAutoCompleteSuggestions,
  createSearchError,
  debounce,
} from '@/lib/product-search';
import { SearchHistoryService } from '@/services/SearchHistoryService';

/**
 * Initial search state
 */
const INITIAL_STATE: SearchState = {
  query: '',
  isSearching: false,
  validation: { valid: false },
  suggestions: [],
  history: [],
  error: null,
  showSuggestions: false,
  selectedSuggestionIndex: -1,
  showFormatHints: true,
};

/**
 * Custom hook for managing product search functionality with auto-formatting,
 * suggestions, history, and enhanced error handling.
 *
 * @param onSearch - Callback function when search is performed
 * @param initialQuery - Initial search query value
 * @returns Search state and control functions
 *
 * @example
 * ```typescript
 * const {
 *   searchState,
 *   setQuery,
 *   performSearch,
 *   selectSuggestion,
 *   clearHistory,
 *   handleKeyboard
 * } = useProductSearch((productId) => {
 *   console.log('Searching for:', productId);
 * });
 * ```
 *
 * @since 1.0.0
 */
export function useProductSearch(
  onSearch: (productId: string) => Promise<void> | void,
  initialQuery: string = ''
): UseProductSearchReturn {
  // Core state
  const [searchState, setSearchState] = useState<SearchState>(() => ({
    ...INITIAL_STATE,
    query: initialQuery,
  }));

  // Services
  const historyService = useMemo(() => new SearchHistoryService(), []);

  // Refs for managing timeouts and preventing stale closures
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const suggestionTimeoutRef = useRef<NodeJS.Timeout>();

  /**
   * Loads search history and preferences on mount
   */
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const history = historyService.getRecentSearches();
        const preferences = historyService.getPreferences();

        setSearchState(prev => ({
          ...prev,
          history,
          showFormatHints: preferences.showFormatHints,
        }));
      } catch (error) {
        console.warn('Failed to load search history:', error);
      }
    };

    loadInitialData();
  }, [historyService]);

  /**
   * Debounced validation function
   */
  const debouncedValidate = useCallback(
    debounce((query: string) => {
      const validation = validateProductId(query);
      setSearchState(prev => ({
        ...prev,
        validation,
        error: validation.valid
          ? null
          : createSearchError(validation.error || 'Invalid format'),
      }));
    }, 300),
    []
  );

  /**
   * Debounced suggestions update
   */
  const debouncedUpdateSuggestions = useCallback(
    debounce((query: string, history: SearchHistoryItem[]) => {
      if (query.length >= 2) {
        const suggestions = createAutoCompleteSuggestions(query, history, 5);
        setSearchState(prev => ({
          ...prev,
          suggestions,
          showSuggestions: suggestions.length > 0,
          selectedSuggestionIndex: -1,
        }));
      } else {
        setSearchState(prev => ({
          ...prev,
          suggestions: [],
          showSuggestions: false,
          selectedSuggestionIndex: -1,
        }));
      }
    }, 200),
    []
  );

  /**
   * Updates search query with auto-formatting and validation
   */
  const setQuery = useCallback(
    (newQuery: string) => {
      setSearchState(prev => {
        const updated = {
          ...prev,
          query: newQuery,
          error: null,
        };

        // Clear previous timeouts
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }
        if (suggestionTimeoutRef.current) {
          clearTimeout(suggestionTimeoutRef.current);
        }

        // Trigger validation
        if (newQuery.trim()) {
          debouncedValidate(newQuery.trim());
          debouncedUpdateSuggestions(newQuery.trim(), prev.history);
        } else {
          updated.validation = { valid: false };
          updated.suggestions = [];
          updated.showSuggestions = false;
          updated.selectedSuggestionIndex = -1;
        }

        return updated;
      });
    },
    [debouncedValidate, debouncedUpdateSuggestions]
  );

  /**
   * Performs search with the given product ID
   */
  const performSearch = useCallback(
    async (productId: string) => {
      const trimmedId = productId.trim();

      if (!trimmedId) {
        setSearchState(prev => ({
          ...prev,
          error: createSearchError('Product ID is required'),
        }));
        return;
      }

      // Validate format before searching
      const validation = validateProductId(trimmedId);
      if (!validation.valid) {
        setSearchState(prev => ({
          ...prev,
          error: createSearchError(
            validation.error || 'Invalid product ID format'
          ),
          validation,
        }));
        return;
      }

      setSearchState(prev => ({
        ...prev,
        isSearching: true,
        error: null,
        showSuggestions: false,
      }));

      try {
        // Perform the actual search
        await onSearch(trimmedId);

        // Add successful search to history
        const historyItem: SearchHistoryItem = {
          productId: trimmedId,
          searchedAt: new Date(),
          wasSuccessful: true,
          verificationStatus: 'verified', // Will be updated by the calling component
        };

        historyService.addSearchItem(historyItem);

        // Update state with successful search
        setSearchState(prev => ({
          ...prev,
          isSearching: false,
          history: historyService.getRecentSearches(),
          query: trimmedId, // Ensure query shows the final formatted ID
        }));
      } catch (error) {
        // Add failed search to history if configured
        const historyItem: SearchHistoryItem = {
          productId: trimmedId,
          searchedAt: new Date(),
          wasSuccessful: false,
          verificationStatus: 'error',
        };

        historyService.addSearchItem(historyItem);

        // Update state with error
        setSearchState(prev => ({
          ...prev,
          isSearching: false,
          error: createSearchError(error, trimmedId),
          history: historyService.getRecentSearches(),
        }));
      }
    },
    [onSearch, historyService]
  );

  /**
   * Selects a suggestion and performs search
   */
  const selectSuggestion = useCallback(
    (suggestion: AutoCompleteSuggestion) => {
      setSearchState(prev => ({
        ...prev,
        query: suggestion.productId,
        showSuggestions: false,
        selectedSuggestionIndex: -1,
      }));

      // Perform search with selected suggestion
      performSearch(suggestion.productId);
    },
    [performSearch]
  );

  /**
   * Clears search history
   */
  const clearHistory = useCallback(() => {
    historyService.clearHistory();
    setSearchState(prev => ({
      ...prev,
      history: [],
    }));
  }, [historyService]);

  /**
   * Toggles format hints visibility
   */
  const toggleFormatHints = useCallback(() => {
    setSearchState(prev => {
      const newShowHints = !prev.showFormatHints;

      // Update preferences
      historyService.updatePreferences({
        showFormatHints: newShowHints,
      });

      return {
        ...prev,
        showFormatHints: newShowHints,
      };
    });
  }, [historyService]);

  /**
   * Handles keyboard navigation and shortcuts
   */
  const handleKeyboard = useCallback(
    (event: React.KeyboardEvent) => {
      const { key } = event;
      const { suggestions, showSuggestions, selectedSuggestionIndex } =
        searchState;

      switch (key) {
        case 'ArrowDown':
          if (showSuggestions && suggestions.length > 0) {
            event.preventDefault();
            setSearchState(prev => ({
              ...prev,
              selectedSuggestionIndex: Math.min(
                prev.selectedSuggestionIndex + 1,
                prev.suggestions.length - 1
              ),
            }));
          }
          break;

        case 'ArrowUp':
          if (showSuggestions && suggestions.length > 0) {
            event.preventDefault();
            setSearchState(prev => ({
              ...prev,
              selectedSuggestionIndex: Math.max(
                prev.selectedSuggestionIndex - 1,
                -1
              ),
            }));
          }
          break;

        case 'Enter':
          if (
            showSuggestions &&
            selectedSuggestionIndex >= 0 &&
            suggestions[selectedSuggestionIndex]
          ) {
            event.preventDefault();
            selectSuggestion(suggestions[selectedSuggestionIndex]);
          } else if (searchState.query.trim()) {
            event.preventDefault();
            performSearch(searchState.query.trim());
          }
          break;

        case 'Escape':
          setSearchState(prev => ({
            ...prev,
            showSuggestions: false,
            selectedSuggestionIndex: -1,
          }));
          break;

        case 'Tab':
          // Auto-complete with first suggestion if available
          if (showSuggestions && suggestions.length > 0) {
            event.preventDefault();
            setQuery(suggestions[0].productId);
          }
          break;
      }
    },
    [searchState, selectSuggestion, performSearch, setQuery]
  );

  /**
   * Formats product ID with real-time formatting
   */
  const formatProductIdFn = useCallback(
    (input: string): ProductIdFormatState => {
      return formatProductId(input);
    },
    []
  );

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
      }
    };
  }, []);

  return {
    searchState,
    setQuery,
    performSearch,
    selectSuggestion,
    clearHistory,
    toggleFormatHints,
    handleKeyboard,
    formatProductId: formatProductIdFn,
  };
}
