import React from "react";
import { Metadata } from "next";
import { constructMetadata } from "../../../lib/seo/metadata";
import { Container } from "../../../components/ui/Container";
import { FAQAccordion } from "../../../components/shared/FAQAccordion";
import { Badge } from "../../../components/ui/Badge";
import { FAQItem } from "../../../types/common";

export const metadata: Metadata = constructMetadata({
  title: "Frequently Asked Questions (FAQ) — TaxAIHelp",
  description:
    "Common questions about federal tax brackets, 1099 deductions, quarterly estimated deadlines, and AI calculation boundaries.",
  path: "/faq",
});

export default function FAQPage() {
  const faqs: FAQItem[] = [
    {
      question: "How does TaxAIHelp calculate federal income tax?",
      answer:
        "TaxAIHelp implements an isolated, deterministic tax calculation engine that operates in integer cents. The engine applies the seven progressive federal income tax brackets (10%, 12%, 22%, 24%, 32%, 35%, and 37%) according to officially published IRS Revenue Procedures (Rev. Proc. 2023-34 for tax year 2024).",
    },
    {
      question: "Why doesn't the AI calculate taxes directly?",
      answer:
        "Large language models (LLMs) are probabilistic and prone to math hallucinations. For financial tax calculations, probabilistic approximation is unacceptable. Therefore, we restrict Gemini to intent extraction and plain-English explanation, while our deterministic code calculates the exact numbers.",
    },
    {
      question: "Is TaxAIHelp affiliated with or approved by the IRS?",
      answer:
        "No. TaxAIHelp is an independent educational technology platform. We have no affiliation with, nor endorsement from, the Internal Revenue Service (IRS) or any government department.",
    },
    {
      question: "What is the difference between standard and itemized deductions?",
      answer:
        "The standard deduction is a fixed dollar amount that reduces your taxable income, adjusted annually for inflation ($14,600 for Single and $29,200 for Married Filing Jointly in 2024). Itemized deductions (Schedule A) let you deduct specific qualifying expenses such as state and local taxes (SALT up to $10,000), mortgage interest, and charitable gifts. Our calculators automatically utilize whichever option yields the lower tax liability.",
    },
    {
      question: "How does self-employment tax work for freelancers and 1099 workers?",
      answer:
        "Under the Self-Employment Contributions Act (SECA), freelancers and 1099 contractors pay both the employee and employer portions of Social Security (12.4%) and Medicare (2.9%), totaling 15.3%. This is applied to 92.35% of net business earnings. You can deduct 50% of this self-employment tax directly on Form 1040 to lower your adjusted gross income.",
    },
    {
      question: "What are IRS Safe Harbor rules for quarterly estimated taxes?",
      answer:
        "To avoid IRS underpayment penalties, you generally must pay through withholding and quarterly estimates either 90% of your current year’s total tax liability or 100% of your prior year’s tax liability (110% if prior year adjusted gross income exceeded $150,000).",
    },
    {
      question: "Are state and local income taxes included in the calculations?",
      answer:
        "Not in this initial foundation version. TaxAIHelp currently focuses solely on US Federal tax calculations. State income taxes vary significantly across all 50 states and must be evaluated separately.",
    },
  ];

  return (
    <div className="py-16 bg-surface-50 min-h-screen">
      <Container size="md">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="brand" className="mb-3">
            Knowledge Base
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-black text-surface-900 tracking-tight">
            Frequently Asked Questions
          </h1>
          <p className="mt-3 text-sm sm:text-base text-surface-600">
            Find detailed answers about federal tax computations, IRS rule tables, and platform features.
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-surface-200 shadow-subtle">
          <FAQAccordion items={faqs} />
        </div>
      </Container>
    </div>
  );
}
