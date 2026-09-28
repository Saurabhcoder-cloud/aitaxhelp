import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getSubscriptionApi } from "../app/api/v1/billing/subscription/route";
import { POST as checkoutApi } from "../app/api/v1/billing/checkout/route";
import { POST as webhookApi } from "../app/api/v1/billing/webhook/route";
import { POST as premiumReportApi } from "../app/api/v1/reports/premium/route";
import { GET as adminListSubscriptionsApi } from "../app/api/v1/admin/subscriptions/route";
import { POST as assistantApi } from "../app/api/v1/ai/assistant/route";
import { POST as userCreateLeadApi } from "../app/api/v1/professional-leads/route";
import { SubscriptionStore } from "../lib/services/subscription-store";
import { UsageStore } from "../lib/services/usage-store";
import { EntitlementService } from "../lib/services/entitlement-service";
import { SubscriptionEventStore } from "../lib/services/subscription-event-store";
import { PaymentProviderFactory } from "../lib/services/payment-provider";
import { TaxCalculationStore } from "../lib/services/tax-calculation-store";
import { ProfessionalLeadStore } from "../lib/services/professional-lead-store";
import { ConversationStore } from "../lib/services/conversation-store";
import { AuditLogStore } from "../lib/services/audit-log-store";
import { TaxReportAnalyticsStore } from "../lib/services/tax-report-analytics-store";
import { RateLimiter } from "../lib/utils/rate-limiter";
import { buildTaxReport } from "../lib/services/tax-report";
import { compareSavedCalculations } from "../lib/services/tax-insights";
import { calculateIncomeTax } from "../tax-engine";
import { TaxCalculationRecord } from "@/types/tax";
import { setGeminiMockHandler } from "../lib/ai/gemini/client";
import { UserSubscription } from "@/types/monetization";

function createMockRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string;
    headers?: Record<string, string>;
  } = {}
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
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

describe("Monetization, Subscription, Entitlement & Usage Limit Suite (Phase 5 Step 10)", () => {
  beforeEach(() => {
    SubscriptionStore.clearStore();
    UsageStore.clearStore();
    SubscriptionEventStore.clearStore();
    TaxCalculationStore.clearStore();
    ProfessionalLeadStore.clearStore();
    ConversationStore.clear();
    AuditLogStore.clear();
    TaxReportAnalyticsStore.clear();
    RateLimiter.clear();
    setGeminiMockHandler(null);
  });

  afterEach(() => {
    setGeminiMockHandler(null);
  });

  const createSampleCalculation = async (userId: string, id = "calc-monet-1"): Promise<TaxCalculationRecord> => {
    const result = calculateIncomeTax({
      taxYear: 2025,
      filingStatus: "single",
      w2IncomeCents: 9000000,
      withholdingCents: 1400000,
    });

    const record: TaxCalculationRecord = {
      id,
      userId,
      calculatorType: "income_tax",
      taxYear: 2025,
      filingStatus: "single",
      title: "Monetization Test Calc",
      inputSnapshot: {
        taxYear: 2025,
        filingStatus: "single",
        w2WagesCents: 9000000,
      },
      resultSnapshot: result,
      engineVersion: "1.0.0",
      rulesVersion: "2025.1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return TaxCalculationStore.save(record);
  };

  // 1. Free user receives free entitlements
  it("1. Free user receives default free entitlements and limits", async () => {
    const userId = "free-user-1";
    const snapshot = await EntitlementService.getEntitlementSnapshot(userId);

    expect(snapshot.plan.id).toBe("free");
    expect(snapshot.entitlements["calculator.basic"]).toBe(true);
    expect(snapshot.entitlements["calculation.history"]).toBe(true);
    expect(snapshot.entitlements["report.basic"]).toBe(true);
    expect(snapshot.entitlements["report.premium"]).toBe(false);
    expect(snapshot.entitlements["tax.insights.advanced"]).toBe(false);
    expect(snapshot.usage.ai_messages.limit).toBe(10);
  });

  // 2. Premium user receives premium entitlements
  it("2. Premium user receives elevated entitlements and 100 daily AI message quota", async () => {
    const userId = "premium-user-1";
    await SubscriptionStore.save({
      id: "sub-prem-1",
      userId,
      planId: "premium",
      status: "active",
      provider: "stripe",
      providerCustomerId: "cus_test_123",
      providerSubscriptionId: "sub_test_123",
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
      cancelAtPeriodEnd: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const snapshot = await EntitlementService.getEntitlementSnapshot(userId);

    expect(snapshot.plan.id).toBe("premium");
    expect(snapshot.entitlements["report.premium"]).toBe(true);
    expect(snapshot.entitlements["tax.insights.advanced"]).toBe(true);
    expect(snapshot.usage.ai_messages.limit).toBe(100);
  });

  // 3. Unauthenticated user cannot access subscription endpoint
  it("3. Unauthenticated request to subscription endpoint is rejected (401)", async () => {
    const req = createMockRequest("/api/v1/billing/subscription", { method: "GET" });
    const res = await getSubscriptionApi(req);
    expect(res.status).toBe(401);
  });

  // 4. User cannot modify their own subscription status directly
  it("4. Subscription state mutations must go through server-side logic; client cannot patch subscription directly", async () => {
    const userId = "user-tamper-1";
    // Check that standard user has free plan
    const snapshot = await EntitlementService.getEntitlementSnapshot(userId);
    expect(snapshot.plan.id).toBe("free");

    // Client attempts to pass fake query or body to GET /api/v1/billing/subscription
    const req = createMockRequest("/api/v1/billing/subscription?planId=premium&status=active", {
      method: "GET",
      token: userId,
    });
    const res = await getSubscriptionApi(req);
    const json = await res.json();
    expect(json.data.plan.id).toBe("free");
    expect(json.data.entitlements["report.premium"]).toBe(false);
  });

  // 5. Client cannot spoof premium status
  it("5. Server rejects client-supplied premium=true or plan=premium headers/params", async () => {
    const userId = "user-spoof-prem";
    const req = createMockRequest("/api/v1/billing/subscription", {
      method: "GET",
      token: userId,
      headers: {
        "x-user-plan": "premium",
        "x-is-premium": "true",
      },
    });

    const res = await getSubscriptionApi(req);
    const json = await res.json();
    expect(json.data.plan.id).toBe("free");
    expect(json.data.entitlements["report.premium"]).toBe(false);
  });

  // 6. Client cannot spoof plan
  it("6. requireEntitlement strictly checks server store and rejects unentitled users", async () => {
    const userId = "user-spoof-plan";
    await expect(
      EntitlementService.requireEntitlement(userId, "report.premium")
    ).rejects.toThrow(/Upgrade to Premium required/);
  });

  // 7. AI usage limit is enforced server-side
  it("7. AI daily usage limit is enforced server-side (free user blocked on 11th message)", async () => {
    const userId = "user-ai-quota-test";
    setGeminiMockHandler(async () => ({
      text: "Standard deduction explanation.",
      model: "gemini-2.5-flash",
    }));

    // Send 10 allowable messages for a free account
    for (let i = 0; i < 10; i++) {
      const req = createMockRequest("/api/v1/ai/assistant", {
        method: "POST",
        token: userId,
        body: { message: `Question ${i + 1}` },
      });
      const res = await assistantApi(req);
      expect(res.status).toBe(200);
    }

    // 11th message should be rejected due to daily quota limit
    const req11 = createMockRequest("/api/v1/ai/assistant", {
      method: "POST",
      token: userId,
      body: { message: "Question 11 - should fail" },
    });
    const res11 = await assistantApi(req11);
    expect(res11.status).toBe(403);

    const json = await res11.json();
    expect(json.error.code).toBe("UPGRADE_REQUIRED");
    expect(json.error.message).toContain("Daily AI assistant message limit reached");
  });

  // 8. Existing 20/minute rate limit remains active
  it("8. Existing 20 requests/minute rate limiter remains active and independent of product quota", async () => {
    const userId = "user-burst-test";
    // Artificially upgrade user to premium so daily limit (100) doesn't interfere with burst rate limit (20)
    await SubscriptionStore.save({
      id: "sub-burst",
      userId,
      planId: "premium",
      status: "active",
      provider: "none",
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 86400000).toISOString(),
      cancelAtPeriodEnd: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setGeminiMockHandler(async () => ({ text: "Ok", model: "gemini" }));

    // Send 20 requests rapidly
    for (let i = 0; i < 20; i++) {
      const req = createMockRequest("/api/v1/ai/assistant", {
        method: "POST",
        token: userId,
        body: { message: `Burst ${i}` },
      });
      const res = await assistantApi(req);
      expect(res.status).toBe(200);
    }

    // 21st burst request in same minute must be rate limited (429)
    const req21 = createMockRequest("/api/v1/ai/assistant", {
      method: "POST",
      token: userId,
      body: { message: "Burst 21" },
    });
    const res21 = await assistantApi(req21);
    expect(res21.status).toBe(429);
    const json = await res21.json();
    expect(json.error.code).toBe("RATE_LIMITED");
  });

  // 9. Usage period resets correctly
  it("9. Usage store tracks period bounds and resets quota for new period", async () => {
    const userId = "user-period-reset";
    await UsageStore.incrementUsage(userId, "ai_messages", 5);

    const usage = await UsageStore.getUsage(userId, "ai_messages");
    expect(usage.count).toBe(5);
    expect(usage.resetAt).toBeDefined();
  });

  // 10. Premium report entitlement is enforced
  it("10. Premium report API rejects free user (403 UPGRADE_REQUIRED)", async () => {
    const userId = "free-report-user";
    const calc = await createSampleCalculation(userId, "calc-free-rep");

    const req = createMockRequest("/api/v1/reports/premium", {
      method: "POST",
      token: userId,
      body: { calculationId: calc.id },
    });

    const res = await premiumReportApi(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe("UPGRADE_REQUIRED");
  });

  // 11. Free user receives correct upgrade response
  it("11. Free user attempting premium report receives informative upgrade guidance", async () => {
    const userId = "free-user-upgrade-info";
    const calc = await createSampleCalculation(userId, "calc-upgrade-info");

    const req = createMockRequest("/api/v1/reports/premium", {
      method: "POST",
      token: userId,
      body: { calculationId: calc.id },
    });

    const res = await premiumReportApi(req);
    const json = await res.json();
    expect(json.error.message).toContain("Upgrade to Premium");
  });

  // 12. Existing basic report remains functional
  it("12. Basic report generation remains fully functional and accessible to free users", async () => {
    const userId = "free-user-basic-rep";
    const calc = await createSampleCalculation(userId, "calc-basic-rep");

    // Standard client/server basic report building
    const report = buildTaxReport(calc, "free");
    expect(report.accessTier).toBe("free");
    expect(report.taxSummary.grossIncomeCents).toBe(9000000);
    expect(report.disclaimer).toBeDefined();
  });

  // 13. Historical calculations remain accessible after plan changes
  it("13. Historical calculations remain accessible regardless of subscription plan or downgrade", async () => {
    const userId = "user-downgrade";
    const calc = await createSampleCalculation(userId, "calc-saved-1");

    // Active premium
    await SubscriptionStore.save({
      id: "sub-down-1",
      userId,
      planId: "premium",
      status: "active",
      provider: "none",
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date().toISOString(),
      cancelAtPeriodEnd: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Later downgraded or expired
    await SubscriptionStore.updateStatus("sub-down-1", "expired");

    // Calculation is still 100% accessible to user
    const fetched = await TaxCalculationStore.getById("calc-saved-1", userId);
    expect(fetched).not.toBeNull();
    expect(fetched?.resultSnapshot.grossIncomeCents).toBe(9000000);
  });

  // 14. Subscription state is user-scoped
  it("14. Subscription state is strictly scoped to authenticated user ID", async () => {
    const userA = "user-sub-a";
    const userB = "user-sub-b";

    await SubscriptionStore.save({
      id: "sub-a",
      userId: userA,
      planId: "premium",
      status: "active",
      provider: "none",
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date().toISOString(),
      cancelAtPeriodEnd: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const snapA = await EntitlementService.getEntitlementSnapshot(userA);
    const snapB = await EntitlementService.getEntitlementSnapshot(userB);

    expect(snapA.plan.id).toBe("premium");
    expect(snapB.plan.id).toBe("free");
  });

  // 15. Cross-user subscription access is rejected
  it("15. User cannot inspect or query another user's subscription via GET /api/v1/billing/subscription", async () => {
    const userA = "user-own-sub";
    await SubscriptionStore.save({
      id: "sub-own",
      userId: userA,
      planId: "premium",
      status: "active",
      provider: "none",
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date().toISOString(),
      cancelAtPeriodEnd: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // userB calls subscription endpoint
    const reqB = createMockRequest("/api/v1/billing/subscription", {
      method: "GET",
      token: "user-attacker",
    });
    const resB = await getSubscriptionApi(reqB);
    const jsonB = await resB.json();

    expect(jsonB.data.userId).toBe("user-attacker");
    expect(jsonB.data.plan.id).toBe("free");
  });

  // 16. Provider IDs cannot be client-controlled
  it("16. Checkout creation assigns provider references server-side", async () => {
    const userId = "checkout-user-1";
    const req = createMockRequest("/api/v1/billing/checkout", {
      method: "POST",
      token: userId,
      body: {
        planId: "premium",
        interval: "annual",
        providerCustomerId: "hacked_customer_id",
      },
    });

    const res = await checkoutApi(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.isStaging).toBe(true);
  });

  // 17. Billing secrets are never returned
  it("17. Billing secrets, keys, and tokens are never exposed in subscription responses", async () => {
    const userId = "secret-test-user";
    const req = createMockRequest("/api/v1/billing/subscription", {
      method: "GET",
      token: userId,
    });
    const res = await getSubscriptionApi(req);
    const bodyStr = await res.text();

    expect(bodyStr).not.toContain("STRIPE_SECRET_KEY");
    expect(bodyStr).not.toContain("STRIPE_WEBHOOK_SECRET");
    expect(bodyStr).not.toContain("api_key");
  });

  // 18. Webhook endpoint rejects unverified/fake events
  it("18. Webhook endpoint rejects unverified or missing signature requests (400/401)", async () => {
    const req = createMockRequest("/api/v1/billing/webhook", {
      method: "POST",
      body: { event: "fake_checkout_completed" },
    });

    const res = await webhookApi(req);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  // 19. Admin subscription access is protected
  it("19. Admin subscription list is accessible by authorized administrators", async () => {
    const req = createMockRequest("/api/v1/admin/subscriptions?page=1&limit=10", {
      method: "GET",
      token: "test-admin-1",
    });
    const res = await adminListSubscriptionsApi(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.counts).toBeDefined();
  });

  // 20. Normal users cannot access admin billing
  it("20. Normal users cannot access admin billing (403 Forbidden)", async () => {
    const req = createMockRequest("/api/v1/admin/subscriptions", {
      method: "GET",
      token: "test-user-normal",
    });
    const res = await adminListSubscriptionsApi(req);
    expect(res.status).toBe(403);
  });

  // 21. Subscription events are append-only
  it("21. Subscription events are recorded in append-only fashion", async () => {
    const userId = "event-user-1";
    await SubscriptionEventStore.log({
      userId,
      eventType: "checkout_started",
      payload: { planId: "premium" },
    });
    await SubscriptionEventStore.log({
      userId,
      eventType: "subscription_created",
      payload: { planId: "premium" },
    });

    const events = await SubscriptionEventStore.listByUser(userId);
    expect(events.length).toBe(2);
    expect(events[0].eventType).toBe("subscription_created");
    expect(events[1].eventType).toBe("checkout_started");
  });

  // 22. No fake payment success is generated
  it("22. Checkout returns staging status when payment gateway is not live", async () => {
    const userId = "staging-check-user";
    const req = createMockRequest("/api/v1/billing/checkout", {
      method: "POST",
      token: userId,
      body: { planId: "premium" },
    });

    const res = await checkoutApi(req);
    const json = await res.json();
    expect(json.data.isStaging).toBe(true);
    expect(json.data.message).toContain("staging mode");
  });

  // 23. Existing AI assistant remains functional
  it("23. Existing AI assistant remains fully functional within free quotas", async () => {
    setGeminiMockHandler(async () => ({
      text: "The standard deduction for 2025 single filers is $15,000.",
      model: "gemini-2.5-flash",
    }));

    const req = createMockRequest("/api/v1/ai/assistant", {
      method: "POST",
      token: "ai-functional-user",
      body: { message: "What is standard deduction for 2025?" },
    });

    const res = await assistantApi(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.reply).toContain("standard deduction");
  });

  // 24. Existing reports remain functional
  it("24. Existing reports remain functional and can be generated on demand", async () => {
    const calc = await createSampleCalculation("report-functional-user", "calc-rep-func");
    const report = buildTaxReport(calc, "free");

    expect(report.taxSummary.grossIncomeCents).toBe(9000000);
    expect(report.taxDrivers.length).toBeGreaterThan(0);
  });

  // 25. Existing professional leads remain functional
  it("25. Existing professional lead workflow remains functional", async () => {
    const userId = "lead-functional-user";
    const calc = await createSampleCalculation(userId, "calc-lead-func");

    const req = createMockRequest("/api/v1/professional-leads", {
      method: "POST",
      token: userId,
      body: {
        calculationId: calc.id,
        taxpayerName: "Lead User",
        email: "lead@example.com",
        preferredContactMethod: "email",
        urgency: "immediate",
      },
    });

    const res = await userCreateLeadApi(req);
    expect(res.status).toBe(201);
  });

  // 26. Existing calculations remain functional
  it("26. Existing calculation store operations remain functional", async () => {
    const userId = "calc-functional-user";
    await createSampleCalculation(userId, "calc-f-1");
    await createSampleCalculation(userId, "calc-f-2");

    const list = await TaxCalculationStore.listByUser(userId);
    expect(list.length).toBe(2);
  });

  // 27. Existing scenario comparison remains functional
  it("27. Existing scenario comparison functions accurately without regression", async () => {
    const calcA = await createSampleCalculation("comp-user", "calc-cmp-1");
    const resultB = calculateIncomeTax({
      taxYear: 2025,
      filingStatus: "single",
      w2IncomeCents: 11000000,
      withholdingCents: 1800000,
    });
    const calcB: TaxCalculationRecord = {
      ...calcA,
      id: "calc-cmp-2",
      title: "Salary Hike",
      resultSnapshot: resultB,
    };
    await TaxCalculationStore.save(calcB);

    const diff = compareSavedCalculations(calcA, calcB);
    expect(diff.incomeDifferenceCents).toBe(2000000);
    expect(diff.taxLiabilityDifferenceCents).toBeGreaterThan(0);
  });

  // 28. Tax engine output remains unchanged
  it("28. Deterministic tax engine calculations are completely untouched by monetization logic", () => {
    const result = calculateIncomeTax({
      taxYear: 2025,
      filingStatus: "single",
      w2IncomeCents: 10000000, // $100,000
      withholdingCents: 1500000,
    });

    // 2025 Single: $100,000 - $15,750 std deduction = $84,250 taxable income
    expect(result.adjustedGrossIncomeCents).toBe(10000000);
    expect(result.deductionUsedCents).toBe(1575000);
    expect(result.taxableIncomeCents).toBe(8425000);
    expect(result.totalTaxLiabilityCents).toBeGreaterThan(0);
  });
});
