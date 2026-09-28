import { TaxCalculationRecord, CalculatorType, TaxYear, TaxFilingStatus } from "@/types/tax";
import { SUPABASE_CONFIG } from "@/lib/supabase/config";
import { getServerSupabaseClient } from "@/lib/supabase/server";

interface TaxCalculationDbRow {
  id: string;
  user_id: string;
  calculation_type: CalculatorType;
  tax_year: TaxYear;
  filing_status: TaxFilingStatus;
  title: string;
  input_snapshot: Record<string, unknown>;
  result_snapshot: TaxCalculationRecord["resultSnapshot"];
  engine_version: string;
  rules_version: string;
  created_at: string;
  updated_at: string;
}

// Global cache for local development/testing across hot reloads
declare global {
  // eslint-disable-next-line no-var
  var __taxCalculationStore: Map<string, TaxCalculationRecord> | undefined;
}

function getMemoryStore(): Map<string, TaxCalculationRecord> {
  if (!globalThis.__taxCalculationStore) {
    globalThis.__taxCalculationStore = new Map<string, TaxCalculationRecord>();
  }
  return globalThis.__taxCalculationStore;
}

export class TaxCalculationStore {
  /**
   * Persists a validated tax calculation record.
   * Enforces server-side generated metadata and ownership.
   */
  public static async save(record: TaxCalculationRecord): Promise<TaxCalculationRecord>;
  public static async save(
    userId: string,
    data: any
  ): Promise<TaxCalculationRecord>;
  public static async save(
    userIdOrRecord: string | TaxCalculationRecord,
    maybeData?: any
  ): Promise<TaxCalculationRecord> {
    let record: TaxCalculationRecord;
    if (typeof userIdOrRecord === "string") {
      const now = new Date().toISOString();
      record = {
        id: maybeData?.id || "calc_" + Math.random().toString(36).substring(2, 9),
        userId: userIdOrRecord,
        title: maybeData?.title || "Tax Calculation",
        calculatorType: maybeData?.calculatorType || "income_tax",
        taxYear: maybeData?.taxYear || 2025,
        filingStatus: maybeData?.filingStatus || "single",
        inputSnapshot: maybeData?.inputSnapshot || {},
        resultSnapshot: maybeData?.resultSnapshot || {},
        engineVersion: maybeData?.engineVersion || "1.0.0",
        rulesVersion: maybeData?.rulesVersion || "2025.1",
        createdAt: maybeData?.createdAt || now,
        updatedAt: maybeData?.updatedAt || now,
      };
    } else {
      record = userIdOrRecord;
    }
    if (SUPABASE_CONFIG.isConfigured()) {
      const supabase = getServerSupabaseClient() as unknown as {
        from: (table: string) => {
          insert: (data: unknown) => {
            select: () => {
              single: () => Promise<{ data: TaxCalculationDbRow | null; error: { message: string } | null }>;
            };
          };
        };
      };
      const { data, error } = await supabase
        .from("tax_calculations")
        .insert({
          id: record.id,
          user_id: record.userId,
          calculation_type: record.calculatorType,
          tax_year: record.taxYear,
          filing_status: record.filingStatus,
          title: record.title,
          input_snapshot: record.inputSnapshot,
          result_snapshot: record.resultSnapshot,
          engine_version: record.engineVersion,
          rules_version: record.rulesVersion,
          created_at: record.createdAt,
          updated_at: record.updatedAt,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save calculation to database: ${error.message}`);
      }

      if (!data) {
        throw new Error("Failed to save calculation to database: No data returned from insert.");
      }

      return {
        id: data.id,
        userId: data.user_id,
        calculatorType: data.calculation_type,
        taxYear: data.tax_year,
        filingStatus: data.filing_status,
        title: data.title,
        inputSnapshot: data.input_snapshot,
        resultSnapshot: data.result_snapshot,
        engineVersion: data.engine_version,
        rulesVersion: data.rules_version,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }

    // Offline / Local Development Fallback
    const store = getMemoryStore();
    store.set(record.id, { ...record });
    return record;
  }

  /**
   * Retrieves all calculation history records owned by the specified user.
   * Results are sorted newest first (descending created_at).
   */
  public static async listByUser(userId: string): Promise<TaxCalculationRecord[]> {
    if (SUPABASE_CONFIG.isConfigured()) {
      const supabase = getServerSupabaseClient() as unknown as {
        from: (table: string) => {
          select: (columns: string) => {
            eq: (col: string, val: string) => {
              order: (col: string, opts: { ascending: boolean }) => Promise<{
                data: TaxCalculationDbRow[] | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      };
      const { data, error } = await supabase
        .from("tax_calculations")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`Failed to retrieve calculations: ${error.message}`);
      }

      return (data || []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        calculatorType: row.calculation_type,
        taxYear: row.tax_year,
        filingStatus: row.filing_status,
        title: row.title,
        inputSnapshot: row.input_snapshot,
        resultSnapshot: row.result_snapshot,
        engineVersion: row.engine_version,
        rulesVersion: row.rules_version,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    }

    // Offline / Local Development Fallback
    const store = getMemoryStore();
    const userRecords: TaxCalculationRecord[] = [];
    for (const item of store.values()) {
      if (item.userId === userId) {
        userRecords.push({ ...item });
      }
    }

    return userRecords.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Retrieves a single calculation record.
   * SECURITY: Strictly verifies ownership. Returns null if not owned by the user.
   */
  public static async getById(id: string, userId: string): Promise<TaxCalculationRecord | null> {
    if (SUPABASE_CONFIG.isConfigured()) {
      const supabase = getServerSupabaseClient() as unknown as {
        from: (table: string) => {
          select: (columns: string) => {
            eq: (col: string, val: string) => {
              eq: (col: string, val: string) => {
                single: () => Promise<{
                  data: TaxCalculationDbRow | null;
                  error: { message: string } | null;
                }>;
              };
            };
          };
        };
      };
      const { data, error } = await supabase
        .from("tax_calculations")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        userId: data.user_id,
        calculatorType: data.calculation_type,
        taxYear: data.tax_year,
        filingStatus: data.filing_status,
        title: data.title,
        inputSnapshot: data.input_snapshot,
        resultSnapshot: data.result_snapshot,
        engineVersion: data.engine_version,
        rulesVersion: data.rules_version,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }

    // Offline / Local Development Fallback
    const store = getMemoryStore();
    const record = store.get(id);
    if (!record || record.userId !== userId) {
      return null;
    }

    return { ...record };
  }

  /**
   * Deletes a single calculation record.
   * SECURITY: Strictly verifies ownership. Returns false if not owned by the user or non-existent.
   */
  public static async delete(id: string, userId: string): Promise<boolean> {
    if (SUPABASE_CONFIG.isConfigured()) {
      const supabase = getServerSupabaseClient() as unknown as {
        from: (table: string) => {
          delete: (opts: { count: string }) => {
            eq: (col: string, val: string) => {
              eq: (col: string, val: string) => Promise<{
                error: { message: string } | null;
                count: number | null;
              }>;
            };
          };
        };
      };
      const { error, count } = await supabase
        .from("tax_calculations")
        .delete({ count: "exact" })
        .eq("id", id)
        .eq("user_id", userId);

      if (error || (count !== null && count === 0)) {
        return false;
      }

      return true;
    }

    // Offline / Local Development Fallback
    const store = getMemoryStore();
    const record = store.get(id);
    if (!record || record.userId !== userId) {
      return false;
    }

    return store.delete(id);
  }

  /**
   * Updates calculation title (rename).
   * SECURITY: Strictly verifies ownership.
   */
  public static async updateTitle(
    id: string,
    userId: string,
    title: string
  ): Promise<TaxCalculationRecord | null> {
    if (SUPABASE_CONFIG.isConfigured()) {
      const supabase = getServerSupabaseClient() as unknown as {
        from: (table: string) => {
          update: (data: unknown) => {
            eq: (col: string, val: string) => {
              eq: (col: string, val: string) => {
                select: () => {
                  single: () => Promise<{
                    data: TaxCalculationDbRow | null;
                    error: { message: string } | null;
                  }>;
                };
              };
            };
          };
        };
      };
      const { data, error } = await supabase
        .from("tax_calculations")
        .update({
          title,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        userId: data.user_id,
        calculatorType: data.calculation_type,
        taxYear: data.tax_year,
        filingStatus: data.filing_status,
        title: data.title,
        inputSnapshot: data.input_snapshot,
        resultSnapshot: data.result_snapshot,
        engineVersion: data.engine_version,
        rulesVersion: data.rules_version,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }

    // Offline / Local Development Fallback
    const store = getMemoryStore();
    const record = store.get(id);
    if (!record || record.userId !== userId) {
      return null;
    }

    const updated: TaxCalculationRecord = {
      ...record,
      title,
      updatedAt: new Date().toISOString(),
    };

    store.set(id, updated);
    return { ...updated };
  }

  /**
   * Admin-only: Lists calculations with pagination, search, and filtering.
   * DATA MINIMIZATION: Returns operational metadata only, omitting massive snapshots.
   */
  public static async listAllForAdmin(options: {
    q?: string;
    taxYear?: number;
    calculatorType?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    calculations: Array<{
      id: string;
      userId: string;
      calculatorType: CalculatorType;
      taxYear: TaxYear;
      filingStatus: TaxFilingStatus;
      title: string;
      engineVersion: string;
      rulesVersion: string;
      createdAt: string;
      updatedAt: string;
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 20));

    if (SUPABASE_CONFIG.isConfigured()) {
      const supabase = getServerSupabaseClient() as unknown as {
        from: (table: string) => {
          select: (cols: string, opts?: { count: string }) => {
            order: (col: string, opts: { ascending: boolean }) => {
              range: (from: number, to: number) => Promise<{
                data: TaxCalculationDbRow[] | null;
                count: number | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      };

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, count, error } = await supabase
        .from("tax_calculations")
        .select("id, user_id, calculation_type, tax_year, filing_status, title, engine_version, rules_version, created_at, updated_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        throw new Error(`Failed to list calculations for admin: ${error.message}`);
      }

      const total = count || 0;
      const calculations = (data || []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        calculatorType: row.calculation_type,
        taxYear: row.tax_year,
        filingStatus: row.filing_status,
        title: row.title,
        engineVersion: row.engine_version,
        rulesVersion: row.rules_version,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      return {
        calculations,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      };
    }

    const store = getMemoryStore();
    let items = Array.from(store.values());

    if (options.calculatorType) {
      items = items.filter((c) => c.calculatorType === options.calculatorType);
    }
    if (options.taxYear) {
      items = items.filter((c) => c.taxYear === options.taxYear);
    }
    if (options.q && options.q.trim().length > 0) {
      const q = options.q.trim().toLowerCase();
      items = items.filter(
        (c) =>
          c.id.toLowerCase().includes(q) ||
          c.userId.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q)
      );
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = items.length;
    const startIdx = (page - 1) * limit;
    const paginated = items.slice(startIdx, startIdx + limit);

    return {
      calculations: paginated.map((row) => ({
        id: row.id,
        userId: row.userId,
        calculatorType: row.calculatorType,
        taxYear: row.taxYear,
        filingStatus: row.filingStatus,
        title: row.title,
        engineVersion: row.engineVersion,
        rulesVersion: row.rulesVersion,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Admin-only: Read-only inspection of a single calculation.
   * IMMUTABILITY: Admin inspection cannot mutate calculation snapshot, engineVersion, or rulesVersion.
   */
  public static async getByIdForAdmin(id: string): Promise<TaxCalculationRecord | null> {
    if (SUPABASE_CONFIG.isConfigured()) {
      const supabase = getServerSupabaseClient() as unknown as {
        from: (table: string) => {
          select: (columns: string) => {
            eq: (col: string, val: string) => {
              single: () => Promise<{
                data: TaxCalculationDbRow | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      };
      const { data, error } = await supabase
        .from("tax_calculations")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        userId: data.user_id,
        calculatorType: data.calculation_type,
        taxYear: data.tax_year,
        filingStatus: data.filing_status,
        title: data.title,
        inputSnapshot: data.input_snapshot,
        resultSnapshot: data.result_snapshot,
        engineVersion: data.engine_version,
        rulesVersion: data.rules_version,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }

    const store = getMemoryStore();
    const record = store.get(id);
    if (!record) return null;
    return { ...record };
  }

  /**
   * Admin-only: Operational counts and breakdown for calculation analytics.
   */
  public static async countAll(): Promise<{
    total: number;
    byCalculatorType: Record<string, number>;
    byTaxYear: Record<number, number>;
  }> {
    const store = getMemoryStore();
    const all = Array.from(store.values());

    const byCalculatorType: Record<string, number> = {};
    const byTaxYear: Record<number, number> = {};

    for (const item of all) {
      byCalculatorType[item.calculatorType] = (byCalculatorType[item.calculatorType] || 0) + 1;
      byTaxYear[item.taxYear] = (byTaxYear[item.taxYear] || 0) + 1;
    }

    return {
      total: all.length,
      byCalculatorType,
      byTaxYear,
    };
  }

  /**
   * Test utility to reset in-memory records between test suites.
   */
  public static clearStore(): void {
    if (globalThis.__taxCalculationStore) {
      globalThis.__taxCalculationStore.clear();
    }
  }

  public static clear(): void {
    TaxCalculationStore.clearStore();
  }
}

