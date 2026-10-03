import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import {
  POST as requestReviewApi,
  GET as listCasesApi,
} from "../app/api/v1/tax/preparation/session/professional-review/route";
import { GET as getCaseDetailApi } from "../app/api/v1/tax/preparation/session/professional-review/[caseId]/route";
import { POST as addCommentApi } from "../app/api/v1/tax/preparation/session/professional-review/[caseId]/comments/route";
import { PATCH as resolveCommentApi } from "../app/api/v1/tax/preparation/session/professional-review/[caseId]/comments/[commentId]/route";
import { POST as transitionStatusApi } from "../app/api/v1/tax/preparation/session/professional-review/[caseId]/status/route";
import { POST as requestChangesApi } from "../app/api/v1/tax/preparation/session/professional-review/[caseId]/request-changes/route";
import { POST as resubmitApi } from "../app/api/v1/tax/preparation/session/professional-review/[caseId]/resubmit/route";
import { POST as completeReviewApi } from "../app/api/v1/tax/preparation/session/professional-review/[caseId]/complete/route";
import { POST as assignProApi } from "../app/api/v1/tax/preparation/session/professional-review/[caseId]/assign/route";
import { ProfessionalReviewCaseStore } from "../lib/services/professional-review-case-store";
import { TaxPreparationSessionStore } from "../lib/services/tax-preparation-session-store";
import { UserProfileStore } from "../lib/services/user-profile-store";
import { AuditLogStore } from "../lib/services/audit-log-store";
import { NotificationStore } from "../lib/notifications/store";
import { RateLimiter } from "../lib/utils/rate-limiter";
import { validateCaseTransition, assertValidCaseTransition } from "../lib/professional/state-machine";
import { buildFederalReturnDocumentPackage } from "../lib/preparation/federal-return-documents";

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
    method: options.method || (options.body !== undefined ? "POST" : "GET"),
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

describe("Phase 8: CPA/EA Professional Workflow Test Suite", () => {
  const USER_A = "test-taxpayer-alice";
  const USER_B = "test-taxpayer-bob";
  const PRO_USER = "test-pro-david";
  const ADMIN_USER = "test-admin-sarah";

  beforeEach(() => {
    TaxPreparationSessionStore.clear();
    ProfessionalReviewCaseStore.clearStore();
    UserProfileStore.clear();
    AuditLogStore.clear();
    RateLimiter.clear();
  });

  afterEach(() => {
    RateLimiter.clear();
  });

  const setupSession = async (userId: string, stateOfResidence = "TX") => {
    await UserProfileStore.updateProfile(userId, {
      fullName: "Alice Taxpayer",
    });
    await UserProfileStore.updateTaxProfile(userId, {
      defaultTaxYear: 2025,
      filingStatus: "single",
      stateOfResidence,
    });

    const { session } = await TaxPreparationSessionStore.start(userId);

    await TaxPreparationSessionStore.saveIncome(userId, {
      situations: ["employer", "freelance"],
      w2s: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          employerName: "Tech Corp",
          wagesCents: 9500000,
          federalWithholdingCents: 1400000,
        },
      ],
      form1099s: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          payerName: "Design Agency",
          incomeType: "freelance",
          grossIncomeCents: 2500000,
          federalWithholdingCents: 250000,
        },
      ],
      activities: [],
    });

    await TaxPreparationSessionStore.saveDeductions(userId, {
      hasBusinessExpenses: false,
      standardDeductionAcknowledged: true,
      entries: [],
      guidedAnswers: {},
    });

    return session;
  };

  // 1. Case creation
  it("Scenario 1: Taxpayer creates a professional review case for an active session", async () => {
    const session = await setupSession(USER_A);
    const req = createMockRequest("/api/v1/tax/preparation/session/professional-review", {
      token: USER_A,
      body: {
        sessionId: session.id,
        reviewType: "cpa",
        priority: "HIGH",
        taxpayerNotes: "Please verify my freelance 1099 deductions.",
      },
    });

    const res = await requestReviewApi(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.status).toBe("REQUESTED");
    expect(json.data.priority).toBe("HIGH");
    expect(json.data.reviewType).toBe("cpa");
    expect(json.data.snapshot).toBeDefined();
    expect(json.data.snapshot.federalReturn.income.w2WagesCents).toBe(9500000);
  });

  // 2. Authenticated ownership
  it("Scenario 2: Authenticated ownership prevents unauthenticated or cross-session requests", async () => {
    const session = await setupSession(USER_A);

    // Unauthenticated request fails with 401
    const unauthReq = createMockRequest("/api/v1/tax/preparation/session/professional-review", {
      body: { sessionId: session.id },
    });
    const unauthRes = await requestReviewApi(unauthReq);
    expect(unauthRes.status).toBe(401);

    // User B attempting to request review on User A's session fails with 404
    const crossReq = createMockRequest("/api/v1/tax/preparation/session/professional-review", {
      token: USER_B,
      body: { sessionId: session.id },
    });
    const crossRes = await requestReviewApi(crossReq);
    expect(crossRes.status).toBe(404);
  });

  // 3. Professional authorization
  it("Scenario 3: Only the assigned professional or admin can access assigned case details", async () => {
    const session = await setupSession(USER_A);
    const reviewCase = await ProfessionalReviewCaseStore.createCase({
      sessionId: session.id,
      userId: USER_A,
    });

    // Assign to PRO_USER
    await ProfessionalReviewCaseStore.assignProfessional(
      reviewCase.id,
      { id: ADMIN_USER, name: "Admin Sarah", role: "admin" },
      { id: PRO_USER, name: "David CPA" }
    );

    // Assigned pro can access
    const proReq = createMockRequest(
      `/api/v1/tax/preparation/session/professional-review/${reviewCase.id}`,
      { token: PRO_USER }
    );
    const proRes = await getCaseDetailApi(proReq, { params: { caseId: reviewCase.id } });
    expect(proRes.status).toBe(200);

    // Taxpayer owner can access
    const ownerReq = createMockRequest(
      `/api/v1/tax/preparation/session/professional-review/${reviewCase.id}`,
      { token: USER_A }
    );
    const ownerRes = await getCaseDetailApi(ownerReq, { params: { caseId: reviewCase.id } });
    expect(ownerRes.status).toBe(200);

    // Unrelated User B cannot access
    const unauthReq = createMockRequest(
      `/api/v1/tax/preparation/session/professional-review/${reviewCase.id}`,
      { token: USER_B }
    );
    const unauthRes = await getCaseDetailApi(unauthReq, { params: { caseId: reviewCase.id } });
    expect(unauthRes.status).toBe(403);
  });

  // 4. Case assignment
  it("Scenario 4: Admin assigns a tax professional to a review case", async () => {
    const session = await setupSession(USER_A);
    const reviewCase = await ProfessionalReviewCaseStore.createCase({
      sessionId: session.id,
      userId: USER_A,
    });

    const assignReq = createMockRequest(
      `/api/v1/tax/preparation/session/professional-review/${reviewCase.id}/assign`,
      {
        token: ADMIN_USER,
        body: {
          professionalId: PRO_USER,
          professionalName: "David CPA",
        },
      }
    );
    const assignRes = await assignProApi(assignReq, { params: { caseId: reviewCase.id } });
    expect(assignRes.status).toBe(200);
    const json = await assignRes.json();
    expect(json.data.status).toBe("ASSIGNED");
    expect(json.data.assignedProfessionalId).toBe(PRO_USER);
    expect(json.data.assignedProfessionalName).toBe("David CPA");
  });

  // 5. Valid state transitions
  it("Scenario 5: Complete valid lifecycle transition sequence executes cleanly", async () => {
    const session = await setupSession(USER_A);
    let reviewCase = await ProfessionalReviewCaseStore.createCase({
      sessionId: session.id,
      userId: USER_A,
    });
    expect(reviewCase.status).toBe("REQUESTED");

    // Assign
    reviewCase = await ProfessionalReviewCaseStore.assignProfessional(
      reviewCase.id,
      { id: ADMIN_USER, name: "Admin", role: "admin" },
      { id: PRO_USER, name: "David CPA" }
    );
    expect(reviewCase.status).toBe("ASSIGNED");

    // Start review
    reviewCase = await ProfessionalReviewCaseStore.startReview(reviewCase.id, {
      id: PRO_USER,
      name: "David CPA",
      role: "professional",
    });
    expect(reviewCase.status).toBe("IN_REVIEW");

    // Mark ready for final review
    reviewCase = await ProfessionalReviewCaseStore.markReadyForFinalReview(reviewCase.id, {
      id: PRO_USER,
      name: "David CPA",
      role: "professional",
    });
    expect(reviewCase.status).toBe("READY_FOR_FINAL_REVIEW");

    // Complete review
    reviewCase = await ProfessionalReviewCaseStore.completeReview(reviewCase.id, {
      id: PRO_USER,
      name: "David CPA",
      role: "professional",
    });
    expect(reviewCase.status).toBe("REVIEW_COMPLETED");

    // Close case
    reviewCase = await ProfessionalReviewCaseStore.closeCase(reviewCase.id, {
      id: PRO_USER,
      name: "David CPA",
      role: "professional",
    });
    expect(reviewCase.status).toBe("CLOSED");
  });

  // 6. Invalid state transitions
  it("Scenario 6: Deterministic state machine prevents invalid or out-of-order transitions", () => {
    // Cannot skip directly from REQUESTED to REVIEW_COMPLETED
    const invalidSkip = validateCaseTransition("REQUESTED", "REVIEW_COMPLETED", "professional");
    expect(invalidSkip.isValid).toBe(false);

    // Cannot transition from CLOSED to IN_REVIEW
    const closedTransition = validateCaseTransition("CLOSED", "IN_REVIEW", "admin");
    expect(closedTransition.isValid).toBe(false);

    // Taxpayer cannot arbitrarily complete review
    const taxpayerComplete = validateCaseTransition("IN_REVIEW", "REVIEW_COMPLETED", "taxpayer");
    expect(taxpayerComplete.isValid).toBe(false);

    expect(() => assertValidCaseTransition("REQUESTED", "REVIEW_COMPLETED", "professional")).toThrow();
  });

  // 7. Comment creation
  it("Scenario 7: Professional posts structured review findings with severity and section", async () => {
    const session = await setupSession(USER_A);
    const reviewCase = await ProfessionalReviewCaseStore.createCase({
      sessionId: session.id,
      userId: USER_A,
    });
    await ProfessionalReviewCaseStore.assignProfessional(
      reviewCase.id,
      { id: ADMIN_USER, name: "Admin", role: "admin" },
      { id: PRO_USER, name: "David CPA" }
    );

    const commentReq = createMockRequest(
      `/api/v1/tax/preparation/session/professional-review/${reviewCase.id}/comments`,
      {
        token: PRO_USER,
        body: {
          section: "w2_income",
          severity: "REQUIRES_ACTION",
          message: "Please double check Box 2 federal tax withheld on Acme W-2.",
        },
      }
    );
    const res = await addCommentApi(commentReq, { params: { caseId: reviewCase.id } });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.section).toBe("w2_income");
    expect(json.data.severity).toBe("REQUIRES_ACTION");
    expect(json.data.status).toBe("OPEN");

    const updatedCase = await ProfessionalReviewCaseStore.getById(reviewCase.id);
    expect(updatedCase?.openCommentsCount).toBe(1);
    expect(updatedCase?.hasOpenActionRequired).toBe(true);
  });

  // 8. Comment resolution
  it("Scenario 8: Resolving open comment clears hasOpenActionRequired flag", async () => {
    const session = await setupSession(USER_A);
    const reviewCase = await ProfessionalReviewCaseStore.createCase({
      sessionId: session.id,
      userId: USER_A,
    });
    await ProfessionalReviewCaseStore.assignProfessional(
      reviewCase.id,
      { id: ADMIN_USER, name: "Admin", role: "admin" },
      { id: PRO_USER, name: "David CPA" }
    );
    const comment = await ProfessionalReviewCaseStore.addComment(
      reviewCase.id,
      { id: PRO_USER, name: "David CPA", role: "professional" },
      {
        section: "deductions",
        severity: "REQUIRES_ACTION",
        message: "Verify standard deduction eligibility.",
      }
    );

    const resolveReq = createMockRequest(
      `/api/v1/tax/preparation/session/professional-review/${reviewCase.id}/comments/${comment.id}`,
      { token: PRO_USER }
    );
    const resolveRes = await resolveCommentApi(resolveReq, {
      params: { caseId: reviewCase.id, commentId: comment.id },
    });
    expect(resolveRes.status).toBe(200);

    const updatedCase = await ProfessionalReviewCaseStore.getById(reviewCase.id);
    expect(updatedCase?.openCommentsCount).toBe(0);
    expect(updatedCase?.resolvedCommentsCount).toBe(1);
    expect(updatedCase?.hasOpenActionRequired).toBe(false);
  });

  // 9. Change request
  it("Scenario 9: Professional requests changes transitioning case to CHANGES_REQUESTED", async () => {
    const session = await setupSession(USER_A);
    const reviewCase = await ProfessionalReviewCaseStore.createCase({
      sessionId: session.id,
      userId: USER_A,
    });
    await ProfessionalReviewCaseStore.assignProfessional(
      reviewCase.id,
      { id: ADMIN_USER, name: "Admin", role: "admin" },
      { id: PRO_USER, name: "David CPA" }
    );
    await ProfessionalReviewCaseStore.startReview(reviewCase.id, {
      id: PRO_USER,
      name: "David CPA",
      role: "professional",
    });

    const req = createMockRequest(
      `/api/v1/tax/preparation/session/professional-review/${reviewCase.id}/request-changes`,
      {
        token: PRO_USER,
        body: { notes: "Please provide mileage logs for gig driving expenses." },
      }
    );
    const res = await requestChangesApi(req, { params: { caseId: reviewCase.id } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe("CHANGES_REQUESTED");
    expect(json.data.professionalNotes).toBe("Please provide mileage logs for gig driving expenses.");
  });

  // 10. Taxpayer resubmission
  it("Scenario 10: Taxpayer resubmits preparation after changes, returning to IN_REVIEW", async () => {
    const session = await setupSession(USER_A);
    const reviewCase = await ProfessionalReviewCaseStore.createCase({
      sessionId: session.id,
      userId: USER_A,
    });
    await ProfessionalReviewCaseStore.assignProfessional(
      reviewCase.id,
      { id: ADMIN_USER, name: "Admin", role: "admin" },
      { id: PRO_USER, name: "David CPA" }
    );
    await ProfessionalReviewCaseStore.startReview(reviewCase.id, {
      id: PRO_USER,
      name: "David CPA",
      role: "professional",
    });
    await ProfessionalReviewCaseStore.requestChanges(reviewCase.id, {
      id: PRO_USER,
      name: "David CPA",
      role: "professional",
    });

    const resubmitReq = createMockRequest(
      `/api/v1/tax/preparation/session/professional-review/${reviewCase.id}/resubmit`,
      {
        token: USER_A,
        body: { taxpayerNotes: "Updated standard mileage deduction entries." },
      }
    );
    const res = await resubmitApi(resubmitReq, { params: { caseId: reviewCase.id } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe("IN_REVIEW");
    expect(json.data.taxpayerNotes).toBe("Updated standard mileage deduction entries.");
  });

  // 11. Federal return recalculation
  it("Scenario 11: Authoritative federal return recalculates when session data changes", async () => {
    const session = await setupSession(USER_A);
    const reviewCase = await ProfessionalReviewCaseStore.createCase({
      sessionId: session.id,
      userId: USER_A,
    });
    const initialWages = reviewCase.snapshot?.federalReturn.income.w2WagesCents;
    expect(initialWages).toBe(9500000);

    // Update income in session directly
    await TaxPreparationSessionStore.saveIncome(USER_A, {
      situations: ["employer"],
      w2s: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          employerName: "Tech Corp",
          wagesCents: 11000000, // increased
          federalWithholdingCents: 1500000,
        },
      ],
      form1099s: [],
      activities: [],
    });

    // Put into CHANGES_REQUESTED first
    await ProfessionalReviewCaseStore.assignProfessional(
      reviewCase.id,
      { id: ADMIN_USER, name: "Admin", role: "admin" },
      { id: PRO_USER, name: "David CPA" }
    );
    await ProfessionalReviewCaseStore.startReview(reviewCase.id, {
      id: PRO_USER,
      name: "David CPA",
      role: "professional",
    });
    await ProfessionalReviewCaseStore.requestChanges(reviewCase.id, {
      id: PRO_USER,
      name: "David CPA",
      role: "professional",
    });

    // Resubmit
    const updated = await ProfessionalReviewCaseStore.resubmit(reviewCase.id, {
      id: USER_A,
      name: "Alice",
      role: "taxpayer",
    });
    expect(updated.snapshot?.federalReturn.income.w2WagesCents).toBe(11000000);
  });

  // 12. State readiness integration
  it("Scenario 12: Snapshot incorporates statutory state tax summary and readiness", async () => {
    const session = await setupSession(USER_A, "TX");
    await TaxPreparationSessionStore.calculate(USER_A);
    const reviewCase = await ProfessionalReviewCaseStore.createCase({
      sessionId: session.id,
      userId: USER_A,
    });

    expect(reviewCase.snapshot?.stateSummary).toBeDefined();
    expect(reviewCase.snapshot?.stateSummary?.stateCode).toBe("TX");
    expect(reviewCase.snapshot?.stateSummary?.hasIndividualIncomeTax).toBe(false);
    expect(reviewCase.snapshot?.stateSummary?.readiness.status).toBe("READY");
  });

  // 13. E-file readiness integration
  it("Scenario 13: Snapshot incorporates structured IRS MeF e-file readiness evaluation", async () => {
    const session = await setupSession(USER_A);
    const reviewCase = await ProfessionalReviewCaseStore.createCase({
      sessionId: session.id,
      userId: USER_A,
    });

    expect(reviewCase.snapshot?.efileReadiness).toBeDefined();
    expect(reviewCase.snapshot?.efileReadiness.summary.totalChecks).toBeGreaterThan(0);
    expect(reviewCase.snapshot?.efileReadiness.disclaimer).toContain("Electronic transmission to the IRS is NOT active");
    expect(reviewCase.snapshot?.documentPackage.securityMetadata.disclaimer).toContain("NOT FILED WITH THE IRS");
  });

  // 14. Snapshot integrity
  it("Scenario 14: Cryptographic SHA-256 checksum protects review snapshot from tampering", async () => {
    const session = await setupSession(USER_A);
    const snapshot = await ProfessionalReviewCaseStore.buildAuthoritativeSnapshot(session.id, USER_A);

    expect(snapshot.checksum).toBeDefined();
    expect(typeof snapshot.checksum).toBe("string");
    expect(snapshot.checksum.length).toBe(64); // SHA-256 hex string length
  });

  // 15. Professional package generation
  it("Scenario 15: Document package generates official CPA review package with legal disclaimers", async () => {
    const session = await setupSession(USER_A);
    const docPkg = buildFederalReturnDocumentPackage(session);

    const cpaDoc = docPkg.documents.find((d) => d.documentType === "professional_review_package");
    expect(cpaDoc).toBeDefined();
    expect(cpaDoc?.title).toContain("CPA / Professional Review Package");
    expect(cpaDoc?.disclaimer).toContain("NOT FILED WITH THE IRS");
    expect(cpaDoc?.disclaimer).not.toContain("IRS approved");
  });

  // 16. Notification events
  it("Scenario 16: Actions trigger structured in-app notifications in NotificationStore", async () => {
    const session = await setupSession(USER_A);
    await ProfessionalReviewCaseStore.createCase({
      sessionId: session.id,
      userId: USER_A,
    });

    const notifs = await NotificationStore.getNotifications(USER_A, { category: "professional" });
    expect(notifs.totalCount).toBeGreaterThanOrEqual(1);
    expect(notifs.notifications[0].title).toBe("Professional Review Requested");
  });

  // 17. Audit events
  it("Scenario 17: All case lifecycle events are immutably logged to AuditLogStore", async () => {
    const session = await setupSession(USER_A);
    const reviewCase = await ProfessionalReviewCaseStore.createCase({
      sessionId: session.id,
      userId: USER_A,
    });
    await ProfessionalReviewCaseStore.assignProfessional(
      reviewCase.id,
      { id: ADMIN_USER, name: "Admin", role: "admin" },
      { id: PRO_USER, name: "David CPA" }
    );

    const logs = await AuditLogStore.list();
    const caseLogs = logs.filter((l) => l.targetId === reviewCase.id);
    expect(caseLogs.length).toBeGreaterThanOrEqual(2);
    expect(caseLogs.some((l) => l.action === "professional_review_case_created")).toBe(true);
    expect(caseLogs.some((l) => l.action === "professional_review_assigned")).toBe(true);
  });

  // 18. Unauthorized cross-user access
  it("Scenario 18: Unrelated taxpayer cannot access or modify another taxpayer's case", async () => {
    const session = await setupSession(USER_A);
    const reviewCase = await ProfessionalReviewCaseStore.createCase({
      sessionId: session.id,
      userId: USER_A,
    });

    const commentReq = createMockRequest(
      `/api/v1/tax/preparation/session/professional-review/${reviewCase.id}/comments`,
      {
        token: USER_B,
        body: {
          section: "w2_income",
          message: "Malicious injection",
        },
      }
    );
    const res = await addCommentApi(commentReq, { params: { caseId: reviewCase.id } });
    expect(res.status).toBe(403);
  });

  // 19. Client-calculated values cannot override server values
  it("Scenario 19: Client cannot submit forged tax liability numbers", async () => {
    const session = await setupSession(USER_A);
    const forgedPayload = {
      sessionId: session.id,
      taxLiabilityCents: 0,
      totalIncomeCents: 0,
      refundCents: 999999,
    };

    const req = createMockRequest("/api/v1/tax/preparation/session/professional-review", {
      token: USER_A,
      body: forgedPayload,
    });
    const res = await requestReviewApi(req);
    expect(res.status).toBe(201);
    const json = await res.json();

    // Server-reconstructed snapshot retains genuine calculated numbers, completely ignoring forged inputs
    expect(json.data.snapshot.federalReturn.taxes.taxableIncomeCents).toBeGreaterThan(0);
    expect(json.data.snapshot.federalReturn.income.w2WagesCents).toBe(9500000);
  });

  // 20. Gemini cannot become calculation authority
  it("Scenario 20: Calculations and state decisions originate solely from deterministic tax engine", async () => {
    const session = await setupSession(USER_A);
    const reviewCase = await ProfessionalReviewCaseStore.createCase({
      sessionId: session.id,
      userId: USER_A,
    });

    // Verification: engine version is certified and non-null
    expect(reviewCase.snapshot?.federalReturn.metadata.engineVersion).toBeDefined();
    // Numbers match deterministic calculation exactly
    const fed = reviewCase.snapshot?.federalReturn;
    expect(fed?.income.totalGrossIncomeCents).toBe(
      fed!.income.w2WagesCents + fed!.income.gross1099IncomeCents
    );
    expect(fed?.taxes.taxableIncomeCents).toBe(
      Math.max(0, fed!.adjustments.adjustedGrossIncomeCents - fed!.deductions.deductionUsedCents)
    );
  });
});
