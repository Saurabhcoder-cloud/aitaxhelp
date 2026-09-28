import { UsageMetric, UsageRecord } from "@/types/monetization";

declare global {
  // eslint-disable-next-line no-var
  var __usageStore: Map<string, UsageRecord> | undefined;
}

function getMemoryStore(): Map<string, UsageRecord> {
  if (!globalThis.__usageStore) {
    globalThis.__usageStore = new Map<string, UsageRecord>();
  }
  return globalThis.__usageStore;
}

/**
 * Returns the UTC day boundary for a given timestamp.
 */
function getDailyPeriodBounds(nowMs = Date.now()): {
  periodStart: string;
  periodEnd: string;
} {
  const d = new Date(nowMs);
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
  return {
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
  };
}

/**
 * Generates an index key for storing and querying period usage.
 */
function getUsageKey(userId: string, metric: UsageMetric, periodStart: string): string {
  return `${userId}:${metric}:${periodStart}`;
}

export class UsageStore {
  /**
   * Retrieves current period usage count for a given user and metric.
   */
  public static async getUsage(
    userId: string,
    metric: UsageMetric
  ): Promise<{
    count: number;
    periodStart: string;
    periodEnd: string;
    resetAt: string;
  }> {
    const { periodStart, periodEnd } = getDailyPeriodBounds();
    const key = getUsageKey(userId, metric, periodStart);
    const store = getMemoryStore();
    const record = store.get(key);

    return {
      count: record ? record.count : 0,
      periodStart,
      periodEnd,
      resetAt: periodEnd,
    };
  }

  /**
   * Increments current period usage count server-side.
   */
  public static async incrementUsage(
    userId: string,
    metric: UsageMetric,
    amount = 1
  ): Promise<{
    count: number;
    periodStart: string;
    periodEnd: string;
    resetAt: string;
  }> {
    const { periodStart, periodEnd } = getDailyPeriodBounds();
    const key = getUsageKey(userId, metric, periodStart);
    const store = getMemoryStore();
    const now = new Date().toISOString();

    const existing = store.get(key);
    const newCount = (existing ? existing.count : 0) + amount;

    const updated: UsageRecord = {
      id: existing ? existing.id : crypto.randomUUID(),
      userId,
      metric,
      periodStart,
      periodEnd,
      count: newCount,
      updatedAt: now,
    };

    store.set(key, updated);

    return {
      count: newCount,
      periodStart,
      periodEnd,
      resetAt: periodEnd,
    };
  }

  /**
   * Checks whether a user has remaining quota for the specified metric.
   */
  public static async checkLimit(
    userId: string,
    metric: UsageMetric,
    limit: number
  ): Promise<{
    allowed: boolean;
    current: number;
    limit: number;
    remaining: number;
    resetAt: string;
  }> {
    const { count, periodEnd } = await this.getUsage(userId, metric);
    const remaining = Math.max(0, limit - count);
    const allowed = count < limit;

    return {
      allowed,
      current: count,
      limit,
      remaining,
      resetAt: periodEnd,
    };
  }

  public static clearStore(): void {
    if (globalThis.__usageStore) {
      globalThis.__usageStore.clear();
    }
  }

  public static clear(): void {
    UsageStore.clearStore();
  }
}
