"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { TaxFilingStatus, TaxYear, TaxCalculationResult } from "@/types/tax";
import { TaxProfile } from "@/types/supabase";
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
import { CalculatorPrefillNotice } from "./CalculatorPrefillNotice";
import { useCalculatorPrefill } from "@/lib/utils/calculator-prefill";

export function SelfEmployedCalculatorForm() {
  const [taxYear, setTaxYear] = useState<TaxYear>(2025);
  const [filingStatus, setFilingStatus] = useState<TaxFilingStatus>("single");
  const [grossRevenue, setGrossRevenue] = useState<string>("90,000");
  const [businessExpenses, setBusinessExpenses] = useState<string>("18,000");
  const [w2Wages, setW2Wages] = useState<string>("0");
  const [withholding, setWithholding] = useState<string>("0");

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

  // Social Security Wage Base Cap display for current tax year
  const currentSSWageCapCents = React.useMemo(() => {
    try {
      const rules = getTaxRules(taxYear);
      return rules.selfEmployment.socialSecurityWageCapCents;
    } catch {
      return 17610000;
    }
  }, [taxYear]);

  const handleCalculate = useCallback(
    async (overrideInputs?: {
      year?: TaxYear;
      status?: TaxFilingStatus;
      revenue?: string;
      expenses?: string;
      w2?: string;
      withheld?: string;
    }) => {
      const activeYear = overrideInputs?.year ?? taxYear;
      const activeStatus = overrideInputs?.status ?? filingStatus;
      const activeRevenue = overrideInputs?.revenue ?? grossRevenue;
      const activeExpenses = overrideInputs?.expenses ?? businessExpenses;
      const activeW2 = overrideInputs?.w2 ?? w2Wages;
      const activeWithheld = overrideInputs?.withheld ?? withholding;

      const errors: Record<string, string> = {};

      const revenueVal = validateCurrencyInput(activeRevenue, {
        required: true,
        fieldName: "Gross Business Revenue",
      });
      if (!revenueVal.isValid && revenueVal.error) {
        errors.grossRevenue = revenueVal.error;
      }

      const expensesVal = validateCurrencyInput(activeExpenses, {
        required: false,
        fieldName: "Business Expenses",
      });
      if (!expensesVal.isValid && expensesVal.error) {
        errors.businessExpenses = expensesVal.error;
      }

      const w2Val = validateCurrencyInput(activeW2, {
        required: false,
        fieldName: "W-2 Wages",
      });
      if (!w2Val.isValid && w2Val.error) {
        errors.w2Wages = w2Val.error;
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
        gross1099IncomeCents: revenueVal.cents,
        businessExpensesCents: expensesVal.cents,
        w2WagesCents: w2Val.cents,
        federalWithholdingCents: withVal.cents,
      };

      try {
        const response = await requestTaxCalculation("self_employed", payload);

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
    [taxYear, filingStatus, grossRevenue, businessExpenses, w2Wages, withholding]
  );

  useEffect(() => {
    if (hasMountedRef.current) return;
    hasMountedRef.current = true;

    if (typeof window !== "undefined") {
      const stored = window.sessionStorage.getItem("taxaihelp_reopen_calculation");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && (parsed.calculatorType === "self_employed" || parsed.calculatorType === "self-employed")) {
            const inputs = parsed.inputSnapshot || {};
            if (inputs.taxYear) setTaxYear(inputs.taxYear);
            if (inputs.filingStatus) setFilingStatus(inputs.filingStatus);
            if (inputs.gross1099IncomeCents !== undefined) {
              setGrossRevenue((inputs.gross1099IncomeCents / 100).toLocaleString("en-US"));
            }
            if (inputs.businessExpensesCents !== undefined) {
              setBusinessExpenses((inputs.businessExpensesCents / 100).toLocaleString("en-US"));
            }
            if (inputs.w2WagesCents !== undefined) {
              setW2Wages((inputs.w2WagesCents / 100).toLocaleString("en-US"));
            }
            if (inputs.federalWithholdingCents !== undefined) {
              setWithholding((inputs.federalWithholdingCents / 100).toLocaleString("en-US"));
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
      {/* Form Input Panel */}
      <div className="lg:col-span-5 space-y-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Business & Self-Employment Inputs</CardTitle>
            <p className="text-xs text-surface-500">
              Compute your Schedule SE tax (15.3%) and ordinary federal income tax liability.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Tax Year" id="seTaxYear" required>
                  <Select
                    id="seTaxYear"
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

                <FormField label="Filing Status" id="seFilingStatus" required>
                  <Select
                    id="seFilingStatus"
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
                label="Gross Business Revenue / 1099"
                id="grossRevenue"
                hint="Total gross business receipts or 1099 payments before expenses"
                required
                error={fieldErrors.grossRevenue}
              >
                <Input
                  id="grossRevenue"
                  isCurrency
                  value={grossRevenue}
                  hasError={!!fieldErrors.grossRevenue}
                  onChange={(e) => {
                    setGrossRevenue(e.target.value);
                    if (fieldErrors.grossRevenue) {
                      setFieldErrors((prev) => ({ ...prev, grossRevenue: "" }));
                    }
                  }}
                  placeholder="90,000"
                  aria-invalid={!!fieldErrors.grossRevenue}
                />
              </FormField>

              <FormField
                label="Ordinary Business Expenses"
                id="businessExpenses"
                hint="Supplies, equipment, software, advertising, travel, home office"
                error={fieldErrors.businessExpenses}
              >
                <Input
                  id="businessExpenses"
                  isCurrency
                  value={businessExpenses}
                  hasError={!!fieldErrors.businessExpenses}
                  onChange={(e) => {
                    setBusinessExpenses(e.target.value);
                    if (fieldErrors.businessExpenses) {
                      setFieldErrors((prev) => ({ ...prev, businessExpenses: "" }));
                    }
                  }}
                  placeholder="18,000"
                  aria-invalid={!!fieldErrors.businessExpenses}
                />
              </FormField>

              <FormField
                label="W-2 Wages (If Also Employed)"
                id="w2Wages"
                hint="W-2 income reduces your Social Security taxable self-employment wage cap"
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
                  placeholder="0"
                  aria-invalid={!!fieldErrors.w2Wages}
                />
              </FormField>

              <FormField
                label="Federal Withholding Already Paid"
                id="withholding"
                hint="W-2 withholding or backup withholding already remitted to the IRS"
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

              {/* Statutory Wage Cap Disclosure */}
              <div className="rounded-lg bg-surface-50 border border-surface-200 p-3.5 text-xs space-y-1">
                <div className="flex items-center justify-between text-surface-900 font-semibold">
                  <span>Social Security Wage Base ({taxYear}):</span>
                  <span className="text-brand-700 font-bold">
                    {formatCurrencyFromCents(currentSSWageCapCents)}
                  </span>
                </div>
                <p className="text-surface-500 text-[11px] leading-relaxed">
                  The 12.4% OASDI portion of self-employment tax is capped at {formatCurrencyFromCents(currentSSWageCapCents)}. Medicare (2.9%) is uncapped.
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
                  {isLoading ? "Calculating..." : "Calculate Self-Employment Tax"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Engine Results Panel */}
      <div className="lg:col-span-7">
        {isLoading && !result ? (
          <LoadingState message="Computing Schedule SE and federal liabilities..." />
        ) : result ? (
          <CalculatorResultPanel
            result={result}
            inputSnapshot={{
              taxYear,
              filingStatus,
              gross1099IncomeCents: validateCurrencyInput(grossRevenue).cents,
              businessExpensesCents: validateCurrencyInput(businessExpenses).cents,
              w2WagesCents: validateCurrencyInput(w2Wages).cents,
              federalWithholdingCents: validateCurrencyInput(withholding).cents,
              hasOtherSelfEmploymentIncome: false,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
