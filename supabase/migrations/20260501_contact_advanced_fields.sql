-- =============================================
-- Contacts Advanced Fields — Supabase Migration
-- Adds fields for Market, Classification, and detailed origins
-- =============================================

DO $$
BEGIN
    -- Add market (Nacional / Extranjero)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='market') THEN
        ALTER TABLE contacts ADD COLUMN market TEXT DEFAULT 'Nacional';
    END IF;

    -- Add classification (A+, A, B, C)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='contact_classification') THEN
        ALTER TABLE contacts ADD COLUMN contact_classification TEXT DEFAULT 'B';
    END IF;

    -- Add referred_by_name text field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='referred_by_name') THEN
        ALTER TABLE contacts ADD COLUMN referred_by_name TEXT;
    END IF;

    -- Add origin_details (e.g., Specific portal, specific social media)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='origin_details') THEN
        ALTER TABLE contacts ADD COLUMN origin_details TEXT;
    END IF;
END $$;
