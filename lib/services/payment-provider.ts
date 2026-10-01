import {
  BillingInterval,
  PaymentProviderName,
  PlanId,
} from "@/types/monetization";
import { StripeClient, StripeEvent } from "@/lib/stripe/client";

export const PAYMENT_PROVIDER_NAME: PaymentProviderName = "stripe";

export interface CheckoutSessionResult {
  sessionId: string | null;
  url: string | null;
  isStaging: boolean;
  message: string;
  customerId?: string;
}

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  isConfigured(): boolean;
  createCheckoutSession(
    userId: string,
    userEmail: string,
    planId: "premium" | "professional",
    interval: BillingInterval,
    returnUrl: string,
    customerId?: string
  ): Promise<CheckoutSessionResult>;
  cancelSubscription(providerSubscriptionId: string): Promise<boolean>;
  verifyWebhookSignature(payload: string, signature: string | null): Promise<StripeEvent>;
  createPortalSession(customerId: string, returnUrl: string): Promise<{ url: string }>;
}

export class StripePaymentProvider implements PaymentProvider {
  public readonly name: PaymentProviderName = "stripe";

  public isConfigured(): boolean {
    return StripeClient.isConfigured();
  }

  public async createCheckoutSession(
    userId: string,
    userEmail: string,
    planId: "premium" | "professional",
    interval: BillingInterval,
    returnUrl: string,
    customerId?: string
  ): Promise<CheckoutSessionResult> {
    const successUrl = `${returnUrl}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${returnUrl}/cancel`;

    const result = await StripeClient.createCheckoutSession({
      userId,
      userEmail,
      planId,
      interval,
      successUrl,
      cancelUrl,
      customerId,
    });

    return {
      sessionId: result.sessionId,
      url: result.url,
      isStaging: !this.isConfigured(),
      message: this.isConfigured()
        ? "Stripe checkout session initialized successfully."
        : "Stripe test checkout session initialized in staging mode.",
      customerId: result.customerId,
    };
  }

  public async cancelSubscription(providerSubscriptionId: string): Promise<boolean> {
    return StripeClient.cancelSubscription(providerSubscriptionId);
  }

  public async verifyWebhookSignature(
    payload: string,
    signature: string | null
  ): Promise<StripeEvent> {
    return StripeClient.verifyWebhookSignature(payload, signature);
  }

  public async createPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<{ url: string }> {
    return StripeClient.createBillingPortalSession({
      customerId,
      returnUrl,
    });
  }
}

export class PaymentProviderFactory {
  private static provider: PaymentProvider = new StripePaymentProvider();

  public static getProvider(): PaymentProvider {
    return this.provider;
  }

  public static setProvider(customProvider: PaymentProvider): void {
    this.provider = customProvider;
  }
}
