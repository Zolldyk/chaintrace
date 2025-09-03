/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ChainTraceError,
  NetworkError,
  AuthenticationError,
  ValidationError,
  RateLimitError,
  TimeoutError,
  HederaError,
  WalletError,
  calculateBackoffDelay,
  withRetry,
  handleError,
  createUserFriendlyMessage,
} from '../../../src/lib/errors';

// Mock console methods
const consoleSpy = {
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
  debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
};

describe('ChainTrace Error Classes', () => {
  afterEach(() => {
    Object.values(consoleSpy).forEach(spy => spy.mockClear());
  });

  describe('ChainTraceError', () => {
    it('should create error with required properties', () => {
      const error = new ChainTraceError('Test message', 'TEST_CODE');

      expect(error.name).toBe('ChainTraceError');
      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(500);
      expect(error.retryable).toBe(false);
      expect(error.timestamp).toBeDefined();
    });

    it('should create error with custom options', () => {
      const cause = new Error('Original error');
      const error = new ChainTraceError('Test message', 'TEST_CODE', {
        statusCode: 400,
        retryable: true,
        context: 'test_context',
        cause,
      });

      expect(error.statusCode).toBe(400);
      expect(error.retryable).toBe(true);
      expect(error.context).toBe('test_context');
      expect(error.cause).toBe(cause);
    });
  });

  describe('NetworkError', () => {
    it('should create network error with default properties', () => {
      const error = new NetworkError('Connection failed');

      expect(error.name).toBe('NetworkError');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.statusCode).toBe(503);
      expect(error.retryable).toBe(true);
      expect(error.context).toBe('network_connectivity');
    });

    it('should create network error with service details', () => {
      const error = new NetworkError('Mirror Node unavailable', {
        service: 'mirror-node',
        endpoint: 'https://testnet.mirrornode.hedera.com',
      });

      expect(error.service).toBe('mirror-node');
      expect(error.endpoint).toBe('https://testnet.mirrornode.hedera.com');
    });
  });

  describe('AuthenticationError', () => {
    it('should create authentication error', () => {
      const error = new AuthenticationError('Invalid signature', {
        walletAddress: '0.0.12345',
        requiredRole: 'verifier',
      });

      expect(error.name).toBe('AuthenticationError');
      expect(error.code).toBe('AUTHENTICATION_ERROR');
      expect(error.statusCode).toBe(401);
      expect(error.retryable).toBe(false);
      expect(error.walletAddress).toBe('0.0.12345');
      expect(error.requiredRole).toBe('verifier');
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with field details', () => {
      const error = new ValidationError('Invalid product ID', {
        field: 'productId',
        value: 'invalid-id',
        expectedFormat: 'CT-YYYY-NNN-XXXXXX',
      });

      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.retryable).toBe(false);
      expect(error.field).toBe('productId');
      expect(error.value).toBe('invalid-id');
      expect(error.expectedFormat).toBe('CT-YYYY-NNN-XXXXXX');
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error with reset time', () => {
      const resetTime = new Date(Date.now() + 60000);
      const error = new RateLimitError('Too many requests', {
        service: 'mirror-node',
        limit: 100,
        resetTime,
      });

      expect(error.name).toBe('RateLimitError');
      expect(error.code).toBe('RATE_LIMIT_ERROR');
      expect(error.statusCode).toBe(429);
      expect(error.retryable).toBe(true);
      expect(error.service).toBe('mirror-node');
      expect(error.limit).toBe(100);
      expect(error.resetTime).toBe(resetTime);
    });
  });

  describe('TimeoutError', () => {
    it('should create timeout error with operation details', () => {
      const error = new TimeoutError('Operation timed out', {
        operation: 'submitMessage',
        timeoutMs: 30000,
        service: 'hcs',
      });

      expect(error.name).toBe('TimeoutError');
      expect(error.code).toBe('TIMEOUT_ERROR');
      expect(error.statusCode).toBe(504);
      expect(error.retryable).toBe(true);
      expect(error.operation).toBe('submitMessage');
      expect(error.timeoutMs).toBe(30000);
      expect(error.service).toBe('hcs');
    });
  });

  describe('HederaError', () => {
    it('should create Hedera error with blockchain details', () => {
      const error = new HederaError('Insufficient balance', {
        hederaStatus: 'INSUFFICIENT_PAYER_BALANCE',
        accountId: '0.0.12345',
        transactionId: '0.0.12345@1234567890.123456789',
        retryable: false,
      });

      expect(error.name).toBe('HederaError');
      expect(error.code).toBe('HEDERA_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.retryable).toBe(false);
      expect(error.hederaStatus).toBe('INSUFFICIENT_PAYER_BALANCE');
      expect(error.accountId).toBe('0.0.12345');
      expect(error.transactionId).toBe('0.0.12345@1234567890.123456789');
    });
  });

  describe('WalletError', () => {
    it('should create wallet error with user rejection', () => {
      const error = new WalletError('User rejected transaction', {
        walletType: 'metamask-snap',
        operation: 'sign_transaction',
        userRejected: true,
      });

      expect(error.name).toBe('WalletError');
      expect(error.code).toBe('WALLET_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.retryable).toBe(true);
      expect(error.walletType).toBe('metamask-snap');
      expect(error.operation).toBe('sign_transaction');
      expect(error.userRejected).toBe(true);
    });

    it('should create wallet error without user rejection', () => {
      const error = new WalletError('Wallet connection failed', {
        walletType: 'hashpack',
        operation: 'connect',
        userRejected: false,
      });

      expect(error.statusCode).toBe(500);
      expect(error.retryable).toBe(true);
      expect(error.userRejected).toBe(false);
    });
  });
});

describe('Error Utility Functions', () => {
  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.values(consoleSpy).forEach(spy => spy.mockClear());
  });

  describe('calculateBackoffDelay', () => {
    it('should calculate exponential backoff with jitter', () => {
      const delay0 = calculateBackoffDelay(0, 1000, 30000);
      const delay1 = calculateBackoffDelay(1, 1000, 30000);
      const delay2 = calculateBackoffDelay(2, 1000, 30000);

      expect(delay0).toBeGreaterThanOrEqual(1000);
      expect(delay0).toBeLessThanOrEqual(1100); // Base + 10% jitter

      expect(delay1).toBeGreaterThanOrEqual(2000);
      expect(delay1).toBeLessThanOrEqual(2200); // 2x base + 10% jitter

      expect(delay2).toBeGreaterThanOrEqual(4000);
      expect(delay2).toBeLessThanOrEqual(4400); // 4x base + 10% jitter
    });

    it('should cap delay at maximum', () => {
      const delay = calculateBackoffDelay(10, 1000, 5000);
      expect(delay).toBeLessThanOrEqual(5000);
    });

    it('should use default values when not provided', () => {
      const delay = calculateBackoffDelay(1);
      expect(delay).toBeGreaterThanOrEqual(2000);
      expect(delay).toBeLessThanOrEqual(2200);
    });
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await withRetry(operation, { maxRetries: 3 });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry retryable errors', async () => {
      const networkError = new NetworkError('Connection failed');
      const operation = vi
        .fn()
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue('success');

      // Use runAllTimersAsync to handle the setTimeout calls in withRetry
      const resultPromise = withRetry(operation, {
        maxRetries: 3,
        baseDelayMs: 100,
      });

      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry non-retryable errors', async () => {
      const validationError = new ValidationError('Invalid input');
      const operation = vi.fn().mockRejectedValue(validationError);

      await expect(withRetry(operation, { maxRetries: 3 })).rejects.toThrow(
        'Invalid input'
      );

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should throw after max retries', async () => {
      const networkError = new NetworkError('Connection failed');
      const operation = vi.fn().mockRejectedValue(networkError);

      const retryPromise = withRetry(operation, {
        maxRetries: 2,
        baseDelayMs: 100,
      });

      await vi.runAllTimersAsync();

      await expect(retryPromise).rejects.toThrow('Connection failed');
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should apply delays between retries', async () => {
      const networkError = new NetworkError('Connection failed');
      const operation = vi
        .fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue('success');

      const promise = withRetry(operation, {
        maxRetries: 2,
        baseDelayMs: 1000,
      });

      // Run all timers to complete retries
      await vi.runAllTimersAsync();

      const result = await promise;
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should log retry attempts when enabled', async () => {
      const networkError = new NetworkError('Connection failed');
      const operation = vi
        .fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue('success');

      const retryPromise = withRetry(operation, {
        maxRetries: 2,
        baseDelayMs: 100,
        enableLogging: true,
      });

      await vi.runAllTimersAsync();
      await retryPromise;

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('Operation attempt 1 failed:'),
        expect.objectContaining({
          error: 'Connection failed',
          code: 'NETWORK_ERROR',
          retryable: true,
          willRetry: true,
        })
      );
    });
  });

  describe('handleError', () => {
    it('should handle ChainTraceError', () => {
      const error = new NetworkError('Connection failed');
      const result = handleError(error, { operation: 'test' });

      expect(result.error).toBe('Connection failed');
      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.statusCode).toBe(503);
      expect(result.retryable).toBe(true);
      expect(result.timestamp).toBeDefined();
      expect(result.context).toBe('network_connectivity');
    });

    it('should categorize generic errors', () => {
      const error = new Error('ECONNREFUSED: Connection refused');
      const result = handleError(error);

      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.retryable).toBe(true);
      expect(result.statusCode).toBe(503);
    });

    it('should handle unknown error types', () => {
      const result = handleError('unknown error type');

      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.retryable).toBe(false);
      expect(result.statusCode).toBe(500);
    });

    it('should sanitize sensitive information', () => {
      const error = new Error(
        'Connection failed to 192.168.1.1 with password=secret123'
      );
      const result = handleError(error);

      expect(result.error).toContain('[IP_ADDRESS]');
      expect(result.error).toContain('password=[REDACTED]');
      expect(result.error).not.toContain('192.168.1.1');
      expect(result.error).not.toContain('secret123');
    });

    it('should log error details', () => {
      const error = new NetworkError('Connection failed');
      handleError(error, { userId: '123' });

      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Error handled:',
        expect.objectContaining({
          message: 'Connection failed',
          code: 'NETWORK_ERROR',
          statusCode: 503,
          retryable: true,
          context: expect.objectContaining({
            userId: '123',
            errorContext: 'network_connectivity',
          }),
        })
      );
    });
  });

  describe('createUserFriendlyMessage', () => {
    it('should create user-friendly message for network error', () => {
      const error = new NetworkError('Connection failed');
      const message = createUserFriendlyMessage(error);

      expect(message.title).toBe('Connection Problem');
      expect(message.description).toContain('blockchain network');
      expect(message.resolution).toContain('internet connection');
      expect(message.retryable).toBe(true);
    });

    it('should create user-friendly message for authentication error', () => {
      const error = new AuthenticationError('Invalid signature');
      const message = createUserFriendlyMessage(error);

      expect(message.title).toBe('Authentication Required');
      expect(message.description).toContain('wallet connection');
      expect(message.resolution).toContain('reconnect your wallet');
      expect(message.retryable).toBe(false);
    });

    it('should create user-friendly message for validation error', () => {
      const error = new ValidationError('Invalid format');
      const message = createUserFriendlyMessage(error);

      expect(message.title).toBe('Invalid Input');
      expect(message.description).toContain('correct format');
      expect(message.resolution).toContain('check your input');
      expect(message.retryable).toBe(false);
    });

    it('should create user-friendly message for rate limit error with reset time', () => {
      const resetTime = new Date(Date.now() + 60000);
      const error = new RateLimitError('Too many requests', { resetTime });
      const message = createUserFriendlyMessage(error);

      expect(message.title).toBe('Too Many Requests');
      expect(message.description).toContain('too many requests');
      expect(message.resolution).toContain(resetTime.toLocaleTimeString());
      expect(message.retryable).toBe(true);
    });

    it('should create user-friendly message for timeout error', () => {
      const error = new TimeoutError('Request timed out');
      const message = createUserFriendlyMessage(error);

      expect(message.title).toBe('Request Timeout');
      expect(message.description).toContain('longer than expected');
      expect(message.resolution).toContain('high traffic');
      expect(message.retryable).toBe(true);
    });

    it('should create user-friendly message for Hedera error', () => {
      const error = new HederaError('Insufficient balance', {
        retryable: false,
      });
      const message = createUserFriendlyMessage(error);

      expect(message.title).toBe('Blockchain Error');
      expect(message.description).toContain('Hedera network');
      expect(message.resolution).toContain('account balance');
      expect(message.retryable).toBe(false);
    });

    it('should create user-friendly message for wallet error with user rejection', () => {
      const error = new WalletError('User cancelled', { userRejected: true });
      const message = createUserFriendlyMessage(error);

      expect(message.title).toBe('Transaction Cancelled');
      expect(message.description).toContain('cancelled the transaction');
      expect(message.resolution).toContain('approve the transaction');
      expect(message.retryable).toBe(true);
    });

    it('should create user-friendly message for wallet error without user rejection', () => {
      const error = new WalletError('Connection failed', {
        userRejected: false,
      });
      const message = createUserFriendlyMessage(error);

      expect(message.title).toBe('Wallet Problem');
      expect(message.description).toContain('communicating with your wallet');
      expect(message.resolution).toContain('wallet is connected');
      expect(message.retryable).toBe(true);
    });

    it('should create user-friendly message for unknown error', () => {
      const error = new ChainTraceError('Unknown issue', 'UNKNOWN_ERROR');
      const message = createUserFriendlyMessage(error);

      expect(message.title).toBe('Unexpected Error');
      expect(message.description).toContain('unexpected error');
      expect(message.resolution).toContain('try again');
      expect(message.retryable).toBe(false);
    });
  });
});
