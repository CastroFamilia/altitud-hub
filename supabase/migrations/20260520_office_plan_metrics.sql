-- =============================================
-- Add new contacts and showings goals to office business plans
-- =============================================

ALTER TABLE public.office_business_plans 
ADD COLUMN IF NOT EXISTS new_contacts_goal INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS showings_goal INTEGER DEFAULT 0;
