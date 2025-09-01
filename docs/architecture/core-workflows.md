# Core Workflows

The following sequence diagrams illustrate key system workflows showing component interactions, external API integrations, and error handling paths:

## Consumer Product Verification Workflow

```mermaid
sequenceDiagram
    participant C as Consumer
    participant UI as Frontend App
    participant API as API Client Service
    participant Cache as Data Caching Layer
    participant Mirror as Mirror Node API
    participant Supabase as Supabase DB

    C->>UI: Scan QR Code / Enter Product ID
    UI->>UI: Validate Product ID Format

    alt QR Code Scanning
        UI->>UI: Initialize Camera with @zxing/browser
        UI->>UI: Decode QR → Extract Product ID
    end

    UI->>API: GET /products/{productId}
    API->>Cache: Check cached product data

    alt Cache Hit (< 30s old)
        Cache-->>API: Return cached product + events
        API-->>UI: Product verification data
        UI-->>C: Display verification status instantly
    else Cache Miss or Stale
        API->>Mirror: GET /api/v1/topics/{topicId}/messages

        alt Mirror Node Success
            Mirror-->>API: HCS messages + compliance credentials
            API->>Cache: Store response with TTL=300s
            Cache-->>Supabase: Persist for real-time sync
            API-->>UI: Complete product journey data
            UI-->>C: Show verification timeline + status
        else Mirror Node Timeout/Error
            API->>Cache: Retrieve stale cached data
            Cache-->>API: Last known product state
            API-->>UI: Cached data + "refreshing" indicator
            UI-->>C: Show available data + retry option
        end
    end

    Note over C,Supabase: Sub-30 second verification requirement<br/>met through cache-first strategy
```

## Token Reward Distribution with Automated Retry

```mermaid
sequenceDiagram
    participant V as Verifier
    participant UI as Frontend App
    participant Wallet as Wallet Integration
    participant API as API Client Service
    participant HTS as Hedera Token Service
    participant Monitor as Error Handling Service

    V->>UI: Complete product verification action
    UI->>API: POST /products/{id}/events (verification)

    par Automatic Reward Distribution
        API->>HTS: Transfer tokens to verifier wallet

        alt HTS Transaction Success
            HTS-->>API: Transaction ID + confirmation
            API-->>UI: Verification complete + reward received
            UI-->>V: Success notification with token amount
        else HTS Transient Failure (Network/Timeout)
            HTS-->>API: Transient error (network timeout, node busy)
            Monitor->>Monitor: Detect transient failure pattern

            Note over API,Monitor: Automated retry with exponential backoff
            API->>API: Wait 2 seconds (exponential: 2s, 4s, 8s)
            API->>HTS: Retry token distribution (attempt 2/3)

            alt Retry Success
                HTS-->>API: Transaction successful on retry
                API-->>UI: Reward distributed (delayed)
                UI-->>V: "Reward processed successfully (retried)"
            else All Retries Exhausted
                API-->>UI: Reward distribution failed + manual retry
                UI-->>V: "Auto-retry failed. Retry manually?"
            end
        else HTS Permanent Failure (Insufficient Balance, Policy)
            HTS-->>API: Permanent error (account frozen, policy violation)
            API-->>UI: Reward distribution failed + error details
            UI-->>V: Clear error message + support contact
        end
    end
```

## Regulatory Dashboard with Cache-Aside Pattern

```mermaid
sequenceDiagram
    participant R as Regulatory Officer
    participant UI as Frontend App
    participant API as API Client Service
    participant Analytics as Compliance Analytics
    participant Cache as Data Caching Layer
    participant Supabase as Supabase Real-time

    R->>UI: Access regulatory dashboard

    par Cache-Aside Initial Load
        UI->>Analytics: GET /regulatory/compliance-overview
        Analytics->>Cache: Get cached compliance data
        Cache-->>Analytics: Cached data (may be stale)
        Analytics-->>UI: Immediate response with cached data
        UI-->>R: Show dashboard instantly (cached data)

        Note over Analytics,Cache: Background refresh begins
        Analytics->>Analytics: Fetch fresh data from Mirror Node
        Analytics->>Analytics: Calculate current compliance rates

        alt Fresh Data Different from Cache
            Analytics->>Cache: Update cache with fresh data
            Analytics->>UI: WebSocket update with fresh data
            UI->>UI: Smoothly animate data changes
            UI-->>R: Updated dashboard with latest data
        end
    end

    par Force Refresh Capability
        R->>UI: Click "Refresh Data" button
        UI->>Analytics: GET /regulatory/compliance-overview?force=true
        Analytics->>Analytics: Bypass cache, fetch live data
        Analytics-->>UI: Latest compliance data
        UI-->>R: "Data refreshed" confirmation
    end

    Note over R,Cache: Cache-aside ensures instant dashboard<br/>availability with eventual consistency
```
