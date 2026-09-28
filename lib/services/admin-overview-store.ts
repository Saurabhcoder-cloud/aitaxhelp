import { UserProfileStore } from "@/lib/services/user-profile-store";
import { TaxCalculationStore } from "@/lib/services/tax-calculation-store";
import { ConversationStore } from "@/lib/services/conversation-store";
import { ProfessionalLeadStore } from "@/lib/services/professional-lead-store";
import { TaxReportAnalyticsStore } from "@/lib/services/tax-report-analytics-store";
import { AuditLogStore, AuditLogEntry } from "@/lib/services/audit-log-store";

export interface AdminOverviewMetrics {
  totalUsers: number;
  newUsers: number;
  savedCalculations: number;
  aiConversations: number;
  professionalLeads: number;
  openLeads: number;
  reportsGenerated: number;
  recentAuditActivity: AuditLogEntry[];
}

export class AdminOverviewStore {
  /**
   * Aggregates real operational data across stores for the admin dashboard.
   * NO FAKE DATA: Returns actual database/store counts. If empty, returns 0.
   */
  public static async getOverview(): Promise<AdminOverviewMetrics> {
    const [
      userCounts,
      calculationCounts,
      aiMetrics,
      leadCounts,
      reportMetrics,
      recentAuditActivity,
    ] = await Promise.all([
      UserProfileStore.countUsers(),
      TaxCalculationStore.countAll(),
      ConversationStore.getAdminMetrics(),
      ProfessionalLeadStore.countAll(),
      TaxReportAnalyticsStore.getReportMetrics(),
      AuditLogStore.listRecent(10),
    ]);

    return {
      totalUsers: userCounts.total,
      newUsers: userCounts.newUsers,
      savedCalculations: calculationCounts.total,
      aiConversations: aiMetrics.totalConversations,
      professionalLeads: leadCounts.total,
      openLeads: leadCounts.open,
      reportsGenerated: reportMetrics.reportsGenerated,
      recentAuditActivity,
    };
  }
}
