import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { NotificationPreferencesStore } from "@/lib/notifications/preferences";
import { updateNotificationPreferencesSchema } from "@/lib/validations/notifications";
import { handleApiError, AppError } from "@/lib/utils/errors";

/**
 * GET /api/v1/notifications/preferences
 * Retrieves notification preferences for the authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
    }

    const preferences = await NotificationPreferencesStore.getPreferences(user.id);

    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/v1/notifications/preferences
 * Updates user notification preferences.
 *
 * CRITICAL SECURITY INVARIANT:
 * Security and critical account lifecycle notifications cannot be disabled.
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch (_err) {
      throw new AppError("Malformed JSON in request body.", 400, "BAD_REQUEST");
    }

    const updates = updateNotificationPreferencesSchema.parse(rawBody);

    const updatedPreferences = await NotificationPreferencesStore.updatePreferences(
      user.id,
      updates
    );

    return NextResponse.json({
      success: true,
      data: updatedPreferences,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
