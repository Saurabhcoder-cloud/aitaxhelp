"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Calculator,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ExternalLink,
  ShieldCheck,
  FileCode2,
} from "lucide-react";
import { CalculatorType, TaxYear, TaxFilingStatus } from "@/types/tax";

interface AdminCalculationItem {
  id: string;
  userId: string;
  calculatorType: CalculatorType;
  taxYear: TaxYear;
  filingStatus: TaxFilingStatus;
  title: string;
  engineVersion: string;
  rulesVersion: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminCalculationsPage() {
  const [calculations, setCalculations] = useState<AdminCalculationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [, startTransition] = useTransition();

  const fetchCalculations = async (p = page, q = search, t = selectedType, y = selectedYear) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("limit", "20");
      if (q) params.set("q", q);
      if (t) params.set("calculatorType", t);
      if (y) params.set("taxYear", y);

      const res = await fetch(`/api/v1/admin/calculations?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch calculations");

      const json = await res.json();
      if (json.success) {
        setCalculations(json.data);
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
    fetchCalculations(1, search, selectedType, selectedYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, selectedYear]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      fetchCalculations(1, search, selectedType, selectedYear);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight flex items-center gap-2">
          <Calculator className="w-6 h-6 text-purple-600" />
          <span>Calculation Record Oversight</span>
        </h1>
        <p className="text-sm text-surface-600 mt-0.5">
          Deterministic historical calculation snapshots. All calculations are immutable deterministic records.
        </p>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-surface-200 shadow-2xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by calculation ID, user ID, or title..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-surface-50 border border-surface-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 text-sm bg-surface-50 border border-surface-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              <option value="">All Calculators</option>
              <option value="income">Income Tax</option>
              <option value="self-employed">Self-Employed</option>
              <option value="1099">1099 Contractor</option>
              <option value="quarterly">Quarterly 1040-ES</option>
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

      {/* Calculations Table */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
            <p className="text-sm font-medium text-surface-600">Loading calculation records...</p>
          </div>
        ) : calculations.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Calculator className="w-12 h-12 text-surface-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-surface-900">No calculation records found</h3>
            <p className="text-sm text-surface-500 mt-1 max-w-sm mx-auto">
              {search || selectedType || selectedYear
                ? "No calculations matched your filter criteria."
                : "No tax calculations have been saved yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-surface-700">
              <thead className="bg-surface-50 text-surface-500 text-xs uppercase font-semibold border-b border-surface-200">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Calculation & User</th>
                  <th scope="col" className="px-4 py-3.5">Type & Filing</th>
                  <th scope="col" className="px-4 py-3.5">Tax Year</th>
                  <th scope="col" className="px-4 py-3.5">Engine / Rules</th>
                  <th scope="col" className="px-4 py-3.5">Created</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {calculations.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-surface-900">{c.title}</div>
                      <div className="text-xs font-mono text-surface-400 mt-0.5">
                        Calc: {c.id.slice(0, 10)}...
                      </div>
                      <div className="text-xs font-mono text-surface-400">
                        User: {c.userId.slice(0, 10)}...
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-medium text-surface-900 capitalize">
                        {c.calculatorType}
                      </span>
                      <div className="text-xs text-surface-500 capitalize">
                        {c.filingStatus.replace(/_/g, " ")}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-bold text-surface-900">{c.taxYear}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-surface-600">
                        <FileCode2 className="w-3.5 h-3.5 text-surface-400" />
                        <span>v{c.engineVersion} (Rules: {c.rulesVersion})</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-surface-500">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/calculations/${c.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-100 hover:bg-brand-50 hover:text-brand-700 text-surface-800 text-xs font-semibold rounded-lg transition-colors border border-surface-200"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Inspect</span>
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
              <span className="font-semibold text-surface-900">{totalPages}</span> ({total} total calculations)
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fetchCalculations(page - 1, search, selectedType, selectedYear)}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-surface-200 bg-white text-surface-700 hover:bg-surface-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => fetchCalculations(page + 1, search, selectedType, selectedYear)}
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
