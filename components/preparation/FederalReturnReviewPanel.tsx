"use client";

import React, { useState } from "react";
import { TaxPreparationSession } from "@/lib/services/tax-preparation-session-store";
import { PreparationStep } from "@/lib/preparation/steps";
import {
  buildFederalReturn,
  FederalReturn,
} from "@/lib/preparation/federal-return";
import { formatCurrencyFromCents } from "@/lib/utils/currency";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Edit2,
  ShieldCheck,
  Scale,
  Receipt,
  Users,
  DollarSign,
  FileCheck,
} from "lucide-react";

interface FederalReturnReviewPanelProps {
  session: TaxPreparationSession;
  onNavigateToStep?: (step: PreparationStep) => void;
  onComplete?: () => void;
  isSaving?: boolean;
  isSubmitting?: boolean;
}

export function FederalReturnReviewPanel({
  session,
  onNavigateToStep,
  onComplete,
  isSaving,
  isSubmitting,
}: FederalReturnReviewPanelProps) {
  const submitting = isSubmitting || isSaving;
  // Build the deterministic federal return model
  const federalReturn: FederalReturn = buildFederalReturn(session);

  // Expandable section states
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    taxpayer: true,
    income: true,
    adjustments: false,
    deductions: true,
    credits: true,
    taxes: true,
    payments: true,
    reconciliation: true,
    readiness: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const {
    taxpayer,
    spouse,
    dependents,
    filingStatus,
    income,
    adjustments,
    deductions,
    credits,
    taxes,
    payments,
    refundOrBalanceDue,
    readiness,
    reconciliation,
    metadata,
  } = federalReturn;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Status */}
      <Card className="border-brand-200 bg-gradient-to-r from-brand-50/50 via-surface-50 to-emerald-50/30 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-brand-600" />
              <h2 className="text-xl font-bold text-surface-900">
                Federal Tax Return Review ({metadata.taxYear})
              </h2>
            </div>
            <p className="text-xs text-surface-600">
              Taxpayer: <strong className="text-surface-900">{taxpayer.fullName || "Unspecified"}</strong> • Filing Status:{" "}
              <strong className="text-surface-900">{filingStatus.label}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={
                readiness.isReadyForReview && reconciliation.isReconciled
                  ? "emerald"
                  : readiness.overallStatus === "incomplete"
                  ? "amber"
                  : "amber"
              }
              className="text-xs px-2.5 py-1"
            >
              {readiness.isReadyForReview && reconciliation.isReconciled
                ? "Ready for Final Review"
                : readiness.overallStatus === "incomplete"
                ? "Incomplete — Edits Needed"
                : "Review Warnings"}
            </Badge>

            <Badge
              variant={
                refundOrBalanceDue.type === "refund"
                  ? "emerald"
                  : refundOrBalanceDue.type === "balance_due"
                  ? "amber"
                  : "neutral"
              }
              className="text-xs font-semibold px-2.5 py-1"
            >
              {refundOrBalanceDue.type === "refund"
                ? `Refund: ${formatCurrencyFromCents(refundOrBalanceDue.amountCents)}`
                : refundOrBalanceDue.type === "balance_due"
                ? `Owed: ${formatCurrencyFromCents(refundOrBalanceDue.amountCents)}`
                : "Balanced ($0.00)"}
            </Badge>
          </div>
        </div>
      </Card>

      {/* 2. Blocking Items Banner if Incomplete */}
      {readiness.summaryBlockingItems.length > 0 && (
        <Card className="border-red-300 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <h3 className="text-sm font-semibold text-red-900">Action Required Before Completion</h3>
              <ul className="list-disc list-inside text-xs text-red-800 space-y-1">
                {readiness.summaryBlockingItems.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* SECTION A: Taxpayer & Household */}
      <Card>
        <CardHeader
          className="cursor-pointer hover:bg-surface-50/80 transition-colors py-3.5 px-5 flex flex-row items-center justify-between"
          onClick={() => toggleSection("taxpayer")}
        >
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-brand-600" />
            <CardTitle className="text-base font-semibold">1. Taxpayer & Household</CardTitle>
            <Badge variant="outline" className="text-[11px] font-normal">
              {filingStatus.label}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {onNavigateToStep && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-brand-600 hover:text-brand-700"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigateToStep("taxpayer_profile");
                }}
              >
                <Edit2 className="w-3 h-3 mr-1" /> Edit
              </Button>
            )}
            {expandedSections.taxpayer ? <ChevronUp className="w-4 h-4 text-surface-400" /> : <ChevronDown className="w-4 h-4 text-surface-400" />}
          </div>
        </CardHeader>

        {expandedSections.taxpayer && (
          <CardContent className="pt-0 px-5 pb-5 text-sm space-y-3 divide-y divide-surface-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <p className="text-xs text-surface-500">Primary Taxpayer</p>
                <p className="font-medium text-surface-900">{taxpayer.fullName || "Unspecified"}</p>
              </div>
              <div>
                <p className="text-xs text-surface-500">Federal Filing Status</p>
                <p className="font-medium text-surface-900">{filingStatus.label}</p>
              </div>
            </div>

            {spouse.hasSpouse && (
              <div className="pt-3">
                <p className="text-xs font-semibold text-surface-700 mb-1.5">Spouse Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-surface-500">Name</p>
                    <p className="font-medium text-surface-900">{spouse.fullName || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-500">W-2 Wages</p>
                    <p className="font-medium text-surface-900">{formatCurrencyFromCents(spouse.w2WagesCents ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-500">1099 Receipts</p>
                    <p className="font-medium text-surface-900">{formatCurrencyFromCents(spouse.gross1099IncomeCents ?? 0)}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-surface-700">Dependents ({dependents.length})</p>
                {dependents.length === 0 && (
                  <span className="text-xs text-surface-400">None claimed</span>
                )}
              </div>

              {dependents.length > 0 && (
                <div className="space-y-2">
                  {dependents.map((dep) => (
                    <div
                      key={dep.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg border border-surface-200 bg-surface-50/50 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-surface-900">{dep.fullName}</span>{" "}
                        <span className="text-surface-500">({dep.relationshipLabel}, Age {dep.ageAtYearEnd})</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {dep.isQualifyingChildForCtc && (
                          <Badge variant="emerald" className="text-[10px] px-1.5 py-0.5">
                            CTC Eligible
                          </Badge>
                        )}
                        {dep.isQualifyingOtherDependent && (
                          <Badge variant="brand" className="text-[10px] px-1.5 py-0.5">
                            Other Dependent
                          </Badge>
                        )}
                        {dep.isQualifyingCarePerson && (
                          <Badge variant="neutral" className="text-[10px] px-1.5 py-0.5">
                            Care Credit
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* SECTION B: Income Sources */}
      <Card>
        <CardHeader
          className="cursor-pointer hover:bg-surface-50/80 transition-colors py-3.5 px-5 flex flex-row items-center justify-between"
          onClick={() => toggleSection("income")}
        >
          <div className="flex items-center gap-2.5">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <CardTitle className="text-base font-semibold">2. Total Gross Income</CardTitle>
            <span className="text-sm font-bold text-surface-900">
              {formatCurrencyFromCents(income.totalGrossIncomeCents)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onNavigateToStep && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-brand-600 hover:text-brand-700"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigateToStep("income");
                }}
              >
                <Edit2 className="w-3 h-3 mr-1" /> Edit
              </Button>
            )}
            {expandedSections.income ? <ChevronUp className="w-4 h-4 text-surface-400" /> : <ChevronDown className="w-4 h-4 text-surface-400" />}
          </div>
        </CardHeader>

        {expandedSections.income && (
          <CardContent className="pt-0 px-5 pb-5 text-sm space-y-3">
            <div className="space-y-2 pt-2">
              {income.w2Records.map((w) => (
                <div key={w.id} className="flex justify-between items-center text-xs py-1 border-b border-surface-100">
                  <span className="text-surface-700">W-2 Wages — {w.employerName}</span>
                  <span className="font-semibold text-surface-900">{formatCurrencyFromCents(w.wagesCents)}</span>
                </div>
              ))}
              {income.form1099Records.map((f) => (
                <div key={f.id} className="flex justify-between items-center text-xs py-1 border-b border-surface-100">
                  <span className="text-surface-700">1099 Gross Receipts — {f.payerName}</span>
                  <span className="font-semibold text-surface-900">{formatCurrencyFromCents(f.grossIncomeCents)}</span>
                </div>
              ))}
              {spouse.hasSpouse && (spouse.w2WagesCents ?? 0) > 0 && (
                <div className="flex justify-between items-center text-xs py-1 border-b border-surface-100">
                  <span className="text-surface-700">Spouse W-2 Wages</span>
                  <span className="font-semibold text-surface-900">{formatCurrencyFromCents(spouse.w2WagesCents ?? 0)}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 font-semibold text-sm">
              <span>Total Deterministic Gross Income</span>
              <span className="text-emerald-700">{formatCurrencyFromCents(income.totalGrossIncomeCents)}</span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* SECTION C: Above-the-Line Adjustments */}
      <Card>
        <CardHeader
          className="cursor-pointer hover:bg-surface-50/80 transition-colors py-3.5 px-5 flex flex-row items-center justify-between"
          onClick={() => toggleSection("adjustments")}
        >
          <div className="flex items-center gap-2.5">
            <Scale className="w-4 h-4 text-indigo-600" />
            <CardTitle className="text-base font-semibold">3. Above-the-Line Adjustments & AGI</CardTitle>
            <span className="text-sm font-bold text-surface-900">
              AGI: {formatCurrencyFromCents(adjustments.adjustedGrossIncomeCents)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {expandedSections.adjustments ? <ChevronUp className="w-4 h-4 text-surface-400" /> : <ChevronDown className="w-4 h-4 text-surface-400" />}
          </div>
        </CardHeader>

        {expandedSections.adjustments && (
          <CardContent className="pt-0 px-5 pb-5 text-sm space-y-2">
            <div className="space-y-1.5 pt-2 text-xs">
              <div className="flex justify-between">
                <span className="text-surface-600">Deductible Self-Employment Tax (50% SE tax)</span>
                <span className="font-medium text-surface-900">
                  {formatCurrencyFromCents(adjustments.deductibleSelfEmploymentTaxCents)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-600">Student Loan Interest Deduction (IRC § 221)</span>
                <span className="font-medium text-surface-900">
                  {formatCurrencyFromCents(adjustments.studentLoanInterestDeductionCents)}
                </span>
              </div>
              {adjustments.studentLoanInterestPhaseoutReductionCents > 0 && (
                <p className="text-[11px] text-amber-700">
                  * Note: Student loan interest was reduced by {formatCurrencyFromCents(adjustments.studentLoanInterestPhaseoutReductionCents)} due to statutory statutory MAGI phaseout.
                </p>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-surface-200 font-semibold text-sm">
              <span>Adjusted Gross Income (AGI)</span>
              <span className="text-surface-900">{formatCurrencyFromCents(adjustments.adjustedGrossIncomeCents)}</span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* SECTION D: Deductions (Standard vs. Itemized) */}
      <Card>
        <CardHeader
          className="cursor-pointer hover:bg-surface-50/80 transition-colors py-3.5 px-5 flex flex-row items-center justify-between"
          onClick={() => toggleSection("deductions")}
        >
          <div className="flex items-center gap-2.5">
            <Receipt className="w-4 h-4 text-amber-600" />
            <CardTitle className="text-base font-semibold">4. Deductions Applied</CardTitle>
            <Badge variant="outline" className="text-xs capitalize">
              {deductions.deductionType === "itemized" ? "Schedule A Itemized" : "Standard Deduction"}
            </Badge>
            <span className="text-sm font-bold text-surface-900">
              {formatCurrencyFromCents(deductions.deductionUsedCents)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onNavigateToStep && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-brand-600 hover:text-brand-700"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigateToStep("deductions");
                }}
              >
                <Edit2 className="w-3 h-3 mr-1" /> Edit
              </Button>
            )}
            {expandedSections.deductions ? <ChevronUp className="w-4 h-4 text-surface-400" /> : <ChevronDown className="w-4 h-4 text-surface-400" />}
          </div>
        </CardHeader>

        {expandedSections.deductions && (
          <CardContent className="pt-0 px-5 pb-5 text-sm space-y-3">
            <div className="p-3 rounded-lg border border-surface-200 bg-surface-50 space-y-2 text-xs">
              <div className="flex justify-between font-medium">
                <span>Deduction Method Applied</span>
                <span className="capitalize font-semibold text-surface-900">
                  {deductions.deductionType === "itemized" ? "Schedule A Itemized Deductions" : "IRS Statutory Standard Deduction"}
                </span>
              </div>
              <div className="flex justify-between text-surface-600">
                <span>IRS Standard Deduction for {filingStatus.label}</span>
                <span>{formatCurrencyFromCents(deductions.standardDeductionCents)}</span>
              </div>
              <div className="flex justify-between text-surface-600">
                <span>Allowable Schedule A Itemized Deductions</span>
                <span>{formatCurrencyFromCents(deductions.itemizedDeductionCents)}</span>
              </div>
              {deductions.itemizedBenefitCents > 0 && (
                <p className="text-emerald-700 font-medium">
                  ✓ Itemizing provides an extra {formatCurrencyFromCents(deductions.itemizedBenefitCents)} in deductions above the standard deduction.
                </p>
              )}
            </div>

            {/* Schedule C / SE Business deductions */}
            {deductions.businessDeductions.totalBusinessDeductionsCents > 0 && (
              <div className="pt-2 text-xs space-y-1">
                <p className="font-semibold text-surface-800">Business & Freelance Deductions (Schedule C)</p>
                <div className="flex justify-between text-surface-600">
                  <span>Actual Business Expenses</span>
                  <span>{formatCurrencyFromCents(deductions.businessDeductions.actualExpensesCents)}</span>
                </div>
                {deductions.businessDeductions.businessMiles > 0 && (
                  <div className="flex justify-between text-surface-600">
                    <span>
                      Standard Mileage ({deductions.businessDeductions.businessMiles.toLocaleString()} miles @ {deductions.businessDeductions.ratePerMileCents}¢)
                    </span>
                    <span>{formatCurrencyFromCents(deductions.businessDeductions.mileageDeductionCents)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium pt-1 border-t border-surface-100">
                  <span>Net Self-Employment Profit</span>
                  <span>{formatCurrencyFromCents(deductions.businessDeductions.netSelfEmploymentProfitCents)}</span>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* SECTION E: Tax Credits */}
      <Card>
        <CardHeader
          className="cursor-pointer hover:bg-surface-50/80 transition-colors py-3.5 px-5 flex flex-row items-center justify-between"
          onClick={() => toggleSection("credits")}
        >
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <CardTitle className="text-base font-semibold">5. Tax Credits</CardTitle>
            <span className="text-sm font-bold text-surface-900">
              {formatCurrencyFromCents(credits.totalCreditsCents)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {expandedSections.credits ? <ChevronUp className="w-4 h-4 text-surface-400" /> : <ChevronDown className="w-4 h-4 text-surface-400" />}
          </div>
        </CardHeader>

        {expandedSections.credits && (
          <CardContent className="pt-0 px-5 pb-5 text-sm space-y-2">
            <div className="space-y-1.5 pt-2 text-xs">
              <div className="flex justify-between">
                <span className="text-surface-600">Child Tax Credit (CTC — Non-refundable)</span>
                <span className="font-medium text-surface-900">{formatCurrencyFromCents(credits.childTaxCreditCents)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-600">Credit for Other Dependents (ODC)</span>
                <span className="font-medium text-surface-900">{formatCurrencyFromCents(credits.creditForOtherDependentsCents)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-600">Child & Dependent Care Credit (CDCTC)</span>
                <span className="font-medium text-surface-900">{formatCurrencyFromCents(credits.childAndDependentCareCreditCents)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-600">Additional Child Tax Credit (ACTC — Refundable)</span>
                <span className="font-medium text-surface-900">{formatCurrencyFromCents(credits.additionalChildTaxCreditCents)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-600">Earned Income Tax Credit (EITC — Refundable)</span>
                <span className="font-medium text-surface-900">{formatCurrencyFromCents(credits.earnedIncomeCreditCents)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-surface-200 font-semibold text-sm">
              <span>Total Tax Credits Applied</span>
              <span className="text-emerald-700">{formatCurrencyFromCents(credits.totalCreditsCents)}</span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* SECTION F & G: Taxes & Payments Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Taxes */}
        <Card>
          <CardHeader className="py-3 px-5">
            <CardTitle className="text-sm font-semibold text-surface-900">6. Total Tax Liability</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-5 pb-4 text-xs space-y-1.5">
            <div className="flex justify-between text-surface-600">
              <span>Taxable Ordinary Income</span>
              <span className="font-medium text-surface-900">{formatCurrencyFromCents(taxes.taxableIncomeCents)}</span>
            </div>
            <div className="flex justify-between text-surface-600">
              <span>Tentative Tax Before Credits</span>
              <span className="font-medium text-surface-900">{formatCurrencyFromCents(taxes.tentativeTaxCents)}</span>
            </div>
            <div className="flex justify-between text-surface-600">
              <span>Net Income Tax After Credits</span>
              <span className="font-medium text-surface-900">{formatCurrencyFromCents(taxes.incomeTaxAfterCreditsCents)}</span>
            </div>
            <div className="flex justify-between text-surface-600">
              <span>Self-Employment Tax (Schedule SE)</span>
              <span className="font-medium text-surface-900">{formatCurrencyFromCents(taxes.selfEmploymentTaxCents)}</span>
            </div>
            <div className="flex justify-between font-semibold pt-2 border-t border-surface-100 text-sm">
              <span>Total Federal Tax Liability</span>
              <span className="text-surface-900">{formatCurrencyFromCents(taxes.totalTaxLiabilityCents)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Payments */}
        <Card>
          <CardHeader className="py-3 px-5">
            <CardTitle className="text-sm font-semibold text-surface-900">7. Payments & Withholding</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-5 pb-4 text-xs space-y-1.5">
            <div className="flex justify-between text-surface-600">
              <span>Primary Federal Withholding (W-2/1099)</span>
              <span className="font-medium text-surface-900">{formatCurrencyFromCents(payments.taxpayerFederalWithholdingCents)}</span>
            </div>
            {spouse.hasSpouse && (
              <div className="flex justify-between text-surface-600">
                <span>Spouse Federal Withholding</span>
                <span className="font-medium text-surface-900">{formatCurrencyFromCents(payments.spouseFederalWithholdingCents)}</span>
              </div>
            )}
            <div className="flex justify-between text-surface-600">
              <span>Refundable Credits (ACTC + EITC)</span>
              <span className="font-medium text-surface-900">{formatCurrencyFromCents(payments.refundableCreditsCents)}</span>
            </div>
            <div className="flex justify-between font-semibold pt-2 border-t border-surface-100 text-sm">
              <span>Total Payments & Credits</span>
              <span className="text-emerald-700">{formatCurrencyFromCents(payments.totalPaymentsAndCreditsCents)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SECTION H: Final Calculation Result */}
      <Card className="border-brand-300 bg-brand-50/40 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-brand-800 uppercase tracking-wide">
              Deterministic Tax Result
            </span>
            <h3 className="text-2xl font-black text-surface-900 mt-0.5">
              {refundOrBalanceDue.type === "refund"
                ? `Estimated Refund: ${formatCurrencyFromCents(refundOrBalanceDue.amountCents)}`
                : refundOrBalanceDue.type === "balance_due"
                ? `Estimated Amount Owed: ${formatCurrencyFromCents(refundOrBalanceDue.amountCents)}`
                : "Tax Position is Balanced ($0.00)"}
            </h3>
            <p className="text-xs text-surface-600 mt-1">
              Effective Federal Tax Rate: {(taxes.effectiveTaxRate * 100).toFixed(1)}% • Marginal Bracket: {(taxes.marginalTaxBracket * 100).toFixed(0)}%
            </p>
          </div>

          {onComplete && (
            <Button
              onClick={onComplete}
              disabled={isSaving || !readiness.isReadyForReview}
              className="bg-brand-600 hover:bg-brand-700 text-white font-medium"
            >
              {isSaving ? "Saving..." : "Approve & Complete Preparation"}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          )}
        </div>
      </Card>

      {/* SECTION I: Reconciliation & Readiness Checks */}
      <Card>
        <CardHeader
          className="cursor-pointer hover:bg-surface-50/80 transition-colors py-3.5 px-5 flex flex-row items-center justify-between"
          onClick={() => toggleSection("reconciliation")}
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <CardTitle className="text-base font-semibold">8. Mathematical Reconciliation & Category Readiness</CardTitle>
            <Badge
              variant={reconciliation.isReconciled ? "emerald" : "amber"}
              className="text-xs"
            >
              {reconciliation.isReconciled ? "All 6 Math Checks Passed" : "Reconciliation Mismatch"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {expandedSections.reconciliation ? <ChevronUp className="w-4 h-4 text-surface-400" /> : <ChevronDown className="w-4 h-4 text-surface-400" />}
          </div>
        </CardHeader>

        {expandedSections.reconciliation && (
          <CardContent className="pt-0 px-5 pb-5 text-xs space-y-4">
            {/* Reconciliation checks table */}
            <div className="space-y-1.5">
              <p className="font-semibold text-surface-800">Mathematical Consistency Verifications</p>
              {reconciliation.checks.map((chk) => (
                <div
                  key={chk.id}
                  className="flex items-center justify-between p-2 rounded border border-surface-200 bg-surface-50/50"
                >
                  <div className="flex items-center gap-2">
                    {chk.passed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    )}
                    <span className="font-medium text-surface-800">{chk.label}</span>
                  </div>
                  <span className={chk.passed ? "text-emerald-700 font-semibold" : "text-red-700 font-semibold"}>
                    {chk.passed ? "Verified" : `Mismatch (${formatCurrencyFromCents(chk.differenceCents)})`}
                  </span>
                </div>
              ))}
            </div>

            {/* Category readiness checklist */}
            <div className="space-y-1.5 pt-2 border-t border-surface-200">
              <p className="font-semibold text-surface-800">Section Readiness Status ({readiness.completedCategoriesCount}/{readiness.totalCategoriesCount})</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.values(readiness.categories).map((cat) => (
                  <div
                    key={cat.category}
                    className="flex items-center justify-between p-2 rounded border border-surface-200 text-surface-700"
                  >
                    <span>{cat.title}</span>
                    <Badge
                      variant={
                        cat.status === "complete"
                          ? "emerald"
                          : cat.status === "not_applicable"
                          ? "neutral"
                          : "amber"
                      }
                      className="text-[10px] capitalize"
                    >
                      {cat.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
