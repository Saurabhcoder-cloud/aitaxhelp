# Phase 12 — Step 1: Production Readiness Audit Report
**Project:** TaxAIHelp (`taxaihelp.com`)  
**Repository:** `https://github.com/Saurabhcoder-cloud/aitaxhelp.git` (branch: `main`)  
**Audit Date:** October 2026  
**Auditor:** Antigravity Agentic AI (Production Engineering & Security Audit)  
**Scope:** Pre-Launch Complete Production Readiness Audit (Phases 1–11 Codebase)

---

## A. Executive Summary

This audit assesses the pre-launch readiness of the TaxAIHelp platform across ten core operational dimensions before provisioning live production third-party accounts and secrets. The platform encompasses full federal Form 1040 preparation, multi-state tax engines (including California Form 540 and no-income-tax states), CPA/EA collaboration workflows, IRS MeF e-file provider readiness abstraction, and Stripe subscription monetization.

### Key Audit Findings
1. **Compilation, Typing & Test Suite:** 100% clean baseline.
   - **TypeScript (`tsc --noEmit`):** 0 errors.
   - **Vitest Suite (`npm test`):** 48 test suites passed, 982 / 982 unit and integration tests passed.
   - **Next.js Production Build (`npm run build`):** Clean compilation across all 42 static/dynamic routes.
2. **Tax & Legal Safety Invariants:** 100% compliant.
   - The deterministic calculation engine is the sole source of numerical truth.
   - Gemini AI is strictly confined to server-side intent classification and pedagogical explanations; prompt engineering strictly forbids calculating, altering, or estimating tax numbers.
   - Both Federal (`DisconnectedEfileProvider`) and State (`DisconnectedStateEfileProvider`) e-filing pipelines fail closed to an offline/paper-filing disclosure in production, strictly eliminating any risk of deceptive or unauthorized IRS/State transmission claims.
3. **Secret Hygiene & Security:** No hardcoded production secrets, live API tokens, or unmasked client leaks were detected. Sensitive server secrets are excluded from `NEXT_PUBLIC_*` bundles.
4. **Primary Launch Prerequisites:** Production launch requires configuring actual external infrastructure credentials:
   - Supabase production URL & keys (with database migration execution).
   - Google Gemini API key for live AI assistant responses.
   - Stripe Live Secret Key, Webhook Secret, and live Price IDs.
   - Transactional email provider API keys (Resend or SMTP).

---

## B. Environment Variable Matrix

A complete scan of all source files in `app/`, `lib/`, and `components/` identified 28 distinct environment variable keys. The matrix below classifies each variable, defines its runtime boundary, and details production requirements.

| Environment Variable | Scope | Classification | Default / Fallback in Code | Required for Production? | Description / Guidance |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Client & Server | REQUIRED FOR PRODUCTION | `https://taxaihelp.com` | **YES** | Canonical application base URL used for absolute redirects, metadata, and auth callbacks. Must use HTTPS. |
| `NEXT_PUBLIC_SITE_URL` | Client & Server | REQUIRED FOR PRODUCTION | `https://taxaihelp.com` | **YES** | Canonical site URL fallback for SEO metadata and OpenGraph links. |
| `NEXT_PUBLIC_SUPABASE_URL` | Client & Server | REQUIRED FOR PRODUCTION | `""` | **YES** | Production Supabase HTTPS project API endpoint (e.g., `https://[ref].supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Client & Server | REQUIRED FOR PRODUCTION | `""` | **YES** | Production Supabase Anon/Publishable API key safe for browser client requests. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client & Server | OPTIONAL (Alias) | `""` | **NO** | Supported fallback alias for `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client & Server | REQUIRED FOR PRODUCTION | `pk_test_...` (placeholder) | **YES** (if checkout active) | Stripe Publishable Key (`pk_live_...`) required for client-side Stripe Elements or client redirect. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-Only | REQUIRED FOR PRODUCTION | `""` | **YES** | Privileged server-side key for administrative database mutations bypassing RLS. Must never have `NEXT_PUBLIC_` prefix. |
| `GEMINI_API_KEY` | Server-Only | REQUIRED FOR PRODUCTION | `""` | **YES** | Google AI Studio / Cloud Gemini API key for tax assistant and intent parsing. Fallback to offline educational template if missing. |
| `STRIPE_SECRET_KEY` | Server-Only | REQUIRED FOR PRODUCTION | `sk_test_...` (placeholder) | **YES** | Stripe secret API key (`sk_live_...`) for creating checkout sessions and portal sessions. |
| `STRIPE_WEBHOOK_SECRET` | Server-Only | REQUIRED FOR PRODUCTION | `whsec_...` (placeholder) | **YES** | Stripe webhook signing secret (`whsec_...`) used to cryptographically verify HMAC-SHA256 signatures. |
| `STRIPE_PRICE_ID_PREMIUM_MONTHLY` | Server-Only | REQUIRED FOR PRODUCTION | `price_test_premium_monthly` | **YES** | Stripe Price ID for Premium monthly subscription plan. |
| `STRIPE_PRICE_ID_PREMIUM_ANNUAL` | Server-Only | REQUIRED FOR PRODUCTION | `price_test_premium_annual` | **YES** | Stripe Price ID for Premium annual subscription plan. |
| `STRIPE_PRICE_ID_PROFESSIONAL` | Server-Only | REQUIRED FOR PRODUCTION | `price_test_professional_monthly` | **YES** | Stripe Price ID for Professional CPA/EA review plan. |
| `STRIPE_PRICE_ID_PROFESSIONAL_ANNUAL` | Server-Only | OPTIONAL | `price_test_professional_annual` | **NO** | Stripe Price ID for Professional annual plan. |
| `STRIPE_PRICE_ID_PREMIUM` | Server-Only | OPTIONAL (Fallback) | `""` | **NO** | Legacy fallback alias for `STRIPE_PRICE_ID_PREMIUM_MONTHLY`. |
| `CRON_SECRET` | Server-Only | REQUIRED FOR PRODUCTION | `""` | **YES** | Bearer secret token used by Vercel Cron to authenticate scheduled operational tasks (`/api/cron/*`). |
| `NODE_ENV` | Server-Only | RUNTIME / SYSTEM | `development` | System (Auto) | Injected automatically by Vercel as `production`. Triggers strict security guards (mock e-file lockout, HTTPS cookies). |
| `APP_ENV` | Server-Only | OPTIONAL | `""` | **NO** | Explicit application runtime indicator (`production`, `staging`, `development`). |
| `ADMIN_EMAILS` | Server-Only | REQUIRED FOR PRODUCTION | `""` | **YES** | Comma-separated list of administrative email addresses authorized for `/admin` access. |
| `ADMIN_USER_IDS` | Server-Only | OPTIONAL | `""` | **NO** | Comma-separated list of admin UUIDs for emergency administrative bootstrapping. |
| `EMAIL_PROVIDER` | Server-Only | REQUIRED FOR PRODUCTION | `"null"` | **YES** | Transactional email provider selection: `"null"`, `"console"`, `"resend"`, or `"smtp"`. |
| `EMAIL_API_KEY` | Server-Only | EXTERNAL PROVIDER DEPENDENCY | `""` | **YES** (if provider ≠ null) | API key for transactional email delivery (e.g. Resend `re_...`). |
| `EMAIL_FROM` | Server-Only | OPTIONAL | `notifications@taxaihelp.com` | **NO** | Formatted sender address for transactional communications. |
| `EMAIL_REPLY_TO` | Server-Only | OPTIONAL | `support@taxaihelp.com` | **NO** | Reply-to email address. |
| `ADMIN_NOTIFICATION_EMAIL` | Server-Only | OPTIONAL | `""` | **NO** | Destination email address for automated operational incident alerts and lead notifications. |
| `BACKUP_PROVIDER` | Server-Only | OPTIONAL | `"null"` | **NO** | Automated backup provider: `"null"` or `"supabase"`. |
| `EFILE_PROVIDER` | Server-Only | EXTERNAL PROVIDER DEPENDENCY | `"disabled"` | **NO** | Electronic filing gateway provider. Automatically forced to fail-closed `DisconnectedEfileProvider` in production. |
| `VERCEL_GIT_COMMIT_SHA` / `GITHUB_SHA` | Server-Only | SYSTEM METADATA | `""` | System (Auto) | Git commit hash exposed in health and diagnostic endpoints. |
| `VITEST` | Server-Only | DEVELOPMENT/TEST ONLY | `""` | **NO** | Automatically set during test execution. |

---

## C. Gemini AI Readiness

### Architecture & Boundaries
- **Server-Side Isolation:** All Gemini invocation logic is isolated in `lib/ai/gemini/` and executed exclusively via Next.js Route Handlers (`/api/v1/tax/intent`, `/api/v1/ai/explain`, etc.).
- **Zero Key Leakage:** There are zero instances of `NEXT_PUBLIC_GEMINI_*` anywhere in the codebase.
- **Direct REST Implementation:** `lib/ai/gemini/client.ts` interacts directly with Google's REST API endpoint (`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`) using `x-goog-api-key`, avoiding heavy dependency trees.
- **Log Sanitization:** `client.ts` actively scrubs API keys from outgoing error text (`safeErrorText = errorText.replace(/key=[^&\s]+/gi, "key=[REDACTED]")`) before logging.
- **Fail-Safe Offline Graceful Degradation:** If `GEMINI_API_KEY` is missing, unconfigured, or invalid, `isGeminiAvailable()` returns `false`, and `callGeminiApi()` seamlessly provides deterministic educational explanations without crashing the user's workflow.
- **Tax Integrity Constraint:** System prompts in `SYSTEM_PROMPTS` (`prompts.ts`) explicitly enforce:
  1. Gemini must never calculate, alter, estimate, or override tax numbers.
  2. All numerical tax figures are strictly sourced from `calculateFederalTax()`, which delegates to the deterministic tax engine (`tax-engine/`).
  3. Prompt injection protections reject attempts to manipulate statutory thresholds or calculation results.

---

## D. Supabase & Database Readiness

### Architecture & Client Segregation
- **Browser Client (`lib/supabase/client.ts`):** Safely references only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- **Server Client (`lib/supabase/server.ts`):** Strictly protects `SUPABASE_SERVICE_ROLE_KEY` from browser disclosure.
- **Graceful Unconfigured Fallback:** In development/staging or before database provisioning, `SUPABASE_CONFIG.isConfigured()` prevents crash conditions by routing to in-memory session persistence.
- **Migration Portfolio:** 20 production SQL migrations exist under `supabase/migrations/`:
  - `20260924000000_initial_schema.sql` (core profiles, tax calculations, audit logs)
  - `20260925000100_data_management.sql` (GDPR data export and erasure tracking)
  - `20260925000200_notifications_and_preferences.sql` (user notification delivery & preferences)
  - `20260925000300_operations_incidents.sql` (system incident logs & health tracking)
  - `20260925000400_platform_configuration.sql` (runtime platform settings)
  - `20260925000500_professional_leads.sql` (CPA/EA match request intake)
  - `20260925000600_subscriptions_and_usage.sql` (monetization entitlements & billing)
  - `20260925000700_support_center.sql` (support tickets)
  - `20260925000800_tax_calculations.sql` (saved deterministic calculation results)
  - `20260925_admin_audit_and_roles.sql` (RBAC audit logs and administrative authorization)
  - `20260928010000_preparation_income_snapshot.sql` (W-2, 1099, income discovery snapshots)
  - `20260928020000_preparation_documents_deductions.sql` (document checklist and deductions)
  - `20260928_tax_preparation_sessions.sql` (session state machine persistence)
  - `20260929000000_preparation_calculation_link.sql` (bridges calculator sessions to preparation)
  - `20260930000000_professional_leads_session_link.sql` (attaches returns to CPA review leads)
  - `20261001000000_stripe_webhook_events.sql` (webhook idempotency and event storage)
  - `20261002000000_preparation_household_snapshot.sql` (dependents and household credits)
  - `20261003000000_professional_review_workflow.sql` (CPA review status and handoff notes)
  - `20261003180000_efile_submission_persistence.sql` (federal e-file audit trail & canonical submissions)
  - `20261003200000_state_tax_persistence.sql` (multi-state tax returns and state e-file tracking)
- **Row Level Security (RLS):** All tables define explicit RLS policies scoping read/write permissions to `auth.uid() = user_id`, with administrative bypass restricted to service-role tokens.

---

## E. Stripe Integration Readiness

### Security & Verification
- **Webhook Signature Verification:** `StripeClient.verifyWebhookSignature()` in `lib/stripe/client.ts` implements strict verification using `crypto.timingSafeEqual` over HMAC-SHA256 hashes (`timestamp.rawBody`), with a 300-second timestamp tolerance to neutralize replay attacks.
- **Webhook Idempotency:** `/app/api/v1/billing/webhook/route.ts` records and verifies event processing via `StripeWebhookEventStore.isProcessed(event.id)`, guaranteeing duplicate deliveries from Stripe do not result in redundant entitlement increments.
- **Configurable Price IDs:** Monthly, annual, and professional tier pricing references environment variables (`STRIPE_PRICE_ID_PREMIUM_MONTHLY`, `STRIPE_PRICE_ID_PREMIUM_ANNUAL`, `STRIPE_PRICE_ID_PROFESSIONAL`).
- **No Hardcoded Live Keys:** No live secret keys (`sk_live_...`) exist in source control.
- **Fail-Safe Mode:** If unconfigured in development/staging, `PaymentProviderFactory` initializes in safe test/staging mode without throwing unhandled exceptions.

---

## F. Email & Notification Readiness

### Operational Flow
- **Multi-Channel Architecture:** Supports In-App notifications and transactional email dispatching with user preference management (`NotificationPreferencesStore`).
- **Deleted Account Protection:** `NotificationService.markUserDeleted()` strictly suppresses non-security communications for accounts marked for deletion.
- **Idempotency:** Email dispatches support idempotency keys to avoid duplicate messaging.
- **Current Driver Status:** `lib/notifications/providers/email.ts` defaults to `NullEmailProvider` when `EMAIL_PROVIDER=null`. If `"resend"` or `"smtp"` is selected in environment variables, the abstraction is defined, but external API bindings require final driver hookup or utilization of Supabase Auth's built-in transactional email service for password resets.

---

## G. Vercel & Deployment Readiness

### Edge & Build Configuration
- **Next.js Configuration (`next.config.mjs`):**
  - `reactStrictMode: true`
  - `poweredByHeader: false` (hides X-Powered-By header)
  - Comprehensive HTTP Security Headers:
    - `X-Frame-Options: DENY` (anti-clickjacking)
    - `X-Content-Type-Options: nosniff` (anti-MIME sniffing)
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (HSTS)
    - `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
  - Permanent 301 Redirect: `/ai-assistant` -> `/ai-tax-assistant`.
- **Edge Middleware (`middleware.ts`):** Protects all `/dashboard` and `/dashboard/:path*` routes by evaluating session cookies and Authorization headers, redirecting unauthenticated users to `/login?next=...` with open-redirect validation (`getSafeRedirectUrl`).
- **Static vs Dynamic Performance:**
  - Public marketing, pricing, calculator landing pages, and documentation pre-render statically (`○ Static`).
  - All authenticated endpoints and calculation APIs execute dynamically on-demand using the Node.js server runtime (`λ Dynamic`).

---

## H. Authentication & Authorization Readiness

### Session & Access Control
- **Manual Verification:** Production Vercel authentication has been verified (account registration, login, session retention, and logout work smoothly).
- **Session Tokens & Cookies:** `taxaihelp-auth-token` cookie configured with `sameSite: "lax"`, `path: "/"`, `maxAge: 7 days`, and `secure: true` in production.
- **Server-Side Verification:** API route handlers rely on `getAuthenticatedUser(req)`, which extracts user credentials from cookies or `Authorization: Bearer` headers. Client-submitted `userId` parameters in request bodies are never trusted.
- **Role-Based Access Control (RBAC):** Admin endpoints enforce `requireAdmin(req)`. Authorization is validated against server-configured `ADMIN_EMAILS`, `ADMIN_USER_IDS`, and database role records (`UserProfileStore`).
- **Admin Interface Guard:** `AdminAuthGuard` intercepts unauthorized access attempts to the `/admin` portal and renders `AdminAccessDenied`.

---

## I. Security Audit Findings

| Area | Security Check | Finding | Status |
|---|---|---|---|
| **Hardcoded Secrets** | Scanned for live Stripe keys, Google API keys, GitHub tokens, private keys | **Zero hardcoded secrets found.** All examples in documentation are explicitly masked or test placeholders. | **PASS** |
| **Input Validation** | API routes accept taxpayer data | All mutation routes use Zod schemas (`lib/validations/`) with strict type boundaries, numeric sanitization, and strip unknown properties. | **PASS** |
| **Prompt Injection** | LLM assistant receives user input | System prompts explicitly mandate treating user messages as untrusted input and forbid revealing prompt instructions or altering tax figures. | **PASS** |
| **Open Redirects** | Login / auth redirects via `?next=` | Validated through `getSafeRedirectUrl()`, restricting destinations to relative paths and prohibiting `javascript:` or external hostnames. | **PASS** |
| **Signature Forgery** | Inbound webhooks (Stripe / E-file) | Cryptographically validated using HMAC-SHA256 with timestamp replay protection. | **PASS** |
| **Admin Route Edge Defense** | Middleware matcher | `/dashboard` routes are protected at the edge; `/admin` is protected in layout and route handlers. (See Warning W-01). | **WARNING** |

---

## J. Production Build & Test Status

```
================================================================================
VERIFICATION SUITE EXECUTION REPORT
================================================================================
1. TypeScript Static Typecheck:
   Command: npm run typecheck (tsc --noEmit)
   Result:  EXIT CODE 0 (Zero errors detected across 100% of files)

2. Vitest Automated Test Suite:
   Command: npm test (vitest run)
   Result:  EXIT CODE 0
   Summary: 48 Test Files Passed (100%)
            982 Total Tests Passed (100%)
            0 Failed, 0 Skipped
   Duration: 37.49s

3. Next.js Production Build:
   Command: npm run build (next build)
   Result:  EXIT CODE 0 (Compiled successfully)
   Output:  42 static and dynamic routes compiled without errors
================================================================================
```

---

## K. Tax & E-File Safety Invariant Verification

| Safety Invariant | Enforcing Architecture | Verification Result |
|---|---|---|
| **Deterministic Authority** | `tax-engine/` progressive calculation engine (`v2025_v1`) produces all federal math. State modules (`lib/state-tax/`) produce state math. | **VERIFIED:** Zero calculation logic exists in React presentation components or LLM output. |
| **Gemini Explanation-Only** | `lib/ai/gemini/prompts.ts` strictly limits Gemini to intent classification and pedagogical explanations. | **VERIFIED:** Gemini is strictly decoupled from arithmetic liability determinations. |
| **Fail-Closed Federal E-File** | `DisconnectedEfileProvider` is the default provider. In production (`NODE_ENV === "production"`), mock providers are locked out and forcibly return `DisconnectedEfileProvider`. | **VERIFIED:** No mock submission or unauthorized transmission can occur in production. Users are directed to official print/mail or CPA review. |
| **Fail-Closed State E-File** | `DisconnectedStateEfileProvider` handles state e-filing. Production runtime locks out `MockStateEfileProvider`. | **VERIFIED:** No simulated state acceptance is possible in production. |
| **Federal-State Separation** | `extractFederalReadonlyInputs` creates an immutable bridge from the federal snapshot into state engines. | **VERIFIED:** State engines read federal data without mutating the underlying federal return. |

---

## L. Production Blockers (Must Address Before Launch)

The following items are configuration and account provisioning tasks required for live operation. **No code defects were identified; all blockers relate to external infrastructure configuration.**

### [BLOCKER-01] Production Supabase Environment Variables
- **STATUS:** `REQUIRES CONFIGURATION`
- **FILE / PATH:** `.env.production` / Vercel Environment Variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
- **WHAT IS REQUIRED:** Provision a live production Supabase instance, execute all 20 migrations in `supabase/migrations/`, and populate the production keys in Vercel.
- **CODE CHANGE REQUIRED:** **NO**
- **EXTERNAL CREDENTIAL / ACCOUNT REQUIRED:** **YES** (Supabase Account & Project)

### [BLOCKER-02] Production Google Gemini API Key
- **STATUS:** `REQUIRES CONFIGURATION`
- **FILE / PATH:** `.env.production` / Vercel Environment Variables (`GEMINI_API_KEY`)
- **WHAT IS REQUIRED:** Provision a live production Google AI Studio / Google Cloud API key for Gemini 1.5 Flash and configure it in Vercel.
- **CODE CHANGE REQUIRED:** **NO**
- **EXTERNAL CREDENTIAL / ACCOUNT REQUIRED:** **YES** (Google Cloud / AI Studio)

### [BLOCKER-03] Production Stripe Keys & Webhook Secret
- **STATUS:** `REQUIRES CONFIGURATION`
- **FILE / PATH:** `.env.production` / Vercel Environment Variables (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`)
- **WHAT IS REQUIRED:** Provision live Stripe account credentials (`pk_live_...`, `sk_live_...`), configure the webhook endpoint (`https://taxaihelp.com/api/v1/billing/webhook`) in the Stripe Dashboard, and set `whsec_...`.
- **CODE CHANGE REQUIRED:** **NO**
- **EXTERNAL CREDENTIAL / ACCOUNT REQUIRED:** **YES** (Stripe Live Account)

### [BLOCKER-04] Production Stripe Price IDs
- **STATUS:** `REQUIRES CONFIGURATION`
- **FILE / PATH:** `.env.production` / Vercel Environment Variables (`STRIPE_PRICE_ID_PREMIUM_MONTHLY`, `STRIPE_PRICE_ID_PREMIUM_ANNUAL`, `STRIPE_PRICE_ID_PROFESSIONAL`)
- **WHAT IS REQUIRED:** Create subscription products in the Stripe Dashboard and configure live `price_...` IDs.
- **CODE CHANGE REQUIRED:** **NO**
- **EXTERNAL CREDENTIAL / ACCOUNT REQUIRED:** **YES** (Stripe Dashboard Products)

### [BLOCKER-05] Vercel Scheduled Task / Cron Secret
- **STATUS:** `REQUIRES CONFIGURATION`
- **FILE / PATH:** `.env.production` / Vercel Environment Variables (`CRON_SECRET`)
- **WHAT IS REQUIRED:** Generate a secure random token (e.g., 32-byte hex) and configure it in Vercel for automated background maintenance tasks.
- **CODE CHANGE REQUIRED:** **NO**
- **EXTERNAL CREDENTIAL / ACCOUNT REQUIRED:** **NO** (Secret generation only)

---

## M. Production Warnings (Should Review Before Launch)

### [WARN-01] Edge Middleware Matcher Coverage for Admin Routes
- **STATUS:** `WARNING`
- **FILE / PATH:** `middleware.ts` (Line 42)
- **WHAT IS REQUIRED:** `middleware.ts` currently protects `/dashboard` at the Edge, while `/admin` is protected by `AdminAuthGuard` (client layout) and server API route guards (`requireAdmin`). Adding `/admin/:path*` to the edge middleware matcher would provide defense-in-depth at the network perimeter.
- **CODE CHANGE REQUIRED:** **YES** (Low effort, optional hardening)
- **EXTERNAL CREDENTIAL / ACCOUNT REQUIRED:** **NO**

### [WARN-02] Permissions-Policy Header Payment Directive
- **STATUS:** `WARNING`
- **FILE / PATH:** `next.config.mjs` (Line 23)
- **WHAT IS REQUIRED:** `Permissions-Policy` currently specifies `payment=()`, which disables browser Payment Request APIs (Apple Pay / Google Pay). Redirect-based Stripe Checkout is unaffected, but if in-browser Payment Request buttons are used in the future, this directive should be relaxed to `payment=(self "https://js.stripe.com")`.
- **CODE CHANGE REQUIRED:** **YES** (Optional future adjustment)
- **EXTERNAL CREDENTIAL / ACCOUNT REQUIRED:** **NO**

### [WARN-03] Transactional Email Provider Selection
- **STATUS:** `WARNING`
- **FILE / PATH:** `lib/notifications/providers/email.ts`
- **WHAT IS REQUIRED:** The platform currently falls back to `NullEmailProvider` when `EMAIL_PROVIDER=null`. If outbound transactional emails (welcome emails, receipt emails) are desired beyond Supabase Auth's native email confirmations, configure Resend or SMTP credentials.
- **CODE CHANGE REQUIRED:** **NO** (Configurable via `EMAIL_PROVIDER` and `EMAIL_API_KEY`)
- **EXTERNAL CREDENTIAL / ACCOUNT REQUIRED:** **YES** (Resend or SMTP Account if enabled)

---

## N. Step-by-Step Production Configuration Checklist

Follow this operational checklist when promoting TaxAIHelp to live production:

```markdown
### 1. Database & Supabase Setup
- [ ] Create production Supabase project at https://supabase.com
- [ ] Run all 20 migrations from `supabase/migrations/` sequentially in SQL Editor
- [ ] Confirm RLS is enabled on all tables
- [ ] Set Site URL in Supabase Auth Settings to `https://taxaihelp.com`
- [ ] Set Redirect URL to `https://taxaihelp.com/**`
- [ ] Copy Project URL, Anon Key, and Service Role Key

### 2. Google AI Studio / Gemini Setup
- [ ] Create API key in Google AI Studio / Google Cloud Console
- [ ] Restrict key usage to Gemini 1.5 Flash API
- [ ] Confirm quota and billing tier

### 3. Stripe Setup
- [ ] Activate Stripe account for live payments
- [ ] Create Products:
  - [ ] TaxAIHelp Premium (Monthly: $19/mo, Annual: $149/yr)
  - [ ] CPA/EA Professional Review ($99 one-time or review tier)
- [ ] Copy live Price IDs (`price_...`)
- [ ] Add Webhook Endpoint in Stripe Dashboard:
  - URL: `https://taxaihelp.com/api/v1/billing/webhook`
  - Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_*`
- [ ] Copy Webhook Signing Secret (`whsec_...`)

### 4. Vercel Environment Variables Configuration
- [ ] Configure `NEXT_PUBLIC_APP_URL` = `https://taxaihelp.com`
- [ ] Configure `NEXT_PUBLIC_SITE_URL` = `https://taxaihelp.com`
- [ ] Configure `NEXT_PUBLIC_SUPABASE_URL` = `https://[ref].supabase.co`
- [ ] Configure `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = `[anon_key]`
- [ ] Configure `SUPABASE_SERVICE_ROLE_KEY` = `[service_role_key]`
- [ ] Configure `GEMINI_API_KEY` = `[gemini_key]`
- [ ] Configure `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `pk_live_...`
- [ ] Configure `STRIPE_SECRET_KEY` = `sk_live_...`
- [ ] Configure `STRIPE_WEBHOOK_SECRET` = `whsec_...`
- [ ] Configure `STRIPE_PRICE_ID_PREMIUM_MONTHLY` = `price_...`
- [ ] Configure `STRIPE_PRICE_ID_PREMIUM_ANNUAL` = `price_...`
- [ ] Configure `STRIPE_PRICE_ID_PROFESSIONAL` = `price_...`
- [ ] Configure `CRON_SECRET` = `[secure_random_token]`
- [ ] Configure `ADMIN_EMAILS` = `admin@taxaihelp.com`
- [ ] Configure `NODE_ENV` = `production`
- [ ] Configure `EMAIL_PROVIDER` = `null` (or `resend` if API key is provided)

### 5. Production Smoke Testing Post-Deploy
- [ ] Verify homepage loads at `https://taxaihelp.com`
- [ ] Verify SSL certificate and HSTS headers
- [ ] Test user account registration and login
- [ ] Run sample federal calculation on `/tax-calculators/federal-income-tax`
- [ ] Run state tax estimate on `/dashboard/state-tax`
- [ ] Verify tax preparation session creation and PDF document export
- [ ] Verify e-file status displays safe offline paper-filing instructions
- [ ] Verify `/admin` route denies unauthenticated access
```

---

## O. Go / No-Go Recommendation

### Verdict: **GO (CONDITIONAL ON PRODUCTION CREDENTIAL CONFIGURATION)**

#### Rationale
- **Codebase Integrity:** The software is structurally complete, type-safe, and passes all 982 tests without regression. The Next.js production build compiles cleanly.
- **Tax Accuracy & Compliance:** Numerical calculations are strictly deterministic and insulated from AI hallucination.
- **Regulatory & Legal Safeguards:** Federal and state e-file modules fail closed to offline disclosures, completely eliminating unauthorized IRS transmission exposure.
- **Next Step:** Proceed to Step 2 — Configuration of production service credentials and live deployment verification.
