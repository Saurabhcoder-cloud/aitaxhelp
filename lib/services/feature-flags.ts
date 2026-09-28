import { PlatformConfigKey } from "@/types/platform-config";
import { PlatformConfigService } from "@/lib/config/platform-config-service";
import { OperationalError } from "@/lib/observability/errors";
import { Metrics } from "@/lib/observability/metrics";

export class FeatureFlags {
  /**
   * Evaluates if a given feature flag is active on the server.
   * Server-authoritative: client-side headers or storage cannot override this.
   */
  public static async isEnabled(key: PlatformConfigKey): Promise<boolean> {
    Metrics.increment("feature_flag_evaluation_total", 1, { key });
    return PlatformConfigService.getBoolean(key, true);
  }

  /**
   * Asserts that a feature flag is enabled. Throws an OperationalError (503) if disabled.
   */
  public static async require(
    key: PlatformConfigKey,
    featureName?: string
  ): Promise<void> {
    const enabled = await this.isEnabled(key);
    if (!enabled) {
      Metrics.increment("feature_flag_blocked_total", 1, { key });
      throw new OperationalError(
        `${featureName || "The requested feature"} is temporarily disabled by system administrators.`,
        403,
        "FEATURE_DISABLED"
      );
    }
  }

  /**
   * Helper to evaluate if platform maintenance mode is active.
   */
  public static async isMaintenanceModeActive(): Promise<boolean> {
    return PlatformConfigService.getBoolean("platform.maintenance_mode", false);
  }

  /**
   * Domain-specific helper for AI Assistant availability.
   */
  public static async isAiAssistantEnabled(): Promise<boolean> {
    return this.isEnabled("ai.assistant_enabled");
  }

  /**
   * Domain-specific helper for taxpayer registration.
   */
  public static async isRegistrationEnabled(): Promise<boolean> {
    return this.isEnabled("auth.registration_enabled");
  }

  /**
   * Domain-specific helper for billing/checkout.
   */
  public static async isBillingEnabled(): Promise<boolean> {
    return this.isEnabled("billing.enabled");
  }

  /**
   * Domain-specific helper for premium report generation.
   */
  public static async isPremiumReportsEnabled(): Promise<boolean> {
    return this.isEnabled("reports.premium_reports_enabled");
  }

  /**
   * Domain-specific helper for CPA/EA handoff submissions.
   */
  public static async isProfessionalHandoffEnabled(): Promise<boolean> {
    return this.isEnabled("professionals.handoff_enabled");
  }

  /**
   * Domain-specific helper for calculators.
   */
  public static async isCalculatorEnabled(calculatorType: string): Promise<boolean> {
    switch (calculatorType) {
      case "income-tax":
        return this.isEnabled("calculators.federal_income_enabled");
      case "self-employed":
        return this.isEnabled("calculators.self_employed_enabled");
      case "1099":
        return this.isEnabled("calculators.tax_1099_enabled");
      case "quarterly":
      case "quarterly-tax":
        return this.isEnabled("calculators.quarterly_enabled");
      default:
        return true;
    }
  }

  /**
   * Domain-specific helper for Support Center availability.
   */
  public static async isSupportEnabled(): Promise<boolean> {
    return this.isEnabled("support.enabled");
  }
}
