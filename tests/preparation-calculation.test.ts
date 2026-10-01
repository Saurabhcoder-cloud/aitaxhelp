import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  POST as startSession,
  GET as getSession,
  PATCH as patchSession,
} from "../app/api/v1/tax/preparation/session/route";
import { PUT as saveIncome } from "../app/api/v1/tax/preparation/session/income/route";
import { PUT as saveDocuments } from "../app/api/v1/tax/preparation/session/documents/route";
import { PUT as saveDeductions } from "../app/api/v1/tax/preparation/session/deductions/route";
import { POST as calculateSession } from "../app/api/v1/tax/preparation/session/calculate/route";
import { PATCH as patchProfile } from "../app/api/v1/auth/profile/route";
import { TaxPreparationSessionStore } from "../lib/services/tax-preparation-session-store";
import { TaxCalculationStore } from "../lib/services/tax-calculation-store";
import { UserProfileStore } from "../lib/services/user-profile-store";
import { IncomeDiscovery } from "../lib/preparation/income";
import {
  resolvePreparationExpenseCents,
  resolvePreparationGross1099Cents,
  resolvePreparationW2WagesCents,
  resolvePreparationWithholdingCents,
  mapPreparationSessionToEngineInput,
  executePreparationCalculation,
} from "../lib/preparation/calculation";
import { calculateIncomeTax, calculateSelfEmployedTax } from "../tax-engine";

function createMockRequest(
  url: string,
  options: { method?: string; body?: unknown; token?: string } = {}
) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: options.method || "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

const W2_1 = "11111111-1111-4111-8111-111111111111";
const W2_2 = "22222222-2222-4222-8222-222222222222";
const F1099_1 = "33333333-3333-4333-8333-333333333333";
const GIG_1 = "55555555-5555-4555-8555-555555555555";
const EXPENSE_1 = "99999999-9999-4999-8999-999999999999";

describe("Phase 4: Tax Calculation Integration & Tax Situation Summary", () => {
  beforeEach(() => {
    TaxPreparationSessionStore.clear();
    TaxCalculationStore.clear();
    UserProfileStore.clear();
  });

  async function setupReadyUserSession(
    token: string,
    fullName: string,
    income: IncomeDiscovery,
    deductions: {
      hasBusinessExpenses: boolean | null;
      standardDeductionAcknowledged: boolean;
      entries: any[];
    }
  ) {
    // 1. Setup profile
    await patchProfile(
      createMockRequest("http://localhost:3000/api/v1/auth/profile", {
        method: "PATCH",
        token,
        body: { profile: { fullName } },
      })
    );

    // 2. Start preparation session
    const startRes = await startSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
        method: "POST",
        token,
        body: {},
      })
    );
    expect(startRes.status).toBe(201);

    // 3. Save income
    const incomeRes = await saveIncome(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/income", {
        method: "PUT",
        token,
        body: income,
      })
    );
    expect(incomeRes.status).toBe(200);

    // Advance past income
    await patchSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
        method: "PATCH",
        token,
        body: { completeStep: "income" },
      })
    );

    // 4. Save documents metadata
    await saveDocuments(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/documents", {
        method: "PUT",
        token,
        body: {
          documents: [
            {
              id: "77777777-7777-4777-8777-777777777777",
              documentType: "other_income",
              displayName: "Proof of Income",
              taxYear: 2025,
              sourceName: "Employer",
              status: "received",
              notes: "",
            },
          ],
        },
      })
    );

    // Advance past documents
    await patchSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
        method: "PATCH",
        token,
        body: { completeStep: "documents" },
      })
    );

    // 5. Save deductions
    const dedRes = await saveDeductions(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/deductions", {
        method: "PUT",
        token,
        body: deductions,
      })
    );
    expect(dedRes.status).toBe(200);

    // Advance past deductions to calculation step
    const advanceDed = await patchSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
        method: "PATCH",
        token,
        body: { completeStep: "deductions" },
      })
    );
    expect(advanceDed.status).toBe(200);

    const sessionRes = await getSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", { token })
    );
    return (await sessionRes.json()).data;
  }

  it("1. Clean mapping layer aggregates W-2 only income and withholding", () => {
    const income: IncomeDiscovery = {
      situations: ["employer"],
      w2s: [
        { id: W2_1, employerName: "Company A", wagesCents: 5_000_000, federalWithholdingCents: 600_000 },
        { id: W2_2, employerName: "Company B", wagesCents: 3_000_000, federalWithholdingCents: 400_000 },
      ],
      form1099s: [],
      activities: [],
    };

    expect(resolvePreparationW2WagesCents(income)).toBe(8_000_000);
    const withholding = resolvePreparationWithholdingCents(income);
    expect(withholding.w2WithholdingCents).toBe(1_000_000);
    expect(withholding.form1099WithholdingCents).toBe(0);
    expect(withholding.totalWithholdingCents).toBe(1_000_000);
    expect(resolvePreparationGross1099Cents(income)).toBe(0);
  });

  it("2. Clean mapping layer aggregates 1099, gig income, and confirmed deductions", () => {
    const income: IncomeDiscovery = {
      situations: ["freelance", "gig"],
      w2s: [],
      form1099s: [
        { id: F1099_1, incomeType: "freelance", payerName: "Client A", grossIncomeCents: 4_000_000, federalWithholdingCents: 100_000 },
      ],
      activities: [
        {
          id: GIG_1,
          kind: "gig",
          activityName: "Rideshare",
          grossReceiptsCents: 2_500_000,
          equipmentSuppliesCents: 100_000,
          softwareSubscriptionsCents: 50_000,
          homeOfficeVehicleCents: 300_000,
          otherExpensesCents: 50_000,
        },
      ],
    };

    const deductions = {
      saved: true,
      hasBusinessExpenses: true,
      standardDeductionAcknowledged: false,
      entries: [
        {
          id: EXPENSE_1,
          category: "home_office_vehicle" as const,
          amountCents: 450_000,
          description: "Vehicle expense",
          relatedIncomeId: GIG_1,
          confirmed: true,
        },
      ],
    };

    expect(resolvePreparationGross1099Cents(income)).toBe(6_500_000);
    expect(resolvePreparationExpenseCents(deductions, income)).toBe(450_000);

    const withholding = resolvePreparationWithholdingCents(income);
    expect(withholding.form1099WithholdingCents).toBe(100_000);
    expect(withholding.totalWithholdingCents).toBe(100_000);
  });

  it("3. Calculates W-2 only taxes using the deterministic tax engine and saves history", async () => {
    const token = "user-w2-calc";
    const income: IncomeDiscovery = {
      situations: ["employer"],
      w2s: [
        { id: W2_1, employerName: "Acme Corp", wagesCents: 6_000_000, federalWithholdingCents: 700_000 },
      ],
      form1099s: [],
      activities: [],
    };
    const deductions = {
      hasBusinessExpenses: null,
      standardDeductionAcknowledged: true,
      entries: [],
    };

    const sessionBefore = await setupReadyUserSession(token, "Jordan W2", income, deductions);
    expect(sessionBefore.currentStep).toBe("calculation");
    expect(sessionBefore.status).toBe("calculation_ready");
    expect(sessionBefore.situationSummary.calculationStatus).toBe("ready");

    // Execute calculate
    const calcRes = await calculateSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/calculate", {
        method: "POST",
        token,
      })
    );
    expect(calcRes.status).toBe(200);
    const body = await calcRes.json();
    expect(body.success).toBe(true);

    const session = body.data;
    expect(session.currentStep).toBe("review");
    expect(session.status).toBe("review");
    expect(session.calculationId).toBeTruthy();
    expect(session.calculationSnapshot).toBeTruthy();

    // Verify deterministic tax numbers match calculateIncomeTax exactly
    const directResult = calculateIncomeTax({
      taxYear: 2025,
      filingStatus: "single",
      w2WagesCents: 6_000_000,
      federalWithholdingCents: 700_000,
    });
    expect(session.calculationSnapshot.federalIncomeTaxCents).toBe(directResult.federalIncomeTaxCents);
    expect(session.calculationSnapshot.taxableIncomeCents).toBe(directResult.taxableIncomeCents);
    expect(session.calculationSnapshot.deductionUsedCents).toBe(directResult.deductionUsedCents);
    expect(session.calculationSnapshot.estimatedRefundCents).toBe(directResult.estimatedRefundCents);
    expect(session.calculationSnapshot.estimatedAmountOwedCents).toBe(directResult.estimatedAmountOwedCents);

    // Verify calculation persisted in TaxCalculationStore
    const persisted = await TaxCalculationStore.getById(session.calculationId, "user-w2-calc");
    expect(persisted).toBeTruthy();
    expect(persisted?.calculatorType).toBe("income_tax");
    expect(persisted?.taxYear).toBe(2025);

    // Verify TaxSituationSummary uses ACTUAL calculated numbers
    const summary = session.situationSummary;
    expect(summary.calculationStatus).toBe("calculated");
    expect(summary.totalIncomeCents).toBe(6_000_000);
    expect(summary.taxableIncomeCents).toBe(directResult.taxableIncomeCents);
    expect(summary.deductionsCents).toBe(directResult.deductionUsedCents);
    expect(summary.federalWithholdingCents).toBe(700_000);
    expect(summary.estimatedFederalTaxCents).toBe(directResult.totalTaxLiabilityCents);
    expect(summary.calculation?.calculatorType).toBe("income_tax");
    expect(summary.calculation?.refundOrBalanceDue.amountCents).toBe(
      directResult.estimatedRefundCents > 0
        ? directResult.estimatedRefundCents
        : directResult.estimatedAmountOwedCents
    );
  });

  it("4. Calculates 1099 only taxes with Schedule SE and standard deduction", async () => {
    const token = "user-1099-calc";
    const income: IncomeDiscovery = {
      situations: ["freelance"],
      w2s: [],
      form1099s: [
        { id: F1099_1, incomeType: "freelance", payerName: "Tech Corp", grossIncomeCents: 5_000_000, federalWithholdingCents: 0 },
      ],
      activities: [],
    };
    const deductions = {
      hasBusinessExpenses: true,
      standardDeductionAcknowledged: false,
      entries: [
        {
          id: EXPENSE_1,
          category: "equipment_supplies" as const,
          amountCents: 500_000,
          description: "Laptop",
          relatedIncomeId: F1099_1,
          confirmed: true,
        },
      ],
    };

    await setupReadyUserSession(token, "Alex Contractor", income, deductions);

    const calcRes = await calculateSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/calculate", {
        method: "POST",
        token,
      })
    );
    expect(calcRes.status).toBe(200);
    const body = await calcRes.json();
    const session = body.data;

    // Direct deterministic comparison
    const directResult = calculateSelfEmployedTax({
      taxYear: 2025,
      filingStatus: "single",
      gross1099IncomeCents: 5_000_000,
      businessExpensesCents: 500_000,
      w2WagesCents: 0,
      federalWithholdingCents: 0,
    });

    expect(session.calculationSnapshot.selfEmploymentTaxCents).toBe(directResult.selfEmploymentTaxCents);
    expect(session.calculationSnapshot.selfEmploymentTaxCents).toBeGreaterThan(0);
    expect(session.calculationSnapshot.totalTaxLiabilityCents).toBe(directResult.totalTaxLiabilityCents);
    expect(session.situationSummary.calculationStatus).toBe("calculated");
    expect(session.situationSummary.calculation?.calculatorType).toBe("self_employed");
  });

  it("5. Calculates mixed W-2 + 1099 with combined withholding and wage cap interaction", async () => {
    const token = "user-mixed-calc";
    const income: IncomeDiscovery = {
      situations: ["employer", "freelance"],
      w2s: [
        { id: W2_1, employerName: "Main Job Corp", wagesCents: 7_000_000, federalWithholdingCents: 900_000 },
      ],
      form1099s: [
        { id: F1099_1, incomeType: "freelance", payerName: "Side Client", grossIncomeCents: 3_000_000, federalWithholdingCents: 200_000 },
      ],
      activities: [],
    };
    const deductions = {
      hasBusinessExpenses: true,
      standardDeductionAcknowledged: false,
      entries: [
        {
          id: EXPENSE_1,
          category: "software_subscriptions" as const,
          amountCents: 200_000,
          description: "Software licenses",
          relatedIncomeId: F1099_1,
          confirmed: true,
        },
      ],
    };

    await setupReadyUserSession(token, "Taylor Mixed", income, deductions);

    const calcRes = await calculateSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/calculate", {
        method: "POST",
        token,
      })
    );
    expect(calcRes.status).toBe(200);
    const body = await calcRes.json();
    const session = body.data;

    // Combined withholding: 900_000 + 200_000 = 1_100_000
    expect(session.calculationSnapshot.totalPaymentsAndWithholdingCents).toBe(1_100_000);

    const directResult = calculateSelfEmployedTax({
      taxYear: 2025,
      filingStatus: "single",
      gross1099IncomeCents: 3_000_000,
      businessExpensesCents: 200_000,
      w2WagesCents: 7_000_000,
      federalWithholdingCents: 1_100_000,
    });

    expect(session.calculationSnapshot.totalTaxLiabilityCents).toBe(directResult.totalTaxLiabilityCents);
    expect(session.calculationSnapshot.federalIncomeTaxCents).toBe(directResult.federalIncomeTaxCents);
    expect(session.calculationSnapshot.selfEmploymentTaxCents).toBe(directResult.selfEmploymentTaxCents);
    expect(session.calculationSnapshot.estimatedRefundCents).toBe(directResult.estimatedRefundCents);
    expect(session.calculationSnapshot.estimatedAmountOwedCents).toBe(directResult.estimatedAmountOwedCents);
    expect(session.situationSummary.federalWithholdingCents).toBe(1_100_000);
  });

  it("6. Rejects calculation attempts on incomplete or invalid preparation sessions", async () => {
    const token = "user-incomplete-calc";
    // 1. Start draft session without profile or income
    await startSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
        method: "POST",
        token,
        body: {},
      })
    );

    // Attempting to calculate immediately must fail with 422
    const calcRes = await calculateSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/calculate", {
        method: "POST",
        token,
      })
    );
    expect(calcRes.status).toBe(422);
    const body = await calcRes.json();
    expect(body.success).toBe(false);
    expect(body.error.message).toContain("Preparation session is incomplete");
  });

  it("7. Blocks updating calculation progress before calculation has been run", async () => {
    const token = "user-premature-advance";
    const income: IncomeDiscovery = {
      situations: ["employer"],
      w2s: [
        { id: W2_1, employerName: "Big Corp", wagesCents: 5_000_000, federalWithholdingCents: 500_000 },
      ],
      form1099s: [],
      activities: [],
    };
    const deductions = {
      hasBusinessExpenses: null,
      standardDeductionAcknowledged: true,
      entries: [],
    };

    await setupReadyUserSession(token, "Sam Advance", income, deductions);

    // Current step is calculation. Attempting to PATCH completeStep: "calculation" without calculate() must fail
    const prematurePatch = await patchSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
        method: "PATCH",
        token,
        body: { completeStep: "calculation" },
      })
    );
    expect(prematurePatch.status).toBe(422);
    const body = await prematurePatch.json();
    expect(body.error.message).toContain("Run tax calculation before continuing");
  });

  it("8. Completes the full preparation workflow from start to completion", async () => {
    const token = "user-full-journey";
    const income: IncomeDiscovery = {
      situations: ["employer"],
      w2s: [
        { id: W2_1, employerName: "Acme", wagesCents: 4_000_000, federalWithholdingCents: 600_000 },
      ],
      form1099s: [],
      activities: [],
    };
    const deductions = {
      hasBusinessExpenses: null,
      standardDeductionAcknowledged: true,
      entries: [],
    };

    const sessionAtCalc = await setupReadyUserSession(token, "Morgan Final", income, deductions);
    expect(sessionAtCalc.currentStep).toBe("calculation");

    // 1. Calculate
    const calcRes = await calculateSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/calculate", {
        method: "POST",
        token,
      })
    );
    expect(calcRes.status).toBe(200);
    const sessionAtReview = (await calcRes.json()).data;
    expect(sessionAtReview.currentStep).toBe("review");
    expect(sessionAtReview.status).toBe("review");

    // 2. Complete review
    const reviewRes = await patchSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
        method: "PATCH",
        token,
        body: { completeStep: "review" },
      })
    );
    expect(reviewRes.status).toBe(200);
    const completedSession = (await reviewRes.json()).data;
    expect(completedSession.status).toBe("completed");
    expect(completedSession.steps.review).toBe("completed");
    expect(completedSession.calculationId).toBeTruthy();
  });
});
