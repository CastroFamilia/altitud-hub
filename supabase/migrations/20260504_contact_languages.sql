-- =============================================
-- Contacts Languages & Market Update — Supabase Migration
-- Adds fields for Primary and Secondary Language
-- =============================================

DO $$
BEGIN
    -- Add primary language
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='primary_language') THEN
        ALTER TABLE contacts ADD COLUMN primary_language TEXT DEFAULT 'Español';
    END IF;

    -- Add secondary language
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='secondary_language') THEN
        ALTER TABLE contacts ADD COLUMN secondary_language TEXT DEFAULT 'Ninguno';
    END IF;
END $$;
