import { describe, it, expect } from "vitest";
import { calculateIncomeTax } from "../index";

describe("Tax Engine: 2025 Income Tax Deterministic Calculations (IRS IRB 2025-45 / OBBBA)", () => {
  it("verifies 2025 standard deductions for all 5 filing statuses under IRS IRB 2025-45", () => {
    // Single: $15,750 (1,575,000 cents)
    const single = calculateIncomeTax({ taxYear: 2025, filingStatus: "single", w2WagesCents: 1000000 });
    expect(single.deductionUsedCents).toBe(1575000);
    expect(single.rulesVersion).toBe("2025.2.0-irs-irb-2025-45-obbba");

    // Married Filing Separately: $15,750 (1,575,000 cents)
    const mfs = calculateIncomeTax({ taxYear: 2025, filingStatus: "married_filing_separately", w2WagesCents: 1000000 });
    expect(mfs.deductionUsedCents).toBe(1575000);

    // Married Filing Jointly: $31,500 (3,150,000 cents)
    const mfj = calculateIncomeTax({ taxYear: 2025, filingStatus: "married_filing_jointly", w2WagesCents: 2000000 });
    expect(mfj.deductionUsedCents).toBe(3150000);

    // Qualifying Surviving Spouse: $31,500 (3,150,000 cents)
    const qss = calculateIncomeTax({ taxYear: 2025, filingStatus: "qualifying_surviving_spouse", w2WagesCents: 2000000 });
    expect(qss.deductionUsedCents).toBe(3150000);

    // Head of Household: $23,625 (2,362,500 cents)
    const hoh = calculateIncomeTax({ taxYear: 2025, filingStatus: "head_of_household", w2WagesCents: 1500000 });
    expect(hoh.deductionUsedCents).toBe(2362500);
  });

  it("calculates exact progressive bracket math for 2025 single filer with $65,000 income", () => {
    // Income: $65,000 (6,500,000 cents)
    // 2025 Standard deduction (IRS IRB 2025-45): $15,750 (1,575,000 cents)
    // Taxable income: $65,000 - $15,750 = $49,250 (4,925,000 cents)
    // 10% on first $11,925: $1,192.50 = 119,250 cents
    // 12% on ($48,475 - $11,925 = $36,550): $4,386.00 = 438,600 cents
    // 22% on ($49,250 - $48,475 = $775): $170.50 = 17,050 cents
    // Total Federal Income Tax: $1,192.50 + $4,386.00 + $170.50 = $5,749.00 = 574,900 cents
    const result = calculateIncomeTax({
      taxYear: 2025,
      filingStatus: "single",
      w2WagesCents: 6500000,
      federalWithholdingCents: 700000, // $7,000.00
    });

    expect(result.taxYear).toBe(2025);
    expect(result.rulesVersion).toBe("2025.2.0-irs-irb-2025-45-obbba");
    expect(result.taxableIncomeCents).toBe(4925000);
    expect(result.federalIncomeTaxCents).toBe(574900);
    expect(result.marginalTaxBracket).toBe(0.22);
    expect(result.bracketBreakdown).toHaveLength(3);
    expect(result.bracketBreakdown[0].taxInBracketCents).toBe(119250);
    expect(result.bracketBreakdown[1].taxInBracketCents).toBe(438600);
    expect(result.bracketBreakdown[2].taxInBracketCents).toBe(17050);

    // Withholding balance: $7,000 - $5,749 = $1,251.00 refund
    expect(result.estimatedRefundCents).toBe(125100);
    expect(result.estimatedAmountOwedCents).toBe(0);
  });

  it("emits structured warning when unsupported itemized deduction is passed, falling back to standard deduction", () => {
    const result = calculateIncomeTax({
      taxYear: 2025,
      filingStatus: "single",
      w2WagesCents: 8000000,
      itemizedDeductionCents: 2500000, // unsupported Schedule A
    });

    expect(result.deductionType).toBe("standard");
    expect(result.deductionUsedCents).toBe(1575000); // 2025 standard deduction under IRB 2025-45
    const warning = result.warnings.find((w) => w.code === "ITEMIZED_DEDUCTIONS_UNSUPPORTED");
    expect(warning).toBeDefined();
    expect(warning?.level).toBe("unsupported");
  });
});
