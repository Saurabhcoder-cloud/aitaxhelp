import { describe, it, expect } from "vitest";
import { validateCurrencyInput } from "@/lib/utils/calculator-validation";
import { POST } from "@/app/api/v1/tax/calculate/route";
import { NextRequest } from "next/server";

describe("Calculator UX Validation & API Integration Suite", () => {
  describe("validateCurrencyInput", () => {
    it("parses valid formatted currency strings into integer cents", () => {
      const res1 = validateCurrencyInput("75,000", { fieldName: "Wages" });
      expect(res1.isValid).toBe(true);
      expect(res1.cents).toBe(7500000);
      expect(res1.dollars).toBe(75000);

      const res2 = validateCurrencyInput("$1,250.50", { fieldName: "Income" });
      expect(res2.isValid).toBe(true);
      expect(res2.cents).toBe(125050);
      expect(res2.dollars).toBe(1250.5);

      const res3 = validateCurrencyInput("0", { fieldName: "Withholding" });
      expect(res3.isValid).toBe(true);
      expect(res3.cents).toBe(0);
    });

    it("rejects negative inputs without silent coercion", () => {
      const negString = validateCurrencyInput("-500", { fieldName: "W-2 Wages" });
      expect(negString.isValid).toBe(false);
      expect(negString.error).toContain("cannot be negative");

      const negFormatted = validateCurrencyInput("-$1,200", { fieldName: "Revenue" });
      expect(negFormatted.isValid).toBe(false);
      expect(negFormatted.error).toContain("cannot be negative");

      const negNum = validateCurrencyInput(-50, { fieldName: "Expenses" });
      expect(negNum.isValid).toBe(false);
      expect(negNum.error).toContain("cannot be negative");
    });

    it("rejects non-numeric and malformed inputs", () => {
      const malformed1 = validateCurrencyInput("abc", { fieldName: "Income" });
      expect(malformed1.isValid).toBe(false);
      expect(malformed1.error).toContain("valid dollar amount");

      const malformed2 = validateCurrencyInput("12.34.56", { fieldName: "Income" });
      expect(malformed2.isValid).toBe(false);

      const malformed3 = validateCurrencyInput(NaN, { fieldName: "Income" });
      expect(malformed3.isValid).toBe(false);
    });

    it("enforces required field rules", () => {
      const emptyRequired = validateCurrencyInput("", { required: true, fieldName: "W-2 Wages" });
      expect(emptyRequired.isValid).toBe(false);
      expect(emptyRequired.error).toBe("W-2 Wages is required.");

      const emptyOptional = validateCurrencyInput("", { required: false, fieldName: "Other Income" });
      expect(emptyOptional.isValid).toBe(true);
      expect(emptyOptional.cents).toBe(0);
    });

    it("enforces maximum safe limit threshold", () => {
      const overLimit = validateCurrencyInput("2,000,000,000", {
        maxDollars: 1_000_000_000,
        fieldName: "Revenue",
      });
      expect(overLimit.isValid).toBe(false);
      expect(overLimit.error).toContain("exceeds maximum allowable limit");
    });
  });

  describe("API Calculation Endpoint (/api/v1/tax/calculate)", () => {
    it("handles valid income tax calculation request with versioned metadata", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/tax/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calculatorType: "income_tax",
          payload: {
            taxYear: 2025,
            filingStatus: "single",
            w2WagesCents: 8500000, // $85,000
            otherIncomeCents: 0,
            federalWithholdingCents: 1000000, // $10,000
          },
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
      expect(json.data.taxYear).toBe(2025);
      expect(json.data.rulesVersion).toBe("2025.2.0-irs-irb-2025-45-obbba");
      expect(json.data.engineVersion).toBe("1.1.0-production-baseline");
      expect(json.data.grossIncomeCents).toBe(8500000);
      expect(json.data.deductionUsedCents).toBe(1575000); // 2025 Single standard deduction
      expect(json.data.taxableIncomeCents).toBe(6925000); // $69,250
      expect(json.data.totalTaxLiabilityCents).toBeGreaterThan(0);
    });

    it("handles quarterly tax calculation request with 4 vouchers summing to remaining tax", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/tax/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calculatorType: "quarterly_tax",
          payload: {
            taxYear: 2025,
            filingStatus: "single",
            estimatedAnnualGrossCents: 10000000, // $100,000
            estimatedAnnualExpensesCents: 2000000, // $20,000
            w2AnnualWithholdingCents: 200000, // $2,000
          },
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      const quarterly = json.data.quarterlyBreakdown;
      expect(quarterly).toBeDefined();
      expect(quarterly.paymentDeadlines).toHaveLength(4);
      expect(quarterly.remainingTaxToPayCents).toBe(
        json.data.totalTaxLiabilityCents - 200000
      );

      const sumVouchers = quarterly.paymentDeadlines.reduce(
        (sum: number, v: { amountCents: number }) => sum + v.amountCents,
        0
      );
      expect(sumVouchers).toBe(quarterly.remainingTaxToPayCents);
    });

    it("rejects negative wages with 422 validation error", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/tax/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calculatorType: "income_tax",
          payload: {
            taxYear: 2025,
            filingStatus: "single",
            w2WagesCents: -5000,
          },
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(422);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("VALIDATION_ERROR");
      expect(json.error.details).toBeDefined();
    });

    it("returns structured warnings for unsupported features (itemized deductions fallback)", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/tax/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calculatorType: "income_tax",
          payload: {
            taxYear: 2025,
            filingStatus: "single",
            w2WagesCents: 8000000,
            itemizedDeductionCents: 2500000, // Schedule A unsupported
          },
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.deductionType).toBe("standard");
      expect(json.data.deductionUsedCents).toBe(1575000); // Standard deduction used

      const itemizedWarning = json.data.warnings.find(
        (w: { code: string }) => w.code === "ITEMIZED_DEDUCTIONS_UNSUPPORTED"
      );
      expect(itemizedWarning).toBeDefined();
    });

    it("rejects invalid calculator type with 422 validation error", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/tax/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calculatorType: "unsupported_type",
          payload: {},
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(422);
      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });
});
