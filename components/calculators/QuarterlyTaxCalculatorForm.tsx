"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { TaxFilingStatus, TaxYear, TaxCalculationResult } from "@/types/tax";
import { TaxProfile } from "@/types/supabase";
import { validateCurrencyInput } from "@/lib/utils/calculator-validation";
import { requestTaxCalculation } from "@/lib/utils/calculator-api";
import { calculateQuarterlyTax } from "@/tax-engine";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { LoadingState } from "@/components/ui/LoadingState";
import { CalculatorResultPanel } from "./CalculatorResultPanel";
import { CalculatorPrefillNotice } from "./CalculatorPrefillNotice";
import { useCalculatorPrefill } from "@/lib/utils/calculator-prefill";

export function QuarterlyTaxCalculatorForm() {
  const [taxYear, setTaxYear] = useState<TaxYear>(2025);
  const [filingStatus, setFilingStatus] = useState<TaxFilingStatus>("single");
  const [estimatedGross, setEstimatedGross] = useState<string>("100,000");
  const [estimatedExpenses, setEstimatedExpenses] = useState<string>("20,000");
  const [w2Withholding, setW2Withholding] = useState<string>("0");
  const [priorYearTax, setPriorYearTax] = useState<string>("0");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<TaxCalculationResult | null>(null);
  const hasMountedRef = useRef(false);

  // Intelligently prefill calculator from saved taxpayer profile (PREFILL ONLY, no auto-calculate)
  const handlePrefillLoaded = useCallback(
    (defaults: { taxYear: TaxYear; filingStatus: TaxFilingStatus; taxProfile: TaxProfile }) => {
      setTaxYear(defaults.taxYear);
      setFilingStatus(defaults.filingStatus);
    },
    []
  );

  const {
    taxProfile,
    isSavingDefault,
    saveDefaultSuccess,
    saveDefaultError,
    saveAsDefault,
  } = useCalculatorPrefill(handlePrefillLoaded);

  const handleCalculate = useCallback(
    async (overrideInputs?: {
      year?: TaxYear;
      status?: TaxFilingStatus;
      gross?: string;
      expenses?: string;
      withheld?: string;
      prior?: string;
    }) => {
      const activeYear = overrideInputs?.year ?? taxYear;
      const activeStatus = overrideInputs?.status ?? filingStatus;
      const activeGross = overrideInputs?.gross ?? estimatedGross;
      const activeExpenses = overrideInputs?.expenses ?? estimatedExpenses;
      const activeWithheld = overrideInputs?.withheld ?? w2Withholding;
      const activePrior = overrideInputs?.prior ?? priorYearTax;

      const errors: Record<string, string> = {};

      const grossVal = validateCurrencyInput(activeGross, {
        required: true,
        fieldName: "Estimated Annual Gross Revenue",
      });
      if (!grossVal.isValid && grossVal.error) {
        errors.estimatedGross = grossVal.error;
      }

      const expensesVal = validateCurrencyInput(activeExpenses, {
        required: false,
        fieldName: "Estimated Annual Business Expenses",
      });
      if (!expensesVal.isValid && expensesVal.error) {
        errors.estimatedExpenses = expensesVal.error;
      }

      const withVal = validateCurrencyInput(activeWithheld, {
        required: false,
        fieldName: "Estimated W-2 Withholding",
      });
      if (!withVal.isValid && withVal.error) {
        errors.w2Withholding = withVal.error;
      }

      const priorVal = validateCurrencyInput(activePrior, {
        required: false,
        fieldName: "Prior Year Tax Liability",
      });
      if (!priorVal.isValid && priorVal.error) {
        errors.priorYearTax = priorVal.error;
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
        estimatedAnnualGrossCents: grossVal.cents,
        estimatedAnnualExpensesCents: expensesVal.cents,
        w2AnnualWagesCents: 0,
        w2AnnualWithholdingCents: withVal.cents,
        priorYearTaxLiabilityCents: priorVal.cents > 0 ? priorVal.cents : undefined,
      };

      try {
        const response = await requestTaxCalculation("quarterly_tax", payload);

        if (response.success && response.data) {
          setResult(response.data);
        } else {
          try {
            const fallback = calculateQuarterlyTax(payload);
            setResult(fallback);
          } catch {
            setApiError(response.error || "Unable to compute calculation. Please check your inputs.");
          }
        }
      } catch (_err) {
        try {
          const fallback = calculateQuarterlyTax(payload);
          setResult(fallback);
        } catch {
          setApiError("An unexpected error occurred while calculating taxes. Please try again.");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [taxYear, filingStatus, estimatedGross, estimatedExpenses, w2Withholding, priorYearTax]
  );

  useEffect(() => {
    if (hasMountedRef.current) return;
    hasMountedRef.current = true;

    if (typeof window !== "undefined") {
      const stored = window.sessionStorage.getItem("taxaihelp_reopen_calculation");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && (parsed.calculatorType === "quarterly_tax" || parsed.calculatorType === "quarterly")) {
            const inputs = parsed.inputSnapshot || {};
            if (inputs.taxYear) setTaxYear(inputs.taxYear);
            if (inputs.filingStatus) setFilingStatus(inputs.filingStatus);
            if (inputs.estimatedAnnualGrossCents !== undefined) {
              setEstimatedGross((inputs.estimatedAnnualGrossCents / 100).toLocaleString("en-US"));
            }
            if (inputs.estimatedAnnualExpensesCents !== undefined) {
              setEstimatedExpenses((inputs.estimatedAnnualExpensesCents / 100).toLocaleString("en-US"));
            }
            if (inputs.w2AnnualWithholdingCents !== undefined) {
              setW2Withholding((inputs.w2AnnualWithholdingCents / 100).toLocaleString("en-US"));
            }
            if (inputs.priorYearTaxLiabilityCents !== undefined) {
              setPriorYearTax((inputs.priorYearTaxLiabilityCents / 100).toLocaleString("en-US"));
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
      {/* Quarterly Inputs Panel */}
      <div className="lg:col-span-5 space-y-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Annual Projection Inputs</CardTitle>
            <p className="text-xs text-surface-500">
              IRS Form 1040-ES estimated quarterly installment calculation (Federal only).
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Tax Year" id="qTaxYear" required>
                  <Select
                    id="qTaxYear"
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

                <FormField label="Filing Status" id="qFilingStatus" required>
                  <Select
                    id="qFilingStatus"
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

              {/* Personalization Prefill Notice & Save Default Action */}
              <CalculatorPrefillNotice
                taxProfile={taxProfile}
                currentYear={taxYear}
                currentStatus={filingStatus}
                isSaving={isSavingDefault}
                saveSuccess={saveDefaultSuccess}
                saveError={saveDefaultError}
                onSaveAsDefault={() => saveAsDefault(taxYear, filingStatus)}
              />

              <FormField
                label="Estimated Annual Gross Revenue"
                id="estimatedGross"
                hint="Projected total 1099 or business gross revenue for the entire year"
                required
                error={fieldErrors.estimatedGross}
              >
                <Input
                  id="estimatedGross"
                  isCurrency
                  value={estimatedGross}
                  hasError={!!fieldErrors.estimatedGross}
                  onChange={(e) => {
                    setEstimatedGross(e.target.value);
                    if (fieldErrors.estimatedGross) {
                      setFieldErrors((prev) => ({ ...prev, estimatedGross: "" }));
                    }
                  }}
                  placeholder="100,000"
                  aria-invalid={!!fieldErrors.estimatedGross}
                />
              </FormField>

              <FormField
                label="Estimated Annual Business Expenses"
                id="estimatedExpenses"
                hint="Projected deductible operating business expenses for the year"
                error={fieldErrors.estimatedExpenses}
              >
                <Input
                  id="estimatedExpenses"
                  isCurrency
                  value={estimatedExpenses}
                  hasError={!!fieldErrors.estimatedExpenses}
                  onChange={(e) => {
                    setEstimatedExpenses(e.target.value);
                    if (fieldErrors.estimatedExpenses) {
                      setFieldErrors((prev) => ({ ...prev, estimatedExpenses: "" }));
                    }
                  }}
                  placeholder="20,000"
                  aria-invalid={!!fieldErrors.estimatedExpenses}
                />
              </FormField>

              <FormField
                label="Estimated W-2 Withholding (If Any)"
                id="w2Withholding"
                hint="Anticipated taxes withheld by employers from W-2 paychecks"
                error={fieldErrors.w2Withholding}
              >
                <Input
                  id="w2Withholding"
                  isCurrency
                  value={w2Withholding}
                  hasError={!!fieldErrors.w2Withholding}
                  onChange={(e) => {
                    setW2Withholding(e.target.value);
                    if (fieldErrors.w2Withholding) {
                      setFieldErrors((prev) => ({ ...prev, w2Withholding: "" }));
                    }
                  }}
                  placeholder="0"
                  aria-invalid={!!fieldErrors.w2Withholding}
                />
              </FormField>

              <FormField
                label="Prior Year Tax Liability (Safe Harbor)"
                id="priorYearTax"
                hint="Optional: Line 24 of your prior year Form 1040 for penalty safe harbor"
                error={fieldErrors.priorYearTax}
              >
                <Input
                  id="priorYearTax"
                  isCurrency
                  value={priorYearTax}
                  hasError={!!fieldErrors.priorYearTax}
                  onChange={(e) => {
                    setPriorYearTax(e.target.value);
                    if (fieldErrors.priorYearTax) {
                      setFieldErrors((prev) => ({ ...prev, priorYearTax: "" }));
                    }
                  }}
                  placeholder="0"
                  aria-invalid={!!fieldErrors.priorYearTax}
                />
              </FormField>

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
                  {isLoading ? "Calculating..." : "Calculate Quarterly Payments"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Engine Results Panel */}
      <div className="lg:col-span-7">
        {isLoading && !result ? (
          <LoadingState message="Computing Form 1040-ES quarterly vouchers..." />
        ) : result ? (
          <CalculatorResultPanel
            result={result}
            inputSnapshot={{
              taxYear,
              filingStatus,
              estimatedAnnualGrossCents: validateCurrencyInput(estimatedGross).cents,
              estimatedAnnualExpensesCents: validateCurrencyInput(estimatedExpenses).cents,
              w2AnnualWagesCents: 0,
              w2AnnualWithholdingCents: validateCurrencyInput(w2Withholding).cents,
              priorYearTaxLiabilityCents: validateCurrencyInput(priorYearTax).cents,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
