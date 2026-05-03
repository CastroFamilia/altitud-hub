-- =============================================
-- Replace Counterpart with specific Buyer/Seller Agents and Notaries
-- =============================================

-- 1. Add new specific agent fields
ALTER TABLE office_reservations ADD COLUMN IF NOT EXISTS buyer_agent_name TEXT;
ALTER TABLE office_reservations ADD COLUMN IF NOT EXISTS buyer_agent_office TEXT;
ALTER TABLE office_reservations ADD COLUMN IF NOT EXISTS seller_agent_name TEXT;
ALTER TABLE office_reservations ADD COLUMN IF NOT EXISTS seller_agent_office TEXT;

-- 2. Add notary CRM links
ALTER TABLE office_reservations ADD COLUMN IF NOT EXISTS buyer_notary_id UUID REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE office_reservations ADD COLUMN IF NOT EXISTS seller_notary_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

-- 3. Migrate existing data based on 'side'
-- If we represent the seller (listing side), the counterpart is the buyer's agent
UPDATE office_reservations
SET buyer_agent_name = counterpart_agent, 
    buyer_agent_office = counterpart_office
WHERE side = 'listing' AND counterpart_agent IS NOT NULL;

-- If we represent the buyer (buying side), the counterpart is the seller's agent
UPDATE office_reservations
SET seller_agent_name = counterpart_agent, 
    seller_agent_office = counterpart_office
WHERE side = 'buying' AND counterpart_agent IS NOT NULL;

-- 4. Drop old generic columns
ALTER TABLE office_reservations DROP COLUMN IF EXISTS counterpart_name;
ALTER TABLE office_reservations DROP COLUMN IF EXISTS counterpart_agent;
ALTER TABLE office_reservations DROP COLUMN IF EXISTS counterpart_office;
ALTER TABLE office_reservations DROP COLUMN IF EXISTS notary_name;
ALTER TABLE office_reservations DROP COLUMN IF EXISTS notary_email;
ALTER TABLE office_reservations DROP COLUMN IF EXISTS notary_phone;
