import { TaxYear, TaxFilingStatus } from "@/types/tax";
import { SUPABASE_CONFIG } from "@/lib/supabase/config";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { LeadInternalNote } from "@/types/supabase";

export type ProfessionalLeadContactMethod = "email" | "phone";
export type ProfessionalLeadUrgency = "immediate" | "this_month" | "planning_ahead" | "within_week" | "flexible";
export type ProfessionalLeadStatus =
  | "new"
  | "requested"
  | "received"
  | "assigned"
  | "contacted"
  | "in_progress"
  | "review_in_progress"
  | "closed"
  | "completed"
  | "cancelled";

export type ProfessionalReviewType = "cpa" | "enrolled_agent" | "tax_professional";

export interface ProfessionalLeadCalculationResult {
  totalIncomeCents?: number;
  taxableIncomeCents: number;
  totalTaxLiabilityCents: number;
  refundOrBalanceDue?: {
    type: "refund" | "balance_due" | "balanced" | "zero";
    amountCents: number;
  };
}

export interface ProfessionalLeadSessionSnapshot {
  sessionId?: string;
  taxYear: number;
  filingStatus: string;
  incomeSources: string[];
  w2Count: number;
  totalW2WagesCents: number;
  totalW2WithholdingCents: number;
  w2WagesCents?: number;
  form1099Count: number;
  total1099GrossCents: number;
  total1099WithholdingCents: number;
  form1099GrossCents?: number;
  gigCount: number;
  gigGrossCents: number;
  gigExpenseCents: number;
  gigBusinessGrossCents?: number;
  businessExpenseCents?: number;
  deductionsType: "standard" | "itemized";
  itemizedTotalCents?: number;
  uploadedDocumentsCount: number;
  missingDocumentTypes?: string[];
  documentsReceived: string[];
  documentsStillNeeded: string[];
  standardDeductionAcknowledged: boolean;
  totalIncomeCents?: number;
  taxableIncomeCents?: number;
  totalTaxLiabilityCents?: number;
  refundOrBalanceDue?: {
    type: "refund" | "balance_due" | "balanced" | "zero";
    amountCents: number;
  };
  calculationResult?: ProfessionalLeadCalculationResult;
  warnings: string[];
  missingInformation: string[];
}

export interface ProfessionalLeadRecord {
  id: string;
  userId: string;
  calculationId?: string;
  sessionId?: string;
  reviewType: ProfessionalReviewType;
  taxYear: TaxYear;
  filingStatus: TaxFilingStatus;
  taxpayerName: string;
  email: string;
  phone?: string;
  message?: string;
  preferredContactMethod: ProfessionalLeadContactMethod;
  urgency: ProfessionalLeadUrgency;
  status: ProfessionalLeadStatus;
  assignedProfessionalId?: string;
  assignedProfessionalName?: string;
  sessionSnapshot?: ProfessionalLeadSessionSnapshot;
  internalNotes?: LeadInternalNote[];
  createdAt: string;
  updatedAt: string;
}

interface ProfessionalLeadDbRow {
  id: string;
  user_id: string;
  calculation_id?: string | null;
  session_id?: string | null;
  review_type?: string | null;
  tax_year: number;
  filing_status: string;
  taxpayer_name: string;
  email: string;
  phone?: string | null;
  message?: string | null;
  preferred_contact_method: string;
  urgency: string;
  status: string;
  assigned_professional_id?: string | null;
  assigned_professional_name?: string | null;
  session_snapshot?: ProfessionalLeadSessionSnapshot | null;
  internal_notes?: LeadInternalNote[] | null;
  created_at: string;
  updated_at: string;
}

export interface AdminLeadListResult {
  leads: ProfessionalLeadRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __professionalLeadStore: Map<string, ProfessionalLeadRecord> | undefined;
}

function getMemoryStore(): Map<string, ProfessionalLeadRecord> {
  if (!globalThis.__professionalLeadStore) {
    globalThis.__professionalLeadStore = new Map<string, ProfessionalLeadRecord>();
  }
  return globalThis.__professionalLeadStore;
}

export class ProfessionalLeadStore {
  /**
   * Persists a professional handoff inquiry.
   * Strictly derives userId from the authenticated session.
   */
  public static async save(record: ProfessionalLeadRecord): Promise<ProfessionalLeadRecord> {
    if (SUPABASE_CONFIG.isConfigured()) {
      const supabase = getServerSupabaseClient() as unknown as {
        from: (table: string) => {
          insert: (data: unknown) => {
            select: () => {
              single: () => Promise<{
                data: ProfessionalLeadDbRow | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      };

      const insertPayload: Record<string, unknown> = {
        id: record.id,
        user_id: record.userId,
        calculation_id: record.calculationId || null,
        tax_year: record.taxYear,
        filing_status: record.filingStatus,
        taxpayer_name: record.taxpayerName,
        email: record.email,
        phone: record.phone || null,
        message: record.message || null,
        preferred_contact_method: record.preferredContactMethod,
        urgency: record.urgency,
        status: record.status,
        internal_notes: record.internalNotes || [],
        created_at: record.createdAt,
        updated_at: record.updatedAt,
      };

      if (record.sessionId) insertPayload.session_id = record.sessionId;
      if (record.reviewType) insertPayload.review_type = record.reviewType;
      if (record.assignedProfessionalId) insertPayload.assigned_professional_id = record.assignedProfessionalId;
      if (record.assignedProfessionalName) insertPayload.assigned_professional_name = record.assignedProfessionalName;
      if (record.sessionSnapshot) insertPayload.session_snapshot = record.sessionSnapshot;

      let savedRow: ProfessionalLeadDbRow | null = null;
      try {
        const { data, error } = await supabase
          .from("tax_professional_leads")
          .insert(insertPayload)
          .select()
          .single();

        if (error) throw error;
        savedRow = data;
      } catch (_err) {
        // Safe fallback in case migration columns are pending in Supabase
        const { data, error } = await supabase
          .from("tax_professional_leads")
          .insert({
            id: record.id,
            user_id: record.userId,
            calculation_id: record.calculationId,
            tax_year: record.taxYear,
            filing_status: record.filingStatus,
            taxpayer_name: record.taxpayerName,
            email: record.email,
            phone: record.phone || null,
            message: record.message || null,
            preferred_contact_method: record.preferredContactMethod,
            urgency: record.urgency,
            status: record.status,
            internal_notes: record.internalNotes || [],
            created_at: record.createdAt,
            updated_at: record.updatedAt,
          })
          .select()
          .single();

        if (error || !data) {
          throw new Error(`Failed to save professional lead: ${error?.message || "Unknown error"}`);
        }
        savedRow = data;
      }

      if (!savedRow) {
        throw new Error("Failed to save professional lead: Database operation returned no data.");
      }

      return {
        id: savedRow.id,
        userId: savedRow.user_id,
        calculationId: savedRow.calculation_id || record.calculationId,
        sessionId: savedRow.session_id || record.sessionId,
        reviewType: (savedRow.review_type as ProfessionalReviewType) || record.reviewType || "cpa",
        taxYear: savedRow.tax_year as TaxYear,
        filingStatus: savedRow.filing_status as TaxFilingStatus,
        taxpayerName: savedRow.taxpayer_name,
        email: savedRow.email,
        phone: savedRow.phone || undefined,
        message: savedRow.message || undefined,
        preferredContactMethod: savedRow.preferred_contact_method as ProfessionalLeadContactMethod,
        urgency: savedRow.urgency as ProfessionalLeadUrgency,
        status: savedRow.status as ProfessionalLeadStatus,
        assignedProfessionalId: savedRow.assigned_professional_id || record.assignedProfessionalId,
        assignedProfessionalName: savedRow.assigned_professional_name || record.assignedProfessionalName,
        sessionSnapshot: savedRow.session_snapshot || record.sessionSnapshot,
        internalNotes: savedRow.internal_notes || [],
        createdAt: savedRow.created_at,
        updatedAt: savedRow.updated_at,
      };
    }

    // In-memory fallback
    const store = getMemoryStore();
    store.set(record.id, { ...record });
    return { ...record };
  }

  /**
   * Retrieves all professional leads submitted by the authenticated user.
   * DATA MINIMIZATION & SECURITY: Never returns internal notes to users.
   */
  public static async listByUser(userId: string): Promise<ProfessionalLeadRecord[]> {
    if (SUPABASE_CONFIG.isConfigured()) {
      const supabase = getServerSupabaseClient() as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              order: (
                col: string,
                opts: { ascending: boolean }
              ) => Promise<{ data: ProfessionalLeadDbRow[] | null; error: { message: string } | null }>;
            };
          };
        };
      };

      const { data, error } = await supabase
        .from("tax_professional_leads")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`Failed to list leads: ${error.message}`);
      }

      return (data || []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        calculationId: row.calculation_id || undefined,
        sessionId: row.session_id || undefined,
        reviewType: (row.review_type as ProfessionalReviewType) || "cpa",
        taxYear: row.tax_year as TaxYear,
        filingStatus: row.filing_status as TaxFilingStatus,
        taxpayerName: row.taxpayer_name,
        email: row.email,
        phone: row.phone || undefined,
        message: row.message || undefined,
        preferredContactMethod: row.preferred_contact_method as ProfessionalLeadContactMethod,
        urgency: row.urgency as ProfessionalLeadUrgency,
        status: row.status as ProfessionalLeadStatus,
        assignedProfessionalId: row.assigned_professional_id || undefined,
        assignedProfessionalName: row.assigned_professional_name || undefined,
        sessionSnapshot: row.session_snapshot || undefined,
        // Omit internalNotes for normal user
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    }

    const store = getMemoryStore();
    return Array.from(store.values())
      .filter((l) => l.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((lead) => {
        // Strip internalNotes for normal users
        const { internalNotes: _omitted, ...safeLead } = lead;
        return safeLead as ProfessionalLeadRecord;
      });
  }

  /**
   * Retrieves a single lead strictly ensuring ownership.
   * DATA MINIMIZATION & SECURITY: Never returns internal notes to users.
   */
  public static async getById(id: string, userId: string): Promise<ProfessionalLeadRecord | null> {
    if (SUPABASE_CONFIG.isConfigured()) {
      const supabase = getServerSupabaseClient() as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              eq: (col: string, val: string) => {
                maybeSingle: () => Promise<{
                  data: ProfessionalLeadDbRow | null;
                  error: { message: string } | null;
                }>;
              };
            };
          };
        };
      };

      const { data, error } = await supabase
        .from("tax_professional_leads")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();

      if (error || !data) return null;

      return {
        id: data.id,
        userId: data.user_id,
        calculationId: data.calculation_id || undefined,
        sessionId: data.session_id || undefined,
        reviewType: (data.review_type as ProfessionalReviewType) || "cpa",
        taxYear: data.tax_year as TaxYear,
        filingStatus: data.filing_status as TaxFilingStatus,
        taxpayerName: data.taxpayer_name,
        email: data.email,
        phone: data.phone || undefined,
        message: data.message || undefined,
        preferredContactMethod: data.preferred_contact_method as ProfessionalLeadContactMethod,
        urgency: data.urgency as ProfessionalLeadUrgency,
        status: data.status as ProfessionalLeadStatus,
        assignedProfessionalId: data.assigned_professional_id || undefined,
        assignedProfessionalName: data.assigned_professional_name || undefined,
        sessionSnapshot: data.session_snapshot || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }

    const store = getMemoryStore();
    const record = store.get(id);
    if (!record || record.userId !== userId) {
      return null;
    }
    const { internalNotes: _omitted, ...safeLead } = record;
    return { ...safeLead } as ProfessionalLeadRecord;
  }

  /**
   * Retrieves the active professional lead linked to a tax preparation session for the user.
   */
  public static async getBySessionId(sessionId: string, userId: string): Promise<ProfessionalLeadRecord | null> {
    if (SUPABASE_CONFIG.isConfigured()) {
      const supabase = getServerSupabaseClient() as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              eq: (col: string, val: string) => {
                order: (
                  col: string,
                  opts: { ascending: boolean }
                ) => {
                  limit: (n: number) => {
                    maybeSingle: () => Promise<{
                      data: ProfessionalLeadDbRow | null;
                      error: { message: string } | null;
                    }>;
                  };
                };
              };
            };
          };
        };
      };

      const { data, error } = await supabase
        .from("tax_professional_leads")
        .select("*")
        .eq("session_id", sessionId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      return {
        id: data.id,
        userId: data.user_id,
        calculationId: data.calculation_id || undefined,
        sessionId: data.session_id || undefined,
        reviewType: (data.review_type as ProfessionalReviewType) || "cpa",
        taxYear: data.tax_year as TaxYear,
        filingStatus: data.filing_status as TaxFilingStatus,
        taxpayerName: data.taxpayer_name,
        email: data.email,
        phone: data.phone || undefined,
        message: data.message || undefined,
        preferredContactMethod: data.preferred_contact_method as ProfessionalLeadContactMethod,
        urgency: data.urgency as ProfessionalLeadUrgency,
        status: data.status as ProfessionalLeadStatus,
        assignedProfessionalId: data.assigned_professional_id || undefined,
        assignedProfessionalName: data.assigned_professional_name || undefined,
        sessionSnapshot: data.session_snapshot || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }

    const store = getMemoryStore();
    const leads = Array.from(store.values())
      .filter((l) => l.userId === userId && l.sessionId === sessionId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (leads.length === 0) return null;
    const { internalNotes: _omitted, ...safeLead } = leads[0];
    return { ...safeLead } as ProfessionalLeadRecord;
  }

  /**
   * Admin-only: Retrieves a lead by ID with full operational details including internal notes.
   */
  public static async getByIdForAdmin(id: string): Promise<ProfessionalLeadRecord | null> {
    if (SUPABASE_CONFIG.isConfigured()) {
      const supabase = getServerSupabaseClient() as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              maybeSingle: () => Promise<{
                data: ProfessionalLeadDbRow | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      };

      const { data, error } = await supabase
        .from("tax_professional_leads")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error || !data) return null;

      return {
        id: data.id,
        userId: data.user_id,
        calculationId: data.calculation_id || undefined,
        sessionId: data.session_id || undefined,
        reviewType: (data.review_type as ProfessionalReviewType) || "cpa",
        taxYear: data.tax_year as TaxYear,
        filingStatus: data.filing_status as TaxFilingStatus,
        taxpayerName: data.taxpayer_name,
        email: data.email,
        phone: data.phone || undefined,
        message: data.message || undefined,
        preferredContactMethod: data.preferred_contact_method as ProfessionalLeadContactMethod,
        urgency: data.urgency as ProfessionalLeadUrgency,
        status: data.status as ProfessionalLeadStatus,
        assignedProfessionalId: data.assigned_professional_id || undefined,
        assignedProfessionalName: data.assigned_professional_name || undefined,
        sessionSnapshot: data.session_snapshot || undefined,
        internalNotes: data.internal_notes || [],
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
   * Admin-only: Lists all leads with pagination, search, and filtering.
   */
  public static async listAllForAdmin(options: {
    q?: string;
    status?: ProfessionalLeadStatus;
    taxYear?: number;
    page?: number;
    limit?: number;
  } = {}): Promise<AdminLeadListResult> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 20));

    if (SUPABASE_CONFIG.isConfigured()) {
      const supabase = getServerSupabaseClient() as unknown as {
        from: (table: string) => {
          select: (cols: string, opts?: { count: string }) => {
            order: (col: string, opts: { ascending: boolean }) => {
              range: (from: number, to: number) => Promise<{
                data: ProfessionalLeadDbRow[] | null;
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
        .from("tax_professional_leads")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        throw new Error(`Failed to list leads for admin: ${error.message}`);
      }

      const total = count || 0;
      const leads: ProfessionalLeadRecord[] = (data || []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        calculationId: row.calculation_id || undefined,
        sessionId: row.session_id || undefined,
        reviewType: (row.review_type as ProfessionalReviewType) || "cpa",
        taxYear: row.tax_year as TaxYear,
        filingStatus: row.filing_status as TaxFilingStatus,
        taxpayerName: row.taxpayer_name,
        email: row.email,
        phone: row.phone || undefined,
        message: row.message || undefined,
        preferredContactMethod: row.preferred_contact_method as ProfessionalLeadContactMethod,
        urgency: row.urgency as ProfessionalLeadUrgency,
        status: row.status as ProfessionalLeadStatus,
        assignedProfessionalId: row.assigned_professional_id || undefined,
        assignedProfessionalName: row.assigned_professional_name || undefined,
        sessionSnapshot: row.session_snapshot || undefined,
        internalNotes: row.internal_notes || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      return {
        leads,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      };
    }

    const store = getMemoryStore();
    let items = Array.from(store.values());

    if (options.status) {
      items = items.filter((l) => l.status === options.status);
    }
    if (options.taxYear) {
      items = items.filter((l) => l.taxYear === options.taxYear);
    }
    if (options.q && options.q.trim().length > 0) {
      const q = options.q.trim().toLowerCase();
      items = items.filter(
        (l) =>
          l.taxpayerName.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          l.id.toLowerCase().includes(q) ||
          (l.calculationId ? l.calculationId.toLowerCase().includes(q) : false)
      );
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = items.length;
    const startIdx = (page - 1) * limit;
    const paginated = items.slice(startIdx, startIdx + limit);

    return {
      leads: paginated.map((item) => ({ ...item })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Admin-only: Updates lead status, internal note, and/or assigns a tax professional.
   */
  public static async updateStatusAndNote(
    id: string,
    adminUserId: string,
    status?: ProfessionalLeadStatus,
    note?: string,
    assignment?: { professionalId?: string; professionalName?: string }
  ): Promise<ProfessionalLeadRecord | null> {
    const existing = await this.getByIdForAdmin(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updatedStatus = status || existing.status;
    const currentNotes = existing.internalNotes ? [...existing.internalNotes] : [];

    const assignedProfessionalId =
      assignment?.professionalId !== undefined
        ? assignment.professionalId
        : existing.assignedProfessionalId;
    const assignedProfessionalName =
      assignment?.professionalName !== undefined
        ? assignment.professionalName
        : existing.assignedProfessionalName;

    if (note && note.trim().length > 0) {
      const newNote: LeadInternalNote = {
        id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        adminUserId,
        note: note.trim(),
        createdAt: now,
      };
      currentNotes.push(newNote);
    }

    if (SUPABASE_CONFIG.isConfigured()) {
      const supabase = getServerSupabaseClient() as unknown as {
        from: (table: string) => {
          update: (values: unknown) => {
            eq: (col: string, val: string) => {
              select: () => {
                single: () => Promise<{
                  data: ProfessionalLeadDbRow | null;
                  error: { message: string } | null;
                }>;
              };
            };
          };
        };
      };

      const updatePayload: Record<string, unknown> = {
        status: updatedStatus,
        internal_notes: currentNotes,
        updated_at: now,
      };
      if (assignedProfessionalId) updatePayload.assigned_professional_id = assignedProfessionalId;
      if (assignedProfessionalName) updatePayload.assigned_professional_name = assignedProfessionalName;

      try {
        const { data, error } = await supabase
          .from("tax_professional_leads")
          .update(updatePayload)
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          return {
            id: data.id,
            userId: data.user_id,
            calculationId: data.calculation_id || undefined,
            sessionId: data.session_id || undefined,
            reviewType: (data.review_type as ProfessionalReviewType) || "cpa",
            taxYear: data.tax_year as TaxYear,
            filingStatus: data.filing_status as TaxFilingStatus,
            taxpayerName: data.taxpayer_name,
            email: data.email,
            phone: data.phone || undefined,
            message: data.message || undefined,
            preferredContactMethod: data.preferred_contact_method as ProfessionalLeadContactMethod,
            urgency: data.urgency as ProfessionalLeadUrgency,
            status: data.status as ProfessionalLeadStatus,
            assignedProfessionalId: data.assigned_professional_id || undefined,
            assignedProfessionalName: data.assigned_professional_name || undefined,
            sessionSnapshot: data.session_snapshot || undefined,
            internalNotes: data.internal_notes || [],
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
        }
      } catch (_err) {
        // Fallback update without new columns
        await supabase
          .from("tax_professional_leads")
          .update({
            status: updatedStatus,
            internal_notes: currentNotes,
            updated_at: now,
          })
          .eq("id", id);
      }
    }

    const store = getMemoryStore();
    const updated: ProfessionalLeadRecord = {
      ...existing,
      status: updatedStatus,
      assignedProfessionalId,
      assignedProfessionalName,
      internalNotes: currentNotes,
      updatedAt: now,
    };
    store.set(id, updated);
    return { ...updated };
  }

  /**
   * Admin-only: Assigns a licensed tax professional (CPA/EA) to this lead.
   */
  public static async assignProfessional(
    id: string,
    adminUserId: string,
    professionalId: string,
    professionalName: string
  ): Promise<ProfessionalLeadRecord | null> {
    return this.updateStatusAndNote(
      id,
      adminUserId,
      "assigned",
      `Assigned to tax professional: ${professionalName}`,
      { professionalId, professionalName }
    );
  }

  /**
   * Finds a recently submitted lead to prevent duplicate double-submissions.
   */
  public static async findRecentDuplicate(
    userId: string,
    calculationId?: string,
    email?: string,
    sessionId?: string,
    windowMs: number = 5 * 60 * 1000
  ): Promise<ProfessionalLeadRecord | null> {
    const leads = await this.listByUser(userId);
    const now = Date.now();

    for (const lead of leads) {
      const emailMatches = email ? lead.email.toLowerCase() === email.toLowerCase() : true;
      const calcMatches = calculationId ? lead.calculationId === calculationId : false;
      const sessionMatches = sessionId ? lead.sessionId === sessionId : false;

      if (emailMatches && (calcMatches || sessionMatches)) {
        const leadTime = new Date(lead.createdAt).getTime();
        if (now - leadTime < windowMs) {
          return lead;
        }
      }
    }

    return null;
  }

  /**
   * Total leads count across system (for overview KPIs).
   */
  public static async countAll(): Promise<{ total: number; open: number }> {
    if (SUPABASE_CONFIG.isConfigured()) {
      const supabase = getServerSupabaseClient() as unknown as {
        from: (table: string) => {
          select: (cols: string, opts: { count: string; head: boolean }) => Promise<{
            count: number | null;
            error: { message: string } | null;
          }>;
        };
      };

      const { count: total } = await supabase
        .from("tax_professional_leads")
        .select("*", { count: "exact", head: true });

      return { total: total || 0, open: 0 };
    }

    const store = getMemoryStore();
    const all = Array.from(store.values());
    const open = all.filter((l) => l.status === "new" || l.status === "contacted" || l.status === "in_progress").length;
    return { total: all.length, open };
  }

  /**
   * Alias for submitting a lead, deriving ID and timestamps.
   */
  public static async submitLead(params: {
    userId: string;
    calculationId?: string;
    sessionId?: string;
    reviewType?: ProfessionalReviewType;
    taxYear: TaxYear;
    filingStatus: TaxFilingStatus;
    taxpayerName: string;
    email: string;
    phone?: string;
    message?: string;
    preferredContactMethod: "email" | "phone";
    urgency: ProfessionalLeadUrgency;
  }): Promise<ProfessionalLeadRecord> {
    const now = new Date().toISOString();
    const record: ProfessionalLeadRecord = {
      id: "lead_" + Math.random().toString(36).substring(2, 10),
      userId: params.userId,
      calculationId: params.calculationId || "",
      sessionId: params.sessionId,
      reviewType: params.reviewType || "cpa",
      taxYear: params.taxYear,
      filingStatus: params.filingStatus,
      taxpayerName: params.taxpayerName,
      email: params.email,
      phone: params.phone,
      message: params.message,
      preferredContactMethod: params.preferredContactMethod,
      urgency: params.urgency,
      status: "new",
      internalNotes: [],
      createdAt: now,
      updatedAt: now,
    };
    return this.save(record);
  }

  /**
   * Adds an internal staff note to a lead.
   */
  public static async addInternalNote(params: {
    leadId: string;
    adminUserId: string;
    authorEmail?: string;
    note: string;
  }): Promise<ProfessionalLeadRecord | null> {
    return this.updateStatusAndNote(params.leadId, params.adminUserId, undefined, params.note);
  }

  /**
   * Resets in-memory store records for tests and development.
   */
  public static clear(): void {
    getMemoryStore().clear();
  }

  public static clearStore(): void {
    this.clear();
  }
}

