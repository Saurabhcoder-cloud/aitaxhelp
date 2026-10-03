import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from "pdf-lib";
import { FederalReturn } from "@/lib/preparation/federal-return";
import {
  evaluateSupportedSchedules,
  OFFICIAL_DOCUMENT_DISCLAIMER,
  DOCUMENT_VERSION,
  DOCUMENT_GENERATOR_VERSION,
} from "@/lib/preparation/federal-return-documents";
import { formatCurrencyFromCents } from "@/lib/utils/currency";

// =============================================================================
// COLOR PALETTE & STYLES (Clean, Professional, Trustworthy)
// =============================================================================

const COLORS = {
  primary: rgb(0.06, 0.09, 0.16), // Dark Slate #0f172a
  secondary: rgb(0.2, 0.25, 0.35), // Slate #334155
  muted: rgb(0.4, 0.45, 0.55), // Muted Gray #64748b
  border: rgb(0.85, 0.88, 0.92), // Border Light #e2e8f0
  bgLight: rgb(0.97, 0.98, 0.99), // Surface Light #f8fafc
  accentBrand: rgb(0.02, 0.35, 0.65), // Brand Blue #0259a6
  accentGreen: rgb(0.05, 0.5, 0.3), // Emerald Green #0d804d
  accentAmber: rgb(0.7, 0.4, 0.05), // Amber #b3660d
  disclaimerBg: rgb(0.99, 0.98, 0.94), // Warm Warning Tint #fffbeb
  disclaimerBorder: rgb(0.95, 0.85, 0.5), // Amber Border
};

interface PdfContext {
  doc: PDFDocument;
  fontRegular: PDFFont;
  fontBold: PDFFont;
  page: PDFPage;
  y: number;
  margin: number;
  width: number;
  height: number;
  pageNumber: number;
  totalPages: number;
  taxYear: number;
}

function checkPageSpace(ctx: PdfContext, requiredSpace: number): void {
  if (ctx.y - requiredSpace < ctx.margin + 30) {
    drawPageFooter(ctx);
    ctx.page = ctx.doc.addPage([612, 792]);
    ctx.pageNumber += 1;
    ctx.y = ctx.height - ctx.margin - 15;
    drawPageHeaderMini(ctx);
  }
}

function drawPageHeaderMini(ctx: PdfContext): void {
  ctx.page.drawText(`TaxAIHelp — ${ctx.taxYear} Taxpayer Preparation Document`, {
    x: ctx.margin,
    y: ctx.height - ctx.margin + 5,
    size: 8,
    font: ctx.fontRegular,
    color: COLORS.muted,
  });
  ctx.page.drawLine({
    start: { x: ctx.margin, y: ctx.height - ctx.margin },
    end: { x: ctx.width - ctx.margin, y: ctx.height - ctx.margin },
    thickness: 0.5,
    color: COLORS.border,
  });
  ctx.y -= 15;
}

function drawPageFooter(ctx: PdfContext): void {
  const footerY = ctx.margin - 10;
  ctx.page.drawLine({
    start: { x: ctx.margin, y: footerY + 14 },
    end: { x: ctx.width - ctx.margin, y: footerY + 14 },
    thickness: 0.5,
    color: COLORS.border,
  });
  ctx.page.drawText("TaxAIHelp Federal Tax Preparation System • NOT FILED WITH THE IRS • For Taxpayer Review Only", {
    x: ctx.margin,
    y: footerY,
    size: 7.5,
    font: ctx.fontRegular,
    color: COLORS.muted,
  });
  ctx.page.drawText(`Page ${ctx.pageNumber}`, {
    x: ctx.width - ctx.margin - 35,
    y: footerY,
    size: 7.5,
    font: ctx.fontRegular,
    color: COLORS.muted,
  });
}

function drawDisclaimerBanner(ctx: PdfContext, title: string, text: string): void {
  const boxHeight = 44;
  checkPageSpace(ctx, boxHeight + 10);

  ctx.page.drawRectangle({
    x: ctx.margin,
    y: ctx.y - boxHeight,
    width: ctx.width - ctx.margin * 2,
    height: boxHeight,
    color: COLORS.disclaimerBg,
    borderColor: COLORS.disclaimerBorder,
    borderWidth: 1,
  });

  ctx.page.drawText(title, {
    x: ctx.margin + 10,
    y: ctx.y - 14,
    size: 8.5,
    font: ctx.fontBold,
    color: COLORS.accentAmber,
  });

  ctx.page.drawText(text, {
    x: ctx.margin + 10,
    y: ctx.y - 28,
    size: 7.5,
    font: ctx.fontRegular,
    color: COLORS.secondary,
  });

  ctx.y -= boxHeight + 14;
}

function drawSectionHeader(ctx: PdfContext, title: string): void {
  checkPageSpace(ctx, 30);
  ctx.y -= 8;

  ctx.page.drawRectangle({
    x: ctx.margin,
    y: ctx.y - 18,
    width: ctx.width - ctx.margin * 2,
    height: 20,
    color: COLORS.bgLight,
    borderColor: COLORS.border,
    borderWidth: 0.75,
  });

  ctx.page.drawText(title.toUpperCase(), {
    x: ctx.margin + 8,
    y: ctx.y - 14,
    size: 9,
    font: ctx.fontBold,
    color: COLORS.accentBrand,
  });

  ctx.y -= 26;
}

function drawTableRow(
  ctx: PdfContext,
  label: string,
  value: string,
  isBold = false,
  note = ""
): void {
  checkPageSpace(ctx, 16);

  const rowY = ctx.y - 11;
  ctx.page.drawText(label, {
    x: ctx.margin + 6,
    y: rowY,
    size: 8.5,
    font: isBold ? ctx.fontBold : ctx.fontRegular,
    color: isBold ? COLORS.primary : COLORS.secondary,
  });

  if (note) {
    ctx.page.drawText(note, {
      x: ctx.margin + 210,
      y: rowY,
      size: 7.5,
      font: ctx.fontRegular,
      color: COLORS.muted,
    });
  }

  const valWidth = ctx.fontBold.widthOfTextAtSize(value, 8.5);
  ctx.page.drawText(value, {
    x: ctx.width - ctx.margin - 8 - valWidth,
    y: rowY,
    size: 8.5,
    font: isBold ? ctx.fontBold : ctx.fontRegular,
    color: isBold ? COLORS.primary : COLORS.secondary,
  });

  ctx.page.drawLine({
    start: { x: ctx.margin, y: rowY - 3 },
    end: { x: ctx.width - ctx.margin, y: rowY - 3 },
    thickness: 0.5,
    color: COLORS.border,
  });

  ctx.y -= 15;
}

// =============================================================================
// 1. FEDERAL TAX SUMMARY PDF GENERATOR
// =============================================================================

/**
 * Generates a polished, multi-page Federal Tax Summary PDF based exclusively
 * on the deterministic FederalReturn aggregate.
 */
export async function generateFederalTaxSummaryPdf(
  fedReturn: FederalReturn
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const width = 612;
  const height = 792;
  const margin = 40;

  const page = doc.addPage([width, height]);
  const ctx: PdfContext = {
    doc,
    fontRegular,
    fontBold,
    page,
    y: height - margin,
    margin,
    width,
    height,
    pageNumber: 1,
    totalPages: 1,
    taxYear: fedReturn.metadata.taxYear,
  };

  // 1. Document Title & Header Banner
  ctx.page.drawText(`TaxAIHelp — Federal Tax Summary Report`, {
    x: margin,
    y: ctx.y,
    size: 16,
    font: fontBold,
    color: COLORS.primary,
  });

  ctx.page.drawText(`Tax Year ${fedReturn.metadata.taxYear}`, {
    x: width - margin - 75,
    y: ctx.y,
    size: 14,
    font: fontBold,
    color: COLORS.accentBrand,
  });
  ctx.y -= 18;

  ctx.page.drawText(
    `Prepared: ${new Date(fedReturn.metadata.generatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} • Ruleset: ${fedReturn.metadata.rulesVersion} • Engine: v${fedReturn.metadata.engineVersion}`,
    {
      x: margin,
      y: ctx.y,
      size: 8,
      font: fontRegular,
      color: COLORS.muted,
    }
  );
  ctx.y -= 18;

  // 2. Official Statutory Disclaimer Box
  drawDisclaimerBanner(
    ctx,
    "OFFICIAL REVIEW COPY — NOT FILED WITH THE IRS",
    OFFICIAL_DOCUMENT_DISCLAIMER
  );

  // 3. Taxpayer & Household Overview
  drawSectionHeader(ctx, "1. Taxpayer & Household Profile");
  drawTableRow(ctx, "Taxpayer Full Name", fedReturn.taxpayer.fullName || "Unspecified");
  drawTableRow(ctx, "Federal Filing Status", fedReturn.filingStatus.label, true);
  drawTableRow(ctx, "State of Residence", fedReturn.taxpayer.stateOfResidence || "US Resident");

  if (fedReturn.spouse.hasSpouse) {
    drawTableRow(
      ctx,
      "Spouse Full Name",
      fedReturn.spouse.fullName || "Spouse",
      false,
      fedReturn.spouse.ssnLast4 ? `SSN: ***-**-${fedReturn.spouse.ssnLast4}` : ""
    );
  }

  const depCount = fedReturn.dependents.length;
  drawTableRow(
    ctx,
    "Dependents Claimed",
    `${depCount} dependent(s)`,
    false,
    depCount > 0
      ? fedReturn.dependents.map((d) => `${d.fullName} (${d.relationshipLabel}, Age ${d.ageAtYearEnd})`).join("; ")
      : "None"
  );

  // 4. Income Summary
  drawSectionHeader(ctx, "2. Total Income Breakdown");
  drawTableRow(ctx, "Form W-2 Wages (Taxpayer)", formatCurrencyFromCents(fedReturn.income.w2WagesCents));
  if (fedReturn.spouse.hasSpouse && fedReturn.income.spouseW2WagesCents > 0) {
    drawTableRow(ctx, "Form W-2 Wages (Spouse)", formatCurrencyFromCents(fedReturn.income.spouseW2WagesCents));
  }
  if (fedReturn.income.gross1099IncomeCents > 0) {
    drawTableRow(ctx, "1099 Freelance / Contractor Gross", formatCurrencyFromCents(fedReturn.income.gross1099IncomeCents));
  }
  if (fedReturn.income.gigBusinessGrossCents > 0) {
    drawTableRow(ctx, "Gig Economy / Rideshare Receipts", formatCurrencyFromCents(fedReturn.income.gigBusinessGrossCents));
  }
  drawTableRow(ctx, "Total Gross Income", formatCurrencyFromCents(fedReturn.income.totalGrossIncomeCents), true);

  // 5. Adjustments & Deductions
  drawSectionHeader(ctx, "3. Adjustments & Deductions (Standard vs. Itemized)");
  if (fedReturn.adjustments.deductibleSelfEmploymentTaxCents > 0) {
    drawTableRow(ctx, "Deductible Half of SE Tax (IRC § 164(f))", `-${formatCurrencyFromCents(fedReturn.adjustments.deductibleSelfEmploymentTaxCents)}`);
  }
  if (fedReturn.adjustments.studentLoanInterestDeductionCents > 0) {
    drawTableRow(ctx, "Student Loan Interest Deduction (IRC § 221)", `-${formatCurrencyFromCents(fedReturn.adjustments.studentLoanInterestDeductionCents)}`);
  }
  drawTableRow(ctx, "Adjusted Gross Income (AGI)", formatCurrencyFromCents(fedReturn.adjustments.adjustedGrossIncomeCents), true);

  const isItemized = fedReturn.deductions.deductionType === "itemized";
  drawTableRow(
    ctx,
    isItemized ? "Schedule A Itemized Deductions Applied" : "IRS Standard Deduction Applied",
    `-${formatCurrencyFromCents(fedReturn.deductions.deductionUsedCents)}`,
    true,
    isItemized
      ? `Itemized exceeded Standard (${formatCurrencyFromCents(fedReturn.deductions.standardDeductionCents)})`
      : `Standard provided greater benefit than Itemized (${formatCurrencyFromCents(fedReturn.deductions.itemizedDeductionCents)})`
  );
  drawTableRow(ctx, "Taxable Income", formatCurrencyFromCents(fedReturn.taxes.taxableIncomeCents), true);

  // 6. Tax Calculation & Credits
  drawSectionHeader(ctx, "4. Federal Taxes & Tax Credits");
  drawTableRow(ctx, "Tentative Income Tax (Brackets)", formatCurrencyFromCents(fedReturn.taxes.tentativeTaxCents));
  if (fedReturn.credits.childTaxCreditCents > 0) {
    drawTableRow(ctx, "Child Tax Credit (Non-Refundable)", `-${formatCurrencyFromCents(fedReturn.credits.childTaxCreditCents)}`);
  }
  if (fedReturn.credits.creditForOtherDependentsCents > 0) {
    drawTableRow(ctx, "Credit for Other Dependents", `-${formatCurrencyFromCents(fedReturn.credits.creditForOtherDependentsCents)}`);
  }
  if (fedReturn.credits.childAndDependentCareCreditCents > 0) {
    drawTableRow(ctx, "Child & Dependent Care Credit (CDCTC)", `-${formatCurrencyFromCents(fedReturn.credits.childAndDependentCareCreditCents)}`);
  }
  if (fedReturn.taxes.selfEmploymentTaxCents > 0) {
    drawTableRow(ctx, "Schedule 2 / SE Self-Employment Tax", formatCurrencyFromCents(fedReturn.taxes.selfEmploymentTaxCents));
  }
  drawTableRow(ctx, "Total Federal Tax Liability", formatCurrencyFromCents(fedReturn.taxes.totalTaxLiabilityCents), true);

  // 7. Payments & Final Position
  drawSectionHeader(ctx, "5. Withholdings, Payments & Final Position");
  drawTableRow(ctx, "Federal Income Tax Withheld (W-2/1099)", formatCurrencyFromCents(fedReturn.payments.totalFederalWithholdingCents));
  if (fedReturn.credits.additionalChildTaxCreditCents > 0) {
    drawTableRow(ctx, "Additional Child Tax Credit (Refundable ACTC)", formatCurrencyFromCents(fedReturn.credits.additionalChildTaxCreditCents));
  }
  if (fedReturn.credits.earnedIncomeCreditCents > 0) {
    drawTableRow(ctx, "Earned Income Tax Credit (Refundable EITC)", formatCurrencyFromCents(fedReturn.credits.earnedIncomeCreditCents));
  }
  drawTableRow(ctx, "Total Payments & Refundable Credits", formatCurrencyFromCents(fedReturn.payments.totalPaymentsAndCreditsCents), true);

  // Net Result Box
  const isRefund = fedReturn.refundOrBalanceDue.type === "refund";
  const resultLabel = isRefund
    ? `LINE 34: ESTIMATED FEDERAL REFUND`
    : fedReturn.refundOrBalanceDue.type === "balance_due"
    ? `LINE 37: ESTIMATED AMOUNT YOU OWE`
    : `EXACTLY BALANCED ($0.00)`;

  const resultColor = isRefund ? COLORS.accentGreen : COLORS.accentAmber;

  checkPageSpace(ctx, 38);
  ctx.page.drawRectangle({
    x: margin,
    y: ctx.y - 32,
    width: width - margin * 2,
    height: 32,
    color: isRefund ? rgb(0.93, 0.98, 0.95) : rgb(0.99, 0.96, 0.93),
    borderColor: resultColor,
    borderWidth: 1.5,
  });

  ctx.page.drawText(resultLabel, {
    x: margin + 12,
    y: ctx.y - 20,
    size: 10,
    font: fontBold,
    color: resultColor,
  });

  const amountStr = formatCurrencyFromCents(fedReturn.refundOrBalanceDue.amountCents);
  const amtWidth = fontBold.widthOfTextAtSize(amountStr, 12);
  ctx.page.drawText(amountStr, {
    x: width - margin - 12 - amtWidth,
    y: ctx.y - 21,
    size: 12,
    font: fontBold,
    color: resultColor,
  });
  ctx.y -= 44;

  // 8. Deterministic Mathematical Verification Note
  drawSectionHeader(ctx, "6. Deterministic Statutory Verification");
  drawTableRow(
    ctx,
    "Engine Authority",
    `TaxAIHelp TypeScript Statutory Engine v${fedReturn.metadata.engineVersion}`,
    false,
    "Sole authority for numeric computations"
  );
  drawTableRow(
    ctx,
    "Reconciliation Status",
    fedReturn.reconciliation.isReconciled ? "All 6 Mathematical Checks Passed (100% Reconciled)" : "Discrepancies Noted",
    true
  );
  drawTableRow(
    ctx,
    "Readiness Assessment",
    fedReturn.readiness.overallStatus.toUpperCase().replace(/_/g, " "),
    false,
    `${fedReturn.readiness.completedCategoriesCount}/${fedReturn.readiness.totalCategoriesCount} Categories Complete`
  );

  drawPageFooter(ctx);

  return doc.save();
}

// =============================================================================
// 2. FORM 1040 PREPARATION SUMMARY PDF GENERATOR
// =============================================================================

/**
 * Generates an official Form 1040 structured line-by-line summary PDF representing
 * the exact IRS Form 1040 lines 1–37 based on the deterministic FederalReturn.
 */
export async function generateForm1040SummaryPdf(
  fedReturn: FederalReturn
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const width = 612;
  const height = 792;
  const margin = 40;

  const page = doc.addPage([width, height]);
  const ctx: PdfContext = {
    doc,
    fontRegular,
    fontBold,
    page,
    y: height - margin,
    margin,
    width,
    height,
    pageNumber: 1,
    totalPages: 1,
    taxYear: fedReturn.metadata.taxYear,
  };

  // Header Box
  ctx.page.drawRectangle({
    x: margin,
    y: ctx.y - 38,
    width: width - margin * 2,
    height: 38,
    color: COLORS.bgLight,
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  });

  ctx.page.drawText(`FORM 1040 — U.S. INDIVIDUAL INCOME TAX RETURN`, {
    x: margin + 10,
    y: ctx.y - 16,
    size: 11,
    font: fontBold,
    color: COLORS.primary,
  });

  ctx.page.drawText(`TAX YEAR ${fedReturn.metadata.taxYear} (TAXPAYER PREPARATION SUMMARY)`, {
    x: margin + 10,
    y: ctx.y - 30,
    size: 8.5,
    font: fontBold,
    color: COLORS.accentBrand,
  });

  ctx.y -= 48;

  // Disclaimer Box
  drawDisclaimerBanner(
    ctx,
    "NOT AN OFFICIAL IRS SUBMISSION — FOR TAXPAYER REVIEW ONLY",
    "This document summarizes your federal return data formatted to official Form 1040 line items. TaxAIHelp does NOT transmit this return to the IRS."
  );

  // Filing Status & Taxpayer Identification
  drawSectionHeader(ctx, "Filing Status & Personal Information");
  drawTableRow(ctx, "Filing Status", fedReturn.filingStatus.label, true);
  drawTableRow(ctx, "Your First Name and Middle Initial, Last Name", fedReturn.taxpayer.fullName || "Unspecified");
  if (fedReturn.spouse.hasSpouse) {
    drawTableRow(ctx, "Spouse's First Name and Middle Initial, Last Name", fedReturn.spouse.fullName || "Spouse");
  }

  // Dependents Table
  if (fedReturn.dependents.length > 0) {
    drawSectionHeader(ctx, "Dependents Claimed (Qualifying Children & Relatives)");
    for (const dep of fedReturn.dependents) {
      const eligibility = dep.isQualifyingChildForCtc
        ? "Child Tax Credit Eligible"
        : dep.isQualifyingOtherDependent
        ? "Credit for Other Dependents"
        : "Dependent";
      drawTableRow(ctx, dep.fullName, eligibility, false, `Relationship: ${dep.relationshipLabel}, Age: ${dep.ageAtYearEnd}`);
    }
  }

  // Lines 1–11: Income & Adjustments
  drawSectionHeader(ctx, "Income (Lines 1 – 9)");
  drawTableRow(ctx, "Line 1z: Total amount from Form(s) W-2, box 1", formatCurrencyFromCents(fedReturn.income.w2WagesCents));
  if (fedReturn.income.gross1099IncomeCents > 0 || fedReturn.income.gigBusinessGrossCents > 0) {
    drawTableRow(ctx, "Line 8: Additional income from Schedule 1, line 10", formatCurrencyFromCents(fedReturn.income.gross1099IncomeCents + fedReturn.income.gigBusinessGrossCents));
  }
  drawTableRow(ctx, "Line 9: Total Income (Add lines 1z and 8)", formatCurrencyFromCents(fedReturn.income.totalGrossIncomeCents), true);

  drawSectionHeader(ctx, "Adjustments to Income (Lines 10 – 11)");
  drawTableRow(ctx, "Line 10: Adjustments to income from Schedule 1, line 26", `-${formatCurrencyFromCents(fedReturn.adjustments.totalAboveTheLineDeductionsCents)}`);
  drawTableRow(ctx, "Line 11: Adjusted Gross Income (Subtract line 10 from line 9)", formatCurrencyFromCents(fedReturn.adjustments.adjustedGrossIncomeCents), true);

  // Lines 12–15: Deductions & Taxable Income
  drawSectionHeader(ctx, "Tax and Credits (Lines 12 – 24)");
  drawTableRow(
    ctx,
    `Line 12: ${fedReturn.deductions.deductionType === "itemized" ? "Itemized deductions (from Schedule A)" : "Standard deduction"}`,
    `-${formatCurrencyFromCents(fedReturn.deductions.deductionUsedCents)}`,
    false,
    fedReturn.deductions.deductionType === "itemized" ? "Schedule A Claimed" : "Standard Deduction"
  );
  drawTableRow(ctx, "Line 15: Taxable Income (Subtract line 12 from line 11)", formatCurrencyFromCents(fedReturn.taxes.taxableIncomeCents), true);
  drawTableRow(ctx, "Line 16: Tax (Calculated using IRS progressive tax brackets)", formatCurrencyFromCents(fedReturn.taxes.tentativeTaxCents));

  if (fedReturn.credits.totalNonRefundableCreditsCents > 0) {
    drawTableRow(ctx, "Line 19: Child tax credit or credit for other dependents", `-${formatCurrencyFromCents(fedReturn.credits.childTaxCreditCents + fedReturn.credits.creditForOtherDependentsCents)}`);
  }
  if (fedReturn.credits.childAndDependentCareCreditCents > 0) {
    drawTableRow(ctx, "Line 20: Amount from Schedule 3, line 8 (Care credit, etc.)", `-${formatCurrencyFromCents(fedReturn.credits.childAndDependentCareCreditCents)}`);
  }
  drawTableRow(ctx, "Line 22: Subtract non-refundable credits from line 16", formatCurrencyFromCents(fedReturn.taxes.incomeTaxAfterCreditsCents));
  if (fedReturn.taxes.selfEmploymentTaxCents > 0) {
    drawTableRow(ctx, "Line 23: Other taxes, including self-employment tax (Schedule 2)", formatCurrencyFromCents(fedReturn.taxes.selfEmploymentTaxCents));
  }
  drawTableRow(ctx, "Line 24: Total Tax (Add lines 22 and 23)", formatCurrencyFromCents(fedReturn.taxes.totalTaxLiabilityCents), true);

  // Lines 25–33: Payments
  drawSectionHeader(ctx, "Payments & Refundable Credits (Lines 25 – 33)");
  drawTableRow(ctx, "Line 25d: Federal income tax withheld from Forms W-2 and 1099", formatCurrencyFromCents(fedReturn.payments.totalFederalWithholdingCents));
  if (fedReturn.credits.earnedIncomeCreditCents > 0) {
    drawTableRow(ctx, "Line 27: Earned Income Credit (EIC)", formatCurrencyFromCents(fedReturn.credits.earnedIncomeCreditCents));
  }
  if (fedReturn.credits.additionalChildTaxCreditCents > 0) {
    drawTableRow(ctx, "Line 28: Additional Child Tax Credit from Schedule 8812", formatCurrencyFromCents(fedReturn.credits.additionalChildTaxCreditCents));
  }
  drawTableRow(ctx, "Line 33: Total Payments (Add lines 25d through 32)", formatCurrencyFromCents(fedReturn.payments.totalPaymentsAndCreditsCents), true);

  // Lines 34–37: Refund or Amount You Owe
  drawSectionHeader(ctx, "Refund or Amount You Owe (Lines 34 – 37)");
  if (fedReturn.refundOrBalanceDue.type === "refund") {
    drawTableRow(ctx, "Line 34: OVERPAYMENT (Line 33 minus Line 24) — REFUND", formatCurrencyFromCents(fedReturn.refundOrBalanceDue.amountCents), true);
  } else if (fedReturn.refundOrBalanceDue.type === "balance_due") {
    drawTableRow(ctx, "Line 37: AMOUNT YOU OWE (Line 24 minus Line 33)", formatCurrencyFromCents(fedReturn.refundOrBalanceDue.amountCents), true);
  } else {
    drawTableRow(ctx, "Lines 34 / 37: Balanced Tax Position", "$0.00", true);
  }

  // Supported Schedules Status Reference Block
  const schedules = evaluateSupportedSchedules(fedReturn);
  drawSectionHeader(ctx, "Accompanying IRS Schedules Status");
  for (const s of schedules) {
    const statusText = s.status === "ready" ? "READY" : s.status === "not_applicable" ? "NOT APPLICABLE" : "NOT YET SUPPORTED";
    drawTableRow(ctx, s.label, statusText, s.status === "ready", s.statusReason);
  }

  drawPageFooter(ctx);

  return doc.save();
}

// =============================================================================
// 3. CPA / PROFESSIONAL REVIEW PACKAGE PDF GENERATOR
// =============================================================================

/**
 * Generates an audit-ready Professional Review Package for CPAs, EAs, or
 * taxpayer records, compiling complete reconciliation proofs and supporting breakdowns.
 */
export async function generateProfessionalReviewPackagePdf(
  fedReturn: FederalReturn
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const width = 612;
  const height = 792;
  const margin = 40;

  const page = doc.addPage([width, height]);
  const ctx: PdfContext = {
    doc,
    fontRegular,
    fontBold,
    page,
    y: height - margin,
    margin,
    width,
    height,
    pageNumber: 1,
    totalPages: 1,
    taxYear: fedReturn.metadata.taxYear,
  };

  // Title
  ctx.page.drawText(`TaxAIHelp — CPA / Professional Review Package`, {
    x: margin,
    y: ctx.y,
    size: 15,
    font: fontBold,
    color: COLORS.primary,
  });
  ctx.y -= 16;

  ctx.page.drawText(
    `Prepared for Certified Professional Audit • Return ID: ${fedReturn.metadata.returnId} • Tax Year: ${fedReturn.metadata.taxYear}`,
    {
      x: margin,
      y: ctx.y,
      size: 8,
      font: fontRegular,
      color: COLORS.muted,
    }
  );
  ctx.y -= 18;

  drawDisclaimerBanner(
    ctx,
    "PROFESSIONAL REVIEW COPY — NOT AN OFFICIAL FILING",
    "This audit package is generated for licensed CPAs or Enrolled Agents reviewing the taxpayer's records. TaxAIHelp does not file this return."
  );

  // Executive Reconciliation Audit Checks
  drawSectionHeader(ctx, "1. Mathematical Reconciliation Verifications (6 Checks)");
  for (const check of fedReturn.reconciliation.checks) {
    drawTableRow(
      ctx,
      check.label,
      check.passed ? "PASSED (VERIFIED)" : `MISMATCH (${formatCurrencyFromCents(check.differenceCents)})`,
      check.passed,
      check.description
    );
  }

  // Category Readiness Check
  drawSectionHeader(ctx, "2. Statutory Category Readiness Verification");
  for (const cat of Object.values(fedReturn.readiness.categories)) {
    const statusLabel = cat.status.toUpperCase().replace(/_/g, " ");
    drawTableRow(ctx, cat.title, statusLabel, cat.status === "complete");
  }

  // Supporting Source Items
  drawSectionHeader(ctx, "3. Reported Source Records Inventory");
  drawTableRow(ctx, "Form W-2 Records Count", `${fedReturn.income.w2Records.length} record(s)`);
  drawTableRow(ctx, "Form 1099 Records Count", `${fedReturn.income.form1099Records.length} record(s)`);
  drawTableRow(ctx, "Self-Employment Activities", `${fedReturn.income.activityRecords.length} activity(ies)`);
  if (fedReturn.deductions.businessDeductions.businessMiles > 0) {
    drawTableRow(ctx, "Confirmed Business Miles", `${fedReturn.deductions.businessDeductions.businessMiles.toLocaleString()} miles`);
  }

  // Final Financial Summary
  drawSectionHeader(ctx, "4. Reconciled Financial Summary");
  drawTableRow(ctx, "Gross Income", formatCurrencyFromCents(fedReturn.income.totalGrossIncomeCents));
  drawTableRow(ctx, "Adjusted Gross Income", formatCurrencyFromCents(fedReturn.adjustments.adjustedGrossIncomeCents));
  drawTableRow(ctx, "Deduction Used", formatCurrencyFromCents(fedReturn.deductions.deductionUsedCents));
  drawTableRow(ctx, "Total Tax Liability", formatCurrencyFromCents(fedReturn.taxes.totalTaxLiabilityCents));
  drawTableRow(ctx, "Total Payments & Credits", formatCurrencyFromCents(fedReturn.payments.totalPaymentsAndCreditsCents));
  drawTableRow(
    ctx,
    fedReturn.refundOrBalanceDue.type === "refund" ? "Net Refund" : "Net Balance Due",
    formatCurrencyFromCents(fedReturn.refundOrBalanceDue.amountCents),
    true
  );

  drawPageFooter(ctx);

  return doc.save();
}
