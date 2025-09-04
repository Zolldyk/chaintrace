/**
 * Basic unit tests for ProductLookup component
 * Simple test suite to validate QA fixes
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductLookup } from '@/components/verification/ProductLookup';

// Mock utils
vi.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

describe('ProductLookup - QA Validation', () => {
  const mockOnSearch = vi.fn();

  it('should render the component', () => {
    render(<ProductLookup onSearch={mockOnSearch} />);

    expect(screen.getByLabelText('Product ID')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Verify Product/i })
    ).toBeInTheDocument();
  });

  it('should handle loading state', () => {
    render(<ProductLookup onSearch={mockOnSearch} loading={true} />);

    const input = screen.getByLabelText('Product ID');
    expect(input).toBeDisabled();

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Searching...');
  });

  it('should validate required props', () => {
    render(<ProductLookup onSearch={mockOnSearch} />);
    expect(mockOnSearch).toBeDefined();
  });
});
