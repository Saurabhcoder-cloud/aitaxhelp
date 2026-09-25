import { describe, it, expect } from "vitest";
import { calculateIncomeTax } from "../index";

describe("Tax Engine: Income Tax Deterministic Calculations", () => {
  it("correctly calculates zero tax when income is below the standard deduction", () => {
    // 2024 Single Standard Deduction is $14,600 (1,460,000 cents)
    const result = calculateIncomeTax({
      taxYear: 2024,
      filingStatus: "single",
      w2WagesCents: 1200000, // $12,000
    });

    expect(result.grossIncomeCents).toBe(1200000);
    expect(result.deductionUsedCents).toBe(1460000);
    expect(result.taxableIncomeCents).toBe(0);
    expect(result.federalIncomeTaxCents).toBe(0);
    expect(result.effectiveTaxRate).toBe(0);
  });

  it("correctly computes progressive tax brackets for 2024 single filer", () => {
    // Income: $60,000 (6,000,000 cents)
    // 2024 Standard deduction: $14,600 (1,460,000 cents)
    // Taxable income: $45,400 (4,540,000 cents)
    // Bracket 1 (10% on first $11,600): $1,160.00 = 116,000 cents
    // Bracket 2 (12% on remainder $33,800): $4,056.00 = 405,600 cents
    // Total Federal Income Tax: $5,216.00 = 521,600 cents
    const result = calculateIncomeTax({
      taxYear: 2024,
      filingStatus: "single",
      w2WagesCents: 6000000,
    });

    expect(result.taxableIncomeCents).toBe(4540000);
    expect(result.federalIncomeTaxCents).toBe(521600);
    expect(result.marginalTaxBracket).toBe(0.12);
    expect(result.bracketBreakdown).toHaveLength(2);
    expect(result.bracketBreakdown[0].taxInBracketCents).toBe(116000);
    expect(result.bracketBreakdown[1].taxInBracketCents).toBe(405600);
  });

  it("correctly calculates refund when withholding exceeds tax liability", () => {
    const result = calculateIncomeTax({
      taxYear: 2024,
      filingStatus: "single",
      w2WagesCents: 6000000, // Tax is $5,216.00 (521,600 cents)
      federalWithholdingCents: 700000, // Withholding is $7,000.00
    });

    expect(result.federalIncomeTaxCents).toBe(521600);
    expect(result.estimatedRefundCents).toBe(178400); // $1,784.00 refund
    expect(result.estimatedAmountOwedCents).toBe(0);
  });

  it("emits structured warning and applies standard deduction if itemized deductions are passed", () => {
    // Standard deduction for single in 2024 is $14,600 (1,460,000 cents)
    // Unsupported itemized deduction: $20,000 (2,000,000 cents)
    const result = calculateIncomeTax({
      taxYear: 2024,
      filingStatus: "single",
      w2WagesCents: 10000000, // $100,000
      itemizedDeductionCents: 2000000,
    });

    expect(result.deductionType).toBe("standard");
    expect(result.deductionUsedCents).toBe(1460000);
    expect(result.taxableIncomeCents).toBe(8540000);
    const itemizedWarning = result.warnings.find((w) => w.code === "ITEMIZED_DEDUCTIONS_UNSUPPORTED");
    expect(itemizedWarning).toBeDefined();
    expect(itemizedWarning?.level).toBe("unsupported");
  });
});
