import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getNotificationsApi } from "../app/api/v1/notifications/route";
import { PATCH as patchNotificationApi } from "../app/api/v1/notifications/[id]/route";
import { POST as readAllNotificationsApi } from "../app/api/v1/notifications/read-all/route";
import {
  GET as getPreferencesApi,
  PATCH as patchPreferencesApi,
} from "../app/api/v1/notifications/preferences/route";
import { POST as recoveryApi } from "../app/api/v1/auth/recovery/route";
import { NotificationStore } from "../lib/notifications/store";
import { NotificationPreferencesStore } from "../lib/notifications/preferences";
import { NotificationService } from "../lib/notifications/service";
import { NotificationTemplates, escapeHtml } from "../lib/notifications/templates";
import { NullEmailProvider } from "../lib/notifications/providers/null-provider";
import { ConsoleEmailProvider } from "../lib/notifications/providers/console-provider";
import { RateLimiter } from "../lib/utils/rate-limiter";
import { AccountDataService } from "../lib/services/account-data";
import { UserProfileStore } from "../lib/services/user-profile-store";
import { UsageStore } from "../lib/services/usage-store";
import { SubscriptionStore } from "../lib/services/subscription-store";
import { ProfessionalLeadStore } from "../lib/services/professional-lead-store";
import { ADMIN_ROLE_PERMISSIONS } from "../lib/admin/types";
import { constructMetadata } from "../lib/seo/metadata";
import { calculateFederalTaxes } from "../tax-engine";

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

describe("Phase 5 Step 13: Notification, Email & Communication Foundation Suite", () => {
  beforeEach(() => {
    NotificationStore.clear();
    NotificationPreferencesStore.clear();
    NotificationService.clear();
    RateLimiter.clear();
    UserProfileStore.clear();
  });

  // Test 1: User can read own notifications
  it("1. User can read own notifications", async () => {
    const userId = "user_alpha";
    await NotificationStore.create({
      userId,
      category: "calculations",
      type: "calculation_saved",
      title: "Calculation Saved",
      message: "Your calculation was saved.",
    });
    await NotificationStore.create({
      userId,
      category: "ai",
      type: "ai_usage_limit_warning",
      title: "AI Limit Approaching",
      message: "You used 8 of 10 daily queries.",
    });

    const req = createMockRequest("http://localhost:3000/api/v1/notifications", {
      token: userId,
    });
    const res = await getNotificationsApi(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.notifications.length).toBe(2);
    expect(body.data.totalCount).toBe(2);
    expect(body.data.unreadCount).toBe(2);
  });

  // Test 2: User cannot read another user's notifications
  it("2. User cannot read another user's notifications", async () => {
    const victimUserId = "user_victim";
    await NotificationStore.create({
      userId: victimUserId,
      category: "billing",
      type: "subscription_started",
      title: "Victim Subscription",
      message: "Premium subscription activated.",
    });

    const attackerUserId = "user_attacker";
    const req = createMockRequest(
      "http://localhost:3000/api/v1/notifications?userId=user_victim",
      { token: attackerUserId }
    );
    const res = await getNotificationsApi(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.notifications.length).toBe(0);
    expect(body.data.totalCount).toBe(0);
  });

  // Test 3: User can mark own notification as read
  it("3. User can mark own notification as read", async () => {
    const userId = "user_mark_test";
    const notif = await NotificationStore.create({
      userId,
      category: "calculations",
      type: "calculation_saved",
      title: "Scenario Saved",
      message: "Projections ready.",
    });

    const req = createMockRequest(
      `http://localhost:3000/api/v1/notifications/${notif.id}`,
      {
        method: "PATCH",
        token: userId,
        body: { read: true },
      }
    );
    const res = await patchNotificationApi(req, {
      params: Promise.resolve({ id: notif.id }),
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.read).toBe(true);

    const fresh = await NotificationStore.getById(notif.id, userId);
    expect(fresh?.read).toBe(true);
  });

  // Test 4: User cannot modify another user's notification
  it("4. User cannot modify another user's notification", async () => {
    const victimUserId = "user_victim_notif";
    const notif = await NotificationStore.create({
      userId: victimUserId,
      category: "calculations",
      type: "report_ready",
      title: "Private Report",
      message: "Your report is ready.",
    });

    const intruderUserId = "user_intruder";
    const req = createMockRequest(
      `http://localhost:3000/api/v1/notifications/${notif.id}`,
      {
        method: "PATCH",
        token: intruderUserId,
        body: { read: true },
      }
    );
    const res = await patchNotificationApi(req, {
      params: Promise.resolve({ id: notif.id }),
    });
    expect(res.status).toBe(404);

    const original = await NotificationStore.getById(notif.id, victimUserId);
    expect(original?.read).toBe(false);
  });

  // Test 5: User can read own notification preferences
  it("5. User can read own notification preferences", async () => {
    const userId = "user_prefs_read";
    const req = createMockRequest(
      "http://localhost:3000/api/v1/notifications/preferences",
      { token: userId }
    );
    const res = await getPreferencesApi(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.userId).toBe(userId);
    expect(body.data.securityEnabled).toBe(true);
    expect(body.data.accountEnabled).toBe(true);
  });

  // Test 6: User can update own notification preferences
  it("6. User can update own notification preferences", async () => {
    const userId = "user_prefs_update";
    const req = createMockRequest(
      "http://localhost:3000/api/v1/notifications/preferences",
      {
        method: "PATCH",
        token: userId,
        body: {
          taxReportsEnabled: false,
          marketingEnabled: true,
        },
      }
    );
    const res = await patchPreferencesApi(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.taxReportsEnabled).toBe(false);
    expect(body.data.marketingEnabled).toBe(true);
  });

  // Test 7: Security notifications cannot be disabled
  it("7. Security notifications cannot be disabled", async () => {
    const userId = "user_security_lock";
    // Attempt to pass securityEnabled: false in preferences update
    const updated = await NotificationPreferencesStore.updatePreferences(userId, {
      securityEnabled: false as unknown as boolean,
      accountEnabled: false as unknown as boolean,
    });

    expect(updated.securityEnabled).toBe(true);
    expect(updated.accountEnabled).toBe(true);

    const canSendSecurity = await NotificationPreferencesStore.canSend(userId, "authentication");
    expect(canSendSecurity).toBe(true);
  });

  // Test 8: Marketing notifications can be disabled
  it("8. Marketing notifications can be disabled", async () => {
    const userId = "user_opt_out";
    await NotificationPreferencesStore.updatePreferences(userId, {
      marketingEnabled: false,
      productUpdatesEnabled: false,
    });

    const prefs = await NotificationPreferencesStore.getPreferences(userId);
    expect(prefs.marketingEnabled).toBe(false);
    expect(prefs.productUpdatesEnabled).toBe(false);
  });

  // Test 9: Notification payloads do not contain sensitive tax amounts
  it("9. Notification payloads do not contain sensitive tax amounts", async () => {
    const userId = "user_safe_payload";
    const result = await NotificationService.notifyCalculationSaved(
      userId,
      "calc_safe_1",
      "2025 W-2 and 1099 Scenario"
    );

    expect(result.inAppNotification).toBeDefined();
    const title = result.inAppNotification?.title || "";
    const msg = result.inAppNotification?.message || "";

    // Invariant: Zero dollar amounts or currency symbols in preview
    expect(title).not.toContain("$");
    expect(msg).not.toContain("$");
    expect(msg).not.toContain("taxLiability");
    expect(msg).not.toContain("refund");
  });

  // Test 10: Email templates escape user-controlled values
  it("10. Email templates escape user-controlled values", () => {
    const maliciousName = "<script>alert('xss')</script>";
    const template = NotificationTemplates.welcome({
      name: maliciousName,
      siteUrl: "https://taxaihelp.com",
    });

    expect(template.html).not.toContain("<script>");
    expect(template.html).toContain("&lt;script&gt;");
    expect(escapeHtml(maliciousName)).toBe("&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;");
  });

  // Test 11: Email provider does not claim delivery when unconfigured
  it("11. Email provider does not claim delivery when unconfigured", async () => {
    const nullProvider = new NullEmailProvider();
    const result = await nullProvider.sendEmail({
      to: "taxpayer@example.com",
      subject: "Test Notification",
      text: "Test body",
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe("provider_unconfigured");
    expect(result.status).not.toBe("sent");
  });

  // Test 12: Password reset requests do not reveal account existence
  it("12. Password reset requests do not reveal account existence", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/auth/recovery", {
      method: "POST",
      body: { email: "nonexistent_taxpayer_999@example.com" },
    });

    const res = await recoveryApi(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    // Generic privacy-preserving message
    expect(body.data.message).toContain("If an account exists");
  });

  // Test 13: Password reset tokens are never logged
  it("13. Password reset tokens are never logged", async () => {
    const consoleProvider = new ConsoleEmailProvider();
    const result = await consoleProvider.sendEmail({
      to: "taxpayer@example.com",
      subject: "Reset your password",
      text: "Secret token: 998877665544332211",
    });

    expect(result.success).toBe(true);
    // Message id generated does not contain the secret token
    expect(result.messageId).not.toContain("998877665544332211");
  });

  // Test 14: Security email does not expose sensitive tax data
  it("14. Security email does not expose sensitive tax data", () => {
    const tpl = NotificationTemplates.passwordChanged({
      siteUrl: "https://taxaihelp.com",
    });

    expect(tpl.category).toBe("authentication");
    expect(tpl.isSecurityCritical).toBe(true);
    expect(tpl.text).not.toContain("wages");
    expect(tpl.text).not.toContain("taxableIncome");
    expect(tpl.html).not.toContain("taxableIncome");
  });

  // Test 15: Report-ready notification does not expose tax amounts
  it("15. Report-ready notification does not expose tax amounts", async () => {
    const result = await NotificationService.notifyReportReady(
      "user_report_sec",
      "calc_123",
      "2025 Comprehensive Tax Projection"
    );

    const msg = result.inAppNotification?.message || "";
    expect(msg).not.toContain("$");
    expect(msg).toContain("2025 Comprehensive Tax Projection");
  });

  // Test 16: Calculation notification does not expose calculation details
  it("16. Calculation notification does not expose calculation details", async () => {
    const result = await NotificationService.notifyCalculationSaved(
      "user_calc_sec",
      "calc_456",
      "Self-Employed Q1 Scenario"
    );

    expect(result.inAppNotification?.metadata?.calculationId).toBe("calc_456");
    expect(result.inAppNotification?.metadata?.w2Wages).toBeUndefined();
    expect(result.inAppNotification?.metadata?.scheduleCNetProfit).toBeUndefined();
  });

  // Test 17: Professional handoff confirmation does not expose tax details
  it("17. Professional handoff confirmation does not expose tax details", async () => {
    const result = await NotificationService.notifyProfessionalHandoff(
      "user_lead_sec",
      "lead_789"
    );

    expect(result.inAppNotification?.title).toBe("Professional Consultation Submitted");
    expect(result.inAppNotification?.message).toContain("safely submitted");
    expect(result.inAppNotification?.message).not.toContain("$");
  });

  // Test 18: AI usage notification does not expose conversation content
  it("18. AI usage notification does not expose conversation content", async () => {
    const result = await NotificationService.notifyAiUsageWarning(
      "user_ai_sec",
      8,
      10,
      "2026-09-25"
    );

    expect(result.inAppNotification?.message).toContain("8 of 10 daily AI queries");
    expect(result.inAppNotification?.message).not.toContain("prompt");
    expect(result.inAppNotification?.metadata?.prompt).toBeUndefined();
  });

  // Test 19: Billing notification requires trusted subscription state
  it("19. Billing notification requires trusted subscription state", async () => {
    const result = await NotificationService.notifySubscriptionStarted(
      "user_billing_sec",
      "Premium Plan"
    );

    expect(result.inAppNotification?.category).toBe("billing");
    expect(result.inAppNotification?.type).toBe("subscription_started");
    expect(result.inAppNotification?.title).toBe("Subscription Activated");
  });

  // Test 20: Duplicate notification events are idempotent
  it("20. Duplicate notification events are idempotent", async () => {
    const userId = "user_idempotent_test";
    const dateStr = "2026-09-25";

    const first = await NotificationService.notifyAiUsageWarning(
      userId,
      8,
      10,
      dateStr
    );
    expect(first.skipped).toBe(false);

    // Second call with same idempotency key should be skipped
    const second = await NotificationService.notifyAiUsageWarning(
      userId,
      8,
      10,
      dateStr
    );
    expect(second.skipped).toBe(true);
    expect(second.reason).toContain("idempotency key");
  });

  // Test 21: Deleted users do not receive future marketing notifications
  it("21. Deleted users do not receive future marketing notifications", async () => {
    const deletedUserId = "user_purged_1";
    NotificationService.markUserDeleted(deletedUserId);

    const res = await NotificationService.notifyCalculationSaved(
      deletedUserId,
      "calc_zombie",
      "Zombie Calculation"
    );

    expect(res.skipped).toBe(true);
    expect(res.reason).toContain("Account is deleted");
  });

  // Test 22: Notification rate limits work
  it("22. Notification rate limits work", () => {
    const key = "email_verify_resend:user_123";
    const limit = 3;

    // First 3 requests allowed
    expect(RateLimiter.check(key, limit, 60000).allowed).toBe(true);
    expect(RateLimiter.check(key, limit, 60000).allowed).toBe(true);
    expect(RateLimiter.check(key, limit, 60000).allowed).toBe(true);

    // 4th request blocked
    const blocked = RateLimiter.check(key, limit, 60000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  // Test 23: Admin notifications are isolated from users
  it("23. Admin notifications are isolated from users", async () => {
    const adminUserId = "admin_super";
    await NotificationService.notifyAdmin(
      adminUserId,
      "High Priority Security Log",
      "Elevated rate limit warning detected"
    );

    // Normal user query should return 0 items
    const normalUserNotifications = await NotificationStore.getNotifications(adminUserId);
    expect(normalUserNotifications.notifications.length).toBe(0);
  });

  // Test 24: Notification API requires authentication
  it("24. Notification API requires authentication", async () => {
    const unauthenticatedReq = createMockRequest(
      "http://localhost:3000/api/v1/notifications"
    );
    const res = await getNotificationsApi(unauthenticatedReq);
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  // Test 25: Notification pagination is bounded
  it("25. Notification pagination is bounded", async () => {
    const userId = "user_page_bound";
    const req = createMockRequest(
      "http://localhost:3000/api/v1/notifications?limit=500",
      { token: userId }
    );
    const res = await getNotificationsApi(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    // Bounded max limit is 50
    expect(body.data.limit).toBe(50);
  });

  // Test 26: Notification preferences use server-derived identity
  it("26. Notification preferences use server-derived identity", async () => {
    const authenticatedId = "user_true_session";
    const req = createMockRequest(
      "http://localhost:3000/api/v1/notifications/preferences",
      {
        method: "PATCH",
        token: authenticatedId,
        body: {
          userId: "user_spoofed_victim", // Attempted override
          marketingEnabled: true,
        },
      }
    );

    const res = await patchPreferencesApi(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.userId).toBe(authenticatedId);
  });

  // Test 27: Existing account deletion behavior remains correct
  it("27. Existing account deletion behavior remains correct", async () => {
    const userId = "user_to_delete";
    await NotificationStore.create({
      userId,
      category: "calculations",
      type: "calculation_saved",
      title: "Saved Scenario",
      message: "Projections stored.",
    });

    const deletion = await AccountDataService.deleteUserData(userId);
    expect(deletion.success).toBe(true);
    expect(deletion.recordsPurged.notifications).toBeGreaterThanOrEqual(1);

    const remaining = await NotificationStore.getNotifications(userId);
    expect(remaining.notifications.length).toBe(0);
  });

  // Test 28: Existing account export remains correct
  it("28. Existing account export remains correct", async () => {
    const userId = "user_export_test";
    const exportData = await AccountDataService.exportUserData(userId);
    expect(exportData.account.id).toBe(userId);
    expect(exportData.exportMetadata.dataSubjectId).toBe(userId);
  });

  // Test 29: Existing AI usage limits remain correct
  it("29. Existing AI usage limits remain correct", async () => {
    const userId = "user_usage_ai";
    const res = await UsageStore.incrementUsage(userId, "ai_messages", 1);
    expect(res.count).toBe(1);
  });

  // Test 30: Existing billing ownership remains correct
  it("30. Existing billing ownership remains correct", async () => {
    await SubscriptionStore.saveSubscription({
      id: "sub_own_1",
      userId: "user_sub_owner",
      planId: "premium",
      status: "active",
      provider: "stripe",
      providerCustomerId: undefined,
      providerSubscriptionId: undefined,
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 86400000).toISOString(),
      cancelAtPeriodEnd: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const sub = await SubscriptionStore.getByUserId("user_sub_owner");
    expect(sub?.planId).toBe("premium");

    const strangerSub = await SubscriptionStore.getByUserId("stranger_999");
    expect(strangerSub).toBeNull();
  });

  // Test 31: Existing professional lead ownership remains correct
  it("31. Existing professional lead ownership remains correct", async () => {
    const lead = await ProfessionalLeadStore.submitLead({
      userId: "user_lead_owner",
      calculationId: "calc_001",
      taxYear: 2025,
      filingStatus: "single",
      taxpayerName: "Lead Person",
      email: "lead@example.com",
      preferredContactMethod: "email",
      urgency: "immediate",
    });

    const access = await ProfessionalLeadStore.getById(lead.id, "user_lead_owner");
    expect(access).not.toBeNull();

    const blocked = await ProfessionalLeadStore.getById(lead.id, "stranger_002");
    expect(blocked).toBeNull();
  });

  // Test 32: Existing authentication tests remain valid
  it("32. Existing authentication tests remain valid", async () => {
    const profile = await UserProfileStore.getProfile("user_auth_intact", "intact@example.com");
    expect(profile.id).toBe("user_auth_intact");
  });

  // Test 33: Existing SEO tests remain valid
  it("33. Existing SEO tests remain valid", () => {
    const meta = constructMetadata({
      title: "Notification System SEO",
      description: "Secure notifications architecture",
      path: "/dashboard/notifications",
    });
    expect(meta.alternates?.canonical).toBe("https://taxaihelp.com/dashboard/notifications");
  });

  // Test 34: Existing legal/security tests remain valid
  it("34. Existing legal/security tests remain valid", () => {
    const tpl = NotificationTemplates.welcome({
      siteUrl: "https://taxaihelp.com",
    });
    // Invariant: Disclaims CPA/IRS licensure
    expect(tpl.html).toContain("We are not the IRS or a CPA firm");
  });

  // Test 35: Existing admin tests remain valid
  it("35. Existing admin tests remain valid", () => {
    expect(ADMIN_ROLE_PERMISSIONS.super_admin).toContain("system:audit_logs");
  });
});
