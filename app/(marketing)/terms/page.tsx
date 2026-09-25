import React from "react";
import { Metadata } from "next";
import { constructMetadata } from "../../../lib/seo/metadata";
import { Container } from "../../../components/ui/Container";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";

export const metadata: Metadata = constructMetadata({
  title: "Terms of Service",
  description:
    "Terms and conditions governing the use of the TaxAIHelp website, deterministic calculators, and AI assistance tools.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <div className="py-16 bg-surface-50 min-h-screen">
      <Container size="md">
        <div className="max-w-3xl mx-auto space-y-8">
          <div>
            <Badge variant="brand" className="mb-3">
              Legal Agreement
            </Badge>
            <h1 className="text-3xl sm:text-4xl font-black text-surface-900 tracking-tight">
              Terms of Service
            </h1>
            <p className="mt-2 text-xs text-surface-500">
              Effective Date: January 2025 • TaxAIHelp (taxaihelp.com)
            </p>
          </div>

          <Card className="p-8 space-y-6 text-sm text-surface-700 leading-relaxed bg-white">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-surface-900">
                1. Acceptance of Terms
              </h2>
              <p>
                By accessing or using TaxAIHelp (&ldquo;Service&rdquo; or &ldquo;Platform&rdquo;), located at taxaihelp.com, you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.
              </p>
            </section>

            <section className="space-y-3 border-t border-surface-200 pt-6">
              <h2 className="text-lg font-bold text-surface-900">
                2. Nature of the Service
              </h2>
              <p>
                TaxAIHelp provides educational tax calculators and AI-assisted conversational guidance regarding US federal tax regulations. TaxAIHelp is not a certified public accounting firm, not a tax preparation service, and not a law firm. Using TaxAIHelp does not establish a CPA-client or attorney-client relationship.
              </p>
            </section>

            <section className="space-y-3 border-t border-surface-200 pt-6">
              <h2 className="text-lg font-bold text-surface-900">
                3. User Responsibilities
              </h2>
              <p>
                You are solely responsible for verifying the accuracy of any inputs you provide. You acknowledge that calculations are estimates and should not be used as official tax filings without independent professional review.
              </p>
            </section>

            <section className="space-y-3 border-t border-surface-200 pt-6">
              <h2 className="text-lg font-bold text-surface-900">
                4. Limitation of Liability
              </h2>
              <p>
                To the fullest extent permitted by applicable law, TaxAIHelp, its operators, officers, and affiliates shall not be liable for any indirect, incidental, consequential, or punitive damages, including any tax penalties, interest, or lost refunds arising from your use of the Platform or reliance on calculations.
              </p>
            </section>

            <section className="space-y-3 border-t border-surface-200 pt-6">
              <h2 className="text-lg font-bold text-surface-900">
                5. Modifications
              </h2>
              <p>
                We reserve the right to modify these terms and our calculation methodologies as IRS regulations and tax codes evolve. Continued use of the Service following updates constitutes acceptance of revised terms.
              </p>
            </section>
          </Card>
        </div>
      </Container>
    </div>
  );
}
