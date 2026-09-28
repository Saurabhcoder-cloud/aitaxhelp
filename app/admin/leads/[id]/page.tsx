"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  UserCheck,
  Mail,
  Phone,
  Calendar,
  Clock,
  ExternalLink,
  ShieldAlert,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
} from "lucide-react";
import { ProfessionalLeadRecord, ProfessionalLeadStatus } from "@/lib/services/professional-lead-store";

export default function AdminLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = use(Promise.resolve(params));
  const leadId = resolvedParams.id;
  const router = useRouter();

  const [lead, setLead] = useState<ProfessionalLeadRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [newStatus, setNewStatus] = useState<ProfessionalLeadStatus>("new");
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function loadLead() {
      try {
        setLoading(true);
        const res = await fetch(`/api/v1/admin/leads/${leadId}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error("Lead record not found.");
          throw new Error("Failed to load lead details.");
        }
        const json = await res.json();
        if (json.success && json.data) {
          setLead(json.data);
          setNewStatus(json.data.status);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error loading lead.");
      } finally {
        setLoading(false);
      }
    }

    loadLead();
  }, [leadId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/v1/admin/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          note: newNote.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update lead.");
      }

      setLead(json.data);
      setNewNote("");
      setFeedback({ type: "success", text: "Lead status & internal notes updated successfully." });
      router.refresh();
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Update failed.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
        <p className="text-sm font-medium text-surface-600">Loading lead details...</p>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/leads"
          className="inline-flex items-center gap-2 text-sm text-surface-600 hover:text-surface-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Leads</span>
        </Link>
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <h3 className="font-semibold text-base mb-1">Lead Not Found</h3>
          <p className="text-sm">{error || "The requested lead could not be located."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/admin/leads"
          className="inline-flex items-center gap-2 text-sm font-medium text-surface-600 hover:text-surface-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Leads</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-surface-500 bg-surface-200/60 px-2.5 py-1 rounded-md">
            ID: {lead.id}
          </span>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Lead Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Taxpayer Contact & Inquiry Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-2xs space-y-6">
            <div className="flex items-center justify-between border-b border-surface-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-surface-900 tracking-tight">
                  {lead.taxpayerName}
                </h2>
                <div className="text-xs text-surface-500 mt-0.5">
                  Inquiry submitted on {new Date(lead.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full uppercase bg-brand-50 text-brand-700 border border-brand-200">
                  {lead.status.replace(/_/g, " ")}
                </span>
              </div>
            </div>

            {/* Contact Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-3.5 bg-surface-50 rounded-xl border border-surface-100 space-y-1">
                <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Email</span>
                <div className="font-medium text-surface-900 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-surface-400" />
                  <a href={`mailto:${lead.email}`} className="text-brand-600 hover:underline">
                    {lead.email}
                  </a>
                </div>
              </div>

              <div className="p-3.5 bg-surface-50 rounded-xl border border-surface-100 space-y-1">
                <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Phone</span>
                <div className="font-medium text-surface-900 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-surface-400" />
                  <span>{lead.phone || "Not provided"}</span>
                </div>
              </div>

              <div className="p-3.5 bg-surface-50 rounded-xl border border-surface-100 space-y-1">
                <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Preferred Contact</span>
                <div className="font-medium text-surface-900 capitalize">
                  {lead.preferredContactMethod}
                </div>
              </div>

              <div className="p-3.5 bg-surface-50 rounded-xl border border-surface-100 space-y-1">
                <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Urgency / Timeline</span>
                <div className="font-medium text-surface-900 capitalize">
                  {lead.urgency.replace(/_/g, " ")}
                </div>
              </div>
            </div>

            {/* Tax Info & Linked Calculation */}
            <div className="p-4 bg-brand-50/50 rounded-xl border border-brand-100 space-y-2">
              <span className="text-xs font-bold text-brand-900 uppercase tracking-wider">
                Linked Tax Calculation Record
              </span>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                <div>
                  <div className="font-semibold text-surface-900">
                    Tax Year {lead.taxYear} &bull; <span className="capitalize">{lead.filingStatus.replace(/_/g, " ")}</span>
                  </div>
                  <div className="text-xs text-surface-500 font-mono mt-0.5">
                    ID: {lead.calculationId}
                  </div>
                </div>
                <Link
                  href={`/admin/calculations/${lead.calculationId}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors shrink-0"
                >
                  <span>Inspect Calculation</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Taxpayer Submitted Message */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
                Taxpayer Message / Note
              </span>
              <div className="p-4 rounded-xl bg-surface-50 border border-surface-200 text-sm text-surface-800 leading-relaxed whitespace-pre-wrap">
                {lead.message || "No custom message supplied by taxpayer."}
              </div>
            </div>
          </div>

          {/* Internal Notes History (Admin Only) */}
          <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-surface-100 pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600" />
                <h3 className="text-base font-bold text-surface-900">
                  Internal Administrative Notes
                </h3>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                Privileged — Admin Only
              </span>
            </div>

            <p className="text-xs text-surface-500">
              Internal notes are never returned by public APIs, never displayed to the taxpayer, and never sent to AI models.
            </p>

            {(!lead.internalNotes || lead.internalNotes.length === 0) ? (
              <div className="p-4 bg-surface-50 rounded-xl text-center text-xs text-surface-500">
                No internal notes recorded yet for this lead.
              </div>
            ) : (
              <div className="space-y-3">
                {lead.internalNotes.map((note) => (
                  <div key={note.id} className="p-3.5 rounded-xl bg-surface-50 border border-surface-200 space-y-1">
                    <div className="flex items-center justify-between text-xs text-surface-500">
                      <span className="font-mono font-medium text-surface-700">Admin: {note.adminUserId}</span>
                      <span>{new Date(note.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="text-sm text-surface-800 whitespace-pre-wrap">{note.note}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Update Status & Add Internal Note Form */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-2xs space-y-5">
            <h3 className="text-base font-bold text-surface-900 border-b border-surface-100 pb-3 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              <span>Update Workflow</span>
            </h3>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-surface-700 uppercase tracking-wider block">
                  Lead Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as ProfessionalLeadStatus)}
                  className="w-full px-3 py-2 text-sm bg-surface-50 border border-surface-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium text-surface-900"
                >
                  <option value="new">New (Awaiting Action)</option>
                  <option value="contacted">Contacted</option>
                  <option value="in_progress">In Progress (Active Review)</option>
                  <option value="closed">Closed (Finished)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-surface-700 uppercase tracking-wider block">
                  Add Internal Note
                </label>
                <textarea
                  rows={4}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Record call logs, CPA assignment details, or internal follow-ups (max 2,000 chars)..."
                  maxLength={2000}
                  className="w-full p-3 text-sm bg-surface-50 border border-surface-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none text-surface-900"
                />
                <div className="text-right text-xs text-surface-400">
                  {newNote.length}/2000
                </div>
              </div>

              <button
                type="submit"
                disabled={saving || (newStatus === lead.status && newNote.trim().length === 0)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Updates...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Save Lead Updates</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Operational Metadata */}
          <div className="bg-surface-50 rounded-2xl border border-surface-200 p-5 space-y-2.5 text-xs text-surface-600">
            <div className="font-semibold text-surface-900 uppercase tracking-wider">Audit Metadata</div>
            <div className="flex justify-between">
              <span>Lead ID:</span>
              <span className="font-mono text-surface-800">{lead.id}</span>
            </div>
            <div className="flex justify-between">
              <span>User ID:</span>
              <span className="font-mono text-surface-800">{lead.userId}</span>
            </div>
            <div className="flex justify-between">
              <span>Created:</span>
              <span>{new Date(lead.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Last Updated:</span>
              <span>{new Date(lead.updatedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
