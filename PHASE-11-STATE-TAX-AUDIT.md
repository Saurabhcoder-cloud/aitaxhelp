# Phase 11 — State Tax Architecture & Engine Audit
**Document Version:** 1.0.0  
**Status:** Audit Complete & Implementation Blueprint Established  
**System:** TaxAIHelp (USA Tax Preparation Platform)  
**Date:** October 3, 2026

---

## 1. Executive Summary & Audit Context

In Phase 7, TaxAIHelp established the foundational domain architecture for state taxation, implementing:
- Clean conceptual and functional separation between Federal and State returns.
- A 50-state + DC statutory registry distinguishing the 9 states with no broad personal income tax on wage income from the 41 states + DC that levy personal income tax.
- The `NoIncomeTaxStateEngine` returning statutory zero-liability determinations for no-tax states (AK, FL, NV, NH, SD, TN, TX, WA, WY).
- The `UnsupportedStateEngine` returning fail-safe `NOT_SUPPORTED` for all other states.
- A read-only Federal-to-State data bridge extracting Form 1040 AGI, wage breakdown, self-employment profits, and withholding without calculating state tax or mutating federal state.
- Basic multi-state detection identifying out-of-state W-2s, 1099s, and remote work.
- State readiness evaluation and an interactive `StateTaxReviewPanel` component.
- Basic placeholder document and disconnected e-file provider interfaces.

**Phase 11 Objective:**
Upgrade this architectural foundation into a real, server-authoritative, deterministic state tax calculation and state-return preparation framework. Phase 11 introduces:
1. Versioned deterministic state tax rule sets (starting with full California statutory rules for 2025 and 2026).
2. Comprehensive taxpayer residency modeling (full-year resident, part-year resident, non-resident).
3. State-source income allocation for W-2 wages, 1099 gig income, and self-employment earnings.
4. Deterministic state additions, subtractions, standard deductions, and personal exemption credits.
5. Statutory California credits (CA Personal Exemption Credit, Dependent Exemption Credit, CA EITC, Young Child Tax Credit).
6. Canonical server-authoritative `StateReturn` model with cryptographic integrity hashing.
7. State return preparation documents ("State Tax Preparation Summary").
8. Resilient state e-file lifecycle architecture and persistence layer with fail-closed production guards.

---

## 2. Audit of Existing Phase 7 State Tax Components

| File / Component | Current Implementation | Phase 11 Gap / Enhancement |
|---|---|---|
| [`lib/state-tax/types.ts`](file:///e:/USA%20TAX%20Project/lib/state-tax/types.ts) | Defines `StateReturn`, `StateTaxpayer`, `StateIncome`, `StateDeductions`, `StateCredits`, `StateTaxLiability`, `StateWithholding`, `StateReadiness`. | Needs expanded residency parameters, state estimated tax payments, statutory rule metadata, state e-file submission structures, and document descriptors. |
| [`lib/state-tax/registry.ts`](file:///e:/USA%20TAX%20Project/lib/state-tax/registry.ts) | Categorizes 50 states + DC into `NO_STATE_INCOME_TAX` vs `NOT_SUPPORTED`. Uses in-memory Map for engine registration. | Needs formal support tiers: `SUPPORTED`, `SUPPORTED_PARTIAL`, `NOT_SUPPORTED`, `NO_INCOME_TAX`, `REQUIRES_STATE_RULES`. Needs registration of certified state engines (e.g. California). |
| [`lib/state-tax/engine.ts`](file:///e:/USA%20TAX%20Project/lib/state-tax/engine.ts) | Defines `IStateTaxEngine`, `NoIncomeTaxStateEngine`, `UnsupportedStateEngine`. | Extend interface with `buildReturn()`, `getRulesMetadata()`, rule validation, and integer-cents arithmetic guarantees. |
| [`lib/state-tax/federal-bridge.ts`](file:///e:/USA%20TAX%20Project/lib/state-tax/federal-bridge.ts) | Maps `FederalReturn` to `StateCalculationInput`. Read-only. | Retain read-only invariant; add support for state-specific income allocations, estimated tax payments, and prior-state move dates. |
| [`lib/state-tax/multi-state.ts`](file:///e:/USA%20TAX%20Project/lib/state-tax/multi-state.ts) | Analyzes W-2/1099 states; returns `SINGLE_STATE`, `REQUIRES_STATE_RULES`, `NOT_SUPPORTED`. | Support explicit state apportionment calculation when state engine supports it; block guessed formulas. |
| [`lib/state-tax/readiness.ts`](file:///e:/USA%20TAX%20Project/lib/state-tax/readiness.ts) | Evaluates 6 checks (federal prerequisite, tax year, state identity, engine support, multi-state, withholding). | Expand to 14 checks including residency completeness, state-source income allocation, deductions reconciliation, and document readiness. |
| [`lib/state-tax/summary.ts`](file:///e:/USA%20TAX%20Project/lib/state-tax/summary.ts) | Generates `StateTaxSummary`. | Enrich with additions, subtractions, exemption credits, refund vs amount owed, and engine versioning. |
| [`lib/state-tax/documents.ts`](file:///e:/USA%20TAX%20Project/lib/state-tax/documents.ts) | `DefaultStateDocumentProvider` returning advisory notices. | Create structured "State Tax Preparation Summary" generator clearly labeled "Not an Official State Filing Form" without claiming to be Form 540. |
| [`lib/state-tax/efile.ts`](file:///e:/USA%20TAX%20Project/lib/state-tax/efile.ts) | Disconnected provider returning `STATE_EFILE_OFFLINE`. | Upgrade to full state e-file lifecycle (`DisconnectedStateEfileProvider` fail-closed, `MockStateEfileProvider` for automated testing). |
| [`components/preparation/StateTaxReviewPanel.tsx`](file:///e:/USA%20TAX%20Project/components/preparation/StateTaxReviewPanel.tsx) | Client component rendering summary cards, no-tax banner, and calculate button. | Expand to show comprehensive tax calculation pipeline (AGI -> Additions/Subtractions -> Deductions -> Taxable Income -> Gross Tax -> Exemption Credits -> Net Tax -> Withholding -> Refund/Balance Due) and e-file readiness. |
| **State APIs** | `/state-tax`, `/state-tax/calculate`, `/state-tax/readiness`. | Add `/state-tax/freeze`, `/state-tax/efile/submit`, `/state-tax/efile/status`, `/state-tax/documents`. |

---

## 3. Supported vs Unsupported State Categorization

### 3.1 Tier 1: No Personal Income Tax States (9 States)
- **Alaska (AK)**, **Florida (FL)**, **Nevada (NV)**, **New Hampshire (NH)** (wage income), **South Dakota (SD)**, **Tennessee (TN)**, **Texas (TX)**, **Washington (WA)**, **Wyoming (WY)**.
- **Classification**: `NO_STATE_INCOME_TAX`.
- **Engine**: `NoIncomeTaxStateEngine`.
- **Status**: Full statutory calculation ($0.00 liability, full refund of any withholding).

### 3.2 Tier 2: Certified Deterministic State Engine (1 State)
- **California (CA)**:
  - **Governing Law**: California Revenue and Taxation Code (RTC).
  - **Tax Years**: 2025 and 2026.
  - **Filing Form Equivalent**: Form 540 (Resident), Form 540NR (Nonresident/Part-Year).
  - **Engine**: `CaliforniaTaxEngine` (`v2025_v1`, `v2026_v1`).
  - **Classification**: `SUPPORTED`.
  - **Brackets**: 9 statutory brackets (1.00% to 12.30%) + 1.00% Mental Health Services Tax on taxable income > $1,000,000 (totaling 13.30%).
  - **Deductions**: California Standard Deduction (Single/MFS: $5,540; MFJ/HOH/QSS: $11,080 for TY2025; indexed for TY2026).
  - **Exemptions**: CA Personal Exemption Credit ($149 single, $298 joint for TY2025) and Dependent Exemption Credit ($456 per dependent for TY2025).
  - **Credits**: California Earned Income Tax Credit (CalEITC) and Young Child Tax Credit (YCTC).

### 3.3 Tier 3: Unsupported Personal Income Tax States (40 States + DC)
- All remaining 40 states (AL, AR, AZ, CO, CT, DE, GA, HI, IA, ID, IL, IN, KS, KY, LA, MA, MD, ME, MI, MN, MO, MS, MT, NC, ND, NE, NJ, NM, NY, OH, OK, OR, PA, RI, SC, UT, VA, VT, WI, WV) + DC.
- **Classification**: `NOT_SUPPORTED`.
- **Engine**: `UnsupportedStateEngine`.
- **Safety Guarantee**: Returns clean 422 error and blocking readiness check. Will NEVER estimate, guess, or synthesize state tax.

---

## 4. Rule Versioning & Mathematical Guarantees

All state rules must live in dedicated files:
```
lib/state-tax/rules/
  ca/
    2025.ts
    2026.ts
```
Every rule set implements:
- Integer-cents arithmetic throughout.
- Deterministic bracket evaluation without floating-point rounding drift.
- Explicit standard deductions by filing status.
- Exact non-refundable and refundable credit limits and phaseouts.
- Zero reliance on external network calls or LLM calculations.

---

## 5. Phase 11 Implementation Roadmap

```
1. Extend types.ts with complete StateReturn, e-file lifecycle, and submission models.
2. Build versioned California rule files: lib/state-tax/rules/ca/2025.ts & 2026.ts.
3. Build CaliforniaTaxEngine implementing IStateTaxEngine.
4. Update State Support Registry to register CaliforniaTaxEngine.
5. Enhance federal-bridge.ts for residency, income sourcing, and estimated payments.
6. Enhance readiness.ts with 14 deterministic validation checks.
7. Implement canonical buildStateReturn() generator with SHA-256 integrity hash.
8. Implement State Tax Preparation Summary document generator in documents.ts.
9. Implement DisconnectedStateEfileProvider & MockStateEfileProvider in efile.ts.
10. Create Supabase migration 20261003200000_state_tax_persistence.sql for state returns & submissions.
11. Build StateReturnStore & StateEfileSubmissionStore.
12. Implement missing API endpoints (/freeze, /efile/submit, /efile/status, /documents).
13. Update StateTaxReviewPanel.tsx with full pipeline visualization.
14. Write comprehensive tests in tests/phase11-state-tax-engines.test.ts and tests/state/ca-rules.test.ts.
15. Run typecheck, vitest regression, and production build.
```
