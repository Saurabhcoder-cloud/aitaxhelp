import { DEFAULT_DEV_SESSION_TOKEN, DEFAULT_DEV_USER_ID } from "@/lib/auth/session";

const TOKEN_KEY = "taxaihelp_session_token";
const COOKIE_NAME = "taxaihelp-auth-token";

export interface ClientUserSession {
  id: string;
  email: string;
  role?: "user" | "admin";
}

/**
 * Retrieves the currently active session token from browser storage or cookie.
 */
export function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;

  const storageToken = window.sessionStorage.getItem(TOKEN_KEY) || window.localStorage.getItem(TOKEN_KEY);
  if (storageToken) return storageToken;

  // Check cookie
  const match = document.cookie.match(new RegExp(`(^|;\\s*)(${COOKIE_NAME})=([^;]*)`));
  return match ? decodeURIComponent(match[3]) : null;
}

/**
 * Stores the authenticated session token in browser storage and cookie.
 */
export function setSessionToken(token: string): void {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(TOKEN_KEY, token);

  // Set cookie for Next.js server requests and middleware
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

/**
 * Clears all authenticated session tokens from storage, cookies, and server state.
 */
export async function clearSession(): Promise<void> {
  if (typeof window === "undefined") return;

  window.sessionStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(TOKEN_KEY);

  // Expire cookie
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;

  try {
    await fetch("/api/v1/auth/session", {
      method: "DELETE",
    });
  } catch (_err) {
    // Ignore server network error on logout
  }
}

/**
 * Checks the current session with the server.
 */
export async function checkSession(): Promise<ClientUserSession | null> {
  try {
    const res = await fetch("/api/v1/auth/session", {
      method: "GET",
      cache: "no-store",
    });

    const json = await res.json();
    if (res.ok && json.success && json.data?.authenticated && json.data?.user) {
      return json.data.user as ClientUserSession;
    }
    return null;
  } catch (_err) {
    return null;
  }
}

/**
 * Signs in as the canonical demo taxpayer for instant local development access.
 */
export async function loginDemoUser(): Promise<ClientUserSession> {
  setSessionToken(DEFAULT_DEV_SESSION_TOKEN);

  try {
    await fetch("/api/v1/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: DEFAULT_DEV_SESSION_TOKEN }),
    });
  } catch (_err) {
    // Local cookie is already set
  }

  return {
    id: DEFAULT_DEV_USER_ID,
    email: "demo@taxaihelp.com",
  };
}

/**
 * Signs out the current user and clears session state.
 */
export async function signOut(): Promise<void> {
  await clearSession();
}

/**
 * Requests a password reset link for the provided email address.
 */
export async function requestPasswordReset(email: string): Promise<{
  success: boolean;
  message: string;
  requiresSupabaseConfig?: boolean;
}> {
  try {
    const res = await fetch("/api/v1/auth/recovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return {
        success: false,
        message: json.error?.message || "Failed to process recovery request.",
      };
    }

    return {
      success: true,
      message: json.data?.message || "Recovery instructions sent.",
      requiresSupabaseConfig: json.data?.requiresSupabaseConfig,
    };
  } catch (_err) {
    return {
      success: false,
      message: "Network error occurred while submitting password reset request.",
    };
  }
}
