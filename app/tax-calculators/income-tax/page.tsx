import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { constructMetadata } from "@/lib/seo/metadata";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd, getFAQPageSchema } from "@/components/seo/JsonLd";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { IncomeTaxCalculatorForm } from "@/components/calculators/IncomeTaxCalculatorForm";
import { LegalDisclaimerNotice } from "@/components/shared/LegalDisclaimerNotice";
import {
  Users,
  Cpu,
  Layers,
  AlertTriangle,
  HelpCircle,
  Calculator,
  ArrowRight,
  BookOpen,
} from "lucide-react";

export const metadata: Metadata = constructMetadata({
  title: "Federal Income Tax Calculator (2025 & 2026 Brackets)",
  description:
    "Deterministic US federal income tax calculator for W-2 wages, standard deduction, and progressive bracket breakdowns according to IRS IRB 2025-45 and Rev. Proc. 2025-32.",
  path: "/tax-calculators/income-tax",
});

export default function IncomeTaxCalculatorPage() {
  const faqs = [
    {
      question: "How does the federal income tax calculator estimate my taxes?",
      answer:
        "The calculator subtracts your statutory standard deduction ($15,750 for Single / $31,500 for MFJ in 2025; $16,100 / $32,200 in 2026) from gross W-2 wages to compute taxable income, then steps progressively through the seven official IRS tax brackets (10% to 37%) in exact integer cents.",
    },
    {
      question: "Does this calculator support both 2025 and 2026 tax years?",
      answer:
        "Yes. You can toggle between 2025 rules (IRS IRB 2025-45 / P.L. 119-21 OBBBA) and 2026 rules (IRS Rev. Proc. 2025-32) to see how inflation adjustments impact your bracket thresholds and refund estimate.",
    },
    {
      question: "Does the calculator include state income taxes?",
      answer:
        "No. This calculator is strictly dedicated to US Federal income tax. State and local taxes vary by jurisdiction and are not included in this estimation.",
    },
    {
      question: "Can I save my calculation results to compare scenarios?",
      answer:
        "Yes. Free registered users can save calculations to their account history, compare multiple filing scenarios, and view educational AI insights.",
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
            { name: "Federal Income Tax Calculator", item: "/tax-calculators/income-tax" },
          ]}
          className="mb-6"
        />

        {/* Page Header */}
        <div className="max-w-3xl mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="emerald" size="md">
              IRS IRB 2025-45 / Rev. Proc. 2025-32
            </Badge>
            <span className="text-xs font-medium text-surface-600">
              Tax Years 2025 & 2026 Supported
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-surface-900 tracking-tight">
            Federal Income Tax Calculator
          </h1>
          <p className="mt-3 text-base sm:text-lg text-surface-700 leading-relaxed">
            Estimate your federal income tax liability, effective tax rate, and withholding refund or balance due using verified IRS progressive tax brackets and official standard deduction rules.
          </p>
        </div>

        {/* Interactive Calculator Form */}
        <div className="mb-12">
          <IncomeTaxCalculatorForm />
        </div>

        {/* Deep SEO Educational Section */}
        <div className="space-y-12 max-w-5xl">
          {/* Who It Is For & How It Works */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl border border-surface-200 p-6 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-brand-600 font-bold text-sm">
                <Users className="w-4 h-4" />
                <h2>Who This Calculator Is For</h2>
              </div>
              <p className="text-xs sm:text-sm text-surface-600 leading-relaxed">
                This calculator is designed for W-2 wage earners, salaried employees, dual-income households, and taxpayers planning payroll withholding. It models single filers, married couples filing jointly or separately, heads of household, and surviving spouses.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-surface-200 p-6 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                <Cpu className="w-4 h-4" />
                <h2>How the Calculation Works</h2>
              </div>
              <p className="text-xs sm:text-sm text-surface-600 leading-relaxed">
                Your federal income is processed through our deterministic tax engine in integer cents. First, your statutory standard deduction is subtracted. Then, each slice of taxable income is taxed according to the 7 progressive marginal rates (10%, 12%, 22%, 24%, 32%, 35%, 37%). Finally, federal withholding is subtracted to estimate your refund or balance due.
              </p>
            </div>
          </div>

          {/* Key Inputs & Known Limitations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl border border-surface-200 p-6 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-surface-900 font-bold text-sm">
                <Layers className="w-4 h-4 text-brand-600" />
                <h2>Key Inputs Required</h2>
              </div>
              <ul className="space-y-1.5 text-xs sm:text-sm text-surface-600">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                  <span><strong>Filing Status:</strong> Single, Married Filing Jointly, Head of Household, etc.</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                  <span><strong>Gross Annual Wages:</strong> Box 1 of Form W-2 or projected annual salary.</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                  <span><strong>Federal Withholding:</strong> Total federal income tax withheld from paystubs.</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl border border-surface-200 p-6 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h2>Calculators Scope & Limitations</h2>
              </div>
              <ul className="space-y-1.5 text-xs text-surface-600">
                <li>• Covers US Federal income tax only; does not calculate state or municipal income taxes.</li>
                <li>• Employs statutory standard deduction; does not calculate Schedule A itemized deductions.</li>
                <li>• Does not compute Alternative Minimum Tax (AMT) or foreign earned income exclusion.</li>
              </ul>
            </div>
          </div>

          {/* Dedicated Tax-Year Pages Switcher */}
          <div className="p-6 rounded-2xl bg-surface-100 border border-surface-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <div className="font-bold text-sm text-surface-900">
                Need Year-Specific Tax Rules?
              </div>
              <p className="text-xs text-surface-600">
                View our dedicated year-specific calculator pages with full statutory bracket tables:
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/tax-calculators/2025-federal-income-tax-calculator"
                className="px-3.5 py-2 rounded-xl bg-white border border-surface-200 text-xs font-semibold text-surface-800 hover:text-brand-600 hover:border-brand-300 transition-colors"
              >
                2025 Calculator ($15,750 Ded.)
              </Link>
              <Link
                href="/tax-calculators/2026-federal-income-tax-calculator"
                className="px-3.5 py-2 rounded-xl bg-white border border-surface-200 text-xs font-semibold text-surface-800 hover:text-brand-600 hover:border-brand-300 transition-colors"
              >
                2026 Calculator ($16,100 Ded.)
              </Link>
            </div>
          </div>

          {/* Relevant FAQs */}
          <div className="bg-white rounded-3xl border border-surface-200 p-6 sm:p-8 space-y-6 shadow-xs">
            <h2 className="text-xl font-bold text-surface-900 tracking-tight flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-brand-600" />
              <span>Federal Income Tax FAQ</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-surface-50 border border-surface-200/80 space-y-1.5"
                >
                  <h3 className="text-xs font-bold text-surface-900">{faq.question}</h3>
                  <p className="text-xs text-surface-600 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Related Educational Guides & Calculators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-surface-200 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-surface-900 font-bold text-sm">
                <BookOpen className="w-4 h-4 text-brand-600" />
                <h3>Related Educational Guides</h3>
              </div>
              <div className="space-y-2 text-xs">
                <Link
                  href="/tax-guides/how-federal-income-tax-works"
                  className="block p-2.5 rounded-lg hover:bg-surface-50 text-surface-800 hover:text-brand-600 transition-colors"
                >
                  → <strong>How Federal Income Tax Works</strong>: Progressive bracket guide
                </Link>
                <Link
                  href="/tax-guides/marginal-vs-effective-tax-rate-explained"
                  className="block p-2.5 rounded-lg hover:bg-surface-50 text-surface-800 hover:text-brand-600 transition-colors"
                >
                  → <strong>Marginal vs Effective Tax Rate</strong>: Bracket progression explained
                </Link>
                <Link
                  href="/tax-guides/standard-deduction-vs-itemized-deductions"
                  className="block p-2.5 rounded-lg hover:bg-surface-50 text-surface-800 hover:text-brand-600 transition-colors"
                >
                  → <strong>Standard vs Itemized Deductions</strong>: Compare $15,750 vs Schedule A
                </Link>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-surface-200 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-surface-900 font-bold text-sm">
                <Calculator className="w-4 h-4 text-brand-600" />
                <h3>Other Federal Calculators</h3>
              </div>
              <div className="space-y-2 text-xs">
                <Link
                  href="/tax-calculators/self-employed"
                  className="block p-2.5 rounded-lg hover:bg-surface-50 text-surface-800 hover:text-brand-600 transition-colors"
                >
                  → <strong>Self-Employed Tax Calculator</strong>: Schedule SE & 15.3% FICA
                </Link>
                <Link
                  href="/tax-calculators/1099"
                  className="block p-2.5 rounded-lg hover:bg-surface-50 text-surface-800 hover:text-brand-600 transition-colors"
                >
                  → <strong>1099 Contractor Tax Calculator</strong>: Business expense deductions
                </Link>
                <Link
                  href="/tax-calculators/quarterly-tax"
                  className="block p-2.5 rounded-lg hover:bg-surface-50 text-surface-800 hover:text-brand-600 transition-colors"
                >
                  → <strong>Quarterly Tax Calculator</strong>: Form 1040-ES vouchers
                </Link>
              </div>
            </div>
          </div>

          {/* Legal Notice */}
          <LegalDisclaimerNotice />
        </div>
      </Container>
    </div>
  );
}
