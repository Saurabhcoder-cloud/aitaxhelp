import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as startSession, GET as getSession, PATCH as patchSession } from "../app/api/v1/tax/preparation/session/route";
import { PUT as saveIncome } from "../app/api/v1/tax/preparation/session/income/route";
import { PUT as saveDocuments } from "../app/api/v1/tax/preparation/session/documents/route";
import { PUT as saveDeductions } from "../app/api/v1/tax/preparation/session/deductions/route";
import { PATCH as patchProfile } from "../app/api/v1/auth/profile/route";
import { TaxPreparationSessionStore } from "../lib/services/tax-preparation-session-store";
import { UserProfileStore } from "../lib/services/user-profile-store";
import { IncomeDiscovery } from "../lib/preparation/income";
import { suggestDocumentsFromIncome } from "../lib/preparation/documents";
import { documentsInputSchema } from "../lib/validations/preparation-documents";
import { incomeSupportsBusinessExpenses } from "../lib/preparation/deductions";

function createMockRequest(url: string, options: { method?: string; body?: unknown; token?: string } = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: options.method || "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

const W2 = "11111111-1111-4111-8111-111111111111";
const F1099 = "33333333-3333-4333-8333-333333333333";
const GIG = "55555555-5555-4555-8555-555555555555";
const DOC_A = "77777777-7777-4777-8777-777777777777";
const DOC_B = "88888888-8888-4888-8888-888888888888";
const EXPENSE = "99999999-9999-4999-8999-999999999999";

function w2Income(): IncomeDiscovery {
  return {
    situations: ["employer"],
    w2s: [{ id: W2, employerName: "ABC Company", wagesCents: 6_000_000, federalWithholdingCents: 500_000 }],
    form1099s: [],
    activities: [],
  };
}

function form1099Income(): IncomeDiscovery {
  return {
    situations: ["freelance"],
    w2s: [],
    form1099s: [
      {
        id: F1099,
        incomeType: "freelance",
        payerName: "Design Services",
        grossIncomeCents: 4_000_000,
        federalWithholdingCents: 0,
      },
    ],
    activities: [],
  };
}

function mixedIncome(): IncomeDiscovery {
  return {
    situations: ["employer", "freelance"],
    w2s: w2Income().w2s,
    form1099s: form1099Income().form1099s,
    activities: [],
  };
}

function gigIncome(): IncomeDiscovery {
  return {
    situations: ["gig"],
    w2s: [],
    form1099s: [],
    activities: [
      {
        id: GIG,
        kind: "gig",
        activityName: "City Rides",
        grossReceiptsCents: 2_000_000,
        equipmentSuppliesCents: 10_000,
        softwareSubscriptionsCents: 0,
        homeOfficeVehicleCents: 20_000,
        otherExpensesCents: 0,
      },
    ],
  };
}

async function reach(token: string, step: "income" | "documents" | "deductions", income: IncomeDiscovery = w2Income()) {
  await startSession(
    createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
      method: "POST",
      token,
      body: {},
    })
  );
  const current = await getSession(
    createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", { token })
  );
  const body = await current.json();
  if (body.data.currentStep === "taxpayer_profile") {
    await patchSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
        method: "PATCH",
        token,
        body: { completeStep: "taxpayer_profile" },
      })
    );
  }
  if (step === "income") return;
  await saveIncome(
    createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/income", {
      method: "PUT",
      token,
      body: income,
    })
  );
  await patchSession(
    createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
      method: "PATCH",
      token,
      body: { completeStep: "income" },
    })
  );
  if (step === "documents") return;
  await saveDocuments(
    createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/documents", {
      method: "PUT",
      token,
      body: { documents: [] },
    })
  );
  await patchSession(
    createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
      method: "PATCH",
      token,
      body: { completeStep: "documents" },
    })
  );
}

function documentBody(overrides: Record<string, unknown> = {}) {
  return {
    documents: [
      {
        id: DOC_A,
        documentType: "w2",
        displayName: "W-2 from ABC Company",
        taxYear: 2025,
        sourceName: "ABC Company",
        status: "expected",
        notes: "",
        ...overrides,
      },
    ],
  };
}

describe("Preparation documents, deductions, and tax situation", () => {
  beforeEach(() => {
    TaxPreparationSessionStore.clear();
    UserProfileStore.clear();
  });

  it("creates, updates, and removes document metadata", async () => {
    await reach("doc-crud", "documents");
    const created = await saveDocuments(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/documents", {
        method: "PUT",
        token: "doc-crud",
        body: {
          documents: [
            documentBody().documents[0],
            {
              id: DOC_B,
              documentType: "other_income",
              displayName: "Extra statement",
              taxYear: 2025,
              sourceName: "Bank",
              status: "expected",
              notes: "",
            },
          ],
        },
      })
    );
    const createdBody = await created.json();
    expect(created.status).toBe(200);
    expect(createdBody.data.documentsSnapshot.documents).toHaveLength(2);
    expect(createdBody.data.documentsSnapshot.documents[0].userId).toBe("doc-crud");
    expect(createdBody.data.documentsSnapshot.documents[0].preparationSessionId).toBe(createdBody.data.id);

    const updated = await saveDocuments(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/documents", {
        method: "PUT",
        token: "doc-crud",
        body: documentBody({ status: "received", notes: "Paper copy on hand" }),
      })
    );
    const updatedBody = await updated.json();
    expect(updatedBody.data.documentsSnapshot.documents).toHaveLength(1);
    expect(updatedBody.data.documentsSnapshot.documents[0].status).toBe("received");
    expect(updatedBody.data.documentsSnapshot.documents[0].createdAt).toBe(
      createdBody.data.documentsSnapshot.documents[0].createdAt
    );
  });

  it("records received and missing document status", async () => {
    await reach("doc-status", "documents", mixedIncome());
    const res = await saveDocuments(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/documents", {
        method: "PUT",
        token: "doc-status",
        body: {
          documents: [
            { ...documentBody().documents[0], status: "received" },
            {
              id: DOC_B,
              documentType: "form_1099",
              displayName: "1099 from Design Services",
              taxYear: 2025,
              sourceName: "Design Services",
              status: "missing",
              notes: "",
            },
          ],
        },
      })
    );
    const body = await res.json();
    expect(body.data.situationSummary.documentsReceived).toEqual(["W-2 from ABC Company"]);
    expect(body.data.situationSummary.warnings).toContain("1099 from Design Services is still needed");
    expect(body.data.calculationReadiness.ready).toBe(false);
  });

  it("suggests W-2, 1099, and gig documents from income", () => {
    const w2Docs = suggestDocumentsFromIncome(w2Income(), 2025);
    expect(w2Docs.map((document) => document.documentType)).toEqual(["w2"]);
    expect(w2Docs[0].displayName).toBe("W-2 from ABC Company");

    const formDocs = suggestDocumentsFromIncome(form1099Income(), 2025);
    expect(formDocs[0].documentType).toBe("form_1099");
    expect(formDocs[0].displayName).toBe("1099 from Design Services");

    const gigDocs = suggestDocumentsFromIncome(gigIncome(), 2025);
    expect(documentsInputSchema.safeParse({ documents: [...w2Docs, ...formDocs, ...gigDocs] }).success).toBe(true);
    expect(gigDocs.map((document) => document.documentType)).toEqual(["other_income", "deduction_support"]);
    expect(gigDocs[0].displayName).toContain("City Rides");
    expect(gigDocs[1].displayName).toContain("Expense records");
  });

  it("persists documents for the owner and hides them from another user", async () => {
    await reach("doc-owner", "documents");
    await saveDocuments(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/documents", {
        method: "PUT",
        token: "doc-owner",
        body: documentBody({ status: "received" }),
      })
    );
    const resumed = await getSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", { token: "doc-owner" })
    );
    const resumedBody = await resumed.json();
    expect(resumedBody.data.documentsSnapshot.documents[0].displayName).toBe("W-2 from ABC Company");

    const other = await getSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", { token: "doc-other" })
    );
    expect((await other.json()).data).toBeNull();

    const denied = await saveDocuments(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/documents", {
        method: "PUT",
        token: "doc-other",
        body: documentBody(),
      })
    );
    expect(denied.status).toBe(404);

    const unauthenticated = await saveDocuments(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/documents", {
        method: "PUT",
        token: "unauthenticated",
        body: documentBody(),
      })
    );
    expect(unauthenticated.status).toBe(401);

    const spoofed = await saveDocuments(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/documents", {
        method: "PUT",
        token: "doc-owner",
        body: { ...documentBody(), userId: "someone-else" },
      })
    );
    expect(spoofed.status).toBe(422);
  });

  it("saves valid business expenses and rejects invalid or incomplete amounts", async () => {
    await reach("deduct-valid", "deductions", gigIncome());
    expect(incomeSupportsBusinessExpenses(gigIncome())).toBe(true);

    const invalid = await saveDeductions(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/deductions", {
        method: "PUT",
        token: "deduct-valid",
        body: {
          hasBusinessExpenses: true,
          standardDeductionAcknowledged: false,
          entries: [
            {
              id: EXPENSE,
              category: "equipment_supplies",
              amountCents: -100,
              description: "Supplies",
              relatedIncomeId: GIG,
              confirmed: true,
            },
          ],
        },
      })
    );
    expect(invalid.status).toBe(422);

    const incomplete = await saveDeductions(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/deductions", {
        method: "PUT",
        token: "deduct-valid",
        body: {
          hasBusinessExpenses: true,
          standardDeductionAcknowledged: false,
          entries: [
            {
              id: EXPENSE,
              category: "equipment_supplies",
              amountCents: 0,
              description: "",
              relatedIncomeId: GIG,
              confirmed: true,
            },
          ],
        },
      })
    );
    expect(incomplete.status).toBe(422);

    const blocked = await patchSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
        method: "PATCH",
        token: "deduct-valid",
        body: { completeStep: "deductions" },
      })
    );
    expect(blocked.status).toBe(422);

    const saved = await saveDeductions(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/deductions", {
        method: "PUT",
        token: "deduct-valid",
        body: {
          hasBusinessExpenses: true,
          standardDeductionAcknowledged: true,
          entries: [
            {
              id: EXPENSE,
              category: "home_office_vehicle",
              amountCents: 25_000,
              description: "Mileage records",
              relatedIncomeId: GIG,
              confirmed: true,
            },
          ],
        },
      })
    );
    const savedBody = await saved.json();
    expect(saved.status).toBe(200);
    expect(savedBody.data.deductionsSnapshot.entries[0].amountCents).toBe(25_000);
    expect(savedBody.data.situationSummary.whatYouToldUs.expenseCents).toBe(25_000);
    expect(savedBody.data.situationSummary.whatYouToldUs.gigBusinessGrossCents).toBe(2_000_000);
  });

  it("asks wage-only taxpayers to acknowledge the standard deduction", async () => {
    await reach("deduct-w2", "deductions", w2Income());
    const rejected = await saveDeductions(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/deductions", {
        method: "PUT",
        token: "deduct-w2",
        body: {
          hasBusinessExpenses: false,
          standardDeductionAcknowledged: false,
          entries: [],
        },
      })
    );
    expect(rejected.status).toBe(422);

    const saved = await saveDeductions(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/deductions", {
        method: "PUT",
        token: "deduct-w2",
        body: {
          hasBusinessExpenses: false,
          standardDeductionAcknowledged: true,
          entries: [],
        },
      })
    );
    expect(saved.status).toBe(200);
    const body = await saved.json();
    expect(body.data.situationSummary.informationReceived).toContain(
      "Standard deduction will be used by the tax engine"
    );
    expect(body.data.situationSummary.whatYouToldUs.w2WagesCents).toBe(6_000_000);
    expect(body.data.situationSummary.whatYouToldUs.form1099GrossCents).toBe(0);
  });

  it("builds summaries for 1099-only and mixed income and reports readiness", async () => {
    await patchProfile(
      createMockRequest("http://localhost:3000/api/v1/auth/profile", {
        method: "PATCH",
        token: "summary-1099",
        body: { profile: { fullName: "Riley Contractor" }, taxProfile: { filingStatus: "single", defaultTaxYear: 2025 } },
      })
    );
    await reach("summary-1099", "deductions", form1099Income());
    await saveDeductions(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/deductions", {
        method: "PUT",
        token: "summary-1099",
        body: { hasBusinessExpenses: false, standardDeductionAcknowledged: true, entries: [] },
      })
    );
    const only1099 = await getSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", { token: "summary-1099" })
    );
    const onlyBody = await only1099.json();
    expect(onlyBody.data.situationSummary.whatYouToldUs.form1099GrossCents).toBe(4_000_000);
    expect(onlyBody.data.situationSummary.whatYouToldUs.w2WagesCents).toBe(0);
    expect(onlyBody.data.situationSummary.whatYouToldUs.incomeSources).toEqual(["Freelance — Design Services"]);
    expect(onlyBody.data.calculationReadiness.ready).toBe(true);
    expect(onlyBody.data.situationSummary.calculationStatus).toBe("ready");

    await patchProfile(
      createMockRequest("http://localhost:3000/api/v1/auth/profile", {
        method: "PATCH",
        token: "summary-mixed",
        body: { profile: { fullName: "Casey Mixed" }, taxProfile: { filingStatus: "single", defaultTaxYear: 2025 } },
      })
    );
    await reach("summary-mixed", "documents", mixedIncome());
    const mixed = await getSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", { token: "summary-mixed" })
    );
    const mixedBody = await mixed.json();
    expect(mixedBody.data.situationSummary.whatYouToldUs.incomeSources).toEqual([
      "W-2 — ABC Company",
      "Freelance — Design Services",
    ]);
    expect(mixedBody.data.calculationReadiness.missing).toContain("Deduction answers");
    expect(mixedBody.data.situationSummary.calculationStatus).toBe("not_ready");
    expect(mixedBody.data.situationSummary.readiness).not.toHaveProperty("totalTaxLiabilityCents");
  });
});
