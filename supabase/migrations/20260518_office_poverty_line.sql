-- =============================================
-- Add configurable poverty line to business plans
-- The poverty line is the minimum monthly revenue
-- the office needs per agent to cover operational costs.
-- =============================================

ALTER TABLE public.office_business_plans
  ADD COLUMN IF NOT EXISTS poverty_line NUMERIC DEFAULT 0;

COMMENT ON COLUMN public.office_business_plans.poverty_line IS
  'Monthly minimum revenue threshold per office. Below this line, the office is not covering operational costs.';
