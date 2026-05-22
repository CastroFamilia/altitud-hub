# Altitud Hub - Technical Specifications

## 1. Database Schema & Access Control (Self-Hosted PostgreSQL)
- **Access Control Design (Application-Layer):** 
  - Role-based access control (RBAC) implemented at the application layer via middleware, replacing Supabase RLS.
  - Helper functions (e.g., `isBroker(userId)`) enforce hierarchical role checks in API routes and server components.
  - Users can read/write their own properties.
  - Brokers have overarching read/write access to all records in the office.
- **Key Tables:**
  - `properties`: Core table matching RECONNECT schema.
  - `developments`: Parent container for properties with `sections` JSONB column storing block-based page data.
  - `buyer_search_pipeline`: Tracks the status of client-property matches (`sent`, `interested`, `rejected`).
  - `page_events`: Telemetry table storing analytics (views, clicks, forms) for `/d/[slug]`.

## 2. External API Integrations
### 2.1 REI API CCA v1.0 (RECONNECT)
- **Authentication:** OAuth 2.0. Requires token exchange every 48 hours using `RECONNECT_API_KEY`, `RECONNECT_SECRET_KEY`, and `RECONNECT_INTEGRATOR_ID`.
- **Payload Format:** JSON.
- **Endpoints Utilized:**
  - `CreateProperty`: Initiates a new listing.
  - `FullUpdateProperty`: Syncs changes made in the Hub.
  - `CreatePropertyImage`: Syncs Drive URLs to the RE/MAX central server.
  - `CancelProperty`: Delists the property.

### 2.2 Google Drive API
- **Authentication:** Service Account.
- **Workflow:** 
  - When a property or deal is created, the system authenticates via the Service Account and creates an isolated Google Drive folder.
  - The Drive folder URL is stored in the database.
  - Images placed in this folder by the office photographer are indexed and served via direct-link manipulation (`export=view`) for syndication.

## 3. Frontend Architecture (Next.js App Router)
- **Component Boundary:** Strict separation of Server Components (fetching data directly from PostgreSQL via a server-side query layer) and Client Components (handling interactive UI like forms or block reordering via API routes).
- **Data Fetching:** Page-level fetching is handled in `page.js` Server Components. Loading states are managed via `loading.js` skeletons.
- **Public Routing:** All dynamic development landing pages use the `/d/[slug]` route, leveraging Next.js dynamic routing and metadata generation for SEO tags.
