@AGENTS.md

# ALTITUD HUB - Developer Guidelines

## Build & Run Commands
- `npm run dev`: Start local development server on port 3000
- `npm run build`: Create production build
- `npx vercel --prod`: Deploy directly to Vercel production

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
- `src/app/oficina/`: Office Panel — broker dashboard, HR, finance, property approvals.
- `src/app/prelisting/`: Pre-Listing presentation module.
- `src/app/plan/`: Business Plan wizard.
- `src/app/soporte/`: Support ticketing system.
- `src/app/api/properties/`: Property API routes (publish, sync, cancel via RECONNECT).
- `src/app/api/public/`: Public API routes (development feed, listing feed, analytics tracking).
- `src/app/api/olympia/`: Olympia AI endpoints (coach, extract, prospecting).
- `src/components/`: Reusable React components.
  - `layout/Sidebar.jsx`: The primary navigation structure.
  - `propiedades/`: Property cards, status badges, syndication panels.
  - `developments/blocks/`: Block components for development page builder.
  - `oficina/`: Office panel tabs including property approval.
- `src/lib/`: Context and utilities (e.g. `context.js` for translations via `t()`).
  - `reconnect-api.js`: RECONNECT REI API CCA v1.0 client (OAuth, CRUD, images).
- `_bmad-output/planning-artifacts/`: BMaD methodology documents (PRD, architecture, epics).
- `supabase/migrations/`: Source of truth for database schema evolution.

## Architecture & Conventions
- **Hub-First Architecture**: The Hub is the single source of truth for all property data. Properties are created in the Hub, approved by the broker, and then pushed to RECONNECT and third-party portals. Never upload directly to RECONNECT.
- **Broker Approval Workflow**: Properties and Developments follow a status flow: `draft → pending_approval → needs_changes → approved → published`. Nothing goes live without broker approval.
- **Drive-Based Photos**: Property images are managed via Google Drive folders. The photographer uploads to Drive; the Hub syncs and distributes URLs to RECONNECT and portals.
- **Translation / i18n**: Hardcoded text in UI components should be avoided. Use the `useApp().t('key')` dictionary function configured in `src/lib/context.js`.
- **Styling**: Stick to Tailwind CSS. Emphasize a premium feel with `nexus-header`, `glass-panel`, tracking, and uppercase fonts.
- **Icons**: Utilize inline SVG elements matching the existing UI pattern.
- **Public Routes**: Routes under `/d/` and `/api/public/` are public (no authentication). All other routes require login.
