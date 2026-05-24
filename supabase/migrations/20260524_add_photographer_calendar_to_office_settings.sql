-- Add photographer_calendar_url column to public.office_settings
ALTER TABLE public.office_settings 
ADD COLUMN IF NOT EXISTS photographer_calendar_url TEXT;

-- Seed default Google Calendar URL for existing offices
UPDATE public.office_settings 
SET photographer_calendar_url = 'https://calendar.app.google/yYSUgBYr6Zv7Wrgn9' 
WHERE photographer_calendar_url IS NULL OR photographer_calendar_url = '';
