import React from "react";
import { TaxCalculationResult } from "@/types/tax";
import {
  generateTaxPlanningInsights,
  extractTaxDrivers,
  TaxPlanningInsight,
  TaxDriver,
} from "@/lib/services/tax-insights";
import { formatCurrencyFromCents } from "@/lib/utils/currency";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Lightbulb,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Info,
  Scale,
  Briefcase,
  DollarSign,
} from "lucide-react";


export interface TaxInsightsPanelProps {
  result: TaxCalculationResult;
  inputSnapshot?: Record<string, unknown>;
  title?: string;
  className?: string;
}

function getCategoryIcon(category: TaxPlanningInsight["category"]) {
  switch (category) {
    case "income":
    case "tax_brackets":
      return <TrendingUp className="w-4 h-4 text-brand-600" />;
    case "deductions":
      return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
    case "withholding":
    case "estimated_payments":
      return <DollarSign className="w-4 h-4 text-brand-600" />;
    case "self_employment":
      return <Briefcase className="w-4 h-4 text-purple-600" />;
    case "scenario_comparison":
      return <Scale className="w-4 h-4 text-amber-600" />;
    case "planning_consideration":
    default:
      return <Lightbulb className="w-4 h-4 text-amber-500" />;
  }
}

function getLevelBadgeVariant(level: TaxPlanningInsight["level"]) {
  switch (level) {
    case "positive":
      return "emerald";
    case "caution":
      return "amber";
    case "info":
    default:
      return "neutral";
  }
}

function getCategoryLabel(category: TaxPlanningInsight["category"]): string {
  switch (category) {
    case "income":
      return "Income";
    case "deductions":
      return "Deductions";
    case "self_employment":
      return "Self-Employment";
    case "withholding":
      return "Withholding";
    case "estimated_payments":
      return "Estimated Payments";
    case "tax_brackets":
      return "Tax Brackets";
    case "scenario_comparison":
      return "Comparison";
    case "planning_consideration":
      return "Planning";
    default:
      return "Insight";
  }
}

export function TaxInsightsPanel({
  result,
  inputSnapshot,
  title,
  className = "",
}: TaxInsightsPanelProps) {
  const insights = generateTaxPlanningInsights(result, inputSnapshot);
  const drivers = extractTaxDrivers(result);

  return (
    <div className={`space-y-6 ${className}`} aria-label="Tax Planning Insights">
      {/* 1. At a Glance Summary Card */}
      <Card className="border-t-4 border-t-amber-500 bg-gradient-to-br from-white to-surface-50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-surface-200 pb-4 mb-4 gap-2">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-bold text-surface-900">
              {title ? `${title} – Tax Planning & Insights` : "Tax Planning & Insights"}
            </h3>
          </div>
          <Badge variant="brand" size="sm">
            Educational Planning Layer
          </Badge>
        </div>

        <p className="text-xs sm:text-sm text-surface-600 leading-relaxed mb-4">
          This planning overview explains the deterministic tax calculation result, identifies key factors driving your federal tax, and highlights verified educational planning considerations.
        </p>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-surface-100 border border-surface-200">
            <span className="text-surface-500 block">Federal Tax Liability:</span>
            <span className="font-extrabold text-surface-900 text-sm mt-0.5 block">
              {formatCurrencyFromCents(result.totalTaxLiabilityCents)}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-surface-100 border border-surface-200">
            <span className="text-surface-500 block">Effective Tax Rate:</span>
            <span className="font-extrabold text-brand-600 text-sm mt-0.5 block">
              {(result.effectiveTaxRate * 100).toFixed(1)}%
            </span>
          </div>
          <div className="p-3 rounded-lg bg-surface-100 border border-surface-200">
            <span className="text-surface-500 block">Top Marginal Bracket:</span>
            <span className="font-extrabold text-surface-900 text-sm mt-0.5 block">
              {Math.round(result.marginalTaxBracket * 100)}%
            </span>
          </div>
          <div className="p-3 rounded-lg bg-surface-100 border border-surface-200">
            <span className="text-surface-500 block">Net Position:</span>
            <span
              className={`font-extrabold text-sm mt-0.5 block ${
                result.estimatedRefundCents > 0
                  ? "text-emerald-600"
                  : result.estimatedAmountOwedCents > 0
                  ? "text-amber-600"
                  : "text-surface-700"
              }`}
            >
              {result.estimatedRefundCents > 0
                ? `Refund: +${formatCurrencyFromCents(result.estimatedRefundCents)}`
                : result.estimatedAmountOwedCents > 0
                ? `Due: -${formatCurrencyFromCents(result.estimatedAmountOwedCents)}`
                : "$0.00 balanced"}
            </span>
          </div>
        </div>
      </Card>

      {/* 2. What is driving your tax? (Tax Drivers Section) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-600" />
            <CardTitle>What is Driving Your Tax?</CardTitle>
          </div>
          <p className="text-xs text-surface-500">
            Key factors derived directly from your verified calculation output that shape your final tax liability.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {drivers.map((driver: TaxDriver) => (
              <div
                key={driver.id}
                className="p-3.5 rounded-xl border border-surface-200 bg-surface-50/80 hover:bg-surface-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-bold text-sm text-surface-900">{driver.title}</span>
                  <Badge
                    variant={driver.importance === "primary" ? "brand" : "neutral"}
                    size="sm"
                  >
                    {driver.importance === "primary" ? "Primary Driver" : "Secondary Factor"}
                  </Badge>
                </div>
                <p className="text-xs text-surface-600 leading-relaxed">
                  {driver.impactDescription}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 3. Structured Planning Insights (Categorized Cards) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-brand-600" />
            <CardTitle>Structured Tax Insights & Observations</CardTitle>
          </div>
          <p className="text-xs text-surface-500">
            Objective, rule-based observations grounded in official statutory IRS provisions for Tax Year {result.taxYear}.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.map((insight: TaxPlanningInsight) => (
              <div
                key={insight.id}
                className="p-4 rounded-xl border border-surface-200 bg-white hover:border-surface-300 transition-colors space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-md bg-surface-100">
                      {getCategoryIcon(insight.category)}
                    </span>
                    <span className="font-bold text-sm text-surface-900">
                      {insight.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" size="sm">
                      {getCategoryLabel(insight.category)}
                    </Badge>
                    <Badge variant={getLevelBadgeVariant(insight.level)} size="sm">
                      {insight.level.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <p className="text-xs text-surface-600 leading-relaxed">
                  {insight.explanation}
                </p>

                {insight.disclaimer && (
                  <div className="flex items-start gap-1.5 pt-1 text-[11px] text-surface-500 italic">
                    <Info className="w-3.5 h-3.5 mt-0.5 text-surface-400 flex-shrink-0" />
                    <span>{insight.disclaimer}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 4. Statutory Scope Boundaries & Educational Disclaimer */}
      <div className="p-4 rounded-xl border border-surface-200 bg-surface-50 text-xs text-surface-600 space-y-2">
        <div className="flex items-center gap-2 font-bold text-surface-900 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span>Statutory Scope Notice & Educational Disclaimer</span>
        </div>
        <p className="leading-relaxed">
          Estimates are based on the deterministic calculation engine and user inputs entered. This planning tool provides educational guidance and is not a substitute for certified CPA, Enrolled Agent, or legal tax advice.
        </p>
        <p className="leading-relaxed text-surface-500">
          <strong>Outside Current Engine Scope:</strong> State and local income taxes, itemized deduction optimization (Schedule A), child and dependent credits, clean energy credits, and specialized retirement contribution strategies (e.g. Solo 401(k), defined benefit plans). For complex tax scenarios or formal tax return filing, consult a licensed tax professional.
        </p>
      </div>
    </div>
  );
}
