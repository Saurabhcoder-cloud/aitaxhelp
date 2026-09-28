import { SUPABASE_CONFIG } from "@/lib/supabase/config";
import { getServerSupabaseClient } from "@/lib/supabase/server";

export interface AuditLogRecord {
  id: string;
  adminUserId: string;
  userId?: string;
  action: string;
  targetType: string;
  resourceType?: string;
  targetId: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  timestamp: string;
}

export type AuditLogEntry = AuditLogRecord;

interface AuditLogDbRow {
  id: string;
  admin_user_id: string;
  action: string;
  target_type: string;
  target_id: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __auditLogStore: AuditLogRecord[] | undefined;
}

function getMemoryStore(): AuditLogRecord[] {
  if (!globalThis.__auditLogStore) {
    globalThis.__auditLogStore = [];
  }
  return globalThis.__auditLogStore;
}

export class AuditLogStore {
  /**
   * Appends an immutable privileged audit event.
   * SECURITY: Client cannot spoof adminUserId; must be derived server-side.
   */
  public static async log(event: {
    adminUserId?: string;
    userId?: string;
    action: string;
    targetType?: string;
    resourceType?: string;
    targetId?: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<AuditLogRecord> {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const adminUserId = event.adminUserId || event.userId || "system";
    const targetType = event.targetType || event.resourceType || "system";
    const targetId = event.targetId || event.resourceId || "unknown";

    const record: AuditLogRecord = {
      id,
      adminUserId,
      userId: adminUserId,
      action: event.action,
      targetType,
      resourceType: targetType,
      targetId,
      resourceId: targetId,
      metadata: event.metadata,
      createdAt,
      timestamp: createdAt,
    };

    if (SUPABASE_CONFIG.isConfigured()) {
      try {
        const supabase = getServerSupabaseClient() as unknown as {
          from: (table: string) => {
            insert: (data: unknown) => Promise<{ error: { message: string } | null }>;
          };
        };

        await supabase.from("admin_audit_logs").insert({
          id,
          admin_user_id: adminUserId,
          action: event.action,
          target_type: targetType,
          target_id: targetId,
          metadata: event.metadata || null,
          created_at: createdAt,
        });
      } catch (_err) {
        // Fall back to memory logging if database fails
      }
    }

    const store = getMemoryStore();
    store.unshift(record);
    return record;
  }

  /**
   * Convenience alias for log() supporting resourceType/resourceId/userId naming.
   */
  public static async append(event: {
    userId?: string;
    adminUserId?: string;
    action: string;
    resourceType?: string;
    targetType?: string;
    resourceId?: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<AuditLogRecord> {
    return this.log(event);
  }

  /**
   * Retrieves all logs currently in memory.
   */
  public static getAll(): AuditLogRecord[] {
    return [...getMemoryStore()];
  }

  /**
   * Retrieves the most recent audit logs.
   */
  public static async listRecent(limit = 50): Promise<AuditLogRecord[]> {
    const result = await this.list({ limit });
    return result.logs;
  }

  /**
   * Retrieves paginated audit logs for administrative oversight.
   */
  public static async list(options: {
    page?: number;
    limit?: number;
    action?: string;
    targetType?: string;
  } = {}): Promise<AuditLogRecord[] & { logs: AuditLogRecord[]; total: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));

    if (SUPABASE_CONFIG.isConfigured()) {
      try {
        const supabase = getServerSupabaseClient() as unknown as {
          from: (table: string) => {
            select: (cols: string, opts?: { count?: string }) => {
              order: (
                col: string,
                opts: { ascending: boolean }
              ) => {
                range: (
                  start: number,
                  end: number
                ) => Promise<{ data: AuditLogDbRow[] | null; count: number | null; error: { message: string } | null }>;
              };
            };
          };
        };

        const start = (page - 1) * limit;
        const end = start + limit - 1;

        const { data, count } = await supabase
          .from("admin_audit_logs")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(start, end);

        if (data) {
          const logs: AuditLogRecord[] = data.map((row) => ({
            id: row.id,
            adminUserId: row.admin_user_id,
            userId: row.admin_user_id,
            action: row.action,
            targetType: row.target_type,
            resourceType: row.target_type,
            targetId: row.target_id,
            resourceId: row.target_id,
            metadata: row.metadata || undefined,
            createdAt: row.created_at,
            timestamp: row.created_at,
          }));

          const res = Object.assign([...logs], {
            logs,
            total: count || logs.length,
          });
          return res as AuditLogRecord[] & { logs: AuditLogRecord[]; total: number };
        }
      } catch (_err) {
        // Fall back to memory store on DB error
      }
    }

    let logs = [...getMemoryStore()];

    if (options.action) {
      logs = logs.filter((l) => l.action.toLowerCase() === options.action?.toLowerCase());
    }
    if (options.targetType) {
      logs = logs.filter((l) => l.targetType.toLowerCase() === options.targetType?.toLowerCase());
    }

    const total = logs.length;
    const startIndex = (page - 1) * limit;
    const paginated = logs.slice(startIndex, startIndex + limit);

    const res = Object.assign([...paginated], {
      logs: paginated,
      total,
    });
    return res as AuditLogRecord[] & { logs: AuditLogRecord[]; total: number };
  }

  public static clearStore(): void {
    if (globalThis.__auditLogStore) {
      globalThis.__auditLogStore = [];
    }
  }

  public static clear(): void {
    AuditLogStore.clearStore();
  }
}
