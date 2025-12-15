# TaxHelp AI

A Next.js App Router project for the **TaxHelp AI** marketing site and filing flow. It includes translation scaffolding with `next-intl`, Tailwind + shadcn/ui components, and stubbed APIs for upload, processing, draft review, and export.

## Getting started

```bash
npm install
npm run dev
```

If you encounter a registry access error (e.g., 403), try setting an alternate npm registry (`npm config set registry https://registry.npmjs.org`) or using an offline cache/mirror. The codebase relies only on the dependencies in `package.json`, so installing in an environment with registry access will unblock `npm install`.

## Tech stack
- Next.js 14 (App Router) with TypeScript
- TailwindCSS + shadcn-inspired UI components
- next-intl with English copy and placeholder locales for 9 additional languages
- react-hook-form + zod for form handling and validation
- Stubbed API routes for upload, processing, draft retrieval, and export

## Project structure
- `app/` – routes for marketing pages and the filing flow
- `components/sections/` – reusable landing page sections
- `components/ui/` – shadcn-style primitives (Button, Card, Accordion, Tabs, Dialog, Toast, etc.)
- `lib/messages/` – i18n message catalogs
- `lib/store/` – file-backed upload metadata store for API stubs

## Implemented flow
1. `/start` – language selection ready for expansion to additional locales
2. `/upload` – drag-and-drop upload with client-side type/size checks and data handling note
3. `/processing` – simulated progress with OCR/classification/validation steps
4. `/review` – mocked refund summary, draft forms, and adaptive Q&A placeholders
5. `/export` – consent checkbox plus download stubs for PDF/JSON/CSV and e-file handoff placeholder

## Extending functionality
- Replace stub APIs in `app/api/*` with real OCR, classification, and tax engine integrations.
- Connect exports to real PDF/JSON/CSV builders and an e-file provider.
- Populate non-English message catalogs under `lib/messages/locales.ts`.

## Testing
No automated tests are included yet. Add Playwright or React Testing Library coverage as you extend the app.
