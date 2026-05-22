-- =============================================
-- Office Business Plans & Enhancements
-- Track office-wide monthly goals and add buyer origins
-- =============================================

CREATE TABLE IF NOT EXISTS public.office_business_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    office TEXT NOT NULL DEFAULT 'altitud' CHECK (office IN ('altitud', 'cero')),
    month DATE NOT NULL, -- e.g. 2026-05-01 (1st day of month)
    
    -- Tracked Goals
    new_agents_goal INTEGER DEFAULT 0,
    team_size_goal INTEGER DEFAULT 0,
    active_properties_goal INTEGER DEFAULT 0,
    exclusivity_pct_goal NUMERIC DEFAULT 0,
    days_on_market_goal INTEGER DEFAULT 0,
    
    new_listings_total_goal INTEGER DEFAULT 0,
    new_listings_casa_goal INTEGER DEFAULT 0,
    new_listings_lote_goal INTEGER DEFAULT 0,
    new_listings_finca_goal INTEGER DEFAULT 0,
    new_listings_comercial_goal INTEGER DEFAULT 0,
    
    avg_ticket_goal NUMERIC DEFAULT 0,
    avg_commission_pct_goal NUMERIC DEFAULT 0,
    avg_commission_amount_goal NUMERIC DEFAULT 0,
    
    reservations_goal INTEGER DEFAULT 0,
    transactions_goal INTEGER DEFAULT 0,
    revenue_goal NUMERIC DEFAULT 0,
    portfolio_rotation_goal NUMERIC DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(office, month)
);

-- Enable RLS
ALTER TABLE public.office_business_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can manage office business plans"
    ON public.office_business_plans
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Add buyer origin tracking
ALTER TABLE public.office_reservations ADD COLUMN IF NOT EXISTS buyer_origin TEXT;
ALTER TABLE public.agent_commissions ADD COLUMN IF NOT EXISTS buyer_origin TEXT;
