"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Radio,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  RefreshCw,
  Server,
  Database,
  Calculator,
  Sparkles,
  CreditCard,
  Mail,
  HardDrive,
  Sliders,
  ShieldCheck,
  Activity,
  Flame,
  Clock,
  ArrowRight,
} from "lucide-react";
import { getSessionToken } from "@/lib/utils/auth-client";
import { OperationsSummaryReport, OperationalStatus } from "@/types/operations";

export default function AdminOperationsPage() {
  const [data, setData] = useState<OperationsSummaryReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getHeaders = () => {
    const token = getSessionToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  const fetchOperations = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/v1/admin/operations", { headers: getHeaders() });
      if (!res.ok) {
        throw new Error(
          res.status === 403
            ? "Access denied. Administrator privileges required."
            : "Failed to load operations summary."
        );
      }
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error loading operations status.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOperations();
  }, [fetchOperations]);

  const renderStatusBadge = (status: OperationalStatus) => {
    switch (status) {
      case "HEALTHY":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            HEALTHY
          </span>
        );
      case "DEGRADED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            DEGRADED
          </span>
        );
      case "PARTIAL_OUTAGE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
            PARTIAL OUTAGE
          </span>
        );
      case "MAJOR_OUTAGE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
            <AlertOctagon className="w-3.5 h-3.5 text-red-600" />
            MAJOR OUTAGE
          </span>
        );
      case "MAINTENANCE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
            <Sliders className="w-3.5 h-3.5 text-blue-600" />
            MAINTENANCE
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-surface-700 text-surface-400">
            NO DATA
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
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Production Operations Control</h1>
              <p className="text-sm text-surface-400">
                Service availability, incident response center, active alerts &amp; system telemetry.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchOperations}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-surface-800 hover:bg-surface-700 text-surface-200 border border-surface-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Sub-Navigation */}
      <div className="flex border-b border-surface-800 space-x-6">
        <Link
          href="/admin/operations"
          className="pb-3 text-sm font-semibold border-b-2 border-brand-500 text-brand-400"
        >
          Overview
        </Link>
        <Link
          href="/admin/operations/incidents"
          className="pb-3 text-sm font-medium border-b-2 border-transparent text-surface-400 hover:text-surface-200 transition"
        >
          Incidents {data && data.openIncidentsCount > 0 && `(${data.openIncidentsCount})`}
        </Link>
        <Link
          href="/admin/operations/alerts"
          className="pb-3 text-sm font-medium border-b-2 border-transparent text-surface-400 hover:text-surface-200 transition"
        >
          Alerts {data && data.activeAlertsCount > 0 && `(${data.activeAlertsCount})`}
        </Link>
        <Link
          href="/admin/operations/performance"
          className="pb-3 text-sm font-medium border-b-2 border-transparent text-surface-400 hover:text-surface-200 transition"
        >
          Performance Telemetry
        </Link>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="p-4 rounded-lg bg-red-900/30 border border-red-700/50 text-red-200 flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">{errorMessage}</div>
        </div>
      )}

      {data && (
        <>
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Overall Status */}
            <div className="p-5 rounded-xl bg-surface-900/80 border border-surface-800 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-surface-400">
                System Status
              </span>
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-white">
                  {data.overallStatus.replace(/_/g, " ")}
                </span>
                {renderStatusBadge(data.overallStatus)}
              </div>
              <p className="text-xs text-surface-500">
                {data.maintenanceMode ? "Platform maintenance active." : "18 services monitored."}
              </p>
            </div>

            {/* Open Incidents */}
            <div className="p-5 rounded-xl bg-surface-900/80 border border-surface-800 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-surface-400">
                Open Incidents
              </span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-white">{data.openIncidentsCount}</span>
                {data.sev1Count > 0 ? (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-950 text-red-400 border border-red-800">
                    {data.sev1Count} SEV1
                  </span>
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                )}
              </div>
              <Link
                href="/admin/operations/incidents"
                className="text-xs text-brand-400 hover:text-brand-300 inline-flex items-center gap-1 font-medium"
              >
                View Incident Register <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Active Alerts */}
            <div className="p-5 rounded-xl bg-surface-900/80 border border-surface-800 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-surface-400">
                Active Alerts
              </span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-white">{data.activeAlertsCount}</span>
                <Flame className={`w-5 h-5 ${data.activeAlertsCount > 0 ? "text-amber-500" : "text-surface-500"}`} />
              </div>
              <Link
                href="/admin/operations/alerts"
                className="text-xs text-brand-400 hover:text-brand-300 inline-flex items-center gap-1 font-medium"
              >
                Manage Threshold Alerts <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Deterministic Tax Engine */}
            <div className="p-5 rounded-xl bg-surface-900/80 border border-surface-800 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-surface-400">
                Deterministic Tax Engine
              </span>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">Authority Engine</span>
                {renderStatusBadge(data.taxEngineStatus)}
              </div>
              <p className="text-xs text-surface-500">100% statutory precision. Independent of LLM.</p>
            </div>
          </div>

          {/* Subsystem Health Cards */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-white">Monitored Service Health</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.services.map((svc) => (
                <div
                  key={svc.serviceId}
                  className="p-5 rounded-xl bg-surface-900/80 border border-surface-800 space-y-2 hover:border-surface-700 transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{svc.name}</h3>
                      <span className="text-[10px] text-surface-500 uppercase tracking-wider font-mono">
                        {svc.criticality}
                      </span>
                    </div>
                    {renderStatusBadge(svc.status)}
                  </div>
                  <p className="text-xs text-surface-400">{svc.message}</p>
                  {svc.dependencies.length > 0 && (
                    <div className="pt-2 border-t border-surface-800/60 text-[10px] text-surface-500">
                      Dependencies: {svc.dependencies.map((d) => d.id).join(", ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
