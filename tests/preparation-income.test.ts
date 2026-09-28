import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as startSession, GET as getSession, PATCH as patchSession } from "../app/api/v1/tax/preparation/session/route";
import { PUT as saveIncome } from "../app/api/v1/tax/preparation/session/income/route";
import { TaxPreparationSessionStore } from "../lib/services/tax-preparation-session-store";
import { UserProfileStore } from "../lib/services/user-profile-store";
import { buildPreparationCalculatorInputs, IncomeDiscovery } from "../lib/preparation/income";
import { incomeDiscoverySchema } from "../lib/validations/preparation-income";
import { incomeTaxInputSchema, selfEmployedInputSchema, quarterlyTaxInputSchema } from "../tax-engine/validation/schemas";
import { calculateIncomeTax, calculateQuarterlyTax, calculateSelfEmployedTax } from "../tax-engine";

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

const W2_A = "11111111-1111-4111-8111-111111111111";
const W2_B = "22222222-2222-4222-8222-222222222222";
const F1099_A = "33333333-3333-4333-8333-333333333333";
const F1099_B = "44444444-4444-4444-8444-444444444444";
const GIG = "55555555-5555-4555-8555-555555555555";
const BUSINESS = "66666666-6666-4666-8666-666666666666";

function w2Only(): IncomeDiscovery {
  return {
    situations: ["employer"],
    w2s: [
      {
        id: W2_A,
        employerName: "ABC Company",
        wagesCents: 6_000_000,
        federalWithholdingCents: 800_000,
      },
    ],
    form1099s: [],
    activities: [],
  };
}

function form1099Only(): IncomeDiscovery {
  return {
    situations: ["freelance"],
    w2s: [],
    form1099s: [
      {
        id: F1099_A,
        incomeType: "freelance",
        payerName: "Design Services",
        grossIncomeCents: 4_500_000,
        federalWithholdingCents: 0,
      },
    ],
    activities: [],
  };
}

function gigOnly(): IncomeDiscovery {
  return {
    situations: ["gig"],
    w2s: [],
    form1099s: [],
    activities: [
      {
        id: GIG,
        kind: "gig",
        activityName: "City Rides",
        grossReceiptsCents: 3_200_000,
        equipmentSuppliesCents: 10_000,
        softwareSubscriptionsCents: 5_000,
        homeOfficeVehicleCents: 40_000,
        otherExpensesCents: 2_000,
      },
    ],
  };
}

function mixed(): IncomeDiscovery {
  return {
    situations: ["employer", "freelance"],
    w2s: w2Only().w2s,
    form1099s: form1099Only().form1099s,
    activities: [],
  };
}

async function openIncomeStep(token: string) {
  const started = await startSession(
    createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
      method: "POST",
      token,
      body: {},
    })
  );
  const body = await started.json();
  if (body.data.currentStep === "taxpayer_profile") {
    await patchSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
        method: "PATCH",
        token,
        body: { completeStep: "taxpayer_profile" },
      })
    );
  }
}

async function putIncome(token: string, income: IncomeDiscovery) {
  return saveIncome(
    createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/income", {
      method: "PUT",
      token,
      body: income,
    })
  );
}

describe("Preparation income discovery", () => {
  beforeEach(() => {
    TaxPreparationSessionStore.clear();
    UserProfileStore.clear();
  });

  it("saves W-2 only income", async () => {
    await openIncomeStep("income-w2");
    const res = await putIncome("income-w2", w2Only());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.incomeSnapshot.w2s).toHaveLength(1);
    expect(body.data.incomeSnapshot.w2s[0].employerName).toBe("ABC Company");
    expect(body.data.suggestedCalculators.map((item: { calculatorType: string }) => item.calculatorType)).toEqual([
      "income_tax",
    ]);
  });

  it("saves 1099 only income", async () => {
    await openIncomeStep("income-1099");
    const res = await putIncome("income-1099", form1099Only());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.incomeSnapshot.form1099s[0].payerName).toBe("Design Services");
    expect(body.data.profileSnapshot.has1099Income).toBe(true);
    expect(body.data.profileSnapshot.hasW2Income).toBe(false);
  });

  it("saves gig and self-employed activity income", async () => {
    await openIncomeStep("income-gig");
    const res = await putIncome("income-gig", gigOnly());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.incomeSnapshot.activities[0].activityName).toBe("City Rides");
    expect(body.data.suggestedCalculators.map((item: { calculatorType: string }) => item.calculatorType)).toEqual(
      expect.arrayContaining(["1099", "self_employed", "quarterly_tax"])
    );
  });

  it("saves mixed W-2 and 1099 income in one session", async () => {
    await openIncomeStep("income-mixed");
    const res = await putIncome("income-mixed", mixed());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.incomeSnapshot.situations).toEqual(["employer", "freelance"]);
    expect(body.data.incomeSnapshot.w2s).toHaveLength(1);
    expect(body.data.incomeSnapshot.form1099s).toHaveLength(1);
    expect(body.data.profileSnapshot.hasW2Income).toBe(true);
    expect(body.data.profileSnapshot.has1099Income).toBe(true);
  });

  it("saves multiple W-2 records", async () => {
    await openIncomeStep("income-w2-many");
    const income = w2Only();
    income.w2s.push({
      id: W2_B,
      employerName: "Second Job",
      wagesCents: 1_000_000,
      federalWithholdingCents: 100_000,
    });
    const res = await putIncome("income-w2-many", income);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.incomeSnapshot.w2s).toHaveLength(2);
  });

  it("saves multiple 1099 records", async () => {
    await openIncomeStep("income-1099-many");
    const income = form1099Only();
    income.form1099s.push({
      id: F1099_B,
      incomeType: "other",
      payerName: "Side Client",
      grossIncomeCents: 250_000,
      federalWithholdingCents: 0,
    });
    const res = await putIncome("income-1099-many", income);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.incomeSnapshot.form1099s).toHaveLength(2);
  });

  it("rejects missing, incomplete, negative, and duplicate income", async () => {
    await openIncomeStep("income-invalid");

    const none = await putIncome("income-invalid", {
      situations: [],
      w2s: [],
      form1099s: [],
      activities: [],
    });
    expect(none.status).toBe(422);

    const incomplete = await putIncome("income-invalid", {
      ...w2Only(),
      w2s: [{ ...w2Only().w2s[0], employerName: "" }],
    });
    expect(incomplete.status).toBe(422);

    const negative = await putIncome("income-invalid", {
      ...w2Only(),
      w2s: [{ ...w2Only().w2s[0], wagesCents: -100 }],
    });
    expect(negative.status).toBe(422);

    const duplicate = await putIncome("income-invalid", {
      ...w2Only(),
      w2s: [
        w2Only().w2s[0],
        { ...w2Only().w2s[0], id: W2_B, employerName: "abc company" },
      ],
    });
    expect(duplicate.status).toBe(422);

    const clientUser = await putIncome("income-invalid", {
      ...w2Only(),
      userId: "someone-else",
    } as IncomeDiscovery);
    expect(clientUser.status).toBe(422);

    const unauthenticated = await putIncome("unauthenticated", w2Only());
    expect(unauthenticated.status).toBe(401);
  });

  it("persists income and resumes the same session", async () => {
    await openIncomeStep("income-resume");
    const saved = await putIncome("income-resume", mixed());
    const savedBody = await saved.json();

    const resumed = await getSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
        token: "income-resume",
      })
    );
    const resumedBody = await resumed.json();
    expect(resumedBody.data.id).toBe(savedBody.data.id);
    expect(resumedBody.data.incomeSnapshot).toEqual(mixed());

    const other = await getSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
        token: "income-other",
      })
    );
    const otherBody = await other.json();
    expect(otherBody.data).toBeNull();
  });

  it("completes the income step only after valid income is saved", async () => {
    await openIncomeStep("income-complete");
    const blocked = await patchSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
        method: "PATCH",
        token: "income-complete",
        body: { completeStep: "income" },
      })
    );
    expect(blocked.status).toBe(422);

    await putIncome("income-complete", w2Only());
    const completed = await patchSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
        method: "PATCH",
        token: "income-complete",
        body: { completeStep: "income" },
      })
    );
    const body = await completed.json();
    expect(completed.status).toBe(200);
    expect(body.data.steps.income).toBe("completed");
    expect(body.data.currentStep).toBe("documents");
    expect(body.data.incomeSnapshot.w2s[0].employerName).toBe("ABC Company");
  });

  it("maps mixed income into existing calculator inputs without changing engine results", () => {
    const income: IncomeDiscovery = {
      situations: ["employer", "freelance", "gig", "business"],
      w2s: [
        { id: W2_A, employerName: "ABC Company", wagesCents: 5_000_000, federalWithholdingCents: 600_000 },
        { id: W2_B, employerName: "Night Shift", wagesCents: 1_000_000, federalWithholdingCents: 50_000 },
      ],
      form1099s: [
        {
          id: F1099_A,
          incomeType: "freelance",
          payerName: "Design Services",
          grossIncomeCents: 2_000_000,
          federalWithholdingCents: 10_000,
        },
        {
          id: F1099_B,
          incomeType: "other",
          payerName: "Side Client",
          grossIncomeCents: 500_000,
          federalWithholdingCents: 0,
        },
      ],
      activities: [
        {
          id: GIG,
          kind: "gig",
          activityName: "City Rides",
          grossReceiptsCents: 800_000,
          equipmentSuppliesCents: 20_000,
          softwareSubscriptionsCents: 5_000,
          homeOfficeVehicleCents: 15_000,
          otherExpensesCents: 0,
        },
        {
          id: BUSINESS,
          kind: "business",
          activityName: "Studio",
          grossReceiptsCents: 1_200_000,
          equipmentSuppliesCents: 30_000,
          softwareSubscriptionsCents: 0,
          homeOfficeVehicleCents: 10_000,
          otherExpensesCents: 5_000,
        },
      ],
    };

    expect(incomeDiscoverySchema.safeParse(income).success).toBe(true);
    const payloads = buildPreparationCalculatorInputs(income, 2025, "single");
    expect(incomeTaxInputSchema.safeParse(payloads.incomeTax).success).toBe(true);
    expect(selfEmployedInputSchema.safeParse(payloads.selfEmployed).success).toBe(true);
    expect(quarterlyTaxInputSchema.safeParse(payloads.quarterly).success).toBe(true);

    const directSelfEmployed = {
      taxYear: 2025 as const,
      filingStatus: "single" as const,
      gross1099IncomeCents: 2_000_000 + 500_000 + 800_000 + 1_200_000,
      businessExpensesCents: 20_000 + 5_000 + 15_000 + 30_000 + 10_000 + 5_000,
      w2WagesCents: 6_000_000,
      federalWithholdingCents: 600_000 + 50_000 + 10_000,
      hasOtherSelfEmploymentIncome: true,
    };

    const mapped = calculateSelfEmployedTax(payloads.selfEmployed);
    const direct = calculateSelfEmployedTax(directSelfEmployed);
    expect(mapped.totalTaxLiabilityCents).toBe(direct.totalTaxLiabilityCents);
    expect(mapped.federalIncomeTaxCents).toBe(direct.federalIncomeTaxCents);
    expect(mapped.selfEmploymentTaxCents).toBe(direct.selfEmploymentTaxCents);

    const incomeTax = calculateIncomeTax(payloads.incomeTax);
    const directIncome = calculateIncomeTax({
      taxYear: 2025,
      filingStatus: "single",
      w2WagesCents: 6_000_000,
      otherIncomeCents: 0,
      federalWithholdingCents: 650_000,
      itemizedDeductionCents: 0,
    });
    expect(incomeTax.totalTaxLiabilityCents).toBe(directIncome.totalTaxLiabilityCents);

    const quarterly = calculateQuarterlyTax(payloads.quarterly);
    const directQuarterly = calculateQuarterlyTax({
      taxYear: 2025,
      filingStatus: "single",
      estimatedAnnualGrossCents: 6_000_000 + 4_500_000,
      estimatedAnnualExpensesCents: 85_000,
      w2AnnualWagesCents: 6_000_000,
      w2AnnualWithholdingCents: 650_000,
    });
    expect(quarterly.totalTaxLiabilityCents).toBe(directQuarterly.totalTaxLiabilityCents);
  });
});
