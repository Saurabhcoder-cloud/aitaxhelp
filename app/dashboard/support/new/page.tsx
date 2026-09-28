"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LifeBuoy,
  ArrowLeft,
  Send,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Star,
  Calculator,
  MessageSquare,
  FileSpreadsheet,
} from "lucide-react";
import { SupportCategory, SupportPriority } from "@/types/support";
import { getSessionToken } from "@/lib/utils/auth-client";

const CATEGORY_OPTIONS: Array<{
  value: SupportCategory;
  label: string;
  description: string;
}> = [
  {
    value: "ACCOUNT",
    label: "Account Assistance",
    description: "Login credentials, account settings, or profile questions.",
  },
  {
    value: "BILLING",
    label: "Billing & Subscriptions",
    description: "Inquiries regarding payment methods, plan upgrades, or receipts.",
  },
  {
    value: "TAX_CALCULATION",
    label: "Tax Engine & Calculation",
    description: "Questions about tax brackets, deductions, or mathematical output.",
  },
  {
    value: "CALCULATOR",
    label: "Calculator Usability",
    description: "Help using the Federal Income, 1099, or Self-Employed calculators.",
  },
  {
    value: "AI_ASSISTANT",
    label: "AI Tax Assistant Inquiry",
    description: "Clarifications on AI explanations or conversational suggestions.",
  },
  {
    value: "REPORT",
    label: "Tax Report Support",
    description: "Assistance with generated calculation reports or export summaries.",
  },
  {
    value: "BUG",
    label: "Technical Bug / Platform Issue",
    description: "Unexpected errors, glitches, or visual defects.",
  },
  {
    value: "FEEDBACK",
    label: "Product Feedback",
    description: "Share thoughts or suggest enhancements for TaxAIHelp.",
  },
  {
    value: "FEATURE_REQUEST",
    label: "Feature Request",
    description: "Suggest a new tool, tax form, or platform capability.",
  },
  {
    value: "SECURITY",
    label: "Security Concern",
    description: "Responsible security disclosures or authentication concerns.",
  },
  {
    value: "PRIVACY",
    label: "Privacy & Data Request",
    description: "Questions about data retention, deletion, or privacy disclosures.",
  },
  {
    value: "OTHER",
    label: "Other Inquiry",
    description: "General questions not listed above.",
  },
];

function CreateSupportForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [category, setCategory] = useState<SupportCategory>("ACCOUNT");
  const [subject, setSubject] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [rating, setRating] = useState<number | null>(null);

  // Safe context references (STRICT PRIVACY: zero dollar amounts or tax figures)
  const [calculationId, setCalculationId] = useState<string>("");
  const [calculatorType, setCalculatorType] = useState<string>("");
  const [taxYear, setTaxYear] = useState<string>("");
  const [filingStatus, setFilingStatus] = useState<string>("");
  const [reportId, setReportId] = useState<string>("");
  const [conversationId, setConversationId] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedTicket, setSubmittedTicket] = useState<{
    id: string;
    ticketNumber: string;
  } | null>(null);

  // Pre-fill from URL query parameters (e.g. from Calculator or AI report buttons)
  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat && CATEGORY_OPTIONS.some((c) => c.value === cat)) {
      setCategory(cat as SupportCategory);
    }

    const calcId = searchParams.get("calculationId");
    if (calcId) setCalculationId(calcId);

    const calcType = searchParams.get("calculatorType");
    if (calcType) setCalculatorType(calcType);

    const year = searchParams.get("taxYear");
    if (year) setTaxYear(year);

    const status = searchParams.get("filingStatus");
    if (status) setFilingStatus(status);

    const repId = searchParams.get("reportId");
    if (repId) setReportId(repId);

    const convId = searchParams.get("conversationId");
    if (convId) setConversationId(convId);

    const sub = searchParams.get("subject");
    if (sub) setSubject(sub);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const token = getSessionToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Build safe context metadata
      const safeContext: Record<string, unknown> = {};
      if (calculationId) safeContext.calculationId = calculationId;
      if (calculatorType) safeContext.calculatorType = calculatorType;
      if (taxYear && !isNaN(Number(taxYear))) safeContext.taxYear = Number(taxYear);
      if (filingStatus) safeContext.filingStatus = filingStatus;
      if (reportId) safeContext.reportId = reportId;
      if (conversationId) safeContext.conversationId = conversationId;

      const payload = {
        subject,
        category,
        description,
        rating: category === "FEEDBACK" ? rating : undefined,
        safeContext: Object.keys(safeContext).length > 0 ? safeContext : undefined,
      };

      const res = await fetch("/api/v1/support/tickets", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(
          json.error?.message || "Failed to create support ticket. Please verify your input."
        );
      }

      setSubmittedTicket({
        id: json.data.id,
        ticketNumber: json.data.ticketNumber,
      });
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedTicket) {
    return (
      <div className="bg-white border border-surface-200 rounded-2xl p-8 max-w-xl mx-auto text-center shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-surface-900">Request Submitted Successfully</h2>
        <p className="text-sm text-surface-600 mt-2">
          Your support request has been logged with reference number:
        </p>
        <div className="inline-block my-4 px-4 py-2 bg-surface-100 rounded-xl font-mono text-base font-bold text-surface-900 border border-surface-200">
          {submittedTicket.ticketNumber}
        </div>
        <p className="text-xs text-surface-500 max-w-md mx-auto">
          We have sent a confirmation notification to your dashboard. Our support operations team will review your inquiry and post replies directly to this ticket.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={`/dashboard/support/${submittedTicket.id}`}
            className="w-full sm:w-auto px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            View Ticket Details
          </Link>
          <Link
            href="/dashboard/support"
            className="w-full sm:w-auto px-5 py-2.5 bg-surface-100 hover:bg-surface-200 text-surface-700 rounded-xl text-xs font-semibold transition-colors"
          >
            Return to Support Center
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/support"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-surface-500 hover:text-surface-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Support Requests</span>
        </Link>
      </div>

      <div className="bg-white border border-surface-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-6 border-b border-surface-200 bg-surface-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-surface-900">
                Submit Support Request
              </h1>
              <p className="text-xs text-surface-500">
                Provide clear details about your question, calculation, or issue.
              </p>
            </div>
          </div>
        </div>

        {/* Privacy Invariant Banner */}
        <div className="mx-6 mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600 leading-relaxed">
            <strong className="text-slate-900">Privacy Notice:</strong> For your security,
            never paste sensitive taxpayer data (such as Social Security Numbers, EINs, bank accounts, or debit cards) into support requests. Staff only have access to safe reference identifiers.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Category Selection */}
          <div>
            <label className="block text-xs font-bold text-surface-700 uppercase tracking-wider mb-2">
              Inquiry Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as SupportCategory)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-300 bg-white text-surface-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} — {opt.description}
                </option>
              ))}
            </select>
          </div>

          {/* Optional Rating for Feedback category */}
          {category === "FEEDBACK" && (
            <div className="p-4 rounded-xl bg-surface-50 border border-surface-200">
              <label className="block text-xs font-bold text-surface-700 mb-2">
                Overall Experience Rating (Optional)
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star === rating ? null : star)}
                    className="p-1 text-surface-300 hover:text-amber-400 transition-colors focus:outline-none"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        rating && rating >= star
                          ? "fill-amber-400 text-amber-400"
                          : "text-surface-300"
                      }`}
                    />
                  </button>
                ))}
                {rating && (
                  <span className="text-xs font-medium text-surface-600 ml-2">
                    {rating} out of 5 stars
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Safe Context Panel if referenced */}
          {(calculationId || reportId || conversationId) && (
            <div className="p-4 rounded-xl bg-brand-50/60 border border-brand-200 text-xs text-brand-900 space-y-2">
              <div className="font-semibold flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5" />
                <span>Referenced Resource Metadata</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-surface-600">
                {calculationId && (
                  <div>
                    <span className="font-medium text-surface-800">Calculation ID:</span>{" "}
                    <span className="font-mono">{calculationId}</span>
                  </div>
                )}
                {taxYear && (
                  <div>
                    <span className="font-medium text-surface-800">Tax Year:</span> {taxYear}
                  </div>
                )}
                {calculatorType && (
                  <div>
                    <span className="font-medium text-surface-800">Calculator:</span>{" "}
                    {calculatorType}
                  </div>
                )}
                {filingStatus && (
                  <div>
                    <span className="font-medium text-surface-800">Filing Status:</span>{" "}
                    {filingStatus}
                  </div>
                )}
                {reportId && (
                  <div>
                    <span className="font-medium text-surface-800">Report ID:</span>{" "}
                    <span className="font-mono">{reportId}</span>
                  </div>
                )}
                {conversationId && (
                  <div>
                    <span className="font-medium text-surface-800">AI Conversation:</span>{" "}
                    <span className="font-mono">{conversationId}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Subject Field */}
          <div>
            <label className="block text-xs font-bold text-surface-700 uppercase tracking-wider mb-2">
              Subject *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of your inquiry (min 5 characters)"
              minLength={5}
              maxLength={160}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-300 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <div className="text-right text-[11px] text-surface-400 mt-1">
              {subject.length} / 160 characters
            </div>
          </div>

          {/* Description Field */}
          <div>
            <label className="block text-xs font-bold text-surface-700 uppercase tracking-wider mb-2">
              Detailed Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your question, what you expected to see, or any steps that led to an issue..."
              rows={6}
              minLength={1}
              maxLength={5000}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-300 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <div className="text-right text-[11px] text-surface-400 mt-1">
              {description.length} / 5000 characters
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-200">
            <Link
              href="/dashboard/support"
              className="px-4 py-2.5 text-xs font-semibold text-surface-600 hover:text-surface-900 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || subject.length < 5 || description.length < 1}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "Submitting..." : "Submit Request"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewSupportRequestPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-sm text-surface-500">
          Loading support form...
        </div>
      }
    >
      <CreateSupportForm />
    </Suspense>
  );
}
