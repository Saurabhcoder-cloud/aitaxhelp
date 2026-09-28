import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { AccountDataService } from "@/lib/services/account-data";
import { handleApiError } from "@/lib/utils/errors";

const DeleteAccountSchema = z.object({
  confirm: z.boolean().optional(),
  confirmation: z.string().optional(),
}).refine(
  (data) => data.confirm === true || data.confirmation === "DELETE",
  {
    message: "Explicit confirmation is required to delete your account (confirm: true or confirmation: 'DELETE').",
  }
);

/**
 * POST /api/v1/auth/account/delete
 * Permanently deletes an authenticated user's account and personal tax records.
 *
 * PRIVACY & SECURITY:
 * 1. Requires valid authentication session.
 * 2. Client-provided user IDs are strictly ignored; identity is derived server-side.
 * 3. Requires explicit confirmation payload.
 * 4. Preserves immutable security audit logs for accountability.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication is required to delete your account.",
          },
        },
        { status: 401 }
      );
    }

    let bodyJson: unknown = {};
    try {
      bodyJson = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "A valid JSON body with explicit confirmation is required.",
          },
        },
        { status: 400 }
      );
    }

    const parseResult = DeleteAccountSchema.safeParse(bodyJson);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parseResult.error.errors[0]?.message || "Invalid deletion confirmation.",
          },
        },
        { status: 400 }
      );
    }

    // Execute deletion using server-verified user ID
    const result = await AccountDataService.deleteUserData(user.id);

    const response = NextResponse.json({
      success: true,
      message: "Your account and associated personal tax records have been successfully purged.",
      data: result,
    });

    // Clear authentication session cookie
    response.cookies.set("taxaihelp-auth-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
