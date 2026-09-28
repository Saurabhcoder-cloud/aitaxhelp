import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { SupportService } from "@/lib/services/support-service";
import { supportSearchFilterSchema } from "@/lib/validations/support";
import { getOrGenerateRequestId, withRequestId } from "@/lib/observability/request-id";
import { formatStandardError } from "@/lib/observability/errors";
import { Metrics } from "@/lib/observability/metrics";

/**
 * GET /api/v1/admin/support
 * Lists tickets for administrative queue with search, category, status, priority filters, and pagination.
 *
 * SECURITY:
 * Strictly requires verified administrator authorization (requireAdmin).
 */
export async function GET(req: NextRequest) {
  const requestId = getOrGenerateRequestId(req);

  try {
    await requireAdmin(req);
    Metrics.increment("api_request_total", 1, { endpoint: "/api/v1/admin/support" });

    const { searchParams } = new URL(req.url);
    const parsed = supportSearchFilterSchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      priority: searchParams.get("priority") ?? undefined,
      assignedAdminId: searchParams.get("assignedAdminId") ?? undefined,
    });

    const result = await SupportService.listTicketsForAdmin(parsed);

    const response = NextResponse.json({
      success: true,
      data: result,
    });
    return withRequestId(response, requestId);
  } catch (error) {
    Metrics.increment("api_request_failed", 1, { endpoint: "/api/v1/admin/support" });
    return formatStandardError(error, requestId);
  }
}
