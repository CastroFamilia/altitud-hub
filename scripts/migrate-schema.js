const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '../supabase/migrations');
const outputFile = path.join(__dirname, '../schema.sql');

const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

let consolidatedSQL = `
-- ==========================================
-- CONSOLIDATED POSTGRESQL SCHEMA
-- Migrated from Supabase
-- ==========================================

-- Enable PostGIS if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create users table for Auth.js
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    "emailVerified" TIMESTAMPTZ,
    image TEXT,
    password_hash TEXT, -- For credentials provider
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  UNIQUE(provider, "providerAccountId")
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "sessionToken" TEXT UNIQUE NOT NULL,
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_token (
  identifier TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (identifier, token)
);

`;

for (const file of files) {
  const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  
  // Clean up Supabase specific stuff
  let cleaned = content
    // Replace auth.users with public users table
    .replace(/auth\.users/g, 'users')
    .replace(/REFERENCES auth\.users/g, 'REFERENCES users')
    // Remove RLS
    .replace(/ALTER TABLE .+ ENABLE ROW LEVEL SECURITY;/g, '')
    // Remove Policies
    .replace(/CREATE POLICY.+?WITH CHECK.+?;/gs, '')
    .replace(/CREATE POLICY.+?USING.+?;/gs, '')
    // Remove Grants
    .replace(/GRANT .+ ON .+ TO .+;/g, '')
    // Some policies might not have USING or WITH CHECK but are multiline
    .replace(/CREATE POLICY[^;]+;/gs, '');

  consolidatedSQL += `\n\n-- File: ${file}\n${cleaned}`;
}

fs.writeFileSync(outputFile, consolidatedSQL, 'utf8');
console.log('Successfully created schema.sql');
