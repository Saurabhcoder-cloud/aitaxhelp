import { describe, it, expect } from "vitest";
import {
  calculateIncomeTax,
  calculateSelfEmployedTax,
  calculateQuarterlyTax,
  SUPPORTED_TAX_YEARS,
} from "../tax-engine";
import { toCents, toDollars, formatCurrencyFromCents } from "../lib/utils/currency";

describe("Tax Engine Integration & Accuracy Suite (2025 & 2026 Baseline)", () => {
  it("verifies supported IRS tax years include 2026, 2025, 2024, and 2023", () => {
    expect(SUPPORTED_TAX_YEARS).toContain(2026);
    expect(SUPPORTED_TAX_YEARS).toContain(2025);
    expect(SUPPORTED_TAX_YEARS).toContain(2024);
    expect(SUPPORTED_TAX_YEARS).toContain(2023);
  });

  it("converts dollars to integer cents without floating point drift", () => {
    expect(toCents(123.45)).toBe(12345);
    expect(toCents(0.01)).toBe(1);
    expect(toDollars(12345)).toBe(123.45);
    expect(formatCurrencyFromCents(12345)).toBe("$123.45");
  });

  it("calculates W-2 Income Tax deterministically for 2025 single filer", () => {
    // Gross: $80,000 (8,000,000 cents)
    // 2025 Standard deduction (IRS IRB 2025-45): $15,750 (1,575,000 cents)
    // Taxable income: $64,250 (6,425,000 cents)
    // 10% on $11,925: $1,192.50 = 119,250 cents
    // 12% on ($48,475 - $11,925 = $36,550): $4,386.00 = 438,600 cents
    // 22% on ($64,250 - $48,475 = $15,775): $3,470.50 = 347,050 cents
    // Total Federal Income Tax: $1,192.50 + $4,386.00 + $3,470.50 = $9,049.00 = 904,900 cents
    const result = calculateIncomeTax({
      taxYear: 2025,
      filingStatus: "single",
      w2WagesCents: 8000000,
      federalWithholdingCents: 1000000, // $10,000.00
    });

    expect(result.taxYear).toBe(2025);
    expect(result.rulesVersion).toBe("2025.2.0-irs-irb-2025-45-obbba");
    expect(result.taxableIncomeCents).toBe(6425000);
    expect(result.federalIncomeTaxCents).toBe(904900);
    expect(result.marginalTaxBracket).toBe(0.22);
    expect(result.totalTaxLiabilityCents).toBe(904900);
    expect(result.estimatedRefundCents).toBe(95100); // $951.00 refund
    expect(result.estimatedAmountOwedCents).toBe(0);
  });

  it("calculates W-2 Income Tax deterministically for 2026 single filer", () => {
    // Gross: $80,000 (8,000,000 cents)
    // 2026 Standard deduction: $16,100 (1,610,000 cents)
    // Taxable income: $63,900 (6,390,000 cents)
    // 10% on $12,400: $1,240.00 = 124,000 cents
    // 12% on ($50,400 - $12,400 = $38,000): $4,560.00 = 456,000 cents
    // 22% on ($63,900 - $50,400 = $13,500): $2,970.00 = 297,000 cents
    // Total Federal Income Tax: $1,240 + $4,560 + $2,970 = $8,770.00 = 877,000 cents
    const result = calculateIncomeTax({
      taxYear: 2026,
      filingStatus: "single",
      w2WagesCents: 8000000,
      federalWithholdingCents: 1000000,
    });

    expect(result.taxYear).toBe(2026);
    expect(result.rulesVersion).toBe("2026.1.0-irs-rev-proc-2025-32");
    expect(result.taxableIncomeCents).toBe(6390000);
    expect(result.federalIncomeTaxCents).toBe(877000);
    expect(result.marginalTaxBracket).toBe(0.22);
    expect(result.totalTaxLiabilityCents).toBe(877000);
    expect(result.estimatedRefundCents).toBe(123000); // $1,230.00 refund
  });

  it("calculates 2025 Self-Employment Tax with $176,100 wage base limit", () => {
    const result = calculateSelfEmployedTax({
      taxYear: 2025,
      filingStatus: "single",
      gross1099IncomeCents: 10000000, // $100,000
      businessExpensesCents: 2000000, // $20,000
    });

    // Net profit: $80,000 (8,000,000 cents)
    // Taxable SE profit: $80,000 * 0.9235 = $73,880 (7,388,000 cents)
    // Social Security (12.4%): $73,880 * 0.124 = $9,161.12 -> 916112 cents
    // Medicare (2.9%): $73,880 * 0.029 = $2,142.52 -> 214252 cents
    // Total SE Tax: $11,303.64 -> 1130364 cents
    expect(result.selfEmploymentDetails?.netSelfEmploymentProfitCents).toBe(8000000);
    expect(result.selfEmploymentDetails?.taxableSelfEmploymentProfitCents).toBe(7388000);
    expect(result.selfEmploymentTaxCents).toBe(1130364);

    // Deductible half: $11,303.64 * 0.5 = $5,651.82 -> 565182 cents
    expect(result.selfEmploymentDetails?.deductibleHalfCents).toBe(565182);

    // AGI: $80,000 - $5,651.82 = $74,348.18 -> 7434818 cents
    expect(result.adjustedGrossIncomeCents).toBe(7434818);
  });

  it("calculates 2026 Quarterly Schedule with 4 vouchers matching federal total", () => {
    const result = calculateQuarterlyTax({
      taxYear: 2026,
      filingStatus: "single",
      estimatedAnnualGrossCents: 12000000, // $120,000
      estimatedAnnualExpensesCents: 2000000, // $20,000
    });

    const breakdown = result.quarterlyBreakdown;
    expect(breakdown).toBeDefined();
    expect(breakdown?.paymentDeadlines).toHaveLength(4);

    // Sum of vouchers should equal remaining tax
    const sumVouchers = breakdown!.paymentDeadlines.reduce((acc, v) => acc + v.amountCents, 0);
    expect(sumVouchers).toBe(breakdown!.remainingTaxToPayCents);
  });
});
