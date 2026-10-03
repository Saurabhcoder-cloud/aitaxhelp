"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  UserCheck,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  Calendar,
  X,
  Loader2,
  ExternalLink,
  ChevronRight,
  Info,
} from "lucide-react";
import { TaxPreparationSession } from "@/lib/services/tax-preparation-session-store";
import { TaxSituationSummaryCalculation } from "@/lib/preparation/situation-summary";
import { formatCurrencyFromCents } from "@/lib/utils/currency";
import {
  ProfessionalLeadRecord,
  ProfessionalLeadStatus,
} from "@/lib/services/professional-lead-store";
import { ProfessionalReviewType } from "@/lib/validations/professional-lead";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface ProfessionalReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: TaxPreparationSession;
  calculation?: TaxSituationSummaryCalculation | null;
  calculationId?: string;
  onLeadCreated?: (lead: ProfessionalLeadRecord) => void;
}

export function ProfessionalReviewModal({
  isOpen,
  onClose,
  session,
  calculation,
  calculationId,
  onLeadCreated,
}: ProfessionalReviewModalProps) {
  // Existing lead state
  const [existingLead, setExistingLead] = useState<ProfessionalLeadRecord | null>(null);
  const [loadingExisting, setLoadingExisting] = useState<boolean>(true);

  // Form states
  const [reviewType, setReviewType] = useState<ProfessionalReviewType>("cpa");
  const [taxpayerName, setTaxpayerName] = useState<string>(
    session.situationSummary?.taxpayerName || session.profileSnapshot?.fullName || ""
  );
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [preferredContactMethod, setPreferredContactMethod] = useState<"email" | "phone">("email");
  const [urgency, setUrgency] = useState<"immediate" | "this_month" | "planning_ahead" | "within_week" | "flexible">("within_week");
  const [message, setMessage] = useState<string>("");
  const [consentGiven, setConsentGiven] = useState<boolean>(false);

  // Submission states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedLead, setSubmittedLead] = useState<ProfessionalLeadRecord | null>(null);

  // Load any existing lead for this preparation session
  const checkExistingLead = useCallback(async () => {
    if (!session?.id) return;
    try {
      setLoadingExisting(true);
      const res = await fetch(`/api/v1/professional-leads?sessionId=${encodeURIComponent(session.id)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setExistingLead(json.data);
        }
      }
    } catch (_e) {
      // Quietly ignore network failures on check
    } finally {
      setLoadingExisting(false);
    }
  }, [session?.id]);

  useEffect(() => {
    if (isOpen) {
      checkExistingLead();
    }
  }, [isOpen, checkExistingLead]);

  if (!isOpen) return null;

  const activeLead = submittedLead || existingLead;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!taxpayerName.trim() || taxpayerName.trim().length < 2) {
      setSubmitError("Please enter your full name (minimum 2 characters).");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setSubmitError("A valid email address is required.");
      return;
    }
    if (!consentGiven) {
      setSubmitError("You must acknowledge that this connects you with a human professional.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/v1/professional-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          calculationId: calculationId || session.calculationId,
          reviewType,
          taxpayerName: taxpayerName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          preferredContactMethod,
          urgency,
          message: message.trim() || undefined,
          consentGiven: true,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to submit professional review request.");
      }

      // Also create canonical Phase 8 ProfessionalReviewCase
      try {
        await fetch("/api/v1/tax/preparation/session/professional-review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: session.id,
            reviewType,
            taxpayerNotes: message.trim() || undefined,
          }),
        });
      } catch (_caseErr) {
        // Fallback gracefully if case creation encountered non-fatal issue
      }

      setSubmittedLead(json.data);
      if (onLeadCreated) {
        onLeadCreated(json.data);
      }
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Error submitting request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status mapping helper
  const getStatusDisplay = (status: ProfessionalLeadStatus) => {
    switch (status) {
      case "requested":
      case "new":
        return { label: "Requested", color: "blue", step: 1 };
      case "received":
        return { label: "Received", color: "amber", step: 2 };
      case "assigned":
        return { label: "Assigned", color: "purple", step: 3 };
      case "contacted":
      case "in_progress":
      case "review_in_progress":
        return { label: "In Review", color: "indigo", step: 4 };
      case "completed":
      case "closed":
        return { label: "Completed", color: "emerald", step: 5 };
      case "cancelled":
        return { label: "Cancelled", color: "surface", step: 0 };
      default:
        return { label: status, color: "blue", step: 1 };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-surface-200 my-8 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-200 flex items-center justify-between bg-gradient-to-r from-purple-50 via-white to-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-surface-900 tracking-tight">
                {activeLead ? "Professional Review Status" : "Request Professional Review"}
              </h2>
              <p className="text-xs text-surface-500">
                {activeLead
                  ? "Track your CPA / EA human review inquiry"
                  : "Connect with a licensed CPA, Enrolled Agent, or Tax Professional"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-surface-400 hover:text-surface-600 rounded-lg hover:bg-surface-100 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[78vh] overflow-y-auto space-y-5">
          {loadingExisting ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-surface-500">
              <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
              <p className="text-xs font-medium">Checking existing review status...</p>
            </div>
          ) : activeLead ? (
            /* ========================================================================= */
            /* VIEW 1: ACTIVE OR COMPLETED LEAD STATUS CARD                              */
            /* ========================================================================= */
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-200/60 pb-3">
                  <div>
                    <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider">
                      Review Status
                    </span>
                    <h3 className="text-xl font-extrabold text-surface-900 mt-0.5">
                      Professional Review Requested
                    </h3>
                  </div>
                  <div>
                    <Badge variant="brand" size="md">
                      {getStatusDisplay(activeLead.status).label}
                    </Badge>
                  </div>
                </div>

                {/* Status Stepper */}
                <div className="pt-4 pb-2">
                  <div className="grid grid-cols-5 gap-1 text-center text-xs">
                    {[
                      { num: 1, label: "Requested" },
                      { num: 2, label: "Received" },
                      { num: 3, label: "Assigned" },
                      { num: 4, label: "In Review" },
                      { num: 5, label: "Completed" },
                    ].map((step) => {
                      const currentStepNum = getStatusDisplay(activeLead.status).step;
                      const isComplete = currentStepNum >= step.num;
                      const isCurrent = currentStepNum === step.num;
                      return (
                        <div key={step.num} className="flex flex-col items-center gap-1">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors ${
                              isCurrent
                                ? "bg-purple-600 text-white ring-2 ring-purple-200"
                                : isComplete
                                ? "bg-emerald-600 text-white"
                                : "bg-surface-200 text-surface-600"
                            }`}
                          >
                            {isComplete && !isCurrent ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              step.num
                            )}
                          </div>
                          <span
                            className={`text-[10px] ${
                              isCurrent
                                ? "font-bold text-purple-900"
                                : isComplete
                                ? "font-medium text-emerald-800"
                                : "text-surface-400"
                            }`}
                          >
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Assignment Notice (Truthful - Never Fake Matching) */}
              <div className="p-4 rounded-xl border border-surface-200 bg-surface-50 space-y-1.5">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-bold text-surface-900 uppercase tracking-wider">
                    Professional Assignment
                  </span>
                </div>
                {activeLead.assignedProfessionalName ? (
                  <p className="text-sm font-semibold text-emerald-800">
                    Assigned Professional: {activeLead.assignedProfessionalName}
                  </p>
                ) : (
                  <div className="text-xs text-surface-600 leading-relaxed">
                    <p className="font-semibold text-amber-800">
                      Awaiting professional assignment
                    </p>
                    <p className="mt-0.5">
                      Your intake summary has been queued for assignment with a qualified{" "}
                      {activeLead.reviewType === "enrolled_agent"
                        ? "Enrolled Agent (EA)"
                        : activeLead.reviewType === "cpa"
                        ? "Certified Public Accountant (CPA)"
                        : "Tax Professional"}. You will be contacted via {activeLead.preferredContactMethod} once assigned.
                    </p>
                  </div>
                )}
              </div>

              {/* Review Details Summary */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-surface-50 border border-surface-200 space-y-0.5">
                  <span className="text-surface-500 font-medium">Review Type</span>
                  <p className="font-bold text-surface-900 capitalize">
                    {activeLead.reviewType === "enrolled_agent"
                      ? "Enrolled Agent (EA)"
                      : activeLead.reviewType === "cpa"
                      ? "CPA Review"
                      : "General Tax Pro"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-surface-50 border border-surface-200 space-y-0.5">
                  <span className="text-surface-500 font-medium">Contact Method</span>
                  <p className="font-bold text-surface-900 capitalize">
                    {activeLead.preferredContactMethod} ({activeLead.preferredContactMethod === "email" ? activeLead.email : activeLead.phone || activeLead.email})
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-surface-50 border border-surface-200 space-y-0.5">
                  <span className="text-surface-500 font-medium">Tax Year / Filing Status</span>
                  <p className="font-bold text-surface-900">
                    {activeLead.taxYear} &bull; {activeLead.filingStatus.replace(/_/g, " ")}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-surface-50 border border-surface-200 space-y-0.5">
                  <span className="text-surface-500 font-medium">Request Reference ID</span>
                  <p className="font-mono text-[11px] font-bold text-surface-900 truncate">
                    {activeLead.id}
                  </p>
                </div>
              </div>

              {activeLead.message && (
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-surface-600">Your Submitted Note:</span>
                  <div className="p-3 rounded-lg bg-surface-50 border border-surface-200 text-xs text-surface-700 whitespace-pre-wrap">
                    {activeLead.message}
                  </div>
                </div>
              )}

              {/* Disclaimer Notice */}
              <div className="p-3 rounded-lg bg-surface-100/70 border border-surface-200 text-[11px] text-surface-600 leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 text-surface-500 shrink-0 mt-0.5" />
                <span>
                  This request connects you with a tax professional for human review. The AI assistant does not replace professional tax advice.
                </span>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* VIEW 2: NEW REQUEST FORM                                                  */
            /* ========================================================================= */
            <form onSubmit={handleSubmit} className="space-y-5">
              {submitError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Context Summary Pill */}
              <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-semibold text-purple-950">Linked Preparation Session: </span>
                  <span className="text-purple-800">
                    Tax Year {session.taxYear} &bull; {session.profileSnapshot?.filingStatus?.replace(/_/g, " ") || "Single"}
                  </span>
                </div>
                {((calculation && calculation.refundOrBalanceDue) || (session.situationSummary?.calculation?.refundOrBalanceDue)) && (() => {
                  const refOrDue = calculation?.refundOrBalanceDue || session.situationSummary?.calculation?.refundOrBalanceDue;
                  if (!refOrDue) return null;
                  return (
                    <Badge variant={refOrDue.type === "refund" ? "emerald" : "amber"} size="sm">
                      {refOrDue.type === "refund" ? "Estimated Refund: " : "Balance Due: "}
                      {formatCurrencyFromCents(refOrDue.amountCents)}
                    </Badge>
                  );
                })()}
              </div>

              {/* 1. Review Type Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-surface-700 uppercase tracking-wider block">
                  Select Professional Review Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    {
                      id: "cpa",
                      title: "CPA",
                      desc: "Certified Public Accountant",
                      detail: "Licensed state CPA for comprehensive tax strategy & sign-off.",
                    },
                    {
                      id: "enrolled_agent",
                      title: "Enrolled Agent",
                      desc: "IRS Enrolled Agent (EA)",
                      detail: "Federally licensed practitioner with unlimited IRS representation.",
                    },
                    {
                      id: "tax_professional",
                      title: "Tax Specialist",
                      desc: "Tax Professional",
                      detail: "Experienced preparer for deduction validation & review.",
                    },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setReviewType(option.id as ProfessionalReviewType)}
                      className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        reviewType === option.id
                          ? "border-purple-600 bg-purple-50/60 ring-2 ring-purple-600/20"
                          : "border-surface-200 hover:border-surface-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-surface-900">{option.title}</span>
                        {reviewType === option.id && (
                          <div className="w-2 h-2 rounded-full bg-purple-600" />
                        )}
                      </div>
                      <p className="text-[11px] font-semibold text-purple-900 mt-0.5">{option.desc}</p>
                      <p className="text-[10px] text-surface-500 mt-1 leading-tight">{option.detail}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Contact Information */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-surface-700 uppercase tracking-wider block">
                  Your Contact Information
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-surface-600 block mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={taxpayerName}
                      onChange={(e) => setTaxpayerName(e.target.value)}
                      placeholder="e.g. Jane Doe"
                      className="w-full px-3 py-2 text-xs bg-surface-50 border border-surface-200 rounded-lg text-surface-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-surface-600 block mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. jane@example.com"
                      className="w-full px-3 py-2 text-xs bg-surface-50 border border-surface-200 rounded-lg text-surface-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-surface-600 block mb-1">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(555) 000-0000"
                      className="w-full px-3 py-2 text-xs bg-surface-50 border border-surface-200 rounded-lg text-surface-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-surface-600 block mb-1">
                      Preferred Contact Method
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPreferredContactMethod("email")}
                        className={`flex-1 py-2 px-3 text-xs rounded-lg border font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          preferredContactMethod === "email"
                            ? "bg-purple-100 border-purple-300 text-purple-900 font-bold"
                            : "bg-surface-50 border-surface-200 text-surface-600 hover:bg-surface-100"
                        }`}
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Email</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreferredContactMethod("phone")}
                        className={`flex-1 py-2 px-3 text-xs rounded-lg border font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          preferredContactMethod === "phone"
                            ? "bg-purple-100 border-purple-300 text-purple-900 font-bold"
                            : "bg-surface-50 border-surface-200 text-surface-600 hover:bg-surface-100"
                        }`}
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Phone</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Questions / Message */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-surface-700 uppercase tracking-wider block">
                  Questions or Comments for Professional (Optional)
                </label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask any specific tax questions, 1099 deductions to verify, or items you want the CPA/EA to double-check..."
                  maxLength={2000}
                  className="w-full p-2.5 text-xs bg-surface-50 border border-surface-200 rounded-lg text-surface-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none"
                />
              </div>

              {/* Notice & Mandatory Consent */}
              <div className="space-y-3 pt-2 border-t border-surface-100">
                <div className="p-3 rounded-lg bg-surface-100/70 border border-surface-200 text-[11px] text-surface-700 leading-relaxed flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Notice:</strong> This request connects you with a tax professional for human review. The AI assistant does not replace professional tax advice.
                  </span>
                </div>

                <label className="flex items-start gap-2.5 text-xs text-surface-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    required
                    checked={consentGiven}
                    onChange={(e) => setConsentGiven(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-surface-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-[11px] leading-tight text-surface-600">
                    I agree to securely share my verified tax preparation summary and calculation record with a qualified tax professional for human review.
                  </span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" type="button" onClick={onClose}>
                  Cancel
                </Button>
                <button
                  type="submit"
                  disabled={isSubmitting || !consentGiven}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting Request...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Submit Review Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {activeLead && (
          <div className="px-6 py-3 bg-surface-50 border-t border-surface-200 flex items-center justify-between">
            <span className="text-[11px] text-surface-500">
              Submitted on {new Date(activeLead.createdAt).toLocaleDateString()}
            </span>
            <Button variant="outline" size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
