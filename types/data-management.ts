/**
 * Centralized Data Management, Retention & Disaster Recovery Models (Phase 5 Step 17)
 *
 * CRITICAL PRIVACY INVARIANT:
 * These models capture operational metadata, counts, integrity diagnostics, and
 * policy definitions. They NEVER store taxpayer SSNs, EINs, bank accounts,
 * wages, liabilities, or refunds.
 */

export type DataClassification =
  | "PUBLIC"
  | "INTERNAL"
  | "CONFIDENTIAL"
  | "SENSITIVE_TAX"
  | "SECURITY_SENSITIVE";

export type DatasetKey =
  | "USER_PROFILE"
  | "TAX_PROFILE"
  | "TAX_CALCULATIONS"
  | "AI_CONVERSATIONS"
  | "TAX_REPORTS"
  | "PROFESSIONAL_LEADS"
  | "SUBSCRIPTIONS"
  | "USAGE_RECORDS"
  | "NOTIFICATIONS"
  | "SUPPORT_TICKETS"
  | "SUPPORT_MESSAGES"
  | "AUDIT_LOGS"
  | "ADMIN_CONFIGURATION"
  | "PLATFORM_CONFIGURATION"
  | "ANALYTICS"
  | "OPERATIONAL_METRICS";

export const DATASET_KEYS: DatasetKey[] = [
  "USER_PROFILE",
  "TAX_PROFILE",
  "TAX_CALCULATIONS",
  "AI_CONVERSATIONS",
  "TAX_REPORTS",
  "PROFESSIONAL_LEADS",
  "SUBSCRIPTIONS",
  "USAGE_RECORDS",
  "NOTIFICATIONS",
  "SUPPORT_TICKETS",
  "SUPPORT_MESSAGES",
  "AUDIT_LOGS",
  "ADMIN_CONFIGURATION",
  "PLATFORM_CONFIGURATION",
  "ANALYTICS",
  "OPERATIONAL_METRICS",
];

export const TARGET_RPO_MINUTES = 60; // 1 hour recovery point objective
export const TARGET_RTO_MINUTES = 120; // 2 hours recovery time objective

export type DataCategory =
  | "user_data"
  | "tax_data"
  | "operational"
  | "security"
  | "billing"
  | "support"
  | "analytics"
  | "SUPPORT"
  | "COMMUNICATIONS";

export type RetentionMode =
  | "USER_CONTROLLED"
  | "OPERATIONAL"
  | "SECURITY"
  | "AUDIT"
  | "CONFIGURATION"
  | "SYSTEM";

export type RetentionState =
  | "ACTIVE"
  | "RETENTION_ELIGIBLE"
  | "LEGAL_HOLD"
  | "DELETION_PENDING"
  | "DELETED";

export type UserDeletionBehavior = "PURGE" | "ANONYMIZE" | "RETAIN";

export type ExportBehavior = "INCLUDED" | "EXCLUDED" | "INCLUDE" | "EXCLUDE";

export type RecoveryPriority = "CRITICAL" | "HIGH" | "NORMAL" | "LOW";

export type BackupRequirement = "CRITICAL" | "HIGH" | "NORMAL" | "LOW" | "NONE";

export interface DatasetInventoryItem {
  key: DatasetKey;
  dataset?: DatasetKey;
  name: string;
  description: string;
  category: DataCategory;
  classification: DataClassification;
  sensitivity?: DataClassification;
  owner: "user" | "system" | "admin";
  retentionMode: RetentionMode;
  retentionPeriod: string; // e.g. "until_user_deletion", "7_years", "90_days", "policy_not_configured"
  retentionPeriodDays?: number | null;
  userDeletionBehavior: UserDeletionBehavior;
  deletionBehavior?: UserDeletionBehavior;
  exportBehavior: ExportBehavior;
  legalHoldSupported: boolean;
  backupRequirement: BackupRequirement;
  recoveryPriority: RecoveryPriority;
  containsTaxpayerInfo: boolean;
  hasTaxpayerData?: boolean;
  containsSecurityInfo: boolean;
  cleanupEligibility?: string;
  statutoryBasis?: string;
}

export interface AccountDeletionPlanItem {
  dataset: DatasetKey;
  name: string;
  behavior: UserDeletionBehavior;
  reason: string;
  recordCount?: number;
}

export interface AccountDeletionPlan {
  userId: string;
  plannedAt: string;
  items: AccountDeletionPlanItem[];
  datasets: Record<string, UserDeletionBehavior>;
  summary: {
    purgeDatasets: number;
    retainDatasets: number;
    anonymizeDatasets: number;
  };
}

export type BackupStatus =
  | "NOT_CONFIGURED"
  | "HEALTHY"
  | "DEGRADED"
  | "FAILED"
  | "UNKNOWN"
  | "IN_PROGRESS";

export interface BackupStatusReport {
  provider: string;
  status: BackupStatus;
  isConfigured: boolean;
  lastSuccessfulBackupAt: string | null;
  lastAttemptAt: string | null;
  backupAgeMinutes: number | null;
  recoveryPoint: string | null; // ISO timestamp or null
  message: string;
  targetRpoMinutes: number;
  targetRtoMinutes: number;
}

export type RestoreVerificationStatus =
  | "NOT_RUN"
  | "PASSED"
  | "FAILED"
  | "BLOCKED"
  | "NOT_CONFIGURED";

export interface RestoreVerificationReport {
  verificationId: string;
  provider: string;
  status: RestoreVerificationStatus;
  startedAt: string;
  completedAt: string | null;
  lastRunAt?: string | null;
  checksPerformed: string[];
  errorCategory?: string;
  notes: string;
  requestId?: string;
}

export type IntegrityCheckSeverity = "INFO" | "WARNING" | "CRITICAL" | "ERROR";
export type IntegrityCheckStatus = "PASS" | "WARN" | "FAIL";

export interface IntegrityCheckResult {
  dataset: DatasetKey;
  check: string;
  status: IntegrityCheckStatus;
  count: number;
  severity: IntegrityCheckSeverity;
  description: string;
  message?: string;
  details?: Array<{ id: string; reason: string }>;
}

export interface IntegrityDiagnosticReport {
  runId: string;
  timestamp: string;
  totalChecks: number;
  passed: number;
  warnings: number;
  failures: number;
  overallStatus?: "HEALTHY" | "ATTENTION" | "CRITICAL";
  orphansDetected?: number;
  duplicatesDetected?: number;
  checks: IntegrityCheckResult[];
}

export interface LegalHoldRecord {
  id: string;
  dataset: DatasetKey;
  recordId: string;
  reason: string;
  createdBy: string;
  createdAt: string;
  isActive: boolean;
  releasedAt?: string | null;
  releasedBy?: string | null;
}

export interface RetentionPreviewResult {
  dataset: DatasetKey;
  eligibleCount: number;
  blockedByHold: number;
  blockedByLegalHoldCount?: number;
  blockedByPolicy: number;
  blockedByPolicyCount?: number;
  estimatedDeletions?: number;
  estimatedActions: {
    purge: number;
    anonymize: number;
    retain: number;
  };
}

export interface DataHealthSummary {
  timestamp: string;
  database: {
    status: "ok" | "degraded" | "not_configured" | "error";
    provider: string;
    message?: string;
  };
  backup: BackupStatusReport;
  restoreVerification: RestoreVerificationReport;
  integrity: {
    status: "HEALTHY" | "ATTENTION" | "CRITICAL";
    failedChecks: number;
    warningChecks: number;
    orphanCount: number;
    orphanRecordsCount?: number;
    duplicateCount: number;
    totalChecks?: number;
  };
  retention: {
    status: "HEALTHY" | "ATTENTION";
    totalDatasets: number;
    activeLegalHolds: number;
    eligibleCleanupRecords: number;
  };
  rpoRto: {
    targetRpoMinutes: number;
    configuredTargetRpoMinutes: number;
    targetRpoDescription: string;
    targetRtoMinutes: number;
    configuredTargetRtoMinutes: number;
    targetRtoDescription: string;
    actualLatestRecoveryPoint: string | null;
    actualRecoveryPoint?: string | null;
    recoveryPointStatus: "CONFIRMED" | "UNAVAILABLE";
  };
  schemaInventory: {
    migrationVersion: string;
    dataManagementVersion: string;
    platformConfigVersion: number;
  };
  datasetInventory: DatasetInventoryItem[];
}
