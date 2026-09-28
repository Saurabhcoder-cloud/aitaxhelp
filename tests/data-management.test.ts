import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

import { GET as getDataHealthApi } from "../app/api/v1/admin/data-health/route";
import {
  GET as getIntegrityApi,
  POST as postIntegrityApi,
} from "../app/api/v1/admin/data-health/integrity/route";
import { POST as postIntegrityCheckApi } from "../app/api/v1/admin/data-health/integrity/check/route";
import {
  GET as getRetentionApi,
  POST as postRetentionApi,
} from "../app/api/v1/admin/data-health/retention/route";
import { POST as postRetentionPreviewApi } from "../app/api/v1/admin/data-health/retention/preview/route";
import {
  GET as getBackupApi,
  POST as postBackupApi,
} from "../app/api/v1/admin/data-health/backup/route";
import { POST as postBackupVerifyApi } from "../app/api/v1/admin/data-health/backup/verify/route";
import {
  GET as getRecoveryApi,
  POST as postRecoveryApi,
} from "../app/api/v1/admin/data-health/recovery/route";
import { POST as postRecoveryVerifyApi } from "../app/api/v1/admin/data-health/recovery/verify/route";

import { DATA_CATALOG, getAllCatalogDatasets, getCatalogItem } from "../lib/data/data-catalog";
import {
  DataClassificationService,
  PROHIBITED_OPERATIONAL_FIELDS,
} from "../lib/data/data-classification";
import { LegalHoldService } from "../lib/data/legal-hold";
import { RetentionPolicyService } from "../lib/data/retention-policy";
import { BackupService, NullBackupProvider } from "../lib/data/backup-provider";
import { RestoreVerificationService } from "../lib/data/restore-verification";
import { DataIntegrityService } from "../lib/data/data-integrity";
import { DataHealthService } from "../lib/data/data-health";
import { HealthService } from "../lib/observability/health";
import { AuditLogStore } from "../lib/services/audit-log-store";
import { AccountDataService } from "../lib/services/account-data";
import { SupportStore } from "../lib/services/support-store";
import { TaxCalculationStore } from "../lib/services/tax-calculation-store";
import { ConversationStore } from "../lib/services/conversation-store";
import { NotificationStore } from "../lib/notifications/store";
import { PlatformConfigStore } from "../lib/config/platform-config-store";
import { TARGET_RPO_MINUTES, TARGET_RTO_MINUTES } from "../types/data-management";
import { Metrics } from "../lib/observability/metrics";

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

describe("Phase 5 Step 17: Production Data Management, Retention, Backup/Recovery & Integrity", () => {
  beforeEach(() => {
    // Reset test providers and stores where applicable
    BackupService.setProvider(new NullBackupProvider());
    LegalHoldService.clear();
    RestoreVerificationService.clear();
  });

  // 1. data catalog contains expected datasets
  it("1. data catalog contains expected datasets", () => {
    const datasets = getAllCatalogDatasets();
    expect(datasets.length).toBeGreaterThanOrEqual(16);

    const keys = datasets.map((d) => d.key);
    expect(keys).toContain("USER_PROFILE");
    expect(keys).toContain("TAX_PROFILE");
    expect(keys).toContain("TAX_CALCULATIONS");
    expect(keys).toContain("AI_CONVERSATIONS");
    expect(keys).toContain("TAX_REPORTS");
    expect(keys).toContain("PROFESSIONAL_LEADS");
    expect(keys).toContain("SUBSCRIPTIONS");
    expect(keys).toContain("USAGE_RECORDS");
    expect(keys).toContain("NOTIFICATIONS");
    expect(keys).toContain("SUPPORT_TICKETS");
    expect(keys).toContain("SUPPORT_MESSAGES");
    expect(keys).toContain("AUDIT_LOGS");
    expect(keys).toContain("ADMIN_CONFIGURATION");
    expect(keys).toContain("PLATFORM_CONFIGURATION");
    expect(keys).toContain("ANALYTICS");
    expect(keys).toContain("OPERATIONAL_METRICS");
  });

  // 2. classification is explicit
  it("2. classification is explicit", () => {
    const datasets = getAllCatalogDatasets();
    for (const item of datasets) {
      expect(["PUBLIC", "INTERNAL", "CONFIDENTIAL", "SENSITIVE_TAX", "SECURITY_SENSITIVE"]).toContain(
        item.sensitivity
      );
      expect(item.classification).toBe(item.sensitivity);
    }
  });

  // 3. tax data classified as sensitive
  it("3. tax data classified as sensitive", () => {
    const taxCalc = getCatalogItem("TAX_CALCULATIONS");
    const taxProf = getCatalogItem("TAX_PROFILE");
    const taxRep = getCatalogItem("TAX_REPORTS");

    expect(taxCalc?.classification).toBe("SENSITIVE_TAX");
    expect(taxProf?.classification).toBe("SENSITIVE_TAX");
    expect(taxRep?.classification).toBe("SENSITIVE_TAX");
    expect(taxCalc?.hasTaxpayerData).toBe(true);
  });

  // 4. backup provider null state is honest
  it("4. backup provider null state is honest", () => {
    const status = BackupService.getStatus();
    expect(status.status).toBe("NOT_CONFIGURED");
    expect(status.provider).toBe("NullBackupProvider");
    expect(status.recoveryPoint).toBeNull();
  });

  // 5. unconfigured backup never reports healthy
  it("5. unconfigured backup never reports healthy", () => {
    const nullProvider = new NullBackupProvider();
    const status = nullProvider.getStatus();
    expect(status.status).not.toBe("HEALTHY");
    expect(status.status).toBe("NOT_CONFIGURED");
  });

  // 6. recovery point unavailable when provider absent
  it("6. recovery point unavailable when provider absent", () => {
    const nullProvider = new NullBackupProvider();
    expect(nullProvider.getRecoveryPoint()).toBeNull();
    const status = nullProvider.getStatus();
    expect(status.recoveryPoint).toBeNull();
  });

  // 7. RPO is clearly a target
  it("7. RPO is clearly a target", () => {
    expect(TARGET_RPO_MINUTES).toBe(60);
    const summary = DataHealthService.getHealthSummarySync();
    expect(summary.rpoRto.configuredTargetRpoMinutes).toBe(60);
    expect(summary.rpoRto.targetRpoDescription).toContain("operational target");
  });

  // 8. RTO is clearly a target
  it("8. RTO is clearly a target", () => {
    expect(TARGET_RTO_MINUTES).toBe(120);
    const summary = DataHealthService.getHealthSummarySync();
    expect(summary.rpoRto.configuredTargetRtoMinutes).toBe(120);
    expect(summary.rpoRto.targetRtoDescription).toContain("operational target");
  });

  // 9. restore verification unconfigured state is safe
  it("9. restore verification unconfigured state is safe", () => {
    const report = RestoreVerificationService.getLatestReport();
    expect(["NOT_RUN", "NOT_CONFIGURED"]).toContain(report.status);
    expect(report.checksPerformed.length).toBe(0);
  });

  // 10. integrity check does not expose tax values
  it("10. integrity check does not expose tax values", async () => {
    const report = await DataIntegrityService.runAllChecks("admin-test");
    const jsonStr = JSON.stringify(report);

    for (const field of PROHIBITED_OPERATIONAL_FIELDS) {
      // Ensure prohibited fields like ssn, wages, totalTaxLiability do not appear in integrity JSON
      expect(jsonStr).not.toContain(`"${field}":`);
    }
  });

  // 11. orphan calculation detection
  it("11. orphan calculation detection", async () => {
    const report = await DataIntegrityService.runAllChecks("admin-test");
    const orphanCalcCheck = report.checks.find(
      (c) => c.dataset === "TAX_CALCULATIONS" && c.check === "orphaned_user_reference"
    );
    expect(orphanCalcCheck).toBeDefined();
    expect(orphanCalcCheck?.status).toBe("PASS");
    expect(orphanCalcCheck?.count).toBe(0);
  });

  // 12. orphan conversation detection
  it("12. orphan conversation detection", async () => {
    const report = await DataIntegrityService.runAllChecks("admin-test");
    const orphanConvoCheck = report.checks.find(
      (c) => c.dataset === "AI_CONVERSATIONS" && c.check === "orphaned_user_reference"
    );
    expect(orphanConvoCheck).toBeDefined();
    expect(orphanConvoCheck?.status).toBe("PASS");
  });

  // 13. orphan report detection
  it("13. orphan report detection", async () => {
    const report = await DataIntegrityService.runAllChecks("admin-test");
    const orphanRepCheck = report.checks.find(
      (c) => c.dataset === "TAX_REPORTS" && c.check === "orphaned_calculation_reference"
    );
    expect(orphanRepCheck).toBeDefined();
    expect(orphanRepCheck?.status).toBe("PASS");
  });

  // 14. orphan support detection
  it("14. orphan support detection", async () => {
    const report = await DataIntegrityService.runAllChecks("admin-test");
    const orphanTicketCheck = report.checks.find(
      (c) => c.dataset === "SUPPORT_TICKETS" && c.check === "orphaned_user_reference"
    );
    expect(orphanTicketCheck).toBeDefined();
    expect(orphanTicketCheck?.status).toBe("PASS");

    const orphanMsgCheck = report.checks.find(
      (c) => c.dataset === "SUPPORT_MESSAGES" && c.check === "orphaned_ticket_reference"
    );
    expect(orphanMsgCheck).toBeDefined();
  });

  // 15. orphan notification detection
  it("15. orphan notification detection", async () => {
    const report = await DataIntegrityService.runAllChecks("admin-test");
    const orphanNotifCheck = report.checks.find(
      (c) => c.dataset === "NOTIFICATIONS" && c.check === "orphaned_user_reference"
    );
    expect(orphanNotifCheck).toBeDefined();
    expect(orphanNotifCheck?.status).toBe("PASS");
  });

  // 16. duplicate ticket number detection
  it("16. duplicate ticket number detection", async () => {
    const report = await DataIntegrityService.runAllChecks("admin-test");
    const dupTicketCheck = report.checks.find(
      (c) => c.dataset === "SUPPORT_TICKETS" && c.check === "duplicate_ticket_number"
    );
    expect(dupTicketCheck).toBeDefined();
    expect(dupTicketCheck?.count).toBe(0);
  });

  // 17. duplicate configuration detection
  it("17. duplicate configuration detection", async () => {
    const configs = await PlatformConfigStore.getAll();
    const keys = configs.map((c) => c.key);
    const uniqueKeys = new Set(keys);
    expect(keys.length).toBe(uniqueKeys.size);
  });

  // 18. subscription ownership integrity
  it("18. subscription ownership integrity", async () => {
    const report = await DataIntegrityService.runAllChecks("admin-test");
    const subCheck = report.checks.find(
      (c) => c.dataset === "SUBSCRIPTIONS" && c.check === "orphaned_user_reference"
    );
    expect(subCheck).toBeDefined();
    expect(subCheck?.status).toBe("PASS");
  });

  // 19. user deletion plan is correct
  it("19. user deletion plan is correct", () => {
    const testUserId = "user-del-plan-test";
    const plan = RetentionPolicyService.getAccountDeletionPlan(testUserId);

    expect(plan.userId).toBe(testUserId);
    expect(plan.datasets.TAX_CALCULATIONS).toBe("PURGE");
    expect(plan.datasets.TAX_PROFILE).toBe("PURGE");
    expect(plan.datasets.AI_CONVERSATIONS).toBe("PURGE");
    expect(plan.datasets.TAX_REPORTS).toBe("PURGE");
    expect(plan.datasets.NOTIFICATIONS).toBe("PURGE");
    expect(plan.datasets.AUDIT_LOGS).toBe("RETAIN");
    expect(plan.datasets.SUBSCRIPTIONS).toBe("ANONYMIZE");
    expect(plan.datasets.USAGE_RECORDS).toBe("ANONYMIZE");
  });

  // 20. internal audit records are retained according to policy
  it("20. internal audit records are retained according to policy", () => {
    const auditItem = getCatalogItem("AUDIT_LOGS");
    expect(auditItem?.deletionBehavior).toBe("RETAIN");
    expect(auditItem?.retentionMode).toBe("SECURITY");
  });

  // 21. user export contains support data
  it("21. user export contains support data", async () => {
    const testUserId = "user-export-support-test";
    // Seed a ticket
    await SupportStore.createTicket({
      ticketNumber: "TAH-2026-999001",
      userId: testUserId,
      category: "GENERAL",
      priority: "MEDIUM",
      status: "OPEN",
      subject: "Export Test Subject",
      description: "Export Test Body",
    });

    const exportBundle = await AccountDataService.exportUserData(testUserId);
    expect(exportBundle.support).toBeDefined();
    const supportData = exportBundle.support!;
    expect(Array.isArray(supportData.tickets)).toBe(true);
    expect(supportData.tickets.length).toBeGreaterThanOrEqual(1);
    expect(supportData.tickets[0].subject).toBe("Export Test Subject");
  });

  // 22. export excludes internal notes
  it("22. export excludes internal notes", async () => {
    const testUserId = "user-export-notes-test";
    const ticket = await SupportStore.createTicket({
      ticketNumber: "TAH-2026-999002",
      userId: testUserId,
      category: "TAX_QUESTION",
      priority: "HIGH",
      status: "OPEN",
      subject: "Question about brackets",
      description: "Public description",
    });

    // Add internal note
    await SupportStore.addInternalNote({
      ticketId: ticket.id,
      adminUserId: "admin-staff-1",
      body: "SECRET_INTERNAL_STAFF_NOTE_12345",
    });

    const exportBundle = await AccountDataService.exportUserData(testUserId);
    const jsonStr = JSON.stringify(exportBundle);
    expect(jsonStr).not.toContain("SECRET_INTERNAL_STAFF_NOTE_12345");
  });

  // 23. export excludes secrets
  it("23. export excludes secrets", async () => {
    const testUserId = "user-export-secrets-test";
    const exportBundle = await AccountDataService.exportUserData(testUserId);
    const jsonStr = JSON.stringify(exportBundle);

    expect(jsonStr).not.toContain("jwt");
    expect(jsonStr).not.toContain("password");
    expect(jsonStr).not.toContain("secret_key");
    expect(jsonStr).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  // 24. retention policy is explicit
  it("24. retention policy is explicit", () => {
    const policy = RetentionPolicyService.getPolicy("TAX_CALCULATIONS");
    expect(policy.dataset).toBe("TAX_CALCULATIONS");
    expect(policy.retentionMode).toBe("USER_CONTROLLED");
    expect(policy.legalHoldSupported).toBe(true);
  });

  // 25. unknown retention policy does not fabricate legal requirement
  it("25. unknown retention policy does not fabricate legal requirement", () => {
    const analyticsPolicy = RetentionPolicyService.getPolicy("ANALYTICS");
    expect(analyticsPolicy.retentionPeriodDays).toBeNull();
    expect(analyticsPolicy.statutoryBasis).toBe("policy_not_configured");
  });

  // 26. legal hold blocks deletion
  it("26. legal hold blocks deletion", async () => {
    const recordId = "calc-hold-test-1";
    LegalHoldService.createHold({
      dataset: "TAX_CALCULATIONS",
      recordId,
      reason: "Tax court litigation hold",
      adminUserId: "admin-test-1",
    });

    expect(LegalHoldService.isUnderHold("TAX_CALCULATIONS", recordId)).toBe(true);

    // Attempt controlled cleanup
    const result = await RetentionPolicyService.executeControlledCleanup({
      adminUserId: "admin-test-1",
      dataset: "TAX_CALCULATIONS",
      confirm: true,
    });

    expect(result.blockedByLegalHoldCount).toBeGreaterThanOrEqual(1);
    expect(result.actualDeletedCount).toBe(0);
  });

  // 27. retention preview is non-destructive
  it("27. retention preview is non-destructive", async () => {
    const preview = await RetentionPolicyService.previewRetentionCleanup({
      adminUserId: "admin-test-1",
      dataset: "TAX_CALCULATIONS",
    });

    expect(preview.estimatedDeletions).toBe(0);
    // Preview never mutates or drops records
  });

  // 28. cleanup requires authorization
  it("28. cleanup requires authorization", async () => {
    await expect(
      RetentionPolicyService.executeControlledCleanup({
        adminUserId: "", // empty admin ID
        dataset: "TAX_CALCULATIONS",
        confirm: true,
      })
    ).rejects.toThrow(/authorization/i);
  });

  // 29. cleanup cannot bypass legal hold
  it("29. cleanup cannot bypass legal hold", async () => {
    LegalHoldService.createHold({
      dataset: "TAX_CALCULATIONS",
      recordId: "protected-calc-id",
      reason: "Regulatory inquiry",
      adminUserId: "admin-test-1",
    });

    const cleanup = await RetentionPolicyService.executeControlledCleanup({
      adminUserId: "admin-test-1",
      dataset: "TAX_CALCULATIONS",
      confirm: true,
    });

    expect(cleanup.blockedByLegalHoldCount).toBeGreaterThanOrEqual(1);
  });

  // 30. cleanup cannot delete records younger than policy
  it("30. cleanup cannot delete records younger than policy", async () => {
    const cleanup = await RetentionPolicyService.executeControlledCleanup({
      adminUserId: "admin-test-1",
      dataset: "TAX_CALCULATIONS",
      confirm: true,
    });

    // Zero records younger than retention age are dropped
    expect(cleanup.actualDeletedCount).toBe(0);
  });

  // 31. data health endpoint requires admin
  it("31. data health endpoint requires admin", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/admin/data-health", {
      cookie: "test-admin-session",
    });
    const res = await getDataHealthApi(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.database).toBeDefined();
    expect(body.data.backup).toBeDefined();
  });

  // 32. non-admin cannot access data health
  it("32. non-admin cannot access data health", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/admin/data-health", {
      cookie: "test-user-session",
    });
    const res = await getDataHealthApi(req);
    expect(res.status).toBe(403);
  });

  // 33. public endpoints expose no data health details
  it("33. public endpoints expose no data health details", async () => {
    const publicHealth = HealthService.getPublicLiveness();
    const jsonStr = JSON.stringify(publicHealth);

    expect(jsonStr).not.toContain("backupProvider");
    expect(jsonStr).not.toContain("recoveryPoint");
    expect(jsonStr).not.toContain("orphans");
    expect(jsonStr).not.toContain("legalHolds");
  });

  // 34. backup credentials cannot be stored in configuration
  it("34. backup credentials cannot be stored in configuration", () => {
    const prohibitedKeys = [
      "backup.aws_secret_access_key",
      "backup.s3_access_key",
      "backup.database_password",
    ];

    for (const key of prohibitedKeys) {
      expect(PlatformConfigStore.hasKey(key as any)).toBe(false);
    }
  });

  // 35. tax engine rules cannot be modified
  it("35. tax engine rules cannot be modified", () => {
    const prohibitedTaxKeys = [
      "tax.standard_deduction_single",
      "tax.brackets_2025",
      "tax.bracket_rate_10",
    ];

    for (const key of prohibitedTaxKeys) {
      expect(PlatformConfigStore.hasKey(key as any)).toBe(false);
    }
  });

  // 36. audit event generated for integrity check
  it("36. audit event generated for integrity check", async () => {
    await DataIntegrityService.runAllChecks("admin-audit-test");
    const logs = AuditLogStore.getAll();
    const found = logs.some((l) => l.action === "data:integrity_check_run");
    expect(found).toBe(true);
  });

  // 37. audit event generated for backup verification
  it("37. audit event generated for backup verification", async () => {
    await BackupService.verifyBackup("admin-audit-test");
    const logs = AuditLogStore.getAll();
    const found = logs.some((l) => l.action === "data:backup_verification_run");
    expect(found).toBe(true);
  });

  // 38. audit event generated for retention preview
  it("38. audit event generated for retention preview", async () => {
    await RetentionPolicyService.previewRetentionCleanup({
      adminUserId: "admin-audit-test",
      dataset: "TAX_CALCULATIONS",
    });
    const logs = AuditLogStore.getAll();
    const found = logs.some((l) => l.action === "data:retention_preview_run");
    expect(found).toBe(true);
  });

  // 39. request IDs are included
  it("39. request IDs are included", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/admin/data-health", {
      cookie: "test-admin-session",
      headers: { "X-Request-ID": "req_step17_custom_id" },
    });
    const res = await getDataHealthApi(req);
    expect(res.headers.get("x-request-id")).toBe("req_step17_custom_id");
  });

  // 40. errors are sanitized
  it("40. errors are sanitized", async () => {
    // Unauthenticated request
    const req = createMockRequest("http://localhost:3000/api/v1/admin/data-health");
    const res = await getDataHealthApi(req);
    const body = await res.json();

    expect(body.success).toBe(false);
    expect(body.error).toBeDefined();
    expect(body.error.code).toBeDefined();
    expect(body.error.message).toBeDefined();
    expect(body.error.stack).toBeUndefined(); // Stack traces never leaked
  });

  // 41. observability metrics contain no tax values
  it("41. observability metrics contain no tax values", () => {
    const snapshot = Metrics.getSnapshot();
    const jsonStr = JSON.stringify(snapshot);

    for (const field of PROHIBITED_OPERATIONAL_FIELDS) {
      expect(jsonStr).not.toContain(`"${field}":`);
    }
  });

  // 42. account deletion plan does not expose financial values
  it("42. account deletion plan does not expose financial values", () => {
    const plan = RetentionPolicyService.getAccountDeletionPlan("test-user-finance");
    const jsonStr = JSON.stringify(plan);

    for (const field of PROHIBITED_OPERATIONAL_FIELDS) {
      expect(jsonStr).not.toContain(`"${field}":`);
    }
  });

  // 43. data health does not expose financial values
  it("43. data health does not expose financial values", async () => {
    const summary = await DataHealthService.getHealthSummary("admin-test");
    const jsonStr = JSON.stringify(summary);

    for (const field of PROHIBITED_OPERATIONAL_FIELDS) {
      expect(jsonStr).not.toContain(`"${field}":`);
    }
  });

  // 44. database health and backup health remain separate
  it("44. database health and backup health remain separate", () => {
    const dbHealth = HealthService.checkDatabase();
    const backupHealth = HealthService.checkBackup();

    expect(backupHealth).toBeDefined();
    // Database can be ok or not_configured, while backup is not_configured
    expect(backupHealth.provider).toBe("NullBackupProvider");
    expect(backupHealth.configured).toBe(false);
  });

  // 45. support data lifecycle remains compatible
  it("45. support data lifecycle remains compatible", async () => {
    const ticketItem = getCatalogItem("SUPPORT_TICKETS");
    expect(ticketItem?.category).toBe("SUPPORT");
    expect(ticketItem?.exportBehavior).toBe("INCLUDE");
    expect(ticketItem?.deletionBehavior).toBe("RETAIN");
  });

  // 46. notification data lifecycle remains compatible
  it("46. notification data lifecycle remains compatible", () => {
    const notifItem = getCatalogItem("NOTIFICATIONS");
    expect(notifItem?.category).toBe("COMMUNICATIONS");
    expect(notifItem?.deletionBehavior).toBe("PURGE");
  });

  // 47. configuration data lifecycle remains compatible
  it("47. configuration data lifecycle remains compatible", () => {
    const configItem = getCatalogItem("PLATFORM_CONFIGURATION");
    expect(configItem?.retentionMode).toBe("CONFIGURATION");
    expect(configItem?.exportBehavior).toBe("EXCLUDE");
    expect(configItem?.deletionBehavior).toBe("RETAIN");
  });

  // 48. existing account deletion remains compatible
  it("48. existing account deletion remains compatible", async () => {
    const testUserId = "compat-delete-test-user";
    const deletionResult = await AccountDataService.deleteUserData(testUserId);
    expect(deletionResult.success).toBe(true);
    expect(deletionResult.deletedAt).toBeDefined();
    expect(deletionResult.deletedRecords).toBeDefined();
  });

  // 49. existing account export remains compatible
  it("49. existing account export remains compatible", async () => {
    const testUserId = "compat-export-test-user";
    const bundle = await AccountDataService.exportUserData(testUserId);
    expect(bundle.userId).toBe(testUserId);
    expect(bundle.exportDate).toBeDefined();
    expect(bundle.calculations).toBeDefined();
  });

  // 50. existing observability tests remain compatible
  it("50. existing observability tests remain compatible", () => {
    const adminHealth = HealthService.getAdminSystemHealth();
    expect(adminHealth.dependencies.supabase).toBeDefined();
    expect(adminHealth.dependencies.backup).toBeDefined();
    expect(adminHealth.dependencies.backup.configured).toBe(false);
    expect(adminHealth.dependencies.backup.status).toBe("not_configured");
  });

  // 51. POST /api/v1/admin/data-health/backup/verify returns honest unconfigured response
  it("51. POST /api/v1/admin/data-health/backup/verify returns honest unconfigured response", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/admin/data-health/backup/verify", {
      method: "POST",
      cookie: "test-admin-session",
    });
    const res = await postBackupVerifyApi(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe("NOT_CONFIGURED");
    expect(body.data.recoveryPoint).toBeNull();
  });

  // 52. POST /api/v1/admin/data-health/recovery/verify executes simulated drill
  it("52. POST /api/v1/admin/data-health/recovery/verify executes simulated drill", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/admin/data-health/recovery/verify", {
      method: "POST",
      cookie: "test-admin-session",
      body: { simulateDrill: true },
    });
    const res = await postRecoveryVerifyApi(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe("PASSED");
    expect(body.data.checksPerformed.length).toBeGreaterThan(0);
  });
});
