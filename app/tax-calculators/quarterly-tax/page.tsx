import React from "react";
import { Metadata } from "next";
import { constructMetadata } from "../../../lib/seo/metadata";
import { CalculatorLayout } from "../../../components/calculators/CalculatorLayout";
import { QuarterlyTaxCalculatorForm } from "../../../components/calculators/QuarterlyTaxCalculatorForm";

export const metadata: Metadata = constructMetadata({
  title: "Quarterly Estimated Tax Calculator (IRS Form 1040-ES)",
  description:
    "Calculate IRS Form 1040-ES estimated quarterly payments across all four payment periods to prevent underpayment penalties.",
  path: "/tax-calculators/quarterly-tax",
});

export default function QuarterlyTaxCalculatorPage() {
  return (
    <CalculatorLayout
      title="Quarterly Estimated Tax Calculator"
      badge="IRS Form 1040-ES"
      description="Compute your projected annual federal liabilities and break them into four equal quarterly installments with official IRS voucher payment deadlines."
    >
      <QuarterlyTaxCalculatorForm />
    </CalculatorLayout>
  );
}
