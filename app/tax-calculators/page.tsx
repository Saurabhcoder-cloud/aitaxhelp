import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { constructMetadata } from "../../lib/seo/metadata";
import { Container } from "../../components/ui/Container";
import { CalculatorCard } from "../../components/calculators/CalculatorCard";
import { Breadcrumbs } from "../../components/seo/Breadcrumbs";
import { LegalDisclaimerNotice } from "../../components/shared/LegalDisclaimerNotice";
import { ArrowRight, Calendar, ShieldCheck } from "lucide-react";

export const metadata: Metadata = constructMetadata({
  title: "Federal Tax Calculators Hub (2025 & 2026)",
  description:
    "Deterministic US federal tax calculators for W-2 income, self-employment Schedule SE, 1099 contractors, and Form 1040-ES quarterly estimates.",
  path: "/tax-calculators",
});

export default function TaxCalculatorsHubPage() {
  const calculators = [
    {
      title: "Federal Income Tax Calculator",
      description:
        "Accurate progressive bracket calculations for W-2 wages, official IRS standard deductions, and federal withholding balances.",
      href: "/tax-calculators/income-tax",
      badge: "Form 1040",
      features: [
        "2025 & 2026 IRS progressive tax brackets",
        "Single, Married Joint, and Head of Household",
        "Deterministic refund / amount owed estimation",
      ],
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      title: "Self-Employed Tax Calculator",
      description:
        "Compute Schedule SE self-employment tax (15.3%), net business profit factors, and above-the-line AGI adjustments.",
      href: "/tax-calculators/self-employed",
      badge: "Schedule SE",
      features: [
        "Statutory 92.35% net profit factor",
        "Social Security wage base cap logic ($176.1k / $184.5k)",
        "50% above-the-line deduction adjustment",
      ],
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      title: "1099 Contractor Tax Calculator",
      description:
        "Specialized calculator for freelancers, consultants, and gig economy workers with deductible expense categories.",
      href: "/tax-calculators/1099",
      badge: "1099-NEC & 1099-K",
      features: [
        "Ordinary & necessary business expense tracking",
        "Recommended tax savings set-aside percentage",
        "Net take-home estimation",
      ],
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      title: "Quarterly Estimated Tax Calculator",
      description:
        "Plan your IRS Form 1040-ES estimated quarterly payments across all four payment periods to prevent penalties.",
      href: "/tax-calculators/quarterly-tax",
      badge: "Form 1040-ES",
      features: [
        "Four equal installment vouchers",
        "Official IRS payment due dates",
        "Safe harbor threshold reminders",
      ],
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="py-12 bg-surface-50 min-h-screen">
      <Container size="xl">
        <Breadcrumbs items={[{ name: "Tax Calculators", item: "/tax-calculators" }]} className="mb-6" />

        <div className="max-w-3xl mb-12">
          <h1 className="text-3xl sm:text-4xl font-black text-surface-900 tracking-tight">
            Deterministic Federal Tax Calculators
          </h1>
          <p className="mt-3 text-base sm:text-lg text-surface-600 leading-relaxed">
            All calculations are executed in integer cents using official statutory IRS rules (IRS IRB 2025-45 / OBBBA for 2025 and Rev. Proc. 2025-32 for 2026). Select the calculator that matches your taxpayer situation below.
          </p>
        </div>

        {/* 4 Core Calculators Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {calculators.map((calc) => (
            <CalculatorCard key={calc.title} {...calc} />
          ))}
        </div>

        {/* Dedicated Tax-Year Architecture Callout */}
        <div className="bg-white rounded-3xl border border-surface-200 p-8 shadow-xs mb-16 space-y-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-brand-600" />
            <h2 className="text-xl font-bold text-surface-900 tracking-tight">
              Dedicated Tax-Year Calculators
            </h2>
          </div>
          <p className="text-sm text-surface-600 max-w-3xl leading-relaxed">
            Need to evaluate a specific filing year with exact statutory standard deductions and Social Security wage caps? Explore our dedicated year-specific calculator pages:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/tax-calculators/2025-federal-income-tax-calculator"
              className="p-6 rounded-2xl bg-surface-50 hover:bg-emerald-50/50 border border-surface-200 hover:border-emerald-300 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  Tax Year 2025
                </span>
                <ArrowRight className="w-4 h-4 text-surface-400 group-hover:text-emerald-700 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-base font-bold text-surface-900 group-hover:text-emerald-900 mt-3">
                2025 Federal Income Tax Calculator
              </h3>
              <p className="text-xs text-surface-600 mt-1 leading-relaxed">
                Rules: IRS IRB 2025-45 (OBBBA). Standard deduction: $15,750 (Single) / $31,500 (MFJ). SSA wage cap: $176,100.
              </p>
            </Link>

            <Link
              href="/tax-calculators/2026-federal-income-tax-calculator"
              className="p-6 rounded-2xl bg-surface-50 hover:bg-brand-50/50 border border-surface-200 hover:border-brand-300 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-100 text-brand-800">
                  Tax Year 2026
                </span>
                <ArrowRight className="w-4 h-4 text-surface-400 group-hover:text-brand-700 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-base font-bold text-surface-900 group-hover:text-brand-900 mt-3">
                2026 Federal Income Tax Calculator
              </h3>
              <p className="text-xs text-surface-600 mt-1 leading-relaxed">
                Rules: IRS Rev. Proc. 2025-32. Standard deduction: $16,100 (Single) / $32,200 (MFJ). SSA wage cap: $184,500.
              </p>
            </Link>
          </div>
        </div>

        <div className="max-w-4xl">
          <LegalDisclaimerNotice />
        </div>
      </Container>
    </div>
  );
}
