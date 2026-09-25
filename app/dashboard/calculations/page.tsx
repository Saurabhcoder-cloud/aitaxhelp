"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TaxCalculationRecord, CalculatorType } from "@/types/tax";
import { formatCurrencyFromCents } from "@/lib/utils/currency";
import {
  fetchCalculationHistory,
  deleteCalculation,
  updateCalculationTitle,
} from "@/lib/utils/calculation-history-api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Alert } from "@/components/ui/Alert";

function getCalculatorTypeLabel(type: CalculatorType): string {
  switch (type) {
    case "income_tax":
      return "Federal Income Tax";
    case "self_employed":
      return "Self-Employed (Schedule SE)";
    case "1099":
      return "1099 Contractor Tax";
    case "quarterly_tax":
      return "Quarterly Estimated (1040-ES)";
    default:
      return "Federal Tax";
  }
}

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

export default function DashboardCalculationsPage() {
  const router = useRouter();
  const [calculations, setCalculations] = useState<TaxCalculationRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>("");
  const [isRenaming, setIsRenaming] = useState<boolean>(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadCalculations = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const res = await fetchCalculationHistory();

    setIsLoading(false);
    if (res.success && res.data) {
      setCalculations(res.data);
    } else {
      setErrorMessage(res.error || "Failed to load calculation history.");
    }
  }, []);

  useEffect(() => {
    loadCalculations();
  }, [loadCalculations]);

  const handleStartRename = (calc: TaxCalculationRecord) => {
    setEditingId(calc.id);
    setEditTitle(calc.title);
  };

  const handleSaveRename = async (id: string) => {
    if (!editTitle.trim()) return;
    setIsRenaming(true);

    const res = await updateCalculationTitle(id, editTitle.trim());
    setIsRenaming(false);

    if (res.success && res.data) {
      setCalculations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: res.data!.title } : c))
      );
      setEditingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    setDeleteError(null);

    const res = await deleteCalculation(deletingId);
    setIsDeleting(false);

    if (res.success) {
      setCalculations((prev) => prev.filter((c) => c.id !== deletingId));
      setDeletingId(null);
    } else {
      setDeleteError(res.error || "Failed to delete calculation.");
    }
  };

  const handleOpenInCalculator = (calc: TaxCalculationRecord) => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        "taxaihelp_reopen_calculation",
        JSON.stringify({
          id: calc.id,
          calculatorType: calc.calculatorType,
          inputSnapshot: calc.inputSnapshot,
        })
      );
    }
    router.push(getCalculatorPath(calc.calculatorType));
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-surface-900">Saved Calculations</h2>
          <p className="text-xs sm:text-sm text-surface-500 mt-0.5">
            Review and reopen deterministic historical calculations. All snapshots preserve original rules and engine versions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button href="/tax-calculators" size="sm" variant="primary">
            + New Calculation
          </Button>
        </div>
      </div>

      {deleteError && (
        <Alert variant="error" title="Delete Error">
          {deleteError}
        </Alert>
      )}

      {/* Delete Confirmation Modal / Card */}
      {deletingId && (
        <div className="p-5 rounded-xl border-2 border-red-300 bg-red-50/80 shadow-md">
          <h3 className="text-base font-bold text-red-900">Delete Saved Calculation?</h3>
          <p className="text-xs sm:text-sm text-red-700 mt-1">
            Are you sure you want to permanently delete this calculation snapshot? This action cannot be undone.
          </p>
          <div className="flex gap-2 mt-4">
            <Button
              variant="danger"
              size="sm"
              disabled={isDeleting}
              isLoading={isDeleting}
              onClick={handleDeleteConfirm}
            >
              {isDeleting ? "Deleting..." : "Permanently Delete"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => {
                setDeletingId(null);
                setDeleteError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* State Transitions */}
      {isLoading ? (
        <LoadingState message="Loading your calculation history..." />
      ) : errorMessage ? (
        <ErrorState
          title="Unable to Load Calculation History"
          message={errorMessage}
          retryAction={loadCalculations}
        />
      ) : calculations.length === 0 ? (
        <EmptyState
          title="No saved calculations yet."
          description="Run any of our federal tax calculators to generate and save your deterministic estimation results."
          actionLabel="Use a Calculator"
          actionHref="/tax-calculators"
        />
      ) : (
        <div className="space-y-4">
          <div className="text-xs text-surface-500 font-medium">
            Showing {calculations.length} saved {calculations.length === 1 ? "calculation" : "calculations"}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {calculations.map((calc) => {
              const res = calc.resultSnapshot;
              const formattedDate = new Date(calc.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              });
              const isQuarterly = calc.calculatorType === "quarterly_tax";

              return (
                <Card
                  key={calc.id}
                  className="hover:border-surface-300 hover:shadow-card transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Calculation Info */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {editingId === calc.id ? (
                          <div className="flex items-center gap-2 w-full max-w-md">
                            <Input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              disabled={isRenaming}
                              className="text-sm h-8"
                            />
                            <Button
                              size="sm"
                              disabled={isRenaming}
                              onClick={() => handleSaveRename(calc.id)}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isRenaming}
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <h3 className="text-base sm:text-lg font-bold text-surface-900 tracking-tight">
                              {calc.title}
                            </h3>
                            <button
                              onClick={() => handleStartRename(calc)}
                              className="text-xs text-surface-400 hover:text-surface-700 underline"
                              title="Rename calculation"
                            >
                              Rename
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="brand" size="sm">
                          {getCalculatorTypeLabel(calc.calculatorType)}
                        </Badge>
                        <Badge variant="neutral" size="sm">
                          Tax Year {calc.taxYear}
                        </Badge>
                        <span className="text-xs text-surface-500 capitalize">
                          {calc.filingStatus.replace(/_/g, " ")}
                        </span>
                        <span className="text-surface-300">&bull;</span>
                        <span className="text-xs text-surface-500">
                          Saved {formattedDate}
                        </span>
                      </div>

                      <div className="text-[11px] text-surface-400 font-mono flex flex-wrap gap-x-3">
                        <span>Engine: v{calc.engineVersion}</span>
                        <span>Rules: {calc.rulesVersion}</span>
                      </div>
                    </div>

                    {/* High-level result metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-surface-50 p-3 rounded-xl border border-surface-200 text-xs">
                      <div>
                        <span className="text-surface-500 block">
                          {isQuarterly ? "Quarterly Payment" : "Federal Liability"}
                        </span>
                        <span className="text-sm font-black text-surface-900 block mt-0.5">
                          {isQuarterly && res.quarterlyBreakdown
                            ? formatCurrencyFromCents(res.quarterlyBreakdown.quarterlyPaymentCents)
                            : formatCurrencyFromCents(res.totalTaxLiabilityCents)}
                        </span>
                      </div>

                      <div>
                        <span className="text-surface-500 block">Effective Rate</span>
                        <span className="text-sm font-bold text-brand-600 block mt-0.5">
                          {(res.effectiveTaxRate * 100).toFixed(1)}%
                        </span>
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-surface-500 block">Balance / Refund</span>
                        <span
                          className={`text-sm font-bold block mt-0.5 ${
                            res.estimatedRefundCents > 0
                              ? "text-emerald-600"
                              : res.estimatedAmountOwedCents > 0
                              ? "text-amber-600"
                              : "text-surface-700"
                          }`}
                        >
                          {res.estimatedRefundCents > 0
                            ? `+${formatCurrencyFromCents(res.estimatedRefundCents)}`
                            : res.estimatedAmountOwedCents > 0
                            ? `-${formatCurrencyFromCents(res.estimatedAmountOwedCents)}`
                            : "$0.00"}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex sm:flex-col lg:flex-row items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-surface-100">
                      <Button
                        href={`/dashboard/calculations/${calc.id}`}
                        size="sm"
                        variant="primary"
                        className="flex-1 sm:w-full lg:w-auto"
                      >
                        View Detail
                      </Button>
                      <Button
                        onClick={() => handleOpenInCalculator(calc)}
                        size="sm"
                        variant="outline"
                        className="flex-1 sm:w-full lg:w-auto"
                      >
                        Open in Calculator
                      </Button>
                      <Button
                        onClick={() => setDeletingId(calc.id)}
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
