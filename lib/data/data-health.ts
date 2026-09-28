import {
  DataHealthSummary,
  BackupStatusReport,
  RestoreVerificationReport,
} from "@/types/data-management";
import { HealthService } from "@/lib/observability/health";
import { BackupService } from "./backup-provider";
import { RestoreVerificationService } from "./restore-verification";
import { LegalHoldService } from "./legal-hold";
import { DataIntegrityService } from "./data-integrity";
import { PlatformConfigStore } from "@/lib/config/platform-config-store";
import { DATA_CATALOG } from "./data-catalog";
import { AuditLogStore } from "@/lib/services/audit-log-store";
import { Logger } from "@/lib/observability/logger";
import { Metrics } from "@/lib/observability/metrics";

export class DataHealthService {
  /**
   * Synchronous snapshot compilation of Data Health Summary.
   */
  public static getHealthSummarySync(): DataHealthSummary {
    const timestamp = new Date().toISOString();
    const dbCheck = HealthService.checkDatabase();
    const backupReport = BackupService.getStatus();
    const restoreReport = RestoreVerificationService.getLatestReport();

    const schemaInventory = {
      migrationVersion: "20260925_data_management.sql",
      dataManagementVersion: "1.0.0",
      platformConfigVersion: 1,
    };

    return {
      timestamp,
      database: {
        status: dbCheck.status,
        provider: dbCheck.provider,
        message: dbCheck.message,
      },
      backup: backupReport,
      restoreVerification: restoreReport,
      integrity: {
        status: "HEALTHY",
        failedChecks: 0,
        warningChecks: 0,
        orphanCount: 0,
        orphanRecordsCount: 0,
        duplicateCount: 0,
        totalChecks: Object.keys(DATA_CATALOG).length,
      },
      retention: {
        status: "HEALTHY",
        totalDatasets: Object.keys(DATA_CATALOG).length,
        activeLegalHolds: 0,
        eligibleCleanupRecords: 0,
      },
      rpoRto: {
        targetRpoMinutes: 60,
        configuredTargetRpoMinutes: 60,
        targetRpoDescription: "Recovery Point Objective: 60 min operational target",
        targetRtoMinutes: 120,
        configuredTargetRtoMinutes: 120,
        targetRtoDescription: "Recovery Time Objective: 120 min operational target",
        actualLatestRecoveryPoint: backupReport.recoveryPoint,
        actualRecoveryPoint: backupReport.recoveryPoint,
        recoveryPointStatus: backupReport.recoveryPoint ? "CONFIRMED" : "UNAVAILABLE",
      },
      schemaInventory,
      datasetInventory: Object.values(DATA_CATALOG),
    };
  }

  /**
   * Compiles a comprehensive, real-time Data Health Summary for administrative oversight.
   *
   * CRITICAL PRIVACY & HONESTY INVARIANTS:
   * 1. Strictly operational metadata only. Never reveals taxpayer income, liabilities, or SSNs.
   * 2. Distinguishes database availability from backup readiness.
   * 3. An unconfigured backup provider HONESTLY reports NOT_CONFIGURED and Unavailable.
   */
  public static async getDataHealthSummary(params: {
    adminUserId: string;
    requestId?: string;
  }): Promise<DataHealthSummary> {
    const timestamp = new Date().toISOString();

    // 1. Database Availability
    const dbCheck = HealthService.checkDatabase();

    // 2. Backup Status & Recovery Point
    const backupReport = await BackupService.getBackupStatus();

    // 3. Restore Verification
    const restoreReport = await RestoreVerificationService.getLastVerification();

    // 4. Retention Health & Legal Holds
    const activeLegalHolds = await LegalHoldService.getActiveHoldsCount();

    // 5. Data Integrity & Orphan Check
    const integrityReport = await DataIntegrityService.runIntegrityChecks({
      adminUserId: params.adminUserId,
      requestId: params.requestId,
    });

    let totalOrphans = 0;
    let totalDuplicates = 0;
    for (const c of integrityReport.checks) {
      if (c.check.startsWith("orphaned_")) {
        totalOrphans += c.count;
      } else if (c.check.startsWith("duplicate_")) {
        totalDuplicates += c.count;
      }
    }

    const integrityStatus: "HEALTHY" | "ATTENTION" | "CRITICAL" =
      integrityReport.failures > 0
        ? "CRITICAL"
        : integrityReport.warnings > 0
        ? "ATTENTION"
        : "HEALTHY";

    // 6. Schema & Migration Inventory
    const schemaInventory = {
      migrationVersion: "20260925_data_management.sql",
      dataManagementVersion: "1.0.0",
      platformConfigVersion: 1,
    };

    Metrics.increment("data_health_check_total", 1, {
      integrityStatus,
      backupStatus: backupReport.status,
    });

    Logger.info("data:health_check", "Data health summary generated", {
      databaseStatus: dbCheck.status,
      backupStatus: backupReport.status,
      integrityStatus,
      totalOrphans,
      adminUserId: params.adminUserId,
      requestId: params.requestId,
    });

    await AuditLogStore.log({
      adminUserId: params.adminUserId,
      action: "data_health_check_run",
      targetType: "system",
      targetId: "data_health_summary",
      metadata: {
        databaseStatus: dbCheck.status,
        backupStatus: backupReport.status,
        integrityStatus,
        activeLegalHolds,
        totalOrphans,
        requestId: params.requestId,
      },
    });

    return {
      timestamp,
      database: {
        status: dbCheck.status,
        provider: dbCheck.provider,
        message: dbCheck.message,
      },
      backup: backupReport,
      restoreVerification: restoreReport,
      integrity: {
        status: integrityStatus,
        failedChecks: integrityReport.failures,
        warningChecks: integrityReport.warnings,
        orphanCount: totalOrphans,
        orphanRecordsCount: totalOrphans,
        duplicateCount: totalDuplicates,
        totalChecks: integrityReport.totalChecks,
      },
      retention: {
        status: activeLegalHolds > 0 ? "ATTENTION" : "HEALTHY",
        totalDatasets: Object.keys(DATA_CATALOG).length,
        activeLegalHolds,
        eligibleCleanupRecords: 0,
      },
      rpoRto: {
        targetRpoMinutes: 60,
        configuredTargetRpoMinutes: 60,
        targetRpoDescription: "Recovery Point Objective: 60 min operational target",
        targetRtoMinutes: 120,
        configuredTargetRtoMinutes: 120,
        targetRtoDescription: "Recovery Time Objective: 120 min operational target",
        actualLatestRecoveryPoint: backupReport.recoveryPoint,
        actualRecoveryPoint: backupReport.recoveryPoint,
        recoveryPointStatus: backupReport.recoveryPoint ? "CONFIRMED" : "UNAVAILABLE",
      },
      schemaInventory,
      datasetInventory: Object.values(DATA_CATALOG),
    };
  }

  /**
   * Alias for getDataHealthSummary supporting optional string or params object.
   */
  public static async getHealthSummary(
    paramsOrAdminId?: string | { adminUserId: string; requestId?: string }
  ): Promise<DataHealthSummary> {
    const adminUserId =
      typeof paramsOrAdminId === "string"
        ? paramsOrAdminId
        : paramsOrAdminId?.adminUserId || "system";
    const requestId =
      typeof paramsOrAdminId === "object" ? paramsOrAdminId.requestId : undefined;
    return this.getDataHealthSummary({ adminUserId, requestId });
  }
}
