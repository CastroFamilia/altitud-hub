-- Add birth_date to profiles and status to account_transactions
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date DATE;

ALTER TABLE public.account_transactions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved'));

-- Drop existing policies if needed and recreate to make sure everything works
DROP POLICY IF EXISTS "Brokers can update any transaction" ON public.account_transactions;
CREATE POLICY "Brokers can update any transaction"
    ON public.account_transactions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE auth_user_id = auth.uid() AND role IN ('broker', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE auth_user_id = auth.uid() AND role IN ('broker', 'admin')
        )
    );
