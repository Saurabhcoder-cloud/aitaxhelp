"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Mail,
  Shield,
  Calculator,
  Sparkles,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface AdminUserSummary {
  id: string;
  email: string;
  fullName: string | null;
  role: "user" | "admin";
  createdAt: string;
  hasTaxProfile: boolean;
  calculationCount: number;
  conversationCount: number;
  leadCount: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [, startTransition] = useTransition();

  const fetchUsers = async (p = page, q = search) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("limit", "20");
      if (q) params.set("q", q);

      const res = await fetch(`/api/v1/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch users");

      const json = await res.json();
      if (json.success) {
        setUsers(json.data);
        setTotal(json.pagination.total);
        setPage(json.pagination.page);
        setTotalPages(json.pagination.totalPages);
      }
    } catch (_err) {
      // Handled by UI
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      fetchUsers(1, search);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-600" />
          <span>User Account Oversight</span>
        </h1>
        <p className="text-sm text-surface-600 mt-0.5">
          Operational summaries of registered taxpayers and account activity. Never displays passwords, tokens, or raw secrets.
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-surface-200 shadow-2xs">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users by name, email, or user ID..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-surface-50 border border-surface-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-2xs"
          >
            Search
          </button>
        </form>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
            <p className="text-sm font-medium text-surface-600">Loading user accounts...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Users className="w-12 h-12 text-surface-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-surface-900">No users found</h3>
            <p className="text-sm text-surface-500 mt-1 max-w-sm mx-auto">
              {search
                ? "No user accounts matched your search criteria."
                : "No registered user accounts found in the database."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-surface-700">
              <thead className="bg-surface-50 text-surface-500 text-xs uppercase font-semibold border-b border-surface-200">
                <tr>
                  <th scope="col" className="px-5 py-3.5">User</th>
                  <th scope="col" className="px-4 py-3.5">Role</th>
                  <th scope="col" className="px-4 py-3.5">Tax Profile</th>
                  <th scope="col" className="px-4 py-3.5">Activity</th>
                  <th scope="col" className="px-4 py-3.5">Joined</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-surface-900">{u.fullName || "Taxpayer"}</div>
                      <div className="text-xs text-surface-500 flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-surface-400" />
                        <span>{u.email}</span>
                      </div>
                      <div className="text-xs font-mono text-surface-400 mt-0.5">
                        {u.id.slice(0, 12)}...
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {u.role === "admin" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Shield className="w-3 h-3" />
                          <span>Admin</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-surface-100 text-surface-600">
                          User
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {u.hasTaxProfile ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Completed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-surface-400">
                          <XCircle className="w-3.5 h-3.5 text-surface-400" />
                          <span>Default</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3 text-xs text-surface-600">
                        <span title="Saved Calculations" className="flex items-center gap-1">
                          <Calculator className="w-3.5 h-3.5 text-surface-400" />
                          <span className="font-semibold text-surface-800">{u.calculationCount}</span>
                        </span>
                        <span title="AI Conversations" className="flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-surface-400" />
                          <span className="font-semibold text-surface-800">{u.conversationCount}</span>
                        </span>
                        <span title="Professional Leads" className="flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-surface-400" />
                          <span className="font-semibold text-surface-800">{u.leadCount}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-surface-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-100 hover:bg-brand-50 hover:text-brand-700 text-surface-800 text-xs font-semibold rounded-lg transition-colors border border-surface-200"
                      >
                        <span>Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
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
              <span className="font-semibold text-surface-900">{totalPages}</span> ({total} total users)
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fetchUsers(page - 1, search)}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-surface-200 bg-white text-surface-700 hover:bg-surface-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => fetchUsers(page + 1, search)}
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
