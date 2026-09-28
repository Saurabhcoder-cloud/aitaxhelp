import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { constructMetadata } from "../../../lib/seo/metadata";
import { Container } from "../../../components/ui/Container";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import {
  ShieldCheck,
  Lock,
  EyeOff,
  Download,
  Trash2,
  Cpu,
  FileText,
  Mail,
  HelpCircle,
} from "lucide-react";

export const metadata: Metadata = constructMetadata({
  title: "Privacy Policy | TaxAIHelp Data Protection & Rights",
  description:
    "Comprehensive privacy policy describing how TaxAIHelp collects, processes, and protects tax profile data, AI interactions, calculation history, and user rights.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <div className="py-12 bg-surface-50 min-h-screen">
      <Container size="md">
        <Breadcrumbs items={[{ name: "Privacy Policy", item: "/privacy" }]} className="mb-6" />

        <div className="max-w-3xl mx-auto space-y-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 text-brand-700 border border-brand-200 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Data Protection & User Privacy</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-surface-900 tracking-tight">
              Privacy Policy
            </h1>
            <p className="mt-2 text-xs text-surface-500">
              Effective Date: January 1, 2025 • Last Updated: October 2025 • TaxAIHelp (taxaihelp.com)
            </p>
          </div>

          <Card className="p-8 space-y-8 text-sm text-surface-700 leading-relaxed bg-white shadow-xs">
            {/* 1. Overview */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-surface-900">
                1. Overview & Architectural Commitments
              </h2>
              <p>
                TaxAIHelp (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) operates the tax intelligence and calculation platform located at taxaihelp.com. We recognize that tax and financial information is profoundly personal and sensitive.
              </p>
              <p>
                Our core privacy architecture is built on three strict principles:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
                <li><strong>Data Minimization:</strong> Anonymous calculations execute strictly in transient server memory and are never persisted to a database.</li>
                <li><strong>Zero AI Calculation Authority:</strong> AI models never compute tax numbers; AI functions exclusively as a natural language explanation layer.</li>
                <li><strong>No Commercial Data Sale:</strong> We never sell, rent, monetize, or trade your tax inputs, profile data, or calculation history to third parties or advertising networks.</li>
              </ul>
            </section>

            {/* 2. Information We Collect */}
            <section className="space-y-3 border-t border-surface-200 pt-6">
              <h2 className="text-lg font-bold text-surface-900">
                2. Information We Collect
              </h2>
              <div className="space-y-2 text-xs sm:text-sm">
                <p><strong>A. Account & Authentication Information:</strong> When you register or sign in, we process your email address, hashed credentials (via our authentication provider), and local/session tokens.</p>
                <p><strong>B. Taxpayer Profile & Onboarding Preferences:</strong> Your selected tax year (e.g. 2025 or 2026), tax filing status (Single, Married Filing Jointly, Head of Household), taxpayer category (W-2 employee, 1099 contractor, small business), and deduction preferences.</p>
                <p><strong>C. Calculation Inputs & Saved History:</strong> When signed in, you may voluntarily save tax calculation scenarios, including gross wages, business expenses, estimated quarterly payments, and withholding amounts.</p>
                <p><strong>D. Tax Summary Reports:</strong> Records and summaries generated when you create a printable or exportable tax summary.</p>
                <p><strong>E. AI Conversation History:</strong> Message text exchanged with the AI Tax Assistant is persisted for authenticated accounts to maintain multi-turn conversational context across sessions.</p>
                <p><strong>F. Professional Handoff Inquiries:</strong> When you voluntarily request a referral to a licensed CPA or Enrolled Agent, we collect your name, email, phone number, and brief description of your tax situation.</p>
                <p><strong>G. Subscription & Entitlement Metadata:</strong> Plan tier (Free Community or TaxAI Premium), billing interval (monthly or annual), renewal timestamps, and daily AI message quota counters.</p>
              </div>
            </section>

            {/* 3. AI Processing & Disclosures */}
            <section className="space-y-3 border-t border-surface-200 pt-6">
              <h2 className="text-lg font-bold text-surface-900 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-brand-600" />
                <span>3. Artificial Intelligence (AI) Data Handling & Disclosures</span>
              </h2>
              <p>
                Our AI Tax Assistant is powered by Google Gemini via secure server-side API endpoints. To ensure total confidentiality:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
                <li>AI model calls execute exclusively from our isolated server backend; private API keys are never bundled into client browsers.</li>
                <li>The AI assistant is strictly an educational explanation interface. It receives verified numerical outputs from our deterministic tax engine to translate into plain English. <strong>The AI is not an authoritative tax calculator.</strong></li>
                <li>The AI is not a Certified Public Accountant, Enrolled Agent, attorney, IRS employee, or government representative.</li>
                <li><strong>Sensitive Data Advice:</strong> We advise users never to enter Social Security Numbers (SSNs), Employer Identification Numbers (EINs), bank account numbers, or full street addresses into AI chat prompts.</li>
              </ul>
            </section>

            {/* 4. Analytics & Tracking Privacy */}
            <section className="space-y-3 border-t border-surface-200 pt-6">
              <h2 className="text-lg font-bold text-surface-900 flex items-center gap-2">
                <EyeOff className="w-4 h-4 text-brand-600" />
                <span>4. Privacy-First Analytics & Event Tracking</span>
              </h2>
              <p>
                We maintain an internal, privacy-first analytics abstraction. Our event tracker captures only high-level funnel progression (e.g. calculator page viewed, plan tier viewed).
              </p>
              <p className="font-semibold text-surface-900">
                Our analytics architecture strictly forbids capturing:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-surface-600">
                <li>Wages, gross revenue, net profit, or taxable income numbers</li>
                <li>Tax liability, estimated refunds, or balance due amounts</li>
                <li>Bank account or credit card numbers</li>
                <li>Social Security Numbers (SSNs) or Employer Identification Numbers (EINs)</li>
                <li>Tax calculation snapshot objects or AI conversation text</li>
                <li>Private notes or confidential communications</li>
              </ul>
            </section>

            {/* 5. Cookies & Local Storage */}
            <section className="space-y-3 border-t border-surface-200 pt-6">
              <h2 className="text-lg font-bold text-surface-900">
                5. Cookies & Local Storage
              </h2>
              <p>
                TaxAIHelp utilizes minimal, strictly necessary browser storage mechanisms:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
                <li><strong>Authentication Cookies:</strong> An HTTP-only, secure session cookie (<code>taxaihelp-auth-token</code>) to verify authenticated requests.</li>
                <li><strong>Local Storage:</strong> Temporary client-side UI preferences (e.g. active calculator tab or draft input values) stored exclusively on your device.</li>
                <li><strong>No Advertising Cookies:</strong> We do not deploy third-party advertising cookies or cross-site tracking beacons.</li>
              </ul>
            </section>

            {/* 6. Security Controls */}
            <section className="space-y-3 border-t border-surface-200 pt-6">
              <h2 className="text-lg font-bold text-surface-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-600" />
                <span>6. Security Controls & Data Protection</span>
              </h2>
              <p>
                We enforce multi-layered defense controls:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
                <li><strong>Encryption in Transit:</strong> All HTTP traffic is protected by modern Transport Layer Security (TLS 1.3 / HTTPS) with HTTP Strict Transport Security (HSTS).</li>
                <li><strong>Server-Derived Identity:</strong> All data modifications require authenticated server session verification. Client-supplied user IDs are strictly ignored to prevent authorization bypass.</li>
                <li><strong>Row-Level Security (RLS):</strong> Database-level access rules guarantee that taxpayers can only query their own records.</li>
                <li><strong>Role-Based Administrative Isolation:</strong> Internal administrative portals enforce strict role checks; admin audit logs and internal notes are isolated from normal user access.</li>
              </ul>
            </section>

            {/* 7. Third-Party Service Categories */}
            <section className="space-y-3 border-t border-surface-200 pt-6">
              <h2 className="text-lg font-bold text-surface-900">
                7. Third-Party Service Providers
              </h2>
              <p>
                Depending on system configuration and features utilized, we engage trusted infrastructure partners:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
                <li><strong>Cloud Database & Auth:</strong> Supabase (PostgreSQL with RLS) for encrypted data persistence.</li>
                <li><strong>Artificial Intelligence Infrastructure:</strong> Google Gemini API for conversational explanations (processed server-side).</li>
                <li><strong>Payment Processing Architecture:</strong> Stripe-ready subscription management (billing infrastructure is currently in staging mode).</li>
              </ul>
            </section>

            {/* 8. User Rights: Export & Deletion */}
            <section className="space-y-3 border-t border-surface-200 pt-6">
              <h2 className="text-lg font-bold text-surface-900">
                8. Your Data Rights: Export & Permanent Deletion
              </h2>
              <p>
                In compliance with modern privacy standards, you maintain complete ownership of your personal tax information:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-surface-50 border border-surface-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-surface-900 text-xs">
                    <Download className="w-4 h-4 text-brand-600" />
                    <span>Data Portability & Export</span>
                  </div>
                  <p className="text-xs text-surface-600">
                    You can download a complete, machine-readable JSON archive of your profile, calculations, and AI conversations via <code>GET /api/v1/auth/account/export</code>.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-surface-50 border border-surface-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-surface-900 text-xs">
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>Right of Erasure (Deletion)</span>
                  </div>
                  <p className="text-xs text-surface-600">
                    You can permanently purge your calculations, conversations, and account records via <code>POST /api/v1/auth/account/delete</code> with explicit confirmation.
                  </p>
                </div>
              </div>
            </section>

            {/* 9. Data Retention & Immutable Audit Logs */}
            <section className="space-y-3 border-t border-surface-200 pt-6">
              <h2 className="text-lg font-bold text-surface-900">
                9. Data Retention Architecture
              </h2>
              <p>
                Saved calculation scenarios, AI conversation histories, and profile records are retained for the lifetime of your active account. Upon executing an account deletion request, all personal tax snapshots and conversation messages are purged from active operational tables.
              </p>
              <p className="text-xs text-surface-500">
                Note: Immutable system audit logs recording authentication and operational security events are retained for system integrity, anti-abuse accountability, and statutory compliance.
              </p>
            </section>

            {/* 10. Contact Us */}
            <section className="space-y-3 border-t border-surface-200 pt-6">
              <h2 className="text-lg font-bold text-surface-900 flex items-center gap-2">
                <Mail className="w-4 h-4 text-brand-600" />
                <span>10. Contacting Our Privacy Officer</span>
              </h2>
              <p>
                If you have questions, inquiries, or requests regarding this Privacy Policy or your personal tax data rights, contact us at:
              </p>
              <div className="p-4 rounded-xl bg-surface-50 border border-surface-200 text-xs space-y-1">
                <div><strong>Email:</strong> <a href="mailto:privacy@taxaihelp.com" className="text-brand-600 underline">privacy@taxaihelp.com</a></div>
                <div><strong>Support Form:</strong> <Link href="/contact" className="text-brand-600 underline">taxaihelp.com/contact</Link></div>
                <div><strong>Service URL:</strong> https://taxaihelp.com</div>
              </div>
            </section>

            {/* 11. Policy Updates */}
            <section className="space-y-3 border-t border-surface-200 pt-6 text-xs text-surface-500">
              <h2 className="text-sm font-bold text-surface-800">
                11. Policy Modifications & Version History
              </h2>
              <p>
                We may periodically update this policy to reflect changes in our calculation engine, tax law updates (e.g. 2025/2026 IRS revenue procedures), or security architecture. Revisions will be published on this page with updated timestamps.
              </p>
            </section>
          </Card>
        </div>
      </Container>
    </div>
  );
}
