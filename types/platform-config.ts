/**
 * Platform Configuration & Feature Flag Types (Phase 5 Step 15)
 * Strongly typed model for centralized operational control.
 */

export type PlatformConfigCategory =
  | "platform"
  | "auth"
  | "calculators"
  | "ai"
  | "reports"
  | "professionals"
  | "notifications"
  | "billing"
  | "acquisition"
  | "security"
  | "maintenance"
  | "announcement"
  | "support"
  | "data";

export type AnnouncementType = "info" | "warning" | "maintenance";

/**
 * Explicit allowlist of configuration keys.
 * CRITICAL RULE: Tax brackets, deduction values, and tax engine formulas are NOT in this list.
 */
export const ALLOWED_CONFIG_KEYS = [
  // Platform & Maintenance
  "platform.name",
  "platform.maintenance_mode",
  "platform.maintenance_message",
  "platform.maintenance_banner_enabled",

  // System Announcement
  "announcement.enabled",
  "announcement.message",
  "announcement.type",

  // Authentication & Registration
  "auth.registration_enabled",
  "auth.new_user_signup_enabled",
  "auth.password_reset_enabled",

  // Calculators
  "calculators.federal_income_enabled",
  "calculators.self_employed_enabled",
  "calculators.tax_1099_enabled",
  "calculators.quarterly_enabled",

  // AI Assistant
  "ai.assistant_enabled",
  "ai.daily_limit_enforcement_enabled",

  // Reports
  "reports.basic_reports_enabled",
  "reports.premium_reports_enabled",
  "reports.premium_enabled",

  // Professionals
  "professionals.handoff_enabled",
  "professionals.leads_enabled",

  // Notifications
  "notifications.in_app_enabled",
  "notifications.email_enabled",

  // Billing
  "billing.enabled",
  "billing.premium_checkout_enabled",

  // Support & Feedback (Phase 5 Step 16)
  "support.enabled",
  "support.user_ticket_creation_enabled",
  "support.feedback_enabled",
  "support.feature_requests_enabled",

  // Data Management & Recovery (Phase 5 Step 17)
  "data.backup_monitoring_enabled",
  "data.integrity_checks_enabled",
  "data.retention_monitoring_enabled",

  // Public Acquisition & SEO
  "acquisition.public_blog_enabled",
  "acquisition.public_tax_guides_enabled",
  "acquisition.public_pricing_enabled",
  "acquisition.analytics_enabled",

  // Security & Throttling
  "security.login_rate_limit_enabled",
  "security.ai_rate_limit_enabled",
  "security.recovery_rate_limit_enabled",
] as const;

export type PlatformConfigKey = (typeof ALLOWED_CONFIG_KEYS)[number];

/**
 * Stored configuration record.
 */
export interface PlatformConfigRecord<T = unknown> {
  key: PlatformConfigKey;
  category: PlatformConfigCategory;
  value: T;
  description: string;
  isEnabled: boolean;
  version: number;
  updatedBy: string; // admin user ID or 'system'
  updatedAt: string; // ISO timestamp
  createdAt: string;
}

/**
 * Public-facing safe configuration.
 * Strictly excludes admin-only keys, database details, and internal thresholds.
 */
export interface PublicPlatformConfig {
  platformName: string;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  maintenanceBannerEnabled: boolean;
  announcement: {
    enabled: boolean;
    message?: string;
    type: AnnouncementType;
  };
  features: {
    registrationEnabled: boolean;
    publicBlogEnabled: boolean;
    publicTaxGuidesEnabled: boolean;
    publicPricingEnabled: boolean;
    aiAssistantEnabled: boolean;
    calculatorsEnabled: boolean;
  };
  timestamp: string;
}

/**
 * Dangerous operations that require explicit administrative confirmation.
 */
export const DANGEROUS_CONFIG_KEYS: PlatformConfigKey[] = [
  "platform.maintenance_mode",
  "auth.registration_enabled",
  "auth.new_user_signup_enabled",
  "ai.assistant_enabled",
  "billing.enabled",
  "reports.premium_reports_enabled",
  "notifications.in_app_enabled",
  "notifications.email_enabled",
  "professionals.handoff_enabled",
  "support.enabled",
];
