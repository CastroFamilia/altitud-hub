ALTER TABLE public.buyer_searches 
ADD COLUMN IF NOT EXISTS operation_type TEXT DEFAULT 'venta' CHECK (operation_type IN ('venta', 'alquiler')),
ADD COLUMN IF NOT EXISTS zones JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS must_haves JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS nice_to_haves JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.buyer_search_pipeline
ADD COLUMN IF NOT EXISTS requirements_match JSONB DEFAULT '{}'::jsonb;

-- Modify the status check for pipeline if possible, but standard is just trusting text. Let's not alter the check constraint, just insert the new text.

ALTER TABLE public.buyer_search_votes
ADD COLUMN IF NOT EXISTS visit_rating INTEGER CHECK (visit_rating >= 1 AND visit_rating <= 5),
ADD COLUMN IF NOT EXISTS visit_notes TEXT;
