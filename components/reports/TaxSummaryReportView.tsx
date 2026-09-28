"use client";

import React, { useState } from "react";
import Link from "next/link";
import { TaxReport } from "@/lib/services/tax-report";
import { formatCurrencyFromCents } from "@/lib/utils/currency";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import {
  Printer,
  Sparkles,
  UserCheck,
  ShieldCheck,
  Info,
  TrendingUp,
  Briefcase,
  Calendar,
  AlertTriangle,
  RotateCcw,
  LifeBuoy,
} from "lucide-react";

export interface TaxSummaryReportViewProps {
  report: TaxReport;
  className?: string;
}

export function TaxSummaryReportView({
  report,
  className = "",
}: TaxSummaryReportViewProps) {
  const {
    taxSummary: ts,
    incomeSummary: inc,
    deductionSummary: ded,
    paymentSummary: pay,
    selfEmploymentSummary: se,
    quarterlySummary: qb,
    taxDrivers: drivers,
    planningInsights: insights,
  } = report;

  // AI Explanation State
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleRequestAiExplanation = async () => {
    setIsLoadingAi(true);
    setAiError(null);

    try {
      const res = await fetch("/api/v1/ai/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${window.sessionStorage.getItem("taxaihelp_session_token") || "taxaihelp-local-dev-session-token"}`,
        },
        body: JSON.stringify({
          message: "Please explain this verified tax summary report in plain English, highlighting the primary tax drivers and what it means for my annual tax position.",
          calculationId: report.calculationId,
        }),
      });

      const json = await res.json();
      setIsLoadingAi(false);

      if (res.ok && json.success && json.data) {
        setAiExplanation(json.data.answer);
      } else {
        setAiError(json.error?.message || "Failed to generate AI explanation.");
      }
    } catch (_err) {
      setIsLoadingAi(false);
      setAiError("Network error occurred while generating explanation. You can retry anytime.");
    }
  };

  const formattedDate = new Date(report.generatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const filingStatusFormatted = report.filingStatus.replace(/_/g, " ").toUpperCase();

  return (
    <div className={`space-y-6 ${className}`} aria-label="Tax Summary Report">
      {/* Top Action Header (Hidden during browser print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-200 print:hidden">
        <div className="flex items-center gap-3">
          <Button href={`/dashboard/calculations/${report.calculationId}`} variant="outline" size="sm">
            &larr; Back to Calculation
          </Button>
          <span className="text-surface-300">/</span>
          <span className="text-xs sm:text-sm font-semibold text-surface-600 truncate max-w-xs">
            Tax Report ({report.taxYear})
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={handlePrint}
            variant="outline"
            size="sm"
            className="gap-1.5 font-semibold text-xs shadow-sm"
          >
            <Printer className="w-3.5 h-3.5 text-surface-600" />
            Print Report
          </Button>

          <Link href={`/dashboard/calculations/${report.calculationId}/professional`}>
            <Button
              variant="primary"
              size="sm"
              className="gap-1.5 font-semibold text-xs shadow-sm"
            >
              <UserCheck className="w-3.5 h-3.5" />
              Share with CPA / EA
            </Button>
          </Link>

          <Link
            href={`/dashboard/support/new?category=REPORT&reportId=${encodeURIComponent(
              report.calculationId
            )}&taxYear=${report.taxYear}&calculatorType=${encodeURIComponent(
              report.calculatorType
            )}`}
          >
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 font-semibold text-xs shadow-sm text-surface-600 hover:text-red-700"
            >
              <LifeBuoy className="w-3.5 h-3.5" />
              Report Issue
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Printable Document Wrapper */}
      <div className="bg-white rounded-2xl border border-surface-200 p-6 sm:p-10 shadow-sm print:border-none print:shadow-none print:p-0 print:m-0 space-y-8">
        {/* Document Header */}
        <div className="border-b-2 border-surface-900 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl sm:text-2xl text-brand-700 tracking-tight">
                  TaxAIHelp
                </span>
                <Badge variant="brand" size="sm" className="font-mono text-[10px]">
                  REPORT v{report.reportVersion}
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-surface-900 tracking-tight mt-1">
                Tax Summary Report
              </h1>
              <p className="text-xs sm:text-sm text-surface-600 mt-1">
                Deterministic Federal Tax Calculation Summary & Educational Planning Overview
              </p>
            </div>

            <div className="text-left sm:text-right text-xs space-y-1 text-surface-600">
              <div>
                <span className="text-surface-400">Date Generated:</span>{" "}
                <strong className="text-surface-900">{formattedDate}</strong>
              </div>
              <div>
                <span className="text-surface-400">Calculation ID:</span>{" "}
                <strong className="font-mono text-[11px] text-surface-800">
                  {report.calculationId.slice(0, 12)}...
                </strong>
              </div>
              <div className="text-[11px] text-surface-400 font-mono">
                Engine: v{report.engineVersion} | Ruleset: {report.rulesVersion}
              </div>
            </div>
          </div>

          {/* Taxpayer Scenario Metadata Badges */}
          <div className="mt-4 pt-4 border-t border-surface-100 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-surface-500 font-medium">Filing Profile:</span>
            <Badge variant="brand" size="sm">
              Tax Year {report.taxYear}
            </Badge>
            <Badge variant="neutral" size="sm">
              {filingStatusFormatted}
            </Badge>
            <span className="text-surface-300">&bull;</span>
            <span className="text-xs text-surface-600 italic">
              Title: {report.title}
            </span>
          </div>
        </div>

        {/* Section 1: Tax Overview KPIs */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-surface-500">
            1. Federal Tax Overview
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border border-surface-200 bg-surface-50">
              <span className="text-surface-500 block">Total Gross Income:</span>
              <span className="font-black text-surface-900 text-base mt-0.5 block">
                {formatCurrencyFromCents(ts.grossIncomeCents)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl border border-surface-200 bg-surface-50">
              <span className="text-surface-500 block">Standard Deduction:</span>
              <span className="font-black text-emerald-600 text-base mt-0.5 block">
                -{formatCurrencyFromCents(ts.deductionUsedCents)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl border border-surface-200 bg-surface-50">
              <span className="text-surface-500 block">Taxable Ordinary Income:</span>
              <span className="font-black text-surface-900 text-base mt-0.5 block">
                {formatCurrencyFromCents(ts.taxableIncomeCents)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl border border-surface-200 bg-surface-50">
              <span className="text-surface-500 block">Total Federal Liability:</span>
              <span className="font-black text-brand-700 text-base mt-0.5 block">
                {formatCurrencyFromCents(ts.totalTaxLiabilityCents)}
              </span>
            </div>
          </div>

          {/* Secondary Metric Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
            <div className="p-3 rounded-lg bg-surface-50 border border-surface-200 flex justify-between items-center">
              <span className="text-surface-600">Effective Tax Rate:</span>
              <strong className="text-brand-600 text-sm">
                {(ts.effectiveTaxRate * 100).toFixed(1)}%
              </strong>
            </div>
            <div className="p-3 rounded-lg bg-surface-50 border border-surface-200 flex justify-between items-center">
              <span className="text-surface-600">Top Marginal Rate:</span>
              <strong className="text-surface-900 text-sm">
                {Math.round(ts.marginalTaxBracket * 100)}%
              </strong>
            </div>
            <div className="p-3 rounded-lg bg-surface-50 border border-surface-200 flex justify-between items-center">
              <span className="text-surface-600">Net Position:</span>
              <strong
                className={`text-sm ${
                  ts.estimatedRefundCents > 0
                    ? "text-emerald-600"
                    : ts.estimatedAmountOwedCents > 0
                    ? "text-amber-600"
                    : "text-surface-800"
                }`}
              >
                {pay.balanceStatusLabel}
              </strong>
            </div>
          </div>
        </section>

        {/* Section 2: Income Sources */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-surface-500">
            2. Verified Income Sources
          </h2>
          <div className="border border-surface-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs sm:text-sm" aria-label="Income Sources Breakdown">
              <thead className="bg-surface-50 border-b border-surface-200 text-surface-500 font-semibold">
                <tr>
                  <th scope="col" className="p-3">Income Source</th>
                  <th scope="col" className="p-3">Statutory Description</th>
                  <th scope="col" className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {inc.sources.map((src, i) => (
                  <tr key={i} className="hover:bg-surface-50/50">
                    <td className="p-3 font-semibold text-surface-900">{src.label}</td>
                    <td className="p-3 text-surface-600 text-xs">{src.description}</td>
                    <td className="p-3 text-right font-mono font-bold text-surface-900">
                      {formatCurrencyFromCents(src.amountCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-surface-50/80 border-t border-surface-200 font-bold">
                <tr>
                  <td colSpan={2} className="p-3 text-surface-700">Total Calculated Gross Revenue</td>
                  <td className="p-3 text-right font-mono text-surface-900">
                    {formatCurrencyFromCents(inc.totalGrossIncomeCents)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* Section 3: Deductions Applied */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-surface-500">
            3. Deductions & Adjustments Applied
          </h2>
          <div className="p-4 rounded-xl border border-surface-200 bg-surface-50/50 space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between py-1 text-surface-700 border-b border-surface-100 pb-2">
              <div>
                <span className="font-semibold block text-surface-900">
                  Standard Deduction (Tax Year {report.taxYear})
                </span>
                <span className="text-xs text-surface-500">
                  Standard statutory allowance for {filingStatusFormatted.toLowerCase()} filing status.
                </span>
              </div>
              <span className="font-bold text-emerald-600 font-mono">
                -{formatCurrencyFromCents(ded.deductionUsedCents)}
              </span>
            </div>

            {ded.deductibleHalfSeTaxCents !== undefined && ded.deductibleHalfSeTaxCents > 0 && (
              <div className="flex justify-between py-1 text-surface-700 border-b border-surface-100 pb-2">
                <div>
                  <span className="font-semibold block text-surface-900">
                    Deductible Half of Self-Employment Tax (Schedule 1)
                  </span>
                  <span className="text-xs text-surface-500">
                    Above-the-line deduction under IRC § 164(f) reducing Adjusted Gross Income.
                  </span>
                </div>
                <span className="font-bold text-emerald-600 font-mono">
                  -{formatCurrencyFromCents(ded.deductibleHalfSeTaxCents)}
                </span>
              </div>
            )}

            <div className="flex justify-between pt-1 font-bold text-surface-900 text-sm">
              <span>Total Statutory Reductions:</span>
              <span className="font-mono text-emerald-700">
                -{formatCurrencyFromCents(ded.totalDeductionsCents)}
              </span>
            </div>

            <p className="text-[11px] text-surface-500 pt-1 italic">
              Notice: {ded.scopeNote}
            </p>
          </div>
        </section>

        {/* Section 4: Self-Employment Tax (if applicable) */}
        {se && (
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-surface-500">
              4. Schedule SE (Self-Employment Tax Computation)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-surface-200 bg-surface-50">
                <span className="text-surface-500 block">Net SE Profit:</span>
                <span className="font-bold text-surface-900 text-sm mt-0.5 block">
                  {formatCurrencyFromCents(se.netSelfEmploymentProfitCents)}
                </span>
              </div>
              <div className="p-3 rounded-lg border border-surface-200 bg-surface-50">
                <span className="text-surface-500 block">Social Security (12.4%):</span>
                <span className="font-bold text-surface-900 text-sm mt-0.5 block">
                  {formatCurrencyFromCents(se.socialSecurityTaxCents)}
                </span>
              </div>
              <div className="p-3 rounded-lg border border-surface-200 bg-surface-50">
                <span className="text-surface-500 block">Medicare (2.9%):</span>
                <span className="font-bold text-surface-900 text-sm mt-0.5 block">
                  {formatCurrencyFromCents(se.medicareTaxCents)}
                </span>
              </div>
              <div className="p-3 rounded-lg border border-surface-200 bg-purple-50">
                <span className="text-purple-700 block font-semibold">Total SE Tax Owed:</span>
                <span className="font-black text-purple-900 text-sm mt-0.5 block">
                  {formatCurrencyFromCents(se.totalSelfEmploymentTaxCents)}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Section 5: Withholding & Payment Summary */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-surface-500">
            5. Federal Withholding & Balance Position
          </h2>
          <div className="p-4 rounded-xl border border-surface-200 bg-surface-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 text-xs sm:text-sm">
              <span className="font-bold text-surface-900 block">
                Payments Credited & Final Obligation
              </span>
              <p className="text-surface-600 text-xs">
                Anticipated Federal Withholding / Direct Payments:{" "}
                <strong className="text-surface-900 font-mono">
                  {formatCurrencyFromCents(pay.totalPaymentsCents)}
                </strong>
              </p>
              <p className="text-surface-500 text-[11px] italic">
                {pay.estimatedRefundCents > 0
                  ? "Projected refund based on the information entered. Not guaranteed by the IRS."
                  : pay.estimatedAmountOwedCents > 0
                  ? "Projected balance due at federal return filing based on information entered."
                  : "Tax obligation fully balanced."}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xs text-surface-500 block uppercase font-bold tracking-wider">
                {pay.estimatedRefundCents > 0 ? "Projected Refund" : "Projected Amount Due"}
              </span>
              <span
                className={`text-2xl font-black font-mono block ${
                  pay.estimatedRefundCents > 0
                    ? "text-emerald-600"
                    : pay.estimatedAmountOwedCents > 0
                    ? "text-amber-600"
                    : "text-surface-800"
                }`}
              >
                {pay.estimatedRefundCents > 0
                  ? `+${formatCurrencyFromCents(pay.estimatedRefundCents)}`
                  : pay.estimatedAmountOwedCents > 0
                  ? `-${formatCurrencyFromCents(pay.estimatedAmountOwedCents)}`
                  : "$0.00"}
              </span>
            </div>
          </div>
        </section>

        {/* Section 6: Form 1040-ES Quarterly Summary (if applicable) */}
        {qb && (
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-surface-500">
              6. IRS Form 1040-ES Quarterly Estimated Vouchers
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {qb.deadlines.map((v, i) => (
                <div key={i} className="p-3.5 rounded-lg border border-surface-200 bg-surface-50 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-brand-700 block">{v.quarter}</span>
                    <span className="text-surface-500 text-[11px]">{v.dueDate}</span>
                  </div>
                  <span className="font-black text-surface-900 font-mono text-sm">
                    {formatCurrencyFromCents(v.amountCents)}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-surface-500 bg-surface-50 p-2.5 rounded-lg border border-surface-200">
              <strong>IRS Safe Harbor:</strong> {qb.safeHarborGuidance}
            </p>
          </section>
        )}

        {/* Section 7: Key Tax Drivers */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-surface-500">
            7. What Drove This Tax Result
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {drivers.map((d) => (
              <div key={d.id} className="p-3 rounded-lg border border-surface-200 bg-surface-50/60">
                <div className="flex items-center justify-between mb-1">
                  <strong className="text-surface-900">{d.title}</strong>
                  <Badge variant={d.importance === "primary" ? "brand" : "neutral"} size="sm">
                    {d.importance}
                  </Badge>
                </div>
                <p className="text-surface-600">{d.impactDescription}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 8: Statutory Scope & Limitations */}
        <section className="space-y-2 pt-2 border-t border-surface-200 text-xs text-surface-500">
          <h2 className="text-xs font-bold uppercase tracking-wider text-surface-500">
            Statutory Limitations & Notice
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            {report.limitations.map((lim, i) => (
              <li key={i}>{lim}</li>
            ))}
          </ul>
          <p className="mt-2 text-surface-600 leading-relaxed italic pt-1">
            <strong>Educational Disclaimer:</strong> {report.disclaimer}
          </p>
        </section>
      </div>

      {/* Section 9: Optional AI Plain-English Explanation (Print: Hidden) */}
      <Card className="print:hidden border-t-4 border-t-brand-600">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-500" />
              <div>
                <CardTitle>Understand Your Tax Summary with AI</CardTitle>
                <p className="text-xs text-surface-500 mt-0.5">
                  Request an educational plain-English walkthrough of this report. Gemini explains verified results without altering any calculations.
                </p>
              </div>
            </div>
            {!aiExplanation && (
              <Button
                onClick={handleRequestAiExplanation}
                variant="secondary"
                size="sm"
                disabled={isLoadingAi}
                isLoading={isLoadingAi}
                className="gap-1.5 font-semibold text-xs whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                {isLoadingAi ? "Explaining..." : "Explain with AI"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {aiError && (
            <div className="space-y-2">
              <Alert variant="warning" title="Unable to Generate AI Explanation">
                {aiError}
              </Alert>
              <Button
                onClick={handleRequestAiExplanation}
                variant="outline"
                size="sm"
                className="gap-1 text-xs"
              >
                <RotateCcw className="w-3 h-3" />
                Retry Explanation
              </Button>
            </div>
          )}

          {aiExplanation && (
            <div className="p-4 rounded-xl bg-surface-50 border border-surface-200 text-xs sm:text-sm text-surface-800 leading-relaxed whitespace-pre-line space-y-2">
              <div className="flex items-center justify-between border-b border-surface-200 pb-2 mb-2">
                <span className="font-bold text-xs text-brand-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Plain-English AI Walkthrough:
                </span>
                <span className="text-[10px] text-surface-400">
                  Educational explanation • Not CPA advice
                </span>
              </div>
              <p>{aiExplanation}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 10: Professional CPA / EA Handoff Card (Print: Hidden) */}
      <Card className="print:hidden bg-gradient-to-br from-brand-900 to-navy-950 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-2">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-brand-400" />
              <h3 className="text-base sm:text-lg font-bold">
                Share this Summary with a Qualified Tax Professional
              </h3>
            </div>
            <p className="text-xs text-surface-300 leading-relaxed">
              Connect directly with a licensed CPA or Enrolled Agent (EA) to review your calculation summary, evaluate complex state deductions, or handle your formal federal filing.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/calculations/${report.calculationId}/professional`}>
              <Button
                variant="primary"
                size="sm"
                className="bg-brand-500 hover:bg-brand-400 text-white font-semibold text-xs whitespace-nowrap shadow-md"
              >
                Connect with a Tax Pro &rarr;
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
