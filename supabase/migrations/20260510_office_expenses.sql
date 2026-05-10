-- =============================================
-- OFFICE FINANCE & PETTY CASH SYSTEM
-- Comprehensive migration for:
--   1. New role: office_assistant
--   2. Expense categories & expenses
--   3. Petty cash tracking (Caja Chica)
--   4. Fixed salary configuration
-- =============================================

-- ══════════════════════════════════════════════
-- 1. ROLE EXTENSION
-- ══════════════════════════════════════════════

-- Drop existing constraint (if any) and recreate to include office_assistant
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('broker', 'team_leader', 'agent', 'office_assistant', 'junior'));

-- ══════════════════════════════════════════════
-- 2. EXPENSE CATEGORIES
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS office_expense_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    label_es TEXT NOT NULL,
    label_en TEXT NOT NULL,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    office TEXT DEFAULT 'altitud' CHECK (office IN ('altitud','cero')),
    active BOOLEAN DEFAULT true
);

-- Seed default categories
INSERT INTO office_expense_categories (name, label_es, label_en, icon, sort_order) VALUES
  ('marca', 'MARCA', 'BRAND', '🏷️', 1),
  ('rrhh', 'RRHH', 'HR', '👥', 2),
  ('alquiler', 'Alquiler', 'Rent', '🏠', 3),
  ('marketing', 'Marketing', 'Marketing', '📣', 4),
  ('eventos', 'Eventos', 'Events', '🎪', 5),
  ('oficina', 'Oficina', 'Office', '🏢', 6)
ON CONFLICT (name) DO NOTHING;

ALTER TABLE office_expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads categories" ON office_expense_categories FOR SELECT USING (true);
CREATE POLICY "Brokers manage categories" ON office_expense_categories FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'broker')
);

-- ══════════════════════════════════════════════
-- 3. PETTY CASH FUNDS
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS petty_cash_funds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assistant_id UUID NOT NULL REFERENCES profiles(id),
    office TEXT DEFAULT 'altitud' CHECK (office IN ('altitud','cero')),
    initial_amount NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'CRC' CHECK (currency IN ('USD', 'CRC')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 4. OFFICE EXPENSES
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS office_expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES office_expense_categories(id),
    office TEXT DEFAULT 'altitud' CHECK (office IN ('altitud','cero')),
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'CRC' CHECK (currency IN ('USD', 'CRC')),
    
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    
    is_recurring BOOLEAN DEFAULT false,
    recurrence_type TEXT CHECK (recurrence_type IN ('monthly_start', 'monthly_end', 'biweekly', 'weekly', 'one_time')),
    recurrence_day INTEGER, -- E.g. day of month
    
    due_date DATE,
    paid_date DATE,
    paid_by UUID REFERENCES profiles(id),
    
    payment_source TEXT CHECK (payment_source IN ('bank', 'petty_cash')),
    petty_cash_fund_id UUID REFERENCES petty_cash_funds(id),
    
    source_type TEXT DEFAULT 'manual' CHECK (source_type IN ('manual', 'rcca_auto', 'agent_fee_auto', 'salary_auto')),
    source_ref_id UUID, -- For linking to agent_commissions or profile
    
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 5. PETTY CASH TRANSACTIONS
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS petty_cash_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fund_id UUID NOT NULL REFERENCES petty_cash_funds(id),
    type TEXT NOT NULL CHECK (type IN ('replenish', 'expense')),
    amount NUMERIC NOT NULL, -- Positive for replenish, positive for expense
    expense_id UUID REFERENCES office_expenses(id), -- Link if type=expense
    description TEXT NOT NULL,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 6. SALARY CONFIGURATION
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS office_salary_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_name TEXT NOT NULL,
    amount_per_period NUMERIC NOT NULL,
    currency TEXT DEFAULT 'CRC' CHECK (currency IN ('USD', 'CRC')),
    office TEXT DEFAULT 'altitud' CHECK (office IN ('altitud','cero')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- INDEXES & TIMESTAMPS
-- ══════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_office_expenses_date ON office_expenses(due_date);
CREATE INDEX IF NOT EXISTS idx_office_expenses_status ON office_expenses(status);
CREATE INDEX IF NOT EXISTS idx_petty_cash_tx_fund ON petty_cash_transactions(fund_id);

CREATE OR REPLACE FUNCTION update_office_expenses_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER office_expenses_updated
    BEFORE UPDATE ON office_expenses
    FOR EACH ROW EXECUTE FUNCTION update_office_expenses_timestamp();

CREATE OR REPLACE FUNCTION update_petty_cash_funds_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER petty_cash_funds_updated
    BEFORE UPDATE ON petty_cash_funds
    FOR EACH ROW EXECUTE FUNCTION update_petty_cash_funds_timestamp();

-- ══════════════════════════════════════════════
-- RLS POLICIES
-- ══════════════════════════════════════════════

ALTER TABLE office_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE petty_cash_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE petty_cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_salary_config ENABLE ROW LEVEL SECURITY;

-- Brokers and Office Assistants can manage everything
CREATE POLICY "Finance staff manage expenses" ON office_expenses FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role IN ('broker', 'office_assistant'))
);

CREATE POLICY "Finance staff manage petty cash" ON petty_cash_funds FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role IN ('broker', 'office_assistant'))
);

CREATE POLICY "Finance staff manage petty tx" ON petty_cash_transactions FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role IN ('broker', 'office_assistant'))
);

CREATE POLICY "Finance staff manage salary config" ON office_salary_config FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role IN ('broker', 'office_assistant'))
);
