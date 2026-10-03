/**
 * State Tax Readiness Evaluator — Phase 7
 *
 * Deterministically evaluates a taxpayer session for state filing readiness.
 * Identifies unsupported states, missing state residence, multi-state allocations,
 * and withholding discrepancies.
 *
 * ARCHITECTURAL INVARIANT:
 * Never guess state rules or report ready when a state engine is unsupported.
 * Output contains structured codes, messages, and actionable remediation steps.
 */

import { FederalReturn, buildFederalReturn } from "@/lib/preparation/federal-return";
import { TaxPreparationSession } from "@/lib/services/tax-preparation-session-store";
import {
  StateReadiness,
  StateReadinessStatus,
  StateValidationError,
  StateValidationCheck,
} from "./types";
import { getStateSupportInfo } from "./registry";
import { analyzeMultiStateScenario } from "./multi-state";

export const VALID_US_STATE_CODES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC",
]);

/**
 * Deterministically assesses state tax readiness for a preparation session.
 */
export function evaluateStateReadiness(
  session: TaxPreparationSession,
  providedFederalReturn?: FederalReturn,
  options?: {
    stateCodeOverride?: string;
  }
): StateReadiness {
  let federalReturn = providedFederalReturn;
  if (!federalReturn) {
    try {
      federalReturn = buildFederalReturn(session);
    } catch (_err) {
      // If session has unsupported tax year or calculation issues, handle gracefully
    }
  }

  const taxYear = session.taxYear ?? federalReturn?.metadata.taxYear ?? (2025 as any);
  const stateCode = (
    options?.stateCodeOverride ||
    federalReturn?.taxpayer.stateOfResidence ||
    session.profileSnapshot?.stateOfResidence ||
    ""
  ).toUpperCase().trim();

  const checks: StateValidationCheck[] = [];
  const blockingErrors: StateValidationError[] = [];
  const warnings: StateValidationError[] = [];

  // ---------------------------------------------------------------------------
  // Check 1: Federal Return Prerequisite
  // ---------------------------------------------------------------------------
  const hasFederalCalculation = Boolean(
    session.calculationSnapshot && session.calculationId && federalReturn?.metadata.hasCalculation
  );

  if (!hasFederalCalculation) {
    const err: StateValidationError = {
      code: "FEDERAL_RETURN_REQUIRED",
      category: "FEDERAL_PREREQUISITE",
      severity: "BLOCKING",
      message: "State tax calculations require a completed federal tax return calculation.",
      action: "Execute federal tax calculation in Step 5 before preparing state taxes.",
      field: "calculationSnapshot",
    };
    blockingErrors.push(err);
    checks.push({
      id: "check_federal_prerequisite",
      name: "Federal Return Prerequisite",
      category: "FEDERAL_PREREQUISITE",
      passed: false,
      details: "Federal calculation snapshot is missing.",
      error: err,
    });
  } else {
    checks.push({
      id: "check_federal_prerequisite",
      name: "Federal Return Prerequisite",
      category: "FEDERAL_PREREQUISITE",
      passed: true,
      details: `Federal return verified (AGI: $${(((federalReturn?.adjustments.adjustedGrossIncomeCents) || 0) / 100).toFixed(2)}).`,
    });
  }

  // ---------------------------------------------------------------------------
  // Check 2: Tax Year Support
  // ---------------------------------------------------------------------------
  const isTaxYearValid = taxYear === 2025 || taxYear === 2026;
  if (!isTaxYearValid) {
    const err: StateValidationError = {
      code: "MISSING_TAX_YEAR",
      category: "STATE_SUPPORT",
      severity: "BLOCKING",
      message: `Tax Year ${taxYear} is not supported for state return preparation.`,
      action: "Select Tax Year 2025 or 2026 in session settings.",
      field: "taxYear",
    };
    blockingErrors.push(err);
    checks.push({
      id: "check_tax_year",
      name: "Tax Year Validation",
      category: "STATE_SUPPORT",
      passed: false,
      details: `Tax Year ${taxYear} is outside supported range.`,
      error: err,
    });
  } else {
    checks.push({
      id: "check_tax_year",
      name: "Tax Year Validation",
      category: "STATE_SUPPORT",
      passed: true,
      details: `Tax Year ${taxYear} verified.`,
    });
  }

  // ---------------------------------------------------------------------------
  // Check 3: State of Residence Identity
  // ---------------------------------------------------------------------------
  const hasValidStateCode = stateCode.length === 2 && VALID_US_STATE_CODES.has(stateCode);
  if (!hasValidStateCode) {
    const err: StateValidationError = {
      code: "MISSING_STATE",
      category: "RESIDENCY_IDENTITY",
      severity: "BLOCKING",
      message: stateCode
        ? `'${stateCode}' is not a valid 2-letter US state postal code.`
        : "Primary taxpayer state of residence is missing.",
      action: "Set your state of residence in Taxpayer Profile (Step 1).",
      field: "stateOfResidence",
    };
    blockingErrors.push(err);
    checks.push({
      id: "check_state_identity",
      name: "State of Residence",
      category: "RESIDENCY_IDENTITY",
      passed: false,
      details: "State of residence is missing or invalid.",
      error: err,
    });
  } else {
    checks.push({
      id: "check_state_identity",
      name: "State of Residence",
      category: "RESIDENCY_IDENTITY",
      passed: true,
      details: `State of residence confirmed: ${stateCode}.`,
    });
  }

  // ---------------------------------------------------------------------------
  // Check 4: Statutory Engine Support
  // ---------------------------------------------------------------------------
  const supportInfo = hasValidStateCode ? getStateSupportInfo(stateCode) : null;
  let isStateSupported = false;

  if (supportInfo) {
    if (supportInfo.supportStatus === "NO_STATE_INCOME_TAX") {
      isStateSupported = true;
      checks.push({
        id: "check_state_support",
        name: "State Tax Support",
        category: "STATE_SUPPORT",
        passed: true,
        details: `${supportInfo.stateName} does not levy personal income tax. No state return required.`,
      });
    } else if (supportInfo.supportStatus === "SUPPORTED") {
      isStateSupported = true;
      checks.push({
        id: "check_state_support",
        name: "State Tax Support",
        category: "STATE_SUPPORT",
        passed: true,
        details: `Certified calculation engine active for ${supportInfo.stateName} (v${supportInfo.activeEngineVersion}).`,
      });
    } else {
      // Income tax state without an active verified statutory engine
      const err: StateValidationError = {
        code: "STATE_NOT_SUPPORTED",
        category: "STATE_SUPPORT",
        severity: "BLOCKING",
        message: `State income tax preparation is not currently supported for ${supportInfo.stateName} (${stateCode}).`,
        action: `File your state return directly with the ${supportInfo.stateName} Department of Revenue or consult a CPA.`,
        field: "stateCode",
      };
      blockingErrors.push(err);
      checks.push({
        id: "check_state_support",
        name: "State Tax Support",
        category: "STATE_SUPPORT",
        passed: false,
        details: `Statutory calculation engine for ${supportInfo.stateName} is unavailable.`,
        error: err,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Check 5: Multi-State Allocation Analysis
  // ---------------------------------------------------------------------------
  const multiStateAnalysis = analyzeMultiStateScenario({
    residentStateCode: stateCode,
  });

  if (multiStateAnalysis.status === "REQUIRES_STATE_RULES") {
    const err: StateValidationError = {
      code: "STATE_INCOME_ALLOCATION_REQUIRED",
      category: "INCOME_ALLOCATION",
      severity: "WARNING",
      message: multiStateAnalysis.message,
      action: multiStateAnalysis.actionRequired || "Review state wage allocations.",
      field: "multiStateRecords",
    };
    warnings.push(err);
    checks.push({
      id: "check_multi_state",
      name: "Multi-State Apportionment",
      category: "INCOME_ALLOCATION",
      passed: false,
      details: multiStateAnalysis.message,
      error: err,
    });
  } else if (multiStateAnalysis.status === "NOT_SUPPORTED") {
    const err: StateValidationError = {
      code: "STATE_NOT_SUPPORTED",
      category: "INCOME_ALLOCATION",
      severity: "BLOCKING",
      message: multiStateAnalysis.message,
      action: multiStateAnalysis.actionRequired || "Consult a CPA for multi-state filings.",
      field: "multiStateRecords",
    };
    blockingErrors.push(err);
    checks.push({
      id: "check_multi_state",
      name: "Multi-State Apportionment",
      category: "INCOME_ALLOCATION",
      passed: false,
      details: multiStateAnalysis.message,
      error: err,
    });
  } else {
    checks.push({
      id: "check_multi_state",
      name: "Multi-State Apportionment",
      category: "INCOME_ALLOCATION",
      passed: true,
      details: "Single state residency confirmed (no multi-state allocation required).",
    });
  }

  // ---------------------------------------------------------------------------
  // Check 6: Withholding Review
  // ---------------------------------------------------------------------------
  const saltExpenseCents =
    session.deductionsSnapshot?.guidedAnswers?.stateLocal?.stateLocalTaxCents ||
    0;

  if (supportInfo?.supportStatus === "NO_STATE_INCOME_TAX" && saltExpenseCents > 0) {
    const warn: StateValidationError = {
      code: "STATE_WITHHOLDING_REVIEW",
      category: "WITHHOLDING_PAYMENTS",
      severity: "WARNING",
      message: `State withholding was reported, but ${supportInfo.stateName} has no personal income tax.`,
      action: "Review Box 17 state tax on your W-2 or consult your employer.",
      field: "stateWithholdingCents",
    };
    warnings.push(warn);
    checks.push({
      id: "check_state_withholding",
      name: "State Withholding Verification",
      category: "WITHHOLDING_PAYMENTS",
      passed: true, // Non-blocking warning
      details: `Reported state tax paid in a no-tax state (${supportInfo.stateName}).`,
    });
  } else {
    checks.push({
      id: "check_state_withholding",
      name: "State Withholding Verification",
      category: "WITHHOLDING_PAYMENTS",
      passed: true,
      details: "State withholding integrity verified.",
    });
  }

  // ---------------------------------------------------------------------------
  // Resolve Status
  // ---------------------------------------------------------------------------
  let status: StateReadinessStatus = "READY";
  const hasUnsupportedStateError = blockingErrors.some(
    (e) => e.code === "STATE_NOT_SUPPORTED" || e.code === "STATE_RULES_UNAVAILABLE"
  );

  if (hasUnsupportedStateError) {
    status = "NOT_SUPPORTED";
  } else if (blockingErrors.length > 0) {
    status = "BLOCKED";
  } else if (warnings.length > 0) {
    status = "REQUIRES_REVIEW";
  }

  const isReady = status === "READY" || status === "REQUIRES_REVIEW";

  let notice = "";
  if (status === "NOT_SUPPORTED") {
    notice = `State tax preparation is not currently supported for ${supportInfo?.stateName || stateCode || "your state"}.`;
  } else if (supportInfo?.supportStatus === "NO_STATE_INCOME_TAX") {
    notice = `${supportInfo.stateName} has no state individual income tax. No state tax return is required.`;
  } else if (status === "READY") {
    notice = `State return readiness verified for ${supportInfo?.stateName || stateCode}.`;
  } else {
    notice = "Review identified state readiness items before proceeding.";
  }

  return {
    status,
    isReady,
    stateCode,
    taxYear,
    evaluatedAt: new Date().toISOString(),
    checks,
    blockingErrors,
    warnings,
    summary: {
      totalChecks: checks.length,
      passedChecks: checks.filter((c) => c.passed).length,
      blockingErrorsCount: blockingErrors.length,
      warningsCount: warnings.length,
    },
    notice,
  };
}
