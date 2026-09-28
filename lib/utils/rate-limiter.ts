/**
 * Server-Side In-Memory Rate Limiter
 * Protects AI endpoints from abuse and unbounded consumption.
 */

interface RateLimitRecord {
  timestamps: number[];
}

// Global cache for development hot reloads and test suite resets
declare global {
  // eslint-disable-next-line no-var
  var __rateLimiterStore: Map<string, RateLimitRecord> | undefined;
}

function getStore(): Map<string, RateLimitRecord> {
  if (!globalThis.__rateLimiterStore) {
    globalThis.__rateLimiterStore = new Map<string, RateLimitRecord>();
  }
  return globalThis.__rateLimiterStore;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
}

export class RateLimiter {
  private static readonly WINDOW_MS = 60 * 1000; // 1 minute sliding window
  private static readonly MAX_REQUESTS = 20; // 20 requests per minute

  public static check(
    identifier: string,
    maxRequests: number = RateLimiter.MAX_REQUESTS,
    windowMs: number = RateLimiter.WINDOW_MS
  ): RateLimitCheckResult {
    const store = getStore();
    const now = Date.now();
    const windowStart = now - windowMs;

    const record = store.get(identifier) || { timestamps: [] };

    // Evict timestamps outside the window
    const recentTimestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (recentTimestamps.length >= maxRequests) {
      const oldestInWindow = recentTimestamps[0];
      const retryAfterMs = oldestInWindow + windowMs - now;
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: Math.max(0, retryAfterMs),
      };
    }

    recentTimestamps.push(now);
    store.set(identifier, { timestamps: recentTimestamps });

    return {
      allowed: true,
      remaining: maxRequests - recentTimestamps.length,
    };
  }

  public static clear(): void {
    if (globalThis.__rateLimiterStore) {
      globalThis.__rateLimiterStore.clear();
    }
  }

  public check(
    identifier: string,
    maxRequests: number = RateLimiter.MAX_REQUESTS,
    windowMs: number = RateLimiter.WINDOW_MS
  ): RateLimitCheckResult {
    return RateLimiter.check(identifier, maxRequests, windowMs);
  }

  public clear(): void {
    RateLimiter.clear();
  }
}
