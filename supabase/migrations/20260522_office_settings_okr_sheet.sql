-- 1. Create office_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.office_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    office_id TEXT NOT NULL UNIQUE, -- e.g., 'altitud', 'cero'
    reconnect_read_api_key TEXT,
    reconnect_write_api_key TEXT,
    agents_api_key TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add OKR Sheet Auto-Sync columns to office_settings
ALTER TABLE public.office_settings ADD COLUMN IF NOT EXISTS okr_sheet_url TEXT;
ALTER TABLE public.office_settings ADD COLUMN IF NOT EXISTS okr_sheet_last_synced TIMESTAMPTZ;

-- 3. Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_office_settings_mod_time()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger if not exists
DROP TRIGGER IF EXISTS trg_update_office_settings ON public.office_settings;
CREATE TRIGGER trg_update_office_settings
BEFORE UPDATE ON public.office_settings
FOR EACH ROW
EXECUTE FUNCTION update_office_settings_mod_time();

-- 5. Clear old RLS policies
DROP POLICY IF EXISTS "Brokers manage office settings" ON public.office_settings;
DROP POLICY IF EXISTS "Brokers and admins manage office settings" ON public.office_settings;
DROP POLICY IF EXISTS "Anyone views office settings" ON public.office_settings;
DROP POLICY IF EXISTS "Permissive policy" ON public.office_settings;

-- 6. Disable both standard and forced RLS
ALTER TABLE public.office_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_settings NO FORCE ROW LEVEL SECURITY;

-- 7. Create a 100% permissive fallback policy
CREATE POLICY "Permissive policy" 
  ON public.office_settings 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- 8. Insert default rows
INSERT INTO public.office_settings (office_id) 
VALUES ('altitud'), ('cero') 
ON CONFLICT (office_id) DO NOTHING;
