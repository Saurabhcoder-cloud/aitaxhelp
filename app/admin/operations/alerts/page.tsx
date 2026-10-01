"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Flame,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  Bell,
  Eye,
  Check,
} from "lucide-react";
import { getSessionToken } from "@/lib/utils/auth-client";
import { AlertRecord, AlertStatus } from "@/types/operations";

export default function AdminAlertsPage() {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getHeaders = () => {
    const token = getSessionToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/v1/admin/operations/alerts", { headers: getHeaders() });
      if (!res.ok) {
        throw new Error(
          res.status === 403
            ? "Access denied. Administrator privileges required."
            : "Failed to load alerts."
        );
      }
      const json = await res.json();
      if (json.success && json.data) {
        setAlerts(json.data);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error loading alerts.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleAcknowledge = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/admin/operations/alerts/${id}/acknowledge`, {
        method: "POST",
        headers: getHeaders(),
      });
      if (res.ok) fetchAlerts();
    } catch {
      // Ignore
    }
  };

  const handleResolve = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/admin/operations/alerts/${id}/resolve`, {
        method: "POST",
        headers: getHeaders(),
      });
      if (res.ok) fetchAlerts();
    } catch {
      // Ignore
    }
  };

  return (
    <div className="bg-surface-950 rounded-2xl p-6 sm:p-8 border border-surface-800 shadow-xl space-y-6 text-surface-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-surface-800 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Active Operational Alerts</h1>
              <p className="text-sm text-surface-400">
                Automated threshold monitoring for 5xx anomalies, rate limit spikes &amp; service errors.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAlerts}
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
          className="pb-3 text-sm font-semibold border-b-2 border-brand-500 text-brand-400"
        >
          Alerts ({alerts.length})
        </Link>
        <Link
          href="/admin/operations/performance"
          className="pb-3 text-sm font-medium border-b-2 border-transparent text-surface-400 hover:text-surface-200 transition"
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

      {/* Alerts Table */}
      <div className="overflow-x-auto rounded-xl border border-surface-800 bg-surface-900/60">
        <table className="min-w-full divide-y divide-surface-800 text-left text-xs">
          <thead className="bg-surface-800/60 text-surface-400 font-semibold uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Condition</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Occurrences</th>
              <th className="px-4 py-3">Triggered</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-800 text-surface-300">
            {alerts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-surface-500">
                  Zero active alerts. All monitoring thresholds within normal bounds.
                </td>
              </tr>
            ) : (
              alerts.map((alt) => (
                <tr key={alt.id} className="hover:bg-surface-800/30">
                  <td className="px-4 py-3 font-mono font-bold text-white">{alt.service}</td>
                  <td className="px-4 py-3 max-w-xs text-surface-200 font-mono text-[11px] truncate">
                    {alt.condition}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        alt.severity === "SEV1" || alt.severity === "SEV2"
                          ? "bg-red-950 text-red-400 border border-red-800"
                          : "bg-amber-950 text-amber-400 border border-amber-800"
                      }`}
                    >
                      {alt.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold">{alt.count}</td>
                  <td className="px-4 py-3 text-surface-400 font-mono text-[11px]">
                    {new Date(alt.triggeredAt).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-3 font-semibold text-xs">
                    {alt.status === "OPEN" ? (
                      <span className="text-amber-400">OPEN</span>
                    ) : alt.status === "ACKNOWLEDGED" ? (
                      <span className="text-blue-400">ACKNOWLEDGED</span>
                    ) : (
                      <span className="text-emerald-400">RESOLVED</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {alt.status === "OPEN" && (
                        <button
                          onClick={() => handleAcknowledge(alt.id)}
                          className="px-2 py-1 rounded bg-surface-800 hover:bg-surface-700 text-surface-300 hover:text-white border border-surface-700 text-[11px]"
                        >
                          Ack
                        </button>
                      )}
                      {alt.status !== "RESOLVED" && (
                        <button
                          onClick={() => handleResolve(alt.id)}
                          className="px-2 py-1 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-[11px]"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
