import { OperationsSummaryReport, OperationalStatus } from "@/types/operations";
import { ServiceHealthService } from "./service-health";
import { IncidentStore } from "./incident-store";
import { AlertService } from "./alerts";
import { PlatformConfigStore } from "@/lib/config/platform-config-store";

/**
 * High-Level Operations Overview Report Service (Phase 5 Step 19)
 *
 * Compiles a comprehensive snapshot of overall platform operational health.
 */
export class OperationsReportService {
  /**
   * Generates a unified operational overview report.
   */
  public static async getSummary(): Promise<OperationsSummaryReport> {
    const services = ServiceHealthService.evaluateAllServices();
    const allIncidents = await IncidentStore.getAllIncidents();
    const openIncidents = allIncidents.filter((i) => i.status !== "RESOLVED" && i.status !== "CLOSED");
    const activeAlerts = AlertService.getActiveAlerts();

    const sev1Count = openIncidents.filter((i) => i.severity === "SEV1").length;
    const sev2Count = openIncidents.filter((i) => i.severity === "SEV2").length;

    const isMaintenance = PlatformConfigStore.getBoolean("platform.maintenance_mode", false);

    // Calculate overall status
    let overallStatus: OperationalStatus = "HEALTHY";

    if (isMaintenance) {
      overallStatus = "MAINTENANCE";
    } else if (sev1Count > 0) {
      overallStatus = "MAJOR_OUTAGE";
    } else if (sev2Count > 0) {
      overallStatus = "PARTIAL_OUTAGE";
    } else if (services.some((s) => s.status === "DEGRADED")) {
      overallStatus = "DEGRADED";
    }

    const taxEngineService = services.find((s) => s.serviceId === "TAX_ENGINE");
    const aiService = services.find((s) => s.serviceId === "AI_ASSISTANT");
    const billingService = services.find((s) => s.serviceId === "BILLING");
    const emailService = services.find((s) => s.serviceId === "EMAIL");
    const backupService = services.find((s) => s.serviceId === "BACKUP");

    return {
      overallStatus,
      services,
      openIncidentsCount: openIncidents.length,
      activeAlertsCount: activeAlerts.length,
      sev1Count,
      sev2Count,
      maintenanceMode: isMaintenance,
      taxEngineStatus: taxEngineService?.status || "HEALTHY",
      aiStatus: aiService?.status || "HEALTHY",
      billingStatus: billingService?.status || "HEALTHY",
      emailStatus: emailService?.status || "HEALTHY",
      backupStatus: backupService?.status || "NOT_CONFIGURED",
      generatedAt: new Date().toISOString(),
    };
  }
}
