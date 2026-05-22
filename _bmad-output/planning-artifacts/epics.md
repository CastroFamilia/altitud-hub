# Altitud Hub — Epics & Stories

> Generated via `bmad-create-epics-and-stories` workflow.
> Source documents: `product-requirements-document.md`, `system-architecture.md`, `technical-specs.md`, `business-logic.md`, `TECHNICAL_HANDOVER.md`.
> Codebase state: audited 2026-05-18.

---

## Status Legend

| Icon | Meaning |
|------|---------|
| ✅ | Complete — code exists, wired, tested |
| 🔧 | Scaffolded — code exists but not wired to live data or not fully functional |
| ⏸️ | Deferred — blocked by infrastructure or external dependency |
| 🆕 | Not started |

---

## Phase 1: Feature Development (Local/Supabase)

## Epic 3: Complete Internationalization (i18n) ✅ / 🔧

**Priority:** P2 — Polish  
**Status:** 🔧 Mostly complete, ongoing cleanup  
**Description:** Ensure all UI strings use the central `t()` translation dictionary.

### Story 3.1 — Audit & Fix Remaining Hardcoded Strings 🔧

**As an** agent who speaks English, **I want** all UI text to respect my language preference **so that** I can use the Hub comfortably in my language.

**Acceptance Criteria:**
- [ ] Run automated scan: `grep -rn "lang === 'en' ?" src/` to find inline conditionals instead of `t()` calls
- [ ] All inline ternaries like `lang === 'en' ? 'Edit' : 'Editar'` replaced with `t('key')` + dictionary entry
- [ ] Pre-Listing, CRM Contacts, and Importer modules fully audited
- [ ] PropertyDetailClient.jsx hardcoded strings converted (currently ~20 inline ternaries at lines 202, 239, 252, etc.)
- [ ] BlockEditor.jsx English-only labels converted
- [ ] Missing dictionary keys added to `src/lib/context.js`

**Technical Notes:**
- Translation dictionary: `src/lib/context.js` — 133KB, already contains 500+ keys
- Known offenders: `PropertyDetailClient.jsx` (20+ inline ternaries), `BlockEditor.jsx` (English-only labels), `CommissionCalculator.jsx`
- Previous conversation `6e1a0edf` partially addressed this

**Dependencies:** None  
**Estimated Effort:** S (small — mechanical find-and-replace)

---

## Epic 4: Hub-First Properties Module 🔧

**Priority:** P1 — Core Feature  
**Status:** 🔧 Substantially built, key pieces need wiring  
**Description:** Complete property management system for local properties. Note: Hub currently acts as a pull-only consumer for RECONNECT properties. Pushing to RECONNECT is deferred to Epic 13.

### Story 4.1 — Expand Properties Schema ✅

**Status:** ✅ COMPLETE  
**Evidence:**
- Migration `20260506_properties_full_schema.sql` (8.4KB) — full RECONNECT-compatible schema
- Migration `20260506_property_images.sql` — image management tables
- Migration `20260506_property_syndication.sql` — portal tracking tables
- Migration `20260507_listing_milestones.sql` — workflow tracking

---

### Story 4.2 — Agent Property CRUD ✅

**Status:** ✅ COMPLETE  
**Evidence:**
- `/propiedades` portfolio page — `PropiedadesClient.jsx` (189 lines) — tab filtering, search, stats row
- `/propiedades/nueva` creation form — `NuevaPropiedadClient.jsx` (30.8KB) — full multi-step form
- `/propiedades/[id]` detail page — `PropertyDetailClient.jsx` (540 lines) — gallery, details, amenities, owner info, commission, syndication panel, analytics, sold workflow
- Components: `PropertyCard.jsx`, `PropertyStatusBadge.jsx`, `PropertyTimeline.jsx`, `SoldCongratsModal.jsx`, `CommissionCalculator.jsx`, `ListingAnalyticsPanel.jsx`, `WhatsAppSendButton.jsx`

---

### Story 4.3 — Broker Approval Dashboard ✅

**Status:** ✅ COMPLETE  
**Evidence:**
- `PropertyApprovalTab.jsx` (330+ lines) — full broker approval dashboard with:
  - Stats summary cards (Pending/Changes/Approved/Published/All) with active filter
  - Agent name + avatar displayed per property via profile lookup
  - Submission date on each row
  - Expandable detail panels with owner info, specs, commission, photos, bilingual descriptions
  - Enhanced approval checklist with progress bar + percentage (10 items including separate ES/EN description checks)
  - Approve, Approve & Publish, Request Changes actions
  - Batch approve via checkbox selection
  - Agent notification on every status change (`notifications` table insert)
- Wired into `OficinaClient.jsx` at `activeTab === 'propiedades'`
- Sidebar entry at `/oficina?tab=propiedades`
- Broker notes banner on `PropertyDetailClient.jsx` (line 235)

**Dependencies:** Story 4.2 (complete)  
**Estimated Effort:** M (medium — new tab in existing UI, reuse existing patterns)

---

### Story 4.4 — RECONNECT API Integration (Write/Push) ⏸️

**Status:** ⏸️ DEFERRED — MOVED TO EPIC 13  
*This story has been moved to Epic 13 as the Hub is currently a pull-only system.*

---

### Story 4.5 — Drive-Based Photo Workflow ✅

**Status:** ✅ COMPLETE  
**Evidence:**
- "Create Drive Folder" button on PropertyDetailClient (line 117-151)
- `/api/drive/create-folder` route — creates per-property Drive folder via service account
- `/api/properties/sync-photos` route — syncs images from Drive to `property_images` table
- "Sync Photos" button on PropertyDetailClient (line 154-177)
- Photo gallery rendering with delete capability (line 314-388)

---

### Story 4.6 — Portal Syndication ⏸️

**Status:** ⏸️ DEFERRED — MOVED TO EPIC 13  
*This story has been moved to Epic 13.*

---

## Epic 5: Developments Module & Public Landing Pages 🔧

**Priority:** P1 — Revenue Feature  
**Status:** 🔧 Substantially built — editor, public pages, analytics all exist  
**Description:** Block-based page builder for development marketing landing pages.

### Story 5.1 — Developments Database & CRUD ✅

**Status:** ✅ COMPLETE  
**Evidence:**
- Migration `20260506_developments.sql` (6.2KB) — full schema with JSONB `sections`
- `/propiedades/desarrollos` listing page — `DesarrollosClient.jsx` (9.4KB)
- `/propiedades/desarrollos/nuevo` creation flow
- `/propiedades/desarrollos/[id]` detail page — `DesarrolloDetailClient.jsx` (28.3KB) with tabs (Página, Inventario, Ajustes)
- `/propiedades/desarrollos/[id]/editar` edit flow

---

### Story 5.2 — Block-Based Page Editor ✅

**Status:** ✅ COMPLETE  
**Evidence:**
- `BlockEditor.jsx` (326 lines, 17.9KB) — 13 block types: hero, text, gallery, amenities, faq, lead, agent, video, map, stats, social, inventory, document
- Inline editing for all block types
- Block reordering and removal
- Live preview rendering

---

### Story 5.3 — Public Landing Pages ✅

**Status:** ✅ COMPLETE  
**Evidence:**
- `/d/[slug]/page.js` — server component with SEO metadata generation (2.5KB)
- `DevelopmentLanding.jsx` (26KB) — full public page rendering from JSONB sections
- 404 handling at `/d/[slug]/not-found.js`
- `/api/public/developments/route.js` — public API for website consumption

---

### Story 5.4 — Analytics & Reporting 🔧

**Status:** 🔧 PARTIALLY COMPLETE  

**As an** agent, **I want** to see how my development landing page is performing **so that** I can demonstrate ROI to my developer client.

**Acceptance Criteria:**
- [ ] Page view tracking on `/d/[slug]` pages (✅ `/api/public/analytics/beacon` + `/api/public/analytics/track` exist)
- [ ] Analytics aggregation endpoint (✅ `/api/public/analytics/aggregate` exists)
- [ ] Analytics panel in development detail page (✅ `DevelopmentAnalytics.jsx` 8.4KB exists)
- [ ] Report generator UI (✅ `ReportGeneratorClient.jsx` 19.6KB exists)
- [ ] Report public view at `/reportes/[id]` (✅ exists with layout)
- [ ] Report API at `/api/reportes/[id]/route.js` (✅ exists)
- [ ] PDF export functionality 🆕
- [ ] Full funnel tracking: views → inquiries → site visits → reservations → closings 🆕
- [ ] Auto-generated shareable report links ✅

**Dependencies:** Story 5.3 (landing pages must exist)  
**Estimated Effort:** S (small — mostly polish on existing foundation)

---

### Story 5.5 — Public API for Website ✅

**Status:** ✅ COMPLETE  
**Evidence:**
- `/api/public/developments/route.js` — returns all active developments with sections, properties, and images

---

## Epic 6: RECONNECT Portfolio View ✅

**Priority:** P2 — Agent Productivity  
**Status:** ✅ COMPLETE  
**Description:** Read-only view of active RECONNECT listings inside the Hub.

### Story 6.1 — RECONNECT Portfolio UI ✅

**Evidence:**
- `/propiedades/reconnect/ReconnectPortfolioClient.jsx` (22.5KB) — full filterable portfolio view
- `/api/reconnect/listings/route.js` (88 lines) — API proxy normalizing RECONNECT data
- Per-office filtering (Altitud / Altitud Cero / All)
- Agent and property type filters
- Stats header, responsive card grid

---

## Epic 7: Buyer Search & RINDER Integration ✅

**Priority:** P1 — Core Feature  
**Status:** ✅ COMPLETE  
**Description:** Buyer search module with property matching pipeline and RINDER portal for buyer voting.

### Story 7.1 — Buyer Search CRUD ✅

**Evidence:**
- `/busqueda/BusquedaClient.jsx` (48.2KB) — full buyer search management
- `/api/searches/route.js` — CRUD for buyer searches
- `/api/searches/pipeline/route.js` — property pipeline management
- `/api/searches/matches/route.js` — property matching engine

---

### Story 7.2 — RINDER Portal API ✅

**Evidence:**
- `/api/portal/searches/[id]/route.js` — returns search context + matched properties for RINDER
- `/api/portal/votes/route.js` — receives buyer votes, creates agent notifications
- Auto-status updates (commented out but ready to activate)

---

## Epic 8: Olympia AI Coach 🔧

**Priority:** P2 — Differentiator  
**Status:** 🔧 Core working, advanced features in progress  
**Description:** AI-powered coaching assistant for agents.

### Story 8.1 — Core AI Chat ✅

**Evidence:**
- `/olimpia/page.js` — Olympia AI chat page
- `/api/olympia/coach/route.js` — Gemini-powered coaching with persistent Drive-based history

---

### Story 8.2 — Proactive Follow-Up Alerts ✅

**As an** agent, **I want** Olympia to remind me about upcoming birthdays, move-in anniversaries, and overdue follow-ups **so that** I maintain strong client relationships.

**Acceptance Criteria:**
- [x] `/api/olympia/proactive-alerts/route.js` (✅ exists) queries contacts for upcoming events
- [x] Birthday reminders 7 days in advance
- [x] Follow-up reminders for dormant leads (>48h without contact)
- [x] Agent preference system for preferred follow-up days ✅
- [x] Tool calling / function calling for Olympia to log communications and schedule follow-ups ✅
- [x] Notification integration: alerts appear in TopNav notification bell

**Technical Notes:**
- Migration `20260508_communication_log.sql` provides the communication tracking table
- Migration `20260511_lead_sla.sql` provides SLA tracking
- Conversation `407d92fe` partially implemented this

**Dependencies:** None  
**Estimated Effort:** M (medium — AI prompt engineering + database queries)

---

## Epic 9: Office Performance Analytics 🔧

**Priority:** P2 — Broker Value  
**Status:** 🔧 Core dashboard exists, advanced features in progress  
**Description:** Business intelligence for broker oversight.

### Story 9.1 — Core Office Dashboard ✅

**Evidence:**
- `/oficina/OficinaClient.jsx` (38.9KB) — agent stats, team management, support tickets
- `/oficina/page.js` (3.9KB) — server-side data fetching

---

### Story 9.2 — Plan vs. Achieved Reporting ✅

**Status:** ✅ COMPLETE
**Evidence:**
- "Plan vs Achieved" tab in Office Panel exists (`OfficePlanTab.jsx`) comparing monthly targets to actuals
- Metrics track listings taken, properties sold, commission earned, new contacts, showings
- Visual bar chart shows plan vs. actual per month (historical plans)
- Data sourced from `office_business_plans` via `/api/office-plan/route.js`
- Poverty line visualization exists
- Database migrated via `20260520_office_plan_metrics.sql`

**As a** broker, **I want** to compare monthly targets against actual performance **so that** I can identify underperforming areas.

**Acceptance Criteria:**
- [x] "Plan vs Achieved" tab in Office Panel comparing monthly targets to actuals
- [x] Metrics: listings taken, properties sold, commission earned, new contacts, showings
- [x] Visual chart (bar or line) showing plan vs. actual per month
- [x] Office business plan data sourced from `office_business_plans` table (✅ migration exists)
- [x] Poverty line visualization

---

### Story 9.3 — Portfolio Rotation KPI 🆕

**As a** broker, **I want** to track how quickly each agent's listings rotate (days on market to sold) **so that** I can coach agents on pricing strategy.

**Acceptance Criteria:**
- [ ] Portfolio rotation metric calculated per agent: average DOM (days on market) for sold properties
- [ ] Office-wide average for comparison
- [ ] Trend line showing rotation improvement/deterioration over time
- [ ] Visible in both Office dashboard and agent's personal Plan page

**Dependencies:** Story 4.1 (properties schema with dates)  
**Estimated Effort:** S (small — SQL query + UI widget)

---

## Epic 10: Prelisting Folder Generator ✅

**Priority:** P2 — Marketing Tool  
**Status:** ✅ COMPLETE  

### Story 10.1 — Core Prelisting Presentation ✅

**Evidence:**
- `/prelisting` route — premium marketing presentation
- `src/components/prelisting/` — full component library
- Brand dualism (Altitud vs. Altitud Cero)

---

### Story 10.2 — Dynamic Prelisting Folder Builder ✅

**Status:** ✅ COMPLETE  
**Evidence:**
- `/prelisting/carpeta` — Presentation Builder with custom cover and page selector
- `/admin/printables` — Admin panel for printable pages
- Added "Property Type" templates for Casa, Lote, Comercial, Finca
- Migration `20260516145600_create_prelisting_tables.sql`
- Linked in Sidebar

**As an** agent, **I want** to customize which pages appear in my prelisting folder and personalize the cover **so that** each presentation is tailored to the client.

**Acceptance Criteria:**
- [x] Admin panel for managing printable page templates
- [x] Agent-facing Presentation Builder: personalize cover (title, background, client name)
- [x] Page selector: choose which pages to include/exclude
- [x] Save and retrieve customized presentations from database
- [x] Print-optimized CSS for physical printing
- [x] Migration `20260516145600_create_prelisting_tables.sql` (✅ exists)

**Technical Notes:**
- Conversation `138db44c` designed this feature in detail
- Database tables already created

**Dependencies:** None  
**Estimated Effort:** M (medium — UI builder + print CSS)

---

## Epic 11: Next.js Client/Server Boundary Optimization ✅

**Priority:** P3 — Technical Debt  
**Status:** ✅ COMPLETE
**Description:** Ensure proper RSC utilization — move data fetching to server components where possible.

### Story 11.1 — Refactor Client-Heavy Pages ✅

**Status:** ✅ COMPLETE
**Evidence:** 
- Refactored `/contactos`, `/negocio`, and `/busqueda` to fetch data server-side
- Isolated modals as client leaf nodes (`AddReservationModal`, `ReservationDetailDrawer`, `AddRequirementModal`, `AddExternalPropertyModal`)
- Migrated `<TopNav>` and layout structures to server-side `page.js` files
- Eliminated redundant `useEffect` hooks in favor of `router.refresh()`

**As a** developer, **I want** data fetching to happen in Server Components **so that** the client bundle is smaller and initial page loads are faster.

**Acceptance Criteria:**
- [x] Audit all `page.js` files that wrap a `*Client.jsx` component
- [x] Identify pages where `useEffect` fetches data that could be fetched server-side
- [x] Refactor top offenders: `/contactos`, `/negocio`, `/busqueda`
- [x] Ensure `"use client"` only exists at leaf interactive nodes
- [x] Measure and document bundle size improvement

**Technical Notes:**
- Pattern already established: `propiedades/page.js` fetches server-side and passes `initialProperties` to `PropiedadesClient.jsx`
- Replaced `useEffect` fetches and manual `supabase` queries with `router.refresh()` for mutations

**Dependencies:** Epic 1 (Story 1.3 — easier to refactor after Supabase removal)  
**Estimated Effort:** L (large — touches many pages)

### Story 11.2 — Refactor Agent & Office Dashboards ✅

**Status:** ✅ COMPLETE
**Evidence:** 
- Refactored `DashboardClient` (Agent Home) to fetch OKRs, Follow-Ups, and Property Stats on the server (`page.js`) instead of natively via `useEffect`.
- Stripped redundant client-side `loadData()` calls from the `OficinaClient` dashboard, relying on props already provided by `OficinaPage`.
- Kept isolated Client-Side Data Fetching solely for interactive filters (like `selectedOffice` API feeds).
- Both dashboards now initialize near-instantly with full data via Next.js RSC and use `router.refresh()` to sync mutations.

---

## Epic 12: Sidebar Navigation Restructure ✅

**Priority:** P2 — UX  
**Status:** ✅ COMPLETE  
**Evidence:** Conversation `0b22f6db` and `f50974f1` restructured sidebar into collapsible dropdown groups (Negocios, Herramientas, Portafolio).

---

## Sprint Priority Matrix

> [!IMPORTANT]
> Recommended sprint ordering based on dependency chains and business impact.

### Sprint 1: Foundation (Epic 1, Stories 1.1–1.2)
- Provision PostgreSQL on Coolify
- Run schema migrations
- **Outcome:** Database ready, no code changes yet

### Sprint 2: Database Client Migration (Epic 1, Story 1.3)
- Replace all Supabase client calls with direct PostgreSQL
- **Outcome:** Hub runs on self-hosted DB

### Sprint 3: Authentication (Epic 1, Story 1.4 + Epic 2, Story 2.1)
- Implement auth system
- Apply auth middleware to all routes
- **Outcome:** Hub is secure

### Sprint 4: Properties Completion (Epic 4, Stories 4.3–4.4)
- Broker approval dashboard in Office Panel
- Activate RECONNECT write operations
- **Outcome:** Full property lifecycle works end-to-end

### Sprint 5: Polish & Analytics (Epic 3 Story 3.1, Epic 5 Story 5.4, Epic 9 Stories 9.2–9.3)
- i18n cleanup
- PDF report export for developments
- Office Plan vs. Achieved reporting
- Portfolio rotation KPI
- **Outcome:** Premium experience, broker analytics

### Sprint 6: Advanced Features (Epic 8 Story 8.2, Epic 10 Story 10.2)
- Olympia proactive alerts
- Prelisting folder builder
- **Outcome:** AI differentiation + marketing tools

### Sprint 7: Technical Debt (Epic 11 Story 11.1, Epic 4 Story 4.6)
- Client/Server boundary refactoring
- Portal syndication (dependent on external specs)
- **Outcome:** Performance optimization + distribution

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total Epics | 12 |
| Total Stories | 23 |
| ✅ Complete | 15 |
| 🔧 Scaffolded / Partial | 4 |
| 🆕 Not Started | 3 |
| ⏸️ Deferred | 0 (previously deferred Epic 1 now has stories) |
| Estimated Remaining Effort | ~7 sprints |

---

## Phase 2: Production Coolify Migration

## Epic 1: Infrastructure Migration (Supabase → Self-Hosted PostgreSQL) ⏸️

**Priority:** P0 — Foundation  
**Status:** ⏸️ DEFERRED (blocking all auth and security work)  
**Description:** Migrate the Hub from Supabase-hosted PostgreSQL + Supabase Auth to a self-hosted PostgreSQL instance on Coolify, with application-layer auth replacing Supabase Auth and Supabase RLS.

> [!WARNING]
> This epic is the single largest technical debt item. Every API route currently uses `@supabase/supabase-js` client calls (29+ route files). All client components use `supabase` imports from `@/lib/supabase.js`. This epic must complete before Epic 2 (Security) can begin.

### Story 1.1 — Provision PostgreSQL on Coolify 🆕

**As a** DevOps admin, **I want** a production PostgreSQL + PostGIS instance running on Coolify **so that** all three ecosystem projects (Hub, Website, RINDER) share a single database.

**Acceptance Criteria:**
- [ ] PostgreSQL 16+ with PostGIS extension deployed via Coolify Docker
- [ ] Connection string accessible to all three projects
- [ ] Automated daily backups configured (pg_dump to S3 or local volume)
- [ ] Monitoring dashboard showing connection count, query latency, disk usage
- [ ] `.env` template updated with `DATABASE_URL` replacing all Supabase env vars

**Technical Notes:**
- Current Supabase env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Target env var: `DATABASE_URL=postgresql://user:pass@host:5432/altitud_hub`
- PostGIS is required for the Website's spatial queries (not strictly needed by Hub, but shared DB)

**Dependencies:** None (can start immediately)  
**Estimated Effort:** S (small — infrastructure setup only)

---

### Story 1.2 — Schema Migration from Supabase to Self-Hosted 🆕

**As a** developer, **I want** to migrate the existing 49 migration files to the self-hosted PostgreSQL instance **so that** the schema is identical and all existing data is preserved.

**Acceptance Criteria:**
- [ ] All 49 files in `/supabase/migrations/` run cleanly against the new PostgreSQL instance
- [ ] All Supabase-specific SQL (RLS policies, `auth.uid()`, `auth.users`) is stripped or adapted
- [ ] Data exported from Supabase and imported to self-hosted instance
- [ ] Verification script confirms row counts match across all tables
- [ ] Migration guide at `docs/DATABASE_MIGRATION_GUIDE.md` updated with actual execution steps

**Technical Notes:**
- RLS policies in migrations reference `auth.uid()` — these must be removed since RBAC will be application-layer
- The `profiles` table has a trigger that syncs with `auth.users` — this must be replaced with application-layer user management
- Run `grep -r 'auth.uid\|auth.users\|row level security' supabase/migrations/` to find all Supabase-specific SQL

**Dependencies:** Story 1.1  
**Estimated Effort:** M (medium — careful migration with data verification)

---

### Story 1.3 — Replace Supabase Client with Direct PostgreSQL 🆕

**As a** developer, **I want** to replace all `@supabase/supabase-js` imports with a direct PostgreSQL client **so that** the Hub no longer depends on Supabase services.

**Acceptance Criteria:**
- [ ] New database utility at `src/lib/db.js` wrapping a PostgreSQL client (e.g., `pg` pool or `drizzle-orm`)
- [ ] All 29+ API route files migrated from `supabase.from('table')` to direct SQL queries
- [ ] All client components migrated from `supabase` imports to API route calls
- [ ] `@supabase/supabase-js` and `@supabase/ssr` removed from `package.json`
- [ ] Connection pooling configured (PgBouncer or `pg` pool with max 20 connections)
- [ ] All existing functionality verified working post-migration

**Technical Notes:**
- Files to migrate (grep results): 29+ files in `src/app/api/` + client components using `import { supabase } from '@/lib/supabase'`
- Key files: `src/lib/supabase.js`, `src/lib/supabase-browser.js`, `src/lib/supabase-server.js` — all to be replaced by `src/lib/db.js`
- Consider `drizzle-orm` since the Website project already uses it (shared ORM knowledge)

**Dependencies:** Story 1.2  
**Estimated Effort:** XL (extra large — touches every API route and many client components)

---

### Story 1.4 — Implement Application-Layer Authentication 🆕

**As a** developer, **I want** a session-based or JWT authentication system **so that** the Hub can verify user identity without Supabase Auth.

**Acceptance Criteria:**
- [ ] Login route (`/login`) accepts email/password and issues session cookie or JWT
- [ ] Middleware at `src/middleware.js` validates session on every protected route
- [ ] `useAuth()` hook continues to provide `user`, `isBroker`, `isAdmin` context
- [ ] Password hashing using `bcrypt` or `argon2`
- [ ] Session expiry and refresh mechanism
- [ ] Existing user profiles in `profiles` table linked to new auth system
- [ ] Magic link or password reset flow (email via Resend or similar)

**Technical Notes:**
- Current auth: `src/lib/auth-context.js` wraps Supabase Auth session
- Strategy recommendation: `iron-session` for encrypted cookie-based sessions (simpler than JWT for Next.js)
- Consider NextAuth.js as alternative if OAuth providers are needed later

**Dependencies:** Story 1.3  
**Estimated Effort:** L (large — core auth system)

---

## Epic 2: Secure API Routes & Endpoints ⏸️

**Priority:** P1 — Security  
**Status:** ⏸️ DEFERRED (blocked by Epic 1, Story 1.4)  
**Description:** All backend API routes currently execute without verifying the active user session. This allows unauthenticated external requests to consume third-party API quotas (Gemini, Google Drive) or manipulate data.

### Story 2.1 — Auth Middleware for All Protected Routes 🆕

**As a** broker, **I want** all internal API endpoints to require authentication **so that** external actors cannot access or modify Hub data.

**Acceptance Criteria:**
- [ ] Auth middleware helper `requireAuth(req)` returns user or throws 401
- [ ] RBAC helper `requireRole(req, 'broker')` checks user role or throws 403
- [ ] All `/api/*` routes (except `/api/public/*` and `/api/portal/*`) wrapped with `requireAuth`
- [ ] `/api/olympia/*` routes require active session (prevents external Gemini quota abuse)
- [ ] `/api/drive/*` routes require active session (prevents external Drive folder creation)
- [ ] `/api/properties/publish` requires broker role
- [ ] Rate limiting enhanced with per-user quotas (not just IP-based)

**Technical Notes:**
- Current rate limiting: `src/lib/rate-limit.js` — IP-based only
- Public routes (no auth): `/api/public/*` (analytics beacon, inquiries, properties feed, developments)
- Portal routes (UUID-based access): `/api/portal/*` (RINDER integration — no auth, UUID acts as token)

**Dependencies:** Epic 1 (Story 1.4 — Auth system must exist first)  
**Estimated Effort:** M (medium — applying middleware to existing routes)

---


## Phase 3: Future Enhancements

## Epic 13: Bi-Directional Property Syndication (Future PRD) 🆕

**Priority:** Future Release  
**Status:** ⏸️ DEFERRED  
**Description:** Expand the Hub from a pull-only system to a fully bi-directional syndication engine, pushing properties to RECONNECT and third-party portals like Encuentra24.

### Story 13.1 — RECONNECT API Integration (Write/Push) ⏸️

**Status:** 🔧 API CLIENT COMPLETE, ROUTES SCAFFOLDED, CURRENTLY DISABLED  
**Evidence:**
- `src/lib/reconnect-api.js` (14.8KB) — full client with per-office support.
- Logic added to API routes (`/publish`, `/sync`, `/sync-photos`, `/cancel`) but disabled behind `if (false) // FUTURE EPIC 13`.

**Acceptance Criteria:**
- [ ] Enable logic in API routes and test against RECONNECT live environment.
- [ ] Confirm image sync from Drive to RECONNECT using `createPropertyImage`.
- [ ] Confirm full error handling logic accurately flags in `property_syndication`.

### Story 13.2 — Portal Syndication ⏸️

**Status:** 🔧 UI SCAFFOLDED, WAITING ON PORTAL SPECS  
**Acceptance Criteria:**
- [ ] Finalize Encuentra24 XML integration.
- [ ] Finalize ListGlobally/Properstar XML feed format.
- [ ] Finalize Chozi.com integration.
