-- =============================================
-- PROPERTY SYNDICATION & INQUIRY TRACKING
-- Tracks where each property is published (portals)
-- and incoming leads from those portals.
-- =============================================

-- ── 1. Syndication Status per Portal ──
CREATE TABLE IF NOT EXISTS public.property_syndication (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    portal_name TEXT NOT NULL,             -- 'reconnect', 'encuentra24', 'chozi', 'listglobally', etc.
    portal_listing_id TEXT,                -- External ID on the portal
    portal_listing_url TEXT,               -- Direct link to the listing on that portal
    status TEXT DEFAULT 'pending'
      CHECK (status IN ('pending', 'synced', 'error', 'removed')),
    last_synced_at TIMESTAMPTZ,
    error_message TEXT,
    inquiry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(property_id, portal_name)       -- One record per property per portal
);

-- ── 2. Inquiries / Leads from Portals ──
CREATE TABLE IF NOT EXISTS public.property_inquiries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    development_id UUID,                   -- FK set after developments table exists
    portal_name TEXT,                       -- 'reconnect', 'encuentra24', 'development_page', etc.
    lead_name TEXT,
    lead_email TEXT,
    lead_phone TEXT,
    message TEXT,
    referrer TEXT,                          -- URL or source that brought the lead
    received_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_agent_id UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'new'
      CHECK (status IN ('new', 'contacted', 'converted', 'dismissed')),
    notes TEXT,                             -- Agent's internal notes on the lead
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_syndication_property ON public.property_syndication(property_id);
CREATE INDEX IF NOT EXISTS idx_syndication_portal ON public.property_syndication(portal_name);
CREATE INDEX IF NOT EXISTS idx_syndication_status ON public.property_syndication(status);

CREATE INDEX IF NOT EXISTS idx_inquiries_property ON public.property_inquiries(property_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_development ON public.property_inquiries(development_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_agent ON public.property_inquiries(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON public.property_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_received ON public.property_inquiries(received_at DESC);

-- ── Auto-update timestamps ──
CREATE OR REPLACE FUNCTION update_syndication_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER syndication_updated
    BEFORE UPDATE ON public.property_syndication
    FOR EACH ROW EXECUTE FUNCTION update_syndication_timestamp();

CREATE OR REPLACE FUNCTION update_inquiry_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inquiry_updated
    BEFORE UPDATE ON public.property_inquiries
    FOR EACH ROW EXECUTE FUNCTION update_inquiry_timestamp();

-- ── RLS ──
ALTER TABLE public.property_syndication ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_inquiries ENABLE ROW LEVEL SECURITY;

-- Syndication: agents see their own, brokers see all
CREATE POLICY "Agents view own syndication" ON public.property_syndication FOR SELECT USING (
    property_id IN (SELECT id FROM public.properties WHERE agent_id = auth.uid())
);
CREATE POLICY "Brokers view all syndication" ON public.property_syndication FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'broker')
);
CREATE POLICY "Brokers manage all syndication" ON public.property_syndication FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'broker')
);

-- Inquiries: agents see their assigned, brokers see all
CREATE POLICY "Agents view own inquiries" ON public.property_inquiries FOR SELECT USING (
    assigned_agent_id = auth.uid()
);
CREATE POLICY "Agents update own inquiries" ON public.property_inquiries FOR UPDATE USING (
    assigned_agent_id = auth.uid()
);
CREATE POLICY "Brokers view all inquiries" ON public.property_inquiries FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'broker')
);
CREATE POLICY "Brokers manage all inquiries" ON public.property_inquiries FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'broker')
);

-- Public insert for webhook/lead form submissions (no auth needed)
CREATE POLICY "Public can submit inquiries" ON public.property_inquiries FOR INSERT
    WITH CHECK (true);
