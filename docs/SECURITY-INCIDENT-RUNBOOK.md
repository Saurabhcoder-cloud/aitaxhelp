# TaxAIHelp Security Incident Response Runbook

## 1. Overview & Threat Classifications

This runbook establishes response protocols for security signals, credential leakage, authentication anomalies, and unauthorized access attempts.

```
Security Signal Detected (Alert / Audit Log)
       │
       ▼
Triage & Classification (SEV1 Security vs. Non-Breach Signal)
       │
       ▼
Containment (Session Revocation / Key Rotation / IP Ban)
       │
       ▼
Audit Log Forensic Review (Zero-Tax Data Forensic Inspection)
       │
       ▼
Eradication & Remediation (Patching / RLS Hardening)
       │
       ▼
Statutory Disclosure (If Personal Data Compromised)
```

---

## 2. Standard Operating Procedures by Scenario

### Scenario 2.1: Authentication Anomaly / Brute-Force Spike
* **Detection:** `AlertService` triggers `SECURITY_SIGNAL: repeated_login_failures` (> 20 failures/min).
* **Containment:**
  1. Rate limiter automatically throttles abusive IP addresses (HTTP 429).
  2. If distributed attack, enable `security.login_rate_limit_enabled` in `/admin/configuration`.
* **Investigation:** Inspect user agents and target email domains in `audit_logs` without capturing passwords.
* **Remediation:** Invalidate affected temporary session tokens.

---

### Scenario 2.2: Administrative Authorization Bypass Attempt
* **Detection:** HTTP 403 Forbidden spikes on `/api/v1/admin/*` endpoints.
* **Containment:** Server-side `requireAdmin()` rejects non-admin requests unconditionally.
* **Investigation:** Check `AuditLogStore` for unauthorized user IDs attempting administrative actions.
* **Remediation:** Terminate offending user session; review role assignments in `public.profiles`.

---

### Scenario 2.3: Suspicious Billing Webhook Signature Failure
* **Detection:** `BillingMonitor` reports `webhook_failed: signature_failure`.
* **Containment:** Stripe webhook endpoint strictly rejects unsigned or invalid HMAC-SHA256 payloads.
* **Investigation:** Verify whether Stripe webhook secret was recently rotated or if requests originate outside Stripe IP ranges.
* **Remediation:** Re-synchronize `STRIPE_WEBHOOK_SECRET` in environment variables if rotated.

---

### Scenario 2.4: Suspected Credential or Key Exposure
* **Detection:** API key or database password committed to repository or pasted in public channels.
* **Containment:**
  1. Immediately revoke the compromised key in provider console (Supabase, Stripe, Google Cloud).
  2. Issue a new key and update the hosting platform environment variables.
  3. Re-evaluate readiness via `GET /api/v1/admin/deployment/readiness`.
* **Investigation:** Review provider access logs for unauthorized API calls during exposure window.
* **Remediation:** Invalidate cached connections and force application container restart.

---

### Scenario 2.5: Taxpayer Data Access or RLS Anomaly
* **Detection:** User reports accessing records belonging to another taxpayer, or audit anomaly.
* **Containment:** Immediately enable `platform.maintenance_mode` to suspend user data operations.
* **Investigation:** Trace failing database query against Row Level Security policies (`ENABLE ROW LEVEL SECURITY`).
* **Remediation:** Apply forward-fix migration restoring strict `auth.uid() = user_id` boundary.
