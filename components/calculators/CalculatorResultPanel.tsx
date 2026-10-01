import React, { useState } from "react";
import Link from "next/link";
import { TaxCalculationResult, CalculatorType, TaxYear, TaxCalculationInputSnapshot } from "@/types/tax";
import { formatCurrencyFromCents } from "@/lib/utils/currency";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { saveCalculation } from "@/lib/utils/calculation-history-api";
import { Sparkles } from "lucide-react";

export interface CalculatorResultPanelProps {
  result: TaxCalculationResult;
  inputSnapshot?: TaxCalculationInputSnapshot;
  hideSaveAction?: boolean;
  className?: string;
}

function getDefaultTitle(calculatorType: CalculatorType, taxYear: TaxYear): string {
  switch (calculatorType) {
    case "income_tax":
      return `${taxYear} Income Tax Calculation`;
    case "self_employed":
      return `${taxYear} Self-Employed Tax Calculation`;
    case "1099":
      return `${taxYear} 1099 Contractor Tax Calculation`;
    case "quarterly_tax":
      return `${taxYear} Quarterly Estimated Tax Calculation`;
    default:
      return `${taxYear} Tax Calculation`;
  }
}

export function CalculatorResultPanel({
  result,
  inputSnapshot,
  hideSaveAction = false,
  className = "",
}: CalculatorResultPanelProps) {
  const isQuarterly = result.calculatorType === "quarterly_tax";
  const hasSelfEmployment = result.selfEmploymentTaxCents > 0 || !!result.selfEmploymentDetails;
  const quarterly = result.quarterlyBreakdown;
  const seDetails = result.selfEmploymentDetails;

  const defaultTitle = getDefaultTitle(result.calculatorType, result.taxYear);
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false);
  const [customTitle, setCustomTitle] = useState<string>(defaultTitle);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [savedCalculationId, setSavedCalculationId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const filingStatusFormatted = result.filingStatus
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSaving || isSaved) return;

    setIsSaving(true);
    setSaveError(null);

    // Fallback safe input snapshot if not explicitly provided
    const safeInputSnapshot = inputSnapshot || {
      taxYear: result.taxYear,
      filingStatus: result.filingStatus,
      w2WagesCents: result.grossIncomeCents,
      otherIncomeCents: 0,
      federalWithholdingCents: result.totalPaymentsAndWithholdingCents,
      itemizedDeductionCents: 0,
    };

    const res = await saveCalculation({
      calculatorType: result.calculatorType,
      taxYear: result.taxYear,
      filingStatus: result.filingStatus,
      title: customTitle.trim() || defaultTitle,
      inputSnapshot: safeInputSnapshot,
      resultSnapshot: result,
    });

    setIsSaving(false);

    if (res.success && res.data) {
      setIsSaved(true);
      setSavedCalculationId(res.data.id);
      setShowSaveDialog(false);
    } else {
      setSaveError(res.error || "Failed to save calculation. Please try again.");
    }
  };

  return (
    <div className={`space-y-6 ${className}`} aria-live="polite">
      {/* Primary Result Summary Card */}
      <Card className="border-t-4 border-t-brand-600 bg-gradient-to-br from-white to-surface-50 shadow-card">
        {/* Header with Engine Version, Rules Source & Save Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-surface-200 pb-4 mb-6 gap-3">
          <div>
            <span className="text-xs uppercase font-bold text-surface-500 tracking-wider block">
              {result.taxYear} Federal Tax Estimate
            </span>
            <h2 className="text-xl font-bold text-surface-900">
              {isQuarterly ? "Form 1040-ES Quarterly Schedule" : "Tax Liability Breakdown"}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="brand" className="text-xs">
              Engine v{result.engineVersion}
            </Badge>
            <Badge variant="neutral" className="text-xs">
              {result.taxYear} Rules
            </Badge>

            {!hideSaveAction && (
              <>
                {isSaved ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="emerald" className="text-xs font-semibold py-1 px-2.5">
                      ✓ Saved to Dashboard
                    </Badge>
                    <Link
                      href={savedCalculationId ? `/dashboard/calculations/${savedCalculationId}` : "/dashboard/calculations"}
                      className="text-xs font-semibold text-brand-600 hover:text-brand-800 underline"
                    >
                      View →
                    </Link>
                    {savedCalculationId && (
                      <Link
                        href={`/ai-tax-assistant?calculationId=${encodeURIComponent(savedCalculationId)}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900 underline"
                      >
                        <Sparkles className="w-3 h-3 text-brand-600" />
                        Ask AI →
                      </Link>
                    )}
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-brand-200 text-brand-700 hover:bg-brand-50 hover:border-brand-300"
                    onClick={() => {
                      setShowSaveDialog(!showSaveDialog);
                      setSaveError(null);
                    }}
                  >
                    Save Calculation
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Expandable Save Calculation Form */}
        {!hideSaveAction && showSaveDialog && !isSaved && (
          <div className="p-4 mb-6 rounded-xl border border-brand-200 bg-brand-50/60 transition-all">
            <form onSubmit={handleSave} className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-surface-900">
                    Save Calculation to Dashboard
                  </h4>
                  <p className="text-xs text-surface-600">
                    Save this exact calculation snapshot to view or reopen anytime in your dashboard.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                <div className="flex-1">
                  <Input
                    id="calculationSaveTitle"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder={defaultTitle}
                    disabled={isSaving}
                    className="bg-white"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isSaving}
                    isLoading={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSaving}
                    onClick={() => {
                      setShowSaveDialog(false);
                      setSaveError(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>

              {saveError && (
                <Alert variant="error" title="Unable to Save">
                  {saveError}
                </Alert>
              )}
            </form>
          </div>
        )}

        {/* Primary Metric KPI Grid */}
        {isQuarterly && quarterly ? (
          <div className="mb-6 space-y-4">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-brand-900 to-navy-950 text-white shadow-md">
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-200 block">
                Estimated Payment Per Quarter (Federal)
              </span>
              <span className="text-3xl sm:text-4xl font-black mt-2 block tracking-tight">
                {formatCurrencyFromCents(quarterly.quarterlyPaymentCents)}
              </span>
              <div className="mt-3 pt-3 border-t border-navy-800 flex flex-wrap justify-between gap-2 text-xs text-surface-300">
                <span>
                  Total Projected Annual Liability:{" "}
                  <strong className="text-white">
                    {formatCurrencyFromCents(quarterly.estimatedAnnualTaxCents)}
                  </strong>
                </span>
                <span>
                  Remaining To Pay:{" "}
                  <strong className="text-brand-300">
                    {formatCurrencyFromCents(quarterly.remainingTaxToPayCents)}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-white border border-surface-200 shadow-subtle">
              <span className="text-xs text-surface-500 block font-medium">Total Federal Liability</span>
              <span className="text-2xl font-black text-surface-900 mt-1 block">
                {formatCurrencyFromCents(result.totalTaxLiabilityCents)}
              </span>
              {hasSelfEmployment && (
                <span className="text-[11px] text-surface-500 block mt-0.5">
                  Income Tax + Self-Employment Tax
                </span>
              )}
            </div>

            <div className="p-4 rounded-xl bg-white border border-surface-200 shadow-subtle">
              <span className="text-xs text-surface-500 block font-medium">Effective Tax Rate</span>
              <span className="text-2xl font-black text-brand-600 mt-1 block">
                {(result.effectiveTaxRate * 100).toFixed(1)}%
              </span>
              <span className="text-[11px] text-surface-500 block mt-0.5">
                Of total gross income
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-surface-200 shadow-subtle">
              <span className="text-xs text-surface-500 block font-medium">Top Marginal Bracket</span>
              <span className="text-2xl font-black text-surface-900 mt-1 block">
                {(result.marginalTaxBracket * 100).toFixed(0)}%
              </span>
              <span className="text-[11px] text-surface-500 block mt-0.5">
                Statutory progressive bracket
              </span>
            </div>
          </div>
        )}

        {/* Withholding & Refund/Due Balance Card */}
        <div className="p-4 rounded-xl border mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-50 border-surface-200">
          <div>
            <span className="text-xs font-semibold uppercase text-surface-500 block">
              Withholding & Balance Due Status
            </span>
            <h3 className="text-base font-bold text-surface-900 mt-0.5">
              {result.estimatedRefundCents > 0
                ? "Estimated Federal Refund"
                : result.estimatedAmountOwedCents > 0
                ? isQuarterly
                  ? "Net Annual Tax Due for Vouchers"
                  : "Estimated Balance Due"
                : "Tax Obligation Fully Balanced"}
            </h3>
            <span className="text-xs text-surface-500">
              Anticipated Federal Withholding:{" "}
              {formatCurrencyFromCents(result.totalPaymentsAndWithholdingCents)}
            </span>
          </div>
          <div className="text-left sm:text-right">
            <span
              className={`text-2xl font-black block ${
                result.estimatedRefundCents > 0
                  ? "text-emerald-600"
                  : result.estimatedAmountOwedCents > 0
                  ? "text-amber-600"
                  : "text-surface-700"
              }`}
            >
              {result.estimatedRefundCents > 0
                ? formatCurrencyFromCents(result.estimatedRefundCents)
                : result.estimatedAmountOwedCents > 0
                ? formatCurrencyFromCents(result.estimatedAmountOwedCents)
                : "$0.00"}
            </span>
          </div>
        </div>

        {/* Detailed Income & Deduction Waterfall */}
        <div className="space-y-2 text-sm border-t border-surface-200 pt-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-surface-500 mb-2">
            Calculation Waterfall
          </h4>
          <div className="flex justify-between py-1 text-surface-600">
            <span>Filing Status:</span>
            <span className="font-semibold text-surface-900">{filingStatusFormatted}</span>
          </div>
          <div className="flex justify-between py-1 text-surface-600">
            <span>Gross Income / Revenue:</span>
            <span className="font-semibold text-surface-900">
              {formatCurrencyFromCents(result.grossIncomeCents)}
            </span>
          </div>

          {hasSelfEmployment && seDetails && (
            <>
              <div className="flex justify-between py-1 text-surface-600">
                <span>Deductible Half of SE Tax (Above-the-Line):</span>
                <span className="font-semibold text-emerald-600">
                  -{formatCurrencyFromCents(seDetails.deductibleHalfCents)}
                </span>
              </div>
              <div className="flex justify-between py-1 text-surface-600">
                <span>Adjusted Gross Income (AGI):</span>
                <span className="font-semibold text-surface-900">
                  {formatCurrencyFromCents(result.adjustedGrossIncomeCents)}
                </span>
              </div>
            </>
          )}

          <div className="flex justify-between py-1 text-surface-600">
            <span>Standard Deduction Applied ({result.taxYear}):</span>
            <span className="font-semibold text-emerald-600">
              -{formatCurrencyFromCents(result.deductionUsedCents)}
            </span>
          </div>

          <div className="flex justify-between py-1 text-surface-600 border-t border-surface-100 pt-2 font-medium">
            <span>Taxable Ordinary Income:</span>
            <span className="font-bold text-surface-900">
              {formatCurrencyFromCents(result.taxableIncomeCents)}
            </span>
          </div>

          <div className="flex justify-between py-1 text-surface-600">
            <span>Federal Ordinary Income Tax:</span>
            <span className="font-semibold text-surface-900">
              {formatCurrencyFromCents(result.federalIncomeTaxCents)}
            </span>
          </div>

          {hasSelfEmployment && (
            <div className="flex justify-between py-1 text-surface-600">
              <span>Self-Employment Tax (Schedule SE):</span>
              <span className="font-semibold text-surface-900">
                {formatCurrencyFromCents(result.selfEmploymentTaxCents)}
              </span>
            </div>
          )}

          <div className="flex justify-between py-1.5 border-t border-surface-200 text-surface-900 font-bold">
            <span>Total Estimated Federal Tax Liability:</span>
            <span className="text-brand-700">
              {formatCurrencyFromCents(result.totalTaxLiabilityCents)}
            </span>
          </div>
        </div>
      </Card>

      {/* Quarterly Vouchers Table (Quarterly Calculator only) */}
      {isQuarterly && quarterly && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>IRS Form 1040-ES Payment Vouchers</CardTitle>
                <p className="text-xs text-surface-500 mt-1">
                  Cent-accurate distribution of federal estimated payments across the 4 IRS statutory deadlines.
                </p>
              </div>
              <Badge variant="emerald">Form 1040-ES</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {quarterly.paymentDeadlines.map((v, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl border border-surface-200 bg-surface-50 flex items-center justify-between hover:border-surface-300 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-brand-700 text-sm">
                        {v.quarter}
                      </span>
                      <span className="text-xs text-surface-600 font-medium">{v.dueDate}</span>
                    </div>
                    <span className="text-xs text-surface-500 block mt-1">
                      Estimated Federal Payment
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-surface-900 text-base">
                      {formatCurrencyFromCents(v.amountCents)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 mt-4 rounded-lg bg-surface-100 text-xs text-surface-700 leading-relaxed border border-surface-200">
              <span className="font-semibold block text-surface-900 mb-1">
                IRS Safe Harbor Rule Guidance:
              </span>
              To avoid federal underpayment penalties, you generally must pay at least 90% of your current tax year liability or 100% of your prior year liability (110% if prior year AGI exceeded $150,000) through quarterly estimates and withholding.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Self-Employment Breakdown Card (when applicable) */}
      {hasSelfEmployment && seDetails && (
        <Card>
          <CardHeader>
            <CardTitle>Schedule SE Tax Computation Details</CardTitle>
            <p className="text-xs text-surface-500">
              Computed strictly under IRC §§ 1401 and 1402 with integer-cent precision.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-surface-50 border border-surface-200">
                <span className="text-surface-500 block">Net Self-Employment Profit:</span>
                <span className="font-bold text-surface-900 text-sm mt-0.5 block">
                  {formatCurrencyFromCents(seDetails.netSelfEmploymentProfitCents)}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-surface-50 border border-surface-200">
                <span className="text-surface-500 block">Taxable SE Profit (92.35% Statutory Factor):</span>
                <span className="font-bold text-surface-900 text-sm mt-0.5 block">
                  {formatCurrencyFromCents(seDetails.taxableSelfEmploymentProfitCents)}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-surface-50 border border-surface-200">
                <span className="text-surface-500 block">Social Security Tax (12.4% Capped):</span>
                <span className="font-bold text-surface-900 text-sm mt-0.5 block">
                  {formatCurrencyFromCents(seDetails.socialSecurityTaxCents)}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-surface-50 border border-surface-200">
                <span className="text-surface-500 block">Medicare Tax (2.9% Uncapped):</span>
                <span className="font-bold text-surface-900 text-sm mt-0.5 block">
                  {formatCurrencyFromCents(seDetails.medicareTaxCents)}
                </span>
              </div>
            </div>
            <div className="mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex justify-between items-center font-medium">
              <span>Deductible Half of SE Tax (Reduces AGI):</span>
              <span className="font-bold text-emerald-700">
                -{formatCurrencyFromCents(seDetails.deductibleHalfCents)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progressive Bracket Breakdown Card */}
      {result.bracketBreakdown && result.bracketBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Progressive Bracket Breakdown (Tax Year {result.taxYear})</CardTitle>
            <p className="text-xs text-surface-500">
              Taxable income partitioned across statutory rate tiers. Sourced from {result.rulesVersion}.
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm" aria-label="Progressive Tax Brackets">
                <thead>
                  <tr className="border-b border-surface-200 text-surface-500">
                    <th scope="col" className="pb-2 font-semibold">Rate</th>
                    <th scope="col" className="pb-2 font-semibold">Tax Bracket</th>
                    <th scope="col" className="pb-2 font-semibold">Taxable in Tier</th>
                    <th scope="col" className="pb-2 font-semibold text-right">Tax Owed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {result.bracketBreakdown.map((item, idx) => (
                    <tr key={idx} className="hover:bg-surface-50/50">
                      <td className="py-2.5 font-bold text-brand-700">
                        {(item.rate * 100).toFixed(0)}%
                      </td>
                      <td className="py-2.5 text-surface-600">{item.bracketRange}</td>
                      <td className="py-2.5 text-surface-700">
                        {formatCurrencyFromCents(item.taxableAmountInBracketCents)}
                      </td>
                      <td className="py-2.5 font-semibold text-surface-900 text-right">
                        {formatCurrencyFromCents(item.taxInBracketCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Structured Engine Warnings (Non-fatal disclosures) */}
      {result.warnings && result.warnings.length > 0 && (
        <div className="space-y-3" role="region" aria-label="Tax Engine Advisories">
          {result.warnings.map((w, idx) => (
            <Alert
              key={idx}
              variant={w.level === "unsupported" || w.level === "warning" ? "warning" : "info"}
              title={w.code.replace(/_/g, " ")}
            >
              {w.message}
            </Alert>
          ))}
        </div>
      )}

      {/* Authoritative Disclaimer & Engine Source Footer */}
      <div className="p-4 rounded-xl border border-surface-200 bg-surface-50 text-xs text-surface-500 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-surface-400 font-mono">
          <span>Engine: {result.engineVersion}</span>
          <span>Ruleset: {result.rulesVersion}</span>
        </div>
        <p className="leading-relaxed">
          <strong>Notice:</strong> This calculator provides an educational estimate based on the deterministic federal tax rules and inputs supported by TaxAIHelp. It is not tax, legal, or financial advice. TaxAIHelp is not affiliated with or endorsed by the IRS. For complex tax situations or binding filings, consult a licensed CPA or Enrolled Agent.
        </p>
      </div>
    </div>
  );
}
