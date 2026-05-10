-- =============================================
-- INTEGRATIONS & PROPERTIES UPDATE
-- Adds office_settings for API Keys and updates property statuses
-- =============================================

-- 1. Update properties status to include 'paused'
-- PostgreSQL auto-names CHECK constraints. We drop the likely names.
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_status_check;
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_status_check1;

ALTER TABLE public.properties ADD CONSTRAINT properties_status_check 
  CHECK (status IN ('draft', 'pending_approval', 'needs_changes', 'approved', 'published', 'cancelled', 'paused'));

-- 2. Create office_settings table for API Keys
CREATE TABLE IF NOT EXISTS public.office_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    office_id TEXT NOT NULL UNIQUE, -- e.g., 'altitud', 'cero'
    reconnect_read_api_key TEXT,
    reconnect_write_api_key TEXT,
    agents_api_key TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_office_settings_mod_time()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_office_settings ON public.office_settings;
CREATE TRIGGER trg_update_office_settings
BEFORE UPDATE ON public.office_settings
FOR EACH ROW
EXECUTE FUNCTION update_office_settings_mod_time();

-- 3. RLS for office_settings (Only Brokers can manage)
ALTER TABLE public.office_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers manage office settings" 
  ON public.office_settings 
  FOR ALL 
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'broker')
  );

-- Insert default rows
INSERT INTO public.office_settings (office_id) VALUES ('altitud'), ('cero') ON CONFLICT (office_id) DO NOTHING;

