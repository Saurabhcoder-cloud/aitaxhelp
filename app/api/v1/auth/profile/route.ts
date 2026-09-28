import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { UserProfileStore } from "@/lib/services/user-profile-store";
import { updateProfileRequestSchema } from "@/lib/validations/user-profile";
import { handleApiError, AppError } from "@/lib/utils/errors";

/**
 * GET /api/v1/auth/profile
 * Retrieves user account profile and tax preferences.
 * SECURITY: User identity is extracted exclusively from the verified server session.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError(
        "Authentication required to view profile.",
        401,
        "UNAUTHORIZED"
      );
    }

    const [profile, taxProfile] = await Promise.all([
      UserProfileStore.getProfile(user.id, user.email),
      UserProfileStore.getTaxProfile(user.id),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        profile,
        taxProfile,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/v1/auth/profile
 * Updates user account profile (display name) and/or taxpayer preferences.
 * SECURITY: Client-supplied userId is completely ignored in favor of server session.
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError(
        "Authentication required to update profile.",
        401,
        "UNAUTHORIZED"
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch (_err) {
      throw new AppError("Malformed JSON in request body.", 400, "BAD_REQUEST");
    }

    const validated = updateProfileRequestSchema.parse(rawBody);

    let updatedProfile = await UserProfileStore.getProfile(user.id, user.email);
    let updatedTaxProfile = await UserProfileStore.getTaxProfile(user.id);

    if (validated.profile) {
      updatedProfile = await UserProfileStore.updateProfile(user.id, {
        fullName: validated.profile.fullName,
      });
    }

    if (validated.taxProfile) {
      updatedTaxProfile = await UserProfileStore.updateTaxProfile(
        user.id,
        validated.taxProfile
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        profile: updatedProfile,
        taxProfile: updatedTaxProfile,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
