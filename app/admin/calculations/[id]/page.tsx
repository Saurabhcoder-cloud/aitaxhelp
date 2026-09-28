"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calculator,
  ShieldCheck,
  Lock,
  FileCode2,
  Calendar,
  DollarSign,
  Loader2,
  User,
} from "lucide-react";
import { TaxCalculationRecord } from "@/types/tax";
import { formatCurrencyFromCents } from "@/lib/utils/currency";

export default function AdminCalculationDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = use(Promise.resolve(params));
  const calculationId = resolvedParams.id;

  const [calculation, setCalculation] = useState<TaxCalculationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCalculation() {
      try {
        setLoading(true);
        const res = await fetch(`/api/v1/admin/calculations/${calculationId}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error("Calculation record not found.");
          throw new Error("Failed to load calculation record.");
        }
        const json = await res.json();
        if (json.success && json.data) {
          setCalculation(json.data);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error loading calculation.");
      } finally {
        setLoading(false);
      }
    }

    loadCalculation();
  }, [calculationId]);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
        <p className="text-sm font-medium text-surface-600">Loading historical calculation record...</p>
      </div>
    );
  }

  if (error || !calculation) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/calculations"
          className="inline-flex items-center gap-2 text-sm text-surface-600 hover:text-surface-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Calculations</span>
        </Link>
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <h3 className="font-semibold text-base mb-1">Calculation Not Found</h3>
          <p className="text-sm">{error || "The requested calculation record could not be found."}</p>
        </div>
      </div>
    );
  }

  const results = calculation.resultSnapshot;

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/admin/calculations"
          className="inline-flex items-center gap-2 text-sm font-medium text-surface-600 hover:text-surface-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Calculations</span>
        </Link>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Immutable Deterministic Record</span>
        </div>
      </div>

      {/* Header Info */}
      <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-surface-100 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 tracking-tight">
              {calculation.title}
            </h1>
            <div className="text-xs text-surface-500 mt-1 flex flex-wrap items-center gap-3">
              <span>Tax Year {calculation.taxYear}</span>
              <span>&bull;</span>
              <span className="capitalize">{calculation.calculatorType} Calculator</span>
              <span>&bull;</span>
              <span className="capitalize">{calculation.filingStatus.replace(/_/g, " ")}</span>
              <span>&bull;</span>
              <span>Created {new Date(calculation.createdAt).toLocaleString()}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-mono text-surface-500 bg-surface-50 px-2.5 py-1 rounded-md border border-surface-200">
              Engine v{calculation.engineVersion} &bull; Rules v{calculation.rulesVersion}
            </div>
          </div>
        </div>

        {/* Immutability Banner */}
        <div className="p-3.5 bg-surface-50 rounded-xl border border-surface-200 flex items-center gap-3 text-xs text-surface-700">
          <Lock className="w-4 h-4 text-surface-500 shrink-0" />
          <span>
            This is a verified mathematical tax snapshot. In compliance with strict audit requirements, historical calculations cannot be mutated or overwritten by administrative users.
          </span>
        </div>
      </div>

      {/* Financial Results Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-surface-200 shadow-2xs">
          <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider block">Gross Income</span>
          <div className="text-xl font-bold text-surface-900 mt-1">
            {formatCurrencyFromCents(results.grossIncomeCents)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-surface-200 shadow-2xs">
          <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider block">Taxable Income</span>
          <div className="text-xl font-bold text-surface-900 mt-1">
            {formatCurrencyFromCents(results.taxableIncomeCents)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-surface-200 shadow-2xs">
          <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider block">Total Tax Liability</span>
          <div className="text-xl font-bold text-surface-900 mt-1 text-purple-700">
            {formatCurrencyFromCents(results.totalTaxLiabilityCents)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-surface-200 shadow-2xs">
          <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider block">
            {results.estimatedRefundCents > 0 ? "Estimated Refund" : "Amount Owed"}
          </span>
          <div className={`text-xl font-bold mt-1 ${results.estimatedRefundCents > 0 ? "text-emerald-600" : "text-amber-700"}`}>
            {results.estimatedRefundCents > 0
              ? formatCurrencyFromCents(results.estimatedRefundCents)
              : formatCurrencyFromCents(results.estimatedAmountOwedCents)}
          </div>
        </div>
      </div>

      {/* Snapshots Inspection Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Input Snapshot */}
        <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-2xs space-y-3">
          <h3 className="text-base font-bold text-surface-900 flex items-center gap-2 border-b border-surface-100 pb-3">
            <FileCode2 className="w-5 h-5 text-blue-600" />
            <span>Taxpayer Input Snapshot</span>
          </h3>
          <p className="text-xs text-surface-500">
            Deterministic input parameters supplied by the taxpayer when calculation was executed.
          </p>
          <pre className="p-4 rounded-xl bg-surface-900 text-surface-100 text-xs font-mono overflow-x-auto max-h-96">
            {JSON.stringify(calculation.inputSnapshot, null, 2)}
          </pre>
        </div>

        {/* Engine Output Snapshot */}
        <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-2xs space-y-3">
          <h3 className="text-base font-bold text-surface-900 flex items-center gap-2 border-b border-surface-100 pb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Tax Engine Output Snapshot</span>
          </h3>
          <p className="text-xs text-surface-500">
            Immutable mathematical calculation results produced by the versioned tax rules engine.
          </p>
          <pre className="p-4 rounded-xl bg-surface-900 text-surface-100 text-xs font-mono overflow-x-auto max-h-96">
            {JSON.stringify(calculation.resultSnapshot, null, 2)}
          </pre>
        </div>
      </div>

      {/* Operational Metadata */}
      <div className="bg-white rounded-2xl border border-surface-200 p-5 shadow-2xs text-xs text-surface-600 space-y-2">
        <div className="font-semibold text-surface-900 uppercase tracking-wider">Record Metadata</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div><span className="font-medium">Calculation ID:</span> <span className="font-mono text-surface-800">{calculation.id}</span></div>
          <div><span className="font-medium">User ID:</span> <span className="font-mono text-surface-800">{calculation.userId}</span></div>
          <div><span className="font-medium">Engine Version:</span> {calculation.engineVersion}</div>
          <div><span className="font-medium">Rules Version:</span> {calculation.rulesVersion}</div>
          <div><span className="font-medium">Created:</span> {new Date(calculation.createdAt).toLocaleString()}</div>
          <div><span className="font-medium">Updated:</span> {new Date(calculation.updatedAt).toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}
