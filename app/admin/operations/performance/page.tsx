"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  AlertOctagon,
  RefreshCw,
  Cpu,
  Clock,
  Sparkles,
  CreditCard,
  Mail,
  LifeBuoy,
} from "lucide-react";
import { getSessionToken } from "@/lib/utils/auth-client";

export default function AdminPerformancePage() {
  const [perfData, setPerfData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getHeaders = () => {
    const token = getSessionToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  const fetchPerformance = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/v1/admin/operations/performance", { headers: getHeaders() });
      if (!res.ok) {
        throw new Error(
          res.status === 403
            ? "Access denied. Administrator privileges required."
            : "Failed to load performance metrics."
        );
      }
      const json = await res.json();
      if (json.success && json.data) {
        setPerfData(json.data);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error loading performance telemetry.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  return (
    <div className="bg-surface-950 rounded-2xl p-6 sm:p-8 border border-surface-800 shadow-xl space-y-6 text-surface-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-surface-800 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">API &amp; Subsystem Performance Telemetry</h1>
              <p className="text-sm text-surface-400">
                Empirical latency timings, execution counters, and error rates across platform engines.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchPerformance}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-surface-800 hover:bg-surface-700 text-surface-200 border border-surface-700 transition"
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
          className="pb-3 text-sm font-medium border-b-2 border-transparent text-surface-400 hover:text-surface-200 transition"
        >
          Overview
        </Link>
        <Link
          href="/admin/operations/incidents"
          className="pb-3 text-sm font-medium border-b-2 border-transparent text-surface-400 hover:text-surface-200 transition"
        >
          Incidents
        </Link>
        <Link
          href="/admin/operations/alerts"
          className="pb-3 text-sm font-medium border-b-2 border-transparent text-surface-400 hover:text-surface-200 transition"
        >
          Alerts
        </Link>
        <Link
          href="/admin/operations/performance"
          className="pb-3 text-sm font-semibold border-b-2 border-brand-500 text-brand-400"
        >
          Performance Telemetry
        </Link>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-lg bg-red-900/30 border border-red-700/50 text-red-200 flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">{errorMessage}</div>
        </div>
      )}

      {perfData && (
        <div className="space-y-6">
          {/* Subsystem Telemetry Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Deterministic Tax Engine */}
            <div className="p-5 rounded-xl bg-surface-900 border border-surface-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-surface-400">
                <span className="font-semibold uppercase tracking-wider">Tax Engine</span>
                <Cpu className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white">
                {perfData.taxEngine.averageDurationMs} ms
              </div>
              <div className="text-xs text-surface-400 space-y-1">
                <div>Calculations: {perfData.taxEngine.totalCalculationsRun}</div>
                <div>Statutory Errors: {perfData.taxEngine.totalErrors}</div>
              </div>
            </div>

            {/* AI Assistant */}
            <div className="p-5 rounded-xl bg-surface-900 border border-surface-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-surface-400">
                <span className="font-semibold uppercase tracking-wider">AI Assistant</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-white">
                {perfData.ai.averageLatencyMs > 0 ? `${perfData.ai.averageLatencyMs} ms` : "NO DATA"}
              </div>
              <div className="text-xs text-surface-400 space-y-1">
                <div>Queries: {perfData.ai.totalRequests}</div>
                <div>Timeouts / Limits: {perfData.ai.timedOutRequests + perfData.ai.rateLimitedRequests}</div>
              </div>
            </div>

            {/* Billing Events */}
            <div className="p-5 rounded-xl bg-surface-900 border border-surface-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-surface-400">
                <span className="font-semibold uppercase tracking-wider">Stripe Billing</span>
                <CreditCard className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-bold text-white">
                {perfData.billing.totalWebhookEvents} events
              </div>
              <div className="text-xs text-surface-400 space-y-1">
                <div>Webhook Failures: {perfData.billing.failedWebhookEvents}</div>
                <div>Duplicates Ignored: {perfData.billing.duplicateWebhookEvents}</div>
              </div>
            </div>

            {/* Email Dispatch */}
            <div className="p-5 rounded-xl bg-surface-900 border border-surface-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-surface-400">
                <span className="font-semibold uppercase tracking-wider">Email Delivery</span>
                <Mail className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-bold text-white">
                {perfData.email.totalAttempts} sent
              </div>
              <div className="text-xs text-surface-400 space-y-1">
                <div>Failures: {perfData.email.failedSends}</div>
                <div>Provider: {perfData.email.provider}</div>
              </div>
            </div>
          </div>

          {/* Timing Distributions */}
          <div className="p-5 rounded-xl bg-surface-900 border border-surface-800 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-400" />
              Measured Latency Distributions
            </h2>
            <div className="overflow-x-auto rounded-lg border border-surface-800">
              <table className="min-w-full divide-y divide-surface-800 text-left text-xs">
                <thead className="bg-surface-800/60 text-surface-400 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-2.5">Endpoint / Operation</th>
                    <th className="px-4 py-2.5">Sample Count</th>
                    <th className="px-4 py-2.5">Average Latency</th>
                    <th className="px-4 py-2.5">Max Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800 text-surface-300">
                  {Object.entries(perfData.metrics.timings).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-surface-500">
                        Zero request samples in active timing window.
                      </td>
                    </tr>
                  ) : (
                    Object.entries(perfData.metrics.timings).map(([key, stat]: [string, any]) => (
                      <tr key={key} className="hover:bg-surface-800/30">
                        <td className="px-4 py-2.5 font-mono text-white">{key}</td>
                        <td className="px-4 py-2.5 font-mono">{stat.count}</td>
                        <td className="px-4 py-2.5 font-mono">{stat.avgMs} ms</td>
                        <td className="px-4 py-2.5 font-mono">{stat.maxMs} ms</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
