# ChainTrace Human Setup Checklist

## Pre-Development Infrastructure Setup

This checklist covers all the manual setup tasks that must be completed by the project owner before development can begin. Each item includes specific steps and expected outcomes.

---

## 🏦 **HEDERA ACCOUNTS & WALLET SETUP**

### ☐ **Task 1.1: Create Hedera Testnet Account**

**What:** Set up main development account on Hedera testnet
**Steps:**

1. Visit [Hedera Portal](https://portal.hedera.com/)
2. Create new testnet account
3. **Record Account ID** (format: 0.0.xxxxx)
4. **Download private key** (keep secure!)
5. Fund account with **minimum 200 HBAR** for testing
   - Use Hedera testnet faucet or portal funding

**Expected Outcome:** Active testnet account with sufficient HBAR balance
**Deliverable:** Account ID and private key (store securely)

### ☐ **Task 1.2: Set Up Development Wallet**

**What:** Configure wallet for development and testing
**Steps:**

1. Install [MetaMask browser extension](https://metamask.io/)
2. Install [Hedera Wallet Snap](https://snaps.metamask.io/snap/npm/hashgraph/hedera-wallet-snap/)
3. Alternative: Install [HashPack Wallet](https://www.hashpack.app/)
4. Import your testnet account using private key
5. Verify wallet shows correct HBAR balance

**Expected Outcome:** Working wallet connection to testnet account
**Deliverable:** Wallet configured and tested

---

## 🗄️ **DATABASE & BACKEND SERVICES**

### ☐ **Task 2.1: Create Supabase Project**

**What:** Set up managed PostgreSQL database with real-time capabilities
**Steps:**

1. Sign up at [Supabase](https://supabase.com/)
2. Create new project: `chaintrace-testnet`
3. Choose region closest to your location
4. Set strong database password
5. **Record connection details:**
   - Project URL: `https://xxxxx.supabase.co`
   - Anon Key: `eyJhbGc...`
   - Service Role Key: `eyJhbGc...`

**Expected Outcome:** Active Supabase project ready for schema setup
**Deliverable:** Connection strings and API keys

### ☐ **Task 2.2: Configure Supabase Authentication**

**What:** Enable wallet-based authentication
**Steps:**

1. In Supabase Dashboard → Authentication → Settings
2. Disable email confirmation (for development)
3. Enable custom authentication (for wallet integration)
4. Set JWT secret (auto-generated)
5. Configure Row Level Security (RLS) policies

**Expected Outcome:** Auth system ready for wallet integration
**Deliverable:** Authentication configured

---

## 🚀 **DEPLOYMENT & CI/CD SETUP**

### ☐ **Task 3.1: GitHub Repository Setup**

**What:** Create repository with proper branch protection
**Steps:**

1. Create new GitHub repository: `chaintrace`
2. Make repository private (initially)
3. Set up branch protection for `main`:
   - Require pull request reviews
   - Require status checks to pass
   - Require branches to be up to date
4. Create development branch: `develop`

**Expected Outcome:** Protected repository ready for team development
**Deliverable:** GitHub repository URL

### ☐ **Task 3.2: Vercel Project Setup**

**What:** Configure hosting and deployment pipeline
**Steps:**

1. Sign up at [Vercel](https://vercel.com/)
2. Import GitHub repository
3. Configure build settings:
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Install Command: `npm install`
4. Set up custom domain (optional): `chaintrace-demo.vercel.app`
5. Enable Vercel Analytics

**Expected Outcome:** Automated deployment pipeline from GitHub
**Deliverable:** Vercel project URL and deployment settings

### ☐ **Task 3.3: Environment Variables Configuration**

**What:** Set up secure environment variables in Vercel
**Steps:**

1. In Vercel Dashboard → Project → Settings → Environment Variables
2. Add the following variables:

**Production & Preview:**

```
NEXT_PUBLIC_HEDERA_NETWORK=testnet
NEXT_PUBLIC_MIRROR_NODE_URL=https://testnet.mirrornode.hedera.com
SUPABASE_URL=[your-supabase-url]
SUPABASE_ANON_KEY=[your-anon-key]
HEDERA_ACCOUNT_ID=[your-account-id]
# Note: GUARDIAN_API_URL not required - using internal Custom Compliance Engine
```

**Development Only:**

```
HEDERA_PRIVATE_KEY=[your-private-key]  # NEVER in production
```

**Expected Outcome:** All environment variables configured securely
**Deliverable:** Environment configuration complete

---

## 🔐 **HEDERA SERVICES SETUP**

### ☐ **Task 4.1: ~~Hedera Guardian Access~~ (NOT REQUIRED)**

**Status:** **SKIPPED - Guardian Not Used in ChainTrace MVP**

**Alternative Approach:** ChainTrace uses an internal Custom Compliance Engine implemented as Next.js API routes (see `/api/compliance/validate-action.ts` in architecture documentation) instead of external Guardian service. This eliminates external dependencies and approval delays.

**No Action Required:** Proceed directly to HCS Topic creation.

### ☐ **Task 4.2: Create HCS Topic**

**What:** Set up Hedera Consensus Service topic for events
**Steps:**

1. Using your funded account, create HCS topic
2. Use Hedera SDK or HashScan to create topic
3. **Record Topic ID** (format: 0.0.xxxxx)
4. Test message submission to topic
5. Verify messages appear in Mirror Node

**Expected Outcome:** Active HCS topic for ChainTrace events
**Deliverable:** Topic ID for environment variables

### ☐ **Task 4.3: Create HTS Reward Token**

**What:** Create ChainTrace reward token on testnet
**Steps:**

1. Create HTS token with these properties:
   - Name: "ChainTrace Rewards"
   - Symbol: "CTRACE"
   - Decimals: 2
   - Initial Supply: 1,000,000
   - Treasury Account: Your account
2. **Record Token ID** (format: 0.0.xxxxx)
3. Test token distribution functionality

**Expected Outcome:** ChainTrace reward token ready for distribution
**Deliverable:** Token ID and treasury configuration

---

## 🔧 **DEVELOPMENT ENVIRONMENT**

### ☐ **Task 5.1: Local Development Setup**

**What:** Prepare local development environment
**Steps:**

1. Install Node.js 18+ from [nodejs.org](https://nodejs.org/)
2. Install Git if not already installed
3. Clone the repository locally
4. Create `.env.local` file with development variables:

```bash
# .env.local (local development only)
NEXT_PUBLIC_HEDERA_NETWORK=testnet
NEXT_PUBLIC_MIRROR_NODE_URL=https://testnet.mirrornode.hedera.com
SUPABASE_URL=[your-supabase-url]
SUPABASE_ANON_KEY=[your-anon-key]
HEDERA_ACCOUNT_ID=[your-account-id]
HEDERA_PRIVATE_KEY=[your-private-key]
# Note: GUARDIAN_API_URL not required - using internal Custom Compliance Engine
```

**Expected Outcome:** Local environment ready for development
**Deliverable:** Working local development setup

### ☐ **Task 5.2: Foundry Cast Wallet Setup**

**What:** Set up secure private key management for development
**Steps:**

1. Install [Foundry](https://book.getfoundry.sh/getting-started/installation)
2. Import your Hedera private key securely:

```bash
cast wallet import chaintrace-dev --interactive
# Enter your private key when prompted
```

3. Verify wallet import:

```bash
cast wallet list
```

**Expected Outcome:** Secure local key management setup
**Deliverable:** Foundry wallet configured

---

## 📋 **VALIDATION & TESTING**

### ☐ **Task 6.1: End-to-End Service Validation**

**What:** Verify all services are properly connected
**Steps:**

1. Test Hedera account balance query
2. Test HCS message submission
3. Test Mirror Node data retrieval
4. Test Supabase database connection
5. Test wallet connection in browser
6. Test Vercel deployment pipeline

**Expected Outcome:** All services operational and connected
**Deliverable:** Service validation complete

### ☐ **Task 6.2: Backup and Documentation**

**What:** Document all setup for team access
**Steps:**

1. Create secure backup of all credentials
2. Document service URLs and IDs
3. Create team access procedures
4. Test disaster recovery procedures

**Expected Outcome:** Complete setup documentation and backups
**Deliverable:** Setup documentation complete

---

## 🎯 **SETUP COMPLETION CHECKLIST**

- [ ] Hedera testnet account funded with 200+ HBAR
- [ ] Development wallet configured and tested
- [ ] Supabase project created with auth configured
- [ ] GitHub repository with branch protection
- [ ] Vercel deployment pipeline active
- [ ] Environment variables configured securely
- [ ] ~~Guardian access and policy templates ready~~ (NOT REQUIRED - using internal Custom Compliance Engine)
- [ ] HCS topic created and tested
- [ ] HTS reward token created and configured
- [ ] Local development environment working
- [ ] Foundry Cast wallet setup complete
- [ ] All services validated and documented

**Estimated Time:** 3-4 hours (Guardian dependency eliminated)

**Ready for Development:** When all items above are ✅ complete, Epic 1 development can begin!

---

## 🆘 **TROUBLESHOOTING & SUPPORT**

**If you encounter issues:**

1. Hedera Portal Issues → [Hedera Support](https://hedera.com/support)
2. Supabase Issues → [Supabase Docs](https://supabase.com/docs)
3. Vercel Issues → [Vercel Support](https://vercel.com/support)
4. Guardian Access → Contact Hedera team via Discord/Support

**Emergency Contacts:**

- Hedera Discord: [https://hedera.com/discord](https://hedera.com/discord)
- Development team: [Contact info]
