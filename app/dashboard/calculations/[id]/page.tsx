"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { TaxCalculationRecord, CalculatorType, normalizeInputSnapshot } from "@/types/tax";
import { formatCurrencyFromCents } from "@/lib/utils/currency";
import { fetchCalculationById } from "@/lib/utils/calculation-history-api";
import { CalculatorResultPanel } from "@/components/calculators/CalculatorResultPanel";
import { TaxInsightsPanel } from "@/components/calculators/TaxInsightsPanel";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Sparkles, Scale, FileText, UserCheck, LifeBuoy } from "lucide-react";


import {
  incomeTaxInputSchema,
  selfEmployedInputSchema,
  quarterlyTaxInputSchema,
} from "@/tax-engine/validation/schemas";

function getCalculatorPath(type: CalculatorType): string {
  switch (type) {
    case "income_tax":
      return "/tax-calculators/income-tax";
    case "self_employed":
      return "/tax-calculators/self-employed";
    case "1099":
      return "/tax-calculators/1099";
    case "quarterly_tax":
      return "/tax-calculators/quarterly-tax";
    default:
      return "/tax-calculators";
  }
}

interface HistoricalDisplayInputs {
  taxYear: number;
  filingStatus: string;
  w2WagesCents?: number;
  gross1099IncomeCents?: number;
  businessExpensesCents?: number;
  estimatedAnnualGrossCents?: number;
  federalWithholdingCents?: number;
}

function parseHistoricalInputs(calculation: TaxCalculationRecord): HistoricalDisplayInputs {
  const { calculatorType, inputSnapshot, taxYear, filingStatus } = calculation;
  const raw = normalizeInputSnapshot(inputSnapshot);

  const display: HistoricalDisplayInputs = {
    taxYear,
    filingStatus,
  };

  if (calculatorType === "income_tax") {
    const parsed = incomeTaxInputSchema.partial().safeParse(raw);
    if (parsed.success && parsed.data) {
      if (typeof parsed.data.w2WagesCents === "number") {
        display.w2WagesCents = parsed.data.w2WagesCents;
      }
      if (typeof parsed.data.federalWithholdingCents === "number") {
        display.federalWithholdingCents = parsed.data.federalWithholdingCents;
      }
    }
  } else if (calculatorType === "self_employed" || calculatorType === "1099") {
    const parsed = selfEmployedInputSchema.partial().safeParse(raw);
    if (parsed.success && parsed.data) {
      if (typeof parsed.data.gross1099IncomeCents === "number") {
        display.gross1099IncomeCents = parsed.data.gross1099IncomeCents;
      }
      if (typeof parsed.data.businessExpensesCents === "number") {
        display.businessExpensesCents = parsed.data.businessExpensesCents;
      }
      if (typeof parsed.data.w2WagesCents === "number") {
        display.w2WagesCents = parsed.data.w2WagesCents;
      }
      if (typeof parsed.data.federalWithholdingCents === "number") {
        display.federalWithholdingCents = parsed.data.federalWithholdingCents;
      }
    }
  } else if (calculatorType === "quarterly_tax") {
    const parsed = quarterlyTaxInputSchema.partial().safeParse(raw);
    if (parsed.success && parsed.data) {
      if (typeof parsed.data.estimatedAnnualGrossCents === "number") {
        display.estimatedAnnualGrossCents = parsed.data.estimatedAnnualGrossCents;
      }
      if (typeof parsed.data.estimatedAnnualExpensesCents === "number") {
        display.businessExpensesCents = parsed.data.estimatedAnnualExpensesCents;
      }
      if (typeof parsed.data.w2AnnualWithholdingCents === "number") {
        display.federalWithholdingCents = parsed.data.w2AnnualWithholdingCents;
      }
    }
  }

  // Fallback for resilient historical display if stored outside schema
  if (display.w2WagesCents === undefined && typeof raw.w2WagesCents === "number") {
    display.w2WagesCents = raw.w2WagesCents;
  }
  if (display.gross1099IncomeCents === undefined && typeof raw.gross1099IncomeCents === "number") {
    display.gross1099IncomeCents = raw.gross1099IncomeCents;
  }
  if (display.businessExpensesCents === undefined && typeof raw.businessExpensesCents === "number") {
    display.businessExpensesCents = raw.businessExpensesCents;
  }
  if (display.estimatedAnnualGrossCents === undefined && typeof raw.estimatedAnnualGrossCents === "number") {
    display.estimatedAnnualGrossCents = raw.estimatedAnnualGrossCents;
  }
  if (display.federalWithholdingCents === undefined && typeof raw.federalWithholdingCents === "number") {
    display.federalWithholdingCents = raw.federalWithholdingCents;
  }

  return display;
}

export default function CalculationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";

  const [calculation, setCalculation] = useState<TaxCalculationRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadCalculation = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setErrorMessage(null);

    const res = await fetchCalculationById(id);
    setIsLoading(false);

    if (res.success && res.data) {
      setCalculation(res.data);
    } else {
      setErrorMessage(res.error || "Unable to locate calculation snapshot.");
    }
  }, [id]);

  useEffect(() => {
    loadCalculation();
  }, [loadCalculation]);

  const handleOpenInCalculator = () => {
    if (!calculation) return;
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        "taxaihelp_reopen_calculation",
        JSON.stringify({
          id: calculation.id,
          calculatorType: calculation.calculatorType,
          inputSnapshot: calculation.inputSnapshot,
        })
      );
    }
    router.push(getCalculatorPath(calculation.calculatorType));
  };

  const displayInputs = useMemo(() => {
    if (!calculation) return null;
    return parseHistoricalInputs(calculation);
  }, [calculation]);

  if (isLoading) {
    return <LoadingState message="Loading historical calculation snapshot..." />;
  }

  if (errorMessage || !calculation || !displayInputs) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button href="/dashboard/calculations" variant="outline" size="sm">
            &larr; Back to Calculations
          </Button>
        </div>
        <ErrorState
          title="Calculation Not Found"
          message={errorMessage || "The requested calculation record does not exist or you do not have permission to view it."}
          retryAction={() => router.push("/dashboard/calculations")}
        />
      </div>
    );
  }

  const res = calculation.resultSnapshot;
  const formattedCreated = new Date(calculation.createdAt).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6">
      {/* Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-200">
        <div className="flex items-center gap-3">
          <Button href="/dashboard/calculations" variant="outline" size="sm">
            &larr; Back to Calculations
          </Button>
          <span className="text-surface-300">/</span>
          <span className="text-xs sm:text-sm font-semibold text-surface-600 truncate max-w-xs">
            {calculation.title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/dashboard/calculations/${calculation.id}/report`}>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 font-semibold text-xs"
            >
              <FileText className="w-3.5 h-3.5 text-brand-600" />
              Tax Report
            </Button>
          </Link>
          <Link href={`/dashboard/calculations/${calculation.id}/professional`}>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 font-semibold text-xs"
            >
              <UserCheck className="w-3.5 h-3.5 text-brand-600" />
              Tax Pro
            </Button>
          </Link>
          <Link href={`/dashboard/calculations/compare?a=${encodeURIComponent(calculation.id)}`}>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 font-semibold text-xs"
            >
              <Scale className="w-3.5 h-3.5 text-brand-600" />
              Compare
            </Button>
          </Link>
          <Link href={`/ai-tax-assistant?calculationId=${encodeURIComponent(calculation.id)}`}>
            <Button
              variant="secondary"
              size="sm"
              className="gap-1.5 font-semibold text-xs shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              Explain with AI
            </Button>
          </Link>
          <Button
            onClick={handleOpenInCalculator}
            variant="outline"
            size="sm"
          >
            Open
          </Button>
          <Link
            href={`/dashboard/support/new?category=TAX_CALCULATION&calculationId=${encodeURIComponent(
              calculation.id
            )}&calculatorType=${encodeURIComponent(
              calculation.calculatorType
            )}&taxYear=${calculation.taxYear}&filingStatus=${encodeURIComponent(
              calculation.filingStatus
            )}`}
          >
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 font-semibold text-xs text-surface-600 hover:text-red-700"
            >
              <LifeBuoy className="w-3.5 h-3.5" />
              Report Issue
            </Button>
          </Link>
        </div>
      </div>

      {/* Historical Snapshot Banner (Guarantees no recalculation disclosure) */}
      <div className="p-4 rounded-xl border border-brand-200 bg-brand-50/70 text-xs text-brand-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-brand-900">
              Historical Calculation Snapshot
            </span>
            <Badge variant="brand" size="sm">Preserved</Badge>
          </div>
          <p className="text-brand-800 leading-relaxed max-w-3xl">
            This calculation preserves the exact deterministic tax engine results calculated on <strong>{formattedCreated}</strong> using Tax Engine <strong>v{calculation.engineVersion}</strong> and <strong>{calculation.rulesVersion}</strong>. It is not recomputed with newer rules.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/ai-tax-assistant?calculationId=${encodeURIComponent(calculation.id)}`}
            className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:text-brand-900 underline text-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            Ask AI to Explain →
          </Link>
          <span className="text-[11px] text-brand-700 font-mono whitespace-nowrap">
            ID: {calculation.id.slice(0, 8)}...
          </span>
        </div>
      </div>

      {/* Input Snapshot Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Historical Inputs Recorded</CardTitle>
          <p className="text-xs text-surface-500">
            The taxpayer input values provided when this calculation was originally executed.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-surface-50 border border-surface-200">
              <span className="text-surface-500 block">Tax Year:</span>
              <span className="font-bold text-surface-900 text-sm mt-0.5 block">
                {displayInputs.taxYear}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-surface-50 border border-surface-200">
              <span className="text-surface-500 block">Filing Status:</span>
              <span className="font-bold text-surface-900 text-sm mt-0.5 block capitalize">
                {displayInputs.filingStatus.replace(/_/g, " ")}
              </span>
            </div>

            {displayInputs.w2WagesCents !== undefined && (
              <div className="p-3 rounded-lg bg-surface-50 border border-surface-200">
                <span className="text-surface-500 block">W-2 Wages:</span>
                <span className="font-bold text-surface-900 text-sm mt-0.5 block">
                  {formatCurrencyFromCents(displayInputs.w2WagesCents)}
                </span>
              </div>
            )}

            {displayInputs.gross1099IncomeCents !== undefined && (
              <div className="p-3 rounded-lg bg-surface-50 border border-surface-200">
                <span className="text-surface-500 block">1099 / Gross Revenue:</span>
                <span className="font-bold text-surface-900 text-sm mt-0.5 block">
                  {formatCurrencyFromCents(displayInputs.gross1099IncomeCents)}
                </span>
              </div>
            )}

            {displayInputs.businessExpensesCents !== undefined && (
              <div className="p-3 rounded-lg bg-surface-50 border border-surface-200">
                <span className="text-surface-500 block">Business Expenses:</span>
                <span className="font-bold text-surface-900 text-sm mt-0.5 block">
                  {formatCurrencyFromCents(displayInputs.businessExpensesCents)}
                </span>
              </div>
            )}

            {displayInputs.estimatedAnnualGrossCents !== undefined && (
              <div className="p-3 rounded-lg bg-surface-50 border border-surface-200">
                <span className="text-surface-500 block">Estimated Annual Gross:</span>
                <span className="font-bold text-surface-900 text-sm mt-0.5 block">
                  {formatCurrencyFromCents(displayInputs.estimatedAnnualGrossCents)}
                </span>
              </div>
            )}

            {displayInputs.federalWithholdingCents !== undefined && displayInputs.federalWithholdingCents > 0 && (
              <div className="p-3 rounded-lg bg-surface-50 border border-surface-200">
                <span className="text-surface-500 block">Federal Withholding:</span>
                <span className="font-bold text-surface-900 text-sm mt-0.5 block">
                  {formatCurrencyFromCents(displayInputs.federalWithholdingCents)}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Render Historical Preserved Output Panel (Zero recalculation) */}
      <CalculatorResultPanel
        result={res}
        inputSnapshot={calculation.inputSnapshot}
        hideSaveAction={true}
      />

      {/* Educational Tax Planning & Drivers Insights Layer */}
      <TaxInsightsPanel
        result={res}
        inputSnapshot={calculation.inputSnapshot}
        title={calculation.title}
      />
    </div>
  );
}
