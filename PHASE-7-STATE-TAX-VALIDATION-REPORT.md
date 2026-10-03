# TaxAIHelp — Phase 7: State Tax Architecture + Federal/State Separation
## Complete Architectural Implementation & Validation Report

**Date:** October 3, 2026  
**Project:** TaxAIHelp / taxaihelp.com  
**Repository:** `E:\USA TAX Project`  
**Phase:** Phase 7 — State Tax Architecture + Federal/State Separation  

---

### Executive Summary

Phase 7 establishes a production-grade **State Tax Architecture** for TaxAIHelp that achieves clean, decoupled separation between Federal Tax preparation and State Tax computation.

Key principles enforced throughout Phase 7:
- **Federal/State Decoupling:** Federal tax preparation, calculations, Form 1040 line mappings, documents, and e-file readiness remain 100% authoritative and unmutated by state operations.
- **Zero Guessed or Fake Calculations:** States without certified statutory calculation engines (e.g. CA, NY, IL) return structured `NOT_SUPPORTED` responses. TaxAIHelp never invents estimates or substitutes other states' rules.
- **No-Income-Tax States Supported:** The 9 states with no personal wage income tax (AK, FL, NV, NH, SD, TN, TX, WA, WY) are verified and supported with zero-liability determinations and explicit non-filing declarations.
- **Pure Federal $\rightarrow$ State Bridge:** A dedicated mapping layer bridges verified `FederalReturn` data into state engine inputs without executing state tax calculations inside the bridge.
- **Multi-State Foundation:** Identifies multi-state wage allocation, out-of-state income, and remote work scenarios without guessing allocation percentages.
- **Zero Schema Migrations Required:** Reuses existing session storage and in-memory structures without database mutations.

---

### 1. Current State-Tax Support (Audit Summary)

Documented in detail in [`PHASE-7-STATE-TAX-AUDIT.md`](file:///E:/USA%20TAX%20Project/PHASE-7-STATE-TAX-AUDIT.md):
- **Implemented Previously**: Taxpayer `stateOfResidence` in profiles, federal Schedule A SALT deduction discovery ($10,000 cap), and standard `NO_STATE_TAX` federal informational disclaimer.
- **Added in Phase 7**: Canonical state domain model, extensible `IStateTaxEngine` interface, 51-jurisdiction state support registry, pure Federal $\rightarrow$ State bridge, multi-state analyzer, deterministic readiness evaluator, state tax summary, document provider abstraction, offline state e-file provider, 3 authenticated REST API endpoints, and a responsive review UI.

---

### 2. New Architecture & Decoupled Design

```
                     ┌──────────────────────────────────────────────┐
                     │          Federal Tax Domain (Phases 1-6)     │
                     │  - TaxPreparationSession                     │
                     │  - FederalReturn (Form 1040, Schedules)      │
                     │  - Deterministic Tax Engine (100% Cents)     │
                     └──────────────────────┬───────────────────────┘
                                            │
                                            ▼ (Read-Only Mapping)
                     ┌──────────────────────────────────────────────┐
                     │          Federal -> State Data Bridge         │
                     │  lib/state-tax/federal-bridge.ts             │
                     │  - Extracts AGI, W-2 wages, 1099, SE profit  │
                     │  - ZERO State Tax Calculations in Bridge     │
                     └──────────────────────┬───────────────────────┘
                                            │
                      ┌─────────────────────┴─────────────────────┐
                      ▼                                           ▼
       ┌───────────────────────────────┐           ┌───────────────────────────────┐
       │     State Support Registry    │           │     Multi-State Foundation    │
       │   lib/state-tax/registry.ts   │           │   lib/state-tax/multi-state.ts│
       │ - 9 No-Income-Tax States      │           │ - Single-state resident       │
       │ - 42 Income-Tax Jurisdictions │           │ - Border / Remote worker      │
       │ - Dynamic Engine Registration │           │ - Marks REQUIRES_STATE_RULES  │
       └──────────────┬────────────────┘           └──────────────┬────────────────┘
                      │                                           │
                      └─────────────────────┬─────────────────────┘
                                            │
                                            ▼
                     ┌──────────────────────────────────────────────┐
                     │          State Tax Engine Interface          │
                     │  lib/state-tax/engine.ts                     │
                     │  - IStateTaxEngine Contract                  │
                     │  - NoIncomeTaxStateEngine (TX, FL, WA, etc.) │
                     │  - UnsupportedStateEngine (CA, NY, etc.)     │
                     └──────────────────────┬───────────────────────┘
                                            │
                      ┌─────────────────────┴─────────────────────┐
                      ▼                                           ▼
       ┌───────────────────────────────┐           ┌───────────────────────────────┐
       │     State Tax Readiness       │           │     State Tax Summary & UI    │
       │   lib/state-tax/readiness.ts  │           │   lib/state-tax/summary.ts    │
       │ - Status: READY / BLOCKED /   │           │   StateTaxReviewPanel.tsx     │
       │   NOT_SUPPORTED / REVIEW      │           │ - Section 11 in Review Panel  │
       └───────────────────────────────┘           └───────────────────────────────┘
```

---

### 3. State Tax Domain Model (`lib/state-tax/types.ts`)

Defines complete, type-safe structures:
- `StateTaxpayer`: Legal name, residency state, residency type (`full_year_resident`, `part_year_resident`, `nonresident`).
- `StateFilingStatus`: State status code, label, conforming federal status.
- `StateIncome`: Federal AGI, state W-2 wages, state 1099 income, business profit, allocation percentage, multi-state records.
- `StateAdjustments`: State additions (e.g. out-of-state muni interest), subtractions (US bond interest), and State AGI.
- `StateDeductions`: Standard vs itemized deduction used, state exemptions, state taxable income.
- `StateCredits`: Non-refundable and refundable state credit items.
- `StateTaxLiability`: Taxable income, gross tax, net tax liability, effective rate, marginal bracket.
- `StateWithholding`: W-2 and 1099 state withholding records.
- `StatePayments`: Withholdings, estimated payments, refundable credits, total payments.
- `StateRefundOrBalance`: Refund vs balance due vs zero vs not calculated.
- `StateReadiness`: Status, total/passed checks, structured blocking errors and warnings.
- `StateTaxMetadata`: State code, state name, tax year, engine version, rules version, federal return lineage.
- `StateReturn`: Canonical top-level state return model.

---

### 4. State Engine Interface (`lib/state-tax/engine.ts`)

- **`IStateTaxEngine` Interface**:
  - `calculateStateTax(input: StateCalculationInput): StateCalculationResult`
  - `validateStateReturn(input: StateCalculationInput): StateValidationError[]`
  - `getStateReadiness(input: StateCalculationInput): StateReadiness`
  - `getSupportedTaxYears(): TaxYear[]`
  - `getSupportedStateCode(): string`
- **`NoIncomeTaxStateEngine`**: Deterministic engine for the 9 states with no personal income tax (AK, FL, NV, NH, SD, TN, TX, WA, WY). Computes $0 liability and reports full refund of any errantly withheld state taxes.
- **`UnsupportedStateEngine`**: Rejects calculation attempts with HTTP 422 `STATE_NOT_SUPPORTED` and marks readiness as `NOT_SUPPORTED` without guessing numbers.

---

### 5. State Support Registry (`lib/state-tax/registry.ts`)

- Catalogs all 50 US States + District of Columbia (51 jurisdictions).
- 9 states categorized as `NO_STATE_INCOME_TAX`.
- 42 jurisdictions categorized as `NOT_SUPPORTED` pending verified statutory engine integration.
- Dynamic `registerStateEngine(engine: IStateTaxEngine)` API allowing future plug-in of California, New York, etc. engines without modifying existing code.
- `isStateReturnRequired(...)`: Deterministically evaluates whether a taxpayer is required to file a state return.

---

### 6. Federal $\rightarrow$ State Data Bridge (`lib/state-tax/federal-bridge.ts`)

- `mapFederalReturnToStateInput(session, federalReturn, options)`: Maps verified federal return data into clean `StateCalculationInput`.
- `buildStateBridgeData(session, federalReturn, options)`: Builds comprehensive bridge view model exposing federal lineage, AGI, W-2 wages, gross 1099, net SE profit, dependents, and state withholding.
- **Zero Calculation Invariant**: Does not calculate state tax.

---

### 7. Multi-State Scenario Foundation (`lib/state-tax/multi-state.ts`)

- `analyzeMultiStateScenario(...)`:
  - Detects single-state residence $\rightarrow$ `status: "SINGLE_STATE"`, `requiresAllocation: false`.
  - Detects multi-state W-2s, remote work across state lines, or out-of-state income $\rightarrow$ marks `REQUIRES_STATE_RULES` or `NOT_SUPPORTED`.
  - **Zero Guessing Invariant**: Never invents allocation percentages or apportionment formulas.

---

### 8. State Readiness Evaluator (`lib/state-tax/readiness.ts`)

Executes 6 deterministic checks:
1. `check_federal_prerequisite`: Confirms federal return calculation snapshot exists.
2. `check_tax_year`: Validates tax year 2025 or 2026.
3. `check_state_identity`: Validates 2-letter US state code.
4. `check_state_support`: Asserts certified engine availability or no-income-tax status.
5. `check_multi_state`: Analyzes multi-state apportionment requirements.
6. `check_state_withholding`: Verifies withholding integrity and alerts on state withholding in no-tax states.

---

### 9. State Tax Server APIs

- **`GET /api/v1/tax/preparation/session/state-tax`**: Returns state tax overview, bridge data, and summary.
- **`GET /api/v1/tax/preparation/session/state-tax/readiness`**: Returns complete statutory readiness evaluation.
- **`POST /api/v1/tax/preparation/session/state-tax/calculate`**: Executes deterministic state calculation if supported. Unsupported states return structured 422 `STATE_NOT_SUPPORTED`. Client-supplied totals are strictly ignored.

---

### 10. State Tax Review UI (`components/preparation/StateTaxReviewPanel.tsx`)

- Embedded into `FederalReturnReviewPanel.tsx` as Section 11.
- Features:
  - State name & 2-letter postal badge.
  - Tax year and filing status indicators.
  - Support status badge (`Supported`, `No State Income Tax`, `Preparation Not Yet Supported`).
  - State filing requirement status.
  - State income indicators (Federal AGI bridged, state withholding, state liability).
  - Clear explanations for no-income-tax states and unsupported states.
  - "Calculate State Tax" trigger button for supported engines.

---

### 11. Database / Persistence

- In-memory session registry and existing session JSONB models are completely sufficient.
- **Zero Database Migrations**: No migrations created, preserving the working Supabase configuration.

---

### 12. Automated Test Results

- **Targeted Phase 7 Test Suite** ([`tests/phase7-state-tax.test.ts`](file:///E:/USA%20TAX%20Project/tests/phase7-state-tax.test.ts)):
  - **27 / 27 passed (100%)**
- **Full Test Suite**:
  - **43 test files passed, 866 / 866 tests passed (100%)**
  - Zero regressions across Phases 1 through 6.

---

### 13. TypeScript Compilation Result

```bash
npx tsc --noEmit
# Exit code: 0 (Zero errors)
```

---

### 14. Full Test Suite Result

```bash
npx vitest run
# Test Files: 43 passed (43)
# Tests:      866 passed (866)
# Duration:   34.67s
```

---

### 15. Production Build Result

```bash
npm run build
# Exit code: 0 (Successfully compiled all 139 static and dynamic routes)
```

New routes verified in production build:
- `├ ƒ /api/v1/tax/preparation/session/state-tax`
- `├ ƒ /api/v1/tax/preparation/session/state-tax/calculate`
- `├ ƒ /api/v1/tax/preparation/session/state-tax/readiness`

---

### 16. Unsupported Functionality Disclosures

- **Individual State Calculations (Non-Zero Tax States)**: California (Form 540), New York (Form IT-201), and all other income-tax states are marked `NOT_SUPPORTED`.
- **Multi-State Apportionment**: Inter-state allocation percentages are marked `REQUIRES_STATE_RULES`.
- **State Document Generation**: Official state forms are not generated to prevent non-compliant filings.
- **State Electronic Transmission**: State e-filing is disconnected.

---

### 17. Future State Engine Integration Blueprint

When adding a state engine (e.g. California Franchise Tax Board Form 540):
1. Implement `IStateTaxEngine` in `tax-engine/state/california.ts`.
2. Implement statutory CA tax brackets, standard deduction, exemptions, and CalEITC.
3. Call `registerStateEngine(new CaliforniaStateTaxEngine())` in `lib/state-tax/registry.ts`.
4. Implement `CaliforniaDocumentProvider` in `lib/state-tax/documents.ts`.
5. Connect to an authorized State MeF transmitter in `lib/state-tax/efile.ts`.
