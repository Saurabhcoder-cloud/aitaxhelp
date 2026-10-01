# Production Environment Audit Report — TaxAIHelp

**Date:** September 30, 2026  
**Auditor:** Antigravity AI Engineering Suite  
**Scope:** Complete Static Environment Variable, Secret Protection & Configuration Audit  
**Target Platform:** Next.js 14 App Router, Supabase Backend, Google Gemini 1.5 Flash, Stripe Monetization, Vercel Hosting  
**Audit Type:** Static Codebase & Architecture Analysis (Zero live secrets handled; zero production changes applied)  

---

## 1. Executive Summary

A comprehensive static audit was performed on the TaxAIHelp codebase to inspect all environment variable usage, secret boundaries, client bundle isolation, fallback behaviors, and configuration contracts.

### Key Audit Findings:
1. **Zero Hardcoded Secrets:** Thorough pattern matching across all application source files (`lib/`, `app/`, `components/`, `tax-engine/`, `public/`) verified **zero live credentials**, **zero production API keys**, **zero live Stripe secrets (`sk_live_*`)**, **zero Gemini keys (`AIzaSy*`)**, and **zero hardcoded database passwords**.
2. **Server-Only Secret Isolation:** All sensitive credentials (`GEMINI_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `EMAIL_API_KEY`, `CRON_SECRET`) are strictly maintained without the `NEXT_PUBLIC_` prefix. Next.js compiler isolation prevents these variables from leaking into client-side browser bundles.
3. **Browser-Safe `NEXT_PUBLIC_` Variables:** All variables prefixed with `NEXT_PUBLIC_` (`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`) contain only public hostnames, endpoints, or client-safe publishable keys designed for browser consumption.
4. **Environment Check & Guardrails:** The platform features centralized environment validation in `lib/config/env.ts` (Zod schemas), `lib/config/environment.ts`, `lib/config/environment-check.ts`, and `lib/deployment/deployment-readiness.ts`. When running in production (`APP_ENV=production` or `NODE_ENV=production`), missing critical variables block deployment readiness.
5. **Identified `.env.example` Gaps:** 8 environment variables used in code or architectural contracts are currently missing from `.env.example` (documented in Section 4).

---

## 2. Complete Environment Variable Inventory

The table below catalogs every environment variable referenced in the application, its operational scope, requirement status, usage location, secret classification, presence in `.env.example`, safe placeholder, and fallback behavior.

| Variable Name | Required in Dev? | Required in Prod? | Consuming Module / File | Scope | In `.env.example`? | Safe Placeholder | Fallback / Default Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | **NO** | **YES** | `lib/config/env.ts`<br>`lib/config/environment-check.ts`<br>`lib/deployment/deployment-readiness.ts` | **Public** | **NO** *(Gap)* | `https://taxaihelp.com` | Falls back to `NEXT_PUBLIC_SITE_URL` or `"https://taxaihelp.com"`. Validated to require HTTPS and prohibit localhost in production. |
| `NEXT_PUBLIC_SITE_URL` | **NO** | **YES** *(if APP_URL unset)* | `lib/config/env.ts`<br>`lib/seo/config.ts`<br>`lib/notifications/config.ts`<br>`lib/services/support-service.ts` | **Public** | **YES** | `https://taxaihelp.com` | Defaults to `"https://taxaihelp.com"`. Used for canonical SEO metadata and email template action links. |
| `NEXT_PUBLIC_SUPABASE_URL` | **NO** | **YES** *(for live DB)* | `lib/supabase/config.ts`<br>`lib/config/env.ts`<br>`lib/config/environment-check.ts` | **Public** | **YES** | `https://your-project.supabase.co` | Defaults to `""`. When empty, `SUPABASE_CONFIG.isConfigured()` returns `false`, causing the app to operate in in-memory store mode. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | **NO** | **YES** *(for live DB)* | `lib/supabase/config.ts`<br>`lib/config/env.ts`<br>`lib/config/environment-check.ts` | **Public** | **YES** | `your-supabase-publishable-key` | Defaults to `""`. Client and server Supabase wrappers detect placeholder or empty keys and fall back to in-memory storage. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **NO** | **NO** *(Optional alias)* | `lib/config/env.ts`<br>`lib/config/environment-check.ts` | **Public** | **NO** | `your-supabase-anon-key` | Optional alias evaluated if `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is not present. |
| `SUPABASE_SERVICE_ROLE_KEY` | **NO** | **YES** *(for backend admin)* | `lib/config/env.ts`<br>`docs/ENVIRONMENT-VARIABLES.md` | **Server-Only (SECRET)** | **NO** *(Gap)* | `your-supabase-service-role-key-placeholder` | Defaults to `undefined`. Excluded from client bundles. Used for elevated backend database queries and scheduled jobs. |
| `GEMINI_API_KEY` | **NO** | **YES** *(if AI enabled)* | `lib/ai/gemini/config.ts`<br>`lib/config/env.ts`<br>`lib/config/environment-check.ts`<br>`lib/deployment/deployment-readiness.ts` | **Server-Only (SECRET)** | **YES** | `your-server-side-gemini-api-key-placeholder` | Defaults to `""`. If unconfigured or length $\le 5$, the AI engine seamlessly falls back to the deterministic rule-based contextual reply engine (`buildPreparationSessionDeterministicReply`). In production, flagged as `MISSING` if `ai.assistant_enabled` is true. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | **NO** | **YES** *(if Stripe Elements used)* | `lib/stripe/client.ts`<br>`lib/config/env.ts` | **Public** | **YES** | `pk_test_placeholder_key_for_development` | Defaults to `"pk_test_placeholder_key_for_development"`. Used by browser payment elements. |
| `STRIPE_SECRET_KEY` | **NO** | **YES** *(if Billing enabled)* | `lib/stripe/client.ts`<br>`lib/config/env.ts`<br>`lib/config/environment-check.ts`<br>`lib/deployment/deployment-readiness.ts`<br>`lib/operations/billing-monitoring.ts` | **Server-Only (SECRET)** | **YES** | `sk_test_placeholder_key_for_development` | Defaults to `"sk_test_placeholder_key_for_development"`. Payment provider falls back to mock/staging checkout mode if key contains `"placeholder"`. In production, flagged as `MISSING` if `billing.enabled` is true. |
| `STRIPE_WEBHOOK_SECRET` | **NO** | **YES** *(if Billing enabled)* | `lib/stripe/client.ts`<br>`lib/config/env.ts`<br>`lib/config/environment-check.ts` | **Server-Only (SECRET)** | **YES** | `whsec_placeholder_webhook_signing_secret` | Defaults to `"whsec_placeholder_webhook_signing_secret"`. In production, required for HMAC-SHA256 signature verification on `/api/v1/billing/webhook`. |
| `STRIPE_PRICE_ID_PREMIUM_MONTHLY` | **NO** | **YES** *(if Premium paid plan)* | `lib/monetization/plans.ts`<br>`lib/config/env.ts` | **Server-Only** | **YES** | `price_test_premium_monthly` | Falls back to `STRIPE_PRICE_ID_PREMIUM` or `"price_test_premium_monthly"`. |
| `STRIPE_PRICE_ID_PREMIUM_ANNUAL` | **NO** | **YES** *(if Premium annual)* | `lib/monetization/plans.ts`<br>`lib/config/env.ts` | **Server-Only** | **YES** | `price_test_premium_annual` | Defaults to `"price_test_premium_annual"`. |
| `STRIPE_PRICE_ID_PREMIUM` | **NO** | **NO** *(Optional alias)* | `lib/monetization/plans.ts` | **Server-Only** | **NO** | `price_test_premium` | Legacy fallback for `STRIPE_PRICE_ID_PREMIUM_MONTHLY`. |
| `STRIPE_PRICE_ID_PROFESSIONAL` | **NO** | **YES** *(if Pro plan)* | `lib/monetization/plans.ts`<br>`lib/config/env.ts` | **Server-Only** | **YES** | `price_test_professional` | Defaults to `"price_test_professional_monthly"`. |
| `STRIPE_PRICE_ID_PROFESSIONAL_ANNUAL` | **NO** | **YES** *(if Pro annual)* | `lib/monetization/plans.ts` | **Server-Only** | **NO** *(Gap)* | `price_test_professional_annual` | Defaults to `"price_test_professional_annual"`. |
| `EMAIL_PROVIDER` | **NO** | **NO** *(Optional)* | `lib/notifications/config.ts`<br>`lib/config/env.ts`<br>`lib/config/environment-check.ts` | **Server-Only** | **YES** | `null` *(options: null, console, resend, smtp)* | Defaults to `"null"`. When `"null"`, email sending is skipped without error and in-app notifications operate normally. |
| `EMAIL_API_KEY` | **NO** | **YES** *(if provider != null)* | `lib/notifications/config.ts`<br>`lib/config/env.ts`<br>`lib/config/environment-check.ts` | **Server-Only (SECRET)** | **YES** | `your-server-side-email-api-key` | Defaults to `undefined`. Required if `EMAIL_PROVIDER` is `"resend"` or `"smtp"`. |
| `EMAIL_FROM` | **NO** | **NO** *(Optional)* | `lib/notifications/config.ts`<br>`lib/config/env.ts` | **Server-Only** | **YES** | `TaxAIHelp <notifications@taxaihelp.com>` | Defaults to `"TaxAIHelp <notifications@taxaihelp.com>"`. |
| `EMAIL_REPLY_TO` | **NO** | **NO** *(Optional)* | `lib/notifications/config.ts`<br>`lib/config/env.ts` | **Server-Only** | **YES** | `support@taxaihelp.com` | Defaults to `"support@taxaihelp.com"`. |
| `ADMIN_NOTIFICATION_EMAIL` | **NO** | **NO** *(Optional)* | `lib/notifications/config.ts`<br>`lib/config/env.ts` | **Server-Only** | **YES** | `admin@taxaihelp.com` | Defaults to `undefined`. Receives administrative and security alert notifications. |
| `ADMIN_EMAILS` | **NO** | **YES** *(Recommended)* | `lib/auth/session.ts`<br>`lib/config/env.ts` | **Server-Only** | **NO** *(Gap)* | `admin@taxaihelp.com,security@taxaihelp.com` | Defaults to `""`. Comma-delimited list of verified administrative email accounts for server-side role elevation. |
| `ADMIN_USER_IDS` | **NO** | **NO** *(Optional)* | `lib/auth/session.ts`<br>`lib/config/env.ts` | **Server-Only** | **NO** *(Gap)* | `uuid1,uuid2` | Defaults to `""`. Comma-delimited list of admin user UUIDs. |
| `BACKUP_PROVIDER` | **NO** | **NO** *(Optional)* | `lib/data/backup-provider.ts`<br>`lib/config/env.ts`<br>`lib/config/environment-check.ts` | **Server-Only** | **NO** *(Gap)* | `supabase` *(or null)* | Defaults to `NullBackupProvider` (honestly reporting `NOT_CONFIGURED` in dev/staging). |
| `CRON_SECRET` | **NO** | **YES** *(if Vercel Cron used)* | `lib/config/env.ts`<br>`docs/ENVIRONMENT-VARIABLES.md` | **Server-Only (SECRET)** | **NO** *(Gap)* | `your-random-cron-secret-token` | Defaults to `undefined`. Used to verify Vercel Cron HTTP requests via Authorization Bearer token header. |
| `NODE_ENV` | System | System | Next.js runtime, `lib/config/environment.ts`, `lib/observability/logger.ts`, `app/api/v1/auth/session/route.ts` | **Server-Only** | **YES** | `development` *(or production)* | In production, automatically set to `"production"` by Next.js / Vercel. Controls secure cookie flags and logger stdout format. |
| `APP_ENV` | **NO** | **NO** *(Optional)* | `lib/config/environment.ts`<br>`lib/config/env.ts` | **Server-Only** | **NO** *(Gap)* | `production` *(options: development, staging, production)* | Evaluated with higher precedence than `NODE_ENV`. Allows staging environments to run with `NODE_ENV=production` while identifying as `staging`. |
| `VERCEL_GIT_COMMIT_SHA` | **NO** | **NO** *(System CI)* | `lib/config/build-info.ts` | **Server-Only** | **NO** | N/A (Injected by Vercel) | Falls back to `GITHUB_SHA`, `GIT_COMMIT`, or `"local-build"`. |

---

## 3. Subsystem-by-Subsystem Audit

### 3.1 Supabase Integration
- **Client Configuration:** Consumes `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in [lib/supabase/config.ts](file:///e:/USA%20TAX%20Project/lib/supabase/config.ts).
- **Graceful Fallback:** If keys are unset or contain `"your-project"`, `isConfigured()` returns `false`, causing both client and server wrappers to return safe mock objects. In-memory data stores handle state without runtime crashes.
- **Production Requirement:** When `APP_ENV=production` or `NODE_ENV=production`, `EnvironmentCheckService` marks `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as `REQUIRED`. HTTPS is enforced.
- **Service-Role Key Security:** `SUPABASE_SERVICE_ROLE_KEY` is registered in `SECRET_ENV_KEYS` and `serverEnvSchema`. It is strictly server-only and excluded from browser exposure.

### 3.2 Google Gemini AI Integration
- **Client Configuration:** Consumes `GEMINI_API_KEY` in [lib/ai/gemini/config.ts](file:///e:/USA%20TAX%20Project/lib/ai/gemini/config.ts).
- **Graceful Fallback:** When `GEMINI_API_KEY` is absent or $\le 5$ characters, `isConfigured()` returns `false`. All user queries are routed to the deterministic rule-based contextual reply engine (`buildPreparationSessionDeterministicReply`). Real IRS formulas and taxpayer calculation context are explained deterministically without Gemini API calls.
- **Production Requirement:** Feature-dependent on `ai.assistant_enabled`. If the feature flag is `true` in production, `EnvironmentCheckService` flags a missing key as `MISSING` / `BLOCKED`.
- **Secret Security:** `GEMINI_API_KEY` is never prefixed with `NEXT_PUBLIC_` and is tested in `tests/legal-and-security.test.ts` to guarantee it is absent from client-facing configurations.

### 3.3 Stripe Payments & Monetization
- **Client Configuration:** Consumes `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in [lib/stripe/client.ts](file:///e:/USA%20TAX%20Project/lib/stripe/client.ts).
- **Graceful Fallback:** When keys are absent, fallback test placeholders (`sk_test_placeholder_key_for_development`, `whsec_placeholder_webhook_signing_secret`) are supplied. If keys contain `"placeholder"`, the payment provider automatically operates in mock/staging mode without reaching Stripe servers.
- **Production Requirement:** Feature-dependent on `billing.enabled`. When billing is active in production, both `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are mandatory.
- **Webhook Cryptographic Integrity:** `StripeClient.verifyWebhookSignature` uses standard HMAC-SHA256 (`timingSafeEqual`) with a 300-second timestamp tolerance to guard against timing attacks and replay attacks.
- **Price ID Mapping:** `lib/monetization/plans.ts` supports monthly and annual price IDs for `premium` and `professional` tiers.

### 3.4 Authentication & Session Handling
- **Session Tokens:** Supported via `Authorization: Bearer <token>` header or `taxaihelp-auth-token` cookie.
- **Cookie Security:** In [app/api/v1/auth/session/route.ts:75](file:///e:/USA%20TAX%20Project/app/api/v1/auth/session/route.ts#L75) and [app/api/v1/auth/account/delete/route.ts:85](file:///e:/USA%20TAX%20Project/app/api/v1/auth/account/delete/route.ts#L85), cookies set `secure: process.env.NODE_ENV === "production"`, enforcing HTTPS-only cookie transmission in production.
- **Admin Role Elevation:** [lib/auth/session.ts](file:///e:/USA%20TAX%20Project/lib/auth/session.ts) reads `ADMIN_EMAILS` and `ADMIN_USER_IDS` from server environment variables to grant admin privileges. In development, synthetic prefixes (`admin-`, `test-admin`) are accepted; in production, identity is verified against `ADMIN_EMAILS` or the persistent `UserProfileStore`.

### 3.5 Application URL, SEO & Canonical Domain
- **Canonical URL Resolution:** [lib/config/env.ts:getCanonicalAppUrl](file:///e:/USA%20TAX%20Project/lib/config/env.ts#L115) evaluates `NEXT_PUBLIC_APP_URL` $\rightarrow$ `NEXT_PUBLIC_SITE_URL` $\rightarrow$ `"https://taxaihelp.com"`.
- **HTTPS Enforcement:** Production validation requires that the application URL begins with `https://` and does not contain `localhost` or `127.0.0.1`.

### 3.6 Transactional Email & Notifications
- **Provider Options:** `EMAIL_PROVIDER` accepts `null`, `console`, `resend`, or `smtp`.
- **Honest Null Mode:** When set to `null` (the default), email delivery is safely bypassed, while the in-app notification center ([lib/notifications/service.ts](file:///e:/USA%20TAX%20Project/lib/notifications/service.ts)) retains and delivers all transactional alerts to the user interface.
- **Provider Key:** When `EMAIL_PROVIDER` is set to `resend` or `smtp`, `EMAIL_API_KEY` is required.

---

## 4. Discrepancies & Missing Variables in `.env.example`

Comparing the codebase against [.env.example](file:///e:/USA%20TAX%20Project/.env.example) reveals **8 environment variables** that exist in application code, schemas, or documentation but are currently omitted from `.env.example`:

1. `SUPABASE_SERVICE_ROLE_KEY`: Defined in `serverEnvSchema` and `SECRET_ENV_KEYS`, documented in `docs/ENVIRONMENT-VARIABLES.md`. Required for administrative backend Supabase operations.
2. `NEXT_PUBLIC_APP_URL`: Used in `lib/config/env.ts`, `lib/config/environment-check.ts`, and `lib/deployment/deployment-readiness.ts`. (`.env.example` currently only lists `NEXT_PUBLIC_SITE_URL`).
3. `APP_ENV`: Used in `lib/config/environment.ts` to explicitly designate `development`, `staging`, or `production` independently of `NODE_ENV`.
4. `ADMIN_EMAILS`: Consumed in `lib/auth/session.ts` to designate initial super-admin and compliance officer email addresses in production.
5. `ADMIN_USER_IDS`: Consumed in `lib/auth/session.ts` as an alternative UUID-based admin authorization list.
6. `STRIPE_PRICE_ID_PROFESSIONAL_ANNUAL`: Consumed in `lib/monetization/plans.ts:151` for annual billing on the professional tier.
7. `BACKUP_PROVIDER`: Consumed in `lib/data/backup-provider.ts` and `lib/config/environment-check.ts` (`null`, `supabase`).
8. `CRON_SECRET`: Defined in `lib/config/env.ts:43` and `docs/ENVIRONMENT-VARIABLES.md` for securing scheduled Vercel maintenance routes.

---

## 5. Security Analysis & Vulnerability Checks

| Security Check | Status | Verification Detail |
| :--- | :---: | :--- |
| **No Hardcoded Production Secrets** | **PASS** | Regex scans for `sk_live_*`, `AIzaSy*`, `whsec_*` (live), and private key headers found 0 real credentials in the codebase. |
| **No Secrets in Client Bundles** | **PASS** | `GEMINI_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `SUPABASE_SERVICE_ROLE_KEY` have no `NEXT_PUBLIC_` prefix and are excluded from client compilation by Next.js. |
| **Browser-Safe `NEXT_PUBLIC_*`** | **PASS** | Verified that all `NEXT_PUBLIC_*` variables contain only public URLs and publishable keys. |
| **Automated Log Redaction** | **PASS** | `Logger.redactSensitiveData` ([lib/observability/logger.ts:56](file:///e:/USA%20TAX%20Project/lib/observability/logger.ts#L56)) scans for `api_key`, `secret`, `token`, `password`, and `ssn`, replacing values with `[REDACTED]`. |
| **Platform Config Protection** | **PASS** | `containsSecretCredential` ([lib/validations/platform-config.ts:62](file:///e:/USA%20TAX%20Project/lib/validations/platform-config.ts#L62)) blocks any admin attempt to store secrets in dynamic configuration tables. |
| **Secure Cookie Transmission** | **PASS** | Authentication cookies enforce `secure: true` in production environments. |
| **Sanitized Error Responses** | **PASS** | `handleApiError` and `formatStandardError` completely strip internal stack traces and database details before responding to clients. |
| **Git Exclusion of Local Files** | **PASS** | `.gitignore` contains `.env`, `.env*.local`, `.env.local`, and `*.pem`. |

---

## 6. Complete Required Production Environment Variable List

Before deploying TaxAIHelp to a live production environment (e.g. Vercel Production Environment Settings), the following variables must be configured:

### 6.1 Mandatory Production Variables
```bash
# Canonical Production Application URL (must use https://, no localhost)
NEXT_PUBLIC_APP_URL=https://taxaihelp.com
NEXT_PUBLIC_SITE_URL=https://taxaihelp.com

# Supabase Production Backend
NEXT_PUBLIC_SUPABASE_URL=https://<your-production-project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-production-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-production-service-role-key>

# Google Gemini AI Production Key (Required if ai.assistant_enabled=true)
GEMINI_API_KEY=<your-production-gemini-api-key>

# Stripe Production Payments (Required if billing.enabled=true)
STRIPE_SECRET_KEY=sk_live_<your-live-secret-key>
STRIPE_WEBHOOK_SECRET=whsec_<your-live-webhook-signing-secret>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_<your-live-publishable-key>

# Stripe Production Price IDs
STRIPE_PRICE_ID_PREMIUM_MONTHLY=price_<live-premium-monthly-id>
STRIPE_PRICE_ID_PREMIUM_ANNUAL=price_<live-premium-annual-id>
STRIPE_PRICE_ID_PROFESSIONAL=price_<live-pro-monthly-id>
STRIPE_PRICE_ID_PROFESSIONAL_ANNUAL=price_<live-pro-annual-id>

# Server Runtime & Initial Admin Authorization
NODE_ENV=production
APP_ENV=production
ADMIN_EMAILS=admin@taxaihelp.com,compliance@taxaihelp.com
```

### 6.2 Optional / Feature-Dependent Production Variables
```bash
# Transactional Email (Required only if EMAIL_PROVIDER != null)
EMAIL_PROVIDER=resend # Options: null | resend | smtp
EMAIL_API_KEY=re_<your-resend-api-key>
EMAIL_FROM=TaxAIHelp <notifications@taxaihelp.com>
EMAIL_REPLY_TO=support@taxaihelp.com
ADMIN_NOTIFICATION_EMAIL=alerts@taxaihelp.com

# Backup Provider (Default: null / supabase)
BACKUP_PROVIDER=supabase

# Vercel Cron Authentication Secret
CRON_SECRET=<generated-random-32-char-token>
```

---

## 7. Exact Production Configuration Checklist

Follow this checklist prior to triggering a production deployment:

- [ ] **1. Domain & DNS Verification:**
  - Verify `taxaihelp.com` DNS records in Vercel or hosting DNS provider.
  - Verify SSL certificate provisioning and HTTPS enforcement.
- [ ] **2. Supabase Production Project Setup:**
  - Create production Supabase project in the US region.
  - Apply database schema and migrations (`supabase/schema.sql`, `supabase/migrations/`).
  - Configure Row Level Security (RLS) on all tables.
  - Copy Project URL, Anon Key, and Service Role Key into Vercel production secrets.
- [ ] **3. Google Cloud / Gemini AI Setup:**
  - Enable Gemini API in Google Cloud Console.
  - Provision a restricted production API key bounded to the production server IP/service.
  - Set `GEMINI_API_KEY` in Vercel production secrets.
- [ ] **4. Stripe Production Setup:**
  - Activate live Stripe account.
  - Create recurring subscription products for **Premium Monthly**, **Premium Annual**, **Professional Monthly**, and **Professional Annual**.
  - Copy live Price IDs into `STRIPE_PRICE_ID_*` production variables.
  - Register production webhook endpoint: `https://taxaihelp.com/api/v1/billing/webhook` listening for `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`.
  - Copy webhook signing secret (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`.
  - Copy live Secret Key (`sk_live_...`) into `STRIPE_SECRET_KEY`.
  - Copy live Publishable Key (`pk_live_...`) into `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
- [ ] **5. Transactional Email Setup (Optional):**
  - Verify domain sending authorization (DKIM, SPF, DMARC) in Resend/SendGrid.
  - Set `EMAIL_PROVIDER=resend`, `EMAIL_API_KEY=re_...`, `EMAIL_FROM`, and `EMAIL_REPLY_TO`.
  - If email is not ready at launch, keep `EMAIL_PROVIDER=null` (in-app notifications remain active).
- [ ] **6. Super-Admin Access Bootstrapping:**
  - Configure `ADMIN_EMAILS` with the primary administrator's email address.
- [ ] **7. Automated Cron Jobs (Optional):**
  - Generate a secure random string for `CRON_SECRET` and configure it in Vercel.
- [ ] **8. Pre-Flight Deployment Readiness Verification:**
  - Call `/api/v1/health` and verify database, email, AI, and billing subsystem statuses.
  - Confirm `DeploymentReadinessService.evaluateReadiness()` returns `READY`.
