-- =============================================
-- DEVELOPMENTS MODULE
-- Groups multiple properties under a parent project.
-- Block-based page builder data stored as JSONB.
-- Public landing pages at /d/[slug].
-- =============================================

-- ── 1. Developments Table ──
CREATE TABLE IF NOT EXISTS public.developments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,              -- URL-friendly: "monte-verde", "las-lomas"
    name TEXT NOT NULL,
    tagline_en TEXT,
    tagline_es TEXT,
    logo_url TEXT,                           -- Project logo (uploaded via Drive)
    developer_name TEXT,
    developer_contact TEXT,
    unit_label TEXT DEFAULT 'Lotes'          -- 'Lotes', 'Unidades', 'Apartamentos', 'Casas', 'Locales', or custom
      CHECK (unit_label IS NOT NULL AND unit_label != ''),

    -- Block-based page builder data (ordered array of section objects)
    sections JSONB DEFAULT '[]'::jsonb,

    -- Approval workflow
    status TEXT DEFAULT 'draft'
      CHECK (status IN ('draft', 'pending_approval', 'needs_changes', 'active', 'sold_out', 'archived')),
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.profiles(id),
    broker_notes TEXT,

    -- Ownership
    agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    office_code TEXT,

    -- Drive assets
    drive_folder_id TEXT,
    drive_folder_url TEXT,

    -- SEO / Social sharing
    og_image_url TEXT,                      -- Open Graph image for social media previews

    -- Auto-calculated summary fields (updated via trigger or app logic)
    total_units INTEGER DEFAULT 0,
    available_units INTEGER DEFAULT 0,
    price_range_min NUMERIC,
    price_range_max NUMERIC,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Add FK from properties → developments ──
-- (The column was added in 20260506_properties_full_schema.sql without FK to avoid ordering issues)
ALTER TABLE public.properties
    ADD CONSTRAINT fk_properties_development
    FOREIGN KEY (development_id) REFERENCES public.developments(id) ON DELETE SET NULL;

-- ── 3. Add FK from property_inquiries → developments ──
ALTER TABLE public.property_inquiries
    ADD CONSTRAINT fk_inquiries_development
    FOREIGN KEY (development_id) REFERENCES public.developments(id) ON DELETE SET NULL;

-- ── 4. Page Analytics / Event Tracking ──
CREATE TABLE IF NOT EXISTS public.page_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    development_id UUID REFERENCES public.developments(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL
      CHECK (event_type IN (
        'page_view', 'listing_click', 'whatsapp_click', 'faq_expand',
        'lead_submit', 'gallery_view', 'video_play', 'social_click', 'map_interact'
      )),
    event_meta JSONB DEFAULT '{}'::jsonb,   -- Which listing, which FAQ, which social button, etc.
    referrer TEXT,                           -- Where the visitor came from
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_developments_slug ON public.developments(slug);
CREATE INDEX IF NOT EXISTS idx_developments_status ON public.developments(status);
CREATE INDEX IF NOT EXISTS idx_developments_agent ON public.developments(agent_id);
CREATE INDEX IF NOT EXISTS idx_developments_office ON public.developments(office_code);

CREATE INDEX IF NOT EXISTS idx_page_events_development ON public.page_events(development_id);
CREATE INDEX IF NOT EXISTS idx_page_events_property ON public.page_events(property_id);
CREATE INDEX IF NOT EXISTS idx_page_events_type ON public.page_events(event_type);
CREATE INDEX IF NOT EXISTS idx_page_events_created ON public.page_events(created_at DESC);

-- ── Auto-update timestamp on developments ──
CREATE OR REPLACE FUNCTION update_developments_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER developments_updated
    BEFORE UPDATE ON public.developments
    FOR EACH ROW EXECUTE FUNCTION update_developments_timestamp();

-- ── RLS — Developments ──
ALTER TABLE public.developments ENABLE ROW LEVEL SECURITY;

-- Agents CRUD on own developments
CREATE POLICY "Agents view own developments" ON public.developments FOR SELECT USING (
    agent_id = auth.uid()
);
CREATE POLICY "Agents insert own developments" ON public.developments FOR INSERT
    WITH CHECK (agent_id = auth.uid());
CREATE POLICY "Agents update own developments" ON public.developments FOR UPDATE USING (
    agent_id = auth.uid()
);
CREATE POLICY "Agents delete own developments" ON public.developments FOR DELETE USING (
    agent_id = auth.uid()
);

-- Brokers manage all
CREATE POLICY "Brokers view all developments" ON public.developments FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'broker')
);
CREATE POLICY "Brokers update all developments" ON public.developments FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'broker')
);

-- Public read for active developments (landing pages)
CREATE POLICY "Public read active developments" ON public.developments FOR SELECT USING (
    status = 'active'
);

-- ── RLS — Page Events ──
ALTER TABLE public.page_events ENABLE ROW LEVEL SECURITY;

-- Public can insert events (tracking from landing pages, no auth)
CREATE POLICY "Public can track events" ON public.page_events FOR INSERT
    WITH CHECK (true);

-- Agents view events for their developments/properties
CREATE POLICY "Agents view own events" ON public.page_events FOR SELECT USING (
    development_id IN (SELECT id FROM public.developments WHERE agent_id = auth.uid())
    OR property_id IN (SELECT id FROM public.properties WHERE agent_id = auth.uid())
);

-- Brokers view all events
CREATE POLICY "Brokers view all events" ON public.page_events FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'broker')
);
