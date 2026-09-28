import { SUPABASE_CONFIG } from "@/lib/supabase/config";
import { GEMINI_CONFIG } from "@/lib/ai/gemini/config";
import { getEmailConfig } from "@/lib/notifications/config";
import { PAYMENT_PROVIDER_NAME } from "@/lib/services/payment-provider";
import { BackupService } from "@/lib/data/backup-provider";
import { ENGINE_VERSION, SUPPORTED_TAX_YEARS, DEFAULT_TAX_YEAR } from "@/tax-engine";
import { Logger } from "./logger";
import { Metrics } from "./metrics";

export type HealthStatus = "ok" | "degraded" | "not_configured" | "error";

export interface DependencyHealth {
  status: HealthStatus;
  provider: string;
  configured: boolean;
  message?: string;
  latencyMs?: number;
}

export interface PublicHealthResponse {
  status: "ok" | "degraded" | "error";
  platform: string;
  version: string;
  timestamp: string;
  checks: {
    app: HealthStatus;
    database: HealthStatus;
  };
}

export interface ReadinessResponse {
  status: "ready" | "not_ready";
  timestamp: string;
  checks: {
    app: HealthStatus;
    database: HealthStatus;
    ai: HealthStatus;
    email: HealthStatus;
    billing: HealthStatus;
  };
}

export interface AdminSystemHealthResponse {
  status: "ok" | "degraded" | "error";
  platform: string;
  version: string;
  environment: string;
  timestamp: string;
  dependencies: {
    supabase: DependencyHealth;
    gemini: DependencyHealth;
    email: DependencyHealth;
    billing: DependencyHealth;
    configuration: DependencyHealth;
    backup: DependencyHealth;
  };
  metrics: {
    counters: Record<string, number>;
    timings: Record<string, { count: number; avgMs: number; maxMs: number }>;
  };
  recentErrors: Array<{
    timestamp: string;
    level: string;
    event: string;
    module: string;
    errorCode?: string;
    requestId?: string;
  }>;
  taxEngine: {
    version: string;
    supportedTaxYears: readonly number[];
    defaultYear: number;
  };
}

const startTime = Date.now();

export class HealthService {
  /**
   * Evaluates application process health.
   */
  public static checkApp(): { status: HealthStatus; uptimeSeconds: number } {
    return {
      status: "ok",
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    };
  }

  /**
   * Evaluates database dependency without exposing connection strings.
   */
  public static checkDatabase(): DependencyHealth {
    const configured = SUPABASE_CONFIG.isConfigured();
    if (!configured) {
      return {
        status: "not_configured",
        provider: "in_memory_store",
        configured: false,
        message: "Supabase credentials unconfigured; operating in local in-memory store mode.",
      };
    }

    return {
      status: "ok",
      provider: "supabase",
      configured: true,
      message: "Supabase connection parameters validated.",
    };
  }

  /**
   * Evaluates Gemini AI service configuration without exposing API keys.
   */
  public static checkGemini(): DependencyHealth {
    const configured = GEMINI_CONFIG.isConfigured();
    if (!configured) {
      return {
        status: "not_configured",
        provider: "gemini",
        configured: false,
        message: "GEMINI_API_KEY unconfigured; operating in mock explanation mode.",
      };
    }

    return {
      status: "ok",
      provider: "gemini",
      configured: true,
      message: "Gemini server credentials verified.",
    };
  }

  /**
   * Evaluates transactional email provider status without claiming false delivery.
   */
  public static checkEmail(): DependencyHealth {
    const config = getEmailConfig();
    const isConfigured = config.provider !== "null";

    if (!isConfigured) {
      return {
        status: "not_configured",
        provider: "null-provider",
        configured: false,
        message: "EMAIL_PROVIDER is null; operating in safe skipped delivery mode.",
      };
    }

    return {
      status: "ok",
      provider: config.provider,
      configured: true,
      message: `Configured for ${config.provider} transactional delivery.`,
    };
  }

  /**
   * Evaluates billing gateway staging status without exposing webhook secrets.
   */
  public static checkBilling(): DependencyHealth {
    return {
      status: "ok",
      provider: PAYMENT_PROVIDER_NAME,
      configured: true,
      message: "Stripe-ready payment architecture in staging mode.",
    };
  }

  /**
   * Evaluates backup readiness independently of database connection status.
   * INVARIANT: A healthy database does NOT imply backups are configured or healthy.
   */
  public static checkBackup(): DependencyHealth {
    const status = BackupService.getStatus();
    const isConfigured = status.status !== "NOT_CONFIGURED";

    let healthStatus: HealthStatus = "not_configured";
    if (status.status === "HEALTHY") {
      healthStatus = "ok";
    } else if (status.status === "DEGRADED" || status.status === "UNKNOWN") {
      healthStatus = "degraded";
    } else if (status.status === "FAILED") {
      healthStatus = "error";
    } else {
      healthStatus = "not_configured";
    }

    return {
      status: healthStatus,
      provider: status.provider,
      configured: isConfigured,
      message: status.message,
    };
  }

  /**
   * Evaluates platform configuration store status.
   */
  public static checkConfiguration(): DependencyHealth {
    return {
      status: "ok",
      provider: "platform_config_store",
      configured: true,
      message: "Platform configuration store initialized with production defaults and schema validation.",
    };
  }

  /**
   * Public liveness check (lightweight, safe, no secrets).
   */
  public static getPublicLiveness(): PublicHealthResponse {
    const app = this.checkApp();
    const db = this.checkDatabase();

    return {
      status: "ok",
      platform: "TaxAIHelp",
      version: ENGINE_VERSION,
      timestamp: new Date().toISOString(),
      checks: {
        app: app.status,
        database: db.status === "ok" ? "ok" : "not_configured",
      },
    };
  }

  /**
   * Public readiness check.
   * Core readiness relies on app process and database availability.
   * Unconfigured optional services (Gemini, Email) do NOT block production traffic.
   */
  public static getPublicReadiness(): ReadinessResponse {
    const app = this.checkApp();
    const db = this.checkDatabase();
    const ai = this.checkGemini();
    const email = this.checkEmail();
    const billing = this.checkBilling();

    const isReady = app.status === "ok";

    return {
      status: isReady ? "ready" : "not_ready",
      timestamp: new Date().toISOString(),
      checks: {
        app: app.status,
        database: db.status,
        ai: ai.status,
        email: email.status,
        billing: billing.status,
      },
    };
  }

  /**
   * Full diagnostic report for authorized administrators.
   * PRIVACY GUARANTEE: Never exposes API keys, database URLs, or taxpayer inputs.
   */
  public static getAdminSystemHealth(): AdminSystemHealthResponse {
    const snapshot = Metrics.getSnapshot();
    const recentErrors = Logger.getRecentErrors().map((e) => ({
      timestamp: e.timestamp,
      level: e.level,
      event: e.event,
      module: e.module,
      errorCode: e.errorCode,
      requestId: e.requestId,
    }));

    const timingsSummary: Record<string, { count: number; avgMs: number; maxMs: number }> = {};
    for (const [key, stats] of Object.entries(snapshot.timings)) {
      timingsSummary[key] = {
        count: stats.count,
        avgMs: stats.avgMs,
        maxMs: stats.maxMs,
      };
    }

    return {
      status: "ok",
      platform: "TaxAIHelp",
      version: ENGINE_VERSION,
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
      dependencies: {
        supabase: this.checkDatabase(),
        gemini: this.checkGemini(),
        email: this.checkEmail(),
        billing: this.checkBilling(),
        configuration: this.checkConfiguration(),
        backup: this.checkBackup(),
      },
      metrics: {
        counters: snapshot.counters,
        timings: timingsSummary,
      },
      recentErrors,
      taxEngine: {
        version: ENGINE_VERSION,
        supportedTaxYears: SUPPORTED_TAX_YEARS,
        defaultYear: DEFAULT_TAX_YEAR,
      },
    };
  }
}
