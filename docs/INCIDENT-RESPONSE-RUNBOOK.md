# TaxAIHelp Production Incident Response Runbook

## 1. Incident Severity Definitions & Operational Response Targets

Operational response targets represent **internal engineering commitments** to stabilize production.

| Severity | Definition | Acknowledgement Target | Internal Update Cadence | Target Resolution Window |
| :--- | :--- | :--- | :--- | :--- |
| **SEV1** | **Critical Outage**: Core deterministic tax calculations failing or complete site unavailability. | **15 minutes** | Every 30 minutes | < 2 hours |
| **SEV2** | **Major Impairment**: Major subsystem down (AI Assistant, Stripe checkout, or Reports failing) with no workaround. | **30 minutes** | Every 60 minutes | < 4 hours |
| **SEV3** | **Moderate Issue**: Non-critical subsystem failing (Email delivery delayed, support ticket intake slow) with workaround. | **4 hours** | Every 8 hours | < 24 hours |
| **SEV4** | **Minor Defect**: Cosmetic glitch or minor administrative anomaly not impeding taxpayer calculations. | **24 hours** | As needed | Next release cycle |

---

## 2. 11-Stage Incident Lifecycle Protocol

### Stage 1: Detection
- Triggered automatically via `AlertService` or reported by an administrator.
- Register incident in `/admin/operations/incidents` using the **Declare Incident** action.
- A unique server-authoritative incident number (`INC-YYYY-NNNNNN`) is generated.

### Stage 2: Severity Assessment
- Verify scope: Does the incident affect numerical tax calculations, user data security, or platform availability?
- If statutory calculation math is returning unexpected errors, immediately classify as **SEV1**.

### Stage 3: Acknowledgement & Incident Commander (IC)
- The designated on-call engineer acknowledges the incident in the dashboard.
- For SEV1/SEV2, an Incident Commander is appointed to coordinate containment, communication, and technical recovery.

### Stage 4: Investigation
- Inspect correlated `requestId` in structured logs (`/admin/system-health`).
- Review recent database migrations and deployment releases (`/admin/deployment`).
- Check active thresholds and timing metrics (`/admin/operations/performance`).

### Stage 5: Customer Impact Assessment
- Document customer impact (e.g. *"AI guidance is temporarily disabled; deterministic tax calculators remain 100% operational"*).
- **PRIVACY INVARIANT**: Never include taxpayer names, income figures, or tax liability dollar values in incident summaries.

### Stage 6: Mitigation
- Follow Level 1 or Level 2 recovery procedures:
  - Toggle feature flag in `/admin/configuration` to disable the impaired feature.
  - Or enable platform maintenance mode (`platform.maintenance_mode = true`).

### Stage 7: Technical Recovery
- Apply hotfix, container rollback, or forward-fix migration according to subsystem runbooks.

### Stage 8: Verification
- Re-run `/api/v1/admin/operations/services` and `/api/health/readiness`.
- Execute test calculation in deterministic calculator to verify calculation engine precision.

### Stage 9: Operational Communication
- Post incident timeline event in `/admin/operations/incidents/[id]`.
- Update internal stakeholders via `ADMIN_NOTIFICATION_EMAIL` (if configured).

### Stage 10: Closure
- Transition incident status to `RESOLVED` then `CLOSED`.
- Record `rootCause` and `resolutionSummary`.

### Stage 11: Post-Incident Review (PIR)
- Within 48 hours of a SEV1/SEV2 closure, conduct a blameless post-incident review documenting:
  1. Root cause summary
  2. Timeline of events
  3. Action items to prevent recurrence
  4. Regression test cases added to `tests/`
