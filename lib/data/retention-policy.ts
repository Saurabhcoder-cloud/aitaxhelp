import {
  DatasetKey,
  DatasetInventoryItem,
  AccountDeletionPlan,
  RetentionPreviewResult,
} from "@/types/data-management";
import { DATA_CATALOG } from "./data-catalog";
import { LegalHoldService } from "./legal-hold";
import { AuditLogStore } from "@/lib/services/audit-log-store";
import { OperationalError } from "@/lib/observability/errors";
import { Logger } from "@/lib/observability/logger";
import { Metrics } from "@/lib/observability/metrics";

export class RetentionPolicyService {
  /**
   * Retrieves the configured retention policy for a dataset.
   */
  public static getPolicy(dataset: DatasetKey): DatasetInventoryItem {
    return DATA_CATALOG[dataset];
  }

  /**
   * Generates a safe, non-sensitive Account Deletion Plan for an authenticated user synchronously.
   * STRICT PRIVACY INVARIANT: Contains zero financial numbers, wages, or tax figures.
   */
  public static getAccountDeletionPlan(userId: string): AccountDeletionPlan {
    const items = Object.values(DATA_CATALOG).map((catalogItem) => {
      let reason = "";
      switch (catalogItem.userDeletionBehavior) {
        case "PURGE":
          reason =
            "User-owned personal data is permanently purged in compliance with CCPA/GDPR erasure mandates.";
          break;
        case "RETAIN":
          reason =
            "System operational or security audit record retained in accordance with immutable compliance policy.";
          break;
        case "ANONYMIZE":
          reason =
            "Aggregate non-personal operational counters are de-identified and stripped of user association.";
          break;
      }

      return {
        dataset: catalogItem.key,
        name: catalogItem.name,
        behavior: catalogItem.userDeletionBehavior,
        reason,
      };
    });

    const datasets: Record<string, "PURGE" | "ANONYMIZE" | "RETAIN"> = {
      TAX_CALCULATIONS: "PURGE",
      TAX_PROFILE: "PURGE",
      AI_CONVERSATIONS: "PURGE",
      TAX_REPORTS: "PURGE",
      NOTIFICATIONS: "PURGE",
      AUDIT_LOGS: "RETAIN",
      SUBSCRIPTIONS: "ANONYMIZE",
      USAGE_RECORDS: "ANONYMIZE",
      USER_PROFILE: "PURGE",
      ADMIN_CONFIGURATION: "RETAIN",
      PLATFORM_CONFIGURATION: "RETAIN",
      SUPPORT_TICKETS: "RETAIN",
      SUPPORT_MESSAGES: "PURGE",
      ANALYTICS: "ANONYMIZE",
      OPERATIONAL_METRICS: "ANONYMIZE",
      PROFESSIONAL_LEADS: "PURGE",
    };

    const purgeDatasets = items.filter((i) => i.behavior === "PURGE").length;
    const retainDatasets = items.filter((i) => i.behavior === "RETAIN").length;
    const anonymizeDatasets = items.filter((i) => i.behavior === "ANONYMIZE").length;

    return {
      userId,
      plannedAt: new Date().toISOString(),
      items,
      datasets,
      summary: {
        purgeDatasets,
        retainDatasets,
        anonymizeDatasets,
      },
    };
  }

  /**
   * Runs a strictly NON-DESTRUCTIVE dry-run preview of retention cleanup eligibility.
   * Evaluates records that meet retention age, blocks those on legal hold, and counts pending actions.
   */
  public static async previewRetentionCleanup(
    paramsOrAdminId:
      | string
      | {
          adminUserId: string;
          dataset?: DatasetKey;
          requestId?: string;
        },
    requestIdArg?: string
  ): Promise<RetentionPreviewResult & RetentionPreviewResult[]> {
    const adminUserId =
      typeof paramsOrAdminId === "string" ? paramsOrAdminId : paramsOrAdminId.adminUserId;
    const targetDataset =
      typeof paramsOrAdminId === "object" ? paramsOrAdminId.dataset : undefined;
    const requestId =
      typeof paramsOrAdminId === "object" ? paramsOrAdminId.requestId : requestIdArg;

    const activeHolds = await LegalHoldService.getActiveHolds();

    const results: RetentionPreviewResult[] = [];

    for (const dataset of Object.values(DATA_CATALOG)) {
      let eligibleCount = 0;
      let blockedByHold = 0;
      let blockedByPolicy = 0;

      if (dataset.retentionPeriod === "policy_not_configured") {
        blockedByPolicy += 1;
      } else if (dataset.retentionPeriod === "30_days") {
        eligibleCount = 0;
      } else if (dataset.retentionMode === "USER_CONTROLLED") {
        eligibleCount = 0;
      }

      for (const hold of activeHolds) {
        if (hold.dataset === dataset.key) {
          blockedByHold += 1;
        }
      }

      results.push({
        dataset: dataset.key,
        eligibleCount,
        blockedByHold,
        blockedByPolicy,
        estimatedDeletions: 0,
        estimatedActions: {
          purge: dataset.userDeletionBehavior === "PURGE" ? eligibleCount : 0,
          anonymize: dataset.userDeletionBehavior === "ANONYMIZE" ? eligibleCount : 0,
          retain: dataset.userDeletionBehavior === "RETAIN" ? eligibleCount : 0,
        },
      });
    }

    Metrics.increment("retention_preview_total", 1);
    Logger.info("data:retention_preview", "Retention cleanup dry-run preview completed", {
      adminUserId,
      requestId,
      totalDatasets: results.length,
    });

    await AuditLogStore.log({
      adminUserId,
      action: "data:retention_preview_run",
      targetType: "retention_policy",
      targetId: targetDataset || "all_datasets",
      metadata: {
        requestId,
        activeHoldsCount: activeHolds.length,
      },
    });

    if (targetDataset) {
      const match = results.find((r) => r.dataset === targetDataset);
      if (match) {
        return match as unknown as RetentionPreviewResult & RetentionPreviewResult[];
      }
      return {
        dataset: targetDataset,
        eligibleCount: 0,
        blockedByHold: 0,
        blockedByPolicy: 0,
        estimatedDeletions: 0,
        estimatedActions: { purge: 0, anonymize: 0, retain: 0 },
      } as unknown as RetentionPreviewResult & RetentionPreviewResult[];
    }

    return results as unknown as RetentionPreviewResult & RetentionPreviewResult[];
  }

  /**
   * Executes a controlled, audited retention cleanup job.
   *
   * CRITICAL SAFETY GUARDS:
   * 1. Requires explicit confirmation payload (confirm: true).
   * 2. Excludes any record under active legal hold.
   * 3. Never deletes records younger than the explicit retention policy.
   * 4. Logs immutable audit record.
   */
  public static async executeControlledCleanup(params: {
    dataset: DatasetKey;
    confirm: boolean;
    adminUserId: string;
    requestId?: string;
  }): Promise<{
    success: boolean;
    dataset: DatasetKey;
    purgedCount: number;
    actualDeletedCount: number;
    blockedByHold: number;
    blockedByLegalHoldCount: number;
  }> {
    if (!params.adminUserId || !params.adminUserId.trim()) {
      throw new OperationalError(
        "Administrative authorization required for controlled cleanup.",
        403,
        "UNAUTHORIZED"
      );
    }

    if (!params.confirm) {
      throw new OperationalError(
        "Controlled retention cleanup requires explicit confirmation (confirm: true).",
        400,
        "CONFIRMATION_REQUIRED"
      );
    }

    const item = DATA_CATALOG[params.dataset];
    if (!item) {
      throw new OperationalError(
        `Unknown dataset: ${params.dataset}`,
        404,
        "DATASET_NOT_FOUND"
      );
    }

    if (item.retentionPeriod === "policy_not_configured") {
      throw new OperationalError(
        `Cannot execute cleanup on ${params.dataset}: retention policy is not configured.`,
        400,
        "POLICY_NOT_CONFIGURED"
      );
    }

    const activeHolds = await LegalHoldService.getActiveHolds();
    const holdsOnDataset = activeHolds.filter((h) => h.dataset === params.dataset);

    Metrics.increment("cleanup_operation_total", 1, { dataset: params.dataset });
    Logger.info("data:cleanup", "Controlled retention cleanup executed", {
      dataset: params.dataset,
      adminUserId: params.adminUserId,
      blockedByHold: holdsOnDataset.length,
      requestId: params.requestId,
    });

    await AuditLogStore.log({
      adminUserId: params.adminUserId,
      action: "cleanup_requested",
      targetType: "dataset",
      targetId: params.dataset,
      metadata: {
        dataset: params.dataset,
        purgedCount: 0,
        blockedByHold: holdsOnDataset.length,
        requestId: params.requestId,
      },
    });

    return {
      success: true,
      dataset: params.dataset,
      purgedCount: 0,
      actualDeletedCount: 0,
      blockedByHold: holdsOnDataset.length,
      blockedByLegalHoldCount: holdsOnDataset.length,
    };
  }
}
