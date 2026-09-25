import { describe, it, expect } from "vitest";
import { calculateIncomeTax } from "../index";

describe("Tax Engine: 2026 Income Tax Deterministic Calculations (Rev. Proc. 2025-32)", () => {
  it("verifies 2026 standard deductions for all filing statuses under Rev. Proc. 2025-32", () => {
    // Single: $16,100 (1,610,000 cents)
    const single = calculateIncomeTax({ taxYear: 2026, filingStatus: "single", w2WagesCents: 1000000 });
    expect(single.deductionUsedCents).toBe(1610000);
    expect(single.rulesVersion).toBe("2026.1.0-irs-rev-proc-2025-32");

    // Married Filing Separately: $16,100 (1,610,000 cents)
    const mfs = calculateIncomeTax({ taxYear: 2026, filingStatus: "married_filing_separately", w2WagesCents: 1000000 });
    expect(mfs.deductionUsedCents).toBe(1610000);

    // Married Filing Jointly: $32,200 (3,220,000 cents)
    const mfj = calculateIncomeTax({ taxYear: 2026, filingStatus: "married_filing_jointly", w2WagesCents: 2000000 });
    expect(mfj.deductionUsedCents).toBe(3220000);

    // Qualifying Surviving Spouse: $32,200 (3,220,000 cents)
    const qss = calculateIncomeTax({ taxYear: 2026, filingStatus: "qualifying_surviving_spouse", w2WagesCents: 2000000 });
    expect(qss.deductionUsedCents).toBe(3220000);

    // Head of Household: $24,150 (2,415,000 cents)
    const hoh = calculateIncomeTax({ taxYear: 2026, filingStatus: "head_of_household", w2WagesCents: 1500000 });
    expect(hoh.deductionUsedCents).toBe(2415000);
  });

  it("calculates exact progressive bracket math for 2026 single filer with $70,000 income", () => {
    // Income: $70,000 (7,000,000 cents)
    // 2026 Standard deduction: $16,100 (1,610,000 cents)
    // Taxable income: $53,900 (5,390,000 cents)
    // Bracket 1 (10% on first $12,400): $1,240.00 = 124,000 cents
    // Bracket 2 (12% on $50,400 - $12,400 = $38,000): $4,560.00 = 456,000 cents
    // Bracket 3 (22% on $53,900 - $50,400 = $3,500): $770.00 = 77,000 cents
    // Total Federal Income Tax: $1,240 + $4,560 + $770 = $6,570.00 = 657,000 cents
    const result = calculateIncomeTax({
      taxYear: 2026,
      filingStatus: "single",
      w2WagesCents: 7000000,
      federalWithholdingCents: 600000, // $6,000.00
    });

    expect(result.taxableIncomeCents).toBe(5390000);
    expect(result.federalIncomeTaxCents).toBe(657000);
    expect(result.marginalTaxBracket).toBe(0.22);
    expect(result.bracketBreakdown).toHaveLength(3);
    expect(result.bracketBreakdown[0].taxInBracketCents).toBe(124000);
    expect(result.bracketBreakdown[1].taxInBracketCents).toBe(456000);
    expect(result.bracketBreakdown[2].taxInBracketCents).toBe(77000);

    // Balance due: $6,570 - $6,000 = $570.00
    expect(result.estimatedAmountOwedCents).toBe(57000);
    expect(result.estimatedRefundCents).toBe(0);
  });
});
