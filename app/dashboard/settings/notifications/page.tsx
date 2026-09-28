"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Shield,
  User,
  Calculator,
  FileText,
  Sparkles,
  CreditCard,
  UserCheck,
  Megaphone,
  BellRing,
  ArrowLeft,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { NotificationPreferences } from "@/lib/notifications/types";
import { getSessionToken } from "@/lib/utils/auth-client";

export default function NotificationPreferencesPage() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
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

      const res = await fetch("/api/v1/notifications/preferences", { headers });
      if (!res.ok) {
        throw new Error("Unable to load notification preferences.");
      }

      const json = await res.json();
      if (json.success && json.data) {
        setPreferences(json.data);
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Error loading communication preferences."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const handleToggle = (key: keyof NotificationPreferences) => {
    if (key === "securityEnabled" || key === "accountEnabled") {
      // Invariant: cannot toggle security or critical account notices
      return;
    }

    if (preferences) {
      setPreferences({
        ...preferences,
        [key]: !preferences[key],
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preferences) return;

    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const token = getSessionToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/v1/notifications/preferences", {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          taxReportsEnabled: preferences.taxReportsEnabled,
          calculationsEnabled: preferences.calculationsEnabled,
          aiUsageEnabled: preferences.aiUsageEnabled,
          billingEnabled: preferences.billingEnabled,
          professionalHandoffEnabled: preferences.professionalHandoffEnabled,
          productUpdatesEnabled: preferences.productUpdatesEnabled,
          marketingEnabled: preferences.marketingEnabled,
        }),
      });

      if (!res.ok) {
        throw new Error("Unable to update notification preferences.");
      }

      const json = await res.json();
      if (json.success && json.data) {
        setPreferences(json.data);
        setSuccessMessage("Your communication preferences have been safely updated.");
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Error saving preferences."
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center text-xs text-surface-500">
        Loading preferences...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-4">
      {/* Header & Back Link */}
      <div className="space-y-2 pb-4 border-b border-surface-200">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Settings</span>
        </Link>
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight">
          Communication &amp; Notification Preferences
        </h1>
        <p className="text-xs text-surface-500">
          Control which notifications, in-app alerts, and transactional emails you receive from TaxAIHelp.
        </p>
      </div>

      {/* Status Messages */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
          {errorMessage}
        </div>
      )}

      {preferences && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Section 1: Security & Account (Required & Locked) */}
          <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-2xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-surface-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>Security &amp; Account Lifecycle (Mandatory)</span>
              </h2>
              <p className="text-xs text-surface-500 mt-0.5">
                These notifications ensure the integrity of your account and cannot be disabled.
              </p>
            </div>

            <div className="divide-y divide-surface-100">
              <div className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-surface-900">Security Alerts</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-100 text-surface-600">
                      <Lock className="w-2.5 h-2.5" /> Required
                    </span>
                  </div>
                  <p className="text-xs text-surface-500">
                    Password changes, session resets, and suspicious account activities.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={true}
                  disabled
                  className="w-4 h-4 rounded text-brand-600 bg-surface-100 cursor-not-allowed"
                />
              </div>

              <div className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-surface-900">Account Notices</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-100 text-surface-600">
                      <Lock className="w-2.5 h-2.5" /> Required
                    </span>
                  </div>
                  <p className="text-xs text-surface-500">
                    Verification links, essential service notices, and data rights requests.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={true}
                  disabled
                  className="w-4 h-4 rounded text-brand-600 bg-surface-100 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Calculations & Reports */}
          <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-2xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-surface-900 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-600" />
                <span>Calculations &amp; Tax Reports</span>
              </h2>
              <p className="text-xs text-surface-500 mt-0.5">
                Notifications regarding saved projections, scenario comparison, and downloadable summaries.
              </p>
            </div>

            <div className="divide-y divide-surface-100">
              <label className="py-3 flex items-center justify-between gap-4 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-surface-900 block">Saved Calculations</span>
                  <p className="text-xs text-surface-500">
                    In-app confirmation when a calculation scenario is safely stored.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.calculationsEnabled}
                  onChange={() => handleToggle("calculationsEnabled")}
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                />
              </label>

              <label className="py-3 flex items-center justify-between gap-4 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-surface-900 block">Tax Summary Reports</span>
                  <p className="text-xs text-surface-500">
                    Notification when a comprehensive printable summary report is generated.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.taxReportsEnabled}
                  onChange={() => handleToggle("taxReportsEnabled")}
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                />
              </label>
            </div>
          </div>

          {/* Section 3: AI Assistant & Billing */}
          <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-2xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-surface-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>AI Assistant &amp; Subscription Billing</span>
              </h2>
              <p className="text-xs text-surface-500 mt-0.5">
                Capacity notifications, daily quota resets, renewal receipts, and plan changes.
              </p>
            </div>

            <div className="divide-y divide-surface-100">
              <label className="py-3 flex items-center justify-between gap-4 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-surface-900 block">AI Quota Alerts</span>
                  <p className="text-xs text-surface-500">
                    Alerts when you approach 80% or 100% of your daily AI queries.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.aiUsageEnabled}
                  onChange={() => handleToggle("aiUsageEnabled")}
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                />
              </label>

              <label className="py-3 flex items-center justify-between gap-4 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-surface-900 block">Billing &amp; Subscriptions</span>
                  <p className="text-xs text-surface-500">
                    Subscription activations, plan upgrades, cancellation confirmations, and payment notices.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.billingEnabled}
                  onChange={() => handleToggle("billingEnabled")}
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                />
              </label>

              <label className="py-3 flex items-center justify-between gap-4 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-surface-900 block">CPA / Enrolled Agent Handoff</span>
                  <p className="text-xs text-surface-500">
                    Status updates on independent professional consultation requests.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.professionalHandoffEnabled}
                  onChange={() => handleToggle("professionalHandoffEnabled")}
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                />
              </label>
            </div>
          </div>

          {/* Section 4: Product Updates & Marketing (Opt-in) */}
          <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-2xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-surface-900 flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-amber-600" />
                <span>Product Updates &amp; Tax Tips (Optional)</span>
              </h2>
              <p className="text-xs text-surface-500 mt-0.5">
                Occasional educational guides and new feature announcements.
              </p>
            </div>

            <div className="divide-y divide-surface-100">
              <label className="py-3 flex items-center justify-between gap-4 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-surface-900 block">Product Releases &amp; Calculators</span>
                  <p className="text-xs text-surface-500">
                    Notices when new tax year rules (e.g. 2026 inflation adjustments) or features launch.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.productUpdatesEnabled}
                  onChange={() => handleToggle("productUpdatesEnabled")}
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                />
              </label>

              <label className="py-3 flex items-center justify-between gap-4 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-surface-900 block">Educational Guides &amp; Insights</span>
                  <p className="text-xs text-surface-500">
                    Curated tax planning insights and deadline reminders.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.marketingEnabled}
                  onChange={() => handleToggle("marketingEnabled")}
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                />
              </label>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 text-white transition-colors shadow-2xs disabled:opacity-50"
            >
              {isSaving ? "Saving Preferences..." : "Save Preferences"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
