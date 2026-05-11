# Altitud Hub - Business Logic

## 1. Property Management & Broker Approval Workflow
**Rule:** No property can be published externally without broker approval.
- **Statuses:**
  - `draft`: Agent is currently filling out the property details.
  - `pending_approval`: Agent has submitted the property for review.
  - `needs_changes`: Broker reviewed but rejected the property. Agent must modify.
  - `approved`: Broker has approved all details. Property is ready for publication.
  - `published`: The property has been successfully syndicated via RECONNECT API.
- **Approval Checklist:** The broker must verify owner information, pricing accuracy, photo quality, and bilingual descriptions before transitioning a property from `pending_approval` to `approved`.

## 2. Lead SLA (Service Level Agreement)
**Rule:** Agents must establish contact with a new lead within 48 hours.
- **Trigger:** A new inquiry arrives via portal webhook or public landing page.
- **Monitoring:** The system tracks the timestamp of the last communication logged for the lead.
- **Penalty/Notification:** If 48 hours pass without logged contact (email, WhatsApp, phone), the system flags the lead as "dormant" and notifies the Broker for potential reassignment.

## 3. Financials & Commissions (Office Analytics)
**Rule:** Office analytics must reflect the YTD performance and "Poverty Line" metric.
- **Poverty Line:** Minimum baseline revenue expected per agent per month to cover office operational costs.
- **Commission Split:** Agents operate on specific percentage splits (e.g., 50/50, 80/20) against the office gross.
- **Reservometro:** A projected revenue model based on signed Letters of Intent (LOI) / Reservations, calculating anticipated commissions before the final closing (SPA).

## 4. Development Marketing (Public Landing Pages)
**Rule:** Inventory shown on Development public pages must map to existing approved properties.
- **Linking:** A Development (`development_id`) acts as a parent wrapper. Individual units (lots, houses, apartments) are standard properties in the `properties` table linked to the parent.
- **Visibility:** If a child property changes status to 'sold' or 'draft', the Development landing page automatically updates its inventory block to reflect the new availability.
