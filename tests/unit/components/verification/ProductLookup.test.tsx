/**
 * Unit tests for ProductLookup component
 *
 * Tests comprehensive input validation, error state handling, loading states,
 * form submission, and accessibility features.
 *
 * @since 1.0.0
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductLookup } from '@/components/verification/ProductLookup';
import { ProductVerificationError } from '@/types';

describe('ProductLookup', () => {
  const mockOnSearch = vi.fn();
  const defaultProps = {
    onSearch: mockOnSearch,
  };

  beforeEach(() => {
    mockOnSearch.mockClear();
  });

  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<ProductLookup {...defaultProps} />);

      expect(screen.getByLabelText('Product ID')).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('Enter product ID (e.g., PROD-2024-001)')
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Verify Product' })
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'Enter a product ID to verify its authenticity and view its supply chain journey.'
        )
      ).toBeInTheDocument();
    });

    it('renders with custom placeholder', () => {
      render(
        <ProductLookup
          {...defaultProps}
          placeholder='Custom placeholder text'
        />
      );

      expect(
        screen.getByPlaceholderText('Custom placeholder text')
      ).toBeInTheDocument();
    });

    it('renders with initial value', () => {
      render(<ProductLookup {...defaultProps} initialValue='TEST-123' />);

      expect(screen.getByDisplayValue('TEST-123')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <ProductLookup {...defaultProps} className='custom-class' />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('auto-focuses input when autoFocus is true', () => {
      render(<ProductLookup {...defaultProps} autoFocus={true} />);

      expect(screen.getByLabelText('Product ID')).toHaveFocus();
    });
  });

  describe('Input Validation', () => {
    it('validates empty input on blur', async () => {
      const user = userEvent.setup();
      render(<ProductLookup {...defaultProps} />);

      const input = screen.getByLabelText('Product ID');
      await user.click(input);
      await user.tab(); // Trigger blur

      expect(
        screen.getByText('Please enter a valid product ID')
      ).toBeInTheDocument();
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('validates product ID format', async () => {
      const user = userEvent.setup();
      render(<ProductLookup {...defaultProps} />);

      const input = screen.getByLabelText('Product ID');

      // Test invalid formats
      await user.type(input, 'x');
      await user.tab();
      expect(
        screen.getByText('Please enter a valid product ID')
      ).toBeInTheDocument();

      await user.clear(input);
      await user.type(input, '123');
      await user.tab();
      expect(
        screen.getByText('Please enter a valid product ID')
      ).toBeInTheDocument();

      // Test valid format
      await user.clear(input);
      await user.type(input, 'PROD-2024-001');
      await user.tab();
      expect(
        screen.queryByText('Please enter a valid product ID')
      ).not.toBeInTheDocument();
    });

    it('accepts valid product ID formats', async () => {
      const user = userEvent.setup();
      render(<ProductLookup {...defaultProps} />);

      const input = screen.getByLabelText('Product ID');
      const validIds = [
        'PROD-2024-001',
        'ABC123',
        'TEST_PRODUCT_ID',
        '12345-ABC',
        'a1b2c3',
      ];

      for (const productId of validIds) {
        await user.clear(input);
        await user.type(input, productId);
        await user.tab();
        expect(
          screen.queryByText('Please enter a valid product ID')
        ).not.toBeInTheDocument();
      }
    });

    it('disables submit button for invalid input', async () => {
      const user = userEvent.setup();
      render(<ProductLookup {...defaultProps} />);

      const submitButton = screen.getByRole('button', {
        name: 'Verify Product',
      });
      expect(submitButton).toBeDisabled();

      const input = screen.getByLabelText('Product ID');
      await user.type(input, 'x');
      expect(submitButton).toBeDisabled();

      await user.clear(input);
      await user.type(input, 'VALID-ID');
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Form Submission', () => {
    it('calls onSearch with valid product ID on form submit', async () => {
      const user = userEvent.setup();
      render(<ProductLookup {...defaultProps} />);

      const input = screen.getByLabelText('Product ID');
      const form = screen
        .getByRole('button', { name: 'Verify Product' })
        .closest('form');

      await user.type(input, 'TEST-PRODUCT-123');
      fireEvent.submit(form!);

      expect(mockOnSearch).toHaveBeenCalledWith('TEST-PRODUCT-123');
      expect(mockOnSearch).toHaveBeenCalledTimes(1);
    });

    it('calls onSearch with valid product ID on button click', async () => {
      const user = userEvent.setup();
      render(<ProductLookup {...defaultProps} />);

      const input = screen.getByLabelText('Product ID');
      const button = screen.getByRole('button', { name: 'Verify Product' });

      await user.type(input, 'TEST-PRODUCT-456');
      await user.click(button);

      expect(mockOnSearch).toHaveBeenCalledWith('TEST-PRODUCT-456');
    });

    it('calls onSearch on Enter key press', async () => {
      const user = userEvent.setup();
      render(<ProductLookup {...defaultProps} />);

      const input = screen.getByLabelText('Product ID');

      await user.type(input, 'TEST-ENTER-789');
      await user.keyboard('{Enter}');

      expect(mockOnSearch).toHaveBeenCalledWith('TEST-ENTER-789');
    });

    it('trims whitespace from product ID before submission', async () => {
      const user = userEvent.setup();
      render(<ProductLookup {...defaultProps} />);

      const input = screen.getByLabelText('Product ID');
      const button = screen.getByRole('button', { name: 'Verify Product' });

      await user.type(input, '  TEST-WHITESPACE-123  ');
      await user.click(button);

      expect(mockOnSearch).toHaveBeenCalledWith('TEST-WHITESPACE-123');
    });

    it('does not call onSearch for invalid product ID', async () => {
      const user = userEvent.setup();
      render(<ProductLookup {...defaultProps} />);

      const input = screen.getByLabelText('Product ID');
      const button = screen.getByRole('button', { name: 'Verify Product' });

      await user.type(input, 'x');
      await user.click(button);

      expect(mockOnSearch).not.toHaveBeenCalled();
      expect(
        screen.getByText('Please enter a valid product ID')
      ).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('displays loading state correctly', () => {
      render(<ProductLookup {...defaultProps} loading={true} />);

      const input = screen.getByLabelText('Product ID');
      const button = screen.getByRole('button', { name: 'Searching...' });
      const spinner = screen.getByRole('button').querySelector('svg');

      expect(input).toBeDisabled();
      expect(button).toBeDisabled();
      expect(spinner).toHaveClass('animate-spin');
      expect(screen.getByText('Searching...')).toBeInTheDocument();
    });

    it('shows loading spinner in input field', () => {
      render(<ProductLookup {...defaultProps} loading={true} />);

      const inputContainer = screen.getByLabelText('Product ID').parentElement;
      const spinner = inputContainer?.querySelector('.animate-spin');

      expect(spinner).toBeInTheDocument();
    });

    it('disables form interaction during loading', async () => {
      const user = userEvent.setup();
      render(<ProductLookup {...defaultProps} loading={true} />);

      const input = screen.getByLabelText('Product ID');
      const button = screen.getByRole('button', { name: 'Searching...' });

      expect(input).toBeDisabled();
      expect(button).toBeDisabled();

      // Attempt to type and click should not work
      await user.type(input, 'TEST');
      await user.click(button);

      expect(mockOnSearch).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('displays error message from props', () => {
      const error: ProductVerificationError = {
        code: 'PRODUCT_NOT_FOUND',
        message: 'Product not found',
        timestamp: new Date().toISOString(),
        retryable: false,
      };

      render(<ProductLookup {...defaultProps} error={error} />);

      expect(screen.getByText('Product not found')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByLabelText('Product ID')).toHaveAttribute(
        'aria-invalid',
        'true'
      );
    });

    it('applies error styling to input', () => {
      const error: ProductVerificationError = {
        code: 'INVALID_PRODUCT_ID',
        message: 'Invalid product ID format',
        timestamp: new Date().toISOString(),
        retryable: false,
      };

      render(<ProductLookup {...defaultProps} error={error} />);

      const input = screen.getByLabelText('Product ID');
      expect(input).toHaveClass('border-red-500');
    });

    it('clears error when user starts typing after error', async () => {
      const error: ProductVerificationError = {
        code: 'PRODUCT_NOT_FOUND',
        message: 'Product not found',
        timestamp: new Date().toISOString(),
        retryable: false,
      };

      const user = userEvent.setup();
      const { rerender } = render(
        <ProductLookup {...defaultProps} error={error} />
      );

      expect(screen.getByText('Product not found')).toBeInTheDocument();

      // User types after error
      const input = screen.getByLabelText('Product ID');
      await user.type(input, 'NEW-INPUT');

      // Re-render without error to simulate error clearing
      rerender(<ProductLookup {...defaultProps} error={null} />);

      expect(screen.queryByText('Product not found')).not.toBeInTheDocument();
    });

    it('displays error icon in error message', () => {
      const error: ProductVerificationError = {
        code: 'MIRROR_NODE_ERROR',
        message: 'Service temporarily unavailable',
        timestamp: new Date().toISOString(),
        retryable: true,
      };

      render(<ProductLookup {...defaultProps} error={error} />);

      const errorMessage = screen.getByRole('alert');
      const errorIcon = errorMessage.querySelector('svg');

      expect(errorIcon).toBeInTheDocument();
      expect(errorMessage).toHaveClass('text-red-600');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<ProductLookup {...defaultProps} />);

      const input = screen.getByLabelText('Product ID');

      expect(input).toHaveAttribute('aria-invalid', 'false');
      expect(screen.getByLabelText('Product ID')).toBeInTheDocument();
    });

    it('has proper ARIA attributes with error', () => {
      const error: ProductVerificationError = {
        code: 'INVALID_PRODUCT_ID',
        message: 'Invalid input',
        timestamp: new Date().toISOString(),
        retryable: false,
      };

      render(<ProductLookup {...defaultProps} error={error} />);

      const input = screen.getByLabelText('Product ID');

      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby', 'product-id-error');
      expect(screen.getByRole('alert')).toHaveAttribute(
        'id',
        'product-id-error'
      );
    });

    it('maintains focus management', async () => {
      const user = userEvent.setup();
      render(<ProductLookup {...defaultProps} />);

      const input = screen.getByLabelText('Product ID');
      const button = screen.getByRole('button', { name: 'Verify Product' });

      await user.click(input);
      expect(input).toHaveFocus();

      await user.tab();
      expect(button).toHaveFocus();
    });

    it('announces loading state to screen readers', () => {
      render(<ProductLookup {...defaultProps} loading={true} />);

      const button = screen.getByRole('button', { name: 'Searching...' });
      expect(button).toHaveTextContent('Searching...');
    });

    it('provides descriptive error messages for screen readers', () => {
      const error: ProductVerificationError = {
        code: 'MIRROR_NODE_TIMEOUT',
        message: 'Request timed out. Please try again.',
        timestamp: new Date().toISOString(),
        retryable: true,
      };

      render(<ProductLookup {...defaultProps} error={error} />);

      const errorElement = screen.getByRole('alert');
      expect(errorElement).toHaveTextContent(
        'Request timed out. Please try again.'
      );
    });
  });

  describe('Component Integration', () => {
    it('works with React.forwardRef', () => {
      const ref = { current: null };
      render(<ProductLookup ref={ref} {...defaultProps} />);

      expect(ref.current).toBeTruthy();
    });

    it('passes through additional props', () => {
      render(<ProductLookup {...defaultProps} data-testid='product-lookup' />);

      expect(screen.getByTestId('product-lookup')).toBeInTheDocument();
    });

    it('handles edge cases gracefully', async () => {
      const user = userEvent.setup();
      render(<ProductLookup {...defaultProps} />);

      const input = screen.getByLabelText('Product ID');

      // Test empty string submission
      await user.clear(input);
      await user.keyboard('{Enter}');
      expect(mockOnSearch).not.toHaveBeenCalled();

      // Test only whitespace
      await user.type(input, '   ');
      await user.keyboard('{Enter}');
      expect(mockOnSearch).not.toHaveBeenCalled();
    });
  });
});
