-- Migration: Add compliance credentials tables
-- Description: Create tables for storing compliance credentials and timeline entries
-- Version: 003

-- Create compliance_credentials table
CREATE TABLE IF NOT EXISTS public.compliance_credentials (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    issuer TEXT NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    status TEXT NOT NULL CHECK (status IN ('issued', 'active', 'expired', 'revoked')),
    credential_type TEXT NOT NULL CHECK (credential_type IN ('supply_chain', 'carbon_credit', 'regulatory_compliance')),
    metadata JSONB NOT NULL DEFAULT '{}',
    signature TEXT NOT NULL,
    hcs_message_id TEXT NOT NULL,
    transaction_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create credential_timeline table for tracking credential events
CREATE TABLE IF NOT EXISTS public.credential_timeline (
    id TEXT PRIMARY KEY,
    credential_id TEXT NOT NULL REFERENCES public.compliance_credentials(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('issued', 'activated', 'expired', 'revoked', 'verified')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor TEXT,
    description TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_compliance_credentials_product_id ON public.compliance_credentials(product_id);
CREATE INDEX IF NOT EXISTS idx_compliance_credentials_status ON public.compliance_credentials(status);
CREATE INDEX IF NOT EXISTS idx_compliance_credentials_credential_type ON public.compliance_credentials(credential_type);
CREATE INDEX IF NOT EXISTS idx_compliance_credentials_issued_at ON public.compliance_credentials(issued_at);
CREATE INDEX IF NOT EXISTS idx_compliance_credentials_expires_at ON public.compliance_credentials(expires_at);

CREATE INDEX IF NOT EXISTS idx_credential_timeline_credential_id ON public.credential_timeline(credential_id);
CREATE INDEX IF NOT EXISTS idx_credential_timeline_event_type ON public.credential_timeline(event_type);
CREATE INDEX IF NOT EXISTS idx_credential_timeline_timestamp ON public.credential_timeline(timestamp);

-- Create update trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_compliance_credentials_updated_at
    BEFORE UPDATE ON public.compliance_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add Row Level Security (RLS) policies if needed
-- ALTER TABLE public.compliance_credentials ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.credential_timeline ENABLE ROW LEVEL SECURITY;

-- Grant appropriate permissions
-- These would be customized based on your application's security requirements
-- GRANT SELECT, INSERT, UPDATE, DELETE ON public.compliance_credentials TO anon;
-- GRANT SELECT, INSERT ON public.credential_timeline TO anon;