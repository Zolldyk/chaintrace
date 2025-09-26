/**
 * Enhanced ProductLookup component with auto-formatting, suggestions, history, and accessibility.
 *
 * @example
 * ```tsx
 * <ProductLookup
 *   onSearch={(productId) => console.log('Searching for:', productId)}
 *   loading={false}
 *   enableEnhancedFeatures={true}
 * />
 * ```
 *
 * @since 1.0.0
 */

'use client';

import * as React from 'react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { ScanningInterface } from '@/components/verification/ScanningInterface';
import { AutoCompleteDropdown } from '@/components/verification/AutoCompleteDropdown';
import { SearchHistory } from '@/components/verification/SearchHistory';
import { ProductFormatGuide } from '@/components/verification/ProductFormatGuide';
import { SearchErrorHandler } from '@/components/verification/SearchErrorHandler';
import { ProductVerificationError } from '@/types';
import { validateQRCode } from '@/lib/qr-scanner';
import { useProductSearch } from '@/hooks/useProductSearch';
import {
  AriaAnnouncer,
  KeyboardNavigationHandler,
  createComboboxAriaProps,
  DebouncedAnnouncer,
} from '@/lib/accessibility-helpers';
import { ClientOnly } from '@/components/common/ClientOnly';

export interface ProductLookupProps {
  /** Callback when search is triggered */
  onSearch: (productId: string) => Promise<void> | void;

  /** Whether search is in progress */
  loading?: boolean;

  /** Error state for the lookup */
  error?: ProductVerificationError | null;

  /** Initial product ID value */
  initialValue?: string;

  /** Additional CSS classes */
  className?: string;

  /** Placeholder text for input */
  placeholder?: string;

  /** Whether to auto-focus the input */
  autoFocus?: boolean;

  /** Whether to enable QR code scanning */
  enableQrScanning?: boolean;

  /** Callback when QR code scanning starts/stops */
  onQrScanToggle?: (scanning: boolean) => void;

  /** Whether to enable enhanced features (auto-complete, history, format hints) */
  enableEnhancedFeatures?: boolean;

  /** Whether to show format hints by default */
  showFormatHints?: boolean;

  /** Whether to show search history */
  showSearchHistory?: boolean;

  /** Maximum number of suggestions to show */
  maxSuggestions?: number;

  /** Callback when verification status changes (for history tracking) */
  onVerificationStatusChange?: (
    productId: string,
    status: 'verified' | 'unverified' | 'pending' | 'error'
  ) => void;
}

/**
 * Enhanced input component with proper styling and accessibility
 */
const EnhancedInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    error?: boolean;
    isFormatted?: boolean;
    showValidation?: boolean;
  }
>(({ className, error, isFormatted, showValidation, ...props }, ref) => {
  return (
    <input
      className={cn(
        'border-secondary-300 placeholder:text-secondary-400 flex h-10 w-full animate-fade-in rounded-md border bg-white px-3 py-2 text-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        error && 'border-error-500 focus:border-error-500 focus:ring-error-500',
        isFormatted && 'font-mono tracking-wider',
        showValidation && 'pr-10',
        className
      )}
      ref={ref}
      autoComplete='off'
      spellCheck={false}
      {...props}
    />
  );
});
EnhancedInput.displayName = 'EnhancedInput';

/**
 * Enhanced ProductLookup component with auto-formatting, suggestions, history, and accessibility
 */
export const ProductLookup = React.forwardRef<
  HTMLDivElement,
  ProductLookupProps
>(
  (
    {
      onSearch,
      loading = false,
      error = null,
      initialValue = '',
      className,
      placeholder = 'Enter product ID (e.g., CT-2024-123-ABC123)',
      autoFocus = false,
      enableQrScanning = true,
      onQrScanToggle,
      enableEnhancedFeatures = true,
      showFormatHints = true,
      showSearchHistory = true,
      maxSuggestions = 5,
      onVerificationStatusChange,
      ...props
    },
    ref
  ) => {
    // Core state
    const [isScanning, setIsScanning] = useState<boolean>(false);
    const [cameraSupported, setCameraSupported] = useState<boolean | null>(
      null
    );
    const [showHistory, setShowHistory] = useState<boolean>(false);
    const [inputFocused, setInputFocused] = useState<boolean>(false);

    // Refs
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const ariaAnnouncerRef = useRef<AriaAnnouncer | null>(null);
    const keyboardHandlerRef = useRef<KeyboardNavigationHandler | null>(null);
    const debouncedAnnouncerRef = useRef<DebouncedAnnouncer | null>(null);

    // Enhanced search functionality
    const {
      searchState,
      setQuery,
      performSearch,
      selectSuggestion,
      clearHistory,
      toggleFormatHints,
      handleKeyboard,
      formatProductId: formatProductIdFn,
    } = useProductSearch(onSearch, initialValue);

    // Initialize accessibility features
    useEffect(() => {
      if (!enableEnhancedFeatures) return;

      // Initialize ARIA announcer
      ariaAnnouncerRef.current = new AriaAnnouncer();
      debouncedAnnouncerRef.current = new DebouncedAnnouncer(
        ariaAnnouncerRef.current
      );

      // Initialize keyboard handler
      keyboardHandlerRef.current = new KeyboardNavigationHandler();

      // Add global keyboard shortcuts
      keyboardHandlerRef.current.addShortcut(['Ctrl', 'k'], () => {
        inputRef.current?.focus();
      });

      keyboardHandlerRef.current.addShortcut(['Ctrl', 'h'], () => {
        setShowHistory(!showHistory);
      });

      keyboardHandlerRef.current.addShortcut(['Ctrl', '?'], () => {
        toggleFormatHints();
      });

      // Cleanup
      return () => {
        ariaAnnouncerRef.current?.destroy();
        debouncedAnnouncerRef.current?.clear();
        keyboardHandlerRef.current?.clear();
      };
    }, [enableEnhancedFeatures, showHistory, toggleFormatHints]);

    /**
     * Check if camera is supported
     */
    useEffect(() => {
      if (enableQrScanning) {
        const checkCameraSupport = async () => {
          try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const hasCamera = devices.some(
              device => device.kind === 'videoinput'
            );
            setCameraSupported(
              hasCamera && !!navigator.mediaDevices.getUserMedia
            );
          } catch (error) {
            setCameraSupported(false);
          }
        };

        if (navigator.mediaDevices) {
          checkCameraSupport();
        } else {
          setCameraSupported(false);
        }
      }
    }, [enableQrScanning]);

    // Update verification status in history when status changes
    useEffect(() => {
      if (
        onVerificationStatusChange &&
        searchState.query &&
        !searchState.isSearching &&
        !searchState.error
      ) {
        onVerificationStatusChange(searchState.query, 'verified');
      } else if (
        onVerificationStatusChange &&
        searchState.query &&
        searchState.error
      ) {
        onVerificationStatusChange(searchState.query, 'error');
      }
    }, [
      searchState.query,
      searchState.isSearching,
      searchState.error,
      onVerificationStatusChange,
    ]);

    // Announce search state changes to screen readers
    useEffect(() => {
      if (!enableEnhancedFeatures || !debouncedAnnouncerRef.current) return;

      if (searchState.suggestions.length > 0) {
        debouncedAnnouncerRef.current.announce(
          'suggestions',
          `${searchState.suggestions.length} suggestions available`,
          300
        );
      }

      if (searchState.error) {
        ariaAnnouncerRef.current?.announce(
          `Error: ${searchState.error.message}`
        );
      }
    }, [
      searchState.suggestions.length,
      searchState.error,
      enableEnhancedFeatures,
    ]);

    /**
     * Handles form submission
     */
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();

      if (
        searchState.showSuggestions &&
        searchState.selectedSuggestionIndex >= 0
      ) {
        const selectedSuggestion =
          searchState.suggestions[searchState.selectedSuggestionIndex];
        if (selectedSuggestion) {
          selectSuggestion(selectedSuggestion);
          return;
        }
      }

      const trimmedId = searchState.query.trim();
      if (trimmedId) {
        performSearch(trimmedId);
      }
    };

    /**
     * Handles input change with auto-formatting
     */
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;

      if (enableEnhancedFeatures) {
        // Use enhanced search functionality
        setQuery(rawValue);
      } else {
        // Basic functionality for backward compatibility
        setQuery(rawValue);
      }
    };

    /**
     * Enhanced keyboard event handling
     */
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Handle global shortcuts
      if (
        enableEnhancedFeatures &&
        keyboardHandlerRef.current?.handleKeydown(e.nativeEvent)
      ) {
        return;
      }

      // Handle search-specific navigation
      if (enableEnhancedFeatures) {
        handleKeyboard(e);
      } else if (e.key === 'Enter') {
        handleSubmit(e);
      }
    };

    /**
     * Handles QR code scanning with enhanced features
     */
    const handleQrScan = useCallback(
      (data: string) => {
        // Use the QR validation utility to extract product data
        const validation = validateQRCode(data);

        if (validation.valid && validation.productId) {
          setQuery(validation.productId);
          setIsScanning(false);
          onQrScanToggle?.(false);

          // Auto-submit since validation already confirmed it's valid
          performSearch(validation.productId);

          // Announce to screen readers
          ariaAnnouncerRef.current?.announce(
            `QR code scanned: ${validation.productId}`
          );
        } else {
          // Handle invalid QR code
          ariaAnnouncerRef.current?.announce('Invalid QR code format');
          // Keep scanning mode active for retry
        }
      },
      [setQuery, performSearch, onQrScanToggle]
    );

    /**
     * Toggles QR scanning mode
     */
    const toggleQrScanning = () => {
      const newScanning = !isScanning;
      setIsScanning(newScanning);
      onQrScanToggle?.(newScanning);

      // Announce to screen readers
      ariaAnnouncerRef.current?.announce(
        newScanning ? 'QR scanner activated' : 'QR scanner deactivated'
      );
    };

    /**
     * Handle suggestion selection
     */
    const handleSuggestionSelect = (suggestion: any) => {
      selectSuggestion(suggestion);
      ariaAnnouncerRef.current?.announce(`Selected: ${suggestion.productId}`);
    };

    /**
     * Handle input focus events
     */
    const handleInputFocus = () => {
      setInputFocused(true);
      if (
        enableEnhancedFeatures &&
        searchState.history.length > 0 &&
        !searchState.query
      ) {
        setShowHistory(true);
      }
    };

    const handleInputBlur = () => {
      setInputFocused(false);
      // Delay hiding to allow for suggestion clicks
      setTimeout(() => {
        setShowHistory(false);
      }, 200);
    };

    // Format the current input for display
    const formatState = enableEnhancedFeatures
      ? formatProductIdFn(searchState.query)
      : null;
    const displayValue =
      enableEnhancedFeatures && formatState
        ? inputFocused
          ? searchState.query
          : formatState.formattedValue
        : searchState.query;

    const hasError = searchState.error !== null;
    const hasValidationError = enableEnhancedFeatures
      ? !searchState.validation.valid && searchState.query.length > 0
      : false;

    // Generate unique IDs for accessibility
    const inputId = React.useId();
    const suggestionsId = React.useId();
    const errorId = React.useId();
    const hintsId = React.useId();

    // ARIA props for the enhanced input
    const ariaProps = enableEnhancedFeatures
      ? createComboboxAriaProps({
          isExpanded: searchState.showSuggestions,
          controls: suggestionsId,
          describedBy:
            [errorId, hintsId].filter(Boolean).join(' ') || undefined,
          activeDescendant:
            searchState.selectedSuggestionIndex >= 0
              ? `${suggestionsId}-${searchState.selectedSuggestionIndex}`
              : undefined,
        })
      : {};

    return (
      <div
        ref={ref}
        className={cn('relative mx-auto w-full max-w-md', className)}
        {...props}
      >
        {isScanning ? (
          <ScanningInterface
            isScanning={isScanning}
            onScan={handleQrScan}
            onCancel={toggleQrScanning}
            showTips={true}
          />
        ) : (
          <>
            {/* Enhanced Error Display */}
            {enableEnhancedFeatures && searchState.error && (
              <div className='mb-4'>
                <SearchErrorHandler
                  error={searchState.error}
                  onRetry={() => performSearch(searchState.query)}
                  onSuggestionClick={suggestion => {
                    setQuery(suggestion);
                    performSearch(suggestion);
                  }}
                />
              </div>
            )}

            {/* Format Guide */}
            {enableEnhancedFeatures &&
              showFormatHints &&
              searchState.showFormatHints && (
                <div className='mb-4'>
                  <ProductFormatGuide
                    visible={true}
                    onToggle={toggleFormatHints}
                    currentInput={searchState.query}
                    compact={!inputFocused}
                  />
                </div>
              )}

            {/* Search History */}
            {enableEnhancedFeatures && showSearchHistory && showHistory && (
              <div className='mb-4'>
                <SearchHistory
                  history={searchState.history}
                  visible={true}
                  onSelect={productId => {
                    setQuery(productId);
                    performSearch(productId);
                    setShowHistory(false);
                  }}
                  onClear={clearHistory}
                  onRemove={_productId => {
                    // Remove specific item - this would need to be implemented in the hook
                    // TODO: Implement individual history item removal in useProductSearch hook
                  }}
                  maxItems={5}
                />
              </div>
            )}

            {/* QR Scan Button */}
            {enableQrScanning && cameraSupported && (
              <div className='mb-4 text-center'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={toggleQrScanning}
                  className='flex items-center gap-2'
                  disabled={loading || searchState.isSearching}
                >
                  <svg
                    className='h-5 w-5'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h2M4 4h5v5H4V4z'
                    />
                  </svg>
                  Scan QR code
                </Button>
              </div>
            )}

            {/* OR Divider */}
            {enableQrScanning && cameraSupported && (
              <div className='relative mb-4'>
                <div className='absolute inset-0 flex items-center'>
                  <div className='border-secondary-300 w-full border-t dark:border-secondary-600' />
                </div>
                <div className='relative flex justify-center text-sm'>
                  <span className='dark:text-secondary-400 bg-white px-2 text-secondary-500 dark:bg-gray-900'>
                    or enter manually
                  </span>
                </div>
              </div>
            )}

            <ClientOnly
              fallback={
                <div className='space-y-4'>
                  <div className='space-y-2'>
                    <div className='flex items-center justify-between'>
                      <label className='dark:text-secondary-300 text-base font-medium leading-none text-secondary-700 peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
                        Product ID
                      </label>
                    </div>
                    <div className='relative'>
                      <input
                        type='text'
                        placeholder={placeholder}
                        disabled
                        className='border-secondary-300 placeholder:text-secondary-400 flex h-10 w-full animate-fade-in rounded-md border bg-white px-3 py-2 pr-12 text-sm opacity-50'
                      />
                    </div>
                  </div>
                  <button
                    type='button'
                    disabled
                    className='h-10 w-full cursor-not-allowed rounded-md bg-gray-100 px-4 py-2 text-gray-400'
                  >
                    Loading...
                  </button>
                </div>
              }
            >
              <form onSubmit={handleSubmit} className='space-y-4'>
                <div className='space-y-2'>
                  <div className='flex items-center justify-between'>
                    <label
                      htmlFor={inputId}
                      className='dark:text-secondary-300 text-base font-medium leading-none text-secondary-700 peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                    >
                      Product ID
                    </label>

                    {/* Enhanced features toggle buttons */}
                    {enableEnhancedFeatures && (
                      <div className='flex items-center space-x-2'>
                        {/* History toggle */}
                        {showSearchHistory &&
                          searchState.history.length > 0 && (
                            <button
                              type='button'
                              onClick={() => setShowHistory(!showHistory)}
                              className='dark:text-secondary-400 dark:hover:text-secondary-200 text-xs text-secondary-500 transition-colors hover:text-secondary-700'
                              title='Toggle search history'
                            >
                              <svg
                                className='h-4 w-4'
                                fill='currentColor'
                                viewBox='0 0 20 20'
                              >
                                <path
                                  fillRule='evenodd'
                                  d='M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z'
                                  clipRule='evenodd'
                                />
                              </svg>
                            </button>
                          )}

                        {/* Format hints toggle */}
                        <button
                          type='button'
                          onClick={toggleFormatHints}
                          className='dark:text-secondary-400 dark:hover:text-secondary-200 text-xs text-secondary-500 transition-colors hover:text-secondary-700'
                          title='Toggle format hints'
                        >
                          <svg
                            className='h-4 w-4'
                            fill='none'
                            viewBox='0 0 24 24'
                            stroke='currentColor'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                            />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className='relative' ref={containerRef}>
                    <EnhancedInput
                      ref={inputRef}
                      id={inputId}
                      type='text'
                      placeholder={placeholder}
                      value={displayValue}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                      error={hasError || hasValidationError}
                      isFormatted={
                        enableEnhancedFeatures && formatState?.isValid
                      }
                      showValidation={enableEnhancedFeatures}
                      disabled={loading || searchState.isSearching}
                      autoFocus={autoFocus}
                      className='pr-12'
                      {...ariaProps}
                    />

                    {/* Loading indicator */}
                    {(loading || searchState.isSearching) && (
                      <div className='absolute right-3 top-1/2 -translate-y-1/2'>
                        <svg
                          className='text-secondary-400 h-4 w-4 animate-spin'
                          xmlns='http://www.w3.org/2000/svg'
                          fill='none'
                          viewBox='0 0 24 24'
                        >
                          <circle
                            className='opacity-25'
                            cx='12'
                            cy='12'
                            r='10'
                            stroke='currentColor'
                            strokeWidth='4'
                          />
                          <path
                            className='opacity-75'
                            fill='currentColor'
                            d='m4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                          />
                        </svg>
                      </div>
                    )}

                    {/* Validation indicator */}
                    {enableEnhancedFeatures &&
                      !loading &&
                      !searchState.isSearching &&
                      searchState.query && (
                        <div className='absolute right-3 top-1/2 -translate-y-1/2'>
                          {searchState.validation.valid ? (
                            <svg
                              className='h-4 w-4 text-green-500'
                              fill='currentColor'
                              viewBox='0 0 20 20'
                            >
                              <path
                                fillRule='evenodd'
                                d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                                clipRule='evenodd'
                              />
                            </svg>
                          ) : (
                            <svg
                              className='h-4 w-4 text-red-500'
                              fill='currentColor'
                              viewBox='0 0 20 20'
                            >
                              <path
                                fillRule='evenodd'
                                d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
                                clipRule='evenodd'
                              />
                            </svg>
                          )}
                        </div>
                      )}

                    {/* Auto-complete dropdown */}
                    {enableEnhancedFeatures && (
                      <AutoCompleteDropdown
                        ref={dropdownRef}
                        suggestions={searchState.suggestions}
                        selectedIndex={searchState.selectedSuggestionIndex}
                        onSelect={handleSuggestionSelect}
                        visible={searchState.showSuggestions}
                        maxHeight='240px'
                        loading={searchState.isSearching}
                      />
                    )}
                  </div>

                  {/* Legacy error display (when enhanced features are disabled) */}
                  {!enableEnhancedFeatures && hasError && error && (
                    <p
                      id={errorId}
                      className='dark:text-error-400 flex items-center gap-1 text-sm text-error-700'
                      role='alert'
                    >
                      <svg
                        className='h-4 w-4 flex-shrink-0'
                        fill='currentColor'
                        viewBox='0 0 20 20'
                        xmlns='http://www.w3.org/2000/svg'
                      >
                        <path
                          fillRule='evenodd'
                          d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
                          clipRule='evenodd'
                        />
                      </svg>
                      {error.message}
                    </p>
                  )}

                  {/* Enhanced validation feedback */}
                  {enableEnhancedFeatures &&
                    hasValidationError &&
                    searchState.validation.error && (
                      <p
                        id={errorId}
                        className='dark:text-error-400 flex items-center gap-1 text-sm text-error-700'
                        role='alert'
                      >
                        <svg
                          className='h-4 w-4 flex-shrink-0'
                          fill='currentColor'
                          viewBox='0 0 20 20'
                          xmlns='http://www.w3.org/2000/svg'
                        >
                          <path
                            fillRule='evenodd'
                            d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
                            clipRule='evenodd'
                          />
                        </svg>
                        {searchState.validation.error}
                      </p>
                    )}
                </div>

                <Button
                  type='submit'
                  className='w-full'
                  loading={loading || searchState.isSearching}
                  disabled={
                    loading ||
                    searchState.isSearching ||
                    (enableEnhancedFeatures
                      ? !searchState.validation.valid
                      : !searchState.query.trim())
                  }
                >
                  {loading || searchState.isSearching
                    ? 'Searching...'
                    : 'Verify product'}
                </Button>
              </form>
            </ClientOnly>

            {/* Help text */}
            <div className='dark:text-secondary-400 mt-4 animate-fade-in text-center text-xs text-secondary-500'>
              <p>
                Enter a product ID to verify its authenticity and view its
                supply chain journey.
              </p>
              {enableQrScanning && cameraSupported && (
                <p className='mt-1'>
                  You can scan a QR code or enter the product ID manually.
                </p>
              )}
              {enableEnhancedFeatures && (
                <div className='mt-2 space-y-1'>
                  <p className='text-xs'>
                    <span className='font-medium'>Tips:</span> Use ↑↓ to
                    navigate suggestions, Tab to auto-complete, Ctrl+K to focus
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }
);

ProductLookup.displayName = 'ProductLookup';
