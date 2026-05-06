-- =============================================
-- PROPERTY IMAGES — Drive-based photo management
-- Tracks images synced from Google Drive for each property.
-- =============================================

CREATE TABLE IF NOT EXISTS public.property_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    drive_file_id TEXT,                    -- Google Drive file ID (source of truth)
    reconnect_photo_id INTEGER,            -- ID returned by RECONNECT after upload
    priority INTEGER DEFAULT 0,            -- Display order (0 = main image)
    alt_text TEXT,                          -- Accessibility / SEO
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_property_images_property ON public.property_images(property_id);
CREATE INDEX IF NOT EXISTS idx_property_images_priority ON public.property_images(property_id, priority);
CREATE INDEX IF NOT EXISTS idx_property_images_drive ON public.property_images(drive_file_id);

-- ── Auto-update timestamp ──
CREATE OR REPLACE FUNCTION update_property_images_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER property_images_updated
    BEFORE UPDATE ON public.property_images
    FOR EACH ROW EXECUTE FUNCTION update_property_images_timestamp();

-- ── RLS ──
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;

-- Agents manage images on their own properties
CREATE POLICY "Agents manage own property images" ON public.property_images FOR ALL USING (
    property_id IN (
        SELECT id FROM public.properties WHERE agent_id = auth.uid()
    )
);

-- Brokers can view all property images
CREATE POLICY "Brokers read all property images" ON public.property_images FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'broker')
);

-- Brokers can manage all property images (for approval edits)
CREATE POLICY "Brokers manage all property images" ON public.property_images FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'broker')
);

-- Public read for published properties (for public feeds and landing pages)
CREATE POLICY "Public read images of published properties" ON public.property_images FOR SELECT USING (
    property_id IN (
        SELECT id FROM public.properties WHERE status = 'published'
    )
);
