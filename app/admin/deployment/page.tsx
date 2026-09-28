"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Rocket,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  RefreshCw,
  Server,
  Database,
  FileCode2,
  HardDrive,
  Sparkles,
  CreditCard,
  Mail,
  Lock,
  Sliders,
  GitCommit,
  Clock,
  ExternalLink,
} from "lucide-react";
import { getSessionToken } from "@/lib/utils/auth-client";
import {
  DeploymentReadinessReport,
  DeploymentStatus,
  SubsystemStatus,
} from "@/lib/deployment/deployment-readiness";

export default function AdminDeploymentPage() {
  const [report, setReport] = useState<DeploymentReadinessReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getHeaders = () => {
    const token = getSessionToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  const fetchReadiness = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/v1/admin/deployment/readiness", { headers: getHeaders() });
      if (!res.ok) {
        throw new Error(
          res.status === 403
            ? "Access denied. Administrator privileges required."
            : "Failed to evaluate deployment readiness."
        );
      }
      const json = await res.json();
      if (json.success && json.data) {
        setReport(json.data);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error loading deployment readiness.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReadiness();
  }, [fetchReadiness]);

  const renderStatusBadge = (status: SubsystemStatus | DeploymentStatus) => {
    switch (status) {
      case "READY":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            READY
          </span>
        );
      case "READY_WITH_WARNINGS":
      case "WARNING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            {status === "READY_WITH_WARNINGS" ? "WARNINGS" : "WARNING"}
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

  const getSubsystemIcon = (key: string) => {
    switch (key) {
      case "environment":
        return <Server className="w-5 h-5 text-blue-400" />;
      case "database":
        return <Database className="w-5 h-5 text-emerald-400" />;
      case "migrations":
        return <FileCode2 className="w-5 h-5 text-purple-400" />;
      case "backup":
        return <HardDrive className="w-5 h-5 text-cyan-400" />;
      case "ai":
        return <Sparkles className="w-5 h-5 text-amber-400" />;
      case "billing":
        return <CreditCard className="w-5 h-5 text-indigo-400" />;
      case "email":
        return <Mail className="w-5 h-5 text-rose-400" />;
      case "security":
        return <Lock className="w-5 h-5 text-green-400" />;
      case "featureFlags":
        return <Sliders className="w-5 h-5 text-orange-400" />;
      default:
        return <ShieldCheck className="w-5 h-5 text-surface-400" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 text-surface-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-surface-800 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400">
              <Rocket className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">Deployment &amp; Release Readiness</h1>
                {report && (
                  <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-surface-800 text-surface-300 border border-surface-700">
                    {report.environment}
                  </span>
                )}
              </div>
              <p className="text-sm text-surface-400">
                Automated release diagnostics, environment contract validation &amp; go-live checks.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchReadiness}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-surface-800 hover:bg-surface-700 text-surface-200 border border-surface-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Re-evaluate
          </button>
        </div>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="p-4 rounded-lg bg-red-900/30 border border-red-700/50 text-red-200 flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">{errorMessage}</div>
        </div>
      )}

      {report && (
        <>
          {/* Overall Status Banner */}
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
                Overall Deployment Status
              </span>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-extrabold text-white">
                  {report.overallStatus.replace(/_/g, " ")}
                </span>
                {renderStatusBadge(report.overallStatus)}
              </div>
              <p className="text-xs text-surface-300">
                {report.overallStatus === "READY"
                  ? "All required environment variables, database connections, and migrations verified for production."
                  : report.overallStatus === "READY_WITH_WARNINGS"
                  ? "Application is deployable; non-blocking warnings detected (optional services unconfigured or running outside production)."
                  : "Critical deployment requirements missing. Release is BLOCKED until addressed."}
              </p>
            </div>

            <div className="flex flex-col sm:items-end text-xs text-surface-400 space-y-1">
              <div>Evaluated: {new Date(report.evaluatedAt).toLocaleTimeString()}</div>
              {report.requestId && <div className="font-mono text-[10px]">ID: {report.requestId}</div>}
            </div>
          </div>

          {/* Build Metadata Card */}
          <div className="p-5 rounded-xl bg-surface-900/80 border border-surface-800">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-surface-400 mb-3">
              Build &amp; Runtime Metadata
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-surface-800/40 border border-surface-700/50">
                <span className="text-surface-400 block mb-1">Application Version</span>
                <span className="text-sm font-bold text-white font-mono">{report.build.appVersion}</span>
              </div>
              <div className="p-3 rounded-lg bg-surface-800/40 border border-surface-700/50">
                <span className="text-surface-400 block mb-1">Git Commit SHA</span>
                <span className="text-sm font-bold text-white font-mono flex items-center gap-1">
                  <GitCommit className="w-3.5 h-3.5 text-brand-400" />
                  {report.build.gitCommit.slice(0, 10)}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-surface-800/40 border border-surface-700/50">
                <span className="text-surface-400 block mb-1">Runtime Node Version</span>
                <span className="text-sm font-bold text-white font-mono">{report.build.nodeVersion}</span>
              </div>
              <div className="p-3 rounded-lg bg-surface-800/40 border border-surface-700/50">
                <span className="text-surface-400 block mb-1">Build Timestamp</span>
                <span className="text-sm font-bold text-white font-mono flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-surface-400" />
                  {report.build.buildTime.slice(0, 10)}
                </span>
              </div>
            </div>
          </div>

          {/* Subsystems Readiness Grid */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-white">Subsystems &amp; Release Pre-Flight Checks</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(report.subsystems).map(([key, item]) => (
                <div
                  key={key}
                  className="p-5 rounded-xl bg-surface-900/80 border border-surface-800 flex flex-col justify-between space-y-3 hover:border-surface-700 transition"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getSubsystemIcon(key)}
                        <h3 className="text-sm font-semibold text-white">{item.name}</h3>
                      </div>
                      {renderStatusBadge(item.status)}
                    </div>
                    <p className="text-xs text-surface-400 leading-relaxed">{item.message}</p>
                  </div>

                  {item.details && (
                    <div className="pt-2 border-t border-surface-800/60 text-[11px] text-surface-500 font-mono">
                      {Object.entries(item.details).map(([dKey, dVal]) => (
                        <span key={dKey} className="mr-3">
                          {dKey}: <strong className="text-surface-300">{String(dVal)}</strong>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Operational Runbooks Quick Links */}
          <div className="p-5 rounded-xl bg-surface-900 border border-surface-800 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-surface-400">
              Operational Deployment Reference Runbooks
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-surface-800/40 border border-surface-700/50">
                <span className="font-semibold text-white block mb-0.5">Go-Live Checklist</span>
                <span className="text-surface-400 text-[11px]">docs/PRODUCTION-GO-LIVE-CHECKLIST.md</span>
              </div>
              <div className="p-3 rounded-lg bg-surface-800/40 border border-surface-700/50">
                <span className="font-semibold text-white block mb-0.5">Deployment Runbook</span>
                <span className="text-surface-400 text-[11px]">docs/PRODUCTION-DEPLOYMENT-RUNBOOK.md</span>
              </div>
              <div className="p-3 rounded-lg bg-surface-800/40 border border-surface-700/50">
                <span className="font-semibold text-white block mb-0.5">Rollback Runbook</span>
                <span className="text-surface-400 text-[11px]">docs/ROLLBACK-RUNBOOK.md</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
