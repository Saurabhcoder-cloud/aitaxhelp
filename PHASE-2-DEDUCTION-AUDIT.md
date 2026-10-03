# TaxAIHelp — Phase 2 Deduction Discovery & Guided Deductions Audit

**Date:** 2026-10-02  
**Feature:** Phase 2 Interactive Deduction Discovery & Guided Deductions  
**Repository Working Tree:** `E:\USA TAX Project`  

---

## 1. Executive Summary & Audit Purpose

Phase 2 introduces an interactive, plain-language **Guided Deduction Discovery** questionnaire directly into Step 4 ("Deductions") of the "Start My Taxes" preparation journey.

This audit evaluates the existing codebase across:
1. Preparation session store & persistence (`lib/services/tax-preparation-session-store.ts`, `lib/preparation/`)
2. Deductions data model & schema validations (`lib/preparation/deductions.ts`, `lib/validations/preparation-deductions.ts`)
3. Deterministic tax engine deduction logic (`tax-engine/calculations/deductions.ts`, `tax-engine/index.ts`)
4. Preparation calculation pipeline (`lib/preparation/calculation.ts`)
5. Tax Situation Summary (`lib/preparation/situation-summary.ts`, `components/preparation/TaxSituationSummaryPanel.tsx`)
6. UI components & Guided Journey (`components/preparation/DeductionsPanel.tsx`, `app/dashboard/taxes/page.tsx`)
7. AI Explanation boundary (`lib/ai/gemini/service.ts`)
8. Database migrations & Supabase schema (`supabase/migrations/`)

---

## 2. What Already Exists

### 2.1 Database & Persistence
- **Table:** `public.tax_preparation_sessions`
  - Created in `supabase/migrations/20260928_tax_preparation_sessions.sql`.
  - Migration `20260928020000_preparation_documents_deductions.sql` already added:
    ```sql
    ALTER TABLE public.tax_preparation_sessions
      ADD COLUMN IF NOT EXISTS deductions_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;
    ```
  - **Audit Finding:** The existing `deductions_snapshot` column is JSONB and persists all deduction and discovery data with Row Level Security (RLS) and verified server user ID.
  - **Migration Needed?** **NO database migration is required.** The existing JSONB column fully supports all additive Phase 2 fields without schema alteration.

### 2.2 Deductions Data Model (`lib/preparation/deductions.ts`)
- Currently defines:
  - `DEDUCTION_CATEGORIES`: 4 initial business categories (`"equipment_supplies"`, `"software_subscriptions"`, `"home_office_vehicle"`, `"other_expenses"`).
  - `DeductionEntry`: `{ id, category, amountCents, description, relatedIncomeId, confirmed }`.
  - `DeductionDiscovery`: `{ saved, hasBusinessExpenses, standardDeductionAcknowledged, entries }`.
  - Utility helpers: `emptyDeductionDiscovery()`, `incomeSupportsBusinessExpenses()`, `deductionExpenseCents()`, `prefillDeductionsFromIncome()`.

### 2.3 Validations (`lib/validations/preparation-deductions.ts`)
- `centsSchema`: enforces integer cents, $\ge 0$, max $100,000,000,000$.
- `entrySchema`: validates single entries. Note: currently expects `id: z.string().uuid()` and `relatedIncomeId: z.string().uuid().nullable().optional()`.
- `deductionDiscoveryInputSchema`: validates `entries` array, duplicates, and non-empty amounts.
- `isCompleteDeductionDiscovery`: checks completeness against user's income situations.
  - *Audit Finding:* Currently, if `!incomeSupportsBusinessExpenses`, having any entries in `discovery.entries` triggers an error (`"Business expenses apply only when you have freelance, gig, or business income."`). This must be refined so personal/itemized discovery entries (e.g. mortgage, charity) do not trigger this error when discovered.

### 2.4 Deterministic Tax Engine (`tax-engine/calculations/deductions.ts`)
- `resolveDeductions(taxYear, filingStatus, itemizedDeductionCents)`:
  - Strictly applies official IRS Standard Deduction for the filing status and tax year.
  - If `itemizedDeductionCents > 0`, it records an explicit warning:
    `code: "ITEMIZED_DEDUCTIONS_UNSUPPORTED"`, message: `"Complex itemized deductions (Schedule A) are not supported in this baseline version. The official IRS standard deduction was applied."`
  - In `tax-engine/index.ts` (`calculateIncomeTax`), `itemizedDeductionCents` is passed into `resolveDeductions`.
  - In `calculateSelfEmployedTax`, 50% of SE tax is deducted above-the-line to arrive at AGI, and standard deduction is applied. Business expenses reduce Schedule C net profit prior to SE tax.
  - **Audit Finding:** The engine is strictly deterministic and authoritative. Standard deduction is the sole deduction applied for Schedule A baseline. Business expenses directly offset gross 1099/business receipts.

### 2.5 Tax Preparation Calculation Mapping (`lib/preparation/calculation.ts`)
- `resolvePreparationExpenseCents(deductions, income)`:
  - Sums confirmed deduction entries or falls back to activity expenses.
- `mapPreparationSessionToEngineInput`:
  - Maps `businessExpensesCents` into `SelfEmployedCalculationInput`.
  - Leaves `itemizedDeductionCents: 0` for `IncomeTaxCalculationInput`.

### 2.6 UI Deductions Panel (`components/preparation/DeductionsPanel.tsx`)
- Currently renders a rudimentary form:
  - Acknowledgment checkbox for W-2 only users.
  - Radio button ("Yes/No") for business expenses + list of 4 expense categories.
  - Lacks guided questionnaire, itemized discovery categories, business mileage rate handling, business-use percentages, and deduction review screen.

---

## 3. What Can Be Reused

1. **`tax_preparation_sessions.deductions_snapshot` (JSONB):**
   - Store full structured discovery state without new migrations.
2. **Session Store methods:**
   - `TaxPreparationSessionStore.saveDeductions(userId, input)` and `readDeductions(value)`.
3. **API Route:**
   - `PUT /api/v1/tax/preparation/session/deductions` and client helper `savePreparationDeductions()`.
4. **Deterministic Tax Engine:**
   - `resolveDeductions()` and `calculateIncomeTax()` / `calculateSelfEmployedTax()`.
5. **Session Step Transition:**
   - `updatePreparationProgress("deductions")` advances to step 5 (`calculation`).
6. **Existing Phase 1 Household & Credits:**
   - Filing status, spouse info, qualifying children, and credits flow through untouched.

---

## 4. What Is Missing & Needs Implementation

1. **Interactive Guided Questionnaire Data Structure:**
   - Plain-language question flows for:
     - **Home / Mortgage:** homeownership, mortgage interest (`amountCents`), property taxes (`amountCents`).
     - **Charitable Contributions:** cash donations (`amountCents`), non-cash donations (`amountCents`).
     - **Medical & Dental:** out-of-pocket medical expenses (`amountCents`).
     - **State & Local Taxes (SALT):** state/local income, sales, or real estate taxes (`amountCents`).
     - **Education:** student loan interest, tuition (`amountCents`) — clearly marked as future tax-rule extension.
     - **Child & Dependent Care:** daycare / dependent care costs (`amountCents`) — clearly marked as future tax-rule extension.
     - **Retirement / HSA:** traditional IRA contributions, HSA contributions (`amountCents`).
     - **Self-Employed / Business / Gig:** vehicle mileage (miles driven), home office, supplies, software/tools, advertising/marketing, professional services, insurance, phone/internet, other expenses.
2. **Business-Use Percentage & Expense Details:**
   - Support `businessUsePercent` (1–100%) for mixed-use expenses (e.g. phone/internet, vehicle).
   - Compute eligible business expense cents: $\text{Math.round}((\text{amountCents} \times \text{businessUsePercent}) / 100)$.
3. **Classification of Deductions:**
   - Clearly distinguish between:
     - **Self-Employed Business Expenses** (Schedule C offset: deductible against self-employment income).
     - **Standard Deduction** (official statutory deduction applied by engine).
     - **Schedule A Itemized Deductions** (mortgage, charity, medical, SALT — compared against standard deduction or marked unsupported Schedule A in baseline).
     - **Future Extensions / Informational** (education, dependent care, standard mileage rate).
4. **Interactive Guided UI (`components/preparation/DeductionsPanel.tsx`):**
   - Conditional questioning: asks business questions only if user has freelance/gig/business income; asks personal itemized questions conditionally (e.g. only ask mortgage details if user owned a home).
   - Category-by-category cards with helpful IRS tips and plain English.
   - Comprehensive **Deduction Review Screen** before completing the step, summarizing:
     - Category name & user-entered amount.
     - Status: "Applied to Business Profit", "Standard Deduction Exceeds Itemized", or "Future Tax-Rule Extension".
     - Eligible calculated deduction amount.
5. **Deductions Summary in `TaxSituationSummaryPanel` & Situation Summary:**
   - Enhance the Deductions block in `TaxSituationSummaryPanel` to detail business expenses vs. standard deduction vs. discovered itemized deductions.
6. **Gemini Service Context Integration:**
   - Ensure Gemini context and deterministic replies clearly articulate the verified deduction results calculated by the deterministic engine.

---

## 5. Architectural Plan & File Impact Matrix

### Files to Modify:
1. `lib/preparation/deductions.ts`:
   - Expand `DeductionCategory` and category definitions to encompass business expenses and guided itemized discovery categories.
   - Add types for `GuidedDeductionAnswers`, `DeductionClassification`, and business-use percentage.
   - Add helper functions to calculate eligible business expense cents taking into account business use percentages.
2. `lib/validations/preparation-deductions.ts`:
   - Support flexible string IDs (`z.string().trim().min(1)`).
   - Add schema for `guidedAnswers` and optional fields on `DeductionEntry` (`businessUsePercent`, `subtype`, `notes`, `categoryType`).
   - Update `isCompleteDeductionDiscovery` so itemized/guided personal questions are permitted for all taxpayers, while business expenses remain gated to business income.
3. `lib/services/tax-preparation-session-store.ts`:
   - Update `readDeductions` to parse and preserve `guidedAnswers` and new deduction entry properties.
4. `lib/preparation/calculation.ts`:
   - Update `resolvePreparationExpenseCents` to respect `businessUsePercent` when computing business expense offsets.
5. `lib/preparation/situation-summary.ts`:
   - Include discovered deduction details in `whatYouToldUs` and `informationReceived`.
6. `components/preparation/DeductionsPanel.tsx`:
   - Build the interactive multi-step guided questionnaire with conditional logic, business-use percentages, live calculation preview, and review screen.
7. `components/preparation/TaxSituationSummaryPanel.tsx`:
   - Display structured breakdown of deductions (Standard Deduction, Business Expenses, and Discovered Deductions).
8. `lib/ai/gemini/service.ts`:
   - Ensure the AI assistant context cleanly explains the deduction results with deterministic boundaries.

### Files to Create:
1. `PHASE-2-DEDUCTION-AUDIT.md` (this file).
2. `tests/preparation-guided-deductions.test.ts`:
   - Comprehensive test suite with at least 20 targeted scenarios covering all required edge cases.
3. `PHASE-2-DEDUCTION-VALIDATION-REPORT.md`:
   - Final comprehensive validation report.

### Database Migration:
- **Status:** **NOT REQUIRED**. The `deductions_snapshot JSONB` column in `tax_preparation_sessions` natively accommodates the versioned JSON structure.

---

## 6. Tax Safety Rules & Constraints

- **Strict Integer Cents:** All monetary inputs, calculations, and stored values are whole integer cents.
- **Sole Computation Authority:** The deterministic tax engine (`tax-engine/`) is the sole authority for calculations. Neither UI components nor Gemini shall calculate or invent tax deductions.
- **Mileage Deduction Rule:** The deterministic engine does not currently have a dynamic standard mileage rate schedule per year. Therefore, vehicle mileage information will be captured safely, but mileage deductions will be marked as "Unsupported / Future Extension" rather than guessing an unverified rate.
- **Itemized Deductions (Schedule A):** In the baseline engine, itemized deductions are unsupported and the statutory standard deduction is applied. The UI and summaries will clearly explain this statutory behavior to the user.
