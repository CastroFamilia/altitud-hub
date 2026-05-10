-- Agregar campo property_name a la tabla acm_reports
ALTER TABLE acm_reports ADD COLUMN IF NOT EXISTS property_name TEXT;
