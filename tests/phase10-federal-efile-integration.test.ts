import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import crypto from "crypto";

import { POST as startSessionApi } from "../app/api/v1/tax/preparation/session/route";
import { PUT as saveHouseholdApi } from "../app/api/v1/tax/preparation/session/household/route";
import { PUT as saveIncomeApi } from "../app/api/v1/tax/preparation/session/income/route";
import { PUT as saveDeductionsApi } from "../app/api/v1/tax/preparation/session/deductions/route";
import { POST as calculateSessionApi } from "../app/api/v1/tax/preparation/session/calculate/route";
import { PATCH as patchProfileApi } from "../app/api/v1/auth/profile/route";

import { GET as getReadinessApi } from "../app/api/v1/tax/preparation/session/federal-return/efile/readiness/route";
import { POST as validateGateApi } from "../app/api/v1/tax/preparation/session/federal-return/efile/validate/route";
import { POST as freezeApi } from "../app/api/v1/tax/preparation/session/federal-return/efile/freeze/route";
import { POST as submitApi } from "../app/api/v1/tax/preparation/session/federal-return/efile/submit/route";
import { GET as getStatusApi } from "../app/api/v1/tax/preparation/session/federal-return/efile/status/route";
import { POST as webhookApi } from "../app/api/v1/tax/preparation/session/federal-return/efile/webhook/[provider]/route";
import { GET as getHistoryApi } from "../app/api/v1/tax/preparation/session/federal-return/efile/history/route";

import { TaxPreparationSessionStore, TaxPreparationSession } from "../lib/services/tax-preparation-session-store";
import { TaxCalculationStore } from "../lib/services/tax-calculation-store";
import { UserProfileStore } from "../lib/services/user-profile-store";
import { ProfessionalReviewCaseStore } from "../lib/services/professional-review-case-store";
import { AuditLogStore } from "../lib/services/audit-log-store";
import { NotificationStore } from "../lib/notifications/store";
import { EfileSubmissionStore } from "../lib/services/efile-submission-store";

import {
  createFinalReturnSnapshot,
  getFinalReturnSnapshot,
  clearSnapshotRegistry,
  verifySnapshotIntegrity,
  computeSnapshotChecksum,
  invalidateFinalReturnSnapshot,
} from "../lib/preparation/final-return-snapshot";
import {
  validateLifecycleTransition,
  assertValidLifecycleTransition,
} from "../lib/efile/submission-lifecycle";
import {
  DisconnectedEfileProvider,
  MockFederalEfileProvider,
  setEfileProviderForTesting,
  getActiveEfileProvider,
} from "../lib/efile/provider";
import { buildCanonicalEfilePayload } from "../lib/efile/canonical-payload";
import { validateEfileSubmissionGate } from "../lib/efile/validation-gate";
import { SYSTEM_PROMPTS } from "../lib/ai/gemini/prompts";

function createMockRequest(
  url: string,
  options: { method?: string; body?: unknown; token?: string; headers?: Record<string, string> } = {}
) {
  const reqHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (options.token) {
    reqHeaders.Authorization = `Bearer ${options.token}`;
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: options.method || "GET",
    headers: reqHeaders,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

const USER_A_TOKEN = "user-phase10-alice-1111-2222-3333-444444444444";
const USER_B_TOKEN = "user-phase10-bob-5555-6666-7777-888888888888";

describe("Phase 10: Actual IRS Federal E-File Integration & Provider Abstraction", () => {
  let mockProvider: MockFederalEfileProvider;

  beforeEach(() => {
    TaxPreparationSessionStore.clear();
    TaxCalculationStore.clear();
    UserProfileStore.clear();
    ProfessionalReviewCaseStore.clear();
    EfileSubmissionStore.clear();
    AuditLogStore.clear();
    NotificationStore.clear();
    clearSnapshotRegistry();

    mockProvider = new MockFederalEfileProvider("SUCCESS");
    setEfileProviderForTesting(mockProvider);
  });

  afterEach(() => {
    setEfileProviderForTesting(null);
  });

  async function setupReadySession(token: string): Promise<TaxPreparationSession> {
    await patchProfileApi(
      createMockRequest("http://localhost:3000/api/v1/auth/profile", {
        method: "PATCH",
        token,
        body: {
          profile: { fullName: "Alice Hamilton" },
          taxProfile: {
            stateOfResidence: "TX",
            filingStatus: "single",
            residentialAddress: {
              addressLine1: "123 Main Street",
              city: "Austin",
              state: "TX",
              zipCode: "78701",
              country: "USA",
            },
          },
        },
      })
    );

    const startRes = await startSessionApi(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
        method: "POST",
        token,
        body: {},
      })
    );
    const startJson = await startRes.json();
    const session = startJson.data as TaxPreparationSession;

    await saveHouseholdApi(
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

    await saveIncomeApi(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/income", {
        method: "PUT",
        token,
        body: {
          situations: ["employer"],
          w2s: [
            {
              id: "w2-1",
              employerName: "TechCorp Inc",
              wagesCents: 9500000,
              federalWithholdingCents: 1400000,
            },
          ],
          form1099s: [],
          activities: [],
        },
      })
    );

    await saveDeductionsApi(
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

    const calcRes = await calculateSessionApi(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/calculate", {
        method: "POST",
        token,
      })
    );
    expect(calcRes.status).toBe(200);

    const current = await TaxPreparationSessionStore.getCurrent(session.userId);
    return current!;
  }

  // 1. Readiness Gate
  it("Scenario 1: Pre-submission gate blocks incomplete sessions with descriptive issues", async () => {
    const startRes = await startSessionApi(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
        method: "POST",
        token: USER_A_TOKEN,
        body: {},
      })
    );
    const startJson = await startRes.json();
    const session = startJson.data as TaxPreparationSession;

    const gateResult = await validateEfileSubmissionGate(session);
    expect(gateResult.isReady).toBe(false);
    expect(gateResult.gateStatus).toBe("BLOCKED");
    expect(gateResult.blockingIssues.length).toBeGreaterThan(0);
  });

  // 2. Freeze
  it("Scenario 2: Freezing return creates immutable snapshot with SHA-256 and schema 2026.1", async () => {
    await setupReadySession(USER_A_TOKEN);
    const res = await freezeApi(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/federal-return/efile/freeze", {
        method: "POST",
        token: USER_A_TOKEN,
      })
    );
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.checksum).toBeDefined();
    expect(json.data.checksum.length).toBe(64); // SHA-256 hex
    expect(json.data.schemaVersion).toBe("2026.1");
    expect(json.data.isFrozen).toBe(true);
  });

  // 3. Snapshot Integrity
  it("Scenario 3: Snapshot integrity verification succeeds for unmodified frozen snapshot", async () => {
    const session = await setupReadySession(USER_A_TOKEN);
    const snapshot = createFinalReturnSnapshot(session);
    expect(verifySnapshotIntegrity(snapshot)).toBe(true);
  });

  // 4. Snapshot Immutability
  it("Scenario 4: Modifying snapshot payload invalidates checksum integrity verification", async () => {
    const session = await setupReadySession(USER_A_TOKEN);
    const snapshot = createFinalReturnSnapshot(session);
    const tampered = {
      ...snapshot,
      payload: {
        ...snapshot.payload,
        income: {
          ...snapshot.payload.income,
          w2WagesCents: 100, // Altered number
        },
      },
    };
    expect(verifySnapshotIntegrity(tampered)).toBe(false);
  });

  // 5. Submission Lifecycle
  it("Scenario 5: Enforces valid status machine transitions and blocks illegal jumps", () => {
    // Valid: DRAFT -> READY_FOR_REVIEW -> READY_TO_SUBMIT -> SUBMISSION_PENDING
    expect(validateLifecycleTransition("DRAFT", "READY_FOR_REVIEW").allowed).toBe(true);
    expect(validateLifecycleTransition("READY_FOR_REVIEW", "READY_TO_SUBMIT").allowed).toBe(true);
    expect(validateLifecycleTransition("READY_TO_SUBMIT", "SUBMISSION_PENDING").allowed).toBe(true);
    expect(validateLifecycleTransition("SUBMISSION_PENDING", "SUBMITTED", true).allowed).toBe(true);
    expect(validateLifecycleTransition("SUBMITTED", "ACCEPTED", true).allowed).toBe(true);

    // Invalid: ACCEPTED -> SUBMITTING
    expect(validateLifecycleTransition("ACCEPTED", "SUBMITTING").allowed).toBe(false);

    // Invalid without connected provider: SUBMISSION_PENDING -> SUBMITTED
    expect(validateLifecycleTransition("SUBMISSION_PENDING", "SUBMITTED", false).allowed).toBe(false);

    // Assert throws
    expect(() => assertValidLifecycleTransition("ACCEPTED", "SUBMITTING")).toThrow();
  });

  // 6. Provider Abstraction
  it("Scenario 6: Disconnected provider safely reports offline status and rejects transmission", async () => {
    const disconnected = new DisconnectedEfileProvider();
    expect(disconnected.isConnected).toBe(false);
    expect(disconnected.isMock).toBe(false);
    const capabilities = disconnected.getCapabilities();
    expect(capabilities.supportsRealTransmission).toBe(false);

    const session = await setupReadySession(USER_A_TOKEN);
    const snapshot = createFinalReturnSnapshot(session);
    const payload = buildCanonicalEfilePayload(snapshot);

    const result = await disconnected.submit(snapshot, payload, "key-123");
    expect(result.success).toBe(false);
    expect(result.responseType).toBe("SERVICE_UNAVAILABLE");
    expect(result.message).toMatch(/Electronic transmission unavailable/i);
  });

  // 7. Mock Provider
  it("Scenario 7: Mock provider identifies as TEST ONLY and does not claim IRS filing", () => {
    const provider = new MockFederalEfileProvider();
    expect(provider.isConnected).toBe(true);
    expect(provider.isMock).toBe(true);
    expect(provider.providerName).toMatch(/TEST ONLY/i);
    const cap = provider.getCapabilities();
    expect(cap.supportsRealTransmission).toBe(false);
  });

  // 8. Successful Mock Submission
  it("Scenario 8: Successful mock submission transmits return and returns SUBMITTED state", async () => {
    await setupReadySession(USER_A_TOKEN);
    await freezeApi(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/federal-return/efile/freeze", {
        method: "POST",
        token: USER_A_TOKEN,
      })
    );

    const submitRes = await submitApi(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/federal-return/efile/submit", {
        method: "POST",
        token: USER_A_TOKEN,
        body: { userConfirmed: true },
      })
    );
    const submitJson = await submitRes.json();

    expect(submitJson.success).toBe(true);
    expect(submitJson.data.status).toBe("SUBMITTED");
    expect(submitJson.data.providerSubmissionId).toMatch(/^MOCK-SUB-/);
    expect(submitJson.data.isTestSubmission).toBe(true);
    expect(submitJson.disclaimer).toMatch(/TEST SUBMISSION/i);
  });

  // 9. Mock Rejection
  it("Scenario 9: Mock rejection simulation records REJECTED status and taxpayer action", async () => {
    mockProvider.setBehaviorMode("REJECTED");
    await setupReadySession(USER_A_TOKEN);
    await freezeApi(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/federal-return/efile/freeze", {
        method: "POST",
        token: USER_A_TOKEN,
      })
    );

    const submitRes = await submitApi(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/federal-return/efile/submit", {
        method: "POST",
        token: USER_A_TOKEN,
        body: { userConfirmed: true },
      })
    );
    const submitJson = await submitRes.json();

    expect(submitJson.success).toBe(false);
    expect(submitJson.data.status).toBe("REJECTED");
    expect(submitJson.data.rejectionMessage).toMatch(/Simulated IRS MeF Rejection/i);
  });

  // 10. Mock Timeout
  it("Scenario 10: Mock timeout simulation transitions to FAILED with incremented retry count", async () => {
    mockProvider.setBehaviorMode("TIMEOUT");
    await setupReadySession(USER_A_TOKEN);
    await freezeApi(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/federal-return/efile/freeze", {
        method: "POST",
        token: USER_A_TOKEN,
      })
    );

    const submitRes = await submitApi(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/federal-return/efile/submit", {
        method: "POST",
        token: USER_A_TOKEN,
        body: { userConfirmed: true },
      })
    );
    const submitJson = await submitRes.json();

    expect(submitJson.success).toBe(false);
    expect(submitJson.data.status).toBe("FAILED");
    expect(submitJson.data.retryCount).toBe(1);
  });

  // 11. Duplicate Submission
  it("Scenario 11: Idempotency key prevents duplicate submission and returns existing record", async () => {
    await setupReadySession(USER_A_TOKEN);
    await freezeApi(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/federal-return/efile/freeze", {
        method: "POST",
        token: USER_A_TOKEN,
      })
    );

    const customIdempotencyKey = "custom-idem-test-key-123456";

    const res1 = await submitApi(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/federal-return/efile/submit", {
        method: "POST",
        token: USER_A_TOKEN,
        body: { idempotencyKey: customIdempotencyKey, userConfirmed: true },
      })
    );
    const json1 = await res1.json();
    expect(json1.success).toBe(true);

    const res2 = await submitApi(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/federal-return/efile/submit", {
        method: "POST",
        token: USER_A_TOKEN,
        body: { idempotencyKey: customIdempotencyKey, userConfirmed: true },
      })
    );
    const json2 = await res2.json();
    expect(json2.success).toBe(true);
    expect(json2.idempotent).toBe(true);
    expect(json2.data.id).toBe(json1.data.id);
  });

  // 12. Idempotency Snapshot Guard
  it("Scenario 12: Idempotency prevents creating multiple distinct active submissions for same snapshot", async () => {
    await setupReadySession(USER_A_TOKEN);
    await freezeApi(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/federal-return/efile/freeze", {
        method: "POST",
        token: USER_A_TOKEN,
      })
    );

    const res1 = await submitApi(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/federal-return/efile/submit", {
        method: "POST",
        token: USER_A_TOKEN,
      })
    );
    const json1 = await res1.json();

    const res2 = await submitApi(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/federal-return/efile/submit", {
        method: "POST",
        token: USER_A_TOKEN,
      })
    );
    const json2 = await res2.json();

    expect(json2.data.id).toBe(json1.data.id);
  });

  // 13. Webhook Authentication
  it("Scenario 13: Webhook endpoint validates cryptographic signatures and rejects invalid calls", async () => {
    await setupReadySession(USER_A_TOKEN);
    await freezeApi(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/federal-return/efile/freeze", {
        method: "POST",
        token: USER_A_TOKEN,
      })
    );
    const subRes = await submitApi(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/federal-return/efile/submit", {
        method: "POST",
        token: USER_A_TOKEN,
      })
    );
    const subJson = await subRes.json();
    const subId = subJson.data.providerSubmissionId;

    const webhookBody = {
      provider: "mock_federal_efile_provider",
      providerSubmissionId: subId,
      eventType: "ACCEPTED",
      timestamp: new Date().toISOString(),
    };
    const rawString = JSON.stringify(webhookBody);

    // Call with invalid signature
    const badRes = await webhookApi(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/federal-return/efile/webhook/mock", {
        method: "POST",
        body: webhookBody,
        headers: { "x-provider-signature": "invalid-signature" },
      }),
      { params: { provider: "mock" } }
    );
    expect(badRes.status).toBe(401);

    // Call with valid signature
    const validSig = mockProvider.generateTestWebhookSignature(rawString);
    const goodRes = await webhookApi(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/federal-return/efile/webhook/mock", {
        method: "POST",
        body: webhookBody,
        headers: { "x-provider-signature": validSig },
      }),
      { params: { provider: "mock" } }
    );
    expect(goodRes.status).toBe(200);
    const goodJson = await goodRes.json();
    expect(goodJson.success).toBe(true);
    expect(goodJson.data.newStatus).toBe("ACCEPTED");
  });

  // 14. Webhook Idempotency
  it("Scenario 14: Replayed webhook callback is safely ignored without duplicate processing", async () => {
    await setupReadySession(USER_A_TOKEN);
    await freezeApi(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/federal-return/efile/freeze", {
        method: "POST",
        token: USER_A_TOKEN,
      })
    );
    const subRes = await submitApi(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/federal-return/efile/submit", {
        method: "POST",
        token: USER_A_TOKEN,
      })
    );
    const subJson = await subRes.json();
    const subId = subJson.data.providerSubmissionId;

    const webhookBody = {
      provider: "mock_federal_efile_provider",
      providerSubmissionId: subId,
      eventType: "ACCEPTED",
      timestamp: new Date().toISOString(),
    };
    const rawString = JSON.stringify(webhookBody);
    const validSig = mockProvider.generateTestWebhookSignature(rawString);

    // First call transitions to ACCEPTED
    await webhookApi(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/federal-return/efile/webhook/mock", {
        method: "POST",
        body: webhookBody,
        headers: { "x-provider-signature": validSig },
      }),
      { params: { provider: "mock" } }
    );

    // Replay call
    const replayRes = await webhookApi(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/federal-return/efile/webhook/mock", {
        method: "POST",
        body: webhookBody,
        headers: { "x-provider-signature": validSig },
      }),
      { params: { provider: "mock" } }
    );
    const replayJson = await replayRes.json();
    expect(replayJson.success).toBe(true);
    expect(replayJson.data.duplicate).toBe(true);
  });

  // 15. Unauthorized Submission
  it("Scenario 15: Submission request without authentication returns 401 Unauthorized", async () => {
    const res = await submitApi(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/federal-return/efile/submit", {
        method: "POST",
        token: "unauthenticated",
      })
    );
    expect(res.status).toBe(401);
  });

  // 16. Cross-User Protection
  it("Scenario 16: User B cannot access or submit User A's tax preparation session", async () => {
    await setupReadySession(USER_A_TOKEN);
    // User B attempts to access efile status
    const resB = await getStatusApi(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/federal-return/efile/status", {
        method: "GET",
        token: USER_B_TOKEN,
      })
    );
    expect(resB.status).toBe(404); // No session found for User B
  });

  // 17. Client Cannot Forge Acceptance
  it("Scenario 17: Client submitting status: ACCEPTED is ignored and determined server-side", async () => {
    await setupReadySession(USER_A_TOKEN);
    await freezeApi(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/federal-return/efile/freeze", {
        method: "POST",
        token: USER_A_TOKEN,
      })
    );

    const res = await submitApi(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/federal-return/efile/submit", {
        method: "POST",
        token: USER_A_TOKEN,
        body: {
          status: "ACCEPTED", // Malicious client attempt to forge acceptance
        },
      })
    );
    const json = await res.json();
    expect(json.data.status).toBe("SUBMITTED"); // Server sets SUBMITTED, ignoring client injection
  });

  // 18. Client Cannot Override Tax Totals
  it("Scenario 18: Canonical submission payload derives 100% from server return ignoring client totals", async () => {
    const session = await setupReadySession(USER_A_TOKEN);
    const snapshot = createFinalReturnSnapshot(session);
    const payload = buildCanonicalEfilePayload(snapshot);

    expect(payload.lines.w2WagesCents).toBe(9500000);
    expect(payload.lines.totalWithholdingCents).toBe(1400000);
    expect(payload.header.checksum).toBe(snapshot.checksum);
  });

  // 19. Professional Review Blocking
  it("Scenario 19: Submission and freeze are blocked when professional reviewer requested changes", async () => {
    const session = await setupReadySession(USER_A_TOKEN);

    // Create a pro review case with CHANGES_REQUESTED
    await ProfessionalReviewCaseStore.createCase({
      userId: USER_A_TOKEN,
      sessionId: session.id,
    });
    const proCase = await ProfessionalReviewCaseStore.getBySessionId(session.id);
    expect(proCase).not.toBeNull();
    ProfessionalReviewCaseStore.updateCaseStatusForTesting(proCase!.id, "CHANGES_REQUESTED");

    // Attempt to freeze
    const freezeRes = await freezeApi(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/federal-return/efile/freeze", {
        method: "POST",
        token: USER_A_TOKEN,
      })
    );
    expect(freezeRes.status).toBe(422);

    // Validation gate also blocks
    const gateResult = await validateEfileSubmissionGate(session);
    expect(gateResult.isReady).toBe(false);
    expect(gateResult.blockingIssues.some((issue) => /CPA\/EA professional reviewer requested adjustments/i.test(issue))).toBe(true);
  });

  // 20. Stale Snapshot Blocking
  it("Scenario 20: Pre-submission gate detects stale snapshot when live inputs have mutated", async () => {
    const session = await setupReadySession(USER_A_TOKEN);
    createFinalReturnSnapshot(session);

    // Simulate session mutation after snapshot was created
    const mutatedSession = {
      ...session,
      incomeSnapshot: {
        ...session.incomeSnapshot,
        w2s: [
          {
            ...session.incomeSnapshot.w2s[0],
            wagesCents: 12000000, // Mutated wages
          },
        ],
      },
    };

    const gate = await validateEfileSubmissionGate(mutatedSession);
    expect(gate.isReady).toBe(false);
    expect(gate.isStaleSnapshot).toBe(true);
    expect(gate.blockingIssues.some((i) => /inputs have changed since the snapshot was frozen/i.test(i))).toBe(true);
  });

  // 21. Return Changed After Freeze Invalidates Snapshot
  it("Scenario 21: Persisting updated return inputs automatically invalidates the frozen snapshot", async () => {
    const session = await setupReadySession(USER_A_TOKEN);
    createFinalReturnSnapshot(session);
    expect(getFinalReturnSnapshot(session.id)).not.toBeNull();

    // Update income through session store
    await saveIncomeApi(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/income", {
        method: "PUT",
        token: USER_A_TOKEN,
        body: {
          situations: ["employer"],
          w2s: [
            {
              id: "w2-1",
              employerName: "TechCorp Inc",
              wagesCents: 10000000,
              federalWithholdingCents: 1500000,
            },
          ],
          form1099s: [],
          activities: [],
        },
      })
    );

    // Snapshot is automatically invalidated
    expect(getFinalReturnSnapshot(session.id)).toBeNull();
  });

  // 22. Notification Lifecycle
  it("Scenario 22: Submission and status updates generate user notifications", async () => {
    await setupReadySession(USER_A_TOKEN);
    await freezeApi(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/federal-return/efile/freeze", {
        method: "POST",
        token: USER_A_TOKEN,
      })
    );
    await submitApi(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/federal-return/efile/submit", {
        method: "POST",
        token: USER_A_TOKEN,
      })
    );

    const userNotifs = await NotificationStore.getNotifications(USER_A_TOKEN);
    expect(userNotifs.notifications.some((n) => /Return Transmitted/i.test(n.title))).toBe(true);
  });

  // 23. Audit Lifecycle
  it("Scenario 23: E-file submission records durable audit trail events in store", async () => {
    await setupReadySession(USER_A_TOKEN);
    await freezeApi(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/federal-return/efile/freeze", {
        method: "POST",
        token: USER_A_TOKEN,
      })
    );
    const subRes = await submitApi(
      createMockRequest("http://localhost:3000/api/v1/tax/preparation/session/federal-return/efile/submit", {
        method: "POST",
        token: USER_A_TOKEN,
      })
    );
    const subJson = await subRes.json();
    const subId = subJson.data.id;

    const events = await EfileSubmissionStore.listEvents(subId);
    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events.some((e) => e.eventType === "SUBMISSION_CREATED")).toBe(true);
    expect(events.some((e) => e.toStatus === "SUBMITTED")).toBe(true);
  });

  // 24. Provider Disabled Production Safety
  it("Scenario 24: In production, mock provider fails closed and active provider reports disconnected", () => {
    setEfileProviderForTesting(null);
    const originalEnv = process.env.NODE_ENV;
    const originalProvider = process.env.EFILE_PROVIDER;

    try {
      (process.env as any).NODE_ENV = "production";
      process.env.EFILE_PROVIDER = "mock";

      const provider = getActiveEfileProvider();
      expect(provider.isConnected).toBe(false);
      expect(provider.providerId).toBe("disconnected_null_provider");
    } finally {
      (process.env as any).NODE_ENV = originalEnv;
      process.env.EFILE_PROVIDER = originalProvider;
    }
  });

  // 25. Gemini Remains Explanation-Only
  it("Scenario 25: AI system prompts strictly forbid calculating tax numbers or determining IRS acceptance", () => {
    expect(SYSTEM_PROMPTS.intentExtraction).toMatch(/NEVER calculate tax liabilities/i);
    expect(SYSTEM_PROMPTS.taxExplainer).toMatch(/educational/i);
    expect(SYSTEM_PROMPTS.taxExplainer).toMatch(/NEVER invent numerical tax results/i);
    expect(SYSTEM_PROMPTS.taxExplainer).toMatch(/Do not claim to have filed taxes/i);
  });
});
