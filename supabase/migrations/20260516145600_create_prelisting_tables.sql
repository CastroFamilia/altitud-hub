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
ALTER TABLE public.printable_pages ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read printable pages
CREATE POLICY "Allow read access for all authenticated users" ON public.printable_pages
    FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert/update/delete printable pages (Since any authenticated agent might upload? Or just allow all for now)
CREATE POLICY "Allow all actions for authenticated users" ON public.printable_pages
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create saved_presentations table for Agents to save their customized configurations
CREATE TABLE IF NOT EXISTS public.saved_presentations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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
ALTER TABLE public.saved_presentations ENABLE ROW LEVEL SECURITY;

-- Allow agents to read, insert, update, and delete their own presentations
CREATE POLICY "Agents can manage their own presentations" ON public.saved_presentations
    FOR ALL TO authenticated
    USING (auth.uid() = agent_id)
    WITH CHECK (auth.uid() = agent_id);

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) VALUES ('printables', 'printables', true) ON CONFLICT DO NOTHING;

-- Storage policies for 'printables' bucket
CREATE POLICY "Public read access for printables" ON storage.objects
    FOR SELECT USING (bucket_id = 'printables');

CREATE POLICY "Authenticated users can upload to printables" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'printables');

CREATE POLICY "Authenticated users can update printables" ON storage.objects
    FOR UPDATE TO authenticated USING (bucket_id = 'printables');

CREATE POLICY "Authenticated users can delete printables" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'printables');
