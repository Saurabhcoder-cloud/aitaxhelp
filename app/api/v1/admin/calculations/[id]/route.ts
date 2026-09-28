import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { TaxCalculationStore } from "@/lib/services/tax-calculation-store";
import { AuditLogStore } from "@/lib/services/audit-log-store";
import { handleApiError, AppError } from "@/lib/utils/errors";

interface RouteParams {
  params: Promise<{ id: string }> | { id: string };
}

/**
 * GET /api/v1/admin/calculations/[id]
 * Read-only inspection of a historical calculation record.
 * IMMUTABILITY: Calculation results, engineVersion, and rulesVersion cannot be mutated.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin(req);
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams.id;

    if (!id || id.trim().length === 0) {
      throw new AppError("Calculation ID is required.", 400, "BAD_REQUEST");
    }

    const calculation = await TaxCalculationStore.getByIdForAdmin(id);
    if (!calculation) {
      throw new AppError("Calculation not found.", 404, "NOT_FOUND");
    }

    await AuditLogStore.log({
      adminUserId: admin.id,
      action: "admin_viewed_calculation",
      targetType: "calculation",
      targetId: id,
    });

    return NextResponse.json({
      success: true,
      data: calculation,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
