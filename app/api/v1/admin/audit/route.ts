import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { AuditLogStore } from "@/lib/services/audit-log-store";
import { handleApiError } from "@/lib/utils/errors";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);

    const { searchParams } = new URL(req.url);
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "50", 10)));

    const logs = await AuditLogStore.listRecent(limit);

    await AuditLogStore.log({
      adminUserId: admin.id,
      action: "admin_viewed_audit_log",
      targetType: "audit_logs",
      targetId: "list",
      metadata: { count: logs.length },
    });

    return NextResponse.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
