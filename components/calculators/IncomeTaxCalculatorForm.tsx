"use client";

import React, { useState, useEffect, useCallback } from "react";
import { TaxFilingStatus, TaxYear, TaxCalculationResult } from "@/types/tax";
import { formatCurrencyFromCents } from "@/lib/utils/currency";
import { validateCurrencyInput } from "@/lib/utils/calculator-validation";
import { requestTaxCalculation } from "@/lib/utils/calculator-api";
import { calculateIncomeTax, getTaxRules } from "@/tax-engine";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { LoadingState } from "@/components/ui/LoadingState";
import { CalculatorResultPanel } from "./CalculatorResultPanel";

export function IncomeTaxCalculatorForm() {
  const [taxYear, setTaxYear] = useState<TaxYear>(2025);
  const [filingStatus, setFilingStatus] = useState<TaxFilingStatus>("single");
  const [w2Wages, setW2Wages] = useState<string>("75,000");
  const [otherIncome, setOtherIncome] = useState<string>("0");
  const [withholding, setWithholding] = useState<string>("8,500");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<TaxCalculationResult | null>(null);

  // Standard deduction preview for current inputs
  const currentStandardDeductionCents = React.useMemo(() => {
    try {
      const rules = getTaxRules(taxYear);
      return rules.standardDeductions[filingStatus] ?? 0;
    } catch {
      return 0;
    }
  }, [taxYear, filingStatus]);

  // Execute deterministic calculation via application/API boundary
  const handleCalculate = useCallback(
    async (overrideInputs?: {
      year?: TaxYear;
      status?: TaxFilingStatus;
      w2?: string;
      other?: string;
      withheld?: string;
    }) => {
      const activeYear = overrideInputs?.year ?? taxYear;
      const activeStatus = overrideInputs?.status ?? filingStatus;
      const activeW2 = overrideInputs?.w2 ?? w2Wages;
      const activeOther = overrideInputs?.other ?? otherIncome;
      const activeWithheld = overrideInputs?.withheld ?? withholding;

      // Validate all input fields strictly
      const errors: Record<string, string> = {};

      const w2Val = validateCurrencyInput(activeW2, {
        required: true,
        fieldName: "W-2 Wages",
      });
      if (!w2Val.isValid && w2Val.error) {
        errors.w2Wages = w2Val.error;
      }

      const otherVal = validateCurrencyInput(activeOther, {
        required: false,
        fieldName: "Other Income",
      });
      if (!otherVal.isValid && otherVal.error) {
        errors.otherIncome = otherVal.error;
      }

      const withVal = validateCurrencyInput(activeWithheld, {
        required: false,
        fieldName: "Federal Withholding",
      });
      if (!withVal.isValid && withVal.error) {
        errors.withholding = withVal.error;
      }

      setFieldErrors(errors);

      if (Object.keys(errors).length > 0) {
        return;
      }

      setApiError(null);
      setIsLoading(true);

      const payload = {
        taxYear: activeYear,
        filingStatus: activeStatus,
        w2WagesCents: w2Val.cents,
        otherIncomeCents: otherVal.cents,
        federalWithholdingCents: withVal.cents,
      };

      try {
        const response = await requestTaxCalculation("income_tax", payload);

        if (response.success && response.data) {
          setResult(response.data);
        } else {
          // If network API fails in local test/offline mode, fallback safely to local deterministic engine
          try {
            const fallbackResult = calculateIncomeTax(payload);
            setResult(fallbackResult);
          } catch {
            setApiError(response.error || "Unable to compute calculation. Please check your inputs.");
          }
        }
      } catch (_err) {
        // Safe fallback to deterministic tax engine
        try {
          const fallbackResult = calculateIncomeTax(payload);
          setResult(fallbackResult);
        } catch {
          setApiError("An unexpected error occurred while calculating taxes. Please try again.");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [taxYear, filingStatus, w2Wages, otherIncome, withholding]
  );

  // Initial calculation or restore from saved calculation
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.sessionStorage.getItem("taxaihelp_reopen_calculation");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && (parsed.calculatorType === "income_tax" || parsed.calculatorType === "income")) {
            const inputs = parsed.inputSnapshot || {};
            if (inputs.taxYear) setTaxYear(inputs.taxYear);
            if (inputs.filingStatus) setFilingStatus(inputs.filingStatus);
            if (inputs.w2WagesCents !== undefined) {
              setW2Wages((inputs.w2WagesCents / 100).toLocaleString("en-US"));
            }
            if (inputs.otherIncomeCents !== undefined) {
              setOtherIncome((inputs.otherIncomeCents / 100).toLocaleString("en-US"));
            }
            if (inputs.federalWithholdingCents !== undefined) {
              setWithholding((inputs.federalWithholdingCents / 100).toLocaleString("en-US"));
            }
            window.sessionStorage.removeItem("taxaihelp_reopen_calculation");
            // Do not silently recalculate until user clicks Calculate
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
      {/* Form Input Panel */}
      <div className="lg:col-span-5 space-y-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Taxpayer Inputs</CardTitle>
            <p className="text-xs text-surface-500">
              Enter your income and filing status for official IRS progressive bracket computation.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Tax Year" id="taxYear" required>
                  <Select
                    id="taxYear"
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

                <FormField label="Filing Status" id="filingStatus" required>
                  <Select
                    id="filingStatus"
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
                error={fieldErrors.w2Wages}
              >
                <Input
                  id="w2Wages"
                  isCurrency
                  value={w2Wages}
                  hasError={!!fieldErrors.w2Wages}
                  onChange={(e) => {
                    setW2Wages(e.target.value);
                    if (fieldErrors.w2Wages) {
                      setFieldErrors((prev) => ({ ...prev, w2Wages: "" }));
                    }
                  }}
                  placeholder="75,000"
                  aria-invalid={!!fieldErrors.w2Wages}
                />
              </FormField>

              <FormField
                label="Other Taxable Ordinary Income"
                id="otherIncome"
                hint="Taxable interest, non-qualified dividends, or other ordinary income"
                error={fieldErrors.otherIncome}
              >
                <Input
                  id="otherIncome"
                  isCurrency
                  value={otherIncome}
                  hasError={!!fieldErrors.otherIncome}
                  onChange={(e) => {
                    setOtherIncome(e.target.value);
                    if (fieldErrors.otherIncome) {
                      setFieldErrors((prev) => ({ ...prev, otherIncome: "" }));
                    }
                  }}
                  placeholder="0"
                  aria-invalid={!!fieldErrors.otherIncome}
                />
              </FormField>

              <FormField
                label="Federal Income Tax Withheld"
                id="withholding"
                hint="Box 2 of your Form W-2 (taxes already paid)"
                error={fieldErrors.withholding}
              >
                <Input
                  id="withholding"
                  isCurrency
                  value={withholding}
                  hasError={!!fieldErrors.withholding}
                  onChange={(e) => {
                    setWithholding(e.target.value);
                    if (fieldErrors.withholding) {
                      setFieldErrors((prev) => ({ ...prev, withholding: "" }));
                    }
                  }}
                  placeholder="0"
                  aria-invalid={!!fieldErrors.withholding}
                />
              </FormField>

              {/* Standard Deduction Transparency Callout */}
              <div className="rounded-lg bg-surface-50 border border-surface-200 p-3.5 text-xs space-y-1">
                <div className="flex items-center justify-between text-surface-900 font-semibold">
                  <span>Standard Deduction ({taxYear}):</span>
                  <span className="text-emerald-700 font-bold">
                    {formatCurrencyFromCents(currentStandardDeductionCents)}
                  </span>
                </div>
                <p className="text-surface-500 text-[11px] leading-relaxed">
                  Statutory standard deduction for your selected status. Schedule A itemized deductions are not part of this baseline calculation.
                </p>
              </div>

              {/* Error Alert if API or Server failed */}
              {apiError && (
                <Alert variant="error" title="Calculation Error">
                  {apiError}
                </Alert>
              )}

              {/* Calculation Submit Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  isLoading={isLoading}
                  disabled={isLoading}
                >
                  {isLoading ? "Calculating..." : "Calculate Federal Tax"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Engine Results Panel */}
      <div className="lg:col-span-7">
        {isLoading && !result ? (
          <LoadingState message="Computing verified federal tax liability..." />
        ) : result ? (
          <CalculatorResultPanel
            result={result}
            inputSnapshot={{
              taxYear,
              filingStatus,
              w2WagesCents: validateCurrencyInput(w2Wages).cents,
              otherIncomeCents: validateCurrencyInput(otherIncome).cents,
              federalWithholdingCents: validateCurrencyInput(withholding).cents,
              itemizedDeductionCents: 0,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
