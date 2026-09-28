import React from "react";
import Link from "next/link";
import { ScenarioComparisonResult } from "@/lib/services/tax-insights";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Scale, Info, Sparkles } from "lucide-react";


export interface ScenarioComparisonTableProps {
  comparison: ScenarioComparisonResult;
  className?: string;
}

export function ScenarioComparisonTable({
  comparison,
  className = "",
}: ScenarioComparisonTableProps) {
  const { calculationA: a, calculationB: b, metrics, insights, comparedAt } = comparison;

  const formattedComparedAt = new Date(comparedAt).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`space-y-6 ${className}`} aria-label="Tax Scenario Comparison">
      {/* Scenario Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Scenario A Card */}
        <div className="p-4 rounded-xl border border-surface-200 bg-surface-50 space-y-2">
          <div className="flex items-center justify-between">
            <Badge variant="brand" size="sm">
              Scenario A
            </Badge>
            <Link
              href={`/dashboard/calculations/${a.id}`}
              className="text-xs text-brand-600 hover:text-brand-800 underline font-semibold"
            >
              View Detail →
            </Link>
          </div>
          <h3 className="text-base font-bold text-surface-900 truncate" title={a.title}>
            {a.title}
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-xs text-surface-600">
            <span className="font-semibold text-surface-900">Tax Year {a.taxYear}</span>
            <span>&bull;</span>
            <span className="capitalize">{a.filingStatus.replace(/_/g, " ")}</span>
            <span>&bull;</span>
            <span className="font-mono text-[11px] text-surface-500">ID: {a.id.slice(0, 8)}</span>
          </div>
        </div>

        {/* Scenario B Card */}
        <div className="p-4 rounded-xl border border-surface-200 bg-surface-50 space-y-2">
          <div className="flex items-center justify-between">
            <Badge variant="emerald" size="sm">
              Scenario B
            </Badge>
            <Link
              href={`/dashboard/calculations/${b.id}`}
              className="text-xs text-brand-600 hover:text-brand-800 underline font-semibold"
            >
              View Detail →
            </Link>
          </div>
          <h3 className="text-base font-bold text-surface-900 truncate" title={b.title}>
            {b.title}
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-xs text-surface-600">
            <span className="font-semibold text-surface-900">Tax Year {b.taxYear}</span>
            <span>&bull;</span>
            <span className="capitalize">{b.filingStatus.replace(/_/g, " ")}</span>
            <span>&bull;</span>
            <span className="font-mono text-[11px] text-surface-500">ID: {b.id.slice(0, 8)}</span>
          </div>
        </div>
      </div>

      {/* Main Comparison Metrics Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-brand-600" />
                <CardTitle>Side-by-Side Calculation Comparison</CardTitle>
              </div>
              <p className="text-xs text-surface-500 mt-0.5">
                Exact mathematical variance between saved calculation records. Differences are labeled neutrally as deltas.
              </p>
            </div>
            <span className="text-[11px] text-surface-400 font-mono whitespace-nowrap">
              Compared: {formattedComparedAt}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm" aria-label="Scenario Comparison Metrics">
              <thead>
                <tr className="border-b border-surface-200 text-surface-500">
                  <th scope="col" className="pb-3 font-semibold">Tax Metric</th>
                  <th scope="col" className="pb-3 font-semibold text-right">Scenario A</th>
                  <th scope="col" className="pb-3 font-semibold text-right">Scenario B</th>
                  <th scope="col" className="pb-3 font-semibold text-right">Difference (B − A)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {metrics.map((metric) => (
                  <tr key={metric.key} className="hover:bg-surface-50/60 transition-colors">
                    <td className="py-3 font-medium text-surface-900">
                      {metric.label}
                    </td>
                    <td className="py-3 text-right font-mono text-surface-700">
                      {metric.valueAFormatted}
                    </td>
                    <td className="py-3 text-right font-mono text-surface-700">
                      {metric.valueBFormatted}
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`inline-block font-mono font-bold px-2 py-0.5 rounded text-xs ${
                          metric.deltaType === "positive"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : metric.deltaType === "negative"
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : "bg-surface-100 text-surface-700"
                        }`}
                      >
                        {metric.deltaFormatted}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 pt-3 border-t border-surface-100 text-[11px] text-surface-500 flex flex-wrap items-center justify-between gap-2">
            <span>
              <strong>Note on Deltas:</strong> Labeled neutrally as differences between saved calculations. Positive/negative badges indicate mathematical direction, not financial quality.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Variance Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-brand-600" />
              <CardTitle>Variance Analysis & Explanations</CardTitle>
            </div>
            <p className="text-xs text-surface-500">
              Grounded explanations for why the two saved calculations differ.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className="p-3.5 rounded-xl border border-surface-200 bg-surface-50/60 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-surface-900">{insight.title}</span>
                    <Badge
                      variant={
                        insight.level === "positive"
                          ? "emerald"
                          : insight.level === "caution"
                          ? "amber"
                          : "neutral"
                      }
                      size="sm"
                    >
                      {insight.level.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-surface-600 leading-relaxed">
                    {insight.explanation}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Strip: Ask AI & Disclaimers */}
      <div className="p-4 rounded-xl border border-surface-200 bg-surface-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-1 text-surface-600">
          <span className="font-bold text-surface-900 block">
            Educational Scenario Comparison
          </span>
          <p className="max-w-xl text-surface-500">
            Comparisons are calculated strictly between verified deterministic outputs. TaxAIHelp does not classify one scenario as universally superior to another, as individual taxpayer goals vary.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/ai-tax-assistant?calculationId=${encodeURIComponent(b.id)}`}>
            <Button variant="secondary" size="sm" className="gap-1.5 font-semibold text-xs whitespace-nowrap">
              <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              Ask AI about Scenario B
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
