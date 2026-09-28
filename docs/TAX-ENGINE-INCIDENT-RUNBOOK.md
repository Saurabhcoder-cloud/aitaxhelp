# Tax Engine Incident Runbook

## Overview
The deterministic federal tax engine (`lib/tax-engine/`) is the authority for all tax liability calculations in TaxAIHelp. Under no circumstances may AI models (such as Google Gemini) substitute for, override, or approximate deterministic tax engine calculations.

**Criticality:** `CRITICAL`  
**Core Impact:** YES — Directly impairs statutory accuracy and user trust.

---

## 1. Incident Triggers & Classification
| Trigger | Severity | Action |
| :--- | :--- | :--- |
| Calculation throwing unhandled exception / 500 error | **SEV1** | Halt affected calculation route, preserve historical records, page tax engine owner. |
| Version drift: Rule-set or engine mismatch on active calculations | **SEV2** | Audit active version configurations; verify whether calculation is current vs. historical. |
| Validation failure rate spike (> 2% of calculation requests) | **SEV2** | Investigate input schema changes or frontend payload regressions. |
| Latency degradation (> 250ms p95 on calculation execution) | **SEV3** | Investigate CPU pressure, recursive rule evaluation, or compute bottlenecks. |

---

## 2. Emergency Operational Policy: AI Separation
> [!CAUTION]
> **STRICT PROHIBITION: NEVER FALL BACK TO GEMINI OR ANY AI MODEL FOR TAX CALCULATIONS.**
> If the deterministic tax engine is unavailable or producing statutory errors:
> 1. Mark the service status as `FAILED` or `DEGRADED`.
> 2. Present an honest, safe error message to the taxpayer: *"Tax calculation engine is temporarily unavailable. Please try again shortly."*
> 3. Do **NOT** attempt LLM-based estimation, approximation, or heuristic guessing.

---

## 3. Step-by-Step Response Procedure

### Phase 1: Detection & Triage
1. **Confirm Scope:** Identify whether errors affect all tax forms (Form 1040, Schedule C, SE, Capital Gains) or a specific calculator (e.g., Self-Employment, AMT).
2. **Review Telemetry:** Check `TaxEngineMonitor.getMetrics()` and error logs for statutory validation exceptions.
   - *Reminder: Verify logs do NOT contain taxpayer SSNs, EINs, or financial amounts.*
3. **Declare Incident:** If active calculations fail for more than 1 minute, create an incident in `/admin/operations/incidents` (`SEV1` for complete calculation failure, `SEV2` for specific calculator failures).

### Phase 2: Containment & Data Protection
1. **Preserve Historical Results:** Existing calculations stored in `tax_calculations` table must remain immutable. Never run bulk re-computations against historical returns.
2. **Stop Affected Operations:** If calculations produce invalid results, temporarily disable the specific calculator or enable Maintenance Mode for tax calculation routes.
3. **Version Check:** Inspect `engineVersion` and `rulesVersion`:
   - Verify whether production is running the expected statutory tax year rules (e.g., `2024.1.0` vs. `2025.1.0`).
   - Distinguish between `CURRENT` calculations and expected `HISTORICAL` version preservation.

### Phase 3: Root Cause Investigation
1. **Inspect Validation Errors:** Review Zod schema rejections (`lib/validations/tax.ts`) to determine if unexpected client data was submitted.
2. **Inspect Engine Brackets & Deductions:** Verify standard deduction lookup tables, tax bracket indexing, and credit phaseouts.
3. **Verify Pure Function Invariance:** Run local isolated unit tests against the tax engine package to verify deterministic outputs for standard test fixtures.

### Phase 4: Remediation & Recovery
1. **Hotfix / Patch Deployment:** Apply fixes to engine rules or logic. Verify against IRS test scenarios.
2. **Re-run Automated Test Suite:** Ensure all deterministic test vectors pass with zero variance.
3. **Deploy via CI/CD:** Follow controlled release procedure. Record deployment metadata.
4. **Health Check:** Validate via `TaxEngineMonitor.recordCalculation()` that error rates return to 0.

### Phase 5: Verification & Post-Incident
1. **Monitor for 30 minutes:** Observe calculation duration and error counts on `/admin/operations`.
2. **Close Incident:** Update incident status to `RESOLVED` and subsequently `CLOSED` with root cause summary.
3. **Conduct Post-Mortem:** Document statutory edge cases, bracket updates, or schema regressions that caused the fault.
