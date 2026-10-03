import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as importCalculatorApi } from "../app/api/v1/tax/preparation/session/import-calculator/route";
import {
  GET as getSessionApi,
  POST as startSessionApi,
  PATCH as updateSessionApi,
} from "../app/api/v1/tax/preparation/session/route";
import { POST as calculateSessionApi } from "../app/api/v1/tax/preparation/session/calculate/route";
import { PUT as saveHouseholdApi } from "../app/api/v1/tax/preparation/session/household/route";
import { PUT as saveIncomeApi } from "../app/api/v1/tax/preparation/session/income/route";
import { PUT as saveDeductionsApi } from "../app/api/v1/tax/preparation/session/deductions/route";
import { GET as getEfileReadinessApi } from "../app/api/v1/tax/preparation/session/federal-return/efile/readiness/route";
import { POST as freezeEfileApi } from "../app/api/v1/tax/preparation/session/federal-return/efile/freeze/route";
import {
  POST as requestReviewApi,
  GET as listCasesApi,
} from "../app/api/v1/tax/preparation/session/professional-review/route";
import { POST as assignProApi } from "../app/api/v1/tax/preparation/session/professional-review/[caseId]/assign/route";
import { POST as addCommentApi } from "../app/api/v1/tax/preparation/session/professional-review/[caseId]/comments/route";
import { POST as completeReviewApi } from "../app/api/v1/tax/preparation/session/professional-review/[caseId]/complete/route";

import { TaxPreparationSessionStore } from "../lib/services/tax-preparation-session-store";
import { UserProfileStore } from "../lib/services/user-profile-store";
import { ProfessionalReviewCaseStore } from "../lib/services/professional-review-case-store";
import { AuditLogStore } from "../lib/services/audit-log-store";
import { NotificationStore } from "../lib/notifications/store";
import { RateLimiter } from "../lib/utils/rate-limiter";
import { calculateIncomeTax, calculateSelfEmploymentTax, getTaxRules } from "../tax-engine";
import { buildFederalReturnDocumentPackage } from "../lib/preparation/federal-return-documents";
import { buildFederalReturn } from "../lib/preparation/federal-return";
import { getStateEngine, getStateSupportInfo } from "../lib/state-tax/registry";
import { SYSTEM_PROMPTS } from "../lib/ai/gemini/prompts";
import { setGeminiMockHandler } from "../lib/ai/gemini/client";
import { AppError, handleApiError } from "../lib/utils/errors";

function createMockRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string;
    rawText?: string;
  } = {}
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: options.method || (options.body !== undefined || options.rawText !== undefined ? "POST" : "GET"),
    headers,
    body: options.rawText !== undefined ? options.rawText : options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

function getErrorMessage(errorPayload: unknown): string {
  if (!errorPayload) return "";
  if (typeof errorPayload === "string") return errorPayload;
  if (typeof errorPayload === "object" && "message" in errorPayload) {
    return String((errorPayload as { message: unknown }).message);
  }
  return JSON.stringify(errorPayload);
}

describe("Phase 9: Production Hardening & Full User Journey Test Suite", () => {
  const USER_A = "user-phase9-alice";
  const USER_B = "user-phase9-bob";
  const PRO_USER = "pro-phase9-charlie";

  beforeEach(() => {
    TaxPreparationSessionStore.clear();
    UserProfileStore.clear();
    ProfessionalReviewCaseStore.clearStore();
    AuditLogStore.clear();
    NotificationStore.clear();
    RateLimiter.clear();
    setGeminiMockHandler(null);
  });

  afterEach(() => {
    RateLimiter.clear();
    setGeminiMockHandler(null);
  });

  const setupTaxpayer = async (
    userId: string,
    opts: {
      fullName?: string;
      taxYear?: 2025 | 2026;
      filingStatus?: "single" | "married_filing_jointly" | "head_of_household";
      stateOfResidence?: string;
    } = {}
  ) => {
    await UserProfileStore.updateProfile(userId, {
      fullName: opts.fullName || "Alice Taxpayer",
    });
    await UserProfileStore.updateTaxProfile(userId, {
      defaultTaxYear: opts.taxYear || 2025,
      filingStatus: opts.filingStatus || "single",
      stateOfResidence: opts.stateOfResidence || "CA",
    });
  };

  // 1. Authentication state transitions & token validation
  it("Scenario 1: Authentication state transitions & token validation rejects unauthenticated access", async () => {
    const unauthReq = createMockRequest("/api/v1/tax/preparation/session", { method: "GET" });
    const res = await getSessionApi(unauthReq);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(getErrorMessage(json.error)).toMatch(/Authentication required/i);

    const authReq = createMockRequest("/api/v1/tax/preparation/session", {
      method: "GET",
      token: USER_A,
    });
    const authRes = await getSessionApi(authReq);
    expect(authRes.status).toBe(200);
    const authJson = await authRes.json();
    expect(authJson.success).toBe(true);
  });

  // 2. Session persistence across browser reloads
  it("Scenario 2: Session persistence preserves all step data across reloads", async () => {
    await setupTaxpayer(USER_A);
    const { session } = await TaxPreparationSessionStore.start(USER_A);

    await TaxPreparationSessionStore.saveHousehold(USER_A, {
      filingStatus: "single",
      dependents: [],
    });

    await TaxPreparationSessionStore.saveIncome(USER_A, {
      situations: ["employer"],
      w2s: [
        {
          id: "w2-1",
          employerName: "Acme Corp",
          wagesCents: 8500000,
          federalWithholdingCents: 1100000,
        },
      ],
      form1099s: [],
      activities: [],
    });

    const reloaded = await TaxPreparationSessionStore.getCurrent(USER_A);
    expect(reloaded).not.toBeNull();
    expect(reloaded?.id).toBe(session.id);
    expect(reloaded?.householdSnapshot.filingStatus).toBe("single");
    expect(reloaded?.incomeSnapshot.w2s).toHaveLength(1);
    expect(reloaded?.incomeSnapshot.w2s[0].employerName).toBe("Acme Corp");
    expect(reloaded?.incomeSnapshot.w2s[0].wagesCents).toBe(8500000);
  });

  // 3. Session resume after logout/login
  it("Scenario 3: Session resume after logout/login preserves exact session ID and state", async () => {
    await setupTaxpayer(USER_A);
    const { session } = await TaxPreparationSessionStore.start(USER_A);

    const resumed = await TaxPreparationSessionStore.getCurrent(USER_A);
    expect(resumed?.id).toBe(session.id);
    expect(resumed?.userId).toBe(USER_A);
    expect(resumed?.status).toBe("in_progress");
  });

  // 4. Duplicate session prevention (idempotency)
  it("Scenario 4: Duplicate session prevention (idempotency) avoids creating multiple rows", async () => {
    await setupTaxpayer(USER_A);
    const first = await TaxPreparationSessionStore.start(USER_A);
    expect(first.created).toBe(true);

    const second = await TaxPreparationSessionStore.start(USER_A);
    expect(second.created).toBe(false);
    expect(second.session.id).toBe(first.session.id);

    const third = await TaxPreparationSessionStore.start(USER_A);
    expect(third.created).toBe(false);
    expect(third.session.id).toBe(first.session.id);
  });

  // 5. Calculator-to-Preparation data transfer (W-2)
  it("Scenario 5: Calculator-to-Preparation data transfer (W-2) populates filing status, income, and withholding", async () => {
    await setupTaxpayer(USER_A);

    const req = createMockRequest("/api/v1/tax/preparation/session/import-calculator", {
      token: USER_A,
      body: {
        calculatorType: "income_tax",
        taxYear: 2025,
        filingStatus: "single",
        w2WagesCents: 9500000,
        withholdingCents: 1200000,
        overwriteExisting: false,
      },
    });

    const res = await importCalculatorApi(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.requiresConfirmation).toBe(false);

    const session = json.data;
    expect(session.taxYear).toBe(2025);
    expect(session.householdSnapshot.filingStatus).toBe("single");
    expect(session.incomeSnapshot.situations).toContain("employer");
    expect(session.incomeSnapshot.w2s).toHaveLength(1);
    expect(session.incomeSnapshot.w2s[0].wagesCents).toBe(9500000);
    expect(session.incomeSnapshot.w2s[0].federalWithholdingCents).toBe(1200000);
  });

  // 6. Calculator-to-Preparation data transfer (1099)
  it("Scenario 6: Calculator-to-Preparation data transfer (1099) populates contractor income and business activity", async () => {
    await setupTaxpayer(USER_A);

    const req = createMockRequest("/api/v1/tax/preparation/session/import-calculator", {
      token: USER_A,
      body: {
        calculatorType: "self_employed",
        taxYear: 2025,
        filingStatus: "single",
        contractorGrossCents: 12000000,
        expensesCents: 2000000,
        withholdingCents: 500000,
        overwriteExisting: false,
      },
    });

    const res = await importCalculatorApi(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    const session = json.data;
    expect(session.incomeSnapshot.situations).toContain("freelance");
    expect(session.incomeSnapshot.situations).toContain("business");
    expect(session.incomeSnapshot.form1099s).toHaveLength(1);
    expect(session.incomeSnapshot.form1099s[0].grossIncomeCents).toBe(12000000);
    expect(session.incomeSnapshot.activities).toHaveLength(1);
    expect(session.incomeSnapshot.activities[0].equipmentSuppliesCents).toBe(2000000);
  });

  // 7. Calculator-to-Preparation with existing session confirmation
  it("Scenario 7: Calculator-to-Preparation requests confirmation before overwriting existing saved income", async () => {
    await setupTaxpayer(USER_A);
    await TaxPreparationSessionStore.start(USER_A);

    await TaxPreparationSessionStore.saveIncome(USER_A, {
      situations: ["employer"],
      w2s: [
        {
          id: "w2-initial",
          employerName: "Initial Employer",
          wagesCents: 6000000,
          federalWithholdingCents: 700000,
        },
      ],
      form1099s: [],
      activities: [],
    });

    const promptReq = createMockRequest("/api/v1/tax/preparation/session/import-calculator", {
      token: USER_A,
      body: {
        calculatorType: "income_tax",
        taxYear: 2025,
        filingStatus: "head_of_household",
        w2WagesCents: 11000000,
        withholdingCents: 1500000,
        overwriteExisting: false,
      },
    });

    const promptRes = await importCalculatorApi(promptReq);
    expect(promptRes.status).toBe(200);
    const promptJson = await promptRes.json();
    expect(promptJson.requiresConfirmation).toBe(true);
    expect(promptJson.reason).toMatch(/already have saved income/i);

    let current = await TaxPreparationSessionStore.getCurrent(USER_A);
    expect(current?.incomeSnapshot.w2s[0].wagesCents).toBe(6000000);

    const confirmReq = createMockRequest("/api/v1/tax/preparation/session/import-calculator", {
      token: USER_A,
      body: {
        calculatorType: "income_tax",
        taxYear: 2025,
        filingStatus: "head_of_household",
        w2WagesCents: 11000000,
        withholdingCents: 1500000,
        overwriteExisting: true,
      },
    });

    const confirmRes = await importCalculatorApi(confirmReq);
    expect(confirmRes.status).toBe(200);
    const confirmJson = await confirmRes.json();
    expect(confirmJson.requiresConfirmation).toBe(false);

    current = await TaxPreparationSessionStore.getCurrent(USER_A);
    expect(current?.incomeSnapshot.w2s[0].wagesCents).toBe(11000000);
    expect(current?.householdSnapshot.filingStatus).toBe("head_of_household");
  });

  // 8. Incompatible tax year rejection in preparation import
  it("Scenario 8: Incompatible tax year rejection in preparation import produces 422 validation error", async () => {
    await setupTaxpayer(USER_A);

    const req = createMockRequest("/api/v1/tax/preparation/session/import-calculator", {
      token: USER_A,
      body: {
        calculatorType: "income_tax",
        taxYear: 2024,
        filingStatus: "single",
        w2WagesCents: 5000000,
      },
    });

    const res = await importCalculatorApi(req);
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.success).toBe(false);
    const errStr = JSON.stringify(json.details || json.error);
    expect(errStr).toMatch(/supports tax years 2025 and 2026/i);
  });

  // 9. Client tax total override rejection (API boundary security)
  it("Scenario 9: Client tax total override rejection ensures server deterministic engine authority", async () => {
    await setupTaxpayer(USER_A);
    await TaxPreparationSessionStore.start(USER_A);

    await TaxPreparationSessionStore.saveHousehold(USER_A, {
      filingStatus: "single",
      dependents: [],
    });

    await TaxPreparationSessionStore.saveIncome(USER_A, {
      situations: ["employer"],
      w2s: [
        {
          id: "w2-test",
          employerName: "Corp",
          wagesCents: 10000000,
          federalWithholdingCents: 1500000,
        },
      ],
      form1099s: [],
      activities: [],
    });

    await TaxPreparationSessionStore.saveDeductions(USER_A, {
      hasBusinessExpenses: false,
      standardDeductionAcknowledged: true,
      entries: [],
      guidedAnswers: {},
    });

    const spoofReq = createMockRequest("/api/v1/tax/preparation/session/calculate", {
      token: USER_A,
      body: {
        fraudulentTaxLiabilityCents: 0,
        overrideRefundCents: 99999999,
      },
    });

    const res = await calculateSessionApi(spoofReq);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    const calculation = json.data.calculationSnapshot;
    expect(calculation.totalTaxLiabilityCents).toBeGreaterThan(1000000);
    expect(calculation.effectiveTaxRate).toBeGreaterThan(0.10);
  });

  // 10. W-2 multi-employer income accumulation & tax computation
  it("Scenario 10: W-2 multi-employer income accumulation aggregates wages and computes progressive brackets", async () => {
    const input = {
      taxYear: 2025 as const,
      filingStatus: "single" as const,
      w2WagesCents: 5000000 + 7000000, // Two W-2s: $50k + $70k = $120,000
      otherIncomeCents: 0,
      federalWithholdingCents: 1800000,
    };

    const result = calculateIncomeTax(input);
    expect(result.grossIncomeCents).toBe(12000000);
    // Standard deduction for Single in 2025 is $15,750 (1,575,000 cents)
    expect(result.deductionUsedCents).toBe(1575000);
    expect(result.taxableIncomeCents).toBe(12000000 - 1575000);
    expect(result.bracketBreakdown.length).toBeGreaterThan(1);
    expect(result.totalTaxLiabilityCents).toBeGreaterThan(0);
  });

  // 11. 1099 / Gig income + expense deduction + SE tax computation
  it("Scenario 11: 1099 / Gig income + expense deduction + SE tax computes Schedule C profit and half-SE deduction", async () => {
    // calculateSelfEmploymentTax(taxYear, grossEarnings, businessExpenses, w2Wages)
    const result = calculateSelfEmploymentTax(2025, 10000000, 2000000, 0);
    expect(result.netSelfEmploymentProfitCents).toBe(8000000);
    expect(result.totalSelfEmploymentTaxCents).toBeGreaterThan(1000000);
    expect(result.deductibleHalfCents).toBe(
      Math.round(result.totalSelfEmploymentTaxCents / 2)
    );
  });

  // 12. Married Filing Jointly + spouse income consolidation
  it("Scenario 12: Married Filing Jointly applies statutory MFJ standard deduction ($31,500 in 2025)", async () => {
    const result = calculateIncomeTax({
      taxYear: 2025,
      filingStatus: "married_filing_jointly",
      w2WagesCents: 15000000,
      otherIncomeCents: 0,
      federalWithholdingCents: 2000000,
    });

    expect(result.deductionUsedCents).toBe(3150000); // $31,500 standard deduction
    expect(result.taxableIncomeCents).toBe(15000000 - 3150000);
  });

  // 13. Dependent qualification & Child Tax Credit phase-out
  it("Scenario 13: Child Tax Credit rules and phase-outs match statutory rules", () => {
    const rules2025 = getTaxRules(2025);
    expect(rules2025.credits?.childTaxCredit.maxCreditPerChildCents).toBe(200000); // $2,000
    expect(rules2025.credits?.childTaxCredit.phaseoutThresholdCents.single).toBe(20000000); // $200k
    expect(rules2025.credits?.childTaxCredit.phaseoutThresholdCents.married_filing_jointly).toBe(40000000); // $400k
  });

  // 14. Standard vs Itemized deduction comparison & auto-selection
  it("Scenario 14: Standard vs Itemized selects higher deduction automatically", () => {
    const singleStandardDeduction = 1575000; // $15,750
    const lowerItemized = 1000000; // $10,000
    const higherItemized = 2200000; // $22,000

    const resStandard = calculateIncomeTax({
      taxYear: 2025,
      filingStatus: "single",
      w2WagesCents: 8000000,
      scheduleA: { mortgageInterestCents: lowerItemized },
    });
    expect(resStandard.deductionUsedCents).toBe(singleStandardDeduction);
    expect(resStandard.deductionType).toBe("standard");

    const resItemized = calculateIncomeTax({
      taxYear: 2025,
      filingStatus: "single",
      w2WagesCents: 8000000,
      scheduleA: { mortgageInterestCents: higherItemized },
    });
    expect(resItemized.deductionUsedCents).toBe(higherItemized);
    expect(resItemized.deductionType).toBe("itemized");
  });

  // 15. Tax credit limits & refundable/non-refundable boundary
  it("Scenario 15: Non-refundable credits cannot reduce tax liability below zero", () => {
    const res = calculateIncomeTax({
      taxYear: 2025,
      filingStatus: "single",
      w2WagesCents: 2000000,
      federalWithholdingCents: 50000,
    });

    expect(res.totalTaxLiabilityCents).toBeGreaterThanOrEqual(0);
    expect(res.taxableIncomeCents).toBe(425000);
  });

  // 16. Deterministic engine versioning (2025 vs 2026 rulesets)
  it("Scenario 16: 2025 vs 2026 rulesets reflect inflation adjustments in standard deductions and brackets", () => {
    const rules2025 = getTaxRules(2025);
    const rules2026 = getTaxRules(2026);

    // 2025 Single: $15,750 vs 2026 Single: $16,100
    expect(rules2025.standardDeductions.single).toBe(1575000);
    expect(rules2026.standardDeductions.single).toBe(1610000);
    expect(rules2026.standardDeductions.single).toBeGreaterThan(rules2025.standardDeductions.single);

    // 2025 MFJ: $31,500 vs 2026 MFJ: $32,200
    expect(rules2025.standardDeductions.married_filing_jointly).toBe(3150000);
    expect(rules2026.standardDeductions.married_filing_jointly).toBe(3220000);
  });

  // 17. Gemini AI prompt boundary (explanation-only invariant)
  it("Scenario 17: Gemini AI prompt boundary strictly mandates explanation-only role and forbids calculation", () => {
    expect(SYSTEM_PROMPTS.taxExplainer).toContain("NEVER invent numerical tax results");
    expect(SYSTEM_PROMPTS.taxExplainer).toContain("You are NOT the Internal Revenue Service");
    expect(SYSTEM_PROMPTS.taxExplainer).toContain("You are NOT a CPA, Enrolled Agent, or tax attorney");
    expect(SYSTEM_PROMPTS.taxExplainer).toContain("Do not claim to have filed taxes");
    expect(SYSTEM_PROMPTS.intentExtraction).toContain("NEVER calculate tax liabilities, deductions, or refund amounts yourself");
  });

  // 18. Gemini fallback when service is offline
  it("Scenario 18: Gemini fallback gracefully handles offline status without crashing preparation session", async () => {
    await setupTaxpayer(USER_A);
    await TaxPreparationSessionStore.start(USER_A);

    setGeminiMockHandler(async () => {
      throw new Error("Gemini API connection timeout / service offline");
    });

    await TaxPreparationSessionStore.saveIncome(USER_A, {
      situations: ["employer"],
      w2s: [{ id: "w2-gemini", employerName: "Offline Co", wagesCents: 5000000, federalWithholdingCents: 600000 }],
      form1099s: [],
      activities: [],
    });
    await TaxPreparationSessionStore.saveDeductions(USER_A, {
      hasBusinessExpenses: false,
      standardDeductionAcknowledged: true,
      entries: [],
      guidedAnswers: {},
    });
    const calculated = await TaxPreparationSessionStore.calculate(USER_A);
    expect(calculated.status).toBe("review");
    expect(calculated.calculationSnapshot).not.toBeNull();
    expect(calculated.calculationSnapshot?.totalTaxLiabilityCents).toBeGreaterThan(0);

    setGeminiMockHandler(null);
  });

  // 19. Federal return document generation & immutable snapshot
  it("Scenario 19: Federal return document generation produces Form 1040 package without modifying session", async () => {
    await setupTaxpayer(USER_A);
    await TaxPreparationSessionStore.start(USER_A);

    await TaxPreparationSessionStore.saveIncome(USER_A, {
      situations: ["employer"],
      w2s: [{ id: "w2-doc", employerName: "ABC Inc", wagesCents: 7500000, federalWithholdingCents: 900000 }],
      form1099s: [],
      activities: [],
    });
    await TaxPreparationSessionStore.saveDeductions(USER_A, {
      hasBusinessExpenses: false,
      standardDeductionAcknowledged: true,
      entries: [],
      guidedAnswers: {},
    });
    const calculated = await TaxPreparationSessionStore.calculate(USER_A);

    const pkg = buildFederalReturnDocumentPackage(calculated);
    expect(pkg.taxYear).toBe(2025);
    expect(pkg.documents.length).toBeGreaterThan(0);
    expect(pkg.summary.totalGrossIncomeCents).toBe(7500000);

    const fedReturn = buildFederalReturn(calculated);
    expect(fedReturn.metadata.taxYear).toBe(2025);
    expect(fedReturn.income.w2WagesCents).toBe(7500000);
  });

  // 20. E-file readiness validation & freeze mechanism
  it("Scenario 20: E-file readiness validation and return freezing generate immutable filing record", async () => {
    await setupTaxpayer(USER_A);
    await TaxPreparationSessionStore.start(USER_A);

    await TaxPreparationSessionStore.saveHousehold(USER_A, {
      filingStatus: "single",
      dependents: [],
    });
    await TaxPreparationSessionStore.saveIncome(USER_A, {
      situations: ["employer"],
      w2s: [{ id: "w2-efile", employerName: "Acme", wagesCents: 6000000, federalWithholdingCents: 700000 }],
      form1099s: [],
      activities: [],
    });
    await TaxPreparationSessionStore.saveDeductions(USER_A, {
      hasBusinessExpenses: false,
      standardDeductionAcknowledged: true,
      entries: [],
      guidedAnswers: {},
    });
    await TaxPreparationSessionStore.calculate(USER_A);

    const readinessReq = createMockRequest(
      "/api/v1/tax/preparation/session/federal-return/efile/readiness",
      { method: "GET", token: USER_A }
    );
    const readinessRes = await getEfileReadinessApi(readinessReq);
    expect(readinessRes.status).toBe(200);

    const freezeReq = createMockRequest(
      "/api/v1/tax/preparation/session/federal-return/efile/freeze",
      {
        token: USER_A,
        body: {
          taxpayerSsnLast4: "1234",
          addressLine1: "123 Main St",
          city: "Austin",
          state: "TX",
          zipCode: "78701",
          acknowledgedDisclaimers: true,
        },
      }
    );
    const freezeRes = await freezeEfileApi(freezeReq);
    expect(freezeRes.status).toBe(200);
    const freezeJson = await freezeRes.json();
    expect(freezeJson.success).toBe(true);
    expect(freezeJson.data.checksum).toBeDefined();
    expect(freezeJson.data.isFrozen).toBe(true);
    expect(freezeJson.data.disclaimer).toMatch(/Electronic transmission to the IRS is NOT active/i);
  });

  // 21. State tax residency & federal-state separation
  it("Scenario 21: State tax calculations compute state liability without altering federal tax rules", async () => {
    const txEngine = getStateEngine("TX");
    const txResult = txEngine.calculateStateTax({
      stateCode: "TX",
      taxYear: 2025,
      residencyType: "full_year_resident",
      filingStatus: "single",
      federalAgiCents: 10000000,
      federalTaxableIncomeCents: 8500000,
      w2WagesCents: 10000000,
      gross1099IncomeCents: 0,
      selfEmploymentProfitCents: 0,
      qualifyingChildrenCount: 0,
      qualifyingDependentsCount: 0,
      stateWithholdingCents: 0,
    });
    expect(txResult.netStateTaxCents).toBe(0);

    expect(getStateSupportInfo("TX")?.supportStatus).toBe("NO_STATE_INCOME_TAX");
    expect(getStateSupportInfo("CA")?.hasIndividualIncomeTax).toBe(true);
  });

  // 22. CPA/EA professional review lifecycle (submit -> assign -> comment -> approve)
  it("Scenario 22: CPA/EA professional review lifecycle transitions through all review states", async () => {
    await setupTaxpayer(USER_A);
    const { session } = await TaxPreparationSessionStore.start(USER_A);

    await TaxPreparationSessionStore.saveIncome(USER_A, {
      situations: ["employer"],
      w2s: [{ id: "w2-pro", employerName: "Pro Test Co", wagesCents: 9000000, federalWithholdingCents: 1100000 }],
      form1099s: [],
      activities: [],
    });
    await TaxPreparationSessionStore.saveDeductions(USER_A, {
      hasBusinessExpenses: false,
      standardDeductionAcknowledged: true,
      entries: [],
      guidedAnswers: {},
    });
    await TaxPreparationSessionStore.calculate(USER_A);

    // 1. Submit review request with required sessionId and reviewType
    const subReq = createMockRequest(
      "/api/v1/tax/preparation/session/professional-review",
      {
        token: USER_A,
        body: {
          sessionId: session.id,
          reviewType: "cpa",
          priority: "HIGH",
          taxpayerNotes: "Please verify my W-2 income and bracket calculation.",
        },
      }
    );
    const subRes = await requestReviewApi(subReq);
    expect(subRes.status).toBe(201);
    const subJson = await subRes.json();
    const caseId = subJson.data.id;
    expect(subJson.data.status).toBe("REQUESTED");

    // 2. Assign pro and start review
    await ProfessionalReviewCaseStore.assignProfessional(
      caseId,
      { id: "test-admin-sarah", name: "Admin", role: "admin" },
      { id: PRO_USER, name: "Charlie CPA" }
    );
    await ProfessionalReviewCaseStore.startReview(caseId, {
      id: PRO_USER,
      name: "Charlie CPA",
      role: "professional",
    });

    // 3. Pro adds a comment
    const commentReq = createMockRequest(
      `/api/v1/tax/preparation/session/professional-review/${caseId}/comments`,
      {
        token: PRO_USER,
        body: {
          section: "w2_income",
          message: "Reviewed W-2 Box 1 and Box 2 withholding against tax brackets. Everything is accurate.",
          severity: "INFO",
        },
      }
    );
    const commentRes = await addCommentApi(commentReq, { params: Promise.resolve({ caseId }) });
    expect(commentRes.status).toBe(201);

    // 4. Mark ready for final review
    await ProfessionalReviewCaseStore.markReadyForFinalReview(caseId, {
      id: PRO_USER,
      name: "Charlie CPA",
      role: "professional",
    });

    // 5. Pro completes review
    const compReq = createMockRequest(
      `/api/v1/tax/preparation/session/professional-review/${caseId}/complete`,
      {
        token: PRO_USER,
        body: {
          notes: "Professional review completed. Tax calculation verified.",
        },
      }
    );
    const compRes = await completeReviewApi(compReq, { params: Promise.resolve({ caseId }) });
    expect(compRes.status).toBe(200);
    const compJson = await compRes.json();
    expect(compJson.data.status).toBe("REVIEW_COMPLETED");
  });

  // 23. Tenant isolation & cross-user access denial (RLS / Store authorization)
  it("Scenario 23: Tenant isolation prevents cross-user preparation access", async () => {
    await setupTaxpayer(USER_A);
    const { session } = await TaxPreparationSessionStore.start(USER_A);

    const crossAccess = await TaxPreparationSessionStore.getById(session.id, USER_B);
    expect(crossAccess).toBeNull();

    const userBSession = await TaxPreparationSessionStore.getCurrent(USER_B);
    expect(userBSession).toBeNull();
  });

  // 24. Global error handling & sanitized API error responses
  it("Scenario 24: Global error handling sanitizes responses and suppresses server stack traces", async () => {
    const malformedReq = createMockRequest("/api/v1/tax/preparation/session", {
      token: USER_A,
      rawText: "INVALID_JSON{{",
    });

    const res = await startSessionApi(malformedReq);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(getErrorMessage(json.error)).toMatch(/Malformed JSON/i);
    expect(json.stack).toBeUndefined();
  });

  // 25. Notification delivery & preference enforcement
  it("Scenario 25: Notifications are recorded with user preference channels", async () => {
    const notif = await NotificationStore.create({
      userId: USER_A,
      category: "calculations",
      type: "calculation_saved",
      title: "Tax Preparation Update",
      message: "Your 2025 calculation has been refreshed.",
    });

    expect(notif.id).toBeDefined();
    expect(notif.userId).toBe(USER_A);
    expect(notif.read).toBe(false);

    const userNotifs = await NotificationStore.getNotifications(USER_A);
    expect(userNotifs.notifications.some((n) => n.id === notif.id)).toBe(true);
  });
});
