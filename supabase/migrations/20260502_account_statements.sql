-- account_transactions table

CREATE TABLE IF NOT EXISTS public.account_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('office_charge', 'agent_payment', 'personal_expense')),
    amount NUMERIC(12,2) NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    added_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.account_transactions ENABLE ROW LEVEL SECURITY;

-- Select Policies
CREATE POLICY "Agents can view own transactions"
    ON public.account_transactions FOR SELECT
    USING (auth.uid() = profile_id);

CREATE POLICY "Brokers can view all transactions"
    ON public.account_transactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'broker'
        )
    );

-- Insert Policies
CREATE POLICY "Agents can insert personal expenses"
    ON public.account_transactions FOR INSERT
    WITH CHECK (
        auth.uid() = profile_id AND 
        type = 'personal_expense'
    );

CREATE POLICY "Brokers can insert any transaction"
    ON public.account_transactions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'broker'
        )
    );

-- Delete Policies
CREATE POLICY "Agents can delete own personal expenses"
    ON public.account_transactions FOR DELETE
    USING (
        auth.uid() = profile_id AND 
        type = 'personal_expense' AND
        added_by = auth.uid()
    );

CREATE POLICY "Brokers can delete any transaction"
    ON public.account_transactions FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'broker'
        )
    );

-- Create Index for performance
CREATE INDEX IF NOT EXISTS idx_account_transactions_profile_id ON public.account_transactions(profile_id);
CREATE INDEX IF NOT EXISTS idx_account_transactions_date ON public.account_transactions(date);
