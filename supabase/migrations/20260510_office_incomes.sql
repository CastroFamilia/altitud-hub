-- =============================================
-- OFFICE INCOMES SYSTEM
-- Extension of office expenses to handle incomes
-- =============================================

-- 1. Extend office_expense_categories to have a type
ALTER TABLE office_expense_categories ADD COLUMN type TEXT DEFAULT 'expense' CHECK (type IN ('expense', 'income', 'both'));

-- 2. Insert default income categories
INSERT INTO office_expense_categories (name, label_es, label_en, icon, sort_order, type) VALUES
  ('agent_fee', 'Agent Fee', 'Agent Fee', '💳', 7, 'income'),
  ('commissions', 'Comisiones', 'Commissions', '💰', 8, 'income'),
  ('cash_deposit', 'Aporte Efectivo', 'Cash Deposit', '💵', 9, 'income')
ON CONFLICT (name) DO UPDATE SET type = EXCLUDED.type;

-- 3. Extend office_expenses to be a general transactions ledger
ALTER TABLE office_expenses ADD COLUMN transaction_type TEXT DEFAULT 'expense' CHECK (transaction_type IN ('expense', 'income'));

-- 4. Update status constraint to include 'received'
ALTER TABLE office_expenses DROP CONSTRAINT IF EXISTS office_expenses_status_check;
ALTER TABLE office_expenses ADD CONSTRAINT office_expenses_status_check CHECK (status IN ('pending', 'paid', 'received', 'cancelled'));

-- 5. Update petty cash transaction type to include 'income'
ALTER TABLE petty_cash_transactions DROP CONSTRAINT IF EXISTS petty_cash_transactions_type_check;
ALTER TABLE petty_cash_transactions ADD CONSTRAINT petty_cash_transactions_type_check CHECK (type IN ('replenish', 'expense', 'income'));

-- Create index on transaction_type for better query performance
CREATE INDEX IF NOT EXISTS idx_office_expenses_type ON office_expenses(transaction_type);
