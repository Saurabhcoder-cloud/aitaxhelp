import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { TaxCalculationStore } from "@/lib/services/tax-calculation-store";
import { adminCalculationQuerySchema } from "@/lib/validations/admin";
import { AuditLogStore } from "@/lib/services/audit-log-store";
import { handleApiError } from "@/lib/utils/errors";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);

    const { searchParams } = new URL(req.url);
    const parsedParams = {
      q: searchParams.get("q") || undefined,
      taxYear: searchParams.get("taxYear") || undefined,
      calculatorType: searchParams.get("calculatorType") || undefined,
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 20,
    };

    const validated = adminCalculationQuerySchema.parse(parsedParams);

    const result = await TaxCalculationStore.listAllForAdmin({
      q: validated.q,
      taxYear: validated.taxYear,
      calculatorType: validated.calculatorType,
      page: validated.page,
      limit: validated.limit,
    });

    await AuditLogStore.log({
      adminUserId: admin.id,
      action: "admin_listed_calculations",
      targetType: "calculations",
      targetId: "list",
      metadata: {
        total: result.total,
        page: result.page,
      },
    });

    return NextResponse.json({
      success: true,
      data: result.calculations,
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
