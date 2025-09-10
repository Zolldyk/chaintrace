/**
 * Select component with label and error state support.
 *
 * @example
 * ```tsx
 * <Select
 *   label="Product Category"
 *   value={category}
 *   onChange={handleChange}
 *   options={[
 *     { value: 'agricultural', label: 'Agricultural' },
 *     { value: 'processed_food', label: 'Processed Food' }
 *   ]}
 *   error="Category is required"
 * />
 * ```
 *
 * @since 1.0.0
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  /** Option value */
  value: string;
  /** Option display label */
  label: string;
  /** Whether option is disabled */
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  /** Select field label */
  label?: string;

  /** Error message to display */
  error?: string;

  /** Additional description text */
  description?: string;

  /** Whether field is required */
  required?: boolean;

  /** Array of select options */
  options: SelectOption[];

  /** Placeholder text when no value selected */
  placeholder?: string;

  /** Change event handler with typed value */
  onChange?: (value: string) => void;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      description,
      required = false,
      options,
      placeholder = 'Select an option...',
      onChange,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const selectId = id || generatedId;

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange?.(e.target.value);
    };

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}
        <select
          id={selectId}
          className={cn(
            'block w-full rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm transition-colors',
            'focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500',
            'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
            {
              'border-red-300 focus:border-red-500 focus:ring-red-500': error,
              'text-gray-400': !props.value,
            },
            className
          )}
          onChange={handleChange}
          ref={ref}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              className="text-gray-900"
            >
              {option.label}
            </option>
          ))}
        </select>
        {description && !error && (
          <p className="mt-1 text-xs text-gray-500">{description}</p>
        )}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };