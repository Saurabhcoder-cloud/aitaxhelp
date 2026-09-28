import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { constructMetadata } from "@/lib/seo/metadata";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd, getFAQPageSchema } from "@/components/seo/JsonLd";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Tax1099CalculatorForm } from "@/components/calculators/Tax1099CalculatorForm";
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
  title: "1099 Contractor Tax Calculator (Freelancers & Gig Workers)",
  description:
    "Calculate federal taxes on 1099-NEC and 1099-K independent contractor earnings with deductible expense categories and savings set-aside percentage.",
  path: "/tax-calculators/1099",
});

export default function Tax1099CalculatorPage() {
  const faqs = [
    {
      question: "What tax rate should 1099 contractors set aside?",
      answer:
        "Because 1099 contractors pay both federal income tax and full 15.3% self-employment tax, most tax advisors recommend setting aside 25% to 35% of net profit (gross income minus deductible expenses) into a dedicated tax savings account.",
    },
    {
      question: "What business expenses can I deduct from 1099 revenue?",
      answer:
        "Under IRC § 162, you can deduct ordinary and necessary business expenses such as professional software, hardware, home office expenses, marketing, professional insurance, and business travel. Every dollar of legitimate deductions reduces your net taxable profit.",
    },
    {
      question: "Do I pay self-employment tax on my gross 1099 income or net profit?",
      answer:
        "You only pay self-employment tax and income tax on net profit (gross revenue minus allowable business expenses). You never pay tax on deductible operating expenses.",
    },
    {
      question: "Does this calculator include Form 1040-ES quarterly vouchers?",
      answer:
        "The calculator provides your estimated total federal liability. You can use our Quarterly Tax Calculator to divide this liability into four equal Form 1040-ES payment vouchers with official due dates.",
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
            { name: "1099 Contractor Tax Calculator", item: "/tax-calculators/1099" },
          ]}
          className="mb-6"
        />

        {/* Page Header */}
        <div className="max-w-3xl mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="emerald" size="md">
              1099-NEC & 1099-K
            </Badge>
            <span className="text-xs font-medium text-surface-600">
              Tax Years 2025 & 2026 Supported
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-surface-900 tracking-tight">
            1099 Contractor Tax Calculator
          </h1>
          <p className="mt-3 text-base sm:text-lg text-surface-700 leading-relaxed">
            Estimate total federal taxes, self-employment liabilities, and recommended savings set-asides on freelance, consulting, and gig contract revenue with deductible expense categories.
          </p>
        </div>

        {/* Interactive Calculator Form */}
        <div className="mb-12">
          <Tax1099CalculatorForm />
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
                This tool is tailored for independent contractors, creative freelancers, tech consultants, and gig platform workers (Uber, Lyft, DoorDash, Upwork) who receive Form 1099-NEC or Form 1099-K and need to account for deductible operational overhead.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-surface-200 p-6 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                <Cpu className="w-4 h-4" />
                <h2>How the Calculation Works</h2>
              </div>
              <p className="text-xs sm:text-sm text-surface-600 leading-relaxed">
                The engine subtracts your allowable business expenses from gross 1099 receipts to determine Schedule C net profit. Net profit is multiplied by 92.35% for Schedule SE (15.3%), 50% of SE tax is deducted on Schedule 1, and your remaining income is taxed across federal progressive brackets minus your standard deduction.
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
                  <span><strong>Gross 1099 Revenue:</strong> Total compensation from clients or platforms.</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                  <span><strong>Business Expenses:</strong> Hardware, software, travel, and supply write-offs.</span>
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
                <h2>Statutory Limitations</h2>
              </div>
              <ul className="space-y-1.5 text-xs text-surface-600">
                <li>• Covers federal taxes only; state income and state franchise taxes are not included.</li>
                <li>• Taxpayer must maintain contemporaneous receipts and audit documentation for expenses.</li>
                <li>• Does not compute depreciation schedules for capital real property under MACRS.</li>
              </ul>
            </div>
          </div>

          {/* Relevant FAQs */}
          <div className="bg-white rounded-3xl border border-surface-200 p-6 sm:p-8 space-y-6 shadow-xs">
            <h2 className="text-xl font-bold text-surface-900 tracking-tight flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-brand-600" />
              <span>1099 Contractor Tax FAQ</span>
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
                <h3>Educational Contractor Guides</h3>
              </div>
              <div className="space-y-2 text-xs">
                <Link
                  href="/tax-guides/1099-contractor-tax-basics"
                  className="block p-2.5 rounded-lg hover:bg-surface-50 text-surface-800 hover:text-brand-600 transition-colors"
                >
                  → <strong>1099 Contractor Tax Basics</strong>: Schedule C allowable write-offs
                </Link>
                <Link
                  href="/tax-guides/how-self-employment-tax-works"
                  className="block p-2.5 rounded-lg hover:bg-surface-50 text-surface-800 hover:text-brand-600 transition-colors"
                >
                  → <strong>How Self-Employment Tax Works</strong>: Schedule SE 15.3% mechanics
                </Link>
                <Link
                  href="/tax-guides/quarterly-estimated-tax-guide"
                  className="block p-2.5 rounded-lg hover:bg-surface-50 text-surface-800 hover:text-brand-600 transition-colors"
                >
                  → <strong>Quarterly Estimated Taxes</strong>: Avoid underpayment penalty fees
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
                  href="/tax-calculators/quarterly-tax"
                  className="block p-2.5 rounded-lg hover:bg-surface-50 text-surface-800 hover:text-brand-600 transition-colors"
                >
                  → <strong>Quarterly Tax Calculator</strong>: Form 1040-ES installment vouchers
                </Link>
                <Link
                  href="/tax-calculators/self-employed"
                  className="block p-2.5 rounded-lg hover:bg-surface-50 text-surface-800 hover:text-brand-600 transition-colors"
                >
                  → <strong>Self-Employed Tax Calculator</strong>: Schedule SE wage cap offsets
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
