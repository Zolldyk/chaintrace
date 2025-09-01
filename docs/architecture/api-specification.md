# API Specification

Based on the chosen API style (REST + Real-time WebSockets) from the Tech Stack, here's the comprehensive API specification for ChainTrace:

## REST API Specification

```yaml
openapi: 3.0.0
info:
  title: ChainTrace Supply Chain Verification API
  version: 1.0.0
  description: REST API for product verification, cooperative management, and regulatory oversight with Hedera blockchain integration
servers:
  - url: https://chaintrace.vercel.app/api
    description: Production API (Vercel deployment)
  - url: http://localhost:3000/api
    description: Development API (Local Next.js server)

paths:
  /products/{productId}:
    get:
      summary: Get product verification details
      description: Retrieve complete product information including verification status, supply chain journey, and compliance verification credentials
      parameters:
        - name: productId
          in: path
          required: true
          schema:
            type: string
            example: 'CT-2024-001-ABC123'
      responses:
        '200':
          description: Product verification data retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProductWithEvents'
        '404':
          description: Product not found
        '429':
          description: Rate limit exceeded
        '500':
          description: Server error or Hedera service unavailable

  /products:
    post:
      summary: Create new product batch
      description: Log new products to the supply chain (Cooperative Manager role)
      security:
        - WalletAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateProductBatch'
      responses:
        '201':
          description: Product batch created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BatchCreationResponse'
        '400':
          description: Invalid request data
        '401':
          description: Wallet authentication required
        '403':
          description: Insufficient permissions

  /regulatory/compliance-overview:
    get:
      summary: Get regulatory compliance dashboard data
      description: Aggregate verification statistics and compliance flags for regulatory oversight
      security:
        - WalletAuth: []
      parameters:
        - name: region
          in: query
          schema:
            type: string
            example: 'Northern Nigeria'
        - name: timeframe
          in: query
          schema:
            type: string
            enum: [7d, 30d, 90d]
            default: 30d
      responses:
        '200':
          description: Compliance overview data
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ComplianceOverview'
        '403':
          description: Insufficient permissions

components:
  schemas:
    ProductWithEvents:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        category:
          type: string
          enum: [agricultural, processed_food, manufactured, other]
        status:
          type: string
          enum: [created, processing, verified, rejected, expired]
        origin:
          $ref: '#/components/schemas/Location'
        quantity:
          type: object
          properties:
            amount:
              type: number
            unit:
              type: string
              enum: [kg, liters, pieces, tons]
        events:
          type: array
          items:
            $ref: '#/components/schemas/ProductEvent'

    ApiError:
      type: object
      properties:
        error:
          type: object
          properties:
            code:
              type: string
              enum:
                [
                  WALLET_NOT_CONNECTED,
                  INVALID_SIGNATURE,
                  PRODUCT_NOT_FOUND,
                  VERIFICATION_FAILED,
                  HCS_LOGGING_FAILED,
                  RATE_LIMIT_EXCEEDED,
                ]
            message:
              type: string
            timestamp:
              type: string
              format: date-time
            requestId:
              type: string
            suggestedAction:
              type: string
              enum: [retry, check_wallet, contact_support, refresh_page]

  securitySchemes:
    WalletAuth:
      type: http
      scheme: bearer
      description: Hedera wallet signature authentication
      bearerFormat: 'wallet-signature'
```

## Authentication Integration

The API uses **Hedera wallet signature authentication** where:

- Users sign authentication challenges using their connected wallet (Hedera Wallet Snap/HashPack)
- API validates signatures against known wallet addresses for role-based access
- No private keys are transmitted or stored by the API
- Role permissions are determined by wallet address registration in Custom Compliance Engine business rules

## Real-time WebSocket Integration

For live dashboard updates, the API integrates with **Supabase Real-time** channels:

```typescript
// Real-time channel payload specifications
interface WebSocketChannelPayloads {
  'compliance-updates': {
    type: 'compliance_rate_change' | 'new_flagged_product' | 'region_update';
    data: {
      complianceRate?: number;
      flaggedProduct?: {
        productId: string;
        issue: string;
        severity: 'low' | 'medium' | 'high';
      };
    };
    timestamp: string;
  };

  'product-events': {
    type: 'product_created' | 'product_verified' | 'status_changed';
    data: ProductEvent; // Full ProductEvent object
    affectedProductIds: string[];
    timestamp: string;
  };

  'token-rewards': {
    type: 'reward_distributed' | 'batch_rewards_processed';
    data: {
      recipientAddress: string;
      amount: number;
      reason: RewardReason;
      transactionId: string;
      currentNairaValue: number;
    };
    timestamp: string;
  };
}
```
