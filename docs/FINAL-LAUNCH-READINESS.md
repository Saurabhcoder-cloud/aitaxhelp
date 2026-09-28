# Final Launch Readiness Guide & Verification Matrix

## Overview
This document specifies the pre-flight verification requirements, gating criteria, and evidence standards for TaxAIHelp's production release.

> [!IMPORTANT]
> **STRICT VERIFICATION POLICY:**
> - Never mark unverified items as complete.
> - Default status prior to live execution is `NOT_READY` or `READY_WITH_WARNINGS`.
> - Do not claim uptime, SLA compliance, or backup success without authenticated operational evidence.

---

## 1. Launch Gate Categories (16 Audited Domains)

| Category | Gate Criticality | Mandatory Criteria | Failure Action |
| :--- | :--- | :--- | :--- |
| **1. Application** | `CRITICAL` | Next.js server starts cleanly; no unhandled promise rejections; critical routes return HTTP 200. | Block Launch |
| **2. Database** | `CRITICAL` | Supabase connection healthy; all migrations applied through `20260925_operations_incidents.sql`; RLS enabled on 100% of tables. | Block Launch |
| **3. Authentication** | `CRITICAL` | Supabase Auth configured; MFA enforced for Admin roles; session expiry & refresh functional. | Block Launch |
| **4. Tax Engine** | `CRITICAL` | Deterministic tax engine passing 100% statutory test vectors; rules version pinned (`2024.1.0` / `2025.1.0`); zero AI fallback. | Block Launch |
| **5. AI Assistant** | `HIGH` | Gemini API credentials valid; rate limits handled gracefully; non-authoritative disclaimer displayed. | Deploy with Warning |
| **6. Billing** | `HIGH` | Stripe live keys verified; webhook secret validated; idempotent event handling enabled. | Deploy with Warning |
| **7. Email** | `NORMAL` | Resend/SMTP configured; SPF/DKIM/DMARC records verified; template masking active. | Deploy with Warning |
| **8. Security** | `CRITICAL` | CSP, HSTS, X-Content-Type-Options headers active; sensitive data sanitizers active; zero secrets in frontend code. | Block Launch |
| **9. SEO** | `NORMAL` | Sitemap generated; robots.txt active; canonical URLs set; meta tags present on public landing pages. | Deploy with Warning |
| **10. Legal & Privacy** | `CRITICAL` | Terms of Service, Privacy Policy, IRS Circular 230 Disclaimers published; GDPR/CCPA export/deletion functional. | Block Launch |
| **11. Support** | `NORMAL` | Support ticket submission flow active; SLA targets published internally; staff assignment queue active. | Deploy with Warning |
| **12. Data Management** | `CRITICAL` | Retention policies defined; soft-delete workflows operational; audit log capture active on all mutation APIs. | Block Launch |
| **13. Backup & Recovery** | `CRITICAL` | Daily automated snapshots scheduled; restore procedure documented in `docs/DATA-MANAGEMENT-AND-RECOVERY.md`. | Block Launch |
| **14. Observability** | `HIGH` | Request latency tracking active; 5xx/4xx error counters active; PII scrubber verified in log pipeline. | Deploy with Warning |
| **15. Deployment & CI/CD** | `HIGH` | GitHub Actions workflow passing; automated rollback runbook verified; environment variables verified. | Deploy with Warning |
| **16. Incident Management** | `HIGH` | Incident store operational; severity escalation targets configured; runbooks published in `docs/`. | Deploy with Warning |

---

## 2. Verification Protocol (Staging vs. Production)

### Staging Verification Checklist
1. **Database Schema:** Execute `supabase db push` against staging; inspect pg_tables for RLS status.
2. **Determinism Test:** Execute tax calculation across all 5 filing statuses (Single, MFJ, MFS, HOH, QSS). Compare outputs against IRS reference calculations.
3. **Graceful AI Degradation:** Intentionally invalidate `GEMINI_API_KEY` on staging. Verify calculators continue to run and return correct results.
4. **Billing Webhook Test:** Run Stripe CLI `stripe trigger payment_intent.succeeded` against staging webhook URL. Verify idempotent processing.
5. **Security Scan:** Run OWASP ZAP or equivalent baseline scan against staging domain. Verify absence of sensitive data in response bodies.

### Production Cutover Protocol
1. **Maintenance Mode ON:** Enable Maintenance Mode via `/admin/operations` prior to DNS pointer switch.
2. **Apply Migrations:** Run production database migrations. Verify index health.
3. **Environment Audit:** Verify `NODE_ENV=production`, `NEXT_PUBLIC_APP_URL`, and all secrets are loaded in production environment manager.
4. **Smoke Test Critical Paths:**
   - Public home page (`/`)
   - Standard deduction calculator (`/calculators/standard-deduction`)
   - Federal income tax calculator (`/calculators/federal-income-tax`)
   - Admin operations dashboard (`/admin/operations`)
   - Launch readiness evaluator (`/admin/launch-readiness`)
5. **Disable Maintenance Mode:** Open production to public traffic.
6. **Active Monitoring Window:** Observe error rates, latency, and alert feeds for 120 minutes post-cutover.

---

## 3. Rollback Criteria
Initiate immediate rollback via `docs/ROLLBACK-RUNBOOK.md` if any of the following occur within 60 minutes of release:
- Database connectivity failure affecting > 5% of users.
- Deterministic tax engine calculation errors or unhandled statutory exceptions.
- Auth service failure preventing taxpayer login.
- Webhook signature validation failure across all Stripe traffic.
