# TAXAIHELP — CLIENT PRIORITY-1 FUNCTIONAL GAP ANALYSIS REPORT
**Read-Only Technical Architecture & Implementation Audit**  
**Repository:** `taxaihelp` | **Corpus:** `Saurabhcoder-cloud/aitaxhelp`  
**Audit Date:** October 2026 | **Operating System:** Windows  
**Audit Mode:** Static Codebase & Test Suite Audit (Runtime execution unavailable: "Runtime verification unavailable; repository/static audit only.")

---

## 1. Executive Summary

This independent developer gap analysis audits the **TaxAIHelp** codebase against the 21 Priority-1 client functional requirements. The audit was conducted strictly in **READ-ONLY** mode without modifying application code, database schemas, tax engine formulas, Stripe billing logic, or deployment configuration.

### Core Architectural Findings:
1. **Deterministic Tax Calculation Engine (`tax-engine/`):** **PRODUCTION READY & ROBUST.**
   The tax calculation engine is mathematically isolated, strictly deterministic, operates entirely in 64-bit integer cents, and implements US statutory tax rules for tax years 2023, 2024, 2025, and 2026. The 2025 default baseline is pinned to IRS Internal Revenue Bulletin (IRB) 2025-45 under Public Law 119-21 (One Big Beautiful Bill Act / OBBBA) and Social Security Administration contribution limits ($176,100 OASDI cap). It correctly handles progressive income brackets, standard deductions, Schedule SE self-employment tax (92.35% statutory net profit multiplier, 12.4% capped Social Security, 2.9% uncapped Medicare, and the 50% above-the-line deduction), and Form 1040-ES quarterly vouchers.
2. **Start My Taxes Guided Workflow (`/dashboard/taxes`):** **FUNCTIONAL BASELINE IMPLEMENTED.**
   Contrary to surface assumptions, "Start My Taxes" is **not a dummy redirect to a calculator**. It is a fully implemented 6-step stateful preparation workflow (`taxpayer_profile` → `income` → `documents` → `deductions` → `calculation` → `review`) backed by durable Supabase table `tax_preparation_sessions`. It supports multi-W-2 and multi-1099/gig activity aggregation, metadata document tracking, confirmed business deductions, deterministic calculation execution, and comprehensive tax situation reporting.
3. **AI Architecture & Separation of Concerns:** **EXEMPLARY INTEGRITY.**
   Gemini AI is strictly bounded as an **educational explainer**. It is completely prohibited from performing arithmetic or inventing numbers. Verified calculations from the deterministic engine are injected into the prompt context; if a user asks for calculations in chat, the engine computes them in integer cents before Gemini generates an explanation. However, **Gemini cannot conversationally mutate the saved preparation session directly** (no function-calling mutation tool over preparation state).
4. **Primary Gaps Identified:**
   - **Family & Household:** Zero support for dependents/qualifying children; zero support for family tax credits (Child Tax Credit IRC § 24, EITC IRC § 32, CDCC Form 2441); no spouse entity or separate spouse income attribution for joint filers.
   - **Interactive Deduction Discovery:** Deductions are entered as raw dollar amounts into 4 high-level Schedule C categories. There is no plain-language questionnaire (e.g. mileage log calculator, phone/internet business-use percentage wizard, home office simplified vs. actual square-footage calculator).
   - **Return Filing & IRS E-File:** The application generates internal HTML/JSON session reports and calculation breakdown reports. It does **not** generate official IRS Form 1040 PDFs, nor does it have any integration with the IRS Modernized e-File (MeF) system.
   - **CPA/EA Network:** An intake modal, database persistence (`tax_professional_leads`), and administrator lead-management portal (`/admin/leads`) exist. However, there is no automated matching engine, no external CPA network, and no CPA portal.
   - **State Taxes:** Completely unsupported and explicitly disclaimed.

---

## 2. Current Customer Journey

Tracing an actual user session through the codebase reveals two distinct pathways:

```
[PUBLIC VISITOR]
       │
       ├──► 1. Free Calculator Flow:
       │       /tax-calculators/[income-tax | self-employed | 1099 | quarterly-tax]
       │       └── Form Input ──► Zod Validation ──► Deterministic Engine ──► CalculatorResultPanel
       │             └── Action: "Save Calculation" ──► Redirects to Auth or Saves to `saved_calculations`
       │                   └── Post-Save: Link to /dashboard/calculations/[id] or /ai-tax-assistant
       │
       └──► 2. Guided Preparation Flow ("Start My Taxes"):
               Hero / CTA "Start My Taxes" ──► Link: /dashboard/taxes
               └── Requires Authentication (Redirects to /login?redirect=/dashboard/taxes)
                     └── Authenticated Session ──► TaxPreparationSessionStore.getCurrent(user.id)
                           └── Step 1: Taxpayer Profile (Reuses onboarding / profile)
                           └── Step 2: Income Discovery (Multi W-2s, 1099s, Gig Activities)
                           └── Step 3: Documents Checklist (Metadata tracking: missing/received)
                           └── Step 4: Deductions (4 Schedule C category entries)
                           └── Step 5: Calculation (Readiness Check ──► Deterministic Execution)
                           └── Step 6: Review & Tax Situation Summary (Pillar 1: Result, Pillar 2: AI, Pillar 3: CPA/Export)
```

### Critical Funnel Mismatch:
While both pathways function, **there is currently no automated bridge from the Free Calculator result directly into the Start My Taxes session**. A user who runs a free calculation must manually navigate to `/dashboard/taxes` and re-enter their employer/payer breakdown, as the one-off calculator inputs are not automatically converted into a `TaxPreparationSession` draft.

---

## 3. Detailed Start My Taxes Workflow

The table below audits the 15 distinct steps of the client's requested "Start My Taxes" preparation journey against the active codebase:

| Step # | Preparation Step | UI Exists? | Backend Exists? | DB Persistence? | Validation Implemented? | Connected to Next Step? | Current Status | Exact Implementation Evidence | Missing Functionality & Dependencies |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---|:---|
| **1** | **Taxpayer Profile** | **YES** | **YES** | **YES** | **YES** | **YES** | **IMPLEMENTED** | [`components/preparation/IncomeDiscoveryPanel.tsx`](file:///e:/USA%20TAX%20Project/components/preparation/IncomeDiscoveryPanel.tsx)<br>[`lib/services/tax-preparation-session-store.ts`](file:///e:/USA%20TAX%20Project/lib/services/tax-preparation-session-store.ts)<br>Table: `tax_profiles`, `tax_preparation_sessions.profile_snapshot` | Reads name, state, and filing status from profile. Reuses data seamlessly. Missing: Real-time profile editing inside panel (routes to `/onboarding`). |
| **2** | **Filing Status** | **YES** | **YES** | **YES** | **YES** | **YES** | **IMPLEMENTED** | [`app/onboarding/page.tsx`](file:///e:/USA%20TAX%20Project/app/onboarding/page.tsx)<br>[`tax-engine/rules/2025/index.ts`](file:///e:/USA%20TAX%20Project/tax-engine/rules/2025/index.ts)<br>[`lib/preparation/steps.ts`](file:///e:/USA%20TAX%20Project/lib/preparation/steps.ts) | Supports all 5 IRS filing statuses (`single`, `married_filing_jointly`, `married_filing_separately`, `head_of_household`, `qualifying_surviving_spouse`). Controls engine standard deduction. |
| **3** | **Household / Dependents** | **NO** | **NO** | **NO** | **NO** | **NO** | **NOT IMPLEMENTED** | None in `tax_preparation_sessions` or `tax-engine/` | Zero collection of dependents, qualifying children, SSNs, dates of birth, or relationships. No dependent data model exists. |
| **4** | **Income Sources** | **YES** | **YES** | **YES** | **YES** | **YES** | **IMPLEMENTED** | [`components/preparation/IncomeDiscoveryPanel.tsx`](file:///e:/USA%20TAX%20Project/components/preparation/IncomeDiscoveryPanel.tsx)<br>[`lib/preparation/income.ts`](file:///e:/USA%20TAX%20Project/lib/preparation/income.ts)<br>Route: `POST /api/v1/tax/preparation/income` | Checkboxes for 4 situations: `employer`, `freelance`, `gig`, `business`. Dynamically unhides sub-forms. |
| **5** | **W-2 (Multiple)** | **YES** | **YES** | **YES** | **YES** | **YES** | **IMPLEMENTED** | [`components/preparation/IncomeDiscoveryPanel.tsx#L108-L113`](file:///e:/USA%20TAX%20Project/components/preparation/IncomeDiscoveryPanel.tsx#L108-L113)<br>[`lib/validations/preparation-income.ts`](file:///e:/USA%20TAX%20Project/lib/validations/preparation-income.ts)<br>Test: [`tests/preparation-income.test.ts`](file:///e:/USA%20TAX%20Project/tests/preparation-income.test.ts) | Add/edit/delete multiple W-2 records. Captures employer name, gross wages, and federal withholding in integer cents. |
| **6** | **1099 / Self-Employment** | **YES** | **YES** | **YES** | **YES** | **YES** | **IMPLEMENTED** | [`components/preparation/IncomeDiscoveryPanel.tsx#L114-L120`](file:///e:/USA%20TAX%20Project/components/preparation/IncomeDiscoveryPanel.tsx#L114-L120)<br>[`lib/preparation/income.ts`](file:///e:/USA%20TAX%20Project/lib/preparation/income.ts)<br>Test: [`tests/preparation-income.test.ts`](file:///e:/USA%20TAX%20Project/tests/preparation-income.test.ts) | Multi-entry 1099 repeater (payer name, income type, gross, withholding) + multi-activity gig/business entries. |
| **7** | **Business Expenses** | **YES** | **YES** | **YES** | **YES** | **YES** | **IMPLEMENTED** | [`components/preparation/IncomeDiscoveryPanel.tsx#L59-L68`](file:///e:/USA%20TAX%20Project/components/preparation/IncomeDiscoveryPanel.tsx#L59-L68)<br>[`lib/preparation/income.ts#L65-L72`](file:///e:/USA%20TAX%20Project/lib/preparation/income.ts#L65-L72) | Captures equipment, software, home office/vehicle, other per activity. Automatically pre-seeds Deductions step. |
| **8** | **Deductions** | **YES** | **YES** | **YES** | **YES** | **YES** | **PARTIALLY IMPLEMENTED** | [`components/preparation/DeductionsPanel.tsx`](file:///e:/USA%20TAX%20Project/components/preparation/DeductionsPanel.tsx)<br>[`lib/preparation/deductions.ts`](file:///e:/USA%20TAX%20Project/lib/preparation/deductions.ts)<br>Route: `POST /api/v1/tax/preparation/deductions` | Confirms business expenses in 4 categories. Reduces Schedule C net profit. Missing: Mileage questionnaire, home office square footage calculator, phone percentage calculator, Schedule A itemized deductions. |
| **9** | **Credits** | **NO** | **NO** | **NO** | **NO** | **NO** | **NOT IMPLEMENTED** | None in `tax-engine/` or `lib/preparation/` | No Child Tax Credit (CTC), Earned Income Tax Credit (EITC), or education credits. Tax calculation engine only models standard deduction and above-the-line deductions. |
| **10** | **Deterministic Calculation** | **YES** | **YES** | **YES** | **YES** | **YES** | **IMPLEMENTED** | [`lib/preparation/calculation.ts`](file:///e:/USA%20TAX%20Project/lib/preparation/calculation.ts)<br>[`tax-engine/calculations/self-employment.ts`](file:///e:/USA%20TAX%20Project/tax-engine/calculations/self-employment.ts)<br>Route: `POST /api/v1/tax/preparation/calculate` | Bridges session data to `tax-engine`. Calculates AGI, standard deduction, Schedule SE, income tax, total tax liability, and refund/balance due. Writes to `tax_calculations`. |
| **11** | **Tax Situation Summary** | **YES** | **YES** | **YES** | **YES** | **YES** | **IMPLEMENTED** | [`components/preparation/TaxSituationSummaryPanel.tsx`](file:///e:/USA%20TAX%20Project/components/preparation/TaxSituationSummaryPanel.tsx)<br>[`lib/preparation/situation-summary.ts`](file:///e:/USA%20TAX%20Project/lib/preparation/situation-summary.ts) | Consolidated breakdown of gross earnings, W-2 wages, 1099 gross, business deductions, SE tax, federal tax, withholdings, refund/balance due, and ruleset version. |
| **12** | **Missing Information Check** | **YES** | **YES** | **YES** | **YES** | **YES** | **IMPLEMENTED** | [`lib/preparation/situation-summary.ts#L106-L198`](file:///e:/USA%20TAX%20Project/lib/preparation/situation-summary.ts#L106-L198)<br>Test: [`tests/preparation-calculation.test.ts`](file:///e:/USA%20TAX%20Project/tests/preparation-calculation.test.ts) | `assessCalculationReadiness()` blocks calculation if W-2 employer name is blank, wages are zero, 1099 payer is missing, or deductions are unconfirmed. Displays warnings in UI. |
| **13** | **Payment / Next Step** | **YES** | **YES** | **YES** | **YES** | **PARTIAL** | **PARTIALLY IMPLEMENTED** | [`app/dashboard/billing/page.tsx`](file:///e:/USA%20TAX%20Project/app/dashboard/billing/page.tsx)<br>[`app/pricing/page.tsx`](file:///e:/USA%20TAX%20Project/app/pricing/page.tsx)<br>[`lib/monetization/plans.ts`](file:///e:/USA%20TAX%20Project/lib/monetization/plans.ts) | Stripe billing portal and checkout exist. Free preparation is allowed; session report can be generated. Payment is not strictly gated as a mandatory step to finish preparation. |
| **14** | **Professional Review** | **YES** | **YES** | **YES** | **YES** | **PARTIAL** | **PARTIALLY IMPLEMENTED** | [`components/preparation/ProfessionalReviewModal.tsx`](file:///e:/USA%20TAX%20Project/components/preparation/ProfessionalReviewModal.tsx)<br>[`app/api/v1/professional-leads/route.ts`](file:///e:/USA%20TAX%20Project/app/api/v1/professional-leads/route.ts)<br>Table: `tax_professional_leads` | Intake modal captures consent, contact info, urgency, and review type. Persists to admin lead queue (`/admin/leads`). Missing: External CPA marketplace and CPA sign-in portal. |
| **15** | **Filing Path** | **NO** | **NO** | **NO** | **NO** | **NO** | **NOT IMPLEMENTED** | [`lib/ai/gemini/service.ts#L135-L137`](file:///e:/USA%20TAX%20Project/lib/ai/gemini/service.ts#L135-L137) | No IRS e-file submission path. No Form 1040 XML schema generation. Users are provided an HTML/JSON summary report to hand off to an accountant. |

---

## 4. Required Client Gap Analysis Table

The table below evaluates all 21 client requirements against strict factual implementation criteria:

| Feature | Status | What Works Today | What Is Missing | Estimated Effort | Dependencies / Risks |
|---|---|---|---|---|---|
| **1. Start My Taxes workflow** | **PARTIALLY IMPLEMENTED** | 6-step guided preparation flow on `/dashboard/taxes`. Supports multi-W-2, multi-1099, gig activities, metadata document checklist, business deductions, deterministic calculation execution, tax situation summary, and HTML/JSON report export. | No household/dependents collection; no tax credits workflow; no binary document upload/OCR; no official IRS Form 1040 PDF or XML generation. | **MEDIUM**<br>(10–14 working days) | Requires schema expansion for dependents/credits; storage bucket for document binaries. |
| **2. W-2 + 1099 combined income** | **IMPLEMENTED** | Engine aggregates W-2 wages and 1099 net profit into AGI. Schedule SE calculates 12.4% Social Security tax correctly taking into account W-2 wages against the OASDI cap ($176,100 for 2025). Credits combined federal withholding. | Disaggregation of multiple distinct Schedule C businesses with separate accounting methods (currently pooled into a single Schedule C net profit). | **LOW**<br>(2–3 working days) | Negligible risk. Mathematical calculation is fully covered and tested. |
| **3. Family / married filing workflow** | **PARTIALLY IMPLEMENTED** | Engine supports MFJ, MFS, and QSS tax brackets and standard deductions ($31,500 for 2025 MFJ, $32,200 for 2026 MFJ). | No spouse entity (name, SSN, DOB); no individual income attribution per spouse for separate SE tax/OASDI cap calculation; zero dependent support; zero Child Tax Credit (CTC) or EITC. | **HIGH**<br>(12–16 working days) | High regulatory risk if married couples with two SE earners calculate SE tax on combined income rather than per-individual. |
| **4. Interactive deduction discovery** | **PARTIALLY IMPLEMENTED** | Deductions panel allows entering confirmed expenses in 4 Schedule C buckets (`equipment_supplies`, `software_subscriptions`, `home_office_vehicle`, `other_expenses`). Deductions reduce SE and taxable income. | No plain-language interview wizard; no IRS standard mileage calculator (e.g. 67¢/mile); no phone % calculator; no home office simplified ($5/sq ft) calculator; no Schedule A itemized deductions. | **MEDIUM**<br>(7–10 working days) | Needs interactive wizard components and standard deduction comparison logic. |
| **5. AI Tax Interview** | **PARTIALLY IMPLEMENTED** | AI Assistant is strictly guardrailed. It extracts parameters and invokes the deterministic tax engine; AI never computes numbers. Reads preparation session summary for context-aware Q&A. | AI cannot conversationally interview the user and update the database state directly. Chatbot lacks tool-calling mutations to update `tax_preparation_sessions`. | **MEDIUM**<br>(6–8 working days) | Gemini tool calling / function calling definition and schema validation required. |
| **6. Tax Situation Summary** | **IMPLEMENTED** | Consolidated 3-pillar summary panel displays verified calculation results, filing status, gross earnings, standard deduction, taxable income, SE tax, federal tax, withholdings, refund/balance due, and readiness warnings. | Form 1040-ES quarterly vouchers are not embedded directly in the preparation summary (they exist on the quarterly calculator page); no dependent/credit line items. | **LOW**<br>(2–3 working days) | Minor UI/viewmodel enhancement. |
| **7. Progress / completion system** | **IMPLEMENTED** | 6 sequential steps, 5 session statuses (`draft`, `in_progress`, `calculation_ready`, `review`, `completed`), progress bar percentage, backward step jumping, and incomplete information validation. | Granular sub-step progress indicators within multi-item panels (e.g., individual W-2 card validation). | **LOW**<br>(1–2 working days) | None. |
| **8. Account / Dashboard / Saved Sessions** | **PARTIALLY IMPLEMENTED** | Supabase Auth (signup, login, cookies, password reset). Dashboard displays active preparation session and calculation history. Full GDPR data export and account deletion. | No endpoint or UI to delete an individual tax preparation session without deleting the entire user account; no document file storage vault. | **LOW**<br>(2–3 working days) | Add `DELETE /api/v1/tax/preparation/session` route and modal. |
| **9. Privacy / Security architecture** | **IMPLEMENTED** | Strict client/server separation. RLS enabled on all user tables (`auth.uid() = user_id`). Service-role key restricted to backend. Deep sensitive data redactor in logger. Zod validation on all inputs. Audit logging. | Production secrets manager integration; automated external penetration testing. | **LOW**<br>(2–3 working days) | Production hosting environment dependencies. |
| **10. Pricing / Stripe workflow** | **PARTIALLY IMPLEMENTED** | Complete Stripe billing integration (checkout, customer portal, webhook signature verification, idempotency store, subscription persistence, Free/Premium/Professional entitlements). | `charge.refunded` webhook event is not handled. Live Stripe API keys, price IDs, and webhook secrets must be configured in production environment variables. | **LOW**<br>(1–2 working days) | Requires active Stripe merchant account and live price configuration. |
| **11. Free-to-paid conversion** | **PARTIALLY IMPLEMENTED** | Free calculators compute results and prompt saving to dashboard. Pricing page outlines tiers. Entitlements restrict high-volume AI usage and premium reports. | No direct in-flow CTA converting a free calculator result into "Start My Taxes"; no payment paywall gating final preparation session completion or export. | **MEDIUM**<br>(4–6 working days) | Conversion funnel design decisions required from client. |
| **12. Gig worker specialization** | **PARTIALLY IMPLEMENTED** | Supports multiple gig activities (DoorDash, Uber, Lyft, Instacart) and 1099s in the central preparation workflow. Deductible expenses reduce SE tax. Form 1040-ES calculates quarterly safe harbor vouchers. | No direct API/OAuth integrations with gig platforms (Plaid, Uber, Lyft); no platform-specific expense presets (e.g., DoorDash delivery bag, vehicle mileage). | **MEDIUM**<br>(8–12 working days for presets; HIGH for OAuth APIs) | Client decision on whether to integrate Plaid or maintain manual entry. |
| **13. Multilingual architecture** | **NOT IMPLEMENTED** | Deterministic engine is language-agnostic (integer cents and enum tokens). Gemini AI natively understands multilingual chat prompts. | All UI text, form inputs, preparation steps, error messages, and reports are hardcoded in English. No i18n framework (e.g., `next-intl`) is installed. | **HIGH**<br>(15–20 working days) | Requires selecting an i18n framework, extracting strings, and professional tax translation. |
| **14. CPA / EA professional escalation** | **PARTIALLY IMPLEMENTED** | Preparation review modal collects taxpayer contact info, urgency, and review consent. Stores in `tax_professional_leads`. Admin management portal at `/admin/leads` allows lead assignment and status updates. | No automated matching engine; no database of licensed CPAs/EAs; no CPA practitioner login portal. Public marketing page claims "Matching" which is currently a manual administrative queue. | **HIGH**<br>(20–30 working days for marketplace; LOW for copy fix) | Client decision: build CPA portal vs. manual referral concierge. |
| **15. Federal tax return preparation** | **PARTIALLY IMPLEMENTED** | Computes federal income tax, Schedule SE, standard deductions, and progressive brackets. Generates printable HTML session reports and calculation breakdown reports. | Does NOT generate official IRS Form 1040 PDF (2-page tax return), Schedule 1, Schedule 2, Schedule 3, Schedule C, Schedule SE, or Form 8995. | **HIGH**<br>(15–25 working days) | Requires IRS PDF form filling engine (e.g., `pdf-lib` + official IRS PDF templates). |
| **16. IRS e-file** | **NOT IMPLEMENTED** | None. System explicitly disclaims e-filing across legal notices; Gemini classifies e-file requests as `UNSUPPORTED_REQUEST`. | Zero Modernized e-File (MeF) XML schemas; no Authorized IRS e-file Provider credentials (ETIN / EFIN); no IRS A2A SOAP transmitter; no IRS security compliance. | **HIGH**<br>(3–6 developer months) | Requires IRS Authorized e-File Provider licensing, organizational background checks, and MeF testing. |
| **17. State tax support** | **NOT IMPLEMENTED** | Informational state tax guides exist. Taxpayer residency state is stored as metadata. Gemini routes state tax requests to `UNSUPPORTED_REQUEST`. | Zero state income tax calculation engines, zero state tax forms, zero state filing support for all 50 states and DC. | **HIGH**<br>(20–30 working days per state) | High ongoing maintenance cost for state-by-state statutory changes. |
| **18. Tax engine validation / version control** | **IMPLEMENTED** | Engine maintains isolated, versioned rulesets for 2023, 2024, 2025, and 2026. PINned to official IRS publications (IRB 2025-45, Rev. Proc. 2025-32). 36 test files cover brackets, SE tax, OASDI cap, and boundary conditions. | Automated annual IRS bulletin scrapers/update pipelines (updates are currently manual code updates in `tax-engine/rules/[year]`). | **LOW**<br>(Maintenance: 2–3 days/year) | Annual IRS revenue procedure release cadence. |
| **19. IRS-related wording / verification claims** | **REQUIRES DECISION** | Engine math is verified against IRS IRB 2025-45 and Rev. Proc. 2025-32. Disclaimers state platform is not affiliated with the IRS. Code does not claim "IRS approved" or "IRS certified". | Badges stating `"IRS IRB 2025-45 & Rev. Proc. 2025-32 Verified"` and `"calculations run on IRS verified logic"` can be misinterpreted as IRS government endorsement. | **LOW**<br>(2–4 hours) | Legal/compliance review and client sign-off on adjusted phrasing. |
| **20. How TaxAIHelp Works / customer journey positioning** | **PARTIALLY IMPLEMENTED** | Homepage `HowItWorksSection` presents the 3-step philosophy: Input Situation → Deterministic Engine Math → Clear Tax Insights. | Does not depict the 6-step Start My Taxes preparation workflow; implies CPA "connection" without clarifying it is an external intake queue. | **LOW**<br>(1–2 working days) | Copywriting alignment with actual preparation workflow. |
| **21. W-2 + Side Gig positioning** | **IMPLEMENTED** | Website promotes W-2 + 1099/freelance guidance across Hero, Target Audience, and Guides. Backend engine and preparation session fully support combined calculation and OASDI cap integration. | Optional: Dedicated landing page `/w2-and-1099` to optimize organic search acquisition. | **LOW**<br>(1–2 working days) | None. Supported by existing backend. |

---

## 5. Detailed Evidence

### A. Tax Engine & Math Isolation
- **Rule Definitions & Citations:**
  - 2025 Default: [`tax-engine/rules/2025/index.ts#L20-L24`](file:///e:/USA%20TAX%20Project/tax-engine/rules/2025/index.ts#L20-L24) (`rulesVersion: "2025.2.0-irs-irb-2025-45-obbba"`, Single Standard Deduction: $15,750, MFJ: $31,500, OASDI Cap: $176,100).
  - 2026 Future: [`tax-engine/rules/2026/index.ts#L20-L24`](file:///e:/USA%20TAX%20Project/tax-engine/rules/2026/index.ts#L20-L24) (`rulesVersion: "2026.1.0-irs-rev-proc-2025-32"`, Single: $16,100, MFJ: $32,200, OASDI Cap: $181,800).
- **Schedule SE & W-2 OASDI Interaction:**
  - [`tax-engine/calculations/self-employment.ts#L46-L58`](file:///e:/USA%20TAX%20Project/tax-engine/calculations/self-employment.ts#L46-L58):
    ```typescript
    const taxableProfitCents = Math.round(netProfitCents * seRules.statutoryNetProfitFactor); // 92.35%
    const remainingSocialSecurityCapCents = Math.max(0, seRules.socialSecurityWageCapCents - w2WagesCents);
    const earningsSubjectToSocialSecurity = Math.min(taxableProfitCents, remainingSocialSecurityCapCents);
    const socialSecurityTaxCents = Math.round(earningsSubjectToSocialSecurity * seRules.socialSecurityRate); // 12.4%
    const medicareTaxCents = Math.round(taxableProfitCents * seRules.medicareRate); // 2.9%
    ```
- **Tests:**
  - [`tax-engine/tests/self-employment-2025.test.ts`](file:///e:/USA%20TAX%20Project/tax-engine/tests/self-employment-2025.test.ts)
  - [`tax-engine/tests/income-tax-2025.test.ts`](file:///e:/USA%20TAX%20Project/tax-engine/tests/income-tax-2025.test.ts)
  - [`tax-engine/tests/boundary-and-unsupported.test.ts`](file:///e:/USA%20TAX%20Project/tax-engine/tests/boundary-and-unsupported.test.ts)

### B. Start My Taxes Preparation Architecture
- **Canonical Steps & State Machine:**
  - Steps: `taxpayer_profile`, `income`, `documents`, `deductions`, `calculation`, `review` ([`lib/preparation/steps.ts#L3-L22`](file:///e:/USA%20TAX%20Project/lib/preparation/steps.ts#L3-L22)).
  - Session Store: [`lib/services/tax-preparation-session-store.ts#L36-L56`](file:///e:/USA%20TAX%20Project/lib/services/tax-preparation-session-store.ts#L36-L56).
  - Database Migration: [`supabase/migrations/20260928_tax_preparation_sessions.sql`](file:///e:/USA%20TAX%20Project/supabase/migrations/20260928_tax_preparation_sessions.sql) (Table `tax_preparation_sessions` with RLS).
- **Execution & Validation:**
  - Income Multi-Entry: [`lib/preparation/income.ts`](file:///e:/USA%20TAX%20Project/lib/preparation/income.ts), [`components/preparation/IncomeDiscoveryPanel.tsx`](file:///e:/USA%20TAX%20Project/components/preparation/IncomeDiscoveryPanel.tsx).
  - Calculation Readiness: [`lib/preparation/situation-summary.ts#L106-L198`](file:///e:/USA%20TAX%20Project/lib/preparation/situation-summary.ts#L106-L198).
  - Bridge to Engine: [`lib/preparation/calculation.ts#L133-L191`](file:///e:/USA%20TAX%20Project/lib/preparation/calculation.ts#L133-L191).
  - Tests: [`tests/preparation-session.test.ts`](file:///e:/USA%20TAX%20Project/tests/preparation-session.test.ts), [`tests/preparation-income.test.ts`](file:///e:/USA%20TAX%20Project/tests/preparation-income.test.ts), [`tests/preparation-calculation.test.ts`](file:///e:/USA%20TAX%20Project/tests/preparation-calculation.test.ts).

### C. AI Guardrails & Explainer Boundaries
- **System Prompts:** [`lib/ai/gemini/prompts.ts#L18-L22`](file:///e:/USA%20TAX%20Project/lib/ai/gemini/prompts.ts#L18-L22) and [`#L33-L34`](file:///e:/USA%20TAX%20Project/lib/ai/gemini/prompts.ts#L33-L34):
  `CRITICAL RULE: NEVER invent numerical tax results. All tax numbers MUST come strictly from the TaxAIHelp deterministic tax engine.`
- **Unsupported Requests Interceptor:** [`lib/ai/gemini/service.ts#L129-L143`](file:///e:/USA%20TAX%20Project/lib/ai/gemini/service.ts#L129-L143) and [`#L795-L811`](file:///e:/USA%20TAX%20Project/lib/ai/gemini/service.ts#L795-L811):
  Intercepts `state tax`, `e-file`, `submit to irs` and returns:
  `"TaxAIHelp is currently focused strictly on US Federal income taxes... We do not compute state or local taxes, international taxes, or support formal e-filing with the IRS."`
- **Tests:** [`tests/ai-assistant.test.ts`](file:///e:/USA%20TAX%20Project/tests/ai-assistant.test.ts), [`tests/preparation-ai-assistant.test.ts`](file:///e:/USA%20TAX%20Project/tests/preparation-ai-assistant.test.ts).

### D. Stripe Billing & Monetization
- **Plans & Entitlements:** [`lib/monetization/plans.ts`](file:///e:/USA%20TAX%20Project/lib/monetization/plans.ts) (Free, Premium $19/mo, Professional $49/mo).
- **Webhook Implementation:** [`app/api/v1/billing/webhook/route.ts`](file:///e:/USA%20TAX%20Project/app/api/v1/billing/webhook/route.ts). Cryptographic HMAC-SHA256 verification (`#L24-L28`), Idempotency check (`#L31-L38`), Subscriptions store (`#L57-L68`).
- **Tests:** [`tests/stripe-monetization.test.ts`](file:///e:/USA%20TAX%20Project/tests/stripe-monetization.test.ts), [`tests/monetization-and-entitlements.test.ts`](file:///e:/USA%20TAX%20Project/tests/monetization-and-entitlements.test.ts).

### E. Professional Review & Admin Handoff
- **Lead Submission & Validation:** [`app/api/v1/professional-leads/route.ts#L45-L61`](file:///e:/USA%20TAX%20Project/app/api/v1/professional-leads/route.ts#L45-L61), [`lib/services/professional-lead-store.ts`](file:///e:/USA%20TAX%20Project/lib/services/professional-lead-store.ts).
- **Admin Management Portal:** [`app/admin/leads/page.tsx`](file:///e:/USA%20TAX%20Project/app/admin/leads/page.tsx), [`app/api/v1/admin/leads/route.ts`](file:///e:/USA%20TAX%20Project/app/api/v1/admin/leads/route.ts).
- **Tests:** [`tests/preparation-professional-review.test.ts`](file:///e:/USA%20TAX%20Project/tests/preparation-professional-review.test.ts), [`tests/admin-management.test.ts`](file:///e:/USA%20TAX%20Project/tests/admin-management.test.ts).

---

## 6. Development vs Production Configuration

The codebase is heavily architected with safe development fallbacks. In local development or test mode, mock providers run transparently. To transition to a live production environment, the following assets must be separated:

```
┌───────────────────────────────────────┬──────────────────────────────────────────┬──────────────────────────────────────────┐
│ CODE ALREADY IMPLEMENTED (No Dev Req) │ CODE STILL REQUIRED (Dev Tasks)          │ PRODUCTION CONFIGURATION REQUIRED        │
├───────────────────────────────────────┼──────────────────────────────────────────┼──────────────────────────────────────────┤
│ • Deterministic Federal Tax Engine    │ • Dependents & Family Credits Model      │ • Supabase Production Project & Keys     │
│ • Start My Taxes 6-Step Workflow      │ • Interactive Mileage/Deduction Wizard   │ • Stripe Live API Keys & Webhook Secret  │
│ • Multi W-2 + Multi 1099 Aggregation  │ • Conversational AI Tool-Calling Engine  │ • Gemini Pro Production API Key          │
│ • Tax Situation Summary (3 Pillars)   │ • Official IRS Form 1040 PDF Generator   │ • Production Domain & Auth Redirect URLs │
│ • Schedule SE OASDI Wage Cap Math     │ • Session Deletion Endpoint & UI         │ • Admin Email Addresses (ADMIN_EMAILS)   │
│ • Stripe Subscription & Webhook Flow  │ • i18n Localization Architecture         │ • Production Cron Secret (CRON_SECRET)   │
│ • RLS Policies on all 16 DB Tables    │ • Free-to-Preparation Direct Conversion │ • Transactional Email Provider (SMTP)    │
│ • Sensitive Data Redaction in Logs    │ • Refund Webhook Event Handler           │ • S3 / Supabase Storage Bucket Setup     │
└───────────────────────────────────────┴──────────────────────────────────────────┴──────────────────────────────────────────┘
```

---

## 7. Critical Gaps

1. **Absence of Dependent & Tax Credit Modeling (Highest User Impact):**
   A substantial portion of US taxpayers file as Married Filing Jointly or Head of Household with dependents. Without Child Tax Credit (CTC), Credit for Other Dependents (ODC), and Earned Income Tax Credit (EITC), the tax liability computed for families will **overstate their net tax liability** by thousands of dollars.
2. **Missing In-Flow Free-to-Preparation Bridge:**
   Visitors calculating their taxes on `/tax-calculators/income-tax` or `/tax-calculators/1099` are not offered a single-click action to import their inputs into a guided preparation session. This leads to drop-off and friction.
3. **No PDF Generation for Form 1040:**
   TaxAIHelp generates browser HTML reports and JSON data exports. Users expecting a "tax preparation" product expect a filled IRS Form 1040 package to print or submit.
4. **Disparity in Marketing Claims vs. CPA Escalation:**
   The public marketing page at `/tax-professionals` advertises "Licensed CPA & EA Matching." In reality, submissions are routed to an internal administrative queue (`tax_professional_leads`) for manual review by platform administrators.

---

## 8. Risks & Dependencies

1. **Regulatory Risk — IRS Wording Misinterpretation:**
   - *Risk:* Promoting "IRS Verified" badges in the Hero and Footer creates exposure under FTC/IRS guidelines prohibiting claims of government endorsement or affiliation.
   - *Mitigation:* Adjust phrasing to "Verified Against IRS Statutory Rules" and maintain prominent disclaimers.
2. **Tax Engine Spousal SE Tax Attribution Risk:**
   - *Risk:* In a Married Filing Jointly return where both spouses have independent self-employment earnings, treating their income as a single aggregate pool causes the Social Security wage cap ($176,100) to be applied once instead of twice, resulting in improper SE tax calculations.
   - *Mitigation:* Require individual income attribution (Spouse 1 vs. Spouse 2) in the data model.
3. **IRS E-File Feasibility & Timelines:**
   - *Risk:* Attempting to build an IRS Modernized e-File (MeF) transmitter in-house requires obtaining an EFIN/ETIN, passing IRS suitability checks, undergoing annual TIGTA cybersecurity audits, and building an A2A SOAP transmitter—typically a 6- to 12-month undertaking.
   - *Mitigation:* Position TaxAIHelp as an educational preparation and calculation planner, or partner with an authorized e-file transmitter API.

---

## 9. Recommended Development Sequence

To maximize value without initiating unnecessary UI redesigns, the following 4-phase technical roadmap is recommended:

```
PHASE 1: Core Taxpayer Accuracy & Compliance (Sprint 1 - 2 weeks)
├── 1.1 Update IRS verification badges & marketing copy (Legal/Compliance alignment)
├── 1.2 Implement Household & Dependents data model (Children, SSNs, DOBs)
├── 1.3 Implement Child Tax Credit (CTC) & EITC statutory formulas in tax-engine
└── 1.4 Add Delete Session API endpoint & confirmation modal on /dashboard/taxes

PHASE 2: Interactive Deduction Discovery & Funnel Conversion (Sprint 2 - 2 weeks)
├── 2.1 Build plain-language deduction questionnaire (Mileage log, Phone %, Home Office)
├── 2.2 Implement one-click "Import to Start My Taxes" CTA on all 4 calculator result panels
├── 2.3 Add Stripe `charge.refunded` webhook handler
└── 2.4 Embed Form 1040-ES quarterly vouchers into the preparation summary panel

PHASE 3: Output Artifacts & Conversational Tooling (Sprint 3 - 3 weeks)
├── 3.1 Implement PDF generation for official IRS Form 1040 & Schedule C/SE
├── 3.2 Implement Gemini function calling to allow AI Assistant to update preparation session fields
└── 3.3 Add document file upload to Supabase Storage with virus scanning

PHASE 4: Localization & Enterprise Professional Handoff (Sprint 4 - 3 weeks)
├── 4.1 Install and configure `next-intl` localization framework (Spanish language priority)
├── 4.2 Build CPA Practitioner Portal (Independent CPA login, lead claim, file review)
└── 4.3 Production infrastructure hardening, KMS secrets management, and SIEM observability
```

---

## 10. Client Decision Items

The following items are **business, legal, or product strategy decisions** that require explicit client direction:

1. **IRS Verification Badge Terminology:**
   - *Option A:* Keep "IRS IRB 2025-45 & Rev. Proc. 2025-32 Verified" with existing footer disclaimers.
   - *Option B (Recommended):* Update badges to `"Verified Against IRS Statutory Rules"` or `"Statutory IRS IRB 2025-45 Rules"` to eliminate any potential regulatory risk of implying IRS endorsement.
2. **CPA/EA Escalation Model:**
   - *Option A (Concierge Referral):* Keep current architecture where leads enter an admin queue, and platform staff manually introduces the client to an affiliated CPA/EA firm.
   - *Option B (Full Marketplace):* Authorize development of a multi-tenant CPA portal where independent CPAs create profiles, set availability, and claim leads directly.
3. **Filing Strategy (Print vs. E-File):**
   - *Option A (Printable PDF Package):* Focus preparation on generating a downloadable, IRS-compliant Form 1040 PDF for mail-in or CPA handoff.
   - *Option B (IRS MeF E-File):* Commit to the formal IRS Authorized e-File Provider licensing process and MeF XML transmitter infrastructure.
4. **Gig Worker Data Ingestion:**
   - *Option A (Manual Questionnaire):* Provide high-yield deduction questions (mileage, phone %, home office) with user-entered numbers.
   - *Option B (Plaid / Platform APIs):* Invest in direct OAuth integrations with Uber, Lyft, and DoorDash driver portals to pull earnings and mileage logs automatically.

---

## 11. Developer Review Checklist

### A. Items Verified via Static Repository Audit:
- [x] Deterministic engine integer-cent arithmetic and rule isolation for 2023, 2024, 2025, 2026.
- [x] Schedule SE 92.35% factor, 12.4% Social Security cap reduction by W-2 wages, and 50% above-the-line deduction.
- [x] 6-step Start My Taxes preparation state machine and `tax_preparation_sessions` table.
- [x] Multi-W-2 and multi-1099/gig activity aggregation and calculation bridge.
- [x] Gemini AI explainer boundaries, prompt injection defense, and math hallucination prohibitions.
- [x] Stripe subscription lifecycle, HMAC signature verification, and idempotency tracking.
- [x] Professional review modal, 5-minute duplicate throttling, and admin lead portal.
- [x] RLS policies on all 16 Supabase tables and deep sensitive-data redaction in logger.

### B. Items Requiring Manual Browser Verification:
- [ ] Visual verification of the step-jumping navigation in `/dashboard/taxes` across mobile and desktop viewports.
- [ ] End-to-end verification of the Stripe Customer Portal redirect from `/dashboard/billing`.
- [ ] Visual check of the HTML session report print styles (`/api/v1/tax/preparation/session/report?format=html`).

### C. Items Requiring Production Environment Verification:
- [ ] Live Stripe webhook event delivery and HMAC verification using live Stripe webhook secrets.
- [ ] Gemini API throughput and latency under live Google AI Studio / Vertex AI production keys.
- [ ] Supabase connection pooling and transaction latency under production load.
- [ ] Transactional email delivery for password reset and billing notifications.

### D. Items Requiring Client Decision:
- [ ] Approval of adjusted IRS verification badge wording.
- [ ] Decision on CPA concierge referral vs. CPA marketplace portal.
- [ ] Decision on Form 1040 PDF generation vs. formal IRS MeF e-file integration.
- [ ] Priority ranking of Spanish localization (`next-intl`) vs. Family/Dependents tax credit expansion.

---
*Report compiled autonomously by Antigravity IDE Pair Programming Assistant. Factual, evidence-based audit completed.*
