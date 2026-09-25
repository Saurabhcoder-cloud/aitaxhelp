import React from "react";
import { Metadata } from "next";
import { constructMetadata } from "../../../lib/seo/metadata";
import { CalculatorLayout } from "../../../components/calculators/CalculatorLayout";
import { IncomeTaxCalculatorForm } from "../../../components/calculators/IncomeTaxCalculatorForm";

export const metadata: Metadata = constructMetadata({
  title: "Federal Income Tax Calculator (2025 & 2026)",
  description:
    "Deterministic US federal income tax calculator for W-2 wages, standard deduction, and progressive bracket breakdowns according to IRS IRB 2025-45 (OBBBA) and Rev. Proc. 2025-32.",
  path: "/tax-calculators/income-tax",
});

export default function IncomeTaxCalculatorPage() {
  return (
    <CalculatorLayout
      title="Federal Income Tax Calculator"
      badge="IRS IRB 2025-45 / Rev. Proc. 2025-32"
      description="Estimate your federal income tax liability, effective tax rate, and withholding refund or balance due using verified IRS progressive tax brackets and official standard deduction rules."
    >
      <IncomeTaxCalculatorForm />
    </CalculatorLayout>
  );
}
