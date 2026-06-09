
-- ==========================================
-- CONSOLIDATED POSTGRESQL SCHEMA
-- Migrated from Supabase
-- ==========================================

-- Enable PostGIS if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create users table for Auth.js
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    "emailVerified" TIMESTAMPTZ,
    image TEXT,
    password_hash TEXT, -- For credentials provider
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  UNIQUE(provider, "providerAccountId")
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "sessionToken" TEXT UNIQUE NOT NULL,
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_token (
  identifier TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (identifier, token)
);



-- File: 20260424_initial_schema.sql
-- =============================================
-- ACM Reports Table — Supabase Migration
-- Run this in Supabase SQL Editor
-- =============================================

-- Table to store all CMA/ACM reports
CREATE TABLE IF NOT EXISTS acm_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Agent info (from RE/MAX API)
    agent_id INTEGER,                    -- RE/MAX agent ID
    agent_name TEXT NOT NULL,
    agent_email TEXT,
    agent_phone TEXT,
    agent_photo TEXT,
    office TEXT NOT NULL DEFAULT 'altitud', -- 'altitud' or 'cero'

    -- Auth user (if logged in via Google)
    user_id UUID REFERENCES users(id),

    -- Property classification
    property_category TEXT NOT NULL,     -- 'residential' or 'commercial'
    property_type TEXT NOT NULL,         -- 'casa', 'lote', 'finca', 'condo', 'hotel', 'galpon', 'local', 'negocio'

    -- Location
    property_lat DOUBLE PRECISION,
    property_lng DOUBLE PRECISION,
    property_address TEXT,
    property_district TEXT,
    property_barrio TEXT,

    -- Client info
    client_name TEXT,
    client_phone TEXT,
    client_email TEXT,
    client_residence TEXT,

    -- Property details
    property_finca TEXT,
    property_plano TEXT,
    visit_date DATE,
    listing_price NUMERIC,

    -- Indicators & data (stored as JSONB for flexibility)
    indicators JSONB DEFAULT '{}',       -- Selected indicators + values
    comparables JSONB DEFAULT '[]',      -- Array of comparable data
    comp_images JSONB DEFAULT '[]',      -- Array of image arrays

    -- Analysis results
    suggested_price NUMERIC,
    price_range_low NUMERIC,
    price_range_high NUMERIC,
    agent_notes TEXT,

    -- Status
    status TEXT DEFAULT 'draft',         -- 'draft', 'completed', 'shared'
    pdf_url TEXT                          -- URL to generated PDF if stored
);

-- Index for geo queries (find nearby CMAs)
CREATE INDEX IF NOT EXISTS idx_acm_reports_location
    ON acm_reports USING GIST (
        ST_SetSRID(ST_MakePoint(property_lng, property_lat), 4326)
    );

-- Index for agent lookups
CREATE INDEX IF NOT EXISTS idx_acm_reports_agent ON acm_reports(agent_email);
CREATE INDEX IF NOT EXISTS idx_acm_reports_user ON acm_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_acm_reports_office ON acm_reports(office);

-- RLS policies


-- Anyone can insert (agents creating CMAs)


-- Authenticated users can read all CMAs (for similarity alerts)


-- Users can update their own CMAs


-- Function to find nearby CMAs (for similarity alerts)
CREATE OR REPLACE FUNCTION find_nearby_cmas(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_radius_km DOUBLE PRECISION DEFAULT 2,
    p_type TEXT DEFAULT NULL,
    p_exclude_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    agent_name TEXT,
    property_type TEXT,
    property_lat DOUBLE PRECISION,
    property_lng DOUBLE PRECISION,
    property_address TEXT,
    created_at TIMESTAMPTZ,
    distance_km DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id,
        r.agent_name,
        r.property_type,
        r.property_lat,
        r.property_lng,
        r.property_address,
        r.created_at,
        (ST_DistanceSphere(
            ST_MakePoint(r.property_lng, r.property_lat),
            ST_MakePoint(p_lng, p_lat)
        ) / 1000) AS distance_km
    FROM acm_reports r
    WHERE
        r.property_lat IS NOT NULL
        AND r.property_lng IS NOT NULL
        AND (p_exclude_id IS NULL OR r.id != p_exclude_id)
        AND (p_type IS NULL OR r.property_type = p_type)
        AND ST_DistanceSphere(
            ST_MakePoint(r.property_lng, r.property_lat),
            ST_MakePoint(p_lng, p_lat)
        ) <= (p_radius_km * 1000)
    ORDER BY distance_km ASC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;


-- File: 20260425_business_plans.sql
-- =============================================
-- Business Plans Table — Supabase Migration
-- "Mi Plan de Negocio" — One active plan per agent
-- =============================================

CREATE TABLE IF NOT EXISTS business_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Agent identity
    agent_email TEXT NOT NULL UNIQUE,     -- One plan per agent (email is unique key)
    agent_name TEXT,
    office TEXT DEFAULT 'altitud',        -- 'altitud' or 'cero'

    -- Auth user (if logged in via Google)
    user_id UUID REFERENCES users(id),

    -- Step 1: Para Qué (motivation)
    para_que TEXT,                         -- Free-text motivation/purpose

    -- Step 2: Living Expenses
    currency TEXT DEFAULT 'CRC',           -- 'CRC' or 'USD'
    exchange_rate NUMERIC DEFAULT 457,     -- CRC per USD (from BCCR API)
    living_expenses JSONB DEFAULT '[]',    -- Array of {category, label, amount}
    total_living_monthly NUMERIC DEFAULT 0,

    -- Step 3: Business Expenses
    business_expenses JSONB DEFAULT '[]',  -- Array of {category, label, amount, annual, monthly}
    total_business_monthly NUMERIC DEFAULT 0,

    -- Step 4: Goals
    goals JSONB DEFAULT '[]',             -- Array of {name, emoji, total, months, monthly}
    total_goals_monthly NUMERIC DEFAULT 0,

    -- Grand totals
    grand_total_monthly NUMERIC DEFAULT 0,
    grand_total_monthly_usd NUMERIC DEFAULT 0,

    -- Step 5: Zone Data
    avg_ticket NUMERIC DEFAULT 0,         -- Average property price in zone
    ticket_currency TEXT DEFAULT 'USD',    -- Currency for ticket
    commission_pct NUMERIC DEFAULT 5,     -- Total commission %
    agent_split_pct NUMERIC DEFAULT 50,   -- Agent's share of commission %
    commission_per_close NUMERIC DEFAULT 0,
    closes_needed_monthly NUMERIC DEFAULT 0,

    -- Conversion Ratios (agent-specific, future: office averages)
    conversion_ratios JSONB DEFAULT '{
        "calls_to_prelisting": 0.15,
        "prelisting_to_acm": 0.65,
        "acm_to_listing": 0.75,
        "listing_to_capture": 0.65,
        "capture_to_close": 0.50
    }',

    -- Calculated targets (output of the wizard)
    monthly_targets JSONB DEFAULT '{}',
    weekly_targets JSONB DEFAULT '{}',

    -- Status
    status TEXT DEFAULT 'draft',          -- 'draft', 'active'
    completed_at TIMESTAMPTZ             -- When plan was first activated
);

-- Index for agent lookups
CREATE INDEX IF NOT EXISTS idx_business_plans_agent ON business_plans(agent_email);
CREATE INDEX IF NOT EXISTS idx_business_plans_user ON business_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_business_plans_office ON business_plans(office);

-- RLS policies








-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_business_plan_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER business_plans_updated
    BEFORE UPDATE ON business_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_business_plan_timestamp();


-- File: 20260426_auth_profiles_teams.sql
-- =============================================
-- Auth Profiles & Teams — Supabase Migration
-- Multi-role auth for ALTITUD HUB
-- =============================================

-- Equipos
CREATE TABLE IF NOT EXISTS teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    leader_id UUID,  -- FK added after profiles exist
    office TEXT DEFAULT 'altitud' CHECK (office IN ('altitud','cero')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Perfiles de agentes (pre-creados por el admin/broker)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    auth_user_id UUID UNIQUE REFERENCES users(id),
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    phone TEXT,
    role TEXT DEFAULT 'agent' CHECK (role IN ('agent','team_leader','broker')),
    team_id UUID REFERENCES teams(id),
    remax_agent_id INTEGER,         -- AssociateID from RE/MAX CCA API
    remax_agent_name TEXT,          -- backup name from API
    office TEXT DEFAULT 'altitud' CHECK (office IN ('altitud','cero')),
    status TEXT DEFAULT 'invited' CHECK (status IN ('invited','active','disabled')),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Now add FK from teams.leader_id → profiles.id
ALTER TABLE teams ADD CONSTRAINT fk_team_leader
    FOREIGN KEY (leader_id) REFERENCES profiles(id);

-- OKR daily logs (migrating from localStorage to DB)
CREATE TABLE IF NOT EXISTS okr_daily_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    activities JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, log_date)
);

-- =============================================
-- TRIGGER: Link auth.user to pre-created profile
-- When a user registers via invite, link them
-- =============================================
CREATE OR REPLACE FUNCTION link_auth_user_to_profile()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles 
    SET auth_user_id = NEW.id, 
        status = 'active',
        last_login = NOW(),
        -- Update avatar from Google if available
        avatar_url = COALESCE(
            NEW.raw_user_meta_data->>'avatar_url',
            profiles.avatar_url
        )
    WHERE LOWER(email) = LOWER(NEW.email) 
      AND auth_user_id IS NULL;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION link_auth_user_to_profile();

-- =============================================
-- TRIGGER: Auto-update updated_at on OKR logs
-- =============================================
CREATE OR REPLACE FUNCTION update_okr_log_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER okr_logs_updated
    BEFORE UPDATE ON okr_daily_logs
    FOR EACH ROW EXECUTE FUNCTION update_okr_log_timestamp();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================





-- ── PROFILES ──

-- Everyone can read their own profile


-- Brokers can update any profile


-- ── TEAMS ──

-- Everyone can read teams


-- Only brokers manage teams


-- ── OKR DAILY LOGS ──

-- Users manage their own OKR logs


-- Team leaders read their team's OKR logs


-- Brokers read all OKR logs


-- ── ACM REPORTS — Update to allow shared read ──
-- (Already has "Authenticated users can read all CMAs" policy — this is correct for the shared maps)

-- =============================================
-- SEED: Broker accounts
-- =============================================
INSERT INTO profiles (email, full_name, role, office, status) VALUES
    ('acastro@remax-altitud.cr', 'Alejandra Castro', 'broker', 'altitud', 'invited'),
    ('cesar@remax-altitud.cr', 'César', 'broker', 'altitud', 'invited')
ON CONFLICT (email) DO NOTHING;

-- Create the default team
INSERT INTO teams (name, office) VALUES ('Equipo Principal', 'altitud');


-- File: 20260429_contacts_module.sql
-- =============================================
-- Contacts (CRM) Module — Supabase Migration
-- =============================================

-- 1. Contacts Table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id), -- Agent who owns this contact
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




-- Contacts Policies (Agent can read/write their own contacts, Team Leaders/Brokers can see team's)






-- Note: The broker policy checking the 'profiles' table has been temporarily removed
-- so you can execute this migration without errors even if profiles doesn't exist yet.


-- File: 20260501_contact_advanced_fields.sql
-- =============================================
-- Contacts Advanced Fields — Supabase Migration
-- Adds fields for Market, Classification, and detailed origins
-- =============================================

DO $$
BEGIN
    -- Add market (Nacional / Extranjero)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='market') THEN
        ALTER TABLE contacts ADD COLUMN market TEXT DEFAULT 'Nacional';
    END IF;

    -- Add classification (A+, A, B, C)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='contact_classification') THEN
        ALTER TABLE contacts ADD COLUMN contact_classification TEXT DEFAULT 'B';
    END IF;

    -- Add referred_by_name text field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='referred_by_name') THEN
        ALTER TABLE contacts ADD COLUMN referred_by_name TEXT;
    END IF;

    -- Add origin_details (e.g., Specific portal, specific social media)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='origin_details') THEN
        ALTER TABLE contacts ADD COLUMN origin_details TEXT;
    END IF;
END $$;


-- File: 20260501_pipeline_stages.sql
-- =============================================
-- Contacts Pipeline Stages — Supabase Migration
-- Adds the pipeline_stage column to the contacts table
-- =============================================

DO $$
BEGIN
    -- Add pipeline_stage column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='pipeline_stage') THEN
        ALTER TABLE contacts ADD COLUMN pipeline_stage TEXT DEFAULT 'Lead';
    END IF;
END $$;


-- File: 20260501_social_media_fields.sql
-- =============================================
-- Contacts Social Media Fields — Supabase Migration
-- Adds instagram and linkedin columns
-- =============================================

DO $$
BEGIN
    -- Add social_instagram column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='social_instagram') THEN
        ALTER TABLE contacts ADD COLUMN social_instagram TEXT;
    END IF;

    -- Add social_linkedin column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='social_linkedin') THEN
        ALTER TABLE contacts ADD COLUMN social_linkedin TEXT;
    END IF;
END $$;


-- File: 20260502_account_statements.sql
-- account_transactions table

CREATE TABLE IF NOT EXISTS public.account_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('office_charge', 'agent_payment', 'personal_expense')),
    amount NUMERIC(12,2) NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    added_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security


-- Select Policies




-- Delete Policies




-- Create Index for performance
CREATE INDEX IF NOT EXISTS idx_account_transactions_profile_id ON public.account_transactions(profile_id);
CREATE INDEX IF NOT EXISTS idx_account_transactions_date ON public.account_transactions(date);


-- File: 20260503_error_tickets.sql
-- Migration: 20260503_error_tickets.sql
-- Description: Create support_tickets table and storage bucket for error reports

-- 1. Create support_tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    agent_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    resolved_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Enable Row Level Security


-- 3. RLS Policies for support_tickets
-- Agents can view their own tickets


-- Brokers and Team Leaders can view all tickets



-- File: 20260503_negocio_module.sql
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


-- Agents manage DD items on their own reservations


-- Brokers can see all DD items


-- Public access via share_token (for notary page) — read-only on reservations





-- File: 20260503_office_panel_tables.sql
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







-- Config: anyone can read, brokers can write



-- Listings: agents manage own, brokers see all



-- Reservations: agents manage own, brokers see all



-- Commissions: brokers manage all, agents read own



-- Events: anyone reads, brokers manage



-- Attendance: anyone reads, brokers manage




-- File: 20260503_reservation_agents_notaries.sql
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


-- File: 20260503_reservation_legal_fields.sql
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


-- File: 20260504_contact_languages.sql
-- =============================================
-- Contacts Languages & Market Update — Supabase Migration
-- Adds fields for Primary and Secondary Language
-- =============================================

DO $$
BEGIN
    -- Add primary language
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='primary_language') THEN
        ALTER TABLE contacts ADD COLUMN primary_language TEXT DEFAULT 'Español';
    END IF;

    -- Add secondary language
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='secondary_language') THEN
        ALTER TABLE contacts ADD COLUMN secondary_language TEXT DEFAULT 'Ninguno';
    END IF;
END $$;


-- File: 20260504_contact_languages_types.sql
-- =============================================
-- Contacts Languages & Type Update
-- Adds tertiary and favorite languages, and converts type to array
-- =============================================

DO $$
BEGIN
    -- Add tertiary language
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='tertiary_language') THEN
        ALTER TABLE contacts ADD COLUMN tertiary_language TEXT DEFAULT 'Ninguno';
    END IF;

    -- Add favorite language
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='favorite_language') THEN
        ALTER TABLE contacts ADD COLUMN favorite_language TEXT DEFAULT 'Español';
    END IF;
END $$;

-- Convert 'type' column to TEXT[] to support multiple selections
-- Uses string_to_array to preserve existing single values like 'Comprador' -> {'Comprador'}
ALTER TABLE contacts ALTER COLUMN type TYPE TEXT[] USING string_to_array(type, ',');


-- File: 20260504_properties_module.sql
-- Migration: Properties Module
-- Creates the properties table to track assets assigned to contacts.

CREATE TABLE IF NOT EXISTS public.properties (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    agent_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    property_type TEXT CHECK (property_type IN ('Lote', 'Casa', 'Apartamento', 'Comercial')),
    drive_folder_id TEXT,
    drive_folder_url TEXT,
    size_sqm NUMERIC,
    finca_number TEXT,
    plano_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security


-- Policies






-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_properties_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_properties_updated_at
    BEFORE UPDATE ON public.properties
    FOR EACH ROW
    EXECUTE FUNCTION update_properties_updated_at();

-- Index for performance
CREATE INDEX IF NOT EXISTS properties_contact_id_idx ON public.properties(contact_id);
CREATE INDEX IF NOT EXISTS properties_agent_id_idx ON public.properties(agent_id);


-- File: 20260506_developments.sql
-- =============================================
-- DEVELOPMENTS MODULE
-- Groups multiple properties under a parent project.
-- Block-based page builder data stored as JSONB.
-- Public landing pages at /d/[slug].
-- =============================================

-- ── 1. Developments Table ──
CREATE TABLE IF NOT EXISTS public.developments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,              -- URL-friendly: "monte-verde", "las-lomas"
    name TEXT NOT NULL,
    tagline_en TEXT,
    tagline_es TEXT,
    logo_url TEXT,                           -- Project logo (uploaded via Drive)
    developer_name TEXT,
    developer_contact TEXT,
    unit_label TEXT DEFAULT 'Lotes'          -- 'Lotes', 'Unidades', 'Apartamentos', 'Casas', 'Locales', or custom
      CHECK (unit_label IS NOT NULL AND unit_label != ''),

    -- Block-based page builder data (ordered array of section objects)
    sections JSONB DEFAULT '[]'::jsonb,

    -- Approval workflow
    status TEXT DEFAULT 'draft'
      CHECK (status IN ('draft', 'pending_approval', 'needs_changes', 'active', 'sold_out', 'archived')),
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.profiles(id),
    broker_notes TEXT,

    -- Ownership
    agent_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    office_code TEXT,

    -- Drive assets
    drive_folder_id TEXT,
    drive_folder_url TEXT,

    -- SEO / Social sharing
    og_image_url TEXT,                      -- Open Graph image for social media previews

    -- Auto-calculated summary fields (updated via trigger or app logic)
    total_units INTEGER DEFAULT 0,
    available_units INTEGER DEFAULT 0,
    price_range_min NUMERIC,
    price_range_max NUMERIC,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Add FK from properties → developments ──
-- (The column was added in 20260506_properties_full_schema.sql without FK to avoid ordering issues)
ALTER TABLE public.properties
    ADD CONSTRAINT fk_properties_development
    FOREIGN KEY (development_id) REFERENCES public.developments(id) ON DELETE SET NULL;

-- ── 3. Add FK from property_inquiries → developments ──
ALTER TABLE public.property_inquiries
    ADD CONSTRAINT fk_inquiries_development
    FOREIGN KEY (development_id) REFERENCES public.developments(id) ON DELETE SET NULL;

-- ── 4. Page Analytics / Event Tracking ──
CREATE TABLE IF NOT EXISTS public.page_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    development_id UUID REFERENCES public.developments(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL
      CHECK (event_type IN (
        'page_view', 'listing_click', 'whatsapp_click', 'faq_expand',
        'lead_submit', 'gallery_view', 'video_play', 'social_click', 'map_interact'
      )),
    event_meta JSONB DEFAULT '{}'::jsonb,   -- Which listing, which FAQ, which social button, etc.
    referrer TEXT,                           -- Where the visitor came from
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_developments_slug ON public.developments(slug);
CREATE INDEX IF NOT EXISTS idx_developments_status ON public.developments(status);
CREATE INDEX IF NOT EXISTS idx_developments_agent ON public.developments(agent_id);
CREATE INDEX IF NOT EXISTS idx_developments_office ON public.developments(office_code);

CREATE INDEX IF NOT EXISTS idx_page_events_development ON public.page_events(development_id);
CREATE INDEX IF NOT EXISTS idx_page_events_property ON public.page_events(property_id);
CREATE INDEX IF NOT EXISTS idx_page_events_type ON public.page_events(event_type);
CREATE INDEX IF NOT EXISTS idx_page_events_created ON public.page_events(created_at DESC);

-- ── Auto-update timestamp on developments ──
CREATE OR REPLACE FUNCTION update_developments_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER developments_updated
    BEFORE UPDATE ON public.developments
    FOR EACH ROW EXECUTE FUNCTION update_developments_timestamp();

-- ── RLS — Developments ──


-- Agents CRUD on own developments



-- Agents view events for their developments/properties


-- Brokers view all events



-- File: 20260506_properties_full_schema.sql
-- =============================================
-- PROPERTIES MODULE — Full Schema Expansion
-- Adds RECONNECT-compatible fields, approval workflow,
-- Drive-based photo workflow, and owner info to the existing properties table.
-- =============================================

-- ── 1. Remove old property_type CHECK constraint (expanding to full RECONNECT list) ──
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_property_type_check;

-- ── 2. Approval Workflow Fields ──
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft'
  CHECK (status IN ('draft', 'pending_approval', 'needs_changes', 'approved', 'published', 'cancelled'));
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS broker_notes TEXT;

-- ── 3. RECONNECT Sync Fields ──
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS reconnect_listing_id INTEGER;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS reconnect_listing_key TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS reconnect_last_sync TIMESTAMPTZ;

-- ── 4. Bilingual Listing Info ──
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS listing_title_en TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS listing_title_es TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS public_remarks_en TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS public_remarks_es TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS private_remarks_en TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS private_remarks_es TEXT;

-- ── 5. Listing Classification ──
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS listing_contract_type INTEGER DEFAULT 1; -- 1=Sale, 2=Rent
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS standard_status_id INTEGER DEFAULT 1;    -- Active, Under Offer, etc.
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS listing_probable_use_id INTEGER DEFAULT 1; -- General, Commercial, Collection
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS property_type_id INTEGER;                -- From RECONNECT Lookups
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS property_general_location_id INTEGER;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS property_new BOOLEAN DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS furnished BOOLEAN DEFAULT false;

-- ── 6. Dates ──
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS listing_contract_date DATE;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS expiration_date DATE;

-- ── 7. Owner Contact Info ──
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS owner_phones TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS owner_email TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS listing_agreement BOOLEAN DEFAULT false;

-- ── 8. Commission ──
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS listing_side_comm NUMERIC DEFAULT 3;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS selling_side_comm NUMERIC DEFAULT 3;

-- ── 9. Geo / Location (RECONNECT IDs) ──
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS country_id INTEGER DEFAULT 52; -- Costa Rica
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS state_dep_prov_id INTEGER;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS location_id INTEGER;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS longitude NUMERIC;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS unparsed_address TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- ── 10. Property Details ──
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS bedrooms_total INTEGER DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS bathrooms_full INTEGER DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS bathrooms_half INTEGER DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS stories INTEGER DEFAULT 1;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS lot_size_area NUMERIC;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS lot_size_units_id INTEGER DEFAULT 1; -- sqm
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS construction_size NUMERIC;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS construction_size_living NUMERIC;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS construction_size_units_id INTEGER DEFAULT 1;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS year_built INTEGER;

-- ── 11. Amenities ──
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS garage BOOLEAN DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS garage_spaces INTEGER DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS garage_covered BOOLEAN DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS pool_private BOOLEAN DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS cooling BOOLEAN DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS has_view BOOLEAN DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS maid_room BOOLEAN DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS gated_community BOOLEAN DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS has_association BOOLEAN DEFAULT false;

-- ── 12. Pricing ──
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS list_price NUMERIC;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS list_price_currency_id INTEGER DEFAULT 2; -- USD
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS list_price_private BOOLEAN DEFAULT false;

-- ── 13. Marketing ──
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS video_link TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS seo_keywords TEXT;

-- ── 14. Office / Internal ──
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS office_code TEXT;

-- ── 15. Drive Photos Workflow ──
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS drive_photos_folder_id TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS drive_photos_folder_url TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS photos_ready BOOLEAN DEFAULT false;

-- ── 16. Development Link (nullable FK — set after developments table exists) ──
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS development_id UUID;

-- ── 17. Performance Indexes ──
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_reconnect_id ON public.properties(reconnect_listing_id);
CREATE INDEX IF NOT EXISTS idx_properties_office ON public.properties(office_code);
CREATE INDEX IF NOT EXISTS idx_properties_development ON public.properties(development_id);

-- ── 18. Broker RLS Policies ──
-- Brokers can view ALL properties (for approval workflow)


-- Brokers can update ALL properties (to approve/reject)


-- Team leaders can view team properties



-- File: 20260506_property_images.sql
-- =============================================
-- PROPERTY IMAGES — Drive-based photo management
-- Tracks images synced from Google Drive for each property.
-- =============================================

CREATE TABLE IF NOT EXISTS public.property_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    drive_file_id TEXT,                    -- Google Drive file ID (source of truth)
    reconnect_photo_id INTEGER,            -- ID returned by RECONNECT after upload
    priority INTEGER DEFAULT 0,            -- Display order (0 = main image)
    alt_text TEXT,                          -- Accessibility / SEO
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_property_images_property ON public.property_images(property_id);
CREATE INDEX IF NOT EXISTS idx_property_images_priority ON public.property_images(property_id, priority);
CREATE INDEX IF NOT EXISTS idx_property_images_drive ON public.property_images(drive_file_id);

-- ── Auto-update timestamp ──
CREATE OR REPLACE FUNCTION update_property_images_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER property_images_updated
    BEFORE UPDATE ON public.property_images
    FOR EACH ROW EXECUTE FUNCTION update_property_images_timestamp();

-- ── RLS ──


-- Agents manage images on their own properties


-- Brokers can view all property images


-- Brokers can manage all property images (for approval edits)


-- Public read for published properties (for public feeds and landing pages)



-- File: 20260506_property_syndication.sql
-- =============================================
-- PROPERTY SYNDICATION & INQUIRY TRACKING
-- Tracks where each property is published (portals)
-- and incoming leads from those portals.
-- =============================================

-- ── 1. Syndication Status per Portal ──
CREATE TABLE IF NOT EXISTS public.property_syndication (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    portal_name TEXT NOT NULL,             -- 'reconnect', 'encuentra24', 'chozi', 'listglobally', etc.
    portal_listing_id TEXT,                -- External ID on the portal
    portal_listing_url TEXT,               -- Direct link to the listing on that portal
    status TEXT DEFAULT 'pending'
      CHECK (status IN ('pending', 'synced', 'error', 'removed')),
    last_synced_at TIMESTAMPTZ,
    error_message TEXT,
    inquiry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(property_id, portal_name)       -- One record per property per portal
);

-- ── 2. Inquiries / Leads from Portals ──
CREATE TABLE IF NOT EXISTS public.property_inquiries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    development_id UUID,                   -- FK set after developments table exists
    portal_name TEXT,                       -- 'reconnect', 'encuentra24', 'development_page', etc.
    lead_name TEXT,
    lead_email TEXT,
    lead_phone TEXT,
    message TEXT,
    referrer TEXT,                          -- URL or source that brought the lead
    received_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_agent_id UUID REFERENCES users(id),
    status TEXT DEFAULT 'new'
      CHECK (status IN ('new', 'contacted', 'converted', 'dismissed')),
    notes TEXT,                             -- Agent's internal notes on the lead
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_syndication_property ON public.property_syndication(property_id);
CREATE INDEX IF NOT EXISTS idx_syndication_portal ON public.property_syndication(portal_name);
CREATE INDEX IF NOT EXISTS idx_syndication_status ON public.property_syndication(status);

CREATE INDEX IF NOT EXISTS idx_inquiries_property ON public.property_inquiries(property_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_development ON public.property_inquiries(development_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_agent ON public.property_inquiries(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON public.property_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_received ON public.property_inquiries(received_at DESC);

-- ── Auto-update timestamps ──
CREATE OR REPLACE FUNCTION update_syndication_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER syndication_updated
    BEFORE UPDATE ON public.property_syndication
    FOR EACH ROW EXECUTE FUNCTION update_syndication_timestamp();

CREATE OR REPLACE FUNCTION update_inquiry_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inquiry_updated
    BEFORE UPDATE ON public.property_inquiries
    FOR EACH ROW EXECUTE FUNCTION update_inquiry_timestamp();

-- ── RLS ──



-- Syndication: agents see their own, brokers see all



-- File: 20260507_contact_newsletter_optin.sql
-- =============================================
-- Contacts Newsletter Opt-In — Supabase Migration
-- Adds newsletter_opt_in boolean field
-- =============================================

DO $$
BEGIN
    -- Add newsletter_opt_in boolean column (default false)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='newsletter_opt_in') THEN
        ALTER TABLE contacts ADD COLUMN newsletter_opt_in BOOLEAN DEFAULT false;
    END IF;
END $$;


-- File: 20260507_listing_milestones.sql
-- =============================================
-- LISTING MILESTONES — Process Timeline Tracking
-- Stores timestamped events for each property's
-- journey through the listing lifecycle.
-- =============================================

CREATE TABLE IF NOT EXISTS listing_milestones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES users(id),

    -- Milestone timestamps (nullable = not yet reached)
    contact_created_at      TIMESTAMPTZ,  -- When contact was first created
    prelisting_at           TIMESTAMPTZ,  -- Pre-listing interview completed
    cma_created_at          TIMESTAMPTZ,  -- CMA/ACM report generated
    listing_created_at      TIMESTAMPTZ,  -- Property draft created in Hub
    photos_requested_at     TIMESTAMPTZ,  -- Photographer assigned / photos requested
    photos_ready_at         TIMESTAMPTZ,  -- Photos uploaded and marked ready
    authorization_signed_at TIMESTAMPTZ,  -- Owner signed listing agreement
    submitted_at            TIMESTAMPTZ,  -- Sent to broker for approval
    broker_approved_at      TIMESTAMPTZ,  -- Broker approved
    published_at            TIMESTAMPTZ,  -- Live on MLS / RECONNECT

    -- Metadata
    photographer_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(property_id)
);

-- ── Performance Indexes ──
CREATE INDEX IF NOT EXISTS idx_milestones_property ON listing_milestones(property_id);
CREATE INDEX IF NOT EXISTS idx_milestones_agent ON listing_milestones(agent_id);
CREATE INDEX IF NOT EXISTS idx_milestones_published ON listing_milestones(published_at);

-- ── Auto-update timestamp ──
CREATE OR REPLACE FUNCTION update_milestones_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER milestones_updated
    BEFORE UPDATE ON listing_milestones
    FOR EACH ROW EXECUTE FUNCTION update_milestones_timestamp();

-- ── Row Level Security ──


-- Agents can manage their own milestones


-- Brokers can view ALL milestones (for analytics)


-- Team leaders can view their team's milestones



-- File: 20260508_communication_log.sql
-- =============================================
-- COMMUNICATION LOG + FOLLOW-UP SYSTEM
-- Tracks agent-lead interactions and reminders
-- =============================================

-- 1. Lead Communications — every interaction logged
CREATE TABLE IF NOT EXISTS public.lead_communications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    inquiry_id UUID NOT NULL REFERENCES public.property_inquiries(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    channel TEXT NOT NULL DEFAULT 'whatsapp'
      CHECK (channel IN ('whatsapp','email','phone','in_person')),
    direction TEXT NOT NULL DEFAULT 'outbound'
      CHECK (direction IN ('outbound','inbound')),
    summary TEXT NOT NULL DEFAULT '',
    follow_up_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comm_inquiry ON public.lead_communications(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_comm_agent ON public.lead_communications(agent_id);
CREATE INDEX IF NOT EXISTS idx_comm_followup ON public.lead_communications(follow_up_date)
  WHERE follow_up_date IS NOT NULL;

-- 2. Lead Follow-Ups — standalone reminders
CREATE TABLE IF NOT EXISTS public.lead_follow_ups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    inquiry_id UUID NOT NULL REFERENCES public.property_inquiries(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    due_date DATE NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending','completed','skipped')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_followup_inquiry ON public.lead_follow_ups(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_followup_agent ON public.lead_follow_ups(agent_id);
CREATE INDEX IF NOT EXISTS idx_followup_due ON public.lead_follow_ups(due_date)
  WHERE status = 'pending';

-- 3. RLS — Agents see own records, brokers see all



-- Communications: agents read/write own, brokers read all




-- Follow-ups: agents read/write own, brokers manage all





-- File: 20260508_lead_management.sql
-- =============================================
-- LEAD MANAGEMENT — Extends property_inquiries
-- Creates configurable lead_sources table
-- =============================================

-- 1. New columns on property_inquiries
ALTER TABLE public.property_inquiries 
  ADD COLUMN IF NOT EXISTS lead_type TEXT DEFAULT 'otro'
    CHECK (lead_type IN ('propiedad_especifica','comprar','vender','alquiler','otro'));

ALTER TABLE public.property_inquiries
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

ALTER TABLE public.property_inquiries
  ADD COLUMN IF NOT EXISTS lead_language TEXT DEFAULT 'es'
    CHECK (lead_language IN ('es', 'en', 'other'));

CREATE INDEX IF NOT EXISTS idx_inquiries_type ON public.property_inquiries(lead_type);
CREATE INDEX IF NOT EXISTS idx_inquiries_source ON public.property_inquiries(source);

-- 2. Configurable lead sources table
CREATE TABLE IF NOT EXISTS public.lead_sources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    label_es TEXT NOT NULL,
    label_en TEXT NOT NULL,
    icon TEXT DEFAULT '📋',
    sort_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.lead_sources (name, label_es, label_en, icon, sort_order) VALUES
  ('whatsapp_oficina','WhatsApp Oficina','Office WhatsApp','💬',1),
  ('llamada_celular','Llamada celular','Cell Phone Call','📱',2),
  ('guardia_fisica','Guardia fisica','Physical Guard','🛡',3),
  ('referido_broker','Referido del broker','Broker Referral','🤝',4),
  ('facebook_ig','Facebook/IG Oficina','Office Facebook/IG','📘',5),
  ('mkt_oficina','MKT Oficina','Office Marketing','📣',6),
  ('walk_in','Walk in','Walk In','🚶',7),
  ('remax_cr','REMAX Costa Rica','REMAX Costa Rica','🔵',8),
  ('remax_cca','REMAX CCA','REMAX CCA','🔵',9),
  ('remax_intl','REMAX International','REMAX International','🌐',10),
  ('correo_oficina','Correo Oficina','Office Email','📧',11),
  ('realtor_com','Realtor.com','Realtor.com','🏠',12),
  ('crcasas','crCasas','crCasas','🏡',13),
  ('anuntico','Anuntico','Anuntico','📰',14),
  ('expat','Expat / ARCR','Expat / ARCR','✈',15),
  ('yourhomecr','YourHomeCR','YourHomeCR','🏘',16),
  ('buscocasita','BuscoCasita','BuscoCasita','🔍',17),
  ('bienesonline','BienesOnline','BienesOnline','💻',18),
  ('4321property','4321 Property','4321 Property','🔢',19),
  ('mls','MLS','MLS','📊',20),
  ('terra_cr','Terra CR','Terra CR','🌎',21),
  ('propiedades_cr','Propiedades CR','Propiedades CR','📋',22),
  ('development_page','Pagina de Desarrollo','Development Page','🏗',23),
  ('otra','Otra','Other','➕',99)
ON CONFLICT (name) DO NOTHING;








-- File: 20260509_referrals.sql
-- =============================================
-- REFERRAL MANAGEMENT SYSTEM
-- Tracks referrals sent/received between agents,
-- with configurable fee % (default 25% of gross side),
-- support for external offices, and "Referred by" labels.
-- =============================================

-- ══════════════════════════════════════════════
-- 1. AGENT REFERRALS — Core referral tracking table
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.agent_referrals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Who sends the referral
    referring_agent_id UUID REFERENCES public.profiles(id),
    referring_agent_name TEXT,            -- Denormalized for external agents
    referring_office TEXT,                -- 'altitud', 'cero', or external office name

    -- Who receives the referral
    receiving_agent_id UUID REFERENCES public.profiles(id),
    receiving_agent_name TEXT,            -- Denormalized for external agents
    receiving_office TEXT,                -- 'altitud', 'cero', or external office name

    -- Client being referred
    client_name TEXT NOT NULL,
    client_email TEXT,
    client_phone TEXT,

    -- Property (optional link)
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    property_address TEXT,                -- Free text if no linked property

    -- Referral direction (from the creating agent's perspective)
    direction TEXT NOT NULL DEFAULT 'sent'
      CHECK (direction IN ('sent', 'received')),

    -- Referral fee (configurable, default 25%)
    referral_fee_pct NUMERIC NOT NULL DEFAULT 25,
    referral_fee_amount NUMERIC DEFAULT 0,    -- Calculated: gross_side_amount × fee_pct / 100
    gross_side_amount NUMERIC DEFAULT 0,      -- The gross side amount used for fee calc

    -- Status workflow
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'active', 'closed', 'paid', 'cancelled')),

    -- Commission link (when deal closes)
    commission_id UUID REFERENCES public.agent_commissions(id) ON DELETE SET NULL,

    -- Dates
    closing_date DATE,
    payment_date DATE,

    -- Notes
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_referrals_referring ON public.agent_referrals(referring_agent_id);
CREATE INDEX IF NOT EXISTS idx_referrals_receiving ON public.agent_referrals(receiving_agent_id);
CREATE INDEX IF NOT EXISTS idx_referrals_property ON public.agent_referrals(property_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.agent_referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_direction ON public.agent_referrals(direction);
CREATE INDEX IF NOT EXISTS idx_referrals_closing ON public.agent_referrals(closing_date);

-- ── Auto-update timestamp ──
CREATE OR REPLACE FUNCTION update_referral_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER referral_updated
    BEFORE UPDATE ON public.agent_referrals
    FOR EACH ROW EXECUTE FUNCTION update_referral_timestamp();

-- ── RLS ──


-- Agents see referrals where they are the referring OR receiving agent


-- Agents can update their own referrals


-- Brokers see all referrals


-- Brokers manage all referrals


-- ══════════════════════════════════════════════
-- 2. PROPERTIES — Add "Referred by" FK
-- ══════════════════════════════════════════════

ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS referred_by_agent_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS referred_by_name TEXT;  -- For external referrals

CREATE INDEX IF NOT EXISTS idx_properties_referred_by ON public.properties(referred_by_agent_id);

-- ══════════════════════════════════════════════
-- 3. PROPERTY INQUIRIES — Add "Referred by" FK
-- ══════════════════════════════════════════════

ALTER TABLE public.property_inquiries ADD COLUMN IF NOT EXISTS referred_by_agent_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.property_inquiries ADD COLUMN IF NOT EXISTS referred_by_name TEXT;

CREATE INDEX IF NOT EXISTS idx_inquiries_referred_by ON public.property_inquiries(referred_by_agent_id);


-- File: 20260509_sold_commission_analytics.sql
-- =============================================
-- SOLD STATUS, COMMISSION SYSTEM, ANALYTICS & ONBOARDING
-- Comprehensive migration for:
--   1. Sold property status + fields
--   2. Commission split tiers (90/80/60/45%)
--   3. Agent commission tracking
--   4. Listing analytics (page views + daily stats)
--   5. Agent history imports
--   6. Onboarding profile fields
-- =============================================

-- ══════════════════════════════════════════════
-- 1. PROPERTIES — Add 'sold' status + sold fields
-- ══════════════════════════════════════════════

-- Drop and recreate the status CHECK to include 'sold'
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_status_check;
ALTER TABLE public.properties ADD CONSTRAINT properties_status_check
  CHECK (status IN ('draft','pending_approval','needs_changes','approved','published','sold','cancelled'));

-- Sold property fields
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS sold_price NUMERIC;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS sold_date DATE;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS buyer_name TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS buyer_agent TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS buyer_agent_office TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS days_on_market INTEGER;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS import_batch_id UUID;

-- Index for sold properties
CREATE INDEX IF NOT EXISTS idx_properties_sold_date ON public.properties(sold_date);

-- ══════════════════════════════════════════════
-- 2. COMMISSION TIERS — Configurable split levels
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.commission_tiers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    label_es TEXT NOT NULL,
    label_en TEXT NOT NULL,
    agent_split_pct NUMERIC NOT NULL,       -- e.g., 90, 80, 60, 45
    monthly_fee_usd NUMERIC NOT NULL,       -- Before IVA
    iva_pct NUMERIC NOT NULL DEFAULT 13,    -- Costa Rica IVA
    monthly_fee_total NUMERIC GENERATED ALWAYS AS (monthly_fee_usd * (1 + iva_pct / 100)) STORED,
    fee_starts_month INTEGER NOT NULL DEFAULT 6,  -- Month when fee kicks in
    rcca_fee_pct NUMERIC NOT NULL DEFAULT 6,      -- RE/MAX CCA franchise fee
    sort_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the 4 tiers
INSERT INTO public.commission_tiers (name, label_es, label_en, agent_split_pct, monthly_fee_usd, sort_order) VALUES
  ('premium',  'Premium (90%)',  'Premium (90%)',  90, 1000, 1),
  ('gold',     'Gold (80%)',     'Gold (80%)',     80, 500,  2),
  ('standard', 'Estándar (60%)', 'Standard (60%)', 60, 200,  3),
  ('starter',  'Inicial (45%)',  'Starter (45%)',  45, 75,   4)
ON CONFLICT (name) DO NOTHING;

-- RLS








-- ══════════════════════════════════════════════
-- 7. LISTING DAILY STATS — Aggregated analytics
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.listing_daily_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    development_id UUID,
    stat_date DATE NOT NULL,
    total_views INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    avg_duration_seconds INTEGER DEFAULT 0,
    top_referrer TEXT,
    mobile_pct NUMERIC DEFAULT 0,
    desktop_pct NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint per property per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_stats_prop_date
  ON public.listing_daily_stats(property_id, stat_date)
  WHERE property_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_stats_dev_date
  ON public.listing_daily_stats(development_id, stat_date)
  WHERE development_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON public.listing_daily_stats(stat_date);

-- RLS









-- File: 20260510_add_acm_property_name.sql
-- Agregar campo property_name a la tabla acm_reports
ALTER TABLE acm_reports ADD COLUMN IF NOT EXISTS property_name TEXT;


-- File: 20260510_add_acm_status_to_properties.sql
-- Añadir el estado 'acm' a las opciones válidas de status en la tabla properties
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_status_check;

ALTER TABLE public.properties ADD CONSTRAINT properties_status_check 
  CHECK (status IN ('draft', 'pending_approval', 'needs_changes', 'approved', 'published', 'cancelled', 'acm'));


-- File: 20260510_event_attendance_status.sql
-- Migration: Add status to event_attendance
-- Replaces boolean `attended` with a categorical `status`.

ALTER TABLE event_attendance 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ausente' 
CHECK (status IN ('presente', 'ausente', 'ausente_aviso', 'no_obligatoria'));

-- Migrate existing data
UPDATE event_attendance SET status = 'presente' WHERE attended = true;
UPDATE event_attendance SET status = 'ausente' WHERE attended = false OR attended IS NULL;

-- Keep `attended` column for now to prevent breaking existing queries, but it can be removed later.


-- File: 20260510_explicit_with_check.sql
-- =============================================
-- FIX: Explicit WITH CHECK for UPDATE policies
-- =============================================

-- Sometimes Postgres requires an explicit WITH CHECK on UPDATE policies
-- to prevent "new row violates row-level security policy" when multiple policies exist.

DROP POLICY IF EXISTS "Brokers can update all properties" ON public.properties;



DROP POLICY IF EXISTS "Agents can update their own properties" ON public.properties;




-- File: 20260510_fix_profiles_rls_recursion.sql
-- =============================================
-- FIX: Infinite recursion in profiles RLS policies
-- =============================================

-- 1. Create a SECURITY DEFINER function to get the current user's role securely
-- This bypasses RLS on the profiles table and prevents infinite recursion.
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- 2. Create a SECURITY DEFINER function to check if the current user is a team leader
CREATE OR REPLACE FUNCTION public.is_team_leader_of(target_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teams t
    JOIN public.profiles p ON p.id = t.leader_id
    WHERE t.id = target_team_id AND p.auth_user_id = auth.uid()
  );
$$;

-- 3. Drop the old recursive policies on `profiles`
DROP POLICY IF EXISTS "Broker reads all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Broker inserts profiles" ON public.profiles;
DROP POLICY IF EXISTS "Broker updates profiles" ON public.profiles;
DROP POLICY IF EXISTS "Team leader reads team" ON public.profiles;

-- 4. Recreate the policies using the new SECURITY DEFINER functions







-- File: 20260510_fix_properties_rls.sql
-- =============================================
-- FIX: Infinite recursion when approving properties
-- =============================================

-- 1. Ensure the SECURITY DEFINER function exists (this safely bypasses RLS recursion)
-- Using STABLE ensures Postgres caches the result per statement
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- 2. Ensure the Team Leader function exists
CREATE OR REPLACE FUNCTION public.is_team_leader_of(target_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teams t
    JOIN public.profiles p ON p.id = t.leader_id
    WHERE t.id = target_team_id AND p.auth_user_id = auth.uid()
  );
$$;

-- 3. Drop the old recursive policies on properties
DROP POLICY IF EXISTS "Brokers can view all properties" ON public.properties;
DROP POLICY IF EXISTS "Brokers can update all properties" ON public.properties;
DROP POLICY IF EXISTS "Team leaders can view team properties" ON public.properties;

-- 4. Recreate the policies using the new SECURITY DEFINER functions




-- Note: The team leader policy was causing recursion because it queried profiles



-- File: 20260510_fix_rls_recursion.sql
-- =============================================
-- FIX: Infinite recursion in profiles and properties policies
-- =============================================

-- 1. Create SECURITY DEFINER functions to securely get user roles without triggering RLS
-- Using STABLE ensures Postgres caches the result per statement, preventing massive slowdowns
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_team_leader_of(target_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teams t
    JOIN public.profiles p ON p.id = t.leader_id
    WHERE t.id = target_team_id AND p.auth_user_id = auth.uid()
  );
$$;

-- 2. Fix PROFILES table policies
DROP POLICY IF EXISTS "Broker reads all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Broker inserts profiles" ON public.profiles;
DROP POLICY IF EXISTS "Broker updates profiles" ON public.profiles;
DROP POLICY IF EXISTS "Team leader reads team" ON public.profiles;







-- 3. Fix PROPERTIES table policies
DROP POLICY IF EXISTS "Brokers can view all properties" ON public.properties;
DROP POLICY IF EXISTS "Brokers can update all properties" ON public.properties;
DROP POLICY IF EXISTS "Team leaders can view team properties" ON public.properties;








-- File: 20260510_integrations_and_properties.sql
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




-- Insert default rows
INSERT INTO public.office_settings (office_id) VALUES ('altitud'), ('cero') ON CONFLICT (office_id) DO NOTHING;



-- File: 20260510_office_expenses.sql
-- =============================================
-- OFFICE FINANCE & PETTY CASH SYSTEM
-- Comprehensive migration for:
--   1. New role: office_assistant
--   2. Expense categories & expenses
--   3. Petty cash tracking (Caja Chica)
--   4. Fixed salary configuration
-- =============================================

-- ══════════════════════════════════════════════
-- 1. ROLE EXTENSION
-- ══════════════════════════════════════════════

-- Drop existing constraint (if any) and recreate to include office_assistant
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('broker', 'team_leader', 'agent', 'office_assistant', 'junior'));

-- ══════════════════════════════════════════════
-- 2. EXPENSE CATEGORIES
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS office_expense_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    label_es TEXT NOT NULL,
    label_en TEXT NOT NULL,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    office TEXT DEFAULT 'altitud' CHECK (office IN ('altitud','cero')),
    active BOOLEAN DEFAULT true
);

-- Seed default categories
INSERT INTO office_expense_categories (name, label_es, label_en, icon, sort_order) VALUES
  ('marca', 'MARCA', 'BRAND', '🏷️', 1),
  ('rrhh', 'RRHH', 'HR', '👥', 2),
  ('alquiler', 'Alquiler', 'Rent', '🏠', 3),
  ('marketing', 'Marketing', 'Marketing', '📣', 4),
  ('eventos', 'Eventos', 'Events', '🎪', 5),
  ('oficina', 'Oficina', 'Office', '🏢', 6)
ON CONFLICT (name) DO NOTHING;





-- ══════════════════════════════════════════════
-- 3. PETTY CASH FUNDS
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS petty_cash_funds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assistant_id UUID NOT NULL REFERENCES profiles(id),
    office TEXT DEFAULT 'altitud' CHECK (office IN ('altitud','cero')),
    initial_amount NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'CRC' CHECK (currency IN ('USD', 'CRC')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 4. OFFICE EXPENSES
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS office_expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES office_expense_categories(id),
    office TEXT DEFAULT 'altitud' CHECK (office IN ('altitud','cero')),
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'CRC' CHECK (currency IN ('USD', 'CRC')),
    
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    
    is_recurring BOOLEAN DEFAULT false,
    recurrence_type TEXT CHECK (recurrence_type IN ('monthly_start', 'monthly_end', 'biweekly', 'weekly', 'one_time')),
    recurrence_day INTEGER, -- E.g. day of month
    
    due_date DATE,
    paid_date DATE,
    paid_by UUID REFERENCES profiles(id),
    
    payment_source TEXT CHECK (payment_source IN ('bank', 'petty_cash')),
    petty_cash_fund_id UUID REFERENCES petty_cash_funds(id),
    
    source_type TEXT DEFAULT 'manual' CHECK (source_type IN ('manual', 'rcca_auto', 'agent_fee_auto', 'salary_auto')),
    source_ref_id UUID, -- For linking to agent_commissions or profile
    
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 5. PETTY CASH TRANSACTIONS
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS petty_cash_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fund_id UUID NOT NULL REFERENCES petty_cash_funds(id),
    type TEXT NOT NULL CHECK (type IN ('replenish', 'expense')),
    amount NUMERIC NOT NULL, -- Positive for replenish, positive for expense
    expense_id UUID REFERENCES office_expenses(id), -- Link if type=expense
    description TEXT NOT NULL,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 6. SALARY CONFIGURATION
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS office_salary_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_name TEXT NOT NULL,
    amount_per_period NUMERIC NOT NULL,
    currency TEXT DEFAULT 'CRC' CHECK (currency IN ('USD', 'CRC')),
    office TEXT DEFAULT 'altitud' CHECK (office IN ('altitud','cero')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- INDEXES & TIMESTAMPS
-- ══════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_office_expenses_date ON office_expenses(due_date);
CREATE INDEX IF NOT EXISTS idx_office_expenses_status ON office_expenses(status);
CREATE INDEX IF NOT EXISTS idx_petty_cash_tx_fund ON petty_cash_transactions(fund_id);

CREATE OR REPLACE FUNCTION update_office_expenses_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER office_expenses_updated
    BEFORE UPDATE ON office_expenses
    FOR EACH ROW EXECUTE FUNCTION update_office_expenses_timestamp();

CREATE OR REPLACE FUNCTION update_petty_cash_funds_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER petty_cash_funds_updated
    BEFORE UPDATE ON petty_cash_funds
    FOR EACH ROW EXECUTE FUNCTION update_petty_cash_funds_timestamp();

-- ══════════════════════════════════════════════
-- RLS POLICIES
-- ══════════════════════════════════════════════






-- Brokers and Office Assistants can manage everything









-- File: 20260510_office_incomes.sql
-- =============================================
-- OFFICE INCOMES SYSTEM
-- Extension of office expenses to handle incomes
-- =============================================

-- 1. Extend office_expense_categories to have a type
ALTER TABLE office_expense_categories ADD COLUMN type TEXT DEFAULT 'expense' CHECK (type IN ('expense', 'income', 'both'));

-- 2. Insert default income categories
INSERT INTO office_expense_categories (name, label_es, label_en, icon, sort_order, type) VALUES
  ('agent_fee', 'Agent Fee', 'Agent Fee', '💳', 7, 'income'),
  ('commissions', 'Comisiones', 'Commissions', '💰', 8, 'income'),
  ('cash_deposit', 'Aporte Efectivo', 'Cash Deposit', '💵', 9, 'income')
ON CONFLICT (name) DO UPDATE SET type = EXCLUDED.type;

-- 3. Extend office_expenses to be a general transactions ledger
ALTER TABLE office_expenses ADD COLUMN transaction_type TEXT DEFAULT 'expense' CHECK (transaction_type IN ('expense', 'income'));

-- 4. Update status constraint to include 'received'
ALTER TABLE office_expenses DROP CONSTRAINT IF EXISTS office_expenses_status_check;
ALTER TABLE office_expenses ADD CONSTRAINT office_expenses_status_check CHECK (status IN ('pending', 'paid', 'received', 'cancelled'));

-- 5. Update petty cash transaction type to include 'income'
ALTER TABLE petty_cash_transactions DROP CONSTRAINT IF EXISTS petty_cash_transactions_type_check;
ALTER TABLE petty_cash_transactions ADD CONSTRAINT petty_cash_transactions_type_check CHECK (type IN ('replenish', 'expense', 'income'));

-- Create index on transaction_type for better query performance
CREATE INDEX IF NOT EXISTS idx_office_expenses_type ON office_expenses(transaction_type);


-- File: 20260510_page_events_pdf_download.sql
-- Add pdf_download to page_events event_type
ALTER TABLE public.page_events DROP CONSTRAINT page_events_event_type_check;

ALTER TABLE public.page_events ADD CONSTRAINT page_events_event_type_check 
CHECK (event_type IN (
  'page_view', 'listing_click', 'whatsapp_click', 'faq_expand',
  'lead_submit', 'gallery_view', 'video_play', 'social_click', 'map_interact',
  'pdf_download'
));


-- File: 20260511114620_buyer_searches.sql
CREATE TABLE IF NOT EXISTS public.buyer_searches (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    agent_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    client_name TEXT NOT NULL,
    property_type TEXT NOT NULL,
    price_min NUMERIC,
    price_max NUMERIC,
    purchase_timeframe TEXT,
    purchase_type TEXT,
    zone_name TEXT,
    lat NUMERIC,
    lng NUMERIC,
    status TEXT DEFAULT 'activa',
    last_verified_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.buyer_search_pipeline (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    search_id UUID REFERENCES public.buyer_searches(id) ON DELETE CASCADE NOT NULL,
    match_type TEXT NOT NULL, -- 'property', 'acm', 'development'
    match_id UUID NOT NULL,
    status TEXT DEFAULT 'enviada', -- 'enviada', 'interesado', 'rechazada'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(search_id, match_type, match_id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS para buyer_searches




-- RLS para buyer_search_pipeline



-- RLS para notifications





-- File: 20260511142000_buyer_portal.sql
-- Add new columns to existing tables
ALTER TABLE public.buyer_searches ADD COLUMN IF NOT EXISTS evaluation_parameters JSONB DEFAULT '["Ubicación", "Precio", "Metros Cuadrados", "Estado de Conservación"]'::jsonb;
ALTER TABLE public.buyer_search_pipeline ADD COLUMN IF NOT EXISTS external_data JSONB;

-- Create buyer_search_votes table
CREATE TABLE IF NOT EXISTS public.buyer_search_votes (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    pipeline_id UUID REFERENCES public.buyer_search_pipeline(id) ON DELETE CASCADE NOT NULL,
    voter_name TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    decision TEXT, -- 'visita', 'negociar', 'descartar', etc.
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for buyer_search_votes


-- Agents can see votes on their pipelines


-- Also Public can view votes for a pipeline (to see what their partner voted)




-- File: 20260511153000_buyer_tolerance.sql
ALTER TABLE public.buyer_searches ADD COLUMN IF NOT EXISTS price_tolerance NUMERIC DEFAULT 0;


-- File: 20260511160000_buyer_requirements.sql
ALTER TABLE public.buyer_searches 
ADD COLUMN IF NOT EXISTS operation_type TEXT DEFAULT 'venta' CHECK (operation_type IN ('venta', 'alquiler')),
ADD COLUMN IF NOT EXISTS zones JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS must_haves JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS nice_to_haves JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.buyer_search_pipeline
ADD COLUMN IF NOT EXISTS requirements_match JSONB DEFAULT '{}'::jsonb;

-- Modify the status check for pipeline if possible, but standard is just trusting text. Let's not alter the check constraint, just insert the new text.

ALTER TABLE public.buyer_search_votes
ADD COLUMN IF NOT EXISTS visit_rating INTEGER CHECK (visit_rating >= 1 AND visit_rating <= 5),
ADD COLUMN IF NOT EXISTS visit_notes TEXT;


-- File: 20260511161000_buyer_physical_attributes.sql
-- Add physical attributes to buyer_searches for stricter matching
ALTER TABLE public.buyer_searches 
ADD COLUMN IF NOT EXISTS min_bedrooms INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_bathrooms INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_sqm NUMERIC DEFAULT 0;


-- File: 20260511_agent_evaluations.sql
-- Add psicotest and analysis columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS psicotest_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS psicotest_file_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS olympia_behavior_analysis TEXT;

-- Create agent_notes table for multiple meeting notes over time
CREATE TABLE IF NOT EXISTS agent_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    note_content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for agent_notes





-- File: 20260511_lead_sla.sql
-- =============================================
-- LEAD SLA & REJECTION UPDATES
-- =============================================

-- 1. Add SLA columns to property_inquiries
ALTER TABLE public.property_inquiries 
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_contact_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. Update status constraint
ALTER TABLE public.property_inquiries DROP CONSTRAINT IF EXISTS property_inquiries_status_check;

ALTER TABLE public.property_inquiries
  ADD CONSTRAINT property_inquiries_status_check 
  CHECK (status IN ('new', 'contacted', 'converted', 'dismissed', 'rejected', 'prelisting', 'cma', 'listed'));

-- 3. Trigger to automatically set assigned_at
CREATE OR REPLACE FUNCTION update_inquiry_assigned_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.assigned_agent_id IS DISTINCT FROM OLD.assigned_agent_id AND NEW.assigned_agent_id IS NOT NULL THEN
        NEW.assigned_at = NOW();
        NEW.sla_breached = false;
        NEW.first_contact_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inquiry_assigned_trigger ON public.property_inquiries;
CREATE TRIGGER inquiry_assigned_trigger
    BEFORE UPDATE ON public.property_inquiries
    FOR EACH ROW EXECUTE FUNCTION update_inquiry_assigned_at();

-- If existing leads are assigned, backfill assigned_at
UPDATE public.property_inquiries 
SET assigned_at = created_at 
WHERE assigned_agent_id IS NOT NULL AND assigned_at IS NULL;

-- 4. Trigger to automatically set first_contact_at
CREATE OR REPLACE FUNCTION update_inquiry_first_contact()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.property_inquiries
    SET 
        first_contact_at = COALESCE(first_contact_at, NOW()),
        status = CASE WHEN status = 'new' THEN 'contacted' ELSE status END
    WHERE id = NEW.inquiry_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS communication_inserted_trigger ON public.lead_communications;
CREATE TRIGGER communication_inserted_trigger
    AFTER INSERT ON public.lead_communications
    FOR EACH ROW EXECUTE FUNCTION update_inquiry_first_contact();


-- File: 20260512_acm_rental_analysis.sql
-- =============================================
-- ACM Rental Yield Analysis Fields
-- Adds rental profitability (cap rate) columns to acm_reports
-- =============================================

ALTER TABLE acm_reports
  -- Which analysis mode was used
  ADD COLUMN IF NOT EXISTS analysis_type     TEXT DEFAULT 'comparables',   -- 'comparables' | 'rentabilidad'

  -- Rental income inputs
  ADD COLUMN IF NOT EXISTS rental_units      INTEGER,                       -- Number of rentable units
  ADD COLUMN IF NOT EXISTS rental_price      NUMERIC,                       -- Monthly rent per unit (USD)

  -- Expense inputs
  ADD COLUMN IF NOT EXISTS expenses_amount   NUMERIC,                       -- Total operating expenses entered
  ADD COLUMN IF NOT EXISTS expenses_period   TEXT DEFAULT 'monthly',        -- 'monthly' | 'annual'

  -- Yield analysis results
  ADD COLUMN IF NOT EXISTS gross_income      NUMERIC,                       -- Gross annual income
  ADD COLUMN IF NOT EXISTS total_expenses    NUMERIC,                       -- Annual expenses (normalized)
  ADD COLUMN IF NOT EXISTS noi               NUMERIC,                       -- Net Operating Income (annual)
  ADD COLUMN IF NOT EXISTS cap_rate          NUMERIC,                       -- Cap rate proposed by agent (%)
  ADD COLUMN IF NOT EXISTS rental_value      NUMERIC;                       -- Derived property value (NOI / cap_rate)

-- Index for fetching rental-type ACMs
CREATE INDEX IF NOT EXISTS idx_acm_reports_analysis_type
  ON acm_reports(analysis_type);

-- Helpful comment
COMMENT ON COLUMN acm_reports.analysis_type   IS 'comparables = traditional CMA; rentabilidad = yield-based valuation';
COMMENT ON COLUMN acm_reports.cap_rate        IS 'Cap rate (%) proposed by agent. <8 poor, 8-12 acceptable, >12 excellent';
COMMENT ON COLUMN acm_reports.rental_value    IS 'Derived value = NOI / (cap_rate / 100)';


-- File: 20260512_agent_daily_okrs.sql
-- Add agent daily OKR entries table

CREATE TABLE IF NOT EXISTS public.agent_daily_okr_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Activities
    llamadas INTEGER DEFAULT 0,
    prelistings INTEGER DEFAULT 0,
    acm INTEGER DEFAULT 0,
    listings INTEGER DEFAULT 0,
    captaciones INTEGER DEFAULT 0,
    busquedas INTEGER DEFAULT 0,
    consultas INTEGER DEFAULT 0,
    muestras INTEGER DEFAULT 0,
    reservas INTEGER DEFAULT 0,
    transacciones INTEGER DEFAULT 0,
    cierres INTEGER DEFAULT 0,
    
    -- Metadata
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure one entry per agent per day
    UNIQUE(profile_id, date)
);

-- RLS






-- Admin policies


-- Trigger for updated_at
CREATE TRIGGER handle_updated_at_agent_daily_okrs
    BEFORE UPDATE ON public.agent_daily_okr_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- RPC function for atomically incrementing an activity counter
-- This is needed to prevent race conditions when multiple actions happen quickly.
CREATE OR REPLACE FUNCTION public.increment_okr_activity(
    p_profile_id UUID,
    p_date DATE,
    p_activity_key TEXT,
    p_delta INTEGER DEFAULT 1
) RETURNS void AS $$
BEGIN
    -- Only allow valid column names to prevent SQL injection
    IF p_activity_key NOT IN ('llamadas', 'prelistings', 'acm', 'listings', 'captaciones', 'busquedas', 'consultas', 'muestras', 'reservas', 'transacciones', 'cierres') THEN
        RAISE EXCEPTION 'Invalid activity key: %', p_activity_key;
    END IF;

    -- Upsert the record for today
    EXECUTE format('
        INSERT INTO public.agent_daily_okr_entries (profile_id, date, %I)
        VALUES ($1, $2, $3)
        ON CONFLICT (profile_id, date) DO UPDATE
        SET %I = public.agent_daily_okr_entries.%I + $3,
            updated_at = NOW();
    ', p_activity_key, p_activity_key, p_activity_key)
    USING p_profile_id, p_date, p_delta;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- File: 20260513_notifications_type.sql
-- =============================================
-- NOTIFICATIONS: Add type + dedup support
-- =============================================

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Index for fast dedup lookups (has this type been sent to this user recently?)
CREATE INDEX IF NOT EXISTS notifications_user_type_created_idx
  ON public.notifications(user_id, type, created_at DESC);


-- File: 20260516145600_create_prelisting_tables.sql
-- Create printable_pages table for Admin to manage available presentation pages
CREATE TABLE IF NOT EXISTS public.printable_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS


-- Allow all authenticated users to read printable pages


-- Create saved_presentations table for Agents to save their customized configurations
CREATE TABLE IF NOT EXISTS public.saved_presentations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES users(id) ON DELETE CASCADE,
    client_name TEXT,
    cover_title TEXT,
    cover_subtitle TEXT,
    cover_background_url TEXT,
    office_key TEXT NOT NULL,
    selected_pages JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of IDs or keys of selected pages
    personal_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS


-- Allow agents to read, insert, update, and delete their own presentations


-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) VALUES ('printables', 'printables', true) ON CONFLICT DO NOTHING;

-- Storage policies for 'printables' bucket







-- File: 20260516_office_business_plans.sql
-- =============================================
-- Office Business Plans & Enhancements
-- Track office-wide monthly goals and add buyer origins
-- =============================================

CREATE TABLE IF NOT EXISTS public.office_business_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    office TEXT NOT NULL DEFAULT 'altitud' CHECK (office IN ('altitud', 'cero')),
    month DATE NOT NULL, -- e.g. 2026-05-01 (1st day of month)
    
    -- Tracked Goals
    new_agents_goal INTEGER DEFAULT 0,
    team_size_goal INTEGER DEFAULT 0,
    active_properties_goal INTEGER DEFAULT 0,
    exclusivity_pct_goal NUMERIC DEFAULT 0,
    days_on_market_goal INTEGER DEFAULT 0,
    
    new_listings_total_goal INTEGER DEFAULT 0,
    new_listings_casa_goal INTEGER DEFAULT 0,
    new_listings_lote_goal INTEGER DEFAULT 0,
    new_listings_finca_goal INTEGER DEFAULT 0,
    new_listings_comercial_goal INTEGER DEFAULT 0,
    
    avg_ticket_goal NUMERIC DEFAULT 0,
    avg_commission_pct_goal NUMERIC DEFAULT 0,
    avg_commission_amount_goal NUMERIC DEFAULT 0,
    
    reservations_goal INTEGER DEFAULT 0,
    transactions_goal INTEGER DEFAULT 0,
    revenue_goal NUMERIC DEFAULT 0,
    portfolio_rotation_goal NUMERIC DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(office, month)
);

-- Enable RLS




-- Add buyer origin tracking
ALTER TABLE public.office_reservations ADD COLUMN IF NOT EXISTS buyer_origin TEXT;
ALTER TABLE public.agent_commissions ADD COLUMN IF NOT EXISTS buyer_origin TEXT;


-- File: 20260516_reconnect_alert_log.sql
-- =============================================
-- RECONNECT ALERT LOG
-- Deduplication table for Smart CRM alerts.
-- Stores (search_id, reconnect_listing_id) pairs
-- so we never spam the same match twice.
-- =============================================

CREATE TABLE IF NOT EXISTS public.reconnect_alert_log (
  id               UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  search_id        UUID REFERENCES public.buyer_searches(id) ON DELETE CASCADE NOT NULL,
  reconnect_listing_id TEXT NOT NULL,
  agent_id         UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  notified_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(search_id, reconnect_listing_id)
);

-- Only agents can read their own alert history




-- Fast dedup lookup
CREATE INDEX IF NOT EXISTS reconnect_alert_log_search_listing_idx
  ON public.reconnect_alert_log(search_id, reconnect_listing_id);

-- Fast per-agent query
CREATE INDEX IF NOT EXISTS reconnect_alert_log_agent_idx
  ON public.reconnect_alert_log(agent_id, notified_at DESC);


-- File: 20260518_office_poverty_line.sql
-- =============================================
-- Add configurable poverty line to business plans
-- The poverty line is the minimum monthly revenue
-- the office needs per agent to cover operational costs.
-- =============================================

ALTER TABLE public.office_business_plans
  ADD COLUMN IF NOT EXISTS poverty_line NUMERIC DEFAULT 0;

COMMENT ON COLUMN public.office_business_plans.poverty_line IS
  'Monthly minimum revenue threshold per office. Below this line, the office is not covering operational costs.';


-- File: 20260520_office_plan_metrics.sql
-- =============================================
-- Add new contacts and showings goals to office business plans
-- =============================================

ALTER TABLE public.office_business_plans 
ADD COLUMN IF NOT EXISTS new_contacts_goal INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS showings_goal INTEGER DEFAULT 0;


-- File: 20260520_olympia_proactive_alerts.sql
-- =============================================
-- Olympia Proactive Alerts
-- Adds fields to contacts and profiles for follow-up logic
-- =============================================

DO $$
BEGIN
    -- Add birth_date to contacts
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='birth_date') THEN
        ALTER TABLE public.contacts ADD COLUMN birth_date DATE;
    END IF;

    -- Add move_in_date to contacts
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='move_in_date') THEN
        ALTER TABLE public.contacts ADD COLUMN move_in_date DATE;
    END IF;

    -- Add preferred_follow_up_days to profiles
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='preferred_follow_up_days') THEN
        ALTER TABLE public.profiles ADD COLUMN preferred_follow_up_days TEXT[] DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    END IF;
END $$;


-- File: 20260520_ticket_categories.sql
-- Migration: 20260520_ticket_categories.sql
-- Description: Add category and location_data to support_tickets
-- Enables agents to submit "location request" tickets with structured hierarchy data

-- 1. Add category column (default = 'bug' for backwards compatibility)
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'bug'
    CHECK (category IN ('bug', 'location_request', 'feature_request', 'other'));

-- 2. Add structured location data for location_request tickets
-- Schema: { provincia, canton, distrito, barrio, nombre_lugar }
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS location_data JSONB;


-- File: 20260521_add_profile_draft_status.sql
-- ==============================================================
-- Migration: Add 'draft' status to profiles.status check constraint
-- Author: Antigravity AI
-- Date: 2026-05-21
-- ==============================================================

-- 1. Drop existing status check constraint if it exists
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_status_check;

-- 2. Add updated status check constraint allowing 'draft', 'invited', 'active', and 'disabled'
ALTER TABLE profiles ADD CONSTRAINT profiles_status_check CHECK (status IN ('draft', 'invited', 'active', 'disabled'));

-- 3. Comments
COMMENT ON COLUMN profiles.status IS 'Status of the profile: draft (silent/offline), invited (email sent but not registered), active (linked and logged in), or disabled (deactivated)';


-- File: 20260521_admin_inquiry_access.sql
-- =============================================
-- ADMIN ROLE — INQUIRY & LEAD ACCESS
-- Extends existing RLS policies to include 'admin' role
-- alongside 'broker' for managing property inquiries,
-- communications, and follow-ups.
-- =============================================

-- ── 1. property_inquiries — add admin access ──

-- Drop old broker-only policies
DROP POLICY IF EXISTS "Brokers view all inquiries" ON public.property_inquiries;
DROP POLICY IF EXISTS "Brokers manage all inquiries" ON public.property_inquiries;

-- Recreate with admin included





-- ── 2. lead_communications — add admin access ──

DROP POLICY IF EXISTS "Agents manage own communications" ON public.lead_communications;
DROP POLICY IF EXISTS "Brokers read all communications" ON public.lead_communications;






-- ── 3. lead_follow_ups — add admin access ──

DROP POLICY IF EXISTS "Agents manage own follow-ups" ON public.lead_follow_ups;
DROP POLICY IF EXISTS "Brokers read all follow-ups" ON public.lead_follow_ups;






-- ── 4. property_syndication — add admin to existing broker-only policies ──

DROP POLICY IF EXISTS "Brokers view all syndication" ON public.property_syndication;
DROP POLICY IF EXISTS "Brokers manage all syndication" ON public.property_syndication;






-- File: 20260521_agent_offboarding.sql
-- =============================================
-- AGENT OFFBOARDING — Audit Log & System Profile
-- Tracks data reassignment when agents leave
-- =============================================

-- 1. Audit log for offboarding operations
CREATE TABLE IF NOT EXISTS public.agent_offboarding_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Who is leaving
    departing_profile_id UUID NOT NULL REFERENCES profiles(id),
    departing_name TEXT NOT NULL,

    -- Who receives the data
    receiving_profile_id UUID NOT NULL REFERENCES profiles(id),
    receiving_name TEXT NOT NULL,

    -- Who performed the action
    performed_by UUID NOT NULL REFERENCES profiles(id),

    -- Detailed summary of what was reassigned
    reassigned_counts JSONB NOT NULL DEFAULT '{}',
    -- e.g. {"contacts": 12, "properties": 3, "acm_reports": 5, ...}

    -- Categories that went to the "Agente Desvinculado" placeholder
    placeholder_counts JSONB NOT NULL DEFAULT '{}',

    -- Categories selected for reassignment
    selected_categories TEXT[] NOT NULL DEFAULT '{}',

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_offboarding_departing ON public.agent_offboarding_log(departing_profile_id);
CREATE INDEX IF NOT EXISTS idx_offboarding_date ON public.agent_offboarding_log(created_at);

-- RLS — Broker only




-- 2. System placeholder profile "Agente Desvinculado"
-- Used to attribute orphaned data when a category is not reassigned
INSERT INTO profiles (email, full_name, role, office, status)
VALUES ('sistema@remax-altitud.cr', 'Agente Desvinculado', 'agent', 'altitud', 'disabled')
ON CONFLICT (email) DO NOTHING;


-- File: 20260521_business_plans_yearly.sql
-- =============================================
-- Yearly Business Plans & Broker Alert Policies
-- Migrates business_plans to support one plan per agent per year
-- =============================================

-- 1. Add new columns to business_plans if they don't exist
ALTER TABLE public.business_plans ADD COLUMN IF NOT EXISTS plan_year INTEGER DEFAULT 2026;
ALTER TABLE public.business_plans ADD COLUMN IF NOT EXISTS monthly_targets_by_month JSONB DEFAULT '[]';
ALTER TABLE public.business_plans ADD COLUMN IF NOT EXISTS target_portfolio_size NUMERIC DEFAULT 25;
ALTER TABLE public.business_plans ADD COLUMN IF NOT EXISTS plan_start_date TEXT;

-- 2. Populate plan_year from plan_start_date if possible, default to 2026
UPDATE public.business_plans
SET plan_year = COALESCE(
  NULLIF(SUBSTRING(plan_start_date FROM 1 FOR 4), ''),
  '2026'
)::INTEGER
WHERE plan_year IS NULL OR plan_year = 2026;

-- 3. Transition unique constraint from single plan to yearly composite unique key
-- First, drop the old inline UNIQUE constraint
ALTER TABLE public.business_plans DROP CONSTRAINT IF EXISTS business_plans_agent_email_key;

-- Add the composite UNIQUE constraint
ALTER TABLE public.business_plans ADD CONSTRAINT business_plans_agent_year_idx UNIQUE (agent_email, plan_year);

-- 4. Enable brokers to insert notifications for agents (fixes RLS issue)
DROP POLICY IF EXISTS "Brokers can insert notifications for anyone" ON public.notifications;



-- File: 20260521_portal_registry.sql
-- =============================================
-- PORTAL REGISTRY & SYNDICATION ENHANCEMENTS
-- Dynamic, admin-configurable portal catalog
-- + stats columns for per-portal analytics
-- =============================================

-- ── 1. Portal Registry ──
-- Single source of truth for which portals exist.
-- Broker/admin manages this via the Office Panel.
-- Agents see portal list dynamically from this table.
CREATE TABLE IF NOT EXISTS public.portal_registry (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,              -- 'reconnect', 'encuentra24', etc.
    display_name TEXT NOT NULL,             -- Human-readable name
    icon_emoji TEXT DEFAULT '🌐',           -- Quick visual identifier
    color_class TEXT,                       -- Tailwind color classes for UI badges
    url_base TEXT,                          -- Portal home URL
    category TEXT DEFAULT 'manual'          -- 'manual' | 'auto_feed' | 'on_request'
      CHECK (category IN ('manual', 'auto_feed', 'on_request')),
    has_stats_api BOOLEAN DEFAULT false,    -- Can we pull stats programmatically?
    is_active BOOLEAN DEFAULT true,         -- Soft delete / toggle
    display_order INTEGER DEFAULT 100,      -- Sort order in agent panel
    office_scope TEXT DEFAULT 'all'         -- 'altitud' | 'cero' | 'all'
      CHECK (office_scope IN ('altitud', 'cero', 'all')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Extend property_syndication with stats + tracking ──
ALTER TABLE public.property_syndication
  ADD COLUMN IF NOT EXISTS listing_views INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS interested_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS days_listed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stats_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_by UUID,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add 'requested' status for on_request portals (e.g. JamesEdition)
ALTER TABLE public.property_syndication
  DROP CONSTRAINT IF EXISTS property_syndication_status_check;

ALTER TABLE public.property_syndication
  ADD CONSTRAINT property_syndication_status_check
  CHECK (status IN ('pending', 'requested', 'synced', 'error', 'removed'));

-- ── 3. Seed portal registry with all known portals ──
INSERT INTO public.portal_registry (slug, display_name, icon_emoji, color_class, url_base, category, has_stats_api, display_order, office_scope) VALUES
  ('reconnect',           'RE/MAX RECONNECT',          '🔵', 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',     'https://remax-centralamerica.com', 'manual', true,  1,  'all'),
  ('remax_costa_rica',    'remax-costa-rica.com',       '🔴', 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',          'https://remax-costa-rica.com',     'manual', false, 2,  'all'),
  ('remax_altitud',       'remax-altitud.cr',           '🏔️', 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400', 'https://remax-altitud.cr',      'manual', false, 3,  'altitud'),
  ('yourhome_cr',         'YourHomeInCostaRica.com',    '🏡', 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400', 'https://yourhomeincostarica.com', 'manual', false, 4, 'all'),
  ('james_edition',       'JamesEdition',               '👑', 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',  'https://jamesedition.com',         'on_request', false, 5, 'all'),
  ('realtor_com',         'Realtor.com',                '🏠', 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400',           'https://realtor.com',              'manual', false, 6, 'all'),
  ('chozi',               'Chozi.com',                  '🟠', 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400', 'https://chozi.com',             'manual', false, 7, 'all'),
  ('crcasas',             'CRCasas',                    '🌐', 'bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400',       'https://crcasas.com',              'manual', false, 8, 'all'),
  ('anuntico',            'Anuntico',                   '🌐', 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400', 'https://anuntico.com',           'manual', false, 9, 'all'),
  ('buscocasita',         'BuscoCasita',                '🌐', 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400',       'https://buscocasita.com',          'manual', false, 10, 'all'),
  ('4321_property',       '4321 Property',              '🌐', 'bg-slate-50 text-slate-600 dark:bg-slate-900/20 dark:text-slate-400',   'https://4321property.com',         'manual', false, 11, 'all'),
  ('expat_com',           'Expat.com',                  '✈️', 'bg-lime-50 text-lime-600 dark:bg-lime-900/20 dark:text-lime-400',       'https://expat.com',                'manual', false, 12, 'all'),
  ('bienes_online',       'Bienes Online',              '🌐', 'bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-900/20 dark:text-fuchsia-400', 'https://bienesonline.com',   'manual', false, 13, 'all'),
  ('terra_costa_rica',    'Terra Costa Rica',            '🌴', 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',  'https://terracostarica.com',       'manual', false, 14, 'all'),
  ('propiedades_cr',      'Propiedades.cr',              '🌐', 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',      'https://propiedades.cr',           'manual', false, 15, 'all'),
  ('facebook_marketplace','Facebook Marketplace',        '📘', 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',      'https://facebook.com/marketplace',  'manual', false, 16, 'all')
ON CONFLICT (slug) DO NOTHING;

-- ── 4. Auto-update timestamps ──
CREATE OR REPLACE FUNCTION update_portal_registry_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS portal_registry_updated ON public.portal_registry;

CREATE TRIGGER portal_registry_updated
    BEFORE UPDATE ON public.portal_registry
    FOR EACH ROW EXECUTE FUNCTION update_portal_registry_timestamp();

-- ── 5. Indexes ──
CREATE INDEX IF NOT EXISTS idx_portal_registry_active ON public.portal_registry(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_portal_registry_slug ON public.portal_registry(slug);
CREATE INDEX IF NOT EXISTS idx_syndication_stats ON public.property_syndication(portal_name, status) WHERE status = 'synced';

-- ── 6. RLS ──


-- Everyone can read the portal registry
DROP POLICY IF EXISTS "Anyone can view portal registry" ON public.portal_registry;


-- Allow agents to insert syndication requests (for on_request portals)
DROP POLICY IF EXISTS "Agents request syndication" ON public.property_syndication;


-- ── 7. Missing Relationships ──
-- Add missing foreign key constraint from property_inquiries to properties
ALTER TABLE public.property_inquiries
  DROP CONSTRAINT IF EXISTS fk_inquiries_property,
  ADD CONSTRAINT fk_inquiries_property
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;



-- File: 20260522_add_ccf_to_office_settings.sql
-- Add CCF column to office_settings
ALTER TABLE public.office_settings ADD COLUMN IF NOT EXISTS ccf NUMERIC NOT NULL DEFAULT 1.307;

-- Ensure existing offices are updated to use 1.307
UPDATE public.office_settings SET ccf = 1.307 WHERE ccf IS NULL OR ccf = 0;


-- File: 20260522_add_property_link_to_prelisting.sql
-- =============================================
-- PRE-LISTING INTEGRATION — Property Link
-- Adds property_id to saved_presentations to link custom decks
-- directly to the source property database inventory.
-- =============================================

ALTER TABLE public.saved_presentations
  ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL;

-- ── Index for fast lookup ──
CREATE INDEX IF NOT EXISTS idx_saved_presentations_property ON public.saved_presentations(property_id);


-- File: 20260522_fix_rls_policies.sql
-- Fix Row Level Security (RLS) policies for agent_daily_okr_entries, account_transactions, and agent_notes.

-- 1. agent_daily_okr_entries
DROP POLICY IF EXISTS "Users can view their own entries" ON public.agent_daily_okr_entries;


DROP POLICY IF EXISTS "Users can update their own entries" ON public.agent_daily_okr_entries;


DROP POLICY IF EXISTS "Admins can view all entries" ON public.agent_daily_okr_entries;


DROP POLICY IF EXISTS "Brokers can insert any transaction" ON public.account_transactions;


DROP POLICY IF EXISTS "Agents can delete own personal expenses" ON public.account_transactions;



-- File: 20260522_fix_roles.sql
-- Drop the existing role check constraint if it exists
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add the new constraint with 'admin' replacing 'office_assistant'
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('broker', 'team_leader', 'agent', 'admin', 'junior'));


-- File: 20260522_office_settings_okr_sheet.sql
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


-- 8. Insert default rows
INSERT INTO public.office_settings (office_id) 
VALUES ('altitud'), ('cero') 
ON CONFLICT (office_id) DO NOTHING;


-- File: 20260522_olympia_preferences.sql
-- =============================================
-- Olympia AI Agent Preferences
-- Adds tone, channel, and lifecycle settings to profiles
-- =============================================

DO $$
BEGIN
    -- Add olympia_tone to profiles
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='olympia_tone') THEN
        ALTER TABLE public.profiles ADD COLUMN olympia_tone TEXT DEFAULT 'buffini';
    END IF;

    -- Add olympia_channels to profiles
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='olympia_channels') THEN
        ALTER TABLE public.profiles ADD COLUMN olympia_channels TEXT[] DEFAULT ARRAY['whatsapp'];
    END IF;

    -- Add olympia_lifecycle_enabled to profiles
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='olympia_lifecycle_enabled') THEN
        ALTER TABLE public.profiles ADD COLUMN olympia_lifecycle_enabled BOOLEAN DEFAULT true;
    END IF;
END $$;


-- File: 20260522_profile_fee_fields.sql
-- ── Add monthly fee and fee start date fields to profiles ──
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fee_start_date DATE;


-- File: 20260523_add_profile_birthdate_and_tx_status.sql
-- Add birth_date to profiles and status to account_transactions
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date DATE;

ALTER TABLE public.account_transactions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved'));

-- Drop existing policies if needed and recreate to make sure everything works
DROP POLICY IF EXISTS "Brokers can update any transaction" ON public.account_transactions;



-- File: 20260523_fix_office_config_rls.sql
-- Fix Row Level Security (RLS) policies for office_config to allow both 'broker' and 'admin' roles to manage configuration.

DROP POLICY IF EXISTS "Brokers manage config" ON public.office_config;
DROP POLICY IF EXISTS "Brokers and Admins manage config" ON public.office_config;




-- File: 20260523_office_business_plans_actuals.sql
-- =============================================
-- Add historical outcomes (actuals) to office business plans
-- =============================================

ALTER TABLE public.office_business_plans 
ADD COLUMN IF NOT EXISTS actual_team_size INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS actual_revenue NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS actual_volume NUMERIC DEFAULT NULL;


-- File: 20260523_rename_unlinked_agent.sql
-- ============================================================
-- RENAME SYSTEM PLACEHOLDER PROFILE
-- Renames "Agente Desvinculado" to "Otros"
-- ============================================================

UPDATE public.profiles
SET full_name = 'Otros'
WHERE email = 'sistema@remax-altitud.cr';


-- File: 20260524_add_drive_to_acm_reports.sql
-- Add Google Drive folder columns to acm_reports table
ALTER TABLE public.acm_reports 
ADD COLUMN IF NOT EXISTS drive_folder_id TEXT,
ADD COLUMN IF NOT EXISTS drive_folder_url TEXT;


-- File: 20260524_add_photographer_calendar_to_office_settings.sql
-- Add photographer_calendar_url column to public.office_settings
ALTER TABLE public.office_settings 
ADD COLUMN IF NOT EXISTS photographer_calendar_url TEXT;

-- Seed default Google Calendar URL for existing offices
UPDATE public.office_settings 
SET photographer_calendar_url = 'https://calendar.app.google/yYSUgBYr6Zv7Wrgn9' 
WHERE photographer_calendar_url IS NULL OR photographer_calendar_url = '';


-- File: 20260524_add_properties_read_policy.sql
-- ============================================================
-- CONNECT ALL OFFICES: ALLOW AGENTS TO VIEW APPROVED & PUBLISHED PROPERTIES
-- Allows agents from ALTITUD and ALTITUD CERO to view each other's 
-- approved/published properties for CMA (ACM) and search purposes.
-- ============================================================

-- 1. Policy for properties table
-- Allow all authenticated users to read approved or published properties
DROP POLICY IF EXISTS "Agents can view approved and published properties" ON public.properties;


-- 2. Policy for property_images table
-- Allow all authenticated users to read images of properties they have access to
DROP POLICY IF EXISTS "Agents can view readable property images" ON public.property_images;



-- File: 20260524_add_safety_and_archive_to_contacts.sql
-- Migration: Add Silent Followup and Security Alert Blacklist to Contacts (CRM) Table
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS no_followup BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS archive_reason TEXT,
ADD COLUMN IF NOT EXISTS security_alert BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS security_notes TEXT;


-- File: 20260524_team_leader_okr_policy.sql
-- =============================================
-- Migration to allow team leaders to view their team's OKR entries
-- =============================================

DROP POLICY IF EXISTS "Team leaders can view team okrs" ON public.agent_daily_okr_entries;




-- File: 20260603_add_website_profile_fields.sql
-- =============================================
-- Migration: Add Website Profile fields
-- Description: Adds bio_en, bio_es, and video_url to the profiles table.
-- =============================================

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio_en TEXT,
ADD COLUMN IF NOT EXISTS bio_es TEXT,
ADD COLUMN IF NOT EXISTS video_url TEXT;
