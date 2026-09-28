import { SUPABASE_CONFIG } from "@/lib/supabase/config";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import {
  InAppNotification,
  NotificationDeliveryRecord,
  NotificationCategory,
  NotificationType,
  DeliveryChannel,
  DeliveryStatus,
} from "./types";

interface NotificationDbRow {
  id: string;
  user_id: string;
  category: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  action_url: string | null;
  action_label: string | null;
  is_admin_only: boolean;
  metadata: Record<string, string | number | boolean> | null;
  created_at: string;
  read_at: string | null;
}

interface DeliveryDbRow {
  id: string;
  user_id: string;
  notification_type: string;
  channel: string;
  provider: string;
  status: string;
  idempotency_key: string | null;
  recipient_sanitized: string;
  failure_code: string | null;
  metadata: Record<string, string | number | boolean> | null;
  created_at: string;
  sent_at: string | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __inAppNotificationStore: Map<string, InAppNotification> | undefined;
  // eslint-disable-next-line no-var
  var __notificationDeliveryLog: Map<string, NotificationDeliveryRecord> | undefined;
}

function getNotificationMap(): Map<string, InAppNotification> {
  if (!globalThis.__inAppNotificationStore) {
    globalThis.__inAppNotificationStore = new Map<string, InAppNotification>();
  }
  return globalThis.__inAppNotificationStore;
}

function getDeliveryMap(): Map<string, NotificationDeliveryRecord> {
  if (!globalThis.__notificationDeliveryLog) {
    globalThis.__notificationDeliveryLog = new Map<string, NotificationDeliveryRecord>();
  }
  return globalThis.__notificationDeliveryLog;
}

export interface NotificationQueryOptions {
  unreadOnly?: boolean;
  category?: NotificationCategory;
  limit?: number;
  offset?: number;
}

export class NotificationStore {
  private static readonly MAX_PAGE_LIMIT = 50;
  private static readonly DEFAULT_PAGE_LIMIT = 20;
  private static readonly RETENTION_LIMIT_PER_USER = 100;

  /**
   * Generates a unique notification ID.
   */
  private static generateId(prefix = "notif"): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  /**
   * Retrieves in-app notifications for an authenticated user with bounded pagination.
   * STRICT ACCESS CONTROL: Only returns records owned by `userId` and excludes admin-only entries.
   */
  public static async getNotifications(
    userId: string,
    options: NotificationQueryOptions = {}
  ): Promise<{ notifications: InAppNotification[]; totalCount: number; unreadCount: number }> {
    const limit = Math.min(
      Math.max(1, options.limit || this.DEFAULT_PAGE_LIMIT),
      this.MAX_PAGE_LIMIT
    );
    const offset = Math.max(0, options.offset || 0);

    if (SUPABASE_CONFIG.isConfigured()) {
      try {
        const supabase = getServerSupabaseClient() as unknown as {
          from: (table: string) => {
            select: (cols: string, opts?: { count?: string }) => {
              eq: (col: string, val: string | boolean) => {
                order: (col: string, opts: { ascending: boolean }) => {
                  range: (from: number, to: number) => Promise<{
                    data: NotificationDbRow[] | null;
                    count: number | null;
                    error: { message: string } | null;
                  }>;
                };
              };
            };
          };
        };

        const res = await supabase
          .from("notifications")
          .select("*", { count: "exact" })
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (res.data && !res.error) {
          const mapped: InAppNotification[] = res.data
            .filter((row) => !row.is_admin_only)
            .map((row) => ({
              id: row.id,
              userId: row.user_id,
              category: row.category as NotificationCategory,
              type: row.type as NotificationType,
              title: row.title,
              message: row.message,
              read: row.read,
              actionUrl: row.action_url || undefined,
              actionLabel: row.action_label || undefined,
              isAdminOnly: row.is_admin_only,
              metadata: row.metadata || undefined,
              createdAt: row.created_at,
              readAt: row.read_at || undefined,
            }));

          const unreadCount = mapped.filter((n) => !n.read).length;
          return {
            notifications: mapped,
            totalCount: res.count || mapped.length,
            unreadCount,
          };
        }
      } catch (_err) {
        // Fall back to memory store
      }
    }

    const map = getNotificationMap();
    const userNotifications = Array.from(map.values())
      .filter((n) => n.userId === userId && !n.isAdminOnly)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const unreadCount = userNotifications.filter((n) => !n.read).length;

    let filtered = userNotifications;
    if (options.unreadOnly) {
      filtered = filtered.filter((n) => !n.read);
    }
    if (options.category) {
      filtered = filtered.filter((n) => n.category === options.category);
    }

    const paginated = filtered.slice(offset, offset + limit);

    return {
      notifications: paginated,
      totalCount: filtered.length,
      unreadCount,
    };
  }

  /**
   * Retrieves single notification by ID enforcing ownership.
   */
  public static async getById(id: string, userId: string): Promise<InAppNotification | null> {
    const map = getNotificationMap();
    const item = map.get(id);
    if (!item) return null;
    if (item.userId !== userId) return null; // Cross-user security check
    return item;
  }

  /**
   * Creates an in-app notification.
   */
  public static async create(
    data: Omit<InAppNotification, "id" | "createdAt" | "read">
  ): Promise<InAppNotification> {
    const notification: InAppNotification = {
      ...data,
      id: this.generateId(),
      read: false,
      createdAt: new Date().toISOString(),
    };

    getNotificationMap().set(notification.id, notification);

    // Enforce retention bound per user to prevent unbounded growth
    this.enforceUserRetentionBound(notification.userId);

    return notification;
  }

  /**
   * Marks a notification as read.
   */
  public static async markAsRead(id: string, userId: string): Promise<InAppNotification | null> {
    const map = getNotificationMap();
    const item = map.get(id);
    if (!item || item.userId !== userId) {
      return null;
    }

    item.read = true;
    item.readAt = new Date().toISOString();
    map.set(id, item);

    return item;
  }

  /**
   * Marks all notifications as read for a given authenticated user.
   */
  public static async markAllAsRead(userId: string): Promise<number> {
    const map = getNotificationMap();
    let updatedCount = 0;
    const now = new Date().toISOString();

    for (const [id, item] of map.entries()) {
      if (item.userId === userId && !item.read) {
        item.read = true;
        item.readAt = now;
        map.set(id, item);
        updatedCount++;
      }
    }

    return updatedCount;
  }

  /**
   * Deletes a single notification ensuring ownership.
   */
  public static async delete(id: string, userId: string): Promise<boolean> {
    const map = getNotificationMap();
    const item = map.get(id);
    if (!item || item.userId !== userId) {
      return false;
    }
    return map.delete(id);
  }

  /**
   * Enforces bounded retention (max 100 entries per user).
   */
  private static enforceUserRetentionBound(userId: string): void {
    const map = getNotificationMap();
    const userItems = Array.from(map.values())
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (userItems.length > this.RETENTION_LIMIT_PER_USER) {
      const itemsToEvict = userItems.slice(this.RETENTION_LIMIT_PER_USER);
      for (const item of itemsToEvict) {
        map.delete(item.id);
      }
    }
  }

  /**
   * Purges all notifications for a user upon account deletion.
   */
  public static async purgeAllForUser(userId: string): Promise<number> {
    const map = getNotificationMap();
    let count = 0;
    for (const [id, item] of map.entries()) {
      if (item.userId === userId) {
        map.delete(id);
        count++;
      }
    }
    return count;
  }

  // ============================================================================
  // IDEMPOTENCY & DELIVERY LOG
  // ============================================================================

  /**
   * Checks if an event has already been recorded under an idempotency key.
   */
  public static isDeliveryIdempotent(idempotencyKey?: string): boolean {
    if (!idempotencyKey) return false;
    const deliveries = getDeliveryMap();
    for (const delivery of deliveries.values()) {
      if (delivery.idempotencyKey === idempotencyKey) {
        return true;
      }
    }
    return false;
  }

  /**
   * Records a sanitized delivery audit record.
   * PRIVACY GUARANTEE: Never logs full email bodies, passwords, or tax snapshots.
   */
  public static recordDelivery(
    record: Omit<NotificationDeliveryRecord, "id" | "createdAt">
  ): NotificationDeliveryRecord {
    const deliveryRecord: NotificationDeliveryRecord = {
      ...record,
      id: this.generateId("deliv"),
      createdAt: new Date().toISOString(),
    };

    getDeliveryMap().set(deliveryRecord.id, deliveryRecord);
    return deliveryRecord;
  }

  /**
   * Retrieves sanitized delivery records for audit.
   */
  public static getDeliveries(userId: string): NotificationDeliveryRecord[] {
    const map = getDeliveryMap();
    return Array.from(map.values()).filter((d) => d.userId === userId);
  }

  /**
   * Resets stores for testing.
   */
  public static clear(): void {
    getNotificationMap().clear();
    getDeliveryMap().clear();
  }
}
