"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import {
  LifeBuoy,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  MessageSquare,
  Lock,
  RotateCcw,
  User,
  Shield,
  Calculator,
  RefreshCw,
} from "lucide-react";
import { SupportTicketWithMessages, SupportStatus } from "@/types/support";
import { getSessionToken } from "@/lib/utils/auth-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function UserSupportTicketDetailPage({ params }: PageProps) {
  const { id } = use(params);

  const [ticket, setTicket] = useState<SupportTicketWithMessages | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reply Composer
  const [replyText, setReplyText] = useState<string>("");
  const [isSendingReply, setIsSendingReply] = useState<boolean>(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  // Status Action (Close / Reopen)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  const fetchTicket = useCallback(async () => {
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

      const res = await fetch(`/api/v1/support/tickets/${id}`, { headers });
      if (!res.ok) {
        throw new Error("Unable to load ticket details. Please try again.");
      }

      const json = await res.json();
      if (json.success && json.data) {
        setTicket(json.data);
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
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/v1/support/tickets/${id}/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify({ body: replyText.trim() }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to send message.");
      }

      setReplyText("");
      // Refresh conversation
      await fetchTicket();
    } catch (err: unknown) {
      setReplyError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleStatusChange = async (action: "close" | "reopen") => {
    if (isUpdatingStatus) return;
    setIsUpdatingStatus(true);

    try {
      const token = getSessionToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/v1/support/tickets/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ action }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update ticket status.");
      }

      await fetchTicket();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: SupportStatus) => {
    switch (status) {
      case "OPEN":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3" />
            Open
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <RefreshCw className="w-3 h-3 animate-spin" />
            In Progress
          </span>
        );
      case "WAITING_FOR_USER":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <MessageSquare className="w-3 h-3" />
            Waiting for Your Reply
          </span>
        );
      case "WAITING_INTERNAL":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Under Review
          </span>
        );
      case "RESOLVED":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Resolved
          </span>
        );
      case "CLOSED":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-surface-100 text-surface-600 border border-surface-200">
            <Lock className="w-3 h-3" />
            Closed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-surface-100 text-surface-600">
            {status}
          </span>
        );
    }
  };

  const getCategoryLabel = (cat: string) => {
    return cat
      .split("_")
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(" ");
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-surface-200 rounded-2xl p-12 text-center">
        <RefreshCw className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium text-surface-700">Loading support conversation...</p>
      </div>
    );
  }

  if (errorMessage || !ticket) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-600" />
          <h3 className="font-bold text-base">Unable to Open Support Ticket</h3>
          <p className="text-xs text-red-600 mt-1">
            {errorMessage || "The requested ticket was not found or access is restricted."}
          </p>
          <div className="mt-4">
            <Link
              href="/dashboard/support"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-800 underline hover:no-underline"
            >
              Return to Support Center
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/support"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-surface-500 hover:text-surface-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Requests</span>
        </Link>

        {/* User Status Action Buttons */}
        <div className="flex items-center gap-2">
          {ticket.status === "RESOLVED" && (
            <button
              type="button"
              disabled={isUpdatingStatus}
              onClick={() => handleStatusChange("reopen")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-300 text-surface-700 hover:bg-surface-50 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5 text-brand-600" />
              <span>Reopen Ticket</span>
            </button>
          )}

          {ticket.status !== "CLOSED" && ticket.status !== "RESOLVED" && (
            <button
              type="button"
              disabled={isUpdatingStatus}
              onClick={() => handleStatusChange("close")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-200 text-surface-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-xs font-medium transition-colors disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Close Request</span>
            </button>
          )}
        </div>
      </div>

      {/* Ticket Overview Header */}
      <div className="bg-white border border-surface-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-sm font-bold text-surface-900 bg-surface-100 px-2.5 py-1 rounded-md border border-surface-200">
              {ticket.ticketNumber}
            </span>
            <span className="text-xs font-medium text-surface-600 px-2.5 py-1 rounded-md bg-surface-100">
              {getCategoryLabel(ticket.category)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {getStatusBadge(ticket.status)}
          </div>
        </div>

        <h1 className="text-xl font-bold text-surface-900 tracking-tight">
          {ticket.subject}
        </h1>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-surface-500 pt-2 border-t border-surface-100">
          <div>
            <span className="text-surface-400">Submitted:</span>{" "}
            <span className="text-surface-700 font-medium">
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
            <span className="text-surface-700 font-medium">
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

        {/* Safe Context Metadata display */}
        {ticket.safeContext && Object.keys(ticket.safeContext).length > 0 && (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1.5">
              <Calculator className="w-3.5 h-3.5 text-brand-600" />
              <span>Referenced Resource Metadata</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-[11px] text-slate-600">
              {ticket.safeContext.calculationId && (
                <div>
                  <span className="font-medium text-slate-800">Calculation ID:</span>{" "}
                  <span className="font-mono">{ticket.safeContext.calculationId}</span>
                </div>
              )}
              {ticket.safeContext.taxYear && (
                <div>
                  <span className="font-medium text-slate-800">Tax Year:</span>{" "}
                  {ticket.safeContext.taxYear}
                </div>
              )}
              {ticket.safeContext.calculatorType && (
                <div>
                  <span className="font-medium text-slate-800">Calculator:</span>{" "}
                  {ticket.safeContext.calculatorType}
                </div>
              )}
              {ticket.safeContext.filingStatus && (
                <div>
                  <span className="font-medium text-slate-800">Filing Status:</span>{" "}
                  {ticket.safeContext.filingStatus}
                </div>
              )}
              {ticket.safeContext.reportId && (
                <div>
                  <span className="font-medium text-slate-800">Report ID:</span>{" "}
                  <span className="font-mono">{ticket.safeContext.reportId}</span>
                </div>
              )}
              {ticket.safeContext.conversationId && (
                <div>
                  <span className="font-medium text-slate-800">AI Chat ID:</span>{" "}
                  <span className="font-mono">{ticket.safeContext.conversationId}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Message Timeline */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-surface-800 uppercase tracking-wider px-1">
          Conversation History
        </h2>

        <div className="space-y-4">
          {ticket.messages.map((m, idx) => {
            const isAdmin = m.authorType === "ADMIN";
            const isSystem = m.authorType === "SYSTEM";

            if (isSystem) {
              return (
                <div
                  key={m.id || idx}
                  className="py-2 px-4 rounded-xl bg-surface-100 text-center text-xs text-surface-500 font-mono"
                >
                  {m.body}
                </div>
              );
            }

            return (
              <div
                key={m.id || idx}
                className={`rounded-2xl p-5 border shadow-xs transition-all ${
                  isAdmin
                    ? "bg-brand-50/40 border-brand-200 ml-0 sm:ml-8"
                    : "bg-white border-surface-200 mr-0 sm:mr-8"
                }`}
              >
                <div className="flex items-center justify-between border-b border-surface-100 pb-2.5 mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                        isAdmin
                          ? "bg-brand-600 text-white"
                          : "bg-surface-200 text-surface-700"
                      }`}
                    >
                      {isAdmin ? (
                        <Shield className="w-3.5 h-3.5" />
                      ) : (
                        <User className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-surface-900">
                        {isAdmin ? "TaxAIHelp Support Team" : m.authorName || "You"}
                      </div>
                      <div className="text-[10px] text-surface-400">
                        {new Date(m.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>

                  {isAdmin && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700 bg-brand-100/60 px-2 py-0.5 rounded">
                      Staff Reply
                    </span>
                  )}
                </div>

                {/* Plain-text sanitized message body */}
                <div className="text-sm text-surface-800 leading-relaxed whitespace-pre-wrap font-sans">
                  {m.body}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reply Composer */}
      {ticket.status !== "CLOSED" ? (
        <div className="bg-white border border-surface-200 rounded-2xl p-6 shadow-xs">
          <h3 className="text-sm font-bold text-surface-900 mb-2">
            Send a Reply
          </h3>
          <p className="text-xs text-surface-500 mb-4">
            Add information, provide clarification, or respond to the support team.
          </p>

          <form onSubmit={handleSendReply} className="space-y-4">
            {replyError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{replyError}</span>
              </div>
            )}

            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your response here..."
              rows={4}
              maxLength={5000}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-300 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />

            <div className="flex items-center justify-between text-xs text-surface-400">
              <span>{replyText.length} / 5000 characters</span>

              <button
                type="submit"
                disabled={isSendingReply || !replyText.trim()}
                className="inline-flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingReply ? "Sending..." : "Post Reply"}</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-surface-50 border border-surface-200 rounded-2xl p-6 text-center text-xs text-surface-500">
          <Lock className="w-6 h-6 text-surface-400 mx-auto mb-2" />
          <p className="font-medium text-surface-700">This support ticket is closed.</p>
          <p className="mt-1">
            If you need further help, you may open a new support request.
          </p>
        </div>
      )}
    </div>
  );
}
