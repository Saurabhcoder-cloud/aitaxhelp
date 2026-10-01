import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import {
  POST as createLeadApi,
  GET as listLeadsApi,
} from "../app/api/v1/professional-leads/route";
import {
  GET as adminGetLeadApi,
  PATCH as adminUpdateLeadApi,
} from "../app/api/v1/admin/leads/[id]/route";
import {
  POST as createSupportTicketApi,
} from "../app/api/v1/support/tickets/route";
import { TaxPreparationSessionStore } from "../lib/services/tax-preparation-session-store";
import { ProfessionalLeadStore } from "../lib/services/professional-lead-store";
import { TaxCalculationStore } from "../lib/services/tax-calculation-store";
import { UserProfileStore } from "../lib/services/user-profile-store";
import { AuditLogStore } from "../lib/services/audit-log-store";
import { SupportStore } from "../lib/services/support-store";
import { RateLimiter } from "../lib/utils/rate-limiter";

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

describe("Phase 6: CPA/EA Professional Review & Human Escalation Suite", () => {
  const USER_A = "test-user-alice";
  const USER_B = "test-user-bob";
  const ADMIN_USER = "test-admin-1";

  beforeEach(() => {
    TaxPreparationSessionStore.clear();
    ProfessionalLeadStore.clearStore();
    TaxCalculationStore.clearStore();
    UserProfileStore.clear();
    AuditLogStore.clear();
    SupportStore.clear();
    RateLimiter.clear();
  });

  afterEach(() => {
    RateLimiter.clear();
  });

  const W2_ID = "11111111-1111-4111-8111-111111111111";
  const F1099_ID = "22222222-2222-4222-8222-222222222222";
  const DOC_ID = "77777777-7777-4777-8777-777777777777";

  // Helper to setup a calculated session for a user using canonical store APIs
  const setupCalculatedSession = async (userId: string, taxYear: 2025 | 2026 = 2025) => {
    await UserProfileStore.updateProfile(userId, {
      fullName: "Alice Taxpayer",
    });
    await UserProfileStore.updateTaxProfile(userId, {
      defaultTaxYear: taxYear,
      filingStatus: "single",
    });

    const { session } = await TaxPreparationSessionStore.start(userId);

    await TaxPreparationSessionStore.saveIncome(userId, {
      situations: ["employer", "freelance"],
      w2s: [
        {
          id: W2_ID,
          employerName: "Acme Corp",
          wagesCents: 8500000,
          federalWithholdingCents: 1200000,
        },
      ],
      form1099s: [
        {
          id: F1099_ID,
          payerName: "Client Consulting LLC",
          incomeType: "freelance",
          grossIncomeCents: 2000000,
          federalWithholdingCents: 200000,
        },
      ],
      activities: [],
    });

    await TaxPreparationSessionStore.saveDocuments(userId, {
      documents: [
        {
          id: DOC_ID,
          documentType: "w2",
          displayName: "W-2 Acme",
          taxYear,
          sourceName: "Acme Corp",
          status: "received",
          notes: "",
        },
      ],
    });

    await TaxPreparationSessionStore.saveDeductions(userId, {
      hasBusinessExpenses: false,
      standardDeductionAcknowledged: true,
      entries: [],
    });

    const updatedSession = await TaxPreparationSessionStore.calculate(userId);

    return {
      session: updatedSession,
      calcId: updatedSession.calculationId!,
      calcResult: updatedSession.calculationSnapshot!,
    };
  };

  /* ========================================================================= */
  /* 1. AUTHENTICATION & SECURITY VALIDATION                                   */
  /* ========================================================================= */

  it("1. Professional review request requires authentication (401)", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/professional-leads", {
      body: {
        sessionId: "sess-123",
        taxpayerName: "Alice Taxpayer",
        email: "alice@example.com",
        consentGiven: true,
      },
    });

    const res = await createLeadApi(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it("2. Professional review request requires consent checkbox (400)", async () => {
    const { session } = await setupCalculatedSession(USER_A);

    const req = createMockRequest("http://localhost:3000/api/v1/professional-leads", {
      token: USER_A,
      body: {
        sessionId: session.id,
        taxpayerName: "Alice Taxpayer",
        email: "alice@example.com",
        consentGiven: false, // Refused consent
      },
    });

    const res = await createLeadApi(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it("3. Review request without calculation or session is rejected (400)", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/professional-leads", {
      token: USER_A,
      body: {
        taxpayerName: "Alice Taxpayer",
        email: "alice@example.com",
        consentGiven: true,
      },
    });

    const res = await createLeadApi(req);
    expect(res.status).toBe(400);
  });

  it("4. Review request with non-existent session is rejected (404)", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/professional-leads", {
      token: USER_A,
      body: {
        sessionId: "non-existent-session-id",
        taxpayerName: "Alice Taxpayer",
        email: "alice@example.com",
        consentGiven: true,
      },
    });

    const res = await createLeadApi(req);
    expect(res.status).toBe(404);
  });

  it("5. Cross-user access protection: User B cannot request review for User A's session (404)", async () => {
    const { session } = await setupCalculatedSession(USER_A);

    const intruderReq = createMockRequest("http://localhost:3000/api/v1/professional-leads", {
      token: USER_B,
      body: {
        sessionId: session.id,
        taxpayerName: "Bob Intruder",
        email: "bob@example.com",
        consentGiven: true,
      },
    });

    const res = await createLeadApi(intruderReq);
    expect(res.status).toBe(404);
  });

  it("6. Uncalculated session cannot request review (400 CALCULATION_REQUIRED)", async () => {
    await UserProfileStore.updateProfile(USER_A, { fullName: "Alice Taxpayer" });
    const { session: uncalculatedSession } = await TaxPreparationSessionStore.start(USER_A);

    const req = createMockRequest("http://localhost:3000/api/v1/professional-leads", {
      token: USER_A,
      body: {
        sessionId: uncalculatedSession.id,
        taxpayerName: "Alice Taxpayer",
        email: "alice@example.com",
        consentGiven: true,
      },
    });

    const res = await createLeadApi(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error?.code).toBe("CALCULATION_REQUIRED");
  });

  /* ========================================================================= */
  /* 2. SUCCESSFUL LEAD CREATION & CONTEXT LINKAGE                             */
  /* ========================================================================= */

  it("7. Successfully creates professional review lead linked to session and calculation", async () => {
    const { session, calcId } = await setupCalculatedSession(USER_A);

    const req = createMockRequest("http://localhost:3000/api/v1/professional-leads", {
      token: USER_A,
      body: {
        sessionId: session.id,
        reviewType: "cpa",
        taxpayerName: "Alice Taxpayer",
        email: "alice@example.com",
        phone: "555-123-4567",
        preferredContactMethod: "email",
        urgency: "within_week",
        message: "Please review my 1099 consulting deduction treatment.",
        consentGiven: true,
      },
    });

    const res = await createLeadApi(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);

    const lead = json.data;
    expect(lead.userId).toBe(USER_A);
    expect(lead.sessionId).toBe(session.id);
    expect(lead.calculationId).toBe(calcId);
    expect(lead.reviewType).toBe("cpa");
    expect(lead.status).toBe("requested");
    expect(lead.preferredContactMethod).toBe("email");
    expect(lead.message).toContain("1099 consulting deduction");

    // Session snapshot verified
    expect(lead.sessionSnapshot).toBeDefined();
    expect(lead.sessionSnapshot.w2Count).toBe(1);
    expect(lead.sessionSnapshot.form1099Count).toBe(1);
    expect(lead.sessionSnapshot.calculationResult).toBeDefined();
  });

  it("8. Supports Enrolled Agent and Tax Professional review types", async () => {
    const { session } = await setupCalculatedSession(USER_A);

    const reqEA = createMockRequest("http://localhost:3000/api/v1/professional-leads", {
      token: USER_A,
      body: {
        sessionId: session.id,
        reviewType: "enrolled_agent",
        taxpayerName: "Alice Taxpayer",
        email: "alice@example.com",
        consentGiven: true,
      },
    });

    const resEA = await createLeadApi(reqEA);
    expect(resEA.status).toBe(201);
    const jsonEA = await resEA.json();
    expect(jsonEA.data.reviewType).toBe("enrolled_agent");
  });

  it("9. Duplicate submission protection: rejects duplicate request within 5 minutes (409)", async () => {
    const { session } = await setupCalculatedSession(USER_A);

    const req1 = createMockRequest("http://localhost:3000/api/v1/professional-leads", {
      token: USER_A,
      body: {
        sessionId: session.id,
        taxpayerName: "Alice Taxpayer",
        email: "alice@example.com",
        consentGiven: true,
      },
    });
    const res1 = await createLeadApi(req1);
    expect(res1.status).toBe(201);

    // Immediate second submission for same session
    const req2 = createMockRequest("http://localhost:3000/api/v1/professional-leads", {
      token: USER_A,
      body: {
        sessionId: session.id,
        taxpayerName: "Alice Taxpayer",
        email: "alice@example.com",
        consentGiven: true,
      },
    });
    const res2 = await createLeadApi(req2);
    expect(res2.status).toBe(409);
    const json2 = await res2.json();
    expect(json2.error?.code).toBe("DUPLICATE_LEAD");
  });

  /* ========================================================================= */
  /* 3. USER STATUS RETRIEVAL & ISOLATION                                      */
  /* ========================================================================= */

  it("10. Taxpayer can retrieve their review request status by session ID", async () => {
    const { session } = await setupCalculatedSession(USER_A);

    // Create lead
    const reqPost = createMockRequest("http://localhost:3000/api/v1/professional-leads", {
      token: USER_A,
      body: {
        sessionId: session.id,
        reviewType: "cpa",
        taxpayerName: "Alice Taxpayer",
        email: "alice@example.com",
        consentGiven: true,
      },
    });
    await createLeadApi(reqPost);

    // Query status by session ID
    const reqGet = createMockRequest(
      `http://localhost:3000/api/v1/professional-leads?sessionId=${encodeURIComponent(session.id)}`,
      {
        method: "GET",
        token: USER_A,
      }
    );
    const resGet = await listLeadsApi(reqGet);
    expect(resGet.status).toBe(200);
    const jsonGet = await resGet.json();
    expect(jsonGet.success).toBe(true);
    expect(jsonGet.data.sessionId).toBe(session.id);
    expect(jsonGet.data.status).toBe("requested");
  });

  it("11. Cross-user isolation: User B cannot retrieve User A's lead by session ID", async () => {
    const { session } = await setupCalculatedSession(USER_A);

    // User A creates lead
    const reqPost = createMockRequest("http://localhost:3000/api/v1/professional-leads", {
      token: USER_A,
      body: {
        sessionId: session.id,
        taxpayerName: "Alice Taxpayer",
        email: "alice@example.com",
        consentGiven: true,
      },
    });
    await createLeadApi(reqPost);

    // User B attempts to access it
    const reqGet = createMockRequest(
      `http://localhost:3000/api/v1/professional-leads?sessionId=${encodeURIComponent(session.id)}`,
      {
        method: "GET",
        token: USER_B,
      }
    );
    const resGet = await listLeadsApi(reqGet);
    expect(resGet.status).toBe(200);
    const jsonGet = await resGet.json();
    // User B gets null because they do not own the session or lead
    expect(jsonGet.data).toBeNull();
  });

  /* ========================================================================= */
  /* 4. ADMIN WORKFLOW & PROFESSIONAL ASSIGNMENT                               */
  /* ========================================================================= */

  it("12. Non-admin user cannot access admin lead endpoints (403)", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/admin/leads/some-lead-id", {
      method: "GET",
      token: USER_A,
    });
    const res = await adminGetLeadApi(req, { params: { id: "some-lead-id" } });
    expect(res.status).toBe(403);
  });

  it("13. Admin can view lead details with session snapshot", async () => {
    const { session } = await setupCalculatedSession(USER_A);

    const postRes = await createLeadApi(
      createMockRequest("http://localhost:3000/api/v1/professional-leads", {
        token: USER_A,
        body: {
          sessionId: session.id,
          reviewType: "cpa",
          taxpayerName: "Alice Taxpayer",
          email: "alice@example.com",
          consentGiven: true,
        },
      })
    );
    const lead = (await postRes.json()).data;

    const reqAdmin = createMockRequest(`http://localhost:3000/api/v1/admin/leads/${lead.id}`, {
      method: "GET",
      token: ADMIN_USER,
    });
    const resAdmin = await adminGetLeadApi(reqAdmin, { params: { id: lead.id } });
    expect(resAdmin.status).toBe(200);
    const jsonAdmin = await resAdmin.json();
    expect(jsonAdmin.data.id).toBe(lead.id);
    expect(jsonAdmin.data.sessionSnapshot).toBeDefined();
    expect(jsonAdmin.data.sessionSnapshot.w2Count).toBe(1);
  });

  it("14. Admin can update lead status and assign a professional with audit log", async () => {
    const { session } = await setupCalculatedSession(USER_A);

    const postRes = await createLeadApi(
      createMockRequest("http://localhost:3000/api/v1/professional-leads", {
        token: USER_A,
        body: {
          sessionId: session.id,
          taxpayerName: "Alice Taxpayer",
          email: "alice@example.com",
          consentGiven: true,
        },
      })
    );
    const lead = (await postRes.json()).data;

    // Admin assigns professional and transitions status to assigned
    const patchReq = createMockRequest(`http://localhost:3000/api/v1/admin/leads/${lead.id}`, {
      method: "PATCH",
      token: ADMIN_USER,
      body: {
        status: "assigned",
        assignedProfessionalId: "PRO-CPA-99",
        assignedProfessionalName: "Sarah Jenkins, CPA",
        note: "Assigned to Sarah Jenkins for initial document triage.",
      },
    });

    const patchRes = await adminUpdateLeadApi(patchReq, { params: { id: lead.id } });
    expect(patchRes.status).toBe(200);
    const patchJson = await patchRes.json();
    expect(patchJson.data.status).toBe("assigned");
    expect(patchJson.data.assignedProfessionalName).toBe("Sarah Jenkins, CPA");
    expect(patchJson.data.assignedProfessionalId).toBe("PRO-CPA-99");
    expect(patchJson.data.internalNotes.length).toBe(1);

    // Verify audit log recorded admin assignment
    const logs = await AuditLogStore.list();
    const assignmentLog = logs.find((l) => l.action === "admin_assigned_professional");
    expect(assignmentLog).toBeDefined();
    expect(assignmentLog?.targetId).toBe(lead.id);
  });

  /* ========================================================================= */
  /* 5. HUMAN ESCALATION / SUPPORT TICKET INTEGRATION                          */
  /* ========================================================================= */

  it("15. Human Escalation: Support ticket linked to preparation session records safe context and audit log", async () => {
    const { session, calcId } = await setupCalculatedSession(USER_A);

    const req = createMockRequest("http://localhost:3000/api/v1/support/tickets", {
      token: USER_A,
      body: {
        subject: "Tax question regarding preparation session",
        category: "TAX_CALCULATION",
        priority: "NORMAL",
        description: "I need help understanding whether my 1099 mileage deduction was applied properly.",
        safeContext: {
          sessionId: session.id,
          calculationId: calcId,
          taxYear: 2025,
          filingStatus: "single",
        },
      },
    });

    const res = await createSupportTicketApi(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.ticketNumber).toMatch(/^TAH-/);
    expect(json.data.safeContext.sessionId).toBe(session.id);
    expect(json.data.safeContext.calculationId).toBe(calcId);

    // Verify audit log recorded support escalation
    const logs = await AuditLogStore.list();
    const supportLog = logs.find((l) => l.action === "support_escalation_created");
    expect(supportLog).toBeDefined();
    expect(supportLog?.targetId).toBe(json.data.id);
    expect(supportLog?.metadata?.hasSessionId).toBe(true);
  });

  /* ========================================================================= */
  /* 6. SENSITIVE DATA PROTECTION IN AUDIT LOGS & LEADS                       */
  /* ========================================================================= */

  it("16. Sensitive data protection: No SSNs or passwords ever stored in lead or audit log", async () => {
    const { session } = await setupCalculatedSession(USER_A);

    await createLeadApi(
      createMockRequest("http://localhost:3000/api/v1/professional-leads", {
        token: USER_A,
        body: {
          sessionId: session.id,
          taxpayerName: "Alice Taxpayer",
          email: "alice@example.com",
          consentGiven: true,
        },
      })
    );

    const logs = await AuditLogStore.list();
    const logString = JSON.stringify(logs);

    expect(logString).not.toContain("password");
    expect(logString).not.toContain("secret");
    expect(logString).not.toContain("ssn");
  });
});
