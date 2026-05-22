-- =============================================
-- AGENT OFFBOARDING — Audit Log & System Profile
-- Tracks data reassignment when agents leave
-- =============================================

-- 1. Audit log for offboarding operations
CREATE TABLE IF NOT EXISTS public.agent_offboarding_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Who is leaving
    departing_profile_id UUID NOT NULL REFERENCES profiles(id),
    departing_name TEXT NOT NULL,

    -- Who receives the data
    receiving_profile_id UUID NOT NULL REFERENCES profiles(id),
    receiving_name TEXT NOT NULL,

    -- Who performed the action
    performed_by UUID NOT NULL REFERENCES profiles(id),

    -- Detailed summary of what was reassigned
    reassigned_counts JSONB NOT NULL DEFAULT '{}',
    -- e.g. {"contacts": 12, "properties": 3, "acm_reports": 5, ...}

    -- Categories that went to the "Agente Desvinculado" placeholder
    placeholder_counts JSONB NOT NULL DEFAULT '{}',

    -- Categories selected for reassignment
    selected_categories TEXT[] NOT NULL DEFAULT '{}',

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_offboarding_departing ON public.agent_offboarding_log(departing_profile_id);
CREATE INDEX IF NOT EXISTS idx_offboarding_date ON public.agent_offboarding_log(created_at);

-- RLS — Broker only
ALTER TABLE public.agent_offboarding_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers manage offboarding logs" ON public.agent_offboarding_log
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'broker')
  );

-- 2. System placeholder profile "Agente Desvinculado"
-- Used to attribute orphaned data when a category is not reassigned
INSERT INTO profiles (email, full_name, role, office, status)
VALUES ('sistema@remax-altitud.cr', 'Agente Desvinculado', 'agent', 'altitud', 'disabled')
ON CONFLICT (email) DO NOTHING;
