/**
 * Sample Product Data for ChainTrace Demonstration
 *
 * Contains realistic sample products for demonstrating verification workflows:
 * - A "good" product with complete supply chain data that passes verification
 * - A "bad" product with issues that fails verification
 *
 * @since 1.0.0
 */

import type {
  CreateProductRequest,
  ProductFormValidation,
  BatchCreationResponse,
  HCSEventMessage,
} from '@/types';
import type { ProductWithEvents } from '@/types';

/**
 * Good Product - Complete supply chain with successful verification
 */
export const SAMPLE_GOOD_PRODUCT: CreateProductRequest = {
  name: 'Premium Organic Cocoa Beans',
  description:
    'High-quality organic cocoa beans from certified sustainable farms in Ogun State',
  category: 'agricultural',
  quantity: {
    amount: 50,
    unit: 'kg',
  },
  origin: {
    address: 'Abeokuta Organic Farm Cooperative',
    city: 'Abeokuta',
    state: 'Ogun State',
    country: 'Nigeria',
    coordinates: {
      latitude: 7.1475,
      longitude: 3.3619,
    },
    region: 'Southwest Nigeria',
  },
  qualityGrade: 'Premium',
  productionDate: new Date('2024-09-15'),
  expiryDate: new Date('2025-09-15'),
  certifications: ['Organic', 'Fair Trade'],
  metadata: {
    farmerId: 'FARM-001-ABEOKUTA',
    farmerName: 'Adebayo Cooperative',
    harvestSeason: 'Main Season 2024',
    processingMethod: 'Sun-dried',
    moistureContent: '7.5%',
    qualityScore: 95,
    certificationBodies: [
      'Nigeria Organic Agriculture Network',
      'Fair Trade Alliance',
    ],
    batchProcessingId: 'BATCH-2024-001-OG',
  },
};

/**
 * Bad Product - Incomplete/problematic supply chain that fails verification
 */
export const SAMPLE_BAD_PRODUCT: CreateProductRequest = {
  name: 'Unverified Palm Oil',
  description: 'Palm oil with questionable origin and processing',
  category: 'agricultural',
  quantity: {
    amount: 200,
    unit: 'liters',
  },
  origin: {
    address: 'Unknown Location',
    city: 'Unknown',
    state: 'Unknown State',
    country: 'Nigeria',
    coordinates: {
      latitude: 0,
      longitude: 0,
    },
    region: 'Unknown',
  },
  qualityGrade: 'Standard',
  productionDate: new Date('2024-08-01'),
  expiryDate: new Date('2024-12-01'), // Short shelf life - red flag
  certifications: [], // No certifications - red flag
  metadata: {
    farmerId: 'UNKNOWN',
    farmerName: 'Unknown Producer',
    harvestSeason: 'Unknown',
    processingMethod: 'Unknown',
    moistureContent: 'Not tested',
    qualityScore: 45, // Low quality score - red flag
    certificationBodies: [],
    batchProcessingId: 'BATCH-2024-002-UNVERIFIED',
  },
};

/**
 * Sample Product ID for the good product
 */
export const SAMPLE_GOOD_PRODUCT_ID = 'CT-2024-OGC-001234';

/**
 * Sample Product ID for the bad product
 */
export const SAMPLE_BAD_PRODUCT_ID = 'CT-2024-PAL-999999';

/**
 * Complete supply chain events for the good product
 */
export const SAMPLE_GOOD_PRODUCT_EVENTS: HCSEventMessage[] = [
  {
    version: '1.0',
    productId: SAMPLE_GOOD_PRODUCT_ID,
    eventType: 'planted',
    timestamp: '2024-03-15T08:00:00Z',
    actor: {
      walletAddress: '0.0.123456',
      role: 'Producer',
      organizationId: 'COOP-ABEOKUTA-001',
    },
    location: {
      coordinates: { latitude: 7.1475, longitude: 3.3619 },
      address: 'Abeokuta Organic Farm, Ogun State',
      region: 'Southwest Nigeria',
    },
    eventData: {
      seedVariety: 'Trinitario Cocoa',
      plantingDensity: '1000 trees/hectare',
      soilType: 'Fertile loamy soil',
      organicCertified: true,
    },
    signature: 'mock-signature-planted',
  },
  {
    version: '1.0',
    productId: SAMPLE_GOOD_PRODUCT_ID,
    eventType: 'harvested',
    timestamp: '2024-09-15T10:30:00Z',
    actor: {
      walletAddress: '0.0.123456',
      role: 'Producer',
      organizationId: 'COOP-ABEOKUTA-001',
    },
    location: {
      coordinates: { latitude: 7.1475, longitude: 3.3619 },
      address: 'Abeokuta Organic Farm, Ogun State',
      region: 'Southwest Nigeria',
    },
    eventData: {
      harvestWeight: '50kg',
      moistureContent: '8.2%',
      qualityGrade: 'Premium',
      weatherConditions: 'Optimal',
    },
    signature: 'mock-signature-harvested',
  },
  {
    version: '1.0',
    productId: SAMPLE_GOOD_PRODUCT_ID,
    eventType: 'processed',
    timestamp: '2024-09-16T14:15:00Z',
    actor: {
      walletAddress: '0.0.234567',
      role: 'Processor',
      organizationId: 'PROC-CENTER-001',
    },
    location: {
      coordinates: { latitude: 7.159, longitude: 3.354 },
      address: 'Abeokuta Processing Center, Ogun State',
      region: 'Southwest Nigeria',
    },
    eventData: {
      processingMethod: 'Sun-dried',
      finalMoisture: '7.5%',
      qualityScore: 95,
      batchId: 'PROC-2024-001',
    },
    signature: 'mock-signature-processed',
  },
  {
    version: '1.0',
    productId: SAMPLE_GOOD_PRODUCT_ID,
    eventType: 'quality_tested',
    timestamp: '2024-09-17T09:00:00Z',
    actor: {
      walletAddress: '0.0.345678',
      role: 'Verifier',
      organizationId: 'QA-LAB-LAGOS-001',
    },
    location: {
      coordinates: { latitude: 7.16, longitude: 3.35 },
      address: 'Lagos Quality Control Center, Lagos State',
      region: 'Southwest Nigeria',
    },
    eventData: {
      testResults: {
        aflatoxins: 'Below detection limit',
        heavyMetals: 'Within acceptable limits',
        pesticides: 'Organic - None detected',
        moisture: '7.5%',
      },
      certificationStatus: 'Passed',
      inspectorId: 'QA-001-LGS',
    },
    signature: 'mock-signature-quality-tested',
  },
  {
    version: '1.0',
    productId: SAMPLE_GOOD_PRODUCT_ID,
    eventType: 'verified',
    timestamp: '2024-09-18T16:30:00Z',
    actor: {
      walletAddress: '0.0.456789',
      role: 'Verifier',
      organizationId: 'CHAINTRACE-SYSTEM',
    },
    location: {
      coordinates: { latitude: 7.1475, longitude: 3.3619 },
      address: 'Digital Verification',
      region: 'Nigeria',
    },
    eventData: {
      verificationScore: 98,
      complianceStatus: 'Fully Compliant',
      certificates: ['Organic', 'Fair Trade'],
      traceabilityScore: 'Complete',
    },
    signature: 'mock-signature-verified',
  },
];

/**
 * Limited/problematic events for the bad product
 */
export const SAMPLE_BAD_PRODUCT_EVENTS: HCSEventMessage[] = [
  {
    version: '1.0',
    productId: SAMPLE_BAD_PRODUCT_ID,
    eventType: 'harvested',
    timestamp: '2024-08-01T12:00:00Z',
    actor: {
      walletAddress: '0.0.999999',
      role: 'Producer',
      organizationId: 'UNKNOWN',
    },
    location: {
      coordinates: { latitude: 0, longitude: 0 }, // Invalid coordinates
      address: 'Unknown Location',
      region: 'Unknown',
    },
    eventData: {
      harvestWeight: '200L',
      qualityGrade: 'Standard',
      // Missing critical data like moisture content, weather conditions
    },
    signature: 'mock-signature-bad-harvested',
  },
  {
    version: '1.0',
    productId: SAMPLE_BAD_PRODUCT_ID,
    eventType: 'quality_tested',
    timestamp: '2024-08-15T10:00:00Z',
    actor: {
      walletAddress: '0.0.888888',
      role: 'Verifier',
      organizationId: 'QUESTIONABLE-LAB',
    },
    location: {
      coordinates: { latitude: 6.5244, longitude: 3.3792 },
      address: 'Lagos, Nigeria',
      region: 'Southwest Nigeria',
    },
    eventData: {
      testResults: {
        aflatoxins: 'Elevated levels detected', // Red flag
        heavyMetals: 'Above recommended limits', // Red flag
        pesticides: 'Prohibited substances found', // Red flag
        moisture: 'Not tested',
      },
      certificationStatus: 'Failed',
      inspectorId: 'UNKNOWN',
    },
    signature: 'mock-signature-bad-quality-tested',
  },
  // Note: Missing many critical events like planting, processing, final verification
];

/**
 * Complete ProductWithEvents for good product verification
 */
export const SAMPLE_GOOD_PRODUCT_VERIFIED: ProductWithEvents = {
  id: SAMPLE_GOOD_PRODUCT_ID,
  productId: SAMPLE_GOOD_PRODUCT_ID,
  batchId: 'BATCH-2024-001-OG',
  name: 'Premium Organic Cocoa Beans',
  description:
    'High-quality organic cocoa beans from certified sustainable farms in Ogun State',
  category: 'agricultural',
  status: 'verified',
  origin: {
    address: 'Abeokuta Organic Farm Cooperative',
    city: 'Abeokuta',
    state: 'Ogun State',
    country: 'Nigeria',
    coordinates: {
      latitude: 7.1475,
      longitude: 3.3619,
    },
    region: 'Southwest Nigeria',
  },
  quantity: {
    amount: 50,
    unit: 'kg',
  },
  createdAt: new Date('2024-09-15T08:00:00Z'),
  updatedAt: new Date('2024-09-18T16:30:00Z'),
  qrCode: SAMPLE_GOOD_PRODUCT_ID,
  guardianCredentialId: 'CRED-OG-001-VERIFIED',
  hcsTopicId: '0.0.47586',
  metadata: {
    farmerId: 'FARM-001-ABEOKUTA',
    farmerName: 'Adebayo Cooperative',
    harvestSeason: 'Main Season 2024',
    processingMethod: 'Sun-dried',
    moistureContent: '7.5%',
    qualityScore: 95,
    certificationBodies: [
      'Nigeria Organic Agriculture Network',
      'Fair Trade Alliance',
    ],
    batchProcessingId: 'BATCH-2024-001-OG',
  },
  verified: true,
  events: SAMPLE_GOOD_PRODUCT_EVENTS.map((event, index) => ({
    id: `event-${index + 1}-${event.eventType}`,
    productId: event.productId,
    eventType: event.eventType,
    actor: {
      walletAddress: event.actor.walletAddress,
      role: event.actor.role as
        | 'producer'
        | 'processor'
        | 'distributor'
        | 'verifier'
        | 'regulator',
      name: event.actor.organizationId || 'Unknown Actor',
    },
    timestamp: new Date(event.timestamp),
    location: event.location || {
      coordinates: { latitude: 0, longitude: 0 },
      address: 'Location unavailable',
      city: 'Unknown',
      state: 'Unknown',
      country: 'Unknown',
      region: 'Unknown',
    },
    data: event.eventData,
    hcsMessageId: `hcs-msg-${index + 1}`,
    signature: event.signature,
  })),
  lastVerified: '2024-09-18T16:30:00Z',
  expiresAt: '2025-12-31T00:00:00Z',
};

/**
 * Complete ProductWithEvents for bad product verification
 */
export const SAMPLE_BAD_PRODUCT_UNVERIFIED: ProductWithEvents = {
  id: SAMPLE_BAD_PRODUCT_ID,
  productId: SAMPLE_BAD_PRODUCT_ID,
  batchId: 'BATCH-2024-002-UNVERIFIED',
  name: 'Unverified Palm Oil',
  description: 'Palm oil with questionable origin and processing',
  category: 'agricultural',
  status: 'rejected',
  origin: {
    address: 'Unknown Location',
    city: 'Unknown',
    state: 'Unknown State',
    country: 'Nigeria',
    coordinates: {
      latitude: 0,
      longitude: 0,
    },
    region: 'Unknown',
  },
  quantity: {
    amount: 200,
    unit: 'liters',
  },
  createdAt: new Date('2024-08-01T12:00:00Z'),
  updatedAt: new Date('2024-08-15T10:00:00Z'),
  qrCode: SAMPLE_BAD_PRODUCT_ID,
  guardianCredentialId: null,
  hcsTopicId: '0.0.47586',
  metadata: {
    farmerId: 'UNKNOWN',
    farmerName: 'Unknown Producer',
    harvestSeason: 'Unknown',
    processingMethod: 'Unknown',
    moistureContent: 'Not tested',
    qualityScore: 45,
    certificationBodies: [],
    batchProcessingId: 'BATCH-2024-002-UNVERIFIED',
  },
  verified: false,
  events: SAMPLE_BAD_PRODUCT_EVENTS.map((event, index) => ({
    id: `bad-event-${index + 1}-${event.eventType}`,
    productId: event.productId,
    eventType: event.eventType,
    actor: {
      walletAddress: event.actor.walletAddress,
      role: event.actor.role as
        | 'producer'
        | 'processor'
        | 'distributor'
        | 'verifier'
        | 'regulator',
      name: event.actor.organizationId || 'Unknown Actor',
    },
    timestamp: new Date(event.timestamp),
    location: event.location || {
      coordinates: { latitude: 0, longitude: 0 },
      address: 'Location unavailable',
      city: 'Unknown',
      state: 'Unknown',
      country: 'Unknown',
      region: 'Unknown',
    },
    data: event.eventData,
    hcsMessageId: `bad-hcs-msg-${index + 1}`,
    signature: event.signature,
  })),
  lastVerified: undefined,
  expiresAt: '2024-12-01T00:00:00Z',
};

/**
 * Sample batch with both good and bad products
 */
export const SAMPLE_MIXED_BATCH: CreateProductRequest[] = [
  SAMPLE_GOOD_PRODUCT,
  SAMPLE_BAD_PRODUCT,
  {
    name: 'Organic Yam Tubers',
    description: 'Fresh organic yam tubers from certified farms',
    category: 'agricultural',
    quantity: {
      amount: 25,
      unit: 'kg',
    },
    origin: {
      address: 'Kwara Organic Cooperative',
      city: 'Ilorin',
      state: 'Kwara State',
      country: 'Nigeria',
      coordinates: {
        latitude: 8.4966,
        longitude: 4.5426,
      },
      region: 'North Central Nigeria',
    },
    qualityGrade: 'Premium',
    productionDate: new Date('2024-09-10'),
    expiryDate: new Date('2025-03-10'),
    certifications: ['Organic'],
    metadata: {
      farmerId: 'FARM-002-KWARA',
      farmerName: 'Kwara Yam Cooperative',
      harvestSeason: 'Main Season 2024',
      processingMethod: 'Fresh harvest',
      moistureContent: '70%',
      qualityScore: 88,
      certificationBodies: ['Nigeria Organic Agriculture Network'],
      batchProcessingId: 'BATCH-2024-001-OG',
    },
  },
];

/**
 * Sample validation results for mixed batch
 */
export const SAMPLE_BATCH_VALIDATIONS: ProductFormValidation[] = [
  {
    productIndex: 0,
    isValid: true,
    errors: [],
    complianceStatus: 'valid',
    complianceDetails: {
      rules: [
        {
          ruleId: 'daily-limit',
          status: 'passed',
          message: 'Within daily production limit',
        },
        {
          ruleId: 'organic-cert',
          status: 'passed',
          message: 'Valid organic certification',
        },
        {
          ruleId: 'quality-grade',
          status: 'passed',
          message: 'Meets quality standards',
        },
      ],
      overallStatus: 'compliant',
      lastChecked: new Date().toISOString(),
    },
  },
  {
    productIndex: 1,
    isValid: false,
    errors: [
      'Missing quality certifications',
      'Unknown origin coordinates',
      'Low quality score below threshold',
      'Missing processing information',
    ],
    complianceStatus: 'invalid',
    complianceDetails: {
      rules: [
        {
          ruleId: 'quality-score',
          status: 'failed',
          message: 'Quality score below minimum threshold (45 < 70)',
        },
        {
          ruleId: 'certification',
          status: 'failed',
          message: 'No valid certifications provided',
        },
        {
          ruleId: 'origin-verification',
          status: 'failed',
          message: 'Cannot verify product origin',
        },
        {
          ruleId: 'processing-data',
          status: 'failed',
          message: 'Missing critical processing information',
        },
      ],
      overallStatus: 'non-compliant',
      lastChecked: new Date().toISOString(),
    },
  },
  {
    productIndex: 2,
    isValid: true,
    errors: [],
    complianceStatus: 'valid',
    complianceDetails: {
      rules: [
        {
          ruleId: 'daily-limit',
          status: 'passed',
          message: 'Within daily production limit',
        },
        {
          ruleId: 'organic-cert',
          status: 'passed',
          message: 'Valid organic certification',
        },
        {
          ruleId: 'quality-grade',
          status: 'passed',
          message: 'Meets quality standards',
        },
      ],
      overallStatus: 'compliant',
      lastChecked: new Date().toISOString(),
    },
  },
];

/**
 * Sample successful batch creation response
 */
export const SAMPLE_BATCH_SUCCESS: BatchCreationResponse = {
  success: true,
  batchId: 'BATCH-2024-001-OG',
  createdAt: new Date().toISOString(),
  results: {
    successful: 2,
    failed: 1,
    total: 3,
  },
  productIds: [
    SAMPLE_GOOD_PRODUCT_ID,
    SAMPLE_BAD_PRODUCT_ID,
    'CT-2024-YAM-567890',
  ],
  failedProducts: [
    {
      index: 1,
      productName: 'Unverified Palm Oil',
      errors: [
        'Failed compliance validation',
        'Quality score below threshold',
        'Missing certifications',
      ],
    },
  ],
  hcsTransactionId: '0.0.47586@1695123456.789123456',
  metadata: {
    processingTimeMs: 2340,
    validationTimeMs: 890,
    hcsSubmissionTimeMs: 1450,
    totalWeightKg: 275,
    totalVolumeL: 200,
  },
};
