import { Logger } from "./logger";
import { Metrics } from "./metrics";

export const PERFORMANCE_THRESHOLDS = {
  API_REQUEST_SLOW_MS: 1000,
  TAX_CALCULATION_SLOW_MS: 50,
  DB_OPERATION_SLOW_MS: 250,
  AI_REQUEST_SLOW_MS: 4000,
  EMAIL_DELIVERY_TIMEOUT_MS: 3000,
} as const;

export interface LatencyCheckOptions {
  module: string;
  requestId?: string;
  tags?: Record<string, string | number>;
  metadata?: Record<string, unknown>;
}

/**
 * Records execution duration into metrics and emits a sanitized warning log if threshold is exceeded.
 */
export function checkAndRecordLatency(
  metricName: string,
  durationMs: number,
  thresholdMs: number,
  options: LatencyCheckOptions
): boolean {
  Metrics.timing(metricName, durationMs, options.tags);

  const exceeded = durationMs > thresholdMs;
  if (exceeded) {
    Logger.warn(`latency_threshold_exceeded:${metricName}`, {
      module: options.module,
      requestId: options.requestId,
      durationMs,
      metadata: {
        thresholdMs,
        overageMs: durationMs - thresholdMs,
        ...options.metadata,
      },
    });
  }

  return exceeded;
}
