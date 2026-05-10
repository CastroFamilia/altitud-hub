-- Añadir el estado 'acm' a las opciones válidas de status en la tabla properties
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_status_check;

ALTER TABLE public.properties ADD CONSTRAINT properties_status_check 
  CHECK (status IN ('draft', 'pending_approval', 'needs_changes', 'approved', 'published', 'cancelled', 'acm'));
