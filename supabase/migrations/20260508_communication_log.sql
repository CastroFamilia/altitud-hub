-- =============================================
-- COMMUNICATION LOG + FOLLOW-UP SYSTEM
-- Tracks agent-lead interactions and reminders
-- =============================================

-- 1. Lead Communications — every interaction logged
CREATE TABLE IF NOT EXISTS public.lead_communications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    inquiry_id UUID NOT NULL REFERENCES public.property_inquiries(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    channel TEXT NOT NULL DEFAULT 'whatsapp'
      CHECK (channel IN ('whatsapp','email','phone','in_person')),
    direction TEXT NOT NULL DEFAULT 'outbound'
      CHECK (direction IN ('outbound','inbound')),
    summary TEXT NOT NULL DEFAULT '',
    follow_up_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comm_inquiry ON public.lead_communications(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_comm_agent ON public.lead_communications(agent_id);
CREATE INDEX IF NOT EXISTS idx_comm_followup ON public.lead_communications(follow_up_date)
  WHERE follow_up_date IS NOT NULL;

-- 2. Lead Follow-Ups — standalone reminders
CREATE TABLE IF NOT EXISTS public.lead_follow_ups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    inquiry_id UUID NOT NULL REFERENCES public.property_inquiries(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    due_date DATE NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending','completed','skipped')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_followup_inquiry ON public.lead_follow_ups(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_followup_agent ON public.lead_follow_ups(agent_id);
CREATE INDEX IF NOT EXISTS idx_followup_due ON public.lead_follow_ups(due_date)
  WHERE status = 'pending';

-- 3. RLS — Agents see own records, brokers see all
ALTER TABLE public.lead_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_follow_ups ENABLE ROW LEVEL SECURITY;

-- Communications: agents read/write own, brokers read all
CREATE POLICY "Agents manage own communications" ON public.lead_communications
  FOR ALL USING (
    agent_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'broker')
  );

CREATE POLICY "Brokers read all communications" ON public.lead_communications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'broker')
  );

-- Follow-ups: agents read/write own, brokers manage all
CREATE POLICY "Agents manage own follow-ups" ON public.lead_follow_ups
  FOR ALL USING (
    agent_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'broker')
  );

CREATE POLICY "Brokers read all follow-ups" ON public.lead_follow_ups
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'broker')
  );
