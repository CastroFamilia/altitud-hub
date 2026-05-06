-- =============================================
-- PROPERTIES MODULE — Full Schema Expansion
-- Adds RECONNECT-compatible fields, approval workflow,
-- Drive-based photo workflow, and owner info to the existing properties table.
-- =============================================

-- ── 1. Remove old property_type CHECK constraint (expanding to full RECONNECT list) ──
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_property_type_check;

-- ── 2. Approval Workflow Fields ──
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft'
  CHECK (status IN ('draft', 'pending_approval', 'needs_changes', 'approved', 'published', 'cancelled'));
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS broker_notes TEXT;

-- ── 3. RECONNECT Sync Fields ──
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS reconnect_listing_id INTEGER;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS reconnect_listing_key TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS reconnect_last_sync TIMESTAMPTZ;

-- ── 4. Bilingual Listing Info ──
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS listing_title_en TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS listing_title_es TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS public_remarks_en TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS public_remarks_es TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS private_remarks_en TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS private_remarks_es TEXT;

-- ── 5. Listing Classification ──
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS listing_contract_type INTEGER DEFAULT 1; -- 1=Sale, 2=Rent
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS standard_status_id INTEGER DEFAULT 1;    -- Active, Under Offer, etc.
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS listing_probable_use_id INTEGER DEFAULT 1; -- General, Commercial, Collection
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS property_type_id INTEGER;                -- From RECONNECT Lookups
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS property_general_location_id INTEGER;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS property_new BOOLEAN DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS furnished BOOLEAN DEFAULT false;

-- ── 6. Dates ──
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS listing_contract_date DATE;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS expiration_date DATE;

-- ── 7. Owner Contact Info ──
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS owner_phones TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS owner_email TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS listing_agreement BOOLEAN DEFAULT false;

-- ── 8. Commission ──
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS listing_side_comm NUMERIC DEFAULT 3;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS selling_side_comm NUMERIC DEFAULT 3;

-- ── 9. Geo / Location (RECONNECT IDs) ──
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS country_id INTEGER DEFAULT 52; -- Costa Rica
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS state_dep_prov_id INTEGER;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS location_id INTEGER;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS longitude NUMERIC;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS unparsed_address TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- ── 10. Property Details ──
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS bedrooms_total INTEGER DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS bathrooms_full INTEGER DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS bathrooms_half INTEGER DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS stories INTEGER DEFAULT 1;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS lot_size_area NUMERIC;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS lot_size_units_id INTEGER DEFAULT 1; -- sqm
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS construction_size NUMERIC;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS construction_size_living NUMERIC;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS construction_size_units_id INTEGER DEFAULT 1;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS year_built INTEGER;

-- ── 11. Amenities ──
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS garage BOOLEAN DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS garage_spaces INTEGER DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS garage_covered BOOLEAN DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS pool_private BOOLEAN DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS cooling BOOLEAN DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS has_view BOOLEAN DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS maid_room BOOLEAN DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS gated_community BOOLEAN DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS has_association BOOLEAN DEFAULT false;

-- ── 12. Pricing ──
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS list_price NUMERIC;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS list_price_currency_id INTEGER DEFAULT 2; -- USD
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS list_price_private BOOLEAN DEFAULT false;

-- ── 13. Marketing ──
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS video_link TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS seo_keywords TEXT;

-- ── 14. Office / Internal ──
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS office_code TEXT;

-- ── 15. Drive Photos Workflow ──
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS drive_photos_folder_id TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS drive_photos_folder_url TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS photos_ready BOOLEAN DEFAULT false;

-- ── 16. Development Link (nullable FK — set after developments table exists) ──
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS development_id UUID;

-- ── 17. Performance Indexes ──
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_reconnect_id ON public.properties(reconnect_listing_id);
CREATE INDEX IF NOT EXISTS idx_properties_office ON public.properties(office_code);
CREATE INDEX IF NOT EXISTS idx_properties_development ON public.properties(development_id);

-- ── 18. Broker RLS Policies ──
-- Brokers can view ALL properties (for approval workflow)
CREATE POLICY "Brokers can view all properties"
    ON public.properties FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'broker')
    );

-- Brokers can update ALL properties (to approve/reject)
CREATE POLICY "Brokers can update all properties"
    ON public.properties FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'broker')
    );

-- Team leaders can view team properties
CREATE POLICY "Team leaders can view team properties"
    ON public.properties FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN profiles agent_profile ON agent_profile.auth_user_id = public.properties.agent_id
            WHERE p.auth_user_id = auth.uid()
              AND p.role = 'team_leader'
              AND p.team_id = agent_profile.team_id
        )
    );
