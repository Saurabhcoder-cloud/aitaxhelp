import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { constructMetadata } from "../../../lib/seo/metadata";
import { Container } from "../../../components/ui/Container";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import {
  FileText,
  ShieldCheck,
  Cpu,
  CreditCard,
  Users,
  AlertCircle,
  HelpCircle,
  Mail,
} from "lucide-react";

export const metadata: Metadata = constructMetadata({
  title: "Terms of Service | TaxAIHelp Agreement & Policies",
  description:
    "Terms of service governing the use of TaxAIHelp tax calculators, AI assistant conversations, subscription plans, and CPA/EA referral workflows.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <div className="py-12 bg-surface-50 min-h-screen">
      <Container size="md">
        <Breadcrumbs items={[{ name: "Terms of Service", item: "/terms" }]} className="mb-6" />

        <div className="max-w-3xl mx-auto space-y-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 text-brand-700 border border-brand-200 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
              <FileText className="w-3.5 h-3.5" />
              <span>User Agreement & Governance</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-surface-900 tracking-tight">
              Terms of Service
            </h1>
            <p className="mt-2 text-xs text-surface-500">
              Effective Date: January 1, 2025 • Last Updated: October 2025 • TaxAIHelp (taxaihelp.com)
            </p>
          </div>

          <Card className="p-8 space-y-8 text-sm text-surface-700 leading-relaxed bg-white shadow-xs">
            {/* 1. Acceptance */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-surface-900">
                1. Acceptance of Terms
              </h2>
              <p>
                By creating an account, accessing, or utilizing the website, software, tax calculators, or AI assistance services available at taxaihelp.com (collectively, the &ldquo;Platform&rdquo; or &ldquo;Service&rdquo;), you enter into a legally binding agreement with TaxAIHelp. If you do not agree with any provision of these Terms, you must immediately discontinue use of the Platform.
              </p>
            </section>

            {/* 2. Platform Description & Non-CPA Status */}
            <section className="space-y-3 border-t border-surface-200 pt-6">
              <h2 className="text-lg font-bold text-surface-900">
                2. Nature of the Service & Non-CPA Status
              </h2>
              <p>
                TaxAIHelp is an informational financial technology software platform providing:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
                <li>Deterministic calculations of US federal individual income tax (Form 1040), Schedule SE self-employment tax, 1099 contractor expense tracking, and Form 1040-ES quarterly estimates.</li>
                <li>Conversational natural language tax education powered by artificial intelligence.</li>
                <li>Scenario comparison and downloadable tax summary reports.</li>
                <li>Optional inquiry handoff to independent, third-party licensed CPAs and Enrolled Agents.</li>
              </ul>
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                <strong>CRITICAL NOTICE:</strong> TaxAIHelp is not a certified public accounting firm, not an Enrolled Agent practice, and not a law firm. The Service does not provide legal representation or formal tax filing with government revenue authorities.
              </div>
            </section>

            {/* 3. Account Responsibilities */}
            <section className="space-y-3 border-t border-surface-200 pt-6">
              <h2 className="text-lg font-bold text-surface-900">
                3. User Account Responsibilities
              </h2>
              <p>
                When creating an account on TaxAIHelp:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
                <li>You must be at least 18 years of age or the age of legal majority in your jurisdiction.</li>
                <li>You agree to provide true, accurate, and current profile preferences (tax year, filing status, taxpayer category).</li>
                <li>You are solely responsible for maintaining the confidentiality of your authentication credentials and session tokens.</li>
                <li>You must promptly notify us of any suspected unauthorized access to your account.</li>
              </ul>
            </section>

            {/* 4. Acceptable & Prohibited Use */}
            <section className="space-y-3 border-t border-surface-200 pt-6">
              <h2 className="text-lg font-bold text-surface-900">
                4. Acceptable Use & Prohibited Conduct
              </h2>
              <p>
                You agree not to engage in any of the following prohibited activities:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-surface-600">
                <li>Submitting prompt-injection attacks, jailbreaks, or malicious commands to the AI assistant.</li>
                <li>Using automated spiders, scrapers, or scripts to harvest tax content or overwhelm infrastructure.</li>
                <li>Attempting to bypass authentication, reverse-engineer deterministic engine bytecode, or probe system vulnerabilities.</li>
                <li>Using the Platform to facilitate tax evasion, fraudulent filings, or unlawful money laundering schemes.</li>
                <li>Submitting fabricated contact details or spam inquiries to the CPA referral network.</li>
              </ul>
            </section>

            {/* 5. AI Assistant Limitations */}
            <section className="space-y-3 border-t border-surface-200 pt-6">
              <h2 className="text-lg font-bold text-surface-900 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-brand-600" />
                <span>5. Artificial Intelligence (AI) Assistant Limitations</span>
              </h2>
              <p>
                Our AI Tax Assistant translates deterministic tax calculation results into accessible explanations. However:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
                <li>The AI assistant does not compute numerical tax obligations autonomously. All numerical liabilities are determined exclusively by the deterministic tax engine.</li>
                <li>AI outputs are for educational context only and may occasionally generate linguistic generalizations. You must verify all planning concepts with official IRS documentation or a licensed professional.</li>
                <li>You should never submit Social Security Numbers, Employer Identification Numbers, or bank account credentials into AI prompts.</li>
              </ul>
            </section>

            {/* 6. Subscriptions, Billing, & Usage Quotas */}
            <section className="space-y-3 border-t border-surface-200 pt-6">
              <h2 className="text-lg font-bold text-surface-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-brand-600" />
                <span>6. Subscriptions, Billing, & Usage Quotas</span>
              </h2>
              <div className="space-y-2 text-xs sm:text-sm">
                <p>
                  <strong>Free Community Tier:</strong> Access to core deterministic federal calculators (W-2, Schedule SE, 1099, Form 1040-ES), calculation history, and 10 daily AI assistant queries (resetting at 00:00 UTC).
                </p>
                <p>
                  <strong>TaxAI Premium Tier:</strong> Expands AI capacity to 100 queries per day, unlocks full exportable tax summary reports, and provides priority CPA inquiry triage. Available on a monthly ($19/month) or annual ($149/year) subscription.
                </p>
                <p>
                  <strong>Cancellation & Downgrades:</strong> You may cancel recurring billing at any time from your Billing Settings. Cancellation takes effect at the end of the current billing cycle. Your historical saved calculations remain preserved and accessible.
                </p>
                <div className="p-3 rounded-lg bg-surface-50 border border-surface-200 text-xs text-surface-600">
                  <em>Staging Payment Gateway Notice:</em> The monetization infrastructure is currently configured in staging mode. Live credit card transactions will be activated during production launch.
                </div>
              </div>
            </section>

            {/* 7. Professional Referrals */}
            <section className="space-y-3 border-t border-surface-200 pt-6">
              <h2 className="text-lg font-bold text-surface-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-600" />
                <span>7. Third-Party CPA & Enrolled Agent Referrals</span>
              </h2>
              <p>
                TaxAIHelp provides an inquiry handoff mechanism connecting taxpayers with independent licensed CPAs and Enrolled Agents. You acknowledge that:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
                <li>Independent tax professionals are not employees, agents, or partners of TaxAIHelp.</li>
                <li>Any professional engagement, return preparation agreement, or fee arrangement is strictly between you and the independent professional.</li>
                <li>TaxAIHelp disclaims any liability for advice, filings, errors, or omissions by third-party professionals.</li>
              </ul>
            </section>

            {/* 8. Intellectual Property */}
            <section className="space-y-3 border-t border-surface-200 pt-6">
              <h2 className="text-lg font-bold text-surface-900">
                8. Intellectual Property & User Content
              </h2>
              <p>
                The deterministic tax engine, bracket algorithms, user interfaces, branding, blog articles, and tax guides are the exclusive intellectual property of TaxAIHelp. You retain full ownership of any personal tax inputs, scenarios, and calculation data you submit.
              </p>
            </section>

            {/* 9. Data Portability & Account Deletion */}
            <section className="space-y-3 border-t border-surface-200 pt-6">
              <h2 className="text-lg font-bold text-surface-900">
                9. Data Portability & Account Deletion
              </h2>
              <p>
                You may at any time request an export of your saved calculations, profile, and conversations via our automated export endpoint (<code>GET /api/v1/auth/account/export</code>), or request permanent deletion of your account and records via <code>POST /api/v1/auth/account/delete</code>.
              </p>
            </section>

            {/* 10. Limitation of Liability */}
            <section className="space-y-3 border-t border-surface-200 pt-6">
              <h2 className="text-lg font-bold text-surface-900">
                10. Limitation of Liability & Warranty Disclaimer
              </h2>
              <p>
                To the fullest extent permitted by applicable law, the Service is provided on an &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; basis without warranties of any kind.
              </p>
              <p className="text-xs text-surface-600">
                TaxAIHelp, its directors, employees, and affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including any IRS tax penalties, interest assessments, missed deadlines, or lost refunds arising from your use of or inability to use the Platform. In no event shall our aggregate liability exceed the amounts paid by you to TaxAIHelp in the twelve (12) months preceding the claim.
              </p>
            </section>

            {/* 11. Contact & Notices */}
            <section className="space-y-3 border-t border-surface-200 pt-6">
              <h2 className="text-lg font-bold text-surface-900 flex items-center gap-2">
                <Mail className="w-4 h-4 text-brand-600" />
                <span>11. Contact Us</span>
              </h2>
              <p>
                For legal notices, terms inquiries, or account questions, contact us at:
              </p>
              <div className="p-4 rounded-xl bg-surface-50 border border-surface-200 text-xs space-y-1">
                <div><strong>Email:</strong> <a href="mailto:support@taxaihelp.com" className="text-brand-600 underline">support@taxaihelp.com</a></div>
                <div><strong>Legal Department:</strong> <a href="mailto:legal@taxaihelp.com" className="text-brand-600 underline">legal@taxaihelp.com</a></div>
                <div><strong>Contact Portal:</strong> <Link href="/contact" className="text-brand-600 underline">taxaihelp.com/contact</Link></div>
              </div>
            </section>
          </Card>
        </div>
      </Container>
    </div>
  );
}
