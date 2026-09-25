import { NextRequest } from "next/server";
import { SUPABASE_CONFIG } from "@/lib/supabase/config";
import { getServerSupabaseClient } from "@/lib/supabase/server";

export interface AuthenticatedUser {
  id: string;
  email?: string;
}

// Canonical demo user UUID for local development when Supabase is not connected
export const DEFAULT_DEV_USER_ID = "00000000-0000-0000-0000-000000000001";
export const DEFAULT_DEV_SESSION_TOKEN = "taxaihelp-local-dev-session-token";

/**
 * Extracts and verifies the authenticated user from the incoming request.
 * SECURITY: Never trusts `userId` supplied in the request body.
 *
 * If live Supabase is configured, verifies the JWT with Supabase Auth.
 * If in local development (unconfigured Supabase), checks for valid session bearer token or cookie.
 * Returns null if the request is unauthenticated.
 */
export async function getAuthenticatedUser(
  req: NextRequest
): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.get("authorization");
  const cookieToken = req.cookies.get("taxaihelp-auth-token")?.value;

  let token: string | null = null;

  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    token = authHeader.substring(7).trim();
  } else if (cookieToken) {
    token = cookieToken.trim();
  }

  // If no credentials supplied, request is strictly unauthenticated
  if (!token) {
    return null;
  }

  // 1. Live Supabase Authentication
  if (SUPABASE_CONFIG.isConfigured()) {
    try {
      const supabase = getServerSupabaseClient();
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data?.user) {
        return null;
      }
      return {
        id: data.user.id,
        email: data.user.email,
      };
    } catch (_err) {
      return null;
    }
  }

  // 2. Offline / Local Development Authentication Guard
  // Recognizes development session tokens or explicit test user sessions
  if (token === DEFAULT_DEV_SESSION_TOKEN || token === "demo-session-token") {
    return {
      id: DEFAULT_DEV_USER_ID,
      email: "demo@taxaihelp.com",
    };
  }

  // Allow explicit test user sessions during test execution (e.g. "Bearer test-user-a")
  if (token.startsWith("test-user-")) {
    return {
      id: token,
      email: `${token}@taxaihelp.local`,
    };
  }

  // If token is a valid UUID format in dev mode
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
    return {
      id: token,
      email: `${token}@taxaihelp.local`,
    };
  }

  return null;
}
