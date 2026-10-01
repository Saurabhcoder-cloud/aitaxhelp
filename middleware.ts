import { NextRequest, NextResponse } from "next/server";
import { getSafeRedirectUrl } from "./lib/utils/redirect";

const COOKIE_NAME = "taxaihelp-auth-token";

/**
 * Next.js Edge Middleware for routing and route protection.
 * Protects authenticated dashboard routes from direct unauthenticated access.
 */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Protect all /dashboard routes
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    const cookieToken = req.cookies.get(COOKIE_NAME)?.value;
    const authHeader = req.headers.get("authorization");

    let hasToken = false;
    if (cookieToken && cookieToken.trim() && cookieToken !== "unauthenticated" && cookieToken !== "anonymous") {
      hasToken = true;
    } else if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      const bearer = authHeader.substring(7).trim();
      if (bearer && bearer !== "unauthenticated" && bearer !== "anonymous") {
        hasToken = true;
      }
    }

    if (!hasToken) {
      const fullPath = search ? `${pathname}${search}` : pathname;
      const safeDestination = getSafeRedirectUrl(fullPath, "/dashboard");
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("next", safeDestination);

      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*"],
};
