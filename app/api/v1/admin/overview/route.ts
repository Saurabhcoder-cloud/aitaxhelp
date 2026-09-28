import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { AdminOverviewStore } from "@/lib/services/admin-overview-store";
import { AuditLogStore } from "@/lib/services/audit-log-store";
import { handleApiError } from "@/lib/utils/errors";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);

    const overview = await AdminOverviewStore.getOverview();

    await AuditLogStore.log({
      adminUserId: admin.id,
      action: "admin_viewed_overview",
      targetType: "overview",
      targetId: "dashboard",
    });

    return NextResponse.json({
      success: true,
      data: overview,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
