-- =============================================
-- Olympia AI Agent Preferences
-- Adds tone, channel, and lifecycle settings to profiles
-- =============================================

DO $$
BEGIN
    -- Add olympia_tone to profiles
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='olympia_tone') THEN
        ALTER TABLE public.profiles ADD COLUMN olympia_tone TEXT DEFAULT 'buffini';
    END IF;

    -- Add olympia_channels to profiles
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='olympia_channels') THEN
        ALTER TABLE public.profiles ADD COLUMN olympia_channels TEXT[] DEFAULT ARRAY['whatsapp'];
    END IF;

    -- Add olympia_lifecycle_enabled to profiles
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='olympia_lifecycle_enabled') THEN
        ALTER TABLE public.profiles ADD COLUMN olympia_lifecycle_enabled BOOLEAN DEFAULT true;
    END IF;
END $$;
