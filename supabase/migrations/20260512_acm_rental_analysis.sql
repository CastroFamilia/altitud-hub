-- =============================================
-- ACM Rental Yield Analysis Fields
-- Adds rental profitability (cap rate) columns to acm_reports
-- =============================================

ALTER TABLE acm_reports
  -- Which analysis mode was used
  ADD COLUMN IF NOT EXISTS analysis_type     TEXT DEFAULT 'comparables',   -- 'comparables' | 'rentabilidad'

  -- Rental income inputs
  ADD COLUMN IF NOT EXISTS rental_units      INTEGER,                       -- Number of rentable units
  ADD COLUMN IF NOT EXISTS rental_price      NUMERIC,                       -- Monthly rent per unit (USD)

  -- Expense inputs
  ADD COLUMN IF NOT EXISTS expenses_amount   NUMERIC,                       -- Total operating expenses entered
  ADD COLUMN IF NOT EXISTS expenses_period   TEXT DEFAULT 'monthly',        -- 'monthly' | 'annual'

  -- Yield analysis results
  ADD COLUMN IF NOT EXISTS gross_income      NUMERIC,                       -- Gross annual income
  ADD COLUMN IF NOT EXISTS total_expenses    NUMERIC,                       -- Annual expenses (normalized)
  ADD COLUMN IF NOT EXISTS noi               NUMERIC,                       -- Net Operating Income (annual)
  ADD COLUMN IF NOT EXISTS cap_rate          NUMERIC,                       -- Cap rate proposed by agent (%)
  ADD COLUMN IF NOT EXISTS rental_value      NUMERIC;                       -- Derived property value (NOI / cap_rate)

-- Index for fetching rental-type ACMs
CREATE INDEX IF NOT EXISTS idx_acm_reports_analysis_type
  ON acm_reports(analysis_type);

-- Helpful comment
COMMENT ON COLUMN acm_reports.analysis_type   IS 'comparables = traditional CMA; rentabilidad = yield-based valuation';
COMMENT ON COLUMN acm_reports.cap_rate        IS 'Cap rate (%) proposed by agent. <8 poor, 8-12 acceptable, >12 excellent';
COMMENT ON COLUMN acm_reports.rental_value    IS 'Derived value = NOI / (cap_rate / 100)';
