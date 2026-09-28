import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as compareCalculationsApi, GET as compareCalculationsGetApi } from "../app/api/v1/tax/calculations/compare/route";
import { POST as assistantApi } from "../app/api/v1/ai/assistant/route";
import {
  generateTaxPlanningInsights,
  extractTaxDrivers,
  compareSavedCalculations,
} from "../lib/services/tax-insights";
import { TaxCalculationStore } from "../lib/services/tax-calculation-store";
import { ConversationStore } from "../lib/services/conversation-store";
import { RateLimiter } from "../lib/utils/rate-limiter";
import { setGeminiMockHandler } from "../lib/ai/gemini/client";
import { calculateIncomeTax, calculateSelfEmployedTax } from "../tax-engine";
import { TaxCalculationRecord } from "@/types/tax";

function createMockRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string;
  } = {}
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: options.method || "POST",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

describe("Tax Planning, Insights & Scenario Comparison Suite (Phase 5 Step 7)", () => {
  beforeEach(() => {
    TaxCalculationStore.clearStore();
    ConversationStore.clear();
    RateLimiter.clear();
    setGeminiMockHandler(null);
  });

  afterEach(() => {
    setGeminiMockHandler(null);
  });

  // 1. Structured insights use deterministic calculation values
  it("1. Structured insights use deterministic calculation values", () => {
    const calcResult = calculateIncomeTax({
      taxYear: 2025,
      filingStatus: "single",
      w2WagesCents: 9500000,
      otherIncomeCents: 0,
      federalWithholdingCents: 1200000,
      itemizedDeductionCents: 0,
    });

    const insights = generateTaxPlanningInsights(calcResult);
    const drivers = extractTaxDrivers(calcResult);

    expect(insights.length).toBeGreaterThan(0);
    expect(drivers.length).toBeGreaterThan(0);

    // Standard deduction insight matches calculation deductionUsedCents
    const deductionInsight = insights.find((i) => i.id === "insight_standard_deduction");
    expect(deductionInsight).toBeDefined();
    expect(deductionInsight?.numericValueCents).toBe(calcResult.deductionUsedCents);
    expect(deductionInsight?.formattedValue).toBe("$15,750.00");

    // Effective vs marginal rate insight
    const rateInsight = insights.find((i) => i.id === "insight_effective_vs_marginal");
    expect(rateInsight).toBeDefined();
    expect(rateInsight?.explanation).toContain(
      `${(calcResult.effectiveTaxRate * 100).toFixed(1)}%`
    );
    expect(rateInsight?.explanation).toContain(
      `${Math.round(calcResult.marginalTaxBracket * 100)}%`
    );

    // Drivers match verified results
    const taxableDriver = drivers.find((d) => d.id === "driver_taxable_income");
    expect(taxableDriver).toBeDefined();
    expect(taxableDriver?.amountCents).toBe(calcResult.taxableIncomeCents);
  });

  // 2. No insight invents unsupported numeric values
  it("2. No insight invents unsupported numeric values", () => {
    const calcResult = calculateIncomeTax({
      taxYear: 2025,
      filingStatus: "single",
      w2WagesCents: 5000000,
      otherIncomeCents: 0,
      federalWithholdingCents: 400000,
      itemizedDeductionCents: 0,
    });

    const insights = generateTaxPlanningInsights(calcResult);

    for (const insight of insights) {
      if (insight.numericValueCents !== undefined) {
        // Every numeric value MUST match a verified field on TaxCalculationResult
        const knownValues = [
          calcResult.deductionUsedCents,
          calcResult.totalTaxLiabilityCents,
          calcResult.estimatedRefundCents,
          calcResult.estimatedAmountOwedCents,
          calcResult.totalPaymentsAndWithholdingCents,
          calcResult.selfEmploymentTaxCents,
          calcResult.grossIncomeCents,
          calcResult.taxableIncomeCents,
        ];
        expect(knownValues).toContain(insight.numericValueCents);
      }
    }
  });

  // 3. Withholding insight reflects actual withholding/result
  it("3. Withholding insight reflects actual withholding/result (refund vs due vs balanced)", () => {
    // Case A: Refund (Withholding > Tax)
    const refundResult = calculateIncomeTax({
      taxYear: 2025,
      filingStatus: "single",
      w2WagesCents: 6000000,
      otherIncomeCents: 0,
      federalWithholdingCents: 1000000, // Higher than liability
      itemizedDeductionCents: 0,
    });
    const refundInsights = generateTaxPlanningInsights(refundResult);
    const refundInsight = refundInsights.find((i) => i.id === "insight_withholding_refund");
    expect(refundInsight).toBeDefined();
    expect(refundInsight?.level).toBe("positive");
    expect(refundInsight?.numericValueCents).toBe(refundResult.estimatedRefundCents);

    // Case B: Amount Owed (Withholding < Tax)
    const dueResult = calculateIncomeTax({
      taxYear: 2025,
      filingStatus: "single",
      w2WagesCents: 6000000,
      otherIncomeCents: 0,
      federalWithholdingCents: 100000, // Lower than liability
      itemizedDeductionCents: 0,
    });
    const dueInsights = generateTaxPlanningInsights(dueResult);
    const dueInsight = dueInsights.find((i) => i.id === "insight_withholding_due");
    expect(dueInsight).toBeDefined();
    expect(dueInsight?.level).toBe("caution");
    expect(dueInsight?.numericValueCents).toBe(dueResult.estimatedAmountOwedCents);

    // Case C: Fully Balanced (Withholding == Tax)
    const balancedResult = calculateIncomeTax({
      taxYear: 2025,
      filingStatus: "single",
      w2WagesCents: 6000000,
      otherIncomeCents: 0,
      federalWithholdingCents: refundResult.totalTaxLiabilityCents,
      itemizedDeductionCents: 0,
    });
    const balancedInsights = generateTaxPlanningInsights(balancedResult);
    const balancedInsight = balancedInsights.find((i) => i.id === "insight_withholding_balanced");
    expect(balancedInsight).toBeDefined();
    expect(balancedInsight?.level).toBe("info");
  });

  // 4. Self-employment insight reflects actual SE calculation
  it("4. Self-employment insight reflects actual SE calculation (Social Security, Medicare, deductible half)", () => {
    const seResult = calculateSelfEmployedTax({
      taxYear: 2025,
      filingStatus: "single",
      gross1099IncomeCents: 10000000,
      businessExpensesCents: 2000000,
      w2WagesCents: 0,
      federalWithholdingCents: 0,
    });

    const insights = generateTaxPlanningInsights(seResult);
    const seInsight = insights.find((i) => i.id === "insight_self_employment_breakdown");

    expect(seInsight).toBeDefined();
    expect(seInsight?.category).toBe("self_employment");
    expect(seInsight?.numericValueCents).toBe(seResult.selfEmploymentTaxCents);

    const seDetails = seResult.selfEmploymentDetails!;
    expect(seInsight?.explanation).toContain("Social Security");
    expect(seInsight?.explanation).toContain("Medicare");
    expect(seInsight?.explanation).toContain("Form 1040 Schedule 1");
    expect(seInsight?.explanation).toContain(`$${(seDetails.deductibleHalfCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
  });

  // 5. Unsupported tax situation produces a clear limitation
  it("5. Unsupported tax situation produces a clear limitation", () => {
    const calcResult = calculateIncomeTax({
      taxYear: 2025,
      filingStatus: "single",
      w2WagesCents: 7500000,
      otherIncomeCents: 0,
      federalWithholdingCents: 500000,
      itemizedDeductionCents: 0,
    });

    const insights = generateTaxPlanningInsights(calcResult);
    const limitInsight = insights.find((i) => i.id === "insight_planning_considerations");

    expect(limitInsight).toBeDefined();
    expect(limitInsight?.explanation).toContain("state or local taxes");
    expect(limitInsight?.explanation).toContain("Schedule A");
    expect(limitInsight?.disclaimer).toContain("Educational estimate only");
  });

  // 6. Scenario comparison calculates differences from stored verified results
  it("6. Scenario comparison calculates differences from stored verified results", () => {
    const resA = calculateIncomeTax({
      taxYear: 2025,
      filingStatus: "single",
      w2WagesCents: 8000000,
      otherIncomeCents: 0,
      federalWithholdingCents: 1000000,
      itemizedDeductionCents: 0,
    });

    const resB = calculateIncomeTax({
      taxYear: 2026,
      filingStatus: "single",
      w2WagesCents: 10000000,
      otherIncomeCents: 0,
      federalWithholdingCents: 1500000,
      itemizedDeductionCents: 0,
    });

    const recordA: TaxCalculationRecord = {
      id: "calc-scenario-a",
      userId: "test-user-compare",
      calculatorType: "income_tax",
      taxYear: 2025,
      filingStatus: "single",
      title: "2025 Baseline",
      inputSnapshot: {},
      resultSnapshot: resA,
      engineVersion: resA.engineVersion,
      rulesVersion: resA.rulesVersion,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const recordB: TaxCalculationRecord = {
      id: "calc-scenario-b",
      userId: "test-user-compare",
      calculatorType: "income_tax",
      taxYear: 2026,
      filingStatus: "single",
      title: "2026 Promotion",
      inputSnapshot: {},
      resultSnapshot: resB,
      engineVersion: resB.engineVersion,
      rulesVersion: resB.rulesVersion,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const comparison = compareSavedCalculations(recordA, recordB);

    expect(comparison.calculationA.id).toBe("calc-scenario-a");
    expect(comparison.calculationB.id).toBe("calc-scenario-b");

    // Gross income delta: 100k - 80k = +$20,000.00
    const grossMetric = comparison.metrics.find((m) => m.key === "grossIncome");
    expect(grossMetric).toBeDefined();
    expect(grossMetric?.deltaCents).toBe(2000000);
    expect(grossMetric?.deltaFormatted).toBe("+$20,000.00");

    // Total liability delta: resB - resA
    const liabilityMetric = comparison.metrics.find((m) => m.key === "totalLiability");
    expect(liabilityMetric).toBeDefined();
    expect(liabilityMetric?.deltaCents).toBe(
      resB.totalTaxLiabilityCents - resA.totalTaxLiabilityCents
    );

    // Neutral variance explanation
    const liabilityInsight = comparison.insights.find(
      (i) => i.id === "insight_comparison_liability"
    );
    expect(liabilityInsight).toBeDefined();
    expect(liabilityInsight?.explanation).toContain("Scenario B");
  });

  // 7. Cross-user scenario comparison is rejected
  it("7. Cross-user scenario comparison is rejected (404/401 unauthorized)", async () => {
    const resA = calculateIncomeTax({
      taxYear: 2025,
      filingStatus: "single",
      w2WagesCents: 5000000,
      otherIncomeCents: 0,
      federalWithholdingCents: 500000,
      itemizedDeductionCents: 0,
    });

    // Save record for User 1
    await TaxCalculationStore.save({
      id: "user1-calc",
      userId: "user-alpha",
      calculatorType: "income_tax",
      taxYear: 2025,
      filingStatus: "single",
      title: "User 1 Calc",
      inputSnapshot: {},
      resultSnapshot: resA,
      engineVersion: resA.engineVersion,
      rulesVersion: resA.rulesVersion,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Save record for User 2
    await TaxCalculationStore.save({
      id: "user2-calc",
      userId: "user-beta",
      calculatorType: "income_tax",
      taxYear: 2025,
      filingStatus: "single",
      title: "User 2 Calc",
      inputSnapshot: {},
      resultSnapshot: resA,
      engineVersion: resA.engineVersion,
      rulesVersion: resA.rulesVersion,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // User 1 tries to compare their calculation with User 2's calculation
    const req = createMockRequest("http://localhost:3000/api/v1/tax/calculations/compare", {
      token: "user-alpha",
      body: {
        calculationIdA: "user1-calc",
        calculationIdB: "user2-calc",
      },
    });

    const res = await compareCalculationsApi(req);
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.message).toContain("not found or access is denied");

    // Unauthenticated request
    const unauthReq = createMockRequest("http://localhost:3000/api/v1/tax/calculations/compare", {
      body: {
        calculationIdA: "user1-calc",
        calculationIdB: "user1-calc",
      },
    });
    const unauthRes = await compareCalculationsApi(unauthReq);
    expect(unauthRes.status).toBe(401);
  });

  // 8. Deleted calculation is handled safely
  it("8. Deleted calculation is handled safely", async () => {
    const resA = calculateIncomeTax({
      taxYear: 2025,
      filingStatus: "single",
      w2WagesCents: 5000000,
      otherIncomeCents: 0,
      federalWithholdingCents: 500000,
      itemizedDeductionCents: 0,
    });

    const saved = await TaxCalculationStore.save({
      id: "calc-to-delete",
      userId: "user-safe",
      calculatorType: "income_tax",
      taxYear: 2025,
      filingStatus: "single",
      title: "Calc to Delete",
      inputSnapshot: {},
      resultSnapshot: resA,
      engineVersion: resA.engineVersion,
      rulesVersion: resA.rulesVersion,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Delete it
    await TaxCalculationStore.delete(saved.id, "user-safe");

    // Try to compare with deleted calculation
    const req = createMockRequest("http://localhost:3000/api/v1/tax/calculations/compare", {
      token: "user-safe",
      body: {
        calculationIdA: saved.id,
        calculationIdB: "calc-some-other",
      },
    });

    const res = await compareCalculationsApi(req);
    expect(res.status).toBe(404);

    // Trying to compare identical IDs is rejected by validation
    const sameIdReq = createMockRequest("http://localhost:3000/api/v1/tax/calculations/compare", {
      token: "user-safe",
      body: {
        calculationIdA: "calc-123",
        calculationIdB: "calc-123",
      },
    });
    const sameIdRes = await compareCalculationsApi(sameIdReq);
    expect(sameIdRes.status).toBe(422);
    const sameIdJson = await sameIdRes.json();
    expect(sameIdJson.error.code).toBe("VALIDATION_ERROR");
  });

  // 9. AI receives verified calculation/insight context
  it("9. AI receives verified calculation/insight context", async () => {
    const resA = calculateIncomeTax({
      taxYear: 2025,
      filingStatus: "single",
      w2WagesCents: 8500000,
      otherIncomeCents: 0,
      federalWithholdingCents: 1000000,
      itemizedDeductionCents: 0,
    });

    const saved = await TaxCalculationStore.save({
      id: "ai-context-calc",
      userId: "user-ai-ctx",
      calculatorType: "income_tax",
      taxYear: 2025,
      filingStatus: "single",
      title: "Saved 2025 Planning Scenario",
      inputSnapshot: {},
      resultSnapshot: resA,
      engineVersion: resA.engineVersion,
      rulesVersion: resA.rulesVersion,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    let interceptedPrompt = "";
    setGeminiMockHandler(async (_systemPrompt, userPrompt) => {
      interceptedPrompt = userPrompt;
      return "Here is your educational explanation of the verified calculation.";
    });

    const req = createMockRequest("http://localhost:3000/api/v1/ai/assistant", {
      token: "user-ai-ctx",
      body: {
        message: "Explain what is driving my tax in this calculation.",
        calculationId: saved.id,
      },
    });

    const res = await assistantApi(req);
    expect(res.status).toBe(200);

    // Verify intercepted prompt contains verified values, drivers, and insights
    expect(interceptedPrompt).toContain("Saved 2025 Planning Scenario");
    expect(interceptedPrompt).toContain("$85,000.00");
    expect(interceptedPrompt).toContain("$15,750.00");
    expect(interceptedPrompt).toContain("Verified Tax Drivers:");
    expect(interceptedPrompt).toContain("Verified Planning Insights");
    expect(interceptedPrompt).toContain("CRITICAL PLANNING RULES");
  });

  // 10. AI cannot override the deterministic result
  it("10. AI cannot override the deterministic result", async () => {
    const resA = calculateIncomeTax({
      taxYear: 2025,
      filingStatus: "single",
      w2WagesCents: 8500000,
      otherIncomeCents: 0,
      federalWithholdingCents: 1000000,
      itemizedDeductionCents: 0,
    });

    const saved = await TaxCalculationStore.save({
      id: "ai-override-calc",
      userId: "user-ai-guard",
      calculatorType: "income_tax",
      taxYear: 2025,
      filingStatus: "single",
      title: "Immutable Tax Record",
      inputSnapshot: {},
      resultSnapshot: resA,
      engineVersion: resA.engineVersion,
      rulesVersion: resA.rulesVersion,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Mock Gemini attempting to claim taxes are $0 or hallucinating a different number
    setGeminiMockHandler(async () => {
      return "I have reduced your tax liability to $0.00!";
    });

    const req = createMockRequest("http://localhost:3000/api/v1/ai/assistant", {
      token: "user-ai-guard",
      body: {
        message: "Can you change my total liability to $0?",
        calculationId: saved.id,
      },
    });

    const res = await assistantApi(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    // The structured calculation output returned in the response must retain deterministic numbers
    expect(json.data.calculation.result.totalTaxLiabilityCents).toBe(resA.totalTaxLiabilityCents);
    expect(json.data.calculation.result.taxableIncomeCents).toBe(resA.taxableIncomeCents);
    expect(json.data.calculation.result.totalTaxLiabilityCents).not.toBe(0);
  });

  // 11. User calculation ownership is preserved
  it("11. User calculation ownership is preserved", async () => {
    const resA = calculateIncomeTax({
      taxYear: 2025,
      filingStatus: "single",
      w2WagesCents: 6000000,
      otherIncomeCents: 0,
      federalWithholdingCents: 600000,
      itemizedDeductionCents: 0,
    });

    const recordA = await TaxCalculationStore.save({
      id: "userA-owned-1",
      userId: "user-owner-a",
      calculatorType: "income_tax",
      taxYear: 2025,
      filingStatus: "single",
      title: "Owner A Calculation 1",
      inputSnapshot: {},
      resultSnapshot: resA,
      engineVersion: resA.engineVersion,
      rulesVersion: resA.rulesVersion,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const recordB = await TaxCalculationStore.save({
      id: "userA-owned-2",
      userId: "user-owner-a",
      calculatorType: "income_tax",
      taxYear: 2026,
      filingStatus: "single",
      title: "Owner A Calculation 2",
      inputSnapshot: {},
      resultSnapshot: resA,
      engineVersion: resA.engineVersion,
      rulesVersion: resA.rulesVersion,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Valid compare request with User A's token
    const req = createMockRequest(
      `http://localhost:3000/api/v1/tax/calculations/compare?a=${recordA.id}&b=${recordB.id}`,
      {
        method: "GET",
        token: "user-owner-a",
      }
    );

    const res = await compareCalculationsGetApi(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.calculationA.id).toBe(recordA.id);
    expect(json.data.calculationB.id).toBe(recordB.id);

    // Another user (User B) cannot compare User A's calculations
    const intruderReq = createMockRequest(
      `http://localhost:3000/api/v1/tax/calculations/compare?a=${recordA.id}&b=${recordB.id}`,
      {
        method: "GET",
        token: "user-intruder",
      }
    );

    const intruderRes = await compareCalculationsGetApi(intruderReq);
    expect(intruderRes.status).toBe(404);
  });

  // 12. Existing calculators remain unchanged
  it("12. Existing calculators remain unchanged", () => {
    // 2025 Single $100,000 W-2 baseline
    const income2025 = calculateIncomeTax({
      taxYear: 2025,
      filingStatus: "single",
      w2WagesCents: 10000000,
      otherIncomeCents: 0,
      federalWithholdingCents: 0,
      itemizedDeductionCents: 0,
    });

    expect(income2025.grossIncomeCents).toBe(10000000);
    expect(income2025.deductionUsedCents).toBe(1575000); // 2025 statutory standard deduction
    expect(income2025.taxableIncomeCents).toBe(8425000);
    expect(income2025.selfEmploymentTaxCents).toBe(0);
    expect(income2025.bracketBreakdown.length).toBeGreaterThan(0);

    // 2026 Single $100,000 W-2 baseline
    const income2026 = calculateIncomeTax({
      taxYear: 2026,
      filingStatus: "single",
      w2WagesCents: 10000000,
      otherIncomeCents: 0,
      federalWithholdingCents: 0,
      itemizedDeductionCents: 0,
    });

    expect(income2026.deductionUsedCents).toBe(1610000); // 2026 statutory inflation-adjusted standard deduction
    expect(income2026.taxableIncomeCents).toBe(8390000);
    expect(income2026.totalTaxLiabilityCents).toBeLessThan(income2025.totalTaxLiabilityCents);
  });
});
