/**
 * Input component with label and error state support.
 *
 * @example
 * ```tsx
 * <Input
 *   label="Product Name"
 *   placeholder="Enter product name"
 *   error="Product name is required"
 *   value={value}
 *   onChange={handleChange}
 * />
 * ```
 *
 * @since 1.0.0
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Input field label */
  label?: string;

  /** Error message to display */
  error?: string;

  /** Additional description text */
  description?: string;

  /** Whether field is required */
  required?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      description,
      required = false,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          className={cn(
            'block w-full rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm transition-colors',
            'focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500',
            'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
            {
              'border-red-300 focus:border-red-500 focus:ring-red-500': error,
            },
            className
          )}
          ref={ref}
          {...props}
        />
        {description && !error && (
          <p className="mt-1 text-xs text-gray-500">{description}</p>
        )}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };