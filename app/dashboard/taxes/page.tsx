"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { TaxPreparationSession } from "@/lib/services/tax-preparation-session-store";
import {
  PREPARATION_STEP_LABELS,
  PREPARATION_STEPS,
  PreparationStep,
} from "@/lib/preparation/steps";
import {
  fetchCurrentPreparationSession,
  startPreparationSession,
  updatePreparationProgress,
  navigateToPreparationStep,
  calculatePreparationSession,
} from "@/lib/utils/preparation-session-api";
import { IncomeDiscoveryPanel } from "@/components/preparation/IncomeDiscoveryPanel";
import { DocumentsPanel } from "@/components/preparation/DocumentsPanel";
import { DeductionsPanel } from "@/components/preparation/DeductionsPanel";
import { TaxSituationSummaryPanel } from "@/components/preparation/TaxSituationSummaryPanel";
import { listIncomeSources } from "@/lib/preparation/income";
import { Check, Circle } from "lucide-react";

const NEXT_ACTION: Record<PreparationStep, string> = {
  taxpayer_profile: "Confirm the taxpayer profile already saved from setup.",
  income: "Tell us how you made money, then save those income sources before continuing.",
  documents: "Record which tax documents you have. You can continue if some are still missing.",
  deductions: "Answer the deduction questions for your income, then save them before continuing.",
  calculation: "Run deterministic tax calculation using official IRS statutory rules.",
  review: "Review your calculated results, AI explanation, and professional handoff options before completing.",
};

export default function StartMyTaxesPage() {
  const [session, setSession] = useState<TaxPreparationSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    const result = await fetchCurrentPreparationSession();
    if (!result.success) {
      setError(result.error || "Unable to load your preparation session.");
      setSession(null);
    } else {
      setError(null);
      setSession(result.data ?? null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleStart = async () => {
    setIsSaving(true);
    setError(null);
    const result = await startPreparationSession();
    setIsSaving(false);
    if (!result.success || !result.data) {
      setError(result.error || "Unable to start tax preparation.");
      return;
    }
    setSession(result.data);
  };

  const handleContinue = async () => {
    if (!session) return;
    setIsSaving(true);
    setError(null);
    const result = await updatePreparationProgress(session.currentStep);
    setIsSaving(false);
    if (!result.success || !result.data) {
      setError(result.error || "Unable to update preparation progress.");
      return;
    }
    setSession(result.data);
  };

  const handleNavigateToStep = async (step: PreparationStep) => {
    if (!session || session.currentStep === step) return;
    setIsSaving(true);
    setError(null);
    const result = await navigateToPreparationStep(step);
    setIsSaving(false);
    if (!result.success || !result.data) {
      setError(result.error || "Unable to navigate to step.");
      return;
    }
    setSession(result.data);
  };

  const handleCalculate = async () => {
    if (!session) return;
    setIsCalculating(true);
    setError(null);
    const result = await calculatePreparationSession();
    setIsCalculating(false);
    if (!result.success || !result.data) {
      setError(result.error || "Unable to execute tax calculation.");
      return;
    }
    setSession(result.data);
  };

  const completedCount = session
    ? PREPARATION_STEPS.filter((step) => session.steps[step] === "completed").length
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">Start My Taxes</p>
          <h2 className="text-2xl font-extrabold text-surface-900 tracking-tight mt-1">
            {session?.title || "Federal tax preparation"}
          </h2>
          <p className="text-sm text-surface-600 mt-1">
            Tax year {session?.taxYear ?? "—"}
          </p>
        </div>
        {session && (
          <Badge
            variant={
              session.status === "completed"
                ? "emerald"
                : session.status === "review"
                ? "brand"
                : "neutral"
            }
            size="sm"
          >
            {session.status.replaceAll("_", " ")}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <LoadingState message="Loading your tax preparation session..." />
      ) : (
        <Card className="p-5 sm:p-6 space-y-6">
          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
              {error}
            </p>
          )}

          {!session ? (
            <div className="space-y-4">
              <p className="text-sm text-surface-700 leading-relaxed">
                Start a preparation session to track your taxpayer profile, income, documents, deductions, calculation, and review. Existing profile details are reused.
              </p>
              <Button onClick={handleStart} disabled={isSaving}>
                {isSaving ? "Starting..." : "Start My Taxes"}
              </Button>
            </div>
          ) : (
            <>
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-surface-600 mb-2">
                  <span>
                    {completedCount} of {PREPARATION_STEPS.length} steps complete
                  </span>
                  <span>Current: {PREPARATION_STEP_LABELS[session.currentStep]}</span>
                </div>
                <div className="h-2 rounded-full bg-surface-200 overflow-hidden" aria-hidden="true">
                  <div
                    className="h-full bg-brand-600 transition-all duration-300"
                    style={{ width: `${(completedCount / PREPARATION_STEPS.length) * 100}%` }}
                  />
                </div>
              </div>

              <ol className="space-y-2">
                {PREPARATION_STEPS.map((step) => {
                  const state = session.steps[step];
                  const isCurrent = session.currentStep === step && session.status !== "completed";
                  const canNavigate = state === "completed" || step === "taxpayer_profile" || isCurrent;
                  return (
                    <li
                      key={step}
                      onClick={() => {
                        if (canNavigate && !isCurrent && !isSaving) {
                          handleNavigateToStep(step);
                        }
                      }}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
                        isCurrent
                          ? "border-brand-300 bg-brand-50"
                          : canNavigate
                          ? "border-surface-200 hover:border-brand-200 hover:bg-surface-50 cursor-pointer"
                          : "border-surface-200 opacity-60 cursor-not-allowed"
                      }`}
                    >
                      {state === "completed" ? (
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                      ) : (
                        <Circle className="w-4 h-4 text-surface-400 shrink-0" aria-hidden="true" />
                      )}
                      <span className="font-medium text-surface-900">{PREPARATION_STEP_LABELS[step]}</span>
                      {canNavigate && !isCurrent && (
                        <span className="text-[11px] text-brand-600 font-normal">Click to review</span>
                      )}
                      <span className="ml-auto text-xs text-surface-500 capitalize">
                        {state.replaceAll("_", " ")}
                      </span>
                    </li>
                  );
                })}
              </ol>

              {session.currentStep === "income" && (
                <IncomeDiscoveryPanel session={session} onSessionChange={setSession} />
              )}

              {session.currentStep === "documents" && (
                <DocumentsPanel session={session} onSessionChange={setSession} />
              )}

              {session.currentStep === "deductions" && (
                <DeductionsPanel session={session} onSessionChange={setSession} />
              )}

              {(session.steps.income === "completed" || session.currentStep === "calculation" || session.currentStep === "review" || session.status === "completed") && (
                <TaxSituationSummaryPanel
                  session={session}
                  onCalculate={session.currentStep === "calculation" ? handleCalculate : undefined}
                  isCalculating={isCalculating}
                />
              )}

              {session.currentStep !== "income" && session.incomeSnapshot.situations.length > 0 && (
                <div className="rounded-lg bg-surface-50 border border-surface-200 p-4 space-y-2">
                  <p className="text-sm font-semibold text-surface-900">Your income sources</p>
                  <ul className="space-y-1 text-sm text-surface-800">
                    {listIncomeSources(session.incomeSnapshot).map((source) => (
                      <li key={source.id}>✓ {source.label}</li>
                    ))}
                  </ul>
                </div>
              )}

              {session.profileSnapshot.profileReused && (
                <p className="text-sm text-surface-700">
                  Using your saved profile
                  {session.profileSnapshot.fullName ? ` for ${session.profileSnapshot.fullName}` : ""}
                  {" "}({session.profileSnapshot.filingStatus.replaceAll("_", " ")}).
                </p>
              )}

              <div className="rounded-lg bg-surface-50 border border-surface-200 p-4 space-y-3">
                <p className="text-sm font-semibold text-surface-900">Next action</p>
                <p className="text-sm text-surface-700">
                  {session.status === "completed"
                    ? "This preparation session is complete. You can inspect your saved calculation in Calculation History anytime."
                    : NEXT_ACTION[session.currentStep]}
                </p>
                {session.currentStep === "taxpayer_profile" && !session.profileSnapshot.profileReused && (
                  <Link href="/onboarding" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
                    Open taxpayer setup
                  </Link>
                )}
                {session.status !== "completed" &&
                  session.currentStep !== "income" &&
                  session.currentStep !== "documents" &&
                  session.currentStep !== "deductions" &&
                  session.currentStep !== "calculation" && (
                  <Button onClick={handleContinue} disabled={isSaving}>
                    {isSaving
                      ? "Saving..."
                      : session.status === "draft"
                      ? "Start My Taxes"
                      : session.currentStep === "review"
                      ? "Complete Preparation"
                      : "Continue"}
                  </Button>
                )}
                {session.currentStep === "calculation" && (
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={handleCalculate}
                      disabled={isCalculating || isSaving || session.situationSummary.calculationStatus !== "ready"}
                    >
                      {isCalculating ? "Calculating Taxes..." : "Run Tax Calculation"}
                    </Button>
                    {session.calculationSnapshot && (
                      <Button onClick={handleContinue} variant="outline" disabled={isSaving}>
                        {isSaving ? "Saving..." : "Continue to Review"}
                      </Button>
                    )}
                  </div>
                )}
                {session.status === "completed" && session.calculationId && (
                  <div className="flex flex-wrap items-center gap-3">
                    <Link href={`/dashboard/calculations/${session.calculationId}`}>
                      <Button variant="outline" size="sm">
                        View Saved Calculation
                      </Button>
                    </Link>
                    <a
                      href="/api/v1/tax/preparation/session/report?download=true"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm">
                        Export Session Report (HTML)
                      </Button>
                    </a>
                    <Link href={`/dashboard/calculations/${session.calculationId}/report`}>
                      <Button variant="outline" size="sm">
                        Calculation Breakdown Report
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
