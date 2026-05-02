-- =============================================
-- Contacts Pipeline Stages — Supabase Migration
-- Adds the pipeline_stage column to the contacts table
-- =============================================

DO $$
BEGIN
    -- Add pipeline_stage column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='pipeline_stage') THEN
        ALTER TABLE contacts ADD COLUMN pipeline_stage TEXT DEFAULT 'Lead';
    END IF;
END $$;
