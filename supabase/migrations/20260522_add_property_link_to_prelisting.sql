-- =============================================
-- PRE-LISTING INTEGRATION — Property Link
-- Adds property_id to saved_presentations to link custom decks
-- directly to the source property database inventory.
-- =============================================

ALTER TABLE public.saved_presentations
  ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL;

-- ── Index for fast lookup ──
CREATE INDEX IF NOT EXISTS idx_saved_presentations_property ON public.saved_presentations(property_id);
