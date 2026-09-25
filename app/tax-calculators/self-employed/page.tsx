import React from "react";
import { Metadata } from "next";
import { constructMetadata } from "../../../lib/seo/metadata";
import { CalculatorLayout } from "../../../components/calculators/CalculatorLayout";
import { SelfEmployedCalculatorForm } from "../../../components/calculators/SelfEmployedCalculatorForm";

export const metadata: Metadata = constructMetadata({
  title: "Self-Employed Tax Calculator (Schedule SE & 1040)",
  description:
    "Calculate Schedule SE self-employment tax (Social Security & Medicare), business profit factor, and above-the-line deduction.",
  path: "/tax-calculators/self-employed",
});

export default function SelfEmployedCalculatorPage() {
  return (
    <CalculatorLayout
      title="Self-Employed Tax Calculator"
      badge="Schedule SE & Form 1040"
      description="Calculate your Schedule SE self-employment tax obligations, Social Security wage base limits, and above-the-line adjustments to determine your true federal liability."
    >
      <SelfEmployedCalculatorForm />
    </CalculatorLayout>
  );
}
