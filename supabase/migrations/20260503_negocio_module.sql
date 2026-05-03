-- =============================================
-- NEGOCIO MODULE — Agent Reservations + Due Diligence
-- Extends office_reservations, creates due_diligence_items
-- =============================================

-- ── 1. Extend office_reservations with negotiation/commission fields ──
ALTER TABLE office_reservations ADD COLUMN IF NOT EXISTS negotiation_details TEXT;
ALTER TABLE office_reservations ADD COLUMN IF NOT EXISTS sale_price NUMERIC;
ALTER TABLE office_reservations ADD COLUMN IF NOT EXISTS commission_pct NUMERIC DEFAULT 5;
ALTER TABLE office_reservations ADD COLUMN IF NOT EXISTS agent_commission_amount NUMERIC;
ALTER TABLE office_reservations ADD COLUMN IF NOT EXISTS counterpart_name TEXT;
ALTER TABLE office_reservations ADD COLUMN IF NOT EXISTS counterpart_agent TEXT;
ALTER TABLE office_reservations ADD COLUMN IF NOT EXISTS counterpart_office TEXT;
ALTER TABLE office_reservations ADD COLUMN IF NOT EXISTS broker_help_requested BOOLEAN DEFAULT false;
ALTER TABLE office_reservations ADD COLUMN IF NOT EXISTS broker_help_note TEXT;
ALTER TABLE office_reservations ADD COLUMN IF NOT EXISTS broker_help_date TIMESTAMPTZ;
ALTER TABLE office_reservations ADD COLUMN IF NOT EXISTS side TEXT DEFAULT 'listing'
  CHECK (side IN ('listing','buying','both'));
ALTER TABLE office_reservations ADD COLUMN IF NOT EXISTS due_diligence_deadline DATE;
ALTER TABLE office_reservations ADD COLUMN IF NOT EXISTS notary_name TEXT;
ALTER TABLE office_reservations ADD COLUMN IF NOT EXISTS notary_email TEXT;
ALTER TABLE office_reservations ADD COLUMN IF NOT EXISTS notary_phone TEXT;
ALTER TABLE office_reservations ADD COLUMN IF NOT EXISTS share_token TEXT;

-- ── 2. Due Diligence checklist items ──
CREATE TABLE IF NOT EXISTS due_diligence_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reservation_id UUID NOT NULL REFERENCES office_reservations(id) ON DELETE CASCADE,
    document_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','requested','in_progress','ready')),
    requested_date DATE,
    expected_date DATE,
    completed_date DATE,
    responsible TEXT,
    notes TEXT,
    file_url TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_dd_items_reservation ON due_diligence_items(reservation_id);
CREATE INDEX IF NOT EXISTS idx_dd_items_status ON due_diligence_items(status);
CREATE INDEX IF NOT EXISTS idx_reservations_share_token ON office_reservations(share_token);

-- ── Auto-update timestamps on due_diligence_items ──
CREATE OR REPLACE FUNCTION update_dd_item_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dd_items_updated
    BEFORE UPDATE ON due_diligence_items
    FOR EACH ROW EXECUTE FUNCTION update_dd_item_timestamp();

-- ── RLS ──
ALTER TABLE due_diligence_items ENABLE ROW LEVEL SECURITY;

-- Agents manage DD items on their own reservations
CREATE POLICY "Agents manage own dd items" ON due_diligence_items FOR ALL USING (
    reservation_id IN (
        SELECT id FROM office_reservations
        WHERE profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    )
);

-- Brokers can see all DD items
CREATE POLICY "Brokers read all dd items" ON due_diligence_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'broker')
);

-- Public access via share_token (for notary page) — read-only on reservations
CREATE POLICY "Public read via share token" ON office_reservations FOR SELECT USING (
    share_token IS NOT NULL AND share_token != ''
);

CREATE POLICY "Public read dd via shared reservation" ON due_diligence_items FOR SELECT USING (
    reservation_id IN (
        SELECT id FROM office_reservations WHERE share_token IS NOT NULL AND share_token != ''
    )
);
