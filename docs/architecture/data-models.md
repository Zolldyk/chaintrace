# Data Models

Based on the PRD requirements and supply chain verification workflow, the core business entities shared between frontend and backend systems:

## Product

**Purpose:** Central entity representing a physical product moving through the supply chain verification process, from initial creation by producers through processing and final verification.

**Key Attributes:**

- `id`: string - Unique product identifier for QR codes and manual lookup
- `batchId`: string - Groups products created together by cooperative managers
- `name`: string - Human-readable product name (e.g., "Organic Tomatoes")
- `category`: ProductCategory - Product classification for verification rules
- `status`: VerificationStatus - Current verification state in the supply chain
- `origin`: Location - Geographic origin including cooperative/farm details
- `quantity`: { amount: number, unit: QuantityUnit } - Amount/weight with units
- `createdAt`: Date - Initial product logging timestamp
- `updatedAt`: Date - Last modification timestamp
- `qrCode`: string - Generated QR code data for consumer scanning
- `complianceCredentialId`: string | null - Associated Custom Compliance Engine credential
- `hcsTopicId`: string - HCS topic containing this product's event log

### TypeScript Interface

```typescript
interface Product {
  id: string;
  batchId: string;
  name: string;
  category: ProductCategory;
  status: VerificationStatus;
  origin: Location;
  quantity: {
    amount: number;
    unit: QuantityUnit;
  };
  createdAt: Date;
  updatedAt: Date;
  qrCode: string;
  guardianCredentialId: string | null;
  hcsTopicId: string;
  metadata?: Record<string, any>;
}

type ProductCategory =
  | 'agricultural'
  | 'processed_food'
  | 'manufactured'
  | 'other';

type VerificationStatus =
  | 'created'
  | 'processing'
  | 'verified'
  | 'rejected'
  | 'expired';

type QuantityUnit = 'kg' | 'liters' | 'pieces' | 'tons';
```

### Relationships

- `hasMany` ProductEvents - Complete audit trail of supply chain actions
- `belongsTo` Cooperative - Producer organization that created the product
- `hasOne` ComplianceCredential - Verification credential when business rule compliance achieved

## ProductEvent

**Purpose:** Immutable audit trail entry representing a single action or state change in a product's supply chain journey, logged to HCS for tamper-proof verification.

**Key Attributes:**

- `id`: string - Unique event identifier
- `productId`: string - Reference to associated product
- `eventType`: EventType - Classification of the supply chain action
- `actor`: Actor - Entity (person/organization) performing the action
- `timestamp`: Date - Precise time when event occurred
- `location`: Location - Geographic coordinates and address where event happened
- `data`: Record<string, any> - Event-specific data (processing details, verification results, etc.)
- `hcsMessageId`: string - HCS message ID for blockchain verification
- `signature`: string - Cryptographic signature for event integrity

### TypeScript Interface

```typescript
interface ProductEvent {
  id: string;
  productId: string;
  eventType: EventType;
  actor: Actor;
  timestamp: Date;
  location: Location;
  data: Record<string, any>;
  hcsMessageId: string;
  signature: string;
}

type EventType =
  | 'created'
  | 'processed'
  | 'quality_check'
  | 'transported'
  | 'verified'
  | 'rejected';

interface Actor {
  id: string;
  name: string;
  role: ActorRole;
  organization?: string;
  walletAddress: string;
}

type ActorRole = 'producer' | 'processor' | 'verifier' | 'transporter';
```

## Location

**Purpose:** Geographic and administrative location data for tracking product origin and movement through the supply chain, supporting regulatory compliance and consumer transparency.

### TypeScript Interface

```typescript
interface Location {
  address: string;
  city: string;
  state: string;
  country: 'Nigeria'; // Literal type enforces MVP constraint
  coordinates: {
    latitude: number;
    longitude: number;
  };
  region: string;
}
```

## Cooperative

**Purpose:** Organization entity representing agricultural cooperatives and producer groups that create and manage product batches in the supply chain verification system.

### TypeScript Interface

```typescript
interface Cooperative {
  id: string;
  name: string;
  registrationNumber: string;
  location: Location;
  contactInfo: ContactInfo;
  managerWalletAddress: string;
  memberCount: number;
  productsLogged: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ContactInfo {
  email?: string;
  phone?: string;
  website?: string;
}
```

## TokenReward

**Purpose:** HTS token distribution record tracking incentive payments to supply chain participants for verification actions and quality contributions.

### TypeScript Interface

```typescript
interface TokenReward {
  id: string;
  recipientAddress: string;
  amount: number;
  reason: RewardReason;
  productId: string | null;
  transactionId: string;
  tokenToNairaRate: number; // Rate at time of distribution for historical accuracy
  estimatedNairaValue: number; // Calculated: amount * tokenToNairaRate
  distributedAt: Date;
}

type RewardReason =
  | 'product_verification'
  | 'quality_feedback'
  | 'compliance_reporting'
  | 'batch_logging';
```
