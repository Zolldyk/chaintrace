/**
 * Zod validation schemas for product data models
 *
 * @since 1.4.0
 */

import { z } from 'zod';

/**
 * Product ID format validation (CT-YYYY-XXX-ABCDEF)
 */
export const ProductIdSchema = z
  .string()
  .regex(
    /^CT-\d{4}-\d{3}-[A-F0-9]{6}$/,
    'Product ID must follow format: CT-YYYY-XXX-ABCDEF'
  );

/**
 * Hedera account ID validation (0.0.XXXXX)
 */
export const HederaAccountIdSchema = z
  .string()
  .regex(/^0\.0\.\d+$/, 'Hedera account ID must follow format: 0.0.XXXXX');

/**
 * Location validation schema
 */
export const LocationSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  country: z.literal('Nigeria'),
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  region: z.string().min(1, 'Region is required'),
});

/**
 * Actor validation schema
 */
export const ActorSchema = z.object({
  walletAddress: HederaAccountIdSchema,
  role: z.enum([
    'producer',
    'processor',
    'distributor',
    'verifier',
    'regulator',
  ]),
  name: z.string().min(1, 'Actor name is required'),
  contactInfo: z
    .object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
    })
    .optional(),
});

/**
 * Product event validation schema
 */
export const ProductEventSchema = z.object({
  id: z.string().uuid(),
  productId: ProductIdSchema,
  eventType: z.enum([
    'created',
    'processed',
    'quality_check',
    'transported',
    'verified',
    'rejected',
  ]),
  actor: ActorSchema,
  timestamp: z.date(),
  location: LocationSchema,
  data: z.record(z.any()),
  hcsMessageId: z.string().min(1),
  signature: z.string().min(1),
});

/**
 * Product validation schema
 */
export const ProductSchema = z.object({
  id: ProductIdSchema,
  batchId: z.string().min(1, 'Batch ID is required'),
  name: z.string().min(1, 'Product name is required'),
  category: z.enum(['agricultural', 'processed_food', 'manufactured', 'other']),
  status: z.enum(['created', 'processing', 'verified', 'rejected', 'expired']),
  origin: LocationSchema,
  quantity: z.object({
    amount: z.number().positive('Quantity amount must be positive'),
    unit: z.enum(['kg', 'tons', 'pieces', 'liters', 'boxes']),
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
  qrCode: z.string().min(1, 'QR code is required'),
  guardianCredentialId: z.string().nullable(),
  hcsTopicId: z.string().regex(/^0\.0\.\d+$/, 'Invalid HCS topic ID format'),
  metadata: z.record(z.any()).optional(),
});

/**
 * Cooperative validation schema
 */
export const CooperativeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Cooperative name is required'),
  registration: z.object({
    number: z.string().min(1, 'Registration number is required'),
    authority: z.string().min(1, 'Registration authority is required'),
    date: z.date(),
  }),
  contactInfo: z.object({
    email: z.string().email(),
    phone: z.string().min(1),
    address: LocationSchema,
  }),
  producerIds: z.array(z.string().uuid()),
  status: z.enum(['active', 'inactive', 'suspended']),
});

/**
 * Token reward validation schema
 */
export const TokenRewardSchema = z.object({
  id: z.string().uuid(),
  productId: ProductIdSchema,
  recipientAddress: HederaAccountIdSchema,
  amount: z.string().regex(/^\d+$/, 'Amount must be a valid number string'),
  tokenId: z.string().regex(/^0\.0\.\d+$/, 'Invalid HTS token ID format'),
  rewardType: z.enum([
    'verification',
    'quality',
    'sustainability',
    'compliance',
  ]),
  distributedAt: z.date(),
  transactionId: z.string().min(1, 'Transaction ID is required'),
  status: z.enum(['pending', 'distributed', 'failed']),
});

/**
 * HCS Message validation schema
 */
export const HCSMessageSchema = z.object({
  version: z.literal('1.0'),
  messageType: z.enum([
    'product_event',
    'compliance_check',
    'reward_distribution',
  ]),
  productId: ProductIdSchema,
  event: ProductEventSchema,
  signature: z.string().min(1, 'Signature is required'),
  timestamp: z.string().datetime(),
  metadata: z.object({
    networkType: z.enum(['testnet', 'mainnet']),
    topicId: z.string().regex(/^0\.0\.\d+$/, 'Invalid topic ID format'),
    sequenceNumber: z.number().int().positive(),
  }),
});
