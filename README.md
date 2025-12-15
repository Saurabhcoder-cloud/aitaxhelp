# TaxHelp AI

A Next.js App Router project for the **TaxHelp AI** marketing site and filing flow. It includes translation scaffolding with `next-intl`, Tailwind + shadcn/ui components, and stubbed APIs for upload, processing, draft review, and export.

## Getting started

```bash
npm install
npm run dev
```

If you encounter a registry access error (e.g., 403), try setting an alternate npm registry (`npm config set registry https://registry.npmjs.org`) or using an offline cache/mirror. The codebase relies only on the dependencies in `package.json`, so installing in an environment with registry access will unblock `npm install`.

### Linting, typechecking, and builds

The repo includes a non-interactive ESLint config (`.eslintrc.json`). If `npm run lint` ever prompts for setup, ensure that file exists locally or run `npx next lint --no-lint-config --fix` once to regenerate it.

TypeScript typecheck uses lightweight shims in `types/shims.d.ts` for environments where dependencies are not installed (e.g., offline/CI mirrors). If you install dependencies normally, those shims are ignored because upstream type packages are present. Add module declarations there when introducing new packages without bundled types.

The Next.js build is configured to fall back to simple runtime stubs in `stubs/` (via `next.config.mjs`) when packages like `next-intl`, `react-hook-form`, or Radix UI components are unavailable. This keeps `npm run build` deterministic even in offline/registry-restricted environments while still using the real implementations when installed.

Primary commands:

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run build
npm run ci # runs lint, typecheck, then build
```

### Modes and environment

- Copy `.env.example` to `.env.local` and fill in the values you need.
- `STUB_MODE=true` (default) keeps all integrations in local/demo JSON stores so the app works offline or without paid providers.
- `STUB_MODE=false` enables the production adapters for auth, payments, storage, and news; provide Stripe keys, email credentials, and database/storage URLs.
- If `npm install` fails due to registry limitations, set a registry mirror (`npm config set registry https://registry.npmjs.org`) or use an offline cache.

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
- `types/` – minimal type shims used when full type packages are unavailable

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
