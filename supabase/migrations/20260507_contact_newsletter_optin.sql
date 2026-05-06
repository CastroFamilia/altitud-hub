-- =============================================
-- Contacts Newsletter Opt-In — Supabase Migration
-- Adds newsletter_opt_in boolean field
-- =============================================

DO $$
BEGIN
    -- Add newsletter_opt_in boolean column (default false)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='newsletter_opt_in') THEN
        ALTER TABLE contacts ADD COLUMN newsletter_opt_in BOOLEAN DEFAULT false;
    END IF;
END $$;
