-- =============================================
-- SOLD STATUS, COMMISSION SYSTEM, ANALYTICS & ONBOARDING
-- Comprehensive migration for:
--   1. Sold property status + fields
--   2. Commission split tiers (90/80/60/45%)
--   3. Agent commission tracking
--   4. Listing analytics (page views + daily stats)
--   5. Agent history imports
--   6. Onboarding profile fields
-- =============================================

-- ══════════════════════════════════════════════
-- 1. PROPERTIES — Add 'sold' status + sold fields
-- ══════════════════════════════════════════════

-- Drop and recreate the status CHECK to include 'sold'
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_status_check;
ALTER TABLE public.properties ADD CONSTRAINT properties_status_check
  CHECK (status IN ('draft','pending_approval','needs_changes','approved','published','sold','cancelled'));

-- Sold property fields
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS sold_price NUMERIC;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS sold_date DATE;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS buyer_name TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS buyer_agent TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS buyer_agent_office TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS days_on_market INTEGER;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS import_batch_id UUID;

-- Index for sold properties
CREATE INDEX IF NOT EXISTS idx_properties_sold_date ON public.properties(sold_date);

-- ══════════════════════════════════════════════
-- 2. COMMISSION TIERS — Configurable split levels
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.commission_tiers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    label_es TEXT NOT NULL,
    label_en TEXT NOT NULL,
    agent_split_pct NUMERIC NOT NULL,       -- e.g., 90, 80, 60, 45
    monthly_fee_usd NUMERIC NOT NULL,       -- Before IVA
    iva_pct NUMERIC NOT NULL DEFAULT 13,    -- Costa Rica IVA
    monthly_fee_total NUMERIC GENERATED ALWAYS AS (monthly_fee_usd * (1 + iva_pct / 100)) STORED,
    fee_starts_month INTEGER NOT NULL DEFAULT 6,  -- Month when fee kicks in
    rcca_fee_pct NUMERIC NOT NULL DEFAULT 6,      -- REMAX CCA franchise fee
    sort_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the 4 tiers
INSERT INTO public.commission_tiers (name, label_es, label_en, agent_split_pct, monthly_fee_usd, sort_order) VALUES
  ('premium',  'Premium (90%)',  'Premium (90%)',  90, 1000, 1),
  ('gold',     'Gold (80%)',     'Gold (80%)',     80, 500,  2),
  ('standard', 'Estándar (60%)', 'Standard (60%)', 60, 200,  3),
  ('starter',  'Inicial (45%)',  'Starter (45%)',  45, 75,   4)
ON CONFLICT (name) DO NOTHING;

-- RLS
ALTER TABLE public.commission_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read commission tiers" ON public.commission_tiers
  FOR SELECT USING (true);

CREATE POLICY "Brokers manage commission tiers" ON public.commission_tiers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'broker')
  );

-- ══════════════════════════════════════════════
-- 3. AGENT COMMISSIONS — Per-transaction tracking
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.agent_commissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    agent_id UUID NOT NULL REFERENCES public.profiles(id),
    tier_id UUID REFERENCES public.commission_tiers(id),

    -- Transaction data
    sale_price NUMERIC NOT NULL,
    total_commission_pct NUMERIC NOT NULL DEFAULT 6,   -- Total commission on the sale
    gross_commission NUMERIC NOT NULL,                  -- sale_price × total_commission_pct / 100

    -- Split: listing side vs selling side
    side TEXT NOT NULL DEFAULT 'listing'
      CHECK (side IN ('listing', 'selling', 'both')),
    side_pct NUMERIC NOT NULL DEFAULT 50,              -- % of gross this agent gets (50% if split)
    side_amount NUMERIC NOT NULL,                       -- gross × side_pct / 100

    -- Deductions
    rcca_fee_pct NUMERIC NOT NULL DEFAULT 6,
    rcca_fee_amount NUMERIC NOT NULL,                   -- side_amount × rcca_fee_pct / 100
    after_rcca NUMERIC NOT NULL,                        -- side_amount - rcca_fee_amount

    -- Agent vs Office split
    agent_split_pct NUMERIC NOT NULL,                   -- From tier: 45, 60, 80, or 90
    agent_amount NUMERIC NOT NULL,                      -- after_rcca × agent_split_pct / 100
    office_amount NUMERIC NOT NULL,                     -- after_rcca - agent_amount

    -- Referral (if applicable)
    referral_pct NUMERIC DEFAULT 0,
    referral_amount NUMERIC DEFAULT 0,
    referral_agent TEXT,

    -- Status
    status TEXT DEFAULT 'pending'
      CHECK (status IN ('pending', 'processing', 'paid', 'partial')),
    closing_date DATE,
    payment_date DATE,
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_commissions_agent ON public.agent_commissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_commissions_property ON public.agent_commissions(property_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON public.agent_commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_closing ON public.agent_commissions(closing_date);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_commission_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER commission_updated
    BEFORE UPDATE ON public.agent_commissions
    FOR EACH ROW EXECUTE FUNCTION update_commission_timestamp();

-- RLS
ALTER TABLE public.agent_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents view own commissions" ON public.agent_commissions
  FOR SELECT USING (agent_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Brokers view all commissions" ON public.agent_commissions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'broker')
  );

CREATE POLICY "Brokers manage all commissions" ON public.agent_commissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'broker')
  );

-- ══════════════════════════════════════════════
-- 4. PROFILE ADDITIONS — Commission tier + onboarding
-- ══════════════════════════════════════════════

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS commission_tier_id UUID REFERENCES public.commission_tiers(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS start_date DATE;                -- When the agent started (for fee calculation)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- ══════════════════════════════════════════════
-- 5. AGENT HISTORY IMPORTS — Bulk import tracking
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.agent_history_imports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_profile_id UUID NOT NULL REFERENCES public.profiles(id),
    imported_by UUID NOT NULL REFERENCES public.profiles(id),
    import_type TEXT NOT NULL
      CHECK (import_type IN ('properties_active', 'properties_sold', 'okr_history', 'leads', 'reservas')),
    file_name TEXT,
    total_rows INTEGER DEFAULT 0,
    imported_rows INTEGER DEFAULT 0,
    skipped_rows INTEGER DEFAULT 0,
    error_rows INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.agent_history_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers manage imports" ON public.agent_history_imports
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'broker')
  );

CREATE POLICY "Agents view own imports" ON public.agent_history_imports
  FOR SELECT USING (
    agent_profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

-- ══════════════════════════════════════════════
-- 6. LISTING PAGE VIEWS — Raw analytics events
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.listing_page_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    development_id UUID,
    page_url TEXT NOT NULL,
    referrer TEXT,
    user_agent TEXT,
    ip_hash TEXT,
    country TEXT,
    city TEXT,
    device_type TEXT DEFAULT 'unknown'
      CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'unknown')),
    session_id TEXT,
    duration_seconds INTEGER DEFAULT 0,
    viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_page_views_property ON public.listing_page_views(property_id);
CREATE INDEX IF NOT EXISTS idx_page_views_development ON public.listing_page_views(development_id);
CREATE INDEX IF NOT EXISTS idx_page_views_date ON public.listing_page_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_page_views_session ON public.listing_page_views(session_id);

-- RLS — public insert (tracker script), broker reads
ALTER TABLE public.listing_page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert page views" ON public.listing_page_views
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Brokers view all page views" ON public.listing_page_views
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'broker')
  );

CREATE POLICY "Agents view own property views" ON public.listing_page_views
  FOR SELECT USING (
    property_id IN (SELECT id FROM public.properties WHERE agent_id = auth.uid())
  );

-- ══════════════════════════════════════════════
-- 7. LISTING DAILY STATS — Aggregated analytics
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.listing_daily_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    development_id UUID,
    stat_date DATE NOT NULL,
    total_views INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    avg_duration_seconds INTEGER DEFAULT 0,
    top_referrer TEXT,
    mobile_pct NUMERIC DEFAULT 0,
    desktop_pct NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint per property per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_stats_prop_date
  ON public.listing_daily_stats(property_id, stat_date)
  WHERE property_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_stats_dev_date
  ON public.listing_daily_stats(development_id, stat_date)
  WHERE development_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON public.listing_daily_stats(stat_date);

-- RLS
ALTER TABLE public.listing_daily_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers view all daily stats" ON public.listing_daily_stats
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'broker')
  );

CREATE POLICY "Brokers manage daily stats" ON public.listing_daily_stats
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'broker')
  );

CREATE POLICY "Agents view own property stats" ON public.listing_daily_stats
  FOR SELECT USING (
    property_id IN (SELECT id FROM public.properties WHERE agent_id = auth.uid())
  );
