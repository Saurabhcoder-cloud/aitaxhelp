"use client";

import React, { useState, useMemo } from "react";
import { calculateIncomeTax } from "../../tax-engine";
import { TaxFilingStatus, TaxYear } from "../../types/tax";
import { toCents, formatCurrencyFromCents, parseDollarInput } from "../../lib/utils/currency";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { FormField } from "../ui/FormField";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Badge } from "../ui/Badge";

export function IncomeTaxCalculatorForm() {
  const [taxYear, setTaxYear] = useState<TaxYear>(2025);
  const [filingStatus, setFilingStatus] = useState<TaxFilingStatus>("single");
  const [w2Wages, setW2Wages] = useState<string>("75,000");
  const [otherIncome, setOtherIncome] = useState<string>("0");
  const [withholding, setWithholding] = useState<string>("8,500");

  // Single source of truth: Invoke deterministic tax engine
  const result = useMemo(() => {
    return calculateIncomeTax({
      taxYear,
      filingStatus,
      w2WagesCents: toCents(parseDollarInput(w2Wages)),
      otherIncomeCents: toCents(parseDollarInput(otherIncome)),
      federalWithholdingCents: toCents(parseDollarInput(withholding)),
    });
  }, [taxYear, filingStatus, w2Wages, otherIncome, withholding]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Form Input Panel */}
      <div className="lg:col-span-5 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Taxpayer Inputs</CardTitle>
            <p className="text-xs text-surface-500">
              Enter your income and filing status for official IRS bracket computation.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Tax Year" id="taxYear">
                <Select
                  id="taxYear"
                  value={taxYear.toString()}
                  onChange={(e) => setTaxYear(Number(e.target.value) as TaxYear)}
                  options={[
                    { label: "2026 (Rev. Proc. 2025-32)", value: "2026" },
                    { label: "2025 (IRS IRB 2025-45 / OBBBA)", value: "2025" },
                    { label: "2024 (Rev. Proc. 2023-34)", value: "2024" },
                    { label: "2023 (Rev. Proc. 2022-38)", value: "2023" },
                  ]}
                />
              </FormField>

              <FormField label="Filing Status" id="filingStatus">
                <Select
                  id="filingStatus"
                  value={filingStatus}
                  onChange={(e) => setFilingStatus(e.target.value as TaxFilingStatus)}
                  options={[
                    { label: "Single", value: "single" },
                    { label: "Married Joint", value: "married_filing_jointly" },
                    { label: "Married Separate", value: "married_filing_separately" },
                    { label: "Head of Household", value: "head_of_household" },
                    { label: "Qualifying Surviving Spouse", value: "qualifying_surviving_spouse" },
                  ]}
                />
              </FormField>
            </div>

            <FormField
              label="W-2 Wages & Salary"
              id="w2Wages"
              hint="Box 1 of your Form W-2"
              required
            >
              <Input
                id="w2Wages"
                isCurrency
                value={w2Wages}
                onChange={(e) => setW2Wages(e.target.value)}
                placeholder="75,000"
              />
            </FormField>

            <FormField
              label="Other Taxable Ordinary Income"
              id="otherIncome"
              hint="Interest, non-qualified dividends, or other taxable income"
            >
              <Input
                id="otherIncome"
                isCurrency
                value={otherIncome}
                onChange={(e) => setOtherIncome(e.target.value)}
                placeholder="0"
              />
            </FormField>

            <FormField
              label="Federal Income Tax Withheld"
              id="withholding"
              hint="Box 2 of your Form W-2"
            >
              <Input
                id="withholding"
                isCurrency
                value={withholding}
                onChange={(e) => setWithholding(e.target.value)}
                placeholder="0"
              />
            </FormField>

            {/* Standard Deduction Transparency Callout */}
            <div className="rounded-lg bg-surface-50 border border-surface-200 p-3.5 text-xs space-y-1">
              <div className="flex items-center justify-between text-surface-900 font-semibold">
                <span>Standard Deduction Applied:</span>
                <span className="text-emerald-700 font-bold">
                  {formatCurrencyFromCents(result.deductionUsedCents)}
                </span>
              </div>
              <p className="text-surface-500 text-[11px] leading-relaxed">
                Automatically determined by IRS rules for Tax Year {result.taxYear} based on your {filingStatus.replace(/_/g, " ")} status. (Schedule A itemized deductions are not part of this baseline calculation).
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Engine Results Panel */}
      <div className="lg:col-span-7 space-y-6">
        {/* Primary Outcome Card */}
        <Card className="border-t-4 border-t-brand-600 bg-gradient-to-br from-white to-surface-50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-surface-200 pb-4 mb-6 gap-2">
            <div>
              <span className="text-xs uppercase font-bold text-surface-500 tracking-wider">
                Calculation Summary
              </span>
              <h2 className="text-xl font-bold text-surface-900">
                Federal Tax Liability
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="brand">Engine v{result.engineVersion}</Badge>
              <Badge variant="neutral" className="text-[10px] hidden sm:inline-flex">
                {result.taxYear} Rules
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-white border border-surface-200 shadow-subtle">
              <span className="text-xs text-surface-500 block">Total Federal Tax</span>
              <span className="text-2xl font-black text-surface-900 mt-1 block">
                {formatCurrencyFromCents(result.federalIncomeTaxCents)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-surface-200 shadow-subtle">
              <span className="text-xs text-surface-500 block">Effective Tax Rate</span>
              <span className="text-2xl font-black text-brand-600 mt-1 block">
                {(result.effectiveTaxRate * 100).toFixed(1)}%
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-surface-200 shadow-subtle">
              <span className="text-xs text-surface-500 block">Marginal Bracket</span>
              <span className="text-2xl font-black text-surface-900 mt-1 block">
                {(result.marginalTaxBracket * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Refund vs Amount Owed */}
          <div className="p-4 rounded-xl border mb-6 flex items-center justify-between bg-surface-50 border-surface-200">
            <div>
              <span className="text-xs font-semibold uppercase text-surface-500">
                Withholding Balance
              </span>
              <h3 className="text-lg font-bold text-surface-900">
                {result.estimatedRefundCents > 0
                  ? "Estimated Federal Refund"
                  : result.estimatedAmountOwedCents > 0
                  ? "Estimated Balance Due"
                  : "Tax Liability Balanced"}
              </h3>
            </div>
            <div className="text-right">
              <span
                className={`text-2xl font-black ${
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

          {/* Income & Deduction Waterfall */}
          <div className="space-y-2 text-sm border-t border-surface-200 pt-4">
            <div className="flex justify-between py-1 text-surface-600">
              <span>Gross Income:</span>
              <span className="font-semibold text-surface-900">
                {formatCurrencyFromCents(result.grossIncomeCents)}
              </span>
            </div>
            <div className="flex justify-between py-1 text-surface-600">
              <span>Standard Deduction:</span>
              <span className="font-semibold text-emerald-600">
                -{formatCurrencyFromCents(result.deductionUsedCents)}
              </span>
            </div>
            <div className="flex justify-between py-1 text-surface-600 border-t border-surface-100 pt-2 font-medium">
              <span>Taxable Income:</span>
              <span className="font-bold text-surface-900">
                {formatCurrencyFromCents(result.taxableIncomeCents)}
              </span>
            </div>
          </div>
        </Card>

        {/* Progressive Bracket Breakdown Card */}
        <Card>
          <CardHeader>
            <CardTitle>Progressive Bracket Breakdown (Tax Year {result.taxYear})</CardTitle>
            <p className="text-xs text-surface-500">
              How your taxable income is taxed across each progressive marginal rate tier. Sourced from {result.rulesVersion}.
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-surface-200 text-surface-500">
                    <th className="pb-2 font-semibold">Rate</th>
                    <th className="pb-2 font-semibold">Tax Bracket</th>
                    <th className="pb-2 font-semibold">Taxable in Tier</th>
                    <th className="pb-2 font-semibold text-right">Tax Owed</th>
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
      </div>
    </div>
  );
}
