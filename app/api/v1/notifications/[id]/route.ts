import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { NotificationStore } from "@/lib/notifications/store";
import { markNotificationSchema } from "@/lib/validations/notifications";
import { handleApiError, AppError } from "@/lib/utils/errors";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/v1/notifications/[id]
 * Updates read status of a notification owned by the authenticated user.
 *
 * SECURITY INVARIANTS:
 * - Requires authenticated user identity.
 * - Confirms that the target notification is strictly owned by the caller.
 * - Blocks any cross-user mutation attempts.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
    }

    const { id } = await params;
    if (!id || typeof id !== "string") {
      throw new AppError("Invalid notification identifier.", 400, "BAD_REQUEST");
    }

    let rawBody: unknown = {};
    try {
      rawBody = await req.json();
    } catch (_err) {
      // Body is optional; defaults to { read: true }
    }

    const { read } = markNotificationSchema.parse(rawBody);

    // Verify existing notification exists and belongs to the authenticated user
    const existing = await NotificationStore.getById(id, user.id);
    if (!existing) {
      throw new AppError(
        "Notification not found or access denied.",
        404,
        "NOTIFICATION_NOT_FOUND"
      );
    }

    let updated;
    if (read) {
      updated = await NotificationStore.markAsRead(id, user.id);
    } else {
      // If toggling back to unread
      const map = (NotificationStore as unknown as { getNotificationMap?: () => Map<string, unknown> });
      existing.read = false;
      existing.readAt = undefined;
      updated = existing;
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/v1/notifications/[id]
 * Deletes a single notification owned by the authenticated user.
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
    }

    const { id } = await params;
    const deleted = await NotificationStore.delete(id, user.id);
    if (!deleted) {
      throw new AppError(
        "Notification not found or access denied.",
        404,
        "NOTIFICATION_NOT_FOUND"
      );
    }

    return NextResponse.json({
      success: true,
      data: { id, deleted: true },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
