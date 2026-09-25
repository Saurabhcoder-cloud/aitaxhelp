import React from "react";
import { Metadata } from "next";
import { constructMetadata } from "../../../lib/seo/metadata";
import { Container } from "../../../components/ui/Container";
import { Card, CardContent } from "../../../components/ui/Card";
import { Alert } from "../../../components/ui/Alert";
import { Badge } from "../../../components/ui/Badge";

export const metadata: Metadata = constructMetadata({
  title: "Legal & Regulatory Disclaimer",
  description:
    "Important disclosures regarding the educational scope of TaxAIHelp calculations, lack of IRS affiliation, and recommendation to consult a licensed CPA.",
  path: "/disclaimer",
});

export default function DisclaimerPage() {
  return (
    <div className="py-16 bg-surface-50 min-h-screen">
      <Container size="md">
        <div className="max-w-3xl mx-auto space-y-8">
          <div>
            <Badge variant="amber" className="mb-3">
              Compliance & Legal Notice
            </Badge>
            <h1 className="text-3xl sm:text-4xl font-black text-surface-900 tracking-tight">
              Legal & Calculation Disclaimer
            </h1>
            <p className="mt-2 text-xs text-surface-500">
              Last updated: January 2025 • Applicable to all calculations and AI interactions
            </p>
          </div>

          <Alert variant="warning" title="Not Tax or Legal Advice">
            The information, calculators, and AI assistance provided on TaxAIHelp (taxaihelp.com) are intended strictly for educational and informational purposes. They do not constitute formal tax, legal, accounting, or financial planning advice.
          </Alert>

          <Card className="p-8 space-y-6 text-sm text-surface-700 leading-relaxed bg-white">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-surface-900">
                1. No IRS Affiliation or Government Approval
              </h2>
              <p>
                TaxAIHelp is an independent educational platform. <strong>TaxAIHelp is NOT affiliated with, sponsored by, authorized by, or endorsed by the Internal Revenue Service (IRS), the United States Department of the Treasury, or any state or local taxing authority.</strong> No claim of IRS approval exists or should be inferred.
              </p>
            </section>

            <section className="space-y-3 border-t border-surface-200 pt-6">
              <h2 className="text-lg font-bold text-surface-900">
                2. Calculations Are Deterministic Estimates
              </h2>
              <p>
                All calculators on TaxAIHelp provide mathematical estimates based on user-supplied numbers and standard IRS published tables (e.g., Rev. Proc. 2023-34 and 2022-38). Actual tax liabilities depend upon your complete and verified tax return, supporting documentation, state residency, municipal local taxes, and unique statutory deductions or limitations.
              </p>
            </section>

            <section className="space-y-3 border-t border-surface-200 pt-6">
              <h2 className="text-lg font-bold text-surface-900">
                3. No Guarantees of Refunds or Outcomes
              </h2>
              <p>
                TaxAIHelp never guarantees any specific tax refund, tax savings, or liability reduction. Any calculations showing an estimated refund or amount owed reflect hypothetical mathematical scenarios based solely on the inputs you provide.
              </p>
            </section>

            <section className="space-y-3 border-t border-surface-200 pt-6">
              <h2 className="text-lg font-bold text-surface-900">
                4. Unsupported Tax Situations
              </h2>
              <p>
                In this foundation release, TaxAIHelp focuses strictly on basic US federal income tax, Schedule SE self-employment tax, and Form 1040-ES quarterly estimations. Unsupported tax situations—including but not limited to state and local taxes, Alternative Minimum Tax (AMT), foreign earned income exclusions, complex passive activity losses, and corporate entity filings—are NOT fully calculated and should not be relied upon as complete returns.
              </p>
            </section>

            <section className="space-y-3 border-t border-surface-200 pt-6">
              <h2 className="text-lg font-bold text-surface-900">
                5. Recommendation to Consult Licensed Tax Professionals
              </h2>
              <p>
                You should always verify important tax decisions, filings, and complex financial transactions with a qualified, licensed Certified Public Accountant (CPA), Enrolled Agent (EA), or tax attorney authorized to practice before the IRS.
              </p>
            </section>
          </Card>
        </div>
      </Container>
    </div>
  );
}
