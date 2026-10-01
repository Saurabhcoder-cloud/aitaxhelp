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
  FileText,
  Download,
  AlertTriangle,
  FolderCheck,
  DollarSign,
  UserPlus,
} from "lucide-react";
import { ProfessionalLeadRecord, ProfessionalLeadStatus } from "@/lib/services/professional-lead-store";
import { formatCurrencyFromCents } from "@/lib/utils/currency";

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
  const [assignedId, setAssignedId] = useState("");
  const [assignedName, setAssignedName] = useState("");
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
          const data: ProfessionalLeadRecord = json.data;
          setLead(data);
          setNewStatus(data.status);
          setAssignedId(data.assignedProfessionalId || "");
          setAssignedName(data.assignedProfessionalName || "");
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
          assignedProfessionalId: assignedId.trim() || undefined,
          assignedProfessionalName: assignedName.trim() || undefined,
          note: newNote.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update lead.");
      }

      setLead(json.data);
      setNewNote("");
      setFeedback({ type: "success", text: "Lead status, assignment, and internal notes updated successfully." });
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

  const snap = lead.sessionSnapshot;

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
          {lead.reviewType && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md uppercase bg-purple-100 text-purple-800 border border-purple-200">
              {lead.reviewType === "cpa"
                ? "CPA Review"
                : lead.reviewType === "enrolled_agent"
                ? "Enrolled Agent (EA)"
                : "Tax Professional"}
            </span>
          )}
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

            {/* Tax Info & Linked Records */}
            <div className="p-4 bg-brand-50/50 rounded-xl border border-brand-100 space-y-3">
              <span className="text-xs font-bold text-brand-900 uppercase tracking-wider block">
                Linked Tax Records
              </span>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                <div>
                  <div className="font-semibold text-surface-900">
                    Tax Year {lead.taxYear} &bull; <span className="capitalize">{lead.filingStatus.replace(/_/g, " ")}</span>
                  </div>
                  <div className="text-xs text-surface-500 font-mono mt-0.5 space-y-0.5">
                    {lead.calculationId && <div>Calculation ID: {lead.calculationId}</div>}
                    {lead.sessionId && <div>Session ID: {lead.sessionId}</div>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {lead.calculationId && (
                    <Link
                      href={`/admin/calculations/${lead.calculationId}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors shrink-0"
                    >
                      <span>Calculation</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  )}
                  {lead.sessionId && (
                    <a
                      href="/api/v1/tax/preparation/session/report?download=true"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-100 hover:bg-surface-200 text-surface-800 text-xs font-semibold rounded-lg border border-surface-300 transition-colors shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Report</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Session Snapshot: Professional Review Context */}
            {snap && (
              <div className="bg-surface-50/60 rounded-xl border border-surface-200 p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-surface-200 pb-2">
                  <div className="flex items-center gap-2">
                    <FolderCheck className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold text-surface-900 uppercase tracking-wider">
                      Tax Preparation Intake Snapshot
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-surface-500">
                    Session: {snap.sessionId}
                  </span>
                </div>

                {/* Calculation Summary from Snapshot */}
                {snap.calculationResult && (
                  <div className="p-3 bg-white rounded-lg border border-surface-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-surface-500 text-[10px] uppercase font-semibold">Total Income</span>
                      <p className="font-bold text-surface-900">
                        {snap.calculationResult.totalIncomeCents !== undefined
                          ? formatCurrencyFromCents(snap.calculationResult.totalIncomeCents)
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-surface-500 text-[10px] uppercase font-semibold">Taxable Income</span>
                      <p className="font-bold text-surface-900">
                        {formatCurrencyFromCents(snap.calculationResult.taxableIncomeCents)}
                      </p>
                    </div>
                    <div>
                      <span className="text-surface-500 text-[10px] uppercase font-semibold">Total Liability</span>
                      <p className="font-bold text-surface-900">
                        {formatCurrencyFromCents(snap.calculationResult.totalTaxLiabilityCents)}
                      </p>
                    </div>
                    <div>
                      <span className="text-surface-500 text-[10px] uppercase font-semibold">
                        {snap.calculationResult.refundOrBalanceDue?.type === "refund" ? "Est. Refund" : "Balance Due"}
                      </span>
                      <p className={`font-extrabold ${snap.calculationResult.refundOrBalanceDue?.type === "refund" ? "text-emerald-700" : "text-amber-700"}`}>
                        {formatCurrencyFromCents(snap.calculationResult.refundOrBalanceDue?.amountCents || 0)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Income Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-lg border border-surface-200 space-y-1">
                    <span className="text-surface-500 font-semibold uppercase text-[10px]">W-2 Income</span>
                    <p className="font-bold text-surface-900">{snap.w2Count} Form(s)</p>
                    <p className="text-[11px] text-surface-600">
                      Wages: {formatCurrencyFromCents(snap.totalW2WagesCents)}
                    </p>
                    <p className="text-[11px] text-surface-500">
                      Withholding: {formatCurrencyFromCents(snap.totalW2WithholdingCents)}
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-surface-200 space-y-1">
                    <span className="text-surface-500 font-semibold uppercase text-[10px]">1099 Income</span>
                    <p className="font-bold text-surface-900">{snap.form1099Count} Form(s)</p>
                    <p className="text-[11px] text-surface-600">
                      Gross: {formatCurrencyFromCents(snap.total1099GrossCents)}
                    </p>
                    <p className="text-[11px] text-surface-500">
                      Withholding: {formatCurrencyFromCents(snap.total1099WithholdingCents)}
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-surface-200 space-y-1">
                    <span className="text-surface-500 font-semibold uppercase text-[10px]">Gig / Business</span>
                    <p className="font-bold text-surface-900">{snap.gigCount} Platform(s)</p>
                    <p className="text-[11px] text-surface-600">
                      Gross: {formatCurrencyFromCents(snap.gigGrossCents)}
                    </p>
                    <p className="text-[11px] text-surface-500">
                      Expenses: {formatCurrencyFromCents(snap.gigExpenseCents)}
                    </p>
                  </div>
                </div>

                {/* Deductions & Documents */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-lg border border-surface-200 space-y-1">
                    <span className="text-surface-500 font-semibold uppercase text-[10px]">Deductions</span>
                    <p className="font-bold text-surface-900 capitalize">
                      {snap.deductionsType} deduction
                    </p>
                    {snap.deductionsType === "itemized" && (
                      <p className="text-surface-600">
                        Itemized Total:{" "}
                        {snap.itemizedTotalCents !== undefined
                          ? formatCurrencyFromCents(snap.itemizedTotalCents)
                          : "—"}
                      </p>
                    )}
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-surface-200 space-y-1">
                    <span className="text-surface-500 font-semibold uppercase text-[10px]">Documents Checklist</span>
                    <p className="font-bold text-surface-900">
                      {snap.uploadedDocumentsCount} document(s) uploaded
                    </p>
                    {snap.missingDocumentTypes && snap.missingDocumentTypes.length > 0 && (
                      <p className="text-[11px] text-amber-700">
                        Missing: {snap.missingDocumentTypes.join(", ")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Warnings */}
                {snap.warnings && snap.warnings.length > 0 && (
                  <div className="space-y-1 text-xs">
                    <span className="font-semibold text-amber-800 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      Notices & Limitations:
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-surface-600 text-[11px]">
                      {snap.warnings.map((w: string, idx: number) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

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

        {/* Right: Update Status, Assignment & Add Internal Note Form */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-2xs space-y-5">
            <h3 className="text-base font-bold text-surface-900 border-b border-surface-100 pb-3 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              <span>Lead Workflow & Assignment</span>
            </h3>

            <form onSubmit={handleUpdate} className="space-y-4">
              {/* Status Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-surface-700 uppercase tracking-wider block">
                  Lead Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as ProfessionalLeadStatus)}
                  className="w-full px-3 py-2 text-sm bg-surface-50 border border-surface-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium text-surface-900"
                >
                  <option value="requested">Requested (New Review Request)</option>
                  <option value="received">Received (Triaged by Operations)</option>
                  <option value="assigned">Assigned (Assigned to CPA/EA)</option>
                  <option value="contacted">Contacted (Outreach Made)</option>
                  <option value="in_progress">In Progress (Active Review)</option>
                  <option value="completed">Completed (Review Finished)</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="new">New (Legacy)</option>
                  <option value="closed">Closed (Legacy)</option>
                </select>
              </div>

              {/* Professional Assignment Fields */}
              <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-100 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-950 uppercase tracking-wider">
                  <UserPlus className="w-4 h-4 text-purple-600" />
                  <span>Assign Professional</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-surface-700 block">
                    Professional Full Name
                  </label>
                  <input
                    type="text"
                    value={assignedName}
                    onChange={(e) => setAssignedName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins, CPA"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-surface-200 rounded-lg text-surface-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-surface-700 block">
                    Professional ID / License
                  </label>
                  <input
                    type="text"
                    value={assignedId}
                    onChange={(e) => setAssignedId(e.target.value)}
                    placeholder="e.g. PRO-CPA-4029"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-surface-200 rounded-lg text-surface-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              {/* Add Internal Note */}
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
                disabled={saving}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
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
            {lead.reviewType && (
              <div className="flex justify-between">
                <span>Review Type:</span>
                <span className="font-semibold text-surface-800 uppercase">{lead.reviewType}</span>
              </div>
            )}
            {lead.assignedProfessionalName && (
              <div className="flex justify-between">
                <span>Assigned Pro:</span>
                <span className="font-semibold text-emerald-800">{lead.assignedProfessionalName}</span>
              </div>
            )}
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
