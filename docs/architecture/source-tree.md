# Source Tree

This document outlines the complete directory structure and file organization for the ChainTrace fullstack application, based on the Next.js 14 App Router architecture with TypeScript and Hedera blockchain integration.

## Root Directory Structure

```
ChainTrace/
├── .env.local                     # Environment variables (not committed)
├── .env.example                   # Environment variable template
├── .gitignore                     # Git ignore rules
├── .eslintrc.js                   # ESLint configuration
├── .prettierrc                    # Prettier formatting rules
├── next.config.js                 # Next.js configuration
├── package.json                   # Node.js dependencies and scripts
├── package-lock.json              # Lock file for dependencies
├── README.md                      # Project documentation
├── tailwind.config.js             # Tailwind CSS configuration
├── tsconfig.json                  # TypeScript configuration
├── vitest.config.ts               # Vitest testing configuration
├── playwright.config.ts           # Playwright E2E testing configuration
├── supabase/                      # Supabase configuration and migrations
├── docs/                          # Project documentation
├── src/                          # Application source code
├── public/                       # Static assets
└── tests/                        # Test files and utilities
```

## Source Code Organization (`src/`)

```
src/
├── app/                          # Next.js App Router directory
│   ├── (consumer)/              # Consumer-facing route group
│   │   ├── page.tsx             # Homepage with QR scanner
│   │   ├── verify/              # Product verification routes
│   │   │   ├── page.tsx         # Manual product ID entry
│   │   │   └── [productId]/     # Dynamic verification page
│   │   │       └── page.tsx     # Product verification display
│   │   └── layout.tsx           # Consumer layout wrapper
│   ├── (manager)/               # Cooperative manager route group
│   │   ├── dashboard/           # Manager dashboard
│   │   │   └── page.tsx         # Dashboard overview
│   │   ├── batch/               # Product batch management
│   │   │   ├── create/          # Batch creation
│   │   │   │   └── page.tsx     # Batch creation form
│   │   │   └── [batchId]/       # Dynamic batch pages
│   │   │       └── page.tsx     # Batch details and management
│   │   └── layout.tsx           # Manager layout with auth protection
│   ├── (regulatory)/            # Regulatory officer route group
│   │   ├── compliance/          # Compliance monitoring
│   │   │   └── page.tsx         # Compliance dashboard
│   │   ├── reports/             # Regulatory reports
│   │   │   └── page.tsx         # Report generation and viewing
│   │   └── layout.tsx           # Regulatory layout with role verification
│   ├── api/                     # API routes (serverless functions)
│   │   ├── auth/                # Authentication endpoints
│   │   │   ├── challenge.ts     # Generate wallet auth challenge
│   │   │   └── verify.ts        # Verify wallet signature
│   │   ├── hedera/              # Hedera blockchain integration
│   │   │   ├── compliance/      # Custom Compliance Engine operations
│   │   │   │   ├── validate-action.ts  # Execute compliance validation
│   │   │   │   └── get-credentials.ts # Retrieve compliance credentials
│   │   │   ├── hcs/             # Hedera Consensus Service
│   │   │   │   ├── log-event.ts # Log events to HCS
│   │   │   │   └── get-messages.ts # Retrieve HCS messages
│   │   │   ├── hts/             # Hedera Token Service
│   │   │   │   ├── distribute-rewards.ts # Token reward distribution
│   │   │   │   └── get-balance.ts # Check token balances
│   │   │   └── mirror-node/     # Mirror Node queries (Edge Functions)
│   │   │       ├── [productId].ts # Fast product data retrieval
│   │   │       └── account/[accountId].ts # Account information
│   │   ├── products/            # Product management endpoints
│   │   │   ├── [id].ts          # Product CRUD operations
│   │   │   ├── batch.ts         # Batch creation and management
│   │   │   └── events.ts        # Product event logging
│   │   ├── regulatory/          # Regulatory endpoints
│   │   │   ├── compliance.ts    # Compliance overview data
│   │   │   └── reports.ts       # Generate compliance reports
│   │   └── cache/               # Cache management endpoints
│   │       ├── clear.ts         # Manual cache clearing
│   │       └── stats.ts         # Cache performance statistics
│   ├── globals.css              # Global CSS styles and Tailwind imports
│   ├── layout.tsx               # Root layout component
│   ├── loading.tsx              # Global loading UI
│   ├── error.tsx                # Global error boundary
│   └── not-found.tsx            # 404 page
├── components/                   # React components
│   ├── ui/                      # Base UI components with Headless UI + Tailwind
│   │   ├── Button.tsx           # Button component with variants
│   │   ├── Card.tsx             # Card container component
│   │   ├── Modal.tsx            # Modal dialog component
│   │   ├── Input.tsx            # Form input component
│   │   ├── Select.tsx           # Dropdown select component
│   │   ├── Badge.tsx            # Status badge component
│   │   ├── Spinner.tsx          # Loading spinner component
│   │   ├── QRScanner.tsx        # QR code scanning component
│   │   ├── QRCodeDisplay.tsx    # QR code generation and display
│   │   └── index.ts             # Export all UI components
│   ├── verification/            # Consumer verification components
│   │   ├── ProductLookup.tsx    # Product ID search interface
│   │   ├── ProductCard.tsx      # Product information display
│   │   ├── ProductTimeline.tsx  # Supply chain event timeline
│   │   ├── VerificationStatus.tsx # Verification status indicator
│   │   ├── ProductDetails.tsx   # Detailed product information
│   │   └── index.ts             # Export verification components
│   ├── dashboard/               # Cooperative manager dashboard components
│   │   ├── ProductBatchForm.tsx # Batch creation form
│   │   ├── BatchSummary.tsx     # Batch overview and statistics
│   │   ├── ProductGrid.tsx      # Product grid display
│   │   ├── QRCodeGenerator.tsx  # QR code generation interface
│   │   ├── EventLogger.tsx      # Event logging interface
│   │   └── index.ts             # Export dashboard components
│   ├── regulatory/              # Regulatory officer components
│   │   ├── ComplianceDashboard.tsx # Main compliance overview
│   │   ├── ComplianceMetrics.tsx   # Metrics visualization
│   │   ├── FlaggedProducts.tsx     # Flagged product listing
│   │   ├── RegionSelector.tsx      # Geographic region filter
│   │   ├── ComplianceChart.tsx     # Chart visualization
│   │   └── index.ts                # Export regulatory components
│   ├── wallet/                  # Wallet integration components
│   │   ├── WalletConnector.tsx  # Wallet connection interface
│   │   ├── WalletStatus.tsx     # Connection status display
│   │   ├── SignaturePrompt.tsx  # Transaction signing UI
│   │   └── index.ts             # Export wallet components
│   ├── layout/                  # Layout and navigation components
│   │   ├── Header.tsx           # Application header
│   │   ├── Navigation.tsx       # Main navigation menu
│   │   ├── Sidebar.tsx          # Dashboard sidebar
│   │   ├── Footer.tsx           # Application footer
│   │   └── index.ts             # Export layout components
│   └── common/                  # Shared/common components
│       ├── ErrorBoundary.tsx    # React error boundary
│       ├── LoadingState.tsx     # Loading state components
│       ├── ErrorState.tsx       # Error state components
│       ├── EmptyState.tsx       # Empty state components
│       └── index.ts             # Export common components
├── hooks/                       # Custom React hooks
│   ├── useWalletConnection.ts   # Wallet connection state management
│   ├── useProductVerification.ts # Product verification logic
│   ├── useRealTimeUpdates.ts    # Supabase real-time subscriptions
│   ├── useBatchCreation.ts      # Batch creation workflow
│   ├── useComplianceData.ts     # Compliance dashboard data
│   ├── useErrorHandling.ts      # Centralized error handling
│   ├── useLocalStorage.ts       # Local storage utilities
│   └── index.ts                 # Export all hooks
├── services/                    # External service integrations
│   ├── api/                     # API client services
│   │   ├── client.ts            # Base API client configuration
│   │   ├── products.ts          # Product-related API calls
│   │   ├── auth.ts              # Authentication API calls
│   │   ├── regulatory.ts        # Regulatory API calls
│   │   └── index.ts             # Export API services
│   ├── wallet/                  # Wallet integration services
│   │   ├── WalletService.ts     # Main wallet service
│   │   ├── SnapConnector.ts     # Hedera Wallet Snap integration
│   │   ├── HashPackConnector.ts # HashPack wallet integration
│   │   └── index.ts             # Export wallet services
│   ├── hedera/                  # Hedera blockchain services
│   │   ├── HederaService.ts     # Main Hedera service
│   │   ├── ComplianceService.ts # Custom Compliance Engine integration
│   │   ├── HCSService.ts        # Consensus service integration
│   │   ├── HTSService.ts        # Token service integration
│   │   ├── MirrorNodeService.ts # Mirror node integration
│   │   └── index.ts             # Export Hedera services
│   ├── cache/                   # Caching services
│   │   ├── CacheService.ts      # Main cache service
│   │   ├── SupabaseCacheProvider.ts # Supabase cache implementation
│   │   └── index.ts             # Export cache services
│   ├── realtime/                # Real-time services
│   │   ├── RealtimeService.ts   # Supabase real-time integration
│   │   ├── subscriptions.ts     # WebSocket subscription management
│   │   └── index.ts             # Export real-time services
│   └── index.ts                 # Export all services
├── stores/                      # Zustand state management
│   ├── walletStore.ts           # Wallet connection state
│   ├── productStore.ts          # Product data state
│   ├── dashboardStore.ts        # Dashboard state management
│   ├── complianceStore.ts       # Compliance data state
│   ├── uiStore.ts               # UI state (modals, loading, etc.)
│   └── index.ts                 # Export all stores
├── types/                       # TypeScript type definitions
│   ├── api.ts                   # API request/response types
│   ├── product.ts               # Product-related types
│   ├── wallet.ts                # Wallet-related types
│   ├── hedera.ts                # Hedera blockchain types
│   ├── auth.ts                  # Authentication types
│   ├── compliance.ts            # Compliance-related types
│   ├── common.ts                # Common/shared types
│   └── index.ts                 # Export all types
├── lib/                         # Utility libraries and configurations
│   ├── utils.ts                 # General utility functions
│   ├── constants.ts             # Application constants
│   ├── validations.ts           # Zod validation schemas
│   ├── formatters.ts            # Data formatting utilities
│   ├── auth.ts                  # Authentication utilities
│   ├── supabase.ts              # Supabase client configuration
│   ├── env.ts                   # Environment variable validation
│   └── index.ts                 # Export utilities
├── config/                      # Configuration files
│   ├── database.ts              # Database configuration
│   ├── hedera.ts                # Hedera network configuration
│   ├── cache.ts                 # Cache configuration
│   └── index.ts                 # Export configurations
└── middleware.ts                # Next.js middleware for auth and routing
```

## Public Assets (`public/`)

```
public/
├── icons/                       # Application icons and favicons
│   ├── favicon.ico              # Main favicon
│   ├── icon-192.png             # PWA icon 192x192
│   ├── icon-512.png             # PWA icon 512x512
│   └── apple-touch-icon.png     # Apple touch icon
├── images/                      # Static images
│   ├── logo.svg                 # ChainTrace logo
│   ├── hero-background.jpg      # Homepage hero background
│   ├── placeholder-product.png  # Product placeholder image
│   └── qr-placeholder.png       # QR code placeholder
├── fonts/                       # Custom fonts (if any)
└── manifest.json                # PWA manifest
```

## Supabase Configuration (`supabase/`)

```
supabase/
├── config.toml                  # Supabase configuration
├── migrations/                  # Database migrations
│   ├── 001_initial_schema.sql   # Initial database schema
│   ├── 002_products_table.sql   # Products table creation
│   ├── 003_events_table.sql     # Product events table
│   ├── 004_cooperatives_table.sql # Cooperatives table
│   ├── 005_rewards_table.sql    # Token rewards table
│   ├── 006_cache_tables.sql     # Cache tables
│   └── 007_rls_policies.sql     # Row Level Security policies
├── seed.sql                     # Development seed data
└── functions/                   # Edge functions (if used)
```

## Testing Structure (`tests/`)

```
tests/
├── __mocks__/                   # Jest/Vitest mocks
│   ├── supabase.ts              # Supabase client mock
│   ├── wallet.ts                # Wallet service mock
│   └── hedera.ts                # Hedera service mock
├── unit/                        # Unit tests
│   ├── components/              # Component tests
│   ├── hooks/                   # Hook tests
│   ├── services/                # Service tests
│   └── utils/                   # Utility function tests
├── integration/                 # Integration tests
│   ├── api/                     # API route tests
│   ├── database/                # Database integration tests
│   └── wallet/                  # Wallet integration tests
├── e2e/                         # End-to-end tests (Playwright)
│   ├── consumer-flow.spec.ts    # Consumer verification flow
│   ├── manager-flow.spec.ts     # Manager batch creation flow
│   ├── regulatory-flow.spec.ts  # Regulatory dashboard flow
│   └── wallet-connection.spec.ts # Wallet connection tests
├── fixtures/                    # Test data fixtures
│   ├── products.json            # Sample product data
│   ├── events.json              # Sample event data
│   └── cooperatives.json        # Sample cooperative data
└── utils/                       # Test utilities
    ├── setup.ts                 # Test setup configuration
    ├── helpers.ts               # Test helper functions
    └── database.ts              # Database test utilities
```

## Documentation (`docs/`)

```
docs/
├── prd/                         # Sharded PRD documents
├── architecture/                # Sharded architecture documents
├── api/                         # API documentation
│   ├── endpoints.md             # API endpoint documentation
│   ├── authentication.md        # Auth flow documentation
│   └── error-handling.md        # Error response documentation
├── deployment/                  # Deployment guides
│   ├── vercel.md                # Vercel deployment guide
│   ├── supabase.md              # Supabase setup guide
│   └── environment.md           # Environment configuration
└── development/                 # Development guides
    ├── getting-started.md       # Development setup
    ├── contributing.md          # Contribution guidelines
    └── troubleshooting.md       # Common issues and solutions
```

## Key Files and Their Purpose

### Configuration Files

- **`next.config.js`**: Next.js configuration including API routes, Edge Functions, and build optimization
- **`tailwind.config.js`**: Tailwind CSS configuration with custom design tokens and component variants
- **`tsconfig.json`**: TypeScript configuration with strict type checking and path mapping
- **`middleware.ts`**: Next.js middleware for authentication, routing, and request processing

### Core Application Files

- **`src/app/layout.tsx`**: Root application layout with providers and global configuration
- **`src/lib/supabase.ts`**: Supabase client configuration with authentication integration
- **`src/services/wallet/WalletService.ts`**: Main wallet integration service for Hedera wallets
- **`src/stores/walletStore.ts`**: Global wallet state management with Zustand

### Critical API Routes

- **`src/app/api/hedera/mirror-node/[productId].ts`**: Edge Function for fast product verification
- **`src/app/api/products/batch.ts`**: Batch creation endpoint for cooperative managers
- **`src/app/api/regulatory/compliance.ts`**: Compliance dashboard data endpoint

## File Naming Conventions

| File Type        | Convention                                | Example                           |
| ---------------- | ----------------------------------------- | --------------------------------- |
| React Components | PascalCase + `.tsx`                       | `ProductVerificationCard.tsx`     |
| API Routes       | kebab-case + `.ts`                        | `product-verification.ts`         |
| Hooks            | camelCase with `use` prefix + `.ts`       | `useWalletConnection.ts`          |
| Services         | PascalCase + `Service.ts`                 | `HederaService.ts`                |
| Types            | camelCase + `.ts`                         | `product.ts`, `wallet.ts`         |
| Utilities        | camelCase + `.ts`                         | `formatters.ts`, `validations.ts` |
| Test Files       | Same as source + `.test.ts` or `.spec.ts` | `WalletService.test.ts`           |

## Import Path Mapping

The `tsconfig.json` includes path mapping for clean imports:

```typescript
// Instead of: import { Button } from '../../../components/ui/Button'
import { Button } from '@/components/ui/Button';

// Instead of: import { ProductService } from '../../services/api/products'
import { ProductService } from '@/services/api/products';

// Instead of: import { Product } from '../types/product'
import { Product } from '@/types/product';
```

## Environment Files

- **`.env.local`**: Local development environment variables (not committed to git)
- **`.env.example`**: Template showing required environment variables
- **Vercel deployment**: Environment variables configured through Vercel dashboard
- **Supabase**: Database connection and API keys

This source tree structure provides clear separation of concerns, scalable organization, and maintainable code organization for the ChainTrace supply chain verification platform.
