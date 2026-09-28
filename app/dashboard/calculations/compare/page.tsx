"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { TaxCalculationRecord } from "@/types/tax";
import {
  fetchCalculationHistory,
  compareCalculations,
} from "@/lib/utils/calculation-history-api";
import {
  compareSavedCalculations,
  ScenarioComparisonResult,
} from "@/lib/services/tax-insights";
import { ScenarioComparisonTable } from "@/components/calculators/ScenarioComparisonTable";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Alert } from "@/components/ui/Alert";
import { Scale, ArrowLeftRight } from "lucide-react";


function ScenarioComparisonContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialA = searchParams?.get("a") || "";
  const initialB = searchParams?.get("b") || "";

  const [calculations, setCalculations] = useState<TaxCalculationRecord[]>([]);
  const [selectedIdA, setSelectedIdA] = useState<string>(initialA);
  const [selectedIdB, setSelectedIdB] = useState<string>(initialB);

  const [comparisonResult, setComparisonResult] = useState<ScenarioComparisonResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load user's saved calculations
  const loadCalculations = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const res = await fetchCalculationHistory();
    setIsLoading(false);

    if (res.success && res.data) {
      const records = res.data;
      setCalculations(records);

      // Auto-assign selections if not already set or invalid
      let idA = initialA;
      let idB = initialB;

      if (!idA && records.length > 0) {
        idA = records[0].id;
      }
      if (!idB && records.length > 1) {
        idB = records[1].id;
      }

      setSelectedIdA(idA);
      setSelectedIdB(idB);
    } else {
      setErrorMessage(res.error || "Failed to load saved calculations.");
    }
  }, [initialA, initialB]);

  useEffect(() => {
    loadCalculations();
  }, [loadCalculations]);

  // Execute comparison when A and B are selected and distinct
  const runComparison = useCallback(async (idA: string, idB: string, records: TaxCalculationRecord[]) => {
    if (!idA || !idB || idA === idB) {
      setComparisonResult(null);
      return;
    }

    setIsComparing(true);
    setErrorMessage(null);

    // If both calculations are already present in memory, we can compute immediately
    const calcA = records.find((c) => c.id === idA);
    const calcB = records.find((c) => c.id === idB);

    if (calcA && calcB) {
      const result = compareSavedCalculations(calcA, calcB);
      setComparisonResult(result);
      setIsComparing(false);
      return;
    }

    // Fallback to server API verification
    const apiRes = await compareCalculations(idA, idB);
    setIsComparing(false);

    if (apiRes.success && apiRes.data) {
      setComparisonResult(apiRes.data);
    } else {
      setErrorMessage(apiRes.error || "Failed to compare selected calculations.");
    }
  }, []);

  useEffect(() => {
    if (calculations.length >= 2 && selectedIdA && selectedIdB && selectedIdA !== selectedIdB) {
      runComparison(selectedIdA, selectedIdB, calculations);
    }
  }, [selectedIdA, selectedIdB, calculations, runComparison]);

  const handleSwapScenarios = () => {
    const temp = selectedIdA;
    setSelectedIdA(selectedIdB);
    setSelectedIdB(temp);
  };

  if (isLoading) {
    return <LoadingState message="Loading your calculations for comparison..." />;
  }

  if (errorMessage && calculations.length === 0) {
    return (
      <div className="space-y-6">
        <Button href="/dashboard/calculations" variant="outline" size="sm">
          &larr; Back to Calculations
        </Button>
        <ErrorState
          title="Unable to Load Calculations"
          message={errorMessage}
          retryAction={loadCalculations}
        />
      </div>
    );
  }

  if (calculations.length < 2) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 pb-2 border-b border-surface-200">
          <Button href="/dashboard/calculations" variant="outline" size="sm">
            &larr; Back to Calculations
          </Button>
          <span className="text-surface-300">/</span>
          <span className="text-xs sm:text-sm font-semibold text-surface-600">
            Compare Scenarios
          </span>
        </div>

        <EmptyState
          title="At least 2 saved calculations are required"
          description="Scenario comparison requires two saved deterministic calculations to analyze variances. You currently have only one or zero saved calculations."
          actionLabel="+ Run a New Tax Calculation"
          actionHref="/tax-calculators"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-200">
        <div className="flex items-center gap-3">
          <Button href="/dashboard/calculations" variant="outline" size="sm">
            &larr; Back to Calculations
          </Button>
          <span className="text-surface-300">/</span>
          <span className="text-xs sm:text-sm font-semibold text-surface-600">
            Compare Scenarios
          </span>
        </div>

        <Badge variant="brand" size="sm">
          Deterministic Delta Analysis
        </Badge>
      </div>

      {/* Scenario Selector Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-brand-600" />
            <CardTitle>Select Saved Scenarios to Compare</CardTitle>
          </div>
          <p className="text-xs text-surface-500">
            Choose any two verified calculations from your saved history. Both scenarios must be owned by your account.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center">
            {/* Scenario A Selector */}
            <div className="md:col-span-5 space-y-1.5">
              <label htmlFor="selectA" className="text-xs font-bold text-surface-700 block">
                Scenario A (Baseline):
              </label>
              <select
                id="selectA"
                value={selectedIdA}
                onChange={(e) => setSelectedIdA(e.target.value)}
                className="w-full text-xs sm:text-sm rounded-lg border border-surface-300 bg-white px-3 py-2 text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {calculations.map((c) => (
                  <option key={c.id} value={c.id} disabled={c.id === selectedIdB}>
                    {c.title} ({c.taxYear} &bull; {c.filingStatus.replace(/_/g, " ")})
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Button */}
            <div className="md:col-span-1 flex justify-center pt-2 md:pt-4">
              <button
                type="button"
                onClick={handleSwapScenarios}
                className="p-2 rounded-full border border-surface-200 bg-surface-50 hover:bg-surface-100 text-surface-600 hover:text-surface-900 transition-colors"
                title="Swap Scenarios A & B"
                aria-label="Swap Scenarios A and B"
              >
                <ArrowLeftRight className="w-4 h-4" />
              </button>
            </div>

            {/* Scenario B Selector */}
            <div className="md:col-span-5 space-y-1.5">
              <label htmlFor="selectB" className="text-xs font-bold text-surface-700 block">
                Scenario B (Target / Comparison):
              </label>
              <select
                id="selectB"
                value={selectedIdB}
                onChange={(e) => setSelectedIdB(e.target.value)}
                className="w-full text-xs sm:text-sm rounded-lg border border-surface-300 bg-white px-3 py-2 text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {calculations.map((c) => (
                  <option key={c.id} value={c.id} disabled={c.id === selectedIdA}>
                    {c.title} ({c.taxYear} &bull; {c.filingStatus.replace(/_/g, " ")})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedIdA === selectedIdB && (
            <div className="mt-3">
              <Alert variant="warning" title="Distinct Scenarios Required">
                Please select two different saved calculations to evaluate mathematical variances.
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {isComparing ? (
        <LoadingState message="Calculating deterministic deltas..." />
      ) : errorMessage ? (
        <Alert variant="error" title="Comparison Error">
          {errorMessage}
        </Alert>
      ) : comparisonResult ? (
        <ScenarioComparisonTable comparison={comparisonResult} />
      ) : null}
    </div>
  );
}

export default function ScenarioComparisonPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading comparison tool..." />}>
      <ScenarioComparisonContent />
    </Suspense>
  );
}

