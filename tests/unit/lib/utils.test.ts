/**
 * Tests for utility functions.
 */

import { describe, expect, it } from 'vitest';
import {
  cn,
  formatDate,
  formatAccountId,
  truncateHash,
  capitalize,
  isValidAccountId,
  safeJsonParse,
  ProductIdGenerator,
  StatusMapper,
  ChainTraceError,
  createDataValidationError,
  sanitizeErrorForUser,
  formatTimestampAdvanced,
} from '@/lib/utils';

describe('utils', () => {
  describe('cn', () => {
    it('should combine class names', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
    });

    it('should handle conditional classes', () => {
      expect(cn('base', { active: true, disabled: false })).toBe('base active');
    });

    it('should merge Tailwind classes', () => {
      expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
    });
  });

  describe('formatDate', () => {
    it('should format timestamp correctly', () => {
      const timestamp = 1640995200000; // Jan 1, 2022
      const formatted = formatDate(timestamp);
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('2022');
    });

    it('should handle seconds timestamp', () => {
      const timestamp = 1640995200; // Jan 1, 2022 in seconds
      const formatted = formatDate(timestamp);
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('2022');
    });
  });

  describe('formatAccountId', () => {
    it('should format long account IDs', () => {
      expect(formatAccountId('0.0.123456789')).toBe('0.0.123...789');
    });

    it('should not format short account IDs', () => {
      expect(formatAccountId('0.0.12345')).toBe('0.0.12345');
    });

    it('should handle invalid format', () => {
      expect(formatAccountId('invalid')).toBe('invalid');
    });
  });

  describe('truncateHash', () => {
    it('should truncate long hashes', () => {
      const hash = '0x1234567890abcdef';
      expect(truncateHash(hash)).toBe('0x1234...cdef');
    });

    it('should not truncate short hashes', () => {
      const hash = '0x12345';
      expect(truncateHash(hash)).toBe('0x12345');
    });

    it('should respect custom lengths', () => {
      const hash = '0x1234567890abcdef';
      expect(truncateHash(hash, 4, 2)).toBe('0x12...ef');
    });
  });

  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(capitalize('hello world')).toBe('Hello world');
    });

    it('should handle empty string', () => {
      expect(capitalize('')).toBe('');
    });

    it('should handle single character', () => {
      expect(capitalize('a')).toBe('A');
    });
  });

  describe('isValidAccountId', () => {
    it('should validate correct account IDs', () => {
      expect(isValidAccountId('0.0.12345')).toBe(true);
      expect(isValidAccountId('0.0.1')).toBe(true);
      expect(isValidAccountId('0.0.123456789')).toBe(true);
    });

    it('should reject invalid account IDs', () => {
      expect(isValidAccountId('invalid')).toBe(false);
      expect(isValidAccountId('1.0.12345')).toBe(false);
      expect(isValidAccountId('0.1.12345')).toBe(false);
      expect(isValidAccountId('0.0.abc')).toBe(false);
    });
  });

  describe('safeJsonParse', () => {
    it('should parse valid JSON', () => {
      const result = safeJsonParse('{"key": "value"}', {});
      expect(result).toEqual({ key: 'value' });
    });

    it('should return fallback for invalid JSON', () => {
      const fallback = { default: true };
      const result = safeJsonParse('invalid json', fallback);
      expect(result).toEqual(fallback);
    });

    it('should handle null fallback', () => {
      const result = safeJsonParse('invalid json', null);
      expect(result).toBe(null);
    });
  });

  // ============================================================================
  // Tests for Story 1.4 Enhanced Utilities
  // ============================================================================

  describe('ProductIdGenerator', () => {
    it('should generate valid product ID format', () => {
      const id = ProductIdGenerator.generate();
      expect(id).toMatch(/^CT-\d{4}-\d{3}-[A-F0-9]{6}$/);
    });

    it('should generate unique sequential IDs', () => {
      const id1 = ProductIdGenerator.generate();
      const id2 = ProductIdGenerator.generate();
      expect(id1).not.toBe(id2);
    });

    it('should validate product ID format correctly', () => {
      expect(ProductIdGenerator.validateFormat('CT-2024-001-A3B7F2')).toBe(
        true
      );
      expect(ProductIdGenerator.validateFormat('CT-2024-001-A3B7F')).toBe(
        false
      );
      expect(ProductIdGenerator.validateFormat('XX-2024-001-A3B7F2')).toBe(
        false
      );
      expect(ProductIdGenerator.validateFormat('invalid')).toBe(false);
    });

    it('should parse valid product ID correctly', () => {
      const result = ProductIdGenerator.parse('CT-2024-123-ABC123');
      expect(result).toEqual({
        prefix: 'CT',
        year: 2024,
        sequence: 123,
        random: 'ABC123',
      });
    });

    it('should return null for invalid product ID', () => {
      const result = ProductIdGenerator.parse('invalid-id');
      expect(result).toBeNull();
    });
  });

  describe('StatusMapper', () => {
    it('should map Mirror Node status correctly', () => {
      expect(StatusMapper.mapMirrorNodeStatus('SUCCESS')).toBe('verified');
      expect(StatusMapper.mapMirrorNodeStatus('PENDING')).toBe('processing');
      expect(StatusMapper.mapMirrorNodeStatus('FAILED')).toBe('rejected');
      expect(StatusMapper.mapMirrorNodeStatus('CREATED')).toBe('created');
      expect(StatusMapper.mapMirrorNodeStatus('unknown')).toBe('created');
    });

    it('should map Compliance Engine status correctly', () => {
      expect(StatusMapper.mapComplianceEngineStatus('COMPLIANT')).toBe(
        'verified'
      );
      expect(StatusMapper.mapComplianceEngineStatus('NON_COMPLIANT')).toBe(
        'rejected'
      );
      expect(StatusMapper.mapComplianceEngineStatus('UNDER_REVIEW')).toBe(
        'processing'
      );
      expect(StatusMapper.mapComplianceEngineStatus('unknown')).toBe('created');
    });

    it('should return correct display names', () => {
      expect(StatusMapper.getStatusDisplayName('created')).toBe('Created');
      expect(StatusMapper.getStatusDisplayName('verified')).toBe('Verified');
      expect(StatusMapper.getStatusDisplayName('rejected')).toBe('Rejected');
    });

    it('should return ChainTrace semantic colors', () => {
      const colors = StatusMapper.getStatusSemanticColors('verified');
      expect(colors.bg).toBe('bg-success-50');
      expect(colors.border).toBe('border-success-200');
      expect(colors.text).toBe('text-success-700');
    });

    it('should return Heroicons (not emojis)', () => {
      expect(StatusMapper.getStatusIcon('verified')).toBe('CheckCircleIcon');
      expect(StatusMapper.getStatusIcon('processing')).toBe('ArrowPathIcon');
      expect(StatusMapper.getStatusIcon('rejected')).toBe('XCircleIcon');
    });
  });

  describe('ChainTraceError', () => {
    it('should create error with code and details', () => {
      const error = new ChainTraceError('Test message', 'TEST_CODE', {
        field: 'test',
      });

      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.details).toEqual({ field: 'test' });
      expect(error.name).toBe('ChainTraceError');
    });
  });

  describe('createDataValidationError', () => {
    it('should create validation error with field details', () => {
      const error = createDataValidationError(
        'email',
        'invalid-email',
        'Must be valid email'
      );

      expect(error.message).toContain('email');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details?.field).toBe('email');
    });
  });

  describe('sanitizeErrorForUser', () => {
    it('should sanitize validation errors', () => {
      const error = createDataValidationError(
        'email',
        'test',
        'Invalid format'
      );
      const sanitized = sanitizeErrorForUser(error);

      expect(sanitized.message).toBe(
        'The information provided is not valid. Please check your input and try again.'
      );
      expect(sanitized.code).toBe('VALIDATION_ERROR');
      expect(sanitized.supportCode).toMatch(/^ERR-[A-Z0-9]+$/);
    });

    it('should handle timeout errors', () => {
      const error = new Error('Request timeout occurred');
      const sanitized = sanitizeErrorForUser(error);

      expect(sanitized.code).toBe('TIMEOUT_ERROR');
    });
  });

  describe('formatTimestampAdvanced', () => {
    it('should handle string timestamps', () => {
      const result = formatTimestampAdvanced(
        '2024-09-05T10:30:00Z',
        'absolute'
      );
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
