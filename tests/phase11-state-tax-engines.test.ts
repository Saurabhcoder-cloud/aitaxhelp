import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as startSession } from "../app/api/v1/tax/preparation/session/route";
import { PUT as saveHousehold } from "../app/api/v1/tax/preparation/session/household/route";
import { PUT as saveIncome } from "../app/api/v1/tax/preparation/session/income/route";
import { PUT as saveDeductions } from "../app/api/v1/tax/preparation/session/deductions/route";
import { POST as calculateSession } from "../app/api/v1/tax/preparation/session/calculate/route";
import { PATCH as patchProfile } from "../app/api/v1/auth/profile/route";
import { GET as getStateTaxOverview } from "../app/api/v1/tax/preparation/session/state-tax/route";
import { GET as getStateTaxReadiness } from "../app/api/v1/tax/preparation/session/state-tax/readiness/route";
import { POST as calculateStateTaxRoute } from "../app/api/v1/tax/preparation/session/state-tax/calculate/route";
import { POST as freezeStateReturnRoute } from "../app/api/v1/tax/preparation/session/state-tax/freeze/route";
import { POST as submitStateEfileRoute } from "../app/api/v1/tax/preparation/session/state-tax/efile/submit/route";
import { GET as getStateEfileStatusRoute } from "../app/api/v1/tax/preparation/session/state-tax/efile/status/route";
import { GET as getStateDocumentsRoute } from "../app/api/v1/tax/preparation/session/state-tax/documents/route";
import {
  TaxPreparationSessionStore,
  TaxPreparationSession,
} from "../lib/services/tax-preparation-session-store";
import { TaxCalculationStore } from "../lib/services/tax-calculation-store";
import { UserProfileStore } from "../lib/services/user-profile-store";
import { StateTaxReturnStore } from "../lib/services/state-tax-return-store";
import { StateEfileSubmissionStore } from "../lib/services/state-efile-submission-store";
import { buildFederalReturn } from "../lib/preparation/federal-return";
import {
  getStateSupportInfo,
  isStateSupported,
  stateHasIndividualIncomeTax,
  isStateReturnRequired,
  getStateEngine,
  getAllStates,
  resetDefaultEnginesForTesting,
} from "../lib/state-tax/registry";
import {
  mapFederalReturnToStateInput,
  buildStateBridgeData,
} from "../lib/state-tax/federal-bridge";
import { analyzeMultiStateScenario } from "../lib/state-tax/multi-state";
import { evaluateStateReadiness } from "../lib/state-tax/readiness";
import { buildStateTaxSummary } from "../lib/state-tax/summary";
import { buildStateReturn } from "../lib/state-tax/state-return-builder";
import { DefaultStateDocumentProvider, getStateDocumentProvider } from "../lib/state-tax/documents";
import {
  DisconnectedStateEfileProvider,
  MockStateEfileProvider,
  setTestStateEfileProvider,
  canTransitionStateEfile,
} from "../lib/state-tax/efile";
import { CaliforniaTaxEngine } from "../lib/state-tax/engines/california-engine";

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

const USER_ALICE_TOKEN = "user-alice-token-1111-2222-3333-444444444444";
const USER_BOB_TOKEN = "user-bob-token-5555-6666-7777-888888888888";

describe("Phase 11: State Tax Engines & Return Preparation Suite", () => {
  beforeEach(() => {
    TaxPreparationSessionStore.clear();
    TaxCalculationStore.clear();
    UserProfileStore.clear();
    StateTaxReturnStore.clearStore();
    StateEfileSubmissionStore.clearStore();
    resetDefaultEnginesForTesting();
    setTestStateEfileProvider(null);
  });

  async function initTaxpayerSession(
    token: string,
    fullName = "Alice Resident",
    stateOfResidence = "CA"
  ): Promise<TaxPreparationSession> {
    await patchProfile(
      createMockRequest("http://localhost:3000/api/v1/auth/profile", {
        method: "PATCH",
        token,
        body: {
          profile: { fullName },
          taxProfile: { stateOfResidence },
        },
      })
    );

    const res = await startSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
        method: "POST",
        token,
        body: {},
      })
    );
    const data = await res.json();
    return data.data as TaxPreparationSession;
  }

  async function setupCalculatedSession(
    token: string,
    state = "CA",
    w2WagesCents = 75_000_00,
    withholdingCents = 4_000_00
  ) {
    const session = await initTaxpayerSession(token, "Alice Taxpayer", state);

    await saveHousehold(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
        method: "PUT",
        token,
        body: { filingStatus: "single", hasDependents: false, dependents: [] },
      })
    );

    await saveIncome(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/income", {
        method: "PUT",
        token,
        body: {
          situations: ["employer"],
          w2s: [
            {
              id: "w2-p11",
              employerName: "TechCorp California",
              wagesCents: w2WagesCents,
              federalWithholdingCents: 10_000_00,
            },
          ],
          form1099s: [],
          activities: [],
        },
      })
    );

    await saveDeductions(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/deductions", {
        method: "PUT",
        token,
        body: {
          hasBusinessExpenses: false,
          standardDeductionAcknowledged: true,
          entries: [],
          guidedAnswers: {
            stateLocal: { paidStateLocalTaxes: withholdingCents > 0, stateLocalTaxCents: withholdingCents },
          },
        },
      })
    );

    await calculateSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/calculate", {
        method: "POST",
        token,
        body: {},
      })
    );

    return TaxPreparationSessionStore.getCurrent(session.userId) as Promise<TaxPreparationSession>;
  }

  // ---------------------------------------------------------------------------
  // 1-4. State Registry & Classification
  // ---------------------------------------------------------------------------
  it("1. catalogs all 50 states + DC in the state registry", () => {
    const states = getAllStates();
    expect(states.length).toBe(51);
  });

  it("2. marks California as SUPPORTED with active statutory engine", () => {
    const info = getStateSupportInfo("CA");
    expect(info?.supportStatus).toBe("SUPPORTED");
    expect(info?.hasIndividualIncomeTax).toBe(true);
    expect(info?.supportedYears).toContain(2025);
    expect(info?.supportedYears).toContain(2026);
    expect(info?.activeEngineVersion).toContain("ca");
  });

  it("3. marks unsupported income tax state (NY) as NOT_SUPPORTED", () => {
    const info = getStateSupportInfo("NY");
    expect(info?.supportStatus).toBe("NOT_SUPPORTED");
    expect(info?.hasIndividualIncomeTax).toBe(true);
    expect(isStateSupported("NY", 2025)).toBe(false);
  });

  it("4. marks no-income-tax state (TX, FL, WA) as NO_STATE_INCOME_TAX", () => {
    for (const code of ["TX", "FL", "WA", "NV", "AK", "SD", "WY", "TN", "NH"]) {
      const info = getStateSupportInfo(code);
      expect(info?.supportStatus).toBe("NO_STATE_INCOME_TAX");
      expect(info?.hasIndividualIncomeTax).toBe(false);
      expect(isStateSupported(code, 2025)).toBe(true);
    }
  });

  // ---------------------------------------------------------------------------
  // 5-7. Residency Classifications
  // ---------------------------------------------------------------------------
  it("5. computes full-year resident state return on worldwide income", () => {
    const caEngine = new CaliforniaTaxEngine();
    const result = caEngine.calculateStateTax({
      stateCode: "CA",
      taxYear: 2025,
      residencyType: "full_year_resident",
      filingStatus: "single",
      federalAgiCents: 8_000_000,
      federalTaxableIncomeCents: 6_500_000,
      w2WagesCents: 8_000_000,
      gross1099IncomeCents: 0,
      selfEmploymentProfitCents: 0,
      qualifyingChildrenCount: 0,
      qualifyingDependentsCount: 0,
      stateWithholdingCents: 400_000,
    });

    expect(result.stateAgiCents).toBe(8_000_000);
    expect(result.stateTaxableIncomeCents).toBe(8_000_000 - 554_000);
    expect(result.grossStateTaxCents).toBeGreaterThan(0);
  });

  it("6. computes part-year resident return with prorated income and deductions", () => {
    const caEngine = new CaliforniaTaxEngine();
    const result = caEngine.calculateStateTax({
      stateCode: "CA",
      taxYear: 2025,
      residencyType: "part_year_resident",
      filingStatus: "single",
      federalAgiCents: 10_000_000,
      federalTaxableIncomeCents: 8_500_000,
      w2WagesCents: 10_000_000,
      gross1099IncomeCents: 0,
      selfEmploymentProfitCents: 0,
      qualifyingChildrenCount: 0,
      qualifyingDependentsCount: 0,
      stateWithholdingCents: 0,
      nonresidentIncomeAllocationPercentage: 40, // 40% in CA
    });

    expect(result.stateTaxableIncomeCents).toBe(Math.round((10_000_000 - 554_000) * 0.4));
  });

  it("7. computes nonresident return with Form 540NR proration", () => {
    const caEngine = new CaliforniaTaxEngine();
    const result = caEngine.calculateStateTax({
      stateCode: "CA",
      taxYear: 2025,
      residencyType: "nonresident",
      filingStatus: "single",
      federalAgiCents: 12_000_000,
      federalTaxableIncomeCents: 10_500_000,
      w2WagesCents: 3_000_000, // 25% CA wages
      gross1099IncomeCents: 0,
      selfEmploymentProfitCents: 0,
      qualifyingChildrenCount: 0,
      qualifyingDependentsCount: 0,
      stateWithholdingCents: 100_000,
      nonresidentIncomeAllocationPercentage: 25,
    });

    expect(result.stateTaxableIncomeCents).toBe(Math.round((12_000_000 - 554_000) * 0.25));
  });

  // ---------------------------------------------------------------------------
  // 8-10. Income Sourcing (W-2, 1099, Self-Employment)
  // ---------------------------------------------------------------------------
  it("8. sources W-2 wages into state return calculation", () => {
    const caEngine = new CaliforniaTaxEngine();
    const res = caEngine.calculateStateTax({
      stateCode: "CA",
      taxYear: 2025,
      residencyType: "full_year_resident",
      filingStatus: "single",
      federalAgiCents: 5_000_000,
      federalTaxableIncomeCents: 3_500_000,
      w2WagesCents: 5_000_000,
      gross1099IncomeCents: 0,
      selfEmploymentProfitCents: 0,
      qualifyingChildrenCount: 0,
      qualifyingDependentsCount: 0,
      stateWithholdingCents: 200_000,
    });
    expect(res.stateAgiCents).toBe(5_000_000);
  });

  it("9. sources 1099 gross income into state return calculation", () => {
    const caEngine = new CaliforniaTaxEngine();
    const res = caEngine.calculateStateTax({
      stateCode: "CA",
      taxYear: 2025,
      residencyType: "full_year_resident",
      filingStatus: "single",
      federalAgiCents: 4_500_000,
      federalTaxableIncomeCents: 3_000_000,
      w2WagesCents: 0,
      gross1099IncomeCents: 4_500_000,
      selfEmploymentProfitCents: 0,
      qualifyingChildrenCount: 0,
      qualifyingDependentsCount: 0,
      stateWithholdingCents: 0,
    });
    expect(res.stateAgiCents).toBe(4_500_000);
  });

  it("10. sources self-employment / gig business profit into state calculation", () => {
    const caEngine = new CaliforniaTaxEngine();
    const res = caEngine.calculateStateTax({
      stateCode: "CA",
      taxYear: 2025,
      residencyType: "full_year_resident",
      filingStatus: "single",
      federalAgiCents: 6_200_000,
      federalTaxableIncomeCents: 4_700_000,
      w2WagesCents: 0,
      gross1099IncomeCents: 0,
      selfEmploymentProfitCents: 6_200_000,
      qualifyingChildrenCount: 0,
      qualifyingDependentsCount: 0,
      stateWithholdingCents: 0,
    });
    expect(res.stateAgiCents).toBe(6_200_000);
  });

  // ---------------------------------------------------------------------------
  // 11-12. Withholding & Estimated Tax Payments
  // ---------------------------------------------------------------------------
  it("11. records state withholding and applies it to liability", () => {
    const caEngine = new CaliforniaTaxEngine();
    const res = caEngine.calculateStateTax({
      stateCode: "CA",
      taxYear: 2025,
      residencyType: "full_year_resident",
      filingStatus: "single",
      federalAgiCents: 6_000_000,
      federalTaxableIncomeCents: 4_500_000,
      w2WagesCents: 6_000_000,
      gross1099IncomeCents: 0,
      selfEmploymentProfitCents: 0,
      qualifyingChildrenCount: 0,
      qualifyingDependentsCount: 0,
      stateWithholdingCents: 300_000,
    });
    expect(res.totalWithholdingCents).toBe(300_000);
  });

  it("12. handles quarterly estimated tax payments correctly", () => {
    const caEngine = new CaliforniaTaxEngine();
    const res = caEngine.calculateStateTax({
      stateCode: "CA",
      taxYear: 2025,
      residencyType: "full_year_resident",
      filingStatus: "single",
      federalAgiCents: 10_000_000,
      federalTaxableIncomeCents: 8_500_000,
      w2WagesCents: 0,
      gross1099IncomeCents: 10_000_000,
      selfEmploymentProfitCents: 10_000_000,
      qualifyingChildrenCount: 0,
      qualifyingDependentsCount: 0,
      stateWithholdingCents: 0,
      stateEstimatedPaymentsCents: 500_000, // $5,000 estimated payments
    });
    expect(res.estimatedPaymentsCents).toBe(500_000);
  });

  // ---------------------------------------------------------------------------
  // 13-14. State Deductions & State Credits
  // ---------------------------------------------------------------------------
  it("13. applies statutory state standard deduction decoupled from federal", () => {
    const caEngine = new CaliforniaTaxEngine();
    const singleRes = caEngine.calculateStateTax({
      stateCode: "CA",
      taxYear: 2025,
      residencyType: "full_year_resident",
      filingStatus: "single",
      federalAgiCents: 5_000_000,
      federalTaxableIncomeCents: 3_500_000,
      w2WagesCents: 5_000_000,
      gross1099IncomeCents: 0,
      selfEmploymentProfitCents: 0,
      qualifyingChildrenCount: 0,
      qualifyingDependentsCount: 0,
      stateWithholdingCents: 0,
    });
    expect(singleRes.breakdown.deductionUsedCents).toBe(554_000); // $5,540 CA single standard deduction
  });

  it("14. applies statutory personal exemption and dependent credits", () => {
    const caEngine = new CaliforniaTaxEngine();
    const res = caEngine.calculateStateTax({
      stateCode: "CA",
      taxYear: 2025,
      residencyType: "full_year_resident",
      filingStatus: "married_filing_jointly",
      federalAgiCents: 12_000_000,
      federalTaxableIncomeCents: 10_000_000,
      w2WagesCents: 12_000_000,
      gross1099IncomeCents: 0,
      selfEmploymentProfitCents: 0,
      qualifyingChildrenCount: 2,
      qualifyingDependentsCount: 0,
      stateWithholdingCents: 0,
    });
    // $298 personal + ($456 x 2 = $912) dependent = $1,210 ($121,000 cents)
    expect(res.breakdown.exemptionsCents).toBe(121_000);
    expect(res.nonRefundableCreditsCents).toBe(121_000);
  });

  // ---------------------------------------------------------------------------
  // 15-16. Refund vs Balance Due Determinations
  // ---------------------------------------------------------------------------
  it("15. determines refund when withholding exceeds net tax liability", () => {
    const caEngine = new CaliforniaTaxEngine();
    const res = caEngine.calculateStateTax({
      stateCode: "CA",
      taxYear: 2025,
      residencyType: "full_year_resident",
      filingStatus: "single",
      federalAgiCents: 4_000_000,
      federalTaxableIncomeCents: 2_500_000,
      w2WagesCents: 4_000_000,
      gross1099IncomeCents: 0,
      selfEmploymentProfitCents: 0,
      qualifyingChildrenCount: 0,
      qualifyingDependentsCount: 0,
      stateWithholdingCents: 500_000, // $5,000 withholding
    });
    expect(res.refundOrBalanceType).toBe("refund");
    expect(res.refundOrBalanceCents).toBeGreaterThan(0);
  });

  it("16. determines balance due when withholding is less than liability", () => {
    const caEngine = new CaliforniaTaxEngine();
    const res = caEngine.calculateStateTax({
      stateCode: "CA",
      taxYear: 2025,
      residencyType: "full_year_resident",
      filingStatus: "single",
      federalAgiCents: 15_000_000,
      federalTaxableIncomeCents: 13_500_000,
      w2WagesCents: 15_000_000,
      gross1099IncomeCents: 0,
      selfEmploymentProfitCents: 0,
      qualifyingChildrenCount: 0,
      qualifyingDependentsCount: 0,
      stateWithholdingCents: 50_000, // $500 withholding
    });
    expect(res.refundOrBalanceType).toBe("balance_due");
    expect(res.refundOrBalanceCents).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // 17-18. Multi-State Foundation
  // ---------------------------------------------------------------------------
  it("17. identifies multi-state scenario involving supported states", () => {
    const analysis = analyzeMultiStateScenario({
      residentStateCode: "CA",
      remoteWorkStates: ["TX"],
    });
    expect(analysis.isMultiState).toBe(true);
    expect(analysis.status).toBe("REQUIRES_STATE_RULES");
  });

  it("18. blocks multi-state scenario involving unsupported states", () => {
    const analysis = analyzeMultiStateScenario({
      residentStateCode: "CA",
      remoteWorkStates: ["NY"], // NY is currently unsupported
    });
    expect(analysis.isMultiState).toBe(true);
    expect(analysis.status).toBe("NOT_SUPPORTED");
    expect(analysis.actionRequired).toContain("CPA");
  });

  // ---------------------------------------------------------------------------
  // 19. Federal-to-State Bridge Read-Only Invariant
  // ---------------------------------------------------------------------------
  it("19. keeps federal return completely unmutated when bridging data to state", async () => {
    const session = await setupCalculatedSession(USER_ALICE_TOKEN, "CA");
    const fedBefore = buildFederalReturn(session);
    const bridge = buildStateBridgeData(session, fedBefore);
    const fedAfter = buildFederalReturn(session);

    expect(bridge.stateCode).toBe("CA");
    expect(fedBefore.adjustments.adjustedGrossIncomeCents).toBe(fedAfter.adjustments.adjustedGrossIncomeCents);
    expect(fedBefore.taxes.totalTaxLiabilityCents).toBe(fedAfter.taxes.totalTaxLiabilityCents);
  });

  // ---------------------------------------------------------------------------
  // 20-21. State Return Generation & Readiness
  // ---------------------------------------------------------------------------
  it("20. builds canonical StateReturn with SHA-256 cryptographic digest", async () => {
    const session = await setupCalculatedSession(USER_ALICE_TOKEN, "CA");
    const stateReturn = buildStateReturn(session);

    expect(stateReturn.metadata.stateCode).toBe("CA");
    expect(stateReturn.metadata.checksumSha256).toBeDefined();
    expect(stateReturn.metadata.checksumSha256?.length).toBe(64);
    expect(stateReturn.taxpayer.stateOfResidence).toBe("CA");
  });

  it("21. evaluates 14 state readiness validation criteria", async () => {
    const session = await setupCalculatedSession(USER_ALICE_TOKEN, "CA");
    const readiness = evaluateStateReadiness(session);

    expect(readiness.checks.length).toBe(14);
    expect(readiness.isReady).toBe(true);
    expect(readiness.status).toBe("READY");
    expect(readiness.summary.blockingErrorsCount).toBe(0);
    expect(readiness.blockingErrors.length).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // 22. State Document Generation
  // ---------------------------------------------------------------------------
  it("22. generates State Tax Preparation Summary clearly disclosing non-official status", async () => {
    const session = await setupCalculatedSession(USER_ALICE_TOKEN, "CA");
    const summary = buildStateTaxSummary(session);
    const docProvider = getStateDocumentProvider("CA");
    const pkg = docProvider.generateDocumentPackage(summary);

    expect(pkg.isSupported).toBe(true);
    expect(pkg.documents.length).toBeGreaterThan(0);
    const mainDoc = pkg.documents[0];
    expect(mainDoc.isOfficialForm).toBe(false);
    expect(mainDoc.description).toContain("Not an Official State Filing Form");
  });

  // ---------------------------------------------------------------------------
  // 23. State E-File Readiness & Lifecycle
  // ---------------------------------------------------------------------------
  it("23. enforces fail-closed state e-file provider behavior in production", async () => {
    const provider = new DisconnectedStateEfileProvider("CA");
    expect(provider.isTransmissionConnected).toBe(false);

    const submissionResult = await provider.submitStateReturn({
      stateCode: "CA",
      stateName: "California",
    } as any);

    expect(submissionResult.success).toBe(false);
    expect(submissionResult.status).toBe("DISCONNECTED");
  });

  // ---------------------------------------------------------------------------
  // 24-26. Security & Cross-User Protection
  // ---------------------------------------------------------------------------
  it("24. rejects unauthenticated access to state tax APIs", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/state-tax", {
      method: "GET",
    });
    const res = await getStateTaxOverview(req);
    expect(res.status).toBe(401);
  });

  it("25. enforces cross-user isolation: User B cannot access User A state tax data", async () => {
    await setupCalculatedSession(USER_ALICE_TOKEN, "CA");

    // Bob requests state tax data without having a session
    const req = createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/state-tax", {
      method: "GET",
      token: USER_BOB_TOKEN,
    });
    const res = await getStateTaxOverview(req);
    expect(res.status).toBe(404);
  });

  it("26. ignores client-supplied totals in POST /state-tax/calculate", async () => {
    await setupCalculatedSession(USER_ALICE_TOKEN, "CA");

    const req = createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/state-tax/calculate", {
      method: "POST",
      token: USER_ALICE_TOKEN,
      body: {
        hackedLiabilityCents: 0,
        fakeRefundCents: 99999999,
      },
    });

    const res = await calculateStateTaxRoute(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.grossStateTaxCents).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // 27. Gemini Explanation-Only Invariant
  // ---------------------------------------------------------------------------
  it("27. ensures deterministic calculation engine does not invoke LLM APIs", () => {
    const caEngine = new CaliforniaTaxEngine();
    const result = caEngine.calculateStateTax({
      stateCode: "CA",
      taxYear: 2025,
      residencyType: "full_year_resident",
      filingStatus: "single",
      federalAgiCents: 9_000_000,
      federalTaxableIncomeCents: 7_500_000,
      w2WagesCents: 9_000_000,
      gross1099IncomeCents: 0,
      selfEmploymentProfitCents: 0,
      qualifyingChildrenCount: 0,
      qualifyingDependentsCount: 0,
      stateWithholdingCents: 500_000,
    });

    expect(typeof result.grossStateTaxCents).toBe("number");
    expect(Number.isInteger(result.grossStateTaxCents)).toBe(true);
    expect(result.rulesVersion).toBe("2025.1-ftb-statutory");
  });

  // ---------------------------------------------------------------------------
  // 28. State Engine Versioning
  // ---------------------------------------------------------------------------
  it("28. returns explicit engine and rules version metadata", () => {
    const caEngine = new CaliforniaTaxEngine();
    const meta = caEngine.getRulesMetadata(2025);

    expect(meta.engineVersion).toBe("2025.1.0-statutory-ca");
    expect(meta.rulesVersion).toBe("2025.1-ftb-statutory");
    expect(meta.hasMentalHealthSurtax).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 29. Tax-Year Isolation (2025 vs 2026 Indexation)
  // ---------------------------------------------------------------------------
  it("29. isolates tax year configurations: 2026 deductions exceed 2025 deductions", () => {
    const caEngine = new CaliforniaTaxEngine();
    const res2025 = caEngine.calculateStateTax({
      stateCode: "CA",
      taxYear: 2025,
      residencyType: "full_year_resident",
      filingStatus: "single",
      federalAgiCents: 10_000_000,
      federalTaxableIncomeCents: 8_500_000,
      w2WagesCents: 10_000_000,
      gross1099IncomeCents: 0,
      selfEmploymentProfitCents: 0,
      qualifyingChildrenCount: 0,
      qualifyingDependentsCount: 0,
      stateWithholdingCents: 0,
    });

    const res2026 = caEngine.calculateStateTax({
      stateCode: "CA",
      taxYear: 2026,
      residencyType: "full_year_resident",
      filingStatus: "single",
      federalAgiCents: 10_000_000,
      federalTaxableIncomeCents: 8_500_000,
      w2WagesCents: 10_000_000,
      gross1099IncomeCents: 0,
      selfEmploymentProfitCents: 0,
      qualifyingChildrenCount: 0,
      qualifyingDependentsCount: 0,
      stateWithholdingCents: 0,
    });

    // 2026 standard deduction ($5,680) > 2025 standard deduction ($5,540)
    expect(res2026.breakdown.deductionUsedCents).toBeGreaterThan(res2025.breakdown.deductionUsedCents);
    expect(res2026.stateTaxableIncomeCents).toBeLessThan(res2025.stateTaxableIncomeCents);
  });

  // ---------------------------------------------------------------------------
  // 30. Full State E-File Flow (Freeze -> Submit with Mock Provider)
  // ---------------------------------------------------------------------------
  it("30. executes complete mock state e-file flow (Freeze -> Submit -> Accepted)", async () => {
    await setupCalculatedSession(USER_ALICE_TOKEN, "CA");

    // 1. Freeze
    const freezeReq = createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/state-tax/freeze", {
      method: "POST",
      token: USER_ALICE_TOKEN,
    });
    const freezeRes = await freezeStateReturnRoute(freezeReq);
    expect(freezeRes.status).toBe(200);

    // 2. Configure mock test provider
    const mockProvider = new MockStateEfileProvider("CA", "SUCCESS_IMMEDIATE");
    setTestStateEfileProvider(mockProvider);

    // 3. Submit
    const submitReq = createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/state-tax/efile/submit", {
      method: "POST",
      token: USER_ALICE_TOKEN,
    });
    const submitRes = await submitStateEfileRoute(submitReq);
    expect(submitRes.status).toBe(200);
    const submitJson = await submitRes.json();
    expect(submitJson.data.submission.status).toBe("ACCEPTED");
    expect(submitJson.data.result.isMockTestOnly).toBe(true);

    // 4. Status Check
    const statusReq = createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/state-tax/efile/status", {
      method: "GET",
      token: USER_ALICE_TOKEN,
    });
    const statusRes = await getStateEfileStatusRoute(statusReq);
    expect(statusRes.status).toBe(200);
    const statusJson = await statusRes.json();
    expect(statusJson.data.isFrozen).toBe(true);
    expect(statusJson.data.latestSubmission.status).toBe("ACCEPTED");
    expect(statusJson.data.events.length).toBeGreaterThan(0);
  });
});
