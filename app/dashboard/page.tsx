"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { fetchCalculationHistory } from "@/lib/utils/calculation-history-api";
import { fetchUserConversations } from "@/lib/utils/ai-assistant-api";
import { fetchUserProfile } from "@/lib/utils/user-profile-api";
import { TaxCalculationRecord, CalculatorType } from "@/types/tax";
import { ConversationSummary } from "@/types/ai";
import { UserProfile, TaxProfile } from "@/types/supabase";
import { formatCurrencyFromCents } from "@/lib/utils/currency";
import {
  Sparkles,
  Calculator,
  ArrowRight,
  Clock,
  History,
  ShieldCheck,
  PlusCircle,
} from "lucide-react";

function getCalculatorTypeLabel(type: CalculatorType): string {
  switch (type) {
    case "income_tax":
      return "Federal Income Tax";
    case "self_employed":
      return "Schedule SE";
    case "1099":
      return "1099 Contractor";
    case "quarterly_tax":
      return "Quarterly 1040-ES";
    default:
      return "Tax Calculator";
  }
}

function formatFilingStatusLabel(status?: string): string {
  switch (status) {
    case "single":
      return "Single";
    case "married_filing_jointly":
      return "Married Joint";
    case "married_filing_separately":
      return "Married Sep.";
    case "head_of_household":
      return "Head of House";
    case "qualifying_surviving_spouse":
      return "Surviving Spouse";
    default:
      return "Single";
  }
}

export default function DashboardOverviewPage() {
  const [calculations, setCalculations] = useState<TaxCalculationRecord[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [taxProfile, setTaxProfile] = useState<TaxProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dismissOnboardingBanner, setDismissOnboardingBanner] = useState<boolean>(false);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    const [calcRes, convRes, profRes] = await Promise.all([
      fetchCalculationHistory(),
      fetchUserConversations(),
      fetchUserProfile(),
    ]);

    if (calcRes.success && calcRes.data) {
      setCalculations(calcRes.data);
    }
    if (convRes.success && convRes.data) {
      setConversations(convRes.data);
    }
    if (profRes.success && profRes.data) {
      setUserProfile(profRes.data.profile);
      setTaxProfile(profRes.data.taxProfile);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const recentCalculations = calculations.slice(0, 3);
  const recentConversations = conversations.slice(0, 3);

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (_err) {
      return isoString;
    }
  };

  const showOnboardingPrompt =
    !dismissOnboardingBanner &&
    (!userProfile?.fullName || (typeof window !== "undefined" && !window.localStorage.getItem("taxaihelp_onboarding_completed")));

  return (
    <div className="space-y-8">
      {/* Onboarding / Personalization Reminder Banner */}
      {showOnboardingPrompt && (
        <div className="p-4 sm:p-5 rounded-xl bg-brand-50 border border-brand-200 text-brand-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-sm block">Personalize your Tax Workspace</span>
              <p className="text-xs text-brand-800 mt-0.5">
                Set your default tax year, filing status, and income streams to automatically prefill calculators and tailor AI explanations.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/onboarding">
              <Button size="sm" variant="primary" className="text-xs font-semibold shadow-xs">
                Start Setup (1 min) →
              </Button>
            </Link>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDismissOnboardingBanner(true)}
              className="text-xs text-brand-700 hover:text-brand-900"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-brand-900 via-navy-900 to-navy-950 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-card">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="emerald" size="sm" className="gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Tax Season Active
            </Badge>
            <Badge variant="neutral" size="sm" className="bg-navy-900/80 text-surface-300 border-navy-700">
              Tax Year {taxProfile?.defaultTaxYear ?? 2025}
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {userProfile?.fullName || "Taxpayer"}
          </h1>
          <p className="text-xs sm:text-sm text-surface-300 max-w-xl leading-relaxed">
            Model deterministic federal taxes, track 1040-ES quarterly installments, and ask our AI assistant for plain-English explanations backed by verified formulas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 sm:gap-3 shrink-0">
          <Button href="/dashboard/taxes" size="sm" className="bg-white text-navy-950 hover:bg-surface-100 font-semibold shadow-sm">
            Start My Taxes
          </Button>
          <Button href="/tax-calculators" size="sm" variant="outline-dark">
            Run Calculation
          </Button>
          <Button href="/ai-tax-assistant" variant="outline-dark" size="sm">
            Ask AI Assistant
          </Button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
        <Card className="p-4 sm:p-5">
          <span className="text-[11px] font-semibold text-surface-500 uppercase tracking-wider block">
            Default Tax Year
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-surface-900 mt-1.5 block font-mono">
            {taxProfile?.defaultTaxYear ?? 2025}
          </span>
          <p className="text-[11px] text-surface-500 mt-1">IRS statutory baseline</p>
        </Card>

        <Card className="p-4 sm:p-5">
          <span className="text-[11px] font-semibold text-surface-500 uppercase tracking-wider block">
            Default Status
          </span>
          <span className="text-xl sm:text-2xl font-extrabold text-surface-900 mt-1.5 block truncate">
            {formatFilingStatusLabel(taxProfile?.filingStatus)}
          </span>
          <p className="text-[11px] text-surface-500 mt-1">Standard deduction basis</p>
        </Card>

        <Link href="/dashboard/calculations" className="block focus:outline-none">
          <Card className="p-4 sm:p-5 hover:border-brand-300 hover:shadow-card-hover transition-all cursor-pointer">
            <span className="text-[11px] font-semibold text-surface-500 uppercase tracking-wider block">
              Saved Scenarios
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-brand-700 mt-1.5 block font-mono">
              {calculations.length}
            </span>
            <p className="text-[11px] text-brand-600 mt-1 font-medium flex items-center gap-1">
              View calculations →
            </p>
          </Card>
        </Link>

        <Link href="/dashboard/conversations" className="block focus:outline-none">
          <Card className="p-4 sm:p-5 hover:border-brand-300 hover:shadow-card-hover transition-all cursor-pointer">
            <span className="text-[11px] font-semibold text-surface-500 uppercase tracking-wider block">
              AI Tax Sessions
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700 mt-1.5 block font-mono">
              {conversations.length}
            </span>
            <p className="text-[11px] text-emerald-600 mt-1 font-medium flex items-center gap-1">
              Past sessions →
            </p>
          </Card>
        </Link>
      </div>

      {isLoading ? (
        <LoadingState message="Loading your dashboard activity..." />
      ) : (
        /* Recent Activity Grid: Calculations & Conversations */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Calculations Section */}
          <Card className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-surface-200">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-brand-600" />
                  <h2 className="text-base font-bold text-surface-900">Recent Calculations</h2>
                </div>
                <Link
                  href="/dashboard/calculations"
                  className="text-xs font-semibold text-brand-600 hover:text-brand-800 transition-colors"
                >
                  View All ({calculations.length}) →
                </Link>
              </div>

              {recentCalculations.length === 0 ? (
                <div className="py-8 text-center bg-surface-50/70 rounded-xl border border-dashed border-surface-200">
                  <p className="text-xs text-surface-500 mb-3">No saved calculations found yet.</p>
                  <Button href="/tax-calculators" size="sm" variant="outline" className="text-xs">
                    Run a Tax Calculator
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentCalculations.map((calc) => {
                    const isQuarterly = calc.calculatorType === "quarterly_tax";
                    const res = calc.resultSnapshot;
                    return (
                      <div
                        key={calc.id}
                        className="p-3 sm:p-3.5 rounded-xl border border-surface-200 hover:border-surface-300 bg-white transition-all space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-bold text-sm text-surface-900 line-clamp-1">
                              {calc.title}
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              <Badge variant="brand" size="sm" className="text-[10px]">
                                {getCalculatorTypeLabel(calc.calculatorType)}
                              </Badge>
                              <span className="text-[11px] text-surface-400">
                                {formatDate(calc.createdAt)}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-bold text-surface-900 font-mono block">
                              {isQuarterly && res.quarterlyBreakdown
                                ? formatCurrencyFromCents(res.quarterlyBreakdown.quarterlyPaymentCents)
                                : formatCurrencyFromCents(res.totalTaxLiabilityCents)}
                            </span>
                            <span className="text-[10px] text-surface-400 block">
                              {isQuarterly ? "Per Quarter" : `Effective ${(res.effectiveTaxRate * 100).toFixed(1)}%`}
                            </span>
                          </div>
                        </div>

                        {/* Calculation Actions */}
                        <div className="pt-2 border-t border-surface-100 flex items-center justify-between gap-2">
                          <Link href={`/ai-tax-assistant?calculationId=${encodeURIComponent(calc.id)}`}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs font-semibold text-brand-700 hover:text-brand-900 gap-1"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                              Explain with AI
                            </Button>
                          </Link>

                          <Link href={`/dashboard/calculations/${calc.id}`}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2.5 text-xs font-medium text-surface-700"
                            >
                              View Detail →
                            </Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-surface-100 text-right">
              <Link
                href="/tax-calculators"
                className="text-xs font-semibold text-brand-700 hover:text-brand-900 inline-flex items-center gap-1"
              >
                + New Calculation
              </Link>
            </div>
          </Card>

          {/* Recent Conversations Section */}
          <Card className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-surface-200">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-600" />
                  <h2 className="text-base font-bold text-surface-900">Recent AI Sessions</h2>
                </div>
                <Link
                  href="/dashboard/conversations"
                  className="text-xs font-semibold text-brand-600 hover:text-brand-800 transition-colors"
                >
                  View All ({conversations.length}) →
                </Link>
              </div>

              {recentConversations.length === 0 ? (
                <div className="py-8 text-center bg-surface-50/70 rounded-xl border border-dashed border-surface-200">
                  <p className="text-xs text-surface-500 mb-3">No AI conversation sessions started yet.</p>
                  <Button href="/ai-tax-assistant" size="sm" className="text-xs gap-1.5">
                    <PlusCircle className="w-3.5 h-3.5" />
                    Ask AI Tax Assistant
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentConversations.map((conv) => (
                    <div
                      key={conv.id}
                      className="p-3 sm:p-3.5 rounded-xl border border-surface-200 hover:border-surface-300 bg-white transition-all space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <span className="font-bold text-sm text-surface-900 line-clamp-1">
                            {conv.title}
                          </span>
                          <div className="flex items-center gap-2 text-[11px] text-surface-400 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(conv.updatedAt)}
                            </span>
                            <span>•</span>
                            <span>{conv.messageCount} msgs</span>
                          </div>
                        </div>

                        <Badge variant="neutral" size="sm" className="text-[10px]">
                          Active
                        </Badge>
                      </div>

                      {conv.lastMessage && (
                        <p className="text-xs text-surface-600 line-clamp-1 italic bg-surface-50/60 p-1.5 rounded border border-surface-100">
                          &ldquo;{conv.lastMessage}&rdquo;
                        </p>
                      )}

                      <div className="pt-2 border-t border-surface-100 flex items-center justify-between">
                        <span className="text-[10px] text-surface-400 font-mono">
                          ID: {conv.id.slice(0, 8)}...
                        </span>
                        <Link href={`/ai-tax-assistant?conversationId=${encodeURIComponent(conv.id)}`}>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs font-semibold text-brand-700 hover:text-brand-900 gap-1"
                          >
                            Continue Session
                            <ArrowRight className="w-3 h-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-surface-100 text-right">
              <Link
                href="/ai-tax-assistant"
                className="text-xs font-semibold text-brand-700 hover:text-brand-900 inline-flex items-center gap-1"
              >
                + Start New Session
              </Link>
            </div>
          </Card>
        </div>
      )}

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Launch a Federal Tax Calculator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/tax-calculators/income-tax"
              className="flex items-center justify-between p-3 rounded-lg border border-surface-200 hover:border-brand-300 hover:bg-surface-50 transition-colors"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm text-surface-900 block">Federal Income Tax</span>
                  {taxProfile?.hasW2Income && (
                    <Badge variant="brand" size="sm" className="text-[10px] py-0 px-1.5 font-normal">
                      Matches Profile
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-surface-500">Standard Form 1040 progressive brackets</span>
              </div>
              <span className="text-xs font-bold text-brand-600">Open →</span>
            </Link>

            <Link
              href="/tax-calculators/self-employed"
              className="flex items-center justify-between p-3 rounded-lg border border-surface-200 hover:border-brand-300 hover:bg-surface-50 transition-colors"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm text-surface-900 block">Self-Employed (Schedule SE)</span>
                  {taxProfile?.hasBusinessExpenses && (
                    <Badge variant="brand" size="sm" className="text-[10px] py-0 px-1.5 font-normal">
                      Matches Profile
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-surface-500">Social Security & Medicare calculation</span>
              </div>
              <span className="text-xs font-bold text-brand-600">Open →</span>
            </Link>

            <Link
              href="/tax-calculators/1099"
              className="flex items-center justify-between p-3 rounded-lg border border-surface-200 hover:border-brand-300 hover:bg-surface-50 transition-colors"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm text-surface-900 block">1099 Contractor Tax</span>
                  {taxProfile?.has1099Income && (
                    <Badge variant="brand" size="sm" className="text-[10px] py-0 px-1.5 font-normal">
                      Matches Profile
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-surface-500">Expense tracking & recommended savings</span>
              </div>
              <span className="text-xs font-bold text-brand-600">Open →</span>
            </Link>

            <Link
              href="/tax-calculators/quarterly-tax"
              className="flex items-center justify-between p-3 rounded-lg border border-surface-200 hover:border-brand-300 hover:bg-surface-50 transition-colors"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm text-surface-900 block">Quarterly Estimated (1040-ES)</span>
                  {(taxProfile?.has1099Income || taxProfile?.hasBusinessExpenses) && (
                    <Badge variant="brand" size="sm" className="text-[10px] py-0 px-1.5 font-normal">
                      Matches Profile
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-surface-500">Deadlines and installment schedule</span>
              </div>
              <span className="text-xs font-bold text-brand-600">Open →</span>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Guidance & Education</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-surface-600 leading-relaxed">
              Have questions about how your business expenses reduce net self-employment earnings, or how progressive brackets work? Our conversational assistant is available to break down concepts.
            </p>
            <div className="p-4 rounded-xl bg-surface-50 border border-surface-200 text-xs text-surface-600 space-y-2">
              <span className="font-bold text-surface-900 block">Sample Questions:</span>
              <p>&bull; &ldquo;How much should I set aside for taxes on $90k in 1099 income?&rdquo;</p>
              <p>&bull; &ldquo;What is the standard deduction for head of household?&rdquo;</p>
              <p>&bull; &ldquo;What happens if I miss a quarterly estimated tax deadline?&rdquo;</p>
            </div>
            <div className="flex gap-2">
              <Link href="/ai-tax-assistant" className="flex-1">
                <Button size="sm" className="w-full gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Open AI Tax Assistant
                </Button>
              </Link>
              <Link href="/dashboard/conversations">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <History className="w-3.5 h-3.5" />
                  Past Sessions
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
