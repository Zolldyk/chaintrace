/**
 * Application constants for ChainTrace.
 * Centralized constants used throughout the application.
 *
 * @since 1.0.0
 */

/**
 * API endpoints and routing constants
 */
export const API_ROUTES = {
  // Authentication
  AUTH_CHALLENGE: '/api/auth/challenge',
  AUTH_VERIFY: '/api/auth/verify',

  // Products
  PRODUCTS: '/api/products',
  PRODUCT_BY_ID: (id: string) => `/api/products/${id}`,
  PRODUCT_BATCH: '/api/products/batch',
  PRODUCT_EVENTS: '/api/products/events',

  // Hedera services
  HEDERA_HCS_LOG: '/api/hedera/hcs/log-event',
  HEDERA_HCS_MESSAGES: '/api/hedera/hcs/get-messages',
  HEDERA_HTS_DISTRIBUTE: '/api/hedera/hts/distribute-rewards',
  HEDERA_HTS_BALANCE: '/api/hedera/hts/get-balance',
  HEDERA_MIRROR_NODE: (productId: string) =>
    `/api/hedera/mirror-node/${productId}`,
  HEDERA_COMPLIANCE: '/api/hedera/compliance/validate-action',

  // Regulatory
  REGULATORY_COMPLIANCE: '/api/regulatory/compliance',
  REGULATORY_REPORTS: '/api/regulatory/reports',

  // Cache
  CACHE_CLEAR: '/api/cache/clear',
  CACHE_STATS: '/api/cache/stats',
} as const;

/**
 * Frontend route paths
 */
export const ROUTES = {
  // Consumer routes
  HOME: '/',
  VERIFY: '/verify',
  PRODUCT_VERIFICATION: (productId: string) => `/verify/${productId}`,

  // Manager routes
  MANAGER_DASHBOARD: '/dashboard',
  BATCH_CREATE: '/batch/create',
  BATCH_DETAILS: (batchId: string) => `/batch/${batchId}`,

  // Regulatory routes
  COMPLIANCE_DASHBOARD: '/compliance',
  REGULATORY_REPORTS: '/reports',
} as const;

/**
 * Hedera network configuration
 */
export const HEDERA_NETWORKS = {
  TESTNET: {
    name: 'testnet',
    mirrorNodeUrl: 'https://testnet.mirrornode.hedera.com',
    nodes: { '34.94.106.61:50211': '0.0.3' },
  },
  MAINNET: {
    name: 'mainnet',
    mirrorNodeUrl: 'https://mainnet.mirrornode.hedera.com',
    nodes: { '35.237.200.180:50211': '0.0.3' },
  },
} as const;

/**
 * Product verification statuses
 */
export const VERIFICATION_STATUS = {
  VERIFIED: 'verified',
  PENDING: 'pending',
  REJECTED: 'rejected',
  NOT_FOUND: 'not_found',
} as const;

export type VerificationStatus =
  (typeof VERIFICATION_STATUS)[keyof typeof VERIFICATION_STATUS];

/**
 * Product event types for supply chain tracking
 */
export const EVENT_TYPES = {
  CREATED: 'created',
  MANUFACTURED: 'manufactured',
  PACKAGED: 'packaged',
  SHIPPED: 'shipped',
  RECEIVED: 'received',
  VERIFIED: 'verified',
  RECALLED: 'recalled',
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

/**
 * User roles and permissions
 */
export const USER_ROLES = {
  CONSUMER: 'consumer',
  MANAGER: 'manager',
  REGULATORY: 'regulatory',
  ADMIN: 'admin',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

/**
 * Wallet connection states
 */
export const WALLET_STATES = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error',
} as const;

export type WalletState = (typeof WALLET_STATES)[keyof typeof WALLET_STATES];

/**
 * Supported wallet types
 */
export const WALLET_TYPES = {
  HEDERA_SNAP: 'hedera-snap',
  HASHPACK: 'hashpack',
} as const;

export type WalletType = (typeof WALLET_TYPES)[keyof typeof WALLET_TYPES];

/**
 * Error codes for consistent error handling
 */
export const ERROR_CODES = {
  // General
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',

  // Authentication
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID: 'AUTH_INVALID',
  AUTH_EXPIRED: 'AUTH_EXPIRED',

  // Wallet
  WALLET_NOT_CONNECTED: 'WALLET_NOT_CONNECTED',
  WALLET_CONNECTION_FAILED: 'WALLET_CONNECTION_FAILED',
  WALLET_TRANSACTION_FAILED: 'WALLET_TRANSACTION_FAILED',

  // Product
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  PRODUCT_INVALID: 'PRODUCT_INVALID',

  // Hedera
  HEDERA_SERVICE_ERROR: 'HEDERA_SERVICE_ERROR',
  HEDERA_ACCOUNT_ERROR: 'HEDERA_ACCOUNT_ERROR',
  HEDERA_TRANSACTION_ERROR: 'HEDERA_TRANSACTION_ERROR',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * Cache TTL values in seconds
 */
export const CACHE_TTL = {
  PRODUCT_DATA: 300, // 5 minutes
  MIRROR_NODE: 60, // 1 minute
  COMPLIANCE_CHECK: 1800, // 30 minutes
  USER_SESSION: 3600, // 1 hour
} as const;

/**
 * Pagination defaults
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE: 1,
} as const;

/**
 * File upload constraints
 */
export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_DOC_TYPES: ['application/pdf', 'application/json'],
} as const;

/**
 * Validation patterns
 */
export const VALIDATION_PATTERNS = {
  PRODUCT_ID: /^[A-Z]{2,3}-\d{4}-\d{3}-[A-Z0-9]{6}$/,
  BATCH_ID: /^BATCH-\d{4}-\d{2}-\d{2}-[A-Z0-9]{8}$/,
  HEDERA_ACCOUNT: /^0\.0\.\d+$/,
  HEDERA_TOKEN: /^0\.0\.\d+$/,
  HEDERA_TOPIC: /^0\.0\.\d+$/,
} as const;

/**
 * UI constants
 */
export const UI_CONSTANTS = {
  HEADER_HEIGHT: 64,
  SIDEBAR_WIDTH: 256,
  MOBILE_BREAKPOINT: 768,
  DESKTOP_BREAKPOINT: 1024,
} as const;

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  THEME: 'chaintrace-theme',
  LANGUAGE: 'chaintrace-language',
  WALLET_CONNECTION: 'chaintrace-wallet',
  USER_PREFERENCES: 'chaintrace-preferences',
} as const;

/**
 * Animation durations in milliseconds
 */
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

/**
 * Application metadata
 */
export const APP_METADATA = {
  NAME: 'ChainTrace',
  DESCRIPTION: 'Blockchain-powered supply chain verification platform',
  VERSION: '1.0.0',
  GITHUB_URL: 'https://github.com/Zolldyk/chaintrace.git',
  SUPPORT_EMAIL: 'support@chaintrace.com',
} as const;
