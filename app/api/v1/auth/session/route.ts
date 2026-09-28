import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, DEFAULT_DEV_USER_ID, DEFAULT_DEV_SESSION_TOKEN } from "@/lib/auth/session";
import { handleApiError } from "@/lib/utils/errors";
import { FeatureFlags } from "@/lib/services/feature-flags";

/**
 * GET /api/v1/auth/session
 * Checks the current session state.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({
        success: true,
        data: {
          authenticated: false,
          user: null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        authenticated: true,
        user,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/v1/auth/session
 * Initializes or sets an authenticated session cookie.
 */
export async function POST(req: NextRequest) {
  try {
    let rawBody: { token?: string; mode?: string } = {};
    try {
      rawBody = await req.json();
    } catch (_err) {
      // Body is optional (e.g. for demo login)
    }

    if (rawBody.mode === "signup") {
      await FeatureFlags.require("auth.registration_enabled", "New Taxpayer Registration");
      await FeatureFlags.require("auth.new_user_signup_enabled", "Signup Flow");
    }

    const token = rawBody.token || DEFAULT_DEV_SESSION_TOKEN;

    const response = NextResponse.json({
      success: true,
      data: {
        authenticated: true,
        user: {
          id: token === DEFAULT_DEV_SESSION_TOKEN ? DEFAULT_DEV_USER_ID : token,
          email: token === DEFAULT_DEV_SESSION_TOKEN ? "demo@taxaihelp.com" : `${token}@taxaihelp.local`,
        },
        token,
      },
    });

    // Set secure auth cookie
    response.cookies.set({
      name: "taxaihelp-auth-token",
      value: token,
      path: "/",
      httpOnly: false, // Accessible to client auth utilities
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/v1/auth/session
 * Logs out and clears the authenticated session cookie.
 */
export async function DELETE() {
  try {
    const response = NextResponse.json({
      success: true,
      data: {
        authenticated: false,
        message: "Session successfully terminated.",
      },
    });

    // Clear session cookie
    response.cookies.set({
      name: "taxaihelp-auth-token",
      value: "",
      path: "/",
      maxAge: 0,
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
