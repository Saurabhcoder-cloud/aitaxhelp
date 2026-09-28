import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { UserProfileStore } from "@/lib/services/user-profile-store";
import { TaxCalculationStore } from "@/lib/services/tax-calculation-store";
import { ConversationStore } from "@/lib/services/conversation-store";
import { ProfessionalLeadStore } from "@/lib/services/professional-lead-store";
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
      throw new AppError("User ID is required.", 400, "BAD_REQUEST");
    }

    const profile = await UserProfileStore.getProfile(id);
    if (!profile) {
      throw new AppError("User not found.", 404, "NOT_FOUND");
    }

    const [taxProfile, calculations, conversations, leads] = await Promise.all([
      UserProfileStore.getTaxProfile(id),
      TaxCalculationStore.listByUser(id),
      ConversationStore.listUserConversations(id),
      ProfessionalLeadStore.listByUser(id),
    ]);

    await AuditLogStore.log({
      adminUserId: admin.id,
      action: "admin_viewed_user",
      targetType: "user",
      targetId: id,
    });

    // Sanitized operational details only (no credentials, tokens, or raw secrets)
    const sanitizedUser = {
      account: {
        id: profile.id,
        email: profile.email,
        fullName: profile.fullName,
        role: profile.role || "user",
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
      activity: {
        calculationCount: calculations.length,
        conversationCount: conversations.length,
        leadCount: leads.length,
        recentCalculations: calculations.slice(0, 5).map((c) => ({
          id: c.id,
          title: c.title,
          calculatorType: c.calculatorType,
          taxYear: c.taxYear,
          filingStatus: c.filingStatus,
          createdAt: c.createdAt,
        })),
        recentConversations: conversations.slice(0, 5),
        recentLeads: leads.slice(0, 5),
      },
      taxProfile: {
        defaultTaxYear: taxProfile.defaultTaxYear,
        filingStatus: taxProfile.filingStatus,
        hasW2Income: taxProfile.hasW2Income,
        has1099Income: taxProfile.has1099Income,
        hasBusinessExpenses: taxProfile.hasBusinessExpenses,
        stateOfResidence: taxProfile.stateOfResidence,
        updatedAt: taxProfile.updatedAt,
      },
    };

    return NextResponse.json({
      success: true,
      data: sanitizedUser,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
