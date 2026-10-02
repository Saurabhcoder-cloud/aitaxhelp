import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  POST as startSession,
  GET as getSession,
} from "../app/api/v1/tax/preparation/session/route";
import { PUT as saveHousehold } from "../app/api/v1/tax/preparation/session/household/route";
import { PUT as saveIncome } from "../app/api/v1/tax/preparation/session/income/route";
import { PUT as saveDeductions } from "../app/api/v1/tax/preparation/session/deductions/route";
import { POST as calculateSession } from "../app/api/v1/tax/preparation/session/calculate/route";
import { PATCH as patchProfile } from "../app/api/v1/auth/profile/route";
import { TaxPreparationSessionStore } from "../lib/services/tax-preparation-session-store";
import { TaxCalculationStore } from "../lib/services/tax-calculation-store";
import { UserProfileStore } from "../lib/services/user-profile-store";
import { calculateIncomeTax, calculateSelfEmployedTax } from "../tax-engine";
import { calculateMileageDeduction } from "../tax-engine/calculations/mileage";
import { calculateStudentLoanInterestDeduction } from "../tax-engine/calculations/student-loan-interest";
import { calculateItemizedDeductions } from "../tax-engine/calculations/itemized-deductions";
import { calculateCredits } from "../tax-engine/calculations/credits";
import { getTaxYearRules } from "../tax-engine/rules";
import { buildPreparationSessionDeterministicReply } from "../lib/ai/gemini/service";

function createMockRequest(
  url: string,
  options: { method?: string; body?: unknown; token?: string } = {}
) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: options.method || "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

const USER_TEST_TOKEN = "user-phase3-token-1111-2222-3333-444444444444";

describe("Phase 3: Federal Tax Rule Completeness Test Suite", () => {
  beforeEach(() => {
    TaxPreparationSessionStore.clear();
    TaxCalculationStore.clear();
    UserProfileStore.clear();
  });

  async function initSession(token: string, fullName = "Alex Morgan") {
    await patchProfile(
      createMockRequest("http://localhost:3000/api/v1/auth/profile", {
        method: "PATCH",
        token,
        body: { profile: { fullName } },
      })
    );

    const res = await startSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
        method: "POST",
        token,
        body: {},
      })
    );
    const data = await res.json();
    return data.data;
  }

  // =========================================================================
  // SECTION 1: Standard Mileage Deduction
  // =========================================================================
  describe("1. Standard Mileage Deduction (Schedule C / SE Expense)", () => {
    it("applies statutory versioned mileage rates (2023: 65.5¢, 2024: 67¢, 2025: 70¢, 2026: 70¢)", () => {
      const miles = 10_000;

      // 2023: 10,000 miles * 65.5 cents/mile = $6,550.00 = 655,000 cents
      const res2023 = calculateMileageDeduction(2023, miles);
      expect(res2023.ratePerMileCents).toBe(65.5);
      expect(res2023.deductionCents).toBe(655_000);

      // 2024: 10,000 miles * 67.0 cents/mile = $6,700.00 = 670,000 cents
      const res2024 = calculateMileageDeduction(2024, miles);
      expect(res2024.ratePerMileCents).toBe(67);
      expect(res2024.deductionCents).toBe(670_000);

      // 2025: 10,000 miles * 70.0 cents/mile = $7,000.00 = 700,000 cents
      const res2025 = calculateMileageDeduction(2025, miles);
      expect(res2025.ratePerMileCents).toBe(70);
      expect(res2025.deductionCents).toBe(700_000);

      // 2026: 10,000 miles * 70.0 cents/mile = $7,000.00 = 700,000 cents
      const res2026 = calculateMileageDeduction(2026, miles);
      expect(res2026.ratePerMileCents).toBe(70);
      expect(res2026.deductionCents).toBe(700_000);
    });

    it("handles precise rounding with fractional cents in total", () => {
      // 1,235 miles * 65.5 cents = 80,892.5 cents -> rounded to 80,893 cents ($808.93)
      const res2023 = calculateMileageDeduction(2023, 1_235);
      expect(res2023.deductionCents).toBe(80_893);
    });

    it("returns zero for zero or negative miles", () => {
      const res0 = calculateMileageDeduction(2024, 0);
      expect(res0.deductionCents).toBe(0);

      const resNeg = calculateMileageDeduction(2024, -500);
      expect(resNeg.deductionCents).toBe(0);
    });

    it("correctly reduces net Schedule C / self-employment profit in calculateSelfEmployedTax", () => {
      // Gross 1099: $50,000 = 5,000,000 cents
      // Actual expenses: $5,000 = 500,000 cents
      // Business miles: 10,000 miles in 2024 = $6,700 = 670,000 cents
      // Total business deductions: $5,000 + $6,700 = $11,700 = 1,170,000 cents
      // Net profit: $50,000 - $11,700 = $38,300 = 3,830,000 cents
      const result = calculateSelfEmployedTax({
        gross1099IncomeCents: 5_000_000,
        businessExpensesCents: 500_000,
        businessMiles: 10_000,
        filingStatus: "single",
        taxYear: 2024,
      });

      expect(result.netProfitCents).toBe(3_830_000);
      expect(result.mileageDetails).toBeDefined();
      expect(result.mileageDetails?.businessMiles).toBe(10_000);
      expect(result.mileageDetails?.mileageDeductionCents).toBe(670_000);
      expect(result.selfEmploymentDetails?.netSelfEmploymentProfitCents).toBe(3_830_000);
    });

    it("floors net Schedule C profit at zero when mileage and expenses exceed gross income", () => {
      // Gross 1099: $5,000 = 500,000 cents
      // Actual expenses: $2,000 = 200,000 cents
      // Business miles: 10,000 miles = $6,700 = 670,000 cents
      // Total deductions: $8,700 > $5,000 gross
      const result = calculateSelfEmployedTax({
        gross1099IncomeCents: 500_000,
        businessExpensesCents: 200_000,
        businessMiles: 10_000,
        filingStatus: "single",
        taxYear: 2024,
      });

      expect(result.netProfitCents).toBe(0);
      expect(result.selfEmploymentTaxCents).toBe(0);
      expect(result.taxableIncomeCents).toBe(0);
    });
  });

  // =========================================================================
  // SECTION 2: Student Loan Interest Deduction (IRC § 221)
  // =========================================================================
  describe("2. Student Loan Interest Deduction (IRC § 221 Above-the-Line)", () => {
    it("caps deduction at statutory maximum ($2,500 = 250,000 cents)", () => {
      // Paid $4,000 in interest with MAGI under phaseout
      const res = calculateStudentLoanInterestDeduction({
        taxYear: 2024,
        filingStatus: "single",
        interestPaidCents: 400_000,
        magiCents: 5_000_000, // $50,000 MAGI
      });
      expect(res.deductionCents).toBe(250_000);
      expect(res.eligibleInterestCents).toBe(250_000);
      expect(res.phaseoutReductionCents).toBe(0);
      expect(res.isDisallowed).toBe(false);
    });

    it("allows full interest paid if below the $2,500 maximum", () => {
      // Paid $1,450 interest
      const res = calculateStudentLoanInterestDeduction({
        taxYear: 2024,
        filingStatus: "single",
        interestPaidCents: 145_000,
        magiCents: 4_000_000,
      });
      expect(res.deductionCents).toBe(145_000);
    });

    it("completely disallows deduction for Married Filing Separately (MFS)", () => {
      const res = calculateStudentLoanInterestDeduction({
        taxYear: 2024,
        filingStatus: "married_filing_separately",
        interestPaidCents: 250_000,
        magiCents: 3_000_000,
      });
      expect(res.deductionCents).toBe(0);
      expect(res.isDisallowed).toBe(true);
      expect(res.disallowedReason).toMatch(/married filing separately/i);
    });

    it("completely disallows deduction if claimed as a dependent", () => {
      const res = calculateStudentLoanInterestDeduction({
        taxYear: 2024,
        filingStatus: "single",
        interestPaidCents: 250_000,
        magiCents: 3_000_000,
        isTaxpayerDependent: true,
      });
      expect(res.deductionCents).toBe(0);
      expect(res.isDisallowed).toBe(true);
      expect(res.disallowedReason).toContain("claimed as dependents");
    });

    it("correctly applies 2024 Single/HOH phaseout ($80k - $95k range)", () => {
      // MAGI = $80,000: No phaseout
      const resAtStart = calculateStudentLoanInterestDeduction({
        taxYear: 2024,
        filingStatus: "single",
        interestPaidCents: 250_000,
        magiCents: 8_000_000,
      });
      expect(resAtStart.deductionCents).toBe(250_000);
      expect(resAtStart.phaseoutReductionCents).toBe(0);

      // MAGI = $87,500: Exactly midpoint ($7,500 / $15,000 = 50% phased out)
      const resMid = calculateStudentLoanInterestDeduction({
        taxYear: 2024,
        filingStatus: "single",
        interestPaidCents: 250_000,
        magiCents: 8_750_000,
      });
      expect(resMid.phaseoutReductionCents).toBe(125_000);
      expect(resMid.deductionCents).toBe(125_000);

      // MAGI = $95,000 or above: 100% phased out
      const resFull = calculateStudentLoanInterestDeduction({
        taxYear: 2024,
        filingStatus: "single",
        interestPaidCents: 250_000,
        magiCents: 9_500_000,
      });
      expect(resFull.phaseoutReductionCents).toBe(250_000);
      expect(resFull.deductionCents).toBe(0);
    });

    it("correctly applies 2024 MFJ phaseout ($165k - $195k range)", () => {
      // MAGI = $165,000: No phaseout
      const resStart = calculateStudentLoanInterestDeduction({
        taxYear: 2024,
        filingStatus: "married_filing_jointly",
        interestPaidCents: 250_000,
        magiCents: 16_500_000,
      });
      expect(resStart.deductionCents).toBe(250_000);

      // MAGI = $180,000: Midpoint ($15,000 / $30,000 = 50% phased out)
      const resMid = calculateStudentLoanInterestDeduction({
        taxYear: 2024,
        filingStatus: "married_filing_jointly",
        interestPaidCents: 250_000,
        magiCents: 18_000_000,
      });
      expect(resMid.phaseoutReductionCents).toBe(125_000);
      expect(resMid.deductionCents).toBe(125_000);

      // MAGI = $195,000: Fully phased out
      const resFull = calculateStudentLoanInterestDeduction({
        taxYear: 2024,
        filingStatus: "married_filing_jointly",
        interestPaidCents: 250_000,
        magiCents: 19_500_000,
      });
      expect(resFull.deductionCents).toBe(0);
    });

    it("verifies 2023 vs 2025 versioned phaseout thresholds", () => {
      const rules2023 = getTaxYearRules(2023).studentLoanInterest!;
      // 2023 Single phaseout: $75,000 - $90,000 ($15,000 range)
      expect(rules2023.phaseoutThresholdCents.single).toBe(7_500_000);
      expect(rules2023.phaseoutRangeCents.single).toBe(1_500_000);

      const rules2025 = getTaxYearRules(2025).studentLoanInterest!;
      // 2025 Single phaseout: $85,000 - $100,000 ($15,000 range)
      expect(rules2025.phaseoutThresholdCents.single).toBe(8_500_000);
      expect(rules2025.phaseoutRangeCents.single).toBe(1_500_000);
    });

    it("deducts above-the-line to reduce AGI in calculateIncomeTax", () => {
      // W-2: $60,000 = 6,000,000 cents
      // Student loan interest: $2,500 = 250,000 cents
      // AGI should be $60,000 - $2,500 = $57,500 = 5,750,000 cents
      const result = calculateIncomeTax({
        w2WagesCents: 6_000_000,
        studentLoanInterestCents: 250_000,
        filingStatus: "single",
        taxYear: 2024,
      });

      expect(result.adjustedGrossIncomeCents).toBe(5_750_000);
      expect(result.aboveTheLineDeductions?.studentLoanInterestCents).toBe(250_000);
      // Standard deduction in 2024 for single: $14,600 = 1,460,000 cents
      // Taxable income: $57,500 - $14,600 = $42,900 = 4,290,000 cents
      expect(result.taxableIncomeCents).toBe(4_290_000);
    });
  });

  // =========================================================================
  // SECTION 3: Child and Dependent Care Credit (CDCTC - IRC § 21)
  // =========================================================================
  describe("3. Child and Dependent Care Credit (IRC § 21 Non-Refundable)", () => {
    it("applies statutory expense limits ($3,000 for 1 qualifying person, $6,000 for 2+)", () => {
      // 1 child, $5,000 paid expenses -> capped at $3,000. High income (> $43k) -> 20%
      const res1 = calculateCredits({
        taxYear: 2024,
        filingStatus: "single",
        adjustedGrossIncomeCents: 6_000_000, // $60,000
        taxBeforeCreditsCents: 500_000,
        earnedIncomeCents: 6_000_000,
        childCareExpensesCents: 500_000, // $5,000
        qualifyingCarePersonsCount: 1,
      });
      // 20% of $3,000 = $600 = 60,000 cents
      expect(res1.childAndDependentCareCreditCents).toBe(60_000);

      // 2 children, $8,000 paid expenses -> capped at $6,000. 20% of $6,000 = $1,200 = 120,000 cents
      const res2 = calculateCredits({
        taxYear: 2024,
        filingStatus: "single",
        adjustedGrossIncomeCents: 6_000_000,
        taxBeforeCreditsCents: 500_000,
        earnedIncomeCents: 6_000_000,
        childCareExpensesCents: 800_000,
        qualifyingCarePersonsCount: 2,
      });
      expect(res2.childAndDependentCareCreditCents).toBe(120_000);
    });

    it("caps allowable care expenses by earned income (single filer)", () => {
      // Earned income only $2,000 = 200,000 cents, paid $4,000 care expenses
      const res = calculateCredits({
        taxYear: 2024,
        filingStatus: "single",
        adjustedGrossIncomeCents: 200_000,
        taxBeforeCreditsCents: 50_000,
        earnedIncomeCents: 200_000, // $2,000
        childCareExpensesCents: 400_000,
        qualifyingCarePersonsCount: 1,
      });
      // AGI <= $15,000 -> 35% rate. 35% of $2,000 = $700 = 70,000 cents.
      // But non-refundable credit cannot exceed tentative tax ($50,000 cents).
      expect(res.childAndDependentCareCreditCents).toBe(50_000);
    });

    it("caps allowable care expenses by lesser spouse earned income in MFJ", () => {
      // Taxpayer earned $80,000, spouse earned $0 -> allowable care expenses = $0
      const resZeroSpouse = calculateCredits({
        taxYear: 2024,
        filingStatus: "married_filing_jointly",
        adjustedGrossIncomeCents: 8_000_000,
        taxBeforeCreditsCents: 500_000,
        earnedIncomeCents: 8_000_000,
        spouseEarnedIncomeCents: 0,
        childCareExpensesCents: 500_000,
        qualifyingCarePersonsCount: 1,
      });
      expect(resZeroSpouse.childAndDependentCareCreditCents).toBe(0);

      // Taxpayer earned $80,000, spouse earned $2,500 -> capped at $2,500
      const resSpousePart = calculateCredits({
        taxYear: 2024,
        filingStatus: "married_filing_jointly",
        adjustedGrossIncomeCents: 8_250_000,
        taxBeforeCreditsCents: 500_000,
        earnedIncomeCents: 8_000_000,
        spouseEarnedIncomeCents: 250_000, // $2,500
        childCareExpensesCents: 500_000,
        qualifyingCarePersonsCount: 1,
      });
      // High AGI -> 20%. 20% of $2,500 = $500 = 50,000 cents
      expect(resSpousePart.childAndDependentCareCreditCents).toBe(50_000);
    });

    it("disallows CDCTC for Married Filing Separately (MFS)", () => {
      const res = calculateCredits({
        taxYear: 2024,
        filingStatus: "married_filing_separately",
        adjustedGrossIncomeCents: 4_000_000,
        taxBeforeCreditsCents: 300_000,
        earnedIncomeCents: 4_000_000,
        childCareExpensesCents: 300_000,
        qualifyingCarePersonsCount: 1,
      });
      expect(res.childAndDependentCareCreditCents).toBe(0);
    });

    it("correctly evaluates sliding scale percentages (35% down to 20%)", () => {
      // Case 1: AGI <= $15,000 -> 35%
      const resLow = calculateCredits({
        taxYear: 2024,
        filingStatus: "head_of_household",
        adjustedGrossIncomeCents: 1_400_000, // $14,000
        taxBeforeCreditsCents: 200_000,
        earnedIncomeCents: 1_400_000,
        childCareExpensesCents: 300_000, // $3,000
        qualifyingCarePersonsCount: 1,
      });
      // 35% of $3,000 = $1,050 = 105,000 cents
      expect(resLow.childAndDependentCareCreditCents).toBe(105_000);

      // Case 2: AGI $21,000 ($6,000 above $15k -> 3 steps of $2,000 -> 35% - 3% = 32%)
      const resMid = calculateCredits({
        taxYear: 2024,
        filingStatus: "head_of_household",
        adjustedGrossIncomeCents: 2_100_000,
        taxBeforeCreditsCents: 200_000,
        earnedIncomeCents: 2_100_000,
        childCareExpensesCents: 300_000,
        qualifyingCarePersonsCount: 1,
      });
      // 32% of $3,000 = $960 = 96,000 cents
      expect(resMid.childAndDependentCareCreditCents).toBe(96_000);
    });

    it("ensures CDCTC is non-refundable and does not reduce tax below zero", () => {
      // Tentative tax: $300 = 30,000 cents
      // Calculated CDCTC would be $600 (20% of $3,000)
      // Credit used must be capped at tentative tax: $30,000 cents
      const res = calculateCredits({
        taxYear: 2024,
        filingStatus: "single",
        adjustedGrossIncomeCents: 5_000_000,
        taxBeforeCreditsCents: 30_000,
        earnedIncomeCents: 5_000_000,
        childCareExpensesCents: 300_000,
        qualifyingCarePersonsCount: 1,
      });
      expect(res.childAndDependentCareCreditCents).toBe(30_000);
    });
  });

  // =========================================================================
  // SECTION 4: Schedule A Itemized Deductions & Comparison
  // =========================================================================
  describe("4. Schedule A Itemized Deductions (Medical, SALT, Mortgage, Charity)", () => {
    it("applies 7.5% AGI floor to medical and dental expenses", () => {
      // AGI: $100,000 = 10,000,000 cents -> 7.5% floor is $7,500 = 750,000 cents
      // Medical paid: $10,000 = 1,000,000 cents
      // Allowable: $10,000 - $7,500 = $2,500 = 250,000 cents
      const res = calculateItemizedDeductions(2024, "single", 10_000_000, {
        medicalExpensesCents: 1_000_000,
      });

      expect(res.allowableMedicalCents).toBe(250_000);
      expect(res.breakdown.medicalAgiThresholdCents).toBe(750_000);
      expect(res.totalScheduleACents).toBe(250_000);

      // If medical paid is below floor: $5,000 paid < $7,500 floor -> $0 allowable
      const resBelow = calculateItemizedDeductions(2024, "single", 10_000_000, {
        medicalExpensesCents: 500_000,
      });
      expect(resBelow.allowableMedicalCents).toBe(0);
    });

    it("applies statutory SALT cap ($10,000 for Single/MFJ/HOH; $5,000 for MFS)", () => {
      // State taxes: $8,000 + Real estate: $6,000 = $14,000 -> capped at $10,000
      const resSingle = calculateItemizedDeductions(2024, "single", 10_000_000, {
        stateAndLocalIncomeTaxesCents: 800_000,
        realEstatePropertyTaxesCents: 600_000,
      });
      expect(resSingle.breakdown.saltTotalClaimedCents).toBe(1_400_000);
      expect(resSingle.allowableSaltCents).toBe(1_000_000);
      expect(resSingle.breakdown.saltCapCents).toBe(1_000_000);

      // Married Filing Separately: capped at $5,000
      const resMfs = calculateItemizedDeductions(2024, "married_filing_separately", 10_000_000, {
        stateAndLocalIncomeTaxesCents: 800_000,
        realEstatePropertyTaxesCents: 600_000,
      });
      expect(resMfs.allowableSaltCents).toBe(500_000);
      expect(resMfs.breakdown.saltCapCents).toBe(500_000);
    });

    it("correctly includes mortgage interest and charitable contributions", () => {
      const res = calculateItemizedDeductions(2024, "single", 8_000_000, {
        mortgageInterestCents: 1_200_000, // $12,000
        charitableCashCents: 500_000, // $5,000
        stateAndLocalIncomeTaxesCents: 600_000, // $6,000 (under SALT cap)
      });

      expect(res.allowableMortgageInterestCents).toBe(1_200_000);
      expect(res.allowableCharitableCents).toBe(500_000);
      expect(res.allowableSaltCents).toBe(600_000);
      expect(res.totalScheduleACents).toBe(2_300_000); // $23,000
    });

    it("chooses Itemized Deductions when allowable itemized exceeds standard deduction", () => {
      // 2024 Single standard deduction is $14,600 = 1,460,000 cents
      // Schedule A total: $18,000 ($1,800,000 cents)
      const result = calculateIncomeTax({
        w2WagesCents: 8_000_000,
        filingStatus: "single",
        taxYear: 2024,
        scheduleA: {
          mortgageInterestCents: 1_000_000,
          stateAndLocalIncomeTaxesCents: 800_000,
        },
      });

      expect(result.deductionType).toBe("itemized");
      expect(result.deductionUsedCents).toBe(1_800_000);
      expect(result.itemizedBreakdown?.totalScheduleACents).toBe(1_800_000);
      // Taxable income: $80,000 - $18,000 = $62,000 = 6,200,000 cents
      expect(result.taxableIncomeCents).toBe(6_200_000);
    });

    it("defaults to Standard Deduction when itemized deductions are lower", () => {
      // 2024 Single standard deduction is $14,600 = 1,460,000 cents
      // Schedule A total: $8,000 ($800,000 cents)
      const result = calculateIncomeTax({
        w2WagesCents: 8_000_000,
        filingStatus: "single",
        taxYear: 2024,
        scheduleA: {
          mortgageInterestCents: 500_000,
          charitableCashCents: 300_000,
        },
      });

      expect(result.deductionType).toBe("standard");
      expect(result.deductionUsedCents).toBe(1_460_000); // Standard deduction used!
      expect(result.itemizedBreakdown?.totalScheduleACents).toBe(800_000);
      // Taxable income: $80,000 - $14,600 = $65,400 = 6,540,000 cents
      expect(result.taxableIncomeCents).toBe(6_540_000);
    });
  });

  // =========================================================================
  // SECTION 5: Comprehensive Integration & Double-Counting Guardrails
  // =========================================================================
  describe("5. End-to-End Integration & Double-Counting Guardrails", () => {
    it("handles complex multi-income profile with mileage, student loan, CDCTC, CTC, and Schedule A", () => {
      // Profile:
      // Taxpayer W-2: $45,000 = 4,500,000 cents
      // 1099-NEC: $20,000 = 2,000,000 cents
      // Business expenses: $2,000 = 200,000 cents
      // Business miles: 4,000 miles in 2024 = $2,680 = 268,000 cents
      // Net 1099 profit: $20,000 - $2,000 - $2,680 = $15,320 = 1,532,000 cents
      // Student loan interest: $2,000 = 200,000 cents (MAGI ~$59k, under $80k phaseout start)
      // 1 Qualifying Child under 13 for both CTC and CDCTC
      // Child care expenses: $3,500 = 350,000 cents (capped at $3,000)
      // Schedule A: Mortgage interest $10,000 + SALT $6,000 = $16,000 ($1,600,000 cents > $14,600 standard)
      const result = calculateSelfEmployedTax({
        w2WagesCents: 4_500_000,
        gross1099IncomeCents: 2_000_000,
        businessExpensesCents: 200_000,
        businessMiles: 4_000,
        studentLoanInterestCents: 200_000,
        childCareExpensesCents: 350_000,
        qualifyingCarePersonsCount: 1,
        dependents: [
          {
            id: "child-1",
            firstName: "Junior",
            lastName: "Morgan",
            relationship: "daughter",
            dateOfBirth: "2018-05-10",
            monthsLivedWithTaxpayer: 12,
            isFullTimeStudent: true,
            isPermanentlyDisabled: false,
          },
        ],
        scheduleA: {
          mortgageInterestCents: 1_000_000,
          stateAndLocalIncomeTaxesCents: 600_000,
        },
        filingStatus: "single",
        taxYear: 2024,
      });

      // 1. Mileage verification
      expect(result.mileageDetails?.businessMiles).toBe(4_000);
      expect(result.mileageDetails?.mileageDeductionCents).toBe(268_000);
      expect(result.selfEmploymentDetails?.netSelfEmploymentProfitCents).toBe(1_532_000);

      // 2. Student loan interest verification (above the line)
      expect(result.aboveTheLineDeductions?.studentLoanInterestCents).toBe(200_000);

      // 3. Schedule A itemized selected over standard
      expect(result.deductionType).toBe("itemized");
      expect(result.deductionUsedCents).toBe(1_600_000);
      expect(result.itemizedBreakdown?.totalScheduleACents).toBe(1_600_000);

      // 4. Credits verification: both CTC and CDCTC present
      expect(result.credits?.qualifyingCarePersonsCount).toBe(1);
      // CDCTC: 20% of $3,000 = $600 = 60,000 cents
      expect(result.credits?.childAndDependentCareCreditCents).toBe(60_000);
      // Child tax credit for child under 17: $2,000 = 200,000 cents
      expect(result.credits?.childTaxCreditCents).toBe(200_000);

      // 5. Total tax and payments are deterministic integers
      expect(result.federalIncomeTaxCents).toBeGreaterThan(0);
      expect(result.effectiveTaxRate).toBeGreaterThan(0);
      expect(Number.isInteger(result.totalTaxLiabilityCents)).toBe(true);
    });

    it("executes through API preparation session endpoints and populates TaxSituationSummary correctly", async () => {
      // 1. Initialize session
      const session = await initSession(USER_TEST_TOKEN, "Taylor Swift");
      expect(session.id).toBeDefined();

      // 2. Save household with 1 qualifying child
      const hhRes = await saveHousehold(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
          method: "PUT",
          token: USER_TEST_TOKEN,
          body: {
            filingStatus: "single",
            dependents: [
              {
                id: "dep-1",
                firstName: "Child",
                lastName: "Swift",
                dateOfBirth: "2019-03-15",
                relationship: "son",
                monthsLivedWithTaxpayer: 12,
                isFullTimeStudent: true,
                isPermanentlyDisabled: false,
              },
            ],
          },
        })
      );
      expect(hhRes.status).toBe(200);

      // 3. Save income: W-2 + 1099
      const incRes = await saveIncome(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/income", {
          method: "PUT",
          token: USER_TEST_TOKEN,
          body: {
            situations: ["employer", "freelance"],
            w2s: [
              {
                id: "w2-1",
                employerName: "Music Corp",
                wagesCents: 5_000_000, // $50,000
                federalWithholdingCents: 600_000, // $6,000
              },
            ],
            form1099s: [
              {
                id: "1099-1",
                incomeType: "freelance",
                payerName: "Concert Tour LLC",
                grossIncomeCents: 1_500_000, // $15,000
                federalWithholdingCents: 0,
              },
            ],
            activities: [],
          },
        })
      );
      expect(incRes.status).toBe(200);

      // 4. Save deductions: business mileage, student loan, child care, and itemized deductions
      const dedRes = await saveDeductions(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/deductions", {
          method: "PUT",
          token: USER_TEST_TOKEN,
          body: {
            hasBusinessExpenses: true,
            standardDeductionAcknowledged: true,
            entries: [
              {
                id: "ded-business",
                category: "equipment_supplies",
                amountCents: 100_000,
                description: "Equipment",
                confirmed: true,
                status: "applied_business",
              },
              {
                id: "ded-mileage",
                category: "business_mileage",
                amountCents: 335_000, // 5,000 miles * 67 cents = $3,350
                description: "Business Miles",
                confirmed: true,
                status: "applied_business",
              },
              {
                id: "ded-student-loan",
                category: "education_expenses",
                amountCents: 180_000,
                description: "Student Loan Interest",
                confirmed: true,
                status: "applied_above_the_line",
              },
              {
                id: "ded-child-care",
                category: "childcare_expenses",
                amountCents: 300_000,
                description: "Daycare Services",
                confirmed: true,
                status: "future_extension",
              },
              {
                id: "ded-mortgage",
                category: "mortgage_interest",
                amountCents: 1_200_000,
                description: "Primary Home Mortgage",
                confirmed: true,
                status: "applied_itemized",
              },
              {
                id: "ded-salt",
                category: "state_local_taxes",
                amountCents: 600_000,
                description: "State Income Taxes",
                confirmed: true,
                status: "applied_itemized",
              },
            ],
            guidedAnswers: {
              business: {
                hadBusinessExpenses: true,
                milesDriven: 5_000,
              },
              home: {
                ownedHome: true,
                mortgageInterestCents: 1_200_000,
              },
              stateLocal: {
                paidStateLocalTaxes: true,
                stateLocalTaxCents: 600_000,
              },
              education: {
                paidEducation: true,
                studentLoanInterestCents: 180_000,
              },
              childcare: {
                paidChildcare: true,
                childcareCents: 300_000,
              },
            },
          },
        })
      );
      expect(dedRes.status).toBe(200);

      // 5. Run calculation endpoint
      const calcRes = await calculateSession(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/calculate", {
          method: "POST",
          token: USER_TEST_TOKEN,
        })
      );
      expect(calcRes.status).toBe(200);
      const calcJson = await calcRes.json();
      const updatedSession = calcJson.data;

      // Verify calculation details in session state
      expect(updatedSession.calculationSnapshot).toBeDefined();
      const calc = updatedSession.calculationSnapshot!;

      // Itemized: $12,000 mortgage + $6,000 salt = $18,000 > $14,600 standard
      expect(calc.deductionType).toBe("itemized");
      expect(calc.deductionUsedCents).toBe(1_800_000);
      expect(calc.itemizedBreakdown?.totalScheduleACents).toBe(1_800_000);
      expect(calc.itemizedBreakdown?.allowableMortgageInterestCents).toBe(1_200_000);
      expect(calc.itemizedBreakdown?.allowableSaltCents).toBe(600_000);

      // Mileage details (5,000 miles * 70 cents = $3,500 = 350,000 cents in default tax year 2026)
      expect(calc.mileageDetails?.businessMiles).toBe(5_000);
      expect(calc.mileageDetails?.mileageDeductionCents).toBe(350_000);

      // Above the line student loan interest
      expect(calc.aboveTheLineDeductions?.studentLoanInterestCents).toBe(180_000);

      // Credits: CDCTC + CTC
      expect(calc.credits.childAndDependentCareCreditCents).toBe(60_000);
      expect(calc.credits.childTaxCreditCents).toBe(200_000);

      // Verify Gemini deterministic assistant reply
      const reply = buildPreparationSessionDeterministicReply(updatedSession, "Explain my deductions");
      expect(reply).toContain("Schedule A Itemized Deductions");
      expect(reply).toContain("$18,000.00");
      expect(reply).toContain("Business Mileage");
      expect(reply).toContain("Student Loan Interest");
    });
  });
});
