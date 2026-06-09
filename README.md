# ALTITUD HUB - Operations & Intelligence Platform

## Overview
ALTITUD HUB is a premium, high-performance operations dashboard and business intelligence tool designed specifically for REMAX Altitud and Altitud Cero. It serves as the single source of truth for agents and brokers, providing a unified interface for managing property listings, tracking OKRs, executing comparative market analysis (ACM), managing client relationships, and receiving automated AI-driven mentorship.

This application represents **Project 3** of the REMAX Altitud Digital Ecosystem (alongside the public website and the "RINDER" buyer matchmaking app), integrating deeply with REMAX Central America's core API (RECONNECT) and various property portals.

---

## 🌟 Key Features

### Core Operations & Management
- **Dashboard OKR:** The central hub for agents to track their pipeline, capture targets, and monitor overall business health and daily habits.
- **Operations Center (Negocio):** Real-time management of active listings, deals, and the full transaction lifecycle (LOI, SPA, Due Diligence).
- **Property Management & Syndication:** A "Hub-First" architecture where agents create and manage listings. Upon broker approval, properties are syndicated automatically to the RECONNECT API, Encuentra24, ListGlobally/Properstar, and Chozi.
- **CRM & Client Management:** Track contacts, lead sources, and manage follow-ups.

### Advanced Intelligence & Analytics
- **Office Performance Analytics:** Comprehensive broker dashboards featuring Portfolio Rotation KPI (Days on Market), Plan vs. Achieved reporting, and automated funnel tracking for team coaching.
- **ALTITUD AI Mentor (Olympia):** An integrated Gemini-powered coaching assistant that parses contracts, provides motivated feedback, and manages proactive alerts (birthdays, move-in anniversaries) directly from chat.

### Specialized Workflows
- **Pre-Listing Generator:** A dynamic, modular folder builder allowing agents to create personalized, high-conversion PDF presentations for sellers.
- **Photographer Workflow:** Direct scheduling integration for property photo shoots, tracking listing speed and media fulfillment seamlessly.
- **Búsqueda (Buyer Matchmaking):** Cross-reference client requirements with active and off-market inventory, directly feeding into the client-facing RINDER app.

---

## 🛠 Tech Stack

- **Framework:** [Next.js 15+](https://nextjs.org/) (App Router, React Server Components)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Database:** Self-hosted PostgreSQL + PostGIS (Migrating away from Supabase)
- **Deployment:** Dockerized self-hosting via [Coolify](https://coolify.io/)
- **AI Integration:** `@google/genai` (Gemini Pro/Flash models)
- **Design Philosophy:** "Excellent" design language featuring the Slate-50 palette (high-contrast light mode), modern bold typography, and subtle glassmorphism.

---

## 📁 Repository Structure

```text
ALTITUD HUB/
├── src/
│   ├── app/                # Next.js App Router (pages and API routes)
│   │   ├── api/            # Server API endpoints (Olympia, RECONNECT, Syndication)
│   │   ├── propiedades/    # Property listing management
│   │   ├── oficina/        # Broker analytics & approval dashboard
│   │   ├── prelisting/     # Dynamic presentation generator
│   │   └── ...             # Other feature modules (acm, negocio, etc.)
│   ├── components/         # Reusable React components (UI, Layout, Modules)
│   └── lib/                # Core utilities, DB clients, RECONNECT API wrapper
├── supabase/
│   └── migrations/         # PostgreSQL schema evolution (Source of Truth)
├── docs/                   # Extended developer documentation
├── TECHNICAL_HANDOVER.md   # Deep-dive architecture and integration details
└── CLAUDE.md               # AI Assistant context and routing rules
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18 or newer
- **npm**: v9 or newer
- **Local PostgreSQL** (optional, but recommended if not connecting to the staging DB)

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone <repository-url>
cd "ALTITUD HUB"
npm install
```

### 2. Environment Variables
Create a `.env.local` file in the root directory. You will need to obtain the active values from the Coolify dashboard or the lead developer.

```env
# Database
DATABASE_URL="postgresql://user:pass@host:5432/db"

# REMAX RECONNECT Credentials
RECONNECT_ALTITUD_API_KEY="your-key"
RECONNECT_ALTITUD_SECRET_KEY="your-secret"
RECONNECT_ALTITUD_INTEGRATOR_ID="R1040034"
RECONNECT_USE_TEST_ENV="false"

# Gemini AI
GEMINI_API_KEY="your-gemini-key"
```

### 3. Running the Development Server
Start the local server on `http://localhost:3000`:
```bash
npm run dev
```

### 4. Build & Production
To test the production build locally:
```bash
npm run build
npm start
```

---

## 🚢 Deployment

The Hub is deployed via **Coolify** (a self-hosted Vercel alternative) and runs in an isolated Docker container.
- **Domain:** `hub.remax-altitud.cr`
- **Database:** Connects directly to the shared Coolify PostgreSQL instance.

**Important:** Do not use `vercel --prod` to deploy this application. Deployment triggers are managed through GitHub branch tracking in the Coolify panel.

---

## 📚 Further Reading

For a deep dive into the ecosystem architecture, database sharing between the Website and the Hub, and details on the RINDER integration, please read the [TECHNICAL_HANDOVER.md](./TECHNICAL_HANDOVER.md) file.
