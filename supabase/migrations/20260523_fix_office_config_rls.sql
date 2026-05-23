-- Fix Row Level Security (RLS) policies for office_config to allow both 'broker' and 'admin' roles to manage configuration.

DROP POLICY IF EXISTS "Brokers manage config" ON public.office_config;
DROP POLICY IF EXISTS "Brokers and Admins manage config" ON public.office_config;

CREATE POLICY "Brokers and Admins manage config"
    ON public.office_config FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('broker', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('broker', 'admin')
        )
    );
