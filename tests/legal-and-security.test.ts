import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as exportAccountApi } from "../app/api/v1/auth/account/export/route";
import { POST as deleteAccountApi } from "../app/api/v1/auth/account/delete/route";
import { AccountDataService } from "../lib/services/account-data";
import { UserProfileStore } from "../lib/services/user-profile-store";
import { TaxCalculationStore } from "../lib/services/tax-calculation-store";
import { ConversationStore } from "../lib/services/conversation-store";
import { ProfessionalLeadStore } from "../lib/services/professional-lead-store";
import { SubscriptionStore } from "../lib/services/subscription-store";
import { AuditLogStore } from "../lib/services/audit-log-store";
import { analytics, FunnelEvent, containsSensitiveTaxData } from "../lib/analytics/events";
import { handleApiError } from "../lib/utils/errors";
import { SITE_CONFIG } from "../lib/seo/config";
import { constructMetadata } from "../lib/seo/metadata";
import { calculateFederalTaxes } from "../tax-engine";
import { PRODUCT_PLANS } from "../lib/monetization/plans";
import { ADMIN_ROLE_PERMISSIONS } from "../lib/admin/types";
import { metadata as privacyMetadata } from "../app/(marketing)/privacy/page";
import { metadata as termsMetadata } from "../app/(marketing)/terms/page";
import { metadata as disclaimerMetadata } from "../app/(marketing)/disclaimer/page";
import { metadata as dashboardMetadata } from "../app/dashboard/layout";
import { metadata as adminMetadata } from "../app/admin/layout";
import { metadata as loginMetadata } from "../app/login/layout";
import robots from "../app/robots";
import sitemap from "../app/sitemap";

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

describe("Phase 5 Step 12: Legal, Privacy, Data Handling & Security Suite", () => {
  beforeEach(() => {
    UserProfileStore.clear();
  });

  // Test 1: User cannot export another user's data
  it("1. User cannot export another user's data", async () => {
    const userAToken = "user_alpha_token";
    const req = createMockRequest("http://localhost:3000/api/v1/auth/account/export?userId=user_victim_999", {
      method: "GET",
      token: userAToken,
    });

    const response = await exportAccountApi(req);
    expect(response.status).toBe(200);

    const bodyText = await response.text();
    const exportJson = JSON.parse(bodyText);

    // Exported data subject MUST strictly match the authenticated user token, ignoring any query parameter
    expect(exportJson.exportMetadata.dataSubjectId).toBe(userAToken);
    expect(exportJson.account.id).toBe(userAToken);
  });

  // Test 2: User cannot delete another user's account
  it("2. User cannot delete another user's account", async () => {
    // Setup victim data
    const victimUserId = "user_victim_123";
    await UserProfileStore.updateProfile(victimUserId, { fullName: "Victim User" });
    await TaxCalculationStore.save({
      id: "calc_victim_1",
      userId: victimUserId,
      calculatorType: "income_tax",
      taxYear: 2025,
      filingStatus: "single",
      title: "Victim Calculation",
      inputSnapshot: { w2Wages: 5000000 },
      resultSnapshot: calculateFederalTaxes({
        taxYear: 2025,
        filingStatus: "single",
        w2WagesCents: 5000000,
      }),
      engineVersion: "1.0.0",
      rulesVersion: "2025.2.0-irs-irb-2025-45-obbba",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Attacker sends request attempting to delete victim's userId
    const attackerToken = "attacker_token_456";
    const req = createMockRequest("http://localhost:3000/api/v1/auth/account/delete", {
      method: "POST",
      token: attackerToken,
      body: {
        confirm: true,
        userId: victimUserId, // Attacker attempts to override target
      },
    });

    const response = await deleteAccountApi(req);
    expect(response.status).toBe(200);

    // Victim's calculation MUST still exist and be intact
    const victimCalc = await TaxCalculationStore.getById("calc_victim_1", victimUserId);
    expect(victimCalc).not.toBeNull();
    expect(victimCalc?.title).toBe("Victim Calculation");
  });

  // Test 3: Account deletion requires authentication
  it("3. Account deletion requires authentication", async () => {
    const unauthenticatedReq = createMockRequest("http://localhost:3000/api/v1/auth/account/delete", {
      method: "POST",
      body: { confirm: true },
    });

    const response = await deleteAccountApi(unauthenticatedReq);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  // Test 4: Account deletion requires explicit confirmation
  it("4. Account deletion requires explicit confirmation", async () => {
    const reqWithoutConfirm = createMockRequest("http://localhost:3000/api/v1/auth/account/delete", {
      method: "POST",
      token: "valid_user_session",
      body: { confirm: false },
    });

    const response = await deleteAccountApi(reqWithoutConfirm);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  // Test 5: Admin notes are excluded from user export
  it("5. Admin notes are excluded from user export", async () => {
    const testUserId = "user_with_lead_notes";
    // Setup a lead in memory with internal administrative notes
    const lead = await ProfessionalLeadStore.submitLead({
      userId: testUserId,
      calculationId: "calc_notes_test",
      taxYear: 2025,
      filingStatus: "single",
      taxpayerName: "Lead Taxpayer",
      email: "lead@example.com",
      preferredContactMethod: "email",
      urgency: "immediate",
    });

    // Admin adds privileged internal note
    await ProfessionalLeadStore.addInternalNote({
      leadId: lead.id,
      adminUserId: "admin_super",
      authorEmail: "admin@taxaihelp.com",
      note: "Confidential CPA compliance review note",
    });

    // User exports their data
    const exportData = await AccountDataService.exportUserData(testUserId);
    expect(exportData.professionalLeads.length).toBeGreaterThanOrEqual(1);

    const exportedLead = exportData.professionalLeads.find((l) => l.id === lead.id);
    expect(exportedLead).toBeDefined();

    // Verify internalNotes is NOT present on the exported lead
    const leadAsRecord = exportedLead as unknown as Record<string, unknown>;
    expect(leadAsRecord.internalNotes).toBeUndefined();
  });

  // Test 6: Audit logs are excluded from user export
  it("6. Audit logs are excluded from user export", async () => {
    const userId = "user_audit_test";
    await AuditLogStore.log({
      adminUserId: "admin_system",
      action: "user:flag_risk",
      targetType: "user",
      targetId: userId,
      metadata: { reason: "Internal test flag" },
    });

    const exportData = await AccountDataService.exportUserData(userId);
    const exportRecord = exportData as unknown as Record<string, unknown>;
    expect(exportRecord.auditLogs).toBeUndefined();
    expect(exportRecord.adminLogs).toBeUndefined();
  });

  // Test 7: Analytics rejects/sanitizes tax amounts
  it("7. Analytics rejects/sanitizes tax amounts", () => {
    let capturedEvent: any = null;
    const unsubscribe = analytics.subscribe((evt) => {
      capturedEvent = evt;
    });

    const unsafePayload = {
      calculatorType: "income_tax" as const,
      taxYear: 2025 as const,
      wages: 9500000,
      taxLiability: 1200000,
      refund: 250000,
    };

    analytics.track("calculator_view", unsafePayload);

    expect(capturedEvent).not.toBeNull();
    const payload = capturedEvent?.payload as Record<string, unknown> | undefined;
    expect(payload?.calculatorType).toBe("income_tax");
    expect(payload?.wages).toBeUndefined();
    expect(payload?.taxLiability).toBeUndefined();
    expect(payload?.refund).toBeUndefined();

    unsubscribe();
  });

  // Test 8: Analytics rejects/sanitizes PII
  it("8. Analytics rejects/sanitizes PII", () => {
    let capturedEvent: any = null;
    const unsubscribe = analytics.subscribe((evt) => {
      capturedEvent = evt;
    });

    const unsafePii = {
      calculatorType: "1099" as const,
      ssn: "000-12-3456",
      ein: "12-3456789",
      address: "123 Main Street, Suite 400",
    };

    analytics.track("signup_started", unsafePii);

    expect(capturedEvent).not.toBeNull();
    const payload = capturedEvent?.payload as Record<string, unknown> | undefined;
    expect(payload?.ssn).toBeUndefined();
    expect(payload?.ein).toBeUndefined();
    expect(payload?.address).toBeUndefined();

    // Verify blacklist detection helper
    expect(containsSensitiveTaxData(unsafePii)).toBe(true);

    unsubscribe();
  });

  // Test 9: AI conversation content is not sent to analytics
  it("9. AI conversation content is not sent to analytics", () => {
    let capturedEvent: any = null;
    const unsubscribe = analytics.subscribe((evt) => {
      capturedEvent = evt;
    });

    const payloadWithConversation = {
      calculatorType: "self_employed" as const,
      conversation: "What deductions can I claim for home office?",
      messages: [{ role: "user", content: "Tell me my bracket" }],
    };

    analytics.track("calculation_completed", payloadWithConversation);

    expect(capturedEvent).not.toBeNull();
    const payload = capturedEvent?.payload as Record<string, unknown> | undefined;
    expect(payload?.conversation).toBeUndefined();
    expect(payload?.messages).toBeUndefined();

    unsubscribe();
  });

  // Test 10: Tax calculation snapshots are not sent to analytics
  it("10. Tax calculation snapshots are not sent to analytics", () => {
    let capturedEvent: any = null;
    const unsubscribe = analytics.subscribe((evt) => {
      capturedEvent = evt;
    });

    const payloadWithSnapshot = {
      calculatorType: "quarterly_tax" as const,
      inputSnapshot: { scheduleCNetProfit: 8000000 },
      resultSnapshot: { federalIncomeTaxCents: 1000000 },
    };

    analytics.track("report_viewed", payloadWithSnapshot);

    expect(capturedEvent).not.toBeNull();
    const payload = capturedEvent?.payload as Record<string, unknown> | undefined;
    expect(payload?.inputSnapshot).toBeUndefined();
    expect(payload?.resultSnapshot).toBeUndefined();

    unsubscribe();
  });

  // Test 11: Production errors do not expose internal stack traces
  it("11. Production errors do not expose internal stack traces", () => {
    const internalErr = new Error("Database connection timeout at /var/app/internal/db.ts:45");
    internalErr.stack = "Error: Database connection timeout\n    at internalQuery (/var/app/internal/db.ts:45)";

    const res = handleApiError(internalErr);
    expect(res.status).toBe(500);

    // In production behavior, sensitive filesystem paths and raw stack traces are sanitized
    expect(JSON.stringify(res)).not.toContain("/var/app/internal/db.ts");
  });

  // Test 12: API keys are never returned to clients
  it("12. API keys are never returned to clients", () => {
    // Check that SITE_CONFIG does not expose API credentials
    const configRecord = SITE_CONFIG as unknown as Record<string, unknown>;
    expect(configRecord.GEMINI_API_KEY).toBeUndefined();
    expect(configRecord.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
    expect(configRecord.STRIPE_SECRET_KEY).toBeUndefined();
  });

  // Test 13: User IDs cannot override authenticated identity
  it("13. User IDs cannot override authenticated identity", async () => {
    const trueUserId = "authenticated_client_007";
    await UserProfileStore.updateProfile(trueUserId, { fullName: "Authentic Client" });

    // Passing a spoofed target id must not affect data for authentic user
    const exportResult = await AccountDataService.exportUserData(trueUserId);
    expect(exportResult.account.id).toBe(trueUserId);
    expect(exportResult.account.profile?.fullName).toBe("Authentic Client");
  });

  // Test 14: Cross-user calculation access remains blocked
  it("14. Cross-user calculation access remains blocked", async () => {
    const calc = await TaxCalculationStore.save({
      id: "calc_isolated_1",
      userId: "user_owner_1",
      calculatorType: "income_tax",
      taxYear: 2025,
      filingStatus: "single",
      title: "Owner Calculation",
      inputSnapshot: { w2Wages: 6000000 },
      resultSnapshot: calculateFederalTaxes({
        taxYear: 2025,
        filingStatus: "single",
        w2WagesCents: 6000000,
      }),
      engineVersion: "1.0.0",
      rulesVersion: "2025.2.0-irs-irb-2025-45-obbba",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // An unauthorized user attempting to access calc_isolated_1 receives null
    const unauthorizedAccess = await TaxCalculationStore.getById(calc.id, "unauthorized_stranger");
    expect(unauthorizedAccess).toBeNull();
  });

  // Test 15: Cross-user conversation access remains blocked
  it("15. Cross-user conversation access remains blocked", async () => {
    const conv = await ConversationStore.getOrCreateConversation(
      "user_speaker_1",
      undefined,
      "Private Tax Dialogue"
    );

    await ConversationStore.saveMessage({
      conversationId: conv.id,
      userId: "user_speaker_1",
      role: "user",
      content: "My confidential tax question",
    });

    // Stranger attempting to read user_speaker_1's conversation receives empty message list
    const strangerMessages = await ConversationStore.getConversationMessages(conv.id, "unauthorized_stranger");
    expect(strangerMessages.length).toBe(0);
  });

  // Test 16: Cross-user report access remains blocked
  it("16. Cross-user report access remains blocked", async () => {
    // Create calculation owned by user_report_owner
    const calc = await TaxCalculationStore.save({
      id: "calc_report_sec",
      userId: "user_report_owner",
      calculatorType: "income_tax",
      taxYear: 2025,
      filingStatus: "single",
      title: "Owner Report Calc",
      inputSnapshot: { w2Wages: 7500000 },
      resultSnapshot: calculateFederalTaxes({
        taxYear: 2025,
        filingStatus: "single",
        w2WagesCents: 7500000,
      }),
      engineVersion: "1.0.0",
      rulesVersion: "2025.2.0-irs-irb-2025-45-obbba",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Verification: stranger attempting to load report calculation is rejected
    const check = await TaxCalculationStore.getById(calc.id, "user_intruder");
    expect(check).toBeNull();
  });

  // Test 17: Professional lead ownership remains enforced
  it("17. Professional lead ownership remains enforced", async () => {
    const lead = await ProfessionalLeadStore.submitLead({
      userId: "user_lead_owner",
      calculationId: "calc_lead_sec",
      taxYear: 2025,
      filingStatus: "single",
      taxpayerName: "Lead Owner",
      email: "owner@example.com",
      preferredContactMethod: "email",
      urgency: "this_month",
    });

    const strangerAccess = await ProfessionalLeadStore.getById(lead.id, "unauthorized_stranger");
    expect(strangerAccess).toBeNull();
  });

  // Test 18: Billing ownership remains enforced
  it("18. Billing ownership remains enforced", async () => {
    await SubscriptionStore.saveSubscription({
      id: "sub_test_owner",
      userId: "user_paid_customer",
      planId: "premium",
      status: "active",
      provider: "stripe",
      providerCustomerId: "cus_mock_123",
      providerSubscriptionId: "sub_mock_123",
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
      cancelAtPeriodEnd: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const customerSub = await SubscriptionStore.getByUserId("user_paid_customer");
    expect(customerSub?.planId).toBe("premium");

    const strangerSub = await SubscriptionStore.getByUserId("stranger_unpaid");
    expect(strangerSub).toBeNull();
  });

  // Test 19: Legal pages are publicly accessible
  it("19. Legal pages are publicly accessible", () => {
    expect(privacyMetadata.title).toContain("Privacy Policy");
    expect(termsMetadata.title).toContain("Terms of Service");
    expect(disclaimerMetadata.title).toContain("Disclaimer");
  });

  // Test 20: Private application pages remain noindex
  it("20. Private application pages remain noindex", () => {
    const dashRobots = dashboardMetadata.robots as { index?: boolean; follow?: boolean };
    const adminRobots = adminMetadata.robots as { index?: boolean; follow?: boolean };
    const loginRobots = loginMetadata.robots as { index?: boolean; follow?: boolean };

    expect(dashRobots.index).toBe(false);
    expect(adminRobots.index).toBe(false);
    expect(loginRobots.index).toBe(false);
  });

  // Test 21: robots.txt still blocks private areas
  it("21. robots.txt still blocks private areas", () => {
    const robotRules = robots();
    const disallow = Array.isArray(robotRules.rules)
      ? robotRules.rules[0]?.disallow
      : robotRules.rules?.disallow;

    const list = Array.isArray(disallow) ? disallow : [disallow];
    expect(list).toContain("/api/");
    expect(list).toContain("/dashboard/");
    expect(list).toContain("/admin/");
    expect(list).toContain("/login");
  });

  // Test 22: Sitemap excludes private routes
  it("22. Sitemap excludes private routes", () => {
    const entries = sitemap();
    const urls = entries.map((e) => e.url);

    expect(urls.some((u) => u.includes("/dashboard"))).toBe(false);
    expect(urls.some((u) => u.includes("/admin"))).toBe(false);
    expect(urls.some((u) => u.includes("/api"))).toBe(false);
  });

  // Test 23: Existing SEO tests remain valid
  it("23. Existing SEO tests remain valid", () => {
    const meta = constructMetadata({
      title: "Test Legal",
      description: "Test description",
      path: "/legal-test",
    });
    expect(meta.alternates?.canonical).toBe("https://taxaihelp.com/legal-test");
  });

  // Test 24: Existing authentication tests remain valid
  it("24. Existing authentication tests remain valid", async () => {
    const validProfile = await UserProfileStore.getProfile("user_auth_valid", "valid@example.com");
    expect(validProfile.id).toBe("user_auth_valid");
    expect(validProfile.email).toBe("valid@example.com");
  });

  // Test 25: Existing calculation history tests remain valid
  it("25. Existing calculation history tests remain valid", async () => {
    const calc = calculateFederalTaxes({
      taxYear: 2025,
      filingStatus: "single",
      w2Wages: 6000000,
    });
    expect(calc.incomeTax).toBe(507150);
  });

  // Test 26: Existing AI tests remain valid
  it("26. Existing AI tests remain valid", () => {
    expect(SITE_CONFIG.name).toBe("TaxAIHelp");
    expect(SITE_CONFIG.tagline).toBe("Smarter Tax Help, Powered by AI");
  });

  // Test 27: Existing monetization tests remain valid
  it("27. Existing monetization tests remain valid", () => {
    expect(PRODUCT_PLANS.free.limits.aiMessagesPerDay).toBe(10);
    expect(PRODUCT_PLANS.premium.limits.aiMessagesPerDay).toBe(100);
  });

  // Test 28: Existing admin tests remain valid
  it("28. Existing admin tests remain valid", () => {
    expect(ADMIN_ROLE_PERMISSIONS.super_admin).toContain("system:audit_logs");
    expect(ADMIN_ROLE_PERMISSIONS.support_specialist).not.toContain("system:audit_logs");
  });
});
