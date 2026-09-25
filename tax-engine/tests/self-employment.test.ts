import { describe, it, expect } from "vitest";
import { calculateSelfEmployedTax } from "../index";

describe("Tax Engine: Self-Employment & 1099 Deterministic Calculations", () => {
  it("imposes $0 self-employment tax if net earnings are under $400 threshold", () => {
    const result = calculateSelfEmployedTax({
      taxYear: 2024,
      filingStatus: "single",
      gross1099IncomeCents: 35000, // $350
      businessExpensesCents: 0,
    });

    expect(result.selfEmploymentTaxCents).toBe(0);
    expect(result.selfEmploymentDetails?.taxableSelfEmploymentProfitCents).toBe(0);
  });

  it("calculates statutory Schedule SE self-employment tax with 50% above-the-line deduction", () => {
    // Gross: $50,000 (5,000,000 cents), Expenses: $10,000 (1,000,000 cents)
    // Net profit: $40,000 (4,000,000 cents)
    // Taxable profit (92.35%): $36,940 (3,694,000 cents)
    // Social Security (12.4%): $4,580.56 -> 458056 cents
    // Medicare (2.9%): $1,071.26 -> 107126 cents
    // Total SE Tax: $5,651.82 -> 565182 cents
    // Deductible half (50%): $2,825.91 -> 282591 cents
    const result = calculateSelfEmployedTax({
      taxYear: 2024,
      filingStatus: "single",
      gross1099IncomeCents: 5000000,
      businessExpensesCents: 1000000,
    });

    expect(result.selfEmploymentDetails?.netSelfEmploymentProfitCents).toBe(4000000);
    expect(result.selfEmploymentDetails?.taxableSelfEmploymentProfitCents).toBe(3694000);
    expect(result.selfEmploymentDetails?.socialSecurityTaxCents).toBe(458056);
    expect(result.selfEmploymentDetails?.medicareTaxCents).toBe(107126);
    expect(result.selfEmploymentTaxCents).toBe(565182);
    expect(result.selfEmploymentDetails?.deductibleHalfCents).toBe(282591);

    // AGI = Net Profit - Deductible Half = 4,000,000 - 282,591 = 3,717,409 cents
    expect(result.adjustedGrossIncomeCents).toBe(3717409);
  });

  it("adds warning if business expenses exceed gross income", () => {
    const result = calculateSelfEmployedTax({
      taxYear: 2024,
      filingStatus: "single",
      gross1099IncomeCents: 1000000, // $10,000
      businessExpensesCents: 1500000, // $15,000
    });

    expect(result.selfEmploymentTaxCents).toBe(0);
    const lossWarning = result.warnings.find((w) => w.code === "BUSINESS_LOSS_DETECTED");
    expect(lossWarning).toBeDefined();
  });
});
