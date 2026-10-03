"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  MapPin,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Building2,
  DollarSign,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Lock,
  FileText,
  Calculator,
} from "lucide-react";
import { StateTaxSummary } from "@/lib/state-tax/summary";
import { StateReadiness, StateReturn } from "@/lib/state-tax/types";

interface StateTaxReviewPanelProps {
  initialSummary?: StateTaxSummary | null;
  stateCode?: string;
  taxYear?: number;
  className?: string;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function StateTaxReviewPanel({
  initialSummary,
  stateCode: propStateCode,
  taxYear = 2025,
  className = "",
}: StateTaxReviewPanelProps) {
  const [summary, setSummary] = useState<StateTaxSummary | null>(initialSummary || null);
  const [stateReturn, setStateReturn] = useState<StateReturn | null>(null);
  const [readiness, setReadiness] = useState<StateReadiness | null>(null);
  const [isFrozen, setIsFrozen] = useState(false);
  const [isLoading, setIsLoading] = useState(!initialSummary);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isFreezing, setIsFreezing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (!initialSummary) {
      loadStateTaxData();
    }
  }, [initialSummary]);

  async function loadStateTaxData() {
    setIsLoading(true);
    setError(null);
    try {
      const [overviewRes, readinessRes, statusRes] = await Promise.all([
        fetch("/api/v1/tax/preparation/session/state-tax"),
        fetch("/api/v1/tax/preparation/session/state-tax/readiness"),
        fetch("/api/v1/tax/preparation/session/state-tax/efile/status"),
      ]);

      if (overviewRes.ok) {
        const ovData = await overviewRes.json();
        setSummary(ovData.data?.summary || null);
        setStateReturn(ovData.data?.stateReturn || null);
      }
      if (readinessRes.ok) {
        const readData = await readinessRes.json();
        setReadiness(readData.data || null);
      }
      if (statusRes.ok) {
        const statData = await statusRes.json();
        setIsFrozen(Boolean(statData.data?.isFrozen));
      }
    } catch (_err) {
      setError("Unable to load state tax data.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCalculateStateTax() {
    setIsCalculating(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch("/api/v1/tax/preparation/session/state-tax/calculate", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message || "State tax calculation is unavailable.");
      } else {
        setSuccessMessage("State tax calculated deterministically.");
        await loadStateTaxData();
      }
    } catch (_err) {
      setError("Failed to execute state tax calculation.");
    } finally {
      setIsCalculating(false);
    }
  }

  async function handleFreezeStateReturn() {
    setIsFreezing(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch("/api/v1/tax/preparation/session/state-tax/freeze", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message || "Failed to freeze state return.");
      } else {
        setIsFrozen(true);
        setSuccessMessage("State return frozen with cryptographic SHA-256 digest.");
        await loadStateTaxData();
      }
    } catch (_err) {
      setError("Failed to freeze state return.");
    } finally {
      setIsFreezing(false);
    }
  }

  const effectiveState = summary?.stateCode || propStateCode || "—";
  const stateName = summary?.stateName || effectiveState;
  const isNoTax = summary?.supportStatus === "NO_STATE_INCOME_TAX";
  const isSupported = summary?.supportStatus === "SUPPORTED";
  const isUnsupported = !isNoTax && !isSupported;
  const refundOrBalance = summary?.financials?.refundOrBalanceType;

  return (
    <Card className={`border-surface-200 overflow-hidden ${className}`}>
      <CardHeader
        className="cursor-pointer hover:bg-surface-50/80 transition-colors py-3.5 px-5 flex flex-row items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2.5">
          <MapPin className="w-4 h-4 text-brand-600" />
          <CardTitle className="text-base font-semibold text-surface-900">
            State Tax Review & Federal/State Separation
          </CardTitle>
          <Badge
            variant={isNoTax ? "brand" : isSupported ? "emerald" : "amber"}
            className="text-xs"
          >
            {isNoTax
              ? "No State Income Tax"
              : isSupported
              ? "Certified Engine Active"
              : "Preparation Not Yet Supported"}
          </Badge>
          {isFrozen && (
            <Badge variant="brand" className="text-xs flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>Snapshot Frozen</span>
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-surface-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-surface-400" />
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 px-5 pb-5 text-xs space-y-4">
          {/* State & Tax Year Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-surface-50 border border-surface-200">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-surface-600 shrink-0" />
              <div>
                <span className="font-semibold text-surface-900 text-sm">
                  {stateName} ({effectiveState})
                </span>
                <p className="text-[11px] text-surface-500">
                  Tax Year {summary?.taxYear || taxYear} • Filing Status:{" "}
                  {summary?.filingStatusLabel || "Standard Resident"} • Engine: {summary?.engineVersion || "v2025_v1"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-surface-600">Filing Requirement:</span>
              <Badge variant={summary?.isReturnRequired ? "amber" : "emerald"} className="text-[10px]">
                {summary?.isReturnRequired ? "State Return Required" : "No Return Required"}
              </Badge>
            </div>
          </div>

          {/* Status Explanation Banners */}
          {isNoTax && (
            <div className="p-3.5 rounded-lg border border-blue-200 bg-blue-50/70 text-blue-900 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-xs">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>NO STATE PERSONAL INCOME TAX</span>
              </div>
              <p className="text-[11px] leading-relaxed text-blue-800">
                {stateName} is one of 9 US states that does not levy an individual personal income
                tax on wages or self-employment earnings. You are not required to file a state income
                tax return with the state revenue authority.
              </p>
            </div>
          )}

          {isUnsupported && (
            <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/70 text-amber-900 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>STATE TAX PREPARATION CURRENTLY NOT SUPPORTED</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800">
                State tax return preparation is not currently supported for {stateName}. TaxAIHelp
                will never invent estimates or produce unverified state calculations.
              </p>
              <p className="text-[10px] text-amber-700">
                Recommendation: To file your {stateName} state return, obtain certified state forms
                directly from the {stateName} Department of Revenue or work with a certified CPA.
              </p>
            </div>
          )}

          {/* State Financials & Calculation Breakdown */}
          {isSupported && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 rounded-lg border border-surface-200 bg-surface-50/50 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-surface-500">Federal AGI Bridged</span>
                  <p className="text-sm font-bold text-surface-900">
                    {formatCurrency(summary?.financials?.incomeConsideredCents || 0)}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg border border-surface-200 bg-surface-50/50 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-surface-500">State Standard Deduction</span>
                  <p className="text-sm font-bold text-surface-900">
                    {formatCurrency(summary?.financials?.deductionUsedCents || 0)}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg border border-surface-200 bg-surface-50/50 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-surface-500">State Taxable Income</span>
                  <p className="text-sm font-bold text-surface-900">
                    {formatCurrency(summary?.financials?.stateTaxableIncomeCents || 0)}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg border border-surface-200 bg-surface-50/50 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-surface-500">Gross State Tax</span>
                  <p className="text-sm font-bold text-surface-900">
                    {formatCurrency(summary?.financials?.grossTaxCents || 0)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 rounded-lg border border-surface-200 bg-surface-50/50 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-surface-500">State Credits</span>
                  <p className="text-sm font-bold text-surface-900">
                    {formatCurrency(summary?.financials?.totalCreditsCents || 0)}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg border border-surface-200 bg-surface-50/50 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-surface-500">Net State Liability</span>
                  <p className="text-sm font-bold text-surface-900">
                    {formatCurrency(summary?.financials?.netTaxLiabilityCents || 0)}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg border border-surface-200 bg-surface-50/50 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-surface-500">Withholding & Prepayments</span>
                  <p className="text-sm font-bold text-surface-900">
                    {formatCurrency(summary?.financials?.totalPaymentsCents || 0)}
                  </p>
                </div>

                <div className={`p-2.5 rounded-lg border space-y-1 ${
                  refundOrBalance === "refund"
                    ? "border-emerald-200 bg-emerald-50/60 text-emerald-900"
                    : refundOrBalance === "balance_due"
                    ? "border-amber-200 bg-amber-50/60 text-amber-900"
                    : "border-surface-200 bg-surface-50/50 text-surface-900"
                }`}>
                  <span className="text-[10px] uppercase font-semibold">
                    {refundOrBalance === "refund" ? "Estimated Refund" : refundOrBalance === "balance_due" ? "Estimated Balance Due" : "Net Balance"}
                  </span>
                  <p className="text-sm font-bold">
                    {formatCurrency(summary?.financials?.refundOrBalanceCents || 0)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Row */}
          {isSupported && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-surface-100">
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleCalculateStateTax}
                  disabled={isCalculating}
                  size="sm"
                  className="bg-brand-600 hover:bg-brand-700 text-white text-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isCalculating ? "animate-spin" : ""}`} />
                  {isCalculating ? "Calculating..." : "Recalculate State Tax"}
                </Button>

                {!isFrozen && (
                  <Button
                    onClick={handleFreezeStateReturn}
                    disabled={isFreezing}
                    size="sm"
                    variant="outline"
                    className="text-xs border-surface-300"
                  >
                    <Lock className="w-3.5 h-3.5 mr-1.5 text-surface-600" />
                    {isFreezing ? "Freezing..." : "Freeze State Return"}
                  </Button>
                )}
              </div>

              <div className="text-[11px] text-surface-500 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-surface-400" />
                <span>Preparation Summary — Not an Official State Filing Form</span>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-1.5 p-2 rounded bg-emerald-50 text-emerald-700 text-xs border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-1.5 p-2 rounded bg-red-50 text-red-700 text-xs border border-red-200">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
