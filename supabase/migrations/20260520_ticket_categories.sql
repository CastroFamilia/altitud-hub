-- Migration: 20260520_ticket_categories.sql
-- Description: Add category and location_data to support_tickets
-- Enables agents to submit "location request" tickets with structured hierarchy data

-- 1. Add category column (default = 'bug' for backwards compatibility)
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'bug'
    CHECK (category IN ('bug', 'location_request', 'feature_request', 'other'));

-- 2. Add structured location data for location_request tickets
-- Schema: { provincia, canton, distrito, barrio, nombre_lugar }
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS location_data JSONB;
