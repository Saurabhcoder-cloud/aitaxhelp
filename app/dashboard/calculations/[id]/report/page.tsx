"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { TaxCalculationRecord } from "@/types/tax";
import { fetchCalculationById } from "@/lib/utils/calculation-history-api";
import { buildTaxReport, TaxReport } from "@/lib/services/tax-report";
import { TaxSummaryReportView } from "@/components/reports/TaxSummaryReportView";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/Button";

export default function TaxCalculationReportPage() {
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

  const report: TaxReport | null = useMemo(() => {
    if (!calculation) return null;
    return buildTaxReport(calculation, "free");
  }, [calculation]);

  if (isLoading) {
    return <LoadingState message="Generating verified tax summary report..." />;
  }

  if (errorMessage || !calculation || !report) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button href="/dashboard/calculations" variant="outline" size="sm">
            &larr; Back to Calculations
          </Button>
        </div>
        <ErrorState
          title="Report Not Available"
          message={errorMessage || "The requested calculation record does not exist or you do not have permission to view it."}
          retryAction={() => router.push("/dashboard/calculations")}
        />
      </div>
    );
  }

  return <TaxSummaryReportView report={report} />;
}
