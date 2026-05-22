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
ALTER TABLE public.agent_daily_okr_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own entries"
    ON public.agent_daily_okr_entries FOR SELECT
    USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert their own entries"
    ON public.agent_daily_okr_entries FOR INSERT
    WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own entries"
    ON public.agent_daily_okr_entries FOR UPDATE
    USING (auth.uid() = profile_id)
    WITH CHECK (auth.uid() = profile_id);

-- Admin policies
CREATE POLICY "Admins can view all entries"
    ON public.agent_daily_okr_entries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'broker')
        )
    );

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
