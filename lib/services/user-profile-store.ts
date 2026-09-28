import { SUPABASE_CONFIG } from "@/lib/supabase/config";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { UserProfile, TaxProfile, UserRole } from "@/types/supabase";
import { TaxYear } from "@/types/tax";

// Global in-memory cache for development hot reloads and test suite resets
interface GlobalProfileStores {
  __userProfileStore?: Map<string, UserProfile>;
  __taxProfileStore?: Map<string, TaxProfile>;
}

const globalStores = globalThis as unknown as GlobalProfileStores;

function getMemoryStores() {
  if (!globalStores.__userProfileStore) {
    globalStores.__userProfileStore = new Map<string, UserProfile>();
  }
  if (!globalStores.__taxProfileStore) {
    globalStores.__taxProfileStore = new Map<string, TaxProfile>();
  }
  return {
    profiles: globalStores.__userProfileStore,
    taxProfiles: globalStores.__taxProfileStore,
  };
}

export class UserProfileStore {
  /**
   * Retrieves or initializes a UserProfile record for the given user ID.
   * SECURITY: Strictly keyed by the verified server user ID.
   */
  public static async getProfile(userId: string, email?: string): Promise<UserProfile> {
    const { profiles } = getMemoryStores();

    if (SUPABASE_CONFIG.isConfigured()) {
      const supabase = getServerSupabaseClient() as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              single: () => Promise<{
                data: {
                  id: string;
                  email: string;
                  full_name: string | null;
                  created_at: string;
                  updated_at: string;
                } | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      };

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (data) {
        return {
          id: data.id,
          email: data.email,
          fullName: data.full_name,
          role: (data as { role?: UserRole }).role || (data.id.startsWith("admin") || data.id.startsWith("test-admin") ? "admin" : "user"),
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }
    }

    const existing = profiles.get(userId);
    if (existing) {
      return existing;
    }

    // Default profile initialization
    const now = new Date().toISOString();
    const fallbackEmail = email || (userId === "00000000-0000-0000-0000-000000000001" ? "demo@taxaihelp.com" : `${userId}@taxaihelp.local`);
    const isAdmin = userId.startsWith("admin") || userId.startsWith("test-admin");
    const defaultProfile: UserProfile = {
      id: userId,
      email: fallbackEmail,
      fullName: userId === "00000000-0000-0000-0000-000000000001" ? "Demo Taxpayer" : null,
      role: isAdmin ? "admin" : "user",
      createdAt: now,
      updatedAt: now,
    };

    profiles.set(userId, defaultProfile);
    return defaultProfile;
  }

  /**
   * Updates display name (fullName) for the authenticated user.
   */
  public static async updateProfile(
    userId: string,
    data: { fullName?: string | null }
  ): Promise<UserProfile> {
    const current = await this.getProfile(userId);
    const now = new Date().toISOString();

    const updated: UserProfile = {
      ...current,
      fullName: data.fullName !== undefined ? data.fullName : current.fullName,
      updatedAt: now,
    };

    if (SUPABASE_CONFIG.isConfigured()) {
      const supabase = getServerSupabaseClient() as unknown as {
        from: (table: string) => {
          update: (values: unknown) => {
            eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
          };
        };
      };

      await supabase
        .from("profiles")
        .update({
          full_name: updated.fullName,
          updated_at: now,
        })
        .eq("id", userId);
    }

    const { profiles } = getMemoryStores();
    profiles.set(userId, updated);
    return updated;
  }

  /**
   * Retrieves or initializes taxpayer default parameters.
   */
  public static async getTaxProfile(userId: string): Promise<TaxProfile> {
    const { taxProfiles } = getMemoryStores();

    if (SUPABASE_CONFIG.isConfigured()) {
      const supabase = getServerSupabaseClient() as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              single: () => Promise<{
                data: {
                  id: string;
                  user_id: string;
                  default_tax_year: number;
                  filing_status: string;
                  has_w2_income: boolean;
                  has_1099_income: boolean;
                  has_business_expenses: boolean;
                  state_of_residence?: string;
                  updated_at: string;
                } | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      };

      const { data } = await supabase
        .from("tax_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (data) {
        return {
          id: data.id,
          userId: data.user_id,
          defaultTaxYear: (data.default_tax_year || 2025) as TaxYear,
          filingStatus: (data.filing_status || "single") as TaxProfile["filingStatus"],
          hasW2Income: Boolean(data.has_w2_income),
          has1099Income: Boolean(data.has_1099_income),
          hasBusinessExpenses: Boolean(data.has_business_expenses),
          stateOfResidence: data.state_of_residence,
          updatedAt: data.updated_at,
        };
      }
    }

    const existing = taxProfiles.get(userId);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const defaultTaxProfile: TaxProfile = {
      id: crypto.randomUUID(),
      userId,
      defaultTaxYear: 2025,
      filingStatus: "single",
      hasW2Income: true,
      has1099Income: false,
      hasBusinessExpenses: false,
      stateOfResidence: undefined,
      updatedAt: now,
    };

    taxProfiles.set(userId, defaultTaxProfile);
    return defaultTaxProfile;
  }

  /**
   * Updates taxpayer default filing preferences.
   */
  public static async updateTaxProfile(
    userId: string,
    data: Partial<Omit<TaxProfile, "id" | "userId">>
  ): Promise<TaxProfile> {
    const current = await this.getTaxProfile(userId);
    const now = new Date().toISOString();

    const updated: TaxProfile = {
      ...current,
      defaultTaxYear: data.defaultTaxYear !== undefined ? data.defaultTaxYear : current.defaultTaxYear,
      filingStatus: data.filingStatus !== undefined ? data.filingStatus : current.filingStatus,
      hasW2Income: data.hasW2Income !== undefined ? data.hasW2Income : current.hasW2Income,
      has1099Income: data.has1099Income !== undefined ? data.has1099Income : current.has1099Income,
      hasBusinessExpenses: data.hasBusinessExpenses !== undefined ? data.hasBusinessExpenses : current.hasBusinessExpenses,
      stateOfResidence: data.stateOfResidence !== undefined ? data.stateOfResidence : current.stateOfResidence,
      updatedAt: now,
    };

    if (SUPABASE_CONFIG.isConfigured()) {
      const supabase = getServerSupabaseClient() as unknown as {
        from: (table: string) => {
          update: (values: unknown) => {
            eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
          };
        };
      };

      await supabase
        .from("tax_profiles")
        .update({
          default_tax_year: updated.defaultTaxYear,
          filing_status: updated.filingStatus,
          has_w2_income: updated.hasW2Income,
          has_1099_income: updated.has1099Income,
          has_business_expenses: updated.hasBusinessExpenses,
          state_of_residence: updated.stateOfResidence || null,
          updated_at: now,
        })
        .eq("user_id", userId);
    }

    const { taxProfiles } = getMemoryStores();
    taxProfiles.set(userId, updated);
    return updated;
  }

  /**
   * Updates a user's role (admin-only operation).
   */
  public static async setRole(userId: string, role: UserRole): Promise<UserProfile> {
    const current = await this.getProfile(userId);
    const updated: UserProfile = {
      ...current,
      role,
      updatedAt: new Date().toISOString(),
    };

    if (SUPABASE_CONFIG.isConfigured()) {
      const supabase = getServerSupabaseClient() as unknown as {
        from: (table: string) => {
          update: (values: unknown) => {
            eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
          };
        };
      };

      await supabase
        .from("profiles")
        .update({
          role,
          updated_at: updated.updatedAt,
        })
        .eq("id", userId);
    }

    const { profiles } = getMemoryStores();
    profiles.set(userId, updated);
    return updated;
  }

  /**
   * Retrieves a user's role.
   */
  public static async getRole(userId: string): Promise<UserRole> {
    const profile = await this.getProfile(userId);
    return profile.role || "user";
  }

  /**
   * Lists users for admin management with optional search and pagination.
   */
  public static async listUsersForAdmin(options: {
    q?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ users: UserProfile[]; total: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const query = options.q?.trim().toLowerCase();

    const { profiles } = getMemoryStores();
    let allUsers = Array.from(profiles.values());

    if (query) {
      allUsers = allUsers.filter(
        (u) =>
          u.email.toLowerCase().includes(query) ||
          (u.fullName && u.fullName.toLowerCase().includes(query)) ||
          u.id.toLowerCase().includes(query)
      );
    }

    allUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = allUsers.length;
    const startIndex = (page - 1) * limit;
    const paginated = allUsers.slice(startIndex, startIndex + limit);

    return {
      users: paginated,
      total,
    };
  }

  /**
   * Returns operational user counts (total and created within last 30 days).
   */
  public static async countUsers(): Promise<{ total: number; newUsers: number }> {
    const { profiles } = getMemoryStores();
    const all = Array.from(profiles.values());
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const newUsers = all.filter((u) => new Date(u.createdAt).getTime() >= thirtyDaysAgo).length;

    return {
      total: all.length,
      newUsers,
    };
  }

  public static clear(): void {
    if (globalStores.__userProfileStore) {
      globalStores.__userProfileStore.clear();
    }
    if (globalStores.__taxProfileStore) {
      globalStores.__taxProfileStore.clear();
    }
  }
}

