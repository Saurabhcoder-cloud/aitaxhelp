import { TaxYear, TaxCalculationResult, TaxCalculationRecord } from "@/types/tax";
import { SUPABASE_CONFIG } from "@/lib/supabase/config";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { UserProfileStore } from "@/lib/services/user-profile-store";
import { TaxCalculationStore } from "@/lib/services/tax-calculation-store";
import { AppError } from "@/lib/utils/errors";
import { suggestPreparationCalculators, PreparationCalculatorLink } from "@/lib/preparation/calculators";
import { emptyIncomeDiscovery, IncomeDiscovery, suggestCalculatorsForIncome } from "@/lib/preparation/income";
import { incomeDiscoverySchema, isCompleteIncomeDiscovery } from "@/lib/validations/preparation-income";
import {
  DocumentsSnapshot,
  emptyDocumentsSnapshot,
  stampDocuments,
} from "@/lib/preparation/documents";
import { DeductionDiscovery, emptyDeductionDiscovery } from "@/lib/preparation/deductions";
import { documentsInputSchema, DocumentsInput } from "@/lib/validations/preparation-documents";
import { deductionDiscoveryInputSchema } from "@/lib/validations/preparation-deductions";
import { isCompleteDeductionDiscovery } from "@/lib/validations/preparation-deductions";
import { HouseholdSnapshot, emptyHouseholdSnapshot } from "@/lib/preparation/household";
import { householdInputSchema, HouseholdInput } from "@/lib/validations/preparation-household";
import {
  assessCalculationReadiness,
  buildTaxSituationSummary,
  CalculationReadiness,
  TaxSituationSummary,
} from "@/lib/preparation/situation-summary";
import {
  PREPARATION_STEPS,
  PreparationProfileSnapshot,
  PreparationStatus,
  PreparationStep,
  PreparationStepMap,
  completeCurrentStep,
  emptyStepMap,
} from "@/lib/preparation/steps";
import { executePreparationCalculation } from "@/lib/preparation/calculation";
import { ImportCalculatorSessionInput } from "@/lib/validations/preparation-session";

export interface TaxPreparationSession {
  id: string;
  userId: string;
  taxProfileId: string;
  taxYear: TaxYear;
  title: string;
  status: PreparationStatus;
  currentStep: PreparationStep;
  steps: PreparationStepMap;
  profileSnapshot: PreparationProfileSnapshot;
  householdSnapshot: HouseholdSnapshot;
  incomeSnapshot: IncomeDiscovery;
  documentsSnapshot: DocumentsSnapshot;
  deductionsSnapshot: DeductionDiscovery;
  situationSummary: TaxSituationSummary;
  calculationReadiness: CalculationReadiness;
  suggestedCalculators: PreparationCalculatorLink[];
  calculationId?: string | null;
  calculationSnapshot?: TaxCalculationResult | null;
  createdAt: string;
  updatedAt: string;
}

interface PreparationSessionRow {
  id: string;
  user_id: string;
  tax_profile_id: string | null;
  tax_year: number;
  title: string;
  status: PreparationStatus;
  current_step: PreparationStep;
  steps: PreparationStepMap;
  profile_snapshot: PreparationProfileSnapshot;
  household_snapshot?: HouseholdSnapshot | null;
  income_snapshot?: IncomeDiscovery | null;
  documents_snapshot?: DocumentsSnapshot | null;
  deductions_snapshot?: DeductionDiscovery | null;
  calculation_id?: string | null;
  calculation_snapshot?: TaxCalculationResult | null;
  created_at: string;
  updated_at: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __taxPreparationSessionStore: Map<string, TaxPreparationSession> | undefined;
}

function getMemoryStore(): Map<string, TaxPreparationSession> {
  if (!globalThis.__taxPreparationSessionStore) {
    globalThis.__taxPreparationSessionStore = new Map<string, TaxPreparationSession>();
  }
  return globalThis.__taxPreparationSessionStore;
}

function readIncome(value: unknown): IncomeDiscovery {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptyIncomeDiscovery();
  }
  const record = value as Partial<IncomeDiscovery>;
  if (!Array.isArray(record.situations)) {
    return emptyIncomeDiscovery();
  }
  return {
    situations: record.situations,
    w2s: Array.isArray(record.w2s) ? record.w2s : [],
    form1099s: Array.isArray(record.form1099s) ? record.form1099s : [],
    activities: Array.isArray(record.activities) ? record.activities : [],
  };
}

function readDocuments(value: unknown): DocumentsSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptyDocumentsSnapshot();
  }
  const record = value as Partial<DocumentsSnapshot>;
  return {
    documents: Array.isArray(record.documents) ? record.documents : [],
  };
}

function readDeductions(value: unknown): DeductionDiscovery {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptyDeductionDiscovery();
  }
  const record = value as Partial<DeductionDiscovery>;
  return {
    saved: Boolean(record.saved),
    hasBusinessExpenses:
      record.hasBusinessExpenses === true || record.hasBusinessExpenses === false
        ? record.hasBusinessExpenses
        : null,
    standardDeductionAcknowledged: Boolean(record.standardDeductionAcknowledged),
    entries: Array.isArray(record.entries) ? record.entries : [],
    guidedAnswers: record.guidedAnswers || {},
  };
}

function readHousehold(value: unknown, defaultFilingStatus?: string): HouseholdSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptyHouseholdSnapshot(defaultFilingStatus as any);
  }
  const record = value as Partial<HouseholdSnapshot>;
  return {
    filingStatus: record.filingStatus || (defaultFilingStatus as any) || "single",
    spouse: record.spouse,
    dependents: Array.isArray(record.dependents) ? record.dependents : [],
  };
}

function toPublic(record: TaxPreparationSession): TaxPreparationSession {
  const householdSnapshot = readHousehold(record.householdSnapshot, record.profileSnapshot?.filingStatus);
  const incomeSnapshot = readIncome(record.incomeSnapshot);
  const documentsSnapshot = readDocuments(record.documentsSnapshot);
  const deductionsSnapshot = readDeductions(record.deductionsSnapshot);
  const summaryInput = {
    taxYear: record.taxYear,
    profile: record.profileSnapshot,
    steps: record.steps,
    currentStep: record.currentStep,
    household: householdSnapshot,
    income: incomeSnapshot,
    documents: documentsSnapshot,
    deductions: deductionsSnapshot,
    calculationSnapshot: record.calculationSnapshot,
    calculationId: record.calculationId,
  };
  const calculationId = record.calculationId || null;
  const calculationSnapshot = record.calculationSnapshot
    ? {
        ...record.calculationSnapshot,
        calculationId: calculationId || record.calculationSnapshot.calculationId,
      }
    : null;

  return {
    ...record,
    householdSnapshot,
    incomeSnapshot,
    documentsSnapshot,
    deductionsSnapshot,
    calculationId,
    calculationSnapshot,
    situationSummary: buildTaxSituationSummary(summaryInput),
    calculationReadiness: assessCalculationReadiness(summaryInput),
    suggestedCalculators:
      incomeSnapshot.situations.length > 0
        ? suggestCalculatorsForIncome(incomeSnapshot)
        : suggestPreparationCalculators(record.profileSnapshot),
  };
}

function fromRow(row: PreparationSessionRow): TaxPreparationSession {
  const calculationId = row.calculation_id || null;
  const calculationSnapshot = row.calculation_snapshot
    ? {
        ...row.calculation_snapshot,
        calculationId: calculationId || row.calculation_snapshot.calculationId,
      }
    : null;

  return toPublic({
    id: row.id,
    userId: row.user_id,
    taxProfileId: row.tax_profile_id || "",
    taxYear: row.tax_year as TaxYear,
    title: row.title,
    status: row.status,
    currentStep: row.current_step,
    steps: row.steps,
    profileSnapshot: row.profile_snapshot,
    householdSnapshot: readHousehold(row.household_snapshot, row.profile_snapshot?.filingStatus),
    incomeSnapshot: readIncome(row.income_snapshot),
    documentsSnapshot: readDocuments(row.documents_snapshot),
    deductionsSnapshot: readDeductions(row.deductions_snapshot),
    calculationId,
    calculationSnapshot,
    situationSummary: undefined as unknown as TaxSituationSummary,
    calculationReadiness: undefined as unknown as CalculationReadiness,
    suggestedCalculators: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function isOpen(session: TaxPreparationSession): boolean {
  return session.status !== "completed";
}

export class TaxPreparationSessionStore {
  /**
   * Returns the caller's open preparation session, if one exists.
   * SECURITY: keyed only by the verified server user id.
   */
  public static async getCurrent(userId: string): Promise<TaxPreparationSession | null> {
    if (SUPABASE_CONFIG.isConfigured()) {
      const row = await this.selectOpenFromDatabase(userId);
      return row ? fromRow(row) : null;
    }

    const open = Array.from(getMemoryStore().values())
      .filter((session) => session.userId === userId && isOpen(session))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return open[0] ? toPublic(open[0]) : null;
  }

  /**
   * Returns the user's latest preparation session (open or completed).
   */
  public static async getLatest(userId: string): Promise<TaxPreparationSession | null> {
    if (SUPABASE_CONFIG.isConfigured()) {
      try {
        const supabase = getServerSupabaseClient() as unknown as {
          from: (tbl: string) => {
            select: (cols: string) => {
              eq: (col: string, val: string) => {
                order: (col: string, opts: { ascending: boolean }) => {
                  limit: (n: number) => {
                    maybeSingle: () => Promise<{ data: PreparationSessionRow | null; error: unknown }>;
                  };
                };
              };
            };
          };
        };
        const res = await supabase
          .from("tax_preparation_sessions")
          .select("*")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        return res.data ? fromRow(res.data) : null;
      } catch (_e) {
        return null;
      }
    }

    const all = Array.from(getMemoryStore().values())
      .filter((session) => session.userId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return all[0] ? toPublic(all[0]) : null;
  }

  /**
   * Retrieves a tax preparation session by its unique ID.
   * If userId is provided, validates caller ownership.
   */
  public static async getById(
    sessionId: string,
    userId?: string
  ): Promise<TaxPreparationSession | null> {
    if (SUPABASE_CONFIG.isConfigured()) {
      try {
        const supabase = getServerSupabaseClient() as unknown as {
          from: (tbl: string) => {
            select: (cols: string) => {
              eq: (col: string, val: string) => {
                single: () => Promise<{ data: PreparationSessionRow | null; error: unknown }>;
              };
            };
          };
        };
        const res = await supabase
          .from("tax_preparation_sessions")
          .select("*")
          .eq("id", sessionId)
          .single();
        if (res.data) {
          if (userId && res.data.user_id !== userId) return null;
          return fromRow(res.data);
        }
      } catch (_e) {}
    }

    const session = getMemoryStore().get(sessionId);
    if (!session) return null;
    if (userId && session.userId !== userId) return null;
    return toPublic(session);
  }

  /**
   * Starts a preparation session or resumes the existing open one.
   */
  public static async start(
    userId: string,
    email?: string
  ): Promise<{ session: TaxPreparationSession; created: boolean }> {
    const existing = await this.getCurrent(userId);
    if (existing) {
      return { session: existing, created: false };
    }

    const [profile, taxProfile] = await Promise.all([
      UserProfileStore.getProfile(userId, email),
      UserProfileStore.getTaxProfile(userId),
    ]);

    const profileReused = Boolean(profile.fullName && profile.fullName.trim().length > 0);
    const currentStep: PreparationStep = profileReused ? "income" : "taxpayer_profile";
    const steps = emptyStepMap(currentStep);
    if (profileReused) {
      steps.taxpayer_profile = "completed";
    }

    const now = new Date().toISOString();
    const snapshot: PreparationProfileSnapshot = {
      fullName: profile.fullName,
      filingStatus: taxProfile.filingStatus,
      taxYear: taxProfile.defaultTaxYear,
      hasW2Income: taxProfile.hasW2Income,
      has1099Income: taxProfile.has1099Income,
      hasBusinessExpenses: taxProfile.hasBusinessExpenses,
      stateOfResidence: taxProfile.stateOfResidence,
      profileReused,
    };

    const record: TaxPreparationSession = {
      id: crypto.randomUUID(),
      userId,
      taxProfileId: taxProfile.id,
      taxYear: taxProfile.defaultTaxYear,
      title: `${taxProfile.defaultTaxYear} Tax Preparation`,
      status: profileReused ? "in_progress" : "draft",
      currentStep,
      steps,
      profileSnapshot: snapshot,
      householdSnapshot: emptyHouseholdSnapshot(taxProfile.filingStatus),
      incomeSnapshot: emptyIncomeDiscovery(),
      documentsSnapshot: emptyDocumentsSnapshot(),
      deductionsSnapshot: emptyDeductionDiscovery(),
      calculationId: null,
      calculationSnapshot: null,
      situationSummary: undefined as unknown as TaxSituationSummary,
      calculationReadiness: undefined as unknown as CalculationReadiness,
      suggestedCalculators: [],
      createdAt: now,
      updatedAt: now,
    };

    if (SUPABASE_CONFIG.isConfigured()) {
      const saved = await this.insertDatabase(record);
      return { session: fromRow(saved), created: true };
    }

    getMemoryStore().set(record.id, record);
    return { session: toPublic(record), created: true };
  }

  /**
   * Imports validated inputs from standalone free calculators into the user's
   * tax preparation session with conflict checking and confirmation semantics.
   *
   * SECURITY & INVARIANTS:
   * - Only inputs are imported (taxYear, filingStatus, gross income, withholding).
   * - Client calculated tax totals are NEVER accepted or imported as authoritative.
   * - Returns { session, requiresConfirmation: true, reason } if session already has data
   *   and overwriteExisting is false.
   */
  public static async importFromCalculator(
    userId: string,
    input: ImportCalculatorSessionInput,
    email?: string
  ): Promise<{
    session: TaxPreparationSession;
    requiresConfirmation: boolean;
    reason?: string;
  }> {
    const existing = await this.getCurrent(userId);

    // If an existing session is in progress or completed and not forced overwrite:
    if (existing && !input.overwriteExisting) {
      const hasIncomeData =
        existing.incomeSnapshot.w2s.length > 0 ||
        existing.incomeSnapshot.form1099s.length > 0 ||
        existing.incomeSnapshot.activities.length > 0;

      if (hasIncomeData) {
        return {
          session: existing,
          requiresConfirmation: true,
          reason: `You already have saved income details in your ${existing.taxYear} preparation session. Do you want to update it with your calculator inputs?`,
        };
      }
    }

    if (!existing && !input.overwriteExisting) {
      const latest = await this.getLatest(userId);
      if (latest && latest.status === "completed" && latest.taxYear === input.taxYear) {
        return {
          session: latest,
          requiresConfirmation: true,
          reason: `You have an existing completed tax preparation session for tax year ${latest.taxYear}. Do you want to overwrite it with your calculator inputs?`,
        };
      }
    }

    const situations: ("employer" | "freelance" | "gig" | "business")[] = [];
    const w2s = [];
    const form1099s = [];
    const activities = [];

    if (input.w2WagesCents && input.w2WagesCents > 0) {
      situations.push("employer");
      w2s.push({
        id: crypto.randomUUID(),
        employerName: "Primary Employer (Calculator Transfer)",
        wagesCents: input.w2WagesCents,
        federalWithholdingCents: input.withholdingCents || 0,
      });
    }

    if (input.contractorGrossCents && input.contractorGrossCents > 0) {
      situations.push("freelance");
      form1099s.push({
        id: crypto.randomUUID(),
        incomeType: "freelance" as const,
        payerName: "Primary Client (Calculator Transfer)",
        grossIncomeCents: input.contractorGrossCents,
        federalWithholdingCents: input.w2WagesCents ? 0 : input.withholdingCents || 0,
      });
    }

    if (input.expensesCents && input.expensesCents > 0) {
      situations.push("business");
      activities.push({
        id: crypto.randomUUID(),
        kind: "business" as const,
        activityName: "Independent Contracting / Business",
        grossReceiptsCents: input.contractorGrossCents || 0,
        equipmentSuppliesCents: input.expensesCents,
        softwareSubscriptionsCents: 0,
        homeOfficeVehicleCents: 0,
        otherExpensesCents: 0,
      });
    }

    if (situations.length === 0) {
      situations.push("employer");
    }

    const targetSession = existing || (await this.start(userId, email)).session;

    const updatedProfileSnapshot = {
      ...targetSession.profileSnapshot,
      filingStatus: input.filingStatus,
      taxYear: input.taxYear as TaxYear,
      hasW2Income: (input.w2WagesCents || 0) > 0,
      has1099Income: (input.contractorGrossCents || 0) > 0,
      hasBusinessExpenses: (input.expensesCents || 0) > 0,
    };

    const updatedHousehold = {
      ...targetSession.householdSnapshot,
      filingStatus: input.filingStatus,
    };

    const updatedIncome = {
      situations: Array.from(new Set(situations)),
      w2s,
      form1099s,
      activities,
    };

    const updatedSteps = {
      ...targetSession.steps,
      taxpayer_profile: "completed" as const,
      income: "current" as const,
    };

    const updatedSession: TaxPreparationSession = {
      ...targetSession,
      taxYear: input.taxYear as TaxYear,
      title: `${input.taxYear} Tax Preparation`,
      status: "in_progress",
      currentStep: "income",
      steps: updatedSteps,
      profileSnapshot: updatedProfileSnapshot,
      householdSnapshot: updatedHousehold,
      incomeSnapshot: updatedIncome,
      calculationId: null,
      calculationSnapshot: null,
      updatedAt: new Date().toISOString(),
    };

    const persisted = await this.persist(updatedSession);
    return {
      session: persisted,
      requiresConfirmation: false,
    };
  }

  /**
   * Marks the current step complete and advances the session.
   * Rejects attempts to complete a step the caller has not reached.
   */
  public static async updateProgress(
    userId: string,
    completeStep: PreparationStep
  ): Promise<TaxPreparationSession> {
    const current = await this.getCurrent(userId);
    if (!current) {
      throw new AppError("No open tax preparation session.", 404, "NOT_FOUND");
    }
    if (!PREPARATION_STEPS.includes(completeStep)) {
      throw new AppError("Unknown preparation step.", 422, "VALIDATION_ERROR");
    }
    if (current.currentStep !== completeStep) {
      throw new AppError(
        "Only the current preparation step can be completed.",
        409,
        "INVALID_STEP"
      );
    }
    if (completeStep === "income" && !isCompleteIncomeDiscovery(current.incomeSnapshot)) {
      throw new AppError(
        "Finish income discovery before continuing.",
        422,
        "VALIDATION_ERROR"
      );
    }
    if (completeStep === "deductions") {
      const deductionCheck = isCompleteDeductionDiscovery(current.deductionsSnapshot, current.incomeSnapshot);
      if (!deductionCheck.success) {
        throw new AppError(deductionCheck.message, 422, "VALIDATION_ERROR");
      }
    }
    if (completeStep === "calculation" && !current.calculationSnapshot) {
      throw new AppError(
        "Run tax calculation before continuing to review.",
        422,
        "VALIDATION_ERROR"
      );
    }

    const advanced = completeCurrentStep(current.steps, current.currentStep);
    const updated: TaxPreparationSession = {
      ...current,
      status: advanced.status,
      currentStep: advanced.currentStep,
      steps: advanced.steps,
      updatedAt: new Date().toISOString(),
    };

    if (SUPABASE_CONFIG.isConfigured()) {
      const saved = await this.updateDatabase(updated);
      return fromRow(saved);
    }

    getMemoryStore().set(updated.id, updated);
    return toPublic(updated);
  }

  /**
   * Sets the current active step to an already reached/completed step or taxpayer_profile,
   * allowing the user to review or modify previous sections.
   */
  public static async navigateToStep(
    userId: string,
    targetStep: PreparationStep
  ): Promise<TaxPreparationSession> {
    const current = await this.getCurrent(userId);
    if (!current) {
      throw new AppError("No open tax preparation session.", 404, "NOT_FOUND");
    }
    if (!PREPARATION_STEPS.includes(targetStep)) {
      throw new AppError("Unknown preparation step.", 422, "VALIDATION_ERROR");
    }

    const canNavigate =
      targetStep === current.currentStep ||
      current.steps[targetStep] === "completed" ||
      targetStep === "taxpayer_profile";

    if (!canNavigate) {
      throw new AppError(
        "Cannot jump forward to uncompleted steps.",
        400,
        "INVALID_NAVIGATION"
      );
    }

    if (current.currentStep === targetStep) {
      return current;
    }

    const updated: TaxPreparationSession = {
      ...current,
      currentStep: targetStep,
      updatedAt: new Date().toISOString(),
    };

    return this.persist(updated);
  }

  /**
   * Saves household (filing status, spouse, dependents) answers on the open session.
   * Also keeps profileSnapshot.filingStatus in sync with the selected filing status.
   * SECURITY: userId is the verified server user.
   */
  public static async saveHousehold(
    userId: string,
    household: HouseholdInput
  ): Promise<TaxPreparationSession> {
    const parsed = householdInputSchema.parse(household);
    const current = await this.getCurrent(userId);
    if (!current) {
      throw new AppError("No open tax preparation session.", 404, "NOT_FOUND");
    }

    const updated: TaxPreparationSession = {
      ...current,
      householdSnapshot: parsed,
      profileSnapshot: {
        ...current.profileSnapshot,
        filingStatus: parsed.filingStatus,
      },
      updatedAt: new Date().toISOString(),
    };

    return this.persist(updated);
  }

  /**
   * Saves the authenticated user's income discovery answers on the open session.
   * SECURITY: userId is the verified server user, never a client-supplied id.
   */
  public static async saveIncome(
    userId: string,
    income: IncomeDiscovery
  ): Promise<TaxPreparationSession> {
    const parsed = incomeDiscoverySchema.parse(income);
    const current = await this.getCurrent(userId);
    if (!current) {
      throw new AppError("No open tax preparation session.", 404, "NOT_FOUND");
    }

    const updated: TaxPreparationSession = {
      ...current,
      incomeSnapshot: parsed,
      profileSnapshot: {
        ...current.profileSnapshot,
        hasW2Income: parsed.situations.includes("employer"),
        has1099Income:
          parsed.situations.includes("freelance") || parsed.situations.includes("gig"),
        hasBusinessExpenses: parsed.situations.includes("business") || parsed.situations.includes("gig"),
      },
      updatedAt: new Date().toISOString(),
    };

    if (SUPABASE_CONFIG.isConfigured()) {
      const saved = await this.updateDatabase(updated);
      return fromRow(saved);
    }

    getMemoryStore().set(updated.id, updated);
    return toPublic(updated);
  }

  /**
   * Replaces document metadata on the open session.
   * SECURITY: userId and session id are stamped from the authenticated session.
   * File contents are never stored.
   */
  public static async saveDocuments(
    userId: string,
    input: DocumentsInput
  ): Promise<TaxPreparationSession> {
    const parsed = documentsInputSchema.parse(input);
    const current = await this.getCurrent(userId);
    if (!current) {
      throw new AppError("No open tax preparation session.", 404, "NOT_FOUND");
    }
    for (const document of parsed.documents) {
      if (document.taxYear !== current.taxYear) {
        throw new AppError("Document tax year must match the preparation session.", 422, "VALIDATION_ERROR");
      }
    }

    const now = new Date().toISOString();
    const updated: TaxPreparationSession = {
      ...current,
      documentsSnapshot: {
        documents: stampDocuments(
          parsed.documents,
          current.id,
          current.userId,
          current.documentsSnapshot.documents,
          now
        ),
      },
      updatedAt: now,
    };

    return this.persist(updated);
  }

  /**
   * Saves deduction discovery answers. Amounts are stored only.
   * The tax engine remains the only calculator.
   */
  public static async saveDeductions(
    userId: string,
    input: Omit<DeductionDiscovery, "saved">
  ): Promise<TaxPreparationSession> {
    const parsed = deductionDiscoveryInputSchema.parse(input);
    const current = await this.getCurrent(userId);
    if (!current) {
      throw new AppError("No open tax preparation session.", 404, "NOT_FOUND");
    }

    const discovery: DeductionDiscovery = {
      saved: true,
      hasBusinessExpenses: parsed.hasBusinessExpenses,
      standardDeductionAcknowledged: parsed.standardDeductionAcknowledged,
      entries: parsed.entries,
      guidedAnswers: parsed.guidedAnswers,
    };
    const check = isCompleteDeductionDiscovery(discovery, current.incomeSnapshot);
    if (!check.success) {
      throw new AppError(check.message, 422, "VALIDATION_ERROR");
    }

    const updated: TaxPreparationSession = {
      ...current,
      deductionsSnapshot: discovery,
      profileSnapshot: {
        ...current.profileSnapshot,
        hasBusinessExpenses: Boolean(parsed.hasBusinessExpenses),
      },
      updatedAt: new Date().toISOString(),
    };

    return this.persist(updated);
  }

  /**
   * Runs the deterministic tax calculation on the open session, persists the
   * calculation result to calculation history, links it to the preparation session,
   * and advances progress to the review step.
   *
   * SECURITY & COMPLIANCE:
   * - Deterministic tax engine is the only computation authority.
   * - Input validation prevents calculation on incomplete/invalid sessions.
   * - Persists into tax_calculations table with authenticated ownership.
   */
  public static async calculate(userId: string): Promise<TaxPreparationSession> {
    const current = await this.getCurrent(userId);
    if (!current) {
      throw new AppError("No open tax preparation session.", 404, "NOT_FOUND");
    }

    const readiness = assessCalculationReadiness({
      profile: current.profileSnapshot,
      steps: current.steps,
      household: current.householdSnapshot,
      income: current.incomeSnapshot,
      documents: current.documentsSnapshot,
      deductions: current.deductionsSnapshot,
    });

    if (!readiness.ready) {
      const errorDetails = [...readiness.missing, ...readiness.errors].join("; ");
      throw new AppError(
        `Cannot calculate tax: Preparation session is incomplete (${errorDetails}).`,
        422,
        "VALIDATION_ERROR"
      );
    }

    const execution = executePreparationCalculation({
      taxYear: current.taxYear,
      profileSnapshot: current.profileSnapshot,
      steps: current.steps,
      householdSnapshot: current.householdSnapshot,
      incomeSnapshot: current.incomeSnapshot,
      documentsSnapshot: current.documentsSnapshot,
      deductionsSnapshot: current.deductionsSnapshot,
    });

    const now = new Date().toISOString();
    const calculationId = crypto.randomUUID();

    const calculationResult: TaxCalculationResult = {
      ...execution.result,
      calculationId,
    };

    const calculationRecord: TaxCalculationRecord = {
      id: calculationId,
      userId,
      calculatorType: execution.calculatorType,
      taxYear: current.taxYear,
      filingStatus: current.profileSnapshot.filingStatus,
      title: `${current.taxYear} Preparation Calculation`,
      inputSnapshot: execution.inputSnapshot,
      resultSnapshot: calculationResult,
      engineVersion: execution.result.engineVersion,
      rulesVersion: execution.result.rulesVersion,
      createdAt: now,
      updatedAt: now,
    };

    const savedCalculation = await TaxCalculationStore.save(calculationRecord);

    const updatedSteps: PreparationStepMap = {
      ...current.steps,
      taxpayer_profile: "completed",
      income: "completed",
      documents: "completed",
      deductions: "completed",
      calculation: "completed",
      review: "current",
    };

    const updated: TaxPreparationSession = {
      ...current,
      status: "review",
      currentStep: "review",
      steps: updatedSteps,
      calculationId: savedCalculation.id,
      calculationSnapshot: calculationResult,
      updatedAt: now,
    };

    return this.persist(updated);
  }

  private static async persist(updated: TaxPreparationSession): Promise<TaxPreparationSession> {
    if (SUPABASE_CONFIG.isConfigured()) {
      const saved = await this.updateDatabase(updated);
      return fromRow(saved);
    }
    getMemoryStore().set(updated.id, updated);
    return toPublic(updated);
  }

  public static clear(): void {
    getMemoryStore().clear();
  }

  private static async selectOpenFromDatabase(userId: string): Promise<PreparationSessionRow | null> {
    const supabase = getServerSupabaseClient() as unknown as {
      from: (table: string) => {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            neq: (col: string, val: string) => {
              order: (col: string, opts: { ascending: boolean }) => {
                limit: (n: number) => {
                  maybeSingle: () => Promise<{ data: PreparationSessionRow | null; error: { message: string } | null }>;
                };
              };
            };
          };
        };
      };
    };

    const { data, error } = await supabase
      .from("tax_preparation_sessions")
      .select("*")
      .eq("user_id", userId)
      .neq("status", "completed")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new AppError("Unable to load the preparation session.", 500, "PREPARATION_STORE_ERROR");
    }
    return data;
  }

  private static async insertDatabase(record: TaxPreparationSession): Promise<PreparationSessionRow> {
    const supabase = getServerSupabaseClient() as unknown as {
      from: (table: string) => {
        insert: (values: unknown) => {
          select: () => {
            single: () => Promise<{ data: PreparationSessionRow | null; error: { message: string } | null }>;
          };
        };
      };
    };

    const { data, error } = await supabase
      .from("tax_preparation_sessions")
      .insert({
        id: record.id,
        user_id: record.userId,
        tax_profile_id: record.taxProfileId,
        tax_year: record.taxYear,
        title: record.title,
        status: record.status,
        current_step: record.currentStep,
        steps: record.steps,
        profile_snapshot: record.profileSnapshot,
        household_snapshot: record.householdSnapshot,
        income_snapshot: record.incomeSnapshot,
        documents_snapshot: record.documentsSnapshot,
        deductions_snapshot: record.deductionsSnapshot,
        calculation_id: record.calculationId || null,
        calculation_snapshot: record.calculationSnapshot || null,
        created_at: record.createdAt,
        updated_at: record.updatedAt,
      })
      .select()
      .single();

    if (error || !data) {
      throw new AppError("Unable to start the preparation session.", 500, "PREPARATION_STORE_ERROR");
    }
    return data;
  }

  private static async updateDatabase(record: TaxPreparationSession): Promise<PreparationSessionRow> {
    const supabase = getServerSupabaseClient() as unknown as {
      from: (table: string) => {
        update: (values: unknown) => {
          eq: (col: string, val: string) => {
            eq: (col: string, val: string) => {
              select: () => {
                single: () => Promise<{ data: PreparationSessionRow | null; error: { message: string } | null }>;
              };
            };
          };
        };
      };
    };

    const { data, error } = await supabase
      .from("tax_preparation_sessions")
      .update({
        status: record.status,
        current_step: record.currentStep,
        steps: record.steps,
        profile_snapshot: record.profileSnapshot,
        household_snapshot: record.householdSnapshot,
        income_snapshot: record.incomeSnapshot,
        documents_snapshot: record.documentsSnapshot,
        deductions_snapshot: record.deductionsSnapshot,
        calculation_id: record.calculationId || null,
        calculation_snapshot: record.calculationSnapshot || null,
        updated_at: record.updatedAt,
      })
      .eq("id", record.id)
      .eq("user_id", record.userId)
      .select()
      .single();

    if (error || !data) {
      throw new AppError("Unable to update the preparation session.", 500, "PREPARATION_STORE_ERROR");
    }
    return data;
  }
}
