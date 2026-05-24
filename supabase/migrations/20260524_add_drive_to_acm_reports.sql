-- Add Google Drive folder columns to acm_reports table
ALTER TABLE public.acm_reports 
ADD COLUMN IF NOT EXISTS drive_folder_id TEXT,
ADD COLUMN IF NOT EXISTS drive_folder_url TEXT;
