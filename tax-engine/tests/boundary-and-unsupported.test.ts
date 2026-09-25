import { describe, it, expect } from "vitest";
import { calculateIncomeTax, calculateSelfEmployedTax, getTaxRules } from "../index";
import { incomeTaxInputSchema } from "../validation/schemas";

describe("Tax Engine: Boundaries, Edge Cases, & Unsupported Features", () => {
  it("handles $0 gross income with $0 liability and zero tax rate", () => {
    const result = calculateIncomeTax({
      taxYear: 2025,
      filingStatus: "single",
      w2WagesCents: 0,
      otherIncomeCents: 0,
    });

    expect(result.grossIncomeCents).toBe(0);
    expect(result.taxableIncomeCents).toBe(0);
    expect(result.federalIncomeTaxCents).toBe(0);
    expect(result.effectiveTaxRate).toBe(0);
    expect(result.bracketBreakdown).toHaveLength(0);
  });

  it("throws deterministic error when an unsupported tax year is requested", () => {
    expect(() => getTaxRules(2027)).toThrowError(
      /Tax year 2027 is not supported/
    );
  });

  it("Zod schema strictly rejects negative wage inputs", () => {
    const invalidInput = {
      taxYear: 2025,
      filingStatus: "single",
      w2WagesCents: -50000,
    };

    const parseResult = incomeTaxInputSchema.safeParse(invalidInput);
    expect(parseResult.success).toBe(false);
  });

  it("always attaches structured NO_STATE_TAX and ESTIMATE_ONLY warnings", () => {
    const result = calculateIncomeTax({
      taxYear: 2025,
      filingStatus: "single",
      w2WagesCents: 5000000,
    });

    const hasStateWarning = result.warnings.some((w) => w.code === "NO_STATE_TAX");
    const hasEstimateWarning = result.warnings.some((w) => w.code === "ESTIMATE_ONLY");

    expect(hasStateWarning).toBe(true);
    expect(hasEstimateWarning).toBe(true);
  });

  it("attaches BUSINESS_LOSS_DETECTED warning when business expenses exceed gross earnings", () => {
    const result = calculateSelfEmployedTax({
      taxYear: 2025,
      filingStatus: "single",
      gross1099IncomeCents: 1000000, // $10,000
      businessExpensesCents: 1500000, // $15,000
    });

    expect(result.selfEmploymentTaxCents).toBe(0);
    const lossWarning = result.warnings.find((w) => w.code === "BUSINESS_LOSS_DETECTED");
    expect(lossWarning).toBeDefined();
    expect(lossWarning?.level).toBe("warning");
  });

  it("operates strictly in integer cents with zero decimal fraction drift", () => {
    const result = calculateIncomeTax({
      taxYear: 2025,
      filingStatus: "single",
      w2WagesCents: 7500033, // $75,000.33
      otherIncomeCents: 10047, // $100.47
      federalWithholdingCents: 850021, // $8,500.21
    });

    expect(Number.isInteger(result.grossIncomeCents)).toBe(true);
    expect(Number.isInteger(result.deductionUsedCents)).toBe(true);
    expect(Number.isInteger(result.taxableIncomeCents)).toBe(true);
    expect(Number.isInteger(result.federalIncomeTaxCents)).toBe(true);
    expect(Number.isInteger(result.totalTaxLiabilityCents)).toBe(true);
    expect(Number.isInteger(result.estimatedRefundCents)).toBe(true);
    expect(Number.isInteger(result.estimatedAmountOwedCents)).toBe(true);
  });
});
