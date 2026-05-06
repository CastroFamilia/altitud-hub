# Altitud Hub - Epics & Fixes

Based on the BMaD Adversarial Code Audit comparing the current codebase to the `system-architecture.md` baseline, the following Epics have been created to address technical debt and security vulnerabilities.

## Epic 1: Secure API Routes & Endpoints [DEFERRED]
**Description:** Multiple backend API routes currently execute without verifying the active user session. This allows unauthenticated external requests to consume third-party API quotas (like Gemini and Google Drive) or manipulate data.

> [!WARNING]
> **Status: DEFERRED.** Due to the planned migration away from Supabase to a new server, implementing authentication and security checks on these endpoints is deferred until the new backend is in place.

- **Story 1.1 - Secure Olympia AI Endpoints:** 
  - *Context:* `/api/olympia/coach` and `/api/olympia/extract` accept POST requests without checking for an active session.
  - *Action:* (Deferred) Wrap these handlers with the new backend's authentication middleware.
- **Story 1.2 - Secure Google Drive Endpoints:** 
  - *Context:* `/api/drive/create-folder` allows anyone to create folders in the company's Google Drive.
  - *Action:* (Deferred) Implement session verification before initializing the `google.drive()` client using the new backend.

## Epic 2: Complete Internationalization (i18n)
**Description:** Some modules might still rely on hardcoded Spanish text instead of the central `useApp().t()` translation dictionary.

- **Story 2.1 - Audit & Refactor Legacy Components:** 
  - *Context:* Review the Pre-Listing and CRM Contacts modules to ensure all visible strings are routed through `t()`.
  - *Action:* Replace static strings with dictionary keys and ensure English fallbacks exist in `src/lib/context.js`.

## Epic 3: Next.js 16 Client/Server Boundary Enforcement
**Description:** Ensure that React Server Components (RSC) are properly utilized for data fetching and that `"use client"` is only used at the leaf nodes (where interactivity is strictly required).

- **Story 3.1 - Refactor Heavy Client Pages:** 
  - *Context:* Review pages like `/contactos/page.jsx` or `/negocio/page.jsx`.
  - *Action:* If a page fetches data via `useEffect` but doesn't need to, move the data fetching to the Server Component `page.jsx` and pass the data as props to a Client Component for rendering.

> [!NOTE]
> Epic 1 is deferred due to backend migration. Epics 4 and 5 are the current priority — building the Hub-First Properties Module.

## Epic 4: Hub-First Properties Module
**Description:** Implement a complete property management system where the Hub is the single source of truth. Properties are created by agents, approved by the broker, and published to RECONNECT and third-party portals.

- **Story 4.1 - Expand Properties Schema:**
  - *Context:* The current `properties` table is too basic (only name, type, size, finca_number). Needs to match the full RECONNECT data model.
  - *Action:* Create migration adding all RECONNECT-compatible fields, approval workflow columns, Drive photo fields, and syndication tracking tables.
- **Story 4.2 - Agent Property CRUD:**
  - *Context:* Agents currently have no way to create or manage listings in the Hub.
  - *Action:* Build `/propiedades` portfolio page, `/propiedades/nueva` creation form, and `/propiedades/[id]` detail/edit page.
- **Story 4.3 - Broker Approval Dashboard:**
  - *Context:* Properties must not go live without broker verification of owner info, pricing, photos, and descriptions.
  - *Action:* Add "Propiedades" tab to Office Panel with approval/rejection workflow, checklist, and broker notes.
- **Story 4.4 - RECONNECT API Integration:**
  - *Context:* Approved properties need to be published to the RE/MAX global website via REI API CCA v1.0.
  - *Action:* Build `reconnect-api.js` client and `/api/properties/publish`, `/api/properties/sync`, `/api/properties/cancel` routes.
  - *Dependency:* Awaiting API credentials from `support@remax-cca.com`.
- **Story 4.5 - Drive-Based Photo Workflow:**
  - *Context:* The office photographer uploads images to Google Drive. The Hub needs to read from Drive and syndicate URLs.
  - *Action:* Auto-create Drive folder per property, sync images from Drive, send URLs to RECONNECT and portals.
- **Story 4.6 - Portal Syndication:**
  - *Context:* Properties should be distributed to Encuentra24, Chozi.com, ListGlobally, and other portals.
  - *Action:* Build public listing feed endpoint, webhook receiver for portal inquiries, syndication status panel, and inquiry inbox.
  - *Dependency:* Awaiting feed specifications from each portal.

## Epic 5: Developments Module & Public Landing Pages
**Description:** Enable agents to create marketing landing pages for real estate developments (communities, condos, plazas) using a block-based page builder, with public URLs, lead capture, and analytics.

- **Story 5.1 - Developments Database & CRUD:**
  - *Context:* No concept of "developments" exists yet. A development groups multiple properties under a parent project.
  - *Action:* Create `developments` table with JSONB `sections` for block data, `development_id` FK on `properties`, and page analytics tables.
- **Story 5.2 - Block-Based Page Editor:**
  - *Context:* Agents need to build custom landing pages without coding. Each development may have different sections (some have amenities, some don't; some have video, some don't).
  - *Action:* Build editor UI with 13 block types (hero, description, video, gallery, amenities, inventory, map, FAQ, agent card, lead form, stats, social media, custom text). Blocks are reorderable and removable.
- **Story 5.3 - Public Landing Pages:**
  - *Context:* Each development needs a shareable public URL optimized for lead conversion.
  - *Action:* Build `/d/[slug]` route that renders sections from JSONB, with SEO, Open Graph tags, responsive design, and lead capture forms.
- **Story 5.4 - Analytics & Reporting:**
  - *Context:* Agents need to demonstrate marketing performance to developers.
  - *Action:* Track page views, listing clicks, WhatsApp clicks, FAQ interactions, and traffic sources. Dashboard shows full funnel (views → inquiries → site visits → reservations → closings). Auto-generate PDF reports.
- **Story 5.5 - Public API for Website:**
  - *Context:* The future RE/MAX website needs to display a "Desarrollos" section.
  - *Action:* Build `/api/public/developments` endpoint returning all active developments with sections, properties, and images.

