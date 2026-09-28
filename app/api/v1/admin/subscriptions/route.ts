import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { SubscriptionStore } from "@/lib/services/subscription-store";
import { AuditLogStore } from "@/lib/services/audit-log-store";
import { handleApiError } from "@/lib/utils/errors";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)));
    const status = searchParams.get("status") || undefined;

    const [result, counts] = await Promise.all([
      SubscriptionStore.listAllForAdmin({ page, limit, status }),
      SubscriptionStore.countSubscriptions(),
    ]);

    await AuditLogStore.log({
      adminUserId: admin.id,
      action: "admin_viewed_subscriptions",
      targetType: "subscriptions",
      targetId: "list",
      metadata: { total: result.total, page },
    });

    return NextResponse.json({
      success: true,
      data: result.subscriptions,
      counts,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
