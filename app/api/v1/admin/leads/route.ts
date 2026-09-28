import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { ProfessionalLeadStore, ProfessionalLeadStatus } from "@/lib/services/professional-lead-store";
import { adminLeadQuerySchema } from "@/lib/validations/admin";
import { AuditLogStore } from "@/lib/services/audit-log-store";
import { handleApiError } from "@/lib/utils/errors";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);

    const { searchParams } = new URL(req.url);
    const parsedParams = {
      q: searchParams.get("q") || undefined,
      status: searchParams.get("status") || undefined,
      taxYear: searchParams.get("taxYear") || undefined,
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 20,
    };

    const validated = adminLeadQuerySchema.parse(parsedParams);

    const result = await ProfessionalLeadStore.listAllForAdmin({
      q: validated.q,
      status: validated.status as ProfessionalLeadStatus | undefined,
      taxYear: validated.taxYear,
      page: validated.page,
      limit: validated.limit,
    });

    await AuditLogStore.log({
      adminUserId: admin.id,
      action: "admin_listed_leads",
      targetType: "professional_leads",
      targetId: "list",
      metadata: {
        total: result.total,
        page: result.page,
      },
    });

    return NextResponse.json({
      success: true,
      data: result.leads,
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
