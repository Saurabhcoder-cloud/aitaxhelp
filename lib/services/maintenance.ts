import { PlatformConfigService } from "@/lib/config/platform-config-service";
import { Metrics } from "@/lib/observability/metrics";

export interface MaintenanceStatus {
  active: boolean;
  message: string;
  bannerOnly: boolean;
}

export class MaintenanceService {
  private static readonly DEFAULT_MESSAGE =
    "TaxAIHelp is temporarily undergoing scheduled maintenance. Please check back shortly.";

  /**
   * Evaluates if maintenance mode is active.
   */
  public static async isMaintenanceActive(): Promise<boolean> {
    return PlatformConfigService.getBoolean("platform.maintenance_mode", false);
  }

  /**
   * Retrieves full maintenance mode status.
   */
  public static async getStatus(): Promise<MaintenanceStatus> {
    const [active, message, bannerOnly] = await Promise.all([
      PlatformConfigService.getBoolean("platform.maintenance_mode", false),
      PlatformConfigService.getString("platform.maintenance_message", this.DEFAULT_MESSAGE),
      PlatformConfigService.getBoolean("platform.maintenance_banner_enabled", false),
    ]);

    return {
      active,
      message: message || this.DEFAULT_MESSAGE,
      bannerOnly,
    };
  }

  /**
   * Evaluates if a given route request should be blocked by maintenance mode.
   *
   * CRITICAL BYPASS INVARIANTS:
   * 1. Health checks (/api/health, /api/health/readiness) are NEVER blocked.
   * 2. Admin routes (/admin, /api/v1/admin) are NEVER blocked for authorized administrators.
   * 3. Password recovery is preserved if feasible.
   * 4. Banner-only mode displays warnings without blocking requests.
   */
  public static async checkRequestAccess(
    pathname: string,
    isAdmin = false
  ): Promise<{ isBlocked: boolean; message?: string }> {
    const status = await this.getStatus();

    if (!status.active) {
      return { isBlocked: false };
    }

    if (status.bannerOnly) {
      // Banner-only does not block traffic
      return { isBlocked: false };
    }

    // Always permit health checks
    if (pathname === "/api/health" || pathname === "/api/health/readiness") {
      return { isBlocked: false };
    }

    // Always permit admin routes to verified administrators
    if (isAdmin && (pathname.startsWith("/admin") || pathname.startsWith("/api/v1/admin"))) {
      return { isBlocked: false };
    }

    Metrics.increment("maintenance_mode_blocked_total", 1, { path: pathname });

    return {
      isBlocked: true,
      message: status.message,
    };
  }

  /**
   * Evaluates request access during maintenance mode.
   * Returns { isLockedDown, isBlocked, message }.
   */
  public static async evaluateAccess(
    pathname: string,
    isAdmin = false
  ): Promise<{ isLockedDown: boolean; isBlocked: boolean; message?: string }> {
    const access = await this.checkRequestAccess(pathname, isAdmin);
    return {
      isLockedDown: access.isBlocked,
      isBlocked: access.isBlocked,
      message: access.message,
    };
  }

  /**
   * Updates maintenance mode status.
   */
  public static async setStatus(
    adminUserId: string,
    enabled: boolean,
    message?: string,
    bannerOnly?: boolean,
    expectedVersion?: number
  ): Promise<void> {
    await PlatformConfigService.updateConfig(
      adminUserId,
      "platform.maintenance_mode",
      enabled,
      expectedVersion
    );

    if (message !== undefined) {
      await PlatformConfigService.updateConfig(
        adminUserId,
        "platform.maintenance_message",
        message
      );
    }

    if (bannerOnly !== undefined) {
      await PlatformConfigService.updateConfig(
        adminUserId,
        "platform.maintenance_banner_enabled",
        bannerOnly
      );
    }

    if (enabled) {
      Metrics.increment("maintenance_mode_activation_total", 1);
    }
  }
}
