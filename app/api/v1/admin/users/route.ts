import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { UserProfileStore } from "@/lib/services/user-profile-store";
import { TaxCalculationStore } from "@/lib/services/tax-calculation-store";
import { ConversationStore } from "@/lib/services/conversation-store";
import { ProfessionalLeadStore } from "@/lib/services/professional-lead-store";
import { adminUserQuerySchema } from "@/lib/validations/admin";
import { AuditLogStore } from "@/lib/services/audit-log-store";
import { handleApiError } from "@/lib/utils/errors";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);

    const { searchParams } = new URL(req.url);
    const parsedParams = {
      q: searchParams.get("q") || undefined,
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 20,
    };

    const validated = adminUserQuerySchema.parse(parsedParams);

    const { users, total } = await UserProfileStore.listUsersForAdmin({
      q: validated.q,
      page: validated.page,
      limit: validated.limit,
    });

    // Populate operational activity summaries for each user in the page
    const userSummaries = await Promise.all(
      users.map(async (user) => {
        const [calculations, conversations, leads, taxProfile] = await Promise.all([
          TaxCalculationStore.listByUser(user.id),
          ConversationStore.listUserConversations(user.id),
          ProfessionalLeadStore.listByUser(user.id),
          UserProfileStore.getTaxProfile(user.id),
        ]);

        return {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role || "user",
          createdAt: user.createdAt,
          hasTaxProfile: Boolean(taxProfile && taxProfile.stateOfResidence),
          calculationCount: calculations.length,
          conversationCount: conversations.length,
          leadCount: leads.length,
        };
      })
    );

    await AuditLogStore.log({
      adminUserId: admin.id,
      action: "admin_listed_users",
      targetType: "users",
      targetId: "list",
      metadata: {
        total,
        page: validated.page,
      },
    });

    return NextResponse.json({
      success: true,
      data: userSummaries,
      pagination: {
        total,
        page: validated.page,
        limit: validated.limit,
        totalPages: Math.ceil(total / validated.limit) || 1,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
