-- =============================================
-- RECONNECT ALERT LOG
-- Deduplication table for Smart CRM alerts.
-- Stores (search_id, reconnect_listing_id) pairs
-- so we never spam the same match twice.
-- =============================================

CREATE TABLE IF NOT EXISTS public.reconnect_alert_log (
  id               UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  search_id        UUID REFERENCES public.buyer_searches(id) ON DELETE CASCADE NOT NULL,
  reconnect_listing_id TEXT NOT NULL,
  agent_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notified_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(search_id, reconnect_listing_id)
);

-- Only agents can read their own alert history
ALTER TABLE public.reconnect_alert_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can read their own alert log"
  ON public.reconnect_alert_log
  FOR SELECT
  USING (agent_id = auth.uid());

-- Fast dedup lookup
CREATE INDEX IF NOT EXISTS reconnect_alert_log_search_listing_idx
  ON public.reconnect_alert_log(search_id, reconnect_listing_id);

-- Fast per-agent query
CREATE INDEX IF NOT EXISTS reconnect_alert_log_agent_idx
  ON public.reconnect_alert_log(agent_id, notified_at DESC);
