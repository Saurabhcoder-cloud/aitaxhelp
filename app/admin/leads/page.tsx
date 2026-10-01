"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  UserCheck,
  Calendar,
  Mail,
  Phone,
  Clock,
  ArrowRight,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { ProfessionalLeadRecord, ProfessionalLeadStatus } from "@/lib/services/professional-lead-store";

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<ProfessionalLeadRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [, startTransition] = useTransition();

  const fetchLeads = async (p = page, q = search, s = selectedStatus, y = selectedYear) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("limit", "20");
      if (q) params.set("q", q);
      if (s) params.set("status", s);
      if (y) params.set("taxYear", y);

      const res = await fetch(`/api/v1/admin/leads?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch leads");

      const json = await res.json();
      if (json.success) {
        setLeads(json.data);
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
    fetchLeads(1, search, selectedStatus, selectedYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatus, selectedYear]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      fetchLeads(1, search, selectedStatus, selectedYear);
    });
  };

  const getStatusBadge = (status: ProfessionalLeadStatus) => {
    switch (status) {
      case "requested":
      case "new":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">Requested</span>;
      case "received":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">Received</span>;
      case "assigned":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-50 text-purple-700 border border-purple-200">Assigned</span>;
      case "contacted":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">Contacted</span>;
      case "in_progress":
      case "review_in_progress":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">In Review</span>;
      case "completed":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Completed</span>;
      case "closed":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-surface-100 text-surface-700 border border-surface-200">Closed</span>;
      case "cancelled":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-50 text-red-700 border border-red-200">Cancelled</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-surface-100 text-surface-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-emerald-600" />
            <span>Professional CPA/EA Leads</span>
          </h1>
          <p className="text-sm text-surface-600 mt-0.5">
            Manage taxpayer consultation requests, assign statuses, and record internal administrative notes.
          </p>
        </div>
      </div>

      {/* Visual Pipeline Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "New Leads", value: "new", desc: "Awaiting initial contact", color: "border-blue-300 bg-blue-50/50" },
          { label: "Contacted", value: "contacted", desc: "Initial outreach sent", color: "border-amber-300 bg-amber-50/50" },
          { label: "In Progress", value: "in_progress", desc: "Consultation underway", color: "border-purple-300 bg-purple-50/50" },
          { label: "Closed", value: "closed", desc: "Completed or resolved", color: "border-surface-300 bg-surface-50/50" },
        ].map((stage) => {
          const isSelected = selectedStatus === stage.value;
          return (
            <button
              key={stage.value}
              type="button"
              onClick={() => setSelectedStatus(isSelected ? "" : stage.value)}
              className={`text-left p-3.5 rounded-xl border transition-all ${
                isSelected
                  ? "ring-2 ring-brand-500 border-brand-500 bg-white shadow-xs"
                  : `${stage.color} hover:bg-white hover:border-surface-300`
              }`}
            >
              <div className="text-xs font-bold uppercase tracking-wider text-surface-600">{stage.label}</div>
              <div className="text-xs text-surface-500 mt-1">{stage.desc}</div>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-surface-200 shadow-2xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by taxpayer name, email, lead ID, or calculation ID..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-surface-50 border border-surface-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 text-sm bg-surface-50 border border-surface-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="in_progress">In Progress</option>
              <option value="closed">Closed</option>
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-2 text-sm bg-surface-50 border border-surface-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              <option value="">All Years</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-2xs"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
            <p className="text-sm font-medium text-surface-600">Loading professional leads...</p>
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-16 px-4">
            <UserCheck className="w-12 h-12 text-surface-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-surface-900">No leads found</h3>
            <p className="text-sm text-surface-500 mt-1 max-w-sm mx-auto">
              {search || selectedStatus || selectedYear
                ? "No leads matched your search and filter criteria. Try adjusting your parameters."
                : "No taxpayer professional consultation inquiries have been submitted yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-surface-700">
              <thead className="bg-surface-50 text-surface-500 text-xs uppercase font-semibold border-b border-surface-200">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Taxpayer</th>
                  <th scope="col" className="px-4 py-3.5">Tax Info</th>
                  <th scope="col" className="px-4 py-3.5">Urgency</th>
                  <th scope="col" className="px-4 py-3.5">Status</th>
                  <th scope="col" className="px-4 py-3.5">Created</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-surface-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-surface-900">{lead.taxpayerName}</span>
                        {lead.reviewType && (
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                            {lead.reviewType === "cpa"
                              ? "CPA"
                              : lead.reviewType === "enrolled_agent"
                              ? "EA"
                              : "PRO"}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-surface-500 flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-surface-400" />
                        <span>{lead.email}</span>
                      </div>
                      {lead.phone && (
                        <div className="text-xs text-surface-500 flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3 h-3 text-surface-400" />
                          <span>{lead.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-surface-900">Tax Year {lead.taxYear}</div>
                      <div className="text-xs text-surface-500 capitalize">{lead.filingStatus.replace(/_/g, " ")}</div>
                      <div className="space-y-0.5 mt-1 font-mono text-[11px]">
                        {lead.calculationId && (
                          <Link
                            href={`/admin/calculations/${lead.calculationId}`}
                            className="text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
                            title="Inspect linked calculation snapshot"
                          >
                            <span>Calc: {lead.calculationId.slice(0, 8)}...</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                        {lead.sessionId && (
                          <div className="text-surface-500 text-[10px]">
                            Session: {lead.sessionId.slice(0, 8)}...
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-xs font-medium text-surface-800 capitalize">
                        {lead.urgency.replace(/_/g, " ")}
                      </div>
                      <div className="text-xs text-surface-500 capitalize">
                        via {lead.preferredContactMethod}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>{getStatusBadge(lead.status)}</div>
                      {lead.assignedProfessionalName && (
                        <div className="text-[11px] text-purple-700 font-medium mt-1 truncate max-w-[130px]" title={lead.assignedProfessionalName}>
                          Pro: {lead.assignedProfessionalName}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-xs text-surface-500">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/leads/${lead.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-100 hover:bg-brand-50 hover:text-brand-700 text-surface-800 text-xs font-semibold rounded-lg transition-colors border border-surface-200"
                      >
                        <span>Inspect / Update</span>
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
              <span className="font-semibold text-surface-900">{totalPages}</span> ({total} total leads)
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fetchLeads(page - 1, search, selectedStatus, selectedYear)}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-surface-200 bg-white text-surface-700 hover:bg-surface-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => fetchLeads(page + 1, search, selectedStatus, selectedYear)}
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
