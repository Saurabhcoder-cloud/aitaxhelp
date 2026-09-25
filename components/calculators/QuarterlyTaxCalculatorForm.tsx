"use client";

import React, { useState, useMemo } from "react";
import { calculateQuarterlyTax } from "../../tax-engine";
import { TaxFilingStatus, TaxYear } from "../../types/tax";
import { toCents, formatCurrencyFromCents, parseDollarInput } from "../../lib/utils/currency";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { FormField } from "../ui/FormField";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Badge } from "../ui/Badge";

export function QuarterlyTaxCalculatorForm() {
  const [taxYear, setTaxYear] = useState<TaxYear>(2025);
  const [filingStatus, setFilingStatus] = useState<TaxFilingStatus>("single");
  const [estimatedGross, setEstimatedGross] = useState<string>("100,000");
  const [estimatedExpenses, setEstimatedExpenses] = useState<string>("20,000");
  const [w2Withholding, setW2Withholding] = useState<string>("0");

  const result = useMemo(() => {
    return calculateQuarterlyTax({
      taxYear,
      filingStatus,
      estimatedAnnualGrossCents: toCents(parseDollarInput(estimatedGross)),
      estimatedAnnualExpensesCents: toCents(parseDollarInput(estimatedExpenses)),
      w2AnnualWithholdingCents: toCents(parseDollarInput(w2Withholding)),
    });
  }, [taxYear, filingStatus, estimatedGross, estimatedExpenses, w2Withholding]);

  const quarterlyData = result.quarterlyBreakdown;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Quarterly Inputs */}
      <div className="lg:col-span-5 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Annual Projection Inputs</CardTitle>
            <p className="text-xs text-surface-500">
              IRS Form 1040-ES estimated quarterly installment calculation.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Tax Year" id="qTaxYear">
                <Select
                  id="qTaxYear"
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

              <FormField label="Filing Status" id="qFilingStatus">
                <Select
                  id="qFilingStatus"
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
              label="Estimated Annual Gross Revenue"
              id="estimatedGross"
              hint="Projected total 1099/business revenue for the entire year"
              required
            >
              <Input
                id="estimatedGross"
                isCurrency
                value={estimatedGross}
                onChange={(e) => setEstimatedGross(e.target.value)}
                placeholder="100,000"
              />
            </FormField>

            <FormField
              label="Estimated Annual Business Expenses"
              id="estimatedExpenses"
              hint="Projected deductible operating expenses for the entire year"
              required
            >
              <Input
                id="estimatedExpenses"
                isCurrency
                value={estimatedExpenses}
                onChange={(e) => setEstimatedExpenses(e.target.value)}
                placeholder="20,000"
              />
            </FormField>

            <FormField
              label="Estimated W-2 Withholding (If Applicable)"
              id="w2Withholding"
              hint="Taxes your employer will withhold this year from W-2 paychecks"
            >
              <Input
                id="w2Withholding"
                isCurrency
                value={w2Withholding}
                onChange={(e) => setW2Withholding(e.target.value)}
                placeholder="0"
              />
            </FormField>
          </CardContent>
        </Card>
      </div>

      {/* Quarterly Results & Vouchers */}
      <div className="lg:col-span-7 space-y-6">
        <Card className="border-t-4 border-t-brand-600 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-surface-200 pb-4 mb-6">
            <div>
              <span className="text-xs uppercase font-bold text-surface-500 tracking-wider">
                IRS Form 1040-ES
              </span>
              <h2 className="text-xl font-bold text-surface-900">
                Quarterly Estimated Payments
              </h2>
            </div>
            <Badge variant="emerald">Form 1040-ES</Badge>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-brand-900 to-navy-950 text-white mb-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-200 block">
              Estimated Payment Per Quarter
            </span>
            <span className="text-3xl sm:text-4xl font-black mt-2 block tracking-tight">
              {formatCurrencyFromCents(quarterlyData?.quarterlyPaymentCents ?? 0)}
            </span>
            <span className="text-xs text-surface-300 mt-2 block">
              Total Projected Annual Liability: {formatCurrencyFromCents(result.totalTaxLiabilityCents)}
            </span>
          </div>

          {/* Vouchers Table */}
          <h4 className="font-bold text-surface-900 text-sm uppercase tracking-wider mb-3">
            IRS Form 1040-ES Payment Deadlines
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {quarterlyData?.paymentDeadlines.map((v, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-surface-200 bg-surface-50 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-brand-700 text-sm">
                      {v.quarter}
                    </span>
                    <span className="text-xs text-surface-500">{v.dueDate}</span>
                  </div>
                  <span className="text-xs text-surface-600 block mt-1">Payment Voucher</span>
                </div>
                <div className="text-right">
                  <span className="font-black text-surface-900 text-base">
                    {formatCurrencyFromCents(v.amountCents)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-lg bg-surface-100 text-xs text-surface-700 leading-relaxed">
            <span className="font-semibold block text-surface-900 mb-1">IRS Safe Harbor Rule:</span>
            To avoid IRS underpayment penalties, you generally must pay at least 90% of your current year tax liability or 100% of your prior year tax liability (110% if prior year AGI exceeded $150,000) through quarterly estimates and withholding.
          </div>
        </Card>
      </div>
    </div>
  );
}
