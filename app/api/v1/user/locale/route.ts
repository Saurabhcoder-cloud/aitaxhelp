import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { UserProfileStore } from "@/lib/services/user-profile-store";
import {
  LOCALE_COOKIE_NAME,
  DEFAULT_LOCALE,
  normalizeLocale,
  getLocaleMetadata,
  isSupportedLocale,
} from "@/lib/i18n/locales";
import { handleApiError } from "@/lib/utils/errors";

/**
 * GET /api/v1/user/locale
 * Returns current locale from profile or cookie.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    let resolvedLocale = DEFAULT_LOCALE;

    if (user) {
      const profile = await UserProfileStore.getProfile(user.id);
      if (profile.preferredLanguage && isSupportedLocale(profile.preferredLanguage)) {
        resolvedLocale = normalizeLocale(profile.preferredLanguage);
      }
    } else {
      const cookieLocale = req.cookies.get(LOCALE_COOKIE_NAME)?.value;
      if (cookieLocale && isSupportedLocale(cookieLocale)) {
        resolvedLocale = normalizeLocale(cookieLocale);
      }
    }

    const metadata = getLocaleMetadata(resolvedLocale);

    return NextResponse.json({
      success: true,
      data: {
        locale: resolvedLocale,
        metadata,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/v1/user/locale
 * Updates language preference in cookie and database profile.
 */
export async function POST(req: NextRequest) {
  try {
    let body: { locale?: string } = {};
    try {
      body = await req.json();
    } catch (_e) {
      // Body may be empty
    }

    const targetLocale = normalizeLocale(body.locale);
    const metadata = getLocaleMetadata(targetLocale);

    // If authenticated, persist to profile
    const user = await getAuthenticatedUser(req);
    if (user) {
      await UserProfileStore.updateProfile(user.id, {
        preferredLanguage: targetLocale,
      });
    }

    const response = NextResponse.json({
      success: true,
      data: {
        locale: targetLocale,
        metadata,
        persistedToUser: Boolean(user),
      },
    });

    // Set cookie on response
    response.cookies.set({
      name: LOCALE_COOKIE_NAME,
      value: targetLocale,
      path: "/",
      maxAge: 365 * 24 * 60 * 60, // 1 year
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
