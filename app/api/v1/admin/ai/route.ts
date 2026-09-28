import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { ConversationStore } from "@/lib/services/conversation-store";
import { AuditLogStore } from "@/lib/services/audit-log-store";
import { handleApiError } from "@/lib/utils/errors";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)));

    const [metrics, convList] = await Promise.all([
      ConversationStore.getAdminMetrics(),
      ConversationStore.listConversationsForAdmin({ page, limit }),
    ]);

    await AuditLogStore.log({
      adminUserId: admin.id,
      action: "admin_viewed_ai_analytics",
      targetType: "ai_analytics",
      targetId: "overview",
    });

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        conversations: convList.conversations,
        pagination: {
          total: convList.total,
          page: convList.page,
          limit: convList.limit,
          totalPages: convList.totalPages,
        },
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
