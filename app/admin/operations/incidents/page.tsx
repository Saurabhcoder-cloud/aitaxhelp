"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Flame,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Plus,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  Shield,
} from "lucide-react";
import { getSessionToken } from "@/lib/utils/auth-client";
import { IncidentRecord, IncidentSeverity, IncidentStatus, ServiceId, SERVICE_IDS } from "@/types/operations";

export default function AdminIncidentsPage() {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New incident modal state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>("");
  const [newSeverity, setNewSeverity] = useState<IncidentSeverity>("SEV2");
  const [newService, setNewService] = useState<ServiceId>("TAX_ENGINE");
  const [newSummary, setNewSummary] = useState<string>("");
  const [newCustomerImpact, setNewCustomerImpact] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const getHeaders = () => {
    const token = getSessionToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  const fetchIncidents = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const url =
        statusFilter === "ALL"
          ? "/api/v1/admin/operations/incidents"
          : `/api/v1/admin/operations/incidents?status=${statusFilter}`;
      const res = await fetch(url, { headers: getHeaders() });
      if (!res.ok) {
        throw new Error(
          res.status === 403
            ? "Access denied. Administrator privileges required."
            : "Failed to load incidents."
        );
      }
      const json = await res.json();
      if (json.success && json.data) {
        setIncidents(json.data);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error loading incidents.");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/v1/admin/operations/incidents", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          title: newTitle,
          severity: newSeverity,
          service: newService,
          summary: newSummary,
          customerImpact: newCustomerImpact,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to create incident.");
      }

      setShowCreateModal(false);
      setNewTitle("");
      setNewSummary("");
      setNewCustomerImpact("");
      fetchIncidents();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error creating incident.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSeverityBadge = (severity: IncidentSeverity) => {
    switch (severity) {
      case "SEV1":
        return (
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-950 text-red-300 border border-red-800">
            SEV1 - Critical
          </span>
        );
      case "SEV2":
        return (
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-orange-950 text-orange-300 border border-orange-800">
            SEV2 - High
          </span>
        );
      case "SEV3":
        return (
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-950 text-amber-300 border border-amber-800">
            SEV3 - Medium
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-surface-800 text-surface-300">
            SEV4 - Low
          </span>
        );
    }
  };

  const renderStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case "RESOLVED":
      case "CLOSED":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
            {status}
          </span>
        );
      case "MITIGATING":
      case "MONITORING":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-950 text-blue-300 border border-blue-800">
            {status}
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-950 text-red-300 border border-red-800">
            {status}
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
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Incident Management Register</h1>
              <p className="text-sm text-surface-400">
                Track, triage, and resolve production operational incidents across platform services.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Declare Incident
          </button>
          <button
            onClick={fetchIncidents}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-surface-800 hover:bg-surface-700 text-surface-200 border border-surface-700 transition"
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
          className="pb-3 text-sm font-semibold border-b-2 border-brand-500 text-brand-400"
        >
          Incidents ({incidents.length})
        </Link>
        <Link
          href="/admin/operations/alerts"
          className="pb-3 text-sm font-medium border-b-2 border-transparent text-surface-400 hover:text-surface-200 transition"
        >
          Alerts
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

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2 text-xs">
        {["ALL", "DETECTED", "INVESTIGATING", "IDENTIFIED", "MITIGATING", "MONITORING", "RESOLVED", "CLOSED"].map(
          (status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                statusFilter === status
                  ? "bg-brand-600 text-white font-semibold"
                  : "bg-surface-800 text-surface-400 hover:text-surface-200 hover:bg-surface-700"
              }`}
            >
              {status}
            </button>
          )
        )}
      </div>

      {/* Incidents Table */}
      <div className="overflow-x-auto rounded-xl border border-surface-800 bg-surface-900/60">
        <table className="min-w-full divide-y divide-surface-800 text-left text-xs">
          <thead className="bg-surface-800/60 text-surface-400 font-semibold uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Incident Number</th>
              <th className="px-4 py-3">Title &amp; Summary</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Detected</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-800 text-surface-300">
            {incidents.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-surface-500">
                  No incidents matching the current filter.
                </td>
              </tr>
            ) : (
              incidents.map((inc) => (
                <tr key={inc.id} className="hover:bg-surface-800/30">
                  <td className="px-4 py-3 font-mono font-bold text-brand-400">
                    {inc.incidentNumber}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <div className="font-semibold text-white truncate">{inc.title}</div>
                    <div className="text-[11px] text-surface-400 truncate">{inc.summary}</div>
                  </td>
                  <td className="px-4 py-3">{renderSeverityBadge(inc.severity)}</td>
                  <td className="px-4 py-3 font-mono text-[11px]">{inc.service}</td>
                  <td className="px-4 py-3">{renderStatusBadge(inc.status)}</td>
                  <td className="px-4 py-3 text-surface-400 font-mono text-[11px]">
                    {new Date(inc.detectedAt).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/operations/incidents/${inc.id}`}
                      className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 font-medium"
                    >
                      Detail <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Declare Incident Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-surface-900 border border-surface-700 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-surface-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-red-500" />
                Declare New Operational Incident
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-surface-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateIncident} className="space-y-4 text-xs">
              <div>
                <label className="block text-surface-300 font-medium mb-1">Incident Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gemini AI Service Latency Degradation"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-surface-300 font-medium mb-1">Severity</label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as IncidentSeverity)}
                    className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="SEV1">SEV1 - Critical Outage</option>
                    <option value="SEV2">SEV2 - Major Impairment</option>
                    <option value="SEV3">SEV3 - Moderate Issue</option>
                    <option value="SEV4">SEV4 - Minor Defect</option>
                  </select>
                </div>

                <div>
                  <label className="block text-surface-300 font-medium mb-1">Affected Service</label>
                  <select
                    value={newService}
                    onChange={(e) => setNewService(e.target.value as ServiceId)}
                    className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
                  >
                    {SERVICE_IDS.map((sid) => (
                      <option key={sid} value={sid}>
                        {sid}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-surface-300 font-medium mb-1">Summary of Symptoms</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe observed symptoms, error codes, and correlation request IDs..."
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-surface-300 font-medium mb-1">Customer Impact</label>
                <input
                  type="text"
                  placeholder="e.g. AI guidance unavailable; calculators remain 100% operational"
                  value={newCustomerImpact}
                  onChange={(e) => setNewCustomerImpact(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-surface-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold"
                >
                  {isSubmitting ? "Declaring..." : "Declare Incident"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
