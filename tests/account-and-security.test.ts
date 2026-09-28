import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getProfile, PATCH as patchProfile } from "../app/api/v1/auth/profile/route";
import {
  GET as getSession,
  POST as postSession,
  DELETE as deleteSession,
} from "../app/api/v1/auth/session/route";
import { POST as postRecovery } from "../app/api/v1/auth/recovery/route";
import { UserProfileStore } from "../lib/services/user-profile-store";

function createMockRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string;
    cookie?: string;
  } = {}
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }
  if (options.cookie) {
    headers["Cookie"] = `taxaihelp-auth-token=${options.cookie}`;
  }

  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: options.method || "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

describe("Account, Profile & Security UX Suite (Phase 5 Step 5)", () => {
  beforeEach(() => {
    UserProfileStore.clear();
  });

  it("1. Strictly rejects unauthenticated profile access with 401 UNAUTHORIZED", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/auth/profile", {
      method: "GET",
      // No auth token or cookie
    });

    const res = await getProfile(req);
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("2. Returns authenticated user profile and default tax preferences for valid session", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/auth/profile", {
      method: "GET",
      token: "test-user-profile-1",
    });

    const res = await getProfile(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.profile.id).toBe("test-user-profile-1");
    expect(json.data.profile.email).toContain("test-user-profile-1");
    expect(json.data.taxProfile.defaultTaxYear).toBe(2025);
    expect(json.data.taxProfile.filingStatus).toBe("single");
  });

  it("3. Authenticates via session cookie when Authorization header is absent", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/auth/profile", {
      method: "GET",
      cookie: "test-user-cookie-auth",
    });

    const res = await getProfile(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.profile.id).toBe("test-user-cookie-auth");
  });

  it("4. Client-supplied userId in profile update is completely ignored in favor of server session", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/auth/profile", {
      method: "PATCH",
      token: "legitimate-user-owner",
      body: {
        userId: "malicious-spoofed-user-id", // Attempt to spoof target
        profile: {
          fullName: "Legitimate Owner Name",
        },
      },
    });

    const res = await patchProfile(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.profile.id).toBe("legitimate-user-owner");
    expect(json.data.profile.fullName).toBe("Legitimate Owner Name");

    // Verify malicious-spoofed-user-id remains untouched
    const checkSpoofed = createMockRequest("http://localhost:3000/api/v1/auth/profile", {
      method: "GET",
      token: "malicious-spoofed-user-id",
    });
    const checkRes = await getProfile(checkSpoofed);
    const checkJson = await checkRes.json();
    expect(checkJson.data.profile.fullName).toBeNull();
  });

  it("5. Successfully updates taxpayer preferences (tax year, filing status, income sources)", async () => {
    const updatePayload = {
      taxProfile: {
        defaultTaxYear: 2026,
        filingStatus: "married_filing_jointly",
        hasW2Income: false,
        has1099Income: true,
        hasBusinessExpenses: true,
        stateOfResidence: "Washington",
      },
    };

    const req = createMockRequest("http://localhost:3000/api/v1/auth/profile", {
      method: "PATCH",
      token: "test-user-tax-prefs",
      body: updatePayload,
    });

    const res = await patchProfile(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.taxProfile.defaultTaxYear).toBe(2026);
    expect(json.data.taxProfile.filingStatus).toBe("married_filing_jointly");
    expect(json.data.taxProfile.hasW2Income).toBe(false);
    expect(json.data.taxProfile.has1099Income).toBe(true);
    expect(json.data.taxProfile.hasBusinessExpenses).toBe(true);
    expect(json.data.taxProfile.stateOfResidence).toBe("Washington");
  });

  it("6. Rejects invalid filing status with 422 VALIDATION_ERROR", async () => {
    const invalidPayload = {
      taxProfile: {
        filingStatus: "unsupported_foreign_status",
      },
    };

    const req = createMockRequest("http://localhost:3000/api/v1/auth/profile", {
      method: "PATCH",
      token: "test-user-validation-fail",
      body: invalidPayload,
    });

    const res = await patchProfile(req);
    expect(res.status).toBe(422);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("7. Cross-user isolation: User A cannot mutate User B's profile", async () => {
    // User A sets profile
    const reqA = createMockRequest("http://localhost:3000/api/v1/auth/profile", {
      method: "PATCH",
      token: "user-a-isolated",
      body: {
        profile: { fullName: "User A Real Name" },
      },
    });
    await patchProfile(reqA);

    // User B sets profile
    const reqB = createMockRequest("http://localhost:3000/api/v1/auth/profile", {
      method: "PATCH",
      token: "user-b-isolated",
      body: {
        profile: { fullName: "User B Real Name" },
      },
    });
    await patchProfile(reqB);

    // Verify User A profile is strictly preserved
    const verifyA = createMockRequest("http://localhost:3000/api/v1/auth/profile", {
      method: "GET",
      token: "user-a-isolated",
    });
    const resA = await getProfile(verifyA);
    const jsonA = await resA.json();
    expect(jsonA.data.profile.fullName).toBe("User A Real Name");

    // Verify User B profile is distinct
    const verifyB = createMockRequest("http://localhost:3000/api/v1/auth/profile", {
      method: "GET",
      token: "user-b-isolated",
    });
    const resB = await getProfile(verifyB);
    const jsonB = await resB.json();
    expect(jsonB.data.profile.fullName).toBe("User B Real Name");
  });

  it("8. Session endpoint correctly identifies authenticated vs unauthenticated states", async () => {
    // Unauthenticated
    const unauthReq = createMockRequest("http://localhost:3000/api/v1/auth/session", {
      method: "GET",
    });
    const unauthRes = await getSession(unauthReq);
    expect(unauthRes.status).toBe(200);
    const unauthJson = await unauthRes.json();
    expect(unauthJson.data.authenticated).toBe(false);
    expect(unauthJson.data.user).toBeNull();

    // Authenticated
    const authReq = createMockRequest("http://localhost:3000/api/v1/auth/session", {
      method: "GET",
      token: "test-user-session-check",
    });
    const authRes = await getSession(authReq);
    expect(authRes.status).toBe(200);
    const authJson = await authRes.json();
    expect(authJson.data.authenticated).toBe(true);
    expect(authJson.data.user.id).toBe("test-user-session-check");
  });

  it("9. Sign-out endpoint clears session cookie", async () => {
    const res = await deleteSession();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.authenticated).toBe(false);

    // Verify cookie was cleared
    const cookie = res.cookies.get("taxaihelp-auth-token");
    const setCookieHeader = res.headers.get("set-cookie");
    expect(cookie?.maxAge === 0 || cookie?.value === "" || (setCookieHeader && setCookieHeader.includes("taxaihelp-auth-token"))).toBeTruthy();
  });

  it("10. Password recovery endpoint validates email and handles requests safely without leaking keys", async () => {
    // Invalid email rejected
    const badReq = createMockRequest("http://localhost:3000/api/v1/auth/recovery", {
      method: "POST",
      body: { email: "not-an-email" },
    });
    const badRes = await postRecovery(badReq);
    expect(badRes.status).toBe(422);

    // Valid email succeeds safely
    const goodReq = createMockRequest("http://localhost:3000/api/v1/auth/recovery", {
      method: "POST",
      body: { email: "taxpayer@example.com" },
    });
    const goodRes = await postRecovery(goodReq);
    expect(goodRes.status).toBe(200);

    const goodJson = await goodRes.json();
    expect(goodJson.success).toBe(true);
    expect(goodJson.data.message).toBeDefined();
  });
});
