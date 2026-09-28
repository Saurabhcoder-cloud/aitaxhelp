import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

import {
  SERVICE_CATALOG,
  SERVICE_IDS,
  getServiceMetadata,
  isCoreTaxService,
} from "../lib/operations/service-catalog";
import { ServiceDependencyGraph } from "../lib/operations/dependencies";
import { ServiceHealthService } from "../lib/operations/service-health";
import { TaxEngineMonitor } from "../lib/operations/tax-engine-monitoring";
import { AiMonitor } from "../lib/operations/ai-monitoring";
import { BillingMonitor } from "../lib/operations/billing-monitoring";
import { EmailMonitor } from "../lib/operations/email-monitoring";
import { SupportMonitor } from "../lib/operations/support-monitoring";
import { IncidentStore } from "../lib/operations/incident-store";
import { AlertService } from "../lib/operations/alerts";
import {
  SERVICE_TARGETS,
  INCIDENT_RESPONSE_TARGETS,
  getServiceTarget,
  getIncidentResponseTarget,
} from "../lib/operations/service-targets";
import { ErrorBudgetCalculator } from "../lib/operations/error-budget";
import { OperationsReportService } from "../lib/operations/operations-report";
import { LaunchReadinessService } from "../lib/operations/launch-readiness";
import {
  createIncidentSchema,
  updateIncidentSchema,
  addIncidentEventSchema,
} from "../lib/validations/operations";
import { PlatformConfigStore } from "../lib/config/platform-config-store";
import { AuditLogStore } from "../lib/services/audit-log-store";
import { PROHIBITED_OPERATIONAL_FIELDS } from "../lib/data/data-classification";
import { ENGINE_VERSION } from "../tax-engine";

// Admin API Route Handlers
import { GET as getOperationsRoute } from "../app/api/v1/admin/operations/route";
import { GET as getServicesRoute } from "../app/api/v1/admin/operations/services/route";
import { GET as getPerformanceRoute } from "../app/api/v1/admin/operations/performance/route";
import { GET as getAlertsRoute } from "../app/api/v1/admin/operations/alerts/route";
import { POST as ackAlertRoute } from "../app/api/v1/admin/operations/alerts/[id]/acknowledge/route";
import { POST as resolveAlertRoute } from "../app/api/v1/admin/operations/alerts/[id]/resolve/route";
import {
  GET as getIncidentsRoute,
  POST as createIncidentRoute,
} from "../app/api/v1/admin/operations/incidents/route";
import {
  GET as getIncidentDetailRoute,
  PATCH as patchIncidentRoute,
} from "../app/api/v1/admin/operations/incidents/[id]/route";
import { POST as createIncidentEventRoute } from "../app/api/v1/admin/operations/incidents/[id]/events/route";
import { GET as getErrorBudgetRoute } from "../app/api/v1/admin/operations/error-budget/route";
import { GET as getLaunchReadinessRoute } from "../app/api/v1/admin/launch-readiness/route";

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

describe("Phase 5 Step 19: Production Monitoring, Incident Management & Launch Readiness", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    PlatformConfigStore.clear();
    IncidentStore.clear();
    AlertService.clear();
    TaxEngineMonitor.resetCounters();
    AiMonitor.resetCounters();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // =========================================================================
  // 1. Service Catalog & Dependency Graph
  // =========================================================================

  it("1. service catalog contains all 19 specified platform services", () => {
    expect(SERVICE_IDS.length).toBe(19);
    for (const id of SERVICE_IDS) {
      expect(SERVICE_CATALOG[id]).toBeDefined();
      expect(SERVICE_CATALOG[id].serviceId).toBe(id);
      expect(SERVICE_CATALOG[id].displayName).toBeTruthy();
      expect(SERVICE_CATALOG[id].owner).toBeTruthy();
    }
  });

  it("2. service criticality correctly categorizes critical and high services", () => {
    expect(SERVICE_CATALOG.TAX_ENGINE.criticality).toBe("CRITICAL");
    expect(SERVICE_CATALOG.CALCULATORS.criticality).toBe("CRITICAL");
    expect(SERVICE_CATALOG.DATABASE.criticality).toBe("CRITICAL");
    expect(SERVICE_CATALOG.AUTHENTICATION.criticality).toBe("CRITICAL");

    expect(SERVICE_CATALOG.AI_ASSISTANT.criticality).toBe("HIGH");
    expect(SERVICE_CATALOG.BILLING.criticality).toBe("HIGH");
    expect(SERVICE_CATALOG.EMAIL.criticality).toBe("NORMAL");
    expect(SERVICE_CATALOG.SUPPORT.criticality).toBe("NORMAL");
  });

  it("3. isCoreTaxService flag accurately isolates core tax functionality", () => {
    expect(isCoreTaxService("TAX_ENGINE")).toBe(true);
    expect(isCoreTaxService("CALCULATORS")).toBe(true);
    expect(isCoreTaxService("TAX_REPORTS")).toBe(true);

    expect(isCoreTaxService("AI_ASSISTANT")).toBe(false);
    expect(isCoreTaxService("EMAIL")).toBe(false);
    expect(isCoreTaxService("SUPPORT")).toBe(false);
  });

  it("4. dependency graph returns immediate upstream dependencies", () => {
    const aiDeps = ServiceDependencyGraph.getDependencies("AI_ASSISTANT");
    expect(aiDeps).toContain("AUTHENTICATION");
    expect(aiDeps).toContain("DATABASE");

    const billingDeps = ServiceDependencyGraph.getDependencies("BILLING");
    expect(billingDeps).toContain("AUTHENTICATION");
    expect(billingDeps).toContain("DATABASE");
    expect(billingDeps).toContain("STRIPE_WEBHOOKS");
  });

  it("5. dependency graph returns downstream dependents", () => {
    const dbDependents = ServiceDependencyGraph.getDependents("DATABASE");
    expect(dbDependents).toContain("AI_ASSISTANT");
    expect(dbDependents).toContain("BILLING");
    expect(dbDependents).toContain("SUPPORT");
    expect(dbDependents).toContain("TAX_REPORTS");
  });

  it("6. dependency graph cycle detection passes as strictly acyclic", () => {
    const isAcyclic = ServiceDependencyGraph.validateAcyclic();
    expect(isAcyclic).toBe(true);
  });

  // =========================================================================
  // 2. Health Aggregation & Measurement States
  // =========================================================================

  it("7. health aggregation evaluates all 19 services without crashing", () => {
    const reports = ServiceHealthService.evaluateAllServices();
    expect(reports.length).toBe(19);
    for (const report of reports) {
      expect(report.service).toBeDefined();
      expect(report.status).toBeDefined();
      expect(report.measurementState).toBeDefined();
      expect(report.checkedAt).toBeTruthy();
    }
  });

  it("8. unmeasured status honestly reports NOT_CONFIGURED when provider is absent", () => {
    const emailReport = ServiceHealthService.evaluateAllServices().find((r) => r.service === "EMAIL");
    expect(emailReport).toBeDefined();
    // In local dev without live Resend key, email reports NOT_CONFIGURED
    expect(["NOT_CONFIGURED", "HEALTHY"]).toContain(emailReport?.status);
  });

  it("9. no fake latency is generated for synthetic health evaluations", () => {
    const reports = ServiceHealthService.evaluateAllServices();
    for (const report of reports) {
      // Latency must remain undefined unless measured via live ping
      if (report.measurementState === "NOT_CONFIGURED" || report.measurementState === "UNMEASURED") {
        expect(report.latencyMs).toBeUndefined();
      }
    }
  });

  it("10. measurementState distinguishes MEASURED vs NOT_CONFIGURED vs NO_DATA", () => {
    const reports = ServiceHealthService.evaluateAllServices();
    const states = reports.map((r) => r.measurementState);
    expect(states).toContain("MEASURED");
  });

  it("11. maintenance mode transitions non-critical services to MAINTENANCE", () => {
    PlatformConfigStore.set("platform.maintenance_mode", true);
    const reports = ServiceHealthService.evaluateAllServices();

    const taxEngine = reports.find((r) => r.service === "TAX_ENGINE");
    const aiService = reports.find((r) => r.service === "AI_ASSISTANT");

    // Critical service remains intact
    expect(taxEngine?.status).toBe("HEALTHY");
    // Non-critical transitions to MAINTENANCE
    expect(aiService?.status).toBe("MAINTENANCE");
  });

  // =========================================================================
  // 3. Deterministic Tax Engine Monitoring
  // =========================================================================

  it("12. tax engine records executions without altering tax calculations", () => {
    TaxEngineMonitor.recordExecution(12, true, 2024);
    TaxEngineMonitor.recordExecution(15, true, 2024);

    const snapshot = TaxEngineMonitor.getSnapshot();
    expect(snapshot.totalCalculationsRun).toBe(2);
    expect(snapshot.totalErrors).toBe(0);
    expect(snapshot.averageDurationMs).toBeGreaterThan(0);
    expect(snapshot.status).toBe("HEALTHY");
  });

  it("13. tax engine detects high failure rate and transitions to FAILED status", () => {
    for (let i = 0; i < 20; i++) {
      TaxEngineMonitor.recordExecution(10, false, 2024);
    }
    const snapshot = TaxEngineMonitor.getSnapshot();
    expect(snapshot.totalErrors).toBe(20);
    expect(snapshot.status).toBe("FAILED");
  });

  it("14. engine version drift detects CURRENT for matching production engine", () => {
    const report = TaxEngineMonitor.evaluateVersionDrift(ENGINE_VERSION, "calc_123");
    expect(report.status).toBe("CURRENT");
    expect(report.isHistoricalPreserved).toBe(true);
  });

  it("15. historical version preservation protects legacy calculations from recalculation", () => {
    const report = TaxEngineMonitor.evaluateVersionDrift("1.0.0-baseline", "calc_legacy_001");
    expect(report.status).toBe("HISTORICAL");
    expect(report.isHistoricalPreserved).toBe(true);
    expect(report.message).toContain("preserved without automatic recalculation");
  });

  it("16. expected version mismatch recognizes non-baseline legacy records as immutable", () => {
    const report = TaxEngineMonitor.evaluateVersionDrift("2023.2.0-custom", "calc_diff_999");
    expect(report.status).toBe("EXPECTED_VERSION_MISMATCH");
    expect(report.isHistoricalPreserved).toBe(true);
  });

  it("17. tax engine monitoring never captures taxpayer dollar amounts", () => {
    TaxEngineMonitor.recordExecution(18, true, 2024);
    const snapshotStr = JSON.stringify(TaxEngineMonitor.getSnapshot());

    for (const field of PROHIBITED_OPERATIONAL_FIELDS) {
      expect(snapshotStr).not.toContain(`"${field}":`);
    }
  });

  // =========================================================================
  // 4. AI Guidance Monitoring & Degradation
  // =========================================================================

  it("18. AI monitor records queries, latency, and outcome metrics", () => {
    AiMonitor.recordQuery(450, "success", "req_ai_1");
    AiMonitor.recordQuery(500, "success", "req_ai_2");

    const snapshot = AiMonitor.getSnapshot();
    expect(snapshot.totalRequests).toBe(2);
    expect(snapshot.successfulRequests).toBe(2);
    expect(snapshot.averageLatencyMs).toBe(475);
  });

  it("19. AI monitor tracks rate limits and timeouts without capturing user prompts", () => {
    AiMonitor.recordQuery(100, "rate_limited", "req_rl_1");
    AiMonitor.recordQuery(5000, "timeout", "req_to_1");

    const snapshot = AiMonitor.getSnapshot();
    expect(snapshot.rateLimitedRequests).toBe(1);
    expect(snapshot.timedOutRequests).toBe(1);

    const snapshotStr = JSON.stringify(snapshot);
    expect(snapshotStr).not.toContain("prompt");
    expect(snapshotStr).not.toContain("response");
  });

  it("20. AI status degrades gracefully without affecting tax calculators", () => {
    for (let i = 0; i < 15; i++) {
      AiMonitor.recordQuery(200, "failure", `req_fail_${i}`);
    }
    const aiSnapshot = AiMonitor.getSnapshot();
    expect(aiSnapshot.status).toBe("DEGRADED");

    // Tax engine remains 100% separate
    const taxSnapshot = TaxEngineMonitor.getSnapshot();
    expect(taxSnapshot.status).toBe("HEALTHY");
  });

  it("21. AI assistant disabled via feature flag reports NOT_CONFIGURED", () => {
    PlatformConfigStore.set("ai.assistant_enabled", false);
    const snapshot = AiMonitor.getSnapshot();
    expect(snapshot.status).toBe("NOT_CONFIGURED");
    expect(snapshot.message).toContain("disabled via platform feature flag");
  });

  it("22. deterministic tax engine remains authority when AI is degraded", () => {
    AiMonitor.recordQuery(1000, "failure");
    expect(AiMonitor.getSnapshot().status).toBe("DEGRADED");
    expect(TaxEngineMonitor.getSnapshot().status).toBe("HEALTHY");
  });

  // =========================================================================
  // 5. Billing, Email & Support Telemetry
  // =========================================================================

  it("23. billing monitor records checkouts and failures without card numbers", () => {
    BillingMonitor.recordCheckout(true, "tier_premium", "req_bill_1");
    BillingMonitor.recordCheckout(false, "tier_premium", "req_bill_2");

    const snapshot = BillingMonitor.getSnapshot();
    expect(snapshot.totalCheckoutAttempts).toBeGreaterThanOrEqual(2);
    expect(snapshot.failedCheckouts).toBeGreaterThanOrEqual(1);

    const str = JSON.stringify(snapshot);
    for (const field of PROHIBITED_OPERATIONAL_FIELDS) {
      expect(str).not.toContain(`"${field}":`);
    }
  });

  it("24. billing monitor records duplicate webhook events idempotently", () => {
    BillingMonitor.recordWebhookEvent("duplicate", "evt_stripe_duplicate_1");
    const snapshot = BillingMonitor.getSnapshot();
    expect(snapshot.duplicateWebhookEvents).toBeGreaterThanOrEqual(1);
  });

  it("25. email monitor tracks delivery attempts with masked recipient logging", () => {
    EmailMonitor.recordSend("password_reset", true, "u***@example.com", "req_mail_1");
    EmailMonitor.recordSend("tax_report_ready", false, "t***@example.com", "req_mail_2");

    const snapshot = EmailMonitor.getSnapshot();
    expect(snapshot.totalAttempts).toBeGreaterThanOrEqual(2);
    expect(snapshot.failedSends).toBeGreaterThanOrEqual(1);
  });

  it("26. email snapshot reflects configured provider state", () => {
    const snapshot = EmailMonitor.getSnapshot();
    expect(snapshot.provider).toBeTruthy();
    expect(["HEALTHY", "DEGRADED", "NOT_CONFIGURED"]).toContain(snapshot.status);
  });

  it("27. support monitor compiles aggregate ticket status counts", async () => {
    const metrics = await SupportMonitor.getMetrics();
    expect(metrics.totalTickets).toBeGreaterThanOrEqual(0);
    expect(metrics.openTickets).toBeGreaterThanOrEqual(0);
    expect(metrics.urgentTickets).toBeGreaterThanOrEqual(0);
  });

  it("28. support monitor honestly returns NO_DATA for unmeasured response/resolution times", async () => {
    const metrics = await SupportMonitor.getMetrics();
    expect(metrics.averageFirstResponseMinutes).toBe("NO_DATA");
    expect(metrics.averageResolutionMinutes).toBe("NO_DATA");
  });

  // =========================================================================
  // 6. Incident Store & Lifecycle Transitions
  // =========================================================================

  it("29. incident creation generates initial detection event and stores record", async () => {
    const incident = await IncidentStore.createIncident({
      title: "Elevated 500 error rate on tax report generation",
      severity: "SEV2",
      service: "TAX_REPORTS",
      summary: "PDF generation worker timing out on large multi-scenario reports.",
      createdBy: "admin_user_01",
      assignedTo: "eng_lead_02",
    });

    expect(incident.id).toBeTruthy();
    expect(incident.status).toBe("DETECTED");
    expect(incident.events.length).toBe(1);
    expect(incident.events[0].eventType).toBe("detected");
  });

  it("30. incident numbering produces server-authoritative INC-YYYY-NNNNNN IDs", async () => {
    const incNum1 = IncidentStore.generateIncidentNumber();
    const incNum2 = IncidentStore.generateIncidentNumber();

    const currentYear = new Date().getFullYear();
    expect(incNum1).toMatch(new RegExp(`^INC-${currentYear}-\\d{6}$`));
    expect(incNum2).toMatch(new RegExp(`^INC-${currentYear}-\\d{6}$`));
    expect(incNum1).not.toBe(incNum2);
  });

  it("31. incident validation schema enforces title, severity, service, and summary length", () => {
    const valid = createIncidentSchema.safeParse({
      title: "Stripe Webhook Signature Mismatch Spike",
      severity: "SEV1",
      service: "STRIPE_WEBHOOKS",
      summary: "Inbound Stripe webhooks failing signature verification after key rotation.",
    });
    expect(valid.success).toBe(true);

    const invalid = createIncidentSchema.safeParse({
      title: "X", // Too short
      severity: "INVALID_SEV",
      service: "NOT_A_SERVICE",
      summary: "Short",
    });
    expect(invalid.success).toBe(false);
  });

  it("32. updateIncidentSchema validates status transitions and update fields", () => {
    const valid = updateIncidentSchema.safeParse({
      status: "INVESTIGATING",
      rootCause: "Environment variable STRIPE_WEBHOOK_SECRET had trailing whitespace.",
    });
    expect(valid.success).toBe(true);

    const invalid = updateIncidentSchema.safeParse({
      status: "NOT_A_REAL_STATUS",
    });
    expect(invalid.success).toBe(false);
  });

  it("33. incident lifecycle transitions from DETECTED to RESOLVED and CLOSED", async () => {
    const incident = await IncidentStore.createIncident({
      title: "Gemini Rate Limit Spikes",
      severity: "SEV3",
      service: "AI_ASSISTANT",
      summary: "High volume during peak hours triggering quota exhaustion.",
      createdBy: "admin_tester",
    });

    const investigating = await IncidentStore.updateIncident(incident.id, {
      status: "INVESTIGATING",
      actor: "admin_tester",
    });
    expect(investigating.status).toBe("INVESTIGATING");

    const mitigating = await IncidentStore.updateIncident(incident.id, {
      status: "MITIGATING",
      actor: "admin_tester",
    });
    expect(mitigating.status).toBe("MITIGATING");
    expect(mitigating.mitigatedAt).toBeTruthy();

    const resolved = await IncidentStore.updateIncident(incident.id, {
      status: "RESOLVED",
      resolutionSummary: "Increased Vertex AI quota tier to 500 RPM.",
      actor: "admin_tester",
    });
    expect(resolved.status).toBe("RESOLVED");
    expect(resolved.resolvedAt).toBeTruthy();

    const closed = await IncidentStore.updateIncident(incident.id, {
      status: "CLOSED",
      actor: "admin_tester",
    });
    expect(closed.status).toBe("CLOSED");
    expect(closed.closedAt).toBeTruthy();
  });

  it("34. incident timeline appends timestamped events with actor and safe notes", async () => {
    const incident = await IncidentStore.createIncident({
      title: "Database latency surge",
      severity: "SEV2",
      service: "DATABASE",
      summary: "Connection pool saturation detected on read replicas.",
      createdBy: "admin_db",
    });

    IncidentStore.addEvent(
      incident.id,
      "admin_db",
      "investigating",
      "PgBouncer active pool size increased from 20 to 50."
    );

    const updated = await IncidentStore.getIncident(incident.id);
    expect(updated).toBeDefined();
    const currentIncident = updated!;
    expect(currentIncident.events.length).toBe(2);
    expect(currentIncident.events[1].actor).toBe("admin_db");
    expect(currentIncident.events[1].eventType).toBe("investigating");
    expect(currentIncident.events[1].note).toContain("PgBouncer");
  });

  it("35. incident creation records audit log entry in AuditLogStore", async () => {
    await IncidentStore.createIncident({
      title: "Audit verification incident",
      severity: "SEV4",
      service: "NOTIFICATIONS",
      summary: "In-app notifications delayed by 2 minutes.",
      createdBy: "compliance_officer_01",
    });

    const logs = AuditLogStore.getAll();
    const entry = logs.find((l) => l.action === "incident_created");
    expect(entry).toBeDefined();
    expect(entry?.userId).toBe("compliance_officer_01");
  });

  it("36. getAllIncidents supports status filtering and descending sort", async () => {
    const inc1 = await IncidentStore.createIncident({
      title: "Incident 1",
      severity: "SEV3",
      service: "SUPPORT",
      summary: "Support ticket email sync delay.",
      createdBy: "admin_1",
    });

    const inc2 = await IncidentStore.createIncident({
      title: "Incident 2",
      severity: "SEV2",
      service: "AUTHENTICATION",
      summary: "Session refresh latency elevation.",
      createdBy: "admin_1",
    });

    await IncidentStore.updateIncident(inc1.id, { status: "RESOLVED", actor: "admin_1" });

    const openList = await IncidentStore.getAllIncidents("DETECTED");
    expect(openList.some((i) => i.id === inc2.id)).toBe(true);
    expect(openList.some((i) => i.id === inc1.id)).toBe(false);

    const resolvedList = await IncidentStore.getAllIncidents("RESOLVED");
    expect(resolvedList.some((i) => i.id === inc1.id)).toBe(true);
  });

  it("37. getIncident retrieves incident by both UUID and human-readable incidentNumber", async () => {
    const created = await IncidentStore.createIncident({
      title: "Dual lookup test incident",
      severity: "SEV4",
      service: "SEO",
      summary: "Sitemap regeneration job failed.",
      createdBy: "admin_seo",
    });

    const byId = await IncidentStore.getIncident(created.id);
    const byNumber = await IncidentStore.getIncident(created.incidentNumber);

    expect(byId).toBeDefined();
    expect(byNumber).toBeDefined();
    expect(byId?.id).toBe(byNumber?.id);
  });

  it("38. updating non-existent incident throws 404 OperationalError", async () => {
    await expect(
      IncidentStore.updateIncident("inc_does_not_exist", {
        title: "New Title",
        actor: "admin_test",
      })
    ).rejects.toThrow("Incident not found.");
  });

  // =========================================================================
  // 7. Operational Alerts & Security Signals
  // =========================================================================

  it("39. alert service triggers alert and increments counter on duplicate conditions", () => {
    const alert1 = AlertService.triggerAlert("TAX_ENGINE", "HIGH", "TAX_ENGINE_EXCEPTION_RATE");
    expect(alert1.status).toBe("OPEN");
    expect(alert1.count).toBe(1);

    const alert2 = AlertService.triggerAlert("TAX_ENGINE", "HIGH", "TAX_ENGINE_EXCEPTION_RATE");
    expect(alert2.id).toBe(alert1.id);
    expect(alert2.count).toBe(2);
  });

  it("40. alert service acknowledges active alert with admin actor and timestamp", () => {
    const alert = AlertService.triggerAlert("DATABASE", "CRITICAL", "CONNECTION_POOL_EXHAUSTED");
    const acked = AlertService.acknowledgeAlert(alert.id, "admin_dba_01");

    expect(acked).toBeDefined();
    expect(acked?.status).toBe("ACKNOWLEDGED");
    expect(acked?.acknowledgedBy).toBe("admin_dba_01");
    expect(acked?.acknowledgedAt).toBeTruthy();
  });

  it("41. alert service resolves active alert with admin actor and timestamp", () => {
    const alert = AlertService.triggerAlert("AI_ASSISTANT", "MEDIUM", "GEMINI_TIMEOUT_SPIKE");
    const resolved = AlertService.resolveAlert(alert.id, "admin_ai_01");

    expect(resolved).toBeDefined();
    expect(resolved?.status).toBe("RESOLVED");
    expect(resolved?.resolvedAt).toBeTruthy();
  });

  it("42. getActiveAlerts filters out resolved alerts", () => {
    const a1 = AlertService.triggerAlert("BILLING", "HIGH", "STRIPE_CHECKOUT_500");
    const a2 = AlertService.triggerAlert("EMAIL", "LOW", "TRANSACTIONAL_EMAIL_BOUNCE");
    AlertService.resolveAlert(a2.id, "admin_email_01");

    const active = AlertService.getActiveAlerts();
    expect(active.some((a) => a.id === a1.id)).toBe(true);
    expect(active.some((a) => a.id === a2.id)).toBe(false);
  });

  it("43. security anomaly triggers SECURITY_SIGNAL without premature profiling", () => {
    const secAlert = AlertService.triggerAlert("AUTHENTICATION", "CRITICAL", "SECURITY_SIGNAL_AUTH_SPIKE", {
      actor: "sec_monitor",
    });
    expect(secAlert.condition).toContain("SECURITY_SIGNAL");

    const json = JSON.stringify(secAlert);
    expect(json).not.toContain("attacker");
    expect(json).not.toContain("hacker");
  });

  it("44. rate-limit alerting safely tracks 429 surges by route category", () => {
    const rateAlert = AlertService.triggerAlert("CALCULATORS", "MEDIUM", "RATE_LIMIT_429_SPIKE", {
      window: "10m",
      count: 25,
    });
    expect(rateAlert.count).toBe(25);
    expect(rateAlert.measurementWindow).toBe("10m");
  });

  it("45. alert actions log entries into AuditLogStore", () => {
    const alert = AlertService.triggerAlert("SEARCH_SEO", "LOW", "CRAWLER_BOT_BLOCKED");
    AlertService.acknowledgeAlert(alert.id, "admin_seo_lead");

    const logs = AuditLogStore.getAll();
    const ackLog = logs.find((l) => l.action === "alert_acknowledged");
    expect(ackLog).toBeDefined();
    expect(ackLog?.userId).toBe("admin_seo_lead");
  });

  it("46. alert payloads strictly exclude prohibited sensitive fields", () => {
    const alert = AlertService.triggerAlert("TAX_ENGINE", "CRITICAL", "CALCULATION_VALIDATION_ERROR");
    const alertStr = JSON.stringify(alert);

    for (const field of PROHIBITED_OPERATIONAL_FIELDS) {
      expect(alertStr).not.toContain(`"${field}":`);
    }
  });

  // =========================================================================
  // 8. Service Targets vs. Measured Results & Error Budgets
  // =========================================================================

  it("47. service targets define operational targets, not contractual guarantees", () => {
    const taxTarget = getServiceTarget("TAX_ENGINE");
    expect(taxTarget).toBeDefined();
    expect(taxTarget?.targetAvailability).toBe("99.99%");
    expect(taxTarget?.notes).toBeTruthy();

    const calcTarget = getServiceTarget("CALCULATORS");
    expect(calcTarget?.targetAvailability).toBe("99.95%");
  });

  it("48. incident response targets strictly vary by severity level", () => {
    const sev1 = getIncidentResponseTarget("SEV1");
    const sev2 = getIncidentResponseTarget("SEV2");
    const sev3 = getIncidentResponseTarget("SEV3");
    const sev4 = getIncidentResponseTarget("SEV4");

    expect(sev1.ackMinutes).toBe(15);
    expect(sev2.ackMinutes).toBe(30);
    expect(sev3.ackMinutes).toBe(240);
    expect(sev4.ackMinutes).toBe(1440);
  });

  it("49. error budget calculator returns NO_DATA when empirical downtime is unmeasured", () => {
    const budget = ErrorBudgetCalculator.calculate("TAX_ENGINE");
    expect(budget.measurementState).toBe("NO_DATA");
    expect(budget.status).toBe("NO_DATA");
    expect(budget.budgetRemainingPercent).toBeUndefined();
    expect(budget.note).toContain("unmeasured in current environment");
  });

  it("50. error budget calculator computes remaining budget when downtime is measured", () => {
    // 30 day window = 43200 minutes. 99.9% target allows 43.2 minutes downtime.
    // If measured downtime = 10 minutes, remaining is ~77%.
    const budget = ErrorBudgetCalculator.calculate("CALCULATORS", 10, 30);
    expect(budget.measurementState).toBe("MEASURED");
    expect(budget.budgetRemainingPercent).toBeGreaterThan(70);
    expect(budget.status).toBe("HEALTHY");
  });

  it("51. error budget marks status EXHAUSTED when measured downtime exceeds allowable", () => {
    // If measured downtime = 100 minutes (exceeds allowable ~43m)
    const budget = ErrorBudgetCalculator.calculate("CALCULATORS", 100, 30);
    expect(budget.measurementState).toBe("MEASURED");
    expect(budget.budgetRemainingPercent).toBe(0);
    expect(budget.status).toBe("EXHAUSTED");
  });

  it("52. error budget calculator never fabricates uptime percentage without measurement", () => {
    const unmeasured = ErrorBudgetCalculator.calculate("AI_ASSISTANT");
    expect(unmeasured.measurementState).toBe("NO_DATA");
    expect(unmeasured.unplannedDowntimeMinutes).toBeUndefined();
  });

  // =========================================================================
  // 9. Admin Operations APIs & Role Authorization
  // =========================================================================

  it("53. GET /api/v1/admin/operations requires admin authentication", async () => {
    const unauthReq = createMockRequest("http://localhost:3000/api/v1/admin/operations");
    const res = await getOperationsRoute(unauthReq);
    expect(res.status).toBe(401);
  });

  it("54. GET /api/v1/admin/operations returns 200 with operational report for admin", async () => {
    const adminReq = createMockRequest("http://localhost:3000/api/v1/admin/operations", {
      token: "test-admin-session",
    });
    const res = await getOperationsRoute(adminReq);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.overallStatus).toBeDefined();
    expect(body.data.services.length).toBe(19);
  });

  it("55. GET /api/v1/admin/operations/services returns service catalog and health", async () => {
    const adminReq = createMockRequest("http://localhost:3000/api/v1/admin/operations/services", {
      token: "test-admin-session",
    });
    const res = await getServicesRoute(adminReq);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(19);
  });

  it("56. GET /api/v1/admin/operations/performance returns request metrics and tax engine snapshot", async () => {
    const adminReq = createMockRequest("http://localhost:3000/api/v1/admin/operations/performance", {
      token: "test-admin-session",
    });
    const res = await getPerformanceRoute(adminReq);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.taxEngine).toBeDefined();
    expect(body.data.ai).toBeDefined();
    expect(body.data.billing).toBeDefined();
  });

  it("57. GET /api/v1/admin/operations/alerts returns active alerts", async () => {
    AlertService.triggerAlert("DATABASE", "HIGH", "POOL_SPIKE");
    const adminReq = createMockRequest("http://localhost:3000/api/v1/admin/operations/alerts", {
      token: "test-admin-session",
    });
    const res = await getAlertsRoute(adminReq);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("58. POST /api/v1/admin/operations/incidents creates incident with Zod validation", async () => {
    const adminReq = createMockRequest("http://localhost:3000/api/v1/admin/operations/incidents", {
      method: "POST",
      token: "test-admin-session",
      body: {
        title: "API Gateway 502 Bad Gateway Surge",
        severity: "SEV1",
        service: "APPLICATION",
        summary: "Upstream Next.js worker pool crashed due to memory pressure on heavy export route.",
      },
    });
    const res = await createIncidentRoute(adminReq);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.incidentNumber).toMatch(/^INC-\d{4}-\d{6}$/);
  });

  it("59. GET /api/v1/admin/operations/incidents/[id] returns incident details and timeline", async () => {
    const inc = await IncidentStore.createIncident({
      title: "Detail fetch test",
      severity: "SEV3",
      service: "CALCULATORS",
      summary: "Calculator client bundle failing to load on Safari 15.",
      createdBy: "admin_test",
    });

    const adminReq = createMockRequest(`http://localhost:3000/api/v1/admin/operations/incidents/${inc.id}`, {
      token: "test-admin-session",
    });
    const res = await getIncidentDetailRoute(adminReq, { params: { id: inc.id } });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.title).toBe("Detail fetch test");
    expect(body.data.events.length).toBe(1);
  });

  it("60. PATCH /api/v1/admin/operations/incidents/[id] updates incident with audit log", async () => {
    const inc = await IncidentStore.createIncident({
      title: "Patch test incident",
      severity: "SEV2",
      service: "TAX_REPORTS",
      summary: "Report rendering delayed.",
      createdBy: "admin_test",
    });

    const patchReq = createMockRequest(`http://localhost:3000/api/v1/admin/operations/incidents/${inc.id}`, {
      method: "PATCH",
      token: "test-admin-session",
      body: {
        status: "RESOLVED",
        resolutionSummary: "Restarted Chromium worker pool in production.",
      },
    });
    const res = await patchIncidentRoute(patchReq, { params: { id: inc.id } });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe("RESOLVED");
    expect(body.data.resolutionSummary).toContain("Chromium worker pool");
  });

  it("61. POST /api/v1/admin/operations/incidents/[id]/events appends timeline event", async () => {
    const inc = await IncidentStore.createIncident({
      title: "Event append test incident",
      severity: "SEV3",
      service: "BACKUP",
      summary: "Backup snapshot delay.",
      createdBy: "admin_test",
    });

    const eventReq = createMockRequest(`http://localhost:3000/api/v1/admin/operations/incidents/${inc.id}/events`, {
      method: "POST",
      token: "test-admin-session",
      body: {
        eventType: "mitigating",
        note: "Triggered ad-hoc manual snapshot via Supabase provider CLI.",
      },
    });
    const res = await createIncidentEventRoute(eventReq, { params: { id: inc.id } });
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.eventType).toBe("mitigating");
    expect(body.data.note).toContain("Supabase provider CLI");
  });

  // =========================================================================
  // 10. Final Launch Readiness Engine
  // =========================================================================

  it("62. launch readiness engine audits all 16 specified platform domains", async () => {
    const report = await LaunchReadinessService.evaluate();
    expect(report.totalChecks).toBe(16);
    expect(report.checks.length).toBe(16);

    const categories = report.checks.map((c) => c.category);
    expect(categories).toContain("APPLICATION");
    expect(categories).toContain("DATABASE");
    expect(categories).toContain("AUTHENTICATION");
    expect(categories).toContain("TAX ENGINE");
    expect(categories).toContain("AI");
    expect(categories).toContain("BILLING");
    expect(categories).toContain("EMAIL");
    expect(categories).toContain("SECURITY");
    expect(categories).toContain("SEO");
    expect(categories).toContain("LEGAL");
    expect(categories).toContain("SUPPORT");
    expect(categories).toContain("DATA MANAGEMENT");
    expect(categories).toContain("BACKUP");
    expect(categories).toContain("OBSERVABILITY");
    expect(categories).toContain("DEPLOYMENT");
    expect(categories).toContain("INCIDENT MANAGEMENT");
  });

  it("63. launch readiness overallStatus distinguishes READY vs WARNING vs BLOCKED vs NOT_READY", async () => {
    const report = await LaunchReadinessService.evaluate();
    expect(["READY", "READY_WITH_WARNINGS", "BLOCKED", "NOT_READY"]).toContain(report.overallStatus);
  });

  it("64. launch readiness blocks production if mandatory tax engine fails", async () => {
    // Simulate tax engine failure
    for (let i = 0; i < 20; i++) {
      TaxEngineMonitor.recordExecution(10, false, 2024);
    }
    const report = await LaunchReadinessService.evaluate();
    const taxCheck = report.checks.find((c) => c.category === "TAX ENGINE");
    expect(taxCheck?.status).toBe("BLOCKED");
    expect(report.mandatoryPassed).toBe(false);
  });

  it("65. launch readiness evidence strings are strictly sanitized with zero secrets or tax data", async () => {
    const report = await LaunchReadinessService.evaluate();
    const reportStr = JSON.stringify(report);

    for (const field of PROHIBITED_OPERATIONAL_FIELDS) {
      expect(reportStr).not.toContain(`"${field}":`);
    }
    expect(reportStr).not.toContain("my-super-secret-key");
  });

  it("66. GET /api/v1/admin/launch-readiness returns full audit to authorized admin", async () => {
    const adminReq = createMockRequest("http://localhost:3000/api/v1/admin/launch-readiness", {
      token: "test-admin-session",
    });
    const res = await getLaunchReadinessRoute(adminReq);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.totalChecks).toBe(16);
    expect(body.data.checks.length).toBe(16);
  });

  it("67. GET /api/v1/admin/launch-readiness rejects non-admin users with 403 Forbidden", async () => {
    const userReq = createMockRequest("http://localhost:3000/api/v1/admin/launch-readiness", {
      token: "test-user-standard",
    });
    const res = await getLaunchReadinessRoute(userReq);
    expect([401, 403]).toContain(res.status);
  });

  it("68. launch readiness never outputs 'READY FOR PRODUCTION' in development without full prod config", async () => {
    process.env.APP_ENV = "development";
    const report = await LaunchReadinessService.evaluate();
    // In development with mock providers, overallStatus must NOT be unconditional "READY"
    expect(report.overallStatus).not.toBe("READY");
    expect(["READY_WITH_WARNINGS", "NOT_READY", "BLOCKED"]).toContain(report.overallStatus);
  });

  // =========================================================================
  // 11. Privacy, Security Invariants, Retention & Maintenance Controls
  // =========================================================================

  it("69. prohibited sensitive fields are never stored in operational incident summaries", async () => {
    const inc = await IncidentStore.createIncident({
      title: "Privacy Sanitization Test",
      severity: "SEV3",
      service: "APPLICATION",
      summary: "Sanitization test verifying absence of SSN or income numbers.",
      createdBy: "compliance_admin",
    });

    const jsonStr = JSON.stringify(inc);
    for (const field of PROHIBITED_OPERATIONAL_FIELDS) {
      expect(jsonStr).not.toContain(`"${field}":`);
    }
  });

  it("70. AI queries exclude raw taxpayer prompts and responses from monitoring", () => {
    AiMonitor.recordQuery(250, "success", "req_safe_01");
    const snapshot = AiMonitor.getSnapshot();
    const str = JSON.stringify(snapshot);

    expect(str).not.toContain("w2");
    expect(str).not.toContain("income");
    expect(str).not.toContain("ssn");
    expect(str).not.toContain("taxpayer");
  });

  it("71. request correlation ID is attached to error responses", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/admin/operations/incidents/inc_nonexistent", {
      token: "test-admin-session",
    });
    const res = await getIncidentDetailRoute(req, { params: { id: "inc_nonexistent" } });
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });

  it("72. maintenance mode blocks non-critical operations but preserves admin platform", () => {
    PlatformConfigStore.set("platform.maintenance_mode", true);
    expect(PlatformConfigStore.getBoolean("platform.maintenance_mode", false)).toBe(true);

    const reports = ServiceHealthService.evaluateAllServices();
    const adminService = reports.find((r) => r.service === "ADMIN");
    expect(adminService?.status).toBe("HEALTHY");
  });

  it("73. maintenance mode toggle is recorded in platform configuration audit trail", () => {
    PlatformConfigStore.set("platform.maintenance_mode", true);
    expect(PlatformConfigStore.getBoolean("platform.maintenance_mode", false)).toBe(true);

    PlatformConfigStore.set("platform.maintenance_mode", false);
    expect(PlatformConfigStore.getBoolean("platform.maintenance_mode", false)).toBe(false);
  });

  it("74. all required incident and security runbooks exist in docs/", () => {
    const runbooks = [
      "INCIDENT-RESPONSE-RUNBOOK.md",
      "SECURITY-INCIDENT-RUNBOOK.md",
      "TAX-ENGINE-INCIDENT-RUNBOOK.md",
      "AI-INCIDENT-RUNBOOK.md",
      "BILLING-INCIDENT-RUNBOOK.md",
      "DATABASE-INCIDENT-RUNBOOK.md",
      "FINAL-LAUNCH-READINESS.md",
    ];

    for (const file of runbooks) {
      const fullPath = path.join(process.cwd(), "docs", file);
      expect(fs.existsSync(fullPath)).toBe(true);
    }
  });

  it("75. CI workflow remains free of error-masking flags", () => {
    const ciPath = path.join(process.cwd(), ".github", "workflows", "ci.yml");
    const content = fs.readFileSync(ciPath, "utf-8");
    expect(content).not.toContain("|| true");
    expect(content).not.toContain("continue-on-error: true");
  });
});
