CREATE TABLE IF NOT EXISTS public.buyer_searches (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
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
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS para buyer_searches
ALTER TABLE public.buyer_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents can manage their own searches" ON public.buyer_searches
    FOR ALL USING (auth.uid() = agent_id);
CREATE POLICY "All users can view active searches for matching" ON public.buyer_searches
    FOR SELECT USING (status = 'activa');

-- RLS para buyer_search_pipeline
ALTER TABLE public.buyer_search_pipeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents can manage pipeline of their searches" ON public.buyer_search_pipeline
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.buyer_searches s 
            WHERE s.id = search_id AND s.agent_id = auth.uid()
        )
    );

-- RLS para notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own notifications" ON public.notifications
    FOR ALL USING (auth.uid() = user_id);

