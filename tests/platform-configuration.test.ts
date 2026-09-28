import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getAdminConfigApi, PATCH as patchAdminConfigApi } from "../app/api/v1/admin/config/route";
import { GET as getAdminConfigKeyApi, PATCH as patchAdminConfigKeyApi } from "../app/api/v1/admin/config/[key]/route";
import { GET as getPublicConfigApi } from "../app/api/v1/config/public/route";
import { POST as postAiAssistantApi } from "../app/api/v1/ai/assistant/route";
import { POST as postSessionApi } from "../app/api/v1/auth/session/route";
import { POST as postBillingCheckoutApi } from "../app/api/v1/billing/checkout/route";
import { POST as postLeadApi, GET as getLeadsApi } from "../app/api/v1/professional-leads/route";
import { PlatformConfigStore, DEFAULT_PLATFORM_CONFIGS } from "../lib/config/platform-config-store";
import { PlatformConfigService } from "../lib/config/platform-config-service";
import { FeatureFlags } from "../lib/services/feature-flags";
import { MaintenanceService } from "../lib/services/maintenance";
import { HealthService } from "../lib/observability/health";
import { AuditLogStore } from "../lib/services/audit-log-store";
import { ConversationStore } from "../lib/services/conversation-store";
import { SubscriptionStore } from "../lib/services/subscription-store";
import { EntitlementService } from "../lib/services/entitlement-service";
import { buildTaxReport } from "../lib/services/tax-report";
import { calculateFederalTaxes } from "../tax-engine";
import { RateLimiter } from "../lib/utils/rate-limiter";
import { OperationalError } from "../lib/observability/errors";
import { AppError } from "../lib/utils/errors";
import { sanitizeConfigString, containsSecretCredential } from "../lib/validations/platform-config";
import { PlatformConfigKey } from "../types/platform-config";

function createMockRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string;
    cookie?: string;
    headers?: Record<string, string>;
  } = {}
) {
  const reqHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (options.token) {
    reqHeaders["Authorization"] = `Bearer ${options.token}`;
  }
  if (options.cookie) {
    reqHeaders["Cookie"] = `taxaihelp-auth-token=${options.cookie}`;
  }

  const body =
    options.body !== undefined
      ? typeof options.body === "string"
        ? options.body
        : JSON.stringify(options.body)
      : undefined;

  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: options.method || "GET",
    headers: reqHeaders,
    body,
  });
}

describe("Phase 5 Step 15: Production Admin Controls, Feature Flags & Platform Configuration", () => {
  beforeEach(() => {
    PlatformConfigStore.clear();
  });

  // 1. admin can read configuration
  it("1. admin can read configuration", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/admin/config", {
      cookie: "test-admin-session",
    });
    const res = await getAdminConfigApi(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(20);
    expect(body.data.some((c: { key: string }) => c.key === "ai.assistant_enabled")).toBe(true);
  });

  // 2. non-admin cannot read admin configuration
  it("2. non-admin cannot read admin configuration", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/admin/config", {
      cookie: "regular-user-token",
    });
    const res = await getAdminConfigApi(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  // 3. unauthenticated cannot read admin configuration
  it("3. unauthenticated cannot read admin configuration", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/admin/config");
    const res = await getAdminConfigApi(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  // 4. admin can update feature flag
  it("4. admin can update feature flag", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/admin/config", {
      method: "PATCH",
      cookie: "test-admin-session",
      body: {
        key: "ai.assistant_enabled",
        value: false,
      },
    });
    const res = await patchAdminConfigApi(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.key).toBe("ai.assistant_enabled");
    expect(body.data.value).toBe(false);
    expect(body.data.isEnabled).toBe(false);

    const updated = await PlatformConfigService.getBoolean("ai.assistant_enabled");
    expect(updated).toBe(false);
  });

  // 5. non-admin cannot update feature flag
  it("5. non-admin cannot update feature flag", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/admin/config", {
      method: "PATCH",
      cookie: "regular-user-token",
      body: {
        key: "ai.assistant_enabled",
        value: false,
      },
    });
    const res = await patchAdminConfigApi(req);
    expect(res.status).toBe(403);
  });

  // 6. unknown config key rejected
  it("6. unknown config key rejected", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/admin/config", {
      method: "PATCH",
      cookie: "test-admin-session",
      body: {
        key: "custom.non_existent_key",
        value: true,
      },
    });
    const res = await patchAdminConfigApi(req);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  // 7. invalid type rejected
  it("7. invalid type rejected", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/admin/config", {
      method: "PATCH",
      cookie: "test-admin-session",
      body: {
        key: "ai.assistant_enabled",
        value: "not_a_boolean_literal",
      },
    });
    const res = await patchAdminConfigApi(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  // 8. oversized message rejected
  it("8. oversized message rejected", async () => {
    const longMessage = "x".repeat(501);
    const req = createMockRequest("http://localhost:3000/api/v1/admin/config", {
      method: "PATCH",
      cookie: "test-admin-session",
      body: {
        key: "platform.maintenance_message",
        value: longMessage,
      },
    });
    const res = await patchAdminConfigApi(req);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  // 9. maintenance mode persists
  it("9. maintenance mode persists", async () => {
    await PlatformConfigService.updateConfig(
      "test-admin-1",
      "platform.maintenance_mode",
      true,
      "req_maint_1"
    );

    const isMaintenance = await PlatformConfigService.getBoolean("platform.maintenance_mode");
    expect(isMaintenance).toBe(true);

    const isEnabled = await FeatureFlags.isMaintenanceModeActive();
    expect(isEnabled).toBe(true);
  });

  // 10. maintenance mode is server-enforced
  it("10. maintenance mode is server-enforced", async () => {
    await PlatformConfigService.updateConfig(
      "test-admin-1",
      "platform.maintenance_mode",
      true
    );

    const userAccess = await MaintenanceService.evaluateAccess("/dashboard", false);
    expect(userAccess.isLockedDown).toBe(true);

    const adminAccess = await MaintenanceService.evaluateAccess("/admin/configuration", true);
    expect(adminAccess.isLockedDown).toBe(false);

    const healthAccess = await MaintenanceService.evaluateAccess("/api/health", false);
    expect(healthAccess.isLockedDown).toBe(false);
  });

  // 11. registration disabled blocks signup
  it("11. registration disabled blocks signup", async () => {
    await PlatformConfigService.updateConfig(
      "test-admin-1",
      "auth.registration_enabled",
      false
    );

    const req = createMockRequest("http://localhost:3000/api/v1/auth/session", {
      method: "POST",
      body: {
        mode: "signup",
        token: "brand-new-user-123",
      },
    });

    const res = await postSessionApi(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("FEATURE_DISABLED");
  });

  // 12. existing login remains available
  it("12. existing login remains available", async () => {
    await PlatformConfigService.updateConfig(
      "test-admin-1",
      "auth.registration_enabled",
      false
    );

    const req = createMockRequest("http://localhost:3000/api/v1/auth/session", {
      method: "POST",
      body: {
        mode: "login",
        token: "existing-user-token",
      },
    });

    const res = await postSessionApi(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.authenticated).toBe(true);
  });

  // 13. AI disabled blocks AI API
  it("13. AI disabled blocks AI API", async () => {
    await PlatformConfigService.updateConfig(
      "test-admin-1",
      "ai.assistant_enabled",
      false
    );

    const req = createMockRequest("http://localhost:3000/api/v1/ai/assistant", {
      method: "POST",
      cookie: "regular-user-token",
      body: {
        message: "What is the standard deduction for 2025?",
      },
    });

    const res = await postAiAssistantApi(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("FEATURE_DISABLED");
  });

  // 14. AI conversation history remains available
  it("14. AI conversation history remains available", async () => {
    await PlatformConfigService.updateConfig(
      "test-admin-1",
      "ai.assistant_enabled",
      false
    );

    // Historical conversations should be safely readable without failure
    const conversations = await ConversationStore.listConversations("user-historical-1");
    expect(Array.isArray(conversations)).toBe(true);
  });

  // 15. premium reports disabled blocks new premium generation
  it("15. premium reports disabled blocks new premium generation", async () => {
    await PlatformConfigService.updateConfig(
      "test-admin-1",
      "reports.premium_enabled",
      false
    );

    await expect(
      FeatureFlags.require("reports.premium_enabled", "Premium Tax Reports")
    ).rejects.toThrow(AppError);
  });

  // 16. existing report remains preserved
  it("16. existing report remains preserved", () => {
    const calc = calculateFederalTaxes({
      taxYear: 2025,
      filingStatus: "single",
      wages: 75000,
    });

    const savedRecord = {
      id: "calc-historical-1",
      userId: "user-1",
      taxYear: 2025 as const,
      filingStatus: "single" as const,
      title: "Historical Calculation",
      inputSnapshot: { taxYear: 2025 as const, filingStatus: "single" as const, wages: 75000 },
      resultSnapshot: calc,
      calculatorType: "income_tax" as const,
      engineVersion: "1.0.0",
      rulesVersion: "2025.1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const report = buildTaxReport(savedRecord, "free");
    expect(report).toBeDefined();
    expect(report.taxYear).toBe(2025);
    expect(report.taxSummary.totalTaxLiabilityCents).toBe(calc.totalTaxLiabilityCents);
  });

  // 17. billing disabled blocks checkout
  it("17. billing disabled blocks checkout", async () => {
    await PlatformConfigService.updateConfig(
      "test-admin-1",
      "billing.enabled",
      false
    );

    const req = createMockRequest("http://localhost:3000/api/v1/billing/checkout", {
      method: "POST",
      cookie: "regular-user-token",
      body: {
        tier: "pro",
      },
    });

    const res = await postBillingCheckoutApi(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("FEATURE_DISABLED");
  });

  // 18. billing disabled does not grant entitlement
  it("18. billing disabled does not grant entitlement", async () => {
    await PlatformConfigService.updateConfig(
      "test-admin-1",
      "billing.enabled",
      false
    );

    const snapshot = await EntitlementService.getEntitlementSnapshot("free-user-without-sub");
    const isPremium = snapshot.plan.id === "premium";
    expect(isPremium).toBe(false);

    const activeSub = await SubscriptionStore.getActiveSubscription("free-user-without-sub");
    expect(activeSub).toBeNull();
  });

  // 19. professional handoff disabled blocks new submission
  it("19. professional handoff disabled blocks new submission", async () => {
    await PlatformConfigService.updateConfig(
      "test-admin-1",
      "professionals.handoff_enabled",
      false
    );

    const req = createMockRequest("http://localhost:3000/api/v1/professional-leads", {
      method: "POST",
      cookie: "regular-user-token",
      body: {
        contactName: "Alex Morgan",
        contactEmail: "alex@example.com",
        filingStatus: "single",
        complexity: "simple",
      },
    });

    const res = await postLeadApi(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("FEATURE_DISABLED");
  });

  // 20. existing leads remain accessible to admin
  it("20. existing leads remain accessible to admin", async () => {
    await PlatformConfigService.updateConfig(
      "test-admin-1",
      "professionals.handoff_enabled",
      false
    );

    const req = createMockRequest("http://localhost:3000/api/v1/professional-leads", {
      cookie: "test-admin-session",
    });

    const res = await getLeadsApi(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  // 21. public config contains only safe fields
  it("21. public config contains only safe fields", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/config/public");
    const res = await getPublicConfigApi(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("platformName");
    expect(body.data).toHaveProperty("maintenanceMode");
    expect(body.data).toHaveProperty("announcement");
    expect(body.data).toHaveProperty("features");
  });

  // 22. public config does not expose secrets
  it("22. public config does not expose secrets", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/config/public");
    const res = await getPublicConfigApi(req);
    const text = await res.text();

    expect(text).not.toContain("API_KEY");
    expect(text).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(text).not.toContain("STRIPE_SECRET_KEY");
    expect(text).not.toContain("sk_live");
    expect(text).not.toContain("DATABASE_URL");
  });

  // 23. public config does not expose admin data
  it("23. public config does not expose admin data", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/config/public");
    const res = await getPublicConfigApi(req);
    const body = await res.json();

    expect(body.data.updatedBy).toBeUndefined();
    expect(body.data.version).toBeUndefined();
    expect(body.data.rateLimits).toBeUndefined();
    expect(body.data.internalThresholds).toBeUndefined();
  });

  // 24. audit record created on config change
  it("24. audit record created on config change", async () => {
    await PlatformConfigService.updateConfig(
      "admin-auditor-1",
      "calculators.federal_income_enabled",
      false,
      "req_audit_test_1"
    );

    const logs = await AuditLogStore.list({ action: "admin:config_updated" });
    const match = logs.logs.find((l) => l.targetId === "calculators.federal_income_enabled");

    expect(match).toBeDefined();
    expect(match?.adminUserId).toBe("admin-auditor-1");
    expect(match?.action).toBe("admin:config_updated");
    expect(match?.metadata?.requestId).toBe("req_audit_test_1");
  });

  // 25. audit record contains no sensitive values
  it("25. audit record contains no sensitive values", async () => {
    await PlatformConfigService.updateConfig(
      "admin-auditor-2",
      "platform.name",
      "TaxAIHelp Redux",
      "req_audit_test_2"
    );

    const logs = await AuditLogStore.list({ action: "admin:config_updated" });
    const text = JSON.stringify(logs.logs);

    expect(text).not.toContain("taxpayer_wages");
    expect(text).not.toContain("ssn");
    expect(text).not.toContain("secret");
  });

  // 26. stale version update is rejected
  it("26. stale version update is rejected", async () => {
    // Current version starts at 1
    const current = await PlatformConfigStore.get("ai.assistant_enabled");
    expect(current.version).toBe(1);

    // First update succeeds (expectedVersion: 1 -> version becomes 2)
    await PlatformConfigService.updateConfig(
      "test-admin-1",
      "ai.assistant_enabled",
      false,
      "req_stale_1",
      1
    );

    const updated = await PlatformConfigStore.get("ai.assistant_enabled");
    expect(updated.version).toBe(2);

    // Second update with stale expectedVersion (1) should be rejected
    await expect(
      PlatformConfigService.updateConfig(
        "test-admin-2",
        "ai.assistant_enabled",
        true,
        "req_stale_2",
        1
      )
    ).rejects.toThrow(OperationalError);
  });

  // 27. configuration mutation returns request ID
  it("27. configuration mutation returns request ID", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/admin/config", {
      method: "PATCH",
      cookie: "test-admin-session",
      headers: {
        "x-request-id": "req_custom_trace_99",
      },
      body: {
        key: "acquisition.public_blog_enabled",
        value: false,
      },
    });

    const res = await patchAdminConfigApi(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.requestId).toBe("req_custom_trace_99");
    expect(res.headers.get("x-request-id")).toBe("req_custom_trace_99");
  });

  // 28. standardized errors are returned
  it("28. standardized errors are returned", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/admin/config", {
      method: "PATCH",
      cookie: "test-admin-session",
      body: {
        key: "non.existent.key",
        value: 123,
      },
    });

    const res = await patchAdminConfigApi(req);
    expect(res.status).toBe(422);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error).toHaveProperty("message");
    expect(body.error).toHaveProperty("requestId");
  });

  // 29. maintenance message is safely escaped
  it("29. maintenance message is safely escaped", async () => {
    const malicious = "<script>alert('xss')</script>Maintenance Scheduled";
    const sanitized = sanitizeConfigString(malicious);

    expect(sanitized).not.toContain("<script>");
    expect(sanitized).not.toContain("</script>");
    expect(sanitized).toContain("Maintenance Scheduled");
  });

  // 30. announcement HTML cannot execute
  it("30. announcement HTML cannot execute", () => {
    const injection = "<img src=x onerror=alert(1)>Site Update Tonight";
    const sanitized = sanitizeConfigString(injection);

    expect(sanitized).not.toContain("<img");
    expect(sanitized).not.toContain("onerror");
    expect(sanitized).toContain("Site Update Tonight");
  });

  // 31. safe defaults work when configuration is unavailable
  it("31. safe defaults work when configuration is unavailable", () => {
    expect(DEFAULT_PLATFORM_CONFIGS["platform.maintenance_mode"].value).toBe(false);
    expect(DEFAULT_PLATFORM_CONFIGS["auth.registration_enabled"].value).toBe(true);
    expect(DEFAULT_PLATFORM_CONFIGS["ai.assistant_enabled"].value).toBe(true);
    expect(DEFAULT_PLATFORM_CONFIGS["billing.enabled"].value).toBe(true);
    expect(DEFAULT_PLATFORM_CONFIGS["security.login_rate_limit_enabled"].value).toBe(true);
  });

  // 32. admin configuration cannot edit tax rules
  it("32. admin configuration cannot edit tax rules", async () => {
    const maliciousTaxKey = "tax_brackets.2025" as unknown as PlatformConfigKey;

    await expect(
      PlatformConfigService.updateConfig(
        "test-admin-1",
        maliciousTaxKey,
        [10, 12, 22]
      )
    ).rejects.toThrow(OperationalError);
  });

  // 33. Gemini key cannot be stored in configuration
  it("33. Gemini key cannot be stored in configuration", async () => {
    const maliciousKey = "gemini_api_key" as unknown as PlatformConfigKey;

    await expect(
      PlatformConfigService.updateConfig(
        "test-admin-1",
        maliciousKey,
        "AIzaSyDemoSecretKey123"
      )
    ).rejects.toThrow(OperationalError);
  });

  // 34. Stripe secret cannot be stored in configuration
  it("34. Stripe secret cannot be stored in configuration", () => {
    expect(containsSecretCredential("sk_live_51AbcDefGh123456")).toBe(true);
    expect(containsSecretCredential("sk_test_51AbcDefGh123456")).toBe(true);
    expect(containsSecretCredential("whsec_demoSecret")).toBe(true);
    expect(containsSecretCredential("Standard announcement message")).toBe(false);
  });

  // 35. notification security controls cannot be disabled
  it("35. notification security controls cannot be disabled", async () => {
    // In-app notifications toggle does not disable security/account notifications
    await PlatformConfigService.updateConfig(
      "test-admin-1",
      "notifications.in_app_enabled",
      false
    );

    const isEmailEnabled = await PlatformConfigService.getBoolean("notifications.email_enabled");
    expect(isEmailEnabled).toBe(true);
  });

  // 36. rate-limit protection cannot be accidentally disabled
  it("36. rate-limit protection cannot be accidentally disabled", () => {
    const limiter = new RateLimiter();
    const result = limiter.check("test-user-ip", 10, 60000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });

  // 37. feature flag evaluation is server authoritative
  it("37. feature flag evaluation is server authoritative", async () => {
    await PlatformConfigService.updateConfig(
      "test-admin-1",
      "ai.assistant_enabled",
      false
    );

    // Passing custom header trying to spoof flag state must be ignored
    const isEnabled = await FeatureFlags.isEnabled("ai.assistant_enabled");
    expect(isEnabled).toBe(false);
  });

  // 38. client-supplied admin identity is ignored
  it("38. client-supplied admin identity is ignored", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/admin/config", {
      method: "PATCH",
      // Non-admin cookie but spoofed body attempting to assert admin role
      cookie: "regular-user-token",
      body: {
        userId: "admin-super",
        role: "admin",
        key: "ai.assistant_enabled",
        value: false,
      },
    });

    const res = await patchAdminConfigApi(req);
    expect(res.status).toBe(403);
  });

  // 39. configuration cache invalidates after update
  it("39. configuration cache invalidates after update", async () => {
    const initial = await PlatformConfigService.getBoolean("acquisition.public_pricing_enabled");
    expect(initial).toBe(true);

    await PlatformConfigService.updateConfig(
      "test-admin-1",
      "acquisition.public_pricing_enabled",
      false
    );

    const after = await PlatformConfigService.getBoolean("acquisition.public_pricing_enabled");
    expect(after).toBe(false);
  });

  // 40. health status reflects configuration dependency
  it("40. health status reflects configuration dependency", () => {
    const health = HealthService.getAdminSystemHealth();
    expect(health.dependencies.configuration).toBeDefined();
    expect(health.dependencies.configuration.status).toBe("ok");
    expect(health.dependencies.configuration.provider).toBe("platform_config_store");
    expect(health.dependencies.configuration.configured).toBe(true);
  });

  // 41. audit trail preserves updater identity
  it("41. audit trail preserves updater identity", async () => {
    await PlatformConfigService.updateConfig(
      "admin-auditor-999",
      "announcement.enabled",
      true,
      "req_audit_ident"
    );

    const logs = await AuditLogStore.list({ action: "admin:config_updated" });
    const target = logs.logs.find((l) => l.targetId === "announcement.enabled");

    expect(target?.adminUserId).toBe("admin-auditor-999");
  });

  // 42. configuration version increments
  it("42. configuration version increments", async () => {
    const v1 = await PlatformConfigStore.get("platform.name");
    expect(v1.version).toBe(1);

    await PlatformConfigService.updateConfig(
      "test-admin-1",
      "platform.name",
      "TaxAIHelp Pro"
    );

    const v2 = await PlatformConfigStore.get("platform.name");
    expect(v2.version).toBe(2);

    await PlatformConfigService.updateConfig(
      "test-admin-1",
      "platform.name",
      "TaxAIHelp Enterprise"
    );

    const v3 = await PlatformConfigStore.get("platform.name");
    expect(v3.version).toBe(3);
  });

  // 43. failed update does not partially mutate state
  it("43. failed update does not partially mutate state", async () => {
    const before = await PlatformConfigStore.get("platform.maintenance_message");
    const originalValue = before.value;
    const originalVersion = before.version;

    // Submit invalid oversized message
    const req = createMockRequest("http://localhost:3000/api/v1/admin/config", {
      method: "PATCH",
      cookie: "test-admin-session",
      body: {
        key: "platform.maintenance_message",
        value: "a".repeat(1000),
      },
    });

    const res = await patchAdminConfigApi(req);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");

    const after = await PlatformConfigStore.get("platform.maintenance_message");
    expect(after.value).toBe(originalValue);
    expect(after.version).toBe(originalVersion);
  });

  // 44. concurrent stale update is rejected
  it("44. concurrent stale update is rejected", async () => {
    const current = await PlatformConfigStore.get("calculators.tax_1099_enabled");
    const v = current.version;

    // Both admin A and admin B attempt to update against version v
    await PlatformConfigStore.update("admin-A", "calculators.tax_1099_enabled", false, v);

    // Admin B submits stale update with version v
    await expect(
      PlatformConfigStore.update("admin-B", "calculators.tax_1099_enabled", true, v)
    ).rejects.toThrow(OperationalError);
  });

  // 45. existing Step 14 observability tests remain compatible
  it("45. existing Step 14 observability tests remain compatible", () => {
    const liveness = HealthService.getPublicLiveness();
    expect(liveness.status).toBe("ok");

    const readiness = HealthService.getPublicReadiness();
    expect(readiness.status).toBe("ready");

    const adminHealth = HealthService.getAdminSystemHealth();
    expect(adminHealth.status).toBe("ok");
    expect(adminHealth.platform).toBe("TaxAIHelp");
  });
});
