"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  LifeBuoy,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Calculator,
  ShieldAlert,
  MessageSquare,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { SupportTicket, SupportStatus } from "@/types/support";
import { getSessionToken } from "@/lib/utils/auth-client";

export default function UserSupportCenterPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
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

      let url = `/api/v1/support/tickets?page=${page}&limit=10`;
      if (statusFilter !== "ALL") {
        url += `&status=${statusFilter}`;
      }

      const res = await fetch(url, { headers });
      if (!res.ok) {
        throw new Error("Unable to load support requests. Please try again.");
      }

      const json = await res.json();
      if (json.success && json.data) {
        setTickets(json.data.tickets || []);
        setTotal(json.data.total || 0);
        setTotalPages(json.data.totalPages || 1);
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load support requests."
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const getStatusBadge = (status: SupportStatus) => {
    switch (status) {
      case "OPEN":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3" />
            Open
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <RefreshCw className="w-3 h-3 animate-spin" />
            In Progress
          </span>
        );
      case "WAITING_FOR_USER":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <MessageSquare className="w-3 h-3" />
            Waiting for Reply
          </span>
        );
      case "WAITING_INTERNAL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Under Review
          </span>
        );
      case "RESOLVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Resolved
          </span>
        );
      case "CLOSED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-100 text-surface-600 border border-surface-200">
            Closed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-surface-100 text-surface-600">
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

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-surface-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-surface-900 tracking-tight">
                Support & Help Center
              </h2>
              <p className="text-xs text-surface-500">
                Track submitted tickets, ask questions, or report calculation issues.
              </p>
            </div>
          </div>
        </div>

        <Link
          href="/dashboard/support/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-all shadow-xs shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create New Request</span>
        </Link>
      </div>

      {/* Quick Action Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/dashboard/support/new?category=TAX_CALCULATION"
          className="bg-white border border-surface-200 hover:border-brand-300 hover:shadow-md transition-all p-4 rounded-xl group"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <Calculator className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-surface-900 group-hover:text-brand-600">
            Calculation Question
          </h3>
          <p className="text-xs text-surface-500 mt-1">
            Inquire about specific federal tax engine math or scenario results.
          </p>
        </Link>

        <Link
          href="/dashboard/support/new?category=BILLING"
          className="bg-white border border-surface-200 hover:border-brand-300 hover:shadow-md transition-all p-4 rounded-xl group"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <HelpCircle className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-surface-900 group-hover:text-brand-600">
            Account & Billing
          </h3>
          <p className="text-xs text-surface-500 mt-1">
            Questions regarding subscriptions, receipt copies, or entitlements.
          </p>
        </Link>

        <Link
          href="/dashboard/support/new?category=BUG"
          className="bg-white border border-surface-200 hover:border-brand-300 hover:shadow-md transition-all p-4 rounded-xl group"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
            <AlertCircle className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-surface-900 group-hover:text-brand-600">
            Report a Bug
          </h3>
          <p className="text-xs text-surface-500 mt-1">
            Let us know if something unexpected happened on the platform.
          </p>
        </Link>

        <Link
          href="/dashboard/support/new?category=SECURITY"
          className="bg-white border border-surface-200 hover:border-red-300 hover:shadow-md transition-all p-4 rounded-xl group"
        >
          <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center mb-3">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-surface-900 group-hover:text-red-600">
            Security & Privacy
          </h3>
          <p className="text-xs text-surface-500 mt-1">
            Report security disclosures or submit data handling inquiries.
          </p>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-surface-200 pb-2">
        <div className="flex items-center gap-1 overflow-x-auto py-1">
          {["ALL", "OPEN", "IN_PROGRESS", "WAITING_FOR_USER", "RESOLVED", "CLOSED"].map(
            (statusKey) => (
              <button
                key={statusKey}
                type="button"
                onClick={() => {
                  setStatusFilter(statusKey);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  statusFilter === statusKey
                    ? "bg-surface-900 text-white shadow-2xs"
                    : "text-surface-600 hover:text-surface-900 hover:bg-surface-100"
                }`}
              >
                {statusKey === "ALL"
                  ? "All Requests"
                  : statusKey === "WAITING_FOR_USER"
                  ? "Waiting For Reply"
                  : getCategoryLabel(statusKey)}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          onClick={() => fetchTickets()}
          disabled={isLoading}
          className="inline-flex items-center gap-1 text-xs text-surface-500 hover:text-surface-800 p-1.5 rounded-lg hover:bg-surface-100 transition-colors"
          title="Refresh requests"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Requests Table / Content */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => fetchTickets()}
            className="text-xs font-semibold underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="bg-white border border-surface-200 rounded-2xl p-12 text-center">
          <RefreshCw className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-surface-700">Loading support requests...</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white border border-surface-200 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-surface-100 text-surface-400 flex items-center justify-center mx-auto mb-3">
            <LifeBuoy className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-surface-900">No support requests found</h3>
          <p className="text-xs text-surface-500 mt-1 max-w-sm mx-auto">
            {statusFilter !== "ALL"
              ? "No tickets match the selected status filter."
              : "You haven't submitted any support requests yet. If you have questions about your taxes or calculations, we're here to help."}
          </p>
          <div className="mt-4">
            <Link
              href="/dashboard/support/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create New Request</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-surface-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-surface-200 text-left">
              <thead className="bg-surface-50">
                <tr>
                  <th className="px-6 py-3.5 text-xs font-semibold text-surface-600 uppercase tracking-wider">
                    Ticket
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-surface-600 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-surface-600 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-surface-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-surface-600 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-surface-600 uppercase tracking-wider text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 bg-white">
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-surface-50/80 transition-colors group cursor-pointer"
                    onClick={() => {
                      window.location.href = `/dashboard/support/${t.id}`;
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-xs font-bold text-surface-900">
                        {t.ticketNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-surface-900 line-clamp-1 group-hover:text-brand-600">
                        {t.subject}
                      </p>
                      {t.safeContext?.taxYear && (
                        <p className="text-[11px] text-surface-400 mt-0.5">
                          Ref: Tax Year {t.safeContext.taxYear}
                          {t.safeContext.calculatorType
                            ? ` • ${t.safeContext.calculatorType}`
                            : ""}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-medium bg-surface-100 text-surface-700">
                        {getCategoryLabel(t.category)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(t.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-surface-500">
                      {new Date(t.lastMessageAt || t.updatedAt).toLocaleDateString(
                        undefined,
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link
                        href={`/dashboard/support/${t.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800"
                      >
                        <span>View</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-surface-200 flex items-center justify-between text-xs text-surface-500">
              <span>
                Showing page {page} of {totalPages} ({total} total requests)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-surface-200 disabled:opacity-40 hover:bg-surface-50 font-medium"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-surface-200 disabled:opacity-40 hover:bg-surface-50 font-medium"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
