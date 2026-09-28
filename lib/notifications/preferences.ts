import { SUPABASE_CONFIG } from "@/lib/supabase/config";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { NotificationPreferences, NotificationCategory } from "./types";

interface PreferencesDbRow {
  id: string;
  user_id: string;
  security_enabled: boolean;
  account_enabled: boolean;
  tax_reports_enabled: boolean;
  calculations_enabled: boolean;
  ai_usage_enabled: boolean;
  billing_enabled: boolean;
  professional_handoff_enabled: boolean;
  product_updates_enabled: boolean;
  marketing_enabled: boolean;
  created_at: string;
  updated_at: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __notificationPreferencesStore: Map<string, NotificationPreferences> | undefined;
}

function getMemoryStore(): Map<string, NotificationPreferences> {
  if (!globalThis.__notificationPreferencesStore) {
    globalThis.__notificationPreferencesStore = new Map<string, NotificationPreferences>();
  }
  return globalThis.__notificationPreferencesStore;
}

export class NotificationPreferencesStore {
  /**
   * Default preferences generated for any newly registered or unconfigured user.
   */
  public static getDefaultPreferences(userId: string): NotificationPreferences {
    return {
      userId,
      securityEnabled: true, // Permanent invariant
      accountEnabled: true, // Permanent invariant
      taxReportsEnabled: true,
      calculationsEnabled: true,
      aiUsageEnabled: true,
      billingEnabled: true,
      professionalHandoffEnabled: true,
      productUpdatesEnabled: false,
      marketingEnabled: false,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Retrieves notification preferences for a user.
   */
  public static async getPreferences(userId: string): Promise<NotificationPreferences> {
    if (SUPABASE_CONFIG.isConfigured()) {
      try {
        const supabase = getServerSupabaseClient() as unknown as {
          from: (table: string) => {
            select: (cols: string) => {
              eq: (col: string, val: string) => {
                maybeSingle: () => Promise<{
                  data: PreferencesDbRow | null;
                  error: { message: string } | null;
                }>;
              };
            };
          };
        };

        const { data, error } = await supabase
          .from("notification_preferences")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (data && !error) {
          return {
            userId: data.user_id,
            securityEnabled: true, // Invariant
            accountEnabled: true, // Invariant
            taxReportsEnabled: data.tax_reports_enabled,
            calculationsEnabled: data.calculations_enabled,
            aiUsageEnabled: data.ai_usage_enabled,
            billingEnabled: data.billing_enabled,
            professionalHandoffEnabled: data.professional_handoff_enabled,
            productUpdatesEnabled: data.product_updates_enabled,
            marketingEnabled: data.marketing_enabled,
            updatedAt: data.updated_at,
          };
        }
      } catch (_err) {
        // Fall back to memory store
      }
    }

    const memStore = getMemoryStore();
    const existing = memStore.get(userId);
    if (existing) {
      return { ...existing, securityEnabled: true, accountEnabled: true };
    }

    const defaults = this.getDefaultPreferences(userId);
    memStore.set(userId, defaults);
    return defaults;
  }

  /**
   * Updates notification preferences.
   * SECURITY ENFORCEMENT: securityEnabled and accountEnabled CANNOT be set to false.
   */
  public static async updatePreferences(
    userId: string,
    updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const current = await this.getPreferences(userId);

    const merged: NotificationPreferences = {
      ...current,
      ...updates,
      userId,
      securityEnabled: true, // Non-negotiable security invariant
      accountEnabled: true, // Non-negotiable account lifecycle invariant
      updatedAt: new Date().toISOString(),
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

        await supabase.from("notification_preferences").upsert({
          user_id: userId,
          security_enabled: true,
          account_enabled: true,
          tax_reports_enabled: merged.taxReportsEnabled,
          calculations_enabled: merged.calculationsEnabled,
          ai_usage_enabled: merged.aiUsageEnabled,
          billing_enabled: merged.billingEnabled,
          professional_handoff_enabled: merged.professionalHandoffEnabled,
          product_updates_enabled: merged.productUpdatesEnabled,
          marketing_enabled: merged.marketingEnabled,
          updated_at: merged.updatedAt,
        });
      } catch (_err) {
        // Fallback to memory
      }
    }

    getMemoryStore().set(userId, merged);
    return merged;
  }

  /**
   * Evaluates if a given category of notification is allowed to be dispatched to the user.
   */
  public static async canSend(userId: string, category: NotificationCategory): Promise<boolean> {
    // Critical security and authentication notices can NEVER be suppressed
    if (category === "authentication" || category === "system") {
      return true;
    }

    const prefs = await this.getPreferences(userId);

    switch (category) {
      case "calculations":
        return prefs.calculationsEnabled || prefs.taxReportsEnabled;
      case "ai":
        return prefs.aiUsageEnabled;
      case "billing":
        return prefs.billingEnabled;
      case "professional":
        return prefs.professionalHandoffEnabled;
      default:
        return true;
    }
  }

  /**
   * Purges user preferences upon account deletion.
   */
  public static async purge(userId: string): Promise<void> {
    getMemoryStore().delete(userId);
  }

  /**
   * Clears memory store for test resets.
   */
  public static clear(): void {
    getMemoryStore().clear();
  }
}
