"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import {
  LifeBuoy,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Send,
  Lock,
  User,
  Shield,
  Calculator,
  RefreshCw,
  FileText,
  UserCheck,
  Tag,
  Activity,
} from "lucide-react";
import {
  SupportTicketWithMessages,
  SupportStatus,
  SupportPriority,
} from "@/types/support";
import { getSessionToken } from "@/lib/utils/auth-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AdminSupportDetailPage({ params }: PageProps) {
  const { id } = use(params);

  const [ticket, setTicket] = useState<SupportTicketWithMessages | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reply Composer
  const [replyText, setReplyText] = useState<string>("");
  const [isSendingReply, setIsSendingReply] = useState<boolean>(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  // Internal Note Composer
  const [internalNoteText, setInternalNoteText] = useState<string>("");
  const [isAddingNote, setIsAddingNote] = useState<boolean>(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  // Status, Priority, Assignment Selectors
  const [selectedStatus, setSelectedStatus] = useState<SupportStatus>("OPEN");
  const [selectedPriority, setSelectedPriority] = useState<SupportPriority>("NORMAL");
  const [assignedAdminId, setAssignedAdminId] = useState<string>("");
  const [isUpdatingMeta, setIsUpdatingMeta] = useState<boolean>(false);

  const fetchTicket = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const token = getSessionToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/v1/admin/support/${id}`, { headers });
      if (!res.ok) {
        throw new Error("Unable to fetch administrative support ticket details.");
      }

      const json = await res.json();
      if (json.success && json.data) {
        setTicket(json.data);
        setSelectedStatus(json.data.status);
        setSelectedPriority(json.data.priority);
        setAssignedAdminId(json.data.assignedAdminId || "");
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load support ticket."
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isSendingReply) return;

    setIsSendingReply(true);
    setReplyError(null);

    try {
      const token = getSessionToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/v1/admin/support/${id}/reply`, {
        method: "POST",
        headers,
        body: JSON.stringify({ body: replyText.trim() }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to post reply.");
      }

      setReplyText("");
      await fetchTicket();
    } catch (err: unknown) {
      setReplyError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleAddInternalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!internalNoteText.trim() || isAddingNote) return;

    setIsAddingNote(true);
    setNoteError(null);

    try {
      const token = getSessionToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/v1/admin/support/${id}/internal-note`, {
        method: "POST",
        headers,
        body: JSON.stringify({ body: internalNoteText.trim() }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to add internal note.");
      }

      setInternalNoteText("");
      await fetchTicket();
    } catch (err: unknown) {
      setNoteError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleUpdateStatus = async (status: SupportStatus) => {
    setIsUpdatingMeta(true);
    try {
      const token = getSessionToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/v1/admin/support/${id}/status`, {
        method: "POST",
        headers,
        body: JSON.stringify({ status }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update status.");
      }

      setSelectedStatus(status);
      await fetchTicket();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setIsUpdatingMeta(false);
    }
  };

  const handleUpdatePriority = async (priority: SupportPriority) => {
    setIsUpdatingMeta(true);
    try {
      const token = getSessionToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/v1/admin/support/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ priority }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update priority.");
      }

      setSelectedPriority(priority);
      await fetchTicket();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update priority.");
    } finally {
      setIsUpdatingMeta(false);
    }
  };

  const handleAssignTicket = async (adminId: string | null) => {
    setIsUpdatingMeta(true);
    try {
      const token = getSessionToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/v1/admin/support/${id}/assign`, {
        method: "POST",
        headers,
        body: JSON.stringify({ assignedAdminId: adminId || null }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to assign ticket.");
      }

      setAssignedAdminId(adminId || "");
      await fetchTicket();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to assign ticket.");
    } finally {
      setIsUpdatingMeta(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-surface-200 rounded-2xl p-12 text-center">
        <RefreshCw className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium text-surface-700">Loading support ticket details...</p>
      </div>
    );
  }

  if (errorMessage || !ticket) {
    return (
      <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-center">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-600" />
        <h3 className="font-bold text-base">Ticket Not Found</h3>
        <p className="text-xs text-red-600 mt-1">
          {errorMessage || "Unable to retrieve support ticket."}
        </p>
        <div className="mt-4">
          <Link
            href="/admin/support"
            className="text-xs font-semibold text-red-800 underline"
          >
            Return to Support Queue
          </Link>
        </div>
      </div>
    );
  }

  const publicMessages = ticket.messages.filter((m) => !m.isInternal);
  const internalNotes = ticket.messages.filter((m) => m.isInternal);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/admin/support"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-surface-500 hover:text-surface-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Support Queue</span>
        </Link>
      </div>

      {/* Main Grid: Left Column = Conversation & Notes; Right Column = Controls & Safe Context */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Header */}
          <div className="bg-white border border-surface-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold bg-surface-100 px-3 py-1 rounded-md text-surface-900 border border-surface-200">
                  {ticket.ticketNumber}
                </span>
                <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-surface-100 text-surface-700">
                  {ticket.category}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {ticket.status}
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    ticket.priority === "URGENT"
                      ? "bg-red-100 text-red-800 border border-red-300"
                      : ticket.priority === "HIGH"
                      ? "bg-orange-100 text-orange-800"
                      : "bg-surface-100 text-surface-700"
                  }`}
                >
                  {ticket.priority} Priority
                </span>
              </div>
            </div>

            <h1 className="text-xl font-bold text-surface-900 tracking-tight">
              {ticket.subject}
            </h1>

            <div className="flex flex-wrap items-center gap-6 text-xs text-surface-500 pt-3 border-t border-surface-100">
              <div>
                <span className="text-surface-400">User:</span>{" "}
                <span className="text-surface-800 font-medium">
                  {ticket.userEmail || ticket.userName || ticket.userId}
                </span>
              </div>
              <div>
                <span className="text-surface-400">Created:</span>{" "}
                <span className="text-surface-800 font-medium">
                  {new Date(ticket.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div>
                <span className="text-surface-400">Last Activity:</span>{" "}
                <span className="text-surface-800 font-medium">
                  {new Date(ticket.lastMessageAt || ticket.updatedAt).toLocaleDateString(
                    undefined,
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* User Conversation Thread */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-surface-800 uppercase tracking-wider px-1 flex items-center justify-between">
              <span>Public Conversation</span>
              <span className="text-xs font-normal text-surface-500">
                {publicMessages.length} message(s) visible to user
              </span>
            </h2>

            <div className="space-y-4">
              {publicMessages.map((m) => {
                const isAdmin = m.authorType === "ADMIN";
                return (
                  <div
                    key={m.id}
                    className={`rounded-2xl p-5 border shadow-2xs ${
                      isAdmin
                        ? "bg-brand-50/40 border-brand-200 ml-4 sm:ml-8"
                        : "bg-white border-surface-200 mr-4 sm:mr-8"
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-surface-100 pb-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                            isAdmin
                              ? "bg-brand-600 text-white"
                              : "bg-surface-200 text-surface-700"
                          }`}
                        >
                          {isAdmin ? <Shield className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-surface-900">
                            {isAdmin ? "Staff: " + (m.authorName || "Support") : m.authorName || "User"}
                          </span>
                          <span className="text-[10px] text-surface-400 ml-2">
                            {new Date(m.createdAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>

                      {isAdmin && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700 bg-brand-100 px-2 py-0.5 rounded">
                          Staff Reply
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-surface-800 whitespace-pre-wrap font-sans">
                      {m.body}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Admin Public Reply Composer */}
            <div className="bg-white border border-surface-200 rounded-2xl p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-surface-700 uppercase tracking-wider">
                Post Public Reply (User will receive notification)
              </h3>

              {replyError && (
                <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs">
                  {replyError}
                </div>
              )}

              <form onSubmit={handleSendReply} className="space-y-3">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type an official response to the user..."
                  rows={4}
                  maxLength={5000}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />

                <div className="flex items-center justify-between text-xs text-surface-400">
                  <span>{replyText.length} / 5000 characters</span>

                  <button
                    type="submit"
                    disabled={isSendingReply || !replyText.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSendingReply ? "Sending..." : "Send Reply"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Internal Staff Notes Section */}
          <div className="space-y-4 pt-4 border-t border-surface-200">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600" />
                <span>Internal Staff Notes ({internalNotes.length})</span>
              </h2>
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                STRICTLY CONFIDENTIAL • NEVER SHOWN TO USER
              </span>
            </div>

            <div className="space-y-3">
              {internalNotes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-xl p-4 bg-amber-50/70 border border-amber-200 text-xs text-amber-950 space-y-1.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between text-[11px] text-amber-700 border-b border-amber-200/60 pb-1">
                    <span className="font-semibold">{note.authorName || "Staff Member"}</span>
                    <span>
                      {new Date(note.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap">{note.body}</div>
                </div>
              ))}
            </div>

            {/* Internal Note Composer */}
            <div className="bg-amber-50/30 border border-amber-200 rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Add Internal Operational Note
              </h3>

              {noteError && (
                <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs">
                  {noteError}
                </div>
              )}

              <form onSubmit={handleAddInternalNote} className="space-y-3">
                <textarea
                  value={internalNoteText}
                  onChange={(e) => setInternalNoteText(e.target.value)}
                  placeholder="Record an internal finding, duplicate ticket reference, or escalation note..."
                  rows={3}
                  maxLength={5000}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-amber-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-surface-900"
                />

                <div className="flex items-center justify-between text-xs text-surface-400">
                  <span>{internalNoteText.length} / 5000 characters</span>

                  <button
                    type="submit"
                    disabled={isAddingNote || !internalNoteText.trim()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
                  >
                    <span>{isAddingNote ? "Saving..." : "Add Internal Note"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Administrative Controls & Safe Context */}
        <div className="space-y-6">
          {/* Status & Assignment Panel */}
          <div className="bg-white border border-surface-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-surface-700 uppercase tracking-wider border-b border-surface-100 pb-2">
              Ticket Management
            </h3>

            {/* Status Selector */}
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1.5">
                Status
              </label>
              <select
                value={selectedStatus}
                disabled={isUpdatingMeta}
                onChange={(e) => handleUpdateStatus(e.target.value as SupportStatus)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-surface-300 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="OPEN">OPEN</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="WAITING_FOR_USER">WAITING_FOR_USER</option>
                <option value="WAITING_INTERNAL">WAITING_INTERNAL</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>

            {/* Priority Selector */}
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1.5">
                Priority
              </label>
              <select
                value={selectedPriority}
                disabled={isUpdatingMeta}
                onChange={(e) => handleUpdatePriority(e.target.value as SupportPriority)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-surface-300 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="LOW">LOW</option>
                <option value="NORMAL">NORMAL</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
            </div>

            {/* Assign Admin */}
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1.5">
                Assigned Administrator
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={assignedAdminId}
                  onChange={(e) => setAssignedAdminId(e.target.value)}
                  placeholder="Admin User ID / Username"
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="button"
                  disabled={isUpdatingMeta}
                  onClick={() => handleAssignTicket(assignedAdminId || null)}
                  className="px-3 py-1.5 bg-surface-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          </div>

          {/* User Safe Context */}
          <div className="bg-white border border-surface-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-surface-700 uppercase tracking-wider border-b border-surface-100 pb-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-brand-600" />
              <span>User Safe Context</span>
            </h3>

            <div className="text-xs space-y-2 text-surface-600">
              <div>
                <span className="font-semibold text-surface-800">User ID:</span>{" "}
                <span className="font-mono text-[11px]">{ticket.userId}</span>
              </div>
              {ticket.userEmail && (
                <div>
                  <span className="font-semibold text-surface-800">Email:</span>{" "}
                  <span>{ticket.userEmail}</span>
                </div>
              )}
              {ticket.userName && (
                <div>
                  <span className="font-semibold text-surface-800">Name:</span>{" "}
                  <span>{ticket.userName}</span>
                </div>
              )}
              {typeof ticket.rating === "number" && (
                <div className="p-2.5 rounded-lg bg-amber-50 text-amber-900 text-xs">
                  <span className="font-bold">Feedback Rating:</span> {ticket.rating} / 5 stars
                </div>
              )}
            </div>
          </div>

          {/* Safe Tax Reference Context */}
          {ticket.safeContext && Object.keys(ticket.safeContext).length > 0 && (
            <div className="bg-white border border-surface-200 rounded-2xl p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-surface-700 uppercase tracking-wider border-b border-surface-100 pb-2 flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-brand-600" />
                <span>Referenced Resource</span>
              </h3>

              <div className="p-3 rounded-xl bg-slate-50 text-[11px] text-slate-700 space-y-1.5">
                {ticket.safeContext.calculationId && (
                  <div>
                    <span className="font-medium text-slate-900">Calculation ID:</span>{" "}
                    <span className="font-mono">{ticket.safeContext.calculationId}</span>
                  </div>
                )}
                {ticket.safeContext.taxYear && (
                  <div>
                    <span className="font-medium text-slate-900">Tax Year:</span>{" "}
                    {ticket.safeContext.taxYear}
                  </div>
                )}
                {ticket.safeContext.calculatorType && (
                  <div>
                    <span className="font-medium text-slate-900">Calculator Type:</span>{" "}
                    {ticket.safeContext.calculatorType}
                  </div>
                )}
                {ticket.safeContext.filingStatus && (
                  <div>
                    <span className="font-medium text-slate-900">Filing Status:</span>{" "}
                    {ticket.safeContext.filingStatus}
                  </div>
                )}
                {ticket.safeContext.engineVersion && (
                  <div>
                    <span className="font-medium text-slate-900">Engine Version:</span>{" "}
                    {ticket.safeContext.engineVersion}
                  </div>
                )}
                {ticket.safeContext.rulesVersion && (
                  <div>
                    <span className="font-medium text-slate-900">Rules Version:</span>{" "}
                    {ticket.safeContext.rulesVersion}
                  </div>
                )}
                {ticket.safeContext.reportId && (
                  <div>
                    <span className="font-medium text-slate-900">Report ID:</span>{" "}
                    <span className="font-mono">{ticket.safeContext.reportId}</span>
                  </div>
                )}
                {ticket.safeContext.conversationId && (
                  <div>
                    <span className="font-medium text-slate-900">AI Conversation ID:</span>{" "}
                    <span className="font-mono">{ticket.safeContext.conversationId}</span>
                  </div>
                )}
              </div>

              <div className="text-[10px] text-surface-400 italic">
                * Zero financial figures or dollar amounts are duplicated into support tickets. Privileged tools must be used if financial calculation review is authorized.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
