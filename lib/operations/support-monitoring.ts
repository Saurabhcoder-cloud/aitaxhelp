import { SupportStore } from "@/lib/services/support-store";
import { MeasurementState } from "@/types/operations";

export interface SupportOperationalMetrics {
  openTickets: number;
  inProgressTickets: number;
  urgentTickets: number;
  waitingForUser: number;
  waitingInternal: number;
  resolvedTickets: number;
  closedTickets: number;
  unassignedTickets: number;
  totalTickets: number;
  averageFirstResponseMinutes: number | "NO_DATA";
  averageResolutionMinutes: number | "NO_DATA";
  measurementState: MeasurementState;
  status: "HEALTHY" | "DEGRADED";
}

/**
 * Customer Support Operational Telemetry (Phase 5 Step 19)
 *
 * HONESTY INVARIANT: If historical duration timestamps are unmeasured, returns NO_DATA.
 * Never fabricates resolution averages.
 */
export class SupportMonitor {
  /**
   * Compiles operational support metrics.
   */
  public static async getMetrics(): Promise<SupportOperationalMetrics> {
    const stats = await SupportStore.getSupportStats();

    // Determine workload health
    let status: "HEALTHY" | "DEGRADED" = "HEALTHY";
    if (stats.urgentCount > 10 || stats.unassignedCount > 50) {
      status = "DEGRADED";
    }

    return {
      openTickets: stats.openCount,
      inProgressTickets: stats.inProgressCount,
      urgentTickets: stats.urgentCount,
      waitingForUser: stats.waitingForUserCount,
      waitingInternal: stats.waitingInternalCount,
      resolvedTickets: stats.resolvedCount,
      closedTickets: stats.closedCount,
      unassignedTickets: stats.unassignedCount,
      totalTickets: stats.totalCount,
      averageFirstResponseMinutes: "NO_DATA", // Honest: Not measured without production ticketing duration provider
      averageResolutionMinutes: "NO_DATA", // Honest: Not measured without production ticketing duration provider
      measurementState: stats.totalCount > 0 ? "MEASURED" : "NO_DATA",
      status,
    };
  }
}
