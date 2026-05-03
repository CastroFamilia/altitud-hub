-- =============================================
-- OFFICE PANEL TABLES — Supabase Migration
-- Dashboard, RRHH, Finanzas, OKR
-- =============================================

-- ── 1. Extend profiles with start_date and commission split ──
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS commission_split TEXT DEFAULT '45/55';

-- ── 2. Configurable office settings (split tiers, poverty line, etc.) ──
CREATE TABLE IF NOT EXISTS office_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    office TEXT NOT NULL DEFAULT 'altitud' CHECK (office IN ('altitud','cero')),
    config_key TEXT NOT NULL,
    config_value JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(office, config_key)
);

-- Seed default split tiers
INSERT INTO office_config (office, config_key, config_value) VALUES
    ('altitud', 'split_tiers', '["45/55", "60/40", "80/20"]'),
    ('altitud', 'poverty_line', '{"amount": 1000, "currency": "USD", "description": "Minimum monthly earnings target"}'),
    ('cero', 'split_tiers', '["45/55", "60/40", "80/20"]'),
    ('cero', 'poverty_line', '{"amount": 1000, "currency": "USD", "description": "Minimum monthly earnings target"}')
ON CONFLICT (office, config_key) DO NOTHING;

-- ── 3. Office Listings (track listings per agent per month) ──
CREATE TABLE IF NOT EXISTS office_listings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    property_address TEXT,
    listing_price NUMERIC,
    listing_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active','sold','expired','withdrawn')),
    office TEXT DEFAULT 'altitud' CHECK (office IN ('altitud','cero')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. Office Reservations — "Reservometro" (LOI/SPA pipeline) ──
CREATE TABLE IF NOT EXISTS office_reservations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    property_address TEXT,
    client_name TEXT,
    reservation_amount NUMERIC NOT NULL,
    type TEXT DEFAULT 'LOI' CHECK (type IN ('LOI','SPA')),
    expected_sign_date DATE,
    actual_close_date DATE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','signed','closed','fallen')),
    fallen_reason TEXT,
    office TEXT DEFAULT 'altitud' CHECK (office IN ('altitud','cero')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. Office Commissions — closed deals tracking ──
CREATE TABLE IF NOT EXISTS office_commissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reservation_id UUID REFERENCES office_reservations(id) ON DELETE SET NULL,
    property_address TEXT,
    client_name TEXT,
    sale_price NUMERIC NOT NULL,
    total_commission_pct NUMERIC DEFAULT 5,
    total_commission_amount NUMERIC NOT NULL,
    agent_split_pct NUMERIC DEFAULT 50,
    agent_commission NUMERIC NOT NULL,
    office_commission NUMERIC NOT NULL,
    close_date DATE NOT NULL DEFAULT CURRENT_DATE,
    office TEXT DEFAULT 'altitud' CHECK (office IN ('altitud','cero')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. Office Events (HR event tracking) ──
CREATE TABLE IF NOT EXISTS office_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    event_time TEXT,
    event_type TEXT DEFAULT 'training' CHECK (event_type IN ('training','meeting','convention','open_house','social','other')),
    is_mandatory BOOLEAN DEFAULT false,
    is_for_all BOOLEAN DEFAULT true,
    office TEXT DEFAULT 'altitud' CHECK (office IN ('altitud','cero')),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. Event Attendance ──
CREATE TABLE IF NOT EXISTS event_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES office_events(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    attended BOOLEAN DEFAULT false,
    notes TEXT,
    marked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, profile_id)
);

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_office_listings_profile ON office_listings(profile_id);
CREATE INDEX IF NOT EXISTS idx_office_listings_date ON office_listings(listing_date);
CREATE INDEX IF NOT EXISTS idx_office_listings_office ON office_listings(office);

CREATE INDEX IF NOT EXISTS idx_office_reservations_profile ON office_reservations(profile_id);
CREATE INDEX IF NOT EXISTS idx_office_reservations_office ON office_reservations(office);
CREATE INDEX IF NOT EXISTS idx_office_reservations_status ON office_reservations(status);

CREATE INDEX IF NOT EXISTS idx_office_commissions_profile ON office_commissions(profile_id);
CREATE INDEX IF NOT EXISTS idx_office_commissions_date ON office_commissions(close_date);
CREATE INDEX IF NOT EXISTS idx_office_commissions_office ON office_commissions(office);

CREATE INDEX IF NOT EXISTS idx_office_events_office ON office_events(office);
CREATE INDEX IF NOT EXISTS idx_office_events_date ON office_events(event_date);

CREATE INDEX IF NOT EXISTS idx_event_attendance_event ON event_attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_profile ON event_attendance(profile_id);

-- ── Auto-update timestamps ──
CREATE OR REPLACE FUNCTION update_reservation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reservations_updated
    BEFORE UPDATE ON office_reservations
    FOR EACH ROW EXECUTE FUNCTION update_reservation_timestamp();

-- ── RLS ──
ALTER TABLE office_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendance ENABLE ROW LEVEL SECURITY;

-- Config: anyone can read, brokers can write
CREATE POLICY "Anyone reads config" ON office_config FOR SELECT USING (true);
CREATE POLICY "Brokers manage config" ON office_config FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'broker')
);

-- Listings: agents manage own, brokers see all
CREATE POLICY "Agents manage own listings" ON office_listings FOR ALL USING (
    profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Brokers read all listings" ON office_listings FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'broker')
);

-- Reservations: agents manage own, brokers see all
CREATE POLICY "Agents manage own reservations" ON office_reservations FOR ALL USING (
    profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Brokers read all reservations" ON office_reservations FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'broker')
);

-- Commissions: brokers manage all, agents read own
CREATE POLICY "Brokers manage commissions" ON office_commissions FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'broker')
);
CREATE POLICY "Agents read own commissions" ON office_commissions FOR SELECT USING (
    profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
);

-- Events: anyone reads, brokers manage
CREATE POLICY "Anyone reads events" ON office_events FOR SELECT USING (true);
CREATE POLICY "Brokers manage events" ON office_events FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'broker')
);

-- Attendance: anyone reads, brokers manage
CREATE POLICY "Anyone reads attendance" ON event_attendance FOR SELECT USING (true);
CREATE POLICY "Brokers manage attendance" ON event_attendance FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'broker')
);
