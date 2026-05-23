-- ============================================================
-- RENAME SYSTEM PLACEHOLDER PROFILE
-- Renames "Agente Desvinculado" to "Otros"
-- ============================================================

UPDATE public.profiles
SET full_name = 'Otros'
WHERE email = 'sistema@remax-altitud.cr';
