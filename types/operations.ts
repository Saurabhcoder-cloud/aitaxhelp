/**
 * Production Operations, Incident Management & Monitoring Types (Phase 5 Step 19)
 */

export type OperationalStatus =
  | "HEALTHY"
  | "DEGRADED"
  | "PARTIAL_OUTAGE"
  | "MAJOR_OUTAGE"
  | "MAINTENANCE"
  | "UNKNOWN"
  | "NOT_CONFIGURED"
  | "NO_DATA";

export type MeasurementState =
  | "MEASURED"
  | "UNMEASURED"
  | "NOT_CONFIGURED"
  | "NO_DATA";

export type IncidentSeverity = "SEV1" | "SEV2" | "SEV3" | "SEV4";

export type IncidentStatus =
  | "DETECTED"
  | "INVESTIGATING"
  | "IDENTIFIED"
  | "MITIGATING"
  | "MONITORING"
  | "RESOLVED"
  | "CLOSED";

export type AlertSeverity =
  | "SEV1"
  | "SEV2"
  | "SEV3"
  | "SEV4"
  | "WARNING"
  | "INFO"
  | "CRITICAL"
  | "HIGH"
  | "MEDIUM"
  | "LOW";

export type AlertStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "SUPPRESSED";

export type ServiceCriticality = "CRITICAL" | "HIGH" | "NORMAL" | "LOW";

export const SERVICE_IDS = [
  "APPLICATION",
  "DATABASE",
  "AUTHENTICATION",
  "TAX_ENGINE",
  "AI_ASSISTANT",
  "CALCULATORS",
  "TAX_REPORTS",
  "BILLING",
  "STRIPE_WEBHOOKS",
  "EMAIL",
  "NOTIFICATIONS",
  "SUPPORT",
  "PROFESSIONAL_HANDOFF",
  "BACKUP",
  "RESTORE",
  "SEARCH_SEO",
  "SEO",
  "ADMIN",
  "CI_CD",
] as const;

export type ServiceId = (typeof SERVICE_IDS)[number];

export interface ServiceCatalogItem {
  id: ServiceId;
  serviceId?: ServiceId;
  name: string;
  displayName?: string;
  criticality: ServiceCriticality;
  owner: string;
  dependencies: ServiceId[];
  healthEndpoint?: string;
  targetAvailabilityPercent: number; // Operational Target, NOT a claim of current uptime
  targetLatencyMs?: number; // Operational Target, NOT a claim of current latency
  impactsCoreTaxMath: boolean;
  description: string;
}

export interface ServiceHealthReport {
  serviceId: ServiceId;
  service?: ServiceId;
  name: string;
  criticality: ServiceCriticality;
  status: OperationalStatus;
  measurementState: MeasurementState;
  measuredLatencyMs?: number;
  latencyMs?: number;
  message: string;
  dependencies: Array<{ id: ServiceId; status: OperationalStatus }>;
  checkedAt: string;
}

export interface IncidentEventRecord {
  id: string;
  incidentId: string;
  timestamp: string;
  actor: string;
  eventType: string;
  note: string;
}

export interface IncidentRecord {
  id: string;
  incidentNumber: string; // INC-YYYY-NNNNNN
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  service: ServiceId;
  serviceId?: ServiceId;
  summary: string;
  detectedAt: string;
  identifiedAt?: string;
  mitigatedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  createdBy: string;
  assignedTo?: string;
  rootCause?: string;
  resolutionSummary?: string;
  customerImpact?: string;
  internalNotes?: string;
  events: IncidentEventRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface AlertRecord {
  id: string;
  alertId: string;
  service: ServiceId;
  severity: AlertSeverity;
  condition: string;
  status: AlertStatus;
  triggeredAt: string;
  resolvedAt?: string;
  count: number;
  measurementWindow: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceTarget {
  serviceId: ServiceId;
  name: string;
  targetAvailability: string; // e.g. "99.9%"
  targetLatency: string; // e.g. "< 500ms"
  incidentAckTargetMinutes: Record<IncidentSeverity, number>;
  notes: string;
}

export interface ErrorBudgetReport {
  serviceId: ServiceId;
  targetAvailabilityPercent: number;
  measurementWindowDays: number;
  measurementState: MeasurementState;
  budgetRemainingPercent?: number;
  unplannedDowntimeMinutes?: number;
  status: OperationalStatus | "EXHAUSTED";
  note: string;
}

export interface OperationsSummaryReport {
  overallStatus: OperationalStatus;
  services: ServiceHealthReport[];
  openIncidentsCount: number;
  activeAlertsCount: number;
  sev1Count: number;
  sev2Count: number;
  maintenanceMode: boolean;
  taxEngineStatus: OperationalStatus;
  aiStatus: OperationalStatus;
  billingStatus: OperationalStatus;
  emailStatus: OperationalStatus;
  backupStatus: OperationalStatus;
  generatedAt: string;
}

export type LaunchCheckStatus = "READY" | "WARNING" | "BLOCKED" | "NOT_CONFIGURED" | "NO_DATA" | "DEGRADED";

export interface LaunchCheckItem {
  category: string;
  name: string;
  status: LaunchCheckStatus;
  isMandatory: boolean;
  evidence: string;
  notes: string;
}

export interface LaunchReadinessReport {
  overallStatus: "READY" | "READY_WITH_WARNINGS" | "BLOCKED" | "NOT_READY";
  environment: string;
  mandatoryPassed: boolean;
  totalChecks: number;
  passedCount: number;
  warningCount: number;
  blockedCount: number;
  checks: LaunchCheckItem[];
  evaluatedAt: string;
}
