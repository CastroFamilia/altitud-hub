-- =============================================
-- Contacts Social Media Fields — Supabase Migration
-- Adds instagram and linkedin columns
-- =============================================

DO $$
BEGIN
    -- Add social_instagram column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='social_instagram') THEN
        ALTER TABLE contacts ADD COLUMN social_instagram TEXT;
    END IF;

    -- Add social_linkedin column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='social_linkedin') THEN
        ALTER TABLE contacts ADD COLUMN social_linkedin TEXT;
    END IF;
END $$;
