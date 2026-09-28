"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Activity,
  Server,
  Database,
  Sparkles,
  Mail,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Cpu,
  Layers,
} from "lucide-react";
import { AdminSystemHealthResponse, DependencyHealth } from "@/lib/observability/health";
import { getSessionToken } from "@/lib/utils/auth-client";

export default function AdminSystemHealthPage() {
  const [data, setData] = useState<AdminSystemHealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const token = getSessionToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/v1/admin/system-health", { headers });
      if (!res.ok) {
        throw new Error(
          res.status === 403
            ? "Access denied. Administrator privileges required."
            : "Unable to retrieve system health diagnostics."
        );
      }

      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Error loading system health diagnostics."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "ok":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Healthy
          </span>
        );
      case "not_configured":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            Unconfigured
          </span>
        );
      case "degraded":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800">
            <AlertTriangle className="w-3 h-3 text-orange-600" />
            Degraded
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
            <AlertTriangle className="w-3 h-3 text-red-600" />
            Error
          </span>
        );
    }
  };

  const renderDependencyCard = (
    title: string,
    dep: DependencyHealth,
    icon: React.ReactNode
  ) => (
    <div className="p-5 rounded-2xl bg-white border border-surface-200 shadow-2xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-surface-100 flex items-center justify-center text-surface-600">
            {icon}
          </div>
          <div>
            <h3 className="text-xs font-bold text-surface-900">{title}</h3>
            <span className="text-[11px] text-surface-500 font-mono">
              provider: {dep.provider}
            </span>
          </div>
        </div>
        {renderStatusBadge(dep.status)}
      </div>

      <p className="text-xs text-surface-600 leading-relaxed bg-surface-50 p-2.5 rounded-xl border border-surface-100">
        {dep.message || "Operating within operational parameters."}
      </p>
    </div>
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-4">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-200">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-brand-600" />
            <h1 className="text-2xl font-bold text-surface-900 tracking-tight">
              System Health &amp; Observability
            </h1>
          </div>
          <p className="text-xs text-surface-500 mt-1">
            Real-time diagnostics, dependency status, latency metrics, and sanitized error summaries.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchHealth}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface-900 text-white hover:bg-surface-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Error Notification */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
          {errorMessage}
        </div>
      )}

      {isLoading && !data ? (
        <div className="py-24 text-center text-xs text-surface-500">
          Gathering operational diagnostics...
        </div>
      ) : data ? (
        <div className="space-y-8">
          {/* Engine & Environment Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-surface-200 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-surface-500 uppercase tracking-wider">
                Overall System
              </span>
              <div className="flex items-center justify-between pt-1">
                <span className="text-lg font-extrabold text-surface-900">
                  {data.platform}
                </span>
                {renderStatusBadge(data.status)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-surface-200 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-surface-500 uppercase tracking-wider">
                Tax Engine Version
              </span>
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-bold font-mono text-surface-900">
                  v{data.taxEngine.version}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                  Deterministic
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-surface-200 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-surface-500 uppercase tracking-wider">
                Supported Tax Years
              </span>
              <div className="pt-1">
                <span className="text-sm font-bold text-surface-900">
                  {data.taxEngine.supportedTaxYears.join(", ")}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-surface-200 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-surface-500 uppercase tracking-wider">
                Runtime Environment
              </span>
              <div className="pt-1">
                <span className="text-sm font-bold font-mono text-surface-900">
                  {data.environment}
                </span>
              </div>
            </div>
          </div>

          {/* Subsystem & Dependency Cards */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider">
              Subsystem &amp; Dependency Health
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderDependencyCard(
                "Database / Storage Layer",
                data.dependencies.supabase,
                <Database className="w-4 h-4 text-blue-600" />
              )}
              {renderDependencyCard(
                "Gemini AI Tax Assistant",
                data.dependencies.gemini,
                <Sparkles className="w-4 h-4 text-purple-600" />
              )}
              {renderDependencyCard(
                "Transactional Email Provider",
                data.dependencies.email,
                <Mail className="w-4 h-4 text-emerald-600" />
              )}
              {renderDependencyCard(
                "Stripe Billing Gateway",
                data.dependencies.billing,
                <CreditCard className="w-4 h-4 text-amber-600" />
              )}
            </div>
          </div>

          {/* Performance & Metrics Snapshot */}
          <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-brand-600" />
              <span>Operational Metrics &amp; Latency</span>
            </h2>

            {Object.keys(data.metrics.counters).length === 0 &&
            Object.keys(data.metrics.timings).length === 0 ? (
              <p className="text-xs text-surface-500 py-4 text-center">
                No latency or counter samples recorded yet for this session.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(data.metrics.counters).map(([key, count]) => (
                  <div key={key} className="p-3 bg-surface-50 rounded-xl border border-surface-100">
                    <span className="text-[11px] font-mono text-surface-500 block truncate">
                      {key}
                    </span>
                    <span className="text-lg font-extrabold text-surface-900">{count}</span>
                  </div>
                ))}

                {Object.entries(data.metrics.timings).map(([key, stat]) => (
                  <div key={key} className="p-3 bg-surface-50 rounded-xl border border-surface-100">
                    <span className="text-[11px] font-mono text-surface-500 block truncate">
                      {key} (avg / max)
                    </span>
                    <div className="flex items-baseline gap-2 pt-0.5">
                      <span className="text-base font-bold text-surface-900">
                        {stat.avgMs}ms
                      </span>
                      <span className="text-xs text-surface-500">
                        (max {stat.maxMs}ms &bull; {stat.count} samples)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Sanitized Errors */}
          <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Recent System Diagnostics &amp; Warnings</span>
              </h2>
              <span className="text-xs text-surface-500 font-mono">
                {data.recentErrors.length} events buffered
              </span>
            </div>

            {data.recentErrors.length === 0 ? (
              <p className="text-xs text-surface-500 py-4 text-center">
                Zero operational errors or threshold warnings recorded.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-surface-200 text-surface-500 uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Time</th>
                      <th className="py-2.5 px-3">Level</th>
                      <th className="py-2.5 px-3">Module</th>
                      <th className="py-2.5 px-3">Event</th>
                      <th className="py-2.5 px-3">Request ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {data.recentErrors.slice(0, 15).map((err, idx) => (
                      <tr key={idx} className="hover:bg-surface-50">
                        <td className="py-2 px-3 text-surface-500 whitespace-nowrap">
                          {new Date(err.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              err.level === "error"
                                ? "bg-red-100 text-red-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {err.level}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-surface-600">
                          {err.module}
                        </td>
                        <td className="py-2 px-3 text-surface-900 font-medium">
                          {err.event}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-surface-400 truncate max-w-xs">
                          {err.requestId || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
