-- Add physical attributes to buyer_searches for stricter matching
ALTER TABLE public.buyer_searches 
ADD COLUMN IF NOT EXISTS min_bedrooms INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_bathrooms INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_sqm NUMERIC DEFAULT 0;
