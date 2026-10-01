import { SubscriptionStore } from "@/lib/services/subscription-store";
import { UsageStore } from "@/lib/services/usage-store";
import { getProductPlan } from "@/lib/monetization/plans";
import {
  EntitlementKey,
  EntitlementSnapshot,
  ProductPlan,
  UsageMetric,
} from "@/types/monetization";
import { AppError } from "@/lib/utils/errors";

export class EntitlementService {
  private static async resolveActivePlanId(userId: string): Promise<"free" | "premium" | "professional"> {
    const subscription = await SubscriptionStore.getActiveSubscription(userId);
    if (subscription) {
      const isEntitled =
        subscription.status === "active" || subscription.status === "trialing";

      if (isEntitled) {
        if (subscription.planId === "professional") return "professional";
        if (subscription.planId === "premium") return "premium";
      }
    }
    return "free";
  }

  public static async getEntitlementSnapshot(userId: string): Promise<EntitlementSnapshot> {
    const planId = await this.resolveActivePlanId(userId);
    const plan: ProductPlan = getProductPlan(planId);
    const subscription = await SubscriptionStore.getActiveSubscription(userId);
    const allKeys: EntitlementKey[] = [
      "calculator.basic","calculation.history","tax.insights.basic","tax.insights.advanced",
      "ai.assistant","report.basic","report.premium","scenario.compare",
      "scenario.compare.advanced","professional.handoff",
    ];
    const entitlements = {} as Record<EntitlementKey, boolean>;
    for (const key of allKeys) { entitlements[key] = plan.entitlements.includes(key); }
    const aiLimit = plan.limits.aiMessagesPerDay;
    const aiUsage = await UsageStore.checkLimit(userId, "ai_messages", aiLimit);
    const premiumLimit = plan.limits.premiumReportsPerMonth;
    const premiumUsage = await UsageStore.checkLimit(userId, "premium_reports", premiumLimit);
    const usage: Record<UsageMetric, { current: number; limit: number; remaining: number; resetAt: string }> = {
      ai_messages: { current: aiUsage.current, limit: aiLimit, remaining: aiUsage.remaining, resetAt: aiUsage.resetAt },
      premium_reports: { current: premiumUsage.current, limit: premiumLimit, remaining: premiumUsage.remaining, resetAt: premiumUsage.resetAt },
    };
    return { userId, plan, subscription: subscription || null, entitlements, usage };
  }

  public static async requireEntitlement(userId: string, key: EntitlementKey): Promise<void> {
    const planId = await this.resolveActivePlanId(userId);
    const plan = getProductPlan(planId);
    if (!plan.entitlements.includes(key)) {
      throw new AppError(
        `Upgrade to Premium required. This feature requires an active Premium subscription to unlock ${key}.`,
        403,
        "UPGRADE_REQUIRED"
      );
    }
  }

  public static async checkAiMessageEntitlement(userId: string): Promise<{ allowed: boolean; current: number; limit: number; remaining: number; resetAt: string }> {
    const planId = await this.resolveActivePlanId(userId);
    const plan = getProductPlan(planId);
    const limit = plan.limits.aiMessagesPerDay;
    return UsageStore.checkLimit(userId, "ai_messages", limit);
  }

  public static async recordAiMessageUsage(userId: string): Promise<void> {
    await UsageStore.incrementUsage(userId, "ai_messages");
  }
}