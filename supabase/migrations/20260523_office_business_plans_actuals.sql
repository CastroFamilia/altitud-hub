-- =============================================
-- Add historical outcomes (actuals) to office business plans
-- =============================================

ALTER TABLE public.office_business_plans 
ADD COLUMN IF NOT EXISTS actual_team_size INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS actual_revenue NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS actual_volume NUMERIC DEFAULT NULL;
