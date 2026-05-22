-- =============================================
-- ADMIN ROLE — INQUIRY & LEAD ACCESS
-- Extends existing RLS policies to include 'admin' role
-- alongside 'broker' for managing property inquiries,
-- communications, and follow-ups.
-- =============================================

-- ── 1. property_inquiries — add admin access ──

-- Drop old broker-only policies
DROP POLICY IF EXISTS "Brokers view all inquiries" ON public.property_inquiries;
DROP POLICY IF EXISTS "Brokers manage all inquiries" ON public.property_inquiries;

-- Recreate with admin included
CREATE POLICY "Brokers view all inquiries" ON public.property_inquiries FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role IN ('broker', 'admin'))
);

CREATE POLICY "Brokers manage all inquiries" ON public.property_inquiries FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role IN ('broker', 'admin'))
);


-- ── 2. lead_communications — add admin access ──

DROP POLICY IF EXISTS "Agents manage own communications" ON public.lead_communications;
DROP POLICY IF EXISTS "Brokers read all communications" ON public.lead_communications;

CREATE POLICY "Agents manage own communications" ON public.lead_communications
  FOR ALL USING (
    agent_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role IN ('broker', 'admin'))
  );

CREATE POLICY "Brokers read all communications" ON public.lead_communications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role IN ('broker', 'admin'))
  );


-- ── 3. lead_follow_ups — add admin access ──

DROP POLICY IF EXISTS "Agents manage own follow-ups" ON public.lead_follow_ups;
DROP POLICY IF EXISTS "Brokers read all follow-ups" ON public.lead_follow_ups;

CREATE POLICY "Agents manage own follow-ups" ON public.lead_follow_ups
  FOR ALL USING (
    agent_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role IN ('broker', 'admin'))
  );

CREATE POLICY "Brokers read all follow-ups" ON public.lead_follow_ups
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role IN ('broker', 'admin'))
  );


-- ── 4. property_syndication — add admin to existing broker-only policies ──

DROP POLICY IF EXISTS "Brokers view all syndication" ON public.property_syndication;
DROP POLICY IF EXISTS "Brokers manage all syndication" ON public.property_syndication;

CREATE POLICY "Brokers view all syndication" ON public.property_syndication FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role IN ('broker', 'admin'))
);

CREATE POLICY "Brokers manage all syndication" ON public.property_syndication FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role IN ('broker', 'admin'))
);
