# Database Schema

Transforming the conceptual data models into concrete Supabase PostgreSQL schemas optimized for performance, caching, and real-time subscriptions:

## Products Table

```sql
-- Enhanced products table with both approaches for different use cases
CREATE TABLE products (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('agricultural', 'processed_food', 'manufactured', 'other')),
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'processing', 'verified', 'rejected', 'expired')),

    -- Separate columns for efficient aggregation queries
    quantity_amount DECIMAL(12,3) NOT NULL CHECK (quantity_amount > 0),
    quantity_unit TEXT NOT NULL CHECK (quantity_unit IN ('kg', 'liters', 'pieces', 'tons')),

    -- JSONB for backward compatibility and complex queries
    quantity JSONB GENERATED ALWAYS AS (
        json_build_object('amount', quantity_amount, 'unit', quantity_unit)
    ) STORED,

    -- Location with separate coordinates for spatial queries
    origin JSONB NOT NULL,
    origin_latitude DECIMAL(10,8) GENERATED ALWAYS AS ((origin->'coordinates'->>'latitude')::decimal) STORED,
    origin_longitude DECIMAL(11,8) GENERATED ALWAYS AS ((origin->'coordinates'->>'longitude')::decimal) STORED,

    -- Proper foreign key constraint
    cooperative_id TEXT NOT NULL REFERENCES cooperatives(id) ON DELETE RESTRICT,

    -- Hedera integration fields
    guardian_credential_id TEXT,
    hcs_topic_id TEXT NOT NULL,
    qr_code TEXT NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Performance-critical indexes for sub-30 second verification
CREATE INDEX idx_products_id_hash ON products USING hash(id); -- O(1) lookup for verification
CREATE INDEX idx_products_batch_id ON products(batch_id); -- Batch operations
CREATE INDEX idx_products_status ON products(status); -- Compliance dashboard filtering
CREATE INDEX idx_products_cooperative ON products(cooperative_id); -- Manager dashboard
CREATE INDEX idx_products_quantity_amount ON products(quantity_amount) WHERE quantity_unit = 'kg';
CREATE INDEX idx_products_coordinates ON products(origin_latitude, origin_longitude);
```

## Product Events Table

```sql
-- Immutable audit trail of supply chain events
CREATE TABLE product_events (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('created', 'processed', 'quality_check', 'transported', 'verified', 'rejected')),

    -- Actor information as JSONB for flexibility
    actor JSONB NOT NULL, -- { id, name, role, organization, walletAddress }

    -- Event location and timing
    timestamp TIMESTAMPTZ NOT NULL,
    location JSONB NOT NULL, -- Same structure as product origin

    -- Event-specific data (processing details, quality metrics, etc.)
    data JSONB DEFAULT '{}'::jsonb,

    -- Hedera blockchain references
    hcs_message_id TEXT NOT NULL,
    signature TEXT NOT NULL,

    -- Immutable - no updated_at timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for event timeline reconstruction and analysis
CREATE INDEX idx_product_events_product_id ON product_events(product_id);
CREATE INDEX idx_product_events_timestamp ON product_events(timestamp DESC);
CREATE INDEX idx_product_events_type ON product_events(event_type);
CREATE INDEX idx_product_events_product_timestamp ON product_events(product_id, timestamp DESC);
```

## Cooperatives Table

```sql
-- Producer organization information
CREATE TABLE cooperatives (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    registration_number TEXT UNIQUE NOT NULL,

    -- Location data consistent with products table
    location JSONB NOT NULL,
    contact_info JSONB DEFAULT '{}'::jsonb, -- { email?, phone?, website? }

    -- Manager wallet for authentication
    manager_wallet_address TEXT NOT NULL,

    -- Operational metrics
    member_count INTEGER DEFAULT 0 CHECK (member_count >= 0),
    products_logged INTEGER DEFAULT 0 CHECK (products_logged >= 0),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for cooperative management
CREATE INDEX idx_cooperatives_manager_wallet ON cooperatives(manager_wallet_address);
CREATE INDEX idx_cooperatives_location_state ON cooperatives USING gin((location->>'state'));
CREATE INDEX idx_cooperatives_registration ON cooperatives(registration_number);
```

## Token Rewards Table

```sql
-- HTS token distribution tracking
CREATE TABLE token_rewards (
    id TEXT PRIMARY KEY,
    recipient_address TEXT NOT NULL, -- Hedera wallet address
    amount NUMERIC(18,8) NOT NULL CHECK (amount > 0), -- Token amount with precision
    reason TEXT NOT NULL CHECK (reason IN ('product_verification', 'quality_feedback', 'compliance_reporting', 'batch_logging')),

    -- Optional product association
    product_id TEXT REFERENCES products(id) ON DELETE SET NULL,

    -- Hedera transaction details
    transaction_id TEXT NOT NULL UNIQUE,

    -- Value conversion for UX (with staleness handling)
    token_to_naira_rate NUMERIC(10,4), -- Rate at time of distribution
    estimated_naira_value NUMERIC(12,2), -- Calculated: amount * rate

    distributed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for reward history and analytics
CREATE INDEX idx_token_rewards_recipient ON token_rewards(recipient_address);
CREATE INDEX idx_token_rewards_distributed_at ON token_rewards(distributed_at DESC);
CREATE INDEX idx_token_rewards_recipient_distributed ON token_rewards(recipient_address, distributed_at DESC);
```

## Cache Tables and Real-time Configuration

```sql
-- Mirror Node response caching for sub-30 second verification
CREATE TABLE mirror_node_cache (
    cache_key TEXT PRIMARY KEY, -- product_id or query hash
    response_data JSONB NOT NULL,
    cached_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    hit_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMPTZ DEFAULT NOW()
);

-- Compliance metrics cache for regulatory dashboard
CREATE TABLE compliance_cache (
    region TEXT NOT NULL,
    timeframe TEXT NOT NULL, -- '7d', '30d', '90d'
    total_products INTEGER NOT NULL,
    verified_products INTEGER NOT NULL,
    compliance_rate NUMERIC(5,2) NOT NULL, -- Percentage with 2 decimal places
    flagged_products JSONB DEFAULT '[]'::jsonb, -- Array of flagged product objects

    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,

    PRIMARY KEY (region, timeframe)
);

-- Enhanced RLS policies with proper JWT claim validation
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public product verification access" ON products
    FOR SELECT USING (true); -- Consumer verification is always public

CREATE POLICY "Cooperative manager full access" ON products
    FOR ALL USING (
        cooperative_id IN (
            SELECT id FROM cooperatives
            WHERE manager_wallet_address = auth.jwt() ->> 'wallet_address'
        )
        AND auth.jwt() ->> 'role' = 'cooperative_manager'
    );

-- Real-time publication setup
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE product_events;
ALTER PUBLICATION supabase_realtime ADD TABLE compliance_cache;
```

## Enhanced Trigger with Load Management

```sql
-- Enhanced trigger with load management and batching
CREATE OR REPLACE FUNCTION trigger_compliance_update()
RETURNS TRIGGER AS $$
DECLARE
    should_notify BOOLEAN := true;
    last_notification TIMESTAMPTZ;
BEGIN
    -- Rate limiting: only notify once per second per region to prevent spam
    SELECT last_notified INTO last_notification
    FROM compliance_notification_throttle
    WHERE region = COALESCE(NEW.origin->>'region', OLD.origin->>'region')
    FOR UPDATE SKIP LOCKED;

    IF last_notification IS NOT NULL AND
       last_notification > NOW() - INTERVAL '1 second' THEN
        should_notify := false;
    END IF;

    IF should_notify THEN
        -- Throttled notification with batching support
        PERFORM pg_notify('compliance_update',
            json_build_object(
                'region', COALESCE(NEW.origin->>'region', OLD.origin->>'region'),
                'action', TG_OP,
                'timestamp', extract(epoch from NOW())
            )::text
        );

        -- Update throttle table
        INSERT INTO compliance_notification_throttle (region, last_notified)
        VALUES (COALESCE(NEW.origin->>'region', OLD.origin->>'region'), NOW())
        ON CONFLICT (region)
        DO UPDATE SET last_notified = NOW();
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_compliance_update
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW
    EXECUTE FUNCTION trigger_compliance_update();

-- Throttle table to prevent notification spam
CREATE TABLE compliance_notification_throttle (
    region TEXT PRIMARY KEY,
    last_notified TIMESTAMPTZ NOT NULL,
    notification_count INTEGER DEFAULT 0
);
```
