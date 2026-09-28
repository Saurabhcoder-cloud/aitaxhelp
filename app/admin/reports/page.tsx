"use client";

import React, { useEffect, useState } from "react";
import {
  FileSpreadsheet,
  Calendar,
  Layers,
  Shield,
  Loader2,
  Lock,
} from "lucide-react";
import { ReportMetrics } from "@/lib/services/tax-report-analytics-store";

export default function AdminReportsPage() {
  const [data, setData] = useState<ReportMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);
        const res = await fetch("/api/v1/admin/reports");
        if (!res.ok) throw new Error("Failed to load report analytics");
        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error loading report metrics.");
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, []);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
        <p className="text-sm font-medium text-surface-600">Loading report analytics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
        <h3 className="font-semibold text-base mb-1">Failed to Load Reports</h3>
        <p className="text-sm">{error || "Unable to retrieve report analytics."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
          <span>Tax Summary Report Analytics</span>
        </h1>
        <p className="text-sm text-surface-600 mt-0.5">
          Operational metrics on compiled browser-printable summary packages and access tiers.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-2xs">
          <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">
            Total Reports Generated
          </div>
          <div className="text-3xl font-bold text-surface-900">{data.reportsGenerated}</div>
          <div className="text-xs text-surface-500 mt-1">Compiled summary packages</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-2xs">
          <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">
            Tax Year Coverage
          </div>
          <div className="text-sm font-medium text-surface-800 space-y-1 mt-2">
            {Object.keys(data.taxYearDistribution).length === 0 ? (
              <span className="text-surface-400 text-xs">No reports generated yet</span>
            ) : (
              Object.entries(data.taxYearDistribution).map(([year, count]) => (
                <div key={year} className="flex justify-between text-xs">
                  <span>Year {year}:</span>
                  <span className="font-bold text-surface-900">{count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-2xs">
          <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">
            Access Tier Distribution
          </div>
          <div className="text-sm font-medium text-surface-800 space-y-1 mt-2">
            {Object.keys(data.accessTierDistribution).length === 0 ? (
              <span className="text-surface-400 text-xs">No reports generated yet</span>
            ) : (
              Object.entries(data.accessTierDistribution).map(([tier, count]) => (
                <div key={tier} className="flex justify-between text-xs">
                  <span className="capitalize">{tier}:</span>
                  <span className="font-bold text-surface-900">{count}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Reports Table */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-surface-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-surface-900">Recent Generated Reports</h2>
          <span className="text-xs font-mono text-surface-500">{data.recentReports.length} records</span>
        </div>

        {data.recentReports.length === 0 ? (
          <div className="p-12 text-center text-surface-500">
            <FileSpreadsheet className="w-10 h-10 text-surface-300 mx-auto mb-2" />
            <p className="text-sm">No report generation events logged yet.</p>
            <p className="text-xs text-surface-400 mt-1">
              Reports are rendered on-demand when taxpayers open printable summary views.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-surface-700">
              <thead className="bg-surface-50 text-surface-500 text-xs uppercase font-semibold border-b border-surface-200">
                <tr>
                  <th scope="col" className="px-5 py-3">Report ID</th>
                  <th scope="col" className="px-4 py-3">Calculation Ref</th>
                  <th scope="col" className="px-4 py-3">Tax Year</th>
                  <th scope="col" className="px-4 py-3">Calculator Type</th>
                  <th scope="col" className="px-4 py-3">Tier</th>
                  <th scope="col" className="px-4 py-3">Generated At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {data.recentReports.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs text-surface-900">{r.id.slice(0, 10)}...</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-surface-500">{r.calculationId.slice(0, 10)}...</td>
                    <td className="px-4 py-3.5 text-xs font-bold text-surface-900">{r.taxYear}</td>
                    <td className="px-4 py-3.5 text-xs capitalize text-surface-700">{r.calculatorType}</td>
                    <td className="px-4 py-3.5 text-xs">
                      <span className="px-2 py-0.5 rounded-full font-semibold bg-brand-50 text-brand-700">
                        {r.accessTier}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-surface-500">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
