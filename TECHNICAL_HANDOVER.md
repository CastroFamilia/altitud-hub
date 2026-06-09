# Technical Handover - ALTITUD HUB

## The REMAX Altitud Ecosystem — Three Projects, One Database

This Hub is **Project 3** of a three-project ecosystem. All three are developed in parallel by different developers and must synchronize through a shared PostgreSQL database.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    REMAX ALTITUD ECOSYSTEM                             │
│                                                                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │  1. WEBSITE       │  │  2. RINDER        │  │  3. HUB              │  │
│  │  (Nico)           │  │  (Santiago)        │  │  (Alejandra)         │  │
│  │                   │  │                    │  │                      │  │
│  │  Public-facing    │  │  "Tinder           │  │  Internal CRM,       │  │
│  │  property search, │  │  Inmobiliario"     │  │  property mgmt,      │  │
│  │  area guides,     │  │  Swipe interface   │  │  broker tools,       │  │
│  │  lead capture,    │  │  for buyers to     │  │  deal tracking,      │  │
│  │  6-language SEO   │  │  rate/vote on      │  │  OKRs, Olympia AI,   │  │
│  │                   │  │  matched listings  │  │  RECONNECT sync      │  │
│  │  remax-altitud.cr │  │  rinder.remax-     │  │  hub.remax-          │  │
│  │                   │  │  altitud.cr (TBD)  │  │  altitud.cr          │  │
│  └────────┬─────────┘  └────────┬───────────┘  └──────────┬───────────┘  │
│           │                     │                          │              │
│           └─────────────┬───────┴──────────────────────────┘              │
│                         │                                                 │
│                         ▼                                                 │
│           ┌──────────────────────────────┐                               │
│           │  SHARED PostgreSQL + PostGIS │                               │
│           │  (Coolify Docker)            │                               │
│           │                              │                               │
│           │  properties │ agents │ leads │                               │
│           │  buyer_searches │ pipeline   │                               │
│           │  buyer_search_votes          │                               │
│           │  developments │ notifications│                               │
│           └──────────────────────────────┘                               │
└─────────────────────────────────────────────────────────────────────────┘
```

| Project | Developer | Domain | Repo | Status |
|---------|-----------|--------|------|--------|
| **Website** | Nico | `remax-altitud.cr` | Separate repo | PRD + Architecture complete, development starting |
| **RINDER** | Santiago | TBD (subdomain or path) | Separate repo | In development |
| **Hub** | Alejandra | `hub.remax-altitud.cr` | This repo | Active development |

### How They Connect

| Flow | From | To | Mechanism |
|------|------|----|-----------|
| Property listings | Hub → Website | Shared DB | Hub writes `properties`, website reads them |
| Lead capture | Website → Hub | Shared DB | Website writes `leads`, Hub manages them |
| Buyer matching | Hub → RINDER | API | Hub writes `buyer_search_pipeline`, RINDER reads via `/api/portal/searches/[id]` |
| Buyer votes | RINDER → Hub | API | RINDER calls `/api/portal/votes` POST, Hub shows votes + notifications |
| Organic demand | Website → Hub | Shared DB | Website logs `page_events`/`search_demand`, Hub reads for agent intel |
| RECONNECT sync | Hub → RECONNECT | API | Hub pushes approved properties to REMAX global (future) |
| REMAX data feed | RECONNECT → Website | API | Website pulls daily from REMAX CCA API (cron sync) |

---

## Infrastructure & Deployment

### Hosting: Coolify (Self-Hosted)
- **Platform:** Coolify (replacing Vercel). Docker-based deployment.
- **Environment Variables:** Managed via the Coolify dashboard.
- **Domain:** The Hub will live at `hub.remax-altitud.cr`

### Database: Self-Hosted PostgreSQL (Replacing Supabase)
- **Migration Status:** The project is migrating away from Supabase to a self-hosted PostgreSQL instance managed through Coolify.
- **Current State:** Existing code still references `@supabase/supabase-js` and `@supabase/ssr` — these dependencies will be replaced with a direct PostgreSQL client (e.g., `pg`, `drizzle-orm`, or `prisma`).
- **Schema Migrations:** Continue to live in `/supabase/migrations/` as the source of truth for schema evolution (the SQL is standard PostgreSQL, not Supabase-specific).
- **Auth:** Authentication was previously handled by Supabase Auth. The new auth strategy will be implemented directly on the Coolify-hosted backend (strategy TBD — likely session-based or JWT middleware).
- **RLS → Application Layer:** Supabase Row Level Security policies will be replaced by application-layer RBAC middleware in Next.js API routes.

### RECONNECT API (REI API CCA v1.0)
REMAX Central America's property management system. The Hub reads from and writes to RECONNECT.

**Endpoints (confirmed by Roberto Ceron, REMAX CCA):**
| Environment | Base URL | OAuth Token |
|-------------|----------|-------------|
| **Production** | `https://remax-cca.com/apiCCA` | `https://remax-cca.com/apiCCA/oauth/token` |
| **Test** | `https://remax-cca.com/api` | `https://remax-cca.com/api/oauth/token` |

> [!NOTE]
> The test environment is currently enabled **only for ALTITUD** (not Altitud Cero).

**Per-Office Credentials:**
Each office has its own API key, secret, and integrator ID. These go in `.env.local` / Coolify dashboard:

```env
# ALTITUD (Pérez Zeledón)
RECONNECT_ALTITUD_API_KEY=E1416C9F-52EC-4BAB-809A-078ED0E63F5F
RECONNECT_ALTITUD_SECRET_KEY=0FA6EF7C-457B-4C20-BF81-1809A2ACC350
RECONNECT_ALTITUD_INTEGRATOR_ID=R1040034

# ALTITUD CERO (Dominical)
RECONNECT_CERO_API_KEY=16380EB9-539A-491A-8ADA-0E144068DEFF
RECONNECT_CERO_SECRET_KEY=3CB32C4A-CF0B-414F-8451-47E4872B226B
RECONNECT_CERO_INTEGRATOR_ID=R1040037

# Set to 'true' to use test environment
RECONNECT_USE_TEST_ENV=true
```

**API Operations Available:**
| Operation | Method | Endpoint | Status |
|-----------|--------|----------|--------|
| Get OAuth Token | POST | `/oauth/token` | ✅ Implemented |
| Read Office Properties | GET | `api.remax-cca.com/api/PropertiesPerOffice/{GUID}` | ✅ Active |
| Create Property | POST | `/api/Listing/CreateProperty` | ✅ Code ready, not activated |
| Update Property | PUT | `/api/Listing/FullUpdateProperty` | ✅ Code ready, not activated |
| Cancel Property | POST | `/api/Listing/CancelProperty` | ✅ Code ready, not activated |
| Upload Image | POST | `/api/Listing/CreatePropertyImage` | ✅ Code ready, not activated |

**Implementation:** `src/lib/reconnect-api.js` — All functions implemented with per-office credential support.

### Future: Hub → RECONNECT Property Export Pipeline

> [!IMPORTANT]
> **Current workflow:** Agents upload properties directly to RECONNECT (outside the Hub). The Hub only *reads* from RECONNECT.
>
> **Future workflow:** Agents will create properties **only in the Hub**. The Hub pushes to RECONNECT via the API, eliminating double data entry and making the Hub the true single source of truth.

**Future flow:**
```
Agent creates in Hub → draft
       ↓
Broker reviews → approved
       ↓
Hub calls CreateProperty → RECONNECT publishes listing
Hub calls CreatePropertyImage → Photos synced from Drive
       ↓
Agent edits in Hub → Hub calls FullUpdateProperty
       ↓
Broker cancels → Hub calls CancelProperty
       ↓
Website daily sync pulls the RECONNECT-published version back
```

**Activation checklist:**
- [ ] Add RECONNECT credentials to `.env.local` and Coolify env vars
- [ ] Test write operations against test environment (`RECONNECT_USE_TEST_ENV=true`)
- [ ] Wire `/api/properties/publish` route to call `createProperty(data, officeKey)`
- [ ] Wire `/api/properties/sync` route to call `updateProperty(key, data, officeKey)`
- [ ] Wire `/api/properties/cancel` route to call `cancelProperty(key, officeKey)`
- [ ] Add image sync after property creation (Drive → RECONNECT)
- [ ] Switch to production (`RECONNECT_USE_TEST_ENV` removed or set to `false`)

---

## Recent Features & Domain Architectures (May 2026)

The project has recently seen massive capability expansions. Key architectural notes for incoming developers:

1. **Office Analytics & KPI Tracking (`/oficina`)**
   - **Data Access Layer (DAL):** The analytics modules (Commission, Leads, Events, Plan vs Achieved) have been refactored to use a centralized Data Access Layer, decoupling the UI from direct Supabase SDK calls to prepare for the raw PostgreSQL migration.
   - **Portfolio Rotation KPI:** Calculates the average Days on Market (DOM) for sold properties to track listing speed. Server-side calculated and displayed via SVG sparklines and trend indicators.
   - **Plan vs. Achieved:** Tracks `new_contacts_goal` and `showings_goal` against actual performance, integrating business planning directly into operational metrics.

2. **Pre-Listing Generator (`/prelisting`)**
   - A dynamic PDF presentation generator built directly into the Hub. Agents can compile property attributes, valuation data, and custom marketing pages into a polished PDF folder to win listings. 
   - State is managed via a step-by-step wizard capturing property details, seller info, pricing strategies, and final template selection.

3. **Photographer Workflow & Google Drive Integration**
   - **Unified Base Folder (Pre-Listing & ACM):** To ensure a single source of truth and prevent folder duplication, the Google Drive base folder can be automatically created or manually associated at either the **Pre-Listing** or **ACM (CMA)** phase (both stored in the `acm_reports` table). It is linked dynamically in the table views, wizards, and workspaces.
   - **Manual Folder Linking (Internet Resilience):** Agents working off-site without internet/signal can link an existing Google Drive folder manually inside the Pre-Listing wizard, the ACM workspace, or via quick-actions directly from the dashboard tables (using a chain-link icon). The system extracts the folder ID via regex and bypasses automatic folder generation to prevent duplicates.
   - **Direct ACM Module Integration:** If an agent skips Pre-Listing and starts directly in the ACM module, they can click "Auto-Create Base Folder" in the "General" tab of the ACM workspace or click the quick-create button on the ACM dashboard, which triggers the same Google Drive API creation and displays the bilingual explainability modal.
   - **Dynamic Photographer Calendar:** Rather than hardcoding calendar booking links, brokers configure the photographer's schedule URL per-office (`altitud` / `cero`) in the office panel settings (`/oficina`). This is persisted in `office_settings.photographer_calendar_url`.
   - **WhatsApp Coordination & Tracking:** The property detail view features a **WhatsApp Dispatcher** button next to Google Calendar booking. It generates a prefilled dynamic redirect to `wa.me/` carrying the property name, Drive folder link, and dynamic calendar URL. Coordination actions automatically record `photos_requested_at` in `listing_milestones`, keeping listing velocity KPIs up to date.

4. **Olympia AI Mentor & Proactive Alerts (`/api/olympia`)**
   - **Proactive Follow-Ups:** Olympia runs automated checks against client lifecycle events (birthdays, move-in anniversaries) stored in the database.
   - **Tool Calling:** The Gemini integration uses function calling to allow agents to log interactions, schedule follow-ups, and update their preferences directly via natural language chat with Olympia.

5. **Portal Syndication Feeds (`/api/properties/feed/...`)**
   - Standardized XML/JSON property feeds generated dynamically for Encuentra24, ListGlobally/Properstar, and Chozi.
   - Syndication status is tracked per-property, ensuring brokers have full visibility over where a listing is currently published.

6. **Server/Client Boundary Optimizations**
   - The architecture has been migrated to push data fetching heavily into React Server Components. Interactive client features (like modals or specific state toggles) are isolated as "client leaf nodes" to drastically improve performance and initial load times.

---

## Website ↔ Hub Relationship

### Overview
The REMAX Altitud **public website** (remax-altitud.cr) and the **internal Hub** (hub.remax-altitud.cr) are **separate projects** that share a PostgreSQL database and deploy to the same Coolify instance.

| Aspect | Website | Hub |
|--------|---------|-----|
| **URL** | `www.remax-altitud.cr` | `hub.remax-altitud.cr` |
| **Purpose** | Public-facing: property search, area guides, lead capture, multilingual UX | Internal CRM: property management, broker tools, deal tracking, OKRs |
| **Tech Stack** | Next.js 15 + TypeScript + Tailwind v4 + shadcn/ui + Drizzle ORM | Next.js 16 + Tailwind v4 + PostgreSQL (migrating from Supabase) |
| **Database** | PostgreSQL + PostGIS (Drizzle ORM, read-heavy) | PostgreSQL (currently Supabase, migrating to self-hosted) |
| **Maps** | Mapbox GL JS (3D terrain, clustering, PostGIS spatial queries) | N/A |
| **i18n** | next-intl (EN/ES MVP, 6 languages Phase 2) | Custom `t()` dictionary (EN/ES) |
| **Hosting** | Coolify (Docker standalone) | Coolify (Docker) |
| **Users** | Buyers, sellers, investors, public visitors | Agents, brokers, admins |
| **Auth** | None for public; custom admin auth | Deferred (migrating from Supabase Auth) |

### Shared PostgreSQL — Data Ownership

The Hub and the Website will share the same PostgreSQL instance, but with clear ownership boundaries:

| Data | Owner (Write) | Consumer (Read) |
|------|---------------|-----------------|
| `properties` (listings) | **Hub** (agent creates → broker approves → published) | Website (displays published listings) |
| `agents` | **Hub** (agent profiles managed internally) | Website (agent profiles, WhatsApp CTAs) |
| `developments` | **Hub** (block-based page builder) | Website (renders `/d/[slug]` landing pages) |
| `leads` | **Website** (forms, WhatsApp clicks) | Hub (lead management, agent assignment) |
| `buyer_search_pipeline` | **Hub** (agent matches buyer → property) | Website (future: Tinder Inmobiliario) |
| `areas`, `communities` | **Website** (geo-fenced area guides) | Hub (area context for properties) |
| `sync_logs` | **Website** (daily REMAX API sync pipeline) | Hub (sync monitoring dashboard) |
| `page_events` | **Website** (analytics tracking) | Hub (development analytics dashboard) |

### Data Flow Architecture

```
                    ┌──────────────────┐
                    │  REMAX CCA API  │
                    │  (Source Data)   │
                    └────────┬─────────┘
                             │
                    Daily Sync (6 AM CST)
                             │
                             ▼
┌─────────────────────────────────────────────────────┐
│               SHARED PostgreSQL + PostGIS           │
│                  (Coolify Docker)                     │
│                                                       │
│  properties │ agents │ leads │ developments │ areas  │
│  communities │ sync_logs │ page_events │ pipeline    │
└──────────┬────────────────────────┬──────────────────┘
           │                        │
     Read + Write              Read + Write
     (different tables)        (different tables)
           │                        │
           ▼                        ▼
┌──────────────────┐    ┌──────────────────────────┐
│    WEBSITE       │    │         HUB              │
│ remax-altitud.cr │    │  hub.remax-altitud.cr    │
│                  │    │                          │
│ • Property search│    │ • Property CRUD          │
│ • Map + PostGIS  │    │ • Broker approval flow   │
│ • Lead capture   │    │ • Lead management        │
│ • Area guides    │    │ • RECONNECT API sync     │
│ • Agent profiles │    │ • Portal syndication     │
│ • 6 languages    │    │ • OKRs, analytics        │
│ • REMAX API sync│    │ • Olympia AI coach       │
│   pipeline       │    │ • Tinder Inmobiliario    │
└──────────────────┘    └──────────────────────────┘
```

### Two Sync Pipelines — No Conflict

There are **two distinct data ingestion flows** that both write to the shared PostgreSQL. They do NOT conflict:

1. **Website Daily Sync** (REMAX CCA API → PostgreSQL)
   - Pulls all properties + agents from the REMAX global system via API
   - Validates, diffs, translates, optimizes images, geo-tags
   - Writes to `properties`, `agents`, `sync_logs`
   - Triggers ISR revalidation on the website
   - Runs via system cron: `0 6 * * *` (6 AM CST daily)

2. **Hub Property CRUD** (Agent creates → Broker approves → RECONNECT)
   - Agents create/edit properties inside the Hub
   - Broker approves → Hub pushes to RECONNECT via REI API CCA v1.0
   - Hub writes to `properties` (with `source = 'hub'` or equivalent field)
   - Next daily sync picks up the RECONNECT-published version

**Conflict avoidance:** Properties created in the Hub get pushed to RECONNECT first. The website's daily sync then pulls them back from RECONNECT as the canonical source. The `api_hash` diff mechanism prevents unnecessary overwrites.

### Deployment Synchronization
Both projects deploy to Coolify independently:
1. **Schema migrations** — Coordinated across all three projects. Any project can add migrations, but all must be compatible.
2. **API contract** — The Hub exposes public API endpoints that the website and RINDER consume:
   - `/api/public/properties/feed` — Published property listings (Website)
   - `/api/public/developments` — Active development landing pages (Website)
   - `/api/portal/searches/[id]` — Buyer search + matched properties (RINDER)
   - `/api/portal/votes` — Submit buyer votes/decisions (RINDER)
3. **Deploy order** — For schema changes: migrate DB first → deploy all apps. For non-schema changes: deploy independently.

---

## RINDER ↔ Hub Integration (Santiago's Project)

### What is RINDER?
RINDER ("Real Estate Tinder" / "Tinder Inmobiliario") is Santiago's app that lets buyers **swipe/vote** on properties that their agent matched for them in the Hub. It's a client-facing app where buyers and their partners can independently evaluate properties.

### How the Flow Works

```
AGENT (in Hub)                    BUYER (in RINDER)                  AGENT (in Hub)
─────────────────                 ──────────────────                  ─────────────────
1. Creates buyer search           3. Opens RINDER link               6. Sees notification:
   (client_name, criteria)           sent by agent                      "Maria voted!"
        ↓                                ↓
2. Matches properties             4. Swipes through                  7. Reviews votes
   → adds to pipeline                matched properties                 in Búsqueda panel
   (status: 'enviada')                   ↓
        ↓                         5. Votes: ⭐ rating,
   Agent sends RINDER                decision (visita/
   link to buyer                     negociar/descartar),
                                     notes
```

### Hub API Endpoints That RINDER Consumes

| Endpoint | Method | What RINDER Gets/Sends |
|----------|--------|------------------------|
| `GET /api/portal/searches/[id]` | GET | Returns the full buyer search context: search criteria, agent info, matched properties (with details from `properties` + `acm_reports` + external data), and all existing votes |
| `POST /api/portal/votes` | POST | Submits a vote: `{ pipeline_id, voter_name, rating (1-5), decision, notes }`. Automatically creates a notification for the agent in the Hub |

### Database Tables RINDER Depends On

| Table | RINDER Access | Purpose |
|-------|--------------|---------|
| `buyer_searches` | Read (via API) | Search criteria, agent info, evaluation parameters |
| `buyer_search_pipeline` | Read (via API) | Matched properties with status (enviada/interesado/rechazada) |
| `buyer_search_votes` | Read + Write (via API) | Votes from buyers: rating, decision, notes |
| `properties` | Read (via API) | Property details for matched listings |
| `acm_reports` | Read (via API) | Pre-listing details for ACM matches |
| `notifications` | Write (via API) | Agent notifications when a vote is submitted |
| `profiles` | Read (via API) | Agent profile info (name, photo, phone) |

### Key Design Decisions for Santiago

1. **RINDER does NOT write directly to PostgreSQL** — All interactions go through the Hub's `/api/portal/` endpoints
2. **No auth required** — RINDER is accessed via a unique link per buyer search (the search UUID acts as the access token)
3. **Multi-voter support** — Multiple people (buyer + partner) can vote independently on the same properties using `voter_name`
4. **Evaluation parameters are configurable** — The Hub stores custom evaluation criteria in `buyer_searches.evaluation_parameters` (JSONB), defaulting to `["Ubicación", "Precio", "Metros Cuadrados", "Estado de Conservación"]`
5. **External properties supported** — Pipeline items with `match_type = 'external'` store their details in `buyer_search_pipeline.external_data` (JSONB), allowing agents to include properties from outside the Hub

### Future Integration Points

1. **Organic Search Demand** (Website → Hub)
   - Website tracks what users search for (filters, zones, price ranges)
   - Hub displays this demand data so agents can see what the market wants
   - Implementation: `page_events` table or dedicated `search_demand` table

2. **RINDER Auto-Status Updates** (RINDER → Hub, currently commented out)
   - When a buyer votes "descartar" → auto-update pipeline status to `rechazada`
   - When a buyer votes "visita" or rates ≥ 4 → auto-update to `interesado`
   - Code exists in `/api/portal/votes/route.js` but is commented out — activate when ready

3. **Development Landing Pages**
   - Hub's block-based page builder creates development data in `developments.sections` (JSONB)
   - Website renders these at `/d/[slug]` with premium design + lead capture
   - OR: Hub serves its own `/d/[slug]` route (current implementation)
   - Decision needed: which app serves development pages publicly?


---

## Website Technical Reference

> [!NOTE]
> The full website docs are in `/docs/website/`. These are for **reference only** — the website is a separate codebase. Key files:
> - [prd.md](file:///Users/alejandracastro/Desktop/ALTITUD%20HUB/docs/website/prd.md) — 69 FRs + 30 NFRs, 8 user journeys
> - [architecture.md](file:///Users/alejandracastro/Desktop/ALTITUD%20HUB/docs/website/architecture.md) — Full system design, DB schema, sync pipeline
> - [prd-validation-report.md](file:///Users/alejandracastro/Desktop/ALTITUD%20HUB/docs/website/prd-validation-report.md) — Validation: 5/5 quality rating
> - [ux-design-specification.md](file:///Users/alejandracastro/Desktop/ALTITUD%20HUB/docs/website/ux-design-specification.md) — UX spec (160KB)

### Website Key Tech Decisions (for Hub team awareness)
- **ORM:** Drizzle ORM (not Supabase client) — type-safe SQL with PostGIS support
- **Sync:** Daily cron at 6 AM CST pulls from REMAX CCA API, translates via DeepL, optimizes images
- **Maps:** Mapbox GL JS with PostGIS spatial queries (bounding box, radius, geo-fence matching)
- **Images:** Self-hosted optimization via `sharp` in Docker (WebP, responsive sizes, LQIP blur)
- **SEO:** SSG + ISR, JSON-LD structured data, hreflang, WordPress 301 redirects
- **No Supabase:** Website was architected from scratch with self-hosted PostgreSQL + Drizzle

---

## Módulo de Búsquedas (Buyer Searches)
El módulo de "Búsqueda" implementado en `src/app/busqueda` permite el cruce de requerimientos de clientes (compradores) con las propiedades (`properties`) y pre-listings (`acm_reports`) de la oficina.

### [PREGUNTA PARA NICO] Integración de Búsquedas Orgánicas de la Web
**@Nico:** ¿Es viable integrar en este panel de búsquedas del HUB la información de lo que los usuarios están buscando orgánicamente en nuestra página web pública? 

**RESPUESTA PARCIAL:** Según la arquitectura del website, los datos de búsqueda se pueden capturar de dos formas:
1. **`page_events` table:** El website trackea `page_view`, `listing_click`, `whatsapp_click`, `faq_expand`, `lead_submit`. Se puede agregar un evento de tipo `search_filter` que capture los filtros usados.
2. **Server Actions:** La función `searchProperties()` en `src/lib/db/queries/properties.ts` del website recibe los filtros. Se puede loggear cada búsqueda a una tabla `search_demand`.
3. **La data fluye directamente:** Ambos proyectos comparten PostgreSQL, así que el Hub puede leer `page_events` o `search_demand` directamente sin necesidad de APIs intermedias.

### Pipeline de Propiedades Enviadas
Actualmente, el sistema registra el estado de una coincidencia ('enviada', 'interesado', 'rechazada') en la tabla `buyer_search_pipeline`. 

**Integración con RINDER (Santiago):**
Este pipeline alimenta y se retroalimenta de **RINDER** (el proyecto de Santiago):
- Las propiedades "enviadas" desde el HUB le llegarán al cliente a través de RINDER.
- El cliente podrá votar (⭐ rating, decisión, notas) en RINDER.
- RINDER escribe los votos via `POST /api/portal/votes`, lo que crea una notificación automática para el agente en el Hub.
- Ver la sección **"RINDER ↔ Hub Integration"** arriba para el detalle completo de la integración.

## Notificaciones
El sistema de notificaciones está construido sobre la tabla `notifications` y se visualiza en `TopNav.jsx`. 
- **RINDER Integration:** Cuando un comprador vota en RINDER, se crea automáticamente una notificación para el agente.
- **Mejora Futura:** Considerar implementar WebSockets (o un servicio de realtime sobre PostgreSQL, como `pg_notify` + SSE) para que las notificaciones de nuevos votos y "matches" lleguen sin necesidad de recargar la página.

