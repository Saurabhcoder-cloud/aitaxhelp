import { describe, it, expect } from "vitest";
import { calculateQuarterlyTax } from "../index";
import { calculateQuarterlySchedule } from "../calculations/quarterly";

describe("Tax Engine: Quarterly Estimated Tax Calculations (Form 1040-ES)", () => {
  it("splits estimated annual liability across four equal quarterly installments without loss of cents", () => {
    const result = calculateQuarterlyTax({
      taxYear: 2025,
      filingStatus: "single",
      estimatedAnnualGrossCents: 10000000, // $100,000
      estimatedAnnualExpensesCents: 2000000, // $20,000
    });

    const quarterly = result.quarterlyBreakdown;
    expect(quarterly).toBeDefined();
    expect(quarterly?.paymentDeadlines).toHaveLength(4);

    const sumVouchers = quarterly!.paymentDeadlines.reduce(
      (sum, v) => sum + v.amountCents,
      0
    );
    expect(sumVouchers).toBe(quarterly!.remainingTaxToPayCents);
  });

  it("verifies withholding contract: full liability when withholding=0, and reduced liability when withholding>0", () => {
    const withoutWithholding = calculateQuarterlyTax({
      taxYear: 2025,
      filingStatus: "single",
      estimatedAnnualGrossCents: 10000000,
      estimatedAnnualExpensesCents: 2000000,
      w2AnnualWithholdingCents: 0,
    });

    // When withholding = 0, remainingTaxToPayCents equals the full estimated liability
    expect(withoutWithholding.quarterlyBreakdown!.remainingTaxToPayCents).toBe(
      withoutWithholding.totalTaxLiabilityCents
    );
    expect(withoutWithholding.quarterlyBreakdown!.estimatedAnnualTaxCents).toBe(
      withoutWithholding.totalTaxLiabilityCents
    );

    const withWithholding = calculateQuarterlyTax({
      taxYear: 2025,
      filingStatus: "single",
      estimatedAnnualGrossCents: 10000000,
      estimatedAnnualExpensesCents: 2000000,
      w2AnnualWithholdingCents: 500000, // $5,000 withholding credit
    });

    // When withholding = 500000, remainingTaxToPayCents = previous remaining - 500000
    expect(withWithholding.quarterlyBreakdown!.remainingTaxToPayCents).toBe(
      withoutWithholding.quarterlyBreakdown!.remainingTaxToPayCents - 500000
    );

    // Vouchers must sum exactly to remainingTaxToPayCents
    const sumWithholdingVouchers = withWithholding.quarterlyBreakdown!.paymentDeadlines.reduce(
      (sum, v) => sum + v.amountCents,
      0
    );
    expect(sumWithholdingVouchers).toBe(withWithholding.quarterlyBreakdown!.remainingTaxToPayCents);
  });

  it("enforces a floor of zero when withholding exceeds total tax liability", () => {
    const result = calculateQuarterlyTax({
      taxYear: 2025,
      filingStatus: "single",
      estimatedAnnualGrossCents: 5000000,
      estimatedAnnualExpensesCents: 1000000,
      w2AnnualWithholdingCents: 20000000, // $200,000 withholding (far exceeds liability)
    });

    expect(result.quarterlyBreakdown!.remainingTaxToPayCents).toBe(0);
    expect(result.quarterlyBreakdown!.quarterlyPaymentCents).toBe(0);
    result.quarterlyBreakdown!.paymentDeadlines.forEach((v) => {
      expect(v.amountCents).toBe(0);
    });
  });

  it("handles zero gross income yielding zero quarterly installments", () => {
    const result = calculateQuarterlyTax({
      taxYear: 2025,
      filingStatus: "single",
      estimatedAnnualGrossCents: 0,
      estimatedAnnualExpensesCents: 0,
    });

    expect(result.totalTaxLiabilityCents).toBe(0);
    expect(result.quarterlyBreakdown?.remainingTaxToPayCents).toBe(0);
    expect(result.quarterlyBreakdown?.quarterlyPaymentCents).toBe(0);
  });

  it("distributes remainder cents with exact precision when remaining tax is not evenly divisible by 4", () => {
    // Test direct schedule calculation with remainder amounts
    // Example: 1,910,924 cents (evenly divisible: 477,731 * 4 = 1,910,924)
    const scheduleDivisible = calculateQuarterlySchedule(2025, 1910924, 0);
    expect(scheduleDivisible.remainingTaxToPayCents).toBe(1910924);
    expect(scheduleDivisible.vouchers[0].amountCents).toBe(477731);
    expect(scheduleDivisible.vouchers[1].amountCents).toBe(477731);
    expect(scheduleDivisible.vouchers[2].amountCents).toBe(477731);
    expect(scheduleDivisible.vouchers[3].amountCents).toBe(477731);
    const sumDivisible = scheduleDivisible.vouchers.reduce((s, v) => s + v.amountCents, 0);
    expect(sumDivisible).toBe(1910924);

    // Example with remainder 1: 1,910,925 cents -> Q1 gets +1 cent
    const scheduleRem1 = calculateQuarterlySchedule(2025, 1910925, 0);
    expect(scheduleRem1.vouchers[0].amountCents).toBe(477732);
    expect(scheduleRem1.vouchers[1].amountCents).toBe(477731);
    expect(scheduleRem1.vouchers[2].amountCents).toBe(477731);
    expect(scheduleRem1.vouchers[3].amountCents).toBe(477731);
    const sumRem1 = scheduleRem1.vouchers.reduce((s, v) => s + v.amountCents, 0);
    expect(sumRem1).toBe(1910925);

    // Example with remainder 2: 1,910,926 cents -> Q1 and Q2 get +1 cent
    const scheduleRem2 = calculateQuarterlySchedule(2025, 1910926, 0);
    expect(scheduleRem2.vouchers[0].amountCents).toBe(477732);
    expect(scheduleRem2.vouchers[1].amountCents).toBe(477732);
    expect(scheduleRem2.vouchers[2].amountCents).toBe(477731);
    expect(scheduleRem2.vouchers[3].amountCents).toBe(477731);
    const sumRem2 = scheduleRem2.vouchers.reduce((s, v) => s + v.amountCents, 0);
    expect(sumRem2).toBe(1910926);

    // Example with remainder 3: 1,910,927 cents -> Q1, Q2, and Q3 get +1 cent
    const scheduleRem3 = calculateQuarterlySchedule(2025, 1910927, 0);
    expect(scheduleRem3.vouchers[0].amountCents).toBe(477732);
    expect(scheduleRem3.vouchers[1].amountCents).toBe(477732);
    expect(scheduleRem3.vouchers[2].amountCents).toBe(477732);
    expect(scheduleRem3.vouchers[3].amountCents).toBe(477731);
    const sumRem3 = scheduleRem3.vouchers.reduce((s, v) => s + v.amountCents, 0);
    expect(sumRem3).toBe(1910927);

    // Extreme edge cases: Small integer cents (0, 1, 2, 3 cents)
    const schedule2Cents = calculateQuarterlySchedule(2025, 2, 0);
    expect(schedule2Cents.vouchers[0].amountCents).toBe(1);
    expect(schedule2Cents.vouchers[1].amountCents).toBe(1);
    expect(schedule2Cents.vouchers[2].amountCents).toBe(0);
    expect(schedule2Cents.vouchers[3].amountCents).toBe(0);
    expect(schedule2Cents.vouchers.reduce((s, v) => s + v.amountCents, 0)).toBe(2);
  });
});
