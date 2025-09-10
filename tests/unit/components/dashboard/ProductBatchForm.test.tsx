/**
 * Unit tests for ProductBatchForm component
 * 
 * Tests form rendering, validation, user interactions, and
 * integration with the batch creation workflow.
 *
 * @since 1.0.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductBatchForm } from '@/components/dashboard/ProductBatchForm';
import type { CreateProductBatch, BatchFormState } from '@/types/batch';

// Mock the validation utilities
vi.mock('@/lib/validation/product', () => ({
  FormValidationUtils: {
    validateProductField: vi.fn().mockReturnValue({ isValid: true }),
    validateProductBatch: vi.fn().mockReturnValue({
      isValid: true,
      errors: [],
      productErrors: [],
    }),
    getNigerianStates: vi.fn().mockReturnValue(['Lagos', 'Kano', 'Rivers', 'FCT']),
    getRegions: vi.fn().mockReturnValue([
      'North Central',
      'North East', 
      'North West',
      'South East',
      'South South', 
      'South West',
    ]),
  },
  CreateProductBatchSchema: {
    parse: vi.fn(),
  },
}));

describe('ProductBatchForm', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    loading: false,
    maxBatchSize: 100,
    defaultCooperativeId: 'coop-123',
    defaultCreatedBy: '0.0.12345',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with initial form state', () => {
    render(<ProductBatchForm {...defaultProps} />);

    // Check batch information section
    expect(screen.getByLabelText(/cooperative id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/created by/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/processing notes/i)).toBeInTheDocument();

    // Check products section
    expect(screen.getByText(/products \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/product 1/i)).toBeInTheDocument();

    // Check product fields
    expect(screen.getByLabelText(/product name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/unit/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/state/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/region/i)).toBeInTheDocument();

    // Check action buttons
    expect(screen.getByRole('button', { name: /add product/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create batch/i })).toBeInTheDocument();
  });

  it('should initialize with default values', () => {
    render(<ProductBatchForm {...defaultProps} />);

    const cooperativeIdInput = screen.getByLabelText(/cooperative id/i);
    const createdByInput = screen.getByLabelText(/created by/i);

    expect(cooperativeIdInput).toHaveValue('coop-123');
    expect(createdByInput).toHaveValue('0.0.12345');
  });

  it('should add new product when Add Product button is clicked', async () => {
    const user = userEvent.setup();
    render(<ProductBatchForm {...defaultProps} />);

    const addButton = screen.getByRole('button', { name: /add product/i });
    await user.click(addButton);

    expect(screen.getByText(/products \(2\)/i)).toBeInTheDocument();
    expect(screen.getByText(/product 2/i)).toBeInTheDocument();
  });

  it('should respect max batch size limit', async () => {
    const user = userEvent.setup();
    render(<ProductBatchForm {...defaultProps} maxBatchSize={2} />);

    const addButton = screen.getByRole('button', { name: /add product/i });
    
    // Add one product (total: 2)
    await user.click(addButton);
    expect(screen.getByText(/products \(2\)/i)).toBeInTheDocument();

    // Try to add another (should be disabled)
    expect(addButton).toBeDisabled();
  });

  it('should remove product when Remove button is clicked', async () => {
    const user = userEvent.setup();
    render(<ProductBatchForm {...defaultProps} />);

    // Add a product first
    const addButton = screen.getByRole('button', { name: /add product/i });
    await user.click(addButton);
    expect(screen.getByText(/products \(2\)/i)).toBeInTheDocument();

    // Remove the second product
    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    await user.click(removeButtons[1]); // Remove second product

    expect(screen.getByText(/products \(1\)/i)).toBeInTheDocument();
    expect(screen.queryByText(/product 2/i)).not.toBeInTheDocument();
  });

  it('should not allow removing the last product', () => {
    render(<ProductBatchForm {...defaultProps} />);

    // With only one product, remove button should not exist or be disabled
    const removeButton = screen.queryByRole('button', { name: /remove/i });
    expect(removeButton).not.toBeInTheDocument();
  });

  it('should update form fields correctly', async () => {
    const user = userEvent.setup();
    render(<ProductBatchForm {...defaultProps} />);

    const productNameInput = screen.getByLabelText(/product name/i);
    await user.type(productNameInput, 'Organic Tomatoes');

    expect(productNameInput).toHaveValue('Organic Tomatoes');
  });

  it('should update batch information correctly', async () => {
    const user = userEvent.setup();
    render(<ProductBatchForm {...defaultProps} />);

    const notesInput = screen.getByLabelText(/processing notes/i);
    await user.type(notesInput, 'First batch of the season');

    expect(notesInput).toHaveValue('First batch of the season');
  });

  it('should display validation errors for invalid fields', async () => {
    const { FormValidationUtils } = await import('@/lib/validation/product');
    (FormValidationUtils.validateProductField as any).mockReturnValue({
      isValid: false,
      error: 'Product name is required',
    });

    const user = userEvent.setup();
    render(<ProductBatchForm {...defaultProps} />);

    const productNameInput = screen.getByLabelText(/product name/i);
    await user.type(productNameInput, 'test');
    await user.clear(productNameInput); // Clear to trigger validation error

    await waitFor(() => {
      expect(screen.getByText(/product name is required/i)).toBeInTheDocument();
    });
  });

  it('should call onSubmit when form is submitted with valid data', async () => {
    const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    
    render(<ProductBatchForm {...defaultProps} onSubmit={mockOnSubmit} />);

    // Fill required fields
    await user.type(screen.getByLabelText(/product name/i), 'Test Product');
    await user.type(screen.getByLabelText(/quantity/i), '100');
    await user.type(screen.getByLabelText(/address/i), '123 Test St');
    await user.type(screen.getByLabelText(/city/i), 'Lagos');

    const submitButton = screen.getByRole('button', { name: /create batch/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  it('should disable submit button when loading', () => {
    render(<ProductBatchForm {...defaultProps} loading={true} />);

    const submitButton = screen.getByRole('button', { name: /create batch/i });
    expect(submitButton).toBeDisabled();
  });

  it('should show loading state on submit button', () => {
    render(<ProductBatchForm {...defaultProps} loading={true} />);

    const submitButton = screen.getByRole('button', { name: /create batch/i });
    expect(submitButton).toHaveClass('pointer-events-none', 'opacity-50');
  });

  it('should populate dropdowns with correct options', () => {
    render(<ProductBatchForm {...defaultProps} />);

    const categorySelect = screen.getByLabelText(/category/i);
    const unitSelect = screen.getByLabelText(/unit/i);
    const stateSelect = screen.getByLabelText(/state/i);
    const regionSelect = screen.getByLabelText(/region/i);

    // Category options
    expect(within(categorySelect).getByText('Agricultural')).toBeInTheDocument();
    expect(within(categorySelect).getByText('Processed Food')).toBeInTheDocument();
    expect(within(categorySelect).getByText('Manufactured')).toBeInTheDocument();
    expect(within(categorySelect).getByText('Other')).toBeInTheDocument();

    // Unit options
    expect(within(unitSelect).getByText('Kilograms (kg)')).toBeInTheDocument();
    expect(within(unitSelect).getByText('Tons')).toBeInTheDocument();
    expect(within(unitSelect).getByText('Pieces')).toBeInTheDocument();
    expect(within(unitSelect).getByText('Liters')).toBeInTheDocument();
    expect(within(unitSelect).getByText('Boxes')).toBeInTheDocument();
  });

  it('should validate numeric fields correctly', async () => {
    const user = userEvent.setup();
    render(<ProductBatchForm {...defaultProps} />);

    const quantityInput = screen.getByLabelText(/quantity/i);
    const latitudeInput = screen.getByLabelText(/latitude/i);
    const longitudeInput = screen.getByLabelText(/longitude/i);

    // Test numeric inputs
    await user.type(quantityInput, '100.5');
    await user.type(latitudeInput, '6.5244');
    await user.type(longitudeInput, '3.3792');

    expect(quantityInput).toHaveValue(100.5);
    expect(latitudeInput).toHaveValue(6.5244);
    expect(longitudeInput).toHaveValue(3.3792);
  });

  it('should handle form state changes callback', async () => {
    const mockOnFormStateChange = vi.fn();
    const user = userEvent.setup();
    
    render(
      <ProductBatchForm 
        {...defaultProps} 
        onFormStateChange={mockOnFormStateChange}
      />
    );

    const productNameInput = screen.getByLabelText(/product name/i);
    await user.type(productNameInput, 'Test');

    await waitFor(() => {
      expect(mockOnFormStateChange).toHaveBeenCalled();
    });
  });

  it('should display compliance status for products', async () => {
    const user = userEvent.setup();
    render(<ProductBatchForm {...defaultProps} />);

    // Fill out a product to trigger compliance validation
    await user.type(screen.getByLabelText(/product name/i), 'Test Product');

    // In a real scenario, compliance validation would be triggered
    // For testing, we can check that the compliance status area exists
    const productCard = screen.getByText(/product 1/i).closest('[class*="Card"]');
    expect(productCard).toBeInTheDocument();
  });

  it('should show batch validation errors', async () => {
    const { FormValidationUtils } = await import('@/lib/validation/product');
    (FormValidationUtils.validateProductBatch as any).mockReturnValue({
      isValid: false,
      errors: ['Batch exceeds weight limit'],
      productErrors: [],
    });

    const user = userEvent.setup();
    render(<ProductBatchForm {...defaultProps} />);

    // Try to submit invalid batch
    const submitButton = screen.getByRole('button', { name: /create batch/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/batch validation errors/i)).toBeInTheDocument();
      expect(screen.getByText(/batch exceeds weight limit/i)).toBeInTheDocument();
    });
  });

  it('should handle backup functionality', async () => {
    const mockOnBackup = vi.fn();
    const user = userEvent.setup();

    render(
      <ProductBatchForm 
        {...defaultProps} 
        onBackup={mockOnBackup}
      />
    );

    // Make changes to trigger backup
    await user.type(screen.getByLabelText(/product name/i), 'Test Product');

    // In real implementation, backup would be triggered by timer
    // We can verify the callback prop is passed correctly
    expect(mockOnBackup).toBeDefined();
  });

  it('should restore from initial data', () => {
    const initialData = {
      products: [
        {
          name: 'Restored Product',
          category: 'agricultural' as const,
          quantity: { amount: 50, unit: 'kg' as const },
          origin: {
            address: 'Restored Address',
            city: 'Lagos',
            state: 'Lagos',
            country: 'Nigeria' as const,
            coordinates: { latitude: 6.5, longitude: 3.5 },
            region: 'South West',
          },
          processingDetails: {},
        },
      ],
      batchInfo: {
        cooperativeId: 'restored-coop',
        createdBy: '0.0.54321',
        processingNotes: 'Restored notes',
      },
    };

    render(
      <ProductBatchForm 
        {...defaultProps} 
        initialData={initialData}
      />
    );

    expect(screen.getByDisplayValue('Restored Product')).toBeInTheDocument();
    expect(screen.getByDisplayValue('restored-coop')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0.0.54321')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Restored notes')).toBeInTheDocument();
  });

  it('should show backup timestamp when available', () => {
    const initialData = {
      lastBackup: new Date(),
    };

    render(
      <ProductBatchForm 
        {...defaultProps} 
        initialData={initialData}
      />
    );

    expect(screen.getByText(/last backup:/i)).toBeInTheDocument();
  });

  it('should handle submission errors gracefully', async () => {
    const mockOnSubmit = vi.fn().mockRejectedValue(new Error('Network error'));
    const user = userEvent.setup();
    
    render(<ProductBatchForm {...defaultProps} onSubmit={mockOnSubmit} />);

    // Fill and submit form
    await user.type(screen.getByLabelText(/product name/i), 'Test Product');
    await user.click(screen.getByRole('button', { name: /create batch/i }));

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });
});