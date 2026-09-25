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

export function Tax1099CalculatorForm() {
  const [taxYear, setTaxYear] = useState<TaxYear>(2025);
  const [filingStatus, setFilingStatus] = useState<TaxFilingStatus>("single");
  const [gross1099, setGross1099] = useState<string>("85,000");

  // Granular 1099 Contractor Expenses
  const [equipmentSupplies, setEquipmentSupplies] = useState<string>("4,500");
  const [softwareSubscriptions, setSoftwareSubscriptions] = useState<string>("1,800");
  const [homeOfficeVehicle, setHomeOfficeVehicle] = useState<string>("3,200");
  const [otherExpenses, setOtherExpenses] = useState<string>("1,500");

  const totalExpensesDollars = useMemo(() => {
    return (
      parseDollarInput(equipmentSupplies) +
      parseDollarInput(softwareSubscriptions) +
      parseDollarInput(homeOfficeVehicle) +
      parseDollarInput(otherExpenses)
    );
  }, [equipmentSupplies, softwareSubscriptions, homeOfficeVehicle, otherExpenses]);

  // Invoking deterministic tax engine
  const result = useMemo(() => {
    return calculateSelfEmployedTax({
      taxYear,
      filingStatus,
      gross1099IncomeCents: toCents(parseDollarInput(gross1099)),
      businessExpensesCents: toCents(totalExpensesDollars),
    });
  }, [taxYear, filingStatus, gross1099, totalExpensesDollars]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* 1099 Inputs */}
      <div className="lg:col-span-5 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>1099 Contractor Earnings</CardTitle>
            <p className="text-xs text-surface-500">
              For 1099-NEC, 1099-K, and freelance contract gross receipts.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Tax Year" id="t1099TaxYear">
                <Select
                  id="t1099TaxYear"
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

              <FormField label="Filing Status" id="t1099FilingStatus">
                <Select
                  id="t1099FilingStatus"
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
              label="Total 1099 Gross Earnings"
              id="gross1099"
              hint="Sum of 1099-NEC box 1 and 1099-K client payments"
              required
            >
              <Input
                id="gross1099"
                isCurrency
                value={gross1099}
                onChange={(e) => setGross1099(e.target.value)}
                placeholder="85,000"
              />
            </FormField>

            <div className="border-t border-surface-200 pt-4 mt-4">
              <h4 className="text-sm font-semibold text-surface-900 mb-2">
                Deductible 1099 Business Expenses
              </h4>

              <div className="space-y-3">
                <FormField label="Equipment & Supplies" id="expEquipment">
                  <Input
                    id="expEquipment"
                    isCurrency
                    value={equipmentSupplies}
                    onChange={(e) => setEquipmentSupplies(e.target.value)}
                    placeholder="0"
                  />
                </FormField>

                <FormField label="Software & Professional Tools" id="expSoftware">
                  <Input
                    id="expSoftware"
                    isCurrency
                    value={softwareSubscriptions}
                    onChange={(e) => setSoftwareSubscriptions(e.target.value)}
                    placeholder="0"
                  />
                </FormField>

                <FormField label="Home Office & Business Mileage" id="expHomeOffice">
                  <Input
                    id="expHomeOffice"
                    isCurrency
                    value={homeOfficeVehicle}
                    onChange={(e) => setHomeOfficeVehicle(e.target.value)}
                    placeholder="0"
                  />
                </FormField>

                <FormField label="Other Legitimate Business Expenses" id="expOther">
                  <Input
                    id="expOther"
                    isCurrency
                    value={otherExpenses}
                    onChange={(e) => setOtherExpenses(e.target.value)}
                    placeholder="0"
                  />
                </FormField>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 1099 Results Panel */}
      <div className="lg:col-span-7 space-y-6">
        <Card className="border-t-4 border-t-brand-600 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-surface-200 pb-4 mb-6">
            <div>
              <span className="text-xs uppercase font-bold text-surface-500 tracking-wider">
                1099 Tax Estimates
              </span>
              <h2 className="text-xl font-bold text-surface-900">
                Net Earnings & Tax Obligations
              </h2>
            </div>
            <Badge variant="brand">1099 Contractor Engine</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-surface-50 border border-surface-200">
              <span className="text-xs text-surface-500 block">Net 1099 Profit</span>
              <span className="text-xl font-bold text-surface-900 mt-1 block">
                {formatCurrencyFromCents(
                  result.selfEmploymentDetails?.netSelfEmploymentProfitCents ?? 0
                )}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-surface-50 border border-surface-200">
              <span className="text-xs text-surface-500 block">Total Tax Owed</span>
              <span className="text-xl font-bold text-brand-600 mt-1 block">
                {formatCurrencyFromCents(result.totalTaxLiabilityCents)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-surface-50 border border-surface-200">
              <span className="text-xs text-surface-500 block">Total Effective Rate</span>
              <span className="text-xl font-bold text-surface-900 mt-1 block">
                {(result.effectiveTaxRate * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Breakdown List */}
          <div className="space-y-3 border-t border-surface-200 pt-4 text-sm">
            <div className="flex justify-between text-surface-600">
              <span>Gross 1099 Invoices:</span>
              <span className="font-semibold text-surface-900">
                {formatCurrencyFromCents(result.grossIncomeCents)}
              </span>
            </div>
            <div className="flex justify-between text-surface-600">
              <span>Deducted Business Expenses:</span>
              <span className="font-semibold text-emerald-600">
                -{formatCurrencyFromCents(toCents(totalExpensesDollars))}
              </span>
            </div>
            <div className="flex justify-between text-surface-600">
              <span>Self-Employment Tax (SECA 15.3% equiv):</span>
              <span className="font-semibold text-surface-900">
                {formatCurrencyFromCents(result.selfEmploymentTaxCents)}
              </span>
            </div>
            <div className="flex justify-between text-surface-600">
              <span>Federal Income Tax:</span>
              <span className="font-semibold text-surface-900">
                {formatCurrencyFromCents(result.federalIncomeTaxCents)}
              </span>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-lg bg-brand-50 border border-brand-200 text-xs text-brand-900 leading-relaxed">
            <span className="font-bold block mb-1">Recommended Tax Set-Aside:</span>
            As a 1099 contractor, no employer withholds taxes automatically. We recommend setting aside approximately{" "}
            <strong>{Math.ceil(result.effectiveTaxRate * 100)}% to {Math.ceil(result.effectiveTaxRate * 100) + 5}%</strong> of every client payment into a dedicated business tax savings account.
          </div>
        </Card>
      </div>
    </div>
  );
}
