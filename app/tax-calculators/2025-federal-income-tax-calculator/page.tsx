import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { constructMetadata } from "@/lib/seo/metadata";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd, getFAQPageSchema } from "@/components/seo/JsonLd";
import { IncomeTaxCalculatorForm } from "@/components/calculators/IncomeTaxCalculatorForm";
import { LegalDisclaimerNotice } from "@/components/shared/LegalDisclaimerNotice";
import { Calculator, ArrowRight, ShieldCheck, CheckCircle2, HelpCircle } from "lucide-react";

export const metadata: Metadata = constructMetadata({
  title: "2025 Federal Income Tax Calculator | Brackets & Standard Deduction",
  description:
    "Calculate your 2025 federal income tax using official IRS IRB 2025-45 (OBBBA) tax brackets, $15,750 standard deduction, and $176,100 Social Security cap.",
  path: "/tax-calculators/2025-federal-income-tax-calculator",
});

export default function Calculator2025Page() {
  const faqs = [
    {
      question: "What is the standard deduction for tax year 2025?",
      answer:
        "Under IRS IRB 2025-45 and P.L. 119-21 (One Big Beautiful Bill Act), the 2025 standard deduction is $15,750 for Single filers and Married Filing Separately, $31,500 for Married Filing Jointly, and $23,625 for Head of Household.",
    },
    {
      question: "What is the 2025 Social Security maximum taxable wage base?",
      answer:
        "The Social Security Administration set the 2025 maximum taxable wage base limit at $176,100. Earnings beyond $176,100 are exempt from the 12.4% Social Security portion of FICA and SECA taxes.",
    },
    {
      question: "What are the federal income tax brackets for 2025?",
      answer:
        "The seven 2025 federal tax rates remain 10%, 12%, 22%, 24%, 32%, 35%, and 37%, with brackets starting at $0, $11,925, $48,475, $103,350, $197,300, $250,525, and $626,350 for Single filers.",
    },
    {
      question: "How does this differ from the 2026 tax year?",
      answer:
        "For 2026 under Rev. Proc. 2025-32, standard deductions increase to $16,100 (Single) and $32,200 (MFJ), and the Social Security cap increases to $184,500.",
    },
  ];

  return (
    <div className="py-10 bg-surface-50 min-h-screen">
      <JsonLd data={getFAQPageSchema(faqs)} />
      <Container size="xl">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { name: "Tax Calculators", item: "/tax-calculators" },
            {
              name: "2025 Federal Income Tax Calculator",
              item: "/tax-calculators/2025-federal-income-tax-calculator",
            },
          ]}
          className="mb-6"
        />

        {/* Page Header */}
        <div className="max-w-3xl mb-8 space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="emerald" size="md">
              Tax Year 2025 Rules
            </Badge>
            <span className="text-xs font-semibold text-surface-600">
              IRS IRB 2025-45 / P.L. 119-21 (OBBBA)
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-surface-900 tracking-tight">
            2025 Federal Income Tax Calculator
          </h1>
          <p className="text-base sm:text-lg text-surface-700 leading-relaxed">
            Deterministic federal tax estimation for tax year 2025. Computes your progressive bracket breakdown, statutory $15,750 Single / $31,500 MFJ standard deduction, and withholding balance.
          </p>
        </div>

        {/* Year Comparison Alert */}
        <div className="mb-8 p-4 rounded-2xl bg-brand-50 border border-brand-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-brand-900">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-600 shrink-0" />
            <span>
              Looking for next year&apos;s numbers? View the <strong>2026 Federal Income Tax Calculator</strong> with updated inflation thresholds.
            </span>
          </div>
          <Link
            href="/tax-calculators/2026-federal-income-tax-calculator"
            className="inline-flex items-center gap-1 font-bold text-brand-700 hover:text-brand-800 underline shrink-0"
          >
            <span>Switch to 2026 Calculator</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Interactive Calculator Form */}
        <div className="bg-white rounded-3xl border border-surface-200 p-6 sm:p-8 shadow-xs mb-12">
          <IncomeTaxCalculatorForm />
        </div>

        {/* 2025 Statutory Reference Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="p-6 rounded-2xl bg-white border border-surface-200 space-y-3">
            <h2 className="text-lg font-bold text-surface-900">
              2025 Standard Deduction Amounts
            </h2>
            <p className="text-xs text-surface-600">
              Official amounts established under P.L. 119-21 (One Big Beautiful Bill Act):
            </p>
            <ul className="space-y-2 text-xs text-surface-700">
              <li className="flex justify-between py-1.5 border-b border-surface-100">
                <span className="font-medium">Single:</span>
                <span className="font-mono font-bold">$15,750</span>
              </li>
              <li className="flex justify-between py-1.5 border-b border-surface-100">
                <span className="font-medium">Married Filing Jointly:</span>
                <span className="font-mono font-bold">$31,500</span>
              </li>
              <li className="flex justify-between py-1.5 border-b border-surface-100">
                <span className="font-medium">Head of Household:</span>
                <span className="font-mono font-bold">$23,625</span>
              </li>
              <li className="flex justify-between py-1.5">
                <span className="font-medium">Married Filing Separately:</span>
                <span className="font-mono font-bold">$15,750</span>
              </li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-surface-200 space-y-3">
            <h2 className="text-lg font-bold text-surface-900">
              2025 Single Bracket Thresholds
            </h2>
            <p className="text-xs text-surface-600">
              Taxable income brackets under Rev. Proc. 2024-40 (§ 3.01):
            </p>
            <ul className="space-y-1.5 text-xs text-surface-700 font-mono">
              <li className="flex justify-between py-1 border-b border-surface-100">
                <span>10% Bracket</span>
                <span>$0 – $11,925</span>
              </li>
              <li className="flex justify-between py-1 border-b border-surface-100">
                <span>12% Bracket</span>
                <span>$11,925 – $48,475</span>
              </li>
              <li className="flex justify-between py-1 border-b border-surface-100">
                <span>22% Bracket</span>
                <span>$48,475 – $103,350</span>
              </li>
              <li className="flex justify-between py-1 border-b border-surface-100">
                <span>24% Bracket</span>
                <span>$103,350 – $197,300</span>
              </li>
              <li className="flex justify-between py-1 border-b border-surface-100">
                <span>32% Bracket</span>
                <span>$197,300 – $250,525</span>
              </li>
              <li className="flex justify-between py-1 border-b border-surface-100">
                <span>35% Bracket</span>
                <span>$250,525 – $626,350</span>
              </li>
              <li className="flex justify-between py-1">
                <span>37% Bracket</span>
                <span>Over $626,350</span>
              </li>
            </ul>
          </div>
        </div>

        {/* 2025 FAQs */}
        <div className="bg-white rounded-3xl border border-surface-200 p-6 sm:p-8 space-y-6 mb-12">
          <h2 className="text-xl font-bold text-surface-900 tracking-tight flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-brand-600" />
            <span>2025 Tax Year Frequently Asked Questions</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-surface-50 border border-surface-200/80 space-y-1.5"
              >
                <h3 className="text-xs font-bold text-surface-900">
                  {faq.question}
                </h3>
                <p className="text-xs text-surface-600 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Related Guides */}
        <div className="p-6 rounded-2xl bg-surface-100 border border-surface-200 space-y-3 mb-12">
          <div className="text-xs font-bold uppercase tracking-wider text-surface-600">
            Educational Tax Resources
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/tax-guides/how-federal-income-tax-works"
              className="p-3 rounded-xl bg-white hover:bg-brand-50 border border-surface-200 transition-colors"
            >
              <div className="text-xs font-bold text-surface-900">
                How Federal Tax Works
              </div>
              <p className="text-[11px] text-surface-500 mt-1">
                Progressive bracket mechanics explained.
              </p>
            </Link>
            <Link
              href="/tax-guides/marginal-vs-effective-tax-rate-explained"
              className="p-3 rounded-xl bg-white hover:bg-brand-50 border border-surface-200 transition-colors"
            >
              <div className="text-xs font-bold text-surface-900">
                Marginal vs Effective Rate
              </div>
              <p className="text-[11px] text-surface-500 mt-1">
                Why higher brackets do not lower net pay.
              </p>
            </Link>
            <Link
              href="/tax-guides/standard-deduction-vs-itemized-deductions"
              className="p-3 rounded-xl bg-white hover:bg-brand-50 border border-surface-200 transition-colors"
            >
              <div className="text-xs font-bold text-surface-900">
                Standard vs Itemized Deductions
              </div>
              <p className="text-[11px] text-surface-500 mt-1">
                Compare $15,750 vs Schedule A limits.
              </p>
            </Link>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <LegalDisclaimerNotice />
      </Container>
    </div>
  );
}
