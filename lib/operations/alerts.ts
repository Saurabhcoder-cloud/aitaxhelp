import { AlertRecord, AlertSeverity, AlertStatus, ServiceId } from "@/types/operations";
import { AuditLogStore } from "@/lib/services/audit-log-store";
import { Metrics } from "@/lib/observability/metrics";
import { Logger } from "@/lib/observability/logger";

declare global {
  // eslint-disable-next-line no-var
  var __operationsAlertsStore: Map<string, AlertRecord> | undefined;
}

function getAlertsMap(): Map<string, AlertRecord> {
  if (!globalThis.__operationsAlertsStore) {
    globalThis.__operationsAlertsStore = new Map<string, AlertRecord>();
  }
  return globalThis.__operationsAlertsStore;
}

/**
 * Operational Alerting Subsystem (Phase 5 Step 19)
 *
 * Tracks threshold triggers for 5xx errors, latency anomalies, tax engine failures,
 * AI service degradation, and security signals.
 *
 * SAFETY INVARIANT: Never captures or exposes raw taxpayer data or secrets.
 */
export class AlertService {
  /**
   * Evaluates or updates an alert condition.
   * If an active open alert for the condition exists, increments count; otherwise creates new open alert.
   */
  public static triggerAlert(
    service: ServiceId,
    severity: AlertSeverity,
    condition: string,
    metadata?: { count?: number; window?: string; actor?: string }
  ): AlertRecord {
    const map = getAlertsMap();
    const alertKey = `alert_${service.toLowerCase()}_${condition.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
    const now = new Date().toISOString();

    const existing = map.get(alertKey);
    if (existing && existing.status === "OPEN") {
      existing.count += metadata?.count || 1;
      existing.updatedAt = now;
      map.set(alertKey, existing);
      return existing;
    }

    const alert: AlertRecord = {
      id: "alt_" + Math.random().toString(36).substring(2, 9),
      alertId: alertKey,
      service,
      severity,
      condition,
      status: "OPEN",
      triggeredAt: now,
      count: metadata?.count || 1,
      measurementWindow: metadata?.window || "5m",
      createdAt: now,
      updatedAt: now,
    };

    map.set(alertKey, alert);

    Metrics.increment("alert_triggered_total", 1, { service, severity });
    Logger.warn("alert:triggered", { service, severity, condition });

    AuditLogStore.append({
      userId: metadata?.actor || "system",
      action: "alert_triggered",
      resourceType: "alert",
      resourceId: alertKey,
      metadata: { service, severity, condition },
    });

    return alert;
  }

  /**
   * Acknowledges an active operational alert.
   */
  public static acknowledgeAlert(alertId: string, adminUserId: string): AlertRecord | null {
    const map = getAlertsMap();
    for (const alert of map.values()) {
      if (alert.id === alertId || alert.alertId === alertId) {
        alert.status = "ACKNOWLEDGED";
        alert.acknowledgedBy = adminUserId;
        alert.acknowledgedAt = new Date().toISOString();
        alert.updatedAt = new Date().toISOString();

        AuditLogStore.append({
          userId: adminUserId,
          action: "alert_acknowledged",
          resourceType: "alert",
          resourceId: alert.alertId,
        });

        return alert;
      }
    }
    return null;
  }

  /**
   * Resolves an active or acknowledged operational alert.
   */
  public static resolveAlert(alertId: string, adminUserId: string): AlertRecord | null {
    const map = getAlertsMap();
    for (const alert of map.values()) {
      if (alert.id === alertId || alert.alertId === alertId) {
        alert.status = "RESOLVED";
        alert.resolvedAt = new Date().toISOString();
        alert.updatedAt = new Date().toISOString();

        AuditLogStore.append({
          userId: adminUserId,
          action: "alert_resolved",
          resourceType: "alert",
          resourceId: alert.alertId,
        });

        return alert;
      }
    }
    return null;
  }

  /**
   * Returns all active (OPEN / ACKNOWLEDGED) alerts.
   */
  public static getActiveAlerts(): AlertRecord[] {
    const map = getAlertsMap();
    return Array.from(map.values())
      .filter((a) => a.status === "OPEN" || a.status === "ACKNOWLEDGED")
      .sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime());
  }

  /**
   * Returns all alerts with optional status filtering.
   */
  public static getAllAlerts(statusFilter?: AlertStatus): AlertRecord[] {
    const map = getAlertsMap();
    let list = Array.from(map.values());
    if (statusFilter) {
      list = list.filter((a) => a.status === statusFilter);
    }
    return list.sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime());
  }

  /**
   * Clears alerts store (used in test setup).
   */
  public static clear(): void {
    getAlertsMap().clear();
  }
}
