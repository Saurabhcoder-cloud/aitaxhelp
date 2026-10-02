"use client";

import React from "react";
import Link from "next/link";
import { TaxPreparationSession } from "@/lib/services/tax-preparation-session-store";
import { formatCurrencyFromCents } from "@/lib/utils/currency";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TaxInsightsPanel } from "@/components/calculators/TaxInsightsPanel";
import {
  Sparkles,
  UserCheck,
  FileText,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Download,
  ExternalLink,
  HelpCircle,
  MessageCircle,
} from "lucide-react";
import { ProfessionalReviewModal } from "@/components/preparation/ProfessionalReviewModal";
import { PreparationHumanEscalationModal } from "@/components/preparation/PreparationHumanEscalationModal";
import { ProfessionalLeadRecord } from "@/lib/services/professional-lead-store";

const CONTEXTUAL_AI_QUESTIONS = [
  { label: "Explain my tax result", query: "Explain my tax result." },
  { label: "Why do I owe/refund this amount?", query: "Why do I owe/refund this amount?" },
  { label: "Explain my family credits", query: "Explain my family credits and how they were calculated." },
  { label: "What information am I missing?", query: "What information am I missing?" },
  { label: "Explain my deductions", query: "Explain my deductions." },
  { label: "What should I review before submitting?", query: "What should I review before submitting?" },
  { label: "Explain this in simple language", query: "Explain this in simple language." },
];

export function TaxSituationSummaryPanel({
  session,
  onCalculate,
  isCalculating = false,
}: {
  session: TaxPreparationSession;
  onCalculate?: () => void;
  isCalculating?: boolean;
}) {
  const summary = session.situationSummary;
  const calc = summary.calculation;
  const needed = summary.readiness.missing.length + summary.readiness.errors.length;
  const calculationId = session.calculationId || calc?.calculationId;

  const [isReviewModalOpen, setIsReviewModalOpen] = React.useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = React.useState(false);
  const [leadRecord, setLeadRecord] = React.useState<ProfessionalLeadRecord | null>(null);

  React.useEffect(() => {
    async function checkLead() {
      if (!session?.id) return;
      try {
        const res = await fetch(`/api/v1/professional-leads?sessionId=${encodeURIComponent(session.id)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setLeadRecord(json.data);
          }
        }
      } catch (_e) {
        // Quietly ignore check failure
      }
    }
    checkLead();
  }, [session?.id]);

  const household = summary.householdSummary;

  return (
    <section className="space-y-6" aria-labelledby="situation-heading">
      {/* Overview & Metadata Card */}
      <Card className="border-surface-200">
        <CardHeader className="pb-3 border-b border-surface-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle id="situation-heading" className="text-lg font-bold text-surface-900">
              Tax Situation Summary
            </CardTitle>
            <p className="text-xs text-surface-500 mt-0.5">
              Tax Year {summary.taxYear} · Filing Status:{" "}
              <span className="font-semibold text-surface-700 capitalize">
                {household?.filingStatusLabel || summary.filingStatus.replaceAll("_", " ")}
              </span>
              {summary.taxpayerName ? ` · Taxpayer: ${summary.taxpayerName}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={summary.calculationStatus === "calculated" ? "emerald" : summary.calculationStatus === "ready" ? "brand" : "amber"}
              size="sm"
            >
              {summary.calculationStatus === "calculated"
                ? "Calculated"
                : summary.calculationStatus === "ready"
                ? "Ready to Calculate"
                : "Information Needed"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4 text-sm">
          {/* Income, Household & Expenses entered */}
          <div>
            <p className="font-semibold text-surface-900 mb-1.5">What you told us</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-surface-700">
              {/* Household Block */}
              <div className="p-2.5 rounded-lg bg-surface-50 border border-surface-200 space-y-1">
                <p className="text-xs text-surface-500 uppercase tracking-wider font-semibold">Household</p>
                <p className="text-sm font-medium text-surface-900">
                  Status: {household?.filingStatusLabel || summary.filingStatus.replaceAll("_", " ")}
                </p>
                <p className="text-xs text-surface-700">
                  Spouse: {household?.hasSpouse ? household.spouseName || "Included" : "None"}
                </p>
                <p className="text-xs text-surface-700">
                  Dependents: {household ? `${household.dependentsCount} (${household.qualifyingChildrenCount} for CTC)` : "0"}
                </p>
              </div>

              {/* Reported Income Block */}
              <div className="p-2.5 rounded-lg bg-surface-50 border border-surface-200 space-y-1">
                <p className="text-xs text-surface-500 uppercase tracking-wider font-semibold">Reported Income</p>
                <p className="text-sm font-medium text-surface-900">
                  W-2: {formatCurrencyFromCents(summary.whatYouToldUs.w2WagesCents)}
                </p>
                <p className="text-xs text-surface-700">
                  1099: {formatCurrencyFromCents(summary.whatYouToldUs.form1099GrossCents)}
                </p>
                <p className="text-xs text-surface-700">
                  Gig/Biz: {formatCurrencyFromCents(summary.whatYouToldUs.gigBusinessGrossCents)}
                </p>
              </div>

              {/* Deductions & Expenses Block */}
              <div className="p-2.5 rounded-lg bg-surface-50 border border-surface-200 space-y-1">
                <p className="text-xs text-surface-500 uppercase tracking-wider font-semibold">Deductions & Expenses</p>
                <p className="text-sm font-medium text-surface-900">
                  Expenses: {formatCurrencyFromCents(summary.whatYouToldUs.expenseCents)}
                </p>
                <p className="text-xs text-surface-600 mt-1">
                  Standard deduction applied automatically by engine.
                </p>
              </div>
            </div>
            {summary.whatYouToldUs.incomeSources.length > 0 && (
              <div className="mt-2 text-xs text-surface-600">
                Sources: {summary.whatYouToldUs.incomeSources.join(", ")}
              </div>
            )}
          </div>

          {/* Documents & Still Needed */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-surface-100">
            <div>
              <p className="font-semibold text-surface-900 mb-1 text-xs uppercase tracking-wider text-surface-500">
                Documents & Information Received
              </p>
              <ul className="text-xs text-surface-700 space-y-1">
                {summary.informationReceived.length === 0 ? (
                  <li className="text-surface-400">None recorded yet</li>
                ) : (
                  summary.informationReceived.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-1.5 text-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-surface-900 mb-1 text-xs uppercase tracking-wider text-surface-500">
                Information Still Needed
              </p>
              <ul className="text-xs text-surface-700 space-y-1">
                {summary.informationStillNeeded.length === 0 && summary.warnings.length === 0 ? (
                  <li className="text-emerald-700 font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Nothing required is missing.
                  </li>
                ) : (
                  <>
                    {summary.informationStillNeeded.map((item, idx) => (
                      <li key={`need-${idx}`} className="flex items-center gap-1.5 text-amber-800">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                    {summary.warnings.map((item, idx) => (
                      <li key={`warn-${idx}`} className="flex items-center gap-1.5 text-surface-600">
                        <AlertCircle className="w-3.5 h-3.5 text-surface-400 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </>
                )}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* When calculated: Display the 3 distinct pillars */}
      {calc && (
        <div className="space-y-6">
          {/* ========================================================================= */}
          {/* PILLAR 1: CALCULATED RESULT (DETERMINISTIC TAX ENGINE ONLY)                */}
          {/* ========================================================================= */}
          <Card className="border-t-4 border-t-emerald-600 shadow-sm">
            <CardHeader className="pb-3 border-b border-surface-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="emerald" size="sm">CALCULATED RESULT</Badge>
                  <span className="text-xs text-surface-500 font-mono">
                    Engine v{calc.engineVersion} · Rules {calc.rulesVersion}
                  </span>
                </div>
                <CardTitle className="text-xl font-black text-surface-900 mt-1">
                  Deterministic Federal Tax Calculation
                </CardTitle>
                <p className="text-xs text-surface-600">
                  Computed by the TaxAIHelp deterministic tax engine following official IRS statutory tax rules.
                </p>
              </div>
              {calculationId && (
                <Link href={`/dashboard/calculations/${calculationId}`}>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
                    Full Bracket Breakdown
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              )}
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Highlight Banner: Refund or Balance Due */}
              <div
                className={`p-4 rounded-xl border ${
                  calc.refundOrBalanceDue.type === "refund"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                    : calc.refundOrBalanceDue.type === "balance_due"
                    ? "bg-amber-50 border-amber-200 text-amber-950"
                    : "bg-surface-50 border-surface-200 text-surface-900"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider opacity-80">
                      {calc.refundOrBalanceDue.type === "refund"
                        ? "Estimated Federal Refund"
                        : calc.refundOrBalanceDue.type === "balance_due"
                        ? "Estimated Federal Tax Owed"
                        : "Estimated Federal Balance"}
                    </p>
                    <p className="text-3xl font-extrabold tracking-tight mt-0.5">
                      {formatCurrencyFromCents(calc.refundOrBalanceDue.amountCents)}
                    </p>
                    <p className="text-xs opacity-75 mt-1">
                      {calc.refundOrBalanceDue.type === "refund"
                        ? "Total payments and federal withholdings exceeded total tax liability."
                        : calc.refundOrBalanceDue.type === "balance_due"
                        ? "Total tax liability exceeds payments and federal withholdings."
                        : "Withholdings exactly match calculated federal tax liability."}
                    </p>
                  </div>
                  <div className="sm:text-right space-y-1">
                    <p className="text-xs font-medium opacity-80">Effective Tax Rate</p>
                    <p className="text-lg font-bold">{(calc.effectiveTaxRate * 100).toFixed(1)}%</p>
                    <p className="text-xs opacity-75">
                      Marginal Bracket: {(calc.marginalTaxBracket * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Numerical Tax Breakdown Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-surface-800">
                <div className="p-3 rounded-lg bg-surface-50 border border-surface-200">
                  <p className="text-xs text-surface-500 font-semibold uppercase">Total Income</p>
                  <p className="text-base font-bold text-surface-900 mt-0.5">
                    {formatCurrencyFromCents(calc.totalIncomeCents)}
                  </p>
                  <p className="text-[11px] text-surface-500">Gross earnings</p>
                </div>
                <div className="p-3 rounded-lg bg-surface-50 border border-surface-200">
                  <p className="text-xs text-surface-500 font-semibold uppercase">Deductions</p>
                  <p className="text-base font-bold text-surface-900 mt-0.5">
                    {formatCurrencyFromCents(calc.deductionUsedCents)}
                  </p>
                  <p className="text-[11px] text-surface-500">Standard deduction</p>
                </div>
                <div className="p-3 rounded-lg bg-surface-50 border border-surface-200">
                  <p className="text-xs text-surface-500 font-semibold uppercase">Taxable Income</p>
                  <p className="text-base font-bold text-surface-900 mt-0.5">
                    {formatCurrencyFromCents(calc.taxableIncomeCents)}
                  </p>
                  <p className="text-[11px] text-surface-500">Subject to tax</p>
                </div>
                <div className="p-3 rounded-lg bg-surface-50 border border-surface-200">
                  <p className="text-xs text-surface-500 font-semibold uppercase">Withholding</p>
                  <p className="text-base font-bold text-surface-900 mt-0.5">
                    {formatCurrencyFromCents(calc.totalPaymentsAndWithholdingCents)}
                  </p>
                  <p className="text-[11px] text-surface-500">W-2 & 1099 paid</p>
                </div>
              </div>

              {/* Family & Tax Credits Breakdown */}
              {calc.credits && (calc.credits.totalCreditsCents > 0 || (calc.totalCreditsCents && calc.totalCreditsCents > 0)) && (
                <div className="p-3.5 rounded-lg bg-emerald-50/60 border border-emerald-200 text-xs text-surface-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-950 uppercase tracking-wider text-[11px]">
                      Family & Tax Credits (Official IRS Rules)
                    </span>
                    <span className="font-bold text-emerald-900 text-sm">
                      -{formatCurrencyFromCents(calc.totalCreditsCents || calc.credits.totalCreditsCents)}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-emerald-200/60">
                    <div>
                      <p className="text-surface-600">Tax Before Credits:</p>
                      <p className="font-semibold text-surface-900">
                        {formatCurrencyFromCents(calc.taxBeforeCreditsCents ?? calc.federalIncomeTaxCents)}
                      </p>
                    </div>
                    {calc.credits.childTaxCreditCents > 0 && (
                      <div>
                        <p className="text-surface-600">Child Tax Credit (CTC):</p>
                        <p className="font-semibold text-emerald-800">
                          {formatCurrencyFromCents(calc.credits.childTaxCreditCents)} ({calc.credits.qualifyingChildrenCount} qualifying child/children)
                        </p>
                      </div>
                    )}
                    {calc.credits.creditForOtherDependentsCents > 0 && (
                      <div>
                        <p className="text-surface-600">Credit for Other Dependents (ODC):</p>
                        <p className="font-semibold text-emerald-800">
                          {formatCurrencyFromCents(calc.credits.creditForOtherDependentsCents)} ({calc.credits.otherDependentsCount} dependent(s))
                        </p>
                      </div>
                    )}
                    {calc.credits.additionalChildTaxCreditCents > 0 && (
                      <div>
                        <p className="text-surface-600">Additional Child Tax Credit (Refundable ACTC):</p>
                        <p className="font-semibold text-emerald-800">
                          {formatCurrencyFromCents(calc.credits.additionalChildTaxCreditCents)}
                        </p>
                      </div>
                    )}
                    {calc.credits.earnedIncomeCreditCents > 0 && (
                      <div>
                        <p className="text-surface-600">Earned Income Tax Credit (Refundable EITC):</p>
                        <p className="font-semibold text-emerald-800">
                          {formatCurrencyFromCents(calc.credits.earnedIncomeCreditCents)}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="pt-1.5 border-t border-emerald-200/60 flex flex-wrap justify-between items-center text-emerald-950 font-medium">
                    <span>Final Federal Tax Liability (after non-refundable credits):</span>
                    <span className="font-bold text-surface-900">
                      {formatCurrencyFromCents(calc.totalTaxLiabilityCents)}
                    </span>
                  </div>
                </div>
              )}

              {/* Tax Liability Components */}
              <div className="p-3 rounded-lg bg-surface-50 border border-surface-200 text-xs text-surface-700 flex flex-col sm:flex-row justify-between gap-2">
                <div>
                  <span className="font-semibold text-surface-900">Tax Liability Breakdown: </span>
                  <span>
                    Tax Before Credits: {formatCurrencyFromCents(calc.taxBeforeCreditsCents ?? calc.federalIncomeTaxCents)}
                  </span>
                  {calc.totalCreditsCents && calc.totalCreditsCents > 0 && (
                    <span className="ml-2 font-medium text-emerald-700">
                      - Family Credits: {formatCurrencyFromCents(calc.totalCreditsCents)}
                    </span>
                  )}
                  {calc.selfEmploymentTaxCents > 0 && (
                    <span className="ml-2 font-medium text-purple-700">
                      + Self-Employment Tax: {formatCurrencyFromCents(calc.selfEmploymentTaxCents)}
                    </span>
                  )}
                </div>
                <div className="font-bold text-surface-900">
                  Final Federal Tax Liability: {formatCurrencyFromCents(calc.totalTaxLiabilityCents)}
                </div>
              </div>

              {/* Engine Warnings & Limitations */}
              {calc.warnings && calc.warnings.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-xs font-semibold text-surface-600 uppercase tracking-wider">
                    Calculation Notices & Limitations
                  </p>
                  <div className="space-y-1">
                    {calc.warnings.map((w, idx) => (
                      <div
                        key={idx}
                        className="text-xs px-3 py-1.5 rounded bg-surface-100/70 border border-surface-200 text-surface-700 flex items-start gap-2"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-surface-500 shrink-0 mt-0.5" />
                        <span>{w.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ========================================================================= */}
          {/* PILLAR 2: AI EXPLANATION (EXPLANATION ONLY, NEVER CALCULATES NUMBERS)     */}
          {/* ========================================================================= */}
          <Card className="border-t-4 border-t-brand-500 shadow-sm bg-gradient-to-br from-white to-brand-50/20">
            <CardHeader className="pb-3 border-b border-surface-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="brand" size="sm">AI EXPLANATION</Badge>
                  <Sparkles className="w-4 h-4 text-brand-600" />
                </div>
                <CardTitle className="text-lg font-bold text-surface-900 mt-1">
                  Educational AI Explanation & Insights
                </CardTitle>
                <p className="text-xs text-surface-600">
                  AI explains this verified calculation in plain English. AI NEVER invents or calculates tax numbers.
                </p>
              </div>
              <Link href={`/ai-tax-assistant?sessionId=${encodeURIComponent(session.id)}`}>
                <Button variant="secondary" size="sm" className="gap-1.5 text-xs font-semibold shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                  Ask AI Tax Assistant
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-sm text-surface-700">
              <p className="leading-relaxed">
                You have a calculated{" "}
                <strong>
                  {calc.refundOrBalanceDue.type === "refund" ? "refund" : "tax liability balance"} of{" "}
                  {formatCurrencyFromCents(calc.refundOrBalanceDue.amountCents)}
                </strong>{" "}
                on <strong>{formatCurrencyFromCents(calc.totalIncomeCents)}</strong> of total earnings for tax year{" "}
                <strong>{summary.taxYear}</strong> ({summary.filingStatus.replaceAll("_", " ")}).
              </p>
              <ul className="text-xs space-y-1.5 text-surface-600 list-disc list-inside">
                <li>
                  Your standard deduction of <strong>{formatCurrencyFromCents(calc.deductionUsedCents)}</strong> reduced
                  your taxable income to <strong>{formatCurrencyFromCents(calc.taxableIncomeCents)}</strong>.
                </li>
                {calc.selfEmploymentTaxCents > 0 && (
                  <li>
                    Schedule SE self-employment tax was calculated on your 1099 and gig earnings, with a 50% above-the-line deduction applied to AGI.
                  </li>
                )}
                {calc.totalCreditsCents && calc.totalCreditsCents > 0 ? (
                  <li>
                    You received <strong>{formatCurrencyFromCents(calc.totalCreditsCents)}</strong> in family tax credits
                    {calc.credits?.childTaxCreditCents ? " (including the Child Tax Credit)" : ""}, directly lowering your federal tax liability dollar-for-dollar.
                  </li>
                ) : null}
                <li>
                  Your federal withholding of{" "}
                  <strong>{formatCurrencyFromCents(calc.totalPaymentsAndWithholdingCents)}</strong> was credited dollar-for-dollar against your total federal tax liability.
                </li>
              </ul>

              {/* Contextual AI Questions Quick Links */}
              <div className="pt-3 border-t border-brand-100/60">
                <p className="text-xs font-semibold text-brand-900 mb-2 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-brand-600" />
                  Contextual AI Questions (Informed by Verified Engine Data):
                </p>
                <div className="flex flex-wrap gap-2">
                  {CONTEXTUAL_AI_QUESTIONS.map((q) => (
                    <Link
                      key={q.label}
                      href={`/ai-tax-assistant?sessionId=${encodeURIComponent(session.id)}&q=${encodeURIComponent(q.query)}`}
                    >
                      <button
                        type="button"
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-white border border-brand-200 text-brand-800 hover:bg-brand-50 hover:border-brand-300 transition-colors shadow-2xs font-medium flex items-center gap-1.5 text-left cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-brand-500 shrink-0" />
                        <span>{q.label}</span>
                      </button>
                    </Link>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ========================================================================= */}
          {/* TAX PLANNING INSIGHTS & DRIVERS (REUSED TaxInsightsPanel)                 */}
          {/* ========================================================================= */}
          {session.calculationSnapshot && (
            <TaxInsightsPanel
              result={session.calculationSnapshot}
              inputSnapshot={{
                w2WagesCents: summary.whatYouToldUs.w2WagesCents,
                gross1099IncomeCents:
                  summary.whatYouToldUs.form1099GrossCents + summary.whatYouToldUs.gigBusinessGrossCents,
                businessExpensesCents: summary.whatYouToldUs.expenseCents,
              }}
              title="Tax Planning & Key Drivers (IRS Ruleset)"
            />
          )}

          {/* ========================================================================= */}
          {/* PILLAR 3: PROFESSIONAL REVIEW & REPORT EXPORT                             */}
          {/* ========================================================================= */}
          <Card className="border-t-4 border-t-purple-600 shadow-sm bg-gradient-to-br from-white to-purple-50/20">
            <CardHeader className="pb-3 border-b border-surface-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="brand" size="sm">PROFESSIONAL REVIEW & EXPORT</Badge>
                  <UserCheck className="w-4 h-4 text-purple-600" />
                </div>
                <CardTitle className="text-lg font-bold text-surface-900 mt-1">
                  CPA / EA Review & Tax Summary Export
                </CardTitle>
                <p className="text-xs text-surface-600">
                  Connect with a licensed CPA/EA or export your complete verified preparation report.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {leadRecord ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsReviewModalOpen(true)}
                    className="gap-1.5 text-xs font-semibold border-purple-300 text-purple-800 hover:bg-purple-100"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                    <span>Review Status: {leadRecord.status.replace(/_/g, " ")}</span>
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsReviewModalOpen(true)}
                    className="gap-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Request CPA / EA Review</span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsHelpModalOpen(true)}
                  className="gap-1.5 text-xs font-medium text-surface-700"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                  <span>Need Help?</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3.5 text-sm text-surface-700">
              {/* If review has already been requested, show real-time status summary banner */}
              {leadRecord && (
                <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-purple-900 uppercase tracking-wider text-[11px]">
                        Professional Review Requested
                      </span>
                      <Badge variant="brand" size="sm">
                        {leadRecord.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="text-surface-700 mt-1">
                      {leadRecord.assignedProfessionalName ? (
                        <span className="font-semibold text-emerald-800">
                          Assigned Professional: {leadRecord.assignedProfessionalName}
                        </span>
                      ) : (
                        <span className="text-surface-600">
                          Awaiting professional assignment &bull; Queued for intake review
                        </span>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsReviewModalOpen(true)}
                    className="text-xs shrink-0 self-start sm:self-auto"
                  >
                    View Review Details
                  </Button>
                </div>
              )}

              <p className="leading-relaxed text-xs">
                Need certified assurance before submitting to the IRS? You can hand off this complete preparation record,
                including W-2s, 1099s, expense discovery, and calculation results, directly to a verified tax professional.
              </p>
              <div className="pt-2 border-t border-purple-100 flex flex-wrap items-center gap-2">
                <a
                  href="/api/v1/tax/preparation/session/report?download=true"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs font-medium">
                    <Download className="w-3.5 h-3.5" />
                    Download Report (HTML)
                  </Button>
                </a>
                <a
                  href="/api/v1/tax/preparation/session/report?format=html"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs font-medium">
                    <ExternalLink className="w-3.5 h-3.5" />
                    View Printable Report
                  </Button>
                </a>
                <a
                  href="/api/v1/tax/preparation/session/report?format=json"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs font-medium">
                    <FileText className="w-3.5 h-3.5" />
                    Export Data (JSON)
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* When not calculated yet: Readiness & Calculate action */}
      {!calc && (
        <Card className="border-surface-200 bg-surface-50 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-surface-900">
                {summary.calculationStatus === "ready"
                  ? "Ready for deterministic tax calculation"
                  : `${needed} item${needed === 1 ? "" : "s"} required before calculation`}
              </p>
              <p className="text-xs text-surface-600 mt-0.5">
                The deterministic tax engine will compute your federal tax liability, standard deduction, and net refund or balance due.
              </p>
            </div>
            {onCalculate && (
              <Button
                onClick={onCalculate}
                disabled={summary.calculationStatus !== "ready" || isCalculating}
                className="shrink-0"
              >
                {isCalculating ? "Calculating..." : "Calculate Taxes"}
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Modals for Professional Review and Human Escalation */}
      <ProfessionalReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        session={session}
        calculation={calc || null}
        calculationId={calculationId}
        onLeadCreated={(lead) => setLeadRecord(lead)}
      />

      <PreparationHumanEscalationModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        session={session}
        calculationId={calculationId}
      />
    </section>
  );
}
