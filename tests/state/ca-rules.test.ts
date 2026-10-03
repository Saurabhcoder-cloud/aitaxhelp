import { describe, it, expect } from "vitest";
import {
  getCaliforniaRules,
  calculateCaliforniaStandardDeduction,
  calculateCaliforniaTaxBrackets,
  calculateCaliforniaExemptionCredits,
  calculateCalEitc,
  calculateYoungChildTaxCredit,
} from "../../lib/state-tax/rules/ca";
import { CaliforniaTaxEngine } from "../../lib/state-tax/engines/california-engine";

describe("California Statutory Tax Rules & Calculations — Phase 11", () => {
  const rules2025 = getCaliforniaRules(2025);
  const rules2026 = getCaliforniaRules(2026);
  const caEngine = new CaliforniaTaxEngine();

  describe("1. Standard Deductions (RTC § 17073.5)", () => {
    it("returns correct standard deduction for 2025 by filing status", () => {
      expect(calculateCaliforniaStandardDeduction("single", rules2025)).toBe(554_000); // $5,540.00
      expect(calculateCaliforniaStandardDeduction("married_filing_separately", rules2025)).toBe(554_000);
      expect(calculateCaliforniaStandardDeduction("married_filing_jointly", rules2025)).toBe(1_108_000); // $11,080.00
      expect(calculateCaliforniaStandardDeduction("head_of_household", rules2025)).toBe(1_108_000);
      expect(calculateCaliforniaStandardDeduction("qualifying_surviving_spouse", rules2025)).toBe(1_108_000);
    });

    it("returns indexed standard deduction for 2026 (~2.5% CCPI)", () => {
      expect(calculateCaliforniaStandardDeduction("single", rules2026)).toBe(568_000); // $5,680.00
      expect(calculateCaliforniaStandardDeduction("married_filing_jointly", rules2026)).toBe(1_136_000); // $11,360.00
      expect(calculateCaliforniaStandardDeduction("head_of_household", rules2026)).toBe(1_136_000);
    });
  });

  describe("2. Progressive Tax Brackets & Surtax (RTC § 17041)", () => {
    it("returns zero tax for zero or negative taxable income", () => {
      const res = calculateCaliforniaTaxBrackets(0, "single", rules2025);
      expect(res.grossTaxCents).toBe(0);
      expect(res.mentalHealthTaxCents).toBe(0);
      expect(res.effectiveRate).toBe(0);
    });

    it("calculates accurate tax within lowest 1% bracket", () => {
      // $10,000 taxable income -> 1% = $100.00
      const res = calculateCaliforniaTaxBrackets(1_000_000, "single", rules2025);
      expect(res.grossTaxCents).toBe(10_000);
      expect(res.marginalBracket).toBe(0.01);
      expect(res.mentalHealthTaxCents).toBe(0);
    });

    it("calculates progressive multi-bracket tax accurately for middle earner", () => {
      // $50,000 taxable income ($5,000,000 cents) for single filer:
      // In 6% bracket ($40,245 - $55,803).
      // Base tax at $40,245 = $992.26 (99,226 cents).
      // Excess: $50,000 - $40,245 = $9,755 * 6% = $585.30 (58,530 cents).
      // Total tax = 99,226 + 58,530 = 157,756 cents ($1,577.56).
      const res = calculateCaliforniaTaxBrackets(5_000_000, "single", rules2025);
      expect(res.grossTaxCents).toBe(157_756);
      expect(res.marginalBracket).toBe(0.06);
      expect(res.mentalHealthTaxCents).toBe(0);
    });

    it("calculates double-width brackets for married filing jointly", () => {
      // $100,000 taxable income for joint filer is in 6% bracket ($80,490 - $111,606)
      const res = calculateCaliforniaTaxBrackets(10_000_000, "married_filing_jointly", rules2025);
      expect(res.marginalBracket).toBe(0.06);
      expect(res.grossTaxCents).toBeGreaterThan(0);
    });

    it("assesses 1% Mental Health Services Tax on taxable income over $1,000,000", () => {
      // $1,500,000 taxable income ($150,000,000 cents):
      // Regular top bracket tax + 1% on ($1,500,000 - $1,000,000 = $500,000 -> $5,000.00 or 500,000 cents)
      const res = calculateCaliforniaTaxBrackets(150_000_000, "single", rules2025);
      expect(res.mentalHealthTaxCents).toBe(500_000); // exactly $5,000.00 surtax
      expect(res.grossTaxCents).toBeGreaterThan(res.mentalHealthTaxCents);
    });
  });

  describe("3. Exemption Credits (RTC § 17054)", () => {
    it("computes full personal exemption credits for normal income", () => {
      const singleEx = calculateCaliforniaExemptionCredits(5_000_000, "single", 0, rules2025);
      expect(singleEx.personalExemptionCreditCents).toBe(14_900); // $149.00
      expect(singleEx.dependentExemptionCreditCents).toBe(0);
      expect(singleEx.totalExemptionCreditsCents).toBe(14_900);

      const jointEx = calculateCaliforniaExemptionCredits(8_000_000, "married_filing_jointly", 2, rules2025);
      expect(jointEx.personalExemptionCreditCents).toBe(29_800); // $298.00
      expect(jointEx.dependentExemptionCreditCents).toBe(91_200); // $456 x 2 = $912.00
      expect(jointEx.totalExemptionCreditsCents).toBe(121_000);
    });

    it("phases out exemption credits for high AGI earners", () => {
      // Single threshold is $249,261. At $400,000 AGI, credits are phased out
      const phasedOut = calculateCaliforniaExemptionCredits(40_000_000, "single", 1, rules2025);
      expect(phasedOut.totalExemptionCreditsCents).toBeLessThan(14_900 + 45_600);
    });
  });

  describe("4. CalEITC & Young Child Tax Credit (RTC §§ 17052, 17052.1)", () => {
    it("returns zero CalEITC for income exceeding threshold ($31,550 for 2025)", () => {
      const eitc = calculateCalEitc(4_000_000, 1, rules2025);
      expect(eitc).toBe(0);
    });

    it("computes refundable CalEITC for low-income worker with children", () => {
      // $15,000 earned income with 1 child
      const eitc = calculateCalEitc(1_500_000, 1, rules2025);
      expect(eitc).toBeGreaterThan(0);
      expect(eitc).toBeLessThanOrEqual(200_000); // max $2,000
    });

    it("grants $1,117 Young Child Tax Credit for qualifying families", () => {
      const yctc = calculateYoungChildTaxCredit(1_500_000, true, true, rules2025);
      expect(yctc).toBe(111_700); // $1,117.00
    });

    it("denies Young Child Tax Credit if child is not under age 6 or does not qualify for CalEITC", () => {
      expect(calculateYoungChildTaxCredit(1_500_000, false, true, rules2025)).toBe(0);
      expect(calculateYoungChildTaxCredit(1_500_000, true, false, rules2025)).toBe(0);
    });
  });

  describe("5. California Tax Engine End-to-End Calculation", () => {
    it("computes full-year resident with W-2 withholding resulting in refund", () => {
      const result = caEngine.calculateStateTax({
        stateCode: "CA",
        taxYear: 2025,
        residencyType: "full_year_resident",
        filingStatus: "single",
        federalAgiCents: 6_000_000, // $60,000 AGI
        federalTaxableIncomeCents: 4_500_000,
        w2WagesCents: 6_000_000,
        gross1099IncomeCents: 0,
        selfEmploymentProfitCents: 0,
        qualifyingChildrenCount: 0,
        qualifyingDependentsCount: 0,
        stateWithholdingCents: 350_000, // $3,500 withheld
      });

      expect(result.stateCode).toBe("CA");
      expect(result.stateAgiCents).toBe(6_000_000);
      expect(result.breakdown.deductionUsedCents).toBe(554_000); // standard deduction
      expect(result.stateTaxableIncomeCents).toBe(6_000_000 - 554_000);
      expect(result.nonRefundableCreditsCents).toBe(14_900); // personal exemption credit
      expect(result.totalWithholdingCents).toBe(350_000);
      expect(result.refundOrBalanceType).toBe("refund");
      expect(result.refundOrBalanceCents).toBeGreaterThan(0);
    });

    it("computes full-year resident with insufficient withholding resulting in balance due", () => {
      const result = caEngine.calculateStateTax({
        stateCode: "CA",
        taxYear: 2025,
        residencyType: "full_year_resident",
        filingStatus: "single",
        federalAgiCents: 10_000_000, // $100,000 AGI
        federalTaxableIncomeCents: 8_500_000,
        w2WagesCents: 10_000_000,
        gross1099IncomeCents: 0,
        selfEmploymentProfitCents: 0,
        qualifyingChildrenCount: 0,
        qualifyingDependentsCount: 0,
        stateWithholdingCents: 50_000, // only $500 withheld
      });

      expect(result.refundOrBalanceType).toBe("balance_due");
      expect(result.refundOrBalanceCents).toBeGreaterThan(0);
    });

    it("prorates part-year / nonresident Form 540NR returns based on state-source allocation", () => {
      const fullResident = caEngine.calculateStateTax({
        stateCode: "CA",
        taxYear: 2025,
        residencyType: "full_year_resident",
        filingStatus: "single",
        federalAgiCents: 10_000_000,
        federalTaxableIncomeCents: 8_500_000,
        w2WagesCents: 10_000_000,
        gross1099IncomeCents: 0,
        selfEmploymentProfitCents: 0,
        qualifyingChildrenCount: 0,
        qualifyingDependentsCount: 0,
        stateWithholdingCents: 0,
      });

      const partYear = caEngine.calculateStateTax({
        stateCode: "CA",
        taxYear: 2025,
        residencyType: "part_year_resident",
        filingStatus: "single",
        federalAgiCents: 10_000_000,
        federalTaxableIncomeCents: 8_500_000,
        w2WagesCents: 10_000_000,
        gross1099IncomeCents: 0,
        selfEmploymentProfitCents: 0,
        qualifyingChildrenCount: 0,
        qualifyingDependentsCount: 0,
        stateWithholdingCents: 0,
        nonresidentIncomeAllocationPercentage: 50, // 50% California source
      });

      expect(partYear.stateTaxableIncomeCents).toBeLessThan(fullResident.stateTaxableIncomeCents);
      expect(partYear.grossStateTaxCents).toBeLessThan(fullResident.grossStateTaxCents);
    });
  });
});
