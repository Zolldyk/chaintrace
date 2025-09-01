# Coding Standards

Define MINIMAL but CRITICAL standards for AI agents. Focus only on project-specific rules that prevent common mistakes. These will be used by dev agents.

## Critical Fullstack Rules

- **Type Sharing:** Always define types in packages/shared and import from there - prevents type drift between frontend/backend
- **API Calls:** Never make direct HTTP calls - use the service layer to ensure consistent error handling and caching
- **Environment Variables:** Access only through config objects, never process.env directly - enables proper validation and defaults
- **Error Handling:** All API routes must use the standard error handler with ApiErrorCode enum for consistent client-side handling
- **State Updates:** Never mutate state directly - use proper state management patterns (Zustand actions) for predictable updates
- **Wallet Operations:** All private key operations must go through WalletService - never handle keys directly in components or API routes
- **Database Queries:** Use the repository pattern through service layers - never write raw SQL in API routes or components
- **Cache Management:** Use the Data Caching Layer interface - never access Supabase cache directly from components

## JSDoc Documentation Standards

**MANDATORY: All public functions, interfaces, and classes MUST have JSDoc comments with the following format:**

### Public Function Documentation

````typescript
/**
 * Retrieves and caches product verification data from Mirror Node API.
 *
 * @param productId - Unique product identifier (e.g., 'CT-2024-001-ABC123')
 * @param options - Optional configuration for cache behavior and timeout
 * @param options.skipCache - Bypass cache and fetch fresh data
 * @param options.timeout - Request timeout in milliseconds (default: 30000)
 * @returns Promise resolving to complete product data with verification events
 *
 * @throws {ApiError} When product not found or Mirror Node unavailable
 * @throws {ValidationError} When productId format is invalid
 *
 * @example
 * ```typescript
 * const product = await getProductVerification('CT-2024-001-ABC123');
 * console.log(product.status); // 'verified' | 'pending' | 'rejected'
 *
 * // Skip cache for fresh data
 * const freshData = await getProductVerification('CT-2024-001-ABC123', {
 *   skipCache: true
 * });
 * ```
 *
 * @since 1.0.0
 * @see {@link ProductEvent} for event structure details
 * @see {@link Mirror Node API} https://docs.hedera.com/mirror-node
 */
export async function getProductVerification(
  productId: string,
  options: VerificationOptions = {}
): Promise<ProductWithEvents> {
  // Implementation...
}
````

### Public Interface Documentation

````typescript
/**
 * Configuration interface for Hedera wallet connection and authentication.
 *
 * @interface WalletConfig
 *
 * @property walletType - Type of Hedera wallet to connect ('snap' | 'hashpack')
 * @property networkType - Hedera network environment ('testnet' | 'mainnet')
 * @property accountId - Optional specific account ID to connect to
 * @property autoReconnect - Whether to automatically reconnect on connection loss
 * @property timeoutMs - Connection timeout in milliseconds
 *
 * @example
 * ```typescript
 * const config: WalletConfig = {
 *   walletType: 'snap',
 *   networkType: 'testnet',
 *   autoReconnect: true,
 *   timeoutMs: 10000
 * };
 *
 * await walletService.connect(config);
 * ```
 *
 * @since 1.0.0
 * @see {@link WalletService.connect} for usage details
 */
export interface WalletConfig {
  walletType: 'snap' | 'hashpack';
  networkType: 'testnet' | 'mainnet';
  accountId?: string;
  autoReconnect?: boolean;
  timeoutMs?: number;
}
````

### Service Class Documentation

````typescript
/**
 * Service for managing Hedera blockchain interactions including HCS logging,
 * HTS token operations, and Custom Compliance Engine integration.
 *
 * @class HederaService
 *
 * @example
 * ```typescript
 * const hederaService = new HederaService({
 *   networkType: 'testnet',
 *   operatorAccountId: '0.0.12345'
 * });
 *
 * // Log product event to HCS
 * const messageId = await hederaService.logProductEvent({
 *   productId: 'CT-2024-001-ABC123',
 *   eventType: 'verified',
 *   actor: { walletAddress: '0.0.67890', role: 'verifier' }
 * });
 * ```
 *
 * @since 1.0.0
 */
export class HederaService {
  /**
   * Creates a new HederaService instance with the specified configuration.
   *
   * @param config - Service configuration including network and operator details
   * @throws {ConfigurationError} When required configuration is missing
   */
  constructor(private config: HederaServiceConfig) {
    // Implementation...
  }
}
````

## Naming Conventions

| Element         | Frontend             | Backend              | Example                             |
| --------------- | -------------------- | -------------------- | ----------------------------------- |
| Components      | PascalCase           | -                    | `ProductVerificationCard.tsx`       |
| Hooks           | camelCase with 'use' | -                    | `useWalletConnection.ts`            |
| API Routes      | -                    | kebab-case           | `/api/product-verification`         |
| Database Tables | -                    | snake_case           | `product_events`                    |
| Service Classes | PascalCase           | PascalCase           | `WalletService`, `HederaService`    |
| Interface Types | PascalCase           | PascalCase           | `ProductWithEvents`, `WalletConfig` |
| Enum Values     | SCREAMING_SNAKE_CASE | SCREAMING_SNAKE_CASE | `VERIFICATION_FAILED`               |

## Additional Documentation Requirements

**Required JSDoc Tags:**

- `@param` - All function parameters with type and description
- `@returns` - Return value description and type
- `@throws` - All possible exceptions with conditions
- `@example` - At least one practical usage example
- `@since` - Version when function was added
- `@see` - References to related functions/documentation

**Critical Documentation Areas:**

- All wallet integration functions (security-critical)
- All Hedera service interactions (blockchain operations)
- All API route handlers (external interfaces)
- All error handling utilities (debugging support)
- All state management actions (predictable state changes)
- All cache management functions (performance-critical)

**Documentation Validation:**

- Use TypeScript `@ts-check` comments to validate JSDoc types
- Include practical examples that can be copy-pasted
- Reference external documentation for Hedera services
- Update documentation immediately when function signatures change

This documentation standard ensures that AI agents have complete context for all critical functions and can generate consistent, well-documented code throughout the ChainTrace codebase.

## API Documentation Generation

**Automated API Documentation:**

- TypeScript interfaces automatically generate OpenAPI specifications
- Swagger UI configured for interactive API exploration
- API documentation hosted at `/docs/api` endpoint
- Automated documentation updates on every deployment

**API Documentation Standards:**

```typescript
/**
 * Product verification endpoint
 *
 * @route GET /api/products/{productId}/verify
 * @param productId - Unique product identifier from QR code or manual entry
 * @returns {ProductVerificationResponse} Complete verification status and journey
 * @throws {404} Product not found in Mirror Node records
 * @throws {500} Hedera service connectivity issues
 * @throws {429} Rate limiting exceeded - try again later
 *
 * @example
 * GET /api/products/PROD-2024-001/verify
 * Response: {
 *   "verified": true,
 *   "status": "COMPLIANT",
 *   "journey": [...]
 * }
 *
 * @security Requires valid wallet signature for regulatory access
 * @ratelimit 100 requests per minute per IP
 */
export async function GET(
  request: Request,
  context: { params: { productId: string } }
) {
  // Implementation...
}
```

## Architecture Decision Records (ADR)

**ADR Template Structure:**

```markdown
# ADR-001: Wallet-First Security Architecture

## Status

Accepted

## Context

ChainTrace requires secure handling of Hedera transactions without storing private keys server-side. Multiple wallet integration options exist (MetaMask Snap, HashPack, WalletConnect).

## Decision

Implement wallet-first architecture delegating all private key operations to user's secure wallet (MetaMask Snap primary, HashPack secondary).

## Consequences

**Positive:**

- Eliminates private key storage security risks
- Industry-standard security practices
- User maintains full control of assets

**Negative:**

- Dependency on wallet availability
- More complex error handling for wallet failures

## Alternatives Considered

1. Server-side key management - Rejected due to security risks
2. Hardware wallet integration - Deferred to post-MVP for complexity

## Implementation Notes

- Graceful degradation when wallet unavailable
- Clear user messaging for wallet connection requirements
- Comprehensive error handling for wallet failures
```

**Required ADRs for ChainTrace:**

- ADR-001: Wallet-First Security Architecture
- ADR-002: Hedera Service Integration Strategy
- ADR-003: Performance Monitoring and Caching Strategy
- ADR-004: Error Handling and Recovery Patterns
- ADR-005: Testing Strategy for Blockchain Integration

**ADR Management:**

- All significant architectural decisions documented as ADRs
- ADRs stored in `/docs/adr/` directory with sequential numbering
- ADR status tracked: Proposed → Under Review → Accepted/Rejected
- ADR reviews required before Epic implementation

## Documentation Maintenance Procedures

**Documentation Update Triggers:**

1. **Code Changes:** Documentation updated in same PR as code changes
2. **API Changes:** Swagger/OpenAPI specs regenerated automatically
3. **Architecture Changes:** ADR created and reviewed before implementation
4. **Deployment Changes:** Environment setup docs updated immediately

**Documentation Quality Gates:**

- All public functions require complete JSDoc documentation
- API endpoints require OpenAPI specification compliance
- Architecture changes require ADR approval
- Documentation builds successfully in CI/CD pipeline

**Documentation Review Process:**

1. Technical accuracy review by team lead
2. Clarity review by different team member
3. Example validation through automated testing
4. Accessibility review for external documentation

This enhanced documentation standard ensures comprehensive, maintainable, and discoverable documentation throughout the ChainTrace development lifecycle.
