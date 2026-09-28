import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { NotificationStore } from "@/lib/notifications/store";
import { handleApiError, AppError } from "@/lib/utils/errors";

/**
 * POST /api/v1/notifications/read-all
 * Marks all in-app notifications as read for the authenticated user.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
    }

    const updatedCount = await NotificationStore.markAllAsRead(user.id);

    return NextResponse.json({
      success: true,
      data: {
        updatedCount,
        message: `Marked ${updatedCount} notification(s) as read.`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
