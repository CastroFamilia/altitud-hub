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
    auth_user_id UUID UNIQUE REFERENCES auth.users(id),
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
    AFTER INSERT ON auth.users
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

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE okr_daily_logs ENABLE ROW LEVEL SECURITY;

-- ── PROFILES ──

-- Everyone can read their own profile
CREATE POLICY "Read own profile" ON profiles FOR SELECT
    USING (auth_user_id = auth.uid());

-- Team leaders can read profiles in their team
CREATE POLICY "Team leader reads team" ON profiles FOR SELECT
    USING (
        team_id IN (
            SELECT t.id FROM teams t 
            JOIN profiles p ON p.id = t.leader_id 
            WHERE p.auth_user_id = auth.uid()
        )
    );

-- Brokers can read all profiles
CREATE POLICY "Broker reads all profiles" ON profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.auth_user_id = auth.uid() 
            AND p.role = 'broker'
        )
    );

-- Brokers can insert profiles (invitations)
CREATE POLICY "Broker inserts profiles" ON profiles FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.auth_user_id = auth.uid() 
            AND p.role = 'broker'
        )
    );

-- Brokers can update any profile
CREATE POLICY "Broker updates profiles" ON profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.auth_user_id = auth.uid() 
            AND p.role = 'broker'
        )
    );

-- Users can update their own last_login
CREATE POLICY "Update own last_login" ON profiles FOR UPDATE
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

-- ── TEAMS ──

-- Everyone can read teams
CREATE POLICY "Anyone reads teams" ON teams FOR SELECT
    USING (true);

-- Only brokers manage teams
CREATE POLICY "Broker manages teams" ON teams FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.auth_user_id = auth.uid() 
            AND p.role = 'broker'
        )
    );

-- ── OKR DAILY LOGS ──

-- Users manage their own OKR logs
CREATE POLICY "Own OKR logs" ON okr_daily_logs FOR ALL
    USING (
        profile_id IN (
            SELECT id FROM profiles WHERE auth_user_id = auth.uid()
        )
    );

-- Team leaders read their team's OKR logs
CREATE POLICY "Team leader reads team OKR" ON okr_daily_logs FOR SELECT
    USING (
        profile_id IN (
            SELECT p.id FROM profiles p
            JOIN teams t ON t.id = p.team_id
            JOIN profiles leader ON leader.id = t.leader_id
            WHERE leader.auth_user_id = auth.uid()
        )
    );

-- Brokers read all OKR logs
CREATE POLICY "Broker reads all OKR" ON okr_daily_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.auth_user_id = auth.uid() 
            AND p.role = 'broker'
        )
    );

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
