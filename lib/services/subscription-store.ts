import { SUPABASE_CONFIG } from "@/lib/supabase/config";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import {
  UserSubscription,
  SubscriptionStatus,
  PlanId,
  PaymentProviderName,
} from "@/types/monetization";

interface SubscriptionDbRow {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  provider: string;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __subscriptionStore: Map<string, UserSubscription> | undefined;
}

function getMemoryStore(): Map<string, UserSubscription> {
  if (!globalThis.__subscriptionStore) {
    globalThis.__subscriptionStore = new Map<string, UserSubscription>();
  }
  return globalThis.__subscriptionStore;
}

export class SubscriptionStore {
  /**
   * Compatibility alias for saving a subscription record.
   */
  public static async saveSubscription(sub: Partial<UserSubscription> & { userId: string }): Promise<UserSubscription> {
    const fullSub: UserSubscription = {
      id: sub.id || "sub_" + Math.random().toString(36).substring(2, 9),
      userId: sub.userId,
      planId: sub.planId || "free",
      status: sub.status || "active",
      provider: sub.provider || "stripe",
      providerCustomerId: sub.providerCustomerId || undefined,
      providerSubscriptionId: sub.providerSubscriptionId || undefined,
      currentPeriodStart: sub.currentPeriodStart || new Date().toISOString(),
      currentPeriodEnd: sub.currentPeriodEnd || new Date(Date.now() + 30 * 86400000).toISOString(),
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd ?? false,
      createdAt: sub.createdAt || new Date().toISOString(),
      updatedAt: sub.updatedAt || new Date().toISOString(),
    };
    return this.save(fullSub);
  }

  /**
   * Compatibility alias for getByUserId.
   */
  public static async getActiveSubscription(userId: string): Promise<UserSubscription | null> {
    return this.getByUserId(userId);
  }

  /**
   * Retrieves the active or latest subscription for a given user.
   */
  public static async getByUserId(userId: string): Promise<UserSubscription | null> {
    if (SUPABASE_CONFIG.isConfigured()) {
      const supabase = getServerSupabaseClient() as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              maybeSingle: () => Promise<{
                data: SubscriptionDbRow | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      };

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error || !data) return null;

      return {
        id: data.id,
        userId: data.user_id,
        planId: (data.plan_id as PlanId) || "free",
        status: (data.status as SubscriptionStatus) || "none",
        provider: (data.provider as PaymentProviderName) || "none",
        providerCustomerId: data.provider_customer_id || undefined,
        providerSubscriptionId: data.provider_subscription_id || undefined,
        currentPeriodStart: data.current_period_start,
        currentPeriodEnd: data.current_period_end,
        cancelAtPeriodEnd: Boolean(data.cancel_at_period_end),
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }

    const store = getMemoryStore();
    for (const sub of store.values()) {
      if (sub.userId === userId) {
        return { ...sub };
      }
    }
    return null;
  }

  /**
   * Retrieves a subscription by its Stripe subscription ID (e.g. sub_...).
   */
  public static async getByProviderSubscriptionId(providerSubscriptionId: string): Promise<UserSubscription | null> {
    if (!providerSubscriptionId) return null;

    if (SUPABASE_CONFIG.isConfigured()) {
      const supabase = getServerSupabaseClient() as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              maybeSingle: () => Promise<{
                data: SubscriptionDbRow | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      };

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("provider_subscription_id", providerSubscriptionId)
        .maybeSingle();

      if (error || !data) return null;

      return {
        id: data.id,
        userId: data.user_id,
        planId: (data.plan_id as PlanId) || "free",
        status: (data.status as SubscriptionStatus) || "none",
        provider: (data.provider as PaymentProviderName) || "none",
        providerCustomerId: data.provider_customer_id || undefined,
        providerSubscriptionId: data.provider_subscription_id || undefined,
        currentPeriodStart: data.current_period_start,
        currentPeriodEnd: data.current_period_end,
        cancelAtPeriodEnd: Boolean(data.cancel_at_period_end),
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }

    const store = getMemoryStore();
    for (const sub of store.values()) {
      if (sub.providerSubscriptionId === providerSubscriptionId) {
        return { ...sub };
      }
    }
    return null;
  }

  /**
   * Retrieves a subscription by its Stripe customer ID (e.g. cus_...).
   */
  public static async getByProviderCustomerId(providerCustomerId: string): Promise<UserSubscription | null> {
    if (!providerCustomerId) return null;

    if (SUPABASE_CONFIG.isConfigured()) {
      const supabase = getServerSupabaseClient() as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              maybeSingle: () => Promise<{
                data: SubscriptionDbRow | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      };

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("provider_customer_id", providerCustomerId)
        .maybeSingle();

      if (error || !data) return null;

      return {
        id: data.id,
        userId: data.user_id,
        planId: (data.plan_id as PlanId) || "free",
        status: (data.status as SubscriptionStatus) || "none",
        provider: (data.provider as PaymentProviderName) || "none",
        providerCustomerId: data.provider_customer_id || undefined,
        providerSubscriptionId: data.provider_subscription_id || undefined,
        currentPeriodStart: data.current_period_start,
        currentPeriodEnd: data.current_period_end,
        cancelAtPeriodEnd: Boolean(data.cancel_at_period_end),
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }

    const store = getMemoryStore();
    for (const sub of store.values()) {
      if (sub.providerCustomerId === providerCustomerId) {
        return { ...sub };
      }
    }
    return null;
  }

  /**
   * Saves or updates a user's subscription record.
   */
  public static async save(sub: UserSubscription): Promise<UserSubscription> {
    const now = new Date().toISOString();
    const updatedRecord: UserSubscription = {
      ...sub,
      updatedAt: now,
    };

    if (SUPABASE_CONFIG.isConfigured()) {
      const supabase = getServerSupabaseClient() as unknown as {
        from: (table: string) => {
          upsert: (values: unknown) => {
            select: () => {
              single: () => Promise<{
                data: SubscriptionDbRow | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      };

      const { data, error } = await supabase
        .from("subscriptions")
        .upsert({
          id: updatedRecord.id,
          user_id: updatedRecord.userId,
          plan_id: updatedRecord.planId,
          status: updatedRecord.status,
          provider: updatedRecord.provider,
          provider_customer_id: updatedRecord.providerCustomerId || null,
          provider_subscription_id: updatedRecord.providerSubscriptionId || null,
          current_period_start: updatedRecord.currentPeriodStart,
          current_period_end: updatedRecord.currentPeriodEnd,
          cancel_at_period_end: updatedRecord.cancelAtPeriodEnd,
          created_at: updatedRecord.createdAt,
          updated_at: now,
        })
        .select()
        .single();

      if (error || !data) {
        throw new Error(`Failed to save subscription: ${error?.message || "Unknown error"}`);
      }

      return {
        id: data.id,
        userId: data.user_id,
        planId: (data.plan_id as PlanId) || "free",
        status: (data.status as SubscriptionStatus) || "none",
        provider: (data.provider as PaymentProviderName) || "none",
        providerCustomerId: data.provider_customer_id || undefined,
        providerSubscriptionId: data.provider_subscription_id || undefined,
        currentPeriodStart: data.current_period_start,
        currentPeriodEnd: data.current_period_end,
        cancelAtPeriodEnd: Boolean(data.cancel_at_period_end),
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }

    const store = getMemoryStore();
    // Maintain single-subscription per userId invariant in memory
    for (const [key, existing] of store.entries()) {
      if (existing.userId === updatedRecord.userId && key !== updatedRecord.id) {
        store.delete(key);
      }
    }
    store.set(updatedRecord.id, updatedRecord);
    return { ...updatedRecord };
  }

  /**
   * Updates status or cancellation preference of a subscription.
   */
  public static async updateStatus(
    id: string,
    status: SubscriptionStatus,
    cancelAtPeriodEnd?: boolean
  ): Promise<UserSubscription | null> {
    const store = getMemoryStore();
    const existing = store.get(id);
    if (!existing) return null;

    const updated: UserSubscription = {
      ...existing,
      status,
      cancelAtPeriodEnd:
        cancelAtPeriodEnd !== undefined ? cancelAtPeriodEnd : existing.cancelAtPeriodEnd,
      updatedAt: new Date().toISOString(),
    };

    store.set(id, updated);
    return { ...updated };
  }

  /**
   * Admin-only: Lists user subscriptions with pagination.
   */
  public static async listAllForAdmin(options: {
    page?: number;
    limit?: number;
    status?: string;
  } = {}): Promise<{
    subscriptions: UserSubscription[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 20));
    const store = getMemoryStore();

    let list = Array.from(store.values());
    if (options.status) {
      list = list.filter((s) => s.status === options.status);
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = list.length;
    const startIdx = (page - 1) * limit;
    const paginated = list.slice(startIdx, startIdx + limit);

    return {
      subscriptions: paginated.map((s) => ({ ...s })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Admin-only: Counts subscriptions by status and plan for operational analytics.
   */
  public static async countSubscriptions(): Promise<{
    total: number;
    active: number;
    canceled: number;
    free: number;
    premium: number;
  }> {
    const store = getMemoryStore();
    const all = Array.from(store.values());

    let active = 0;
    let canceled = 0;
    let free = 0;
    let premium = 0;

    for (const sub of all) {
      if (sub.status === "active") active++;
      if (sub.status === "canceled") canceled++;
      if (sub.planId === "free") free++;
      if (sub.planId === "premium") premium++;
    }

    return {
      total: all.length,
      active,
      canceled,
      free,
      premium,
    };
  }

  public static clearStore(): void {
    if (globalThis.__subscriptionStore) {
      globalThis.__subscriptionStore.clear();
    }
  }

  public static clear(): void {
    SubscriptionStore.clearStore();
  }
}
