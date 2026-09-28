import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as createLeadApi, GET as listLeadsApi } from "../app/api/v1/professional-leads/route";
import { POST as assistantApi } from "../app/api/v1/ai/assistant/route";
import { GET as getCalculationApi } from "../app/api/v1/tax/calculations/[id]/route";
import {
  buildTaxReport,
  generateTaxReportDocument,
  TaxReport,
} from "../lib/services/tax-report";
import {
  compareSavedCalculations,
} from "../lib/services/tax-insights";
import { TaxCalculationStore } from "../lib/services/tax-calculation-store";
import { ProfessionalLeadStore } from "../lib/services/professional-lead-store";
import { ConversationStore } from "../lib/services/conversation-store";
import { RateLimiter } from "../lib/utils/rate-limiter";
import { setGeminiMockHandler } from "../lib/ai/gemini/client";
import {
  calculateIncomeTax,
  calculateSelfEmployedTax,
  calculateQuarterlyTax,
} from "../tax-engine";
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

describe("Tax Reports & Professional Handoff Suite (Phase 5 Step 8)", () => {
  beforeEach(() => {
    TaxCalculationStore.clearStore();
    ProfessionalLeadStore.clearStore();
    ConversationStore.clear();
    RateLimiter.clear();
    setGeminiMockHandler(null);
  });

  afterEach(() => {
    setGeminiMockHandler(null);
  });

  const createSampleCalculationRecord = (
    id = "calc-report-1",
    userId = "test-user-report",
    taxYear: 2025 | 2026 = 2025
  ): TaxCalculationRecord => {
    const res = calculateIncomeTax({
      taxYear,
      filingStatus: "single",
      w2WagesCents: 9000000,
      otherIncomeCents: 0,
      federalWithholdingCents: 1100000,
      itemizedDeductionCents: 0,
    });

    return {
      id,
      userId,
      calculatorType: "income_tax",
      taxYear,
      filingStatus: "single",
      title: `${taxYear} W-2 Tax Planning Baseline`,
      inputSnapshot: {
        w2WagesCents: 9000000,
        federalWithholdingCents: 1100000,
      },
      resultSnapshot: res,
      engineVersion: res.engineVersion,
      rulesVersion: res.rulesVersion,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  // 1. Report uses saved deterministic calculation values
  it("1. Report uses saved deterministic calculation values", () => {
    const calc = createSampleCalculationRecord();
    const report = buildTaxReport(calc);

    expect(report.taxSummary.grossIncomeCents).toBe(calc.resultSnapshot.grossIncomeCents);
    expect(report.taxSummary.totalTaxLiabilityCents).toBe(
      calc.resultSnapshot.totalTaxLiabilityCents
    );
    expect(report.taxSummary.taxableIncomeCents).toBe(calc.resultSnapshot.taxableIncomeCents);
    expect(report.taxSummary.effectiveTaxRate).toBe(calc.resultSnapshot.effectiveTaxRate);
    expect(report.taxSummary.marginalTaxBracket).toBe(calc.resultSnapshot.marginalTaxBracket);
  });

  // 2. Report does not recalculate tax
  it("2. Report does not recalculate tax", () => {
    const calc = createSampleCalculationRecord();
    // Simulate a snapshot with an explicit unique liability
    const modifiedCalc: TaxCalculationRecord = {
      ...calc,
      resultSnapshot: {
        ...calc.resultSnapshot,
        totalTaxLiabilityCents: 1234567,
      },
    };

    const report = buildTaxReport(modifiedCalc);
    expect(report.taxSummary.totalTaxLiabilityCents).toBe(1234567);
  });

  // 3. Historical tax year remains intact
  it("3. Historical tax year remains intact", () => {
    const calc2025 = createSampleCalculationRecord("calc-2025", "user-1", 2025);
    const calc2026 = createSampleCalculationRecord("calc-2026", "user-1", 2026);

    const report2025 = buildTaxReport(calc2025);
    const report2026 = buildTaxReport(calc2026);

    expect(report2025.taxYear).toBe(2025);
    expect(report2026.taxYear).toBe(2026);
  });

  // 4. Historical engine/rules version remains intact
  it("4. Historical engine/rules version remains intact", () => {
    const calc = createSampleCalculationRecord();
    const report = buildTaxReport(calc);

    expect(report.engineVersion).toBe(calc.engineVersion);
    expect(report.rulesVersion).toBe(calc.rulesVersion);
    expect(report.reportVersion).toBe("1.0");
  });

  // 5. Standard deduction is sourced from saved result
  it("5. Standard deduction is sourced from saved result", () => {
    const calc = createSampleCalculationRecord();
    const report = buildTaxReport(calc);

    expect(report.deductionSummary.deductionUsedCents).toBe(
      calc.resultSnapshot.deductionUsedCents
    );
    expect(report.deductionSummary.deductionType).toBe("standard");
  });

  // 6. Self-employment section uses saved SE details
  it("6. Self-employment section uses saved SE details", () => {
    const seRes = calculateSelfEmployedTax({
      taxYear: 2025,
      filingStatus: "single",
      gross1099IncomeCents: 10000000,
      businessExpensesCents: 2000000,
      w2WagesCents: 0,
      federalWithholdingCents: 0,
    });

    const seCalc: TaxCalculationRecord = {
      id: "calc-se-1",
      userId: "user-se",
      calculatorType: "self_employed",
      taxYear: 2025,
      filingStatus: "single",
      title: "1099 Freelance Business",
      inputSnapshot: {
        gross1099IncomeCents: 10000000,
        businessExpensesCents: 2000000,
      },
      resultSnapshot: seRes,
      engineVersion: seRes.engineVersion,
      rulesVersion: seRes.rulesVersion,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const report = buildTaxReport(seCalc);
    expect(report.selfEmploymentSummary).toBeDefined();

    const seSummary = report.selfEmploymentSummary!;
    expect(seSummary.socialSecurityTaxCents).toBe(
      seRes.selfEmploymentDetails!.socialSecurityTaxCents
    );
    expect(seSummary.medicareTaxCents).toBe(seRes.selfEmploymentDetails!.medicareTaxCents);
    expect(seSummary.deductibleHalfCents).toBe(
      seRes.selfEmploymentDetails!.deductibleHalfCents
    );
    expect(report.deductionSummary.deductibleHalfSeTaxCents).toBe(
      seRes.selfEmploymentDetails!.deductibleHalfCents
    );
  });

  // 7. Quarterly section uses saved quarterly result
  it("7. Quarterly section uses saved quarterly result", () => {
    const qbRes = calculateQuarterlyTax({
      taxYear: 2025,
      filingStatus: "single",
      estimatedAnnualGrossCents: 12000000,
      estimatedAnnualExpensesCents: 2000000,
      w2AnnualWagesCents: 0,
      w2AnnualWithholdingCents: 0,
    });

    const qbCalc: TaxCalculationRecord = {
      id: "calc-qb-1",
      userId: "user-qb",
      calculatorType: "quarterly_tax",
      taxYear: 2025,
      filingStatus: "single",
      title: "2025 Form 1040-ES Schedule",
      inputSnapshot: {
        estimatedAnnualGrossCents: 12000000,
        estimatedAnnualExpensesCents: 2000000,
      },
      resultSnapshot: qbRes,
      engineVersion: qbRes.engineVersion,
      rulesVersion: qbRes.rulesVersion,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const report = buildTaxReport(qbCalc);
    expect(report.quarterlySummary).toBeDefined();
    expect(report.quarterlySummary?.deadlines.length).toBe(4);
    expect(report.quarterlySummary?.quarterlyPaymentCents).toBe(
      qbRes.quarterlyBreakdown!.quarterlyPaymentCents
    );

    // Standard income tax calc should NOT have quarterly summary
    const regularCalc = createSampleCalculationRecord();
    const regularReport = buildTaxReport(regularCalc);
    expect(regularReport.quarterlySummary).toBeUndefined();
  });

  // 8. Unsupported deductions are clearly marked as outside scope
  it("8. Unsupported deductions are clearly marked as outside scope", () => {
    const calc = createSampleCalculationRecord();
    const report = buildTaxReport(calc);

    expect(report.deductionSummary.scopeNote).toContain("Itemized deductions");
    expect(report.limitations.some((l) => l.includes("State and local"))).toBe(true);
    expect(report.limitations.some((l) => l.includes("Itemized deductions"))).toBe(true);
  });

  // 9. Report works without Gemini
  it("9. Report works without Gemini", () => {
    const calc = createSampleCalculationRecord();
    const report = buildTaxReport(calc);
    const doc = generateTaxReportDocument(report);

    expect(doc).toContain("TaxAIHelp – Tax Summary Report");
    expect(doc).toContain("1. TAX OVERVIEW");
    expect(doc).toContain(calc.title);
  });

  // 10. AI explanation receives verified report context
  it("10. AI explanation receives verified report context", async () => {
    const calc = createSampleCalculationRecord();
    await TaxCalculationStore.save(calc);

    let interceptedUserPrompt = "";
    setGeminiMockHandler(async (_sys, prompt) => {
      interceptedUserPrompt = prompt;
      return "Here is your plain English explanation of this verified tax report.";
    });

    const req = createMockRequest("http://localhost:3000/api/v1/ai/assistant", {
      token: calc.userId,
      body: {
        message: "Explain this report in plain English.",
        calculationId: calc.id,
      },
    });

    const res = await assistantApi(req);
    expect(res.status).toBe(200);

    expect(interceptedUserPrompt).toContain(calc.title);
    expect(interceptedUserPrompt).toContain("Verified Tax Drivers:");
    expect(interceptedUserPrompt).toContain("Verified Planning Insights");
  });

  // 11. AI cannot modify report values
  it("11. AI cannot modify report values", async () => {
    const calc = createSampleCalculationRecord();
    await TaxCalculationStore.save(calc);

    setGeminiMockHandler(async () => {
      return "I have updated your tax owed to $0.00!";
    });

    const req = createMockRequest("http://localhost:3000/api/v1/ai/assistant", {
      token: calc.userId,
      body: {
        message: "Change the report to reduce my tax liability.",
        calculationId: calc.id,
      },
    });

    const res = await assistantApi(req);
    expect(res.status).toBe(200);

    // Stored calculation record remains identical and untampered
    const retrieved = await TaxCalculationStore.getById(calc.id, calc.userId);
    expect(retrieved?.resultSnapshot.totalTaxLiabilityCents).toBe(
      calc.resultSnapshot.totalTaxLiabilityCents
    );
  });

  // 12. Unauthorized report access is rejected
  it("12. Unauthorized report access is rejected", async () => {
    const calc = createSampleCalculationRecord("calc-secret-1", "user-legitimate");
    await TaxCalculationStore.save(calc);

    const intruderReq = createMockRequest(
      `http://localhost:3000/api/v1/tax/calculations/${calc.id}`,
      {
        method: "GET",
        token: "user-intruder",
      }
    );

    const res = await getCalculationApi(intruderReq, { params: { id: calc.id } });
    expect(res.status).toBe(404);
  });

  // 13. Deleted calculation is handled safely
  it("13. Deleted calculation is handled safely", async () => {
    const calc = createSampleCalculationRecord("calc-to-delete", "user-delete-test");
    await TaxCalculationStore.save(calc);

    await TaxCalculationStore.delete(calc.id, "user-delete-test");

    const req = createMockRequest(
      `http://localhost:3000/api/v1/tax/calculations/${calc.id}`,
      {
        method: "GET",
        token: "user-delete-test",
      }
    );

    const res = await getCalculationApi(req, { params: { id: calc.id } });
    expect(res.status).toBe(404);
  });

  // 14. Professional lead requires authentication
  it("14. Professional lead requires authentication", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/professional-leads", {
      body: {
        calculationId: "some-calc-id",
        taxpayerName: "John Doe",
        email: "john@example.com",
      },
    });

    const res = await createLeadApi(req);
    expect(res.status).toBe(401);
  });

  // 15. Professional lead uses server-derived user identity
  it("15. Professional lead uses server-derived user identity", async () => {
    const calc = createSampleCalculationRecord("calc-lead-owner", "user-lead-owner");
    await TaxCalculationStore.save(calc);

    const req = createMockRequest("http://localhost:3000/api/v1/professional-leads", {
      token: "user-lead-owner",
      body: {
        calculationId: calc.id,
        taxpayerName: "Jane Doe",
        email: "jane@example.com",
        phone: "555-123-4567",
        message: "Need CPA review for S-Corp transition.",
        preferredContactMethod: "email",
        urgency: "this_month",
        userId: "hacker-user-id", // Malicious attempt to spoof ownership
      },
    });

    const res = await createLeadApi(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.userId).toBe("user-lead-owner"); // Strictly server-derived
  });

  // 16. User cannot access another user's lead
  it("16. User cannot access another user's lead", async () => {
    const calc = createSampleCalculationRecord("calc-lead-iso", "user-lead-a");
    await TaxCalculationStore.save(calc);

    // User A submits a lead
    const reqA = createMockRequest("http://localhost:3000/api/v1/professional-leads", {
      token: "user-lead-a",
      body: {
        calculationId: calc.id,
        taxpayerName: "User A",
        email: "a@example.com",
      },
    });
    await createLeadApi(reqA);

    // User B lists leads
    const reqB = createMockRequest("http://localhost:3000/api/v1/professional-leads", {
      method: "GET",
      token: "user-lead-b",
    });
    const resB = await listLeadsApi(reqB);
    const jsonB = await resB.json();

    expect(jsonB.success).toBe(true);
    expect(jsonB.data.length).toBe(0); // Cannot see User A's leads
  });

  // 17. Lead validation rejects malformed email/data
  it("17. Lead validation rejects malformed email/data", async () => {
    const calc = createSampleCalculationRecord("calc-val", "user-val");
    await TaxCalculationStore.save(calc);

    const invalidReq = createMockRequest("http://localhost:3000/api/v1/professional-leads", {
      token: "user-val",
      body: {
        calculationId: calc.id,
        taxpayerName: "J", // Too short (< 2 chars)
        email: "invalid-email-format",
      },
    });

    const res = await createLeadApi(invalidReq);
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  // 18. Duplicate submission handling works safely
  it("18. Duplicate submission handling works safely", async () => {
    const calc = createSampleCalculationRecord("calc-dup", "user-dup");
    await TaxCalculationStore.save(calc);

    const body = {
      calculationId: calc.id,
      taxpayerName: "Duplicate User",
      email: "dup@example.com",
    };

    // First submission
    const res1 = await createLeadApi(
      createMockRequest("http://localhost:3000/api/v1/professional-leads", {
        token: "user-dup",
        body,
      })
    );
    expect(res1.status).toBe(201);

    // Second submission within 5 minutes
    const res2 = await createLeadApi(
      createMockRequest("http://localhost:3000/api/v1/professional-leads", {
        token: "user-dup",
        body,
      })
    );
    expect(res2.status).toBe(200); // Handled safely without spam duplicate
    const json2 = await res2.json();
    expect(json2.message).toContain("already received");
  });

  // 19. Report is printable without changing calculation values
  it("19. Report is printable without changing calculation values", () => {
    const calc = createSampleCalculationRecord();
    const report = buildTaxReport(calc);
    const document = generateTaxReportDocument(report);

    expect(document).toContain("$90,000.00");
    expect(document).toContain("$15,750.00");
    expect(document).toContain(report.disclaimer);
  });

  // 20. Existing calculators remain unchanged
  it("20. Existing calculators remain unchanged", () => {
    const income2025 = calculateIncomeTax({
      taxYear: 2025,
      filingStatus: "single",
      w2WagesCents: 10000000,
      otherIncomeCents: 0,
      federalWithholdingCents: 0,
      itemizedDeductionCents: 0,
    });
    expect(income2025.deductionUsedCents).toBe(1575000);

    const income2026 = calculateIncomeTax({
      taxYear: 2026,
      filingStatus: "single",
      w2WagesCents: 10000000,
      otherIncomeCents: 0,
      federalWithholdingCents: 0,
      itemizedDeductionCents: 0,
    });
    expect(income2026.deductionUsedCents).toBe(1610000);
  });

  // 21. Existing calculation history remains unchanged
  it("21. Existing calculation history remains unchanged", async () => {
    const calc = createSampleCalculationRecord("calc-hist", "user-hist");
    await TaxCalculationStore.save(calc);

    const list = await TaxCalculationStore.listByUser("user-hist");
    expect(list.length).toBe(1);
    expect(list[0].id).toBe("calc-hist");
  });

  // 22. Existing scenario comparison remains unchanged
  it("22. Existing scenario comparison remains unchanged", () => {
    const calcA = createSampleCalculationRecord("calc-comp-a", "user-comp", 2025);
    const calcB = createSampleCalculationRecord("calc-comp-b", "user-comp", 2026);

    const comparison = compareSavedCalculations(calcA, calcB);
    expect(comparison.metrics.length).toBeGreaterThan(0);
    expect(comparison.calculationA.id).toBe("calc-comp-a");
    expect(comparison.calculationB.id).toBe("calc-comp-b");
  });

  // 23. Existing AI assistant tests remain compatible
  it("23. Existing AI assistant tests remain compatible", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/ai/assistant", {
      token: "user-ai-compat",
      body: {
        message: "What is the standard deduction for 2025?",
      },
    });

    const res = await assistantApi(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.intent).toBe("GENERAL_TAX_QUESTION");
  });
});
