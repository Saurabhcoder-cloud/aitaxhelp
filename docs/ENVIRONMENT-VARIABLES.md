# TaxAIHelp Environment Variables Inventory & Configuration Contract

## 1. Overview

TaxAIHelp enforces a strict, validated environment variable contract managed by `lib/config/env.ts` and `lib/config/environment-check.ts`.
Variables are cleanly separated into:
- **Public Client Variables**: Prefixed with `NEXT_PUBLIC_`, bundled to the browser by Next.js compiler. Must NEVER contain secrets.
- **Server-Only Variables**: Accessible exclusively within Server Components, Route Handlers, and server runtime.
- **Secret Credentials**: Cryptographic keys, webhook signing secrets, and third-party API tokens. Must NEVER be logged, committed to version control, or returned via APIs.

---

## 2. Complete Environment Variable Inventory

| Variable Name | Scope | Category | Requirement (Prod) | Default / Example | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | Public | Client Config | **REQUIRED** | `https://taxaihelp.com` | Canonical base URL used for links, SEO metadata, and callbacks. Must be HTTPS in production. |
| `NEXT_PUBLIC_SITE_URL` | Public | Client Config | Optional | `https://taxaihelp.com` | Fallback canonical site URL. |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Client Config | **REQUIRED** | `https://xyz.supabase.co` | Supabase project API gateway endpoint. Must use HTTPS. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | Client Config | **REQUIRED** | `sb_pub_...` | Safe public anon/publishable key for browser Supabase client. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Client Config | Optional | `sb_pub_...` | Alias for publishable key. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Public | Client Config | Optional | `pk_live_...` | Stripe browser publishable key for Elements/Checkout (if billing active). |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-Only | **SECRET** | **REQUIRED** | `sb_secret_...` | Administrative service-role key for backend elevated database queries. |
| `GEMINI_API_KEY` | Server-Only | **SECRET** | Feature-Dependent | `AIzaSy...` | Server key for Google Gemini AI conversational explanations. Required if `ai.assistant_enabled` is true. |
| `STRIPE_SECRET_KEY` | Server-Only | **SECRET** | Feature-Dependent | `sk_live_...` | Stripe server secret key for subscription checkouts. Required if `billing.enabled` is true. |
| `STRIPE_WEBHOOK_SECRET` | Server-Only | **SECRET** | Feature-Dependent | `whsec_...` | HMAC-SHA256 signature verification secret for Stripe billing events. |
| `EMAIL_PROVIDER` | Server-Only | Config | Optional | `null` | Active email transport: `null` (skip), `console` (dev log), `resend`, or `smtp`. |
| `EMAIL_API_KEY` | Server-Only | **SECRET** | Feature-Dependent | `re_...` | API key for transactional email provider. Required if email enabled and provider != `null`. |
| `EMAIL_FROM` | Server-Only | Config | Optional | `TaxAIHelp <notifications@taxaihelp.com>` | Sender display name and outbound address. |
| `EMAIL_REPLY_TO` | Server-Only | Config | Optional | `support@taxaihelp.com` | User reply-to routing address. |
| `ADMIN_NOTIFICATION_EMAIL`| Server-Only | Config | Optional | `admin@taxaihelp.com` | Internal alert destination for high-priority support or security alerts. |
| `ADMIN_EMAILS` | Server-Only | Config | Optional | `admin1@taxaihelp.com,admin2@taxaihelp.com` | Comma-delimited list of verified administrative accounts. |
| `ADMIN_USER_IDS` | Server-Only | Config | Optional | `uuid1,uuid2` | Comma-delimited list of admin UUIDs. |
| `BACKUP_PROVIDER` | Server-Only | Config | Optional | `null` | Backup provider identifier (`null`, `supabase_managed`, `custom_s3`). |
| `CRON_SECRET` | Server-Only | **SECRET** | Optional | `cron_sec_...` | Bearer token authorization header for automated scheduled maintenance jobs. |
| `APP_ENV` | Server-Only | Environment | Optional | `production` | Deployment environment identifier: `development`, `staging`, `production`. |
| `NODE_ENV` | Server-Only | Environment | System | `production` | Standard Node runtime mode: `development`, `production`, `test`. |

---

## 3. Secret Protection Invariants

1. **Client Isolation**: Variables lacking the `NEXT_PUBLIC_` prefix are physically excluded from client JavaScript bundles by Next.js Webpack/Turbopack compilers.
2. **Log Redaction**: All operational logs passing through `Logger` automatically redact known secret keys using `redactSecret()`.
3. **Audit Trail Safety**: Audit records created in `AuditLogStore` mask sensitive tokens with `maskToken()`.
4. **Error Sanitization**: Server-side error handlers (`formatStandardError`, `handleApiError`) omit raw exception details, credentials, and connection strings from responses.
5. **No Database Credential Storage**: Database credentials, AWS keys, or API tokens must NEVER be stored in `platform_configurations` or Supabase database rows.
