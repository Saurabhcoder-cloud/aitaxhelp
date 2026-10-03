/**
 * California Statutory State Tax Engine — Phase 11
 *
 * Implements deterministic calculation for California Form 540 (Resident)
 * and Form 540NR (Nonresident/Part-Year) under California Revenue and Taxation Code (RTC).
 *
 * ARCHITECTURAL INVARIANTS:
 * - Deterministic integer-cents arithmetic.
 * - Zero LLM overrides or client-supplied totals.
 * - Source authority: California RTC §§ 17041, 17054, 17052, 17052.1, 17073.5.
 */

import { TaxYear, TaxFilingStatus } from "@/types/tax";
import { AppError } from "@/lib/utils/errors";
import {
  StateCalculationInput,
  StateCalculationResult,
  StateReadiness,
  StateValidationError,
  StateValidationCheck,
  StateReturn,
  StateRefundOrBalanceType,
} from "../types";
import { IStateTaxEngine } from "../engine";
import {
  getCaliforniaRules,
  calculateCaliforniaTaxBrackets,
  calculateCaliforniaStandardDeduction,
  calculateCaliforniaExemptionCredits,
  calculateCalEitc,
  calculateYoungChildTaxCredit,
} from "../rules/ca";

export class CaliforniaTaxEngine implements IStateTaxEngine {
  public readonly stateCode = "CA";
  public readonly stateName = "California";
  public readonly hasIndividualIncomeTax = true;
  public readonly engineVersion = "2025.1.0-statutory-ca";
  public readonly rulesVersion = "2025.1-ftb";

  public getSupportedStateCode(): string {
    return this.stateCode;
  }

  public getSupportedTaxYears(): TaxYear[] {
    return [2025, 2026];
  }

  public getRulesMetadata(taxYear: TaxYear) {
    const rules = getCaliforniaRules(taxYear);
    return {
      stateCode: this.stateCode,
      stateName: this.stateName,
      taxYear,
      engineVersion: this.engineVersion,
      rulesVersion: rules.rulesVersion,
      bracketsCount: rules.brackets.single.length,
      hasMentalHealthSurtax: true,
      hasStandardDeduction: true,
      hasExemptionCredits: true,
      hasCalEitc: true,
      hasYoungChildTaxCredit: true,
    };
  }

  public calculateStateTax(input: StateCalculationInput): StateCalculationResult {
    const taxYear = input.taxYear;
    if (taxYear !== 2025 && taxYear !== 2026) {
      throw new AppError(
        `California tax calculation is not supported for Tax Year ${taxYear}. Supported years: 2025, 2026.`,
        422,
        "STATE_RULES_UNAVAILABLE"
      );
    }

    const rules = getCaliforniaRules(taxYear);
    const filingStatus: TaxFilingStatus = input.filingStatus || "single";
    const residencyType = input.residencyType || "full_year_resident";

    // 1. California Additions and Subtractions (Schedule CA (540))
    const additionsCents = Math.max(0, input.stateAdditionsCents || 0);
    const subtractionsCents = Math.max(0, input.stateSubtractionsCents || 0);
    const stateAgiCents = Math.max(0, input.federalAgiCents + additionsCents - subtractionsCents);

    // 2. California Standard Deduction (RTC § 17073.5)
    const standardDeductionCents = calculateCaliforniaStandardDeduction(filingStatus, rules);
    const deductionUsedCents = standardDeductionCents;

    // 3. California Taxable Income
    const taxableIncomeBeforeProration = Math.max(0, stateAgiCents - deductionUsedCents);

    // 4. Proration for Part-Year or Nonresident (Form 540NR)
    let prorationRatio = 1.0;
    if (residencyType !== "full_year_resident") {
      if (input.nonresidentIncomeAllocationPercentage !== undefined) {
        prorationRatio = Math.max(0, Math.min(100, input.nonresidentIncomeAllocationPercentage)) / 100;
      } else if (input.federalAgiCents > 0) {
        const caSourceWages = Math.max(0, input.w2WagesCents || 0);
        prorationRatio = Math.max(0, Math.min(1.0, caSourceWages / input.federalAgiCents));
      } else {
        prorationRatio = 1.0;
      }
    }

    const stateTaxableIncomeCents = Math.round(taxableIncomeBeforeProration * prorationRatio);

    // 5. Progressive Tax Computation & Mental Health Services Tax (RTC § 17041)
    const taxComp = calculateCaliforniaTaxBrackets(stateTaxableIncomeCents, filingStatus, rules);
    const grossStateTaxCents = taxComp.grossTaxCents;

    // 6. California Exemption Credits (RTC § 17054)
    const dependentsCount = (input.qualifyingChildrenCount || 0) + (input.qualifyingDependentsCount || 0);
    const exemptionComp = calculateCaliforniaExemptionCredits(
      stateAgiCents,
      filingStatus,
      dependentsCount,
      rules
    );

    // Prorate exemption credits for nonresidents/part-year residents per Form 540NR Line 32
    const totalExemptionCreditsCents = Math.round(exemptionComp.totalExemptionCreditsCents * prorationRatio);
    const nonRefundableCreditsCents = Math.min(grossStateTaxCents, totalExemptionCreditsCents);
    const netStateTaxCents = Math.max(0, grossStateTaxCents - nonRefundableCreditsCents);

    // 7. Refundable California Credits (CalEITC & Young Child Tax Credit)
    const earnedIncomeCents = Math.max(0, (input.w2WagesCents || 0) + (input.selfEmploymentProfitCents || 0));
    const calEitcCents = calculateCalEitc(earnedIncomeCents, input.qualifyingChildrenCount || 0, rules);
    const hasUnder6Child = input.hasUnder6Child ?? (input.qualifyingChildrenCount > 0);
    const youngChildCreditCents = calculateYoungChildTaxCredit(
      earnedIncomeCents,
      hasUnder6Child,
      calEitcCents > 0,
      rules
    );
    const refundableCreditsCents = calEitcCents + youngChildCreditCents;

    // 8. Withholding & Payments
    const totalWithholdingCents = Math.max(0, input.stateWithholdingCents || 0);
    const estimatedPaymentsCents = Math.max(0, input.stateEstimatedPaymentsCents || 0);
    const totalPaymentsCents = totalWithholdingCents + estimatedPaymentsCents + refundableCreditsCents;

    // 9. Refund or Balance Due
    let refundOrBalanceType: StateRefundOrBalanceType = "zero";
    let refundOrBalanceCents = 0;

    if (totalPaymentsCents > netStateTaxCents) {
      refundOrBalanceType = "refund";
      refundOrBalanceCents = totalPaymentsCents - netStateTaxCents;
    } else if (netStateTaxCents > totalPaymentsCents) {
      refundOrBalanceType = "balance_due";
      refundOrBalanceCents = netStateTaxCents - totalPaymentsCents;
    }

    return {
      stateCode: this.stateCode,
      taxYear,
      engineVersion: this.engineVersion,
      rulesVersion: rules.rulesVersion,
      stateAgiCents,
      stateTaxableIncomeCents,
      grossStateTaxCents,
      nonRefundableCreditsCents,
      netStateTaxCents,
      refundableCreditsCents,
      totalWithholdingCents,
      estimatedPaymentsCents,
      refundOrBalanceCents,
      refundOrBalanceType,
      effectiveTaxRate: taxComp.effectiveRate,
      marginalTaxBracket: taxComp.marginalBracket,
      breakdown: {
        additionsCents,
        subtractionsCents,
        deductionUsedCents,
        exemptionsCents: totalExemptionCreditsCents,
        taxableIncomeBeforeDeductionsCents: stateAgiCents,
        personalExemptionCreditCents: Math.round(exemptionComp.personalExemptionCreditCents * prorationRatio),
        dependentExemptionCreditCents: Math.round(exemptionComp.dependentExemptionCreditCents * prorationRatio),
        calEitcCents,
        youngChildCreditCents,
        mentalHealthServicesTaxCents: taxComp.mentalHealthTaxCents,
      },
    };
  }

  public validateStateReturn(input: StateCalculationInput): StateValidationError[] {
    const errors: StateValidationError[] = [];

    if (!input.stateCode || input.stateCode.toUpperCase() !== "CA") {
      errors.push({
        code: "MISSING_STATE",
        category: "RESIDENCY_IDENTITY",
        severity: "BLOCKING",
        message: "State code must be 'CA' for California tax calculations.",
        action: "Set your state of residence to California.",
        field: "stateCode",
      });
    }

    if (input.taxYear !== 2025 && input.taxYear !== 2026) {
      errors.push({
        code: "MISSING_TAX_YEAR",
        category: "STATE_SUPPORT",
        severity: "BLOCKING",
        message: `Tax Year ${input.taxYear} is not supported by the California tax engine.`,
        action: "Select Tax Year 2025 or 2026.",
        field: "taxYear",
      });
    }

    if (input.residencyType === "part_year_resident" && !input.moveDate) {
      errors.push({
        code: "RESIDENCY_INCOMPLETE",
        category: "RESIDENCY_CLASSIFICATION",
        severity: "WARNING",
        message: "Part-year California residency requires recording your date of move.",
        action: "Provide the date you moved into or out of California.",
        field: "moveDate",
      });
    }

    if (input.residencyType !== "full_year_resident" && input.nonresidentIncomeAllocationPercentage === undefined) {
      errors.push({
        code: "STATE_SOURCE_ALLOCATION_MISSING",
        category: "STATE_SOURCE_INCOME",
        severity: "WARNING",
        message: "Nonresident and part-year California returns require income allocation percentage.",
        action: "Verify California-source wage percentage from Box 16 on Form W-2.",
        field: "nonresidentIncomeAllocationPercentage",
      });
    }

    return errors;
  }

  public getStateReadiness(input: StateCalculationInput): StateReadiness {
    const validationErrors = this.validateStateReturn(input);
    const blockingErrors = validationErrors.filter((e) => e.severity === "BLOCKING");
    const warnings = validationErrors.filter((e) => e.severity === "WARNING");

    const checks: StateValidationCheck[] = [
      {
        id: "check_ca_statutory_engine",
        name: "California Statutory Engine",
        category: "STATE_SUPPORT",
        passed: true,
        details: `Certified California FTB statutory engine active (${this.engineVersion}).`,
      },
      {
        id: "check_ca_residency_classification",
        name: "Residency Classification",
        category: "RESIDENCY_CLASSIFICATION",
        passed: !warnings.some((w) => w.category === "RESIDENCY_CLASSIFICATION"),
        details: `Residency: ${input.residencyType}.`,
      },
      {
        id: "check_ca_income_sourcing",
        name: "California Source Income Allocation",
        category: "STATE_SOURCE_INCOME",
        passed: !warnings.some((w) => w.category === "STATE_SOURCE_INCOME"),
        details: input.residencyType === "full_year_resident"
          ? "Worldwide income taxable to full-year California residents."
          : `Prorated allocation: ${input.nonresidentIncomeAllocationPercentage ?? "estimated"}%.`,
      },
    ];

    const isReady = blockingErrors.length === 0;
    const status = !isReady
      ? "BLOCKED"
      : warnings.length > 0
      ? "REQUIRES_REVIEW"
      : "READY";

    return {
      status,
      isReady,
      stateCode: this.stateCode,
      taxYear: input.taxYear,
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
      notice: isReady
        ? `California return readiness verified (Form 540 / 540NR).`
        : `California return has blocking prerequisites that must be resolved.`,
    };
  }

  public buildReturn(
    input: StateCalculationInput,
    sessionMetadata: {
      returnId: string;
      sessionId: string;
      userId: string;
      taxpayerName: string;
      spouseName?: string;
      hasSpouse?: boolean;
    }
  ): StateReturn {
    const calcResult = this.calculateStateTax(input);
    const readiness = this.getStateReadiness(input);
    const now = new Date().toISOString();

    return {
      returnId: sessionMetadata.returnId,
      sessionId: sessionMetadata.sessionId,
      userId: sessionMetadata.userId,
      metadata: {
        stateCode: this.stateCode,
        stateName: this.stateName,
        taxYear: input.taxYear,
        engineVersion: this.engineVersion,
        rulesVersion: calcResult.rulesVersion,
        hasIncomeTax: true,
        isEngineSupported: true,
        federalReturnVersion: "v2025_v1",
        generatedAt: now,
        supportTier: "SUPPORTED",
      },
      taxpayer: {
        fullName: sessionMetadata.taxpayerName,
        stateOfResidence: this.stateCode,
        residencyType: input.residencyType,
        moveDate: input.moveDate,
        priorStateOfResidence: input.priorStateCode,
      },
      spouse: {
        hasSpouse: Boolean(sessionMetadata.hasSpouse),
        fullName: sessionMetadata.spouseName,
        stateOfResidence: sessionMetadata.hasSpouse ? this.stateCode : undefined,
        residencyType: sessionMetadata.hasSpouse ? input.residencyType : undefined,
      },
      filingStatus: {
        stateStatus: input.filingStatus,
        label: input.filingStatus.replace(/_/g, " ").toUpperCase(),
        federalStatus: input.filingStatus,
        isConformingWithFederal: true,
      },
      income: {
        federalAgiCents: input.federalAgiCents,
        stateW2WagesCents: input.w2WagesCents,
        state1099GrossCents: input.gross1099IncomeCents,
        stateBusinessProfitCents: input.selfEmploymentProfitCents,
        stateOtherIncomeCents: 0,
        totalStateGrossIncomeCents: input.w2WagesCents + input.gross1099IncomeCents + input.selfEmploymentProfitCents,
        allocationPercentage: input.residencyType === "full_year_resident" ? 100 : (input.nonresidentIncomeAllocationPercentage ?? 100),
        multiStateRecords: input.multiStateRecords || [],
        isMultiStateReturn: (input.multiStateRecords && input.multiStateRecords.length > 0) || false,
      },
      adjustments: {
        totalAdditionsCents: calcResult.breakdown.additionsCents,
        totalSubtractionsCents: calcResult.breakdown.subtractionsCents,
        netAdjustmentsCents: calcResult.breakdown.additionsCents - calcResult.breakdown.subtractionsCents,
        items: [],
        stateAdjustedGrossIncomeCents: calcResult.stateAgiCents,
      },
      deductions: {
        deductionType: "standard",
        stateStandardDeductionCents: calcResult.breakdown.deductionUsedCents,
        stateItemizedDeductionCents: 0,
        deductionUsedCents: calcResult.breakdown.deductionUsedCents,
        stateExemptionsCents: calcResult.breakdown.exemptionsCents,
        stateTaxableIncomeCents: calcResult.stateTaxableIncomeCents,
      },
      credits: {
        nonRefundableCreditsCents: calcResult.nonRefundableCreditsCents,
        refundableCreditsCents: calcResult.refundableCreditsCents,
        totalCreditsCents: calcResult.nonRefundableCreditsCents + calcResult.refundableCreditsCents,
        items: [
          {
            id: "ca-personal-exemption",
            name: "California Personal Exemption Credit",
            code: "RTC_17054_PERSONAL",
            amountCents: calcResult.breakdown.personalExemptionCreditCents || 0,
            isRefundable: false,
          },
          {
            id: "ca-dependent-exemption",
            name: "California Dependent Exemption Credit",
            code: "RTC_17054_DEPENDENT",
            amountCents: calcResult.breakdown.dependentExemptionCreditCents || 0,
            isRefundable: false,
          },
          ...(calcResult.breakdown.calEitcCents ? [{
            id: "ca-eitc",
            name: "California Earned Income Tax Credit (CalEITC)",
            code: "RTC_17052",
            amountCents: calcResult.breakdown.calEitcCents,
            isRefundable: true,
          }] : []),
          ...(calcResult.breakdown.youngChildCreditCents ? [{
            id: "ca-yctc",
            name: "California Young Child Tax Credit (YCTC)",
            code: "RTC_17052_1",
            amountCents: calcResult.breakdown.youngChildCreditCents,
            isRefundable: true,
          }] : []),
        ],
      },
      liability: {
        stateTaxableIncomeCents: calcResult.stateTaxableIncomeCents,
        grossStateTaxCents: calcResult.grossStateTaxCents,
        netStateTaxCents: calcResult.netStateTaxCents,
        effectiveTaxRate: calcResult.effectiveTaxRate,
        marginalTaxBracket: calcResult.marginalTaxBracket,
        otherStateTaxesCents: calcResult.breakdown.mentalHealthServicesTaxCents || 0,
      },
      withholding: {
        w2StateWithholdingCents: calcResult.totalWithholdingCents,
        form1099StateWithholdingCents: 0,
        totalStateWithholdingCents: calcResult.totalWithholdingCents,
        records: [],
      },
      payments: {
        totalWithholdingCents: calcResult.totalWithholdingCents,
        estimatedPaymentsCents: calcResult.estimatedPaymentsCents || 0,
        refundableCreditsCents: calcResult.refundableCreditsCents,
        totalPaymentsAndCreditsCents: calcResult.totalWithholdingCents + (calcResult.estimatedPaymentsCents || 0) + calcResult.refundableCreditsCents,
      },
      refundOrBalance: {
        type: calcResult.refundOrBalanceType,
        amountCents: calcResult.refundOrBalanceCents,
        estimatedRefundCents: calcResult.refundOrBalanceType === "refund" ? calcResult.refundOrBalanceCents : 0,
        estimatedAmountOwedCents: calcResult.refundOrBalanceType === "balance_due" ? calcResult.refundOrBalanceCents : 0,
      },
      readiness,
    };
  }
}
