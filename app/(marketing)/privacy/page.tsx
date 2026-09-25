import React from "react";
import { Metadata } from "next";
import { constructMetadata } from "../../../lib/seo/metadata";
import { Container } from "../../../components/ui/Container";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";

export const metadata: Metadata = constructMetadata({
  title: "Privacy Policy",
  description:
    "How TaxAIHelp collects, protects, and handles user information. We prioritize data minimization and do not sell financial data.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <div className="py-16 bg-surface-50 min-h-screen">
      <Container size="md">
        <div className="max-w-3xl mx-auto space-y-8">
          <div>
            <Badge variant="brand" className="mb-3">
              Privacy & Security
            </Badge>
            <h1 className="text-3xl sm:text-4xl font-black text-surface-900 tracking-tight">
              Privacy Policy
            </h1>
            <p className="mt-2 text-xs text-surface-500">
              Effective Date: January 2025 • TaxAIHelp (taxaihelp.com)
            </p>
          </div>

          <Card className="p-8 space-y-6 text-sm text-surface-700 leading-relaxed bg-white">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-surface-900">
                1. Information We Collect
              </h2>
              <p>
                <strong>Anonymous Calculations:</strong> When you use our public tax calculators without creating an account, your numerical inputs are processed in-memory solely to generate the calculation result. We do not store or associate anonymous inputs with your identity.
              </p>
              <p>
                <strong>Account & Inquiries:</strong> If you voluntarily create an account or request a Tax Professional match, we collect your name, email address, taxpayer category, and any notes you provide.
              </p>
            </section>

            <section className="space-y-3 border-t border-surface-200 pt-6">
              <h2 className="text-lg font-bold text-surface-900">
                2. How We Use Your Data
              </h2>
              <p>
                We use collected information solely to:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Provide accurate deterministic tax calculation results and AI assistance.</li>
                <li>Connect you with licensed CPAs or Enrolled Agents when explicitly requested.</li>
                <li>Maintain system performance, security, and prevent fraudulent misuse.</li>
              </ul>
            </section>

            <section className="space-y-3 border-t border-surface-200 pt-6">
              <h2 className="text-lg font-bold text-surface-900">
                3. We Do Not Sell Your Data
              </h2>
              <p>
                TaxAIHelp does not sell, rent, or trade your personal information or financial calculation inputs to third-party data brokers or advertisers.
              </p>
            </section>

            <section className="space-y-3 border-t border-surface-200 pt-6">
              <h2 className="text-lg font-bold text-surface-900">
                4. Data Security & Storage
              </h2>
              <p>
                We implement industry-standard encryption protocols (TLS/SSL in transit) and strict security boundaries. Any server-side AI processing via Gemini is executed via secure backend API calls; client browser bundles never expose private API credentials.
              </p>
            </section>

            <section className="space-y-3 border-t border-surface-200 pt-6">
              <h2 className="text-lg font-bold text-surface-900">
                5. Contact Us
              </h2>
              <p>
                For questions regarding this Privacy Policy or your data rights, please contact us at{" "}
                <a href="mailto:privacy@taxaihelp.com" className="text-brand-600 underline">
                  privacy@taxaihelp.com
                </a>
                .
              </p>
            </section>
          </Card>
        </div>
      </Container>
    </div>
  );
}
