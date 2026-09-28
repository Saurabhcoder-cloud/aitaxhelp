# AI Incident Runbook (Google Gemini Integration)

## Overview
The AI Tax Assistant (`lib/ai/`) provides explanatory context, tax educational guidance, and document navigation. It is strictly non-authoritative. The deterministic tax engine remains the sole authority on tax liabilities.

**Criticality:** `HIGH`  
**Core Impact:** NO — An outage in the AI Assistant must **never** degrade or block deterministic tax calculators, saved calculation history, tax reports, or billing.

---

## 1. Incident Triggers & Classification
| Trigger | Severity | Action |
| :--- | :--- | :--- |
| Google Gemini API 5xx / total outage | **SEV2** | Mark AI status `DEGRADED`, trigger fallback message, calculators remain operational. |
| API Rate Limit / Quota Exhaustion (`429`) | **SEV3** | Enable aggressive response caching, throttle non-essential prompts, review quota tier. |
| Gemini API Timeout (> 10,000ms p95) | **SEV3** | Lower client timeout threshold, fail fast with informative message. |
| Prompt Injection / Safety Guardrail Trigger Spike | **SEV2** | Review sanitization filters, log security signal, block abusive IPs if necessary. |

---

## 2. Graceful Degradation Principles
When Gemini experiences downtime or elevated error rates:
1. **Mark Subsystem as DEGRADED:** The AI assistant status transitions to `DEGRADED` in `/admin/operations`.
2. **Preserve Deterministic Calculators:** Tax calculators, refund estimators, and standard deduction tools continue running unaffected.
3. **Preserve Calculation History & Reports:** Taxpayers can view and export existing returns and PDF summaries without interruption.
4. **Safe User Messaging:** Return a clear, non-technical explanation in the chat interface:
   > *"The AI Tax Assistant is temporarily unavailable due to upstream provider maintenance. Your tax calculators and saved calculations remain fully functional."*
5. **No Synthetic / Hallucinated Answers:** Never attempt to generate pseudo-AI responses using fallback heuristics or stochastic models.

---

## 3. Step-by-Step Response Procedure

### Phase 1: Detection & Confirmation
1. **Check Operational Alerts:** Look for `AI_ERROR_SPIKE` or `AI_RATE_LIMITED` in `/admin/operations/alerts`.
2. **Inspect Upstream Status:** Verify the official Google Cloud Status Dashboard for Vertex AI / Gemini API availability.
3. **Validate Isolation:** Confirm that `/api/v1/tax/calculate` and other deterministic routes remain healthy and fast.

### Phase 2: Mitigation & Triage
1. **Adjust Timeout & Circuit Breaker:** If Gemini requests are hanging, ensure client-side timeout is capped at 5000ms to avoid tying up frontend connections.
2. **Review Quota & Billing:** Check Google Cloud console to verify whether billing account is in good standing or daily token quotas were reached.
3. **Audit Token Usage:** Inspect aggregate token metrics in `AiMonitor.getMetrics()` to see if an unexpected volume surge occurred.
   - *Ensure no raw user prompts or confidential tax data are examined.*

### Phase 3: Recovery & Verification
1. **Upstream Recovery:** Monitor provider status until Gemini endpoints respond with `< 1000ms` latency and `200 OK`.
2. **Canary Ping:** Send a safe, predefined smoke test prompt (e.g., *"What is the standard deduction for single filers?"*) via internal admin test endpoint.
3. **Clear Degraded State:** Set AI status back to `HEALTHY` in `AiMonitor` and resolve active operational alerts.
4. **Audit Incident Log:** Record duration, affected prompt count, and provider status in `/admin/operations/incidents`.
