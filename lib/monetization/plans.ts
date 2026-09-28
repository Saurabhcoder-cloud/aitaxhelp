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
