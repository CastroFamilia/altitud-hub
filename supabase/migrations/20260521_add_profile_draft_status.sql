-- ==============================================================
-- Migration: Add 'draft' status to profiles.status check constraint
-- Author: Antigravity AI
-- Date: 2026-05-21
-- ==============================================================

-- 1. Drop existing status check constraint if it exists
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_status_check;

-- 2. Add updated status check constraint allowing 'draft', 'invited', 'active', and 'disabled'
ALTER TABLE profiles ADD CONSTRAINT profiles_status_check CHECK (status IN ('draft', 'invited', 'active', 'disabled'));

-- 3. Comments
COMMENT ON COLUMN profiles.status IS 'Status of the profile: draft (silent/offline), invited (email sent but not registered), active (linked and logged in), or disabled (deactivated)';
