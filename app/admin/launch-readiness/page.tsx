"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  Rocket,
  Shield,
  FileCheck2,
} from "lucide-react";
import { getSessionToken } from "@/lib/utils/auth-client";
import { LaunchReadinessReport, LaunchCheckStatus } from "@/types/operations";

export default function AdminLaunchReadinessPage() {
  const [report, setReport] = useState<LaunchReadinessReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getHeaders = () => {
    const token = getSessionToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  const fetchLaunchReadiness = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/v1/admin/launch-readiness", { headers: getHeaders() });
      if (!res.ok) {
        throw new Error(
          res.status === 403
            ? "Access denied. Administrator privileges required."
            : "Failed to evaluate launch readiness."
        );
      }
      const json = await res.json();
      if (json.success && json.data) {
        setReport(json.data);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error loading launch readiness audit.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLaunchReadiness();
  }, [fetchLaunchReadiness]);

  const renderStatusBadge = (status: LaunchCheckStatus) => {
    switch (status) {
      case "READY":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            READY
          </span>
        );
      case "WARNING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            WARNING
          </span>
        );
      case "NOT_CONFIGURED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-surface-700 text-surface-300">
            NOT CONFIGURED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
            <AlertOctagon className="w-3.5 h-3.5 text-red-600" />
            BLOCKED
          </span>
        );
    }
  };

  return (
    <div className="bg-surface-950 rounded-2xl p-6 sm:p-8 border border-surface-800 shadow-xl space-y-6 text-surface-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-surface-800 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">Final Launch Readiness Audit</h1>
                {report && (
                  <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-surface-800 text-surface-300 border border-surface-700">
                    {report.environment}
                  </span>
                )}
              </div>
              <p className="text-sm text-surface-400">
                16-category comprehensive pre-flight verification across all platform architecture layers.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchLaunchReadiness}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-surface-800 hover:bg-surface-700 text-surface-200 border border-surface-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Re-Audit Platform
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-lg bg-red-900/30 border border-red-700/50 text-red-200 flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">{errorMessage}</div>
        </div>
      )}

      {report && (
        <>
          {/* Overall Verdict Banner */}
          <div
            className={`p-6 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              report.overallStatus === "READY"
                ? "bg-emerald-950/30 border-emerald-800/60"
                : report.overallStatus === "READY_WITH_WARNINGS"
                ? "bg-amber-950/30 border-amber-800/60"
                : "bg-red-950/30 border-red-800/60"
            }`}
          >
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-surface-400">
                Overall Launch Verdict
              </span>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-extrabold text-white">
                  {report.overallStatus.replace(/_/g, " ")}
                </span>
                {renderStatusBadge(
                  report.overallStatus === "READY"
                    ? "READY"
                    : report.overallStatus === "READY_WITH_WARNINGS"
                    ? "WARNING"
                    : "BLOCKED"
                )}
              </div>
              <p className="text-xs text-surface-300">
                {report.overallStatus === "READY"
                  ? "All mandatory statutory calculations, database controls, and security perimeters certified for production."
                  : report.overallStatus === "READY_WITH_WARNINGS"
                  ? "Core functionality verified; non-blocking warnings present for optional integrations (email or backup in development)."
                  : "Platform NOT READY for production launch. Mandatory release criteria unmet."}
              </p>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1 text-xs">
              <span className="font-semibold text-white">
                {report.passedCount} / {report.totalChecks} Checks Passed
              </span>
              <span className="text-surface-400 text-[11px]">
                {report.warningCount} Warnings • {report.blockedCount} Blocked
              </span>
            </div>
          </div>

          {/* 16 Checks Table */}
          <div className="overflow-x-auto rounded-xl border border-surface-800 bg-surface-900/60">
            <table className="min-w-full divide-y divide-surface-800 text-left text-xs">
              <thead className="bg-surface-800/60 text-surface-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Subsystem Requirement</th>
                  <th className="px-4 py-3">Mandatory</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Empirical Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800 text-surface-300">
                {report.checks.map((chk, i) => (
                  <tr key={i} className="hover:bg-surface-800/30">
                    <td className="px-4 py-3 font-mono font-bold text-white whitespace-nowrap">
                      {chk.category}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-surface-200">{chk.name}</div>
                      <div className="text-[11px] text-surface-400">{chk.notes}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {chk.isMandatory ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-950 text-brand-300 border border-brand-800">
                          MANDATORY
                        </span>
                      ) : (
                        <span className="text-surface-500 text-[10px]">OPTIONAL</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{renderStatusBadge(chk.status)}</td>
                    <td className="px-4 py-3 text-surface-400 text-[11px] max-w-sm">
                      {chk.evidence}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
