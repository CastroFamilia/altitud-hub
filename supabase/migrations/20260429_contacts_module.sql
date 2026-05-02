-- =============================================
-- Contacts (CRM) Module — Supabase Migration
-- =============================================

-- 1. Contacts Table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id), -- Agent who owns this contact
    first_name TEXT NOT NULL,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    lead_origin TEXT, -- e.g., 'Property Inquiry', 'Referral', 'Import', 'Web'
    original_property_id TEXT, -- RE/MAX property ID if origin is inquiry
    type TEXT, -- e.g., 'Buyer', 'Seller', 'Renter', 'Investor', 'Other'
    status TEXT DEFAULT 'active', -- 'active', 'inactive', 'closed'
    tags TEXT[],
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Contact Relations Table
CREATE TABLE IF NOT EXISTS contact_relations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    related_contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    relation_type TEXT, -- e.g., 'Spouse', 'Partner', 'Referred By', 'Parent', 'Child', 'Business Partner'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(contact_id, related_contact_id)
);

-- 3. Property Inquiries Table
CREATE TABLE IF NOT EXISTS property_inquiries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    remax_property_id TEXT NOT NULL, -- RE/MAX API Property ID
    inquiry_date TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    status TEXT DEFAULT 'new', -- 'new', 'contacted', 'showing_scheduled', 'closed'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Update acm_reports (Only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'acm_reports') THEN
        ALTER TABLE acm_reports ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 5. Auto-update triggers
CREATE OR REPLACE FUNCTION update_contacts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_updated
    BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_contacts_timestamp();

CREATE OR REPLACE FUNCTION update_property_inquiries_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER property_inquiries_updated
    BEFORE UPDATE ON property_inquiries
    FOR EACH ROW EXECUTE FUNCTION update_property_inquiries_timestamp();

-- 6. Row Level Security (RLS)
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_inquiries ENABLE ROW LEVEL SECURITY;

-- Contacts Policies (Agent can read/write their own contacts, Team Leaders/Brokers can see team's)
CREATE POLICY "Users can manage own contacts" ON contacts
    FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage own contact relations" ON contact_relations
    FOR ALL
    USING (
        contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid()) OR
        related_contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can manage own property inquiries" ON property_inquiries
    FOR ALL
    USING (contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid()));

-- Note: The broker policy checking the 'profiles' table has been temporarily removed
-- so you can execute this migration without errors even if profiles doesn't exist yet.
