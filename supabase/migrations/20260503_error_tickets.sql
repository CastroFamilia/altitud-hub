-- Migration: 20260503_error_tickets.sql
-- Description: Create support_tickets table and storage bucket for error reports

-- 1. Create support_tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for support_tickets
-- Agents can view their own tickets
CREATE POLICY "Agents can view own tickets" 
    ON public.support_tickets FOR SELECT 
    USING (auth.uid() = agent_id);

-- Agents can insert their own tickets
CREATE POLICY "Agents can insert own tickets" 
    ON public.support_tickets FOR INSERT 
    WITH CHECK (auth.uid() = agent_id);

-- Brokers and Team Leaders can view all tickets
CREATE POLICY "Admins can view all tickets" 
    ON public.support_tickets FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('broker', 'team_leader')
        )
    );

-- Brokers and Team Leaders can update tickets (status, admin_notes, resolved_at)
CREATE POLICY "Admins can update all tickets" 
    ON public.support_tickets FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('broker', 'team_leader')
        )
    );

-- 4. Set up Storage Bucket for ticket images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('support_images', 'support_images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- Allow anyone authenticated to view images
CREATE POLICY "Anyone can view support images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'support_images' AND auth.role() = 'authenticated');

-- Allow agents to upload images
CREATE POLICY "Agents can upload support images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'support_images' AND auth.role() = 'authenticated');
