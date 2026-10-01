import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import crypto from "crypto";
import { GET as getSubscriptionApi } from "../app/api/v1/billing/subscription/route";
import { POST as checkoutApi } from "../app/api/v1/billing/checkout/route";
import { POST as portalApi } from "../app/api/v1/billing/portal/route";
import { POST as webhookApi } from "../app/api/v1/billing/webhook/route";
import { POST as premiumReportApi } from "../app/api/v1/reports/premium/route";
import { SubscriptionStore } from "../lib/services/subscription-store";
import { UsageStore } from "../lib/services/usage-store";
import { EntitlementService } from "../lib/services/entitlement-service";
import { SubscriptionEventStore } from "../lib/services/subscription-event-store";
import { StripeWebhookEventStore } from "../lib/services/stripe-webhook-event-store";
import { TaxCalculationStore } from "../lib/services/tax-calculation-store";
import { PRODUCT_PLANS, getConfiguredStripePriceId, resolvePlanFromPriceId } from "../lib/monetization/plans";
import { StripeClient, setStripeMockHandler } from "../lib/stripe/client";
import { calculateIncomeTax } from "../tax-engine";
import { TaxCalculationRecord } from "@/types/tax";

const TEST_WEBHOOK_SECRET = "whsec_test_secret_for_cryptographic_verification_12345";

function createMockRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    rawText?: string;
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

  let bodyContent: string | undefined;
  if (options.rawText !== undefined) {
    bodyContent = options.rawText;
  } else if (options.body !== undefined) {
    bodyContent = JSON.stringify(options.body);
  }

  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: options.method || (bodyContent !== undefined ? "POST" : "GET"),
    headers,
    body: bodyContent,
  });
}

function generateStripeSignature(rawBody: string, secret: string, timestamp?: number): string {
  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${ts}.${rawBody}`, "utf8")
    .digest("hex");
  return `t=${ts},v1=${signature}`;
}

describe("Phase 7: Stripe Payments, Subscriptions, Webhooks & Entitlements Suite", () => {
  const USER_A = "test-stripe-user-alice";
  const USER_B = "test-stripe-user-bob";

  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
    SubscriptionStore.clearStore();
    UsageStore.clearStore();
    SubscriptionEventStore.clearStore();
    StripeWebhookEventStore.clearStore();
    TaxCalculationStore.clearStore();
    setStripeMockHandler(null);
  });

  afterEach(() => {
    setStripeMockHandler(null);
  });

  const createSampleCalculation = async (
    userId: string,
    id = "11111111-1111-4111-8111-111111111111"
  ): Promise<TaxCalculationRecord> => {
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
      title: "Stripe Test Calculation",
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

  /* ========================================================================= */
  /* 1. COMMERCIAL PLANS & PRICE RESOLUTION                                    */
  /* ========================================================================= */

  it("1. Commercial plans include Free, Premium, and Professional with valid prices", () => {
    expect(PRODUCT_PLANS.free).toBeDefined();
    expect(PRODUCT_PLANS.free.monthlyPriceCents).toBe(0);

    expect(PRODUCT_PLANS.premium).toBeDefined();
    expect(PRODUCT_PLANS.premium.monthlyPriceCents).toBe(1900);
    expect(PRODUCT_PLANS.premium.annualPriceCents).toBe(14900);

    expect(PRODUCT_PLANS.professional).toBeDefined();
    expect(PRODUCT_PLANS.professional.monthlyPriceCents).toBe(4900);
    expect(PRODUCT_PLANS.professional.annualPriceCents).toBe(39900);

    // Verify configured price IDs
    const premiumMonthly = getConfiguredStripePriceId("premium", "monthly");
    expect(premiumMonthly).toBeTruthy();
    expect(resolvePlanFromPriceId(premiumMonthly)?.planId).toBe("premium");

    const proAnnual = getConfiguredStripePriceId("professional", "annual");
    expect(proAnnual).toBeTruthy();
    expect(resolvePlanFromPriceId(proAnnual)?.planId).toBe("professional");
  });

  /* ========================================================================= */
  /* 2. STRIPE CHECKOUT AUTHORIZATION & SESSION CREATION                       */
  /* ========================================================================= */

  it("2. Checkout rejects unauthenticated requests with 401", async () => {
    const req = createMockRequest("/api/v1/billing/checkout", {
      method: "POST",
      body: { planId: "premium", interval: "monthly" },
    });

    const res = await checkoutApi(req);
    expect(res.status).toBe(401);
  });

  it("3. Checkout rejects Free plan with 400 (no payment needed)", async () => {
    const req = createMockRequest("/api/v1/billing/checkout", {
      method: "POST",
      token: USER_A,
      body: { planId: "free" },
    });

    const res = await checkoutApi(req);
    expect(res.status).toBe(400);
  });

  it("4. Checkout initializes session and attaches customer and return URLs", async () => {
    const req = createMockRequest("/api/v1/billing/checkout", {
      method: "POST",
      token: USER_A,
      body: {
        planId: "premium",
        interval: "annual",
      },
    });

    const res = await checkoutApi(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.sessionId).toMatch(/^cs_test_/);
    expect(json.data.url).toContain("billing/success");

    // Verify subscription record saved Stripe customer ID
    const sub = await SubscriptionStore.getByUserId(USER_A);
    expect(sub?.providerCustomerId).toMatch(/^cus_/);

    // Verify event log recorded checkout_started
    const events = await SubscriptionEventStore.listByUser(USER_A);
    expect(events.some((e) => e.eventType === "checkout_started")).toBe(true);
  });

  it("5. Checkout reuses existing Stripe Customer ID to prevent duplicate customer creation", async () => {
    // Pre-populate existing subscription with providerCustomerId
    await SubscriptionStore.saveSubscription({
      userId: USER_A,
      planId: "free",
      status: "none",
      provider: "stripe",
      providerCustomerId: "cus_existing_alice_12345",
    });

    const req = createMockRequest("/api/v1/billing/checkout", {
      method: "POST",
      token: USER_A,
      body: { planId: "premium", interval: "monthly" },
    });

    const res = await checkoutApi(req);
    expect(res.status).toBe(200);

    const sub = await SubscriptionStore.getByUserId(USER_A);
    expect(sub?.providerCustomerId).toBe("cus_existing_alice_12345");
  });

  /* ========================================================================= */
  /* 3. CRYPTOGRAPHIC WEBHOOK SIGNATURE VERIFICATION                          */
  /* ========================================================================= */

  it("6. Webhook rejects missing signature with 400", async () => {
    const req = createMockRequest("/api/v1/billing/webhook", {
      method: "POST",
      rawText: JSON.stringify({ id: "evt_1", type: "checkout.session.completed" }),
    });

    const res = await webhookApi(req);
    expect(res.status).toBe(400);
  });

  it("7. Webhook rejects invalid / forged cryptographic signature with 400", async () => {
    const rawBody = JSON.stringify({ id: "evt_fake", type: "checkout.session.completed" });
    const fakeSignature = `t=${Math.floor(Date.now() / 1000)},v1=invalid_tampered_signature_hex`;

    const req = createMockRequest("/api/v1/billing/webhook", {
      method: "POST",
      rawText: rawBody,
      headers: { "stripe-signature": fakeSignature },
    });

    const res = await webhookApi(req);
    expect(res.status).toBe(400);
  });

  it("8. Webhook rejects expired timestamp (> 300s) to prevent replay attacks", async () => {
    const rawBody = JSON.stringify({ id: "evt_replay", type: "checkout.session.completed" });
    const expiredTimestamp = Math.floor(Date.now() / 1000) - 400; // 400s old
    const expiredSignature = generateStripeSignature(rawBody, TEST_WEBHOOK_SECRET, expiredTimestamp);

    const req = createMockRequest("/api/v1/billing/webhook", {
      method: "POST",
      rawText: rawBody,
      headers: { "stripe-signature": expiredSignature },
    });

    const res = await webhookApi(req);
    expect(res.status).toBe(400);
  });

  it("9. Webhook accepts valid cryptographically signed request", async () => {
    const rawBody = JSON.stringify({
      id: "evt_valid_test_1",
      type: "customer.subscription.created",
      data: {
        object: {
          id: "sub_test_valid_1",
          customer: "cus_alice_1",
          status: "active",
          metadata: { userId: USER_A, planId: "premium" },
        },
      },
    });

    const signature = generateStripeSignature(rawBody, TEST_WEBHOOK_SECRET);
    const req = createMockRequest("/api/v1/billing/webhook", {
      method: "POST",
      rawText: rawBody,
      headers: { "stripe-signature": signature },
    });

    const res = await webhookApi(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });

  /* ========================================================================= */
  /* 4. WEBHOOK IDEMPOTENCY                                                    */
  /* ========================================================================= */

  it("10. Webhook idempotency: Duplicate event delivery skips re-execution safely", async () => {
    const rawBody = JSON.stringify({
      id: "evt_idempotent_test_99",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_123",
          customer: "cus_alice_99",
          subscription: "sub_alice_99",
          metadata: { userId: USER_A, planId: "premium" },
        },
      },
    });

    const signature = generateStripeSignature(rawBody, TEST_WEBHOOK_SECRET);

    // First arrival
    const req1 = createMockRequest("/api/v1/billing/webhook", {
      method: "POST",
      rawText: rawBody,
      headers: { "stripe-signature": signature },
    });
    const res1 = await webhookApi(req1);
    expect(res1.status).toBe(200);

    // Second arrival (Stripe retry)
    const req2 = createMockRequest("/api/v1/billing/webhook", {
      method: "POST",
      rawText: rawBody,
      headers: { "stripe-signature": signature },
    });
    const res2 = await webhookApi(req2);
    expect(res2.status).toBe(200);
    const json2 = await res2.json();
    expect(json2.idempotent).toBe(true);

    // Subscription events count should only be 1
    const events = await SubscriptionEventStore.listByUser(USER_A);
    const checkoutEvents = events.filter((e) => e.eventType === "subscription_created");
    expect(checkoutEvents.length).toBe(1);
  });

  /* ========================================================================= */
  /* 5. FULL EVENT LIFECYCLE & ENTITLEMENT STATE MACHINE                       */
  /* ========================================================================= */

  it("11. checkout.session.completed activates Premium subscription and unlocks entitlements", async () => {
    const rawBody = JSON.stringify({
      id: "evt_checkout_success",
      type: "checkout.session.completed",
      data: {
        object: {
          customer: "cus_alice_active",
          subscription: "sub_alice_active",
          metadata: { userId: USER_A, planId: "premium" },
        },
      },
    });

    const req = createMockRequest("/api/v1/billing/webhook", {
      method: "POST",
      rawText: rawBody,
      headers: { "stripe-signature": generateStripeSignature(rawBody, TEST_WEBHOOK_SECRET) },
    });

    const res = await webhookApi(req);
    expect(res.status).toBe(200);

    // Verify subscription is active
    const sub = await SubscriptionStore.getByUserId(USER_A);
    expect(sub?.status).toBe("active");
    expect(sub?.planId).toBe("premium");

    // Verify EntitlementService unlocks Premium features (100 AI limit, report.premium)
    const snapshot = await EntitlementService.getEntitlementSnapshot(USER_A);
    expect(snapshot.plan.id).toBe("premium");
    expect(snapshot.entitlements["report.premium"]).toBe(true);
    expect(snapshot.usage.ai_messages.limit).toBe(100);
  });

  it("12. customer.subscription.updated handles status transitions (past_due, cancelAtPeriodEnd)", async () => {
    // Start with active subscription
    await SubscriptionStore.saveSubscription({
      userId: USER_A,
      planId: "premium",
      status: "active",
      provider: "stripe",
      providerSubscriptionId: "sub_trans_1",
      providerCustomerId: "cus_trans_1",
    });

    // Webhook event marking subscription past_due
    const rawBody = JSON.stringify({
      id: "evt_sub_past_due",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_trans_1",
          customer: "cus_trans_1",
          status: "past_due",
          cancel_at_period_end: true,
          metadata: { userId: USER_A },
        },
      },
    });

    const req = createMockRequest("/api/v1/billing/webhook", {
      method: "POST",
      rawText: rawBody,
      headers: { "stripe-signature": generateStripeSignature(rawBody, TEST_WEBHOOK_SECRET) },
    });

    const res = await webhookApi(req);
    expect(res.status).toBe(200);

    const sub = await SubscriptionStore.getByUserId(USER_A);
    expect(sub?.status).toBe("past_due");
    expect(sub?.cancelAtPeriodEnd).toBe(true);

    // Entitlement falls back to Free during past_due
    const snapshot = await EntitlementService.getEntitlementSnapshot(USER_A);
    expect(snapshot.plan.id).toBe("free");
    expect(snapshot.entitlements["report.premium"]).toBe(false);
  });

  it("13. customer.subscription.deleted cancels subscription and immediately revokes premium access", async () => {
    await SubscriptionStore.saveSubscription({
      userId: USER_A,
      planId: "premium",
      status: "active",
      provider: "stripe",
      providerSubscriptionId: "sub_delete_1",
      providerCustomerId: "cus_delete_1",
    });

    const rawBody = JSON.stringify({
      id: "evt_sub_deleted",
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_delete_1",
          customer: "cus_delete_1",
          metadata: { userId: USER_A },
        },
      },
    });

    const req = createMockRequest("/api/v1/billing/webhook", {
      method: "POST",
      rawText: rawBody,
      headers: { "stripe-signature": generateStripeSignature(rawBody, TEST_WEBHOOK_SECRET) },
    });

    const res = await webhookApi(req);
    expect(res.status).toBe(200);

    const sub = await SubscriptionStore.getByUserId(USER_A);
    expect(sub?.status).toBe("canceled");

    const snapshot = await EntitlementService.getEntitlementSnapshot(USER_A);
    expect(snapshot.plan.id).toBe("free");
  });

  it("14. invoice.payment_failed marks subscription past_due and logs event", async () => {
    await SubscriptionStore.saveSubscription({
      userId: USER_A,
      planId: "premium",
      status: "active",
      provider: "stripe",
      providerSubscriptionId: "sub_invoice_fail",
      providerCustomerId: "cus_invoice_fail",
    });

    const rawBody = JSON.stringify({
      id: "evt_invoice_failed",
      type: "invoice.payment_failed",
      data: {
        object: {
          subscription: "sub_invoice_fail",
          customer: "cus_invoice_fail",
          attempt_count: 2,
        },
      },
    });

    const req = createMockRequest("/api/v1/billing/webhook", {
      method: "POST",
      rawText: rawBody,
      headers: { "stripe-signature": generateStripeSignature(rawBody, TEST_WEBHOOK_SECRET) },
    });

    const res = await webhookApi(req);
    expect(res.status).toBe(200);

    const sub = await SubscriptionStore.getByUserId(USER_A);
    expect(sub?.status).toBe("past_due");

    const events = await SubscriptionEventStore.listByUser(USER_A);
    expect(events.some((e) => e.eventType === "payment_failed")).toBe(true);
  });

  /* ========================================================================= */
  /* 6. STRIPE CUSTOMER PORTAL & OWNERSHIP                                     */
  /* ========================================================================= */

  it("15. Customer Portal rejects unauthenticated requests with 401", async () => {
    const req = createMockRequest("/api/v1/billing/portal", { method: "POST" });
    const res = await portalApi(req);
    expect(res.status).toBe(401);
  });

  it("16. Customer Portal rejects user without existing Stripe Customer ID (404)", async () => {
    const req = createMockRequest("/api/v1/billing/portal", {
      method: "POST",
      token: USER_A, // User A has no Stripe subscription
    });
    const res = await portalApi(req);
    expect(res.status).toBe(404);
  });

  it("17. Customer Portal generates portal URL for user with verified Stripe Customer ID", async () => {
    await SubscriptionStore.saveSubscription({
      userId: USER_A,
      planId: "premium",
      status: "active",
      provider: "stripe",
      providerCustomerId: "cus_portal_alice_99",
    });

    const req = createMockRequest("/api/v1/billing/portal", {
      method: "POST",
      token: USER_A,
    });
    const res = await portalApi(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.url).toContain("billing.stripe.com");
  });

  /* ========================================================================= */
  /* 7. PREMIUM FEATURE GATING & INDEPENDENT DATA SAFETY                       */
  /* ========================================================================= */

  it("18. Premium report API rejects Free user (403) and succeeds for active Premium user", async () => {
    const calc = await createSampleCalculation(USER_A, "11111111-1111-4111-8111-111111111111");

    // 1. As Free user -> 403 UPGRADE_REQUIRED
    const reqFree = createMockRequest("/api/v1/reports/premium", {
      method: "POST",
      token: USER_A,
      body: { calculationId: calc.id },
    });
    const resFree = await premiumReportApi(reqFree);
    expect(resFree.status).toBe(403);

    // 2. Activate Premium
    await SubscriptionStore.saveSubscription({
      userId: USER_A,
      planId: "premium",
      status: "active",
      provider: "stripe",
      providerCustomerId: "cus_alice_gate",
    });

    // 3. As Premium user -> 200 OK
    const reqPrem = createMockRequest("/api/v1/reports/premium", {
      method: "POST",
      token: USER_A,
      body: { calculationId: calc.id },
    });
    const resPrem = await premiumReportApi(reqPrem);
    expect(resPrem.status).toBe(200);
    const jsonPrem = await resPrem.json();
    expect(jsonPrem.success).toBe(true);
    expect(jsonPrem.data.taxSummary).toBeDefined();
  });

  it("19. Historical tax calculations remain 100% accessible even when subscription is canceled", async () => {
    const calc = await createSampleCalculation(USER_A, "22222222-2222-4222-8222-222222222222");

    // Subscription canceled
    await SubscriptionStore.saveSubscription({
      userId: USER_A,
      planId: "premium",
      status: "canceled",
      provider: "stripe",
    });

    // Tax calculation record is completely intact and preserved
    const retrieved = await TaxCalculationStore.getById(calc.id, USER_A);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.resultSnapshot.totalTaxLiabilityCents).toBe(
      calc.resultSnapshot.totalTaxLiabilityCents
    );
  });

  it("20. Cross-user isolation: User B cannot access User A's subscription details", async () => {
    await SubscriptionStore.saveSubscription({
      userId: USER_A,
      planId: "premium",
      status: "active",
      provider: "stripe",
      providerCustomerId: "cus_alice_isolated",
    });

    const reqB = createMockRequest("/api/v1/billing/subscription", {
      method: "GET",
      token: USER_B,
    });
    const resB = await getSubscriptionApi(reqB);
    const jsonB = await resB.json();

    expect(jsonB.data.userId).toBe(USER_B);
    expect(jsonB.data.plan.id).toBe("free");
    expect(jsonB.data.subscription).toBeNull();
  });
});
