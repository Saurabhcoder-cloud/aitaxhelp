import { TaxYear } from "@/types/tax";
import { TaxPreparationSession } from "@/lib/services/tax-preparation-session-store";
import {
  buildFederalReturn,
  FederalReturn,
  evaluateFederalReturnReadiness,
  reconcileFederalReturnCalculations,
} from "@/lib/preparation/federal-return";

// =============================================================================
// 1. CANONICAL DOCUMENT TYPES & ENUMS
// =============================================================================

export type DocumentType =
  | "federal_tax_summary"
  | "form_1040_preparation"
  | "professional_review_package";

export type DocumentGenerationStatus = "ready" | "ready_with_warnings" | "blocked";

export type ScheduleType =
  | "schedule_a"
  | "schedule_1"
  | "schedule_2"
  | "schedule_3"
  | "schedule_se"
  | "schedule_c"
  | "schedule_d"
  | "schedule_e";

export type ScheduleSupportStatus = "ready" | "not_applicable" | "not_yet_supported";

export interface ScheduleDocumentDescriptor {
  schedule: ScheduleType;
  label: string;
  description: string;
  status: ScheduleSupportStatus;
  statusReason: string;
  supportedFields: string[];
}

export interface GeneratedTaxDocument {
  documentType: DocumentType;
  title: string;
  filename: string;
  mimeType: string;
  taxYear: TaxYear;
  generationStatus: DocumentGenerationStatus;
  sourceSessionId: string;
  generatedAt: string;
  estimatedPageCount: number;
  downloadUrl: string;
  disclaimer: string;
}

export interface FederalReturnDocumentPackageSummary {
  taxpayerName: string;
  filingStatusLabel: string;
  totalGrossIncomeCents: number;
  adjustedGrossIncomeCents: number;
  deductionType: "standard" | "itemized";
  deductionUsedCents: number;
  taxableIncomeCents: number;
  totalTaxLiabilityCents: number;
  totalPaymentsAndCreditsCents: number;
  refundOrBalanceDue: {
    type: "refund" | "balance_due" | "zero";
    amountCents: number;
  };
}

export interface FederalReturnDocumentPackage {
  sessionId: string;
  userId: string;
  taxYear: TaxYear;
  filingStatus: string;
  returnId: string;
  documentVersion: string;
  generatorVersion: string;
  generatedAt: string;
  generationStatus: DocumentGenerationStatus;
  readinessStatus: string;
  reconciliationStatus: string;
  isBlocked: boolean;
  blockingIssues: string[];
  warnings: string[];
  documents: GeneratedTaxDocument[];
  schedules: ScheduleDocumentDescriptor[];
  summary: FederalReturnDocumentPackageSummary;
  securityMetadata: {
    requiresAuth: boolean;
    clientSanitized: boolean;
    disclaimer: string;
  };
}

// =============================================================================
// 2. CONSTANTS & DISCLAIMERS
// =============================================================================

export const DOCUMENT_VERSION = "1.0";
export const DOCUMENT_GENERATOR_VERSION = "2026.1";

export const OFFICIAL_DOCUMENT_DISCLAIMER =
  "TaxAIHelp Federal Tax Preparation Summary. Prepared for taxpayer review. " +
  "NOT FILED WITH THE IRS. TaxAIHelp does not transmit this document to the IRS through this export.";

// =============================================================================
// 3. FILENAME SANITIZATION UTILITY
// =============================================================================

/**
 * Sanitizes tax document filenames to ensure zero internal IDs, zero emails,
 * and safe Content-Disposition handling.
 * Example: TaxAIHelp-2025-Federal-Tax-Summary.pdf
 */
export function sanitizeTaxDocumentFilename(
  taxYear: TaxYear,
  documentType: DocumentType,
  extension: "pdf" | "json" = "pdf"
): string {
  const typeMap: Record<DocumentType, string> = {
    federal_tax_summary: "Federal-Tax-Summary",
    form_1040_preparation: "Form-1040-Preparation",
    professional_review_package: "Professional-Review-Package",
  };

  const typeSlug = typeMap[documentType] || "Tax-Document";
  const cleanYear = Math.floor(taxYear);

  return `TaxAIHelp-${cleanYear}-${typeSlug}.${extension}`;
}

// =============================================================================
// 4. SCHEDULE SUPPORT EVALUATION
// =============================================================================

/**
 * Evaluates the support status of official IRS schedules based on the taxpayer's
 * verified deterministic FederalReturn state.
 *
 * Rules:
 * - READY: When the schedule is supported and contains active verified taxpayer data.
 * - NOT_APPLICABLE: When the schedule is supported but not triggered by taxpayer situation.
 * - NOT_YET_SUPPORTED: When the schedule is outside current calculation engine scope.
 */
export function evaluateSupportedSchedules(federalReturn: FederalReturn): ScheduleDocumentDescriptor[] {
  const schedules: ScheduleDocumentDescriptor[] = [];

  // 1. Schedule A: Itemized Deductions
  const hasItemizedElection = federalReturn.deductions.deductionType === "itemized";
  const hasItemizedRecords = (federalReturn.deductions.itemizedDeductionCents ?? 0) > 0;
  if (hasItemizedElection) {
    schedules.push({
      schedule: "schedule_a",
      label: "Schedule A — Itemized Deductions",
      description: "Medical, state & local taxes (SALT), mortgage interest, and charitable gifts.",
      status: "ready",
      statusReason: "Itemized deductions claimed because they exceed the standard deduction.",
      supportedFields: ["medicalExpenses", "stateLocalTaxes", "mortgageInterest", "charitableGifts"],
    });
  } else if (hasItemizedRecords) {
    schedules.push({
      schedule: "schedule_a",
      label: "Schedule A — Itemized Deductions",
      description: "Medical, state & local taxes (SALT), mortgage interest, and charitable gifts.",
      status: "not_applicable",
      statusReason: "Standard deduction provided a greater tax benefit than itemizing.",
      supportedFields: ["medicalExpenses", "stateLocalTaxes", "mortgageInterest", "charitableGifts"],
    });
  } else {
    schedules.push({
      schedule: "schedule_a",
      label: "Schedule A — Itemized Deductions",
      description: "Medical, state & local taxes (SALT), mortgage interest, and charitable gifts.",
      status: "not_applicable",
      statusReason: "Standard deduction used; no itemized deductions claimed.",
      supportedFields: [],
    });
  }

  // 2. Schedule 1: Additional Income and Adjustments to Income
  const has1099OrGig =
    federalReturn.income.gross1099IncomeCents > 0 ||
    federalReturn.income.spouseGross1099IncomeCents > 0 ||
    federalReturn.income.gigBusinessGrossCents > 0;
  const hasAdjustments = federalReturn.adjustments.totalAboveTheLineDeductionsCents > 0;

  if (has1099OrGig || hasAdjustments) {
    const fields: string[] = [];
    if (has1099OrGig) fields.push("businessNetProfit (Line 3)");
    if (federalReturn.adjustments.deductibleSelfEmploymentTaxCents > 0) fields.push("deductibleSeTax (Line 15)");
    if (federalReturn.adjustments.studentLoanInterestDeductionCents > 0) fields.push("studentLoanInterest (Line 21)");

    schedules.push({
      schedule: "schedule_1",
      label: "Schedule 1 — Additional Income and Adjustments",
      description: "Self-employment receipts, gig income, deductible half SE tax, and student loan interest.",
      status: "ready",
      statusReason: "Supported additional income sources or above-the-line adjustments present.",
      supportedFields: fields,
    });
  } else {
    schedules.push({
      schedule: "schedule_1",
      label: "Schedule 1 — Additional Income and Adjustments",
      description: "Self-employment receipts, gig income, deductible half SE tax, and student loan interest.",
      status: "not_applicable",
      statusReason: "No additional income sources or above-the-line adjustments reported.",
      supportedFields: [],
    });
  }

  // 3. Schedule 2: Additional Taxes
  const hasSeTax = federalReturn.taxes.selfEmploymentTaxCents > 0;
  if (hasSeTax) {
    schedules.push({
      schedule: "schedule_2",
      label: "Schedule 2 — Additional Taxes",
      description: "Self-employment tax (Schedule SE) on freelance, gig, or contractor profits.",
      status: "ready",
      statusReason: "Self-employment tax liability calculated on business profit.",
      supportedFields: ["selfEmploymentTax (Line 4)"],
    });
  } else {
    schedules.push({
      schedule: "schedule_2",
      label: "Schedule 2 — Additional Taxes",
      description: "Self-employment tax (Schedule SE) on freelance, gig, or contractor profits.",
      status: "not_applicable",
      statusReason: "No additional tax liabilities apply to this return.",
      supportedFields: [],
    });
  }

  // 4. Schedule 3: Additional Credits and Payments
  const hasChildCareCredit = federalReturn.credits.childAndDependentCareCreditCents > 0;
  const hasRefundableCredits = federalReturn.credits.totalRefundableCreditsCents > 0;
  if (hasChildCareCredit || hasRefundableCredits) {
    const fields: string[] = [];
    if (hasChildCareCredit) fields.push("childAndDependentCareCredit (Line 2)");
    if (federalReturn.credits.additionalChildTaxCreditCents > 0) fields.push("additionalChildTaxCredit");
    if (federalReturn.credits.earnedIncomeCreditCents > 0) fields.push("earnedIncomeCredit");

    schedules.push({
      schedule: "schedule_3",
      label: "Schedule 3 — Additional Credits and Payments",
      description: "Non-refundable child/dependent care credits and refundable family credits.",
      status: "ready",
      statusReason: "Eligible family credits or refundable tax credits claimed.",
      supportedFields: fields,
    });
  } else {
    schedules.push({
      schedule: "schedule_3",
      label: "Schedule 3 — Additional Credits and Payments",
      description: "Non-refundable child/dependent care credits and refundable family credits.",
      status: "not_applicable",
      statusReason: "No Schedule 3 credits apply to this return.",
      supportedFields: [],
    });
  }

  // 5. Schedule SE: Self-Employment Tax
  const netSeProfit = federalReturn.deductions.businessDeductions.netSelfEmploymentProfitCents;
  if (netSeProfit >= 400_00) {
    schedules.push({
      schedule: "schedule_se",
      label: "Schedule SE — Self-Employment Tax",
      description: "Social Security (12.4%) and Medicare (2.9%) calculation on net self-employment earnings.",
      status: "ready",
      statusReason: "Net self-employment profit meets or exceeds $400 statutory threshold.",
      supportedFields: ["netFarmProfit", "netNonfarmProfit", "socialSecurityTax", "medicareTax", "deductibleHalf"],
    });
  } else {
    schedules.push({
      schedule: "schedule_se",
      label: "Schedule SE — Self-Employment Tax",
      description: "Social Security (12.4%) and Medicare (2.9%) calculation on net self-employment earnings.",
      status: "not_applicable",
      statusReason: "Net business earnings are under the statutory $400 threshold.",
      supportedFields: [],
    });
  }

  // 6. Schedule C: Profit or Loss From Business (Summary Representation)
  if (has1099OrGig) {
    schedules.push({
      schedule: "schedule_c",
      label: "Schedule C — Profit or Loss From Business",
      description: "Gross receipts, allowable business expenses, and standard mileage deductions.",
      status: "ready",
      statusReason: "Business gross receipts and confirmed expenses recorded.",
      supportedFields: ["grossReceipts", "businessExpenses", "standardMileageDeduction", "netProfit"],
    });
  } else {
    schedules.push({
      schedule: "schedule_c",
      label: "Schedule C — Profit or Loss From Business",
      description: "Gross receipts, allowable business expenses, and standard mileage deductions.",
      status: "not_applicable",
      statusReason: "No sole proprietorship, freelance, or gig receipts reported.",
      supportedFields: [],
    });
  }

  // 7. Schedule D: Capital Gains and Losses (Explicitly Not Yet Supported)
  schedules.push({
    schedule: "schedule_d",
    label: "Schedule D — Capital Gains and Losses",
    description: "Short-term and long-term capital gains, crypto, stock sales, and carryovers.",
    status: "not_yet_supported",
    statusReason: "Capital gains and asset sales are outside the current deterministic engine scope.",
    supportedFields: [],
  });

  // 8. Schedule E: Supplemental Income and Loss (Explicitly Not Yet Supported)
  schedules.push({
    schedule: "schedule_e",
    label: "Schedule E — Supplemental Income and Loss",
    description: "Rental real estate, royalties, partnerships, S corporations, and trusts.",
    status: "not_yet_supported",
    statusReason: "Rental properties and pass-through entities are outside the current engine scope.",
    supportedFields: [],
  });

  return schedules;
}

// =============================================================================
// 5. DOCUMENT PACKAGE BUILDER
// =============================================================================

/**
 * Builds the canonical Federal Return Document Package for an active preparation session.
 * Enforces readiness and reconciliation gating:
 * - If blocking issues exist, generationStatus is set to "blocked" and final return documents are withheld.
 * - If warnings exist without blockers, generationStatus is set to "ready_with_warnings".
 * - If all checks pass cleanly, generationStatus is set to "ready".
 */
export function buildFederalReturnDocumentPackage(
  session: TaxPreparationSession
): FederalReturnDocumentPackage {
  const federalReturn = buildFederalReturn(session);
  const readiness = evaluateFederalReturnReadiness(session);
  const reconciliation = reconcileFederalReturnCalculations(session);
  const schedules = evaluateSupportedSchedules(federalReturn);

  const isBlocked = !readiness.isReadyForReview || !reconciliation.isReconciled;
  const blockingIssues: string[] = [
    ...readiness.summaryBlockingItems,
    ...reconciliation.mismatches,
  ];

  const warnings: string[] = [...readiness.summaryWarnings];

  let generationStatus: DocumentGenerationStatus = "ready";
  if (isBlocked) {
    generationStatus = "blocked";
  } else if (warnings.length > 0) {
    generationStatus = "ready_with_warnings";
  }

  const now = new Date().toISOString();
  const taxYear = session.taxYear;

  // Build document descriptors
  const documents: GeneratedTaxDocument[] = [
    {
      documentType: "federal_tax_summary",
      title: `${taxYear} Federal Tax Summary Report`,
      filename: sanitizeTaxDocumentFilename(taxYear, "federal_tax_summary", "pdf"),
      mimeType: "application/pdf",
      taxYear,
      generationStatus,
      sourceSessionId: session.id,
      generatedAt: now,
      estimatedPageCount: 2,
      downloadUrl: `/api/v1/tax/preparation/session/federal-return/documents/download?docType=summary`,
      disclaimer: OFFICIAL_DOCUMENT_DISCLAIMER,
    },
    {
      documentType: "form_1040_preparation",
      title: `${taxYear} Form 1040 Taxpayer Preparation Summary`,
      filename: sanitizeTaxDocumentFilename(taxYear, "form_1040_preparation", "pdf"),
      mimeType: "application/pdf",
      taxYear,
      generationStatus,
      sourceSessionId: session.id,
      generatedAt: now,
      estimatedPageCount: 3,
      downloadUrl: `/api/v1/tax/preparation/session/federal-return/documents/download?docType=1040`,
      disclaimer: OFFICIAL_DOCUMENT_DISCLAIMER,
    },
    {
      documentType: "professional_review_package",
      title: `${taxYear} CPA / Professional Review Package`,
      filename: sanitizeTaxDocumentFilename(taxYear, "professional_review_package", "pdf"),
      mimeType: "application/pdf",
      taxYear,
      generationStatus,
      sourceSessionId: session.id,
      generatedAt: now,
      estimatedPageCount: 4,
      downloadUrl: `/api/v1/tax/preparation/session/federal-return/documents/download?docType=cpa_review`,
      disclaimer: OFFICIAL_DOCUMENT_DISCLAIMER,
    },
  ];

  return {
    sessionId: session.id,
    userId: session.userId,
    taxYear,
    filingStatus: federalReturn.filingStatus.label,
    returnId: federalReturn.metadata.returnId,
    documentVersion: DOCUMENT_VERSION,
    generatorVersion: DOCUMENT_GENERATOR_VERSION,
    generatedAt: now,
    generationStatus,
    readinessStatus: readiness.overallStatus,
    reconciliationStatus: reconciliation.isReconciled ? "reconciled" : "mismatch",
    isBlocked,
    blockingIssues,
    warnings,
    documents,
    schedules,
    summary: {
      taxpayerName: federalReturn.taxpayer.fullName || "Taxpayer",
      filingStatusLabel: federalReturn.filingStatus.label,
      totalGrossIncomeCents: federalReturn.income.totalGrossIncomeCents,
      adjustedGrossIncomeCents: federalReturn.adjustments.adjustedGrossIncomeCents,
      deductionType: federalReturn.deductions.deductionType,
      deductionUsedCents: federalReturn.deductions.deductionUsedCents,
      taxableIncomeCents: federalReturn.taxes.taxableIncomeCents,
      totalTaxLiabilityCents: federalReturn.taxes.totalTaxLiabilityCents,
      totalPaymentsAndCreditsCents: federalReturn.payments.totalPaymentsAndCreditsCents,
      refundOrBalanceDue: {
        type: federalReturn.refundOrBalanceDue.type,
        amountCents: federalReturn.refundOrBalanceDue.amountCents,
      },
    },
    securityMetadata: {
      requiresAuth: true,
      clientSanitized: true,
      disclaimer: OFFICIAL_DOCUMENT_DISCLAIMER,
    },
  };
}
