"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  LifeBuoy,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  UserCheck,
  ChevronRight,
  ShieldAlert,
  Inbox,
  User,
} from "lucide-react";
import {
  SupportTicket,
  SupportStatus,
  SupportPriority,
  SupportCategory,
  SupportStats,
} from "@/types/support";
import { getSessionToken } from "@/lib/utils/auth-client";

export default function AdminSupportQueuePage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<SupportStats | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Filters
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const token = getSessionToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/v1/admin/support/stats", { headers });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setStats(json.data);
        }
      }
    } catch (_err) {}
  };

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const token = getSessionToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(pageSize));

      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (categoryFilter !== "ALL") params.set("category", categoryFilter);
      if (priorityFilter !== "ALL") params.set("priority", priorityFilter);

      const res = await fetch(`/api/v1/admin/support?${params.toString()}`, { headers });
      if (!res.ok) {
        throw new Error("Unable to fetch administrative support tickets.");
      }

      const json = await res.json();
      if (json.success && json.data) {
        setTickets(json.data.tickets || []);
        setTotal(json.data.total || 0);
        setTotalPages(json.data.totalPages || 1);
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load support tickets."
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, statusFilter, categoryFilter, priorityFilter]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const getStatusBadge = (status: SupportStatus) => {
    switch (status) {
      case "OPEN":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800">
            Open
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800">
            In Progress
          </span>
        );
      case "WAITING_FOR_USER":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-800">
            Waiting User
          </span>
        );
      case "WAITING_INTERNAL":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800">
            Internal Review
          </span>
        );
      case "RESOLVED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
            Resolved
          </span>
        );
      case "CLOSED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-surface-100 text-surface-600">
            Closed
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  const getPriorityBadge = (priority: SupportPriority) => {
    switch (priority) {
      case "URGENT":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 border border-red-300 animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            URGENT
          </span>
        );
      case "HIGH":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-orange-100 text-orange-800">
            High
          </span>
        );
      case "NORMAL":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-surface-100 text-surface-700">
            Normal
          </span>
        );
      case "LOW":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-surface-50 text-surface-500">
            Low
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-surface-900 tracking-tight flex items-center gap-2">
            <LifeBuoy className="w-6 h-6 text-brand-600" />
            <span>Support Center Operations</span>
          </h1>
          <p className="text-xs text-surface-500 mt-0.5">
            Triage user requests, post administrative replies, and manage internal operational notes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            fetchStats();
            fetchTickets();
          }}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-surface-200 rounded-xl text-xs font-semibold text-surface-700 hover:bg-surface-50 transition-colors shadow-2xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Real Aggregate Metrics Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white border border-surface-200 rounded-xl p-4 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-surface-400">
              Open
            </div>
            <div className="text-2xl font-extrabold text-blue-600 mt-1">
              {stats.openCount}
            </div>
          </div>

          <div className="bg-white border border-surface-200 rounded-xl p-4 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-surface-400">
              In Progress
            </div>
            <div className="text-2xl font-extrabold text-amber-600 mt-1">
              {stats.inProgressCount}
            </div>
          </div>

          <div className="bg-white border border-surface-200 rounded-xl p-4 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-surface-400">
              Waiting User
            </div>
            <div className="text-2xl font-extrabold text-purple-600 mt-1">
              {stats.waitingForUserCount}
            </div>
          </div>

          <div className="bg-white border border-surface-200 rounded-xl p-4 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-surface-400">
              Urgent
            </div>
            <div className="text-2xl font-extrabold text-red-600 mt-1">
              {stats.urgentCount}
            </div>
          </div>

          <div className="bg-white border border-surface-200 rounded-xl p-4 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-surface-400">
              Unassigned
            </div>
            <div className="text-2xl font-extrabold text-slate-700 mt-1">
              {stats.unassignedCount}
            </div>
          </div>

          <div className="bg-white border border-surface-200 rounded-xl p-4 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-surface-400">
              Resolved Today
            </div>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">
              {stats.resolvedCount}
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-surface-200 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-surface-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by ticket #, subject, or email..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-surface-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_FOR_USER">Waiting for User</option>
              <option value="WAITING_INTERNAL">Internal Review</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-surface-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="ALL">All Categories</option>
              <option value="TAX_CALCULATION">Tax Calculation</option>
              <option value="BILLING">Billing</option>
              <option value="ACCOUNT">Account</option>
              <option value="CALCULATOR">Calculator</option>
              <option value="AI_ASSISTANT">AI Assistant</option>
              <option value="REPORT">Report</option>
              <option value="BUG">Bug</option>
              <option value="FEEDBACK">Feedback</option>
              <option value="FEATURE_REQUEST">Feature Request</option>
              <option value="SECURITY">Security</option>
              <option value="PRIVACY">Privacy</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-surface-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="NORMAL">Normal</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ticket Table */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div className="bg-white border border-surface-200 rounded-2xl p-12 text-center">
          <RefreshCw className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-surface-700">Loading support queue...</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white border border-surface-200 rounded-2xl p-12 text-center">
          <Inbox className="w-10 h-10 text-surface-400 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-surface-900">No tickets found</h3>
          <p className="text-xs text-surface-500 mt-1">
            No support requests match your search criteria.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-surface-200 rounded-2xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-surface-200 text-left text-xs">
              <thead className="bg-surface-50 font-bold uppercase tracking-wider text-surface-500">
                <tr>
                  <th className="px-5 py-3">Ticket</th>
                  <th className="px-5 py-3">Subject & User</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Priority</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Assigned</th>
                  <th className="px-5 py-3">Updated</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 bg-white">
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-surface-50 transition-colors group cursor-pointer"
                    onClick={() => {
                      window.location.href = `/admin/support/${t.id}`;
                    }}
                  >
                    <td className="px-5 py-3.5 whitespace-nowrap font-mono font-bold text-surface-900">
                      {t.ticketNumber}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-surface-900 group-hover:text-brand-600 line-clamp-1">
                        {t.subject}
                      </div>
                      <div className="text-[11px] text-surface-500 flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3 text-surface-400" />
                        <span>{t.userEmail || t.userName || t.userId}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-surface-700">
                      <span className="px-2 py-0.5 rounded bg-surface-100 text-[11px] font-medium">
                        {t.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {getPriorityBadge(t.priority)}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {getStatusBadge(t.status)}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-surface-600">
                      {t.assignedAdminName || (
                        <span className="text-surface-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-surface-500">
                      {new Date(t.lastMessageAt || t.updatedAt).toLocaleDateString(
                        undefined,
                        {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-right">
                      <Link
                        href={`/admin/support/${t.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-100 hover:bg-brand-50 hover:text-brand-600 text-surface-700 rounded-md font-semibold text-[11px] transition-colors"
                      >
                        <span>Manage</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-5 py-3.5 border-t border-surface-200 flex items-center justify-between text-xs text-surface-500">
            <span>
              Showing {tickets.length} of {total} tickets (Page {page} of {totalPages})
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded border border-surface-200 disabled:opacity-40 hover:bg-surface-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded border border-surface-200 disabled:opacity-40 hover:bg-surface-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
