import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as startSession } from "../app/api/v1/tax/preparation/session/route";
import { PUT as saveHousehold } from "../app/api/v1/tax/preparation/session/household/route";
import { PUT as saveIncome } from "../app/api/v1/tax/preparation/session/income/route";
import { PUT as saveDeductions } from "../app/api/v1/tax/preparation/session/deductions/route";
import { POST as calculateSession } from "../app/api/v1/tax/preparation/session/calculate/route";
import { PATCH as patchProfile } from "../app/api/v1/auth/profile/route";
import { GET as getEfileReadiness } from "../app/api/v1/tax/preparation/session/federal-return/efile/readiness/route";
import { POST as freezeEfileSnapshot } from "../app/api/v1/tax/preparation/session/federal-return/efile/freeze/route";
import { GET as getEfileStatus } from "../app/api/v1/tax/preparation/session/federal-return/efile/status/route";
import {
  TaxPreparationSessionStore,
  TaxPreparationSession,
} from "../lib/services/tax-preparation-session-store";
import { TaxCalculationStore } from "../lib/services/tax-calculation-store";
import { UserProfileStore } from "../lib/services/user-profile-store";
import {
  evaluateEfileReadiness,
  EFILE_READINESS_DISCLAIMER,
} from "../lib/preparation/efile-readiness";
import { buildFederalReturn } from "../lib/preparation/federal-return";
import {
  createFinalReturnSnapshot,
  getFinalReturnSnapshot,
  clearSnapshotRegistry,
  verifySnapshotIntegrity,
} from "../lib/preparation/final-return-snapshot";
import {
  validateLifecycleTransition,
  LIFECYCLE_STATUS_DESCRIPTORS,
} from "../lib/efile/submission-lifecycle";
import { DisconnectedEfileProvider } from "../lib/efile/provider";

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

const USER_A_TOKEN = "user-phase6-token-1111-2222-3333-444444444444";
const USER_B_TOKEN = "user-phase6-token-5555-6666-7777-888888888888";

describe("Phase 6: IRS E-File Readiness & Final Federal Return Submission Foundation", () => {
  beforeEach(() => {
    TaxPreparationSessionStore.clear();
    TaxCalculationStore.clear();
    UserProfileStore.clear();
    clearSnapshotRegistry();
  });

  async function initTaxpayerSession(
    token: string,
    fullName = "Taylor Morgan",
    stateOfResidence = "NY"
  ): Promise<TaxPreparationSession> {
    await patchProfile(
      createMockRequest("http://localhost:3000/api/v1/auth/profile", {
        method: "PATCH",
        token,
        body: {
          profile: { fullName },
          taxProfile: { stateOfResidence: stateOfResidence || "NY" },
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

  async function setupStandardW2Session(token: string) {
    const session = await initTaxpayerSession(token, "Alex Rivera", "CA");

    await saveHousehold(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
        method: "PUT",
        token,
        body: {
          filingStatus: "single",
          hasDependents: false,
          dependents: [],
        },
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
              id: "w2-1",
              employerName: "TechCorp Inc",
              wagesCents: 85_000_00,
              federalWithholdingCents: 9_500_00,
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
          guidedAnswers: {},
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

    return TaxPreparationSessionStore.getCurrent(session.userId) as Promise<TaxPreparationSession>;
  }

  async function setupMFJWithDependentsAndSelfEmploymentSession(token: string) {
    const session = await initTaxpayerSession(token, "Jordan Smith", "TX");

    await saveHousehold(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
        method: "PUT",
        token,
        body: {
          filingStatus: "married_filing_jointly",
          hasSpouse: true,
          spouse: {
            firstName: "Casey",
            lastName: "Smith",
            dateOfBirth: "1988-04-12",
            hasIncome: true,
            hasW2Income: true,
            w2WagesCents: 45_000_00,
          },
          hasDependents: true,
          dependents: [
            {
              id: "dep-1",
              firstName: "Maya",
              lastName: "Smith",
              dateOfBirth: "2019-06-15",
              relationship: "daughter",
              monthsLivedWithTaxpayer: 12,
              hasTinOrSsn: true,
            },
          ],
        },
      })
    );

    await saveIncome(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/income", {
        method: "PUT",
        token,
        body: {
          situations: ["employer", "freelance"],
          w2s: [
            {
              id: "w2-1",
              employerName: "Enterprise LLC",
              wagesCents: 90_000_00,
              federalWithholdingCents: 11_000_00,
            },
          ],
          form1099s: [
            {
              id: "1099-1",
              payerName: "Client A",
              incomeType: "freelance",
              grossIncomeCents: 30_000_00,
              federalWithholdingCents: 0,
            },
          ],
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
          guidedAnswers: {},
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

    return TaxPreparationSessionStore.getCurrent(session.userId) as Promise<TaxPreparationSession>;
  }

  // ===========================================================================
  // 1. E-FILE READINESS EVALUATOR: HAPPY PATHS
  // ===========================================================================

  describe("1. E-File Readiness Evaluator: Standard Returns", () => {
    it("evaluates a complete W-2 return as READY for e-file", async () => {
      const session = await setupStandardW2Session(USER_A_TOKEN);
      const evalResult = evaluateEfileReadiness(session);

      expect(evalResult.status).toBe("READY");
      expect(evalResult.isReady).toBe(true);
      expect(evalResult.taxYear).toBe(2025);
      expect(evalResult.blockingErrors).toHaveLength(0);
      expect(evalResult.summary.blockingErrorsCount).toBe(0);
      expect(evalResult.summary.passedChecks).toBe(evalResult.summary.totalChecks);
      expect(evalResult.disclaimer).toBe(EFILE_READINESS_DISCLAIMER);
    });

    it("evaluates a complete MFJ return with dependents and self-employment as READY", async () => {
      const session = await setupMFJWithDependentsAndSelfEmploymentSession(USER_A_TOKEN);
      const evalResult = evaluateEfileReadiness(session);

      expect(evalResult.status).toBe("READY");
      expect(evalResult.isReady).toBe(true);
      expect(evalResult.blockingErrors).toHaveLength(0);

      const depCheck = evalResult.checks.find((c) => c.id === "check_dependents_compliance");
      const spouseCheck = evalResult.checks.find((c) => c.id === "check_spouse_identity");
      const mathCheck = evalResult.checks.find((c) => c.id === "check_mathematical_reconciliation");

      expect(depCheck?.passed).toBe(true);
      expect(spouseCheck?.passed).toBe(true);
      expect(mathCheck?.passed).toBe(true);
    });

    it("correctly evaluates Head of Household with qualifying child as READY", async () => {
      const session = await initTaxpayerSession(USER_A_TOKEN, "Morgan HOH", "IL");

      await saveHousehold(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/household", {
          method: "PUT",
          token: USER_A_TOKEN,
          body: {
            filingStatus: "head_of_household",
            hasDependents: true,
            dependents: [
              {
                id: "dep-child",
                firstName: "Sam",
                lastName: "HOH",
                dateOfBirth: "2018-09-01",
                relationship: "daughter",
                monthsLivedWithTaxpayer: 12,
                hasTinOrSsn: true,
              },
            ],
          },
        })
      );

      await saveIncome(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/income", {
          method: "PUT",
          token: USER_A_TOKEN,
          body: {
            situations: ["employer"],
            w2s: [{ id: "w2-1", employerName: "Corp", wagesCents: 60_000_00, federalWithholdingCents: 5_000_00 }],
            form1099s: [],
            activities: [],
          },
        })
      );

      await saveDeductions(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/deductions", {
          method: "PUT",
          token: USER_A_TOKEN,
          body: { hasBusinessExpenses: false, standardDeductionAcknowledged: true, entries: [] },
        })
      );

      await calculateSession(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/calculate", {
          method: "POST",
          token: USER_A_TOKEN,
        })
      );

      const updated = (await TaxPreparationSessionStore.getCurrent(session.userId))!;
      const evalResult = evaluateEfileReadiness(updated);

      expect(evalResult.status).toBe("READY");
      expect(evalResult.isReady).toBe(true);
    });
  });

  // ===========================================================================
  // 2. E-FILE READINESS EVALUATOR: BLOCKING CONDITIONS & ERRORS
  // ===========================================================================

  describe("2. E-File Readiness Evaluator: Blocking Validations", () => {
    it("returns BLOCKED with MISSING_TAXPAYER_DATA when legal name is single word or empty", async () => {
      const session = await setupStandardW2Session(USER_A_TOKEN);
      const tamperedSession = {
        ...session,
        profileSnapshot: { ...session.profileSnapshot, fullName: "Cher" },
      };

      const evalResult = evaluateEfileReadiness(tamperedSession);
      expect(evalResult.status).toBe("BLOCKED");
      expect(evalResult.isReady).toBe(false);

      const err = evalResult.blockingErrors.find((e) => e.code === "MISSING_TAXPAYER_DATA");
      expect(err).toBeDefined();
      expect(err?.category).toBe("TAXPAYER_IDENTITY");
      expect(err?.action).toContain("Step 1");
    });

    it("returns BLOCKED with MISSING_TAXPAYER_DATA when state of residence is invalid", async () => {
      const session = await setupStandardW2Session(USER_A_TOKEN);
      const tamperedSession = {
        ...session,
        profileSnapshot: { ...session.profileSnapshot, stateOfResidence: "XX" },
      };

      const evalResult = evaluateEfileReadiness(tamperedSession);
      expect(evalResult.status).toBe("BLOCKED");

      const err = evalResult.blockingErrors.find((e) => e.code === "MISSING_TAXPAYER_DATA");
      expect(err).toBeDefined();
      expect(err?.message).toContain("valid 2-letter US state");
    });

    it("returns BLOCKED with MISSING_SPOUSE_DATA for MFJ when spouse name is missing", async () => {
      const session = await setupMFJWithDependentsAndSelfEmploymentSession(USER_A_TOKEN);
      const tamperedSession = {
        ...session,
        householdSnapshot: {
          ...session.householdSnapshot!,
          spouse: { ...session.householdSnapshot!.spouse!, firstName: "", lastName: "" },
        },
      };

      const evalResult = evaluateEfileReadiness(tamperedSession);
      expect(evalResult.status).toBe("BLOCKED");

      const err = evalResult.blockingErrors.find((e) => e.code === "MISSING_SPOUSE_DATA");
      expect(err).toBeDefined();
      expect(err?.category).toBe("SPOUSE_IDENTITY");
    });

    it("returns BLOCKED with INCOMPLETE_DEPENDENT when dependent lacks birth date", async () => {
      const session = await setupMFJWithDependentsAndSelfEmploymentSession(USER_A_TOKEN);
      const tamperedSession = {
        ...session,
        householdSnapshot: {
          ...session.householdSnapshot!,
          dependents: [
            {
              ...session.householdSnapshot!.dependents[0],
              dateOfBirth: "",
            },
          ],
        },
      };

      const evalResult = evaluateEfileReadiness(tamperedSession);
      expect(evalResult.status).toBe("BLOCKED");

      const err = evalResult.blockingErrors.find((e) => e.code === "INCOMPLETE_DEPENDENT");
      expect(err).toBeDefined();
      expect(err?.category).toBe("DEPENDENTS");
    });

    it("returns BLOCKED with INVALID_WITHHOLDING when withholding exceeds gross income", async () => {
      const session = await setupStandardW2Session(USER_A_TOKEN);
      // Gross: 85,000, set withholding to 95,000
      const tamperedSession = {
        ...session,
        incomeSnapshot: {
          ...session.incomeSnapshot,
          w2s: [{ ...session.incomeSnapshot.w2s[0], federalWithholdingCents: 95_000_00 }],
        },
      };

      const evalResult = evaluateEfileReadiness(tamperedSession);
      expect(evalResult.status).toBe("BLOCKED");

      const err = evalResult.blockingErrors.find((e) => e.code === "INVALID_WITHHOLDING");
      expect(err).toBeDefined();
      expect(err?.category).toBe("WITHHOLDING_PAYMENTS");
    });

    it("returns BLOCKED with UNRECONCILED_RETURN when calculation has an arithmetic discrepancy", async () => {
      const session = await setupStandardW2Session(USER_A_TOKEN);
      const tamperedSession = {
        ...session,
        calculationSnapshot: {
          ...session.calculationSnapshot!,
          taxableIncomeCents: 123_456_00, // Arithmetic mismatch
        },
      };

      const evalResult = evaluateEfileReadiness(tamperedSession);
      expect(evalResult.status).toBe("BLOCKED");

      const err = evalResult.blockingErrors.find((e) => e.code === "UNRECONCILED_RETURN");
      expect(err).toBeDefined();
      expect(err?.category).toBe("MATHEMATICAL_RECONCILIATION");
    });

    it("returns BLOCKED with UNSUPPORTED_TAX_YEAR when tax year is not supported", async () => {
      const session = await setupStandardW2Session(USER_A_TOKEN);
      const tamperedSession = {
        ...session,
        taxYear: 2023 as any,
      };

      const evalResult = evaluateEfileReadiness(tamperedSession);
      expect(evalResult.status).toBe("BLOCKED");

      const err = evalResult.blockingErrors.find((e) => e.code === "UNSUPPORTED_TAX_YEAR");
      expect(err).toBeDefined();
      expect(err?.category).toBe("TAX_YEAR_SUPPORT");
    });

    it("returns NOT_SUPPORTED when return requires unsupported schedules (e.g. Schedule D other income)", async () => {
      const session = await setupStandardW2Session(USER_A_TOKEN);
      const baseReturn = buildFederalReturn(session);
      const fedReturn = {
        ...baseReturn,
        income: {
          ...baseReturn.income,
          otherIncomeCents: 5_000_00,
        },
      };

      const evalResult = evaluateEfileReadiness(session, fedReturn);
      expect(evalResult.status).toBe("NOT_SUPPORTED");
      expect(evalResult.isReady).toBe(false);

      const err = evalResult.blockingErrors.find((e) => e.code === "UNSUPPORTED_SCHEDULE");
      expect(err).toBeDefined();
      expect(err?.category).toBe("SCHEDULE_SUPPORT");
    });
  });

  // ===========================================================================
  // 3. FINAL RETURN SNAPSHOT & FREEZE ENGINE
  // ===========================================================================

  describe("3. Final Return Freeze Engine & Snapshot Integrity", () => {
    it("creates an immutable final return snapshot with valid SHA-256 checksum", async () => {
      const session = await setupStandardW2Session(USER_A_TOKEN);
      const snapshot = createFinalReturnSnapshot(session);

      expect(snapshot.snapshotId).toBeDefined();
      expect(snapshot.sessionId).toBe(session.id);
      expect(snapshot.userId).toBe(session.userId);
      expect(snapshot.taxYear).toBe(2025);
      expect(snapshot.schemaVersion).toBe("2026.1");
      expect(snapshot.isFrozen).toBe(true);
      expect(snapshot.checksum).toHaveLength(64); // SHA-256 hex string

      // Verify integrity check passes
      expect(verifySnapshotIntegrity(snapshot)).toBe(true);

      // Verify retrieval from registry
      const retrieved = getFinalReturnSnapshot(session.id);
      expect(retrieved?.snapshotId).toBe(snapshot.snapshotId);
      expect(retrieved?.checksum).toBe(snapshot.checksum);
    });

    it("detects tampered snapshot data and fails verification", async () => {
      const session = await setupStandardW2Session(USER_A_TOKEN);
      const snapshot = createFinalReturnSnapshot(session);

      // Tamper with payload total gross income
      const tampered = {
        ...snapshot,
        payload: {
          ...snapshot.payload,
          income: {
            ...snapshot.payload.income,
            totalGrossIncomeCents: 999_999_00,
          },
        },
      };

      expect(verifySnapshotIntegrity(tampered)).toBe(false);
    });

    it("throws AppError if attempting to freeze an unready return", async () => {
      // Incomplete session without income or calculation
      const session = await initTaxpayerSession(USER_A_TOKEN, "");

      expect(() => createFinalReturnSnapshot(session)).toThrowError(
        /Cannot freeze final return snapshot: Return is not ready/
      );
    });
  });

  // ===========================================================================
  // 4. SUBMISSION LIFECYCLE & PROVIDER ABSTRACTION
  // ===========================================================================

  describe("4. Submission Lifecycle State Machine & Provider Abstraction", () => {
    it("allows valid forward and backward transitions in draft/review phases", () => {
      expect(validateLifecycleTransition("DRAFT", "READY_FOR_REVIEW").allowed).toBe(true);
      expect(validateLifecycleTransition("READY_FOR_REVIEW", "READY_TO_SUBMIT").allowed).toBe(true);
      expect(validateLifecycleTransition("READY_TO_SUBMIT", "READY_FOR_REVIEW").allowed).toBe(true);
      expect(validateLifecycleTransition("READY_FOR_REVIEW", "DRAFT").allowed).toBe(true);
      expect(validateLifecycleTransition("DRAFT", "CANCELLED").allowed).toBe(true);
    });

    it("strictly prohibits direct transition from DRAFT to SUBMITTED", () => {
      const result = validateLifecycleTransition("DRAFT", "SUBMITTED");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Illegal lifecycle transition");
    });

    it("prohibits external states (SUBMITTED, ACCEPTED, REJECTED) when provider is disconnected", () => {
      const result = validateLifecycleTransition("SUBMISSION_PENDING", "SUBMITTED", false);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("IRS-authorized e-file transmission provider is not connected");
    });

    it("DisconnectedEfileProvider explicitly reports offline status and rejects transmission", async () => {
      const provider = new DisconnectedEfileProvider();
      expect(provider.isConnected).toBe(false);

      const session = await setupStandardW2Session(USER_A_TOKEN);
      const snapshot = createFinalReturnSnapshot(session);

      const subResult = await provider.createSubmission(snapshot);
      expect(subResult.success).toBe(false);
      expect(subResult.status).toBe("READY_TO_SUBMIT");
      expect(subResult.message).toContain("direct transmission to the IRS requires an authorized IRS MeF integration");

      const valResult = await provider.validateReturn(snapshot);
      expect(valResult.isValid).toBe(false);
      expect(valResult.errors[0].ruleNumber).toBe("EFILE-PROVIDER-DISCONNECTED");
    });

    it("verifies lifecycle status descriptors provide user-facing labels", () => {
      for (const [key, desc] of Object.entries(LIFECYCLE_STATUS_DESCRIPTORS)) {
        expect(desc.status).toBe(key);
        expect(desc.label).toBeDefined();
        expect(desc.description).toBeDefined();
      }
    });
  });

  // ===========================================================================
  // 5. HTTP API ENDPOINTS
  // ===========================================================================

  describe("5. HTTP API Endpoints for E-File Readiness, Freeze & Status", () => {
    it("GET /efile/readiness requires authentication (401)", async () => {
      const req = createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/federal-return/efile/readiness");
      const res = await getEfileReadiness(req);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error.code).toBe("UNAUTHORIZED");
    });

    it("GET /efile/readiness returns 404 if no session exists", async () => {
      const req = createMockRequest(
        "http://localhost:3000/api/v1/tax/preparation/session/federal-return/efile/readiness",
        { token: USER_B_TOKEN }
      );
      const res = await getEfileReadiness(req);

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error.code).toBe("NOT_FOUND");
    });

    it("GET /efile/readiness returns evaluation for authenticated user's session", async () => {
      await setupStandardW2Session(USER_A_TOKEN);

      const req = createMockRequest(
        "http://localhost:3000/api/v1/tax/preparation/session/federal-return/efile/readiness",
        { token: USER_A_TOKEN }
      );
      const res = await getEfileReadiness(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("READY");
      expect(json.data.isReady).toBe(true);
    });

    it("POST /efile/freeze creates and returns frozen snapshot without client numbers", async () => {
      await setupStandardW2Session(USER_A_TOKEN);

      // Even if client tries to send modified totals, server rebuilds from session
      const req = createMockRequest(
        "http://localhost:3000/api/v1/tax/preparation/session/federal-return/efile/freeze",
        {
          method: "POST",
          token: USER_A_TOKEN,
          body: {
            tamperedTotalIncome: 999_999_99, // Injected client total
          },
        }
      );
      const res = await freezeEfileSnapshot(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.isFrozen).toBe(true);
      expect(json.data.checksum).toBeDefined();
      expect(json.data.payload.income.totalGrossIncomeCents).toBe(85_000_00); // Server-derived value preserved!
    });

    it("GET /efile/status reports lifecycle status, snapshot, and offline provider notice", async () => {
      await setupStandardW2Session(USER_A_TOKEN);

      // Freeze snapshot
      const freezeReq = createMockRequest(
        "http://localhost:3000/api/v1/tax/preparation/session/federal-return/efile/freeze",
        { method: "POST", token: USER_A_TOKEN }
      );
      await freezeEfileSnapshot(freezeReq);

      // Check status
      const statusReq = createMockRequest(
        "http://localhost:3000/api/v1/tax/preparation/session/federal-return/efile/status",
        { token: USER_A_TOKEN }
      );
      const res = await getEfileStatus(statusReq);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.isFrozen).toBe(true);
      expect(json.data.lifecycleStatus).toBe("READY_TO_SUBMIT");
      expect(json.data.provider.isConnected).toBe(false);
      expect(json.data.provider.transmissionNotice).toContain("Electronic transmission to the IRS is offline");
    });

    it("GET /efile/status isolates sessions and rejects cross-user access (404)", async () => {
      await setupStandardW2Session(USER_A_TOKEN);

      const statusReq = createMockRequest(
        "http://localhost:3000/api/v1/tax/preparation/session/federal-return/efile/status",
        { token: USER_B_TOKEN }
      );
      const res = await getEfileStatus(statusReq);

      expect(res.status).toBe(404);
    });
  });
});
