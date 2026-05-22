-- =============================================
-- Olympia Proactive Alerts
-- Adds fields to contacts and profiles for follow-up logic
-- =============================================

DO $$
BEGIN
    -- Add birth_date to contacts
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='birth_date') THEN
        ALTER TABLE public.contacts ADD COLUMN birth_date DATE;
    END IF;

    -- Add move_in_date to contacts
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='move_in_date') THEN
        ALTER TABLE public.contacts ADD COLUMN move_in_date DATE;
    END IF;

    -- Add preferred_follow_up_days to profiles
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='preferred_follow_up_days') THEN
        ALTER TABLE public.profiles ADD COLUMN preferred_follow_up_days TEXT[] DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    END IF;
END $$;
