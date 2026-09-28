# Billing & Stripe Webhook Incident Runbook

## Overview
Billing and subscription state in TaxAIHelp are managed through Stripe Checkout and webhook events (`lib/billing/`, `app/api/v1/billing/`). Accuracy, idempotency, and data security are paramount.

**Criticality:** `HIGH`  
**Core Impact:** PARTIAL — Users may experience delayed subscription upgrades or tier entitlements, but tax calculation engine logic is unaffected.

---

## 1. Incident Triggers & Classification
| Trigger | Severity | Action |
| :--- | :--- | :--- |
| Webhook signature verification failure spike (> 5% of webhooks) | **SEV1** | Inspect `STRIPE_WEBHOOK_SECRET` key rotation or potential spoofing attempt. |
| Stripe Checkout API 5xx / outage | **SEV2** | Display clear checkout maintenance message; do not allow fake success state. |
| Webhook delivery failure / backlog | **SEV2** | Verify webhook endpoint availability; inspect idempotency table for lock contention. |
| Duplicate subscription event anomaly | **SEV3** | Check idempotent key deduplication in `billing_events` table. |

---

## 2. Core Operational Constraints
> [!IMPORTANT]
> - **NEVER FABRICATE PAYMENT SUCCESS:** If Stripe is unresponsive or webhook processing fails, never optimistically upgrade a user's subscription tier without an authenticated provider confirmation.
> - **NEVER STORE SENSITIVE PAYMENT DATA:** Credit card numbers, CVVs, expiration dates, and bank account credentials must NEVER enter TaxAIHelp application logs, incident notes, or database tables.
> - **IDEMPOTENCY FIRST:** All webhook processors must check `stripe_event_id` against processed events before applying tier changes.

---

## 3. Step-by-Step Response Procedure

### Phase 1: Detection & Triage
1. **Monitor Alert Triggers:** Check for `STRIPE_WEBHOOK_FAILURES` or `BILLING_ERROR_SPIKE` in `/admin/operations/alerts`.
2. **Review Billing Metrics:** Check `BillingMonitor.getMetrics()` for:
   - `webhookFailures`
   - `duplicateEvents`
   - `checkoutFailures`
3. **Verify Stripe Dashboard:** Check Stripe's official service status (status.stripe.com) and the Stripe merchant dashboard for webhook retry queues.

### Phase 2: Webhook Failure Investigation
1. **Signature Verification Failures:**
   - Verify whether Stripe webhook secret was recently rotated or environment variables were re-deployed.
   - If spoofing is suspected, log a `SECURITY_SIGNAL` and review source IP addresses.
2. **Endpoint Timeout / Database Lock:**
   - If webhooks are timing out (> 10s), check database connection pool saturation.
   - Verify that webhook handler acknowledges receipt promptly (`200 OK`) and processes heavyweight synchronization asynchronously.
3. **Event Deduplication:**
   - Check if Stripe retries are causing duplicate entitlement grants. Ensure `stripe_event_id` unique constraint in database handles replays cleanly.

### Phase 3: Subscription State Reconciliation
1. **Identify Unprocessed Events:** Export pending webhook events from Stripe Developer Dashboard.
2. **Run Manual Sync Script:** Use admin billing sync tool (`/api/v1/admin/billing/sync`) for affected customer IDs to fetch authoritative customer state directly from Stripe API.
3. **User Communication:** If users report delayed upgrades, support specialists should verify active subscription status in Stripe before manually refreshing subscription tier in admin console.

### Phase 4: Recovery & Closure
1. **Drain Webhook Retry Queue:** Ensure all pending retries from Stripe are processed successfully with HTTP 200.
2. **Verify Metrics:** Ensure `BillingMonitor.getMetrics().webhookFailures` stabilizes at 0.
3. **Update Incident Record:** Complete root cause analysis in `/admin/operations/incidents` and record affected user counts (without PII or financial values).
