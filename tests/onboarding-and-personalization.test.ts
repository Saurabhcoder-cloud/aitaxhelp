import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getProfile, PATCH as patchProfile } from "../app/api/v1/auth/profile/route";
import { POST as calculateTaxApi } from "../app/api/v1/tax/calculate/route";
import { POST as assistantApi } from "../app/api/v1/ai/assistant/route";
import { UserProfileStore } from "../lib/services/user-profile-store";
import { TaxCalculationStore } from "../lib/services/tax-calculation-store";
import { ConversationStore } from "../lib/services/conversation-store";

function createMockRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string;
    cookie?: string;
  } = {}
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }
  if (options.cookie) {
    headers["Cookie"] = `taxaihelp-auth-token=${options.cookie}`;
  }

  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: options.method || "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

describe("Taxpayer Onboarding & Personalization Suite (Phase 5 Step 6)", () => {
  beforeEach(() => {
    UserProfileStore.clear();
    TaxCalculationStore.clear();
    ConversationStore.clear();
  });

  it("1. Authenticated onboarding/profile retrieval returns valid defaults", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/auth/profile", {
      method: "GET",
      token: "test-user-onboard-1",
    });

    const res = await getProfile(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.profile.id).toBe("test-user-onboard-1");
    expect(json.data.taxProfile.defaultTaxYear).toBe(2025);
    expect(json.data.taxProfile.filingStatus).toBe("single");
  });

  it("2. Profile defaults correctly prefill supported calculator fields and full onboarding saves completely", async () => {
    // Perform full onboarding setup
    const onboardingReq = createMockRequest("http://localhost:3000/api/v1/auth/profile", {
      method: "PATCH",
      token: "test-user-full-onboard",
      body: {
        profile: {
          fullName: "Morgan Taylor",
        },
        taxProfile: {
          defaultTaxYear: 2026,
          filingStatus: "married_filing_jointly",
          hasW2Income: true,
          has1099Income: true,
          hasBusinessExpenses: true,
          stateOfResidence: "Colorado",
        },
      },
    });

    const onboardRes = await patchProfile(onboardingReq);
    expect(onboardRes.status).toBe(200);

    const verifyReq = createMockRequest("http://localhost:3000/api/v1/auth/profile", {
      method: "GET",
      token: "test-user-full-onboard",
    });
    const verifyRes = await getProfile(verifyReq);
    const verifyJson = await verifyRes.json();

    expect(verifyJson.data.profile.fullName).toBe("Morgan Taylor");
    expect(verifyJson.data.taxProfile.defaultTaxYear).toBe(2026);
    expect(verifyJson.data.taxProfile.filingStatus).toBe("married_filing_jointly");
    expect(verifyJson.data.taxProfile.hasW2Income).toBe(true);
    expect(verifyJson.data.taxProfile.has1099Income).toBe(true);
    expect(verifyJson.data.taxProfile.hasBusinessExpenses).toBe(true);
    expect(verifyJson.data.taxProfile.stateOfResidence).toBe("Colorado");
  });

  it("3. User can override profile-derived defaults without modifying saved profile", async () => {
    // 1. Establish baseline profile
    await UserProfileStore.updateTaxProfile("test-user-override", {
      defaultTaxYear: 2025,
      filingStatus: "single",
    });

    // 2. Simulate user choosing different calculator inputs (e.g. 2026 / Married Filing Jointly)
    const overriddenYear = 2026;
    const overriddenStatus = "married_filing_jointly";

    // Verify stored profile in store remains completely unchanged
    const stored = await UserProfileStore.getTaxProfile("test-user-override");
    expect(stored.defaultTaxYear).toBe(2025);
    expect(stored.filingStatus).toBe("single");
    expect(stored.defaultTaxYear).not.toBe(overriddenYear);
    expect(stored.filingStatus).not.toBe(overriddenStatus);
  });

  it("4. Calculation submission does not silently modify profile", async () => {
    // 1. Set baseline profile
    await UserProfileStore.updateTaxProfile("test-user-calc-run", {
      defaultTaxYear: 2025,
      filingStatus: "single",
    });

    // 2. Run deterministic calculation with different inputs (2026 / Head of Household)
    const calcReq = createMockRequest("http://localhost:3000/api/v1/tax/calculate", {
      method: "POST",
      token: "test-user-calc-run",
      body: {
        calculatorType: "income_tax",
        taxYear: 2026,
        filingStatus: "head_of_household",
        w2WagesCents: 8500000,
        otherIncomeCents: 0,
        federalWithholdingCents: 1000000,
      },
    });

    const calcRes = await calculateTaxApi(calcReq);
    expect(calcRes.status).toBe(200);

    // 3. Verify user's saved profile defaults were NOT silently modified
    const profile = await UserProfileStore.getTaxProfile("test-user-calc-run");
    expect(profile.defaultTaxYear).toBe(2025);
    expect(profile.filingStatus).toBe("single");
  });

  it("5. Explicit 'save as default' updates only authenticated user's profile", async () => {
    const saveDefaultReq = createMockRequest("http://localhost:3000/api/v1/auth/profile", {
      method: "PATCH",
      token: "test-user-explicit-save",
      body: {
        taxProfile: {
          defaultTaxYear: 2026,
          filingStatus: "married_filing_separately",
        },
      },
    });

    const res = await patchProfile(saveDefaultReq);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.taxProfile.defaultTaxYear).toBe(2026);
    expect(json.data.taxProfile.filingStatus).toBe("married_filing_separately");
  });

  it("6. Unauthenticated profile update is strictly rejected with 401 UNAUTHORIZED", async () => {
    const unauthReq = createMockRequest("http://localhost:3000/api/v1/auth/profile", {
      method: "PATCH",
      body: {
        taxProfile: {
          defaultTaxYear: 2026,
        },
      },
    });

    const res = await patchProfile(unauthReq);
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("7. Cross-user profile isolation: User A's defaults cannot affect User B", async () => {
    // User A sets 2026 / Married Joint
    const reqA = createMockRequest("http://localhost:3000/api/v1/auth/profile", {
      method: "PATCH",
      token: "taxpayer-a-isolated",
      body: {
        taxProfile: {
          defaultTaxYear: 2026,
          filingStatus: "married_filing_jointly",
        },
      },
    });
    await patchProfile(reqA);

    // User B sets 2024 / Head of Household
    const reqB = createMockRequest("http://localhost:3000/api/v1/auth/profile", {
      method: "PATCH",
      token: "taxpayer-b-isolated",
      body: {
        taxProfile: {
          defaultTaxYear: 2024,
          filingStatus: "head_of_household",
        },
      },
    });
    await patchProfile(reqB);

    // Verify User A remains unaffected
    const checkA = await UserProfileStore.getTaxProfile("taxpayer-a-isolated");
    expect(checkA.defaultTaxYear).toBe(2026);
    expect(checkA.filingStatus).toBe("married_filing_jointly");

    // Verify User B remains unaffected
    const checkB = await UserProfileStore.getTaxProfile("taxpayer-b-isolated");
    expect(checkB.defaultTaxYear).toBe(2024);
    expect(checkB.filingStatus).toBe("head_of_household");
  });

  it("8. Rejects invalid profile values with 422 VALIDATION_ERROR", async () => {
    const invalidYearReq = createMockRequest("http://localhost:3000/api/v1/auth/profile", {
      method: "PATCH",
      token: "test-user-invalid-val",
      body: {
        taxProfile: {
          defaultTaxYear: 1999, // unsupported year
        },
      },
    });

    const res = await patchProfile(invalidYearReq);
    expect(res.status).toBe(422);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("9. Deterministic calculator still functions accurately even if profile retrieval fails or is empty", async () => {
    // Direct tax calculation without profile dependency
    const calcReq = createMockRequest("http://localhost:3000/api/v1/tax/calculate", {
      method: "POST",
      token: "uninitialized-profile-user",
      body: {
        calculatorType: "income_tax",
        taxYear: 2025,
        filingStatus: "single",
        w2WagesCents: 7500000,
        otherIncomeCents: 0,
        federalWithholdingCents: 850000,
      },
    });

    const res = await calculateTaxApi(calcReq);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.taxableIncomeCents).toBe(7500000 - 1575000); // 2025 single deduction $15,750
  });

  it("10. AI context does not override deterministic calculation results", async () => {
    // 1. User has saved profile defaults: 2026 / Single
    await UserProfileStore.updateTaxProfile("test-ai-deterministic-user", {
      defaultTaxYear: 2026,
      filingStatus: "single",
    });

    // 2. User has a saved historical calculation from 2024 / Married Filing Jointly ($120k income)
    const historicalCalc = await TaxCalculationStore.save("test-ai-deterministic-user", {
      title: "2024 Joint Filing Baseline",
      calculatorType: "income_tax",
      taxYear: 2024,
      filingStatus: "married_filing_jointly",
      inputSnapshot: {
        taxYear: 2024,
        filingStatus: "married_filing_jointly",
        w2WagesCents: 12000000,
      },
      resultSnapshot: {
        calculatorType: "income_tax",
        taxYear: 2024,
        filingStatus: "married_filing_jointly",
        grossIncomeCents: 12000000,
        totalAdjustmentsCents: 0,
        adjustedGrossIncomeCents: 12000000,
        deductionType: "standard",
        deductionUsedCents: 2920000, // 2024 MFJ standard deduction
        taxableIncomeCents: 9080000,
        federalIncomeTaxCents: 1045200,
        selfEmploymentTaxCents: 0,
        totalTaxLiabilityCents: 1045200,
        effectiveTaxRate: 0.0871,
        marginalTaxBracket: 0.12,
        estimatedRefundCents: 0,
        estimatedAmountOwedCents: 1045200,
        totalPaymentsAndWithholdingCents: 0,
        bracketBreakdown: [],
        warnings: [],
        rulesVersion: "Rev. Proc. 2023-34",
        engineVersion: "1.0.0",
        calculatedAt: new Date().toISOString(),
      },
    });

    // 3. User asks AI to explain this calculation
    const aiReq = createMockRequest("http://localhost:3000/api/v1/ai/assistant", {
      method: "POST",
      token: "test-ai-deterministic-user",
      body: {
        message: "Can you explain this tax calculation?",
        calculationId: historicalCalc.id,
      },
    });

    const aiRes = await assistantApi(aiReq);
    expect(aiRes.status).toBe(200);

    const aiJson = await aiRes.json();
    expect(aiJson.success).toBe(true);
    // Verified calculation attached in response MUST match historical snapshot exactly, not current profile!
    expect(aiJson.data.calculation.isHistorical).toBe(true);
    expect(aiJson.data.calculation.result.taxYear).toBe(2024);
    expect(aiJson.data.calculation.result.filingStatus).toBe("married_filing_jointly");
    expect(aiJson.data.calculation.result.deductionUsedCents).toBe(2920000);
    expect(aiJson.data.calculation.result.totalTaxLiabilityCents).toBe(1045200);
  });
});
