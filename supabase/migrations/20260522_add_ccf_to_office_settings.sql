-- Add CCF column to office_settings
ALTER TABLE public.office_settings ADD COLUMN IF NOT EXISTS ccf NUMERIC NOT NULL DEFAULT 1.307;

-- Ensure existing offices are updated to use 1.307
UPDATE public.office_settings SET ccf = 1.307 WHERE ccf IS NULL OR ccf = 0;
