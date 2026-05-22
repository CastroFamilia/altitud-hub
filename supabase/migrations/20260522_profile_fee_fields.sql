-- ── Add monthly fee and fee start date fields to profiles ──
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fee_start_date DATE;
