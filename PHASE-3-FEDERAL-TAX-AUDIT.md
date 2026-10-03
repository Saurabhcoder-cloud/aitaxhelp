# PHASE 3 — FEDERAL TAX RULE COMPLETENESS AUDIT
## Advanced Deductions, Credits & Federal Calculation Coverage

**Project:** TaxAIHelp — USA Tax-Help SaaS  
**Date:** 2026-10-02  
**Phase:** 3 — Federal Tax Rule Completeness  
**Author:** AI Tax Engineering Architecture Team  

---

## 1. Executive Summary

Phase 1 established verified family, household, dependent, and refundable/non-refundable credit rules (CTC, ACTC, ODC, EITC) with full 2023–2026 versioning.  
Phase 2 implemented the interactive Guided Deduction questionnaire, business-use percentages, pre-fill pipelines, and structured deduction discovery snapshots.  

Phase 3 completes the deterministic federal tax calculation core by closing all remaining calculation gaps:
1. **Standard Business Mileage Deduction**: IRS-indexed mileage rates for 2023–2026 offset against self-employment / Schedule C receipts.
2. **Student Loan Interest Deduction (IRC § 221)**: Above-the-line deduction up to $2,500 with statutory MAGI phaseouts by filing status.
3. **Child and Dependent Care Credit (CDCTC - IRC § 21)**: Non-refundable credit with qualifying person rules, $3,000 / $6,000 expense caps, earned income limitations, and progressive AGI percentage scale (35% down to 20%).
4. **Schedule A Itemized Deductions**: Deterministic computation of medical expenses (7.5% AGI floor), state and local taxes (SALT $10k / $5k MFS cap), mortgage interest, and charitable contributions, with automated standard vs. itemized comparison selecting the greater tax benefit.
5. **Tax Situation Summary Integration**: Reflecting detailed Schedule A breakdowns, above-the-line deductions, mileage deductions, and CDCTC in both `deductionsSummary` and `creditsSummary`.
6. **Double-Counting Prevention**: Guardrails preventing duplicate deductions across Schedule C, Schedule A, and above-the-line categories.
7. **Zero Database Migrations Required**: All new structures cleanly fit inside the existing `JSONB` snapshots of `tax_preparation_sessions`.

---

## 2. Audit of Existing Implementation

### 2.1 Tax Engine (`tax-engine/`)
- **`types.ts` & `types/tax.ts`**:
  - `TaxYearRules` currently defines `standardDeductions`, `brackets`, `selfEmployment`, and `credits` (CTC, ODC, EITC).
  - Missing structured rules for:
    - Mileage rates per tax year (`mileage: { standardRateCentsPerMile: number, hundredthsRateCents: number }`)
    - Student loan interest (`studentLoanInterest: { maxDeductionCents: number, phaseoutThresholdCents: Record<TaxFilingStatus, number>, phaseoutRangeCents: Record<TaxFilingStatus, number> }`)
    - Child and dependent care credit (`childAndDependentCareCredit: { maxExpensesOnePersonCents: number, maxExpensesTwoOrMoreCents: number, baseRate: number, minRate: number, agiFloorCents: number, agiStepCents: number }`)
    - Itemized deductions (`itemizedDeductions: { medicalAgiFloorRate: number, saltCapCents: Record<TaxFilingStatus, number>, charitableAgiLimitRate: number }`)
- **`deductions.ts`**:
  - Currently only returns `standard` deduction.
  - Emits `ITEMIZED_DEDUCTIONS_UNSUPPORTED` warning if raw `itemizedDeductionCents > 0` is supplied without structured Schedule A data.
- **`credits.ts`**:
  - Computes CTC, ODC, ACTC, EITC.
  - Does not yet compute Child and Dependent Care Credit (CDCTC).
- **`index.ts` (`calculateIncomeTax`, `calculateSelfEmployedTax`)**:
  - Gross income goes directly to AGI with only SE 50% tax deduction. Above-the-line student loan interest is not yet deducted.
  - Standard deduction is universally applied. Does not compare with structured Schedule A itemized deductions.
  - Vehicle mileage is not computed using IRS standard mileage rates.

### 2.2 Preparation Domain (`lib/preparation/`)
- **`deductions.ts`**:
  - Phase 2 introduced `GuidedDeductionAnswers` capturing:
    - `home`: `mortgageInterestCents`, `propertyTaxesCents`
    - `charity`: `cashCents`, `nonCashCents`
    - `medical`: `medicalExpensesCents`
    - `stateLocal`: `stateLocalTaxCents`
    - `education`: `studentLoanInterestCents`, `tuitionCents`
    - `childcare`: `childcareCents`
    - `business`: `milesDriven`, `homeOfficeSqFt`
  - Deduction entries support `business_mileage`, `mortgage_interest`, `property_taxes`, `medical_dental`, `state_local_taxes`, `education_expenses`, `childcare_expenses`.
- **`calculation.ts`**:
  - `mapPreparationSessionToEngineInput` currently aggregates raw business expenses and W-2/1099, but does not yet map:
    - `businessMiles`
    - `studentLoanInterestCents`
    - `childCareExpensesCents`
    - structured `scheduleA` itemized expenses.
- **`situation-summary.ts`**:
  - Generates `TaxSituationSummary`.
  - Currently hardcodes `deductionTypeUsed: "standard"`.
  - Itemized deductions are reported only as "Discovered Deductions: $X (Standard deduction applied)".
  - Needs structured `itemizedBreakdown`, `aboveTheLineBreakdown`, and `childAndDependentCareCreditCents`.

### 2.3 User Interface (`components/preparation/`)
- **`DeductionsPanel.tsx`**:
  - Step 4 UI already has interactive questionnaire collecting miles, student loan interest, child care, mortgage interest, property taxes, medical, and charity.
  - Needs to display:
    - Live computed business mileage deduction ($X at IRS rate).
    - Schedule A vs. Standard Deduction optimization comparison ("Standard Deduction is larger by $X" or "Itemized Deductions save you $X more").
    - Clear distinction between above-the-line deductions (student loan) and itemized deductions (Schedule A).

### 2.4 AI Explanation Boundary (`lib/ai/gemini/`)
- Deterministic engine is the sole authority for tax computations.
- Gemini receives verified calculation results from the state and explains them without modifying or recalculating numbers.

---

## 3. Statutory Federal Tax Rules & Versioning (2023–2026)

### 3.1 Standard Mileage Deduction
- **Statutory Authority**: IRS Annual Revenue Notices under Rev. Proc. 2019-46.
- **Rates per Year**:
  - **2023**: 65.5¢ / mile (IRS Notice 2023-03)
  - **2024**: 67.0¢ / mile (IRS Notice 2024-08)
  - **2025**: 70.0¢ / mile (IRS Notice 2024-87)
  - **2026**: 70.0¢ / mile (IRS Statutory Baseline / Notice projection)
- **Calculation Rule**:
  $$\text{Deduction (cents)} = \text{round}(\text{businessMiles} \times \text{rateCentsPerMile})$$
- **Schedule Integration**: Offsets Schedule C self-employment profit; reduces both SE tax and AGI.

### 3.2 Student Loan Interest Deduction (IRC § 221)
- **Statutory Authority**: 26 U.S. Code § 221.
- **Maximum Deduction**: $2,500 (250,000 cents).
- **Type**: Above-the-line deduction (reduces gross income to AGI).
- **Eligibility Rules**:
  - MFS filers are **disallowed** (§ 221(f)(1)).
  - Taxpayers claimed as dependents are **disallowed** (§ 221(c)).
- **Phaseout Thresholds & Ranges**:
  - **2023**:
    - Single / HOH: $75,000 – $90,000 ($15,000 phaseout window)
    - MFJ: $155,000 – $185,000 ($30,000 phaseout window)
  - **2024**:
    - Single / HOH: $80,000 – $95,000 ($15,000 phaseout window)
    - MFJ: $165,000 – $195,000 ($30,000 phaseout window)
  - **2025**:
    - Single / HOH: $85,000 – $100,000 ($15,000 phaseout window; IRS Rev. Proc. 2024-40 § 3.33)
    - MFJ: $170,000 – $200,000 ($30,000 phaseout window)
  - **2026**:
    - Single / HOH: $90,000 – $105,000 ($15,000 phaseout window; IRS Rev. Proc. 2025-32)
    - MFJ: $175,000 – $205,000 ($30,000 phaseout window)

### 3.3 Child and Dependent Care Credit (CDCTC - IRC § 21)
- **Statutory Authority**: 26 U.S. Code § 21.
- **Credit Nature**: Non-refundable credit against income tax.
- **Qualifying Person**:
  - Qualifying child dependent under age 13 at time care was provided.
  - Incapacitated dependent or spouse unable to care for themselves.
- **Qualifying Expense Limits**:
  - 1 qualifying individual: up to $3,000 (300,000 cents).
  - 2 or more qualifying individuals: up to $6,000 (600,000 cents).
- **Earned Income Limitation**:
  - Capped at taxpayer's earned income.
  - For MFJ, capped at the **lesser** of taxpayer's or spouse's earned income (§ 21(d)(1)).
- **Applicable Percentage Scale**:
  - AGI $\le \$15,000$: 35%.
  - Phase-down: 1 percentage point for each $2,000 (or fraction thereof) of AGI exceeding $15,000.
  - Floor: 20% for AGI $> \$43,000$.
- **Filing Status Restriction**:
  - Married Filing Separately (MFS) is generally **disallowed** (§ 21(e)(2)).

### 3.4 Schedule A Itemized Deductions
- **Statutory Authority**: IRC §§ 164, 170, 213, TCJA § 11042.
- **Deductible Components**:
  1. **Medical and Dental (IRC § 213)**: Expenses exceeding 7.5% of AGI.
     $$\text{Deductible Medical} = \max(0, \text{Expenses} - \text{round}(\text{AGI} \times 0.075))$$
  2. **State and Local Taxes (SALT - IRC § 164(b)(6))**:
     - State income/sales tax + real estate property tax + personal property tax.
     - Statutory cap: $10,000 (1,000,000 cents) for Single, MFJ, HOH, QSS; $5,000 (500,000 cents) for MFS.
  3. **Mortgage Interest (IRC § 163(h))**: Interest on qualified residence acquisition debt.
  4. **Charitable Contributions (IRC § 170)**: Cash and non-cash gifts to qualified 501(c)(3) organizations.
- **Optimization Rule**:
  $$\text{Deduction Used} = \max(\text{Standard Deduction}, \text{Total Schedule A Deductions})$$
  $$\text{Deduction Type} = \begin{cases} \text{"itemized"} & \text{if } \text{Total Schedule A} > \text{Standard Deduction} \\ \text{"standard"} & \text{otherwise} \end{cases}$$

---

## 4. Double-Counting Prevention Strategy

1. **Business Mileage vs. Vehicle Expenses**:
   - When standard mileage is claimed, actual vehicle operating expenses (gas, oil, vehicle depreciation) for that vehicle are excluded to avoid double-counting.
2. **Schedule C vs. Schedule A Mortgage & Property Taxes**:
   - Home office deduction (Schedule C) and Schedule A real estate taxes / mortgage interest are partitioned such that the business percentage is deducted on Schedule C and only the non-business residential portion is eligible for Schedule A.
3. **Above-the-Line Deductions vs. Schedule A**:
   - Student loan interest is strictly deducted above the line (IRC § 221) and never added to Schedule A.
   - Self-employed health insurance reduces AGI above the line and cannot be duplicated in Schedule A medical expenses.
4. **Itemized vs. Standard Deduction**:
   - Strictly mutually exclusive. The engine applies the greater and clearly signals the outcome.

---

## 5. File Modification & Implementation Plan

| File | Change Scope | Rationale |
|---|---|---|
| `tax-engine/types.ts` | **Modify** | Add `MileageRules`, `StudentLoanInterestRules`, `ChildCareCreditRules`, `ItemizedDeductionRules` to `TaxYearRules`. |
| `types/tax.ts` | **Modify** | Extend `IncomeTaxCalculationInput`, `SelfEmployedCalculationInput`, `TaxCalculationResult`, and `TaxCreditsBreakdown` to support mileage, student loans, child care credit, and Schedule A itemization. |
| `tax-engine/rules/2023/index.ts` | **Modify** | Add 2023 statutory constants for mileage (65.5¢), student loan interest, child care, and SALT. |
| `tax-engine/rules/2024/index.ts` | **Modify** | Add 2024 statutory constants for mileage (67¢), student loan interest, child care, and SALT. |
| `tax-engine/rules/2025/index.ts` | **Modify** | Add 2025 statutory constants for mileage (70¢), student loan interest, child care, and SALT. |
| `tax-engine/rules/2026/index.ts` | **Modify** | Add 2026 statutory constants for mileage (70¢), student loan interest, child care, and SALT. |
| `tax-engine/calculations/mileage.ts` | **Create** | Deterministic business mileage deduction calculator in integer cents. |
| `tax-engine/calculations/student-loan-interest.ts` | **Create** | IRC § 221 student loan interest above-the-line deduction calculator with MAGI phaseouts. |
| `tax-engine/calculations/itemized-deductions.ts` | **Create** | Schedule A itemized deduction calculator (medical 7.5% floor, SALT $10k cap, mortgage interest, charity). |
| `tax-engine/calculations/credits.ts` | **Modify** | Integrate IRC § 21 Child and Dependent Care Credit into credit pipeline. |
| `tax-engine/calculations/deductions.ts` | **Modify** | Update `resolveDeductions` to accept structured Schedule A, compare with standard deduction, and select the higher. Retain legacy warning if bare unstructured `itemizedDeductionCents` is passed. |
| `tax-engine/index.ts` | **Modify** | Connect mileage, student loan interest, Schedule A itemized deductions, and child care credit in `calculateIncomeTax` and `calculateSelfEmployedTax`. |
| `lib/preparation/calculation.ts` | **Modify** | Map mileage, student loans, child care, and Schedule A from preparation session into engine inputs. |
| `lib/preparation/situation-summary.ts` | **Modify** | Update `deductionsSummary` and `creditsSummary` to include itemized breakdown, chosen deduction type, mileage, student loan, and child care credit. |
| `components/preparation/DeductionsPanel.tsx` | **Modify** | Display live mileage deduction amount, itemized vs. standard comparison banner, and clean deduction breakdown. |
| `lib/ai/gemini/service.ts` | **Modify** | Update explanation copy to reference itemized vs standard deduction results deterministically calculated by the engine. |
| `tests/phase3-federal-tax-completeness.test.ts` | **Create** | Comprehensive Vitest suite testing all Phase 3 federal tax rules and integration points. |

---

## 6. Verification Plan & Test Matrix

1. **Section A: Standard Mileage Deduction**
   - 2023, 2024, 2025, 2026 rates verified.
   - Integer cents rounding ($0.655 \times 1,000 = \$655.00$).
   - Offsets Schedule C net profit and reduces SE tax.
2. **Section B: Student Loan Interest Deduction**
   - Below phaseout: 100% deduction up to $2,500.
   - In phaseout: proportional reduction.
   - Above phaseout: $0 deduction.
   - MFS: disallowed ($0).
   - Above-the-line: reduces Gross Income to AGI.
3. **Section C: Child and Dependent Care Credit**
   - 1 child vs 2+ children expense caps ($3,000 / $6,000).
   - Earned income cap (lesser of spouses on MFJ).
   - AGI percentage scale (35% down to 20%).
   - Non-refundable credit behavior.
4. **Section D: Schedule A Itemized Deductions**
   - Medical 7.5% AGI threshold floor.
   - SALT cap enforcement ($10,000 MFJ/Single, $5,000 MFS).
   - Mortgage interest & charity inclusion.
   - Optimization: Standard applied when greater; Itemized applied when greater.
5. **Section E: Integration & Double-Counting Guardrails**
   - Multi-feature tax scenario: W-2 + 1099 + mileage + student loan + child care + Schedule A itemization.
   - Double-counting prevention verified.
6. **Section F: Regression Protection**
   - Run full test suite to guarantee 0 regressions across all 740 existing tests.
   - Run `npx tsc --noEmit` and `npm run build`.
