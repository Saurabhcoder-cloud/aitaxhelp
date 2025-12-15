import { env } from "@/lib/env";

export type StripePlan = "registration" | "individual" | "family";
export interface StripeAdapter {
  createCheckoutSession(plan: StripePlan, successUrl: string, cancelUrl: string, customerEmail?: string): Promise<string>;
  verifyWebhook(body: string | Buffer, signature: string): Promise<any>;
}

const buildStub = (): StripeAdapter => ({
  async createCheckoutSession() {
    throw new Error("Stripe not available in STUB mode");
  },
  async verifyWebhook() {
    return {};
  },
});

const priceForPlan = (plan: StripePlan): string => {
  switch (plan) {
    case "registration":
      return env.STRIPE_PRICE_REGISTRATION || "";
    case "individual":
      return env.STRIPE_PRICE_INDIVIDUAL || "";
    case "family":
    default:
      return env.STRIPE_PRICE_FAMILY || "";
  }
};

const buildReal = async (): Promise<StripeAdapter> => {
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(env.STRIPE_SECRET_KEY || "", { apiVersion: "2023-10-16" });
  return {
    async createCheckoutSession(plan, successUrl, cancelUrl, customerEmail) {
      const price = priceForPlan(plan);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{ price, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: customerEmail,
        metadata: { plan },
      });
      return session.url ?? "";
    },
    async verifyWebhook(body, signature) {
      return stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET || "");
    },
  };
};

export const getStripeAdapter = async (): Promise<StripeAdapter> => {
  if (env.STUB_MODE) return buildStub();
  return buildReal();
};
