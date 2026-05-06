# 🗄️ Database Migration Guide — Supabase → New Database

**Purpose:** This document maps every Supabase dependency in the Altitud Hub so your IT team can migrate to a new database with zero guesswork.

**Last Updated:** May 6, 2026  
**Current Stack:** Supabase (PostgreSQL + Auth + Storage + RLS)  
**Hosted at:** `https://ppnoafqpvilmtvstleoe.supabase.co`

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Schema (All Tables)](#2-database-schema-all-tables)
3. [Authentication System](#3-authentication-system)
4. [Files That Reference Supabase](#4-files-that-reference-supabase)
5. [Supabase Client Libraries](#5-supabase-client-libraries)
6. [Row-Level Security (RLS) Policies](#6-row-level-security-rls-policies)
7. [Storage Buckets](#7-storage-buckets)
8. [Migration Steps (Recommended Order)](#8-migration-steps-recommended-order)
9. [Environment Variables](#9-environment-variables)
10. [NPM Dependencies to Replace](#10-npm-dependencies-to-replace)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  NEXT.JS APP (Vercel)                           │
│                                                 │
│  Client-Side (Browser)                          │
│  ├── supabase-browser.js  → Supabase SSR client │
│  ├── auth-context.js      → Google OAuth + Auth │
│  └── All page components  → .from('table')      │
│                                                 │
│  Server-Side (API Routes + Middleware)           │
│  ├── supabase-server.js   → Server Supabase     │
│  ├── supabase.js          → Simple client (APIs)│
│  ├── middleware.js         → Auth check via SSR  │
│  └── API routes           → .from('table')      │
│                                                 │
├──────────────────┬──────────────────────────────┤
│                  │                              │
│  Supabase Auth   │  Supabase PostgreSQL DB      │
│  (Google OAuth)  │  (14 tables, RLS, triggers)  │
│                  │                              │
│  Supabase Storage│                              │
│  (support_images)│                              │
└──────────────────┴──────────────────────────────┘
```

Supabase is used for 3 things:
1. **Database** — PostgreSQL with 14 tables
2. **Authentication** — Google OAuth with session cookies
3. **Storage** — One bucket for support ticket screenshots

---

## 2. Database Schema (All Tables)

### Core Tables

| Table | Purpose | Relations | Migration File |
|-------|---------|-----------|----------------|
| `profiles` | Agent/broker user profiles | FK → `auth.users`, FK → `teams` | `20260426_auth_profiles_teams.sql` |
| `teams` | Office teams/groups | — | `20260426_auth_profiles_teams.sql` |
| `contacts` | CRM contacts/leads | FK → `profiles` (agent_id) | `20260429_contacts_module.sql` |
| `properties` | Property listings | FK → `auth.users` (agent_id) | `20260504_properties_module.sql` + `20260506_properties_full_schema.sql` |
| `property_images` | Property photos | FK → `properties` | `20260506_property_images.sql` |

### Business Module Tables

| Table | Purpose | Relations | Migration File |
|-------|---------|-----------|----------------|
| `business_plans` | Agent business plans | FK → `auth.users` | `20260425_business_plans.sql` |
| `okr_daily_logs` | Daily OKR activity tracking | FK → `auth.users` | `20260424_initial_schema.sql` |
| `office_reservations` | Deal/reservation pipeline | FK → `auth.users` | `20260503_office_panel_tables.sql` + `20260503_negocio_module.sql` |
| `due_diligence_items` | Document checklist for deals | FK → `office_reservations` | `20260503_negocio_module.sql` |
| `account_transactions` | Financial transactions | FK → `profiles` | `20260502_account_statements.sql` |

### Operations Tables

| Table | Purpose | Relations | Migration File |
|-------|---------|-----------|----------------|
| `support_tickets` | Bug/error reports | FK → `auth.users` | `20260503_error_tickets.sql` |
| `listing_milestones` | Listing lifecycle tracking | FK → `properties`, FK → `auth.users` | `20260507_listing_milestones.sql` |
| `property_syndication` | Portal publication status | FK → `properties` | `20260506_property_syndication.sql` |
| `property_inquiries` | Leads from portals | FK → `properties`, FK → `auth.users` | `20260506_property_syndication.sql` |

### Developments Module

| Table | Purpose | Relations | Migration File |
|-------|---------|-----------|----------------|
| `developments` | Real estate developments | FK → `auth.users` (created_by) | `20260506_developments.sql` |
| `development_units` | Units within developments | FK → `developments` | `20260506_developments.sql` |
| `development_page_sections` | Landing page content blocks | FK → `developments` | `20260506_developments.sql` |

### Key Column Additions (ALTER TABLE)

These were added incrementally to the `contacts` table:
- `pipeline_stage` (TEXT) — `20260501_pipeline_stages.sql`
- `social_instagram`, `social_linkedin` (TEXT) — `20260501_social_media_fields.sql`
- `primary_language`, `secondary_language`, etc. (TEXT) — `20260504_contact_languages_types.sql`
- `newsletter_opt_in` (BOOLEAN) — `20260507_contact_newsletter_optin.sql`

And to `office_reservations`:
- `seller_agent`, `buyer_agent`, `seller_notary`, `buyer_notary` (TEXT) — `20260503_reservation_agents_notaries.sql`
- `registry_numbers`, `plan_numbers` (TEXT) — `20260503_reservation_legal_fields.sql`

---

## 3. Authentication System

### Current Flow
```
User clicks "Login with Google"
  → Supabase OAuth redirect (restricted to @remax-altitud.cr)
  → Google consent screen
  → Callback to /auth/callback
  → Supabase exchanges code for session
  → Session stored in cookies (managed by @supabase/ssr)
  → Middleware validates session on every request
  → AuthGate shows/hides app on client side
```

### Files Involved

| File | What It Does |
|------|-------------|
| `src/lib/auth-context.js` | Client-side auth provider. `signIn()` calls `supabase.auth.signInWithOAuth({ provider: 'google' })`. Manages `user`, `profile`, `role`. |
| `src/lib/supabase-browser.js` | Creates browser Supabase client via `createBrowserClient()` from `@supabase/ssr`. |
| `src/lib/supabase-server.js` | Creates server Supabase client via `createServerClient()` with cookie read/write. Also has `createAdminSupabase()` for service-role operations. |
| `src/middleware.js` | Validates auth via `supabase.auth.getUser()` on every request. Redirects to `/login` or returns 401. |
| `src/app/auth/callback/route.js` | Handles OAuth callback. Calls `supabase.auth.exchangeCodeForSession(code)`. |
| `src/app/login/page.js` | Login UI with Google button. |
| `src/components/layout/AuthGate.jsx` | Client-side gate: shows login if not authenticated. |

### To Replace Auth, You Need:
1. A new OAuth provider (e.g., NextAuth.js, Auth0, Firebase Auth, or custom JWT)
2. Session management (cookies or tokens)
3. A middleware check equivalent
4. Replace all `supabase.auth.getUser()`, `supabase.auth.signInWithOAuth()`, `supabase.auth.signOut()` calls
5. Replace `auth.uid()` references in RLS policies with your new user ID system

### User ID Pattern
Supabase uses `auth.users.id` (UUID) as the primary user identifier. The `profiles` table links to it via `auth_user_id`. Many tables reference `auth.users(id)` directly as foreign keys for `agent_id`.

**Important:** The new database must maintain a similar user ID → profile mapping.

---

## 4. Files That Reference Supabase

### Client Libraries (3 files — replace these first)

| File | Import | Purpose |
|------|--------|---------|
| `src/lib/supabase.js` | `@supabase/supabase-js` | Simple client for API routes |
| `src/lib/supabase-browser.js` | `@supabase/ssr` | Browser client with cookie support |
| `src/lib/supabase-server.js` | `@supabase/ssr` + `@supabase/supabase-js` | Server client + admin client |

### API Routes (13 files)

| File | Tables Used | Operations |
|------|-------------|------------|
| `src/app/api/health/route.js` | `profiles` | SELECT (health check) |
| `src/app/api/invite/route.js` | `profiles` | SELECT, INSERT, UPDATE |
| `src/app/api/olympia/coach/route.js` | `profiles`, `listings` | SELECT |
| `src/app/api/profile/route.js` | `profiles` | SELECT, UPDATE |
| `src/app/api/properties/cancel/route.js` | `properties`, `property_syndication` | SELECT, UPDATE |
| `src/app/api/properties/create-drive-folder/route.js` | `properties` | SELECT, UPDATE |
| `src/app/api/properties/import/route.js` | `properties`, `property_images` | SELECT, INSERT, UPDATE |
| `src/app/api/properties/publish/route.js` | `properties`, `property_syndication` | SELECT, UPDATE, UPSERT |
| `src/app/api/properties/sync/route.js` | `properties`, `property_syndication` | SELECT, UPDATE, UPSERT |
| `src/app/api/properties/sync-photos/route.js` | `properties`, `property_images` | SELECT, INSERT, DELETE, UPDATE |
| `src/app/api/public/properties/feed/route.js` | `properties` | SELECT |
| `src/app/auth/callback/route.js` | (auth only) | exchangeCodeForSession |

### Page Components (19 files)

| File | Tables Used |
|------|-------------|
| `src/app/acm/page.js` | `properties`, `contacts` |
| `src/app/contactos/page.jsx` | `contacts` |
| `src/app/contactos/[id]/page.jsx` | `contacts`, `properties` |
| `src/app/contactos/importar/page.jsx` | `contacts` |
| `src/app/contactos/nuevo/page.jsx` | `contacts` |
| `src/app/equipo/page.js` | `profiles`, `teams` |
| `src/app/estado-cuenta/page.js` | `account_transactions`, `profiles` |
| `src/app/negocio/page.js` | `office_reservations`, `due_diligence_items` |
| `src/app/negocio/transaccion/[id]/page.js` | `office_reservations`, `due_diligence_items` |
| `src/app/oficina/page.js` | `profiles`, `teams`, `listing_milestones`, `office_reservations` |
| `src/app/oficina/estado-cuenta/page.js` | `profiles`, `account_transactions` |
| `src/app/oficina/soporte/page.js` | `support_tickets` |
| `src/app/plan/page.js` | `business_plans` |
| `src/app/prelisting/page.js` | `contacts` (prelisting pipeline) |
| `src/app/propiedades/page.js` | `properties` |
| `src/app/propiedades/[id]/page.js` | `properties`, `property_images` |
| `src/app/propiedades/nueva/page.js` | `properties` |
| `src/app/propiedades/fotos/page.js` | `properties`, `property_images` |
| `src/app/propiedades/desarrollos/*.js` | `developments`, `development_units`, `development_page_sections` |
| `src/app/soporte/page.js` + `TicketForm.jsx` | `support_tickets` |

### Component Files (2 files)

| File | Tables Used |
|------|-------------|
| `src/components/oficina/PropertyApprovalTab.jsx` | `properties` |
| `src/components/propiedades/SyndicationPanel.jsx` | `property_syndication`, `property_inquiries` |

---

## 5. Supabase Client Libraries

### Query Pattern Used Throughout

All database queries follow the Supabase JS client pattern:

```javascript
// SELECT
const { data, error } = await supabase
  .from('contacts')
  .select('*')
  .eq('agent_id', userId)
  .order('created_at', { ascending: false });

// INSERT
const { data, error } = await supabase
  .from('contacts')
  .insert({ first_name: 'John', agent_id: userId })
  .select()
  .single();

// UPDATE
const { error } = await supabase
  .from('contacts')
  .update({ first_name: 'Jane' })
  .eq('id', contactId);

// DELETE
const { error } = await supabase
  .from('contacts')
  .delete()
  .eq('id', contactId);

// UPSERT
const { error } = await supabase
  .from('property_syndication')
  .upsert({ property_id, portal_name, status: 'synced' }, { onConflict: 'property_id,portal_name' });
```

### To Replace:
Create an abstraction layer (e.g., `src/lib/db.js`) that provides the same API shape:
```javascript
// Example: db.from('contacts').select('*').eq('agent_id', userId)
// Map this to your ORM (Prisma, Drizzle, Knex, etc.)
```

---

## 6. Row-Level Security (RLS) Policies

RLS is Supabase's way of enforcing per-user data access at the database level. When migrating, you need to replicate this logic at the application layer (middleware, API route guards, or ORM scoping).

### Pattern Summary

| Role | Can See | Can Edit |
|------|---------|----------|
| `agent` | Own data only (filtered by `agent_id = auth.uid()`) | Own data only |
| `team_leader` | Own team's data | Own data |
| `broker` | All data across office | All data |

### Tables with RLS Enabled

- `profiles` — agents see own, brokers see all
- `contacts` — agents see own, brokers see all
- `properties` — agents see own, brokers see all
- `property_images` — agents see own property images
- `property_syndication` — agents see own, brokers see all
- `property_inquiries` — agents see assigned, brokers see all, public can INSERT
- `business_plans` — agents see own
- `okr_daily_logs` — agents see own
- `office_reservations` — agents see own, brokers see all
- `due_diligence_items` — via reservation ownership
- `account_transactions` — agents see own, brokers see all
- `support_tickets` — agents see own, admins see all
- `listing_milestones` — agents see own, brokers see all, team leaders see team
- `developments` + related — agents see own, brokers see all

### Migration Approach:
Replace RLS with **server-side access control** in your API routes:

```javascript
// Example: instead of RLS, filter at the query level
async function getContacts(userId, role) {
  if (role === 'broker') {
    return db.contacts.findMany(); // all
  }
  return db.contacts.findMany({ where: { agent_id: userId } }); // own only
}
```

---

## 7. Storage Buckets

### Current Bucket: `support_images`
- **Purpose:** Stores screenshots uploaded with support tickets
- **Access:** Public read, authenticated upload
- **Used in:** `src/app/soporte/components/TicketForm.jsx`

### To Replace:
Use your new storage solution (S3, Cloudflare R2, Firebase Storage, etc.) and update the upload logic in the TicketForm component.

---

## 8. Migration Steps (Recommended Order)

### Phase 1: Database Migration (Schema Only)
1. Export all SQL migration files from `supabase/migrations/` 
2. Create equivalent tables in new PostgreSQL (or other) database
3. Remove Supabase-specific syntax (`auth.uid()`, `gen_random_uuid()`, RLS policies)
4. Add your own UUID generation and timestamp triggers

### Phase 2: Data Layer Abstraction
1. Create `src/lib/db.js` as a thin wrapper around your new ORM
2. Replace all `supabase.from('table').select()` calls with your abstraction
3. Implement access control (replacing RLS) in the abstraction layer

### Phase 3: Auth Migration  
1. Choose new auth provider (NextAuth.js recommended for Next.js)
2. Replace `src/lib/supabase-browser.js` and `src/lib/supabase-server.js`
3. Rewrite `src/lib/auth-context.js` to use new auth
4. Rewrite `src/middleware.js` to validate sessions via new auth
5. Update `src/app/auth/callback/route.js`
6. Update `src/app/login/page.js`

### Phase 4: Storage Migration
1. Set up new storage (S3/R2/Firebase)
2. Update `TicketForm.jsx` upload logic
3. Migrate any existing images

### Phase 5: Cleanup
1. Remove `@supabase/supabase-js` and `@supabase/ssr` from `package.json`
2. Delete `src/lib/supabase.js`, `supabase-browser.js`, `supabase-server.js`
3. Delete `supabase/migrations/` directory (keep as archive)
4. Update environment variables

---

## 9. Environment Variables

### Current Supabase Variables (to remove after migration)
```env
NEXT_PUBLIC_SUPABASE_URL=https://ppnoafqpvilmtvstleoe.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=<not currently set, needed for admin ops>
```

### Variables That Stay (not Supabase-related)
```env
GEMINI_API_KEY=...                    # AI — stays
GOOGLE_CLIENT_ID=...                  # Drive API — stays
GOOGLE_CLIENT_SECRET=...              # Drive API — stays
GOOGLE_DRIVE_ROOT_FOLDER_ID=...       # Drive — stays
GOOGLE_DRIVE_REFRESH_TOKEN=...        # Drive — stays
```

### New Variables to Add (depends on your choice)
```env
# If using NextAuth.js:
NEXTAUTH_SECRET=...
NEXTAUTH_URL=...

# If using a new PostgreSQL:
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# If using Prisma:
# DATABASE_URL is used automatically
```

---

## 10. NPM Dependencies to Replace

### Remove
```json
"@supabase/ssr": "^0.10.2",
"@supabase/supabase-js": "^2.104.1"
```

### Add (suggested, depends on choice)
```json
// Option A: Prisma ORM
"prisma": "^6.x",
"@prisma/client": "^6.x",

// Option B: Drizzle ORM  
"drizzle-orm": "^0.x",
"drizzle-kit": "^0.x",

// For Auth:
"next-auth": "^5.x"  // or your preferred auth library
```

---

## Quick Reference: Supabase Query → Standard SQL

| Supabase | SQL Equivalent |
|----------|---------------|
| `.from('contacts').select('*')` | `SELECT * FROM contacts` |
| `.eq('agent_id', id)` | `WHERE agent_id = $id` |
| `.order('created_at', { ascending: false })` | `ORDER BY created_at DESC` |
| `.single()` | `LIMIT 1` |
| `.insert({...}).select()` | `INSERT INTO ... RETURNING *` |
| `.upsert({...}, { onConflict: 'col' })` | `INSERT ... ON CONFLICT (col) DO UPDATE` |
| `.select('*', { count: 'exact', head: true })` | `SELECT COUNT(*) FROM ...` |
| `.in('status', ['a','b'])` | `WHERE status IN ('a','b')` |
| `.neq('status', 'deleted')` | `WHERE status != 'deleted'` |
| `.is('deleted_at', null)` | `WHERE deleted_at IS NULL` |

---

*This guide was generated from the live codebase. If new tables or Supabase references are added after this date, they should be appended here.*
