-- =============================================
-- Yearly Business Plans & Broker Alert Policies
-- Migrates business_plans to support one plan per agent per year
-- =============================================

-- 1. Add new columns to business_plans if they don't exist
ALTER TABLE public.business_plans ADD COLUMN IF NOT EXISTS plan_year INTEGER DEFAULT 2026;
ALTER TABLE public.business_plans ADD COLUMN IF NOT EXISTS monthly_targets_by_month JSONB DEFAULT '[]';
ALTER TABLE public.business_plans ADD COLUMN IF NOT EXISTS target_portfolio_size NUMERIC DEFAULT 25;
ALTER TABLE public.business_plans ADD COLUMN IF NOT EXISTS plan_start_date TEXT;

-- 2. Populate plan_year from plan_start_date if possible, default to 2026
UPDATE public.business_plans
SET plan_year = COALESCE(
  NULLIF(SUBSTRING(plan_start_date FROM 1 FOR 4), ''),
  '2026'
)::INTEGER
WHERE plan_year IS NULL OR plan_year = 2026;

-- 3. Transition unique constraint from single plan to yearly composite unique key
-- First, drop the old inline UNIQUE constraint
ALTER TABLE public.business_plans DROP CONSTRAINT IF EXISTS business_plans_agent_email_key;

-- Add the composite UNIQUE constraint
ALTER TABLE public.business_plans ADD CONSTRAINT business_plans_agent_year_idx UNIQUE (agent_email, plan_year);

-- 4. Enable brokers to insert notifications for agents (fixes RLS issue)
DROP POLICY IF EXISTS "Brokers can insert notifications for anyone" ON public.notifications;
CREATE POLICY "Brokers can insert notifications for anyone" ON public.notifications
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE auth_user_id = auth.uid() AND role = 'broker'
        )
    );
