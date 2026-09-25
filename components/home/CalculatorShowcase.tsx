import React from "react";
import { Container } from "../ui/Container";
import { Section } from "../ui/Section";
import { CalculatorCard } from "../calculators/CalculatorCard";

export function CalculatorShowcase() {
  const calculators = [
    {
      title: "Federal Income Tax Calculator",
      description:
        "Deterministic tax computation for W-2 wage earners, joint filers, and standard/itemized deduction comparisons.",
      href: "/tax-calculators/income-tax",
      badge: "Form 1040",
      features: [
        "2025 & 2026 progressive bracket math",
        "Official IRS standard deductions",
        "Withholding refund / balance due",
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
        "Calculates Schedule SE self-employment tax, 15.3% Social Security & Medicare liability, and above-the-line deduction.",
      href: "/tax-calculators/self-employed",
      badge: "Schedule SE",
      features: [
        "92.35% statutory net factor",
        "Social Security wage base cap handling",
        "50% deduction of SE tax for AGI",
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
        "Designed specifically for freelancers, consultants, and gig economy workers with deductible business expense tracking.",
      href: "/tax-calculators/1099",
      badge: "1099-NEC & 1099-K",
      features: [
        "Itemized expense categories",
        "Recommended tax savings set-aside",
        "Combined income & SE tax rate",
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
        "Calculates Form 1040-ES installments across all four quarterly IRS deadlines with safe-harbor rule guidance.",
      href: "/tax-calculators/quarterly-tax",
      badge: "Form 1040-ES",
      features: [
        "Four equal installment vouchers",
        "IRS official payment due dates",
        "Underpayment penalty avoidance notes",
      ],
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  return (
    <Section background="muted" spacing="lg">
      <Container size="xl">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-xs uppercase font-extrabold tracking-wider text-brand-600 mb-2">
            Deterministic Tax Engine
          </h2>
          <h3 className="text-3xl sm:text-4xl font-black text-surface-900 tracking-tight">
            Specialized Calculators for Every US Tax Situation
          </h3>
          <p className="mt-3 text-surface-600 text-base sm:text-lg">
            Choose your taxpayer profile to calculate exact federal liabilities using verified IRS rule tables.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {calculators.map((calc) => (
            <CalculatorCard key={calc.title} {...calc} />
          ))}
        </div>
      </Container>
    </Section>
  );
}
