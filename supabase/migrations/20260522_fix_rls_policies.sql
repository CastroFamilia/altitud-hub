-- Fix Row Level Security (RLS) policies for agent_daily_okr_entries, account_transactions, and agent_notes.

-- 1. agent_daily_okr_entries
DROP POLICY IF EXISTS "Users can view their own entries" ON public.agent_daily_okr_entries;
CREATE POLICY "Users can view their own entries"
    ON public.agent_daily_okr_entries FOR SELECT
    USING (profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own entries" ON public.agent_daily_okr_entries;
CREATE POLICY "Users can insert their own entries"
    ON public.agent_daily_okr_entries FOR INSERT
    WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update their own entries" ON public.agent_daily_okr_entries;
CREATE POLICY "Users can update their own entries"
    ON public.agent_daily_okr_entries FOR UPDATE
    USING (profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()))
    WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can view all entries" ON public.agent_daily_okr_entries;
CREATE POLICY "Admins can view all entries"
    ON public.agent_daily_okr_entries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE auth_user_id = auth.uid() AND role IN ('admin', 'broker')
        )
    );

-- 2. account_transactions
DROP POLICY IF EXISTS "Agents can view own transactions" ON public.account_transactions;
CREATE POLICY "Agents can view own transactions"
    ON public.account_transactions FOR SELECT
    USING (profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Brokers can view all transactions" ON public.account_transactions;
CREATE POLICY "Brokers can view all transactions"
    ON public.account_transactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE auth_user_id = auth.uid() AND role IN ('broker', 'admin')
        )
    );

DROP POLICY IF EXISTS "Agents can insert personal expenses" ON public.account_transactions;
CREATE POLICY "Agents can insert personal expenses"
    ON public.account_transactions FOR INSERT
    WITH CHECK (
        profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()) AND 
        type = 'personal_expense'
    );

DROP POLICY IF EXISTS "Brokers can insert any transaction" ON public.account_transactions;
CREATE POLICY "Brokers can insert any transaction"
    ON public.account_transactions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE auth_user_id = auth.uid() AND role IN ('broker', 'admin')
        )
    );

DROP POLICY IF EXISTS "Agents can delete own personal expenses" ON public.account_transactions;
CREATE POLICY "Agents can delete own personal expenses"
    ON public.account_transactions FOR DELETE
    USING (
        profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()) AND 
        type = 'personal_expense' AND
        added_by IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Brokers can delete any transaction" ON public.account_transactions;
CREATE POLICY "Brokers can delete any transaction"
    ON public.account_transactions FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE auth_user_id = auth.uid() AND role IN ('broker', 'admin')
        )
    );

-- 3. agent_notes
DROP POLICY IF EXISTS "Brokers have full access to agent_notes" ON public.agent_notes;
CREATE POLICY "Brokers have full access to agent_notes"
ON public.agent_notes
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.auth_user_id = auth.uid() 
        AND profiles.role IN ('broker', 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.auth_user_id = auth.uid() 
        AND profiles.role IN ('broker', 'admin')
    )
);
