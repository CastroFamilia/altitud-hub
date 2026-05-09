-- =============================================
-- REFERRAL MANAGEMENT SYSTEM
-- Tracks referrals sent/received between agents,
-- with configurable fee % (default 25% of gross side),
-- support for external offices, and "Referred by" labels.
-- =============================================

-- ══════════════════════════════════════════════
-- 1. AGENT REFERRALS — Core referral tracking table
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.agent_referrals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Who sends the referral
    referring_agent_id UUID REFERENCES public.profiles(id),
    referring_agent_name TEXT,            -- Denormalized for external agents
    referring_office TEXT,                -- 'altitud', 'cero', or external office name

    -- Who receives the referral
    receiving_agent_id UUID REFERENCES public.profiles(id),
    receiving_agent_name TEXT,            -- Denormalized for external agents
    receiving_office TEXT,                -- 'altitud', 'cero', or external office name

    -- Client being referred
    client_name TEXT NOT NULL,
    client_email TEXT,
    client_phone TEXT,

    -- Property (optional link)
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    property_address TEXT,                -- Free text if no linked property

    -- Referral direction (from the creating agent's perspective)
    direction TEXT NOT NULL DEFAULT 'sent'
      CHECK (direction IN ('sent', 'received')),

    -- Referral fee (configurable, default 25%)
    referral_fee_pct NUMERIC NOT NULL DEFAULT 25,
    referral_fee_amount NUMERIC DEFAULT 0,    -- Calculated: gross_side_amount × fee_pct / 100
    gross_side_amount NUMERIC DEFAULT 0,      -- The gross side amount used for fee calc

    -- Status workflow
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'active', 'closed', 'paid', 'cancelled')),

    -- Commission link (when deal closes)
    commission_id UUID REFERENCES public.agent_commissions(id) ON DELETE SET NULL,

    -- Dates
    closing_date DATE,
    payment_date DATE,

    -- Notes
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_referrals_referring ON public.agent_referrals(referring_agent_id);
CREATE INDEX IF NOT EXISTS idx_referrals_receiving ON public.agent_referrals(receiving_agent_id);
CREATE INDEX IF NOT EXISTS idx_referrals_property ON public.agent_referrals(property_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.agent_referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_direction ON public.agent_referrals(direction);
CREATE INDEX IF NOT EXISTS idx_referrals_closing ON public.agent_referrals(closing_date);

-- ── Auto-update timestamp ──
CREATE OR REPLACE FUNCTION update_referral_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER referral_updated
    BEFORE UPDATE ON public.agent_referrals
    FOR EACH ROW EXECUTE FUNCTION update_referral_timestamp();

-- ── RLS ──
ALTER TABLE public.agent_referrals ENABLE ROW LEVEL SECURITY;

-- Agents see referrals where they are the referring OR receiving agent
CREATE POLICY "Agents view own referrals" ON public.agent_referrals
  FOR SELECT USING (
    referring_agent_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    OR
    receiving_agent_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

-- Agents can create referrals
CREATE POLICY "Agents create referrals" ON public.agent_referrals
  FOR INSERT WITH CHECK (
    referring_agent_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    OR
    receiving_agent_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

-- Agents can update their own referrals
CREATE POLICY "Agents update own referrals" ON public.agent_referrals
  FOR UPDATE USING (
    referring_agent_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    OR
    receiving_agent_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

-- Brokers see all referrals
CREATE POLICY "Brokers view all referrals" ON public.agent_referrals
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'broker')
  );

-- Brokers manage all referrals
CREATE POLICY "Brokers manage all referrals" ON public.agent_referrals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'broker')
  );

-- ══════════════════════════════════════════════
-- 2. PROPERTIES — Add "Referred by" FK
-- ══════════════════════════════════════════════

ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS referred_by_agent_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS referred_by_name TEXT;  -- For external referrals

CREATE INDEX IF NOT EXISTS idx_properties_referred_by ON public.properties(referred_by_agent_id);

-- ══════════════════════════════════════════════
-- 3. PROPERTY INQUIRIES — Add "Referred by" FK
-- ══════════════════════════════════════════════

ALTER TABLE public.property_inquiries ADD COLUMN IF NOT EXISTS referred_by_agent_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.property_inquiries ADD COLUMN IF NOT EXISTS referred_by_name TEXT;

CREATE INDEX IF NOT EXISTS idx_inquiries_referred_by ON public.property_inquiries(referred_by_agent_id);
