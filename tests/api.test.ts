import { describe, it, expect } from "vitest";
import {
  incomeTaxInputSchema,
  selfEmployedInputSchema,
  quarterlyTaxInputSchema,
} from "../tax-engine/validation/schemas";

describe("API Validation Contracts Suite (2025 & 2026)", () => {
  it("successfully parses valid 2025 income tax inputs in integer cents", () => {
    const valid = {
      taxYear: 2025,
      filingStatus: "single",
      w2WagesCents: 5000000,
      otherIncomeCents: 100000,
      federalWithholdingCents: 600000,
    };

    const parsed = incomeTaxInputSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("successfully parses valid 2026 income tax inputs in integer cents", () => {
    const valid = {
      taxYear: 2026,
      filingStatus: "married_filing_jointly",
      w2WagesCents: 10000000,
      otherIncomeCents: 0,
      federalWithholdingCents: 1200000,
    };

    const parsed = incomeTaxInputSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("rejects negative wages in income tax schema", () => {
    const invalid = {
      taxYear: 2025,
      filingStatus: "single",
      w2WagesCents: -500000,
    };

    const parsed = incomeTaxInputSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it("validates 2025 self-employed input schema", () => {
    const valid = {
      taxYear: 2025,
      filingStatus: "married_filing_jointly",
      gross1099IncomeCents: 8500000,
      businessExpensesCents: 1200000,
    };

    const parsed = selfEmployedInputSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("validates 2026 quarterly tax schema", () => {
    const valid = {
      taxYear: 2026,
      filingStatus: "single",
      estimatedAnnualGrossCents: 10000000,
      estimatedAnnualExpensesCents: 2000000,
    };

    const parsed = quarterlyTaxInputSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });
});
