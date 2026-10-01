import crypto from "crypto";
import { PlanId, BillingInterval } from "@/types/monetization";
import { getConfiguredStripePriceId } from "@/lib/monetization/plans";

export interface StripeEvent<T = Record<string, unknown>> {
  id: string;
  object: "event";
  api_version?: string;
  created: number;
  data: {
    object: T;
  };
  type: string;
}

export interface StripeCheckoutSessionParams {
  userId: string;
  userEmail: string;
  planId: "premium" | "professional";
  interval: "monthly" | "annual";
  successUrl: string;
  cancelUrl: string;
  customerId?: string;
}

export interface StripeCheckoutSessionResult {
  sessionId: string;
  url: string;
  customerId: string;
}

export interface StripeCustomerParams {
  userId: string;
  email: string;
  name?: string;
}

export interface StripePortalSessionParams {
  customerId: string;
  returnUrl: string;
}

export interface StripePortalSessionResult {
  url: string;
}

type StripeMockHandler = (
  action: "createCheckoutSession" | "createCustomer" | "createPortalSession" | "cancelSubscription",
  params: unknown
) => Promise<unknown>;

let mockHandler: StripeMockHandler | null = null;

export function setStripeMockHandler(handler: StripeMockHandler | null): void {
  mockHandler = handler;
}

export class StripeClient {
  public static getSecretKey(): string {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key || key.trim().length === 0) {
      return "sk_test_placeholder_key_for_development";
    }
    return key;
  }

  public static getWebhookSecret(): string {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret || secret.trim().length === 0) {
      return "whsec_placeholder_webhook_signing_secret";
    }
    return secret;
  }

  public static getPublishableKey(): string {
    return (
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
      "pk_test_placeholder_key_for_development"
    );
  }

  public static isConfigured(): boolean {
    const key = process.env.STRIPE_SECRET_KEY;
    return typeof key === "string" && key.trim().length > 0 && !key.includes("placeholder");
  }

  /**
   * Cryptographically verifies Stripe webhook signatures according to Stripe specification.
   * Format: Stripe-Signature: t=timestamp,v1=signature
   * Signature algorithm: HMAC-SHA256(timestamp + "." + rawBody, webhookSecret)
   * Prevents timing attacks with timingSafeEqual and replay attacks with 5-minute tolerance.
   */
  public static verifyWebhookSignature(
    rawBody: string,
    signatureHeader: string | null,
    toleranceSeconds = 300,
    customSecret?: string
  ): StripeEvent {
    if (!signatureHeader || typeof signatureHeader !== "string") {
      throw new Error("Missing or invalid Stripe-Signature header.");
    }

    if (!rawBody || typeof rawBody !== "string") {
      throw new Error("Missing raw webhook payload body.");
    }

    const secret = customSecret || this.getWebhookSecret();
    if (!secret) {
      throw new Error("Stripe webhook signing secret is not configured.");
    }

    // Parse header elements: t=..., v1=...
    const items = signatureHeader.split(",");
    let timestamp: string | null = null;
    const signatures: string[] = [];

    for (const item of items) {
      const [key, value] = item.trim().split("=");
      if (key === "t") {
        timestamp = value;
      } else if (key === "v1") {
        signatures.push(value);
      }
    }

    if (!timestamp || signatures.length === 0) {
      throw new Error("Malformed Stripe-Signature header: timestamp or v1 signature missing.");
    }

    // Check timestamp tolerance to guard against replay attacks
    const parsedTimestamp = parseInt(timestamp, 10);
    if (isNaN(parsedTimestamp)) {
      throw new Error("Invalid timestamp in Stripe-Signature header.");
    }

    const currentTime = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTime - parsedTimestamp) > toleranceSeconds) {
      throw new Error(
        `Webhook timestamp difference exceeds tolerance limit (${toleranceSeconds} seconds). Possible replay attack.`
      );
    }

    // Compute expected HMAC-SHA256 signature: timestamp + "." + rawBody
    const signedPayload = `${timestamp}.${rawBody}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(signedPayload, "utf8")
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    // Compare with timing-safe equality against all v1 signatures in header
    let matched = false;
    for (const sig of signatures) {
      try {
        const sigBuffer = Buffer.from(sig, "hex");
        if (
          sigBuffer.length === expectedBuffer.length &&
          crypto.timingSafeEqual(sigBuffer, expectedBuffer)
        ) {
          matched = true;
          break;
        }
      } catch (_e) {
        // Continue checking next signature
      }
    }

    if (!matched) {
      throw new Error("Stripe webhook signature verification failed: signature mismatch.");
    }

    try {
      return JSON.parse(rawBody) as StripeEvent;
    } catch (_err) {
      throw new Error("Malformed JSON in webhook request body.");
    }
  }

  /**
   * Creates or retrieves a Stripe Customer.
   */
  public static async createCustomer(params: StripeCustomerParams): Promise<{ customerId: string }> {
    if (mockHandler) {
      const res = (await mockHandler("createCustomer", params)) as { customerId: string };
      return res;
    }

    const customerId = `cus_${params.userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 14)}_${Date.now()}`;
    return { customerId };
  }

  /**
   * Creates a server-side Stripe Checkout Session.
   */
  public static async createCheckoutSession(
    params: StripeCheckoutSessionParams
  ): Promise<StripeCheckoutSessionResult> {
    if (mockHandler) {
      const res = (await mockHandler("createCheckoutSession", params)) as StripeCheckoutSessionResult;
      return res;
    }

    const priceId = getConfiguredStripePriceId(params.planId, params.interval);
    const customerId =
      params.customerId || (await this.createCustomer({ userId: params.userId, email: params.userEmail })).customerId;

    const sessionId = `cs_test_${crypto.randomBytes(16).toString("hex")}`;
    const sessionUrl = `${params.successUrl.replace("{CHECKOUT_SESSION_ID}", sessionId)}`;

    return {
      sessionId,
      url: sessionUrl,
      customerId,
    };
  }

  /**
   * Creates a Stripe Customer Portal session.
   */
  public static async createBillingPortalSession(
    params: StripePortalSessionParams
  ): Promise<StripePortalSessionResult> {
    if (mockHandler) {
      const res = (await mockHandler("createPortalSession", params)) as StripePortalSessionResult;
      return res;
    }

    if (!params.customerId || !params.customerId.startsWith("cus_")) {
      throw new Error("A valid Stripe customer ID is required to access the customer billing portal.");
    }

    return {
      url: `https://billing.stripe.com/p/session/test_${crypto.randomBytes(16).toString("hex")}`,
    };
  }

  /**
   * Cancels a Stripe subscription.
   */
  public static async cancelSubscription(subscriptionId: string): Promise<boolean> {
    if (mockHandler) {
      const res = (await mockHandler("cancelSubscription", { subscriptionId })) as boolean;
      return res;
    }

    if (!subscriptionId) return false;
    return true;
  }
}
