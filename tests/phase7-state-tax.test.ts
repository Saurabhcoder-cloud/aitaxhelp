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
import {
  TaxPreparationSessionStore,
  TaxPreparationSession,
} from "../lib/services/tax-preparation-session-store";
import { TaxCalculationStore } from "../lib/services/tax-calculation-store";
import { UserProfileStore } from "../lib/services/user-profile-store";
import { buildFederalReturn } from "../lib/preparation/federal-return";
import {
  getStateSupportInfo,
  isStateSupported,
  stateHasIndividualIncomeTax,
  isStateReturnRequired,
  getStateEngine,
  getAllStates,
  registerStateEngine,
} from "../lib/state-tax/registry";
import {
  mapFederalReturnToStateInput,
  buildStateBridgeData,
} from "../lib/state-tax/federal-bridge";
import { analyzeMultiStateScenario } from "../lib/state-tax/multi-state";
import { evaluateStateReadiness } from "../lib/state-tax/readiness";
import { buildStateTaxSummary } from "../lib/state-tax/summary";
import { DefaultStateDocumentProvider } from "../lib/state-tax/documents";
import { DisconnectedStateEfileProvider } from "../lib/state-tax/efile";
import { IStateTaxEngine, NoIncomeTaxStateEngine } from "../lib/state-tax/engine";
import { TaxYear } from "../types/tax";
import { StateCalculationInput, StateCalculationResult, StateReadiness, StateValidationError } from "../lib/state-tax/types";

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

const USER_A_TOKEN = "user-p7-token-1111-2222-3333-444444444444";
const USER_B_TOKEN = "user-p7-token-5555-6666-7777-888888888888";

describe("Phase 7: State Tax Architecture & Federal/State Separation", () => {
  beforeEach(() => {
    TaxPreparationSessionStore.clear();
    TaxCalculationStore.clear();
    UserProfileStore.clear();
  });

  async function initTaxpayerSession(
    token: string,
    fullName = "Taylor StateUser",
    stateOfResidence = "TX"
  ): Promise<TaxPreparationSession> {
    await patchProfile(
      createMockRequest("http://localhost:3000/api/v1/auth/profile", {
        method: "PATCH",
        token,
        body: {
          profile: { fullName },
          taxProfile: { stateOfResidence: stateOfResidence || "TX" },
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

  async function setupStandardCalculatedSession(token: string, state = "TX") {
    const session = await initTaxpayerSession(token, "Jordan Taxpayer", state);

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
              id: "w2-p7",
              employerName: "Apex Dynamics",
              wagesCents: 95_000_00,
              federalWithholdingCents: 12_500_00,
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
            stateLocal: { paidStateLocalTaxes: false, stateLocalTaxCents: 0 },
          },
        },
      })
    );

    const calcRes = await calculateSession(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/calculate", {
        method: "POST",
        token,
      })
    );
    expect(calcRes.status).toBe(200);

    return (await TaxPreparationSessionStore.getCurrent(session.userId))!;
  }

  // ===========================================================================
  // 1. STATE SUPPORT REGISTRY
  // ===========================================================================

  describe("1. State Support Registry & Classification", () => {
    it("catalogs all 50 states plus District of Columbia (51 jurisdictions)", () => {
      const allStates = getAllStates();
      expect(allStates).toHaveLength(51);
      const codes = allStates.map((s) => s.stateCode);
      expect(codes).toContain("TX");
      expect(codes).toContain("FL");
      expect(codes).toContain("CA");
      expect(codes).toContain("NY");
      expect(codes).toContain("DC");
    });

    it("identifies all 9 states with no personal wage income tax", () => {
      const noTaxStates = ["AK", "FL", "NV", "NH", "SD", "TN", "TX", "WA", "WY"];
      for (const code of noTaxStates) {
        const info = getStateSupportInfo(code);
        expect(info?.hasIndividualIncomeTax).toBe(false);
        expect(info?.supportStatus).toBe("NO_STATE_INCOME_TAX");
        expect(stateHasIndividualIncomeTax(code)).toBe(false);
        expect(isStateSupported(code, 2025)).toBe(true);
      }
    });

    it("marks income-tax states lacking certified engines as NOT_SUPPORTED without guessing", () => {
      const unsupportedStates = ["NY", "IL", "OH", "MA"];
      for (const code of unsupportedStates) {
        const info = getStateSupportInfo(code);
        expect(info?.hasIndividualIncomeTax).toBe(true);
        expect(info?.supportStatus).toBe("NOT_SUPPORTED");
        expect(stateHasIndividualIncomeTax(code)).toBe(true);
        expect(isStateSupported(code, 2025)).toBe(false);
      }
    });

    it("determines state return requirements accurately based on state rules and income data", () => {
      const txReq = isStateReturnRequired("TX", { grossIncomeCents: 100_000_00 });
      expect(txReq.required).toBe(false);
      expect(txReq.reason).toContain("does not levy individual income tax");

      const caReq = isStateReturnRequired("CA", { grossIncomeCents: 100_000_00 });
      expect(caReq.required).toBe(true);
      expect(caReq.reason).toContain("imposes personal income taxes");

      const unknownReq = isStateReturnRequired("ZZ");
      expect(unknownReq.required).toBe(false);
      expect(unknownReq.reason).toContain("Unknown state code");
    });

    it("allows dynamic registration of future certified state engines", () => {
      class MockCertifiedEngine implements IStateTaxEngine {
        public readonly engineVersion = "2.0.0-mock";
        public readonly rulesVersion = "2025.1";
        public readonly hasIndividualIncomeTax = true;
        public readonly stateCode = "XX";
        public readonly stateName = "MockState";

        public getSupportedStateCode(): string {
          return "XX";
        }
        public getSupportedTaxYears(): TaxYear[] {
          return [2025];
        }
        public calculateStateTax(input: StateCalculationInput): StateCalculationResult {
          return {
            stateCode: "XX",
            taxYear: input.taxYear,
            engineVersion: this.engineVersion,
            rulesVersion: this.rulesVersion,
            stateAgiCents: input.federalAgiCents,
            stateTaxableIncomeCents: input.federalTaxableIncomeCents,
            grossStateTaxCents: 1_000_00,
            nonRefundableCreditsCents: 0,
            netStateTaxCents: 1_000_00,
            refundableCreditsCents: 0,
            totalWithholdingCents: input.stateWithholdingCents,
            refundOrBalanceCents: 1_000_00,
            refundOrBalanceType: "balance_due",
            effectiveTaxRate: 0.05,
            marginalTaxBracket: 0.05,
            breakdown: { additionsCents: 0, subtractionsCents: 0, deductionUsedCents: 0, exemptionsCents: 0 },
          };
        }
        public validateStateReturn(): StateValidationError[] {
          return [];
        }
        public getStateReadiness(input: StateCalculationInput): StateReadiness {
          return {
            status: "READY",
            isReady: true,
            stateCode: "XX",
            taxYear: input.taxYear,
            evaluatedAt: new Date().toISOString(),
            checks: [],
            blockingErrors: [],
            warnings: [],
            summary: { totalChecks: 0, passedChecks: 0, blockingErrorsCount: 0, warningsCount: 0 },
            notice: "Ready",
          };
        }
      }

      registerStateEngine(new MockCertifiedEngine());
      expect(isStateSupported("XX", 2025)).toBe(true);
      expect(isStateSupported("XX", 2026)).toBe(false); // only 2025 supported
      const engine = getStateEngine("XX");
      expect(engine.engineVersion).toBe("2.0.0-mock");
    });
  });

  // ===========================================================================
  // 2. FEDERAL -> STATE DATA BRIDGE
  // ===========================================================================

  describe("2. Federal -> State Data Bridge (Mapping Layer)", () => {
    it("maps verified FederalReturn data to StateCalculationInput without calculating state tax", async () => {
      const session = await setupStandardCalculatedSession(USER_A_TOKEN, "TX");
      const fedReturn = buildFederalReturn(session);

      const stateInput = mapFederalReturnToStateInput(session, fedReturn, {
        stateWithholdingCents: 4_500_00,
      });

      expect(stateInput.stateCode).toBe("TX");
      expect(stateInput.taxYear).toBe(2025);
      expect(stateInput.residencyType).toBe("full_year_resident");
      expect(stateInput.filingStatus).toBe("single");
      expect(stateInput.federalAgiCents).toBe(fedReturn.adjustments.adjustedGrossIncomeCents);
      expect(stateInput.federalTaxableIncomeCents).toBe(fedReturn.taxes.taxableIncomeCents);
      expect(stateInput.w2WagesCents).toBe(95_000_00);
      expect(stateInput.stateWithholdingCents).toBe(4_500_00);
    });

    it("builds comprehensive StateBridgeData preserving federal return lineage", async () => {
      const session = await setupStandardCalculatedSession(USER_A_TOKEN, "WA");
      const fedReturn = buildFederalReturn(session);

      const bridge = buildStateBridgeData(session, fedReturn);

      expect(bridge.stateCode).toBe("WA");
      expect(bridge.taxYear).toBe(2025);
      expect(bridge.federalReturnId).toBe(fedReturn.metadata.returnId);
      expect(bridge.federalEngineVersion).toBe(fedReturn.metadata.engineVersion);
      expect(bridge.taxpayer.fullName).toBe("Jordan Taxpayer");
      expect(bridge.financials.federalAgiCents).toBe(fedReturn.adjustments.adjustedGrossIncomeCents);
      expect(bridge.calculationInput.stateCode).toBe("WA");
    });
  });

  // ===========================================================================
  // 3. MULTI-STATE SCENARIO FOUNDATION
  // ===========================================================================

  describe("3. Multi-State Scenario Foundation & Border Cases", () => {
    it("correctly identifies single-state residence as not requiring allocation", () => {
      const result = analyzeMultiStateScenario({
        residentStateCode: "TX",
        w2Entries: [{ id: "1", employerName: "Corp", stateCode: "TX", stateWagesCents: 50_000_00, stateWithholdingCents: 0 }],
      });

      expect(result.status).toBe("SINGLE_STATE");
      expect(result.isMultiState).toBe(false);
      expect(result.requiresAllocation).toBe(false);
      expect(result.involvedStates).toEqual(["TX"]);
    });

    it("marks multi-state remote work across unsupported states as NOT_SUPPORTED", () => {
      const result = analyzeMultiStateScenario({
        residentStateCode: "TX",
        remoteWorkStates: ["CA", "NY"],
      });

      expect(result.status).toBe("NOT_SUPPORTED");
      expect(result.isMultiState).toBe(true);
      expect(result.requiresAllocation).toBe(true);
      expect(result.involvedStates).toContain("CA");
      expect(result.involvedStates).toContain("NY");
      expect(result.message).toContain("cannot be completed automatically");
    });

    it("strictly prevents guessing state apportionment percentages", () => {
      const result = analyzeMultiStateScenario({
        residentStateCode: "FL",
        w2Entries: [
          { id: "1", employerName: "FL Tech", stateCode: "FL", stateWagesCents: 40_000_00, stateWithholdingCents: 0 },
          { id: "2", employerName: "GA Client", stateCode: "GA", stateWagesCents: 30_000_00, stateWithholdingCents: 1_500_00 },
        ],
      });

      expect(result.isMultiState).toBe(true);
      expect(result.allocationRecords).toHaveLength(0); // Never guess allocations
      expect(result.status).toBe("NOT_SUPPORTED"); // GA is unsupported
    });
  });

  // ===========================================================================
  // 4. STATE READINESS EVALUATOR
  // ===========================================================================

  describe("4. State Tax Readiness Evaluator", () => {
    it("returns READY for no-income-tax state returns (e.g. Texas)", async () => {
      const session = await setupStandardCalculatedSession(USER_A_TOKEN, "TX");
      const readiness = evaluateStateReadiness(session);

      expect(readiness.status).toBe("READY");
      expect(readiness.isReady).toBe(true);
      expect(readiness.stateCode).toBe("TX");
      expect(readiness.blockingErrors).toHaveLength(0);
      expect(readiness.notice).toContain("has no state individual income tax");
    });

    it("returns REQUIRES_REVIEW when state tax withholding is reported for a no-income-tax state", async () => {
      const session = await setupStandardCalculatedSession(USER_A_TOKEN, "TX");
      const sessionWithWithholding = {
        ...session,
        deductionsSnapshot: {
          ...session.deductionsSnapshot,
          guidedAnswers: {
            stateLocal: { paidStateLocalTaxes: true, stateLocalTaxCents: 4_500_00 },
          },
        },
      };

      const readiness = evaluateStateReadiness(sessionWithWithholding);
      expect(readiness.status).toBe("REQUIRES_REVIEW");
      expect(readiness.isReady).toBe(true);
      const warn = readiness.warnings.find((w) => w.code === "STATE_WITHHOLDING_REVIEW");
      expect(warn).toBeDefined();
    });

    it("returns NOT_SUPPORTED for states without certified statutory engines (e.g. New York)", async () => {
      const session = await setupStandardCalculatedSession(USER_A_TOKEN, "NY");
      const readiness = evaluateStateReadiness(session);

      expect(readiness.status).toBe("NOT_SUPPORTED");
      expect(readiness.isReady).toBe(false);
      expect(readiness.stateCode).toBe("NY");

      const err = readiness.blockingErrors.find((e) => e.code === "STATE_NOT_SUPPORTED");
      expect(err).toBeDefined();
      expect(err?.action).toContain("Department of Revenue");
    });

    it("returns BLOCKED with MISSING_STATE when taxpayer state is blank or invalid", async () => {
      const session = await setupStandardCalculatedSession(USER_A_TOKEN, "TX");
      const tamperedSession = {
        ...session,
        profileSnapshot: { ...session.profileSnapshot, stateOfResidence: "ZZ" },
      };

      const readiness = evaluateStateReadiness(tamperedSession, undefined, { stateCodeOverride: "ZZ" });
      expect(readiness.status).toBe("BLOCKED");
      expect(readiness.isReady).toBe(false);

      const err = readiness.blockingErrors.find((e) => e.code === "MISSING_STATE");
      expect(err).toBeDefined();
    });

    it("returns BLOCKED with FEDERAL_RETURN_REQUIRED when federal calculation snapshot is missing", async () => {
      const session = await initTaxpayerSession(USER_A_TOKEN, "Uncalculated User", "TX");
      const readiness = evaluateStateReadiness(session);

      expect(readiness.status).toBe("BLOCKED");
      expect(readiness.isReady).toBe(false);

      const err = readiness.blockingErrors.find((e) => e.code === "FEDERAL_RETURN_REQUIRED");
      expect(err).toBeDefined();
      expect(err?.action).toContain("Step 5");
    });

    it("returns BLOCKED with MISSING_TAX_YEAR when tax year is outside supported range", async () => {
      const session = await setupStandardCalculatedSession(USER_A_TOKEN, "TX");
      const tamperedSession = { ...session, taxYear: 2022 as any };

      const readiness = evaluateStateReadiness(tamperedSession);
      expect(readiness.status).toBe("BLOCKED");

      const err = readiness.blockingErrors.find((e) => e.code === "MISSING_TAX_YEAR");
      expect(err).toBeDefined();
    });
  });

  // ===========================================================================
  // 5. STATE TAX SUMMARY & DOCUMENTS
  // ===========================================================================

  describe("5. State Return Summary & Document Architecture", () => {
    it("builds a clean StateTaxSummary for no-tax states with $0 liability and clear disclosure", async () => {
      const session = await setupStandardCalculatedSession(USER_A_TOKEN, "FL");
      const summary = buildStateTaxSummary(session);

      expect(summary.stateCode).toBe("FL");
      expect(summary.hasIndividualIncomeTax).toBe(false);
      expect(summary.supportStatus).toBe("NO_STATE_INCOME_TAX");
      expect(summary.financials.netTaxLiabilityCents).toBe(0);
      expect(summary.isReturnRequired).toBe(false);
      expect(summary.readiness.isReady).toBe(true);
    });

    it("builds StateTaxSummary for unsupported states with 0 fake numbers and NOT_SUPPORTED status", async () => {
      const session = await setupStandardCalculatedSession(USER_A_TOKEN, "NY");
      const summary = buildStateTaxSummary(session);

      expect(summary.stateCode).toBe("NY");
      expect(summary.hasIndividualIncomeTax).toBe(true);
      expect(summary.supportStatus).toBe("NOT_SUPPORTED");
      expect(summary.financials.refundOrBalanceType).toBe("not_calculated");
      expect(summary.financials.netTaxLiabilityCents).toBe(0);
      expect(summary.readiness.isReady).toBe(false);
      expect(summary.readiness.status).toBe("NOT_SUPPORTED");
    });

    it("DefaultStateDocumentProvider discloses honest document status without fake official forms", async () => {
      const session = await setupStandardCalculatedSession(USER_A_TOKEN, "NY");
      const summary = buildStateTaxSummary(session);
      const provider = new DefaultStateDocumentProvider("NY");

      const pkg = provider.generateDocumentPackage(summary);
      expect(pkg.isSupported).toBe(false);
      expect(pkg.documents[0].isOfficialForm).toBe(false);
      expect(pkg.documents[0].status).toBe("not_supported");
      expect(pkg.notice).toContain("Department of Revenue");
    });

    it("DisconnectedStateEfileProvider explicitly rejects electronic filing attempts", async () => {
      const session = await setupStandardCalculatedSession(USER_A_TOKEN, "TX");
      const summary = buildStateTaxSummary(session);
      const efile = new DisconnectedStateEfileProvider("TX");

      expect(efile.isTransmissionConnected).toBe(false);
      const val = await efile.validateStateReturn(summary);
      expect(val.isValid).toBe(false);
      expect(val.errors[0].code).toBe("STATE_EFILE_OFFLINE");

      const sub = await efile.submitStateReturn(summary);
      expect(sub.success).toBe(false);
      expect(sub.status).toBe("DISCONNECTED");
      expect(sub.message).toContain("TaxAIHelp does not transmit state tax returns");
    });
  });

  // ===========================================================================
  // 6. HTTP API ENDPOINTS & OWNERSHIP PROTECTION
  // ===========================================================================

  describe("6. State Tax HTTP API Endpoints", () => {
    it("GET /state-tax enforces authentication (401)", async () => {
      const req = createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/state-tax");
      const res = await getStateTaxOverview(req);
      expect(res.status).toBe(401);
    });

    it("GET /state-tax enforces user session ownership (404 for unowned session)", async () => {
      const req = createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/state-tax", {
        token: USER_B_TOKEN,
      });
      const res = await getStateTaxOverview(req);
      expect(res.status).toBe(404);
    });

    it("GET /state-tax returns summary and bridge data for authenticated user", async () => {
      await setupStandardCalculatedSession(USER_A_TOKEN, "TX");

      const req = createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/state-tax", {
        token: USER_A_TOKEN,
      });
      const res = await getStateTaxOverview(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.summary.stateCode).toBe("TX");
      expect(json.data.bridge.financials.w2WagesCents).toBe(95_000_00);
    });

    it("GET /state-tax/readiness returns structured evaluation", async () => {
      await setupStandardCalculatedSession(USER_A_TOKEN, "TX");

      const req = createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/state-tax/readiness", {
        token: USER_A_TOKEN,
      });
      const res = await getStateTaxReadiness(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("READY");
    });

    it("POST /state-tax/calculate rejects unsupported states with 422 STATE_NOT_SUPPORTED", async () => {
      await setupStandardCalculatedSession(USER_A_TOKEN, "NY");

      const req = createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/state-tax/calculate", {
        method: "POST",
        token: USER_A_TOKEN,
      });
      const res = await calculateStateTaxRoute(req);

      expect(res.status).toBe(422);
      const json = await res.json();
      expect(json.error.code).toBe("STATE_NOT_SUPPORTED");
    });

    it("POST /state-tax/calculate executes for no-income-tax states without client-controlled numbers", async () => {
      await setupStandardCalculatedSession(USER_A_TOKEN, "TX");

      const req = createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/state-tax/calculate", {
        method: "POST",
        token: USER_A_TOKEN,
        body: { clientFakeTotal: 999_999 }, // Injected client total must be ignored
      });
      const res = await calculateStateTaxRoute(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.netStateTaxCents).toBe(0);
      expect(json.data.stateCode).toBe("TX");
    });
  });

  // ===========================================================================
  // 7. FEDERAL/STATE SEPARATION & INVARIANT VERIFICATION
  // ===========================================================================

  describe("7. Federal / State Tax Separation Invariant", () => {
    it("CRITICAL: Federal tax liability and calculations remain 100% unchanged after state operations", async () => {
      const session = await setupStandardCalculatedSession(USER_A_TOKEN, "TX");
      const baseFedReturn = buildFederalReturn(session);

      const originalAgi = baseFedReturn.adjustments.adjustedGrossIncomeCents;
      const originalTaxable = baseFedReturn.taxes.taxableIncomeCents;
      const originalLiability = baseFedReturn.taxes.totalTaxLiabilityCents;
      const originalPayments = baseFedReturn.payments.totalPaymentsAndCreditsCents;
      const originalRefund = baseFedReturn.refundOrBalanceDue.amountCents;

      // Perform state bridge mapping
      const bridge = buildStateBridgeData(session, baseFedReturn);
      // Perform state readiness evaluation
      const readiness = evaluateStateReadiness(session, baseFedReturn);
      // Perform state summary generation
      const summary = buildStateTaxSummary(session, baseFedReturn);

      expect(bridge).toBeDefined();
      expect(readiness).toBeDefined();
      expect(summary).toBeDefined();

      // Re-read federal return to verify zero mutations
      const recheckedFedReturn = buildFederalReturn(session);
      expect(recheckedFedReturn.adjustments.adjustedGrossIncomeCents).toBe(originalAgi);
      expect(recheckedFedReturn.taxes.taxableIncomeCents).toBe(originalTaxable);
      expect(recheckedFedReturn.taxes.totalTaxLiabilityCents).toBe(originalLiability);
      expect(recheckedFedReturn.payments.totalPaymentsAndCreditsCents).toBe(originalPayments);
      expect(recheckedFedReturn.refundOrBalanceDue.amountCents).toBe(originalRefund);
    });
  });
});
