# Altitud Hub - System Architecture

## 1. Technology Stack
- **Framework:** Next.js 16.2.x (App Router paradigm).
- **Database:** Self-hosted **PostgreSQL** (replacing Supabase). Direct connection via connection string. Authentication and security implementation are deferred until the new backend is fully established.
- **Styling:** Tailwind CSS v4, ensuring utility-first responsive design.
- **Deployment:** Self-hosted on **Coolify** (replacing Vercel). Docker-based deployment with environment variable management via Coolify dashboard.

## 2. Directory Structure & Conventions
- `/src/app`: Exclusively contains Next.js route handlers (`page.js`, `layout.js`, `route.js`). Business logic should be extracted to components or utilities to prevent server-component bloat.
- `/src/components`: UI components. Components requiring interactive state (`useState`, `useEffect`) must explicitly declare `"use client"` at the top. Pure visual components should remain Server Components for performance.
- `/src/lib`: Shared utilities, specifically containing `context.js` for the global application state and the `t()` translation dictionary.
- `/supabase/migrations`: Source of truth for database schema evolution.
- `/src/app/d/[slug]`: **Public routes** (no auth required). Development landing pages served to the public.
- `/src/app/api/public/`: Public API endpoints (listing feeds, development data, analytics tracking). No auth.

## 3. Data Fetching & State Management
- **Server Components:** Prioritize fetching data directly on the server within `page.js` async functions to minimize client payload.
- **Client Components:** Use direct PostgreSQL queries (via a lightweight ORM or query builder) for data fetching. Row Level Security will be implemented at the application layer rather than database-level RLS (since Supabase is no longer used).
- **Global Context:** Rely on React Context (`src/lib/context.js` and `auth-context.js`) sparingly, primarily for Auth state, Theme (Dark/Light), and i18n Dictionary. Prop drilling is preferred for shallow component trees.

## 4. Internationalization (i18n) Architecture
- **Strict Adherence:** Hardcoded display strings (e.g., `<div>Guardar</div>`) are treated as technical debt.
- **Implementation:** All text must be retrieved via `const { t } = useApp()` as `t('save_button')`. 
- **Graceful Fallbacks:** If a translation key is missing, it should fallback to the raw key string to easily identify gaps.

## 5. Security Guardrails (DEFERRED)
> [!WARNING]
> With the migration to **self-hosted PostgreSQL on Coolify**, authentication and endpoint protection are deliberately deferred until the database layer is fully stabilized.
> 
> - **Development Pattern:** Components should be built "auth-agnostic" where possible, using a mock user context if necessary, so that the future auth implementation requires minimal UI refactoring.
> - **API Endpoints:** API routes will remain unprotected during this phase to facilitate rapid development until auth middleware is implemented on Coolify.
> - **Supabase Removal:** The `@supabase/supabase-js` and `@supabase/ssr` dependencies will be replaced with a direct PostgreSQL client (e.g., `pg`, `drizzle-orm`, or `prisma`) as part of the migration.

## 6. Hub-First Property Architecture
- **Single Source of Truth:** All property listings are created and managed in the Hub's `properties` table. External systems (RECONNECT, portals, website) consume data from the Hub.
- **Broker Approval Flow:** Properties follow: `draft → pending_approval → needs_changes → approved → published`. Broker verifies owner info, pricing, photos, and descriptions.
- **RECONNECT Integration:** Uses REI API CCA v1.0 (OAuth 2.0, JSON). Approved properties are pushed via `CreateProperty`, updated via `FullUpdateProperty`, and removed via `CancelProperty`. Images uploaded via `CreatePropertyImage`.
- **Drive-Based Photos:** Each property gets a Google Drive folder. Photographer uploads images there. Hub reads and syndicates URLs.
- **Portal Syndication:** Published properties are distributed to third-party portals (Encuentra24, Chozi, ListGlobally) via JSON/XML feeds. Inquiries return via webhooks to `property_inquiries` table.
- **Developments:** A development groups multiple properties under a parent project. Each gets a public landing page at `/d/[slug]` built from a JSONB `sections` array (block-based page builder). Blocks include: hero, description, video, gallery, amenities, inventory, FAQ, map, lead form, agent card, social media, custom text.
- **Analytics:** Public pages track events (`page_view`, `listing_click`, `whatsapp_click`, `faq_expand`, `lead_submit`, etc.) in a `page_events` table. Agents see dashboards with full funnel: views → inquiries → site visits → reservations → closings.

## 7. External API Integrations
- **RECONNECT (REI API CCA v1.0):**
  - **Production:** `https://remax-cca.com/apiCCA` (confirmed by Roberto Ceron, REMAX CCA)
  - **Test:** `https://remax-cca.com/api` (currently enabled only for ALTITUD)
  - OAuth 2.0 bearer tokens (48h expiry). JSON format.
  - **Per-office credentials** (each office has its own API key, secret, and integrator ID):
    - ALTITUD: `RECONNECT_ALTITUD_API_KEY`, `RECONNECT_ALTITUD_SECRET_KEY`, `RECONNECT_ALTITUD_INTEGRATOR_ID`
    - ALTITUD CERO: `RECONNECT_CERO_API_KEY`, `RECONNECT_CERO_SECRET_KEY`, `RECONNECT_CERO_INTEGRATOR_ID`
  - Set `RECONNECT_USE_TEST_ENV=true` to use test environment.
- **Google Drive API:** Service account for folder creation and image management. Used for property photos and document storage.
- **Google Gemini AI:** Powers Olympia coach, contract extraction, and prospecting suggestions.
- **Portal Feeds:** Public JSON/XML endpoint at `/api/public/properties/feed` for third-party portals.

## 7.1 Future: Hub → RECONNECT Property Export Pipeline
> [!IMPORTANT]
> Currently, agents upload properties directly to RECONNECT. The future goal is for agents to create properties **only in the Hub**, and the Hub pushes to RECONNECT via the API. This eliminates double data entry and ensures the Hub is the single source of truth.

**Future flow:**
1. Agent creates property in Hub → status: `draft`
2. Broker reviews and approves → status: `approved`
3. Hub calls `CreateProperty` → RECONNECT publishes the listing
4. Hub calls `CreatePropertyImage` → Photos synced from Drive to RECONNECT
5. Agent edits in Hub → Hub calls `FullUpdateProperty` to sync changes
6. Broker cancels listing → Hub calls `CancelProperty`
7. Website daily sync pulls the RECONNECT-published version back

**Code status:** `src/lib/reconnect-api.js` has all write functions implemented and ready. Credentials have been received. Activation requires:
- Adding credentials to `.env.local` / Coolify env vars
- Testing against the test environment (`RECONNECT_USE_TEST_ENV=true`)
- Wiring the publish/sync/cancel API routes to call the per-office functions

## 8. Aesthetics & UI Identity
- **Dynamic Interactions:** Components must utilize Tailwind `transition`, `hover`, and `focus` states to feel responsive and premium.
- **Glassmorphism:** Use `backdrop-blur` and translucent backgrounds for modals and overlays.
- **Theme Support:** Tailwind `dark:` variants must be comprehensively applied to ensure a seamless Dark Mode experience.
- **Public Pages:** Development landing pages (`/d/[slug]`) must be visually stunning — optimized for lead conversion with premium typography, responsive design, and fast load times.
