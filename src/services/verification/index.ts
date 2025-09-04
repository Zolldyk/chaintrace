/**
 * Verification services export index
 *
 * @since 1.0.0
 */

export * from './ProductVerificationService';

// Re-export types from the types module for convenience
export type {
  ProductWithEvents,
  ProductVerificationResponse,
  ProductVerificationError,
  ProductLookupError,
  VerificationStatus,
} from '@/types';
