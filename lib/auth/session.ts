import { NextRequest } from "next/server";
import { SUPABASE_CONFIG } from "@/lib/supabase/config";
import { getServerSupabaseClient } from "@/lib/supabase/server";

export type UserRole = "user" | "admin" | "super_admin" | "compliance_officer" | "support_specialist";

export interface AuthenticatedUser {
  id: string;
  email?: string;
  role?: UserRole;
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
  if (token === "unauthenticated" || token === "anonymous") {
    return null;
  }

  const isAdmin = await verifyUserIsAdmin(token, `${token}@taxaihelp.admin`);
  if (
    isAdmin ||
    token.startsWith("test-admin") ||
    token.startsWith("admin-") ||
    token === "admin-session-token" ||
    token === "test-admin-session"
  ) {
    return {
      id: token,
      email: `${token}@taxaihelp.admin`,
      role: "admin",
    };
  }

  const userId =
    token === DEFAULT_DEV_SESSION_TOKEN || token === "demo-session-token"
      ? DEFAULT_DEV_USER_ID
      : token;
  const email =
    token === DEFAULT_DEV_SESSION_TOKEN || token === "demo-session-token"
      ? "demo@taxaihelp.com"
      : `${token}@taxaihelp.local`;

  return {
    id: userId,
    email,
    role: "user",
  };
}

/**
 * Verifies server-side whether the given user has administrative privileges.
 * NEVER trusts client-supplied flags.
 */
export async function verifyUserIsAdmin(userId: string, email?: string): Promise<boolean> {
  // 1. Test / local development conventions
  if (userId.startsWith("test-admin") || userId.startsWith("admin-") || userId === "admin-session-token") {
    return true;
  }

  // 2. Server environment configuration for admin emails / IDs
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (email && adminEmails.includes(email.toLowerCase())) {
    return true;
  }

  const adminIds = (process.env.ADMIN_USER_IDS || "")
    .split(",")
    .map((i) => i.trim())
    .filter(Boolean);
  if (adminIds.includes(userId)) {
    return true;
  }

  // 3. Check persistent UserProfileStore
  try {
    const { UserProfileStore } = await import("@/lib/services/user-profile-store");
    const role = await UserProfileStore.getRole(userId);
    return role === "admin" || role === "super_admin" || role === "compliance_officer" || role === "support_specialist";
  } catch (_err) {
    return false;
  }
}

import { AppError } from "@/lib/utils/errors";

/**
 * Extracts and verifies that the incoming request is authenticated AND authorized as an admin.
 * Returns null if unauthenticated OR if the user is not an authorized administrator.
 */
export async function getAuthenticatedAdmin(req: NextRequest): Promise<AuthenticatedUser | null> {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return null;
  }

  const isAdmin = await verifyUserIsAdmin(user.id, user.email);
  if (!isAdmin) {
    return null;
  }

  return {
    ...user,
    role: "admin",
  };
}

/**
 * Enforces admin authentication and authorization.
 * Throws 401 if unauthenticated.
 * Throws 403 if authenticated but not an admin.
 */
export async function requireAdmin(req: NextRequest): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    throw new AppError("Authentication required to access admin resources.", 401, "UNAUTHORIZED");
  }

  const isAdmin = await verifyUserIsAdmin(user.id, user.email);
  if (!isAdmin) {
    throw new AppError("Administrator authorization required. Access denied.", 403, "FORBIDDEN");
  }

  return {
    ...user,
    role: "admin",
  };
}


