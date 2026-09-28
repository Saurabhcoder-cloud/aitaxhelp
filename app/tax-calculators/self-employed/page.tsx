import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { constructMetadata } from "@/lib/seo/metadata";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd, getFAQPageSchema } from "@/components/seo/JsonLd";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { SelfEmployedCalculatorForm } from "@/components/calculators/SelfEmployedCalculatorForm";
import { LegalDisclaimerNotice } from "@/components/shared/LegalDisclaimerNotice";
import {
  Users,
  Cpu,
  Layers,
  AlertTriangle,
  HelpCircle,
  Calculator,
  BookOpen,
} from "lucide-react";

export const metadata: Metadata = constructMetadata({
  title: "Self-Employed Tax Calculator (Schedule SE & Form 1040)",
  description:
    "Calculate Schedule SE self-employment tax (15.3%), statutory 92.35% net profit factor, Social Security wage base cap, and 50% above-the-line deduction.",
  path: "/tax-calculators/self-employed",
});

export default function SelfEmployedCalculatorPage() {
  const faqs = [
    {
      question: "How is self-employment tax calculated on this page?",
      answer:
        "The calculator applies the statutory 92.35% (0.9235) factor to your net profit under IRC § 1402(a)(12). It assesses 12.4% Social Security tax up to the annual limit ($176,100 in 2025; $184,500 in 2026) and 2.9% Medicare tax on all net earnings. It also computes your 50% above-the-line deduction on Schedule 1.",
    },
    {
      question: "Do concurrent W-2 wages lower my self-employment tax?",
      answer:
        "Yes. Social Security tax is capped at the statutory ceiling across all earned income. If you earned W-2 wages, those wages count first toward the cap, reducing the self-employment profit subject to the 12.4% Social Security portion.",
    },
    {
      question: "Does this include federal income tax as well as self-employment tax?",
      answer:
        "Yes. The calculator models both Schedule SE self-employment tax and Form 1040 progressive federal income tax, reflecting the 50% SE tax above-the-line deduction and standard deduction.",
    },
    {
      question: "What tax years are supported?",
      answer:
        "The calculator supports both Tax Year 2025 (IRS IRB 2025-45 / OBBBA) and Tax Year 2026 (IRS Rev. Proc. 2025-32), dynamically adjusting the standard deduction and Social Security wage caps.",
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
            { name: "Self-Employed Tax Calculator", item: "/tax-calculators/self-employed" },
          ]}
          className="mb-6"
        />

        {/* Page Header */}
        <div className="max-w-3xl mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="emerald" size="md">
              Schedule SE & Form 1040
            </Badge>
            <span className="text-xs font-medium text-surface-600">
              Tax Years 2025 & 2026 Supported
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-surface-900 tracking-tight">
            Self-Employed Tax Calculator
          </h1>
          <p className="mt-3 text-base sm:text-lg text-surface-700 leading-relaxed">
            Calculate your Schedule SE self-employment tax obligations, Social Security wage base limits, and above-the-line adjustments to determine your true federal liability.
          </p>
        </div>

        {/* Interactive Calculator Form */}
        <div className="mb-12">
          <SelfEmployedCalculatorForm />
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
                This calculator is built for sole proprietors, freelancers, independent contractors, single-member LLC owners, and partners who report business earnings on Schedule C or Schedule K-1 and must pay federal self-employment (SECA) tax.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-surface-200 p-6 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                <Cpu className="w-4 h-4" />
                <h2>How the Calculation Works</h2>
              </div>
              <p className="text-xs sm:text-sm text-surface-600 leading-relaxed">
                Net profit is multiplied by the statutory 92.35% factor. The result is assessed 12.4% for Social Security (up to $176,100 in 2025 / $184,500 in 2026) and 2.9% for Medicare. Exactly 50% of the calculated SE tax is deducted above-the-line from your AGI before income tax brackets are computed.
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
                  <span><strong>Net Business Profit:</strong> Gross business income minus ordinary expenses.</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                  <span><strong>W-2 Wage Earnings:</strong> Any concurrent payroll earnings (for wage cap offset).</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                  <span><strong>Filing Status:</strong> Single, Married Joint, Head of Household.</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl border border-surface-200 p-6 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h2>Scope & Statutory Limitations</h2>
              </div>
              <ul className="space-y-1.5 text-xs text-surface-600">
                <li>• Covers federal Schedule SE and Form 1040; does not compute state self-employment taxes.</li>
                <li>• Does not compute the Section 199A Qualified Business Income (QBI) deduction.</li>
                <li>• Does not model S-Corporation reasonable compensation distributions.</li>
              </ul>
            </div>
          </div>

          {/* Relevant FAQs */}
          <div className="bg-white rounded-3xl border border-surface-200 p-6 sm:p-8 space-y-6 shadow-xs">
            <h2 className="text-xl font-bold text-surface-900 tracking-tight flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-brand-600" />
              <span>Self-Employment Tax FAQ</span>
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

          {/* Related Guides & Calculators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-surface-200 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-surface-900 font-bold text-sm">
                <BookOpen className="w-4 h-4 text-brand-600" />
                <h3>Related Educational Guides</h3>
              </div>
              <div className="space-y-2 text-xs">
                <Link
                  href="/tax-guides/how-self-employment-tax-works"
                  className="block p-2.5 rounded-lg hover:bg-surface-50 text-surface-800 hover:text-brand-600 transition-colors"
                >
                  → <strong>How Self-Employment Tax Works</strong>: Schedule SE 15.3% guide
                </Link>
                <Link
                  href="/tax-guides/1099-contractor-tax-basics"
                  className="block p-2.5 rounded-lg hover:bg-surface-50 text-surface-800 hover:text-brand-600 transition-colors"
                >
                  → <strong>1099 Contractor Tax Basics</strong>: Deductible business write-offs
                </Link>
                <Link
                  href="/tax-guides/quarterly-estimated-tax-guide"
                  className="block p-2.5 rounded-lg hover:bg-surface-50 text-surface-800 hover:text-brand-600 transition-colors"
                >
                  → <strong>Quarterly Estimated Taxes</strong>: Form 1040-ES payment vouchers
                </Link>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-surface-200 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-surface-900 font-bold text-sm">
                <Calculator className="w-4 h-4 text-brand-600" />
                <h3>Related Tax Calculators</h3>
              </div>
              <div className="space-y-2 text-xs">
                <Link
                  href="/tax-calculators/1099"
                  className="block p-2.5 rounded-lg hover:bg-surface-50 text-surface-800 hover:text-brand-600 transition-colors"
                >
                  → <strong>1099 Contractor Tax Calculator</strong>: Categorized business deductions
                </Link>
                <Link
                  href="/tax-calculators/quarterly-tax"
                  className="block p-2.5 rounded-lg hover:bg-surface-50 text-surface-800 hover:text-brand-600 transition-colors"
                >
                  → <strong>Quarterly Tax Calculator</strong>: Form 1040-ES installment schedule
                </Link>
                <Link
                  href="/tax-calculators/income-tax"
                  className="block p-2.5 rounded-lg hover:bg-surface-50 text-surface-800 hover:text-brand-600 transition-colors"
                >
                  → <strong>Federal Income Tax Calculator</strong>: W-2 progressive bracket engine
                </Link>
              </div>
            </div>
          </div>

          {/* Legal Disclaimer */}
          <LegalDisclaimerNotice />
        </div>
      </Container>
    </div>
  );
}
