import { ErrorBudgetReport, ServiceId } from "@/types/operations";
import { SERVICE_CATALOG } from "./service-catalog";

/**
 * Service Error Budget Calculator (Phase 5 Step 19)
 *
 * HONESTY INVARIANT: If no production monitoring timeseries exists,
 * returns measurementState: "NO_DATA". Never fabricates uptime or uptime percentages.
 */
export class ErrorBudgetCalculator {
  /**
   * Evaluates error budget for a given service.
   * If real production monitoring timeseries is not configured, honestly reports NO_DATA.
   */
  public static calculate(
    serviceId: ServiceId,
    measuredDowntimeMinutes?: number,
    windowDays: number = 30
  ): ErrorBudgetReport {
    const item = SERVICE_CATALOG[serviceId];
    if (!item) {
      return {
        serviceId,
        targetAvailabilityPercent: 99.9,
        measurementWindowDays: windowDays,
        measurementState: "NO_DATA",
        status: "NO_DATA",
        note: "Service not found in catalog.",
      };
    }

    // Total minutes in window
    const totalMinutes = windowDays * 24 * 60;
    // Total allowable downtime minutes based on target
    const allowedDowntimeMinutes = totalMinutes * (1 - item.targetAvailabilityPercent / 100);

    // If downtime is undefined or negative, report honest NO_DATA
    if (measuredDowntimeMinutes === undefined || measuredDowntimeMinutes === null) {
      return {
        serviceId,
        targetAvailabilityPercent: item.targetAvailabilityPercent,
        measurementWindowDays: windowDays,
        measurementState: "NO_DATA",
        status: "NO_DATA",
        note: "Empirical uptime metrics unmeasured in current environment. Target is operational default.",
      };
    }

    const remainingBudgetMinutes = Math.max(0, allowedDowntimeMinutes - measuredDowntimeMinutes);
    const budgetRemainingPercent = Math.round(
      (remainingBudgetMinutes / Math.max(1, allowedDowntimeMinutes)) * 100
    );

    return {
      serviceId,
      targetAvailabilityPercent: item.targetAvailabilityPercent,
      measurementWindowDays: windowDays,
      measurementState: "MEASURED",
      budgetRemainingPercent,
      unplannedDowntimeMinutes: measuredDowntimeMinutes,
      status:
        budgetRemainingPercent === 0
          ? "EXHAUSTED"
          : budgetRemainingPercent > 20
            ? "HEALTHY"
            : "DEGRADED",
      note: `Error budget evaluated against ${windowDays}-day target of ${item.targetAvailabilityPercent}%.`,
    };
  }

  /**
   * Returns error budget summaries across all catalog services.
   */
  public static calculateAll(windowDays: number = 30): ErrorBudgetReport[] {
    return Object.keys(SERVICE_CATALOG).map((id) =>
      this.calculate(id as ServiceId, undefined, windowDays)
    );
  }
}
