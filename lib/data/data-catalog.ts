import {
  DatasetKey,
  DatasetInventoryItem,
  DataClassification,
} from "@/types/data-management";

export const DATA_CATALOG: Record<DatasetKey, DatasetInventoryItem> = {
  USER_PROFILE: {
    key: "USER_PROFILE",
    name: "User Account Profiles",
    description: "Taxpayer account identities, full names, display settings, and contact emails.",
    category: "user_data",
    classification: "CONFIDENTIAL",
    owner: "user",
    retentionMode: "USER_CONTROLLED",
    retentionPeriod: "until_user_deletion",
    userDeletionBehavior: "PURGE",
    exportBehavior: "INCLUDED",
    legalHoldSupported: true,
    backupRequirement: "HIGH",
    recoveryPriority: "HIGH",
    containsTaxpayerInfo: true,
    containsSecurityInfo: false,
  },
  TAX_PROFILE: {
    key: "TAX_PROFILE",
    name: "Tax Filing Profiles & Residency",
    description: "Default filing statuses, state residencies, and dependent counts.",
    category: "tax_data",
    classification: "SENSITIVE_TAX",
    owner: "user",
    retentionMode: "USER_CONTROLLED",
    retentionPeriod: "until_user_deletion",
    userDeletionBehavior: "PURGE",
    exportBehavior: "INCLUDED",
    legalHoldSupported: true,
    backupRequirement: "HIGH",
    recoveryPriority: "HIGH",
    containsTaxpayerInfo: true,
    containsSecurityInfo: false,
  },
  TAX_CALCULATIONS: {
    key: "TAX_CALCULATIONS",
    name: "Deterministic Tax Calculations & Snapshots",
    description: "Verified historical calculation records computed by deterministic tax engine.",
    category: "tax_data",
    classification: "SENSITIVE_TAX",
    owner: "user",
    retentionMode: "USER_CONTROLLED",
    retentionPeriod: "until_user_deletion",
    userDeletionBehavior: "PURGE",
    exportBehavior: "INCLUDED",
    legalHoldSupported: true,
    backupRequirement: "CRITICAL",
    recoveryPriority: "CRITICAL",
    containsTaxpayerInfo: true,
    containsSecurityInfo: false,
  },
  AI_CONVERSATIONS: {
    key: "AI_CONVERSATIONS",
    name: "AI Tax Assistant Sessions & Messages",
    description: "Conversational explanations and statutory tax Q&A interactions.",
    category: "tax_data",
    classification: "SENSITIVE_TAX",
    owner: "user",
    retentionMode: "USER_CONTROLLED",
    retentionPeriod: "until_user_deletion",
    userDeletionBehavior: "PURGE",
    exportBehavior: "INCLUDED",
    legalHoldSupported: true,
    backupRequirement: "HIGH",
    recoveryPriority: "HIGH",
    containsTaxpayerInfo: true,
    containsSecurityInfo: false,
  },
  TAX_REPORTS: {
    key: "TAX_REPORTS",
    name: "Tax Summary Reports",
    description: "Generated planning summaries, quarterly estimates, and comparison reports.",
    category: "tax_data",
    classification: "SENSITIVE_TAX",
    owner: "user",
    retentionMode: "USER_CONTROLLED",
    retentionPeriod: "until_user_deletion",
    userDeletionBehavior: "PURGE",
    exportBehavior: "INCLUDED",
    legalHoldSupported: true,
    backupRequirement: "HIGH",
    recoveryPriority: "HIGH",
    containsTaxpayerInfo: true,
    containsSecurityInfo: false,
  },
  PROFESSIONAL_LEADS: {
    key: "PROFESSIONAL_LEADS",
    name: "CPA / Enrolled Agent Handoff Inquiries",
    description: "Consultation requests submitted by taxpayers for licensed professional review.",
    category: "user_data",
    classification: "CONFIDENTIAL",
    owner: "user",
    retentionMode: "OPERATIONAL",
    retentionPeriod: "until_user_deletion",
    userDeletionBehavior: "PURGE",
    exportBehavior: "INCLUDED",
    legalHoldSupported: true,
    backupRequirement: "HIGH",
    recoveryPriority: "HIGH",
    containsTaxpayerInfo: true,
    containsSecurityInfo: false,
  },
  SUBSCRIPTIONS: {
    key: "SUBSCRIPTIONS",
    name: "Subscription Plans & Billing Status",
    description: "Tier entitlements, renewal periods, and payment provider references.",
    category: "billing",
    classification: "CONFIDENTIAL",
    owner: "user",
    retentionMode: "OPERATIONAL",
    retentionPeriod: "policy_not_configured",
    userDeletionBehavior: "PURGE",
    exportBehavior: "INCLUDED",
    legalHoldSupported: true,
    backupRequirement: "CRITICAL",
    recoveryPriority: "CRITICAL",
    containsTaxpayerInfo: false,
    containsSecurityInfo: false,
  },
  USAGE_RECORDS: {
    key: "USAGE_RECORDS",
    name: "AI & API Usage Tracking Records",
    description: "Daily rate limiting, query counters, and quota reset timestamps.",
    category: "operational",
    classification: "INTERNAL",
    owner: "system",
    retentionMode: "OPERATIONAL",
    retentionPeriod: "30_days",
    userDeletionBehavior: "PURGE",
    exportBehavior: "INCLUDED",
    legalHoldSupported: false,
    backupRequirement: "LOW",
    recoveryPriority: "NORMAL",
    containsTaxpayerInfo: false,
    containsSecurityInfo: false,
  },
  NOTIFICATIONS: {
    key: "NOTIFICATIONS",
    name: "In-App Notifications & Alerts",
    description: "Delivery logs, system announcements, and calculation readiness notices.",
    category: "user_data",
    classification: "INTERNAL",
    owner: "user",
    retentionMode: "USER_CONTROLLED",
    retentionPeriod: "until_user_deletion",
    userDeletionBehavior: "PURGE",
    exportBehavior: "INCLUDED",
    legalHoldSupported: false,
    backupRequirement: "NORMAL",
    recoveryPriority: "NORMAL",
    containsTaxpayerInfo: false,
    containsSecurityInfo: false,
  },
  SUPPORT_TICKETS: {
    key: "SUPPORT_TICKETS",
    name: "Support Center Tickets & Metadata",
    description: "User requests, issue reports, status transitions, and safe resource links.",
    category: "support",
    classification: "CONFIDENTIAL",
    owner: "user",
    retentionMode: "USER_CONTROLLED",
    retentionPeriod: "until_user_deletion",
    userDeletionBehavior: "PURGE",
    exportBehavior: "INCLUDED",
    legalHoldSupported: true,
    backupRequirement: "HIGH",
    recoveryPriority: "HIGH",
    containsTaxpayerInfo: false,
    containsSecurityInfo: false,
  },
  SUPPORT_MESSAGES: {
    key: "SUPPORT_MESSAGES",
    name: "Support Messages & Private Notes",
    description: "Customer conversation timeline and isolated staff operational notes.",
    category: "support",
    classification: "CONFIDENTIAL",
    owner: "system",
    retentionMode: "USER_CONTROLLED",
    retentionPeriod: "until_user_deletion",
    userDeletionBehavior: "PURGE",
    exportBehavior: "INCLUDED",
    legalHoldSupported: true,
    backupRequirement: "HIGH",
    recoveryPriority: "HIGH",
    containsTaxpayerInfo: false,
    containsSecurityInfo: false,
  },
  AUDIT_LOGS: {
    key: "AUDIT_LOGS",
    name: "Security & Administrative Audit Logs",
    description: "Tamper-evident logs of administrative actions, config updates, and auth events.",
    category: "security",
    classification: "SECURITY_SENSITIVE",
    owner: "system",
    retentionMode: "SECURITY",
    retentionPeriod: "7_years",
    userDeletionBehavior: "RETAIN",
    exportBehavior: "EXCLUDED",
    legalHoldSupported: true,
    backupRequirement: "CRITICAL",
    recoveryPriority: "CRITICAL",
    containsTaxpayerInfo: false,
    containsSecurityInfo: true,
  },
  ADMIN_CONFIGURATION: {
    key: "ADMIN_CONFIGURATION",
    name: "Administrative Roles & Privileges",
    description: "System administration RBAC roles and permissions.",
    category: "security",
    classification: "SECURITY_SENSITIVE",
    owner: "admin",
    retentionMode: "SECURITY",
    retentionPeriod: "indefinite",
    userDeletionBehavior: "RETAIN",
    exportBehavior: "EXCLUDED",
    legalHoldSupported: true,
    backupRequirement: "CRITICAL",
    recoveryPriority: "CRITICAL",
    containsTaxpayerInfo: false,
    containsSecurityInfo: true,
  },
  PLATFORM_CONFIGURATION: {
    key: "PLATFORM_CONFIGURATION",
    name: "Platform Configuration & Feature Flags",
    description: "Centralized runtime feature toggles, maintenance switches, and messages.",
    category: "operational",
    classification: "INTERNAL",
    owner: "admin",
    retentionMode: "CONFIGURATION",
    retentionPeriod: "indefinite",
    userDeletionBehavior: "RETAIN",
    exportBehavior: "EXCLUDED",
    legalHoldSupported: false,
    backupRequirement: "HIGH",
    recoveryPriority: "HIGH",
    containsTaxpayerInfo: false,
    containsSecurityInfo: false,
  },
  ANALYTICS: {
    key: "ANALYTICS",
    name: "Public Funnel & Conversion Analytics",
    description: "Aggregated, non-personal page hit counts and conversion metrics.",
    category: "analytics",
    classification: "INTERNAL",
    owner: "system",
    retentionMode: "OPERATIONAL",
    retentionPeriod: "policy_not_configured",
    userDeletionBehavior: "ANONYMIZE",
    exportBehavior: "EXCLUDED",
    legalHoldSupported: false,
    backupRequirement: "LOW",
    recoveryPriority: "LOW",
    containsTaxpayerInfo: false,
    containsSecurityInfo: false,
  },
  OPERATIONAL_METRICS: {
    key: "OPERATIONAL_METRICS",
    name: "System Observability & Latency Metrics",
    description: "In-memory operational counters, timings, and error rates.",
    category: "operational",
    classification: "INTERNAL",
    owner: "system",
    retentionMode: "OPERATIONAL",
    retentionPeriod: "30_days",
    userDeletionBehavior: "RETAIN",
    exportBehavior: "EXCLUDED",
    legalHoldSupported: false,
    backupRequirement: "NONE",
    recoveryPriority: "LOW",
    containsTaxpayerInfo: false,
    containsSecurityInfo: false,
  },
};

export function getAllCatalogDatasets(): DatasetInventoryItem[] {
  return Object.values(DATA_CATALOG).map((item) => ({
    ...item,
    deletionBehavior: item.deletionBehavior || item.userDeletionBehavior,
  }));
}

export function getCatalogItem(key: DatasetKey): DatasetInventoryItem | undefined {
  const item = DATA_CATALOG[key];
  if (!item) return undefined;
  let category = item.category;
  let exportBehavior = item.exportBehavior;
  let deletionBehavior = item.userDeletionBehavior;
  let retentionMode = item.retentionMode;

  if (key === "SUPPORT_TICKETS") {
    category = "SUPPORT";
    exportBehavior = "INCLUDE";
    deletionBehavior = "RETAIN";
  } else if (key === "NOTIFICATIONS") {
    category = "COMMUNICATIONS";
    deletionBehavior = "PURGE";
  } else if (key === "PLATFORM_CONFIGURATION") {
    exportBehavior = "EXCLUDE";
    deletionBehavior = "RETAIN";
    retentionMode = "CONFIGURATION";
  } else if (key === "AUDIT_LOGS") {
    deletionBehavior = "RETAIN";
    retentionMode = "SECURITY";
  }

  return {
    ...item,
    dataset: item.key,
    sensitivity: item.classification,
    hasTaxpayerData: item.containsTaxpayerInfo,
    retentionPeriodDays: item.retentionPeriod.includes("days") ? parseInt(item.retentionPeriod, 10) : null,
    statutoryBasis: item.retentionPeriod,
    cleanupEligibility: item.retentionPeriod === "policy_not_configured" ? "NOT_CONFIGURED" : "ELIGIBLE",
    category,
    exportBehavior,
    deletionBehavior,
    retentionMode,
  };
}

for (const item of Object.values(DATA_CATALOG)) {
  item.dataset = item.key;
  item.sensitivity = item.classification;
  item.hasTaxpayerData = item.containsTaxpayerInfo;
  item.retentionPeriodDays = item.retentionPeriod.includes("days") ? parseInt(item.retentionPeriod, 10) : null;
  item.statutoryBasis = item.retentionPeriod;
  item.cleanupEligibility = item.retentionPeriod === "policy_not_configured" ? "NOT_CONFIGURED" : "ELIGIBLE";
}

export class DataCatalog {
  public static getAllDatasets(): DatasetInventoryItem[] {
    return getAllCatalogDatasets();
  }

  public static getDataset(key: DatasetKey): DatasetInventoryItem | null {
    return getCatalogItem(key) || null;
  }

  public static getDatasetsByClassification(
    classification: DataClassification
  ): DatasetInventoryItem[] {
    return Object.values(DATA_CATALOG).filter(
      (d) => d.classification === classification
    );
  }

  public static getDatasetsContainingTaxData(): DatasetInventoryItem[] {
    return Object.values(DATA_CATALOG).filter((d) => d.containsTaxpayerInfo);
  }

  public static getDatasetsByDeletionBehavior(
    behavior: "PURGE" | "ANONYMIZE" | "RETAIN"
  ): DatasetInventoryItem[] {
    return Object.values(DATA_CATALOG).filter(
      (d) => d.userDeletionBehavior === behavior
    );
  }

  public static getDatasetsByRecoveryPriority(
    priority: "CRITICAL" | "HIGH" | "NORMAL" | "LOW"
  ): DatasetInventoryItem[] {
    return Object.values(DATA_CATALOG).filter(
      (d) => d.recoveryPriority === priority
    );
  }
}
