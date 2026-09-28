import { Metrics } from "@/lib/observability/metrics";
import { Logger } from "@/lib/observability/logger";
import { GEMINI_CONFIG } from "@/lib/ai/gemini/config";
import { PlatformConfigStore } from "@/lib/config/platform-config-store";

export interface AiMonitoringSnapshot {
  provider: string;
  configured: boolean;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitedRequests: number;
  timedOutRequests: number;
  quotaExhaustedRequests: number;
  averageLatencyMs: number;
  status: "HEALTHY" | "DEGRADED" | "NOT_CONFIGURED";
  message: string;
}

let aiRequestCounter = 0;
let aiSuccessCounter = 0;
let aiFailureCounter = 0;
let aiRateLimitCounter = 0;
let aiTimeoutCounter = 0;
let aiQuotaCounter = 0;
let totalAiDurationMs = 0;

/**
 * AI Guidance Operational Monitoring (Phase 5 Step 19)
 *
 * SAFETY INVARIANT: AI is strictly non-authoritative. Numerical tax calculations
 * are 100% deterministic and completely independent of Gemini.
 * PRIVACY INVARIANT: Never captures or logs user chat prompts, tax context, or responses.
 */
export class AiMonitor {
  /**
   * Records an AI assistant query interaction with safe metadata.
   */
  public static recordQuery(
    durationMs: number,
    outcome: "success" | "failure" | "rate_limited" | "timeout" | "quota_exhausted",
    requestId?: string
  ): void {
    aiRequestCounter++;
    totalAiDurationMs += durationMs;

    Metrics.increment("ai_request_total", 1, { outcome });

    if (outcome === "success") {
      aiSuccessCounter++;
    } else if (outcome === "rate_limited") {
      aiRateLimitCounter++;
      Logger.warn("ai_monitor:rate_limited", { module: "ai-assistant", requestId });
    } else if (outcome === "timeout") {
      aiTimeoutCounter++;
      Metrics.increment("ai_request_error_total", 1, { reason: "timeout" });
      Logger.error("ai_monitor:timeout", { module: "ai-assistant", durationMs, requestId });
    } else if (outcome === "quota_exhausted") {
      aiQuotaCounter++;
      Logger.warn("ai_monitor:quota_exhausted", { module: "ai-assistant", requestId });
    } else {
      aiFailureCounter++;
      Metrics.increment("ai_request_error_total", 1, { reason: "general_failure" });
      Logger.error("ai_monitor:query_failed", { module: "ai-assistant", requestId });
    }
  }

  /**
   * Returns operational snapshot for the AI guidance service.
   */
  public static getSnapshot(): AiMonitoringSnapshot {
    const isAiFeatureEnabled = PlatformConfigStore.getBoolean("ai.assistant_enabled", true);
    const isConfigured = GEMINI_CONFIG.isConfigured();

    const avgDuration = aiRequestCounter > 0 ? Math.round(totalAiDurationMs / aiRequestCounter) : 0;
    const errorRate = aiRequestCounter > 0 ? (aiFailureCounter + aiTimeoutCounter) / aiRequestCounter : 0;

    let status: "HEALTHY" | "DEGRADED" | "NOT_CONFIGURED" = "HEALTHY";
    let message = "AI Assistant operational with Google Gemini Flash.";

    if (!isAiFeatureEnabled) {
      status = "NOT_CONFIGURED";
      message = "AI Assistant disabled via platform feature flag.";
    } else if (!isConfigured) {
      status = "DEGRADED";
      message = "GEMINI_API_KEY unconfigured; operating in mock explanation mode.";
    } else if (errorRate > 0.1) {
      status = "DEGRADED";
      message = "Elevated Gemini failure rate; deterministic calculators remain 100% operational.";
    }

    return {
      provider: "Google Gemini 1.5 Flash",
      configured: isConfigured,
      totalRequests: aiRequestCounter,
      successfulRequests: aiSuccessCounter,
      failedRequests: aiFailureCounter,
      rateLimitedRequests: aiRateLimitCounter,
      timedOutRequests: aiTimeoutCounter,
      quotaExhaustedRequests: aiQuotaCounter,
      averageLatencyMs: avgDuration,
      status,
      message,
    };
  }

  public static resetCounters(): void {
    aiRequestCounter = 0;
    aiSuccessCounter = 0;
    aiFailureCounter = 0;
    aiRateLimitCounter = 0;
    aiTimeoutCounter = 0;
    aiQuotaCounter = 0;
    totalAiDurationMs = 0;
  }
}
