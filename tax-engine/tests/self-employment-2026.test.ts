import { describe, it, expect } from "vitest";
import { calculateSelfEmployedTax } from "../index";

describe("Tax Engine: 2026 Self-Employment & Schedule SE (Rev. Proc. 2025-32 & SSA $184.5k Cap)", () => {
  it("strictly enforces 2026 Social Security wage base cap of $184,500 (18,450,000 cents)", () => {
    // High earner: Net profit of $250,000 (25,000,000 cents)
    // Taxable SE profit: $250,000 * 0.9235 = $230,875 (23,087,500 cents)
    // Social Security tax capped at $184,500: 18,450,000 * 0.124 = $22,878.00 = 2287800 cents
    // Medicare tax (uncapped): 23,087,500 * 0.029 = 669,537.5 -> 669538 cents ($6,695.38)
    // Total SE Tax: 2,287,800 + 669,538 = 2,957,338 cents ($29,573.38)
    const result = calculateSelfEmployedTax({
      taxYear: 2026,
      filingStatus: "single",
      gross1099IncomeCents: 25000000,
      businessExpensesCents: 0,
    });

    expect(result.taxYear).toBe(2026);
    expect(result.rulesVersion).toBe("2026.1.0-irs-rev-proc-2025-32");
    expect(result.selfEmploymentDetails?.socialSecurityTaxCents).toBe(2287800);
    expect(result.selfEmploymentDetails?.medicareTaxCents).toBe(669538);
    expect(result.selfEmploymentTaxCents).toBe(2957338);

    // Deductible half: 2,957,338 * 0.5 = 1,478,669 cents
    expect(result.selfEmploymentDetails?.deductibleHalfCents).toBe(1478669);
  });

  it("coordinates W-2 wage base absorption against 2026 Social Security cap ($184,500)", () => {
    // W-2 wages: $160,000 (16,000,000 cents)
    // 2026 Social Security cap is $184,500.
    // Remaining cap available for SE earnings: $184,500 - $160,000 = $24,500 (2,450,000 cents).
    // SE Net profit: $50,000 (5,000,000 cents) -> Taxable: $46,175 (4,617,500 cents).
    // Social Security applies ONLY to $24,500 remaining cap: 2,450,000 * 0.124 = 303,800 cents ($3,038.00).
    const result = calculateSelfEmployedTax({
      taxYear: 2026,
      filingStatus: "single",
      gross1099IncomeCents: 5000000,
      businessExpensesCents: 0,
      w2WagesCents: 16000000,
    });

    expect(result.selfEmploymentDetails?.socialSecurityTaxCents).toBe(303800);
  });
});
