"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Sliders,
  Shield,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Calculator,
  FileSpreadsheet,
  UserCheck,
  Bell,
  CreditCard,
  Megaphone,
  Lock,
  Info,
  Power,
  X,
} from "lucide-react";
import {
  PlatformConfigRecord,
  PlatformConfigKey,
  DANGEROUS_CONFIG_KEYS,
  AnnouncementType,
} from "@/types/platform-config";
import { getSessionToken } from "@/lib/utils/auth-client";

export default function AdminConfigurationPage() {
  const [configs, setConfigs] = useState<PlatformConfigRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dangerous action confirmation modal state
  const [pendingDangerousAction, setPendingDangerousAction] = useState<{
    key: PlatformConfigKey;
    newValue: unknown;
    expectedVersion: number;
    title: string;
    consequence: string;
  } | null>(null);

  const fetchConfigs = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const token = getSessionToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/v1/admin/config", { headers });
      if (!res.ok) {
        throw new Error(
          res.status === 403
            ? "Access denied. Administrator privileges required."
            : "Unable to load platform configuration."
        );
      }

      const json = await res.json();
      if (json.success && json.data) {
        setConfigs(json.data);
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Error loading configurations."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const executeUpdate = async (
    key: PlatformConfigKey,
    value: unknown,
    expectedVersion: number
  ) => {
    setUpdatingKey(key);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const token = getSessionToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/v1/admin/config", {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          key,
          value,
          expectedVersion,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(
          json.error?.message || "Failed to update configuration setting."
        );
      }

      const updatedRecord: PlatformConfigRecord = json.data;
      setConfigs((prev) =>
        prev.map((c) => (c.key === key ? updatedRecord : c))
      );
      setSuccessMessage(`Updated '${key}' successfully (v${updatedRecord.version}).`);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to apply configuration."
      );
    } finally {
      setUpdatingKey(null);
      setPendingDangerousAction(null);
    }
  };

  const handleToggleBoolean = (item: PlatformConfigRecord) => {
    const nextVal = !item.value;

    // Check if this action is considered operationally dangerous
    const isDangerous =
      DANGEROUS_CONFIG_KEYS.includes(item.key) &&
      ((item.key === "platform.maintenance_mode" && nextVal === true) ||
        (item.key !== "platform.maintenance_mode" && nextVal === false));

    if (isDangerous) {
      let consequence = "This action will alter critical platform behavior.";
      if (item.key === "platform.maintenance_mode") {
        consequence =
          "Enabling Maintenance Mode will block standard taxpayer traffic. Only administrators will have access to the platform.";
      } else if (item.key === "ai.assistant_enabled") {
        consequence =
          "Disabling the AI Assistant will prevent users from submitting new AI queries. Saved conversation history will remain accessible.";
      } else if (item.key === "auth.registration_enabled") {
        consequence =
          "Disabling registration will block all new user signups. Existing users can continue to log in.";
      } else if (item.key === "billing.enabled") {
        consequence =
          "Disabling billing will prevent new premium checkouts. Existing subscriptions remain intact.";
      }

      setPendingDangerousAction({
        key: item.key,
        newValue: nextVal,
        expectedVersion: item.version,
        title: `Confirm: Change ${item.key}?`,
        consequence,
      });
      return;
    }

    executeUpdate(item.key, nextVal, item.version);
  };

  const handleTextSave = (item: PlatformConfigRecord, newText: string) => {
    executeUpdate(item.key, newText, item.version);
  };

  const getConfig = (key: PlatformConfigKey): PlatformConfigRecord | undefined => {
    return configs.find((c) => c.key === key);
  };

  const renderToggleRow = (key: PlatformConfigKey, label: string) => {
    const item = getConfig(key);
    if (!item) return null;

    const isChecked = Boolean(item.value);
    const isBusy = updatingKey === key;

    return (
      <div className="py-3 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-surface-900">{label}</span>
            <span className="text-[10px] font-mono text-surface-400">
              v{item.version}
            </span>
          </div>
          <p className="text-xs text-surface-500">{item.description}</p>
        </div>

        <button
          type="button"
          disabled={isBusy}
          onClick={() => handleToggleBoolean(item)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
            isChecked ? "bg-brand-600" : "bg-surface-300"
          }`}
          role="switch"
          aria-checked={isChecked}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              isChecked ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-4">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-200">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-6 h-6 text-brand-600" />
            <h1 className="text-2xl font-bold text-surface-900 tracking-tight">
              Platform Configuration &amp; Feature Flags
            </h1>
          </div>
          <p className="text-xs text-surface-500 mt-1">
            Centralized server-authoritative controls, maintenance switches, and feature availability.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchConfigs}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface-900 text-white hover:bg-surface-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh Settings</span>
        </button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Non-Editable Tax Rule Invariant Callout */}
      <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <strong className="block font-bold">Tax Engine Rules Invariant:</strong>
          Federal statutory tax brackets, standard deductions, and self-employment calculation formulas are code-controlled, versioned, and immutable at runtime. They cannot be edited via platform configuration.
        </div>
      </div>

      {isLoading && configs.length === 0 ? (
        <div className="py-24 text-center text-xs text-surface-500">
          Loading platform configurations...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Platform & Maintenance */}
          <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider flex items-center gap-2">
              <Power className="w-4 h-4 text-red-600" />
              <span>Platform &amp; Maintenance Mode</span>
            </h2>
            <div className="divide-y divide-surface-100">
              {renderToggleRow("platform.maintenance_mode", "Maintenance Mode (Full Lockdown)")}
              {renderToggleRow("platform.maintenance_banner_enabled", "Maintenance Banner Only (Non-blocking)")}
            </div>
          </div>

          {/* Section 2: System Announcements */}
          <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-amber-600" />
              <span>Site-Wide System Announcement</span>
            </h2>
            <div className="divide-y divide-surface-100">
              {renderToggleRow("announcement.enabled", "Broadcast Announcement Active")}
            </div>
          </div>

          {/* Section 3: Authentication & Registration */}
          <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>Authentication &amp; User Signups</span>
            </h2>
            <div className="divide-y divide-surface-100">
              {renderToggleRow("auth.registration_enabled", "New Taxpayer Registration")}
              {renderToggleRow("auth.new_user_signup_enabled", "Signup Flow Enabled")}
              {renderToggleRow("auth.password_reset_enabled", "Password Recovery Allowed")}
            </div>
          </div>

          {/* Section 4: Deterministic Calculators */}
          <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider flex items-center gap-2">
              <Calculator className="w-4 h-4 text-blue-600" />
              <span>Federal Tax Calculators</span>
            </h2>
            <div className="divide-y divide-surface-100">
              {renderToggleRow("calculators.federal_income_enabled", "Federal Income Tax Calculator")}
              {renderToggleRow("calculators.self_employed_enabled", "Self-Employed (Schedule C) Calculator")}
              {renderToggleRow("calculators.tax_1099_enabled", "1099 Contractor Tax Calculator")}
              {renderToggleRow("calculators.quarterly_enabled", "Quarterly Estimated (1040-ES) Calculator")}
            </div>
          </div>

          {/* Section 5: AI Tax Assistant */}
          <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>AI Conversational Tax Assistant</span>
            </h2>
            <div className="divide-y divide-surface-100">
              {renderToggleRow("ai.assistant_enabled", "AI Assistant Available")}
              {renderToggleRow("ai.daily_limit_enforcement_enabled", "Daily Quota Enforcement (10 free / 100 premium)")}
            </div>
          </div>

          {/* Section 6: Tax Reports & Summaries */}
          <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-teal-600" />
              <span>Tax Reports &amp; Documentation</span>
            </h2>
            <div className="divide-y divide-surface-100">
              {renderToggleRow("reports.basic_reports_enabled", "Basic Calculation Reports")}
              {renderToggleRow("reports.premium_reports_enabled", "Premium Comprehensive Summary Reports")}
            </div>
          </div>

          {/* Section 7: CPA / EA Professional Handoff */}
          <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              <span>CPA / Enrolled Agent Handoff</span>
            </h2>
            <div className="divide-y divide-surface-100">
              {renderToggleRow("professionals.handoff_enabled", "Consultation Submissions Enabled")}
              {renderToggleRow("professionals.leads_enabled", "Lead Routing Enabled")}
            </div>
          </div>

          {/* Section 8: Billing & Subscriptions */}
          <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-600" />
              <span>Monetization &amp; Billing</span>
            </h2>
            <div className="divide-y divide-surface-100">
              {renderToggleRow("billing.enabled", "Billing Subsystem Active")}
              {renderToggleRow("billing.premium_checkout_enabled", "Premium Plan Upgrades Allowed")}
            </div>
          </div>

          {/* Section 9: Notifications */}
          <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-600" />
              <span>Notification Channels</span>
            </h2>
            <div className="divide-y divide-surface-100">
              {renderToggleRow("notifications.in_app_enabled", "In-App Notification Center")}
              {renderToggleRow("notifications.email_enabled", "Transactional Email Delivery")}
            </div>
          </div>

          {/* Section 10: Security & Rate Limits */}
          <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-700" />
              <span>Security &amp; Rate Limiting</span>
            </h2>
            <div className="divide-y divide-surface-100">
              {renderToggleRow("security.login_rate_limit_enabled", "Authentication Rate Limiting")}
              {renderToggleRow("security.ai_rate_limit_enabled", "AI Endpoint Rate Limiting")}
              {renderToggleRow("security.recovery_rate_limit_enabled", "Password Recovery Rate Limiting")}
            </div>
          </div>
        </div>
      )}

      {/* Dangerous Action Confirmation Modal */}
      {pendingDangerousAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-surface-200 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5 text-red-600">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="text-sm font-bold text-surface-900">
                  {pendingDangerousAction.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPendingDangerousAction(null)}
                className="text-surface-400 hover:text-surface-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-red-50 rounded-xl border border-red-100 text-xs text-red-800 leading-relaxed">
              {pendingDangerousAction.consequence}
            </div>

            <p className="text-xs text-surface-500">
              This operational change will take effect immediately across all servers and user sessions.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingDangerousAction(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-surface-200 text-surface-700 hover:bg-surface-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  executeUpdate(
                    pendingDangerousAction.key,
                    pendingDangerousAction.newValue,
                    pendingDangerousAction.expectedVersion
                  )
                }
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-600 text-white hover:bg-red-700 shadow-xs"
              >
                Confirm &amp; Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
