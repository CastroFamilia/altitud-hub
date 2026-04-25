-- =============================================
-- Business Plans Table — Supabase Migration
-- "Mi Plan de Negocio" — One active plan per agent
-- =============================================

CREATE TABLE IF NOT EXISTS business_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Agent identity
    agent_email TEXT NOT NULL UNIQUE,     -- One plan per agent (email is unique key)
    agent_name TEXT,
    office TEXT DEFAULT 'altitud',        -- 'altitud' or 'cero'

    -- Auth user (if logged in via Google)
    user_id UUID REFERENCES auth.users(id),

    -- Step 1: Para Qué (motivation)
    para_que TEXT,                         -- Free-text motivation/purpose

    -- Step 2: Living Expenses
    currency TEXT DEFAULT 'CRC',           -- 'CRC' or 'USD'
    exchange_rate NUMERIC DEFAULT 457,     -- CRC per USD (from BCCR API)
    living_expenses JSONB DEFAULT '[]',    -- Array of {category, label, amount}
    total_living_monthly NUMERIC DEFAULT 0,

    -- Step 3: Business Expenses
    business_expenses JSONB DEFAULT '[]',  -- Array of {category, label, amount, annual, monthly}
    total_business_monthly NUMERIC DEFAULT 0,

    -- Step 4: Goals
    goals JSONB DEFAULT '[]',             -- Array of {name, emoji, total, months, monthly}
    total_goals_monthly NUMERIC DEFAULT 0,

    -- Grand totals
    grand_total_monthly NUMERIC DEFAULT 0,
    grand_total_monthly_usd NUMERIC DEFAULT 0,

    -- Step 5: Zone Data
    avg_ticket NUMERIC DEFAULT 0,         -- Average property price in zone
    ticket_currency TEXT DEFAULT 'USD',    -- Currency for ticket
    commission_pct NUMERIC DEFAULT 5,     -- Total commission %
    agent_split_pct NUMERIC DEFAULT 50,   -- Agent's share of commission %
    commission_per_close NUMERIC DEFAULT 0,
    closes_needed_monthly NUMERIC DEFAULT 0,

    -- Conversion Ratios (agent-specific, future: office averages)
    conversion_ratios JSONB DEFAULT '{
        "calls_to_prelisting": 0.15,
        "prelisting_to_acm": 0.65,
        "acm_to_listing": 0.75,
        "listing_to_capture": 0.65,
        "capture_to_close": 0.50
    }',

    -- Calculated targets (output of the wizard)
    monthly_targets JSONB DEFAULT '{}',
    weekly_targets JSONB DEFAULT '{}',

    -- Status
    status TEXT DEFAULT 'draft',          -- 'draft', 'active'
    completed_at TIMESTAMPTZ             -- When plan was first activated
);

-- Index for agent lookups
CREATE INDEX IF NOT EXISTS idx_business_plans_agent ON business_plans(agent_email);
CREATE INDEX IF NOT EXISTS idx_business_plans_user ON business_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_business_plans_office ON business_plans(office);

-- RLS policies
ALTER TABLE business_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create plans"
    ON business_plans FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Anyone can read plans"
    ON business_plans FOR SELECT
    USING (true);

CREATE POLICY "Users can update own plans"
    ON business_plans FOR UPDATE
    USING (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_business_plan_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER business_plans_updated
    BEFORE UPDATE ON business_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_business_plan_timestamp();
