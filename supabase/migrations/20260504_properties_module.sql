-- Migration: Properties Module
-- Creates the properties table to track assets assigned to contacts.

CREATE TABLE IF NOT EXISTS public.properties (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
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
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Agents can view their own properties"
    ON public.properties FOR SELECT
    USING (auth.uid() = agent_id);

CREATE POLICY "Agents can insert their own properties"
    ON public.properties FOR INSERT
    WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents can update their own properties"
    ON public.properties FOR UPDATE
    USING (auth.uid() = agent_id);

CREATE POLICY "Agents can delete their own properties"
    ON public.properties FOR DELETE
    USING (auth.uid() = agent_id);

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
