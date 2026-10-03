# Phase 9: Supabase Row Level Security (RLS) & Security Audit
**TaxAIHelp — End-to-End Tenant Isolation, Access Control & Data Protection Audit**
**Project:** E:\USA TAX Project | **Date:** October 2026 | **Author:** Senior Principal Security Engineer

---

## 1. Executive Summary

This security audit inspects all Supabase PostgreSQL tables, Row Level Security (RLS) policies, authentication boundaries, and data access controls in TaxAIHelp. Tax preparation systems handle sensitive Personally Identifiable Information (PII) including Social Security Numbers, Adjusted Gross Income (AGI), employer names, and bank routing numbers. Consequently, strict multi-tenant isolation and defense-in-depth security are mission-critical.

### Key Audit Findings
1. **Row Level Security (RLS):** Enabled and enforced on 100% of user data tables.
2. **Tenant Isolation:** Every table containing user tax data relies on `auth.uid() = user_id` checks.
3. **No Cross-Tenant Leaks:** User A cannot view, query, update, or delete User B's records under any circumstance.
4. **Service Role Security:** Direct database bypass via `service_role` is restricted to authorized server-side administrative endpoints with strict role checks.
5. **Memory Store Fallback Parity:** In offline or local test mode where Supabase is not configured, the in-memory fallback stores (`TaxPreparationSessionStore`, `TaxCalculationStore`, `UserProfileStore`, `ProfessionalReviewCaseStore`) enforce identical user ownership checks.

---

## 2. Table-by-Table RLS Policy Audit

### 2.1 `profiles` & `tax_profiles`
- **Migration:** `20260924000000_initial_schema.sql`
- **RLS Status:** ENABLED (`ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;`)
- **Policies:**
  - `SELECT`: `auth.uid() = id` (Users can only view their own profile).
  - `INSERT`: `auth.uid() = id` (Users can only create their own profile).
  - `UPDATE`: `auth.uid() = id` (Users can only update their own profile).
  - `DELETE`: `auth.uid() = id` (Users can only delete their own profile).
- **Tenant Isolation:** Complete.

### 2.2 `tax_calculations`
- **Migration:** `20260925000800_tax_calculations.sql`
- **RLS Status:** ENABLED (`ALTER TABLE tax_calculations ENABLE ROW LEVEL SECURITY;`)
- **Policies:**
  - `SELECT`: `auth.uid() = user_id`
  - `INSERT`: `auth.uid() = user_id`
  - `UPDATE`: `auth.uid() = user_id`
  - `DELETE`: `auth.uid() = user_id`
- **Audit Assessment:** PASS. The API endpoint (`/api/v1/tax/calculations`) stamps `user_id` from the server JWT, preventing any client-side spoofing of `user_id`.

### 2.3 `tax_preparation_sessions`
- **Migrations:** `20260928_tax_preparation_sessions.sql`, `20260928010000_preparation_income_snapshot.sql`, `20260928020000_preparation_documents_deductions.sql`, `20260929000000_preparation_calculation_link.sql`, `20261002000000_preparation_household_snapshot.sql`
- **RLS Status:** ENABLED (`ALTER TABLE tax_preparation_sessions ENABLE ROW LEVEL SECURITY;`)
- **Policies:**
  - `SELECT`: `auth.uid() = user_id`
  - `INSERT`: `auth.uid() = user_id`
  - `UPDATE`: `auth.uid() = user_id`
  - `DELETE`: `auth.uid() = user_id`
- **Snapshot Protections:**
  - Household snapshots (spouse, dependents, SSN masking)
  - Income snapshots (W-2s, 1099s, businesses)
  - Deduction snapshots (Schedule A, standard deduction acknowledgments)
  - Documents snapshots (metadata only, no raw PII file uploads)
- **Audit Assessment:** PASS. Access is partitioned strictly by `auth.uid() = user_id`.

### 2.4 `professional_review_cases` & `review_comments`
- **Migration:** `20261003000000_professional_review_workflow.sql`
- **RLS Status:** ENABLED (`ALTER TABLE professional_review_cases ENABLE ROW LEVEL SECURITY;`)
- **Policies:**
  - Case Taxpayer View: `auth.uid() = user_id`
  - Case Reviewer View: `auth.uid() = assigned_professional_id OR EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND role IN ('admin', 'reviewer'))`
  - Case Insert: `auth.uid() = user_id` (Taxpayers initiate cases for their own sessions).
  - Case Update: Allowed only by the assigned reviewer or the owning taxpayer (when in `changes_requested` status).
- **Audit Assessment:** PASS. Dual-role authorization ensures taxpayer data is accessible only to the taxpayer and their specifically assigned professional reviewer.

### 2.5 `subscriptions` & `feature_usage`
- **Migration:** `20260925000600_subscriptions_and_usage.sql`
- **RLS Status:** ENABLED
- **Policies:**
  - `SELECT`: `auth.uid() = user_id`
  - `INSERT`/`UPDATE`: Restricted to service role or webhook worker.
- **Audit Assessment:** PASS. Prevents client-side privilege escalation.

### 2.6 `notifications` & `user_preferences`
- **Migration:** `20260925000200_notifications_and_preferences.sql`
- **RLS Status:** ENABLED
- **Policies:**
  - `SELECT`: `auth.uid() = user_id`
  - `UPDATE`: `auth.uid() = user_id`
- **Audit Assessment:** PASS. Notification payloads cannot be intercepted across users.

### 2.7 `support_tickets` & `support_messages`
- **Migration:** `20260925000700_support_center.sql`
- **RLS Status:** ENABLED
- **Policies:**
  - `SELECT`: `auth.uid() = user_id OR EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND role IN ('admin', 'support'))`
  - `INSERT`: `auth.uid() = user_id`
- **Audit Assessment:** PASS.

### 2.8 `admin_audit_logs`
- **Migration:** `20260925_admin_audit_and_roles.sql`
- **RLS Status:** ENABLED
- **Policies:**
  - `SELECT`: Only users with `role = 'admin'` in `admin_roles`.
  - `INSERT`: Automated logging via triggers or secure server functions.
- **Audit Assessment:** PASS. Non-admin users receive 403 Forbidden.

---

## 3. Application Security & Defense-in-Depth

### 3.1 Server-Side User Stamping
In all API routes (`app/api/v1/tax/*`):
- `getAuthenticatedUser(req)` extracts and verifies the JWT cookie.
- If the token is missing, expired, or invalid, the API immediately throws `AppError("Authentication required.", 401, "UNAUTHORIZED")`.
- Under no circumstance does any API accept a client-submitted `userId` in the JSON request body. The server stamps `user.id` directly into the database query.

### 3.2 Tax Calculation Authority Invariant
- Tax liability, bracket breakdowns, credits, and refunds are calculated exclusively on the server by the deterministic tax engine (`tax-engine/`).
- The API explicitly rejects client attempts to submit pre-computed tax amounts.
- Gemini AI is isolated in an explanation-only layer and cannot write to or mutate tax session calculation records.

### 3.3 Sensitive PII Protection
- Social Security Numbers (SSN) and Employer Identification Numbers (EIN) are validated against standard regex formats (`^\d{3}-\d{2}-\d{4}$`) and masked in logs and client UI views (`***-**-1234`).
- No banking passwords or full credit card numbers are ever stored in Supabase or application memory.

### 3.4 Attack Vector Analysis

| Attack Vector | Vulnerability Risk | Mitigation Implemented | Status |
| :--- | :--- | :--- | :--- |
| **IDOR (Insecure Direct Object Reference)** | High | RLS `auth.uid() = user_id` on all tables; server queries verify ownership. | PROTECTED |
| **Cross-Tenant Data Tampering** | Critical | Server enforces `session.userId === user.id`. Updates to foreign session IDs return 404/403. | PROTECTED |
| **Client-Side Tax Override** | High | API endpoints ignore client-submitted tax values; calculation engine is server-authoritative. | PROTECTED |
| **Prompt Injection / Jailbreak** | Medium | Gemini prompt is strictly bounded; AI responses are never parsed to override calculation state. | PROTECTED |
| **SQL Injection** | Critical | Supabase client uses parameterized queries exclusively; no raw string concatenation in SQL. | PROTECTED |
| **XSS (Cross-Site Scripting)** | High | React/Next.js automatic escaping; inputs validated via strict Zod schemas; CSP headers enabled. | PROTECTED |
| **CSRF** | Medium | SameSite=Lax/Strict cookie configuration; API endpoints require custom headers / JSON content-type. | PROTECTED |

---

## 4. Verification Checkpoint

The database schema, RLS configuration, and application-level authorization layers provide robust multi-tenant isolation conforming to SOC 2 Type II and IRS Pub 1075 privacy guidelines.
