import { describe, it, expect } from "vitest";
import { calculateSelfEmployedTax } from "../index";

describe("Tax Engine: 2025 Self-Employment & Schedule SE (Rev. Proc. 2024-40 & SSA $176.1k Cap)", () => {
  it("imposes $0 self-employment tax if net earnings are under $400 threshold", () => {
    const result = calculateSelfEmployedTax({
      taxYear: 2025,
      filingStatus: "single",
      gross1099IncomeCents: 35000, // $350
      businessExpensesCents: 0,
    });

    expect(result.selfEmploymentTaxCents).toBe(0);
    expect(result.selfEmploymentDetails?.taxableSelfEmploymentProfitCents).toBe(0);
  });

  it("calculates 2025 statutory Schedule SE tax with 50% above-the-line deduction", () => {
    // Gross: $100,000 (10,000,000 cents), Expenses: $20,000 (2,000,000 cents)
    // Net profit: $80,000 (8,000,000 cents)
    // Taxable profit (92.35%): $73,880 (7,388,000 cents)
    // Social Security (12.4%): $73,880 * 0.124 = $9,161.12 -> 916112 cents
    // Medicare (2.9%): $73,880 * 0.029 = $2,142.52 -> 214252 cents
    // Total SE Tax: $11,303.64 -> 1130364 cents
    // Deductible half (50%): $5,651.82 -> 565182 cents
    const result = calculateSelfEmployedTax({
      taxYear: 2025,
      filingStatus: "single",
      gross1099IncomeCents: 10000000,
      businessExpensesCents: 2000000,
    });

    expect(result.taxYear).toBe(2025);
    expect(result.rulesVersion).toBe("2025.2.0-irs-irb-2025-45-obbba");
    expect(result.selfEmploymentDetails?.netSelfEmploymentProfitCents).toBe(8000000);
    expect(result.selfEmploymentDetails?.taxableSelfEmploymentProfitCents).toBe(7388000);
    expect(result.selfEmploymentDetails?.socialSecurityTaxCents).toBe(916112);
    expect(result.selfEmploymentDetails?.medicareTaxCents).toBe(214252);
    expect(result.selfEmploymentTaxCents).toBe(1130364);
    expect(result.selfEmploymentDetails?.deductibleHalfCents).toBe(565182);

    // AGI = Net Profit - Deductible Half = 8,000,000 - 565,182 = 7,434,818 cents
    expect(result.adjustedGrossIncomeCents).toBe(7434818);
  });

  it("strictly enforces 2025 Social Security wage base cap of $176,100 (17,610,000 cents)", () => {
    // High earner: Net profit of $250,000 (25,000,000 cents)
    // Taxable SE profit: $250,000 * 0.9235 = $230,875 (23,087,500 cents)
    // Social Security tax capped at $176,100: 17,610,000 * 0.124 = $21,836.40 = 2183640 cents
    // Medicare tax (uncapped): 23,087,500 * 0.029 = 669,537.5 -> 669538 cents ($6,695.38)
    // Total SE Tax: 2,183,640 + 669,538 = 2,853,178 cents ($28,531.78)
    const result = calculateSelfEmployedTax({
      taxYear: 2025,
      filingStatus: "single",
      gross1099IncomeCents: 25000000,
      businessExpensesCents: 0,
    });

    expect(result.selfEmploymentDetails?.socialSecurityTaxCents).toBe(2183640);
    expect(result.selfEmploymentDetails?.medicareTaxCents).toBe(669538);
    expect(result.selfEmploymentTaxCents).toBe(2853178);
  });

  it("coordinates W-2 wage base absorption against 2025 Social Security cap", () => {
    // W-2 wages: $150,000 (15,000,000 cents)
    // 2025 Social Security cap is $176,100.
    // Remaining cap available for SE earnings: $176,100 - $150,000 = $26,100 (2,610,000 cents).
    // SE Net profit: $50,000 (5,000,000 cents) -> Taxable: $46,175 (4,617,500 cents).
    // Social Security applies ONLY to $26,100 remaining cap: 2,610,000 * 0.124 = 323,640 cents ($3,236.40).
    const result = calculateSelfEmployedTax({
      taxYear: 2025,
      filingStatus: "single",
      gross1099IncomeCents: 5000000,
      businessExpensesCents: 0,
      w2WagesCents: 15000000,
    });

    expect(result.selfEmploymentDetails?.socialSecurityTaxCents).toBe(323640);
  });
});
