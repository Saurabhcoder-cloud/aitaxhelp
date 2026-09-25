"use client";

import React, { useState, useEffect, useCallback } from "react";
import { TaxFilingStatus, TaxYear, TaxCalculationResult } from "@/types/tax";
import { formatCurrencyFromCents } from "@/lib/utils/currency";
import { validateCurrencyInput } from "@/lib/utils/calculator-validation";
import { requestTaxCalculation } from "@/lib/utils/calculator-api";
import { calculateSelfEmployedTax, getTaxRules } from "@/tax-engine";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { LoadingState } from "@/components/ui/LoadingState";
import { CalculatorResultPanel } from "./CalculatorResultPanel";

export function Tax1099CalculatorForm() {
  const [taxYear, setTaxYear] = useState<TaxYear>(2025);
  const [filingStatus, setFilingStatus] = useState<TaxFilingStatus>("single");
  const [gross1099, setGross1099] = useState<string>("85,000");

  // Granular 1099 Contractor Expense Categories
  const [equipmentSupplies, setEquipmentSupplies] = useState<string>("4,500");
  const [softwareSubscriptions, setSoftwareSubscriptions] = useState<string>("1,800");
  const [homeOfficeVehicle, setHomeOfficeVehicle] = useState<string>("3,200");
  const [otherExpenses, setOtherExpenses] = useState<string>("1,500");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<TaxCalculationResult | null>(null);

  const currentStandardDeductionCents = React.useMemo(() => {
    try {
      const rules = getTaxRules(taxYear);
      return rules.standardDeductions[filingStatus] ?? 0;
    } catch {
      return 0;
    }
  }, [taxYear, filingStatus]);

  const totalExpensesCents = React.useMemo(() => {
    const equip = validateCurrencyInput(equipmentSupplies).cents;
    const software = validateCurrencyInput(softwareSubscriptions).cents;
    const home = validateCurrencyInput(homeOfficeVehicle).cents;
    const other = validateCurrencyInput(otherExpenses).cents;
    return equip + software + home + other;
  }, [equipmentSupplies, softwareSubscriptions, homeOfficeVehicle, otherExpenses]);

  const handleCalculate = useCallback(
    async (overrideInputs?: {
      year?: TaxYear;
      status?: TaxFilingStatus;
      gross?: string;
      equip?: string;
      software?: string;
      home?: string;
      other?: string;
    }) => {
      const activeYear = overrideInputs?.year ?? taxYear;
      const activeStatus = overrideInputs?.status ?? filingStatus;
      const activeGross = overrideInputs?.gross ?? gross1099;
      const activeEquip = overrideInputs?.equip ?? equipmentSupplies;
      const activeSoftware = overrideInputs?.software ?? softwareSubscriptions;
      const activeHome = overrideInputs?.home ?? homeOfficeVehicle;
      const activeOther = overrideInputs?.other ?? otherExpenses;

      const errors: Record<string, string> = {};

      const grossVal = validateCurrencyInput(activeGross, {
        required: true,
        fieldName: "Total 1099 Gross Earnings",
      });
      if (!grossVal.isValid && grossVal.error) {
        errors.gross1099 = grossVal.error;
      }

      const equipVal = validateCurrencyInput(activeEquip, {
        required: false,
        fieldName: "Equipment & Supplies",
      });
      if (!equipVal.isValid && equipVal.error) {
        errors.equipmentSupplies = equipVal.error;
      }

      const softwareVal = validateCurrencyInput(activeSoftware, {
        required: false,
        fieldName: "Software & Subscriptions",
      });
      if (!softwareVal.isValid && softwareVal.error) {
        errors.softwareSubscriptions = softwareVal.error;
      }

      const homeVal = validateCurrencyInput(activeHome, {
        required: false,
        fieldName: "Home Office & Travel",
      });
      if (!homeVal.isValid && homeVal.error) {
        errors.homeOfficeVehicle = homeVal.error;
      }

      const otherVal = validateCurrencyInput(activeOther, {
        required: false,
        fieldName: "Other Expenses",
      });
      if (!otherVal.isValid && otherVal.error) {
        errors.otherExpenses = otherVal.error;
      }

      setFieldErrors(errors);

      if (Object.keys(errors).length > 0) {
        return;
      }

      setApiError(null);
      setIsLoading(true);

      const totalExpensesCents =
        equipVal.cents + softwareVal.cents + homeVal.cents + otherVal.cents;

      const payload = {
        taxYear: activeYear,
        filingStatus: activeStatus,
        gross1099IncomeCents: grossVal.cents,
        businessExpensesCents: totalExpensesCents,
        w2WagesCents: 0,
        federalWithholdingCents: 0,
      };

      try {
        const response = await requestTaxCalculation("1099", payload);

        if (response.success && response.data) {
          setResult(response.data);
        } else {
          try {
            const fallback = calculateSelfEmployedTax(payload);
            setResult(fallback);
          } catch {
            setApiError(response.error || "Unable to compute calculation. Please check your inputs.");
          }
        }
      } catch (_err) {
        try {
          const fallback = calculateSelfEmployedTax(payload);
          setResult(fallback);
        } catch {
          setApiError("An unexpected error occurred while calculating taxes. Please try again.");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [taxYear, filingStatus, gross1099, equipmentSupplies, softwareSubscriptions, homeOfficeVehicle, otherExpenses]
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.sessionStorage.getItem("taxaihelp_reopen_calculation");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.calculatorType === "1099") {
            const inputs = parsed.inputSnapshot || {};
            if (inputs.taxYear) setTaxYear(inputs.taxYear);
            if (inputs.filingStatus) setFilingStatus(inputs.filingStatus);
            if (inputs.gross1099IncomeCents !== undefined) {
              setGross1099((inputs.gross1099IncomeCents / 100).toLocaleString("en-US"));
            }
            if (inputs.businessExpensesCents !== undefined) {
              setEquipmentSupplies((inputs.businessExpensesCents / 100).toLocaleString("en-US"));
              setSoftwareSubscriptions("0");
              setHomeOfficeVehicle("0");
              setOtherExpenses("0");
            }
            window.sessionStorage.removeItem("taxaihelp_reopen_calculation");
            return;
          }
        } catch (_err) {
          // ignore parsing error
        }
      }
    }
    handleCalculate();
  }, [handleCalculate]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCalculate();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* 1099 Inputs Panel */}
      <div className="lg:col-span-5 space-y-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>1099 Contractor Earnings & Expenses</CardTitle>
            <p className="text-xs text-surface-500">
              For 1099-NEC, 1099-K, and freelance contract gross receipts.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Tax Year" id="t1099TaxYear" required>
                  <Select
                    id="t1099TaxYear"
                    value={taxYear.toString()}
                    onChange={(e) => {
                      const nextYear = Number(e.target.value) as TaxYear;
                      setTaxYear(nextYear);
                    }}
                    options={[
                      { label: "2026 (Rev. Proc. 2025-32)", value: "2026" },
                      { label: "2025 (IRS IRB 2025-45 / OBBBA)", value: "2025" },
                      { label: "2024 (Rev. Proc. 2023-34)", value: "2024" },
                      { label: "2023 (Rev. Proc. 2022-38)", value: "2023" },
                    ]}
                  />
                </FormField>

                <FormField label="Filing Status" id="t1099FilingStatus" required>
                  <Select
                    id="t1099FilingStatus"
                    value={filingStatus}
                    onChange={(e) => {
                      const nextStatus = e.target.value as TaxFilingStatus;
                      setFilingStatus(nextStatus);
                    }}
                    options={[
                      { label: "Single", value: "single" },
                      { label: "Married Filing Jointly", value: "married_filing_jointly" },
                      { label: "Married Filing Separately", value: "married_filing_separately" },
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
                error={fieldErrors.gross1099}
              >
                <Input
                  id="gross1099"
                  isCurrency
                  value={gross1099}
                  hasError={!!fieldErrors.gross1099}
                  onChange={(e) => {
                    setGross1099(e.target.value);
                    if (fieldErrors.gross1099) {
                      setFieldErrors((prev) => ({ ...prev, gross1099: "" }));
                    }
                  }}
                  placeholder="85,000"
                  aria-invalid={!!fieldErrors.gross1099}
                />
              </FormField>

              {/* Deductible Business Expense Categories */}
              <div className="border-t border-surface-200 pt-4 mt-2">
                <span className="text-xs uppercase font-bold text-surface-500 tracking-wider block mb-3">
                  Contractor Expense Categories (Schedule C)
                </span>

                <div className="space-y-3">
                  <FormField
                    label="Equipment & Supplies"
                    id="equipmentSupplies"
                    hint="Laptops, monitors, tools, office supplies"
                    error={fieldErrors.equipmentSupplies}
                  >
                    <Input
                      id="equipmentSupplies"
                      isCurrency
                      value={equipmentSupplies}
                      hasError={!!fieldErrors.equipmentSupplies}
                      onChange={(e) => {
                        setEquipmentSupplies(e.target.value);
                        if (fieldErrors.equipmentSupplies) {
                          setFieldErrors((prev) => ({ ...prev, equipmentSupplies: "" }));
                        }
                      }}
                      placeholder="0"
                      aria-invalid={!!fieldErrors.equipmentSupplies}
                    />
                  </FormField>

                  <FormField
                    label="Software & Tech Subscriptions"
                    id="softwareSubscriptions"
                    hint="Cloud hosting, SaaS subscriptions, domain names"
                    error={fieldErrors.softwareSubscriptions}
                  >
                    <Input
                      id="softwareSubscriptions"
                      isCurrency
                      value={softwareSubscriptions}
                      hasError={!!fieldErrors.softwareSubscriptions}
                      onChange={(e) => {
                        setSoftwareSubscriptions(e.target.value);
                        if (fieldErrors.softwareSubscriptions) {
                          setFieldErrors((prev) => ({ ...prev, softwareSubscriptions: "" }));
                        }
                      }}
                      placeholder="0"
                      aria-invalid={!!fieldErrors.softwareSubscriptions}
                    />
                  </FormField>

                  <FormField
                    label="Home Office & Business Travel"
                    id="homeOfficeVehicle"
                    hint="Dedicated workspace utilities, client travel, rideshare"
                    error={fieldErrors.homeOfficeVehicle}
                  >
                    <Input
                      id="homeOfficeVehicle"
                      isCurrency
                      value={homeOfficeVehicle}
                      hasError={!!fieldErrors.homeOfficeVehicle}
                      onChange={(e) => {
                        setHomeOfficeVehicle(e.target.value);
                        if (fieldErrors.homeOfficeVehicle) {
                          setFieldErrors((prev) => ({ ...prev, homeOfficeVehicle: "" }));
                        }
                      }}
                      placeholder="0"
                      aria-invalid={!!fieldErrors.homeOfficeVehicle}
                    />
                  </FormField>

                  <FormField
                    label="Other Ordinary Business Expenses"
                    id="otherExpenses"
                    hint="Professional licenses, advertising, payment processing fees"
                    error={fieldErrors.otherExpenses}
                  >
                    <Input
                      id="otherExpenses"
                      isCurrency
                      value={otherExpenses}
                      hasError={!!fieldErrors.otherExpenses}
                      onChange={(e) => {
                        setOtherExpenses(e.target.value);
                        if (fieldErrors.otherExpenses) {
                          setFieldErrors((prev) => ({ ...prev, otherExpenses: "" }));
                        }
                      }}
                      placeholder="0"
                      aria-invalid={!!fieldErrors.otherExpenses}
                    />
                  </FormField>
                </div>
              </div>

              {/* Standard deduction notice */}
              <div className="rounded-lg bg-surface-50 border border-surface-200 p-3.5 text-xs space-y-1">
                <div className="flex items-center justify-between text-surface-900 font-semibold">
                  <span>Standard Deduction ({taxYear}):</span>
                  <span className="text-emerald-700 font-bold">
                    {formatCurrencyFromCents(currentStandardDeductionCents)}
                  </span>
                </div>
                <p className="text-surface-500 text-[11px] leading-relaxed">
                  Your business expenses reduce Schedule C net income. Then, the federal standard deduction further reduces your taxable ordinary income.
                </p>
              </div>

              {apiError && (
                <Alert variant="error" title="Calculation Error">
                  {apiError}
                </Alert>
              )}

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  isLoading={isLoading}
                  disabled={isLoading}
                >
                  {isLoading ? "Calculating..." : "Calculate 1099 Taxes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Engine Results Panel */}
      <div className="lg:col-span-7">
        {isLoading && !result ? (
          <LoadingState message="Computing 1099 tax breakdown..." />
        ) : result ? (
          <CalculatorResultPanel
            result={result}
            inputSnapshot={{
              taxYear,
              filingStatus,
              gross1099IncomeCents: validateCurrencyInput(gross1099).cents,
              businessExpensesCents: totalExpensesCents,
              w2WagesCents: 0,
              federalWithholdingCents: 0,
              hasOtherSelfEmploymentIncome: false,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
