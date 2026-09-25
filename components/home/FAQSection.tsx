import React from "react";
import Link from "next/link";
import { Container } from "../ui/Container";
import { Section } from "../ui/Section";
import { FAQAccordion } from "../shared/FAQAccordion";
import { FAQItem } from "../../types/common";

export function FAQSection() {
  const faqs: FAQItem[] = [
    {
      question: "Does the AI assistant calculate my taxes directly?",
      answer:
        "No. To protect against mathematical errors and AI hallucinations, our artificial intelligence models never compute tax liabilities. Instead, AI extracts your filing parameters, routes them to our deterministic tax engine (which executes verified IRS formulas in integer cents), and then translates the verified calculation into plain English.",
    },
    {
      question: "Is TaxAIHelp approved or endorsed by the IRS?",
      answer:
        "No. TaxAIHelp is an independent educational and estimation platform. It is not affiliated with, endorsed by, or approved by the Internal Revenue Service or any government agency. All outputs are deterministic estimates based on publicly available IRS Revenue Procedures.",
    },
    {
      question: "How is self-employment tax calculated for 1099 workers?",
      answer:
        "For 2024 and 2023, self-employment tax (Schedule SE) consists of a 12.4% Social Security tax (up to the annual wage base limit) and a 2.9% Medicare tax. The IRS applies this 15.3% rate to 92.35% of your net business profit (gross revenue minus allowable ordinary expenses). Additionally, you receive an above-the-line deduction for 50% of the self-employment tax you pay.",
    },
    {
      question: "When are IRS quarterly estimated taxes due?",
      answer:
        "For most calendar-year taxpayers, Form 1040-ES estimated payments are due in four installments: April 15 (Q1), June 15 or 17 (Q2), September 15 or 16 (Q3), and January 15 of the following year (Q4). If a due date falls on a weekend or federal holiday, it moves to the next business day.",
    },
    {
      question: "Can I file my official tax return directly through TaxAIHelp?",
      answer:
        "TaxAIHelp is strictly an educational tax calculator and AI guidance platform. We do not transmit tax returns to the IRS or state tax authorities. If you require formal tax preparation and filing, you can use our Tax Professional referral directory to connect with a licensed CPA or Enrolled Agent.",
    },
    {
      question: "Does TaxAIHelp support state income taxes?",
      answer:
        "In this foundation phase, TaxAIHelp focuses strictly on US Federal income tax, self-employment tax, and Form 1040-ES quarterly estimates. State and local taxes are not included in calculations and must be evaluated separately according to your state of residency.",
    },
  ];

  return (
    <Section background="muted" spacing="lg">
      <Container size="md">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-xs uppercase font-extrabold tracking-wider text-brand-600 mb-2">
            Questions & Answers
          </h2>
          <h3 className="text-3xl sm:text-4xl font-black text-surface-900 tracking-tight">
            Frequently Asked Questions
          </h3>
          <p className="mt-3 text-surface-600 text-base">
            Have questions about how TaxAIHelp works, our IRS sources, or our calculation methodologies?
          </p>
        </div>

        <FAQAccordion items={faqs} />

        <div className="mt-8 text-center">
          <Link
            href="/faq"
            className="text-sm font-semibold text-brand-600 hover:text-brand-700 underline"
          >
            View the complete Knowledge Base & FAQ page →
          </Link>
        </div>
      </Container>
    </Section>
  );
}
