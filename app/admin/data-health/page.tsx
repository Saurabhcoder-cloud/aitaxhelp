"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Database,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  HardDrive,
  FileCheck,
  Trash2,
  Lock,
  ArrowRight,
  Eye,
  Sliders,
  Layers,
  History,
  Info,
} from "lucide-react";
import { getSessionToken } from "@/lib/utils/auth-client";
import {
  DataHealthSummary,
  IntegrityDiagnosticReport,
  RetentionPreviewResult,
  RestoreVerificationReport,
  DatasetInventoryItem,
} from "@/types/data-management";

export default function AdminDataHealthPage() {
  const [dataHealth, setDataHealth] = useState<DataHealthSummary | null>(null);
  const [integrityReport, setIntegrityReport] = useState<IntegrityDiagnosticReport | null>(null);
  const [retentionPreview, setRetentionPreview] = useState<RetentionPreviewResult | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "datasets" | "integrity" | "retention">("overview");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCheckingIntegrity, setIsCheckingIntegrity] = useState<boolean>(false);
  const [isPreviewingRetention, setIsPreviewingRetention] = useState<boolean>(false);
  const [isVerifyingRestore, setIsVerifyingRestore] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const getHeaders = () => {
    const token = getSessionToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  const fetchDataHealth = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/v1/admin/data-health", { headers: getHeaders() });
      if (!res.ok) {
        throw new Error(
          res.status === 403
            ? "Access denied. Administrator privileges required."
            : "Failed to retrieve data health summary."
        );
      }
      const json = await res.json();
      if (json.success && json.data) {
        setDataHealth(json.data);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error loading data health status.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDataHealth();
  }, [fetchDataHealth]);

  const handleRunIntegrityCheck = async () => {
    setIsCheckingIntegrity(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/v1/admin/data-health/integrity/check", {
        method: "POST",
        headers: getHeaders(),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setIntegrityReport(json.data);
        setSuccessMessage("Integrity check completed successfully. No records were modified.");
        fetchDataHealth();
      } else {
        throw new Error(json.error?.message || "Integrity check failed.");
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error executing integrity check.");
    } finally {
      setIsCheckingIntegrity(false);
    }
  };

  const handleRunRetentionPreview = async () => {
    setIsPreviewingRetention(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/v1/admin/data-health/retention/preview", {
        method: "POST",
        headers: getHeaders(),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setRetentionPreview(json.data);
        setSuccessMessage("Dry-run retention cleanup preview generated. 0 records were deleted.");
      } else {
        throw new Error(json.error?.message || "Retention preview failed.");
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error generating retention preview.");
    } finally {
      setIsPreviewingRetention(false);
    }
  };

  const handleRunRestoreVerification = async () => {
    setIsVerifyingRestore(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/v1/admin/data-health/recovery/verify", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ simulateDrill: true }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setSuccessMessage("Non-destructive restore drill verification simulation completed.");
        fetchDataHealth();
      } else {
        throw new Error(json.error?.message || "Restore verification failed.");
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error running restore verification.");
    } finally {
      setIsVerifyingRestore(false);
    }
  };

  const renderStatusBadge = (status?: string | null) => {
    const s = status || "UNKNOWN";
    switch (s) {
      case "HEALTHY":
      case "PASSED":
      case "ok":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {s}
          </span>
        );
      case "NOT_CONFIGURED":
      case "NOT_RUN":
      case "ATTENTION_REQUIRED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            {s.replace("_", " ")}
          </span>
        );
      case "DEGRADED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
            {s}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            {s}
          </span>
        );
    }
  };

  const renderClassificationBadge = (classification: string) => {
    switch (classification) {
      case "SENSITIVE_TAX":
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-900/40 text-rose-300 border border-rose-700/50">
            SENSITIVE TAX
          </span>
        );
      case "SECURITY_SENSITIVE":
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-900/40 text-purple-300 border border-purple-700/50">
            SECURITY SENSITIVE
          </span>
        );
      case "CONFIDENTIAL":
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-900/40 text-amber-300 border border-amber-700/50">
            CONFIDENTIAL
          </span>
        );
      case "INTERNAL":
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-900/40 text-blue-300 border border-blue-700/50">
            INTERNAL
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-surface-700 text-surface-300">
            PUBLIC
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 text-surface-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-surface-800 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Data Health &amp; Recovery</h1>
              <p className="text-sm text-surface-400">
                Production data lifecycle, retention status, non-destructive integrity diagnostics &amp; backup readiness.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDataHealth}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-surface-800 hover:bg-surface-700 text-surface-200 border border-surface-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleRunIntegrityCheck}
            disabled={isCheckingIntegrity}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-brand-600 hover:bg-brand-500 text-white transition shadow-sm"
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${isCheckingIntegrity ? "animate-spin" : ""}`} />
            Run Integrity Checks
          </button>
        </div>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="p-4 rounded-lg bg-red-900/30 border border-red-700/50 text-red-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">{errorMessage}</div>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-lg bg-emerald-900/30 border border-emerald-700/50 text-emerald-200 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">{successMessage}</div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-surface-800 space-x-4">
        {[
          { key: "overview", label: "Health Overview" },
          { key: "datasets", label: "Dataset Inventory" },
          { key: "integrity", label: "Integrity & Orphans" },
          { key: "retention", label: "Retention & Legal Hold" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`pb-3 text-sm font-semibold transition border-b-2 ${
              activeTab === tab.key
                ? "border-brand-500 text-brand-400"
                : "border-transparent text-surface-400 hover:text-surface-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === "overview" && dataHealth && (
        <div className="space-y-6">
          {/* Key Metric Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Database Card */}
            <div className="p-5 rounded-xl bg-surface-900/80 border border-surface-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Database</span>
                {renderStatusBadge(dataHealth.database.status)}
              </div>
              <div className="text-xl font-bold text-white">
                {dataHealth.database.provider.toUpperCase()}
              </div>
              <p className="text-xs text-surface-400">{dataHealth.database.message}</p>
            </div>

            {/* Backup Readiness Card */}
            <div className="p-5 rounded-xl bg-surface-900/80 border border-surface-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Backup Status</span>
                {renderStatusBadge(dataHealth.backup.status)}
              </div>
              <div className="text-xl font-bold text-white">
                {dataHealth.backup.provider}
              </div>
              <div className="text-xs text-surface-400">
                Recovery Point:{" "}
                <span className="text-surface-200 font-mono">
                  {dataHealth.backup.recoveryPoint || "Unavailable"}
                </span>
              </div>
            </div>

            {/* Restore Verification Card */}
            <div className="p-5 rounded-xl bg-surface-900/80 border border-surface-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Restore Drill</span>
                {renderStatusBadge(dataHealth.restoreVerification.status)}
              </div>
              <div className="text-xl font-bold text-white">
                {dataHealth.restoreVerification.status}
              </div>
              <p className="text-xs text-surface-400">
                {dataHealth.restoreVerification.lastRunAt
                  ? `Last Drill: ${new Date(dataHealth.restoreVerification.lastRunAt).toLocaleDateString()}`
                  : "No restore drill recorded."}
              </p>
            </div>

            {/* Integrity Status Card */}
            <div className="p-5 rounded-xl bg-surface-900/80 border border-surface-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Integrity</span>
                {renderStatusBadge(dataHealth.integrity.status)}
              </div>
              <div className="text-xl font-bold text-white">
                {dataHealth.integrity.orphanRecordsCount} Orphans
              </div>
              <p className="text-xs text-surface-400">
                {dataHealth.integrity.totalChecks} checks run across all relational datasets.
              </p>
            </div>
          </div>

          {/* RPO / RTO Target Section */}
          <div className="p-6 rounded-xl bg-surface-900/80 border border-surface-800 space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-brand-400" />
              Recovery Objectives (Operational Targets)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-lg bg-surface-800/50 border border-surface-700/60">
                <span className="text-xs text-surface-400 block mb-1 uppercase tracking-wider font-semibold">
                  Target Recovery Point Objective (RPO)
                </span>
                <span className="text-2xl font-bold text-white">
                  {dataHealth.rpoRto.configuredTargetRpoMinutes} min
                </span>
                <p className="text-xs text-surface-400 mt-2">
                  Target data loss threshold. Confirmed recovery point:{" "}
                  <strong className="text-surface-200">
                    {dataHealth.rpoRto.actualRecoveryPoint || "Unavailable"}
                  </strong>
                </p>
              </div>

              <div className="p-4 rounded-lg bg-surface-800/50 border border-surface-700/60">
                <span className="text-xs text-surface-400 block mb-1 uppercase tracking-wider font-semibold">
                  Target Recovery Time Objective (RTO)
                </span>
                <span className="text-2xl font-bold text-white">
                  {dataHealth.rpoRto.configuredTargetRtoMinutes} min
                </span>
                <p className="text-xs text-surface-400 mt-2">
                  Operational target for total restoration window. Measured via simulated restore drills.
                </p>
              </div>
            </div>
            <p className="text-xs text-surface-400 italic">
              Note: RPO and RTO figures are operational targets unless empirically validated by an active configured recovery system.
            </p>
          </div>

          {/* Safe Operational Actions */}
          <div className="p-6 rounded-xl bg-surface-900/80 border border-surface-800 space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-brand-400" />
              Safe Data Operations
            </h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleRunIntegrityCheck}
                disabled={isCheckingIntegrity}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-surface-800 hover:bg-surface-700 border border-surface-700 text-surface-200 transition"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                {isCheckingIntegrity ? "Checking..." : "Inspect Relational Integrity"}
              </button>

              <button
                onClick={handleRunRetentionPreview}
                disabled={isPreviewingRetention}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-surface-800 hover:bg-surface-700 border border-surface-700 text-surface-200 transition"
              >
                <Eye className="w-4 h-4 text-blue-400" />
                {isPreviewingRetention ? "Evaluating..." : "Dry-Run Retention Preview"}
              </button>

              <button
                onClick={handleRunRestoreVerification}
                disabled={isVerifyingRestore}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-surface-800 hover:bg-surface-700 border border-surface-700 text-surface-200 transition"
              >
                <HardDrive className="w-4 h-4 text-purple-400" />
                {isVerifyingRestore ? "Verifying..." : "Simulate Restore Drill"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Dataset Inventory */}
      {activeTab === "datasets" && dataHealth && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Centralized Dataset Inventory</h2>
            <span className="text-xs text-surface-400">
              {dataHealth.datasetInventory.length} Managed Datasets
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-surface-800 bg-surface-900/60">
            <table className="min-w-full divide-y divide-surface-800 text-left text-xs">
              <thead className="bg-surface-800/60 text-surface-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Dataset</th>
                  <th className="px-4 py-3">Classification</th>
                  <th className="px-4 py-3">Retention Mode</th>
                  <th className="px-4 py-3">Backup Priority</th>
                  <th className="px-4 py-3">User Export</th>
                  <th className="px-4 py-3">User Deletion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800 text-surface-300">
                {dataHealth.datasetInventory.map((item) => (
                  <tr key={item.key} className="hover:bg-surface-800/30">
                    <td className="px-4 py-3 font-medium text-white">
                      <div>{item.name}</div>
                      <div className="text-[10px] text-surface-400 font-mono">{item.key}</div>
                    </td>
                    <td className="px-4 py-3">{renderClassificationBadge(item.classification)}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-surface-200">{item.retentionMode}</span>
                      <div className="text-[10px] text-surface-400">
                        {item.retentionPeriodDays ? `${item.retentionPeriodDays} days` : "Policy Not Configured"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-bold ${
                          item.recoveryPriority === "CRITICAL"
                            ? "text-red-400"
                            : item.recoveryPriority === "HIGH"
                            ? "text-amber-400"
                            : item.recoveryPriority === "NORMAL"
                            ? "text-blue-400"
                            : "text-surface-400"
                        }`}
                      >
                        {item.recoveryPriority}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono">{item.exportBehavior}</td>
                    <td className="px-4 py-3 font-mono">{item.deletionBehavior}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Integrity & Orphans */}
      {activeTab === "integrity" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Non-Destructive Integrity Diagnostics</h2>
              <p className="text-xs text-surface-400">
                Checks referential integrity, orphaned user records, and duplicate identifiers without modifying data.
              </p>
            </div>
            <button
              onClick={handleRunIntegrityCheck}
              disabled={isCheckingIntegrity}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-600 hover:bg-brand-500 text-white transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingIntegrity ? "animate-spin" : ""}`} />
              Run Checks Now
            </button>
          </div>

          {integrityReport ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-surface-900 border border-surface-800">
                  <span className="text-xs text-surface-400 block mb-1">Overall Status</span>
                  {renderStatusBadge(integrityReport.overallStatus)}
                </div>
                <div className="p-4 rounded-xl bg-surface-900 border border-surface-800">
                  <span className="text-xs text-surface-400 block mb-1">Total Orphan Records</span>
                  <span className="text-xl font-bold text-white">{integrityReport.orphansDetected}</span>
                </div>
                <div className="p-4 rounded-xl bg-surface-900 border border-surface-800">
                  <span className="text-xs text-surface-400 block mb-1">Total Duplicate Keys</span>
                  <span className="text-xl font-bold text-white">{integrityReport.duplicatesDetected}</span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-surface-800 bg-surface-900/60">
                <table className="min-w-full divide-y divide-surface-800 text-left text-xs">
                  <thead className="bg-surface-800/60 text-surface-400 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Dataset</th>
                      <th className="px-4 py-3">Check</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Count</th>
                      <th className="px-4 py-3">Severity</th>
                      <th className="px-4 py-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-800 text-surface-300">
                    {integrityReport.checks.map((chk, i) => (
                      <tr key={i} className="hover:bg-surface-800/30">
                        <td className="px-4 py-3 font-medium text-white">{chk.dataset}</td>
                        <td className="px-4 py-3 font-mono">{chk.check}</td>
                        <td className="px-4 py-3">{renderStatusBadge(chk.status)}</td>
                        <td className="px-4 py-3 font-bold">{chk.count}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              chk.severity === "ERROR"
                                ? "bg-red-900/50 text-red-300"
                                : chk.severity === "WARNING"
                                ? "bg-amber-900/50 text-amber-300"
                                : "bg-surface-800 text-surface-300"
                            }`}
                          >
                            {chk.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-surface-400">{chk.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center rounded-xl bg-surface-900 border border-surface-800 text-surface-400 text-xs">
              Click &quot;Run Checks Now&quot; to inspect referential consistency across tables.
            </div>
          )}
        </div>
      )}

      {/* Tab: Retention & Legal Hold */}
      {activeTab === "retention" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Retention Policies &amp; Legal Holds</h2>
              <p className="text-xs text-surface-400">
                Safeguards retention lifecycle and prevents deletion of records subject to active holds.
              </p>
            </div>
            <button
              onClick={handleRunRetentionPreview}
              disabled={isPreviewingRetention}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-600 hover:bg-brand-500 text-white transition"
            >
              <Eye className="w-3.5 h-3.5" />
              Run Dry-Run Preview
            </button>
          </div>

          {retentionPreview && (
            <div className="p-5 rounded-xl bg-surface-900/80 border border-surface-800 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-400" />
                Dry-Run Retention Preview Result (0 Records Modified)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-surface-800/40 border border-surface-700/50">
                  <span className="text-surface-400 block mb-1">Eligible Records</span>
                  <span className="text-lg font-bold text-white">{retentionPreview.eligibleCount}</span>
                </div>
                <div className="p-3 rounded-lg bg-surface-800/40 border border-surface-700/50">
                  <span className="text-surface-400 block mb-1">Blocked by Legal Hold</span>
                  <span className="text-lg font-bold text-amber-400">{retentionPreview.blockedByLegalHoldCount}</span>
                </div>
                <div className="p-3 rounded-lg bg-surface-800/40 border border-surface-700/50">
                  <span className="text-surface-400 block mb-1">Blocked by Policy Age</span>
                  <span className="text-lg font-bold text-surface-200">{retentionPreview.blockedByPolicyCount}</span>
                </div>
                <div className="p-3 rounded-lg bg-surface-800/40 border border-surface-700/50">
                  <span className="text-surface-400 block mb-1">Estimated Deletions</span>
                  <span className="text-lg font-bold text-rose-400">{retentionPreview.estimatedDeletions}</span>
                </div>
              </div>
            </div>
          )}

          {/* Legal Hold Informational Notice */}
          <div className="p-5 rounded-xl bg-surface-900 border border-surface-800 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Lock className="w-4 h-4 text-amber-400" />
              Legal &amp; Security Hold Invariant
            </div>
            <p className="text-xs text-surface-400 leading-relaxed">
              Records under active legal hold are strictly non-deletable by automated retention workflows. Any attempt to purge an item under legal hold will fail-safe and remain locked until explicitly released with an audited administrative justification.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
