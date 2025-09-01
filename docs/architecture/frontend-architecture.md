# Frontend Architecture

## Component Architecture

**Component Organization:**

```
src/
├── components/
│   ├── ui/                    # Headless UI + Tailwind components
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   └── QRScanner.tsx
│   ├── verification/          # Consumer verification components
│   │   ├── ProductLookup.tsx
│   │   ├── ProductTimeline.tsx
│   │   └── VerificationStatus.tsx
│   ├── dashboard/            # Cooperative manager components
│   │   ├── ProductBatchForm.tsx
│   │   ├── QRCodeGenerator.tsx
│   │   └── BatchSummary.tsx
│   └── regulatory/           # Regulatory officer components
│       ├── ComplianceDashboard.tsx
│       ├── FlaggedProducts.tsx
│       └── RegionSelector.tsx
├── hooks/                    # Custom React hooks
│   ├── useWalletConnection.ts
│   ├── useProductVerification.ts
│   └── useRealTimeUpdates.ts
├── services/                 # API client services
│   ├── api.ts
│   ├── wallet.ts
│   └── realtime.ts
└── stores/                   # Zustand state management
    ├── walletStore.ts
    ├── productStore.ts
    └── dashboardStore.ts
```

**Component Template:**

```typescript
// Standard ChainTrace component pattern
interface ProductTimelineProps {
  productId: string;
  events: ProductEvent[];
  loading?: boolean;
}

export function ProductTimeline({ productId, events, loading = false }: ProductTimelineProps) {
  const { error, handleError } = useErrorHandling();

  if (loading) return <TimelineSkeleton />;
  if (error) return <ErrorBoundary error={error} retry={() => window.location.reload()} />;

  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <TimelineEvent
          key={event.id}
          event={event}
          isLatest={index === 0}
          className={cn(
            "transition-all duration-200",
            event.eventType === 'verified' && "border-green-200 bg-green-50"
          )}
        />
      ))}
    </div>
  );
}
```

## State Management Architecture

**State Structure:**

```typescript
// Zustand stores with TypeScript integration
interface WalletStore {
  // Connection state
  isConnected: boolean;
  walletAddress: string | null;
  walletType: 'snap' | 'hashpack' | null;

  // Actions
  connect: (type: 'snap' | 'hashpack') => Promise<void>;
  disconnect: () => void;
  signTransaction: (data: any) => Promise<string>;
}

interface ProductStore {
  // Product data
  products: Map<string, Product>;
  productEvents: Map<string, ProductEvent[]>;
  loading: Map<string, boolean>;

  // Actions
  getProduct: (id: string) => Promise<Product>;
  createBatch: (batch: CreateProductBatch) => Promise<BatchResponse>;
  subscribeToUpdates: (productId: string) => () => void;
}
```

## Routing Architecture

**Route Organization:**

```
app/
├── (consumer)/              # Consumer-facing routes
│   ├── verify/
│   │   └── [productId]/
│   │       └── page.tsx     # Product verification page
│   └── page.tsx            # Homepage with QR scanner
├── (manager)/              # Cooperative manager routes
│   ├── dashboard/
│   │   └── page.tsx        # Manager dashboard
│   └── batch/
│       └── create/
│           └── page.tsx    # Batch creation form
└── (regulatory)/           # Regulatory officer routes
    └── compliance/
        └── page.tsx        # Compliance dashboard
```

**Protected Route Pattern:**

```typescript
// Route protection with wallet-based authentication
export default function ProtectedLayout({
  children,
  requiredRole
}: {
  children: React.ReactNode;
  requiredRole: 'manager' | 'regulatory';
}) {
  const { isConnected, walletAddress } = useWalletStore();
  const { userRole, loading } = useUserRole(walletAddress);

  if (!isConnected) return <WalletConnectionPrompt />;
  if (loading) return <RoleVerificationSkeleton />;
  if (userRole !== requiredRole) return <InsufficientPermissions />;

  return <>{children}</>;
}
```

## Frontend Services Layer

**API Client Setup:**

```typescript
// Centralized API client with error handling
class ChainTraceAPI {
  private baseURL: string;
  private walletService: WalletService;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL!;
    this.walletService = new WalletService();
  }

  async authenticatedRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add wallet authentication if available
    if (this.walletService.isConnected()) {
      const signature = await this.walletService.signAuthChallenge();
      headers['Authorization'] = `Bearer ${signature}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw await this.handleErrorResponse(response);
    }

    return response.json();
  }
}
```
