import { Metrics } from "@/lib/observability/metrics";
import { Logger } from "@/lib/observability/logger";
import { getEmailConfig } from "@/lib/notifications/config";
import { PlatformConfigStore } from "@/lib/config/platform-config-store";

export interface EmailMonitoringSnapshot {
  provider: string;
  configured: boolean;
  totalAttempts: number;
  successfulSends: number;
  failedSends: number;
  status: "HEALTHY" | "DEGRADED" | "NOT_CONFIGURED";
  message: string;
}

let emailAttempts = 0;
let emailSuccesses = 0;
let emailFailures = 0;

/**
 * Transactional Email Operational Monitoring (Phase 5 Step 19)
 *
 * PRIVACY INVARIANT: Never logs or stores password recovery tokens or recipient tax figures.
 */
export class EmailMonitor {
  /**
   * Records an outbound transactional email dispatch attempt.
   */
  public static recordSend(
    template: string,
    success: boolean,
    maskedRecipient?: string,
    requestId?: string
  ): void {
    emailAttempts++;
    Metrics.increment("email_send_total", 1, { template });

    if (success) {
      emailSuccesses++;
    } else {
      emailFailures++;
      Metrics.increment("email_failure_total", 1, { template });
      Logger.error("email_monitor:dispatch_failed", {
        module: "email",
        template,
        recipient: maskedRecipient,
        requestId,
      });
    }
  }

  /**
   * Returns operational snapshot of transactional email.
   */
  public static getSnapshot(): EmailMonitoringSnapshot {
    const config = getEmailConfig();
    const isEmailFeatureEnabled = PlatformConfigStore.getBoolean("notifications.email_enabled", true);
    const isConfigured = config.provider !== "null";

    let status: "HEALTHY" | "DEGRADED" | "NOT_CONFIGURED" = "HEALTHY";
    let message = `Transactional email configured with ${config.provider}.`;

    if (!isEmailFeatureEnabled) {
      status = "NOT_CONFIGURED";
      message = "Email notifications feature flag is disabled.";
    } else if (!isConfigured) {
      status = "NOT_CONFIGURED";
      message = "EMAIL_PROVIDER is null; in-app notification center is authoritative.";
    } else if (emailFailures > 5 && emailAttempts > 0 && emailFailures / emailAttempts > 0.1) {
      status = "DEGRADED";
      message = "Elevated email dispatch failure rate; in-app center continues uninterrupted.";
    }

    return {
      provider: config.provider,
      configured: isConfigured,
      totalAttempts: emailAttempts,
      successfulSends: emailSuccesses,
      failedSends: emailFailures,
      status,
      message,
    };
  }

  public static resetCounters(): void {
    emailAttempts = 0;
    emailSuccesses = 0;
    emailFailures = 0;
  }
}
