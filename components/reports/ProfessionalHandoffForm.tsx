"use client";

import React, { useState } from "react";
import Link from "next/link";
import { TaxCalculationRecord } from "@/types/tax";
import { formatCurrencyFromCents } from "@/lib/utils/currency";
import { submitProfessionalLead } from "@/lib/utils/calculation-history-api";
import {
  ProfessionalLeadRecord,
  ProfessionalLeadContactMethod,
  ProfessionalLeadUrgency,
} from "@/lib/services/professional-lead-store";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { UserCheck, ShieldCheck, CheckCircle2, ArrowRight } from "lucide-react";

export interface ProfessionalHandoffFormProps {
  calculation: TaxCalculationRecord;
  defaultTaxpayerName?: string;
  defaultEmail?: string;
  className?: string;
}

export function ProfessionalHandoffForm({
  calculation,
  defaultTaxpayerName = "",
  defaultEmail = "",
  className = "",
}: ProfessionalHandoffFormProps) {
  const [taxpayerName, setTaxpayerName] = useState<string>(defaultTaxpayerName);
  const [email, setEmail] = useState<string>(defaultEmail);
  const [phone, setPhone] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [preferredContactMethod, setPreferredContactMethod] =
    useState<ProfessionalLeadContactMethod>("email");
  const [urgency, setUrgency] = useState<ProfessionalLeadUrgency>("planning_ahead");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedLead, setSubmittedLead] = useState<ProfessionalLeadRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const res = calculation.resultSnapshot;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!taxpayerName.trim() || taxpayerName.trim().length < 2) {
      setErrorMessage("Please enter your name (at least 2 characters).");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const apiRes = await submitProfessionalLead({
      calculationId: calculation.id,
      reviewType: "cpa",
      taxpayerName: taxpayerName.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      message: message.trim() || undefined,
      preferredContactMethod,
      urgency,
    });

    setIsSubmitting(false);

    if (apiRes.success && apiRes.data) {
      setSubmittedLead(apiRes.data);
    } else {
      setErrorMessage(apiRes.error || "Failed to submit inquiry. Please try again.");
    }
  };

  if (submittedLead) {
    return (
      <Card className="max-w-2xl mx-auto p-6 sm:p-8 border-emerald-200 bg-emerald-50/40">
        <div className="space-y-4 text-center sm:text-left">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mx-auto sm:mx-0">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-extrabold text-surface-900">
              Tax Professional Inquiry Received!
            </h3>
            <p className="text-xs sm:text-sm text-surface-600 leading-relaxed">
              Thank you, <strong>{submittedLead.taxpayerName}</strong>. Your verified calculation summary for <strong>{calculation.title}</strong> has been securely submitted. A qualified CPA or Enrolled Agent will review your profile and reach out via <strong>{submittedLead.preferredContactMethod}</strong>.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-emerald-200 text-xs space-y-1.5 font-mono">
            <div className="flex justify-between">
              <span className="text-surface-500">Inquiry ID:</span>
              <span className="font-bold text-surface-900">{submittedLead.id.slice(0, 12)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-500">Target Tax Year:</span>
              <span className="font-bold text-surface-900">{submittedLead.taxYear}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-500">Status:</span>
              <Badge variant="emerald" size="sm" className="capitalize">
                {submittedLead.status}
              </Badge>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Link href={`/dashboard/calculations/${calculation.id}/report`}>
              <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs">
                View Tax Report
              </Button>
            </Link>
            <Link href="/dashboard/calculations">
              <Button variant="primary" size="sm" className="w-full sm:w-auto text-xs">
                Back to Saved Calculations
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Calculation Reference Header */}
      <div className="p-4 rounded-xl border border-surface-200 bg-surface-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <span className="text-surface-500 block uppercase font-bold text-[10px]">
            Calculation Attached for Review
          </span>
          <span className="font-bold text-sm text-surface-900 block mt-0.5">
            {calculation.title}
          </span>
          <div className="flex items-center gap-2 text-surface-600 mt-1">
            <span>Tax Year {calculation.taxYear}</span>
            <span>&bull;</span>
            <span className="capitalize">{calculation.filingStatus.replace(/_/g, " ")}</span>
            <span>&bull;</span>
            <span className="font-mono text-[11px]">ID: {calculation.id.slice(0, 8)}...</span>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-surface-500 block text-[11px]">Calculated Liability:</span>
          <span className="font-black text-base text-brand-700 font-mono block">
            {formatCurrencyFromCents(res.totalTaxLiabilityCents)}
          </span>
        </div>
      </div>

      {/* Inquiry Form Card */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-brand-600" />
            <CardTitle>Connect with a Qualified CPA or Enrolled Agent</CardTitle>
          </div>
          <p className="text-xs text-surface-500">
            Submit your contact information to have a licensed tax professional review your calculation summary.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
            {errorMessage && (
              <Alert variant="error" title="Submission Error">
                {errorMessage}
              </Alert>
            )}

            <div className="space-y-1.5">
              <label htmlFor="taxpayerName" className="font-bold text-surface-800 block text-xs">
                Your Full Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="taxpayerName"
                value={taxpayerName}
                onChange={(e) => setTaxpayerName(e.target.value)}
                placeholder="e.g. Jane Doe"
                required
                disabled={isSubmitting}
                className="bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="leadEmail" className="font-bold text-surface-800 block text-xs">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <Input
                  id="leadEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  required
                  disabled={isSubmitting}
                  className="bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="leadPhone" className="font-bold text-surface-800 block text-xs">
                  Phone Number <span className="text-surface-400 font-normal">(optional)</span>
                </label>
                <Input
                  id="leadPhone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 000-0000"
                  disabled={isSubmitting}
                  className="bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="contactMethod" className="font-bold text-surface-800 block text-xs">
                  Preferred Contact Method
                </label>
                <select
                  id="contactMethod"
                  value={preferredContactMethod}
                  onChange={(e) =>
                    setPreferredContactMethod(e.target.value as ProfessionalLeadContactMethod)
                  }
                  disabled={isSubmitting}
                  className="w-full text-xs sm:text-sm rounded-lg border border-surface-300 bg-white px-3 py-2 text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone Call</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="leadUrgency" className="font-bold text-surface-800 block text-xs">
                  Filing Timeline / Urgency
                </label>
                <select
                  id="leadUrgency"
                  value={urgency}
                  onChange={(e) =>
                    setUrgency(e.target.value as ProfessionalLeadUrgency)
                  }
                  disabled={isSubmitting}
                  className="w-full text-xs sm:text-sm rounded-lg border border-surface-300 bg-white px-3 py-2 text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="planning_ahead">Planning Ahead / Advisory</option>
                  <option value="this_month">Need Review This Month</option>
                  <option value="immediate">Immediate / Approaching Deadline</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="leadMessage" className="font-bold text-surface-800 block text-xs">
                Questions or Specific Considerations for the CPA{" "}
                <span className="text-surface-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="leadMessage"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. I recently started freelance consulting and want guidance on state business deductions and quarterly estimated filings."
                rows={3}
                maxLength={2000}
                disabled={isSubmitting}
                className="w-full text-xs sm:text-sm rounded-lg border border-surface-300 bg-white p-3 text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
              />
              <span className="text-[11px] text-surface-400 block text-right">
                {message.length} / 2000
              </span>
            </div>

            {/* Privacy Protection Notice */}
            <div className="p-3.5 rounded-lg bg-surface-50 border border-surface-200 text-[11px] text-surface-600 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <span>
                <strong>Privacy Guaranteed:</strong> Your contact details and calculation summary are shared exclusively with licensed CPAs or Enrolled Agents for the express purpose of evaluating your inquiry. We never sell your personal information.
              </span>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <Button
                href={`/dashboard/calculations/${calculation.id}`}
                variant="outline"
                size="sm"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting}
                isLoading={isSubmitting}
                className="gap-1.5"
              >
                <span>Submit to Tax Professional</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
