# ALTITUD HUB - Developer Guidelines

## Build & Run Commands
- `npm run dev`: Start local development server on port 3000
- `npm run build`: Create production build
- **Deployment:** Supabase hosting / Vercel deployment remains active; the migration to self-hosted **Coolify** (Docker-based) is deferred to the **very end** of this project.

## Directory Structure
- `src/app/`: Next.js App Router. The root page `page.js` is the OKR Dashboard.
- `src/app/acm/`: The ACM tools module.
- `src/app/contactos/`: CRM Contacts module (list, create, profile 360°).
- `src/app/negocio/`: Negocio Hub — deal tracking (LOI/SPA, due diligence).
- `src/app/propiedades/`: Properties Module — Hub-First listing management with broker approval.
  - `propiedades/nueva/`: Property creation form.
  - `propiedades/[id]/`: Property detail/edit page with syndication status.
  - `propiedades/desarrollos/`: Developments Module — block-based landing page builder.
- `src/app/d/[slug]/`: **Public route** (no auth) — Development landing pages with lead capture.
- `src/app/oficina/`: Office Panel — broker dashboard, HR, finance, property approvals, and advanced Performance Analytics (Plan vs Achieved, Portfolio Rotation).
- `src/app/prelisting/`: Pre-Listing presentation generator module.
- `src/app/plan/`: Business Plan wizard.
- `src/app/soporte/`: Support ticketing system.
- `src/app/api/properties/`: Property API routes (publish, sync, cancel via RECONNECT, external portal syndication feeds).
- `src/app/api/public/`: Public API routes (development feed, listing feed, analytics tracking).
- `src/app/api/olympia/`: Olympia AI endpoints (coach, extract, prospecting, proactive alerts).
- `src/components/`: Reusable React components.
  - `layout/Sidebar.jsx`: The primary navigation structure.
  - `propiedades/`: Property cards, status badges, syndication panels.
  - `developments/blocks/`: Block components for development page builder.
  - `oficina/`: Office panel tabs including property approval and business analytics charts.
- `src/lib/`: Context and utilities (e.g. `context.js` for translations via `t()`).
  - `reconnect-api.js`: RECONNECT REI API CCA v1.0 client (OAuth, CRUD, images).
  - Data Access Layer (DAL): Centralized queries transitioning away from direct Supabase logic.
- `supabase/migrations/`: Source of truth for database schema evolution.

## Architecture & Conventions
- **Hub-First Architecture**: The Hub is the single source of truth for all property data. Properties are created in the Hub, approved by the broker, and then pushed to RECONNECT and third-party portals (Encuentra24, ListGlobally, Chozi). Never upload directly to RECONNECT.
- **Server/Client Boundaries**: Extensive use of Next.js React Server Components for data fetching. Interactive elements and modals should be isolated into client leaf nodes to optimize rendering and hydration performance.
- **Deployment:** The migration to Coolify (replacing Vercel / Supabase hosting) is deferred to the **very end** of this project.
- **Database:** The migration from Supabase to self-hosted PostgreSQL is deferred to the **very end** of this project. Continue utilizing the active Supabase instance until the final project phase.
- **Broker Approval Workflow**: Properties and Developments follow a status flow: `draft → pending_approval → needs_changes → approved → published`. Nothing goes live without broker approval.
- **Drive-Based Photos**: Property images are managed via Google Drive folders. The folder is created automatically at the **Pre-Listing** phase (`acm_reports` table) as the **single base folder** to prevent duplicates, linked in the UI with an explainability modal. The photographer uploads to Drive; the Hub syncs and distributes URLs to RECONNECT and portals. Photographer scheduling, WhatsApp coordination templates, and timeline tracking (`photos_requested_at`) are natively embedded into the pipeline.
- **Dynamic Photographer Calendar**: The photographer's booking calendar link is never hardcoded. Brokers configure it in the Office Settings (`/oficina`), and the Hub loads it dynamically based on the listing's office (`altitud` or `cero`) to schedule sessions.
- **Olympia AI Proactive Features**: The `api/olympia` routes now handle automated proactive check-ins based on agent preferences and client lifecycle events (birthdays, anniversaries). Ensure Gemini integration supports tool calling for these workflows.
- **Translation / i18n**: Hardcoded text in UI components should be avoided. Use the `useApp().t('key')` dictionary function configured in `src/lib/context.js`.
- **Styling**: Stick to Tailwind CSS. Emphasize a premium feel with `nexus-header`, `glass-panel`, tracking, and uppercase fonts.
- **Icons**: Utilize inline SVG elements matching the existing UI pattern.
- **Public Routes**: Routes under `/d/` and `/api/public/` are public (no authentication). All other routes require login.
