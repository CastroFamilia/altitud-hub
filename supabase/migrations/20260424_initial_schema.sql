-- =============================================
-- ACM Reports Table — Supabase Migration
-- Run this in Supabase SQL Editor
-- =============================================

-- Table to store all CMA/ACM reports
CREATE TABLE IF NOT EXISTS acm_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Agent info (from REMAX API)
    agent_id INTEGER,                    -- REMAX agent ID
    agent_name TEXT NOT NULL,
    agent_email TEXT,
    agent_phone TEXT,
    agent_photo TEXT,
    office TEXT NOT NULL DEFAULT 'altitud', -- 'altitud' or 'cero'

    -- Auth user (if logged in via Google)
    user_id UUID REFERENCES auth.users(id),

    -- Property classification
    property_category TEXT NOT NULL,     -- 'residential' or 'commercial'
    property_type TEXT NOT NULL,         -- 'casa', 'lote', 'finca', 'condo', 'hotel', 'galpon', 'local', 'negocio'

    -- Location
    property_lat DOUBLE PRECISION,
    property_lng DOUBLE PRECISION,
    property_address TEXT,
    property_district TEXT,
    property_barrio TEXT,

    -- Client info
    client_name TEXT,
    client_phone TEXT,
    client_email TEXT,
    client_residence TEXT,

    -- Property details
    property_finca TEXT,
    property_plano TEXT,
    visit_date DATE,
    listing_price NUMERIC,

    -- Indicators & data (stored as JSONB for flexibility)
    indicators JSONB DEFAULT '{}',       -- Selected indicators + values
    comparables JSONB DEFAULT '[]',      -- Array of comparable data
    comp_images JSONB DEFAULT '[]',      -- Array of image arrays

    -- Analysis results
    suggested_price NUMERIC,
    price_range_low NUMERIC,
    price_range_high NUMERIC,
    agent_notes TEXT,

    -- Status
    status TEXT DEFAULT 'draft',         -- 'draft', 'completed', 'shared'
    pdf_url TEXT                          -- URL to generated PDF if stored
);

-- Index for geo queries (find nearby CMAs)
CREATE INDEX IF NOT EXISTS idx_acm_reports_location
    ON acm_reports USING GIST (
        ST_SetSRID(ST_MakePoint(property_lng, property_lat), 4326)
    );

-- Index for agent lookups
CREATE INDEX IF NOT EXISTS idx_acm_reports_agent ON acm_reports(agent_email);
CREATE INDEX IF NOT EXISTS idx_acm_reports_user ON acm_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_acm_reports_office ON acm_reports(office);

-- RLS policies
ALTER TABLE acm_reports ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (agents creating CMAs)
CREATE POLICY "Anyone can create CMAs"
    ON acm_reports FOR INSERT
    WITH CHECK (true);

-- Authenticated users can read all CMAs (for similarity alerts)
CREATE POLICY "Authenticated users can read all CMAs"
    ON acm_reports FOR SELECT
    USING (true);

-- Users can update their own CMAs
CREATE POLICY "Users can update own CMAs"
    ON acm_reports FOR UPDATE
    USING (user_id = auth.uid() OR user_id IS NULL);

-- Function to find nearby CMAs (for similarity alerts)
CREATE OR REPLACE FUNCTION find_nearby_cmas(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_radius_km DOUBLE PRECISION DEFAULT 2,
    p_type TEXT DEFAULT NULL,
    p_exclude_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    agent_name TEXT,
    property_type TEXT,
    property_lat DOUBLE PRECISION,
    property_lng DOUBLE PRECISION,
    property_address TEXT,
    created_at TIMESTAMPTZ,
    distance_km DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id,
        r.agent_name,
        r.property_type,
        r.property_lat,
        r.property_lng,
        r.property_address,
        r.created_at,
        (ST_DistanceSphere(
            ST_MakePoint(r.property_lng, r.property_lat),
            ST_MakePoint(p_lng, p_lat)
        ) / 1000) AS distance_km
    FROM acm_reports r
    WHERE
        r.property_lat IS NOT NULL
        AND r.property_lng IS NOT NULL
        AND (p_exclude_id IS NULL OR r.id != p_exclude_id)
        AND (p_type IS NULL OR r.property_type = p_type)
        AND ST_DistanceSphere(
            ST_MakePoint(r.property_lng, r.property_lat),
            ST_MakePoint(p_lng, p_lat)
        ) <= (p_radius_km * 1000)
    ORDER BY distance_km ASC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;
