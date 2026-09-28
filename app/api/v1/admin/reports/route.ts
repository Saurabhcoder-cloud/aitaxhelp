import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { TaxReportAnalyticsStore } from "@/lib/services/tax-report-analytics-store";
import { AuditLogStore } from "@/lib/services/audit-log-store";
import { handleApiError } from "@/lib/utils/errors";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);

    const metrics = await TaxReportAnalyticsStore.getReportMetrics();

    await AuditLogStore.log({
      adminUserId: admin.id,
      action: "admin_viewed_report_analytics",
      targetType: "report_analytics",
      targetId: "overview",
    });

    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
