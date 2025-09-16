/**
 * Search functionality types for manual product ID entry enhancement.
 *
 * @since 1.0.0
 */

/**
 * Search history item interface
 */
export interface SearchHistoryItem {
  /** Product ID that was searched */
  productId: string;

  /** Human-readable product name if available */
  productName?: string;

  /** Search timestamp */
  searchedAt: Date;

  /** Whether the search was successful */
  wasSuccessful: boolean;

  /** Product verification status at time of search */
  verificationStatus?: 'verified' | 'unverified' | 'pending' | 'error';
}

/**
 * Auto-complete suggestion interface
 */
export interface AutoCompleteSuggestion {
  /** Suggested product ID */
  productId: string;

  /** Human-readable label for display */
  label: string;

  /** How well this matches the input query (0-1) */
  matchScore: number;

  /** Whether this is from search history */
  fromHistory: boolean;

  /** Product verification status */
  verificationStatus?: 'verified' | 'unverified' | 'pending' | 'error';

  /** Last verified timestamp */
  lastVerified?: Date;
}

/**
 * Product ID formatting state
 */
export interface ProductIdFormatState {
  /** Current raw input value */
  rawValue: string;

  /** Formatted value with proper CT-YYYY-XXX-XXXXXX structure */
  formattedValue: string;

  /** Whether the current format is valid */
  isValid: boolean;

  /** Validation error message if invalid */
  errorMessage?: string;

  /** Format suggestions for correction */
  suggestions?: string[];
}

/**
 * Search validation result
 */
export interface SearchValidationResult {
  /** Whether the input is valid */
  valid: boolean;

  /** Validation error message */
  error?: string;

  /** Suggested corrections */
  suggestions?: string[];

  /** Format hints for the user */
  formatHints?: string[];
}

/**
 * Search suggestions configuration
 */
export interface SearchSuggestionsConfig {
  /** Maximum number of suggestions to show */
  maxSuggestions: number;

  /** Minimum query length to trigger suggestions */
  minQueryLength: number;

  /** Whether to include history in suggestions */
  includeHistory: boolean;

  /** Whether to enable fuzzy matching */
  enableFuzzyMatch: boolean;

  /** Fuzzy match threshold (0-1) */
  fuzzyThreshold: number;
}

/**
 * Search history configuration
 */
export interface SearchHistoryConfig {
  /** Maximum number of items to store */
  maxItems: number;

  /** History expiration time in milliseconds */
  expirationMs: number;

  /** Whether to store unsuccessful searches */
  includeFailures: boolean;

  /** Local storage key for history data */
  storageKey: string;
}

/**
 * Format hint interface
 */
export interface FormatHint {
  /** Hint identifier */
  id: string;

  /** Human-readable hint text */
  text: string;

  /** Example product ID */
  example: string;

  /** When to show this hint */
  showWhen: 'always' | 'empty' | 'invalid' | 'focus';

  /** Priority for displaying (higher = more important) */
  priority: number;
}

/**
 * Keyboard shortcut configuration
 */
export interface KeyboardShortcut {
  /** Shortcut key combination */
  keys: string[];

  /** Action to perform */
  action: string;

  /** Human-readable description */
  description: string;

  /** Whether shortcut is enabled */
  enabled: boolean;
}

/**
 * Search error types
 */
export type SearchErrorType =
  | 'INVALID_FORMAT'
  | 'NETWORK_ERROR'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'UNKNOWN_ERROR';

/**
 * Search error interface
 */
export interface SearchError {
  /** Error type */
  type: SearchErrorType;

  /** Human-readable error message */
  message: string;

  /** Error details */
  details?: Record<string, any>;

  /** Whether error is retryable */
  retryable: boolean;

  /** Suggested actions for user */
  suggestions?: string[];
}

/**
 * Search state interface for component state management
 */
export interface SearchState {
  /** Current query input */
  query: string;

  /** Whether search is in progress */
  isSearching: boolean;

  /** Current validation state */
  validation: SearchValidationResult;

  /** Available auto-complete suggestions */
  suggestions: AutoCompleteSuggestion[];

  /** Recent search history */
  history: SearchHistoryItem[];

  /** Current error state */
  error: SearchError | null;

  /** Whether suggestions dropdown is visible */
  showSuggestions: boolean;

  /** Currently selected suggestion index */
  selectedSuggestionIndex: number;

  /** Whether format hints are visible */
  showFormatHints: boolean;
}

/**
 * Search analytics event
 */
export interface SearchAnalyticsEvent {
  /** Event type */
  eventType:
    | 'search_initiated'
    | 'suggestion_selected'
    | 'format_error'
    | 'search_completed';

  /** Product ID searched */
  productId?: string;

  /** Search method used */
  method:
    | 'manual_entry'
    | 'suggestion_click'
    | 'history_click'
    | 'keyboard_shortcut';

  /** Time taken for search (ms) */
  searchTime?: number;

  /** Whether search was successful */
  successful?: boolean;

  /** Error type if unsuccessful */
  errorType?: SearchErrorType;

  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Local storage data structure
 */
export interface SearchStorageData {
  /** Search history items */
  history: SearchHistoryItem[];

  /** User preferences */
  preferences: {
    showFormatHints: boolean;
    enableSuggestions: boolean;
    maxHistoryItems: number;
  };

  /** Last cleanup timestamp */
  lastCleanup: Date;

  /** Data version for migration */
  version: string;
}

/**
 * Debounced validation function type
 */
export type DebouncedValidator = (
  query: string
) => Promise<SearchValidationResult>;

/**
 * Search hook return type
 */
export interface UseProductSearchReturn {
  /** Current search state */
  searchState: SearchState;

  /** Function to update search query */
  setQuery: (query: string) => void;

  /** Function to perform search */
  performSearch: (productId: string) => Promise<void>;

  /** Function to select suggestion */
  selectSuggestion: (suggestion: AutoCompleteSuggestion) => void;

  /** Function to clear history */
  clearHistory: () => void;

  /** Function to toggle format hints */
  toggleFormatHints: () => void;

  /** Function to handle keyboard navigation */
  handleKeyboard: (event: React.KeyboardEvent) => void;

  /** Function to format product ID */
  formatProductId: (input: string) => ProductIdFormatState;
}
