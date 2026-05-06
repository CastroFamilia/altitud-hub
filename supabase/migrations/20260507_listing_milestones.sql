-- =============================================
-- LISTING MILESTONES — Process Timeline Tracking
-- Stores timestamped events for each property's
-- journey through the listing lifecycle.
-- =============================================

CREATE TABLE IF NOT EXISTS listing_milestones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES auth.users(id),

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
ALTER TABLE listing_milestones ENABLE ROW LEVEL SECURITY;

-- Agents can manage their own milestones
CREATE POLICY "Agents manage own milestones"
    ON listing_milestones FOR ALL
    USING (agent_id = auth.uid());

-- Brokers can view ALL milestones (for analytics)
CREATE POLICY "Brokers view all milestones"
    ON listing_milestones FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'broker')
    );

-- Team leaders can view their team's milestones
CREATE POLICY "Team leaders view team milestones"
    ON listing_milestones FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN profiles agent_profile ON agent_profile.auth_user_id = listing_milestones.agent_id
            WHERE p.auth_user_id = auth.uid()
              AND p.role = 'team_leader'
              AND p.team_id = agent_profile.team_id
        )
    );
