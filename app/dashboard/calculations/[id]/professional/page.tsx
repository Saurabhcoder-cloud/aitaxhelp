"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { TaxCalculationRecord } from "@/types/tax";
import { fetchCalculationById } from "@/lib/utils/calculation-history-api";
import { ProfessionalHandoffForm } from "@/components/reports/ProfessionalHandoffForm";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/Button";

export default function ProfessionalHandoffPage() {
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

  if (isLoading) {
    return <LoadingState message="Preparing tax professional handoff..." />;
  }

  if (errorMessage || !calculation) {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-2 border-b border-surface-200">
        <Button href={`/dashboard/calculations/${calculation.id}`} variant="outline" size="sm">
          &larr; Back to Calculation
        </Button>
        <span className="text-surface-300">/</span>
        <span className="text-xs sm:text-sm font-semibold text-surface-600 truncate max-w-xs">
          Tax Professional Handoff
        </span>
      </div>

      <ProfessionalHandoffForm calculation={calculation} />
    </div>
  );
}
