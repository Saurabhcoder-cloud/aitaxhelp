"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { LoadingState } from "@/components/ui/LoadingState";
import { checkSession } from "@/lib/utils/auth-client";
import { fetchUserProfile, updateUserProfile } from "@/lib/utils/user-profile-api";
import { TaxYear, TaxFilingStatus } from "@/types/tax";
import {
  ShieldCheck,
  User,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  Sparkles,
  HelpCircle,
} from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();

  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  // Form Fields (strictly matching existing profile schema)
  const [fullName, setFullName] = useState("");
  const [stateOfResidence, setStateOfResidence] = useState("");
  const [defaultTaxYear, setDefaultTaxYear] = useState<TaxYear>(2025);
  const [filingStatus, setFilingStatus] = useState<TaxFilingStatus>("single");
  const [hasW2Income, setHasW2Income] = useState(true);
  const [has1099Income, setHas1099Income] = useState(false);
  const [hasBusinessExpenses, setHasBusinessExpenses] = useState(false);

  // Check authenticated session and pre-fill any existing profile fields
  useEffect(() => {
    async function init() {
      const user = await checkSession();
      if (!user) {
        router.push("/login?redirectTo=/onboarding");
        return;
      }

      try {
        const res = await fetchUserProfile();
        if (res.success && res.data) {
          const { profile, taxProfile } = res.data;
          if (profile.fullName) setFullName(profile.fullName);
          if (taxProfile.stateOfResidence) setStateOfResidence(taxProfile.stateOfResidence);
          if (taxProfile.defaultTaxYear) setDefaultTaxYear(taxProfile.defaultTaxYear);
          if (taxProfile.filingStatus) setFilingStatus(taxProfile.filingStatus);
          if (taxProfile.hasW2Income !== undefined) setHasW2Income(taxProfile.hasW2Income);
          if (taxProfile.has1099Income !== undefined) setHas1099Income(taxProfile.has1099Income);
          if (taxProfile.hasBusinessExpenses !== undefined) setHasBusinessExpenses(taxProfile.hasBusinessExpenses);
        }
      } catch (_err) {
        // Fallback silently if offline
      } finally {
        setIsLoadingAuth(false);
      }
    }

    init();
  }, [router]);

  const handleNextStep = () => {
    setErrorMessage(null);
    if (currentStep === 1) {
      if (!fullName.trim()) {
        setErrorMessage("Please enter your display name to personalize your workspace.");
        return;
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const handlePrevStep = () => {
    setErrorMessage(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSkip = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("taxaihelp_onboarding_skipped", "true");
    }
    router.push("/dashboard");
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await updateUserProfile({
        profile: {
          fullName: fullName.trim() || null,
        },
        taxProfile: {
          defaultTaxYear,
          filingStatus,
          hasW2Income,
          has1099Income,
          hasBusinessExpenses,
          stateOfResidence: stateOfResidence.trim() || undefined,
        },
      });

      if (!res.success) {
        throw new Error(res.error || "Failed to save profile.");
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem("taxaihelp_onboarding_completed", "true");
      }

      setIsCompleted(true);
      setTimeout(() => {
        router.push("/dashboard?onboarding=complete");
        router.refresh();
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to complete onboarding.";
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="py-20 min-h-[calc(100vh-4rem)] flex items-center justify-center bg-surface-50">
        <LoadingState message="Verifying session and loading setup..." />
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="py-20 min-h-[calc(100vh-4rem)] flex items-center justify-center bg-surface-50">
        <Container size="sm">
          <Card className="shadow-card border-surface-200 p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-surface-900">
              Tax Profile Personalization Complete!
            </h2>
            <p className="text-sm text-surface-600 max-w-sm mx-auto">
              Your default filing status and tax year will automatically prefill calculators and personalize AI explanations.
            </p>
            <div className="pt-2">
              <span className="text-xs font-semibold text-brand-600 animate-pulse">
                Redirecting to your dashboard...
              </span>
            </div>
          </Card>
        </Container>
      </div>
    );
  }

  return (
    <div className="py-12 sm:py-16 bg-surface-50 min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <Container size="sm">
        {/* Onboarding Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 mb-2">
            <Badge variant="emerald" size="sm" className="gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              1-Minute Personalization
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-900 tracking-tight">
            Customize your Tax Workspace
          </h1>
          <p className="text-xs sm:text-sm text-surface-600 mt-1 max-w-sm mx-auto">
            Set default assumptions to prefill federal tax calculators and streamline AI explanations.
          </p>

          {/* Stepper Progress Indicator */}
          <div className="mt-6 flex items-center justify-center gap-2 max-w-xs mx-auto">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex-1 flex flex-col items-center">
                <div
                  className={`h-1.5 w-full rounded-full transition-colors ${
                    stepNum <= currentStep ? "bg-brand-600" : "bg-surface-200"
                  }`}
                />
                <span className="text-[10px] text-surface-500 font-semibold mt-1">
                  Step {stepNum}
                </span>
              </div>
            ))}
          </div>
        </div>

        {errorMessage && (
          <Alert variant="error" title="Setup Error" className="mb-6">
            {errorMessage}
          </Alert>
        )}

        {/* Wizard Form Card */}
        <Card className="shadow-card border-surface-200 p-6 sm:p-8">
          {/* STEP 1: Taxpayer Identity */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 pb-2 border-b border-surface-100">
                <User className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-base text-surface-900">
                  Taxpayer Identity &amp; Region
                </h3>
              </div>

              <FormField
                label="Full Name / Display Name"
                id="onboardFullName"
                hint="Used to identify saved calculation scenarios and greeting."
                required
              >
                <Input
                  id="onboardFullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Taylor Morgan"
                  maxLength={100}
                  autoFocus
                />
              </FormField>

              <FormField
                label="State of Residence (Optional / Informational)"
                id="onboardState"
                hint="Federal tax rules apply nationwide; state rules are educational only."
              >
                <Input
                  id="onboardState"
                  value={stateOfResidence}
                  onChange={(e) => setStateOfResidence(e.target.value)}
                  placeholder="e.g. Washington, California, Texas"
                  maxLength={50}
                />
              </FormField>
            </div>
          )}

          {/* STEP 2: Federal Tax Defaults */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 pb-2 border-b border-surface-100">
                <FileCheck2 className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-base text-surface-900">
                  Filing Status &amp; Default Tax Year
                </h3>
              </div>

              <FormField
                label="Default Tax Year"
                id="onboardTaxYear"
                hint="Pre-selected when you open any of our deterministic calculators."
                required
              >
                <Select
                  id="onboardTaxYear"
                  value={defaultTaxYear.toString()}
                  onChange={(e) => setDefaultTaxYear(Number(e.target.value) as TaxYear)}
                  options={[
                    { label: "2026 (Rev. Proc. 2025-32)", value: "2026" },
                    { label: "2025 (IRS IRB 2025-45 / OBBBA - Standard)", value: "2025" },
                    { label: "2024 (Rev. Proc. 2023-34)", value: "2024" },
                  ]}
                />
              </FormField>

              <FormField
                label="Default Filing Status"
                id="onboardFilingStatus"
                hint="Determines standard deduction and statutory tax bracket thresholds."
                required
              >
                <Select
                  id="onboardFilingStatus"
                  value={filingStatus}
                  onChange={(e) => setFilingStatus(e.target.value as TaxFilingStatus)}
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
          )}

          {/* STEP 3: Primary Income Sources */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 pb-2 border-b border-surface-100">
                <Sparkles className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-base text-surface-900">
                  Your Primary Income Streams
                </h3>
              </div>
              <p className="text-xs text-surface-600">
                Select your income types so your dashboard can highlight the most relevant calculators for your situation.
              </p>

              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-3 p-3 rounded-xl border border-surface-200 hover:bg-surface-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={hasW2Income}
                    onChange={(e) => setHasW2Income(e.target.checked)}
                    className="mt-0.5 rounded border-surface-300 text-brand-600 focus:ring-brand-500 h-4 w-4"
                  />
                  <div>
                    <span className="text-sm font-semibold text-surface-900 block">
                      W-2 Employee Wages / Salary
                    </span>
                    <span className="text-xs text-surface-500 block">
                      Taxes withheld by employer via Form W-2
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl border border-surface-200 hover:bg-surface-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={has1099Income}
                    onChange={(e) => setHas1099Income(e.target.checked)}
                    className="mt-0.5 rounded border-surface-300 text-brand-600 focus:ring-brand-500 h-4 w-4"
                  />
                  <div>
                    <span className="text-sm font-semibold text-surface-900 block">
                      1099 Contractor / Freelance Income
                    </span>
                    <span className="text-xs text-surface-500 block">
                      Self-employment income reported on 1099-NEC or 1099-K
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl border border-surface-200 hover:bg-surface-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={hasBusinessExpenses}
                    onChange={(e) => setHasBusinessExpenses(e.target.checked)}
                    className="mt-0.5 rounded border-surface-300 text-brand-600 focus:ring-brand-500 h-4 w-4"
                  />
                  <div>
                    <span className="text-sm font-semibold text-surface-900 block">
                      Schedule C Business Deductions
                    </span>
                    <span className="text-xs text-surface-500 block">
                      Equipment, software subscriptions, vehicle, or home office expenses
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="mt-8 pt-4 border-t border-surface-100 flex items-center justify-between gap-3">
            <div>
              {currentStep > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePrevStep}
                  disabled={isSubmitting}
                  className="gap-1.5 text-xs font-semibold"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  disabled={isSubmitting}
                  className="text-xs text-surface-500 hover:text-surface-800"
                >
                  Skip for now
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {currentStep < 3 ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleNextStep}
                  className="gap-1.5 text-xs font-semibold"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleComplete}
                  disabled={isSubmitting}
                  isLoading={isSubmitting}
                  className="gap-1.5 text-xs font-semibold"
                >
                  <span>Save &amp; Enter Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Footer reassurance */}
        <div className="mt-6 text-center text-xs text-surface-500 flex items-center justify-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-surface-400" />
          <span>You can always update these defaults later in your Account Settings.</span>
        </div>
      </Container>
    </div>
  );
}
