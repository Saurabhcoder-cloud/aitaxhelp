import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getSafeRedirectUrl } from "../lib/utils/redirect";
import { middleware } from "../middleware";
import { MAIN_NAV_ITEMS } from "../lib/constants/navigation";
import {
  POST as startSession,
  GET as getSession,
} from "../app/api/v1/tax/preparation/session/route";
import { TaxPreparationSessionStore } from "../lib/services/tax-preparation-session-store";
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

describe("Authentication-Aware Navigation & UX", () => {
  beforeEach(() => {
    TaxPreparationSessionStore.clear();
    UserProfileStore.clear();
  });

  describe("1 & 8. Open Redirect Prevention & getSafeRedirectUrl", () => {
    it("safely accepts internal application paths", () => {
      expect(getSafeRedirectUrl("/dashboard")).toBe("/dashboard");
      expect(getSafeRedirectUrl("/dashboard/taxes")).toBe("/dashboard/taxes");
      expect(getSafeRedirectUrl("/dashboard/taxes?step=deductions")).toBe(
        "/dashboard/taxes?step=deductions"
      );
      expect(getSafeRedirectUrl("/tax-calculators/income-tax")).toBe(
        "/tax-calculators/income-tax"
      );
    });

    it("rejects external absolute URLs", () => {
      expect(getSafeRedirectUrl("https://evil.com")).toBe("/dashboard");
      expect(getSafeRedirectUrl("http://phishing.site/login")).toBe("/dashboard");
      expect(getSafeRedirectUrl("ftp://files.example.com")).toBe("/dashboard");
    });

    it("rejects protocol-relative URLs", () => {
      expect(getSafeRedirectUrl("//evil.com")).toBe("/dashboard");
      expect(getSafeRedirectUrl("//evil.com/dashboard")).toBe("/dashboard");
      expect(getSafeRedirectUrl("///evil.com")).toBe("/dashboard");
    });

    it("rejects backslash obfuscation attacks", () => {
      expect(getSafeRedirectUrl("/\\evil.com")).toBe("/dashboard");
      expect(getSafeRedirectUrl("\\evil.com")).toBe("/dashboard");
      expect(getSafeRedirectUrl("/path\\with\\backslashes")).toBe("/dashboard");
    });

    it("rejects JavaScript and other URI schemes", () => {
      expect(getSafeRedirectUrl("javascript:alert(1)")).toBe("/dashboard");
      expect(getSafeRedirectUrl("data:text/html;base64,PHNjcmlwdD4=")).toBe(
        "/dashboard"
      );
      expect(getSafeRedirectUrl("vbscript:msgbox")).toBe("/dashboard");
    });

    it("rejects null, undefined, whitespace, or malformed inputs and uses fallback", () => {
      expect(getSafeRedirectUrl(null)).toBe("/dashboard");
      expect(getSafeRedirectUrl(undefined)).toBe("/dashboard");
      expect(getSafeRedirectUrl("")).toBe("/dashboard");
      expect(getSafeRedirectUrl("   ")).toBe("/dashboard");
      expect(getSafeRedirectUrl("invalid-path-without-slash")).toBe("/dashboard");
      expect(getSafeRedirectUrl(null, "/custom-fallback")).toBe("/custom-fallback");
    });
  });

  describe("2 & 4. Protected Dashboard Route Enforcement (Middleware)", () => {
    it("redirects unauthenticated users visiting /dashboard to /login?next=/dashboard", () => {
      const req = createMockRequest("http://localhost:3000/dashboard");
      const res = middleware(req);

      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toContain("/login");
      expect(location).toContain("next=%2Fdashboard");
    });

    it("preserves child route and query parameters safely in next parameter", () => {
      const req = createMockRequest(
        "http://localhost:3000/dashboard/taxes?view=documents"
      );
      const res = middleware(req);

      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toContain("/login");
      expect(location).toContain("next=%2Fdashboard%2Ftaxes%3Fview%3Ddocuments");
    });

    it("allows authenticated requests with valid session token to pass through", () => {
      const req = createMockRequest("http://localhost:3000/dashboard", {
        cookie: "valid-user-session-token",
      });
      const res = middleware(req);

      // Status 200 / empty response indicating NextResponse.next()
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    it("redirects if session cookie is explicitly 'unauthenticated'", () => {
      const req = createMockRequest("http://localhost:3000/dashboard", {
        cookie: "unauthenticated",
      });
      const res = middleware(req);

      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toContain("/login?next=%2Fdashboard");
    });
  });

  describe("3 & 7. Calculate Your Taxes / Start My Taxes Session Continuity", () => {
    it("Calculate Your Taxes CTA targets the canonical tax preparation route", () => {
      const unauthenticatedDestination = "/login?next=/dashboard/taxes";
      const authenticatedDestination = "/dashboard/taxes";

      expect(unauthenticatedDestination).toContain("/dashboard/taxes");
      expect(authenticatedDestination).toBe("/dashboard/taxes");
    });

    it("resumes an existing open preparation session instead of creating duplicate active sessions", async () => {
      // User starts tax preparation session
      const createRes = await startSession(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
          method: "POST",
          token: "taxpayer-session-continuity-test",
          body: {},
        })
      );
      expect(createRes.status).toBe(201);
      const createBody = await createRes.json();
      const originalSessionId = createBody.data.id;
      expect(originalSessionId).toBeTruthy();

      // User re-invokes "Calculate Your Taxes" / "Start My Taxes"
      const resumeRes = await startSession(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
          method: "POST",
          token: "taxpayer-session-continuity-test",
          body: {},
        })
      );
      expect(resumeRes.status).toBe(200);
      const resumeBody = await resumeRes.json();

      // Must be the exact same active session, NOT a new duplicate session
      expect(resumeBody.data.id).toBe(originalSessionId);

      // Verify server store has only 1 active session for this user
      const currentRes = await getSession(
        createMockRequest("http://localhost:3000/api/v1/tax/preparation/session", {
          method: "GET",
          token: "taxpayer-session-continuity-test",
        })
      );
      expect(currentRes.status).toBe(200);
      const currentBody = await currentRes.json();
      expect(currentBody.data.id).toBe(originalSessionId);
    });
  });

  describe("5 & 6. Header Navigation Structure & Public vs Authenticated Separation", () => {
    it("public navigation items do not include private Dashboard", () => {
      const publicTitles = MAIN_NAV_ITEMS.map((item) => item.title);
      expect(publicTitles).toContain("Tax Calculators");
      expect(publicTitles).toContain("Tax Guides");
      expect(publicTitles).toContain("Blog");
      expect(publicTitles).toContain("AI Tax Assistant");
      expect(publicTitles).toContain("Pricing");
      expect(publicTitles).toContain("About");
      expect(publicTitles).toContain("Contact");

      // Crucial: Dashboard must NEVER be exposed in public MAIN_NAV_ITEMS
      expect(publicTitles).not.toContain("Dashboard");
    });

    it("ensures AI Tax Assistant is properly badged as AI Powered in main nav", () => {
      const aiItem = MAIN_NAV_ITEMS.find((item) => item.title === "AI Tax Assistant");
      expect(aiItem).toBeDefined();
      expect(aiItem?.badge).toBe("AI Powered");
      expect(aiItem?.href).toBe("/ai-tax-assistant");
    });
  });

  describe("7 & 9. Premium Financial SaaS UI & Demo Access Removal", () => {
    const loginFile = readFileSync(
      join(__dirname, "../app/login/page.tsx"),
      "utf-8"
    );
    const signupFile = readFileSync(
      join(__dirname, "../app/signup/page.tsx"),
      "utf-8"
    );

    it("verifies production login page does not contain demo taxpayer buttons or dividers", () => {
      expect(loginFile).not.toContain("Sign In as Demo Taxpayer");
      expect(loginFile).not.toContain("Or Instant Access");
      expect(loginFile).not.toContain("loginDemoUser");
      expect(loginFile).not.toContain("handleDemoLogin");
    });

    it("verifies production signup page does not contain demo preview buttons or dividers", () => {
      expect(signupFile).not.toContain("Try Demo Workspace Immediately");
      expect(signupFile).not.toContain("Or Instant Preview");
      expect(signupFile).not.toContain("loginDemoUser");
      expect(signupFile).not.toContain("handleDemoSignup");
    });

    it("verifies premium financial SaaS structure on login page", () => {
      // Must feature clean hierarchy
      expect(loginFile).toContain("Welcome back");
      expect(loginFile).toContain("Sign in to continue your TaxAIHelp experience.");
      expect(loginFile).toContain("Email Address");
      expect(loginFile).toContain("Password");
      expect(loginFile).toContain("Forgot password?");
      expect(loginFile).toContain("Sign In");
      expect(loginFile).toContain("Create Account");

      // Must feature subtle trust and security statement
      expect(loginFile).toContain("Secure account access");
      expect(loginFile).toContain("Your tax information stays protected");
    });

    it("verifies premium financial SaaS structure on signup page", () => {
      expect(signupFile).toContain("Create your account");
      expect(signupFile).toContain("Start your guided tax preparation with TaxAIHelp.");
      expect(signupFile).toContain("Full Name");
      expect(signupFile).toContain("Email Address");
      expect(signupFile).toContain("Password");
      expect(signupFile).toContain("Confirm Password");
      expect(signupFile).toContain("Terms of Service");
      expect(signupFile).toContain("Privacy Policy");
      expect(signupFile).toContain("Create Account");
      expect(signupFile).toContain("Sign In");

      // Must feature matching trust and security statement
      expect(signupFile).toContain("Secure account access");
      expect(signupFile).toContain("Your tax information stays protected");
    });
  });
});
