import { redactSensitiveData } from "./logger";

export interface MetricTimingStats {
  count: number;
  totalMs: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
}

export interface MetricsSnapshot {
  counters: Record<string, number>;
  timings: Record<string, MetricTimingStats>;
  gauges: Record<string, number>;
  timestamp: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __observabilityCounters: Map<string, number> | undefined;
  // eslint-disable-next-line no-var
  var __observabilityTimings: Map<string, number[]> | undefined;
  // eslint-disable-next-line no-var
  var __observabilityGauges: Map<string, number> | undefined;
}

function getCounters(): Map<string, number> {
  if (!globalThis.__observabilityCounters) {
    globalThis.__observabilityCounters = new Map<string, number>();
  }
  return globalThis.__observabilityCounters;
}

function getTimings(): Map<string, number[]> {
  if (!globalThis.__observabilityTimings) {
    globalThis.__observabilityTimings = new Map<string, number[]>();
  }
  return globalThis.__observabilityTimings;
}

function getGauges(): Map<string, number> {
  if (!globalThis.__observabilityGauges) {
    globalThis.__observabilityGauges = new Map<string, number>();
  }
  return globalThis.__observabilityGauges;
}

export class Metrics {
  /**
   * Increments a named counter.
   * INVARIANT: Tags are sanitized to ensure no tax values or PII are logged in metric keys.
   */
  public static increment(
    name: string,
    delta = 1,
    tags?: Record<string, string | number>
  ): number {
    const key = this.formatMetricKey(name, tags);
    const counters = getCounters();
    const current = counters.get(key) || 0;
    const next = current + delta;
    counters.set(key, next);
    return next;
  }

  /**
   * Records a timing/duration measurement in milliseconds.
   */
  public static timing(
    name: string,
    durationMs: number,
    tags?: Record<string, string | number>
  ): void {
    const key = this.formatMetricKey(name, tags);
    const timings = getTimings();
    const list = timings.get(key) || [];
    // Keep last 100 samples per metric key
    if (list.length >= 100) {
      list.shift();
    }
    list.push(Math.max(0, Math.round(durationMs)));
    timings.set(key, list);
  }

  /**
   * Sets a gauge value.
   */
  public static gauge(name: string, value: number): void {
    getGauges().set(name, value);
  }

  /**
   * Returns a complete, safe JSON snapshot of current in-memory operational metrics.
   */
  public static getSnapshot(): MetricsSnapshot {
    const countersObj: Record<string, number> = {};
    for (const [key, val] of getCounters().entries()) {
      countersObj[key] = val;
    }

    const timingsObj: Record<string, MetricTimingStats> = {};
    for (const [key, samples] of getTimings().entries()) {
      if (samples.length > 0) {
        const total = samples.reduce((acc, curr) => acc + curr, 0);
        const min = Math.min(...samples);
        const max = Math.max(...samples);
        timingsObj[key] = {
          count: samples.length,
          totalMs: total,
          avgMs: Math.round((total / samples.length) * 10) / 10,
          minMs: min,
          maxMs: max,
        };
      }
    }

    const gaugesObj: Record<string, number> = {};
    for (const [key, val] of getGauges().entries()) {
      gaugesObj[key] = val;
    }

    return {
      counters: countersObj,
      timings: timingsObj,
      gauges: gaugesObj,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Formats metric key safely, redacting any sensitive data passed in tags.
   */
  private static formatMetricKey(name: string, tags?: Record<string, unknown>): string {
    if (!tags || Object.keys(tags).length === 0) {
      return name;
    }

    const sanitized = redactSensitiveData(tags);
    const tagPairs = Object.entries(sanitized)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(",");

    return `${name}{${tagPairs}}`;
  }

  /**
   * Resets all in-memory metrics (used in test teardown).
   */
  public static reset(): void {
    getCounters().clear();
    getTimings().clear();
    getGauges().clear();
  }
}
