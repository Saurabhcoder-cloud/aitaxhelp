import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { ProfessionalLeadStore, ProfessionalLeadStatus } from "@/lib/services/professional-lead-store";
import { adminUpdateLeadSchema } from "@/lib/validations/admin";
import { AuditLogStore } from "@/lib/services/audit-log-store";
import { handleApiError, AppError } from "@/lib/utils/errors";

interface RouteParams {
  params: Promise<{ id: string }> | { id: string };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin(req);
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams.id;

    if (!id || id.trim().length === 0) {
      throw new AppError("Lead ID is required.", 400, "BAD_REQUEST");
    }

    const lead = await ProfessionalLeadStore.getByIdForAdmin(id);
    if (!lead) {
      throw new AppError("Lead not found.", 404, "NOT_FOUND");
    }

    await AuditLogStore.log({
      adminUserId: admin.id,
      action: "admin_viewed_lead",
      targetType: "professional_lead",
      targetId: id,
    });

    return NextResponse.json({
      success: true,
      data: lead,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin(req);
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams.id;

    if (!id || id.trim().length === 0) {
      throw new AppError("Lead ID is required.", 400, "BAD_REQUEST");
    }

    const rawBody = await req.json();
    const validated = adminUpdateLeadSchema.parse(rawBody);

    const updated = await ProfessionalLeadStore.updateStatusAndNote(
      id,
      admin.id,
      validated.status as ProfessionalLeadStatus | undefined,
      validated.note
    );

    if (!updated) {
      throw new AppError("Lead not found.", 404, "NOT_FOUND");
    }

    await AuditLogStore.log({
      adminUserId: admin.id,
      action: validated.note ? "admin_added_internal_note" : "admin_updated_lead_status",
      targetType: "professional_lead",
      targetId: id,
      metadata: {
        newStatus: validated.status,
        noteAdded: !!validated.note,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Lead updated successfully.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
