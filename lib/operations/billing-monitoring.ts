import { Metrics } from "@/lib/observability/metrics";
import { Logger } from "@/lib/observability/logger";
import { PAYMENT_PROVIDER_NAME } from "@/lib/services/payment-provider";
import { PlatformConfigStore } from "@/lib/config/platform-config-store";

export interface BillingMonitoringSnapshot {
  provider: string;
  configured: boolean;
  totalCheckoutAttempts: number;
  failedCheckouts: number;
  totalWebhookEvents: number;
  failedWebhookEvents: number;
  duplicateWebhookEvents: number;
  status: "HEALTHY" | "DEGRADED" | "NOT_CONFIGURED";
  message: string;
}

let checkoutAttempts = 0;
let checkoutFailures = 0;
let webhookEvents = 0;
let webhookFailures = 0;
let duplicateWebhooks = 0;

/**
 * Stripe Billing & Payment Webhooks Operational Monitoring (Phase 5 Step 19)
 *
 * PRIVACY INVARIANT: Never captures or logs raw credit card numbers, CVVs, or webhook secrets.
 */
export class BillingMonitor {
  /**
   * Records a checkout session initiation attempt.
   */
  public static recordCheckout(success: boolean, planId: string, requestId?: string): void {
    checkoutAttempts++;
    Metrics.increment("billing_event_total", 1, { type: "checkout", planId });

    if (!success) {
      checkoutFailures++;
      Metrics.increment("billing_event_error_total", 1, { type: "checkout", planId });
      Logger.error("billing_monitor:checkout_failed", { module: "billing", planId, requestId });
    }
  }

  /**
   * Records processing of an incoming billing webhook event.
   */
  public static recordWebhookEvent(
    outcome: "success" | "signature_failure" | "processing_failure" | "duplicate",
    providerEventId?: string,
    requestId?: string
  ): void {
    webhookEvents++;
    Metrics.increment("billing_event_total", 1, { type: "webhook", outcome });

    if (outcome === "duplicate") {
      duplicateWebhooks++;
      Logger.info("billing_monitor:duplicate_webhook_ignored", {
        module: "billing",
        providerEventId,
        requestId,
      });
    } else if (outcome !== "success") {
      webhookFailures++;
      Metrics.increment("billing_event_error_total", 1, { type: "webhook", outcome });
      Logger.error("billing_monitor:webhook_failed", {
        module: "billing",
        outcome,
        providerEventId,
        requestId,
      });
    }
  }

  /**
   * Returns operational snapshot of the billing integration.
   */
  public static getSnapshot(): BillingMonitoringSnapshot {
    const isBillingFeatureEnabled = PlatformConfigStore.getBoolean("billing.enabled", true);
    const hasStripeSecret = Boolean(process.env.STRIPE_SECRET_KEY);

    let status: "HEALTHY" | "DEGRADED" | "NOT_CONFIGURED" = "HEALTHY";
    let message = "Billing and payment webhooks operating normally.";

    if (!isBillingFeatureEnabled) {
      status = "NOT_CONFIGURED";
      message = "Billing feature flag is disabled.";
    } else if (!hasStripeSecret) {
      status = "HEALTHY";
      message = "Stripe in staging/mock mode with guaranteed subscription entitlements.";
    } else if (webhookFailures > 5) {
      status = "DEGRADED";
      message = "Elevated webhook verification or processing failures detected.";
    }

    return {
      provider: PAYMENT_PROVIDER_NAME,
      configured: hasStripeSecret || isBillingFeatureEnabled,
      totalCheckoutAttempts: checkoutAttempts,
      failedCheckouts: checkoutFailures,
      totalWebhookEvents: webhookEvents,
      failedWebhookEvents: webhookFailures,
      duplicateWebhookEvents: duplicateWebhooks,
      status,
      message,
    };
  }

  public static resetCounters(): void {
    checkoutAttempts = 0;
    checkoutFailures = 0;
    webhookEvents = 0;
    webhookFailures = 0;
    duplicateWebhooks = 0;
  }
}
