import { SUPABASE_CONFIG } from "@/lib/supabase/config";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import {
  PlatformConfigKey,
  PlatformConfigRecord,
  PlatformConfigCategory,
} from "@/types/platform-config";
import { OperationalError } from "@/lib/observability/errors";

interface ConfigDbRow {
  id: string;
  key: string;
  category: string;
  value_json: unknown;
  description: string;
  is_enabled: boolean;
  version: number;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Built-in production safe defaults.
 * INVARIANT: If persistence is down or unmigrated, these guaranteed defaults prevent system failure.
 */
export const DEFAULT_PLATFORM_CONFIGS: Record<
  PlatformConfigKey,
  {
    category: PlatformConfigCategory;
    value: unknown;
    description: string;
    isEnabled: boolean;
  }
> = {
  // Platform & Maintenance
  "platform.name": {
    category: "platform",
    value: "TaxAIHelp",
    description: "Application display name",
    isEnabled: true,
  },
  "platform.maintenance_mode": {
    category: "maintenance",
    value: false,
    description: "Suspends standard user traffic and shows maintenance notice",
    isEnabled: false,
  },
  "platform.maintenance_message": {
    category: "maintenance",
    value: "TaxAIHelp is temporarily undergoing scheduled maintenance. Please check back shortly.",
    description: "Public maintenance screen message",
    isEnabled: true,
  },
  "platform.maintenance_banner_enabled": {
    category: "maintenance",
    value: false,
    description: "Displays an informational banner without blocking site access",
    isEnabled: false,
  },

  // System Announcements
  "announcement.enabled": {
    category: "announcement",
    value: false,
    description: "Displays a site-wide broadcast announcement",
    isEnabled: false,
  },
  "announcement.message": {
    category: "announcement",
    value: "",
    description: "Announcement banner text",
    isEnabled: true,
  },
  "announcement.type": {
    category: "announcement",
    value: "info",
    description: "Visual banner type (info | warning | maintenance)",
    isEnabled: true,
  },

  // Authentication
  "auth.registration_enabled": {
    category: "auth",
    value: true,
    description: "Allows new taxpayers to create accounts",
    isEnabled: true,
  },
  "auth.new_user_signup_enabled": {
    category: "auth",
    value: true,
    description: "Controls signup flow accessibility",
    isEnabled: true,
  },
  "auth.password_reset_enabled": {
    category: "auth",
    value: true,
    description: "Allows users to request password recovery emails",
    isEnabled: true,
  },

  // Calculators
  "calculators.federal_income_enabled": {
    category: "calculators",
    value: true,
    description: "Enables Federal Income Tax Calculator",
    isEnabled: true,
  },
  "calculators.self_employed_enabled": {
    category: "calculators",
    value: true,
    description: "Enables Self-Employed Schedule C Tax Calculator",
    isEnabled: true,
  },
  "calculators.tax_1099_enabled": {
    category: "calculators",
    value: true,
    description: "Enables 1099 Contractor Tax Calculator",
    isEnabled: true,
  },
  "calculators.quarterly_enabled": {
    category: "calculators",
    value: true,
    description: "Enables Quarterly Estimated 1040-ES Tax Calculator",
    isEnabled: true,
  },

  // AI Assistant
  "ai.assistant_enabled": {
    category: "ai",
    value: true,
    description: "Enables AI conversational tax assistant queries",
    isEnabled: true,
  },
  "ai.daily_limit_enforcement_enabled": {
    category: "ai",
    value: true,
    description: "Enforces 10/day free and 100/day premium AI message quotas",
    isEnabled: true,
  },

  // Reports
  "reports.basic_reports_enabled": {
    category: "reports",
    value: true,
    description: "Enables on-screen calculation report generation",
    isEnabled: true,
  },
  "reports.premium_reports_enabled": {
    category: "reports",
    value: true,
    description: "Enables printable / exportable PDF-ready comprehensive summaries",
    isEnabled: true,
  },
  "reports.premium_enabled": {
    category: "reports",
    value: true,
    description: "Enables premium tax report features and export capabilities",
    isEnabled: true,
  },

  // Professionals
  "professionals.handoff_enabled": {
    category: "professionals",
    value: true,
    description: "Allows taxpayers to submit CPA / Enrolled Agent consultation inquiries",
    isEnabled: true,
  },
  "professionals.leads_enabled": {
    category: "professionals",
    value: true,
    description: "Allows routing leads to professional partners",
    isEnabled: true,
  },

  // Notifications
  "notifications.in_app_enabled": {
    category: "notifications",
    value: true,
    description: "Enables in-app notification center delivery",
    isEnabled: true,
  },
  "notifications.email_enabled": {
    category: "notifications",
    value: true,
    description: "Enables transactional email delivery when provider is configured",
    isEnabled: true,
  },

  // Billing
  "billing.enabled": {
    category: "billing",
    value: true,
    description: "Enables subscription plan management and checkout flows",
    isEnabled: true,
  },
  "billing.premium_checkout_enabled": {
    category: "billing",
    value: true,
    description: "Allows upgrading to Premium tier",
    isEnabled: true,
  },

  // Public Acquisition
  "acquisition.public_blog_enabled": {
    category: "acquisition",
    value: true,
    description: "Serves public tax blog posts",
    isEnabled: true,
  },
  "acquisition.public_tax_guides_enabled": {
    category: "acquisition",
    value: true,
    description: "Serves organic tax guides and reference hubs",
    isEnabled: true,
  },
  "acquisition.public_pricing_enabled": {
    category: "acquisition",
    value: true,
    description: "Displays public pricing page",
    isEnabled: true,
  },
  "acquisition.analytics_enabled": {
    category: "acquisition",
    value: true,
    description: "Enables privacy-first funnel event logging",
    isEnabled: true,
  },

  // Support & Feedback (Phase 5 Step 16)
  "support.enabled": {
    category: "support",
    value: true,
    description: "Master switch for user support center and ticket intake",
    isEnabled: true,
  },
  "support.user_ticket_creation_enabled": {
    category: "support",
    value: true,
    description: "Allows authenticated users to submit new support tickets",
    isEnabled: true,
  },
  "support.feedback_enabled": {
    category: "support",
    value: true,
    description: "Enables user feedback and rating collection",
    isEnabled: true,
  },
  "support.feature_requests_enabled": {
    category: "support",
    value: true,
    description: "Enables product feature request intake",
    isEnabled: true,
  },

  // Data Management & Recovery (Phase 5 Step 17)
  "data.backup_monitoring_enabled": {
    category: "data",
    value: true,
    description: "Enables backup health and readiness telemetry collection",
    isEnabled: true,
  },
  "data.integrity_checks_enabled": {
    category: "data",
    value: true,
    description: "Enables non-destructive cross-entity relational integrity checks",
    isEnabled: true,
  },
  "data.retention_monitoring_enabled": {
    category: "data",
    value: true,
    description: "Enables policy expiration and legal hold monitoring",
    isEnabled: true,
  },

  // Security
  "security.login_rate_limit_enabled": {
    category: "security",
    value: true,
    description: "Enforces rate limiting on authentication attempts",
    isEnabled: true,
  },
  "security.ai_rate_limit_enabled": {
    category: "security",
    value: true,
    description: "Enforces sliding-window rate limiting on AI requests",
    isEnabled: true,
  },
  "security.recovery_rate_limit_enabled": {
    category: "security",
    value: true,
    description: "Enforces rate limiting on password recovery submissions",
    isEnabled: true,
  },
};

declare global {
  // eslint-disable-next-line no-var
  var __platformConfigStore: Map<PlatformConfigKey, PlatformConfigRecord> | undefined;
}

function getMemoryStore(): Map<PlatformConfigKey, PlatformConfigRecord> {
  if (!globalThis.__platformConfigStore) {
    globalThis.__platformConfigStore = new Map<PlatformConfigKey, PlatformConfigRecord>();
    // Seed defaults into memory
    const now = new Date().toISOString();
    for (const [k, def] of Object.entries(DEFAULT_PLATFORM_CONFIGS)) {
      const key = k as PlatformConfigKey;
      globalThis.__platformConfigStore.set(key, {
        key,
        category: def.category,
        value: def.value,
        description: def.description,
        isEnabled: def.isEnabled,
        version: 1,
        updatedBy: "system:seed",
        updatedAt: now,
        createdAt: now,
      });
    }
  }
  return globalThis.__platformConfigStore;
}

export class PlatformConfigStore {
  /**
   * Retrieves all configuration records.
   */
  public static async getAll(): Promise<PlatformConfigRecord[]> {
    if (SUPABASE_CONFIG.isConfigured()) {
      try {
        const supabase = getServerSupabaseClient() as unknown as {
          from: (table: string) => {
            select: (cols: string) => Promise<{
              data: ConfigDbRow[] | null;
              error: { message: string } | null;
            }>;
          };
        };

        const res = await supabase.from("platform_configurations").select("*");
        if (res.data && !res.error && res.data.length > 0) {
          return res.data.map((row) => ({
            key: row.key as PlatformConfigKey,
            category: row.category as PlatformConfigCategory,
            value: row.value_json,
            description: row.description,
            isEnabled: row.is_enabled,
            version: row.version,
            updatedBy: row.updated_by || "system",
            updatedAt: row.updated_at,
            createdAt: row.created_at,
          }));
        }
      } catch (_err) {
        // Fall back to memory store
      }
    }

    const memStore = getMemoryStore();
    return Array.from(memStore.values());
  }

  /**
   * Retrieves single configuration record by key.
   */
  public static async get(key: PlatformConfigKey): Promise<PlatformConfigRecord> {
    if (SUPABASE_CONFIG.isConfigured()) {
      try {
        const supabase = getServerSupabaseClient() as unknown as {
          from: (table: string) => {
            select: (cols: string) => {
              eq: (col: string, val: string) => {
                maybeSingle: () => Promise<{
                  data: ConfigDbRow | null;
                  error: { message: string } | null;
                }>;
              };
            };
          };
        };

        const res = await supabase
          .from("platform_configurations")
          .select("*")
          .eq("key", key)
          .maybeSingle();

        if (res.data && !res.error) {
          return {
            key: res.data.key as PlatformConfigKey,
            category: res.data.category as PlatformConfigCategory,
            value: res.data.value_json,
            description: res.data.description,
            isEnabled: res.data.is_enabled,
            version: res.data.version,
            updatedBy: res.data.updated_by || "system",
            updatedAt: res.data.updated_at,
            createdAt: res.data.created_at,
          };
        }
      } catch (_err) {
        // Fall back to memory store
      }
    }

    const memStore = getMemoryStore();
    const item = memStore.get(key);
    if (item) {
      return item;
    }

    // Return safe default if not found
    const def = DEFAULT_PLATFORM_CONFIGS[key];
    const now = new Date().toISOString();
    const fallbackRecord: PlatformConfigRecord = {
      key,
      category: def.category,
      value: def.value,
      description: def.description,
      isEnabled: def.isEnabled,
      version: 1,
      updatedBy: "system:fallback",
      updatedAt: now,
      createdAt: now,
    };
    memStore.set(key, fallbackRecord);
    return fallbackRecord;
  }

  /**
   * Updates a configuration record with optimistic concurrency protection.
   *
   * @param adminUserId The authenticated admin ID performing the change.
   * @param key The configuration key.
   * @param value The new typed value.
   * @param expectedVersion If supplied, rejects update if current version does not match.
   */
  public static async update(
    adminUserId: string,
    key: PlatformConfigKey,
    value: unknown,
    expectedVersion?: number
  ): Promise<PlatformConfigRecord> {
    const current = await this.get(key);

    // 1. Optimistic Concurrency Check
    if (expectedVersion !== undefined && current.version !== expectedVersion) {
      throw new OperationalError(
        `Configuration concurrency conflict for '${key}'. Expected version ${expectedVersion}, but current version is ${current.version}. Please refresh and review latest settings.`,
        409,
        "CONFIGURATION_CONFLICT_ERROR",
        "CONFIGURATION_ERROR"
      );
    }

    const nextVersion = current.version + 1;
    const now = new Date().toISOString();

    const updatedRecord: PlatformConfigRecord = {
      ...current,
      value,
      // For boolean flags, sync isEnabled with boolean value
      isEnabled: typeof value === "boolean" ? value : current.isEnabled,
      version: nextVersion,
      updatedBy: adminUserId,
      updatedAt: now,
    };

    if (SUPABASE_CONFIG.isConfigured()) {
      try {
        const supabase = getServerSupabaseClient() as unknown as {
          from: (table: string) => {
            upsert: (row: Record<string, unknown>) => Promise<{
              error: { message: string } | null;
            }>;
          };
        };

        await supabase.from("platform_configurations").upsert({
          key,
          category: updatedRecord.category,
          value_json: value,
          description: updatedRecord.description,
          is_enabled: updatedRecord.isEnabled,
          version: nextVersion,
          updated_by: adminUserId,
          updated_at: now,
        });
      } catch (_err) {
        // Fall back to memory store
      }
    }

    getMemoryStore().set(key, updatedRecord);
    return updatedRecord;
  }

  /**
   * Sets a configuration value in the active store.
   */
  public static set(
    key: PlatformConfigKey | string,
    value: unknown,
    updatedBy = "system"
  ): PlatformConfigRecord {
    const memStore = getMemoryStore();
    const current = memStore.get(key as PlatformConfigKey);
    const now = new Date().toISOString();
    const nextVersion = (current?.version ?? 0) + 1;
    const category = (current?.category ?? (key.split(".")[0] || "platform")) as PlatformConfigCategory;

    const record: PlatformConfigRecord = {
      key: key as PlatformConfigKey,
      category,
      value,
      description: current?.description || `Runtime configuration for ${key}`,
      isEnabled: typeof value === "boolean" ? value : (current?.isEnabled ?? true),
      version: nextVersion,
      updatedBy,
      updatedAt: now,
      createdAt: current?.createdAt || now,
    };

    memStore.set(key as PlatformConfigKey, record);

    if (SUPABASE_CONFIG.isConfigured()) {
      try {
        const supabase = getServerSupabaseClient() as unknown as {
          from: (table: string) => {
            upsert: (row: Record<string, unknown>) => Promise<{
              error: { message: string } | null;
            }>;
          };
        };
        supabase.from("platform_configurations").upsert({
          key,
          category: record.category,
          value_json: value,
          description: record.description,
          is_enabled: record.isEnabled,
          version: nextVersion,
          updated_by: updatedBy,
          updated_at: now,
        }).catch(() => {});
      } catch (_err) {
        // Fall back to memory store
      }
    }

    return record;
  }

  /**
   * Synchronously reads a boolean configuration value from the memory store.
   */
  public static getBoolean(key: PlatformConfigKey | string, fallback = false): boolean {
    const memStore = getMemoryStore();
    const item = memStore.get(key as PlatformConfigKey);
    if (!item) {
      const def = DEFAULT_PLATFORM_CONFIGS[key as PlatformConfigKey];
      if (def !== undefined) {
        return typeof def.value === "boolean" ? def.value : fallback;
      }
      return fallback;
    }
    if (typeof item.value === "boolean") {
      return item.value;
    }
    return Boolean(item.value);
  }

  /**
   * Synchronously reads a string configuration value from the memory store.
   */
  public static getString(key: PlatformConfigKey | string, fallback = ""): string {
    const memStore = getMemoryStore();
    const item = memStore.get(key as PlatformConfigKey);
    if (!item) {
      const def = DEFAULT_PLATFORM_CONFIGS[key as PlatformConfigKey];
      return typeof def?.value === "string" ? def.value : fallback;
    }
    return typeof item.value === "string" ? item.value : fallback;
  }

  /**
   * Checks whether a configuration key exists in the active configuration map.
   */
  public static hasKey(key: string): boolean {
    const memStore = getMemoryStore();
    if (memStore.has(key as PlatformConfigKey)) {
      return true;
    }
    return key in DEFAULT_PLATFORM_CONFIGS;
  }

  /**
   * Resets memory store to initial defaults (used in test teardown).
   */
  public static clear(): void {
    if (globalThis.__platformConfigStore) {
      globalThis.__platformConfigStore.clear();
      // Re-seed defaults
      const now = new Date().toISOString();
      for (const [k, def] of Object.entries(DEFAULT_PLATFORM_CONFIGS)) {
        const key = k as PlatformConfigKey;
        globalThis.__platformConfigStore.set(key, {
          key,
          category: def.category,
          value: def.value,
          description: def.description,
          isEnabled: def.isEnabled,
          version: 1,
          updatedBy: "system:seed",
          updatedAt: now,
          createdAt: now,
        });
      }
    }
  }
}
