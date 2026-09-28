"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { fetchUserProfile, updateUserProfile } from "@/lib/utils/user-profile-api";
import { signOut, getSessionToken } from "@/lib/utils/auth-client";
import { UserProfile, TaxProfile } from "@/types/supabase";
import { TaxYear } from "@/types/tax";
import {
  User,
  Mail,
  ShieldCheck,
  Calendar,
  Lock,
  LogOut,
  Save,
  CheckCircle2,
  AlertTriangle,
  Bell,
} from "lucide-react";

export default function DashboardSettingsPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [taxProfile, setTaxProfile] = useState<TaxProfile | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingTaxProfile, setIsSavingTaxProfile] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  // Form states
  const [fullName, setFullName] = useState("");
  const [defaultYear, setDefaultYear] = useState<string>("2025");
  const [defaultFilingStatus, setDefaultFilingStatus] = useState<string>("single");
  const [hasW2, setHasW2] = useState<boolean>(true);
  const [has1099, setHas1099] = useState<boolean>(false);
  const [hasBusinessExpenses, setHasBusinessExpenses] = useState<boolean>(false);
  const [stateOfResidence, setStateOfResidence] = useState<string>("");

  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [taxProfileSuccess, setTaxProfileSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const token = getSessionToken();
    setSessionToken(token);

    const res = await fetchUserProfile();
    setIsLoading(false);

    if (res.success && res.data) {
      const { profile: p, taxProfile: tp } = res.data;
      setProfile(p);
      setTaxProfile(tp);

      setFullName(p.fullName || "");
      setDefaultYear(tp.defaultTaxYear.toString());
      setDefaultFilingStatus(tp.filingStatus);
      setHasW2(tp.hasW2Income);
      setHas1099(tp.has1099Income);
      setHasBusinessExpenses(tp.hasBusinessExpenses);
      setStateOfResidence(tp.stateOfResidence || "");
    } else {
      setErrorMessage(res.error || "Unable to load user profile.");
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSuccess(null);
    setErrorMessage(null);

    const res = await updateUserProfile({
      profile: { fullName: fullName.trim() || null },
    });
    setIsSavingProfile(false);

    if (res.success && res.data) {
      setProfile(res.data.profile);
      setProfileSuccess("User profile information saved successfully.");
      setTimeout(() => setProfileSuccess(null), 4000);
    } else {
      setErrorMessage(res.error || "Failed to update profile.");
    }
  };

  const handleSaveTaxProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingTaxProfile(true);
    setTaxProfileSuccess(null);
    setErrorMessage(null);

    const parsedYear = parseInt(defaultYear, 10) as TaxYear;

    const res = await updateUserProfile({
      taxProfile: {
        defaultTaxYear: parsedYear,
        filingStatus: defaultFilingStatus as TaxProfile["filingStatus"],
        hasW2Income: hasW2,
        has1099Income: has1099,
        hasBusinessExpenses,
        stateOfResidence: stateOfResidence.trim() || undefined,
      },
    });
    setIsSavingTaxProfile(false);

    if (res.success && res.data) {
      setTaxProfile(res.data.taxProfile);
      setTaxProfileSuccess("Taxpayer default preferences updated successfully.");
      setTimeout(() => setTaxProfileSuccess(null), 4000);
    } else {
      setErrorMessage(res.error || "Failed to update tax profile preferences.");
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
    router.push("/login?loggedOut=true");
    router.refresh();
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "Active";
    try {
      return new Date(isoString).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch (_err) {
      return isoString;
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading your account settings and taxpayer profile..." />;
  }

  if (errorMessage && !profile) {
    return (
      <ErrorState
        title="Could not load account settings"
        message={errorMessage}
        retryAction={loadData}
      />
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-xl sm:text-2xl font-bold text-surface-900">
            Account &amp; Tax Settings
          </h2>
          <Badge variant="emerald" size="sm" className="gap-1">
            <ShieldCheck className="w-3 h-3" />
            Verified Session
          </Badge>
        </div>
        <p className="text-xs sm:text-sm text-surface-500">
          Manage your personal account identity, default tax parameters, and session security.
        </p>
      </div>

      {errorMessage && (
        <Alert variant="error" title="Settings Error">
          {errorMessage}
        </Alert>
      )}

      {/* Section 1: User Account Profile */}
      <Card className="shadow-card border-surface-200">
        <CardHeader className="pb-3 border-b border-surface-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-surface-900 flex items-center gap-2">
              <User className="w-4 h-4 text-brand-600" />
              Taxpayer Identity &amp; Profile
            </CardTitle>
            <p className="text-xs text-surface-500 mt-0.5">
              Personal information associated with your verified TaxAIHelp account.
            </p>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          {profileSuccess && (
            <Alert variant="success" title="Profile Saved">
              {profileSuccess}
            </Alert>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Email Address" id="profileEmail">
                <div className="relative">
                  <Input
                    id="profileEmail"
                    value={profile?.email || ""}
                    disabled
                    className="bg-surface-50 text-surface-600 pl-9 font-mono text-xs sm:text-sm"
                  />
                  <Mail className="w-4 h-4 text-surface-400 absolute left-3 top-3 pointer-events-none" />
                </div>
                <span className="text-[11px] text-surface-400 mt-1 block">
                  Email identity verified by server session.
                </span>
              </FormField>

              <FormField label="Display / Full Name" id="profileFullName">
                <Input
                  id="profileFullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  disabled={isSavingProfile}
                  className="bg-white"
                />
                <span className="text-[11px] text-surface-400 mt-1 block">
                  Used for calculation titles and greeting.
                </span>
              </FormField>
            </div>

            {/* Profile Metadata */}
            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-surface-500 border-t border-surface-100">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-surface-400" />
                <span>Member Since: <strong>{formatDate(profile?.createdAt)}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Server-Derived Identity: <strong>Active</strong></span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                size="sm"
                variant="primary"
                disabled={isSavingProfile}
                isLoading={isSavingProfile}
                className="gap-1.5 font-semibold text-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Profile Changes</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Section 2: Taxpayer Preferences */}
      <Card className="shadow-card border-surface-200">
        <CardHeader className="pb-3 border-b border-surface-100">
          <CardTitle className="text-base font-bold text-surface-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-600" />
            Tax Calculation Defaults
          </CardTitle>
          <p className="text-xs text-surface-500 mt-0.5">
            Default parameters pre-populated when you launch our deterministic calculators.
          </p>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          {taxProfileSuccess && (
            <Alert variant="success" title="Preferences Saved">
              {taxProfileSuccess}
            </Alert>
          )}

          <form onSubmit={handleSaveTaxProfile} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Default Tax Year" id="settingsYear">
                <Select
                  id="settingsYear"
                  value={defaultYear}
                  onChange={(e) => setDefaultYear(e.target.value)}
                  disabled={isSavingTaxProfile}
                  options={[
                    { label: "2026 (Rev. Proc. 2025-32)", value: "2026" },
                    { label: "2025 (IRS IRB 2025-45 / OBBBA - Standard)", value: "2025" },
                    { label: "2024 (Rev. Proc. 2023-34)", value: "2024" },
                  ]}
                />
              </FormField>

              <FormField label="Default Filing Status" id="settingsStatus">
                <Select
                  id="settingsStatus"
                  value={defaultFilingStatus}
                  onChange={(e) => setDefaultFilingStatus(e.target.value)}
                  disabled={isSavingTaxProfile}
                  options={[
                    { label: "Single", value: "single" },
                    { label: "Married Filing Jointly", value: "married_filing_jointly" },
                    { label: "Married Filing Separately", value: "married_filing_separately" },
                    { label: "Head of Household", value: "head_of_household" },
                    { label: "Qualifying Surviving Spouse", value: "qualifying_surviving_spouse" },
                  ]}
                />
              </FormField>
            </div>

            <FormField label="State of Residence (Informational)" id="settingsState">
              <Input
                id="settingsState"
                value={stateOfResidence}
                onChange={(e) => setStateOfResidence(e.target.value)}
                placeholder="e.g. California, Texas, New York"
                disabled={isSavingTaxProfile}
                maxLength={50}
              />
              <span className="text-[11px] text-surface-400 mt-1 block">
                TaxAIHelp currently computes federal taxes; state guidance is educational only.
              </span>
            </FormField>

            {/* Income Sources Checkboxes */}
            <div className="border-t border-surface-200 pt-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-surface-500">
                Primary Income Sources
              </h4>

              <div className="space-y-2.5">
                <label className="flex items-center gap-3 text-sm text-surface-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasW2}
                    onChange={(e) => setHasW2(e.target.checked)}
                    disabled={isSavingTaxProfile}
                    className="rounded border-surface-300 text-brand-600 focus:ring-brand-500 h-4 w-4"
                  />
                  <span>I earn W-2 wage or salary income from an employer</span>
                </label>

                <label className="flex items-center gap-3 text-sm text-surface-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={has1099}
                    onChange={(e) => setHas1099(e.target.checked)}
                    disabled={isSavingTaxProfile}
                    className="rounded border-surface-300 text-brand-600 focus:ring-brand-500 h-4 w-4"
                  />
                  <span>I receive 1099-NEC / freelance / independent contractor income</span>
                </label>

                <label className="flex items-center gap-3 text-sm text-surface-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasBusinessExpenses}
                    onChange={(e) => setHasBusinessExpenses(e.target.checked)}
                    disabled={isSavingTaxProfile}
                    className="rounded border-surface-300 text-brand-600 focus:ring-brand-500 h-4 w-4"
                  />
                  <span>I claim deductible business expenses on Schedule C</span>
                </label>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                size="sm"
                variant="primary"
                disabled={isSavingTaxProfile}
                isLoading={isSavingTaxProfile}
                className="gap-1.5 font-semibold text-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Tax Preferences</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Section: Communication & Notification Preferences */}
      <Card className="shadow-card border-surface-200">
        <CardHeader className="pb-3 border-b border-surface-100">
          <CardTitle className="text-base font-bold text-surface-900 flex items-center gap-2">
            <Bell className="w-4 h-4 text-brand-600" />
            Communication &amp; Notification Preferences
          </CardTitle>
          <p className="text-xs text-surface-500 mt-0.5">
            Configure alerts for calculation updates, AI capacity thresholds, and report availability.
          </p>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface-50 border border-surface-200">
            <div>
              <span className="text-xs font-bold text-surface-900 block">
                Manage In-App Alerts &amp; Emails
              </span>
              <span className="text-xs text-surface-500 mt-0.5 block">
                Choose which notifications you receive across calculations, reports, and AI quotas.
              </span>
            </div>
            <Link href="/dashboard/settings/notifications">
              <Button variant="outline" size="sm" className="text-xs font-semibold">
                Configure Preferences →
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Session Security & Sign Out */}
      <Card className="shadow-card border-surface-200">
        <CardHeader className="pb-3 border-b border-surface-100">
          <CardTitle className="text-base font-bold text-surface-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-brand-600" />
            Security &amp; Active Session
          </CardTitle>
          <p className="text-xs text-surface-500 mt-0.5">
            Manage your cryptographic session state and authentication tokens.
          </p>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface-50 border border-surface-200">
            <div>
              <span className="text-xs font-bold text-surface-900 block">
                Session Token Status
              </span>
              <span className="text-xs text-surface-500 font-mono mt-0.5 block truncate max-w-sm">
                Token: {sessionToken ? `${sessionToken.slice(0, 16)}...` : "Active Server Session"}
              </span>
            </div>
            <Link href="/forgot-password">
              <Button variant="outline" size="sm" className="text-xs">
                Reset Password →
              </Button>
            </Link>
          </div>

          {/* Sign Out Confirmation */}
          {showSignOutConfirm ? (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span className="font-bold text-sm">Confirm Sign Out?</span>
              </div>
              <p className="text-xs text-red-700">
                Are you sure you want to end your session? Your saved calculations and conversation history will remain safely stored.
              </p>
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="danger"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  isLoading={isSigningOut}
                  className="text-xs"
                >
                  Yes, Sign Out
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowSignOutConfirm(false)}
                  disabled={isSigningOut}
                  className="text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-surface-500">
                End this session and remove stored credentials on this device.
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSignOutConfirm(true)}
                className="text-red-600 border-red-200 hover:bg-red-50 gap-1.5 text-xs font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
