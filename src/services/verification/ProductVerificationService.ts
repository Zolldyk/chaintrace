/**
 * Product Verification Service for client-side API integration.
 *
 * Service for interacting with product verification API endpoints
 * with error handling, retry logic, and caching.
 *
 * @example
 * ```typescript
 * const verificationService = new ProductVerificationService();
 *
 * try {
 *   const result = await verificationService.verifyProduct('PROD-2024-001');
 *   console.log('Product status:', result.product.status);
 * } catch (error) {
 *   if (error instanceof ProductVerificationApiError) {
 *     console.error('Verification failed:', error.code, error.message);
 *   }
 * }
 * ```
 *
 * @since 1.0.0
 */

import {
  ProductVerificationRequest,
  ProductVerificationResponse,
  ProductVerificationError,
  ProductLookupError,
} from '@/types';
import { logger } from '@/lib/logger';

/**
 * Configuration for the verification service
 */
export interface ProductVerificationServiceConfig {
  /** Base URL for API endpoints */
  baseUrl?: string;

  /** Default timeout in milliseconds */
  timeout?: number;

  /** Maximum number of retries for failed requests */
  maxRetries?: number;

  /** Retry delay in milliseconds */
  retryDelay?: number;

  /** Enable debug logging */
  debug?: boolean;
}

/**
 * API error class for product verification errors
 */
export class ProductVerificationApiError extends Error {
  constructor(
    public code: ProductLookupError,
    message: string,
    public statusCode: number,
    public details?: Record<string, any>,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ProductVerificationApiError';
  }

  /**
   * Creates error from API response
   */
  static fromApiResponse(
    response: ProductVerificationError,
    statusCode: number
  ): ProductVerificationApiError {
    return new ProductVerificationApiError(
      response.code,
      response.message,
      statusCode,
      response.details,
      response.retryable
    );
  }
}

/**
 * Product Verification Service implementation
 */
export class ProductVerificationService {
  private config: Required<ProductVerificationServiceConfig>;
  private abortController: AbortController | null = null;

  /**
   * Creates a new ProductVerificationService instance
   *
   * @param config - Service configuration options
   */
  constructor(config: ProductVerificationServiceConfig = {}) {
    this.config = {
      baseUrl:
        config.baseUrl ||
        (typeof window !== 'undefined' ? window.location.origin : ''),
      timeout: config.timeout || 30000, // 30 seconds
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      debug: config.debug || false,
    };
  }

  /**
   * Verifies a product by ID
   *
   * @param productId - Product ID to verify
   * @param options - Additional request options
   * @returns Promise resolving to product verification response
   * @throws {ProductVerificationApiError} When verification fails
   *
   * @example
   * ```typescript
   * const result = await verificationService.verifyProduct('PROD-2024-001', {
   *   skipCache: true,
   *   timeout: 15000
   * });
   *
   * if (result.product.verified) {
   *   console.log('Product is verified!');
   * }
   * ```
   */
  async verifyProduct(
    productId: string,
    options: Partial<ProductVerificationRequest> = {}
  ): Promise<ProductVerificationResponse> {
    const startTime = Date.now();

    try {
      this.log('Verifying product', { productId, options });

      // Validate product ID client-side
      if (!this.validateProductId(productId)) {
        throw new ProductVerificationApiError(
          'INVALID_PRODUCT_ID',
          'Invalid product ID format',
          400,
          { productId },
          false
        );
      }

      // Build request URL with query parameters
      const url = this.buildVerificationUrl(productId, options);

      // Create new abort controller for this request
      this.abortController = new AbortController();

      const response = await this.makeRequest(url, {
        signal: this.abortController.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle error response
        const errorData = data as ProductVerificationError;
        throw ProductVerificationApiError.fromApiResponse(
          errorData,
          response.status
        );
      }

      const verificationResponse = data as ProductVerificationResponse;

      this.log('Product verification successful', {
        productId,
        responseTime: Date.now() - startTime,
        fromCache: verificationResponse.metadata.fromCache,
        status: verificationResponse.product.status,
      });

      return verificationResponse;
    } catch (error) {
      this.log('Product verification failed', {
        productId,
        error: error instanceof Error ? error.message : String(error),
        responseTime: Date.now() - startTime,
      });

      // Re-throw our custom errors
      if (error instanceof ProductVerificationApiError) {
        throw error;
      }

      // Handle fetch/network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new ProductVerificationApiError(
          'NETWORK_ERROR',
          'Network error occurred. Please check your internet connection and try again.',
          0,
          { originalError: error.message },
          true
        );
      }

      // Handle abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ProductVerificationApiError(
          'MIRROR_NODE_TIMEOUT',
          'Request was cancelled or timed out.',
          408,
          { timeout: this.config.timeout },
          true
        );
      }

      // Handle generic errors
      throw new ProductVerificationApiError(
        'UNKNOWN_ERROR',
        'An unexpected error occurred during verification.',
        500,
        {
          originalError: error instanceof Error ? error.message : String(error),
        },
        true
      );
    }
  }

  /**
   * Verifies a product with retry logic
   *
   * @param productId - Product ID to verify
   * @param options - Request options
   * @returns Promise resolving to product verification response
   * @throws {ProductVerificationApiError} When all retries are exhausted
   */
  async verifyProductWithRetry(
    productId: string,
    options: Partial<ProductVerificationRequest> = {}
  ): Promise<ProductVerificationResponse> {
    let lastError: ProductVerificationApiError | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await this.verifyProduct(productId, options);
      } catch (error) {
        if (!(error instanceof ProductVerificationApiError)) {
          throw error;
        }

        lastError = error;

        // Don't retry non-retryable errors
        if (!error.retryable || attempt === this.config.maxRetries) {
          throw error;
        }

        // Wait before retrying with exponential backoff
        const delay = this.config.retryDelay * Math.pow(2, attempt);
        await this.sleep(delay);

        this.log('Retrying product verification', {
          productId,
          attempt: attempt + 1,
          maxRetries: this.config.maxRetries,
          delay,
        });
      }
    }

    throw lastError!;
  }

  /**
   * Cancels any ongoing verification request
   */
  cancelRequest(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Builds verification URL with query parameters
   */
  private buildVerificationUrl(
    productId: string,
    options: Partial<ProductVerificationRequest>
  ): string {
    const url = new URL(
      `/api/products/${encodeURIComponent(productId)}/verify`,
      this.config.baseUrl
    );

    if (options.skipCache) {
      url.searchParams.set('skipCache', 'true');
    }

    if (options.timeout) {
      url.searchParams.set('timeout', options.timeout.toString());
    }

    return url.toString();
  }

  /**
   * Makes HTTP request with timeout
   */
  private async makeRequest(
    url: string,
    init: RequestInit = {}
  ): Promise<Response> {
    const timeoutId = setTimeout(() => {
      if (this.abortController) {
        this.abortController.abort();
      }
    }, this.config.timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...init.headers,
        },
        ...init,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Validates product ID format client-side
   */
  private validateProductId(productId: string): boolean {
    if (!productId || typeof productId !== 'string') {
      return false;
    }

    const trimmed = productId.trim();
    if (trimmed.length < 3 || trimmed.length > 50) {
      return false;
    }

    // Allow alphanumeric characters, hyphens, and underscores
    const productIdRegex = /^[A-Z0-9][A-Z0-9\-_]{2,}$/i;
    return productIdRegex.test(trimmed);
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Internal logging method
   */
  private log(message: string, data?: any): void {
    if (this.config.debug) {
      logger.debug(message, {
        component: 'ProductVerificationService',
        ...data,
      });
    } else {
      logger.info(message, {
        component: 'ProductVerificationService',
        ...data,
      });
    }
  }

  /**
   * Gets current service configuration
   */
  getConfig(): Required<ProductVerificationServiceConfig> {
    return { ...this.config };
  }

  /**
   * Updates service configuration
   */
  updateConfig(config: Partial<ProductVerificationServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Singleton instance for global access
 */
let verificationServiceInstance: ProductVerificationService | null = null;

/**
 * Gets or creates the singleton ProductVerificationService instance
 *
 * @param config - Optional configuration for new instance
 * @returns The singleton ProductVerificationService instance
 *
 * @example
 * ```typescript
 * const verificationService = getProductVerificationService();
 * const result = await verificationService.verifyProduct('PROD-2024-001');
 * ```
 */
export function getProductVerificationService(
  config?: ProductVerificationServiceConfig
): ProductVerificationService {
  if (!verificationServiceInstance) {
    verificationServiceInstance = new ProductVerificationService(config);
  }
  return verificationServiceInstance;
}

/**
 * Resets the singleton instance (primarily for testing)
 */
export function resetProductVerificationService(): void {
  if (verificationServiceInstance) {
    verificationServiceInstance.cancelRequest();
    verificationServiceInstance = null;
  }
}
