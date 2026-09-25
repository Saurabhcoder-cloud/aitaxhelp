import React from "react";
import { Metadata } from "next";
import { constructMetadata } from "../../../lib/seo/metadata";
import { CalculatorLayout } from "../../../components/calculators/CalculatorLayout";
import { Tax1099CalculatorForm } from "../../../components/calculators/Tax1099CalculatorForm";

export const metadata: Metadata = constructMetadata({
  title: "1099 Contractor Tax Calculator (Freelancers & Gig Workers)",
  description:
    "Calculate federal taxes on 1099-NEC and 1099-K independent contractor earnings with deductible expense categories.",
  path: "/tax-calculators/1099",
});

export default function Tax1099CalculatorPage() {
  return (
    <CalculatorLayout
      title="1099 Contractor Tax Calculator"
      badge="1099-NEC & 1099-K"
      description="Estimate total federal taxes, self-employment liabilities, and recommended savings set-asides on freelance, consulting, and contract revenue."
    >
      <Tax1099CalculatorForm />
    </CalculatorLayout>
  );
}
