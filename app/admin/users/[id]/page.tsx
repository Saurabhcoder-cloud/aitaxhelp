"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Mail,
  Calendar,
  Calculator,
  Sparkles,
  UserCheck,
  Shield,
  Loader2,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";

interface UserDetailResponse {
  account: {
    id: string;
    email: string;
    fullName: string | null;
    role: "user" | "admin";
    createdAt: string;
    updatedAt: string;
  };
  activity: {
    calculationCount: number;
    conversationCount: number;
    leadCount: number;
    recentCalculations: Array<{
      id: string;
      title: string;
      calculatorType: string;
      taxYear: number;
      filingStatus: string;
      createdAt: string;
    }>;
    recentConversations: Array<{
      id: string;
      title: string;
      messageCount: number;
      createdAt: string;
      updatedAt: string;
    }>;
    recentLeads: Array<{
      id: string;
      taxYear: number;
      status: string;
      createdAt: string;
    }>;
  };
  taxProfile: {
    defaultTaxYear: number;
    filingStatus: string;
    hasW2Income: boolean;
    has1099Income: boolean;
    hasBusinessExpenses: boolean;
    stateOfResidence?: string;
    updatedAt: string;
  };
}

export default function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = use(Promise.resolve(params));
  const userId = resolvedParams.id;

  const [user, setUser] = useState<UserDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        setLoading(true);
        const res = await fetch(`/api/v1/admin/users/${userId}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error("User record not found.");
          throw new Error("Failed to load user details.");
        }
        const json = await res.json();
        if (json.success && json.data) {
          setUser(json.data);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error loading user.");
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [userId]);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
        <p className="text-sm font-medium text-surface-600">Loading user operational profile...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 text-sm text-surface-600 hover:text-surface-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Users</span>
        </Link>
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <h3 className="font-semibold text-base mb-1">User Not Found</h3>
          <p className="text-sm">{error || "The requested user account could not be found."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 text-sm font-medium text-surface-600 hover:text-surface-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Users</span>
        </Link>
        <span className="text-xs font-mono text-surface-500 bg-surface-200/60 px-2.5 py-1 rounded-md">
          User ID: {user.account.id}
        </span>
      </div>

      {/* Account Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Account Details & Tax Profile */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-surface-100 pb-3">
              <h2 className="text-lg font-bold text-surface-900">Account Identity</h2>
              {user.account.role === "admin" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <Shield className="w-3 h-3" />
                  <span>Admin</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-100 text-surface-600">
                  User
                </span>
              )}
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider block">Full Name</span>
                <span className="font-medium text-surface-900">{user.account.fullName || "Not provided"}</span>
              </div>

              <div>
                <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider block">Email Address</span>
                <span className="font-medium text-surface-900 flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-4 h-4 text-surface-400" />
                  <span>{user.account.email}</span>
                </span>
              </div>

              <div>
                <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider block">Member Since</span>
                <span className="text-surface-700">{new Date(user.account.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Tax Profile Preferences */}
          <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-surface-900 border-b border-surface-100 pb-3">
              Tax Profile Defaults
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-surface-50 rounded-xl">
                <span className="text-surface-500 font-semibold block uppercase">Default Year</span>
                <span className="text-surface-900 font-bold text-sm mt-0.5 block">{user.taxProfile.defaultTaxYear}</span>
              </div>

              <div className="p-3 bg-surface-50 rounded-xl">
                <span className="text-surface-500 font-semibold block uppercase">Filing Status</span>
                <span className="text-surface-900 font-bold text-sm mt-0.5 block capitalize">
                  {user.taxProfile.filingStatus.replace(/_/g, " ")}
                </span>
              </div>

              <div className="p-3 bg-surface-50 rounded-xl">
                <span className="text-surface-500 font-semibold block uppercase">State of Residence</span>
                <span className="text-surface-900 font-bold text-sm mt-0.5 block">
                  {user.taxProfile.stateOfResidence || "Not set"}
                </span>
              </div>

              <div className="p-3 bg-surface-50 rounded-xl">
                <span className="text-surface-500 font-semibold block uppercase">Income Types</span>
                <span className="text-surface-900 font-bold text-sm mt-0.5 block">
                  {[
                    user.taxProfile.hasW2Income && "W-2",
                    user.taxProfile.has1099Income && "1099",
                    user.taxProfile.hasBusinessExpenses && "Expenses",
                  ]
                    .filter(Boolean)
                    .join(", ") || "Standard"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Activity Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          {/* Activity KPI Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-surface-200 shadow-2xs">
              <div className="flex items-center gap-2 text-surface-500 mb-1">
                <Calculator className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-semibold uppercase">Calculations</span>
              </div>
              <div className="text-2xl font-bold text-surface-900">{user.activity.calculationCount}</div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-surface-200 shadow-2xs">
              <div className="flex items-center gap-2 text-surface-500 mb-1">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-semibold uppercase">AI Sessions</span>
              </div>
              <div className="text-2xl font-bold text-surface-900">{user.activity.conversationCount}</div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-surface-200 shadow-2xs">
              <div className="flex items-center gap-2 text-surface-500 mb-1">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold uppercase">Leads</span>
              </div>
              <div className="text-2xl font-bold text-surface-900">{user.activity.leadCount}</div>
            </div>
          </div>

          {/* Recent Calculations */}
          <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-surface-100 pb-3">
              <h3 className="text-base font-bold text-surface-900 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-purple-600" />
                <span>Recent Calculations</span>
              </h3>
              <span className="text-xs text-surface-500 font-mono">
                {user.activity.recentCalculations.length} items
              </span>
            </div>

            {user.activity.recentCalculations.length === 0 ? (
              <p className="text-sm text-surface-500 text-center py-4">No saved calculations for this user.</p>
            ) : (
              <div className="space-y-2.5">
                {user.activity.recentCalculations.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3.5 bg-surface-50 border border-surface-100 rounded-xl text-sm"
                  >
                    <div>
                      <div className="font-semibold text-surface-900">{c.title}</div>
                      <div className="text-xs text-surface-500">
                        {c.taxYear} &bull; <span className="capitalize">{c.calculatorType}</span> &bull;{" "}
                        <span className="capitalize">{c.filingStatus.replace(/_/g, " ")}</span>
                      </div>
                    </div>
                    <Link
                      href={`/admin/calculations/${c.id}`}
                      className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
                    >
                      <span>Inspect</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
