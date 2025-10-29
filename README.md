# Chaintrace

A supply chain verification platform that leverages Hedera Hashgraph's enterprise-grade distributed ledger technology to address the $52 billion global counterfeit goods problem, with a focus on empowering African producers and consumers.

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

## Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/chaintrace.git
cd chaintrace
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
npm run setup:env
```

This copies `.env.example` to `.env.local`. Open `.env.local` and fill in the required values:

```env
# Hedera configuration
NEXT_PUBLIC_HEDERA_NETWORK=testnet
NEXT_PUBLIC_MIRROR_NODE_URL=https://testnet.mirrornode.hedera.com
HEDERA_ACCOUNT_ID=0.0.xxxxx
HEDERA_PRIVATE_KEY=your-private-key-here

# Supabase configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-key

# Application configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
JWT_SECRET=your-jwt-secret-key
```

4. Set up Hedera services (optional, for development with real blockchain integration):

```bash
# Create HCS topic for event logging
npm run setup:hcs

# Deploy HTS token for rewards
npm run setup:token
```

## Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

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

### Hedera integration

Chaintrace leverages multiple Hedera services for enterprise-grade blockchain functionality:

1. **Custom Compliance Engine** - Automated validation of business rules and regulatory requirements
2. **HCS (Hedera Consensus Service)** - Immutable event logging with sub-30 second consensus
3. **HTS (Hedera Token Service)** - CTRACE token distribution for incentivized participation
4. **Mirror Node API** - High-performance queries with caching and offline support

### Data flow

1. Cooperative manager registers product → HCS event logged → Compliance validated → QR code generated
2. Consumer scans QR code → Product data queried from Mirror Node → Verification result displayed → CTRACE token rewarded
3. Regulatory officer monitors dashboard → Real-time compliance metrics → Audit trails accessible → Alerts for violations

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
