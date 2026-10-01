"use client";

import React, { useState } from "react";
import {
  HelpCircle,
  MessageSquare,
  FileQuestion,
  UserCheck,
  AlertTriangle,
  FileText,
  X,
  Loader2,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { TaxPreparationSession } from "@/lib/services/tax-preparation-session-store";
import { SupportCategory, SupportPriority } from "@/types/support";
import { Button } from "@/components/ui/Button";

interface PreparationHumanEscalationModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: TaxPreparationSession;
  calculationId?: string;
}

interface EscalationOption {
  id: string;
  label: string;
  category: SupportCategory;
  defaultSubject: string;
  priority: SupportPriority;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const ESCALATION_OPTIONS: EscalationOption[] = [
  {
    id: "tax_question",
    label: "I have a tax question",
    category: "TAX_CALCULATION",
    defaultSubject: "Tax question regarding preparation session",
    priority: "NORMAL",
    icon: HelpCircle,
    description: "Get clarification on filing rules, income treatments, or deductions from our tax support team.",
  },
  {
    id: "help_completing",
    label: "I need help completing my taxes",
    category: "CALCULATOR",
    defaultSubject: "Assistance needed completing tax preparation",
    priority: "NORMAL",
    icon: MessageSquare,
    description: "Assistance navigating income inputs, expense entries, or readiness requirements.",
  },
  {
    id: "want_cpa",
    label: "I want a tax professional",
    category: "PROFESSIONAL_HANDOFF",
    defaultSubject: "Request for professional tax assistance",
    priority: "NORMAL",
    icon: UserCheck,
    description: "Direct inquiry for 1-on-1 human CPA, Enrolled Agent, or preparer engagement.",
  },
  {
    id: "calculation_issue",
    label: "I found an issue with my calculation",
    category: "BUG",
    defaultSubject: "Potential issue with tax calculation result",
    priority: "HIGH",
    icon: AlertTriangle,
    description: "Report an unexpected tax calculation number, bracket calculation, or deduction discrepancy.",
  },
  {
    id: "document_help",
    label: "I need help with a document",
    category: "REPORT",
    defaultSubject: "Assistance needed with tax document upload or parsing",
    priority: "NORMAL",
    icon: FileText,
    description: "Help uploading W-2s, 1099s, expense receipts, or extracting box amounts.",
  },
];

export function PreparationHumanEscalationModal({
  isOpen,
  onClose,
  session,
  calculationId,
}: PreparationHumanEscalationModalProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string>("tax_question");
  const [userDescription, setUserDescription] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdTicketNumber, setCreatedTicketNumber] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentOption = ESCALATION_OPTIONS.find((opt) => opt.id === selectedOptionId) || ESCALATION_OPTIONS[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!userDescription.trim() || userDescription.trim().length < 10) {
      setErrorMessage("Please provide a brief description (at least 10 characters) so our support team can help you.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/v1/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: currentOption.defaultSubject,
          category: currentOption.category,
          priority: currentOption.priority,
          description: userDescription.trim(),
          safeContext: {
            sessionId: session.id,
            calculationId: calculationId || session.calculationId || undefined,
            taxYear: session.taxYear,
            filingStatus: session.profileSnapshot?.filingStatus || undefined,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to submit support request.");
      }

      setCreatedTicketNumber(json.data?.ticketNumber || "Ticket Created");
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error submitting support ticket.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setCreatedTicketNumber(null);
    setUserDescription("");
    setErrorMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-surface-200 my-8 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-200 flex items-center justify-between bg-gradient-to-r from-blue-50 via-white to-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-surface-900 tracking-tight">
                Need Help with Your Taxes?
              </h2>
              <p className="text-xs text-surface-500">
                Connect with our human tax support team &bull; Ticket linked to this session
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 text-surface-400 hover:text-surface-600 rounded-lg hover:bg-surface-100 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-5">
          {createdTicketNumber ? (
            /* Success confirmation */
            <div className="py-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-surface-900">Support Request Created</h3>
                <p className="text-xs text-surface-600 max-w-sm mx-auto">
                  Your inquiry has been routed to our human support team. We have linked your active preparation session for fast resolution.
                </p>
              </div>
              <div className="inline-block px-4 py-2 bg-surface-100 rounded-xl border border-surface-200 font-mono text-sm font-bold text-surface-900">
                Ticket Reference: {createdTicketNumber}
              </div>
              <div className="pt-2">
                <Button variant="primary" size="sm" onClick={handleReset}>
                  Back to Preparation
                </Button>
              </div>
            </div>
          ) : (
            /* Form with 5 escalation options */
            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                  {errorMessage}
                </div>
              )}

              {/* 5 Options */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-surface-700 uppercase tracking-wider block">
                  How can we help you?
                </label>
                <div className="space-y-2">
                  {ESCALATION_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = selectedOptionId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedOptionId(opt.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/20"
                            : "border-surface-200 hover:border-surface-300 bg-white"
                        }`}
                      >
                        <div
                          className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                            isSelected ? "bg-blue-600 text-white" : "bg-surface-100 text-surface-600"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-surface-900">{opt.label}</p>
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-surface-500 mt-0.5 leading-snug">
                            {opt.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-surface-700 uppercase tracking-wider block">
                  Describe what you need help with *
                </label>
                <textarea
                  rows={4}
                  required
                  value={userDescription}
                  onChange={(e) => setUserDescription(e.target.value)}
                  placeholder="Provide specific details so our support specialists can assist you effectively (min 10 characters)..."
                  maxLength={5000}
                  className="w-full p-3 text-xs bg-surface-50 border border-surface-200 rounded-lg text-surface-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
                <div className="flex justify-between text-[11px] text-surface-400">
                  <span>Minimum 10 characters</span>
                  <span>{userDescription.length}/5000</span>
                </div>
              </div>

              {/* Privacy notice */}
              <div className="p-3 rounded-lg bg-surface-50 border border-surface-200 text-[11px] text-surface-600 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Safe Context: Session reference and tax year are attached. No full documents or SSNs are exposed.
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-100">
                <Button variant="outline" size="sm" type="button" onClick={handleReset}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  disabled={isSubmitting || userDescription.trim().length < 10}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Support Ticket"
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
