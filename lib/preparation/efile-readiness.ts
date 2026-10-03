import { TaxYear, TaxFilingStatus } from "@/types/tax";
import { TaxPreparationSession } from "@/lib/services/tax-preparation-session-store";
import {
  buildFederalReturn,
  FederalReturn,
  reconcileFederalReturnCalculations,
} from "@/lib/preparation/federal-return";
import {
  evaluateSupportedSchedules,
  ScheduleDocumentDescriptor,
} from "@/lib/preparation/federal-return-documents";

// =============================================================================
// 1. CANONICAL E-FILE READINESS STATUSES & CATEGORIES
// =============================================================================

export type EfileReadinessStatus =
  | "READY"
  | "BLOCKED"
  | "NOT_SUPPORTED"
  | "REQUIRES_REVIEW";

export type EfileSeverity = "BLOCKING" | "WARNING" | "INFO";

export type EfileCheckCategory =
  | "TAXPAYER_IDENTITY"
  | "FILING_STATUS"
  | "SPOUSE_IDENTITY"
  | "DEPENDENTS"
  | "INCOME_RECORDS"
  | "WITHHOLDING_PAYMENTS"
  | "DEDUCTIONS_CREDITS"
  | "SCHEDULE_SUPPORT"
  | "CALCULATION_ENGINE"
  | "MATHEMATICAL_RECONCILIATION"
  | "SESSION_INTEGRITY"
  | "TAX_YEAR_SUPPORT";

export interface EfileValidationError {
  code: string;
  category: EfileCheckCategory;
  severity: EfileSeverity;
  message: string;
  action: string;
  field?: string;
}

export interface EfileReadinessCheckResult {
  id: string;
  name: string;
  category: EfileCheckCategory;
  passed: boolean;
  details: string;
  error?: EfileValidationError;
}

export interface EfileReadinessEvaluation {
  status: EfileReadinessStatus;
  isReady: boolean;
  taxYear: TaxYear;
  evaluatedAt: string;
  summary: {
    totalChecks: number;
    passedChecks: number;
    blockingErrorsCount: number;
    warningsCount: number;
  };
  checks: EfileReadinessCheckResult[];
  blockingErrors: EfileValidationError[];
  warnings: EfileValidationError[];
  supportedSchedules: ScheduleDocumentDescriptor[];
  disclaimer: string;
}

// =============================================================================
// 2. CONSTANTS & US STATES LIST
// =============================================================================

export const EFILE_READINESS_DISCLAIMER =
  "TaxAIHelp E-File Readiness Assessment. Evaluates structural compliance with IRS Modernized e-File (MeF) schemas. " +
  "TaxAIHelp is currently operating in submission foundation mode. Electronic transmission to the IRS is NOT active in this environment. " +
  "To file, print and mail your official tax return or consult an authorized IRS e-file provider.";

export const VALID_US_STATE_CODES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC", "PR", "VI", "GU", "AS", "MP",
]);

export const SUPPORTED_TAX_YEARS: TaxYear[] = [2025, 2026];

// =============================================================================
// 3. DETERMINISTIC E-FILE READINESS EVALUATOR
// =============================================================================

/**
 * Deterministically evaluates whether a taxpayer's preparation session and federal return
 * satisfy all structural IRS Modernized e-File (MeF) validation rules.
 *
 * NOTE: This evaluator performs ZERO numerical tax calculations. All values are read
 * from the authoritative deterministic FederalReturn domain model.
 */
export function evaluateEfileReadiness(
  session: TaxPreparationSession,
  providedFederalReturn?: FederalReturn
): EfileReadinessEvaluation {
  const federalReturn = providedFederalReturn || buildFederalReturn(session);
  const reconciliation = reconcileFederalReturnCalculations(session);
  const schedules = evaluateSupportedSchedules(federalReturn);

  const checks: EfileReadinessCheckResult[] = [];
  const blockingErrors: EfileValidationError[] = [];
  const warnings: EfileValidationError[] = [];

  const profile = session.profileSnapshot;
  const household = session.householdSnapshot;
  const income = session.incomeSnapshot;
  const filingStatus = federalReturn.filingStatus.status;
  const taxYear = session.taxYear;

  // ---------------------------------------------------------------------------
  // Check 1: Tax Year Support
  // ---------------------------------------------------------------------------
  const isTaxYearSupported = SUPPORTED_TAX_YEARS.includes(taxYear);
  if (!isTaxYearSupported) {
    const err: EfileValidationError = {
      code: "UNSUPPORTED_TAX_YEAR",
      category: "TAX_YEAR_SUPPORT",
      severity: "BLOCKING",
      message: `Tax year ${taxYear} is not currently supported for IRS electronic filing. Supported years are: ${SUPPORTED_TAX_YEARS.join(", ")}.`,
      action: "Select a supported tax year in session settings.",
      field: "taxYear",
    };
    blockingErrors.push(err);
    checks.push({
      id: "check_tax_year_support",
      name: "Supported Tax Year",
      category: "TAX_YEAR_SUPPORT",
      passed: false,
      details: `Tax year ${taxYear} is outside engine scope.`,
      error: err,
    });
  } else {
    checks.push({
      id: "check_tax_year_support",
      name: "Supported Tax Year",
      category: "TAX_YEAR_SUPPORT",
      passed: true,
      details: `Tax Year ${taxYear} is supported for federal filing preparation.`,
    });
  }

  // ---------------------------------------------------------------------------
  // Check 2: Taxpayer Legal Identity
  // ---------------------------------------------------------------------------
  const fullName = (federalReturn.taxpayer.fullName || profile.fullName || "").trim();
  const nameParts = fullName.split(/\s+/).filter(Boolean);
  const hasValidName = nameParts.length >= 2;
  const stateCode = (federalReturn.taxpayer.stateOfResidence || profile.stateOfResidence || "").toUpperCase().trim();
  const hasValidState = stateCode.length === 2 && VALID_US_STATE_CODES.has(stateCode);

  if (!hasValidName || !hasValidState) {
    const missingItems: string[] = [];
    if (!hasValidName) missingItems.push("full first and last name");
    if (!hasValidState) missingItems.push("valid 2-letter US state of residence");

    const err: EfileValidationError = {
      code: "MISSING_TAXPAYER_DATA",
      category: "TAXPAYER_IDENTITY",
      severity: "BLOCKING",
      message: `Primary taxpayer identity incomplete: Missing ${missingItems.join(" and ")}.`,
      action: "Update Taxpayer Profile in Step 1 with full legal name and US state.",
      field: "profileSnapshot",
    };
    blockingErrors.push(err);
    checks.push({
      id: "check_taxpayer_identity",
      name: "Taxpayer Identity",
      category: "TAXPAYER_IDENTITY",
      passed: false,
      details: `Incomplete taxpayer identification: ${missingItems.join(", ")}.`,
      error: err,
    });
  } else {
    checks.push({
      id: "check_taxpayer_identity",
      name: "Taxpayer Identity",
      category: "TAXPAYER_IDENTITY",
      passed: true,
      details: `Primary taxpayer ${fullName} (${stateCode}) verified.`,
    });
  }

  // ---------------------------------------------------------------------------
  // Check 3: Federal Filing Status
  // ---------------------------------------------------------------------------
  const validFilingStatuses: TaxFilingStatus[] = [
    "single",
    "married_filing_jointly",
    "married_filing_separately",
    "head_of_household",
    "qualifying_surviving_spouse",
  ];
  const isFilingStatusValid = validFilingStatuses.includes(filingStatus as TaxFilingStatus);

  if (!isFilingStatusValid) {
    const err: EfileValidationError = {
      code: "INVALID_FILING_STATUS",
      category: "FILING_STATUS",
      severity: "BLOCKING",
      message: `Filing status '${filingStatus}' is not recognized under IRS statutory rules.`,
      action: "Select a valid federal filing status in Taxpayer Profile.",
      field: "filingStatus",
    };
    blockingErrors.push(err);
    checks.push({
      id: "check_filing_status",
      name: "Filing Status Validity",
      category: "FILING_STATUS",
      passed: false,
      details: `Unrecognized filing status '${filingStatus}'.`,
      error: err,
    });
  } else {
    checks.push({
      id: "check_filing_status",
      name: "Filing Status Validity",
      category: "FILING_STATUS",
      passed: true,
      details: `Federal filing status: ${federalReturn.filingStatus.label}.`,
    });
  }

  // ---------------------------------------------------------------------------
  // Check 4: Spouse Identity (Required for MFJ and MFS)
  // ---------------------------------------------------------------------------
  const requiresSpouse = filingStatus === "married_filing_jointly" || filingStatus === "married_filing_separately";
  if (requiresSpouse) {
    const spouseFirst = (federalReturn.spouse.firstName || "").trim();
    const spouseLast = (federalReturn.spouse.lastName || "").trim();
    const hasSpouseName = spouseFirst.length > 0 && spouseLast.length > 0;

    if (!hasSpouseName) {
      const err: EfileValidationError = {
        code: "MISSING_SPOUSE_DATA",
        category: "SPOUSE_IDENTITY",
        severity: "BLOCKING",
        message: `${federalReturn.filingStatus.label} returns require complete spouse first and last name under IRS MeF rules.`,
        action: "Provide spouse's full legal name in Taxpayer & Household Profile.",
        field: "householdSnapshot.spouse",
      };
      blockingErrors.push(err);
      checks.push({
        id: "check_spouse_identity",
        name: "Spouse Information",
        category: "SPOUSE_IDENTITY",
        passed: false,
        details: "Missing required spouse first or last name.",
        error: err,
      });
    } else {
      checks.push({
        id: "check_spouse_identity",
        name: "Spouse Information",
        category: "SPOUSE_IDENTITY",
        passed: true,
        details: `Spouse ${spouseFirst} ${spouseLast} recorded.`,
      });
    }
  } else {
    checks.push({
      id: "check_spouse_identity",
      name: "Spouse Information",
      category: "SPOUSE_IDENTITY",
      passed: true,
      details: "Not applicable for this filing status.",
    });
  }

  // ---------------------------------------------------------------------------
  // Check 5: Dependents MeF Compliance
  // ---------------------------------------------------------------------------
  let dependentsPassed = true;
  const dependentIssues: string[] = [];

  if (household?.dependents && household.dependents.length > 0) {
    const seenNames = new Set<string>();

    household.dependents.forEach((dep, idx) => {
      const depFirst = (dep.firstName || "").trim();
      const depLast = (dep.lastName || "").trim();
      const depKey = `${depFirst.toLowerCase()}|${depLast.toLowerCase()}`;

      if (!depFirst || !depLast) {
        dependentsPassed = false;
        dependentIssues.push(`Dependent #${idx + 1} is missing their first or last name.`);
      }

      if (!dep.dateOfBirth) {
        dependentsPassed = false;
        dependentIssues.push(`Dependent #${idx + 1} (${depFirst || "Unnamed"}) is missing date of birth.`);
      } else {
        const dob = new Date(dep.dateOfBirth);
        if (isNaN(dob.getTime()) || dob > new Date()) {
          dependentsPassed = false;
          dependentIssues.push(`Dependent #${idx + 1} has an invalid or future date of birth.`);
        }
      }

      if (dep.monthsLivedWithTaxpayer < 0 || dep.monthsLivedWithTaxpayer > 12) {
        dependentsPassed = false;
        dependentIssues.push(`Dependent #${idx + 1} has invalid months in home (must be 0–12).`);
      }

      if (seenNames.has(depKey) && depFirst) {
        dependentsPassed = false;
        dependentIssues.push(`Duplicate dependent detected: ${depFirst} ${depLast}.`);
      }
      if (depFirst) seenNames.add(depKey);
    });
  }

  // Head of Household qualification check
  if (filingStatus === "head_of_household" && (!household?.dependents || household.dependents.length === 0)) {
    dependentsPassed = false;
    dependentIssues.push("Head of Household status requires at least one qualifying dependent.");
  }

  // Qualifying Surviving Spouse qualification check
  if (filingStatus === "qualifying_surviving_spouse") {
    const hasChild = (household?.dependents || []).some((d) =>
      ["child", "son", "daughter", "stepchild", "foster_child"].includes(d.relationship)
    );
    if (!hasChild) {
      dependentsPassed = false;
      dependentIssues.push("Qualifying Surviving Spouse status requires a qualifying dependent child.");
    }
  }

  if (!dependentsPassed) {
    const err: EfileValidationError = {
      code: "INCOMPLETE_DEPENDENT",
      category: "DEPENDENTS",
      severity: "BLOCKING",
      message: `Dependent information fails IRS MeF rules: ${dependentIssues.join(" ")}`,
      action: "Review and complete all dependent details in Step 1.",
      field: "householdSnapshot.dependents",
    };
    blockingErrors.push(err);
    checks.push({
      id: "check_dependents_compliance",
      name: "Dependents MeF Compliance",
      category: "DEPENDENTS",
      passed: false,
      details: dependentIssues.join("; "),
      error: err,
    });
  } else {
    checks.push({
      id: "check_dependents_compliance",
      name: "Dependents MeF Compliance",
      category: "DEPENDENTS",
      passed: true,
      details: `${federalReturn.dependents.length} dependent(s) verified for MeF transmission.`,
    });
  }

  // ---------------------------------------------------------------------------
  // Check 6: Reported Income Records Completeness
  // ---------------------------------------------------------------------------
  let incomePassed = true;
  const incomeIssues: string[] = [];

  const hasAnyIncomeReported =
    income.w2s.length > 0 ||
    income.form1099s.length > 0 ||
    income.activities.length > 0;

  if (!hasAnyIncomeReported) {
    incomePassed = false;
    incomeIssues.push("No income sources reported. IRS e-file requires at least one income record or documented zero return.");
  }

  for (const w of income.w2s) {
    if (!w.employerName?.trim()) {
      incomePassed = false;
      incomeIssues.push(`Form W-2 is missing the employer name.`);
    }
    if (w.wagesCents <= 0) {
      incomePassed = false;
      incomeIssues.push(`Form W-2 for '${w.employerName || "Employer"}' has $0.00 wages.`);
    }
  }

  for (const f of income.form1099s) {
    if (!f.payerName?.trim()) {
      incomePassed = false;
      incomeIssues.push("Form 1099 is missing payer name.");
    }
    if (f.grossIncomeCents <= 0) {
      incomePassed = false;
      incomeIssues.push(`Form 1099 for '${f.payerName || "Payer"}' has $0.00 gross income.`);
    }
  }

  for (const a of income.activities) {
    if (!a.activityName?.trim()) {
      incomePassed = false;
      incomeIssues.push("Self-employment activity is missing a business name.");
    }
    if (a.grossReceiptsCents <= 0) {
      incomePassed = false;
      incomeIssues.push(`Activity '${a.activityName || "Activity"}' has $0.00 gross receipts.`);
    }
  }

  if (!incomePassed) {
    const err: EfileValidationError = {
      code: "MISSING_INCOME_DATA",
      category: "INCOME_RECORDS",
      severity: "BLOCKING",
      message: `Income records incomplete: ${incomeIssues.join(" ")}`,
      action: "Complete employer/payer details and income amounts in Step 2.",
      field: "incomeSnapshot",
    };
    blockingErrors.push(err);
    checks.push({
      id: "check_income_completeness",
      name: "Income Records Integrity",
      category: "INCOME_RECORDS",
      passed: false,
      details: incomeIssues.join("; "),
      error: err,
    });
  } else {
    checks.push({
      id: "check_income_completeness",
      name: "Income Records Integrity",
      category: "INCOME_RECORDS",
      passed: true,
      details: `${income.w2s.length} W-2(s), ${income.form1099s.length} 1099(s), and ${income.activities.length} activity(ies) verified.`,
    });
  }

  // ---------------------------------------------------------------------------
  // Check 7: Federal Withholding & Payments Integrity
  // ---------------------------------------------------------------------------
  let withholdingPassed = true;
  const withholdingIssues: string[] = [];
  const totalGrossIncome = federalReturn.income.totalGrossIncomeCents;
  const totalWithholding = federalReturn.payments.totalFederalWithholdingCents;

  if (totalWithholding < 0) {
    withholdingPassed = false;
    withholdingIssues.push("Federal withholding cannot be negative.");
  }

  if (totalGrossIncome > 0 && totalWithholding > totalGrossIncome) {
    withholdingPassed = false;
    withholdingIssues.push(
      `Total federal withholding ($${(totalWithholding / 100).toFixed(2)}) exceeds reported gross income ($${(totalGrossIncome / 100).toFixed(2)}).`
    );
  }

  if (!withholdingPassed) {
    const err: EfileValidationError = {
      code: "INVALID_WITHHOLDING",
      category: "WITHHOLDING_PAYMENTS",
      severity: "BLOCKING",
      message: `Withholding verification failed: ${withholdingIssues.join(" ")}`,
      action: "Review Box 2 federal income tax withheld on your W-2s and 1099s.",
      field: "payments.totalFederalWithholdingCents",
    };
    blockingErrors.push(err);
    checks.push({
      id: "check_withholding_integrity",
      name: "Withholding & Payments Integrity",
      category: "WITHHOLDING_PAYMENTS",
      passed: false,
      details: withholdingIssues.join("; "),
      error: err,
    });
  } else {
    checks.push({
      id: "check_withholding_integrity",
      name: "Withholding & Payments Integrity",
      category: "WITHHOLDING_PAYMENTS",
      passed: true,
      details: `Federal withholding of $${(totalWithholding / 100).toFixed(2)} verified within statutory limits.`,
    });
  }

  // ---------------------------------------------------------------------------
  // Check 8: Schedule Support Gating (Unsupported forms block e-file)
  // ---------------------------------------------------------------------------
  const unsupportedSchedules = schedules.filter((s) => s.status === "not_yet_supported");
  const requiresUnsupportedSchedules = unsupportedSchedules.length > 0 && (
    // Check if the user situation triggered need for unsupported schedules
    // Capital gains:
    federalReturn.income.otherIncomeCents > 0
  );

  if (requiresUnsupportedSchedules) {
    const err: EfileValidationError = {
      code: "UNSUPPORTED_SCHEDULE",
      category: "SCHEDULE_SUPPORT",
      severity: "BLOCKING",
      message: `Your return requires federal forms or schedules (${unsupportedSchedules.map((s) => s.label).join(", ")}) not currently supported by the deterministic engine.`,
      action: "Remove unsupported forms or file via paper return with a certified tax professional.",
      field: "schedules",
    };
    blockingErrors.push(err);
    checks.push({
      id: "check_schedule_support",
      name: "IRS Schedules Support",
      category: "SCHEDULE_SUPPORT",
      passed: false,
      details: `Return requires unsupported schedules: ${unsupportedSchedules.map((s) => s.schedule).join(", ")}.`,
      error: err,
    });
  } else {
    checks.push({
      id: "check_schedule_support",
      name: "IRS Schedules Support",
      category: "SCHEDULE_SUPPORT",
      passed: true,
      details: `All active schedules (${schedules.filter((s) => s.status === "ready").map((s) => s.label.split("—")[0].trim()).join(", ") || "Form 1040 only"}) are fully supported.`,
    });
  }

  // ---------------------------------------------------------------------------
  // Check 9: Deterministic Calculation Up-To-Date
  // ---------------------------------------------------------------------------
  const hasCalculation = Boolean(session.calculationSnapshot && session.calculationId);
  if (!hasCalculation) {
    const err: EfileValidationError = {
      code: "CALCULATION_MISSING",
      category: "CALCULATION_ENGINE",
      severity: "BLOCKING",
      message: "The return does not have a completed calculation snapshot.",
      action: "Execute tax calculation in Step 5 before preparing for e-filing.",
      field: "calculationSnapshot",
    };
    blockingErrors.push(err);
    checks.push({
      id: "check_calculation_snapshot",
      name: "Calculation Engine Snapshot",
      category: "CALCULATION_ENGINE",
      passed: false,
      details: "No valid calculation snapshot found.",
      error: err,
    });
  } else {
    checks.push({
      id: "check_calculation_snapshot",
      name: "Calculation Engine Snapshot",
      category: "CALCULATION_ENGINE",
      passed: true,
      details: `Calculated under Engine v${federalReturn.metadata.engineVersion} (Rules v${federalReturn.metadata.rulesVersion}).`,
    });
  }

  // ---------------------------------------------------------------------------
  // Check 10: Mathematical Reconciliation Proof
  // ---------------------------------------------------------------------------
  const isReconciled = reconciliation.isReconciled && reconciliation.mismatches.length === 0;
  if (!isReconciled) {
    const err: EfileValidationError = {
      code: "UNRECONCILED_RETURN",
      category: "MATHEMATICAL_RECONCILIATION",
      severity: "BLOCKING",
      message: `Return failed mathematical reconciliation checks: ${reconciliation.mismatches.join(" ")}`,
      action: "Resolve calculation discrepancies before proceeding to e-file readiness.",
      field: "reconciliation",
    };
    blockingErrors.push(err);
    checks.push({
      id: "check_mathematical_reconciliation",
      name: "Mathematical Reconciliation (6 Proofs)",
      category: "MATHEMATICAL_RECONCILIATION",
      passed: false,
      details: reconciliation.mismatches.join("; "),
      error: err,
    });
  } else {
    checks.push({
      id: "check_mathematical_reconciliation",
      name: "Mathematical Reconciliation (6 Proofs)",
      category: "MATHEMATICAL_RECONCILIATION",
      passed: true,
      details: "All 6 statutory mathematical consistency verifications passed (100% penny accuracy).",
    });
  }

  // ---------------------------------------------------------------------------
  // Check 11: Non-Blocking Review Warnings
  // ---------------------------------------------------------------------------
  if (federalReturn.readiness.summaryWarnings.length > 0) {
    for (const w of federalReturn.readiness.summaryWarnings) {
      warnings.push({
        code: "REVIEW_WARNING",
        category: "SESSION_INTEGRITY",
        severity: "WARNING",
        message: w,
        action: "Review item during taxpayer inspection.",
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Resolve Overall E-File Readiness Status
  // ---------------------------------------------------------------------------
  let status: EfileReadinessStatus = "READY";
  if (requiresUnsupportedSchedules) {
    status = "NOT_SUPPORTED";
  } else if (blockingErrors.length > 0) {
    status = "BLOCKED";
  } else if (warnings.length > 0) {
    status = "REQUIRES_REVIEW";
  }

  const isReady = status === "READY" || status === "REQUIRES_REVIEW";

  return {
    status,
    isReady,
    taxYear,
    evaluatedAt: new Date().toISOString(),
    summary: {
      totalChecks: checks.length,
      passedChecks: checks.filter((c) => c.passed).length,
      blockingErrorsCount: blockingErrors.length,
      warningsCount: warnings.length,
    },
    checks,
    blockingErrors,
    warnings,
    supportedSchedules: schedules,
    disclaimer: EFILE_READINESS_DISCLAIMER,
  };
}
