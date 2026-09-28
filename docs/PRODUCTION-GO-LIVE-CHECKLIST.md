# TaxAIHelp Production Go-Live Readiness Checklist

## Pre-Flight Go-Live Verification Register

This register must be reviewed and certified by technical leadership prior to launching production traffic on `taxaihelp.com`.
Items may only be marked **COMPLETE** when empirical evidence has been verified in the staging environment.

---

### 1. APPLICATION & INFRASTRUCTURE
| Checkpoint | Owner | Status | Evidence / Verification Method | Operational Notes |
| :--- | :--- | :--- | :--- | :--- |
| Canonical Domain (`taxaihelp.com`) HTTPS DNS | DevOps | PENDING | SSL/TLS certificate issued via Cloudflare / Vercel | HSTS 2-year max-age verified in `next.config.mjs` |
| Node.js Runtime Pinning | Engineering | COMPLETE | `.nvmrc` set to `20`; GitHub Actions CI workflow | Verified with `@types/node` 20.x |
| Zero Secrets in Client Bundles | Security | COMPLETE | `docs/ENVIRONMENT-VARIABLES.md` & `lib/config/env.ts` | Only `NEXT_PUBLIC_` variables accessible to browser |
| CI/CD Pipeline Automation | DevOps | COMPLETE | `.github/workflows/ci.yml` passes typecheck, lint, test | Fails fast on any error; no `\|\| true` bypasses |

---

### 2. DATABASE & MIGRATIONS
| Checkpoint | Owner | Status | Evidence / Verification Method | Operational Notes |
| :--- | :--- | :--- | :--- | :--- |
| Supabase Production Cluster Provisioned | Database Lead | PENDING | Live production project connection parameters verified | Staging and Production databases strictly isolated |
| All 8 Migrations Forward-Applied | Database Lead | COMPLETE | `docs/DATABASE-MIGRATION-RUNBOOK.md` & diagnostic service | 0 destructive keywords; 100% RLS coverage |
| RLS Enforced on All Sensitive Tables | Security | COMPLETE | Verified in `lib/deployment/migration-readiness.ts` | All user tables mandate user identity isolation |

---

### 3. AUTHENTICATION & ACCESS CONTROL
| Checkpoint | Owner | Status | Evidence / Verification Method | Operational Notes |
| :--- | :--- | :--- | :--- | :--- |
| Supabase Auth Production Gateway | Security | PENDING | Live JWT validation enabled | Local dev fallback disabled in production |
| Session Cookie Hardening | Engineering | COMPLETE | Verified in `app/api/v1/auth/session/route.ts` | `Secure: true`, `SameSite: "lax"`, `HttpOnly` |
| Admin Role-Based Access Control | Security | COMPLETE | Verified in `lib/auth/session.ts` & `AdminNav.tsx` | Server-derived admin validation; client trust banned |

---

### 4. AI TAX ASSISTANT
| Checkpoint | Owner | Status | Evidence / Verification Method | Operational Notes |
| :--- | :--- | :--- | :--- | :--- |
| Google Gemini API Production Quotas | AI Lead | PENDING | `GEMINI_API_KEY` active with enterprise quota | Deterministic engine completely independent |
| Non-Authoritative Fallback Mode | AI Lead | COMPLETE | Verified in `lib/observability/health.ts` | UI displays safe notice if Gemini is degraded |
| Usage Limit Enforcements | Engineering | COMPLETE | 10 messages/day free; 100 messages/day premium | Enforced via `ai_usage_quotas` table |

---

### 5. BILLING & PAYMENTS
| Checkpoint | Owner | Status | Evidence / Verification Method | Operational Notes |
| :--- | :--- | :--- | :--- | :--- |
| Stripe Production Webhook Signature | Billing Lead | PENDING | `STRIPE_WEBHOOK_SECRET` configured in environment | Cryptographic HMAC-SHA256 signature checked |
| Idempotent Event Processing | Engineering | COMPLETE | Verified in `lib/services/payment-provider.ts` | Duplicate event IDs safely de-duplicated |
| Graceful Billing Staging Fallback | Engineering | COMPLETE | Staging works safely without live payment charges | Real charges only occur with verified keys |

---

### 6. TRANSACTIONAL EMAIL & NOTIFICATIONS
| Checkpoint | Owner | Status | Evidence / Verification Method | Operational Notes |
| :--- | :--- | :--- | :--- | :--- |
| Outbound Domain DNS (SPF, DKIM, DMARC) | DevOps | PENDING | Resend / SMTP DNS records confirmed | Prevents deliverability failures and spoofing |
| In-App Notification Center Continuity | Engineering | COMPLETE | Verified in `lib/notifications/store.ts` | In-app center functions even if email provider null |
| Sanitized Email Content | Security | COMPLETE | Verified in `lib/notifications/templates.ts` | Zero tax liability or SSN figures in outbound emails |

---

### 7. SECURITY & ERROR PRIVACY
| Checkpoint | Owner | Status | Evidence / Verification Method | Operational Notes |
| :--- | :--- | :--- | :--- | :--- |
| Security Headers & Frame Denial | Security | COMPLETE | Verified in `next.config.mjs` | `X-Frame-Options: DENY`, `nosniff`, `HSTS` active |
| Error Sanitization & Request IDs | Security | COMPLETE | Verified in `lib/observability/errors.ts` | Zero stack traces or SQL strings returned to client |
| Immutable System Audit Trail | Security | COMPLETE | Verified in `lib/services/audit-log-store.ts` | All admin mutations recorded with correlation IDs |

---

### 8. SEO & PUBLIC ACQUISITION
| Checkpoint | Owner | Status | Evidence / Verification Method | Operational Notes |
| :--- | :--- | :--- | :--- | :--- |
| Dynamic `sitemap.xml` & `robots.txt` | Growth Lead | COMPLETE | Verified in `app/sitemap.ts` & `app/robots.ts` | Public calculators and guides fully indexed |
| Private Route Disallow Enforcement | Growth Lead | COMPLETE | Disallows `/dashboard`, `/admin`, `/api` | Prevents search engine indexing of private pages |
| Zero Tax Data in Public Metadata | Security | COMPLETE | Verified in `lib/seo/metadata.ts` | Static, generic OpenGraph tax guidance titles only |

---

### 9. LEGAL, PRIVACY & COMPLIANCE
| Checkpoint | Owner | Status | Evidence / Verification Method | Operational Notes |
| :--- | :--- | :--- | :--- | :--- |
| Statutory Disclaimers & Terms of Service | Legal | COMPLETE | Verified in `app/(public)/disclaimer/page.tsx` | Clarifies non-fiduciary informational tool status |
| Self-Service Account Data Export | Privacy | COMPLETE | Verified in `app/api/v1/auth/account/export` | JSON bundle excludes staff notes and secrets |
| Right-to-be-Forgotten Erasure | Privacy | COMPLETE | Verified in `app/api/v1/auth/account/delete` | Purges tax calculations, profiles, and reports |

---

### 10. BACKUP, RETENTION & DISASTER RECOVERY
| Checkpoint | Owner | Status | Evidence / Verification Method | Operational Notes |
| :--- | :--- | :--- | :--- | :--- |
| Automated Backup Provider Integration | DevOps | PENDING | Provider configured and reporting `HEALTHY` | System honestly reports `NOT_CONFIGURED` until set |
| Non-Destructive Restore Verification | DevOps | COMPLETE | Verified in `lib/data/restore-verification.ts` | Simulated restore drills verified without data loss |
| Legal Hold Retention Enforcement | Compliance | COMPLETE | Verified in `lib/data/legal-hold.ts` | Prevents deletion of records under regulatory hold |

---

### 11. CUSTOMER SUPPORT & MONITORING
| Checkpoint | Owner | Status | Evidence / Verification Method | Operational Notes |
| :--- | :--- | :--- | :--- | :--- |
| Support Center Intake & Internal Notes | Support Lead | COMPLETE | Verified in `app/dashboard/support/page.tsx` | Staff internal notes strictly isolated from users |
| Real-Time System Health Probes | DevOps | COMPLETE | `/api/health`, `/api/health/readiness`, `/admin` | Distinguishes app, database, and backup states |
| Centralized Incident Runbooks | Operations | COMPLETE | `docs/OPERATIONS-RUNBOOK.md` updated with DR SOPs | Covers 12 data incident recovery procedures |
