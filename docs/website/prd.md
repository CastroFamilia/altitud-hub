---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation-skipped', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish']
inputDocuments:
  - '_bmad-output/product-brief/product-brief-2026-03-22.md'
  - '_bmad-output/market-research/market-research-2026-03-22.md'
  - '_bmad-output/domain-research/domain-research-2026-03-22.md'
  - '_bmad-output/technical-research/technical-research-2026-03-22.md'
  - '_bmad-output/brainstorming/brainstorming-session-2026-03-20-0905.md'
documentCounts:
  briefs: 1
  research: 3
  brainstorming: 1
  projectDocs: 0
  projectContext: 0
classification:
  projectType: 'web_app (content-driven multilingual platform)'
  domain: 'Real Estate Marketplace + Relocation Platform'
  complexity: 'medium-high'
  projectContext: 'brownfield (platform migration: WordPress → Next.js with SEO continuity)'
  existingSite: 'https://www.remax-altitud.cr'
vision:
  statement: 'RE/MAX Altitud makes exploring, selling, or investing in Costa Rica''s Southern Zone feel guided, visual, and multilingual — converting curiosity into trust and trust into qualified leads for agents.'
  differentiator: 'Competitors sell properties. RE/MAX Altitud sells confidence in a foreign country — in 6 languages.'
  leadModel: 'One funnel, three intents (Buy, Sell, Invest) — one search engine with intent-aware responses'
  mvpFocus: 'Map-first search + lifestyle area guides + agent-language match + seller CTAs + investment-aware filters'
  phase2Moat: 'Relocation hub + seller valuation tools + dedicated investor experience'
workflowType: 'prd'
---

# Product Requirements Document - RE/MAX Altitud

**Author:** Nico
**Date:** 2026-03-23

## Executive Summary

RE/MAX Altitud is building a multilingual, map-first real estate platform for Costa Rica's Southern Zone — replacing the current WordPress site (English-only, no API sync, Pérez Zeledón office only) with a Next.js application that unifies both RE/MAX Altitud (Pérez Zeledón) and RE/MAX Altitud Cero (Dominical/Uvita) under one digital experience.

The platform serves a single purpose: **convert curiosity into trust and trust into qualified leads for agents** — across buyers, sellers, and investors, in 6 languages.

**Migration consideration:** The existing site at remax-altitud.cr has established Google indexing and inbound traffic. The rebuild includes a URL migration strategy (301 redirects, sitemap transition) to preserve SEO equity during the WordPress → Next.js transition.

Costa Rica has no centralized MLS, ~40% of transactions involve international buyers, and no competitor offers more than 2 languages, map-first search, or integrated relocation tools. RE/MAX Altitud fills this vacuum with an SEO-first, daily-refreshed platform that operates as **one search engine with three intent-aware responses:**

| Intent | What the User Wants | How the Platform Responds |
|--------|---------------------|--------------------------|
| **Buy** | Find property in CR, understand area, talk to an agent in their language | Map-first search, lifestyle area guides, agent-language matching, WhatsApp CTA |
| **Sell** | List a property with a trusted agency | "List with us" / "Vende tu propiedad" CTAs, seller capture forms, agent assignment |
| **Invest** | Identify investment opportunities (commercial, land, rental yield) | Investment-aware filters/tags, ROI context on listings, "Investment inquiry" CTA |

The platform replaces a WordPress site serving the Pérez Zeledón market while simultaneously launching RE/MAX Altitud Cero's (Dominical/Uvita) first digital presence — expanding lead generation into a coastal market with 6–10% annual appreciation and zero existing online footprint.

### What Makes This Special

Competitors sell properties. RE/MAX Altitud sells **confidence in a foreign country** — in 6 languages, with visual discovery tools that make unfamiliar geography accessible, and bilingual agents a WhatsApp tap away.

**The single insight:** In a market with no centralized MLS and 40% international buyers, the first platform to combine API-synced listing freshness, multilingual access, and visual discovery will own the search intent for Costa Rica's Southern Zone.

**Three expressions of this insight:**

1. **6-language AI translation** — reach the 40% international buyer market in their language. EN, ES from API + AI-translated IT, DE, FR, PT. No competitor does this.
2. **Map-first search with 3D terrain** — make unfamiliar geography visually accessible. Interactive pins, clustering, and topography context for mountain (PZ) and coastal (Dominical/Uvita) areas.
3. **Intent-aware lead capture** — every interaction (search, listing view, agent contact, seller form) feeds a unified lead pipeline with source tracking and agent auto-assignment.

The strategic moat deepens in Phase 2 with a full relocation hub ("Move to Costa Rica"), seller valuation tools, and dedicated investor experiences — capabilities that separate RE/MAX Altitud not only from competitors but from other RE/MAX offices in Costa Rica.

## Project Classification

| Dimension | Value |
|-----------|-------|
| **Project Type** | Content-driven multilingual platform (web app) |
| **Domain** | Real Estate Marketplace + Relocation Platform |
| **Complexity** | Medium-High |
| **Project Context** | Brownfield — platform migration from WordPress (remax-altitud.cr) to Next.js with SEO continuity |
| **Existing Site** | www.remax-altitud.cr (Pérez Zeledón office only, English-only WordPress, 15 agents) |
| **New Capability** | RE/MAX Altitud Cero (Dominical/Uvita) office digital launch, 6-language support, map-first search, three-intent lead funnel |

## Success Criteria

### User Success

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Buyer "aha!" moment** | User finds properties on the map in their language within 30 seconds of landing | Session recordings, time-to-first-interaction analytics |
| **Seller trust signal** | Seller contacts via "List with us" CTA and feels confident to list | 50–70% conversion rate from seller lead → signed listing agreement |
| **Language accessibility** | Non-English speakers browse, search, and contact agents in native language | Non-EN/ES traffic ≥15% of sessions; complete UX in 6 languages |
| **Agent accessibility** | Buyer connects with agent who speaks their language within 1 tap | 50%+ of leads via WhatsApp CTA |
| **Investment discovery** | Investors find relevant properties through lifestyle tags regardless of property type classification | Lifestyle tag filter usage in analytics; "Investment Property" / "Rental Potential" tag engagement |

### Business Success

| Metric | Target (6 mo.) | Target (12 mo.) |
|--------|----------------|-----------------|
| **Qualified leads per office** | **50+ leads/mo per office** (100+ total) | 75+ leads/mo per office |
| **Seller lead conversion** | 50–70% from lead → listed property | Maintain 50–70% |
| **Altitud Cero office scale** | 6–8 agents, 150 exclusive listings | 10+ agents, 200+ listings |
| **Organic traffic** | 5,000+ sessions/mo (combined) | 10,000+ sessions/mo |
| **Search rankings** | Top 5 for "Pérez Zeledón real estate" + 10 area keywords | Add Top 5 for Dominical/Uvita keywords |
| **Non-EN/ES traffic** | 15%+ of sessions | 20%+ of sessions |
| **Page views / session** | 3+ average | 4+ average |

### Technical Success

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Mobile performance** | LCP <2.5s, CLS <0.1 | 60–70% of users are mobile |
| **Data freshness** | Listings updated daily by 7 AM CST | Sync pipeline reliability |
| **Translation accuracy** | Zero critical errors in legal/financial content | DeepL glossary + human spot-checks |
| **SEO migration** | Recover 100% of pre-migration organic traffic within 60 days | 301 redirects, sitemap transition, Search Console monitoring |
| **Uptime** | 99.5%+ availability | Coolify-hosted, Docker container with reverse proxy |

### Measurable Outcomes

> **The single metric that matters:** Are we generating 50+ qualified leads per month per office?
>
> Everything else — SEO rankings, traffic, engagement, translation quality — is a leading indicator that feeds this number. If leads flow, the platform is working.

## Product Scope

### MVP — Minimum Viable Product

Core functionality needed to start generating leads for both offices:

- **Map-first property search** with interactive pins, clustering, 3D terrain, and area hierarchy
- **Listing detail pages** with gallery, area context, localized units, ZMT status
- **2-language launch** (EN/ES) with architecture ready for 4 more
- **Agent profiles** with listings, WhatsApp CTA, and language capabilities
- **Seller capture** — "List with us" / "Vende tu propiedad" forms + "Request a Free CMA" form
- **Lifestyle tags** — intent-aware filtering (e.g., "Investment Property", "Rental Potential", "Vacation Home") layered on top of property types to serve buyers, investors, and lifestyle seekers from one search
- **Smart search presets** — pre-configured search shortcuts ("Beach homes under $300K", "Land in Pérez Zeledón") tied to lifestyle tags
- **SEO architecture** — SSG + ISR, structured data, canonical area pages, sitemaps
- **Daily API sync pipeline** — pull, diff, translate, optimize, revalidate
- **WordPress migration** — 301 redirects, URL mapping, SEO equity preservation
- **Static pages** — Homepage, About/Offices, Services, Contact, Join Our Team

### Growth Features (Post-MVP)

- **4 additional languages** (IT, DE, FR, PT) with full SEO
- **Relocation Hub** — visa guides, cost calculator, area comparison
- **"Request a Free CMA" seller lead form** — captures seller interest, routes to agent for in-person Comparative Market Analysis
- **Property comparison** — side-by-side 2–3 listings
- **Blog/CMS** — "Costa Rica Living" content hub
- **Saved searches + alerts** — email/WhatsApp notifications
- **Investment landing page** — dedicated investor experience with ROI data
- **Agent recruitment portal** — expanded "Join Our Team"

### Vision (Future)

- **AI Concierge chatbot** — multilingual property matching + relocation Q&A
- **Questionnaire matching** — "Tell us your dream → We match you"
- **Draw-on-map search** — user draws polygon to define search area
- **Social sharing cards** — deep-linked, visually rich cards for WhatsApp/Facebook
- **"Similar Properties"** recommendation engine

### Out of Scope (MVP)

The following are explicitly excluded from MVP and will NOT be built:

- ❌ User registration / buyer accounts
- ❌ Mortgage calculator
- ❌ 3D virtual property tours
- ❌ CRM integration (HubSpot, Salesforce)
- ❌ Native mobile app
- ❌ AI chatbot
- ❌ Payment processing
- ❌ Manual listing entry (all listings come from RE/MAX API sync)
- ❌ Property alerts / saved searches
- ❌ Blog/CMS

### Constraints & Assumptions

| Type | Item | Addressed In |
|------|------|--------------|
| Constraint | Solo developer for MVP | Executive Summary |
| Constraint | RE/MAX brand guidelines compliance | NFR25-26 |
| Constraint | RE/MAX API dependency (daily sync, no real-time) | FR46, Risk Mitigation |
| Constraint | Two-office structure (Altitud + Altitud Cero) | FR46, Project Classification |
| Constraint | Third-party API cost budgets (maps, translation) | Risk Mitigation |
| Constraint | SEO migration — must preserve existing rankings | FR69, Success Criteria |
| Assumption | RE/MAX API provides sufficient listing data | FR55 (validation pipeline) |
| Assumption | Agents will adopt WhatsApp-first workflow | Journey 1-4, FR34 |
| Assumption | European markets drive primary non-US demand | FR10 (EUR prioritization) |
| Assumption | 6-language coverage addresses target buyer markets | Success Criteria, FR29-33 |
| Assumption | Database free/Pro tier sufficient for MVP scale | Risk Mitigation |
| Assumption | Solo dev can maintain translation quality via glossary | FR33, Domain Requirements |

## User Journeys

### Journey 1: Maria — The American Dreamer Becomes a Buyer

**Persona:** Maria, 62, retired teacher from Oregon. iPad user, no Spanish. Watched HGTV Costa Rica shows for 2 years. Husband passed last year — ready for a fresh start.

**Opening Scene:** Maria Googles "retire in Costa Rica southern zone" at 10 PM. A RE/MAX Altitud area guide for Pérez Zeledón ranks on page 1. The site loads in English automatically. She sees mountain photos, climate data, cost comparisons. *"Wait — this is only 45 minutes from the beach?"*

**Rising Action:** She taps "View Properties" — the map opens. She's never heard of "Pérez Zeledón" but on the map she sees San Isidro, the hospital marker, the road to Dominical. She gets it instantly. She filters by "Retirement Paradise" lifestyle tag. 8 properties appear. She swipes through galleries on her iPad.

**Climax:** She finds a 3-bedroom house with mountain views for $185K. "Titled Property ✓" with a green checkmark reassures her. Below the gallery: "15 min to hospital, 45 min to Dominical beach." Agent: Emma Bennett, speaks English. One tap on WhatsApp — pre-populated message: *"Hi Emma, I'm interested in the house at..."*

**Resolution:** Emma responds within an hour. Video call scheduled for Thursday. Maria bookmarks the site and sends the listing link to her daughter — the link loads as a **standalone landing page** with full gallery, area context, and agent CTA. Two weeks later, Maria's on a plane. Three months later — homeowner.

> **Capabilities:** Auto-detect language, map-first search, lifestyle tag filtering, area guides, ZMT status indicator, gallery-first listing, WhatsApp CTA with pre-populated message, agent-language matching, standalone listing URLs.

**Edge Case — No Results:** Later that week, Maria searches "beachfront homes under $100K" in Pérez Zeledón — a mountain area. Zero results. The map zooms to PZ and shows: *"No properties match your filters in this area."* Below: smart suggestions — *"Try: 'Mountain homes under $100K' in Pérez Zeledón, or 'Beach homes under $100K' in Dominical/Uvita."* And a CTA: *"Can't find what you're looking for? Tell an agent your dream home."* Pre-populated WhatsApp with her search criteria forwarded as context. She taps it. Emma now has context before the first message.

---

### Journey 2: Carlos — The Costa Rican Seller

**Persona:** Carlos, 48, farmer in PZ. Owns 2 hectares inherited from his father. Kids moved to San José. Wants to sell land and buy a smaller house in town. Spanish only. Uses a basic Android phone.

**Opening Scene:** Carlos's neighbor says RE/MAX sold a nearby property well. Carlos searches "vender terreno Pérez Zeledón" on his phone. Site loads in Spanish. He sees "Vende tu propiedad" in the nav.

**Rising Action:** He taps it. Simple form: Name *(required)*, Phone/WhatsApp *(required)*, **Email *(optional)***, Property Type → "Lote/Terreno", Location, Size. No email required — just phone and WhatsApp. He fills it out in 2 minutes on his $150 Android.

**Climax:** WhatsApp message from agent Gustavo Valverde within the hour. Gustavo will visit the land this week. Carlos checks Gustavo's profile — photo, RE/MAX badge, listing count. The balloon logo signals a real company.

**Resolution:** Gustavo visits, photographs the property, lists it. Carlos sees his land on the website two weeks later — professionally shot, described in English AND Spanish. He shows his wife on his phone. *"Mirá, salió bonito."* Three months later, his nephew in San José texts: *"Tío, vi tu terreno en Google! Sale hasta en inglés!"* Carlos has never felt prouder of 2 hectares of dirt.

> **Capabilities:** Full Spanish UX, "Vende tu propiedad" CTA, mobile-first seller form (email optional — builds database without blocking), agent assignment, agent profile trust signals, bilingual listing display, works on low-end Android.

---

### Journey 3: Hans — The German Investor

**Persona:** Hans, 55, engineer from Munich. Owns rental properties in Germany. Market slowing — seeking diversification. Analytical, wants data. Speaks German and English.

**Opening Scene:** Hans reads about CR appreciation in a German expat forum. Visits remax-altitud.cr. Site detects his German browser language — but German isn't available yet (Phase 2). The site loads in English with a subtle note: *"More languages coming soon."* Hans is comfortable in English — it's the investment data that matters to him.

**Rising Action:** He switches to map view. Filters by "Investment Property" lifestyle tag + "Land." Lots clustered near Uvita — 3D terrain shows the coastal ridge and ocean proximity. He sorts by price per m². Three lots under $100K. The visual, map-first approach transcends language — Hans understands the geography instantly.

**Climax:** A 5,000 m² lot in Uvita — $95K. Size shown in m² and hectares (his units), price in USD. "Titled Property ✓." He opens WhatsApp CTA — **message pre-populated in English** with property reference. The listing notes: *"Our agents speak English and Spanish. WhatsApp offers built-in translation for your convenience."*

**Resolution:** Agent Emma responds (she speaks German conversationally, but the formal communication is in English). Hans flies to CR for a 4-day tour, buys 2 lots. Six months later, building a vacation rental. Now a repeat client and referral source for his German network.

> **Capabilities:** Language fallback (loads English when preferred locale unavailable), lifestyle tag "Investment Property," map-first search with 3D terrain, metric units (m²/hectares), WhatsApp CTA in English with translation transparency note, agent-language matching. **Phase 2 unlock:** Full German UI, EUR currency conversion, German-language SEO pages.

---

### Journey 4: Jennifer — The Expat Seller

**Persona:** Jennifer, 58, American who bought a Dominical villa 5 years ago. Grandkids in Texas — ready to move back. Needs to sell from 3,000 miles away.

**Opening Scene:** Jennifer searches "sell property Dominical Costa Rica RE/MAX." Finds remax-altitud.cr in English. Sees "List with us" in the nav — and the Altitud Cero office listed for the first time.

**Rising Action:** She fills out the seller form: House/Villa, Dominical, approximate value, contact info. Notes she's in Texas. Browses agent profiles — filters by Altitud Cero office. Picks an English-speaking coastal specialist.

**Climax:** Agent contacts her via WhatsApp video call. They discuss pricing, photography timeline, the process. Her villa goes live — professionally shot, listed in 6 languages.

**Resolution:** Her agent receives inquiries from a German couple and a Canadian retiree within the first week. Villa sells in 3 months at 95% of asking. The multilingual listing reached buyers who would never have found Jennifer's villa on a local-only, Spanish-only platform.

> **Capabilities:** Seller form for remote owners, Altitud Cero office digital presence (new), agent filtering by office + language, multilingual listing exposure, WhatsApp for remote communication. All buyer inquiries route through the listing agent, never directly to the seller.

---

### Journey 5: Nico — The Platform Admin

**Persona:** Nico, office owner/admin. Manages both Altitud (PZ) and Altitud Cero (Dominical/Uvita) offices. Monitors platform health, reviews leads, ensures data quality.

**Opening Scene:** Morning routine: check sync status. Admin dashboard — sync log: "✅ 247 properties synced, 3 new, 1 updated, 0 errors." Translation batch: "✅ 4 new listings translated." All green.

**Rising Action:** Leads table — 6 new leads overnight. 3 buyer (2 EN, 1 DE), 2 seller (ES), 1 investment inquiry. Each shows: source, property ref, language, assigned agent. He spots the German lead went to a non-German-speaking agent — reassigns to Emma.

**Climax:** Reviews lifestyle tag accuracy. Sync auto-tagged a new Uvita condo as "Vacation Home" — he adds "Investment Property" in the admin table. Tag expands the listing's search visibility after next ISR revalidation.

**Resolution:** Google Search Console shows 6 language variants indexing per listing. German query traffic up 12%. He screenshots the graph for the team WhatsApp. He closes the laptop. The platform he designed is doing its job — in six languages, across two offices, while he sleeps. For the first time, the technology is working as hard as his agents.

**Failure scenario:** One morning, sync log shows "❌ API timeout — 0 properties synced." Nico receives an **automated alert** (email/WhatsApp). The site continues serving all existing listings from PostgreSQL — optimized photos and translations intact. No user-facing impact. He contacts the API provider and the next day's sync recovers.

**Edge case — Agent departure:** Gustavo announces he's leaving RE/MAX Altitud. Nico opens the per-agent lead history (FR64) — all 47 leads Gustavo handled over 8 months are visible: buyer inquiries, seller listings, CMA requests, shortlist inquiries. Each shows the client's name, contact info, property reference, and source. Nico selects "Bulk Reassign" (FR65) — distributes Gustavo's active leads across Laura and two other agents based on language match and area coverage. The system logs every reassignment (previous agent, new agent, date). He exports Gustavo's full client contact list as CSV and sends a personal WhatsApp to each client introducing their new agent. No client falls through the cracks. No institutional knowledge is lost.

> **Capabilities:** Sync monitoring with failure alerts, lead review + agent reassignment, lifestyle tag management (admin table), SEO monitoring, multi-office visibility, per-agent lead history with full audit trail (FR64), bulk lead reassignment with logging (FR65), CSV export of agent contacts (FR65), shortlist popularity analytics (FR66). **Resilience pattern:** PostgreSQL DB is the source of truth — API failures don't affect the live site, only halt new data flow.

---

### Journey 6: Andrés — The Local Buyer

**Persona:** Andrés, 35, hospital administrator in San Isidro del General. Renting an apartment with his wife and 2 kids. They've saved enough for a down payment on a house. Spanish only. Uses an Android phone.

**Opening Scene:** Andrés searches "casas en venta Pérez Zeledón" on his phone during lunch. RE/MAX Altitud's PZ area page ranks on Google — loads in Spanish. He sees "Buscar Propiedades" and familiar town names.

**Rising Action:** He skips the map — he knows every neighborhood in PZ. Switches to grid view (FR2). Filters: "Casa," 2+ bedrooms, under $150K. 12 results. He scrolls through listings, recognizing streets from the photos. No surprises geographically — he's evaluating price, condition, and title status.

**Climax:** A 3BR house in Barrio Los Angeles — $128K. "Propiedad Titulada ✓" — critical for his bank mortgage. 400 m² lot, recently painted. Agent: Gustavo Valverde, speaks Spanish. One tap on WhatsApp — pre-populated message in Spanish: *"Hola Gustavo, me interesa la casa en Barrio Los Angeles..."*

**Resolution:** Gustavo responds: *"¡Mae, conozco esa casa! Puedo mostrarla el sábado."* Andrés visits with his wife on Saturday. Bank pre-approval in hand. Two months later — homeowner, 10 minutes from the hospital.

> **Capabilities:** Full Spanish UX, grid-view search (local users skip the map), property type and price filters, ZMT/title status display (critical for mortgage qualification), WhatsApp CTA in Spanish, agent-language matching, area page SEO for local search queries.

---

### Journey 7: Laura — The Active Agent

**Persona:** Laura, 34, bilingual agent at RE/MAX Altitud PZ office. 3 years in real estate, 22 exclusive listings. Speaks English and Spanish. Active on WhatsApp with her client network.

**Opening Scene:** Laura adds her RE/MAX Altitud profile link to her email signature, WhatsApp status, and Instagram bio. A Canadian prospect opens it — sees Laura's photo, RE/MAX badge, "Speaks: English, Spanish," and all 22 of her listings with thumbnails. WhatsApp CTA at the top of her profile.

**Rising Action:** A new lead notification arrives — a buyer named Juan contacted Laura through a listing page. The lead record shows: source (property listing, FR54), property reference, buyer language (Spanish), and the buyer's message. Laura responds via WhatsApp within 30 minutes.

**Climax:** Laura checks her profile page on the site. Her newest listing appeared overnight after the daily sync — photo optimized, description in English and Spanish. She copies the listing URL and shares it to her client WhatsApp group. The standalone URL loads with full gallery, area context, and her contact info as the listing agent.

**Resolution:** Laura's clients tell her the site "looks like the international platforms." She refers a colleague to the "Únete a Nuestro Equipo" page. For the first time, her digital presence matches the RE/MAX brand promise — and it works while she sleeps.

> **Capabilities:** Agent profile pages with listings, photo, languages, and office affiliation (FR37-39). Shareable profile URLs. WhatsApp CTA on profile. Lead routing with source tracking (FR54). Daily-synced listings on agent pages. Standalone listing URLs for sharing (FR13). Professional presentation matching RE/MAX brand standards.

---

### Journey 8: Sofia — The Potential Recruit

**Persona:** Sofia, 29, licensed real estate agent working with a small independent agency in Quepos. Bilingual (EN/ES). Considering switching to a franchise for better tools, leads, and brand recognition.

**Opening Scene:** Sofia hears from a friend that RE/MAX Altitud has a new website generating leads in multiple languages. She searches "RE/MAX Altitud join team" and finds the "Join Our Team" page. It loads in English.

**Rising Action:** She sees agent profiles with professional photos, listing counts, and language badges. She browses Laura's profile — 22 listings, professional presentation, WhatsApp integration. She compares this to her current agency's Facebook-only presence.

**Climax:** The "Join Our Team" page lists benefits: RE/MAX brand, lead generation technology, multilingual exposure, training programs. A CTA: "Interested? Contact our office." Simple contact form or direct WhatsApp to the office manager. Sofia fills it out — name, current license info, languages spoken, area of interest.

**Resolution:** Nico receives the recruitment inquiry with source tracking. He schedules a call. Sofia joins RE/MAX Altitud two months later — her listings now reach 6 language markets. The website didn't just generate buyer leads — it recruited the talent.

> **Capabilities:** "Join Our Team" page with benefits showcase (FR61), agent profile pages as recruitment proof points (FR37-39), professional brand presentation, recruitment inquiry form with source tracking (FR54), WhatsApp CTA for office contact.

---

### Journey Requirements Summary

| Capability Area | Journeys | MVP? |
|----------------|----------|------|
| Map-first search + clustering | Maria, Hans, Andrés (optional) | ✅ |
| Grid-view search (list toggle) | Andrés | ✅ |
| Lifestyle tag filtering | Maria, Hans, Nico | ✅ |
| Auto-detect language (with fallback) | Maria, Hans | ✅ |
| WhatsApp CTA (pre-populated) | Maria, Hans, Jennifer, Andrés, Laura | ✅ |
| Seller capture forms (email optional) | Carlos, Jennifer | ✅ |
| Agent-language matching | Maria, Hans, Jennifer, Andrés | ✅ |
| ZMT / land status indicators | Maria, Hans, Andrés | ✅ |
| Area guide content | Maria, Hans | ✅ |
| Localized units (m², acres, hectares) | Hans | ✅ |
| Sync pipeline monitoring + failure alerts | Nico | ✅ |
| Lead management + agent routing | Nico, Laura | ✅ |
| Lifestyle tag admin (database) | Nico | ✅ |
| Standalone listing URLs (shareable) | Maria, Laura | ✅ |
| No-results state with alternatives | Maria (edge case) | ✅ |
| Low-end Android form support | Carlos, Andrés | ✅ (NFR) |
| Altitud Cero office digital presence | Jennifer, Nico | ✅ |
| Full Spanish UX | Carlos, Andrés | ✅ |
| Agent profile pages (shareable, with listings) | Laura, Sofia, Jennifer | ✅ |
| Agent recruitment page ("Join Our Team") | Sofia | ✅ |
| Lead source tracking on all forms | Nico, Laura, Sofia | ✅ |
| Community pages (hero, facts, listings) | Maria, Hans | ✅ |
| Shortlist (save/compare/share) | Maria, Hans, Jennifer | ✅ |
| Smart agent routing from shortlist | Maria, Hans | ✅ |
| Per-agent lead history + bulk reassignment | Nico | ✅ |
| Shortlist popularity analytics (admin) | Nico | ✅ |
| Lead follow-up reminders | Nico | 🟡 Growth |
| Full German UI + EUR conversion | Hans | 🟡 Phase 2 |
| Financing guides for foreigners | Hans | 🟡 Phase 2 (Relocation Hub) |

> **Resilience pattern:** PostgreSQL DB is the source of truth for the website. API sync failures don't take the site down — the site continues serving all existing listings with optimized photos and translations. Sync alerts notify admin that new data isn't flowing.

## Domain-Specific Requirements

Real estate is not a regulated industry requiring compliance frameworks. However, the Costa Rica market introduces five domain-specific constraints that shape the data model and UX:

1. **ZMT status indicator** — coastal properties within 200m of high tide have restricted ownership. Every listing displays a visual badge: `Titled ✓` / `Concession` / `ZMT Restricted`. Enum field synced from API or manually tagged.

2. **Property ownership type** — Fee simple title vs. concession vs. untitled. Displayed when available from API. Not fabricated if missing.

3. **USD-canonical pricing** — All prices stored and displayed in USD. Non-US locales (DE, FR, IT, PT) show an approximate EUR conversion via live exchange rate. No multi-currency storage.

4. **m²-canonical units** — All areas stored in m². Auto-converted to acres for `en-US` locale and hectares for lots >5,000 m². Varas² not displayed (too niche).

5. **Translation glossary for legal terms** — "Titled Property," "Concession," "Maritime Zone," "Fee Simple" must translate consistently across all 6 languages. Enforced via DeepL glossary file.

**Phase 2 domain content (Relocation Hub):** Property transfer tax, escrow process, notary requirements, financing for foreigners — may or may not be included.

## Web App Specific Requirements

### Rendering Strategy

| Page Type | Strategy | Rationale |
|-----------|----------|-----------|
| **Homepage** | ISR (1-hour revalidate) | Shows featured listings that change — not truly static |
| **Listing detail pages** | SSG with ISR (revalidate daily) | SEO-critical, data changes daily via sync |
| **Area guide pages** | SSG (static) | Content rarely changes, max SEO performance |
| **Search/Map page** | CSR (client-side) | Interactive filters, map state, dynamic results |
| **Agent profile pages** | SSG with ISR | SEO-valuable, data changes infrequently |
| **Static pages** (About, Contact, etc.) | SSG | Content rarely changes |

### Browser & Device Support

| Category | Supported | Notes |
|----------|-----------|-------|
| **Desktop** | Chrome, Safari, Firefox, Edge (latest 2 versions) | Standard modern stack |
| **Mobile** | Safari iOS 15+, Chrome Android 10+ | 60-70% of traffic is mobile |
| **Tablets** | iPad Safari, Chrome | Maria persona (iPad user) |
| **Low-end devices** | Android with 2GB RAM, $150 phones | Carlos persona — forms must work flawlessly |

### Performance & Accessibility

See **Non-Functional Requirements** section for measurable performance targets (NFR1-6) and accessibility standards (NFR21-24). Image optimization via `next/image` with `sharp` (self-hosted, bundled in Docker image). Alt text template: `"Photo {n} of {total} — {property_type} in {location}"` (deterministic, SEO-friendly).

### SEO Strategy

- **Hreflang tags** — 6 language variants per page, self-referencing. ⚠️ **Tech spike needed:** hreflang middleware implementation with App Router for 6 locales × hundreds of listing pages
- **Structured data** — RealEstateAgent, RealEstateListing (Schema.org)
- **XML sitemaps** — per-language, auto-generated, submitted to Search Console
- **Canonical URLs** — language-prefixed (`/en/`, `/es/`, `/de/`, etc.)
- **WordPress 301 redirects** — complete URL mapping from old site
- **Meta tags** — unique title + description per listing in each language
- **Internal linking** — listings ↔ area guides ↔ agent profiles

### Multilingual Testing Strategy

| Language | Testing Approach |
|----------|-----------------|
| **EN** | Full manual + automated E2E |
| **ES** | Full manual (team speaks Spanish) + automated E2E |
| **IT, DE, FR, PT** | Automated visual regression (screenshot comparison) + translation spot-checks |

### Implementation Stack

- **Framework:** Next.js 15 with App Router
- **Hosting:** Coolify (self-hosted Docker, ISR support, long-running processes)
- **Database:** PostgreSQL + PostGIS (self-hosted via Coolify) — geospatial queries, spatial indexing
- **Maps:** Mapbox GL JS (3D terrain, clustering, interactive pins)
- **Translation:** DeepL API with domain-specific glossary
- **Images:** `next/image` with `sharp` — self-hosted image optimization in Docker container
- **Analytics:** Google Analytics 4 + Google Search Console
- **CI/CD:** GitHub Actions CI + Coolify auto-deploy via webhook + **Lighthouse CI** (performance gates in build pipeline)

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-Solving MVP — deliver the minimum feature set that starts generating 50+ leads/month per office. Not a demo — a production platform replacing the WordPress site.

**Language strategy:** Launch with EN/ES only. Architecture supports 6 languages, but the 4 additional languages (IT, DE, FR, PT) come in Phase 2. This cuts translation pipeline scope by 67% for launch.

**Resource Requirements:** Solo developer (AI-assisted) + Nico for content/QA + agents for listing quality feedback.

### MVP Feature Set (Phase 1 — Launch)

**Core journeys supported:**
- ✅ Maria (buyer, English) — full map search → listing → WhatsApp
- ✅ Carlos (seller, Spanish) — full seller form → agent assignment
- ⚠️ Hans (investor) — partial (English, not German yet), but lifestyle tags + investment filters work
- ✅ Jennifer (expat seller) — full seller form + Altitud Cero office
- ✅ Nico (admin) — full sync monitoring + lead management + tag admin
- ✅ Andrés (local buyer, Spanish) — grid-view search → listing → WhatsApp
- ✅ Laura (active agent) — profile page, lead routing, listing sharing
- ✅ Sofia (recruit) — "Join Our Team" page → recruitment inquiry

**Must-have capabilities:**
- Map-first property search (Mapbox, pins, clustering, 3D terrain)
- Listing detail pages (gallery, area context, units, ZMT status)
- 2-language UX (EN/ES) with i18n architecture for 6
- Agent profiles with WhatsApp CTA and language capabilities
- Seller capture ("List with us" / "Vende tu propiedad") + "Request a Free CMA" form
- Lifestyle tags (intent-aware filtering: Investment Property, Rental Potential, Vacation Home, etc.)
- Daily API sync pipeline (pull, diff, translate EN/ES, optimize images, revalidate)
- WordPress → Next.js migration (301 redirects, URL mapping, SEO equity preservation)
- Sync failure alerts (email/WhatsApp to admin)
- Static pages: Homepage, About/Offices, Services, Contact, Join Our Team
- No-results state with alternative suggestions
- Standalone listing URLs (shareable landing pages)

### Post-MVP Features

**Phase 2 — Growth (Launch +3-6 months):**
- 4 additional languages (IT, DE, FR, PT) with full SEO + hreflang
- Area guide pages (lifestyle area content per zone)
- Relocation Hub (visa guides, cost calculator, area comparison, financing for foreigners)
- Property comparison (side-by-side 2-3 listings)
- Blog/CMS ("Costa Rica Living" content hub)
- Saved searches + alerts (email/WhatsApp notifications)
- Investment landing page (dedicated investor experience with ROI data)
- Agent recruitment portal (expanded "Join Our Team")
- Lead follow-up reminders (agent ping after X hours)

**Phase 3 — Vision (6-12+ months):**
- AI Concierge chatbot (multilingual property matching + relocation Q&A)
- Questionnaire matching ("Tell us your dream → We match you")
- Draw-on-map search (user draws polygon to define area)
- Social sharing cards (deep-linked, rich cards for WhatsApp/Facebook)
- "Similar Properties" recommendation engine

### Risk Mitigation Strategy

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **API sync failure** | Stale listings | PostgreSQL DB resilience — site serves existing data. Admin alerts |
| **SEO traffic loss during migration** | Lost leads | 301 redirect map, sitemap transition, SC monitoring. 100% recovery in 60 days |
| **Translation quality (Phase 2)** | Bad UX | DeepL glossary + human spot-checks |
| **Mapbox cost at scale** | Budget | Free tier: 50K loads/month. Monitor + optimize tile loading |
| **Hreflang complexity** | Delayed i18n | Tech spike before Phase 2 |
| **Single admin** | Bus factor | Coolify dashboard + pgAdmin = standard tooling, onboardable |

## Functional Requirements

> **Capability Contract:** Every feature not listed here will NOT exist in the final product. UX, architecture, and stories all trace back to these FRs.

### Property Discovery (Search & Browse)

- **FR1:** Visitors can search properties on an interactive map with pins, clustering, and 3D terrain
- **FR2:** Visitors can search in a split-view layout (map + grid side-by-side, Zillow-style) as the default, with options to toggle to full map or full grid view
- **FR3:** Visitors can filter properties by type, price range, bedrooms, bathrooms, lot size, and location — filters are context-sensitive (e.g., lots do not show bedrooms/bathrooms)
- **FR4:** Visitors can filter properties by lifestyle tags (e.g., "Investment Property," "Rental Potential," "Vacation Home")
- **FR5:** Visitors can browse properties by location hierarchy (Provincia → Cantón → Distrito) to disambiguate same-name towns
- **FR6:** Visitors can sort search results by price, date listed, and lot size
- **FR7:** Visitors can paginate or progressively load search results in list/grid view
- **FR8:** Visitors can view a property listing detail page with photo gallery, YouTube video embeds, description, specs, and area context
- **FR9:** Visitors can view property area/size in locale-appropriate units (m², acres, hectares)
- **FR10:** Visitors can view property price in USD with approximate EUR conversion for non-US locales. EUR is prioritized as the primary non-US currency based on European buyer traffic patterns observed in Southern Zone real estate markets; additional currencies (GBP, CAD, BRL) are deferred to Phase 2 based on demand data.
- **FR11:** Visitors can see ZMT/ownership status on each listing (Titled / Concession / ZMT Restricted)
- **FR12:** Visitors receive alternative suggestions and a CTA to contact an agent (with the user's search criteria forwarded as context) when a search returns no results
- **FR13:** Visitors can share a listing URL that loads as a standalone landing page with full context
- **FR14:** Visitors landing on a hidden or removed listing see a "No longer available" state with links to similar properties
- **FR15:** Visitors can use smart search presets (e.g., "Beach homes under $300K", "Land in PZ") that combine pre-configured filter + lifestyle tag combinations
- **FR16:** Visitors can tap a "Near me" button that uses the browser Geolocation API to center the map on their current location and display nearby listings within a configurable radius; if geolocation permission is denied, the map defaults to the nearest office area with a non-blocking notification

### Community Pages

- **FR17:** Visitors can browse dedicated community landing pages (`/areas/[area]/communities/[slug]`) with hero imagery, description, quick facts (elevation, distance to airport, infrastructure, amenities), and available properties filtered to that community
- **FR18:** Visitors can view a community index page (`/communities`) showing all communities with hero photo, name, tagline, and price range
- **FR19:** Visitors see a "Featured Communities" section on the homepage with 2-3 spotlight cards linking to community pages, showing community name, one-liner tagline, hero photo, price range, and listing count
- **FR20:** Each community page displays a mini-map (static map image) showing the community's location within its broader area for geographic context
- **FR21:** Each community page shows lot/property availability with status indicators (Available, Sold, Reserved) — displayed as a sortable list on mobile, with optional master plan/site map view on desktop

### Shortlist & Agent Representation

- **FR22:** Visitors can save/shortlist properties by tapping a ♡ icon on any PropertyCard or Listing Detail page. Shortlist persists in `localStorage` for anonymous users (Phase 2: persisted to user account). **Cap: 20 properties maximum** — at limit, show "Remove one to add more." The ♡ icon uses `aria-label` ("Save property" / "Remove from saved") and toggles with a visible color change (`#888` outline → `--color-accent` #660000 filled), not just fill, for low-vision accessibility.
- **FR23:** Visitors can view their shortlist from a persistent icon in the navigation bar, showing saved property count and linking to a **simple comparison page** displaying saved properties with photos, prices, and a mini-map showing all saved locations. Not a feature-dense comparison grid.
- **FR24:** Visitors can share their shortlist via a "Share my shortlist" button that generates a unique URL (e.g., `remax-altitud.cr/shortlist/abc123`) encoding the saved property IDs as a read-only snapshot at time of generation. Recipients see the same properties with photos, prices, and agent CTAs but cannot modify the list. The URL works cross-device and can be sent to family/partners without requiring user accounts.
- **FR25:** On the second ♡ save, a brief tooltip appears: *"Save more — your agent will show you all of them."* This plants the single-agent representation mental model early, before the selection screen.
- **FR26:** When a visitor taps **"Ask about these"** (warm CTA, not "Contact about saved properties") from the shortlist, the system applies smart agent routing:
  - **All properties from 1 agent**: WhatsApp fires directly to that agent with all property refs.
  - **Majority (2+) from 1 agent**: System auto-suggests that agent with messaging: *"[Agent] specializes in the areas you're exploring. She can show you all [N] properties."* Primary CTA contacts that agent; secondary CTA allows choosing a different agent.
  - **All properties from different agents (or tie)**: Agent selection screen appears showing agent cards (photo, name, languages, listing count) **auto-sorted by language match** to the user's detected language. Education interstitial: *"🏠 One agent, all your visits — your chosen agent will coordinate visits to all your saved properties, even those listed by other agents."*
- **FR27:** The pre-populated WhatsApp message includes ALL shortlisted property references (titles + refs) in a single message, regardless of how many properties are saved.
- **FR28:** The chosen/assigned agent receives the full shortlist context and is responsible for coordinating viewings of properties listed by other agents internally.

### Multilingual Experience

- **FR29:** The site auto-detects visitor browser language and loads the appropriate locale (EN or ES for MVP)
- **FR30:** Visitors can manually switch between available languages
- **FR31:** All listing content (title, description, specs) displays in the selected language
- **FR32:** All UI elements, navigation, forms, and CTAs display in the selected language
- **FR33:** Legal/property terms translate consistently via enforced glossary ("Titled Property," "Concession," etc.)

### Lead Generation — Buyers

- **FR34:** Visitors can contact a listing agent via WhatsApp with a pre-populated message (in EN or ES) referencing the property
- **FR35:** Visitors can contact a listing agent via a contact form or email as an alternative to WhatsApp
- **FR36:** The site displays a transparency note about agent languages and WhatsApp translation availability
- **FR37:** Visitors can view agent profiles with photo, languages spoken, listing count, and office affiliation
- **FR38:** Visitors can filter agents by office (Altitud / Altitud Cero) and language spoken
- **FR39:** Visitors can view all listings for a specific agent from that agent's profile page

### Lead Generation — Sellers

- **FR40:** Visitors can submit a "List with us" / "Vende tu propiedad" seller inquiry form
- **FR41:** Visitors can submit a "Request a Free CMA" form to request a Comparative Market Analysis
- **FR42:** Seller forms collect: name (required), phone/WhatsApp (required), email (optional), property type, location, approximate size, and comment/message (optional)
- **FR43:** Seller form submissions are stored and routed to an assigned agent

### Lead Generation — Investors

- **FR44:** Visitors can discover investment-relevant properties through lifestyle tags ("Investment Property," "Rental Potential," "Commercial")
- **FR45:** Listings display area appreciation and rental yield context when available. Data is admin-curated static content per area (not sourced from API). Displayed as informational context with disclaimer: "Based on market estimates — consult an agent for current data"

### Data Pipeline & Content Management

- **FR46:** The system syncs property listings from the RE/MAX API daily (two office GUIDs: Altitud + Altitud Cero)
- **FR47:** The system optimizes API images (WebP, responsive sizes) during sync
- **FR48:** The system translates new listing content to available languages during sync
- **FR49:** The system auto-tags listings with lifestyle tags based on configurable attribute rules (e.g., condos in tourist zones → "Rental Potential"), with manual override capability
- **FR50:** The system auto-tags listings with a community ID by matching property coordinates against defined community geo-fence polygons during sync, with manual override capability in admin
- **FR51:** The system sends an automated alert to admin when sync fails
- **FR52:** The site continues serving existing listings from the database when API sync fails
- **FR53:** The system detects listings removed from the API during sync and handles them gracefully (hides from search, preserves URL for SEO)
- **FR54:** The system captures lead source (UTM parameters + referrer) on every form submission and WhatsApp click
- **FR55:** The sync pipeline validates incoming API data before writing to the database — rejecting records with missing required fields or data anomalies, and alerting admin of rejected records

### Administration & Operations

- **FR56:** Admin can view sync status logs with timestamps (success/failure, counts, errors)
- **FR57:** Admin can view and manage leads (source, property reference, language, assigned agent, UTM source). **For shortlist leads**: the lead record shows all shortlisted property refs, specifying which properties belong to the chosen/assigned agent and which belong to other agents. Example: "Hans → Agent: Emma • Emma's listings: #123, #456, #789 • Gustavo's listings: #321, #654." This gives the office full visibility into cross-agent interest without triggering agent-to-agent notifications.
- **FR58:** Admin can reassign leads to different agents
- **FR59:** Admin can add, edit, or remove lifestyle tags on listings
- **FR60:** Admin can add, edit, or remove community assignments on listings (auto-populated by geo-fence, manually overridable)
- **FR61:** Admin can create and manage communities: name, slug, description, quick facts, hero image, and geo-fence polygon (drawn on a map interface)
- **FR62:** Admin can hide/unhide listings from the website (without affecting API data)
- **FR63:** Admin can monitor SEO performance via integrated analytics
- **FR64:** Admin can view a per-agent lead history showing all leads (buyer, seller, investor) ever assigned to that agent — displaying lead date, name, email, phone, lead type (buyer inquiry, seller listing, CMA request, shortlist inquiry), property reference, and source. Filterable by agent and lead type. This enables business continuity when an agent departs the organization.
- **FR65:** Admin can bulk-reassign all leads from one agent to another (or distribute across multiple agents), with automatic logging of the reassignment (previous agent, new agent, date). Admin can export a CSV of all client contacts (name, email, phone) associated with an agent for manual outreach/notification purposes.
- **FR66:** The system fires an anonymous analytics event when a visitor saves or unsaves a property from their shortlist, capturing property ID, locale, and timestamp. Admin can view per-property shortlist popularity: total saves, saves in the last 30 days, and a "most shortlisted" ranking. Shortlist count is visible on the lead detail view for demand context. No visitor-identifying data is stored.

### Static Content & Site Pages

- **FR67:** The site displays a Homepage with featured listings (admin-curated or most recent) and office value proposition
- **FR68:** The site displays About/Offices, Services, Contact, and Join Our Team pages
- **FR69:** The site maintains full SEO architecture (structured data, sitemaps, meta tags, hreflang, 301 redirects from WordPress)

## Non-Functional Requirements

### Performance

- **NFR1:** Page load (LCP) <2.5s on 4G mobile connections
- **NFR2:** Layout stability (CLS) <0.1
- **NFR3:** First interaction response (FID) <100ms
- **NFR4:** Map renders with pins and clustering within 3s on 4G mobile
- **NFR5:** Search filter changes reflect results within 500ms (client-side)
- **NFR6:** Image gallery loads first 3 images within 1s; remaining images lazy-loaded

### Security & Privacy

- **NFR7:** All traffic served over HTTPS with TLS encryption enforced
- **NFR8:** Admin access to the database management dashboard protected by authentication
- **NFR9:** Lead data (names, phone numbers, emails) encrypted at rest in the database
- **NFR10:** The system does not store visitor IP addresses, browser fingerprints, or personal data unless the visitor explicitly submits a form
- **NFR11:** All third-party API keys stored as environment variables, never in client-side code
- **NFR12:** Analytics use cookieless mode for MVP (consent-mode compliant). Cookie consent banner deferred until marketing cookies added

### Scalability

- **NFR13:** System supports up to 1,000 concurrent visitors without performance degradation via edge CDN
- **NFR14:** Database supports up to 1,000 listings without query performance degradation via spatial indexing
- **NFR15:** Sync pipeline completes within 2 hours. Incremental sync processes only changed/new listings. Alert admin if sync exceeds 2 hours or fails
- **NFR16:** Architecture supports adding 4 new languages without code changes (i18n config + translation pipeline only)

### Integration Reliability

- **NFR17:** API sync pipeline retries up to 3 times on failure before alerting admin
- **NFR18:** API sync failures do not affect site availability — site serves cached data from the database
- **NFR19:** Translation API rate limits respected; translation queue processed with exponential backoff
- **NFR20:** Map tile loading uses CDN caching to minimize API calls

### Accessibility

- **NFR21:** WCAG 2.1 AA compliance across all pages
- **NFR22:** All interactive elements keyboard-navigable
- **NFR23:** Color contrast ratio ≥4.5:1 for all text
- **NFR24:** Screen reader compatibility for listing cards and forms

### SEO & Discoverability

- **NFR25:** 100% of listing and agent pages render server-side (SSG/ISR) for search engine crawlability
- **NFR26:** WordPress 301 redirects return <50ms latency
- **NFR27:** XML sitemaps regenerate automatically after each daily sync
- **NFR28:** Lighthouse CI gate: builds fail if performance score drops below 80

### Backup & Recovery

- **NFR29:** Database has automated daily backups with 7-day retention
- **NFR30:** Point-in-time recovery (PITR) available for disaster recovery
