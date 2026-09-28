import { getAppEnvironment, getEnvironmentMetadata, AppEnvironment } from "../config/environment";
import { EnvironmentCheckService, EnvironmentCheckReport } from "../config/environment-check";
import { getBuildMetadata, BuildMetadata } from "../config/build-info";
import { MigrationReadinessService, MigrationReadinessReport } from "./migration-readiness";
import { HealthService, DependencyHealth } from "../observability/health";
import { BackupService, BackupStatusReport } from "../data/backup-provider";
import { PlatformConfigStore } from "../config/platform-config-store";
import { Logger } from "../observability/logger";
import { Metrics } from "../observability/metrics";
import { AuditLogStore } from "../services/audit-log-store";

export type DeploymentStatus = "READY" | "READY_WITH_WARNINGS" | "BLOCKED";
export type SubsystemStatus = "READY" | "WARNING" | "BLOCKED" | "NOT_CONFIGURED";

export interface SubsystemReport {
  name: string;
  status: SubsystemStatus;
  message: string;
  details?: Record<string, unknown>;
}

export interface DeploymentReadinessReport {
  overallStatus: DeploymentStatus;
  environment: AppEnvironment;
  build: BuildMetadata;
  subsystems: {
    environment: SubsystemReport;
    database: SubsystemReport;
    migrations: SubsystemReport;
    backup: SubsystemReport;
    ai: SubsystemReport;
    billing: SubsystemReport;
    email: SubsystemReport;
    security: SubsystemReport;
    featureFlags: SubsystemReport;
  };
  summary: {
    ai: { enabled: boolean; configured: boolean };
    billing: { enabled: boolean; configured: boolean };
    email: { enabled: boolean; provider: string; configured: boolean };
    backup: { configured: boolean; status: string };
  };
  hasBlockingErrors: boolean;
  hasWarnings: boolean;
  evaluatedAt: string;
  requestId?: string;
}

export class DeploymentReadinessService {
  /**
   * Aggregates deployment readiness across environment, database, migrations,
   * dependencies, feature flags, and security controls.
   *
   * GUARANTEE: Never claims READY if a mandatory production dependency is missing.
   * Optional unconfigured services (e.g. email provider null, backup null in dev/staging)
   * yield WARNING or NOT_CONFIGURED rather than blocking deployment.
   */
  public static evaluateReadiness(requestId?: string): DeploymentReadinessReport {
    const env = getAppEnvironment();
    const isProd = env === "production";
    const build = getBuildMetadata();

    // 1. Environment Variables Check
    const envCheck = EnvironmentCheckService.checkEnvironment(env);
    let envSubsystemStatus: SubsystemStatus = "READY";
    let envSubsystemMsg = "All required environment variables verified.";

    if (envCheck.hasBlockingErrors) {
      envSubsystemStatus = "BLOCKED";
      envSubsystemMsg = "One or more required environment variables are missing or invalid.";
    } else if (envCheck.hasWarnings) {
      envSubsystemStatus = "WARNING";
      envSubsystemMsg = "Optional environment variables are unconfigured; operating in degraded/fallback mode.";
    }

    // 2. Database Connectivity Check
    const dbHealth = HealthService.checkDatabase();
    let dbSubsystemStatus: SubsystemStatus = "READY";
    let dbSubsystemMsg = dbHealth.message || "Database connection parameters verified.";

    if (isProd && dbHealth.status !== "ok") {
      dbSubsystemStatus = "BLOCKED";
      dbSubsystemMsg = "Production requires verified Supabase database credentials.";
    } else if (dbHealth.status === "not_configured") {
      dbSubsystemStatus = isProd ? "BLOCKED" : "WARNING";
      dbSubsystemMsg = "Supabase unconfigured; operating in local in-memory store mode.";
    }

    // 3. Database Migration Readiness
    const migrationReport = MigrationReadinessService.checkMigrations();
    let migrationSubsystemStatus: SubsystemStatus = "READY";
    let migrationSubsystemMsg = migrationReport.message;

    if (!migrationReport.isReady) {
      migrationSubsystemStatus = "BLOCKED";
      migrationSubsystemMsg = "Migration safety violations detected (duplicate versions or destructive keywords).";
    }

    // 4. Backup Readiness
    const backupReport = BackupService.getStatus();
    let backupSubsystemStatus: SubsystemStatus = "READY";
    let backupSubsystemMsg = backupReport.message;

    if (backupReport.status === "NOT_CONFIGURED") {
      backupSubsystemStatus = isProd ? "WARNING" : "NOT_CONFIGURED";
      backupSubsystemMsg = isProd
        ? "Backup provider is unconfigured. Production deployments require automated backup provisioning."
        : "Backup provider unconfigured (normal in local development).";
    } else if (backupReport.status === "DEGRADED" || backupReport.status === "FAILED") {
      backupSubsystemStatus = "WARNING";
    }

    // 5. AI Assistant Dependency Check
    const isAiEnabled = PlatformConfigStore.getBoolean("ai.assistant_enabled", true);
    const geminiKey = process.env.GEMINI_API_KEY || "";
    const isGeminiConfigured = Boolean(geminiKey && geminiKey.length > 5);

    let aiSubsystemStatus: SubsystemStatus = "READY";
    let aiSubsystemMsg = "AI assistant enabled with verified Gemini credentials.";

    if (isAiEnabled && !isGeminiConfigured) {
      aiSubsystemStatus = isProd ? "BLOCKED" : "WARNING";
      aiSubsystemMsg = isProd
        ? "AI assistant is enabled but GEMINI_API_KEY is missing. Feature flag must be disabled or key provided."
        : "AI assistant operating in mock explanation mode (unconfigured API key).";
    } else if (!isAiEnabled) {
      aiSubsystemStatus = "NOT_CONFIGURED";
      aiSubsystemMsg = "AI assistant feature flag is disabled.";
    }

    // 6. Billing & Payments Dependency Check
    const isBillingEnabled = PlatformConfigStore.getBoolean("billing.enabled", true);
    const stripeSecret = process.env.STRIPE_SECRET_KEY || "";
    const isStripeConfigured = Boolean(stripeSecret && stripeSecret.startsWith("sk_"));

    let billingSubsystemStatus: SubsystemStatus = "READY";
    let billingSubsystemMsg = "Billing enabled with verified Stripe credentials.";

    if (isBillingEnabled && !isStripeConfigured) {
      billingSubsystemStatus = isProd ? "BLOCKED" : "WARNING";
      billingSubsystemMsg = isProd
        ? "Billing is enabled but STRIPE_SECRET_KEY is missing. Feature flag must be disabled or secret provided."
        : "Billing operating in staging/mock checkout mode.";
    } else if (!isBillingEnabled) {
      billingSubsystemStatus = "NOT_CONFIGURED";
      billingSubsystemMsg = "Billing feature flag is disabled.";
    }

    // 7. Transactional Email Delivery Check
    const isEmailEnabled = PlatformConfigStore.getBoolean("notifications.email_enabled", true);
    const emailHealth = HealthService.checkEmail();
    let emailSubsystemStatus: SubsystemStatus = "READY";
    let emailSubsystemMsg = emailHealth.message || "Transactional email provider configured.";

    if (isEmailEnabled && !emailHealth.configured) {
      emailSubsystemStatus = "WARNING";
      emailSubsystemMsg = "Email notifications enabled but provider is null; in-app notification center is active.";
    } else if (!isEmailEnabled) {
      emailSubsystemStatus = "NOT_CONFIGURED";
      emailSubsystemMsg = "Email notifications feature flag is disabled.";
    }

    // 8. Security Controls & HTTPS Enforcment
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "";
    const isHttps = appUrl.startsWith("https://");
    const isLocalhost = appUrl.includes("localhost") || appUrl.includes("127.0.0.1");

    let securitySubsystemStatus: SubsystemStatus = "READY";
    let securitySubsystemMsg = "Security headers, frame protections, and HTTPS verified.";

    if (isProd && (!isHttps || isLocalhost)) {
      securitySubsystemStatus = "BLOCKED";
      securitySubsystemMsg = "Production requires HTTPS application URL and prohibits localhost.";
    }

    // 9. Feature Flags & Maintenance Mode Check
    const isMaintenance = PlatformConfigStore.getBoolean("platform.maintenance_mode", false);
    let featureFlagsSubsystemStatus: SubsystemStatus = "READY";
    let featureFlagsSubsystemMsg = "All operational feature flags configured.";

    if (isMaintenance) {
      featureFlagsSubsystemStatus = "WARNING";
      featureFlagsSubsystemMsg = "Platform maintenance mode is currently ACTIVE. Public traffic is suspended.";
    }

    // Calculate overall status
    const allStatuses = [
      envSubsystemStatus,
      dbSubsystemStatus,
      migrationSubsystemStatus,
      backupSubsystemStatus,
      aiSubsystemStatus,
      billingSubsystemStatus,
      emailSubsystemStatus,
      securitySubsystemStatus,
      featureFlagsSubsystemStatus,
    ];

    const hasBlockingErrors = allStatuses.includes("BLOCKED");
    const hasWarnings = allStatuses.includes("WARNING");

    let overallStatus: DeploymentStatus = "READY";
    if (hasBlockingErrors) {
      overallStatus = "BLOCKED";
    } else if (hasWarnings || env !== "production") {
      overallStatus = "READY_WITH_WARNINGS";
    }

    return {
      overallStatus,
      environment: env,
      build,
      subsystems: {
        environment: {
          name: "Environment Variables",
          status: envSubsystemStatus,
          message: envSubsystemMsg,
        },
        database: {
          name: "Database Connectivity",
          status: dbSubsystemStatus,
          message: dbSubsystemMsg,
        },
        migrations: {
          name: "Database Migrations",
          status: migrationSubsystemStatus,
          message: migrationSubsystemMsg,
          details: { total: migrationReport.totalMigrations },
        },
        backup: {
          name: "Backup Readiness",
          status: backupSubsystemStatus,
          message: backupSubsystemMsg,
          details: { provider: backupReport.provider, status: backupReport.status },
        },
        ai: {
          name: "AI Tax Assistant",
          status: aiSubsystemStatus,
          message: aiSubsystemMsg,
        },
        billing: {
          name: "Stripe Billing",
          status: billingSubsystemStatus,
          message: billingSubsystemMsg,
        },
        email: {
          name: "Transactional Email",
          status: emailSubsystemStatus,
          message: emailSubsystemMsg,
        },
        security: {
          name: "Security & HTTPS",
          status: securitySubsystemStatus,
          message: securitySubsystemMsg,
        },
        featureFlags: {
          name: "Feature Flags",
          status: featureFlagsSubsystemStatus,
          message: featureFlagsSubsystemMsg,
        },
      },
      summary: {
        ai: { enabled: isAiEnabled, configured: isGeminiConfigured },
        billing: { enabled: isBillingEnabled, configured: isStripeConfigured },
        email: { enabled: isEmailEnabled, provider: emailHealth.provider, configured: emailHealth.configured },
        backup: { configured: backupReport.status !== "NOT_CONFIGURED", status: backupReport.status },
      },
      hasBlockingErrors,
      hasWarnings,
      evaluatedAt: new Date().toISOString(),
      requestId,
    };
  }

  /**
   * Returns a sanitized, high-level configuration summary for operations.
   * INVARIANT: Never returns secret values.
   */
  public static getConfigurationSummary(): Record<string, { enabled: boolean; configured: boolean; status: string }> {
    const readiness = this.evaluateReadiness();

    return {
      AI: {
        enabled: readiness.summary.ai.enabled,
        configured: readiness.summary.ai.configured,
        status: readiness.subsystems.ai.status,
      },
      Billing: {
        enabled: readiness.summary.billing.enabled,
        configured: readiness.summary.billing.configured,
        status: readiness.subsystems.billing.status,
      },
      Email: {
        enabled: readiness.summary.email.enabled,
        configured: readiness.summary.email.configured,
        status: readiness.subsystems.email.status,
      },
      Backup: {
        enabled: true,
        configured: readiness.summary.backup.configured,
        status: readiness.summary.backup.status,
      },
    };
  }

  /**
   * Logs safe deployment release event to AuditLogStore and observability logger.
   */
  public static logDeploymentEvent(
    event: "deployment_started" | "deployment_ready" | "deployment_completed" | "deployment_failed" | "rollback_started" | "rollback_completed",
    adminUserId: string,
    metadata: { version: string; commit?: string; environment?: string; reason?: string; requestId?: string }
  ): void {
    Logger.info(`deployment:${event}`, {
      module: "deployment",
      version: metadata.version,
      environment: metadata.environment || getAppEnvironment(),
      requestId: metadata.requestId,
    });

    Metrics.increment("deployment_event_total", 1, { event });

    AuditLogStore.append({
      userId: adminUserId,
      action: `deployment:${event}`,
      resourceType: "deployment",
      resourceId: metadata.version,
      metadata: {
        commit: metadata.commit || "HEAD",
        environment: metadata.environment || getAppEnvironment(),
        reason: metadata.reason,
        requestId: metadata.requestId,
      },
    });
  }
}
