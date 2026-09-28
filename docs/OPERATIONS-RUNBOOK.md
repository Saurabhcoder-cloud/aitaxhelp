# TaxAIHelp Technical Operations & Incident Runbook

This document defines standard operational procedures, diagnostic endpoints, degraded-mode behaviors, and recovery runbooks for the TaxAIHelp platform.

---

## 1. Health & Readiness Endpoints

TaxAIHelp exposes three standardized diagnostic endpoints:

| Endpoint | Access | Purpose | Expected Status |
| :--- | :--- | :--- | :--- |
| `GET /api/health` | Public | Liveness check for load balancers and uptime monitoring | `200 OK` (`{ status: "ok" }`) |
| `GET /api/health/readiness` | Public | Readiness check verifying core services before routing traffic | `200 OK` (`{ status: "ready" }`) |
| `GET /api/v1/admin/system-health` | Authorized Admin | Detailed dependency diagnostics, latency metrics, and error logs | `200 OK` (Admin token required) |

### Invariant: Honest Dependency Reporting
The health subsystem never fabricates status. If an optional third-party service (such as Google Gemini or a transactional email provider) is not configured in the active environment, it reports `status: "not_configured"`.

---

## 2. Request Correlation & Log Tracing

Every incoming API request is tagged with a correlation ID:
- **Header:** `X-Request-ID`
- **Format:** `req_<timestamp_base36>_<random>` (e.g. `req_m7a8b9_x4z9p2`)
- **Tracing Flow:**
  1. The client sends or receives `X-Request-ID` in HTTP response headers.
  2. The server attaches `requestId` to all structured log entries.
  3. In error conditions, `error.requestId` is returned in the JSON response payload.
  4. Support and operations teams can locate the relevant error in the admin health dashboard using this correlation ID.

---

## 3. Incident Scenarios & Standard Operating Procedures (SOP)

### Incident 3.1: Google Gemini AI Service Outage
* **Symptoms:** Elevated `AI_PROVIDER_ERROR` or `TIMEOUT_ERROR` logs; AI assistant responses fail or hang.
* **Architectural Invariant:**
  - Gemini is strictly an explanatory assistant and **NEVER** the source of truth for numerical calculations.
  - The deterministic federal tax engine operates completely independently of Gemini.
* **Degraded Mode Behavior:**
  - Calculators, saved calculation history, tax reports, scenario comparisons, and user accounts continue operating normally.
  - The AI assistant interface displays a safe notice: *"AI Assistant is temporarily unavailable. All deterministic tax calculations remain 100% verified and unaffected."*
* **Recovery Steps:**
  1. Verify Gemini API quota and Google Cloud status.
  2. Inspect latency metrics in `/admin/system-health`.
  3. If rate-limited, ensure user-level message throttling is functioning (10 free / 100 premium per day).

---

### Incident 3.2: Transactional Email Provider Failure
* **Symptoms:** Notification dispatch timeouts (`EMAIL_PROVIDER_ERROR`); delivery records marked `failed`.
* **Degraded Mode Behavior:**
  - In-app notification center at `/dashboard/notifications` continues functioning without disruption.
  - Password recovery requests return a safe, generic message without leaking account existence or crashing.
* **Recovery Steps:**
  1. Check `EMAIL_PROVIDER` configuration in server environment (`resend`, `smtp`, `console`, or `null`).
  2. Verify API key validity and provider domain DNS records (SPF, DKIM, DMARC).
  3. In local or staging environments, set `EMAIL_PROVIDER=console` or `EMAIL_PROVIDER=null` to prevent blocking.

---

### Incident 3.3: Database / Supabase Storage Outage
* **Symptoms:** Elevated `DATABASE_ERROR` logs; authenticated dashboard actions fail.
* **Degraded Mode Behavior:**
  - Public static pages, marketing content, blog, tax guides, and standalone calculators continue to serve requests.
  - Calculations perform mathematical calculations client-side and server-side in deterministic mode without saving.
* **Recovery Steps:**
  1. Inspect Supabase project status and connection pool limits.
  2. Verify that network egress to `NEXT_PUBLIC_SUPABASE_URL` is unobstructed.
  3. Review recent audit log entries in `/admin/audit` to identify connection saturation.

---

### Incident 3.4: Deterministic Tax Engine Error
* **Symptoms:** Calculation submission returns `TAX_ENGINE_ERROR`.
* **CRITICAL ARCHITECTURAL SAFETY RULE:**
  - **NEVER** fall back to Gemini or an LLM for tax math.
  - **NEVER** silently approximate or fabricate refund or liability numbers.
  - **NEVER** silently switch to an unverified tax year.
* **Resolution Steps:**
  1. Inspect the input payload against supported tax year rules (2025 and 2026).
  2. Verify that negative income, extreme bracket edges, or unsupported credit types are properly caught by validation schemas.
  3. Ensure version metadata (`engineVersion`, `rulesVersion`) is preserved in diagnostics.

---

### Incident 3.5: Rate-Limit Spikes or Abuse
* **Symptoms:** Elevated `RATE_LIMIT_ERROR` (HTTP 429) counts in `/admin/system-health`.
* **Protection Mechanism:**
  - Server-side sliding-window rate limiters protect AI endpoints (20 req/min), password reset requests, and contact forms.
* **Resolution Steps:**
  1. Inspect the `rate_limit_triggered` metric in `/admin/system-health`.
  2. Verify whether traffic originates from a distributed source or a single abusive IP/session.
  3. Ensure reverse proxy / CDN (e.g. Cloudflare) WAF rules are enabled if traffic is malicious.

---

### Incident 3.6: Account Deletion & Data Privacy Inquiries
* **Procedure:**
  - Taxpayers can self-service delete accounts at `POST /api/v1/auth/account/delete`.
  - Self-service export is available at `GET /api/v1/auth/account/export`.
  - Account deletion purges calculations, conversations, messages, leads, notifications, and preferences.
  - A permanent audit log record (`user:account_deleted`) is appended to `AuditLogStore` preserving compliance accountability without retaining sensitive taxpayer data.

---

## 4. Operational Thresholds & Alerts

| Metric | Warning Threshold | Operational Meaning |
| :--- | :--- | :--- |
| `api_request_duration_ms` | `> 1000ms` | Slow API endpoint response |
| `tax_calculation_duration_ms` | `> 50ms` | Deterministic engine calculation latency spike |
| `db_operation_duration_ms` | `> 250ms` | Database query latency elevation |
| `ai_request_duration_ms` | `> 4000ms` | Gemini API latency or upstream congestion |
| `operation_retry_total` | `> 10 / min` | Potential transient network degradation |
| `rate_limit_triggered` | `> 50 / min` | Possible credential stuffing or prompt scraping |

---

## 5. Security & Privacy Non-Negotiables
1. **Never print passwords, auth tokens, or reset tokens in logs or diagnostics.**
2. **Never log taxpayer SSNs, EINs, bank accounts, wages, tax liabilities, or refund amounts.**
3. **Never expose stack traces or raw database error objects to end-user clients.**
4. **Never store real credentials or secrets in runbooks or version control.**

---

## 6. Admin Configuration & Feature Flag Emergency SOPs

Centralized operational control is available to authorized administrators via `/admin/configuration` or through `PATCH /api/v1/admin/config`.

> [!CAUTION]
> **TAX ENGINE IMMUTABILITY INVARIANT:**
> Tax brackets, standard deductions, FICA thresholds, self-employment formulas, and calculation logic are source-controlled and CANNOT be edited through platform configuration. Any attempt to modify tax parameters via administrative configuration is rejected at the schema and service layers (`TAX_ENGINE_IMMUTABLE`).

### SOP 6.1: Disabling AI Assistant During Gemini Outage
* **When to use:** Upstream Google Gemini outages, severe API quota depletion, or high `AI_PROVIDER_ERROR` rates.
* **Procedure:**
  1. Navigate to `/admin/configuration` -> **AI** section.
  2. Toggle `AI Assistant` to **OFF**.
  3. Confirm the operational impact in the confirmation dialog.
  4. Alternatively, execute via authenticated admin API:
     ```http
     PATCH /api/v1/admin/config/ai.assistant_enabled
     Content-Type: application/json
     { "value": false, "expectedVersion": <currentVersion> }
     ```
* **Impact:** All `/api/v1/ai/assistant` requests will reject new prompts immediately with a friendly standardized error. Existing saved conversation histories remain accessible. Deterministic calculators remain 100% operational.

### SOP 6.2: Enabling Platform Maintenance Mode
* **When to use:** Major database migrations, critical infrastructure maintenance, or severe platform-wide incidents.
* **Procedure:**
  1. Navigate to `/admin/configuration` -> **Platform** or **Maintenance** section.
  2. Toggle `Maintenance Mode` to **ON**.
  3. Optionally specify a safe maintenance message (max 500 characters, no HTML).
  4. Confirm the dangerous action dialog.
* **Invariant & Safe Bypass:**
  - Public routes return the maintenance screen / notice.
  - `/api/health` and `/api/health/readiness` remain available for load balancers.
  - `/admin/*` and admin APIs remain accessible to authenticated administrators.
  - Password recovery is not broken unnecessarily.

### SOP 6.3: Disabling Registration During Abuse / Bot Spikes
* **When to use:** Coordinated bot attacks, fake signup floods, or credential stuffing spikes.
* **Procedure:**
  1. In `/admin/configuration` -> **Authentication** section, toggle `New User Registration` to **OFF**.
  2. Confirm the action.
* **Impact:**
  - New signup attempts are rejected immediately with a standardized operational error.
  - Existing registered users can log in, access tax history, export data, and delete accounts normally.
  - Admin login remains fully accessible.

### SOP 6.4: Disabling Premium Reports During Incident
* **When to use:** Rendering pipeline congestion, storage outages, or report generation incidents.
* **Procedure:**
  1. In `/admin/configuration` -> **Reports**, toggle `Premium Reports` to **OFF**.
* **Impact:**
  - Blocks new premium report generation requests.
  - Existing saved reports remain preserved and accessible to taxpayers.

### SOP 6.5: Disabling Billing Checkout
* **When to use:** Payment gateway maintenance, webhook processing issues, or Stripe API outages.
* **Procedure:**
  1. In `/admin/configuration` -> **Billing**, toggle `Billing System` or `Premium Checkout` to **OFF**.
* **Impact:**
  - Blocks new checkout sessions with a clear availability message.
  - Existing subscriptions and entitlements remain strictly preserved. Entitlements are never revoked or granted by toggling flags.

### SOP 6.6: Restoring Configuration & Stale Version Conflicts
* **Optimistic Concurrency:**
  - All configuration records include an integer `version`.
  - When submitting a configuration change, the client or caller may pass `expectedVersion`.
  - If another administrator modified the configuration concurrently, the API rejects the mutation with HTTP 409 (`CONFIGURATION_CONFLICT_ERROR`).
  - **Resolution:** Refresh `/admin/configuration` to view the latest configuration state and re-apply changes against the new version.

### SOP 6.7: Investigating Configuration Audit History
* **Audit Trail:**
  - Every configuration change is recorded in `AuditLogStore` with action `admin:config_updated`.
  - Stored fields include `adminUserId`, `requestId`, `configKey`, `previousValue`, and `newValue`.
  - Sensitive values are sanitized (logged as `value_changed: true` rather than raw values).
  - Inspect audit logs via `/admin/audit` to review who changed a setting and when.

### SOP 6.8: Emergency Configuration Reset
* **Procedure:**
  - If an administrative misconfiguration occurs, individual keys can be patched back to their default values listed in `DEFAULT_PLATFORM_CONFIGS`.
  - In a catastrophic failure where configuration storage is unreachable, `PlatformConfigStore` automatically falls back to hardcoded, production-safe in-memory defaults.

---

## 7. Support Center Incident Handling & Standard Operating Procedures (Phase 5 Step 16)

This section outlines diagnostic and remediation procedures for customer support, issue reporting, and administrative ticket queue incidents.

### Incident 7.1: Support Queue Outage
* **Symptoms:** Dashboard `/dashboard/support` or `/admin/support` fails to load tickets or returns HTTP 500/503.
* **Diagnosis:**
  1. Inspect `/api/health/readiness` and `/admin/system-health` for database connectivity.
  2. Verify if `support.enabled` feature flag was toggled off in `/admin/configuration`.
  3. Inspect logs for `support:operation_failed` tagged with `requestId`.
* **Remediation:**
  1. If feature flag is disabled, verify reason in `/admin/audit` and re-enable via `/admin/configuration` if intentional maintenance has finished.
  2. If database is unreachable, check Supabase pool status or failover to memory cache.

### Incident 7.2: Support Database Outage
* **Symptoms:** Elevated database read/write latency or errors on `support_tickets` / `support_messages` tables.
* **Degraded Mode Behavior:**
  - `SupportStore` automatically falls back to in-memory store if configured Supabase client is disconnected.
  - Core deterministic tax calculators remain 100% operational; calculation execution does NOT depend on support database.
* **Remediation:**
  1. Check database connection pool limits.
  2. Restart database proxy if connection exhaustion occurs.
  3. Unprocessed requests return standard `DATABASE_ERROR` with correlation `requestId`.

### Incident 7.3: Support Notification Failure
* **Symptoms:** Ticket replies or creations succeed, but users report missing notification emails.
* **Diagnosis:**
  1. Check `/dashboard/notifications` in-app center — in-app notifications are stored independently of external email providers.
  2. Verify email provider status (`EMAIL_PROVIDER_ERROR` logs).
* **Remediation:**
  1. Inform users that in-app notification center at `/dashboard/notifications` is authoritative and available.
  2. Check email provider credentials and bounce logs.

### Incident 7.4: Support Abuse, Spam or Flooding
* **Symptoms:** Rapid spike in ticket creation from a single IP or user account.
* **Built-in Throttling:**
  - Ticket creation is rate limited to 5 tickets per 15 minutes per user.
  - Message replies are rate limited to 15 messages per 10 minutes per user.
* **Remediation:**
  1. If abuse bypasses user rate limits (e.g. distributed bot creation), temporarily disable `support.user_ticket_creation_enabled` in `/admin/configuration`.
  2. Note that `SECURITY` and `PRIVACY` ticket categories remain permanently available for legitimate compliance.

### Incident 7.5: Urgent Security Ticket Triage
* **Symptoms:** A ticket submitted under category `SECURITY` with `URGENT` or `HIGH` priority.
* **Procedure:**
  1. Category `SECURITY` automatically escalates ticket priority to `HIGH`.
  2. Security staff must assign the ticket immediately to a designated security lead.
  3. **STRICT INVARIANT:** Never paste exploit payloads, passwords, or raw vulnerability details into public email notifications.
  4. Communicate with the researcher/taxpayer strictly through the authenticated support ticket thread or designated PGP email.

### Incident 7.6: Privacy & Data Subject Requests
* **Symptoms:** A ticket submitted under category `PRIVACY` requesting data access, export, or deletion.
* **Procedure:**
  1. Advise the user that automated self-service data export is available at `/dashboard/settings` -> Account Export (`GET /api/v1/auth/account/export`).
  2. Advise the user that automated account erasure is available at `/dashboard/settings` -> Delete Account (`POST /api/v1/auth/account/delete`).
  3. If manual compliance review is required, log internal notes documenting verification steps before taking action.

### Incident 7.7: Support Feature Flag Lockdown
* **When to use:** Support queue maintenance, major platform migrations, or severe abuse.
* **Procedure:**
  1. Navigate to `/admin/configuration` -> **Support**.
  2. Set `support.enabled` or `support.user_ticket_creation_enabled` to **OFF**.
* **Impact:**
  - General users see a polite maintenance notice when visiting Support Center.
  - Existing tickets remain safe and inspectable by administrators.
  - `SECURITY` and `PRIVACY` category submissions continue to be accepted.

### Incident 7.8: Admin Assignment Conflict or Stale Ticket State
* **Symptoms:** Two administrators attempting to triage the same ticket simultaneously.
* **Resolution:**
  1. Inspect the ticket detail page at `/admin/support/[id]`.
  2. Internal notes display staff assignment history and timestamps.
  3. Status updates and assignment changes are tracked in `AuditLogStore`.

### Incident 7.9: Stale Ticket Cleanup
* **Procedure:**
  1. Tickets remaining in `WAITING_FOR_USER` status for over 30 days without activity may be transitioned to `RESOLVED` by administrative staff.
  2. The automated notification informs the user of resolution and provides a link to reopen if further assistance is needed.

### Incident 7.10: Escalation Procedure
* **Tier 1 (Support Operations):** Account inquiries, billing questions, calculator usage guidance.
* **Tier 2 (Tax Engine / Product Lead):** Discrepancies in tax calculation math, rules updates, statutory bracket questions. Prefilled with safe metadata (`taxYear`, `calculatorType`, `rulesVersion`).
* **Tier 3 (Security & Privacy Lead):** Vulnerability disclosures, privacy rights, unauthorized account access inquiries.
* **Tier 4 (Engineering / Infrastructure):** Database connectivity outages, rate limiter issues, notification pipeline failure.

---

## 8. Data Recovery & Integrity Incident Procedures (Phase 5 Step 17)

Every data incident must follow the 5-phase lifecycle:
1. **Detection**: Monitoring alert, health probe, or administrator discovery.
2. **Containment**: Preventing spread, corruption, or unintentional deletions.
3. **Recovery**: Executing documented remediation steps.
4. **Verification**: Validating data consistency with non-destructive integrity checks.
5. **Post-Incident Review**: Documenting root cause, timeline, and preventive actions in `docs/INCIDENT-REPORTS.md`.

---

### Procedure 8.1: Database Outage
* **Detection:** `DATABASE_ERROR` spikes; `/api/health/readiness` reports `database: "error"` or `"degraded"`.
* **Containment:** Keep traffic on statutory static routes and client-side calculators. Disable background mutation jobs.
* **Recovery:** Check Supabase managed cluster status, inspect connection pool saturation, restore network routing.
* **Verification:** Run `GET /api/v1/admin/data-health` and check `database.status === "ok"`.
* **Post-Incident Review:** Document downtime duration, connection pool metrics, and upstream provider status.

---

### Procedure 8.2: Backup Unavailable
* **Detection:** `/admin/data-health` reports backup status as `NOT_CONFIGURED` or `FAILED`.
* **Containment:** Restrict non-essential schema changes or batch operations until backup connectivity is re-established.
* **Recovery:** Review backup provider credentials in infrastructure environment variables; trigger `POST /api/v1/admin/data-health/backup/verify`.
* **Verification:** Confirm provider status responds with verified state and legitimate recovery point timestamp.
* **Post-Incident Review:** Record backup outage window against configured RPO targets.

---

### Procedure 8.3: Backup Verification Failure
* **Detection:** `data:backup_status` logs with status `FAILED` or `DEGRADED`.
* **Containment:** Freeze scheduled automated data purges.
* **Recovery:** Check provider network egress, bucket permissions, or snapshot creation quota. Run manual verification via `/admin/data-health`.
* **Verification:** Provider returns valid snapshot metadata without fabrication.
* **Post-Incident Review:** Analyze provider API error codes and update retry policies.

---

### Procedure 8.4: Restore Verification Failure
* **Detection:** `RestoreVerificationService` records status `FAILED` during periodic drill.
* **Containment:** Block deployment of pending destructive database migrations.
* **Recovery:** Review drill logs in `/admin/data-health`; inspect schema compatibility differences between backup snapshot and current schema version.
* **Verification:** Re-run simulated drill via `POST /api/v1/admin/data-health/recovery/verify` and verify status `PASSED`.
* **Post-Incident Review:** Update schema synchronization runbooks and test scripts.

---

### Procedure 8.5: Data Integrity Failure
* **Detection:** `DataIntegrityService` reports `ATTENTION_REQUIRED` or `ERROR` severity checks.
* **Containment:** Do NOT perform bulk manual deletions. Isolate affected foreign key relationships.
* **Recovery:** Identify specific failing checks (e.g. broken user references). Apply targeted migrations or repair scripts.
* **Verification:** Trigger `POST /api/v1/admin/data-health/integrity/check` and confirm 0 critical errors.
* **Post-Incident Review:** Trace the application code path that permitted orphan generation.

---

### Procedure 8.6: Orphaned Records Remediation
* **Detection:** `/admin/data-health` shows orphaned records detected (e.g. orphan calculation, conversation, or report).
* **Containment:** Automated orphan deletion is strictly disabled to prevent unintended data loss.
* **Recovery:** Audit parent user records to verify whether parent was intentionally purged or corrupted. Archive or associate orphaned records through controlled migration scripts.
* **Verification:** Confirm orphan count in `/admin/data-health` returns to 0.
* **Post-Incident Review:** Validate cascade-delete or reference-nullification logic in application repositories.

---

### Procedure 8.7: Database Migration Failure
* **Detection:** Migration runner errors or server startup failure after deploying a new SQL migration.
* **Containment:** Immediately stop deploying subsequent migrations. Roll back application servers to previous version.
* **Recovery:** Inspect migration error in Supabase CLI or SQL editor. Roll back schema if safe, or apply forward idempotent patch.
* **Verification:** Verify table structure and indexes via `/api/v1/admin/data-health`.
* **Post-Incident Review:** Update pre-deployment staging validation checklist.

---

### Procedure 8.8: Accidental Deletion Incident
* **Detection:** Taxpayer or admin reports missing records or unexpected deletion event in `audit_logs`.
* **Containment:** Suspend any active retention cleanup jobs immediately.
* **Recovery:** Identify snapshot recovery point preceding the incident. Initiate targeted point-in-time recovery to staging environment to recover affected records.
* **Verification:** Ensure recovered records match taxpayer authorization; verify no financial values were altered.
* **Post-Incident Review:** Add safety confirmation barriers or legal hold safeguards.

---

### Procedure 8.9: Account Deletion Verification
* **Detection:** Routine compliance check or user inquiry regarding right-to-be-forgotten execution.
* **Containment:** Verify deletion plan via `RetentionPolicyService.getAccountDeletionPlan(userId)`.
* **Recovery:** Ensure user-owned records (calculations, profiles, reports, conversations) are marked `PURGED`, billing records are `ANONYMIZED`, and audit logs are `RETAINED`.
* **Verification:** Verify that query for `userId` across active tables returns empty.
* **Post-Incident Review:** Document successful privacy compliance in audit register.

---

### Procedure 8.10: Retention Cleanup Incident
* **Detection:** Retention cleanup job reports unexpected failure or counts higher than dry-run preview.
* **Containment:** Retention cleanup strictly requires `{ confirm: true }` and dry-run execution beforehand. Halt job if counts deviate.
* **Recovery:** Inspect cleanup audit log `admin:retention_cleanup_executed`. Review blocked records.
* **Verification:** Run `DataIntegrityService.runAllChecks()` to ensure no broken references remain.
* **Post-Incident Review:** Adjust retention age rules and preview thresholds.

---

### Procedure 8.11: Legal Hold Handling
* **Detection:** Legal or regulatory notice requires preservation of specific user or transaction data.
* **Containment:** Apply legal hold via `LegalHoldService.createHold({ dataset, recordId, reason, adminUserId })`.
* **Recovery:** Records under active hold are completely blocked from automated or user-initiated deletion workflows.
* **Verification:** Verify that `LegalHoldService.getActiveHolds()` lists the hold, and dry-run cleanup indicates record is blocked.
* **Post-Incident Review:** Maintain external legal counsel tracking ticket and review hold status quarterly.

---

### Procedure 8.12: RPO / RTO Target Assessment
* **Detection:** Quarterly disaster recovery audit or infrastructure review.
* **Containment:** If backup recovery point is older than target RPO (60 minutes), flag degraded state.
* **Recovery:** Optimize backup snapshot frequency and test recovery automation pipelines.
* **Verification:** Document measured recovery time against target RTO (120 minutes) during restore drill simulations.
* **Post-Incident Review:** Publish updated target vs. measured figures in the disaster recovery dashboard.

---

## 9. Production Operational Controls & Launch Readiness (Step 19)

### 9.1 Operations Administration Hub
- **Portal URL:** `/admin/operations`
- **Sub-pages:**
  - Incidents: `/admin/operations/incidents` & `/admin/operations/incidents/[id]`
  - Alerts: `/admin/operations/alerts`
  - Performance: `/admin/operations/performance`
  - Launch Readiness: `/admin/launch-readiness`
- **Authorization:** Only authenticated administrative roles (`super_admin`, `admin`, `compliance_officer`, `support_specialist` with least-privilege scoping).

### 9.2 Incident Life Cycle Management
- **Format:** IDs generated as `INC-YYYY-NNNNNN` with non-repeating sequences.
- **States:** `DETECTED` → `INVESTIGATING` → `IDENTIFIED` → `MITIGATING` → `MONITORING` → `RESOLVED` → `CLOSED`.
- **Severities:** `SEV1` (Critical/Emergency), `SEV2` (Major), `SEV3` (Moderate), `SEV4` (Low/Informational).
- **Audit Logging:** Every transition is recorded with timestamp, actor, event type, and sanitized public/internal notes.
- **Strict Privacy Invariant:** No SSNs, financial figures, refund amounts, tax inputs, or cardholder secrets may ever be entered in incident summaries or event notes.

### 9.3 Operational Alerting & Security Signals
- **Alert Invariant:** Errors do not auto-create incidents. High-frequency exceptions trigger operational alerts (`OPERATIONAL_ALERT`) which administrators can review, acknowledge, resolve, or escalate into an incident.
- **Security Signals:** Elevated 401/403 attempts, webhook signature failures, or route rate limits generate `SECURITY_SIGNAL` alerts without automated profiling or declaring an unverified attack.

### 9.4 Pre-Flight Launch Readiness Gate
- **Portal URL:** `/admin/launch-readiness`
- **Evaluation:** Automated pre-flight check across 16 critical platform categories (`lib/operations/launch-readiness.ts`).
- **Gating Status:** Releases must not be approved if any `CRITICAL` service is `BLOCKED` or `NOT_READY`.
- **Target vs. Measured Rule:** Service targets (e.g. 99.9% availability, 500ms latency) are internal benchmarks and are never presented as measured results until authentic production telemetry is captured.



