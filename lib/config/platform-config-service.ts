import {
  PlatformConfigKey,
  PlatformConfigRecord,
  PublicPlatformConfig,
  AnnouncementType,
} from "@/types/platform-config";
import { DEFAULT_PLATFORM_CONFIGS, PlatformConfigStore } from "./platform-config-store";
import {
  isAllowedConfigKey,
  containsSecretCredential,
  sanitizeConfigString,
} from "@/lib/validations/platform-config";
import { AuditLogStore } from "@/lib/services/audit-log-store";
import { OperationalError } from "@/lib/observability/errors";
import { Metrics } from "@/lib/observability/metrics";
import { Logger } from "@/lib/observability/logger";

export class PlatformConfigService {
  /**
   * Retrieves all configuration records grouped for administrative display.
   */
  public static async getAllConfigs(): Promise<PlatformConfigRecord[]> {
    return PlatformConfigStore.getAll();
  }

  /**
   * Retrieves a single typed configuration record.
   */
  public static async getConfig<T = unknown>(
    key: PlatformConfigKey
  ): Promise<PlatformConfigRecord<T>> {
    return PlatformConfigStore.get(key) as Promise<PlatformConfigRecord<T>>;
  }

  /**
   * Retrieves the raw typed value of a setting with fallback.
   */
  public static async getValue<T = unknown>(
    key: PlatformConfigKey,
    fallback?: T
  ): Promise<T> {
    try {
      const config = await PlatformConfigStore.get(key);
      return (config.value as T) ?? (fallback as T);
    } catch (_err) {
      return fallback as T;
    }
  }

  /**
   * Convenience helper for boolean feature flags.
   */
  public static async getBoolean(
    key: PlatformConfigKey,
    fallback = false
  ): Promise<boolean> {
    const val = await this.getValue<unknown>(key, fallback);
    return Boolean(val);
  }

  /**
   * Convenience helper for string settings with sanitization.
   */
  public static async getString(
    key: PlatformConfigKey,
    fallback = ""
  ): Promise<string> {
    const val = await this.getValue<unknown>(key, fallback);
    return typeof val === "string" ? val : fallback;
  }

  /**
   * Compiles the public-safe configuration snapshot.
   *
   * STRICT PRIVACY INVARIANT:
   * Only non-sensitive, public-facing flags are exposed.
   * Zero secrets, rate limit counters, or internal admin settings are returned.
   */
  public static async getPublicConfig(): Promise<PublicPlatformConfig> {
    const [
      platformName,
      maintenanceMode,
      maintenanceMessage,
      maintenanceBannerEnabled,
      announcementEnabled,
      announcementMessage,
      announcementType,
      registrationEnabled,
      publicBlogEnabled,
      publicTaxGuidesEnabled,
      publicPricingEnabled,
      aiAssistantEnabled,
      calculatorsEnabled,
    ] = await Promise.all([
      this.getString("platform.name", "TaxAIHelp"),
      this.getBoolean("platform.maintenance_mode", false),
      this.getString("platform.maintenance_message", ""),
      this.getBoolean("platform.maintenance_banner_enabled", false),
      this.getBoolean("announcement.enabled", false),
      this.getString("announcement.message", ""),
      this.getString("announcement.type", "info") as Promise<AnnouncementType>,
      this.getBoolean("auth.registration_enabled", true),
      this.getBoolean("acquisition.public_blog_enabled", true),
      this.getBoolean("acquisition.public_tax_guides_enabled", true),
      this.getBoolean("acquisition.public_pricing_enabled", true),
      this.getBoolean("ai.assistant_enabled", true),
      this.getBoolean("calculators.federal_income_enabled", true),
    ]);

    return {
      platformName,
      maintenanceMode,
      maintenanceMessage: maintenanceMessage || undefined,
      maintenanceBannerEnabled,
      announcement: {
        enabled: announcementEnabled,
        message: announcementMessage || undefined,
        type: announcementType || "info",
      },
      features: {
        registrationEnabled,
        publicBlogEnabled,
        publicTaxGuidesEnabled,
        publicPricingEnabled,
        aiAssistantEnabled,
        calculatorsEnabled,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Updates a configuration setting.
   *
   * ENFORCED SECURITY INVARIANTS:
   * 1. Requires verified administrator ID (never client-supplied authority).
   * 2. Rejects any non-allowlisted keys.
   * 3. Blocks any attempt to edit tax engine rules (which remain code-controlled).
   * 4. Blocks any secret credentials from being stored in configuration.
   * 5. Sanitizes string inputs to prevent HTML/XSS injection.
   * 6. Enforces optimistic concurrency (rejects stale versions).
   * 7. Logs an immutable audit event in AuditLogStore.
   */
  public static async updateConfig(
    adminUserId: string,
    key: string,
    rawValue: unknown,
    expectedVersionOrRequestId?: number | string,
    requestIdOrExpectedVersion?: string | number
  ): Promise<PlatformConfigRecord> {
    let expectedVersion: number | undefined;
    let requestId: string | undefined;

    if (typeof expectedVersionOrRequestId === "number") {
      expectedVersion = expectedVersionOrRequestId;
      if (typeof requestIdOrExpectedVersion === "string") {
        requestId = requestIdOrExpectedVersion;
      }
    } else if (typeof expectedVersionOrRequestId === "string") {
      requestId = expectedVersionOrRequestId;
      if (typeof requestIdOrExpectedVersion === "number") {
        expectedVersion = requestIdOrExpectedVersion;
      }
    }

    // 1. Allowlist Validation
    if (!isAllowedConfigKey(key)) {
      Metrics.increment("admin_config_update_failed", 1, { reason: "invalid_key" });
      throw new OperationalError(
        `Configuration key '${key}' is not recognized or not configurable via admin controls.`,
        400,
        "INVALID_CONFIG_KEY"
      );
    }

    // 2. Secret Credential Rejection
    if (containsSecretCredential(key, rawValue)) {
      Metrics.increment("admin_config_update_failed", 1, { reason: "secret_rejected" });
      throw new OperationalError(
        "Platform configuration cannot be used to store API keys, tokens, or secret credentials.",
        400,
        "CREDENTIAL_REJECTED"
      );
    }

    // 3. Tax Rule Immutability Rejection
    if (/tax_bracket|standard_deduction|se_formula|medicare_rate/i.test(key)) {
      throw new OperationalError(
        "Tax calculation rules and statutory bracket values are source-controlled and immutable at runtime.",
        403,
        "TAX_ENGINE_IMMUTABLE"
      );
    }

    // 4. Input Sanitization
    let sanitizedValue = rawValue;
    if (typeof rawValue === "string") {
      sanitizedValue = sanitizeConfigString(rawValue.trim());
    }

    const expectedValue = DEFAULT_PLATFORM_CONFIGS[key].value;
    if (typeof sanitizedValue !== typeof expectedValue) {
      Metrics.increment("admin_config_update_failed", 1, { reason: "invalid_type" });
      throw new OperationalError(
        `Configuration value for '${key}' must be of type ${typeof expectedValue}.`,
        400,
        "INVALID_CONFIG_TYPE",
        "VALIDATION_ERROR"
      );
    }

    // 5. Fetch previous value for audit comparison
    const previous = await PlatformConfigStore.get(key);

    // 6. Persist with optimistic concurrency check
    const updated = await PlatformConfigStore.update(
      adminUserId,
      key,
      sanitizedValue,
      expectedVersion
    );

    // 7. Audit Log Entry
    await AuditLogStore.log({
      adminUserId,
      action: "admin:config_updated",
      targetType: "platform_config",
      targetId: key,
      metadata: {
        previousValue: previous.value as Record<string, unknown>,
        newValue: updated.value as Record<string, unknown>,
        version: updated.version,
        requestId,
      },
    });

    // 8. Observability Metrics & Logging
    Metrics.increment("admin_config_update_total", 1, { key });
    Logger.info("platform_config_updated", {
      module: "platform-config",
      requestId,
      userId: adminUserId,
      metadata: {
        key,
        version: updated.version,
      },
    });

    return updated;
  }
}
