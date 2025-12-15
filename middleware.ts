import { NextRequest, NextResponse } from "next/server";
import { isStubMode } from "./lib/env";

const protectedPaths = ["/upload", "/processing", "/review", "/export", "/account"];

export function middleware(req: NextRequest) {
  if (isStubMode()) {
    return NextResponse.next();
  }
  const { pathname } = req.nextUrl;
  const needsAuth = protectedPaths.some((path) => pathname.startsWith(path));
  if (!needsAuth) return NextResponse.next();

  const sessionId = req.cookies.get("sessionId")?.value;
  if (!sessionId) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/upload/:path*", "/processing/:path*", "/review/:path*", "/export/:path*", "/account/:path*"],
};
