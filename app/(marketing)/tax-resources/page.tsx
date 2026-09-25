import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { constructMetadata } from "../../../lib/seo/metadata";
import { Container } from "../../../components/ui/Container";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";

export const metadata: Metadata = constructMetadata({
  title: "Tax Resources & Educational Guides (2024)",
  description:
    "Free educational tax resources, IRS publication summaries, 1099 deduction checklists, and federal bracket explainers.",
  path: "/tax-resources",
});

export default function TaxResourcesPage() {
  const resources = [
    {
      title: "2024 Federal Income Tax Brackets & Rates",
      category: "Tax Tables",
      readTime: "4 min read",
      description:
        "Comprehensive breakdown of the seven progressive federal tax brackets (10% to 37%) based on IRS Revenue Procedure 2023-34.",
      href: "/tax-calculators/income-tax",
    },
    {
      title: "Self-Employment Tax (Schedule SE) Explained",
      category: "Freelance & 1099",
      readTime: "6 min read",
      description:
        "How Social Security (12.4%) and Medicare (2.9%) taxes apply to 92.35% of your net freelance earnings and how the 50% above-the-line deduction works.",
      href: "/tax-calculators/self-employed",
    },
    {
      title: "1099 Contractor Deductible Expense Checklist",
      category: "Deductions",
      readTime: "8 min read",
      description:
        "Legitimate ordinary and necessary business expenses: home office deductions, mileage tracking, software tools, and health insurance premiums.",
      href: "/tax-calculators/1099",
    },
    {
      title: "Quarterly Estimated Taxes (Form 1040-ES) Deadlines",
      category: "Compliance",
      readTime: "5 min read",
      description:
        "A complete guide to avoiding underpayment penalties using IRS Safe Harbor rules and meeting the four annual payment deadlines.",
      href: "/tax-calculators/quarterly-tax",
    },
    {
      title: "Standard Deduction vs. Itemized Deductions",
      category: "Filing Strategy",
      readTime: "5 min read",
      description:
        "Comparing the 2024 standard deduction thresholds ($14,600 Single / $29,200 Married Filing Jointly) against itemized Schedule A deductions.",
      href: "/tax-calculators/income-tax",
    },
    {
      title: "W-2 Withholding: How Form W-4 Affects Your Tax Bill",
      category: "Paycheck Planning",
      readTime: "6 min read",
      description:
        "Why large tax refunds mean you gave the government an interest-free loan and how to calibrate your Form W-4 allowances.",
      href: "/tax-calculators/income-tax",
    },
  ];

  return (
    <div className="py-12 bg-surface-50 min-h-screen">
      <Container size="xl">
        <div className="max-w-3xl mb-12">
          <Badge variant="brand" className="mb-3">
            Educational Knowledge Base
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-black text-surface-900 tracking-tight">
            Tax Resources & Guides
          </h1>
          <p className="mt-3 text-base sm:text-lg text-surface-600 leading-relaxed">
            Clear, accurate federal tax education written to help individual taxpayers, freelancers, and small businesses navigate IRS guidelines with confidence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((res, i) => (
            <Card key={i} variant="interactive" className="flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-surface-500 mb-3">
                  <Badge variant="neutral">{res.category}</Badge>
                  <span>{res.readTime}</span>
                </div>
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="text-lg leading-snug">{res.title}</CardTitle>
                </CardHeader>
                <CardContent className="px-0 pt-0 text-sm text-surface-600 leading-relaxed">
                  {res.description}
                </CardContent>
              </div>

              <div className="pt-4 border-t border-surface-100 mt-6">
                <Link
                  href={res.href}
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                >
                  Explore Related Calculator & Guide →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </Container>
    </div>
  );
}
