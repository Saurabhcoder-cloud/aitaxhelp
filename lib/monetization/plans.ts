import { PlanId, ProductPlan, EntitlementKey } from "@/types/monetization";

export const PRODUCT_PLANS: Record<PlanId, ProductPlan> = {
  free: {
    id: "free",
    name: "Free",
    tagline: "Essential Federal Tax Estimation & Planning",
    description:
      "Full access to deterministic tax calculators, calculation history, basic planning insights, and basic tax summaries.",
    monthlyPriceCents: 0,
    annualPriceCents: 0,
    currency: "USD",
    active: true,
    features: [
      "All 4 Core Calculators (Income, Self-Employed, 1099, Quarterly)",
      "Deterministic 2025 & 2026 Federal Tax Engine",
      "Unlimited Saved Calculations & History",
      "Basic Tax Planning Insights & Drivers",
      "Standard Tax Summary View",
      "10 AI Tax Assistant messages per day",
      "Direct CPA / Enrolled Agent Inquiry Submission",
    ],
    limits: {
      aiMessagesPerDay: 10,
      premiumReportsPerMonth: 0,
    },
    entitlements: [
      "calculator.basic",
      "calculation.history",
      "tax.insights.basic",
      "ai.assistant",
      "report.basic",
      "scenario.compare",
      "professional.handoff",
    ],
  },
  premium: {
    id: "premium",
    name: "Premium",
    tagline: "High-Capacity AI, Unlocked Reports & Advanced Planning",
    description:
      "Expanded 100 daily AI messages, full browser-printable reports, advanced planning explanations, and priority triage.",
    monthlyPriceCents: 1900, // $19.00 / month
    annualPriceCents: 14900, // $149.00 / year (save ~35%)
    currency: "USD",
    active: true,
    features: [
      "Everything in Free, plus:",
      "100 AI Tax Assistant messages per day (10x capacity)",
      "Unlocked Comprehensive Tax Summary Reports",
      "Printable & Export-Ready Tax Summary Documents",
      "Advanced Planning Insights & Tax Bracket Deep-Dives",
      "Side-by-Side Multi-Scenario Tax Comparison Insights",
      "Priority CPA & Enrolled Agent Consultation Routing",
    ],
    limits: {
      aiMessagesPerDay: 100,
      premiumReportsPerMonth: 9999,
    },
    entitlements: [
      "calculator.basic",
      "calculation.history",
      "tax.insights.basic",
      "tax.insights.advanced",
      "ai.assistant",
      "report.basic",
      "report.premium",
      "scenario.compare",
      "scenario.compare.advanced",
      "professional.handoff",
    ],
  },
  professional: {
    id: "professional",
    name: "Professional / Tax Prep",
    tagline: "Unlimited AI, Direct CPA Review Credit & Priority Support",
    description:
      "All Premium capabilities plus priority CPA/EA triage, unlimited AI messages, and preparation session consultation credit.",
    monthlyPriceCents: 4900, // $49.00 / month
    annualPriceCents: 39900, // $399.00 / year (save ~32%)
    currency: "USD",
    active: true,
    features: [
      "Everything in Premium, plus:",
      "Unlimited AI Tax Assistant messages per day",
      "Annual $50 Credit toward verified CPA / EA Professional Review",
      "Full Multi-Year Tax Comparison & Bracket Projections",
      "Dedicated Human Support Ticket Priority Queue",
      "Preparation Session Handoff & Dedicated Intake Review",
    ],
    limits: {
      aiMessagesPerDay: 9999,
      premiumReportsPerMonth: 9999,
    },
    entitlements: [
      "calculator.basic",
      "calculation.history",
      "tax.insights.basic",
      "tax.insights.advanced",
      "ai.assistant",
      "report.basic",
      "report.premium",
      "scenario.compare",
      "scenario.compare.advanced",
      "professional.handoff",
    ],
  },
};

/**
 * Returns the product plan definition for a given plan ID.
 * Defaults to 'free' if the plan ID is unrecognized.
 */
export function getProductPlan(planId?: string | null): ProductPlan {
  if (planId && planId in PRODUCT_PLANS) {
    return PRODUCT_PLANS[planId as PlanId];
  }
  return PRODUCT_PLANS.free;
}

/**
 * Checks whether a given plan grants a specific entitlement key.
 */
export function hasPlanEntitlement(planId: PlanId, entitlement: EntitlementKey): boolean {
  const plan = getProductPlan(planId);
  return plan.entitlements.includes(entitlement);
}

/**
 * Returns the configured Stripe Price ID for a given paid plan and interval.
 * Rejects Free plan (no price ID needed).
 */
export function getConfiguredStripePriceId(
  planId: "premium" | "professional",
  interval: "monthly" | "annual"
): string {
  if (planId === "premium") {
    if (interval === "annual") {
      return process.env.STRIPE_PRICE_ID_PREMIUM_ANNUAL || "price_test_premium_annual";
    }
    return (
      process.env.STRIPE_PRICE_ID_PREMIUM_MONTHLY ||
      process.env.STRIPE_PRICE_ID_PREMIUM ||
      "price_test_premium_monthly"
    );
  }

  if (planId === "professional") {
    if (interval === "annual") {
      return (
        process.env.STRIPE_PRICE_ID_PROFESSIONAL_ANNUAL ||
        "price_test_professional_annual"
      );
    }
    return (
      process.env.STRIPE_PRICE_ID_PROFESSIONAL ||
      "price_test_professional_monthly"
    );
  }

  throw new Error(`Unsupported plan for Stripe pricing: ${planId}`);
}

/**
 * Validates that a given price ID belongs to an allowed configured plan.
 */
export function resolvePlanFromPriceId(
  priceId: string
): { planId: "premium" | "professional"; interval: "monthly" | "annual" } | null {
  const pMonthly = getConfiguredStripePriceId("premium", "monthly");
  const pAnnual = getConfiguredStripePriceId("premium", "annual");
  const proMonthly = getConfiguredStripePriceId("professional", "monthly");
  const proAnnual = getConfiguredStripePriceId("professional", "annual");

  if (priceId === pMonthly) return { planId: "premium", interval: "monthly" };
  if (priceId === pAnnual) return { planId: "premium", interval: "annual" };
  if (priceId === proMonthly) return { planId: "professional", interval: "monthly" };
  if (priceId === proAnnual) return { planId: "professional", interval: "annual" };

  return null;
}
