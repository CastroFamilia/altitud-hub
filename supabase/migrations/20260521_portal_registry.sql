-- =============================================
-- PORTAL REGISTRY & SYNDICATION ENHANCEMENTS
-- Dynamic, admin-configurable portal catalog
-- + stats columns for per-portal analytics
-- =============================================

-- ── 1. Portal Registry ──
-- Single source of truth for which portals exist.
-- Broker/admin manages this via the Office Panel.
-- Agents see portal list dynamically from this table.
CREATE TABLE IF NOT EXISTS public.portal_registry (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,              -- 'reconnect', 'encuentra24', etc.
    display_name TEXT NOT NULL,             -- Human-readable name
    icon_emoji TEXT DEFAULT '🌐',           -- Quick visual identifier
    color_class TEXT,                       -- Tailwind color classes for UI badges
    url_base TEXT,                          -- Portal home URL
    category TEXT DEFAULT 'manual'          -- 'manual' | 'auto_feed' | 'on_request'
      CHECK (category IN ('manual', 'auto_feed', 'on_request')),
    has_stats_api BOOLEAN DEFAULT false,    -- Can we pull stats programmatically?
    is_active BOOLEAN DEFAULT true,         -- Soft delete / toggle
    display_order INTEGER DEFAULT 100,      -- Sort order in agent panel
    office_scope TEXT DEFAULT 'all'         -- 'altitud' | 'cero' | 'all'
      CHECK (office_scope IN ('altitud', 'cero', 'all')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Extend property_syndication with stats + tracking ──
ALTER TABLE public.property_syndication
  ADD COLUMN IF NOT EXISTS listing_views INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS interested_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS days_listed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stats_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_by UUID,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add 'requested' status for on_request portals (e.g. JamesEdition)
ALTER TABLE public.property_syndication
  DROP CONSTRAINT IF EXISTS property_syndication_status_check;

ALTER TABLE public.property_syndication
  ADD CONSTRAINT property_syndication_status_check
  CHECK (status IN ('pending', 'requested', 'synced', 'error', 'removed'));

-- ── 3. Seed portal registry with all known portals ──
INSERT INTO public.portal_registry (slug, display_name, icon_emoji, color_class, url_base, category, has_stats_api, display_order, office_scope) VALUES
  ('reconnect',           'REMAX RECONNECT',          '🔵', 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',     'https://remax-centralamerica.com', 'manual', true,  1,  'all'),
  ('remax_costa_rica',    'remax-costa-rica.com',       '🔴', 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',          'https://remax-costa-rica.com',     'manual', false, 2,  'all'),
  ('remax_altitud',       'remax-altitud.cr',           '🏔️', 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400', 'https://remax-altitud.cr',      'manual', false, 3,  'altitud'),
  ('yourhome_cr',         'YourHomeInCostaRica.com',    '🏡', 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400', 'https://yourhomeincostarica.com', 'manual', false, 4, 'all'),
  ('james_edition',       'JamesEdition',               '👑', 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',  'https://jamesedition.com',         'on_request', false, 5, 'all'),
  ('realtor_com',         'Realtor.com',                '🏠', 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400',           'https://realtor.com',              'manual', false, 6, 'all'),
  ('chozi',               'Chozi.com',                  '🟠', 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400', 'https://chozi.com',             'manual', false, 7, 'all'),
  ('crcasas',             'CRCasas',                    '🌐', 'bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400',       'https://crcasas.com',              'manual', false, 8, 'all'),
  ('anuntico',            'Anuntico',                   '🌐', 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400', 'https://anuntico.com',           'manual', false, 9, 'all'),
  ('buscocasita',         'BuscoCasita',                '🌐', 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400',       'https://buscocasita.com',          'manual', false, 10, 'all'),
  ('4321_property',       '4321 Property',              '🌐', 'bg-slate-50 text-slate-600 dark:bg-slate-900/20 dark:text-slate-400',   'https://4321property.com',         'manual', false, 11, 'all'),
  ('expat_com',           'Expat.com',                  '✈️', 'bg-lime-50 text-lime-600 dark:bg-lime-900/20 dark:text-lime-400',       'https://expat.com',                'manual', false, 12, 'all'),
  ('bienes_online',       'Bienes Online',              '🌐', 'bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-900/20 dark:text-fuchsia-400', 'https://bienesonline.com',   'manual', false, 13, 'all'),
  ('terra_costa_rica',    'Terra Costa Rica',            '🌴', 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',  'https://terracostarica.com',       'manual', false, 14, 'all'),
  ('propiedades_cr',      'Propiedades.cr',              '🌐', 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',      'https://propiedades.cr',           'manual', false, 15, 'all'),
  ('facebook_marketplace','Facebook Marketplace',        '📘', 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',      'https://facebook.com/marketplace',  'manual', false, 16, 'all')
ON CONFLICT (slug) DO NOTHING;

-- ── 4. Auto-update timestamps ──
CREATE OR REPLACE FUNCTION update_portal_registry_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS portal_registry_updated ON public.portal_registry;

CREATE TRIGGER portal_registry_updated
    BEFORE UPDATE ON public.portal_registry
    FOR EACH ROW EXECUTE FUNCTION update_portal_registry_timestamp();

-- ── 5. Indexes ──
CREATE INDEX IF NOT EXISTS idx_portal_registry_active ON public.portal_registry(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_portal_registry_slug ON public.portal_registry(slug);
CREATE INDEX IF NOT EXISTS idx_syndication_stats ON public.property_syndication(portal_name, status) WHERE status = 'synced';

-- ── 6. RLS ──
ALTER TABLE public.portal_registry ENABLE ROW LEVEL SECURITY;

-- Everyone can read the portal registry
DROP POLICY IF EXISTS "Anyone can view portal registry" ON public.portal_registry;
CREATE POLICY "Anyone can view portal registry" ON public.portal_registry FOR SELECT USING (true);

-- Only brokers can manage
DROP POLICY IF EXISTS "Brokers manage portal registry" ON public.portal_registry;
CREATE POLICY "Brokers manage portal registry" ON public.portal_registry FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role IN ('broker', 'admin'))
);

-- Allow broker INSERT/UPDATE on property_syndication (they manage all links)
DROP POLICY IF EXISTS "Brokers insert syndication" ON public.property_syndication;
CREATE POLICY "Brokers insert syndication" ON public.property_syndication FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role IN ('broker', 'admin'))
);

-- Allow agents to insert syndication requests (for on_request portals)
DROP POLICY IF EXISTS "Agents request syndication" ON public.property_syndication;
CREATE POLICY "Agents request syndication" ON public.property_syndication FOR INSERT WITH CHECK (
    status = 'requested'
    AND property_id IN (SELECT id FROM public.properties WHERE agent_id = auth.uid())
);

-- ── 7. Missing Relationships ──
-- Add missing foreign key constraint from property_inquiries to properties
ALTER TABLE public.property_inquiries
  DROP CONSTRAINT IF EXISTS fk_inquiries_property,
  ADD CONSTRAINT fk_inquiries_property
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;

