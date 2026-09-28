import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { NotificationStore } from "@/lib/notifications/store";
import { notificationQuerySchema } from "@/lib/validations/notifications";
import { handleApiError, AppError } from "@/lib/utils/errors";

/**
 * GET /api/v1/notifications
 * Lists in-app notifications for the authenticated user with unread counts and bounded pagination.
 *
 * SECURITY INVARIANTS:
 * - Requires authenticated user identity.
 * - Extracts userId strictly from session; ignores any client-supplied userId.
 * - Enforces bounded page size (max 50).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
    }

    const { searchParams } = new URL(req.url);
    const parsedQuery = notificationQuerySchema.parse({
      unreadOnly: searchParams.get("unreadOnly") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });

    const result = await NotificationStore.getNotifications(user.id, {
      unreadOnly: parsedQuery.unreadOnly,
      category: parsedQuery.category,
      limit: parsedQuery.limit,
      offset: parsedQuery.offset,
    });

    return NextResponse.json({
      success: true,
      data: {
        notifications: result.notifications,
        totalCount: result.totalCount,
        unreadCount: result.unreadCount,
        limit: parsedQuery.limit,
        offset: parsedQuery.offset,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
