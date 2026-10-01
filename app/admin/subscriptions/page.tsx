"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  Search,
  Filter,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Shield,
  ExternalLink,
} from "lucide-react";
import { UserSubscription } from "@/types/monetization";

interface SubscriptionCounts {
  total: number;
  active: number;
  canceled: number;
  free: number;
  premium: number;
}

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [counts, setCounts] = useState<SubscriptionCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState("");

  const fetchSubscriptions = async (p = page, s = selectedStatus) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("limit", "20");
      if (s) params.set("status", s);

      const res = await fetch(`/api/v1/admin/subscriptions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load subscriptions");

      const json = await res.json();
      if (json.success) {
        setSubscriptions(json.data);
        setCounts(json.counts);
        setPage(json.pagination.page);
        setTotalPages(json.pagination.totalPages);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading subscriptions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions(1, selectedStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatus]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-brand-600" />
          <span>Subscription & Plan Management</span>
        </h1>
        <p className="text-sm text-surface-600 mt-0.5">
          Operational oversight of user subscription tiers, active accounts, and billing provider states.
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-2xs">
          <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider block">
            Active Subscriptions
          </span>
          <div className="text-2xl font-bold text-surface-900 mt-1">
            {counts ? counts.active : 0}
          </div>
          <span className="text-[11px] text-surface-500 mt-0.5 block">Paying or trialing accounts</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-2xs">
          <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider block">
            Premium Users
          </span>
          <div className="text-2xl font-bold text-purple-700 mt-1">
            {counts ? counts.premium : 0}
          </div>
          <span className="text-[11px] text-surface-500 mt-0.5 block">High-capacity entitlement</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-2xs">
          <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider block">
            Free Plan Users
          </span>
          <div className="text-2xl font-bold text-surface-700 mt-1">
            {counts ? counts.free : 0}
          </div>
          <span className="text-[11px] text-surface-500 mt-0.5 block">Standard tier accounts</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-2xs">
          <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider block">
            Canceled Subscriptions
          </span>
          <div className="text-2xl font-bold text-surface-500 mt-1">
            {counts ? counts.canceled : 0}
          </div>
          <span className="text-[11px] text-surface-500 mt-0.5 block">Terminated or expired</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-surface-200 shadow-2xs flex justify-between items-center">
        <div className="flex items-center gap-2 text-xs font-semibold text-surface-700">
          <Filter className="w-4 h-4 text-surface-400" />
          <span>Filter by status:</span>
        </div>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-1.5 text-xs bg-surface-50 border border-surface-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="trialing">Trialing</option>
          <option value="canceled">Canceled</option>
          <option value="past_due">Past Due</option>
        </select>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
            <p className="text-sm font-medium text-surface-600">Loading user subscriptions...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 text-sm">{error}</div>
        ) : subscriptions.length === 0 ? (
          <div className="p-12 text-center text-surface-500">
            <CreditCard className="w-10 h-10 text-surface-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-surface-800">No subscriptions found</p>
            <p className="text-xs text-surface-400 mt-1">
              {selectedStatus
                ? "No subscriptions match the selected status filter."
                : "Active subscriptions will appear here when users upgrade to Premium."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-surface-700">
              <thead className="bg-surface-50 text-surface-500 text-xs uppercase font-semibold border-b border-surface-200">
                <tr>
                  <th scope="col" className="px-5 py-3.5">User & Subscription</th>
                  <th scope="col" className="px-4 py-3.5">Stripe IDs</th>
                  <th scope="col" className="px-4 py-3.5">Plan Tier</th>
                  <th scope="col" className="px-4 py-3.5">Status</th>
                  <th scope="col" className="px-4 py-3.5">Period End</th>
                  <th scope="col" className="px-4 py-3.5">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/admin/users/${s.userId}`}
                        className="font-medium text-brand-600 hover:underline flex items-center gap-1.5 text-xs font-mono"
                      >
                        <span>User: {s.userId.slice(0, 10)}...</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                      <div className="text-[10px] font-mono text-surface-400 mt-0.5">
                        Sub: {s.id.slice(0, 10)}...
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-mono text-surface-600 space-y-0.5">
                      <div>
                        {s.providerCustomerId ? (
                          <span className="text-[11px] text-surface-700 bg-surface-100 px-1.5 py-0.5 rounded">
                            {s.providerCustomerId.slice(0, 14)}...
                          </span>
                        ) : (
                          <span className="text-surface-400 text-[10px]">No Customer</span>
                        )}
                      </div>
                      {s.providerSubscriptionId && (
                        <div className="text-[10px] text-surface-500">
                          {s.providerSubscriptionId.slice(0, 14)}...
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs font-bold capitalize">
                      {s.planId === "professional" ? (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Professional
                        </span>
                      ) : s.planId === "premium" ? (
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                          Premium
                        </span>
                      ) : (
                        <span className="text-surface-500">Free</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs">
                      <span
                        className={`px-2 py-0.5 rounded-full font-semibold capitalize text-[11px] ${
                          s.status === "active"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : s.status === "trialing"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : s.status === "past_due"
                            ? "bg-amber-50 text-amber-700 border border-amber-200 font-bold"
                            : s.status === "canceled"
                            ? "bg-surface-100 text-surface-600"
                            : "bg-surface-100 text-surface-700"
                        }`}
                      >
                        {s.status}
                      </span>
                      {s.cancelAtPeriodEnd && (
                        <div className="text-[10px] text-amber-700 font-medium mt-0.5">
                          Cancels at end
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-surface-600">
                      {new Date(s.currentPeriodEnd).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-surface-500">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-surface-200 bg-surface-50 text-xs text-surface-600">
            <div>
              Showing page <span className="font-semibold text-surface-900">{page}</span> of{" "}
              <span className="font-semibold text-surface-900">{totalPages}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fetchSubscriptions(page - 1, selectedStatus)}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-surface-200 bg-white text-surface-700 hover:bg-surface-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => fetchSubscriptions(page + 1, selectedStatus)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-surface-200 bg-white text-surface-700 hover:bg-surface-100 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
