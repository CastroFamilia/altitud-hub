-- Migration: Add status to event_attendance
-- Replaces boolean `attended` with a categorical `status`.

ALTER TABLE event_attendance 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ausente' 
CHECK (status IN ('presente', 'ausente', 'ausente_aviso', 'no_obligatoria'));

-- Migrate existing data
UPDATE event_attendance SET status = 'presente' WHERE attended = true;
UPDATE event_attendance SET status = 'ausente' WHERE attended = false OR attended IS NULL;

-- Keep `attended` column for now to prevent breaking existing queries, but it can be removed later.
