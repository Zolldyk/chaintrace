/**
 * ProductLookup component for product ID input and search functionality.
 *
 * @example
 * ```tsx
 * <ProductLookup
 *   onSearch={(productId) => console.log('Searching for:', productId)}
 *   loading={false}
 * />
 * ```
 *
 * @since 1.0.0
 */

'use client';

import * as React from 'react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { ProductVerificationError } from '@/types';

export interface ProductLookupProps {
  /** Callback when search is triggered */
  onSearch: (productId: string) => void;

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
}

/**
 * Input component with proper styling
 */
const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }
>(({ className, error, ...props }, ref) => {
  return (
    <input
      className={cn(
        'border-secondary-300 placeholder:text-secondary-400 flex h-10 w-full animate-fade-in rounded-md border bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        error && 'border-error-500 focus:border-error-500 focus:ring-error-500',
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = 'Input';

/**
 * ProductLookup component for entering and searching product IDs
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
      placeholder = 'Enter product ID (e.g., PROD-2024-001)',
      autoFocus = false,
      ...props
    },
    ref
  ) => {
    const [productId, setProductId] = useState<string>(initialValue);
    const [touched, setTouched] = useState<boolean>(false);

    /**
     * Validates product ID format
     */
    const validateProductId = (id: string): boolean => {
      if (!id.trim()) return false;

      // Basic validation - should be at least 3 characters and contain alphanumeric characters
      const pattern = /^[A-Z0-9][A-Z0-9\-_]{2,}$/i;
      return pattern.test(id.trim());
    };

    /**
     * Handles form submission
     */
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setTouched(true);

      const trimmedId = productId.trim();
      if (validateProductId(trimmedId)) {
        onSearch(trimmedId);
      }
    };

    /**
     * Handles input change
     */
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setProductId(e.target.value);
      if (touched && error) {
        // Clear error when user starts typing after an error
        setTouched(false);
      }
    };

    /**
     * Handles key press events
     */
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSubmit(e);
      }
    };

    const hasError =
      error !== null || (touched && !validateProductId(productId));
    const errorMessage =
      error?.message ||
      (touched && !validateProductId(productId)
        ? 'Please enter a valid product ID'
        : '');

    return (
      <div
        ref={ref}
        className={cn('mx-auto w-full max-w-md', className)}
        {...props}
      >
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='space-y-2'>
            <label
              htmlFor='product-id-input'
              className='text-base font-medium leading-none text-secondary-700 peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
            >
              Product ID
            </label>

            <div className='relative'>
              <Input
                id='product-id-input'
                type='text'
                placeholder={placeholder}
                value={productId}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                onBlur={() => setTouched(true)}
                error={hasError}
                disabled={loading}
                autoFocus={autoFocus}
                className='pr-12'
                aria-describedby={hasError ? 'product-id-error' : undefined}
                aria-invalid={hasError}
              />

              {loading && (
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
            </div>

            {hasError && (
              <p
                id='product-id-error'
                className='flex items-center gap-1 text-sm text-error-700'
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
                {errorMessage}
              </p>
            )}
          </div>

          <Button
            type='submit'
            className='w-full'
            loading={loading}
            disabled={loading || !validateProductId(productId)}
          >
            {loading ? 'Searching...' : 'Verify Product'}
          </Button>
        </form>

        <div className='mt-4 animate-fade-in text-center text-xs text-secondary-500'>
          <p>
            Enter a product ID to verify its authenticity and view its supply
            chain journey.
          </p>
        </div>
      </div>
    );
  }
);

ProductLookup.displayName = 'ProductLookup';
