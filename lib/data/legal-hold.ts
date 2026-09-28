import { SUPABASE_CONFIG } from "@/lib/supabase/config";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { DatasetKey, LegalHoldRecord } from "@/types/data-management";
import { AuditLogStore } from "@/lib/services/audit-log-store";
import { OperationalError } from "@/lib/observability/errors";
import { Logger } from "@/lib/observability/logger";

declare global {
  // eslint-disable-next-line no-var
  var __legalHoldsStore: Map<string, LegalHoldRecord> | undefined;
}

function getLegalHoldsMap(): Map<string, LegalHoldRecord> {
  if (!globalThis.__legalHoldsStore) {
    globalThis.__legalHoldsStore = new Map<string, LegalHoldRecord>();
  }
  return globalThis.__legalHoldsStore;
}

export class LegalHoldService {
  /**
   * Synchronous check whether a specific record is currently locked under an active legal hold.
   */
  public static isUnderHold(dataset: DatasetKey, recordId: string): boolean {
    for (const hold of getLegalHoldsMap().values()) {
      if (hold.isActive && hold.dataset === dataset && hold.recordId === recordId) {
        return true;
      }
    }
    return false;
  }

  /**
   * Evaluates whether a specific record is currently locked under an active legal hold.
   * STRICT SAFETY INVARIANT: A record under active legal hold CANNOT be deleted or purged.
   */
  public static async isUnderLegalHold(
    dataset: DatasetKey,
    recordId: string
  ): Promise<boolean> {
    return this.isUnderHold(dataset, recordId);
  }

  /**
   * Synchronous hold creation for tests and internal workflows.
   */
  public static createHold(params: {
    dataset: DatasetKey;
    recordId: string;
    reason: string;
    adminUserId?: string;
    createdBy?: string;
  }): LegalHoldRecord {
    const adminUserId = params.adminUserId || params.createdBy || "admin-system";
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const record: LegalHoldRecord = {
      id,
      dataset: params.dataset,
      recordId: params.recordId,
      reason: (params.reason || "Administrative hold").trim(),
      createdBy: adminUserId,
      createdAt: now,
      isActive: true,
      releasedAt: null,
      releasedBy: null,
    };

    getLegalHoldsMap().set(id, record);

    Logger.info("data:legal_hold_created", "Legal hold established on record", {
      holdId: id,
      dataset: params.dataset,
      recordId: params.recordId,
      adminUserId,
    });

    void AuditLogStore.log({
      adminUserId,
      action: "legal_hold_created",
      targetType: "legal_hold",
      targetId: id,
      metadata: {
        dataset: params.dataset,
        recordId: params.recordId,
        reason: record.reason,
      },
    });

    return record;
  }

  /**
   * Places a record under formal legal hold.
   * Requires elevated administrator authorization and an explicit operational reason.
   */
  public static async createLegalHold(params: {
    dataset: DatasetKey;
    recordId: string;
    reason: string;
    adminUserId: string;
    requestId?: string;
  }): Promise<LegalHoldRecord> {
    if (!params.reason || params.reason.trim().length < 5) {
      throw new OperationalError(
        "A detailed operational reason is required to establish a legal hold (min 5 characters).",
        400,
        "LEGAL_HOLD_REASON_REQUIRED"
      );
    }

    return this.createHold({
      dataset: params.dataset,
      recordId: params.recordId,
      reason: params.reason,
      adminUserId: params.adminUserId,
    });
  }

  /**
   * Releases an active legal hold.
   */
  public static async releaseLegalHold(params: {
    holdId: string;
    adminUserId: string;
    requestId?: string;
  }): Promise<LegalHoldRecord> {
    const hold = getLegalHoldsMap().get(params.holdId);
    if (!hold) {
      throw new OperationalError(
        "Legal hold record not found.",
        404,
        "LEGAL_HOLD_NOT_FOUND"
      );
    }

    const now = new Date().toISOString();
    hold.isActive = false;
    hold.releasedAt = now;
    hold.releasedBy = params.adminUserId;

    Logger.info("data:legal_hold_released", "Legal hold released", {
      holdId: params.holdId,
      dataset: hold.dataset,
      recordId: hold.recordId,
      adminUserId: params.adminUserId,
      requestId: params.requestId,
    });

    await AuditLogStore.log({
      adminUserId: params.adminUserId,
      action: "legal_hold_removed",
      targetType: "legal_hold",
      targetId: params.holdId,
      metadata: {
        dataset: hold.dataset,
        recordId: hold.recordId,
        requestId: params.requestId,
      },
    });

    return hold;
  }

  /**
   * Retrieves all currently active legal holds.
   */
  public static async getActiveHolds(): Promise<LegalHoldRecord[]> {
    return Array.from(getLegalHoldsMap().values()).filter((h) => h.isActive);
  }

  /**
   * Counts active legal holds.
   */
  public static async getActiveHoldsCount(): Promise<number> {
    const active = await this.getActiveHolds();
    return active.length;
  }

  /**
   * Clears in-memory legal holds store (for test teardown).
   */
  public static clear(): void {
    if (globalThis.__legalHoldsStore) {
      globalThis.__legalHoldsStore.clear();
    }
  }
}
