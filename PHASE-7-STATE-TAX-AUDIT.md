# TaxAIHelp — Phase 7: State Tax Architecture Audit
## Comprehensive Audit of Existing State-Tax Assets, Gaps & Architectural Boundaries

**Date:** October 3, 2026  
**Repository:** `E:\USA TAX Project`  
**Audit Scope:** State Tax References, Models, Calculations, Documents, and E-File Infrastructure  

---

### Executive Summary

Prior to Phase 7, TaxAIHelp was constructed strictly as a **Federal Tax Preparation Engine** (Form 1040, Schedules 1, 2, 3, A, C, SE, 8812, 2441). Every federal calculation explicitly included the disclaimer:
```json
{
  "code": "NO_STATE_TAX",
  "level": "info",
  "message": "State and local income taxes are not included in this federal estimation."
}
```
State data existed solely as ancillary metadata (e.g., primary taxpayer `stateOfResidence` in `UserProfileStore` and `profileSnapshot`, and federal Schedule A SALT deduction discovery in `lib/preparation/deductions.ts`).

Phase 7 establishes a clean, decoupled **State Tax Architecture** that interfaces with `FederalReturn` via a dedicated bridge without mutating or dirtying the deterministic federal tax engine.

---

### Detailed Audit Breakdown

| Functional Area | Current Status | Codebase References | Technical Details |
| :--- | :--- | :--- | :--- |
| **State References** | **Partially Implemented** | `tax-engine/index.ts`<br>`tax-engine/calculations/itemized-deductions.ts`<br>`lib/preparation/efile-readiness.ts` | References exist for `NO_STATE_TAX` warning, Schedule A SALT cap ($10,000 MTR/Single, $5,000 MFS), and valid 2-letter US state code validation in Phase 6 e-file readiness. |
| **State Fields in Profiles** | **Implemented** | `types/supabase.ts`<br>`lib/validations/user-profile.ts`<br>`lib/services/user-profile-store.ts`<br>`lib/preparation/steps.ts` | `stateOfResidence?: string` is captured in `tax_profiles`, validated as a 2-letter US postal code, stored on `PreparationProfileSnapshot`, and accessible throughout the session. |
| **State Fields in W-2 / 1099** | **Partially Implemented / Strictly Federal** | `lib/preparation/income.ts`<br>`lib/validations/preparation-income.ts` | `W2IncomeEntry` and `Form1099IncomeEntry` currently capture federal wages/gross income and federal withholding. They do not yet expose explicit state boxes (Box 15 State, Box 16 State wages, Box 17 State withholding). Schemas currently use `.strict()`. |
| **Federal Return State Data** | **Partially Implemented** | `lib/preparation/federal-return.ts` | `FederalReturn.taxpayer.stateOfResidence` exists. `FederalReturn` does not calculate or hold state returns, keeping federal data cleanly isolated. |
| **State Tax Calculations** | **Unsupported** | None | Zero state income tax engines exist. No statutory brackets, deductions, or calculations exist for CA, NY, TX, FL, etc. |
| **State Withholding** | **Unsupported** | `lib/preparation/deductions.ts` | Captured only as an expense item for Schedule A itemized deduction deduction discovery (`state_local_taxes`), not tracked as state tax prepaid payments against a state tax liability. |
| **State Deductions** | **Partially Implemented (Federal Only)** | `tax-engine/calculations/itemized-deductions.ts` | Federal Schedule A itemizes state income or sales taxes paid. No state-specific standard/itemized deductions exist. |
| **State Credits** | **Unsupported** | None | No state-level tax credits (e.g. CalEITC, NY Empire State child credit) exist. |
| **State Filing Status** | **Unsupported** | `types/tax.ts` | Only 5 federal filing statuses are supported. No state-specific filing statuses exist (e.g., Registered Domestic Partner for California). |
| **State Returns** | **Unsupported** | None | No state return data models exist (`StateReturn`, Form 540, Form IT-201, etc.). |
| **State Document Generation** | **Unsupported** | `lib/preparation/return-document-generator.ts` | Phase 5 generates federal returns, Schedule 1/2/3/A/C/SE/8812/2441 summaries, and a vector PDF report. Zero state forms or state summaries exist. |
| **State E-File References** | **Unsupported** | `lib/efile/` | Phase 6 e-file readiness foundation handles IRS MeF. State e-file (State MeF / Fed-State combined filing) is not represented. |
| **Tax-Year Handling** | **Implemented** | `types/tax.ts` | Strict year typing (`2025 | 2026`) is implemented across the engine, session stores, and validation layers. |
| **Tax-Engine Versioning** | **Implemented** | `tax-engine/index.ts` | `ENGINE_VERSION = "1.1.0-production-baseline"` and `RULES_VERSION = "2025.1"` / `"2026.1"` are versioned. |

---

### Reusable Components for Phase 7

1. **User Profile & State Detection**: `UserProfileStore.getTaxProfile(userId)` and `session.profileSnapshot.stateOfResidence` provide the primary state of residency without requiring re-prompting.
2. **Deterministic Rules & Architecture Invariants**: The separation pattern established in `tax-engine` (100% pure TypeScript, integer cents, zero LLM reliance) serves as the exact pattern for the state tax engine interface.
3. **FederalReturn Canonical Tree**: `lib/preparation/federal-return.ts` provides the single source of truth for federal AGI, taxable income, W-2 wages, business receipts, spouse data, and dependents.
4. **Readiness and Error Pattern**: Phase 6's structured error model (`code`, `category`, `severity`, `message`, `action`, `field`) provides a proven pattern for state readiness checks.
5. **Document Architecture Abstraction**: The provider abstraction pattern in `lib/efile/provider.ts` and document generator in `lib/preparation/return-document-generator.ts` can be cleanly mirrored for state documents.

---

### Missing Architecture to Build in Phase 7

1. **State Tax Domain Model (`lib/state-tax/types.ts`)**:
   - `StateReturn`, `StateTaxpayer`, `StateFilingStatus`, `StateIncome`, `StateAdjustments`, `StateDeductions`, `StateCredits`, `StateTaxLiability`, `StatePayments`, `StateWithholding`, `StateRefundOrBalance`, `StateReadiness`, `StateTaxMetadata`.
2. **State Engine Interface (`lib/state-tax/engine.ts`)**:
   - Extensible `IStateTaxEngine` contract (`calculateStateTax`, `validateStateReturn`, `getStateReadiness`, `getSupportedTaxYears`, `getSupportedStateCode`).
3. **State Support Registry (`lib/state-tax/registry.ts`)**:
   - Deterministic catalog of all 50 states + DC.
   - Flags for states with no individual income tax (AK, FL, NV, NH, SD, TN, TX, WA, WY).
   - Structured `NOT_SUPPORTED` for states without verified engines.
4. **Federal $\rightarrow$ State Data Bridge (`lib/state-tax/federal-bridge.ts`)**:
   - Pure mapping layer extracting verified inputs from `FederalReturn` for consumption by state engines. Zero tax calculation in the bridge.
5. **Multi-State Scenario Foundation (`lib/state-tax/multi-state.ts`)**:
   - Data structures for multi-state W-2s, remote work across borders, and out-of-state income. Gated by `REQUIRES_STATE_RULES` / `NOT_SUPPORTED` without guessing allocations.
6. **State Readiness Evaluator (`lib/state-tax/readiness.ts`)**:
   - Evaluator asserting `READY`, `BLOCKED`, `NOT_SUPPORTED`, or `REQUIRES_REVIEW` with structured error taxonomy.
7. **State Return Summary & Review UI (`lib/state-tax/summary.ts`, `components/preparation/StateTaxReviewPanel.tsx`)**:
   - Clean, user-facing summary showing state filing status, support status, withholding, and honest non-supported explanations.
8. **State Tax Server APIs**:
   - `/api/v1/tax/preparation/session/state-tax`
   - `/api/v1/tax/preparation/session/state-tax/readiness`
   - `/api/v1/tax/preparation/session/state-tax/calculate`
9. **State Document & E-File Abstraction**:
   - `StateReturnDocumentProvider` and decoupled state e-file provider interface.
