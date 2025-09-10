/**
 * Unit tests for product validation utilities and schemas
 * 
 * Tests comprehensive validation logic for batch creation forms,
 * including field validation, batch validation, and compliance requirements.
 *
 * @since 1.0.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  FormValidationUtils,
  CreateProductBatchSchema,
  CreateProductRequestSchema,
  ProcessingDetailsSchema,
  NigerianStatesSchema,
} from '@/lib/validation/product';
import type { CreateProductBatch, CreateProductRequest } from '@/types/batch';

describe('FormValidationUtils', () => {
  describe('validateProductField', () => {
    it('should validate product name correctly', () => {
      // Valid name
      expect(FormValidationUtils.validateProductField('name', 'Organic Tomatoes', 0))
        .toEqual({ isValid: true });

      // Empty name
      expect(FormValidationUtils.validateProductField('name', '', 0))
        .toEqual({ isValid: false, error: 'Product name is required' });

      // Too long name
      const longName = 'x'.repeat(101);
      expect(FormValidationUtils.validateProductField('name', longName, 0))
        .toEqual({ isValid: false, error: 'Product name must be less than 100 characters' });
    });

    it('should validate quantity amounts correctly', () => {
      // Valid quantity
      expect(FormValidationUtils.validateProductField('quantity.amount', 100, 0))
        .toEqual({ isValid: true });

      // Zero quantity
      expect(FormValidationUtils.validateProductField('quantity.amount', 0, 0))
        .toEqual({ isValid: false, error: 'Quantity must be a positive number' });

      // Negative quantity
      expect(FormValidationUtils.validateProductField('quantity.amount', -10, 0))
        .toEqual({ isValid: false, error: 'Quantity must be a positive number' });

      // Too large quantity
      expect(FormValidationUtils.validateProductField('quantity.amount', 10001, 0))
        .toEqual({ isValid: false, error: 'Quantity cannot exceed 10,000 units' });
    });

    it('should validate coordinates correctly', () => {
      // Valid latitude
      expect(FormValidationUtils.validateProductField('origin.coordinates.latitude', 6.5244, 0))
        .toEqual({ isValid: true });

      // Invalid latitude (too high)
      expect(FormValidationUtils.validateProductField('origin.coordinates.latitude', 91, 0))
        .toEqual({ isValid: false, error: 'Latitude must be between -90 and 90' });

      // Valid longitude
      expect(FormValidationUtils.validateProductField('origin.coordinates.longitude', 3.3792, 0))
        .toEqual({ isValid: true });

      // Invalid longitude (too low)
      expect(FormValidationUtils.validateProductField('origin.coordinates.longitude', -181, 0))
        .toEqual({ isValid: false, error: 'Longitude must be between -180 and 180' });
    });
  });

  describe('validateProductBatch', () => {
    let validBatch: CreateProductBatch;

    beforeEach(() => {
      validBatch = {
        products: [
          {
            name: 'Organic Tomatoes',
            category: 'agricultural',
            quantity: { amount: 100, unit: 'kg' },
            origin: {
              address: '123 Farm Road',
              city: 'Lagos',
              state: 'Lagos',
              country: 'Nigeria',
              coordinates: { latitude: 6.5244, longitude: 3.3792 },
              region: 'South West',
            },
            processingDetails: {
              harvestDate: '2024-01-01',
              organicCertified: true,
            },
          },
        ],
        batchInfo: {
          cooperativeId: '123e4567-e89b-12d3-a456-426614174000',
          createdBy: '0.0.12345',
          processingNotes: 'First batch of the season',
        },
      };
    });

    it('should validate a correct batch', () => {
      const result = FormValidationUtils.validateProductBatch(validBatch);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.productErrors).toEqual([]);
    });

    it('should reject batch with no products', () => {
      validBatch.products = [];
      const result = FormValidationUtils.validateProductBatch(validBatch);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one product is required');
    });

    it('should reject batch exceeding product limit', () => {
      validBatch.products = new Array(101).fill(validBatch.products[0]);
      const result = FormValidationUtils.validateProductBatch(validBatch);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Batch cannot contain more than 100 products');
    });

    it('should reject batch exceeding weight limit', () => {
      // Create products that total more than 1000kg
      validBatch.products = [
        {
          ...validBatch.products[0],
          quantity: { amount: 600, unit: 'kg' },
        },
        {
          ...validBatch.products[0],
          quantity: { amount: 500, unit: 'kg' },
        },
      ];
      
      const result = FormValidationUtils.validateProductBatch(validBatch);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Total batch weight cannot exceed 1000kg (daily production limit)');
    });

    it('should handle invalid cooperative ID', () => {
      validBatch.batchInfo.cooperativeId = 'invalid-uuid';
      const result = FormValidationUtils.validateProductBatch(validBatch);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid cooperative ID format'))).toBe(true);
    });

    it('should handle invalid wallet address', () => {
      validBatch.batchInfo.createdBy = 'invalid-address';
      const result = FormValidationUtils.validateProductBatch(validBatch);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Hedera account ID must follow format'))).toBe(true);
    });

    it('should validate product-specific errors', () => {
      validBatch.products[0].name = ''; // Invalid name
      const result = FormValidationUtils.validateProductBatch(validBatch);
      expect(result.isValid).toBe(false);
      expect(result.productErrors[0]).toBeDefined();
      expect(result.productErrors[0].name).toBeDefined();
    });
  });

  describe('isValidNigerianState', () => {
    it('should validate correct Nigerian states', () => {
      expect(FormValidationUtils.isValidNigerianState('Lagos')).toBe(true);
      expect(FormValidationUtils.isValidNigerianState('Abuja')).toBe(false); // Should be FCT
      expect(FormValidationUtils.isValidNigerianState('FCT')).toBe(true);
      expect(FormValidationUtils.isValidNigerianState('California')).toBe(false);
    });
  });

  describe('getNigerianStates', () => {
    it('should return all Nigerian states', () => {
      const states = FormValidationUtils.getNigerianStates();
      expect(states).toContain('Lagos');
      expect(states).toContain('FCT');
      expect(states).toContain('Kano');
      expect(states.length).toBe(37); // 36 states + FCT
    });
  });

  describe('getRegions', () => {
    it('should return all Nigerian regions', () => {
      const regions = FormValidationUtils.getRegions();
      expect(regions).toContain('South West');
      expect(regions).toContain('North Central');
      expect(regions.length).toBe(6);
    });
  });
});

describe('Zod Schemas', () => {
  describe('ProcessingDetailsSchema', () => {
    it('should accept valid processing details', () => {
      const validDetails = {
        harvestDate: '2024-01-01',
        processingMethod: 'organic',
        qualityGrade: 'A',
        organicCertified: true,
      };
      
      expect(() => ProcessingDetailsSchema.parse(validDetails)).not.toThrow();
    });

    it('should reject invalid quality grades', () => {
      const invalidDetails = {
        qualityGrade: 'Z', // Invalid grade
      };
      
      expect(() => ProcessingDetailsSchema.parse(invalidDetails)).toThrow();
    });

    it('should reject overly long batch notes', () => {
      const invalidDetails = {
        batchNotes: 'x'.repeat(501), // Too long
      };
      
      expect(() => ProcessingDetailsSchema.parse(invalidDetails)).toThrow();
    });
  });
});