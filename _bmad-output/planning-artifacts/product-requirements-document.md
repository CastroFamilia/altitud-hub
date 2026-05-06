# Altitud Hub - Product Requirements Document (PRD)

## 1. Product Overview
**Altitud Hub** is a premium, high-performance real estate CRM and business intelligence platform designed for the RE/MAX Altitud (Pérez Zeledón) and Altitud Cero (Dominical) offices. It serves as the **single source of truth** for all property listings, deal management, and agent productivity. The Hub empowers brokers to manage teams, approve property listings before publication, track OKRs, and manage office finances, while providing agents with property management, portal syndication, development marketing pages, AI-assisted coaching (Olympia), and premium pre-listing presentations.

## 2. Target Audience
- **Brokers/Admins:** Office leadership requiring oversight, property approval, analytics, HR management, and financial control.
- **Agents:** Real estate professionals needing property management, CRM tools, deal tracking, lead generation, development marketing, OKR planning, and high-end marketing resources.
- **Developers/Owners:** External stakeholders who benefit from development landing pages and performance reports.
- **Olympia AI:** The integrated AI coach that requires system context to assist agents effectively.

## 3. Core Modules & Features

### 3.1. CRM Contacts & Prospecting (`/contactos`)
- **Profile Enriched Tracking:** Multi-select types (buyer, seller, developer, investor) and language preferences.
- **Kanban to Relationship Dashboard:** Centralized relational data with quick communication buttons (WhatsApp, Email).
- **Import/Export:** Mass migration support via robust CSV import tools.

### 3.2. Negocio Hub (`/negocio`)
- **Deal Tracking:** Comprehensive transaction tracking with bilingual interfaces (Spanish/English).
- **Stakeholder Linking:** Associates deals with specific buyer agents, seller agents, and notaries.
- **Drive Integration:** Automated, robust Google Drive folder creation for document organization with name-fallback mechanisms.

### 3.3. Office Analytics Dashboard (`/oficina`)
- **Business Intelligence:** Tracks agent tenure, splits, "poverty line", transaction velocity, listing volume, and commission generation.
- **HR & Team Workflows:** Agent approvals, attendance tracking, and performance feedback via Olympia.
- **"Reservometro":** Visualization for upcoming closings and sales targets.

### 3.4. Pre-Listing Presentation (`/prelisting`)
- **Premium Marketing:** Luxury-grade, dynamic presentations tailored to High Net Worth (HNW) listings.
- **Brand Dualism:** Adaptive UI for either RE/MAX Altitud or Altitud Cero based on listing region.
- **Cinematic Experience:** High-end typography, localized professional imagery, and interactive digital signing areas.

### 3.5. Support & Error Ticketing (`/soporte`)
- **Agent Submissions:** Seamless UI for agents to report bugs or request features with screenshot uploads.
- **Broker Resolution Board:** Admin dashboard to track, categorize, and resolve issues systematically.

### 3.6. OKR & Agent Ramp-up Planning (`/plan`)
- **Progressive Activity Goals:** 12-month activity distribution curve focusing on early capture (listings) and later closings.
- **Customizable Metrics:** Base portfolio size set to 25 with dynamic month-over-month tracking.

### 3.7. Agent Account Statements (`/estado-cuenta`)
- **Financial Control:** Broker-managed charges (fees, signage) and payments.
- **Agent Transparency:** Agents can view current debt balance and log personal operational expenses.

### 3.8. Olympia AI Coach Integration (`/api/olympia`)
- **Persistent Context:** AI chat history stored in dedicated agent Google Drive folders for long-term relational context.
- **Value-Driven Advice:** Provides personalized strategies based on agent's CRM data and historical performance.

### 3.9. Properties Module — Hub-First (`/propiedades`)
- **Single Source of Truth:** All property listings are created and managed within the Hub. No more uploading directly to RECONNECT.
- **Broker Approval Workflow:** Properties flow through `draft → pending_approval → approved → published`. The broker verifies owner info, pricing, photos, and descriptions before any listing goes live.
- **Drive-Based Photos:** Each property gets a Google Drive folder. The office photographer uploads images there; the Hub syncs and distributes.
- **RECONNECT API Integration:** Approved properties are auto-published to RECONNECT via the REI API CCA v1.0 (`CreateProperty`, `FullUpdateProperty`, `CancelProperty`, image management).
- **Full Data Model:** Matches RECONNECT schema — bilingual titles/descriptions, location geo IDs, amenities, pricing, commission splits, SEO fields, and owner contact info.

### 3.10. Developments Module (`/propiedades/desarrollos` + `/d/[slug]`)
- **Block-Based Page Builder:** Agents create marketing landing pages for residential communities, condo towers, or commercial projects using modular blocks (hero, description, video, gallery, amenities, inventory, FAQ, map, agent card, lead form, social media buttons, custom text).
- **Configurable Unit Types:** Each development defines its label — Lotes, Unidades, Apartamentos, Casas, Locales, or custom.
- **Public Landing Pages:** Each development gets a unique URL (`/d/[slug]`) with premium responsive design, SEO optimization, Open Graph tags, and integrated lead capture forms.
- **Project Branding:** Supports project logo, tagline, developer info, and render galleries via Drive.
- **Inventory from Existing Properties:** The inventory block links to pre-existing approved properties from the agent's portfolio.
- **Broker Approval Required:** All developments require broker review before going live.
- **Analytics Dashboard:** Tracks page views, per-listing clicks, WhatsApp button clicks, FAQ interactions, traffic sources, and full funnel metrics (views → inquiries → site visits → reservations → closings).
- **Auto-Generated Reports:** PDF/shareable reports with digital and physical metrics for agents to send to developers as proof of marketing performance.

### 3.11. Portal Syndication & Inquiry Tracking
- **Multi-Portal Distribution:** Published listings are syndicated to third-party portals (Encuentra24, Chozi.com, ListGlobally/Properstar, Realtor.com International) via standardized JSON/XML feeds or portal-specific APIs.
- **Public Listing Feed:** A public API endpoint serves all published properties for portals to consume.
- **Inquiry Inbox:** Leads from portal inquiries are received via webhooks, linked to the property and agent, and tracked through `new → contacted → converted → dismissed`.
- **Syndication Status Panel:** Each property shows which portals it's live on, with clickable links and inquiry counts per portal.
- **Public API for Website:** Development and property data available via public API for the future RE/MAX website integration.

## 4. Non-Functional Requirements
- **Internationalization (i18n):** Full bilingual support (English/Spanish) without hardcoded strings, utilizing the central `t()` context dictionary.
- **Performance & Scale:** Hosted on Vercel utilizing Next.js App Router for optimal Edge rendering.
- **Aesthetics & UI:** Must adhere to strict "premium" aesthetics—dynamic modern design, dark mode compatibility, and high-fidelity micro-animations.
- **Hub-First Architecture:** The Hub is the single source of truth for all listing data. External systems (RECONNECT, portals, website) consume data from the Hub, not the other way around.
