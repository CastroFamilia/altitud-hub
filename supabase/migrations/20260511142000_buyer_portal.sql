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
ALTER TABLE public.buyer_search_votes ENABLE ROW LEVEL SECURITY;

-- Agents can see votes on their pipelines
CREATE POLICY "Agents can view votes on their pipeline" ON public.buyer_search_votes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.buyer_search_pipeline p
            JOIN public.buyer_searches s ON p.search_id = s.id
            WHERE p.id = pipeline_id AND s.agent_id = auth.uid()
        )
    );

-- The public portal needs to insert votes (we'll use service_role for the API so RLS isn't strictly necessary for insert, but let's allow anon inserts if needed)
-- For now, API will use service_role or we allow anon inserts. Let's allow anon inserts for the portal if they know the pipeline_id
CREATE POLICY "Public can insert votes" ON public.buyer_search_votes
    FOR INSERT WITH CHECK (true);

-- Also Public can view votes for a pipeline (to see what their partner voted)
CREATE POLICY "Public can view votes" ON public.buyer_search_votes
    FOR SELECT USING (true);

