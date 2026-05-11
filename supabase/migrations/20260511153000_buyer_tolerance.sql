ALTER TABLE public.buyer_searches ADD COLUMN IF NOT EXISTS price_tolerance NUMERIC DEFAULT 0;
