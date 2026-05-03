@AGENTS.md

# ALTITUD HUB - Developer Guidelines

## Build & Run Commands
- `npm run dev`: Start local development server on port 3000
- `npm run build`: Create production build
- `npx vercel --prod`: Deploy directly to Vercel production

## Directory Structure
- `src/app/`: Next.js App Router. The root page `page.js` is the OKR Dashboard.
- `src/app/acm/`: The ACM tools module.
- `src/components/`: Reusable React components.
  - `layout/Sidebar.jsx`: The primary navigation structure.
- `src/lib/`: Context and utilities (e.g. `context.js` for translations via `t()`).

## Architecture & Conventions
- **Translation / i18n**: Hardcoded text in UI components should be avoided. Use the `useApp().t('key')` dictionary function configured in `src/lib/context.js`.
- **Styling**: Stick to Tailwind CSS. Emphasize a premium feel with `nexus-header`, `glass-panel`, tracking, and uppercase fonts.
- **Icons**: Utilize inline SVG elements matching the existing UI pattern.
