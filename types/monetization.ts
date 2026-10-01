export type PlanId = "free" | "premium" | "professional";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "expired"
  | "unpaid"
  | "none";

export type PaymentProviderName = "stripe" | "none";

export type BillingInterval = "monthly" | "annual";

export type EntitlementKey =
  | "calculator.basic"
  | "calculation.history"
  | "tax.insights.basic"
  | "tax.insights.advanced"
  | "ai.assistant"
  | "report.basic"
  | "report.premium"
  | "scenario.compare"
  | "scenario.compare.advanced"
  | "professional.handoff";

export type UsageMetric = "ai_messages" | "premium_reports";

export interface ProductPlan {
  id: PlanId;
  name: string;
  tagline: string;
  description: string;
  monthlyPriceCents: number;
  annualPriceCents: number;
  currency: string;
  active: boolean;
  features: string[];
  limits: {
    aiMessagesPerDay: number;
    premiumReportsPerMonth: number;
  };
  entitlements: EntitlementKey[];
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: PlanId;
  status: SubscriptionStatus;
  provider: PaymentProviderName;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionEvent {
  id: string;
  userId: string;
  subscriptionId?: string;
  eventType:
    | "checkout_started"
    | "subscription_created"
    | "subscription_updated"
    | "subscription_canceled"
    | "payment_failed"
    | "subscription_expired";
  payload?: Record<string, unknown>;
  createdAt: string;
}

export interface UsageRecord {
  id: string;
  userId: string;
  metric: UsageMetric;
  periodStart: string;
  periodEnd: string;
  count: number;
  updatedAt: string;
}

export interface EntitlementSnapshot {
  userId: string;
  plan: ProductPlan;
  subscription: UserSubscription | null;
  entitlements: Record<EntitlementKey, boolean>;
  usage: Record<
    UsageMetric,
    {
      current: number;
      limit: number;
      remaining: number;
      resetAt: string;
    }
  >;
}
