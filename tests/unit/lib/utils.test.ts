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
});
