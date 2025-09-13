/**
 * Validation schemas for compliance credential data
 *
 * @since 1.0.0
 */

import { z } from 'zod';

/**
 * Credential status validation schema
 */
export const CredentialStatusSchema = z.enum([
  'issued',
  'active',
  'expired',
  'revoked',
]);

/**
 * Credential type validation schema
 */
export const CredentialTypeSchema = z.enum([
  'supply_chain',
  'carbon_credit',
  'regulatory_compliance',
]);

/**
 * Verification level validation schema
 */
export const VerificationLevelSchema = z.enum(['basic', 'enhanced', 'premium']);

/**
 * Credential metadata validation schema
 */
export const CredentialMetadataSchema = z.object({
  validationDetails: z.record(z.any()),
  complianceRules: z.array(z.string()),
  verificationLevel: VerificationLevelSchema,
  policyId: z.string().optional(),
  validatedAt: z.date(),
  validationScore: z.number().min(0).max(100).optional(),
});

/**
 * Core compliance credential validation schema
 */
export const ComplianceCredentialSchema = z.object({
  id: z.string().min(1, 'Credential ID is required'),
  productId: z.string().min(1, 'Product ID is required'),
  issuer: z.string().min(1, 'Issuer is required'),
  issuedAt: z.date(),
  expiresAt: z.date().nullable(),
  status: CredentialStatusSchema,
  credentialType: CredentialTypeSchema,
  metadata: CredentialMetadataSchema,
  signature: z.string().min(1, 'Signature is required'),
  hcsMessageId: z.string().min(1, 'HCS message ID is required'),
  transactionId: z.string().optional(),
});

/**
 * Credential issuance request validation schema
 */
export const CredentialIssuanceRequestSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  credentialType: CredentialTypeSchema,
  validationResults: z.record(z.any()),
  complianceRules: z
    .array(z.string())
    .min(1, 'At least one compliance rule is required'),
  verificationLevel: VerificationLevelSchema,
  policyId: z.string().optional(),
  expiresAt: z.date().optional(),
});

/**
 * Credential verification request validation schema
 */
export const CredentialVerificationRequestSchema = z.object({
  credentialId: z.string().min(1, 'Credential ID is required'),
  verifySignature: z.boolean().optional().default(true),
  verifyBlockchain: z.boolean().optional().default(false),
});

/**
 * Credential search parameters validation schema
 */
export const CredentialSearchParamsSchema = z.object({
  productId: z.string().optional(),
  credentialType: CredentialTypeSchema.optional(),
  status: CredentialStatusSchema.optional(),
  issuer: z.string().optional(),
  issuedAfter: z.date().optional(),
  issuedBefore: z.date().optional(),
  limit: z.number().min(1).max(100).default(10),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(['issuedAt', 'expiresAt', 'status']).default('issuedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Product ID validation for ChainTrace format
 */
export const ProductIdSchema = z
  .string()
  .regex(
    /^CT-\d{4}-\d{3}-[A-Z0-9]{6}$/,
    'Invalid product ID format. Expected: CT-YYYY-XXX-ABCDEF'
  );

/**
 * Credential ID validation schema
 */
export const CredentialIdSchema = z
  .string()
  .regex(
    /^CRED-\d{4}-\d{3}-[A-Z0-9]{6}$/,
    'Invalid credential ID format. Expected: CRED-YYYY-XXX-ABCDEF'
  );

/**
 * HCS message ID validation schema
 */
export const HCSMessageIdSchema = z
  .string()
  .regex(
    /^\d+\.\d+\.\d+-\d+$/,
    'Invalid HCS message ID format. Expected: 0.0.XXXXX-XXXXXXXXXX'
  );

/**
 * Utility function to validate credential data
 *
 * @param data - Data to validate
 * @param schema - Zod schema to use for validation
 * @returns Validation result with parsed data or errors
 */
export function validateCredentialData<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const parsed = schema.parse(data);
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(
        err => `${err.path.join('.')}: ${err.message}`
      );
      return { success: false, errors };
    }
    return { success: false, errors: ['Unknown validation error'] };
  }
}

/**
 * Utility function to validate product ID format
 *
 * @param productId - Product ID to validate
 * @returns Whether the product ID is valid
 */
export function isValidProductId(productId: string): boolean {
  return ProductIdSchema.safeParse(productId).success;
}

/**
 * Utility function to validate credential ID format
 *
 * @param credentialId - Credential ID to validate
 * @returns Whether the credential ID is valid
 */
export function isValidCredentialId(credentialId: string): boolean {
  return CredentialIdSchema.safeParse(credentialId).success;
}

/**
 * Utility function to generate a new credential ID
 *
 * @returns A new credential ID in the correct format
 */
export function generateCredentialId(): string {
  const year = new Date().getFullYear();
  const sequential = Math.floor(Math.random() * 999)
    .toString()
    .padStart(3, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `CRED-${year}-${sequential}-${random}`;
}

/**
 * Utility function to check if a credential is expired
 *
 * @param credential - Credential to check
 * @returns Whether the credential is expired
 */
export function isCredentialExpired(credential: {
  expiresAt: Date | null;
}): boolean {
  if (!credential.expiresAt) return false; // Never expires
  return new Date() > credential.expiresAt;
}

/**
 * Utility function to get days until credential expiration
 *
 * @param credential - Credential to check
 * @returns Days until expiration (negative if expired, null if never expires)
 */
export function getDaysUntilExpiration(credential: {
  expiresAt: Date | null;
}): number | null {
  if (!credential.expiresAt) return null;
  const now = new Date();
  const expiry = credential.expiresAt;
  const diffTime = expiry.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Utility function to get credential warning level based on expiration
 *
 * @param credential - Credential to check
 * @returns Warning level for UI display
 */
export function getCredentialWarningLevel(credential: {
  expiresAt: Date | null;
}): 'none' | 'info' | 'warning' | 'critical' {
  const daysUntilExpiration = getDaysUntilExpiration(credential);

  if (daysUntilExpiration === null) return 'none'; // Never expires
  if (daysUntilExpiration < 0) return 'critical'; // Expired
  if (daysUntilExpiration <= 7) return 'critical'; // Expires within a week
  if (daysUntilExpiration <= 30) return 'warning'; // Expires within a month
  if (daysUntilExpiration <= 90) return 'info'; // Expires within 3 months

  return 'none';
}
