-- =============================================
-- NOTIFICATIONS: Add type + dedup support
-- =============================================

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Index for fast dedup lookups (has this type been sent to this user recently?)
CREATE INDEX IF NOT EXISTS notifications_user_type_created_idx
  ON public.notifications(user_id, type, created_at DESC);
