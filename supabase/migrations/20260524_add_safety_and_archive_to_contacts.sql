-- Migration: Add Silent Followup and Security Alert Blacklist to Contacts (CRM) Table
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS no_followup BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS archive_reason TEXT,
ADD COLUMN IF NOT EXISTS security_alert BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS security_notes TEXT;
