import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { constructMetadata } from "@/lib/seo/metadata";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd, getFAQPageSchema } from "@/components/seo/JsonLd";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { QuarterlyTaxCalculatorForm } from "@/components/calculators/QuarterlyTaxCalculatorForm";
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
  title: "Quarterly Estimated Tax Calculator (IRS Form 1040-ES)",
  description:
    "Calculate IRS Form 1040-ES estimated quarterly payments across all four payment periods to prevent underpayment penalties under IRC § 6654.",
  path: "/tax-calculators/quarterly-tax",
});

export default function QuarterlyTaxCalculatorPage() {
  const faqs = [
    {
      question: "Who is required to pay Form 1040-ES quarterly estimated taxes?",
      answer:
        "Under the US pay-as-you-go system, individuals who expect to owe at least $1,000 in federal taxes after subtracting withholding and refundable credits must make quarterly estimated tax payments.",
    },
    {
      question: "What are the four official IRS quarterly payment due dates?",
      answer:
        "The standard deadlines for calendar-year taxpayers are: April 15 (Q1), June 15 (Q2), September 15 (Q3), and January 15 of the following year (Q4). When a date falls on a weekend or federal holiday, payment is due on the next business day.",
    },
    {
      question: "What is the safe harbor rule for avoiding penalties?",
      answer:
        "You avoid underpayment penalties under IRC § 6654 if your timely payments equal at least 90% of your current-year tax or 100% of your prior-year tax (increased to 110% if prior-year AGI was over $150,000 for MFJ or $75,000 for Single).",
    },
    {
      question: "How do I make my quarterly payment to the IRS?",
      answer:
        "Payments can be made electronically through IRS Direct Pay (free direct bank debit) or the Electronic Federal Tax Payment System (EFTPS). Select 'Estimated Tax' and the relevant tax year.",
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
            { name: "Quarterly Tax Calculator", item: "/tax-calculators/quarterly-tax" },
          ]}
          className="mb-6"
        />

        {/* Page Header */}
        <div className="max-w-3xl mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="emerald" size="md">
              IRS Form 1040-ES
            </Badge>
            <span className="text-xs font-medium text-surface-600">
              Tax Years 2025 & 2026 Supported
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-surface-900 tracking-tight">
            Quarterly Estimated Tax Calculator
          </h1>
          <p className="mt-3 text-base sm:text-lg text-surface-700 leading-relaxed">
            Compute your projected annual federal liabilities and break them into four equal quarterly installments with official IRS voucher payment deadlines.
          </p>
        </div>

        {/* Interactive Calculator Form */}
        <div className="mb-12">
          <QuarterlyTaxCalculatorForm />
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
                This tool is built for independent contractors, freelancers, S-corp owners, partners, and investors whose income is not subject to employer payroll tax withholding and who must remit quarterly Form 1040-ES payments to avoid IRC § 6654 penalties.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-surface-200 p-6 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                <Cpu className="w-4 h-4" />
                <h2>How the Calculation Works</h2>
              </div>
              <p className="text-xs sm:text-sm text-surface-600 leading-relaxed">
                The engine projects your combined annual federal income and Schedule SE self-employment tax liabilities, subtracts any estimated W-2 wage withholding, and divides the remaining net balance into four equal statutory quarterly installment vouchers.
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
                  <span><strong>Projected Annual Profit:</strong> Estimated net self-employment or 1099 profit.</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                  <span><strong>Expected Withholding:</strong> Any W-2 withholding from you or your spouse.</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                  <span><strong>Prior Year Tax:</strong> Prior year total tax (for safe harbor protection).</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl border border-surface-200 p-6 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h2>Scope & Statutory Limitations</h2>
              </div>
              <ul className="space-y-1.5 text-xs text-surface-600">
                <li>• Models federal Form 1040-ES installments only; state estimated taxes are not calculated.</li>
                <li>• Assumes equal quarterly earnings; seasonal income requires Form 2210 Schedule AI.</li>
                <li>• Does not compute household employment or alternative minimum tax obligations.</li>
              </ul>
            </div>
          </div>

          {/* Relevant FAQs */}
          <div className="bg-white rounded-3xl border border-surface-200 p-6 sm:p-8 space-y-6 shadow-xs">
            <h2 className="text-xl font-bold text-surface-900 tracking-tight flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-brand-600" />
              <span>Quarterly Estimated Taxes FAQ</span>
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
                  href="/tax-guides/quarterly-estimated-tax-guide"
                  className="block p-2.5 rounded-lg hover:bg-surface-50 text-surface-800 hover:text-brand-600 transition-colors"
                >
                  → <strong>Quarterly Estimated Tax Guide</strong>: Form 1040-ES deadlines & safe harbors
                </Link>
                <Link
                  href="/tax-guides/how-self-employment-tax-works"
                  className="block p-2.5 rounded-lg hover:bg-surface-50 text-surface-800 hover:text-brand-600 transition-colors"
                >
                  → <strong>How Self-Employment Tax Works</strong>: Schedule SE 15.3% computation
                </Link>
                <Link
                  href="/tax-guides/1099-contractor-tax-basics"
                  className="block p-2.5 rounded-lg hover:bg-surface-50 text-surface-800 hover:text-brand-600 transition-colors"
                >
                  → <strong>1099 Contractor Tax Basics</strong>: Deductible business write-offs
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
                  href="/tax-calculators/self-employed"
                  className="block p-2.5 rounded-lg hover:bg-surface-50 text-surface-800 hover:text-brand-600 transition-colors"
                >
                  → <strong>Self-Employed Tax Calculator</strong>: Schedule SE net profit factors
                </Link>
                <Link
                  href="/tax-calculators/1099"
                  className="block p-2.5 rounded-lg hover:bg-surface-50 text-surface-800 hover:text-brand-600 transition-colors"
                >
                  → <strong>1099 Contractor Tax Calculator</strong>: Categorized business deductions
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
