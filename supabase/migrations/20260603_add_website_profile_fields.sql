-- =============================================
-- Migration: Add Website Profile fields
-- Description: Adds bio_en, bio_es, and video_url to the profiles table.
-- =============================================

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio_en TEXT,
ADD COLUMN IF NOT EXISTS bio_es TEXT,
ADD COLUMN IF NOT EXISTS video_url TEXT;
