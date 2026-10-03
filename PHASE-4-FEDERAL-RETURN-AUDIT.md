# Phase 4: Federal Tax Return Preparation Foundation — Architecture Audit

**Project:** TaxAIHelp — USA Tax-Help SaaS  
**Workspace:** `E:\USA TAX Project`  
**Date:** October 2, 2026  
**Status:** AUDIT COMPLETED — IMPLEMENTATION READY

---

## 1. Executive Overview

Phases 1 through 3 successfully built out the family/household/dependent logic, guided deduction discovery, advanced deductions (mileage, student loan interest, Schedule A itemized deductions), family tax credits (CTC, ACTC, ODC, EITC, CDCTC), and deterministic calculation pipelines for federal taxes across tax years 2023–2026.

The goal of **Phase 4** is to convert this calculated tax situation into a formal **Federal Tax Return Preparation Foundation**:
```
USER TAX INFORMATION
        ↓
STRUCTURED FEDERAL RETURN DATA
        ↓
DETERMINISTIC VALIDATION
        ↓
FEDERAL RETURN READINESS
        ↓
FEDERAL RETURN REVIEW
```

This phase establishes the structured return domain model, an extensive readiness evaluation engine, deterministic calculation reconciliation checks, a dedicated review experience, and API exposure—while strictly maintaining that:
- The **deterministic tax engine** is the sole numerical authority.
- **Gemini is explanation-only** and never computes, invents, or modifies tax data.
- **No Git commits or pushes** are executed (all Git commands reserved for manual CMD execution).

---

## 2. Current Architecture & Reusable Components

### A. Existing Preparation Domain Modules (`lib/preparation/`)
- [`lib/preparation/steps.ts`](file:///E:/USA%20TAX%20Project/lib/preparation/steps.ts):
  - Defines the 6 preparation steps: `taxpayer_profile`, `income`, `documents`, `deductions`, `calculation`, `review`.
  - Defines progress states and transitions.
- [`lib/preparation/household.ts`](file:///E:/USA%20TAX%20Project/lib/preparation/household.ts):
  - Strongly typed `HouseholdSnapshot`, `SpouseSnapshot`, `DependentRecord`.
  - Filing statuses: `single`, `married_filing_jointly`, `married_filing_separately`, `head_of_household`, `qualifying_surviving_spouse`.
  - Age calculation at tax year end, qualifying child logic, student/disability flags.
- [`lib/preparation/income.ts`](file:///E:/USA%20TAX%20Project/lib/preparation/income.ts):
  - Strongly typed `IncomeDiscovery`, `W2IncomeEntry`, `Form1099IncomeEntry`, `SelfEmploymentActivity`.
  - Clean separation between employer wages (W-2), freelance (1099), and business/gig activities.
- [`lib/preparation/deductions.ts`](file:///E:/USA%20TAX%20Project/lib/preparation/deductions.ts):
  - Strongly typed `DeductionDiscovery`, `DeductionEntry`, `GuidedDeductionAnswers`.
  - Business expenses, vehicle mileage, Schedule A discovery (mortgage interest, SALT, charity, medical), education expenses (student loan interest), and childcare expenses.
- [`lib/preparation/calculation.ts`](file:///E:/USA%20TAX%20Project/lib/preparation/calculation.ts):
  - Maps session snapshots into `IncomeTaxCalculationInput` or `SelfEmployedCalculationInput`.
  - Passes structured data into the deterministic engine and updates session with `calculationSnapshot`.
- [`lib/preparation/situation-summary.ts`](file:///E:/USA%20TAX%20Project/lib/preparation/situation-summary.ts):
  - Evaluates preparation readiness (`assessCalculationReadiness`).
  - Constructs `TaxSituationSummary` with deductions summary, credits summary, and calculations.

### B. Existing Deterministic Tax Engine (`tax-engine/`)
- Authoritative for integer-cent arithmetic across:
  - Gross Income & Adjusted Gross Income (AGI).
  - Above-the-line deductions (SE tax 50% deduction, IRC § 221 student loan interest).
  - Schedule C self-employment profit (gross 1099 receipts minus actual expenses and standard mileage).
  - Schedule A itemized deductions (7.5% medical floor, $10k/$5k SALT cap, mortgage interest, charity) vs Standard Deduction comparison.
  - Progressive federal income tax brackets.
  - Tax credits (IRC § 24 CTC/ACTC, ODC, IRC § 32 EITC, IRC § 21 CDCTC).
  - Total federal tax liability, withholdings, and refund/balance due.

### C. Existing Storage & Database Architecture
- Supabase table: `public.tax_preparation_sessions`
  - Columns: `id`, `user_id`, `tax_profile_id`, `tax_year`, `title`, `status`, `current_step`, `steps`, `profile_snapshot`, `household_snapshot`, `income_snapshot`, `documents_snapshot`, `deductions_snapshot`, `calculation_id`, `calculation_snapshot`, `created_at`, `updated_at`.
  - Strict Row Level Security (RLS) guaranteeing user ownership isolation.
  - In-memory fallback (`TaxPreparationSessionStore`) with identical contract for offline testing and fast execution.

---

## 3. Gaps & Missing Federal Return Structures

While all raw input data and calculation results exist across the session snapshots, the following architectural elements are currently missing:

1. **Structured Federal Return Domain Model (`FederalReturn`):**
   - Currently, components inspect disconnected snapshots (`profileSnapshot`, `householdSnapshot`, `incomeSnapshot`, `deductionsSnapshot`, `calculationSnapshot`).
   - Missing a unified, normalized, strongly typed `FederalReturn` aggregate that organizes the return into 13 formal sections: Taxpayer, Spouse, Dependents, Filing Status, Income, Adjustments, Deductions, Credits, Taxes, Payments, Refund/Balance, Readiness, and Metadata.
2. **Deterministic Return Readiness Engine (`FederalReturnReadiness`):**
   - Current readiness (`assessCalculationReadiness`) is basic and only answers whether calculation can run.
   - Missing comprehensive return readiness that answers: *"Is this federal return ready for final review and downstream processing?"*
   - Needs structured categories (`taxpayer_info`, `filing_status`, `household`, `dependents`, `income`, `deductions`, `credits`, `payments`, `calculation`, `review`) with explicit statuses (`COMPLETE`, `INCOMPLETE`, `WARNING`, `NOT_APPLICABLE`, `REQUIRES_REVIEW`), missing items, warnings, blocking items, and navigation links.
3. **Calculation Reconciliation Engine (`FederalReturnReconciliation`):**
   - Missing mathematical sanity checks to verify that:
     - Income components sum to total gross income.
     - Gross income minus above-the-line adjustments equals AGI.
     - AGI minus chosen deduction equals taxable income.
     - Progressive tax on taxable income equals tentative tax.
     - Tentative tax minus non-refundable credits plus SE tax equals total tax liability.
     - Withholdings plus refundable credits equal total payments.
     - Total payments minus total tax liability equals estimated refund or balance due.
     - Zero double counting occurs between Schedule C, Schedule A, and above-the-line items.
4. **Dedicated Federal Return Review Screen (`FederalReturnReviewPanel`):**
   - Current UI at `currentStep === "review"` renders a simple completion button without an expandable, categorized return summary.
   - Missing an interactive review panel organizing the 8 main return sections with status badges, deterministic line items, and direct navigation links back to earlier steps when edits are needed.
5. **Dedicated Federal Return API Endpoint:**
   - Missing `GET /api/v1/tax/preparation/session/federal-return` to fetch the complete structured return and readiness assessment for client consumption.
6. **Gemini Review Context:**
   - Gemini assistant needs context on the structured federal return readiness and review state to answer review-related questions deterministically without fabricating numbers.

---

## 4. Required Implementation Plan

### Step 1: Create `lib/preparation/federal-return.ts`
Implement the complete domain model, builder, readiness evaluator, and reconciliation engine:
- `FederalReturn` interface with 13 structured sections.
- `buildFederalReturn(session: TaxPreparationSession): FederalReturn`.
- `evaluateFederalReturnReadiness(session: TaxPreparationSession): FederalReturnReadiness`.
- `reconcileFederalReturnCalculations(session: TaxPreparationSession): FederalReturnReconciliation`.

### Step 2: Create API Endpoint `app/api/v1/tax/preparation/session/federal-return/route.ts`
- `GET /api/v1/tax/preparation/session/federal-return`
- Returns `{ success: true, data: federalReturn }`.
- Protected by existing authentication and session ownership checks.

### Step 3: Create UI Component `components/preparation/FederalReturnReviewPanel.tsx`
- Dedicated review component organizing the 8 return sections:
  1. Taxpayer & Household
  2. Income Sources
  3. Above-the-Line Adjustments
  4. Deductions (Standard vs Itemized)
  5. Tax Credits
  6. Federal Taxes
  7. Payments & Withholding
  8. Refund / Balance Due
  9. Readiness & Missing Items Checklist
- Expandable sections with deterministic integer-cent currency displays.
- Direct jump links to `taxpayer_profile`, `income`, `documents`, `deductions`, and `calculation`.

### Step 4: Integrate Review Panel into `app/dashboard/taxes/page.tsx`
- Render `FederalReturnReviewPanel` when `session.currentStep === "review"`.
- Provide smooth navigation and state updates.

### Step 5: Extend Gemini Context in `lib/ai/gemini/service.ts`
- Include `FederalReturn` readiness and reconciliation status in system prompt context.
- Support deterministic conversational replies for questions about return review, readiness, and filing status.

### Step 6: Create Comprehensive Test Suite `tests/phase4-federal-return-preparation.test.ts`
- Test sections A through K covering:
  - Filing statuses (Single, HOH, MFJ, MFS, QSS).
  - Income variations (Single W-2, multiple W-2s, 1099s, combined, spouse income).
  - Household and dependents with stable references.
  - Deductions and double-counting prevention.
  - Credits (CTC, ACTC, ODC, EITC, CDCTC).
  - Payments, withholdings, refund, and balance due.
  - Readiness engine (Complete, incomplete, warnings, blocking items).
  - Reconciliation engine (All mathematical consistency checks).
  - Persistence and backward compatibility.
  - Security (Authentication, session ownership, RLS boundary).
  - AI boundaries (Explanation-only, zero AI calculations).

---

## 5. Architectural Impacts

### A. Database Impact: **NONE (Zero Migrations Needed)**
- The existing `tax_preparation_sessions` table already stores `profile_snapshot`, `household_snapshot`, `income_snapshot`, `documents_snapshot`, `deductions_snapshot`, and `calculation_snapshot`.
- The `FederalReturn` domain model is a pure, deterministic projection derived directly from these validated snapshots.
- Storing no new redundant columns eliminates data synchronization drift and guarantees 100% backward compatibility for all existing rows.

### B. API Impact: **MINIMAL & EXTENSIBLE**
- Added 1 clean endpoint: `GET /api/v1/tax/preparation/session/federal-return`.
- All existing endpoints (`session/route.ts`, `calculate/route.ts`, `income/route.ts`, etc.) remain 100% compatible.

### C. UI Impact: **FOCUSED & CLEAN**
- Enhances Step 6 (`review`) from a plain continue button into a comprehensive, interactive Federal Return Review experience.
- Uses existing Tailwind and UI component patterns (`Card`, `Badge`, `Button`, `Check`, `AlertCircle`, etc.).

### D. Security Impact: **MAINTAINED**
- All endpoints enforce `getAuthenticatedUser(req)`.
- Sessions are strictly isolated by `user_id`.
- Zero secrets or client-side exposure of API keys.

---

## 6. Deferred Functionality (Explicitly Out of Scope)

The following areas are intentionally deferred to future phases:
- IRS Modernized e-File (MeF) transmission and XML schema generation.
- Form 1040 printable PDF generation.
- State income tax preparation and filing.
- Multilingual interface expansion.
- Stripe billing or entitlement mutations.

---

## 7. Audit Conclusion

The repository architecture is well-organized, strictly deterministic, and fully ready for Phase 4 implementation. We will now proceed with creating `lib/preparation/federal-return.ts`, the review panel, the API endpoint, and the comprehensive test suite.
