# External APIs

Based on the PRD requirements and component design, ChainTrace requires integration with several external services:

## Hedera Hashgraph Services API

- **Purpose:** Core blockchain infrastructure providing Custom Compliance Engine, HCS event logging, HTS token rewards, and Mirror Node data retrieval
- **Documentation:** https://docs.hedera.com/hedera/sdks-and-apis
- **Base URL(s):**
  - Testnet: https://testnet.mirrornode.hedera.com
  - Custom Compliance: Internal compliance API endpoints
  - HCS/HTS: Direct SDK integration via consensus nodes
- **Authentication:** Private key signatures via delegated wallet operations (Hedera Wallet Snap/HashPack)
- **Rate Limits:**
  - Mirror Node: 100 requests/second per IP
  - HCS: 10 transactions/second per account
  - HTS: 10 transactions/second per account

**Key Endpoints Used:**

- `GET /api/v1/accounts/{accountId}` - Account balance and transaction history
- `GET /api/v1/topics/{topicId}/messages` - Retrieve HCS messages for product events
- `GET /api/v1/tokens/{tokenId}/balances` - HTS token distribution verification
- `POST /api/compliance/validate-action` - Execute supply chain compliance validation

**Integration Notes:** All write operations (HCS logging, HTS distribution, compliance validation) are performed through wallet-signed transactions. Read operations use Mirror Node REST API with 30-second timeout and cache fallback for demonstration reliability.

## Custom Compliance Engine API

- **Purpose:** Supply chain verification workflow automation with Producer → Processor → Verifier role enforcement and automated credential issuance
- **Documentation:** Internal API documentation
- **Base URL(s):** https://guardian-testnet.hedera.com/api/v1
- **Authentication:** **Custom Compliance Engine administrative access is ONLY used during initial system setup to create and configure business rules.** All runtime operations (product logging, processing, verification) use individual participant wallet signatures.
- **Rate Limits:** 5 policy executions/minute per participant account

**Key Endpoints Used:**

- `POST /policies/{policyId}/blocks/createApplication` - **Participant wallet signature** (Producer role)
- `POST /policies/{policyId}/blocks/processApplication` - **Participant wallet signature** (Processor role)
- `GET /policies/{policyId}/blocks/{blockId}/data` - **Public read access** or participant signature
- `POST /policies/{policyId}/blocks/verify` - **Participant wallet signature** (Verifier role)

## Supabase Real-time API

- **Purpose:** Live dashboard updates, Mirror Node response caching, and WebSocket subscriptions for instant UI synchronization
- **Documentation:** https://supabase.com/docs/reference/javascript/
- **Base URL(s):** https://[project-ref].supabase.co
- **Authentication:** Service role key for server operations, anon key for client subscriptions
- **Rate Limits:** 200 concurrent connections, 100 operations/second per connection

## Browser Camera API (QR Code Scanning)

- **Purpose:** Direct browser-based QR code scanning for consumer product verification without requiring app downloads
- **Recommended Library:** **@zxing/browser** - Industry-standard ZXing library optimized for web browsers
- **Documentation:** https://github.com/zxing-js/browser
- **Authentication:** Browser permission prompts for camera access

**Key Implementation:**

```typescript
import { BrowserMultiFormatReader } from '@zxing/browser';

interface QRScanningService {
  scanner: BrowserMultiFormatReader;

  async startScanning(): Promise<string> {
    const codeReader = new BrowserMultiFormatReader();
    return codeReader.decodeOnceFromVideoDevice();
  };
}
```
