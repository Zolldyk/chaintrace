/**
 * Unit tests for useBatchCreation hook
 * 
 * Tests batch creation state management, form validation,
 * compliance integration, and local backup functionality.
 *
 * @since 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBatchCreation } from '@/hooks/useBatchCreation';
import type { CreateProductRequest, BatchCreationResponse } from '@/types/batch';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock fetch for API calls
global.fetch = vi.fn();

describe('useBatchCreation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => 
      useBatchCreation({
        maxBatchSize: 100,
        cooperativeId: 'coop-123',
        createdBy: '0.0.12345',
      })
    );

    expect(result.current.formState.products).toHaveLength(1);
    expect(result.current.formState.batchInfo.cooperativeId).toBe('coop-123');
    expect(result.current.formState.batchInfo.createdBy).toBe('0.0.12345');
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.hasChanges).toBe(false);
    expect(result.current.selectedProducts).toEqual([]);
  });

  it('should add new product to batch', () => {
    const { result } = renderHook(() => useBatchCreation());

    act(() => {
      result.current.addProduct();
    });

    expect(result.current.formState.products).toHaveLength(2);
    expect(result.current.formState.productValidations).toHaveLength(2);
    expect(result.current.hasChanges).toBe(true);
  });

  it('should respect max batch size limit', () => {
    const { result } = renderHook(() => 
      useBatchCreation({ maxBatchSize: 2 })
    );

    // Add one product (should work)
    act(() => {
      result.current.addProduct();
    });
    expect(result.current.formState.products).toHaveLength(2);

    // Try to add another (should be blocked)
    act(() => {
      result.current.addProduct();
    });
    expect(result.current.formState.products).toHaveLength(2);
  });

  it('should remove product from batch', () => {
    const { result } = renderHook(() => useBatchCreation());

    // Add a product first
    act(() => {
      result.current.addProduct();
    });
    expect(result.current.formState.products).toHaveLength(2);

    // Remove the second product
    act(() => {
      result.current.removeProduct(1);
    });
    expect(result.current.formState.products).toHaveLength(1);
  });

  it('should not remove last product', () => {
    const { result } = renderHook(() => useBatchCreation());

    act(() => {
      result.current.removeProduct(0);
    });

    // Should still have one product
    expect(result.current.formState.products).toHaveLength(1);
  });

  it('should update product field correctly', () => {
    const { result } = renderHook(() => useBatchCreation());

    act(() => {
      result.current.updateProduct(0, 'name', 'Organic Tomatoes');
    });

    expect(result.current.formState.products[0].name).toBe('Organic Tomatoes');
    expect(result.current.hasChanges).toBe(true);
  });

  it('should update nested product fields', () => {
    const { result } = renderHook(() => useBatchCreation());

    act(() => {
      result.current.updateProduct(0, 'quantity.amount', 100);
    });

    expect(result.current.formState.products[0].quantity.amount).toBe(100);
  });

  it('should validate fields on update', () => {
    const { result } = renderHook(() => useBatchCreation());

    act(() => {
      result.current.updateProduct(0, 'name', ''); // Invalid name
    });

    expect(result.current.formState.productValidations[0].errors.name).toBeTruthy();
    expect(result.current.formState.productValidations[0].isValid).toBe(false);
  });

  it('should update batch info correctly', () => {
    const { result } = renderHook(() => useBatchCreation());

    act(() => {
      result.current.updateBatchInfo('processingNotes', 'Test notes');
    });

    expect(result.current.formState.batchInfo.processingNotes).toBe('Test notes');
    expect(result.current.hasChanges).toBe(true);
  });

  it('should validate entire batch', () => {
    const { result } = renderHook(() => useBatchCreation({
      cooperativeId: 'invalid-id', // This should cause validation to fail
    }));

    act(() => {
      const validationResult = result.current.validateBatch();
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.length).toBeGreaterThan(0);
    });
  });

  it('should handle successful batch submission', async () => {
    const mockResponse: BatchCreationResponse = {
      success: true,
      batchId: 'BATCH-123',
      products: [
        {
          id: 'CT-2024-001-ABC123',
          name: 'Organic Tomatoes',
          qrCode: 'qr-data',
          status: 'created',
          complianceValidation: {
            approved: true,
            complianceId: 'comp-456',
            violations: [],
          },
        },
      ],
      processingTime: 5000,
    };

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { result } = renderHook(() => useBatchCreation({
      cooperativeId: '123e4567-e89b-12d3-a456-426614174000',
      createdBy: '0.0.12345',
    }));

    // Set up valid product
    act(() => {
      result.current.updateProduct(0, 'name', 'Organic Tomatoes');
      result.current.updateProduct(0, 'quantity.amount', 100);
      result.current.updateProduct(0, 'origin.address', '123 Farm Road');
      result.current.updateProduct(0, 'origin.city', 'Lagos');
    });

    let submissionResult: BatchCreationResponse;
    await act(async () => {
      submissionResult = await result.current.submitBatch();
    });

    expect(submissionResult!.success).toBe(true);
    expect(submissionResult!.batchId).toBe('BATCH-123');
    expect(result.current.hasChanges).toBe(false);
  });

  it('should handle failed batch submission', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: { message: 'Submission failed' } }),
    });

    const { result } = renderHook(() => useBatchCreation());

    await act(async () => {
      try {
        await result.current.submitBatch();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    expect(result.current.formState.submission.error).toBeTruthy();
  });

  it('should clear form correctly', () => {
    const { result } = renderHook(() => useBatchCreation({
      cooperativeId: 'coop-123',
      createdBy: '0.0.12345',
    }));

    // Make some changes first
    act(() => {
      result.current.addProduct();
      result.current.updateProduct(0, 'name', 'Test Product');
    });

    expect(result.current.formState.products).toHaveLength(2);
    expect(result.current.hasChanges).toBe(true);

    act(() => {
      result.current.clearForm();
    });

    expect(result.current.formState.products).toHaveLength(1);
    expect(result.current.formState.products[0].name).toBe('');
    expect(result.current.hasChanges).toBe(false);
    expect(result.current.selectedProducts).toEqual([]);
  });

  it('should handle bulk operations', () => {
    const { result } = renderHook(() => useBatchCreation());

    // Add products first
    act(() => {
      result.current.addProduct();
      result.current.addProduct();
    });

    expect(result.current.formState.products).toHaveLength(3);

    // Select all
    act(() => {
      result.current.bulkOperations.selectAll();
    });

    expect(result.current.selectedProducts).toEqual([0, 1, 2]);

    // Deselect all
    act(() => {
      result.current.bulkOperations.deselectAll();
    });

    expect(result.current.selectedProducts).toEqual([]);

    // Select some and remove
    act(() => {
      result.current.setSelectedProducts([1, 2]);
      result.current.bulkOperations.removeSelected();
    });

    expect(result.current.formState.products).toHaveLength(1);
    expect(result.current.selectedProducts).toEqual([]);
  });

  it('should backup form data to localStorage', () => {
    vi.useFakeTimers();
    
    const { result } = renderHook(() => 
      useBatchCreation({
        enableBackup: true,
        backupInterval: 1000, // 1 second for testing
      })
    );

    act(() => {
      result.current.updateProduct(0, 'name', 'Test Product');
    });

    // Fast-forward time to trigger backup
    act(() => {
      vi.advanceTimersByTime(1100);
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'chaintrace_form_backup',
      expect.stringContaining('Test Product')
    );

    vi.useRealTimers();
  });

  it('should load from backup on initialization', () => {
    const backupData = {
      formState: {
        products: [
          {
            name: 'Restored Product',
            category: 'agricultural',
            quantity: { amount: 50, unit: 'kg' },
            origin: {
              address: 'Restored Address',
              city: 'Lagos',
              state: 'Lagos',
              country: 'Nigeria',
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
        productValidations: [
          {
            errors: {},
            isValid: true,
            complianceStatus: 'pending',
            complianceMessages: [],
          },
        ],
        batchValidation: { isValid: true, errors: [] },
        submission: { isSubmitting: false, error: null, progress: 0 },
        lastBackup: new Date(),
      },
      timestamp: new Date(),
      version: '1.0.0',
      sessionId: 'session-123',
    };

    localStorageMock.getItem.mockReturnValue(JSON.stringify(backupData));

    const { result } = renderHook(() => 
      useBatchCreation({ enableBackup: true })
    );

    expect(result.current.formState.products[0].name).toBe('Restored Product');
    expect(result.current.formState.batchInfo.cooperativeId).toBe('restored-coop');
    expect(result.current.hasChanges).toBe(true);
  });

  it('should handle compliance validation with debouncing', async () => {
    vi.useFakeTimers();
    
    const mockComplianceResponse = {
      approved: true,
      complianceId: 'comp-123',
      violations: [],
    };

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockComplianceResponse),
    });

    const { result } = renderHook(() =>
      useBatchCreation({
        enableCompliance: true,
        complianceDebounceMs: 1000,
      })
    );

    // Update product to trigger compliance validation
    act(() => {
      result.current.updateProduct(0, 'name', 'Valid Product');
      result.current.updateProduct(0, 'quantity.amount', 100);
      result.current.updateProduct(0, 'origin.address', 'Test Address');
      result.current.updateProduct(0, 'origin.city', 'Lagos');
    });

    // Should be in validating state
    expect(result.current.formState.productValidations[0].complianceStatus).toBe('pending');

    // Fast-forward time to trigger debounced validation
    act(() => {
      vi.advanceTimersByTime(1100);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/compliance/validate-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('producer_initial_creation'),
      });
    });

    vi.useRealTimers();
  });

  it('should handle compliance validation errors gracefully', async () => {
    vi.useFakeTimers();
    
    (fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() =>
      useBatchCreation({
        enableCompliance: true,
        complianceDebounceMs: 100,
      })
    );

    act(() => {
      result.current.updateProduct(0, 'name', 'Test Product');
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(result.current.formState.productValidations[0].complianceStatus).toBe('error');
      expect(result.current.formState.productValidations[0].complianceMessages).toContain(
        'Failed to validate with Compliance Engine'
      );
    });

    vi.useRealTimers();
  });

  it('should track performance metrics during submission', async () => {
    const mockResponse: BatchCreationResponse = {
      success: true,
      batchId: 'BATCH-123',
      products: [],
      processingTime: 5000,
    };

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { result } = renderHook(() => useBatchCreation({
      cooperativeId: '123e4567-e89b-12d3-a456-426614174000',
      createdBy: '0.0.12345',
    }));

    await act(async () => {
      await result.current.submitBatch();
    });

    expect(result.current.metrics).toBeDefined();
    expect(result.current.metrics!.startTime).toBeInstanceOf(Date);
    expect(result.current.metrics!.endTime).toBeInstanceOf(Date);
    expect(result.current.metrics!.totalTime).toBeGreaterThan(0);
  });
});