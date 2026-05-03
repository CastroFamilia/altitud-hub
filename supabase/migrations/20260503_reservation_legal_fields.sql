-- =============================================
-- Extend office_reservations with legal fields
-- and CRM relationships
-- =============================================

ALTER TABLE office_reservations ADD COLUMN IF NOT EXISTS buyer_name TEXT;
ALTER TABLE office_reservations ADD COLUMN IF NOT EXISTS seller_name TEXT;
ALTER TABLE office_reservations ADD COLUMN IF NOT EXISTS buyer_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE office_reservations ADD COLUMN IF NOT EXISTS seller_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE office_reservations ADD COLUMN IF NOT EXISTS registry_numbers TEXT;
ALTER TABLE office_reservations ADD COLUMN IF NOT EXISTS plan_numbers TEXT;

-- Migrate existing client_name if it exists
UPDATE office_reservations
SET buyer_name = client_name
WHERE buyer_name IS NULL AND client_name IS NOT NULL;
