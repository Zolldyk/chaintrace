# Chaintrace

A supply chain verification platform that leverages Hedera Hashgraph's enterprise-grade distributed ledger technology to address the $52 billion global counterfeit goods problem, with a focus on empowering African producers and consumers.

## Demo & Resources

📹 **Video Demo**: [Watch the ChainTrace Demo](https://www.loom.com/share/76c9ea40f6c049678eebb5e3ceff0f41)
📊 **Pitch Deck**: [View the ChainTrace Pitch Deck](https://gamma.app/docs/ChainTrace-Pitch-Deck-i0wy6m4vmembbo1)

## The problem

The global supply chain industry faces critical challenges that cost billions annually:

- **$1.5 billion+ annual losses** in African markets from fraud and inefficient compliance
- **15-30% of products** in emerging markets are counterfeit or mislabeled
- **1 million deaths annually** from counterfeit pharmaceuticals worldwide
- **Complete lack of transparency** in complex global supply chains making it impossible for consumers to verify product authenticity or journey

Chaintrace addresses these systemic issues by providing:

1. Verifiable product authenticity for consumers
2. Market access for small-scale producers through transparent documentation
3. Automated regulatory compliance with tamper-proof audit trails
4. Economic incentives aligned across all supply chain participants

## Solution overview

Chaintrace creates a transparent, incentivized supply chain ecosystem where:

- **Cooperative managers** register products and generate QR codes with automated compliance validation
- **Consumers** scan products to verify authenticity and earn token rewards
- **Regulatory bodies** monitor compliance in real-time with immutable audit trails
- **All participants** earn CTRACE tokens for contributing to supply chain transparency

## Technology stack

### Frontend

- **Next.js 15** - React framework with server-side rendering
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Zustand** - State management

### Blockchain

- **Hedera Hashgraph** - Enterprise-grade distributed ledger
- **HCS (Hedera Consensus Service)** - Immutable event logging
- **HTS (Hedera Token Service)** - CTRACE reward token distribution
- **Custom Compliance Engine** - Automated business rule validation
- **Mirror Node API** - High-performance blockchain queries

### Database & backend

- **Supabase** - PostgreSQL database with real-time subscriptions
- **Next.js API routes** - Backend API endpoints

### Testing & quality

- **Vitest** - Unit and integration testing
- **Playwright** - End-to-end testing
- **React Testing Library** - Component testing
- **ESLint** - Code linting
- **Prettier** - Code formatting

### Deployment

- **Netlify** - Hosting and continuous deployment
- **GitHub Actions** - CI/CD automation

## Key features

### For consumers

- Browser-based QR code scanning (no app required)
- Instant product verification in under 30 seconds
- Complete product journey visualization from origin to shelf
- Automatic CTRACE token rewards for verification actions
- Offline verification with automatic sync when online

### For cooperative managers

- Streamlined product batch registration
- Automated compliance validation against regulatory standards
- QR code generation for product labeling
- Real-time blockchain event logging
- Analytics dashboard with performance metrics

### For regulatory bodies

- Real-time compliance monitoring across all registered products
- Geographic distribution and trend analysis
- Automated alerts for non-compliance or safety issues
- Immutable audit trails for investigations
- Performance metrics and transparency measurements

### Technical capabilities

- Sub-30 second verification performance
- 10,000+ daily verifications capacity
- Offline-first architecture
- Mobile-optimized progressive web app
- Multi-language support ready

## Prerequisites

Before setting up Chaintrace, ensure you have the following installed:

- **Node.js** >= 18.0.0
- **npm** >= 10.0.0
- **Git** for version control

You will also need accounts for:

- **Hedera account** with testnet HBAR for development
- **Supabase project** for database services
- **Vercel account** (optional, for deployment)

## Deployment & Setup Instructions

Follow these step-by-step instructions to run ChainTrace locally on Hedera Testnet.

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/chaintrace.git
cd chaintrace
```

### Step 2: Install Dependencies

Ensure you have Node.js >= 18.0.0 and npm >= 10.0.0 installed.

```bash
npm install
```

This will install all required dependencies including:

- Next.js 15 framework
- Hedera SDK (@hashgraph/sdk)
- Supabase client libraries
- Development and testing tools

### Step 3: Configure Environment Variables

Copy the example environment file to create your local configuration:

```bash
cp .env.example .env.local
```

Open `.env.local` and configure the following required variables:

#### Hedera Network Configuration

```env
# Network selection
NEXT_PUBLIC_HEDERA_NETWORK=testnet

# Mirror Node endpoint
NEXT_PUBLIC_MIRROR_NODE_URL=https://testnet.mirrornode.hedera.com

# Your Hedera testnet account (create at portal.hedera.com)
HEDERA_ACCOUNT_ID=0.0.xxxxx

# Your Hedera account private key (DER encoded hex)
HEDERA_PRIVATE_KEY=your-private-key-here

# HashConnect wallet configuration
NEXT_PUBLIC_HASHCONNECT_PROJECT_ID=chaintrace-supply-chain
NEXT_PUBLIC_HASHCONNECT_DEBUG=false
```

#### Supabase Database Configuration

```env
# Supabase project URL (from your Supabase dashboard)
SUPABASE_URL=https://your-project-id.supabase.co

# Supabase anonymous key (safe for client-side)
SUPABASE_ANON_KEY=your-supabase-anon-key

# Supabase service role key (server-side only, DO NOT expose)
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-key
```

#### Application Configuration

```env
# Local development URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# JWT secret for session management (generate random string)
JWT_SECRET=your-jwt-secret-key

# Optional: Guardian API for Custom Compliance Engine
GUARDIAN_API_URL=https://guardian-api.hedera.com
GUARDIAN_API_KEY=your-guardian-api-key
```

**Important:** See `.env.example` for the complete configuration template with detailed comments.

### Step 4: Set Up Supabase Database (Optional for Full Features)

If you want to test caching and real-time features:

1. Create a free Supabase account at [supabase.com](https://supabase.com)
2. Create a new project
3. Copy the project URL and API keys to `.env.local`
4. Run database migrations (when available):

```bash
npm run db:migrate
```

### Step 5: Initialize Hedera Services (Optional for Blockchain Features)

If you want to test actual blockchain transactions on Hedera Testnet:

```bash
# Create HCS topic for event logging
npm run setup:hcs

# Deploy HTS CTRACE reward token
npm run setup:token
```

These scripts will output the created Topic ID and Token ID, which you can use for testing.

### Step 6: Start the Development Server

```bash
npm run dev
```

The application will start on **http://localhost:3000**

**Running Environment:**

- **Frontend:** Next.js development server on `http://localhost:3000`
- **API Routes:** Serverless functions accessible at `http://localhost:3000/api/*`
- **Hot Reload:** Enabled for all code changes
- **TypeScript:** Automatic type checking on save

### Step 7: Verify Installation

Navigate to the following URLs to verify everything is working:

- **Consumer Interface:** `http://localhost:3000/` (QR scanner and product verification)
- **Manager Dashboard:** `http://localhost:3000/dashboard` (product registration)
- **Regulatory Dashboard:** `http://localhost:3000/compliance` (compliance monitoring)

## Development

### Available scripts

- `npm run dev` - Start development server
- `npm run build` - Build production bundle
- `npm run start` - Start production server
- `npm run lint` - Run ESLint code linting
- `npm run typecheck` - Run TypeScript type checking
- `npm test` - Run unit and integration tests
- `npm run test:e2e` - Run end-to-end tests with Playwright

## Project structure

```
chaintrace/
├── src/
│   ├── app/                      # Next.js app router pages
│   │   ├── (consumer)/          # Consumer verification interface
│   │   ├── (manager)/           # Cooperative manager dashboard
│   │   ├── (regulatory)/        # Regulatory compliance dashboard
│   │   └── api/                 # API route handlers
│   ├── components/              # React components
│   │   ├── verification/        # Product verification UI
│   │   ├── dashboard/           # Dashboard components
│   │   ├── wallet/              # Wallet integration
│   │   ├── ui/                  # Reusable UI components
│   │   └── common/              # Common components
│   ├── services/                # Business logic services
│   │   ├── hedera/              # Hedera service integrations
│   │   ├── compliance/          # Compliance engine
│   │   ├── verification/        # Verification logic
│   │   └── wallet/              # Wallet connection
│   ├── lib/                     # Utilities and helpers
│   │   ├── security/            # Security utilities
│   │   ├── validation/          # Input validation
│   │   ├── serialization/       # Data serialization
│   │   └── cache/               # Caching layer
│   ├── hooks/                   # React custom hooks
│   ├── types/                   # TypeScript type definitions
│   └── config/                  # Configuration files
├── docs/                        # Project documentation
├── tests/                       # Test files
└── scripts/                     # Setup and utility scripts
```

## Architecture overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ChainTrace Platform                         │
└─────────────────────────────────────────────────────────────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
        ▼                          ▼                          ▼
┌───────────────┐          ┌───────────────┐        ┌───────────────┐
│   Consumer    │          │   Cooperative │        │  Regulatory   │
│   Interface   │          │    Manager    │        │   Dashboard   │
│               │          │   Dashboard   │        │               │
│ QR Scanner    │          │ Product Reg.  │        │ Compliance    │
│ Verification  │          │ Batch Logging │        │ Monitoring    │
└───────┬───────┘          └───────┬───────┘        └───────┬───────┘
        │                          │                          │
        └──────────────────────────┼──────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │    Next.js Frontend      │
                    │  (React + TypeScript)    │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────┴─────────────┐
                    │                          │
                    ▼                          ▼
        ┌───────────────────┐      ┌───────────────────┐
        │  Next.js API      │      │   Supabase        │
        │  Routes (Backend) │◄────►│   PostgreSQL      │
        └─────────┬─────────┘      │   (Cache Layer)   │
                  │                └───────────────────┘
                  │
                  ▼
        ┌─────────────────────────────────────────────┐
        │          Hedera Network Services            │
        ├─────────────────────────────────────────────┤
        │                                             │
        │  ┌──────────────────┐  ┌─────────────────┐  │
        │  │ Mirror Node API  │  │  HCS Topics     │  │
        │  │ (Data Queries)   │  │ (Event Logging) │  │
        │  └──────────────────┘  └─────────────────┘  │
        │                                             │
        │  ┌──────────────────┐  ┌─────────────────┐  │
        │  │ HTS Token Service│  │ Custom          │  │
        │  │ (CTRACE Rewards) │  │ Compliance      │  │
        │  │                  │  │ Engine          │  │
        │  └──────────────────┘  └─────────────────┘  │
        │                                             │
        │           Hedera Testnet                    │
        └─────────────────────────────────────────────┘
```

### Data Flow

**Consumer Verification Flow:**

```
QR Scan → Frontend → API Route → Mirror Node Query →
Supabase Cache Check → Product Data Return →
Display Verification → HTS Token Reward
```

**Product Registration Flow:**

```
Manager Input → Validation → Compliance Engine Check →
HCS Event Submit → Supabase Cache Update →
QR Code Generation → Transaction Confirmation
```

**Regulatory Monitoring Flow:**

```
Dashboard Load → API Query → Supabase Aggregation →
Mirror Node Sync → Real-time Updates →
HCS Audit Trail Access
```

## Hedera Integration Details

ChainTrace deeply integrates four core Hedera services to create a cost-effective, high-performance supply chain platform optimized for African market conditions.

### 1. Hedera Consensus Service (HCS)

**Why HCS:** We chose HCS for immutable logging of critical supply chain events because its predictable $0.0001 fee per message guarantees operational cost stability, which is essential for low-margin agricultural cooperatives in Africa. Traditional blockchain solutions charge $0.50-$5 per transaction, making them prohibitively expensive for small-scale producers tracking thousands of products. HCS's sub-3-second consensus finality ensures real-time verification for consumers, while its orderless stream guarantees prevent manipulation of supply chain records.

**Transaction Types:**

- `ConsensusSubmitMessage` - Log product registration events with metadata (origin, batch ID, timestamps)
- `ConsensusSubmitMessage` - Record supply chain milestones (harvest, processing, transport, retail)
- `ConsensusSubmitMessage` - Capture consumer verification events for traceability
- `TopicCreateTransaction` - Initialize HCS topics for different product categories or cooperatives
- `TopicInfoQuery` - Retrieve topic metadata and sequence numbers

**Economic Justification:** At $0.0001 per HCS message, a cooperative logging 10,000 products with 5 lifecycle events each costs only $5 total ($0.0005 per product journey). This represents a 99.9% cost reduction compared to Ethereum ($500+) or Polygon ($50+) for the same workload. For cooperatives operating on 5-10% profit margins, this cost structure makes blockchain adoption financially viable for the first time.

### 2. Hedera Token Service (HTS)

**Why HTS:** We leverage HTS to distribute CTRACE reward tokens because its $1 fixed token creation fee and $0.001 transfer costs enable sustainable incentive mechanisms even with micropayments. African consumers and small cooperatives cannot afford the $50-$200 token deployment costs on other chains. HTS's native compliance features (KYC flags, freeze capabilities) allow us to meet regulatory requirements without custom smart contract complexity, reducing development risk and audit costs.

**Transaction Types:**

- `TokenCreateTransaction` - Deploy CTRACE reward token with configured supply and treasury
- `TokenAssociateTransaction` - Associate CTRACE token with user wallet accounts
- `TransferTransaction` - Distribute reward tokens to consumers for verification actions
- `TransferTransaction` - Pay cooperatives for product registration and compliance
- `TokenInfoQuery` - Check token supply, distribution, and account balances
- `AccountBalanceQuery` - Verify user reward balances before claiming

**Economic Justification:** CTRACE token rewards average 0.1 tokens per consumer verification (worth ~$0.01 USD). At $0.001 per transfer, the platform can sustainably reward 1,000 verifications for just $1 in network fees. This creates a positive unit economics: $1 spent on rewards generates $5-$10 in verification value through fraud prevention and consumer engagement. Traditional reward systems require $0.10-$0.25 per transaction in payment processing fees, making micro-incentives economically impossible.

### 3. Custom Compliance Engine (Guardian Integration)

**Why Custom Compliance Engine:** African markets face complex, often inconsistent regulatory frameworks across countries and regions. We integrate Hedera's Guardian-based Custom Compliance Engine to automate validation of region-specific business rules (organic certifications, fair trade standards, safety protocols) without requiring manual regulatory review for every product. Guardian's ABFT consensus ensures compliance decisions are immutable and auditable, while its policy-as-code approach allows cooperatives to prove compliance instantly rather than waiting weeks for manual certification.

**Transaction Types:**

- `ConsensusSubmitMessage` - Submit compliance policy definitions to Guardian policies topic
- `ConsensusSubmitMessage` - Record compliance validation results for product batches
- `ContractExecuteTransaction` - Execute compliance smart contract logic for automated decisions
- `ContractCallQuery` - Query compliance status and credential verification
- `FileAppendTransaction` - Upload compliance documents and certifications to Hedera File Service

**Economic Justification:** Manual compliance certification costs $50-$200 per product batch and takes 2-4 weeks in African markets. Automated compliance validation via the Custom Compliance Engine costs $0.10-$0.50 per batch (HCS + computation fees) and completes in under 5 minutes. For cooperatives processing 100 batches annually, this represents $5,000-$20,000 in cost savings and eliminates market access delays that currently cause 15-30% revenue loss from spoilage and missed market windows.

### 4. Mirror Node API

**Why Mirror Node API:** Consumer product verification requires instant responses (< 2 second load time) to maintain trust and usability. Querying the Hedera mainnet directly would incur $0.0001 per query, making high-traffic consumer verification unsustainable ($100+ daily for 1M queries). The Mirror Node REST API provides free, cached access to all consensus data with sub-second response times. Its geographic distribution ensures low-latency access across Africa (Lagos, Nairobi, Cape Town edge nodes), while queryable transaction history enables complete supply chain journey reconstruction without expensive on-chain storage.

**Transaction Types (Read Operations):**

- `GET /api/v1/topics/{topicId}/messages` - Retrieve product lifecycle events from HCS
- `GET /api/v1/transactions/{transactionId}` - Fetch specific transaction details for audit trails
- `GET /api/v1/accounts/{accountId}/tokens` - Check user CTRACE token balances
- `GET /api/v1/tokens/{tokenId}` - Query CTRACE token metadata and supply
- `GET /api/v1/accounts/{accountId}/nfts` - Future: Product ownership NFT verification

**Economic Justification:** Mirror Node queries are free (no direct Hedera fees), with only standard API hosting costs (~$50-$100/month for 1M+ monthly queries via CDN caching). This enables unlimited consumer verification at no marginal cost, allowing ChainTrace to scale to millions of users without network fee concerns. Supabase caching further reduces Mirror Node load for frequently verified products, achieving 95%+ cache hit rates and sub-200ms response times even in rural Africa with 3G connectivity.

## Performance characteristics

- **Verification speed**: < 30 seconds average
- **Transaction throughput**: 10,000+ daily verifications
- **Network coverage**: Multi-region deployment ready
- **Offline capability**: Local verification with automatic sync
- **Cache strategy**: Intelligent caching for optimal performance

## Security features

- Immutable audit trails on Hedera blockchain
- Input sanitization and validation on all user inputs
- Rate limiting to prevent abuse
- Selective data sharing (private business data, public verification)
- Bank-grade security inherited from Hedera network

## Deployed Hedera Testnet IDs

The following Hedera Testnet resources are deployed and configured for the ChainTrace demo:

### Hedera Account IDs

- **Operator/Treasury Account:** `0.0.6628267` (Main service account for HCS and HTS operations, CTRACE token treasury)

### HCS Topic IDs

- **ChainTrace Supply Chain Events Topic:** `0.0.6714150`
  - **Purpose:** Logs all product registration, lifecycle events, and consumer verifications
  - **Network:** Hedera Testnet
  - **Memo:** "ChainTrace Supply Chain Events Topic"
  - **View on HashScan:** [https://hashscan.io/testnet/topic/0.0.6714150](https://hashscan.io/testnet/topic/0.0.6714150)

### HTS Token IDs

- **CTRACE Reward Token:** `0.0.6715040`
  - **Name:** ChainTrace Rewards
  - **Symbol:** CTRACE
  - **Decimals:** 2
  - **Supply Type:** Infinite ♾️
  - **Initial Supply:** 1,000,000.00 CTRACE
  - **Treasury Account:** 0.0.6628267
  - **Admin Key:** Set (enables future token management)
  - **Supply Key:** Set (enables minting/burning for sustainable reward distribution)
  - **View on HashScan:** [https://hashscan.io/testnet/token/0.0.6715040](https://hashscan.io/testnet/token/0.0.6715040)

### Mirror Node Endpoints

- **Testnet Mirror Node:** `https://testnet.mirrornode.hedera.com`
- **REST API Base:** `https://testnet.mirrornode.hedera.com/api/v1/`
- **Topic Messages:** `https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.6714150/messages`
- **Token Info:** `https://testnet.mirrornode.hedera.com/api/v1/tokens/0.0.6715040`

### Smart Contract IDs (Future Implementation)

- **Compliance Contract:** TBD (Custom Compliance Engine smart contract)
- **Reward Distribution Contract:** TBD (Automated reward distribution logic)

**Note:** All IDs are for Hedera Testnet. Production deployment will use Hedera Mainnet with different IDs.

## Security & Secrets

**CRITICAL SECURITY NOTICE:** This project handles sensitive cryptographic credentials and blockchain private keys. Follow these security practices strictly.

### DO NOT Commit Secrets

**Never commit the following to version control:**

- `.env.local` - Local environment configuration (gitignored)
- `.env.production` - Production environment variables (gitignored)
- Private keys of any kind (Hedera, JWT, API keys)
- Supabase service role keys
- Guardian API credentials

**Files that ARE safe to commit:**

- `.env.example` - Template showing required variables (no actual values)
- Public configuration (Hedera network type, public URLs)
- Testnet account IDs (public information on blockchain)

### Example Configuration

All required environment variables are documented in `.env.example`:

```bash
# View the example configuration
cat .env.example

# Copy to create your local config
cp .env.example .env.local

# Edit with your actual credentials
nano .env.local  # or use your preferred editor
```

**Required Variables:**

- `HEDERA_ACCOUNT_ID` - Your Hedera testnet account ID
- `HEDERA_PRIVATE_KEY` - Your Hedera account private key (DER encoded hex)
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key (safe for frontend)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin key (backend only)
- `JWT_SECRET` - Random string for session signing

**Optional Variables:**

- `GUARDIAN_API_URL` - Custom Compliance Engine endpoint
- `GUARDIAN_API_KEY` - Guardian API authentication key
- `SENTRY_DSN` - Error tracking configuration

### Production Security Practices

When deploying to production:

1. **Use Vercel Environment Variables:** Configure all secrets in Vercel dashboard (Settings → Environment Variables)
2. **Enable Environment Encryption:** Vercel automatically encrypts environment variables at rest
3. **Rotate Keys Regularly:** Rotate JWT secrets and API keys every 90 days
4. **Use Hedera Mainnet:** Switch to mainnet accounts with proper key management
5. **Implement Key Management:** Consider using HashiCorp Vault or AWS Secrets Manager
6. **Enable Audit Logging:** Log all access to sensitive operations
7. **Rate Limiting:** Protect API endpoints with rate limiting (implemented in middleware)
8. **CORS Configuration:** Restrict API access to known frontend domains

## Hedera certification

This project was built with certified knowledge of Hedera development. View the certification here:

[Hedera Certification](https://drive.google.com/drive/folders/1jdlgmUsm1qFpTdf6Hj-U9KpwKZNa3GIW?usp=sharing)

## Deployment

### Vercel deployment

1. Push your code to GitHub
2. Import the repository in Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy

The platform automatically builds and deploys on every push to the main branch.

### Environment-specific configuration

- **Development**: Local development with Hedera testnet
- **Staging**: Vercel preview deployments for testing
- **Production**: Hedera mainnet with enterprise monitoring

## Roadmap

### Phase 1: Nigerian pilot (months 1-3)

- 5 agricultural cooperatives in Lagos State
- 1,000 products registered and tracked
- Consumer verification interface deployment
- Regulatory observer dashboard establishment

### Phase 2: Regional expansion (months 4-9)

- 50+ cooperatives across 3 Nigerian states
- Cross-product categories (agriculture, textiles, handicrafts)
- Mobile app development
- Integration with local payment systems

### Phase 3: Pan-African vision (months 10-18)

- Multi-country deployment across West Africa
- Cross-border trade facilitation
- Regional regulatory harmonization
- Integration with African Continental Free Trade Agreement (AfCFTA)

### Phase 4: Global scale (year 2+)

- Worldwide supply chain transparency infrastructure
- Integration with major global brands
- Support for all product categories
- Universal product passport implementation

## Acknowledgments

- Built on Hedera Hashgraph's enterprise-grade distributed ledger technology
- Designed to address real-world supply chain challenges in African markets
- Developed with the goal of economic inclusion and consumer protection
