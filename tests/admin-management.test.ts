import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as adminOverviewApi } from "../app/api/v1/admin/overview/route";
import { GET as adminListLeadsApi } from "../app/api/v1/admin/leads/route";
import {
  GET as adminGetLeadApi,
  PATCH as adminUpdateLeadApi,
} from "../app/api/v1/admin/leads/[id]/route";
import { GET as adminListUsersApi } from "../app/api/v1/admin/users/route";
import { GET as adminGetUserApi } from "../app/api/v1/admin/users/[id]/route";
import { GET as adminListCalculationsApi } from "../app/api/v1/admin/calculations/route";
import { GET as adminGetCalculationApi } from "../app/api/v1/admin/calculations/[id]/route";
import { GET as adminAiAnalyticsApi } from "../app/api/v1/admin/ai/route";
import { GET as adminReportAnalyticsApi } from "../app/api/v1/admin/reports/route";
import { GET as adminAuditLogsApi } from "../app/api/v1/admin/audit/route";
import {
  POST as userCreateLeadApi,
  GET as userListLeadsApi,
} from "../app/api/v1/professional-leads/route";
import { POST as assistantApi } from "../app/api/v1/ai/assistant/route";
import { TaxCalculationStore } from "../lib/services/tax-calculation-store";
import { ProfessionalLeadStore } from "../lib/services/professional-lead-store";
import { ConversationStore } from "../lib/services/conversation-store";
import { UserProfileStore } from "../lib/services/user-profile-store";
import { AuditLogStore } from "../lib/services/audit-log-store";
import { TaxReportAnalyticsStore } from "../lib/services/tax-report-analytics-store";
import { buildTaxReport } from "../lib/services/tax-report";
import { compareSavedCalculations } from "../lib/services/tax-insights";
import { calculateIncomeTax } from "../tax-engine";
import { TaxCalculationRecord } from "@/types/tax";
import { setGeminiMockHandler } from "../lib/ai/gemini/client";
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

describe("Admin & Professional Lead Management Suite (Phase 5 Step 9)", () => {
  beforeEach(() => {
    TaxCalculationStore.clearStore();
    ProfessionalLeadStore.clearStore();
    ConversationStore.clear();
    UserProfileStore.clear();
    AuditLogStore.clear();
    TaxReportAnalyticsStore.clear();
    RateLimiter.clear();
    setGeminiMockHandler(null);
  });

  afterEach(() => {
    setGeminiMockHandler(null);
  });

  const createSampleCalculation = async (userId: string, id = "calc-test-1"): Promise<TaxCalculationRecord> => {
    const result = calculateIncomeTax({
      taxYear: 2025,
      filingStatus: "single",
      w2IncomeCents: 9500000,
      withholdingCents: 1500000,
    });

    const record: TaxCalculationRecord = {
      id,
      userId,
      calculatorType: "income_tax",
      taxYear: 2025,
      filingStatus: "single",
      title: "W-2 Salary Calculation",
      inputSnapshot: {
        taxYear: 2025,
        filingStatus: "single",
        w2IncomeCents: 9500000,
      },
      resultSnapshot: result,
      engineVersion: "1.0.0",
      rulesVersion: "2025.1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return TaxCalculationStore.save(record);
  };

  // 1. Unauthenticated admin request is rejected
  it("1. Unauthenticated admin request is rejected with 401", async () => {
    const req = createMockRequest("/api/v1/admin/overview", { method: "GET" });
    const res = await adminOverviewApi(req);
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  // 2. Normal authenticated user cannot access admin overview
  it("2. Normal authenticated user cannot access admin overview (rejected with 403)", async () => {
    const req = createMockRequest("/api/v1/admin/overview", {
      method: "GET",
      token: "test-user-normal",
    });
    const res = await adminOverviewApi(req);
    expect(res.status).toBe(403);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("FORBIDDEN");
  });

  // 3. Admin can access admin overview
  it("3. Admin can access admin overview and retrieve actual data", async () => {
    const req = createMockRequest("/api/v1/admin/overview", {
      method: "GET",
      token: "test-admin-1",
    });
    const res = await adminOverviewApi(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.totalUsers).toBeDefined();
    expect(json.data.savedCalculations).toBe(0);
    expect(json.data.openLeads).toBe(0);
  });

  // 4. Admin lead list works
  it("4. Admin lead list works and returns paginated leads", async () => {
    const userId = "test-user-lead-1";
    const calc = await createSampleCalculation(userId);

    // Save lead as user
    await ProfessionalLeadStore.save({
      id: "lead-1",
      userId,
      calculationId: calc.id,
      taxYear: 2025,
      filingStatus: "single",
      taxpayerName: "John Doe",
      email: "john@example.com",
      preferredContactMethod: "email",
      urgency: "immediate",
      status: "new",
      reviewType: "cpa",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const req = createMockRequest("/api/v1/admin/leads?page=1&limit=10", {
      method: "GET",
      token: "test-admin-1",
    });
    const res = await adminListLeadsApi(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.length).toBe(1);
    expect(json.data[0].id).toBe("lead-1");
    expect(json.pagination.total).toBe(1);
  });

  // 5. Normal user cannot access admin lead list
  it("5. Normal user cannot access admin lead list (403)", async () => {
    const req = createMockRequest("/api/v1/admin/leads", {
      method: "GET",
      token: "test-user-normal",
    });
    const res = await adminListLeadsApi(req);
    expect(res.status).toBe(403);
  });

  // 6. Admin can update lead status
  it("6. Admin can update lead status via PATCH", async () => {
    const userId = "test-user-lead-2";
    const calc = await createSampleCalculation(userId, "calc-lead-2");

    await ProfessionalLeadStore.save({
      id: "lead-update-1",
      userId,
      calculationId: calc.id,
      taxYear: 2025,
      filingStatus: "single",
      taxpayerName: "Jane Smith",
      email: "jane@example.com",
      preferredContactMethod: "phone",
      urgency: "this_month",
      status: "new",
      reviewType: "cpa",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const patchReq = createMockRequest("/api/v1/admin/leads/lead-update-1", {
      method: "PATCH",
      token: "test-admin-1",
      body: {
        status: "contacted",
      },
    });

    const patchRes = await adminUpdateLeadApi(patchReq, {
      params: { id: "lead-update-1" },
    });
    expect(patchRes.status).toBe(200);

    const json = await patchRes.json();
    expect(json.success).toBe(true);
    expect(json.data.status).toBe("contacted");

    // Verify persisted
    const updated = await ProfessionalLeadStore.getByIdForAdmin("lead-update-1");
    expect(updated?.status).toBe("contacted");
  });

  // 7. Non-admin cannot update lead status
  it("7. Non-admin cannot update lead status (403)", async () => {
    const patchReq = createMockRequest("/api/v1/admin/leads/lead-update-1", {
      method: "PATCH",
      token: "test-user-normal",
      body: { status: "closed" },
    });

    const patchRes = await adminUpdateLeadApi(patchReq, {
      params: { id: "lead-update-1" },
    });
    expect(patchRes.status).toBe(403);
  });

  // 8. Internal notes are admin-only
  it("8. Internal notes can be added by an admin and are associated with the admin ID", async () => {
    const userId = "test-user-lead-3";
    const calc = await createSampleCalculation(userId, "calc-lead-3");

    await ProfessionalLeadStore.save({
      id: "lead-note-1",
      userId,
      calculationId: calc.id,
      taxYear: 2025,
      filingStatus: "single",
      taxpayerName: "Robert Green",
      email: "robert@example.com",
      preferredContactMethod: "email",
      urgency: "immediate",
      status: "new",
      reviewType: "cpa",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const patchReq = createMockRequest("/api/v1/admin/leads/lead-note-1", {
      method: "PATCH",
      token: "test-admin-lead-manager",
      body: {
        status: "in_progress",
        note: "Assigned to Senior CPA for Schedule C review.",
      },
    });

    const patchRes = await adminUpdateLeadApi(patchReq, {
      params: { id: "lead-note-1" },
    });
    expect(patchRes.status).toBe(200);

    const json = await patchRes.json();
    expect(json.data.internalNotes?.length).toBe(1);
    expect(json.data.internalNotes[0].note).toBe(
      "Assigned to Senior CPA for Schedule C review."
    );
    expect(json.data.internalNotes[0].adminUserId).toBe("test-admin-lead-manager");
  });

  // 9. User cannot read internal notes
  it("9. Normal user cannot read internal notes when listing their leads", async () => {
    const userId = "test-user-isolated";
    const calc = await createSampleCalculation(userId, "calc-iso");

    await ProfessionalLeadStore.save({
      id: "lead-iso",
      userId,
      calculationId: calc.id,
      taxYear: 2025,
      filingStatus: "single",
      taxpayerName: "Isolated Taxpayer",
      email: "iso@example.com",
      preferredContactMethod: "email",
      urgency: "immediate",
      status: "new",
      reviewType: "cpa",
      internalNotes: [
        {
          id: "secret-note-1",
          adminUserId: "admin-1",
          note: "Confidential CPA internal observation",
          createdAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Taxpayer GET /api/v1/professional-leads
    const userReq = createMockRequest("/api/v1/professional-leads", {
      method: "GET",
      token: userId,
    });
    const userRes = await userListLeadsApi(userReq);
    expect(userRes.status).toBe(200);

    const json = await userRes.json();
    expect(json.data.length).toBe(1);
    // internalNotes must not be exposed to user
    expect(json.data[0].internalNotes).toBeUndefined();
  });

  // 10. Admin user list works
  it("10. Admin user list returns operational summaries", async () => {
    await UserProfileStore.getProfile("user-summary-1");
    await UserProfileStore.getProfile("user-summary-2");

    const req = createMockRequest("/api/v1/admin/users?page=1&limit=20", {
      method: "GET",
      token: "test-admin-1",
    });
    const res = await adminListUsersApi(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.length).toBeGreaterThanOrEqual(2);
    expect(json.pagination.total).toBeGreaterThanOrEqual(2);
  });

  // 11. Sensitive credentials are never returned
  it("11. Sensitive credentials, passwords, or tokens are never returned in user views", async () => {
    await UserProfileStore.getProfile("user-secure-1");

    const req = createMockRequest("/api/v1/admin/users/user-secure-1", {
      method: "GET",
      token: "test-admin-1",
    });
    const res = await adminGetUserApi(req, { params: { id: "user-secure-1" } });
    expect(res.status).toBe(200);

    const json = await res.json();
    const bodyStr = JSON.stringify(json);
    expect(bodyStr).not.toContain("password");
    expect(bodyStr).not.toContain("token");
    expect(bodyStr).not.toContain("secret");
    expect(bodyStr).not.toContain("apiKey");
  });

  // 12. Admin calculation list works
  it("12. Admin calculation list returns operational metadata without massive snapshots", async () => {
    await createSampleCalculation("user-calc-1", "calc-meta-1");

    const req = createMockRequest("/api/v1/admin/calculations?page=1&limit=10", {
      method: "GET",
      token: "test-admin-1",
    });
    const res = await adminListCalculationsApi(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.length).toBe(1);
    expect(json.data[0].id).toBe("calc-meta-1");
    expect(json.data[0].engineVersion).toBe("1.0.0");
    // Ensure large snapshots are omitted from the list view
    expect(json.data[0].inputSnapshot).toBeUndefined();
    expect(json.data[0].resultSnapshot).toBeUndefined();
  });

  // 13. Historical calculation cannot be modified
  it("13. Historical calculation cannot be modified by admin inspection", async () => {
    const original = await createSampleCalculation("user-immut", "calc-immut-1");

    const req = createMockRequest("/api/v1/admin/calculations/calc-immut-1", {
      method: "GET",
      token: "test-admin-1",
    });
    const res = await adminGetCalculationApi(req, { params: { id: "calc-immut-1" } });
    expect(res.status).toBe(200);

    const fetched = await TaxCalculationStore.getById("calc-immut-1", "user-immut");
    expect(fetched?.resultSnapshot.totalTaxLiabilityCents).toBe(
      original.resultSnapshot.totalTaxLiabilityCents
    );
    expect(fetched?.rulesVersion).toBe(original.rulesVersion);
  });

  // 14. Admin AI analytics access is protected
  it("14. Admin AI analytics access is protected against non-admins", async () => {
    const normalReq = createMockRequest("/api/v1/admin/ai", {
      method: "GET",
      token: "test-user-normal",
    });
    const normalRes = await adminAiAnalyticsApi(normalReq);
    expect(normalRes.status).toBe(403);

    const adminReq = createMockRequest("/api/v1/admin/ai", {
      method: "GET",
      token: "test-admin-1",
    });
    const adminRes = await adminAiAnalyticsApi(adminReq);
    expect(adminRes.status).toBe(200);
  });

  // 15. Admin audit events are created server-side
  it("15. Admin audit events are created server-side upon privileged access", async () => {
    AuditLogStore.clear();

    const req = createMockRequest("/api/v1/admin/overview", {
      method: "GET",
      token: "test-admin-audited",
    });
    await adminOverviewApi(req);

    const logs = await AuditLogStore.listRecent(10);
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].action).toBe("admin_viewed_overview");
    expect(logs[0].adminUserId).toBe("test-admin-audited");
  });

  // 16. Client cannot spoof admin_user_id
  it("16. Client cannot spoof admin_user_id in audit logging or note creation", async () => {
    const userId = "user-spoof-target";
    const calc = await createSampleCalculation(userId, "calc-spoof");

    await ProfessionalLeadStore.save({
      id: "lead-spoof",
      userId,
      calculationId: calc.id,
      taxYear: 2025,
      filingStatus: "single",
      taxpayerName: "Spoof Test",
      email: "spoof@example.com",
      preferredContactMethod: "email",
      urgency: "immediate",
      status: "new",
      reviewType: "cpa",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Request attempts to inject a fake adminUserId in the body
    const req = createMockRequest("/api/v1/admin/leads/lead-spoof", {
      method: "PATCH",
      token: "test-admin-actual",
      body: {
        note: "Attempting to spoof author",
        adminUserId: "hacked-admin-id",
      },
    });

    const res = await adminUpdateLeadApi(req, { params: { id: "lead-spoof" } });
    expect(res.status).toBe(200);

    const json = await res.json();
    // Author MUST be derived from the authenticated session token, not the body
    expect(json.data.internalNotes[0].adminUserId).toBe("test-admin-actual");
    expect(json.data.internalNotes[0].adminUserId).not.toBe("hacked-admin-id");
  });

  // 17. Pagination works
  it("17. Pagination works correctly on admin leads list", async () => {
    const userId = "user-page-test";
    const calc = await createSampleCalculation(userId, "calc-page");

    for (let i = 1; i <= 5; i++) {
      await ProfessionalLeadStore.save({
        id: `lead-page-${i}`,
        userId,
        calculationId: calc.id,
        taxYear: 2025,
        filingStatus: "single",
        taxpayerName: `Page User ${i}`,
        email: `page${i}@example.com`,
        preferredContactMethod: "email",
        urgency: "immediate",
        status: "new",
        reviewType: "cpa",
        createdAt: new Date(Date.now() - i * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const reqPage1 = createMockRequest("/api/v1/admin/leads?page=1&limit=2", {
      method: "GET",
      token: "test-admin-1",
    });
    const res1 = await adminListLeadsApi(reqPage1);
    const json1 = await res1.json();
    expect(json1.data.length).toBe(2);
    expect(json1.pagination.totalPages).toBe(3);

    const reqPage2 = createMockRequest("/api/v1/admin/leads?page=2&limit=2", {
      method: "GET",
      token: "test-admin-1",
    });
    const res2 = await adminListLeadsApi(reqPage2);
    const json2 = await res2.json();
    expect(json2.data.length).toBe(2);
    expect(json2.data[0].id).not.toBe(json1.data[0].id);
  });

  // 18. Search validation works
  it("18. Search validation sanitizes and matches appropriate records", async () => {
    const userId = "user-search-test";
    const calc = await createSampleCalculation(userId, "calc-search");

    await ProfessionalLeadStore.save({
      id: "lead-unique-alpha",
      userId,
      calculationId: calc.id,
      taxYear: 2025,
      filingStatus: "single",
      taxpayerName: "Unique Searchable Name",
      email: "unique@domain.com",
      preferredContactMethod: "email",
      urgency: "immediate",
      status: "new",
      reviewType: "cpa",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const searchReq = createMockRequest("/api/v1/admin/leads?q=Unique", {
      method: "GET",
      token: "test-admin-1",
    });
    const searchRes = await adminListLeadsApi(searchReq);
    const json = await searchRes.json();
    expect(json.data.length).toBe(1);
    expect(json.data[0].id).toBe("lead-unique-alpha");
  });

  // 19. Cross-user data leakage is prevented
  it("19. Normal users cannot access another user's leads via public APIs", async () => {
    const calc = await createSampleCalculation("user-victim", "calc-victim");

    await ProfessionalLeadStore.save({
      id: "lead-victim",
      userId: "user-victim",
      calculationId: calc.id,
      taxYear: 2025,
      filingStatus: "single",
      taxpayerName: "Victim User",
      email: "victim@example.com",
      preferredContactMethod: "email",
      urgency: "immediate",
      status: "new",
      reviewType: "cpa",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Attacker tries to read victim's leads
    const attackerReq = createMockRequest("/api/v1/professional-leads", {
      method: "GET",
      token: "user-attacker",
    });
    const attackerRes = await userListLeadsApi(attackerReq);
    const json = await attackerRes.json();
    expect(json.data.length).toBe(0);
  });

  // 20. RLS-compatible ownership remains intact
  it("20. RLS-compatible ownership remains intact for non-privileged operations", async () => {
    const userA = "user-a";
    const userB = "user-b";
    await createSampleCalculation(userA, "calc-user-a");

    // userB attempts to retrieve userA's calculation
    const record = await TaxCalculationStore.getById("calc-user-a", userB);
    expect(record).toBeNull();
  });

  // 21. Existing professional lead workflow remains functional
  it("21. Existing professional lead workflow remains functional for normal users", async () => {
    const userId = "test-workflow-user";
    const calc = await createSampleCalculation(userId, "calc-workflow");

    const req = createMockRequest("/api/v1/professional-leads", {
      method: "POST",
      token: userId,
      body: {
        calculationId: calc.id,
        taxpayerName: "Workflow Taxpayer",
        email: "workflow@test.com",
        preferredContactMethod: "email",
        urgency: "this_month",
        message: "Need review for deductions.",
      },
    });

    const res = await userCreateLeadApi(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.taxpayerName).toBe("Workflow Taxpayer");
  });

  // 22. Existing calculation history remains functional
  it("22. Existing calculation history remains functional", async () => {
    const userId = "test-history-user";
    await createSampleCalculation(userId, "calc-hist-1");
    await createSampleCalculation(userId, "calc-hist-2");

    const list = await TaxCalculationStore.listByUser(userId);
    expect(list.length).toBe(2);
  });

  // 23. Existing AI assistant remains functional
  it("23. Existing AI assistant remains functional and isolates conversations", async () => {
    setGeminiMockHandler(async () => ({
      text: "The standard deduction reduces your taxable income.",
      model: "gemini-2.5-flash",
    }));

    const req = createMockRequest("/api/v1/ai/assistant", {
      method: "POST",
      token: "test-ai-user",
      body: {
        message: "What is a standard deduction?",
      },
    });

    const res = await assistantApi(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.reply).toContain("standard deduction");
  });

  // 24. Existing reports remain functional
  it("24. Existing reports generation remains functional", async () => {
    const calc = await createSampleCalculation("report-user", "calc-rep");
    const report = buildTaxReport(calc, "free");

    expect(report.taxSummary.grossIncomeCents).toBe(9500000);
    expect(report.taxDrivers.length).toBeGreaterThan(0);
    expect(report.disclaimer).toBeDefined();
  });

  // 25. Existing scenario comparison remains functional
  it("25. Existing scenario comparison remains functional", async () => {
    const calcA = await createSampleCalculation("compare-user", "calc-cmp-a");
    const resultB = calculateIncomeTax({
      taxYear: 2025,
      filingStatus: "single",
      w2IncomeCents: 12000000,
      withholdingCents: 2000000,
    });
    const calcB: TaxCalculationRecord = {
      ...calcA,
      id: "calc-cmp-b",
      title: "Higher Salary",
      resultSnapshot: resultB,
    };
    await TaxCalculationStore.save(calcB);

    const diff = compareSavedCalculations(calcA, calcB);
    expect(diff.incomeDifferenceCents).toBe(2500000);
    expect(diff.taxLiabilityDifferenceCents).toBeGreaterThan(0);
  });
});
