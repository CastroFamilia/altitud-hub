-- =============================================
-- LEAD SLA & REJECTION UPDATES
-- =============================================

-- 1. Add SLA columns to property_inquiries
ALTER TABLE public.property_inquiries 
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_contact_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. Update status constraint
ALTER TABLE public.property_inquiries DROP CONSTRAINT IF EXISTS property_inquiries_status_check;

ALTER TABLE public.property_inquiries
  ADD CONSTRAINT property_inquiries_status_check 
  CHECK (status IN ('new', 'contacted', 'converted', 'dismissed', 'rejected', 'prelisting', 'cma', 'listed'));

-- 3. Trigger to automatically set assigned_at
CREATE OR REPLACE FUNCTION update_inquiry_assigned_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.assigned_agent_id IS DISTINCT FROM OLD.assigned_agent_id AND NEW.assigned_agent_id IS NOT NULL THEN
        NEW.assigned_at = NOW();
        NEW.sla_breached = false;
        NEW.first_contact_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inquiry_assigned_trigger ON public.property_inquiries;
CREATE TRIGGER inquiry_assigned_trigger
    BEFORE UPDATE ON public.property_inquiries
    FOR EACH ROW EXECUTE FUNCTION update_inquiry_assigned_at();

-- If existing leads are assigned, backfill assigned_at
UPDATE public.property_inquiries 
SET assigned_at = created_at 
WHERE assigned_agent_id IS NOT NULL AND assigned_at IS NULL;

-- 4. Trigger to automatically set first_contact_at
CREATE OR REPLACE FUNCTION update_inquiry_first_contact()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.property_inquiries
    SET 
        first_contact_at = COALESCE(first_contact_at, NOW()),
        status = CASE WHEN status = 'new' THEN 'contacted' ELSE status END
    WHERE id = NEW.inquiry_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS communication_inserted_trigger ON public.lead_communications;
CREATE TRIGGER communication_inserted_trigger
    AFTER INSERT ON public.lead_communications
    FOR EACH ROW EXECUTE FUNCTION update_inquiry_first_contact();
