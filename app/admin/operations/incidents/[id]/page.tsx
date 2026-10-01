"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Flame,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  User,
  Shield,
  FileText,
  Send,
  RefreshCw,
} from "lucide-react";
import { getSessionToken } from "@/lib/utils/auth-client";
import { IncidentRecord, IncidentStatus, IncidentSeverity } from "@/types/operations";

export default function AdminIncidentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [incident, setIncident] = useState<IncidentRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [eventNote, setEventNote] = useState<string>("");
  const [isSubmittingEvent, setIsSubmittingEvent] = useState<boolean>(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  const getHeaders = () => {
    const token = getSessionToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  const fetchIncident = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/v1/admin/operations/incidents/${params.id}`, {
        headers: getHeaders(),
      });
      if (!res.ok) {
        throw new Error(
          res.status === 403
            ? "Access denied. Administrator privileges required."
            : "Failed to load incident detail."
        );
      }
      const json = await res.json();
      if (json.success && json.data) {
        setIncident(json.data);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error loading incident.");
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchIncident();
  }, [fetchIncident]);

  const handleStatusTransition = async (newStatus: IncidentStatus) => {
    setIsUpdatingStatus(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/v1/admin/operations/incidents/${params.id}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update status.");
      }
      setIncident(json.data);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error transitioning status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddTimelineEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventNote.trim()) return;

    setIsSubmittingEvent(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/v1/admin/operations/incidents/${params.id}/events`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ eventType: "update", note: eventNote }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to append event.");
      }
      setEventNote("");
      fetchIncident();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error appending event.");
    } finally {
      setIsSubmittingEvent(false);
    }
  };

  return (
    <div className="bg-surface-950 rounded-2xl p-6 sm:p-8 border border-surface-800 shadow-xl space-y-6 text-surface-100">
      {/* Back button */}
      <div>
        <Link
          href="/admin/operations/incidents"
          className="inline-flex items-center gap-1.5 text-xs text-surface-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Incident Register
        </Link>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-lg bg-red-900/30 border border-red-700/50 text-red-200 flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">{errorMessage}</div>
        </div>
      )}

      {incident && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="p-6 rounded-xl bg-surface-900 border border-surface-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-mono font-bold text-brand-400 block mb-1">
                  {incident.incidentNumber}
                </span>
                <h1 className="text-xl font-bold text-white tracking-tight">{incident.title}</h1>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider bg-surface-800 text-surface-300 border border-surface-700">
                  {incident.service}
                </span>
                <span
                  className={`px-2.5 py-1 rounded text-xs font-bold ${
                    incident.severity === "SEV1"
                      ? "bg-red-950 text-red-400 border border-red-800"
                      : incident.severity === "SEV2"
                      ? "bg-orange-950 text-orange-400 border border-orange-800"
                      : "bg-surface-800 text-surface-300"
                  }`}
                >
                  {incident.severity}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-brand-950 text-brand-300 border border-brand-800">
                  {incident.status}
                </span>
              </div>
            </div>

            {/* Lifecycle Transition Buttons */}
            <div className="pt-4 border-t border-surface-800/80 flex flex-wrap items-center gap-2">
              <span className="text-xs text-surface-400 font-medium mr-2">Lifecycle Actions:</span>
              {[
                "INVESTIGATING",
                "IDENTIFIED",
                "MITIGATING",
                "MONITORING",
                "RESOLVED",
                "CLOSED",
              ].map((st) => (
                <button
                  key={st}
                  onClick={() => handleStatusTransition(st as IncidentStatus)}
                  disabled={isUpdatingStatus || incident.status === st}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    incident.status === st
                      ? "bg-brand-600 text-white font-bold opacity-50 cursor-not-allowed"
                      : "bg-surface-800 hover:bg-surface-700 text-surface-300 border border-surface-700"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Symptoms & Impact */}
            <div className="p-5 rounded-xl bg-surface-900 border border-surface-800 space-y-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-400" />
                Symptoms &amp; Summary
              </h2>
              <p className="text-xs text-surface-300 leading-relaxed">{incident.summary}</p>

              {incident.customerImpact && (
                <div className="pt-3 border-t border-surface-800 text-xs">
                  <span className="font-semibold text-surface-400 block mb-1">Customer Impact:</span>
                  <p className="text-surface-300">{incident.customerImpact}</p>
                </div>
              )}
            </div>

            {/* Metadata & Assignment */}
            <div className="p-5 rounded-xl bg-surface-900 border border-surface-800 space-y-3 text-xs">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-brand-400" />
                Incident Attribution
              </h2>
              <div className="space-y-1.5 text-surface-400">
                <div>
                  Detected: <strong className="text-surface-200">{new Date(incident.detectedAt).toLocaleString()}</strong>
                </div>
                {incident.resolvedAt && (
                  <div>
                    Resolved: <strong className="text-emerald-400">{new Date(incident.resolvedAt).toLocaleString()}</strong>
                  </div>
                )}
                <div>
                  Created By: <strong className="text-surface-200">{incident.createdBy}</strong>
                </div>
                <div>
                  Assigned: <strong className="text-surface-200">{incident.assignedTo || "Unassigned"}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Event Timeline */}
          <div className="p-6 rounded-xl bg-surface-900 border border-surface-800 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-400" />
              Incident Event Timeline
            </h2>

            <div className="space-y-3">
              {incident.events?.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3.5 rounded-lg bg-surface-800/40 border border-surface-700/50 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between text-[11px] text-surface-400">
                    <span className="font-semibold text-surface-200 uppercase tracking-wider">
                      {ev.eventType} • by {ev.actor}
                    </span>
                    <span className="font-mono">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-surface-300">{ev.note}</p>
                </div>
              ))}
            </div>

            {/* Add note form */}
            <form onSubmit={handleAddTimelineEvent} className="pt-4 border-t border-surface-800 flex gap-2">
              <input
                type="text"
                required
                placeholder="Post a diagnostic update or operational note to the timeline..."
                value={eventNote}
                onChange={(e) => setEventNote(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-xs text-white focus:outline-none focus:border-brand-500"
              />
              <button
                type="submit"
                disabled={isSubmittingEvent}
                className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs inline-flex items-center gap-1.5 transition"
              >
                <Send className="w-3.5 h-3.5" />
                {isSubmittingEvent ? "Posting..." : "Post Note"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
