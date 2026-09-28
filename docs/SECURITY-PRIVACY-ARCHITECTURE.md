# TaxAIHelp: Security, Privacy, and Data Governance Architecture

## 1. Executive Summary & Core Mandates

TaxAIHelp is an AI-assisted US federal tax intelligence and calculation platform. Because tax calculations and financial records are deeply sensitive, the platform enforces strict security, privacy, and architectural boundaries:

1. **Deterministic Authority:** Numerical calculations (brackets, standard deductions, Schedule SE factors) are executed solely by the deterministic engine in integer cents. The AI model has zero calculation authority.
2. **Server-Derived Identity:** Client-provided `userId` parameters are strictly rejected or overridden by authenticated server session tokens.
3. **Data Minimization:** Anonymous calculator usage executes in-memory without persistence. Authenticated user records are strictly isolated.
4. **No Commercial Data Sale:** Taxpayer data, calculation inputs, and conversation histories are never sold, rented, or traded.
5. **No Client Secret Exposure:** API keys (`GEMINI_API_KEY`, Supabase service keys, payment gateway secrets) never touch client browser bundles.

---

## 2. Authentication & Identity Architecture

- **Session Tokens:** Authentication sessions are maintained via HTTP-only, secure, `SameSite=Lax` cookies (`taxaihelp-auth-token`) or `Authorization: Bearer <token>` headers.
- **Provider Layer:** Integrates with Supabase Auth (JWT verification). In offline/development mode, verifies cryptographically consistent session tokens.
- **Access Control:** Unauthenticated requests attempting to access protected endpoints receive `401 Unauthorized` with structured JSON errors.

---

## 3. Data Ownership & Row-Level Security (RLS)

All user-owned data stores enforce strict ownership filtering:

| Data Store | Table / Collection | Ownership Filter Rule | Cross-User Protection |
|---|---|---|---|
| User Profile | `profiles` | `id == authenticated_user_id` | RLS + In-Memory Check |
| Tax Profile | `tax_profiles` | `user_id == authenticated_user_id` | RLS + In-Memory Check |
| Calculations | `tax_calculations` | `user_id == authenticated_user_id` | RLS + Strict Ownership Check |
| AI Conversations | `ai_conversations` | `user_id == authenticated_user_id` | RLS + Query Isolation |
| AI Messages | `ai_messages` | `conversation_id in (user_conversations)` | RLS + Scoped Retrieval |
| Professional Leads | `professional_leads` | `user_id == authenticated_user_id` | RLS + Lead Ownership |
| Subscriptions | `user_subscriptions` | `user_id == authenticated_user_id` | RLS + Token Isolation |
| Period Usage | `usage_records` | `user_id == authenticated_user_id` | RLS + Key Prefix Isolation |

---

## 4. Administrative Privacy & Separation of Concerns

- **Role-Based Access Control (RBAC):** Admin routes enforce role verification (`super_admin`, `tax_operations_lead`, `support_specialist`, `compliance_auditor`).
- **Isolation of Internal Notes:** Professional lead records include an `internalNotes` array accessible only to authorized administrators. Internal notes are strictly excluded from taxpayer views and data export packages.
- **Immutable Audit Logs:** The `audit_logs` store maintains tamper-proof operational records (`adminUserId`, `action`, `targetType`, `targetId`, `timestamp`). Audit logs are never accessible to regular taxpayers and are not included in user exports.
- **Privileged Routes:** All `/admin/*` pages enforce `noIndex: true` and are disallowed in `robots.txt` and excluded from `sitemap.xml`.

---

## 5. AI Assistant & Gemini Security Architecture

- **Isolated Server-Side Execution:** Google Gemini models are called strictly via server-side Next.js route handlers (`app/api/v1/ai/assistant/route.ts`).
- **Prompt Sanitization:** The prompt builder attaches verified deterministic tax calculation outputs, instructs the model never to compute arithmetic independently, and strips user input for injection prevention.
- **Secret Protection:** `GEMINI_API_KEY` is loaded from process environment variables and is never exposed in client components or JavaScript bundles.
- **No Autonomous Authority:** The AI assistant functions strictly as an educational translation layer.

---

## 6. Public Acquisition & Analytics Privacy

- **Zero Financial Capture:** The public acquisition funnel event tracker (`lib/analytics/events.ts`) only accepts high-level metadata:
  - `calculatorType`, `taxYear`, `plan`, `interval`, `source`, `hasWithholding`.
- **Prohibited Data Blacklist:** Analytics strictly rejects and sanitizes:
  - Numerical wages, gross income, net profit, deductions, tax liabilities, or refund amounts.
  - Social Security Numbers (SSNs), Employer Identification Numbers (EINs), or bank account details.
  - Tax calculation snapshot objects or conversation message texts.
  - Private administrative notes.

---

## 7. User Data Rights: Export & Deletion Architecture

### 7.1 Data Portability (`GET /api/v1/auth/account/export`)
- Authenticated endpoint exporting complete personal data in machine-readable JSON format.
- Bundles: account profile, tax profile, calculation history, AI conversation threads/messages, submitted professional leads, subscription metadata, and usage counters.
- **Strict Exclusions:** Internal admin notes, system audit logs, secrets, and other users' records.

### 7.2 Right of Erasure (`POST /api/v1/auth/account/delete`)
- Permanently purges user calculations, conversations, messages, profiles, and leads.
- Requires explicit JSON confirmation payload (`confirm: true` or `confirmation: "DELETE"`).
- Automatically clears session cookies.
- Appends an immutable audit log entry (`user:account_deleted`) for accountability without destroying historical compliance logs.

---

## 8. HTTP Security Headers & Staged CSP

### Configured in `next.config.mjs`:
- `X-Frame-Options: DENY` — Clickjacking protection.
- `X-Content-Type-Options: nosniff` — MIME-type sniffing prevention.
- `Referrer-Policy: strict-origin-when-cross-origin` — Restricts cross-origin referrer leakage.
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()` — Restricts unauthorized browser features.
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` — Enforces HTTPS.
- `X-DNS-Prefetch-Control: on` — Optimizes DNS prefetching.

### Staged Content-Security-Policy (CSP) Roadmap:
Because strict CSP can disrupt Next.js inline scripts, font loading, Supabase WebSockets, and Gemini API calls if misconfigured, CSP is staged in two phases:
- **Phase 1 (Current):** Frame protection via `X-Frame-Options: DENY`, strict HSTS, and referrer policies.
- **Phase 2 (Production Launch):** Nonce-based script execution, `script-src 'self' 'nonce-...'`, `connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com https://api.stripe.com`, `frame-ancestors 'none'`.

---

## 9. Error & Logging Privacy

- **Error Sanitization:** `handleApiError` intercepts exceptions and formats client-safe responses (`code`, `message`). Raw database errors, SQL syntax, stack traces, and internal file paths are omitted in production.
- **Sanitized Logging:** Console and server loggers output structured metadata without printing sensitive taxpayer numbers or conversation bodies.

---

## 10. Support Center Data Governance & Privacy Invariants (Phase 5 Step 16)

The Support Center handles user inquiries, calculation feedback, and bug reports without duplicating taxpayer financial figures.

### 10.1 What Support Stores
- **Ticket Metadata:** Ticket reference (`TAH-YYYY-NNNNNN`), user identifier, subject, category, priority, status, timestamps, and feedback rating (1–5).
- **Messages & Replies:** User-submitted plain text descriptions, user replies, administrative responses, and system lifecycle events.
- **Safe Context References:** Zero financial figures or dollar amounts. Strictly restricted to:
  - `calculationId`, `calculatorType`, `taxYear`, `filingStatus`, `engineVersion`, `rulesVersion`, `reportId`, and `conversationId`.
- **Private Staff Notes:** Operational internal notes isolated strictly to administrative staff (`isInternal = true`).

### 10.2 What Support Intentionally Does NOT Store
- Social Security Numbers (SSNs), ITINs, or EINs
- Bank account, routing, credit card, or payment credentials
- Full tax calculation input/output snapshots
- Complete conversational transcripts with the AI Assistant
- Tax liability, refund amounts, taxable income, or wage dollar values
- Passwords, secret keys, or authentication bearer tokens

### 10.3 Admin Internal Notes Isolation
- Stored with `is_internal = true` and strictly excluded from user-facing APIs (`/api/v1/support/tickets/*`).
- Excluded from all user notifications (in-app and email).
- Excluded from user account export bundles (`/api/v1/auth/account/export`).
- Audit logging records operational creation of notes without persisting note bodies in audit metadata.

### 10.4 User Account Export & Deletion
- **Export (`AccountDataService.exportUserData`):** Includes all tickets and public messages belonging to the user (`isInternal = false`). Completely excludes admin internal notes and staff identifiers.
- **Erasure (`AccountDataService.deleteUserData`):** Permanently deletes all support tickets, messages, and internal notes associated with the purged user ID. Records an immutable lifecycle audit event (`user:account_deleted`).

### 10.5 Notification Privacy
- Support email templates (`support_ticket_created`, `support_ticket_reply`, `support_ticket_status_changed`, `support_ticket_resolved`) include only ticket reference numbers, safe subjects, and sanitized excerpts.
- Notification payloads NEVER contain tax liabilities, refund estimates, or taxpayer financial numbers.

---

## 11. Incident Response & Breach Notification Guidelines

In the event of a suspected security event or unauthorized data access:
1. **Isolation:** Affected user sessions or API tokens are immediately revoked.
2. **Audit Review:** The immutable `audit_logs` store is inspected to trace the vector and scope of impact.
3. **Notification:** If personal data is compromised, affected account holders are notified in accordance with applicable statutory privacy laws.
4. **Remediation:** Vulnerability root-cause analysis is conducted and regression test cases added.

---

## 12. Data Lifecycle, Retention, Backup & Disaster Recovery Architecture (Phase 5 Step 17)

TaxAIHelp enforces an audited data lifecycle architecture governed by data classification, retention rules, non-destructive integrity checks, and honest backup state transparency.

### 12.1 Data Classifications
The platform segments all data into five explicit tiers:
- **`SENSITIVE_TAX`**: Tax profiles, calculation inputs, calculation results, tax reports. Prohibited from telemetry, metrics, log files, health status, and administrative aggregate views.
- **`SECURITY_SENSITIVE`**: Authentication credentials, secrets, administrative configurations, immutable audit logs.
- **`CONFIDENTIAL`**: User identities, conversation context, support tickets, professional leads. Protected by strict RLS and authorization controls.
- **`INTERNAL`**: Application configuration flags, operational counters, system metrics.
- **`PUBLIC`**: Marketing blog posts, organic tax guides, static disclaimer texts.

### 12.2 Prohibited Operational Fields
The following fields are strictly excluded from logging, metrics labels, health status, and backup metadata:
`ssn`, `ein`, `wages`, `adjustedGrossIncome`, `taxableIncome`, `totalTaxLiability`, `refundAmount`, `amountOwed`, `bankRoutingNumber`, `bankAccountNumber`.

### 12.3 Retention Policies & Legal Holds
- **Configurable Retention**: Datasets specify retention modes (`USER_CONTROLLED`, `OPERATIONAL`, `SECURITY`, `AUDIT`, `CONFIGURATION`, `SYSTEM`). When no statutory retention period is mandated, the policy is honestly designated `policy_not_configured`.
- **Legal & Security Holds**: A record under an active legal hold cannot be purged by user deletion or automated retention workflows. Releases require administrative authorization with documented reasons and immutable audit trail records (`legal_hold_created`, `legal_hold_removed`).

### 12.4 Account Deletion & Export Integration
- **Account Deletion**: Distinctly categorizes data into `PURGE` (hard delete of user-owned calculations, profiles, chats, reports, tickets), `ANONYMIZE` (strip PII while retaining ledger integrity for billing records), and `RETAIN` (immutable security audit events).
- **Account Export**: Bundles user profile, calculations, reports, chats, and support tickets while completely omitting administrative notes, service credentials, and audit entries.

### 12.5 Backup Transparency & Restore Verification
- **Honest Status Disclosure**: The system distinguishes between unconfigured backups (`NOT_CONFIGURED`), degraded states, and verified backups. Unconfigured environments report `recoveryPoint: null` and never claim `HEALTHY`.
- **RPO and RTO**: Recovery Point (target 60 min) and Recovery Time (target 120 min) are explicitly documented as operational targets unless measured through empirical recovery tests.
- **Restore Verification**: Recovery readiness is verified through non-destructive simulation drills (`RestoreVerificationService`), avoiding automated or unmonitored production restoration.

