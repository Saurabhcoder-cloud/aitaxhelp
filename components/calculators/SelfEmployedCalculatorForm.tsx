"use client";

import React, { useState, useMemo } from "react";
import { calculateSelfEmployedTax } from "../../tax-engine";
import { TaxFilingStatus, TaxYear } from "../../types/tax";
import { toCents, formatCurrencyFromCents, parseDollarInput } from "../../lib/utils/currency";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { FormField } from "../ui/FormField";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Badge } from "../ui/Badge";
import { Alert } from "../ui/Alert";

export function SelfEmployedCalculatorForm() {
  const [taxYear, setTaxYear] = useState<TaxYear>(2025);
  const [filingStatus, setFilingStatus] = useState<TaxFilingStatus>("single");
  const [grossRevenue, setGrossRevenue] = useState<string>("90,000");
  const [businessExpenses, setBusinessExpenses] = useState<string>("18,000");
  const [w2Wages, setW2Wages] = useState<string>("0");
  const [withholding, setWithholding] = useState<string>("0");

  const result = useMemo(() => {
    return calculateSelfEmployedTax({
      taxYear,
      filingStatus,
      gross1099IncomeCents: toCents(parseDollarInput(grossRevenue)),
      businessExpensesCents: toCents(parseDollarInput(businessExpenses)),
      w2WagesCents: toCents(parseDollarInput(w2Wages)),
      federalWithholdingCents: toCents(parseDollarInput(withholding)),
    });
  }, [taxYear, filingStatus, grossRevenue, businessExpenses, w2Wages, withholding]);

  const seDetails = result.selfEmploymentDetails;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Form Input Panel */}
      <div className="lg:col-span-5 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Business & Self-Employment Inputs</CardTitle>
            <p className="text-xs text-surface-500">
              Compute your Schedule SE tax and ordinary income tax liability.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Tax Year" id="seTaxYear">
                <Select
                  id="seTaxYear"
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

              <FormField label="Filing Status" id="seFilingStatus">
                <Select
                  id="seFilingStatus"
                  value={filingStatus}
                  onChange={(e) => setFilingStatus(e.target.value as TaxFilingStatus)}
                  options={[
                    { label: "Single", value: "single" },
                    { label: "Married Joint", value: "married_filing_jointly" },
                    { label: "Married Separate", value: "married_filing_separately" },
                    { label: "Head of Household", value: "head_of_household" },
                  ]}
                />
              </FormField>
            </div>

            <FormField
              label="Gross Business Revenue / 1099"
              id="grossRevenue"
              hint="Total gross receipts before any expenses"
              required
            >
              <Input
                id="grossRevenue"
                isCurrency
                value={grossRevenue}
                onChange={(e) => setGrossRevenue(e.target.value)}
                placeholder="90,000"
              />
            </FormField>

            <FormField
              label="Ordinary Business Expenses"
              id="businessExpenses"
              hint="Supplies, software, equipment, home office, travel"
              required
            >
              <Input
                id="businessExpenses"
                isCurrency
                value={businessExpenses}
                onChange={(e) => setBusinessExpenses(e.target.value)}
                placeholder="18,000"
              />
            </FormField>

            <FormField
              label="Other W-2 Employment Income (Optional)"
              id="seW2Wages"
              hint="If you also have a regular job, affects Social Security wage base cap"
            >
              <Input
                id="seW2Wages"
                isCurrency
                value={w2Wages}
                onChange={(e) => setW2Wages(e.target.value)}
                placeholder="0"
              />
            </FormField>

            <FormField
              label="Tax Payments / Withholding Already Paid"
              id="seWithholding"
              hint="W-2 withholding or previous estimated quarterly payments"
            >
              <Input
                id="seWithholding"
                isCurrency
                value={withholding}
                onChange={(e) => setWithholding(e.target.value)}
                placeholder="0"
              />
            </FormField>
          </CardContent>
        </Card>
      </div>

      {/* Results Panel */}
      <div className="lg:col-span-7 space-y-6">
        {/* Warnings */}
        {result.warnings.some((w) => w.code === "BUSINESS_LOSS_DETECTED") && (
          <Alert variant="warning" title="Net Business Loss Detected">
            Your deductible business expenses exceed gross revenue. You have no self-employment tax liability, and net losses may offset other eligible income.
          </Alert>
        )}

        <Card className="border-t-4 border-t-emerald-600 bg-gradient-to-br from-white to-surface-50">
          <div className="flex items-center justify-between border-b border-surface-200 pb-4 mb-6">
            <div>
              <span className="text-xs uppercase font-bold text-surface-500 tracking-wider">
                Combined Liability
              </span>
              <h2 className="text-xl font-bold text-surface-900">
                Total Estimated Federal Tax
              </h2>
            </div>
            <Badge variant="emerald">Schedule SE + Income Tax</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-white border border-surface-200 shadow-subtle">
              <span className="text-xs text-surface-500 block">Total Combined Tax</span>
              <span className="text-2xl font-black text-surface-900 mt-1 block">
                {formatCurrencyFromCents(result.totalTaxLiabilityCents)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-surface-200 shadow-subtle">
              <span className="text-xs text-surface-500 block">Self-Employment Tax</span>
              <span className="text-2xl font-black text-emerald-600 mt-1 block">
                {formatCurrencyFromCents(result.selfEmploymentTaxCents)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-surface-200 shadow-subtle">
              <span className="text-xs text-surface-500 block">Federal Income Tax</span>
              <span className="text-2xl font-black text-brand-600 mt-1 block">
                {formatCurrencyFromCents(result.federalIncomeTaxCents)}
              </span>
            </div>
          </div>

          {/* Schedule SE Breakdown */}
          {seDetails && (
            <div className="rounded-xl border border-surface-200 bg-surface-50 p-4 space-y-2.5 text-sm mb-6">
              <h4 className="font-bold text-surface-900 text-xs uppercase tracking-wider mb-2">
                Schedule SE Tax Breakdown
              </h4>
              <div className="flex justify-between text-surface-600">
                <span>Net Business Profit:</span>
                <span className="font-semibold text-surface-900">
                  {formatCurrencyFromCents(seDetails.netSelfEmploymentProfitCents)}
                </span>
              </div>
              <div className="flex justify-between text-surface-600">
                <span>Taxable SE Profit (92.35% Statutory Factor):</span>
                <span className="font-semibold text-surface-900">
                  {formatCurrencyFromCents(seDetails.taxableSelfEmploymentProfitCents)}
                </span>
              </div>
              <div className="flex justify-between text-surface-600">
                <span>Social Security Tax (12.4%):</span>
                <span className="font-semibold text-surface-900">
                  {formatCurrencyFromCents(seDetails.socialSecurityTaxCents)}
                </span>
              </div>
              <div className="flex justify-between text-surface-600">
                <span>Medicare Tax (2.9%):</span>
                <span className="font-semibold text-surface-900">
                  {formatCurrencyFromCents(seDetails.medicareTaxCents)}
                </span>
              </div>
              <div className="flex justify-between text-surface-700 border-t border-surface-200 pt-2 font-medium">
                <span>Deductible Half of SE Tax (reduces AGI):</span>
                <span className="font-bold text-emerald-700">
                  -{formatCurrencyFromCents(seDetails.deductibleHalfCents)}
                </span>
              </div>
            </div>
          )}

          {/* Balance Position */}
          <div className="p-4 rounded-xl border flex items-center justify-between bg-white border-surface-200">
            <div>
              <span className="text-xs font-semibold uppercase text-surface-500">
                Estimated Net Position
              </span>
              <h3 className="text-lg font-bold text-surface-900">
                {result.estimatedAmountOwedCents > 0
                  ? "Estimated Balance Due"
                  : result.estimatedRefundCents > 0
                  ? "Estimated Overpayment / Refund"
                  : "Balanced"}
              </h3>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-surface-900">
                {result.estimatedAmountOwedCents > 0
                  ? formatCurrencyFromCents(result.estimatedAmountOwedCents)
                  : result.estimatedRefundCents > 0
                  ? formatCurrencyFromCents(result.estimatedRefundCents)
                  : "$0.00"}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
