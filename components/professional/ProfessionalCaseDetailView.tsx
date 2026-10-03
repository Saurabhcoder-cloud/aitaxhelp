"use client";

import React, { useState } from "react";
import {
  ProfessionalReviewCase,
  ProfessionalReviewComment,
  ReviewCommentSection,
  ReviewCommentSeverity,
} from "@/lib/professional/types";
import { formatCurrencyFromCents } from "@/lib/utils/currency";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  UserCheck,
  FileText,
  DollarSign,
  Users,
  ChevronDown,
  ChevronUp,
  Send,
  Download,
  MessageSquare,
  History,
  Check,
  Lock,
} from "lucide-react";

interface ProfessionalCaseDetailViewProps {
  initialCase: ProfessionalReviewCase;
  isProfessionalUser?: boolean;
  isAdminUser?: boolean;
  onCaseUpdated?: (updated: ProfessionalReviewCase) => void;
}

export function ProfessionalCaseDetailView({
  initialCase,
  isProfessionalUser = false,
  isAdminUser = false,
  onCaseUpdated,
}: ProfessionalCaseDetailViewProps) {
  const [reviewCase, setReviewCase] = useState<ProfessionalReviewCase>(initialCase);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    taxpayer: true,
    income: true,
    deductions: true,
    federal: true,
    state: true,
    efile: true,
    comments: true,
    timeline: false,
  });

  // Action states
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // New comment state
  const [commentSection, setCommentSection] = useState<ReviewCommentSection>("federal_return");
  const [commentSeverity, setCommentSeverity] = useState<ReviewCommentSeverity>("INFO");
  const [commentMessage, setCommentMessage] = useState("");
  const [isAddingComment, setIsAddingComment] = useState(false);

  // Change request notes
  const [showRequestChangesModal, setShowRequestChangesModal] = useState(false);
  const [changeNotes, setChangeNotes] = useState("");

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const refreshCase = async () => {
    try {
      const res = await fetch(
        `/api/v1/tax/preparation/session/professional-review/${reviewCase.id}`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setReviewCase(json.data);
          if (onCaseUpdated) onCaseUpdated(json.data);
        }
      }
    } catch (_e) {}
  };

  const handleStartReview = async () => {
    try {
      setIsProcessing(true);
      setActionError(null);
      const res = await fetch(
        `/api/v1/tax/preparation/session/professional-review/${reviewCase.id}/status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetStatus: "IN_REVIEW" }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to start review.");
      setReviewCase(json.data);
      if (onCaseUpdated) onCaseUpdated(json.data);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Error starting review.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestChanges = async () => {
    try {
      setIsProcessing(true);
      setActionError(null);
      const res = await fetch(
        `/api/v1/tax/preparation/session/professional-review/${reviewCase.id}/request-changes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: changeNotes.trim() }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to request changes.");
      setReviewCase(json.data);
      setShowRequestChangesModal(false);
      setChangeNotes("");
      if (onCaseUpdated) onCaseUpdated(json.data);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Error requesting changes.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompleteReview = async () => {
    try {
      setIsProcessing(true);
      setActionError(null);
      const res = await fetch(
        `/api/v1/tax/preparation/session/professional-review/${reviewCase.id}/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to complete review.");
      setReviewCase(json.data);
      if (onCaseUpdated) onCaseUpdated(json.data);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Error completing review.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentMessage.trim()) return;

    try {
      setIsAddingComment(true);
      setActionError(null);
      const res = await fetch(
        `/api/v1/tax/preparation/session/professional-review/${reviewCase.id}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            section: commentSection,
            severity: commentSeverity,
            message: commentMessage.trim(),
          }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to add finding.");
      setCommentMessage("");
      await refreshCase();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Error adding comment.");
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleResolveComment = async (commentId: string) => {
    try {
      setIsProcessing(true);
      const res = await fetch(
        `/api/v1/tax/preparation/session/professional-review/${reviewCase.id}/comments/${commentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to resolve finding.");
      await refreshCase();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Error resolving comment.");
    } finally {
      setIsProcessing(false);
    }
  };

  const snapshot = reviewCase.snapshot;
  const fed = snapshot?.federalReturn;
  const stateSummary = snapshot?.stateSummary;
  const efile = snapshot?.efileReadiness;

  const canManage = isProfessionalUser || isAdminUser;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "REQUESTED":
        return <Badge variant="neutral">Requested</Badge>;
      case "ASSIGNED":
        return <Badge variant="outline" className="border-purple-300 text-purple-700 bg-purple-50">Assigned</Badge>;
      case "IN_REVIEW":
        return <Badge variant="brand">In Review</Badge>;
      case "CHANGES_REQUESTED":
        return <Badge variant="amber" className="bg-red-50 text-red-700 border-red-300">Changes Requested</Badge>;
      case "READY_FOR_FINAL_REVIEW":
        return <Badge variant="amber">Ready for Final Review</Badge>;
      case "REVIEW_COMPLETED":
        return <Badge variant="emerald">Review Completed</Badge>;
      case "CLOSED":
        return <Badge variant="outline">Closed</Badge>;
      case "CANCELLED":
        return <Badge variant="outline" className="text-surface-500">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Banner & Header */}
      <div className="bg-surface-50 border border-surface-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-medium text-surface-500">
                CASE: {reviewCase.id.slice(0, 8)}...
              </span>
              {getStatusBadge(reviewCase.status)}
              <Badge variant="outline" className="uppercase text-[10px]">
                {reviewCase.reviewType.replace("_", " ")}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold text-surface-900">
              Tax Review — {fed?.taxpayer.fullName || reviewCase.taxpayerName} ({reviewCase.taxYear})
            </h1>
            <p className="text-sm text-surface-600 mt-1">
              Taxpayer Email: <span className="font-mono text-surface-800">{reviewCase.taxpayerEmail}</span> •
              Assigned Pro: <span className="font-medium text-surface-800">{reviewCase.assignedProfessionalName || "Unassigned"}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/api/v1/tax/preparation/session/federal-return/documents/download?docType=cpa_review`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-surface-100 text-surface-800 hover:bg-surface-200 border border-surface-300 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download CPA Review Package
            </a>

            {canManage && reviewCase.status === "ASSIGNED" && (
              <Button size="sm" onClick={handleStartReview} disabled={isProcessing}>
                <Clock className="w-4 h-4 mr-1.5" />
                Start Review
              </Button>
            )}

            {canManage && (reviewCase.status === "IN_REVIEW" || reviewCase.status === "READY_FOR_FINAL_REVIEW") && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-amber-700 border-amber-300 hover:bg-amber-50"
                  onClick={() => setShowRequestChangesModal(true)}
                  disabled={isProcessing}
                >
                  <AlertCircle className="w-4 h-4 mr-1.5" />
                  Request Changes
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleCompleteReview}
                  disabled={isProcessing || reviewCase.hasOpenActionRequired}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Complete Review
                </Button>
              </>
            )}
          </div>
        </div>

        {actionError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{actionError}</span>
          </div>
        )}

        {reviewCase.hasOpenActionRequired && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>
              <strong>Action Required:</strong> There are open high-severity findings that require taxpayer action before review completion.
            </span>
          </div>
        )}
      </div>

      {/* SECTION 1: Taxpayer Profile & SECTION 2: Filing Status */}
      <Card>
        <CardHeader
          className="cursor-pointer hover:bg-surface-50 transition-colors py-4"
          onClick={() => toggleSection("taxpayer")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-base font-semibold">1. Taxpayer Profile & Filing Status</CardTitle>
            </div>
            {expandedSections.taxpayer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </CardHeader>
        {expandedSections.taxpayer && fed && (
          <CardContent className="pt-2 pb-6 border-t border-surface-100 text-sm grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="text-xs text-surface-500 block">Full Legal Name</span>
              <span className="font-medium text-surface-900">{fed.taxpayer.fullName}</span>
            </div>
            <div>
              <span className="text-xs text-surface-500 block">Filing Status</span>
              <span className="font-medium text-surface-900">{fed.filingStatus.label}</span>
            </div>
            <div>
              <span className="text-xs text-surface-500 block">Tax Year</span>
              <span className="font-medium text-surface-900">{reviewCase.taxYear}</span>
            </div>
            <div>
              <span className="text-xs text-surface-500 block">Spouse Status</span>
              <span className="font-medium text-surface-900">
                {fed.spouse.hasSpouse ? fed.spouse.fullName || "Reported" : "None"}
              </span>
            </div>
            <div>
              <span className="text-xs text-surface-500 block">Dependents Count</span>
              <span className="font-medium text-surface-900">{fed.dependents.length} qualifying dependents</span>
            </div>
            <div>
              <span className="text-xs text-surface-500 block">Taxpayer SSN Status</span>
              <span className="font-mono text-surface-700">***-**-**** (Masked)</span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* SECTION 5: Income Breakdown */}
      <Card>
        <CardHeader
          className="cursor-pointer hover:bg-surface-50 transition-colors py-4"
          onClick={() => toggleSection("income")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <CardTitle className="text-base font-semibold">2. Income & Adjustments</CardTitle>
            </div>
            {expandedSections.income ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </CardHeader>
        {expandedSections.income && fed && (
          <CardContent className="pt-2 pb-6 border-t border-surface-100 text-sm space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-surface-50 p-4 rounded-lg">
              <div>
                <span className="text-xs text-surface-500 block">W-2 Wages (Line 1z)</span>
                <span className="font-semibold text-surface-900">
                  {formatCurrencyFromCents(fed.income.w2WagesCents + fed.income.spouseW2WagesCents)}
                </span>
              </div>
              <div>
                <span className="text-xs text-surface-500 block">1099 Gross Income</span>
                <span className="font-semibold text-surface-900">
                  {formatCurrencyFromCents(fed.income.gross1099IncomeCents + fed.income.spouseGross1099IncomeCents)}
                </span>
              </div>
              <div>
                <span className="text-xs text-surface-500 block">Gig / Self-Employment Net</span>
                <span className="font-semibold text-surface-900">
                  {formatCurrencyFromCents(fed.income.gigBusinessGrossCents)}
                </span>
              </div>
              <div>
                <span className="text-xs text-surface-500 block">Adjusted Gross Income (AGI)</span>
                <span className="font-semibold text-emerald-700">
                  {formatCurrencyFromCents(fed.adjustments.adjustedGrossIncomeCents)}
                </span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* SECTION 7 & 8: Deductions & Credits */}
      <Card>
        <CardHeader
          className="cursor-pointer hover:bg-surface-50 transition-colors py-4"
          onClick={() => toggleSection("deductions")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <CardTitle className="text-base font-semibold">3. Deductions & Credits</CardTitle>
            </div>
            {expandedSections.deductions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </CardHeader>
        {expandedSections.deductions && fed && (
          <CardContent className="pt-2 pb-6 border-t border-surface-100 text-sm space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-xs text-surface-500 block">Deduction Method</span>
                <Badge variant="outline" className="capitalize mt-1">
                  {fed.deductions.deductionType} deduction
                </Badge>
              </div>
              <div>
                <span className="text-xs text-surface-500 block">Deduction Claimed</span>
                <span className="font-semibold text-surface-900">
                  {formatCurrencyFromCents(fed.deductions.deductionUsedCents)}
                </span>
              </div>
              <div>
                <span className="text-xs text-surface-500 block">Child Tax Credit (CTC)</span>
                <span className="font-semibold text-surface-900">
                  {formatCurrencyFromCents(fed.credits.childTaxCreditCents)}
                </span>
              </div>
              <div>
                <span className="text-xs text-surface-500 block">Earned Income Credit (EIC)</span>
                <span className="font-semibold text-surface-900">
                  {formatCurrencyFromCents(fed.credits.earnedIncomeCreditCents)}
                </span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* SECTION 9: Federal Return Calculation & Reconciliation */}
      <Card>
        <CardHeader
          className="cursor-pointer hover:bg-surface-50 transition-colors py-4"
          onClick={() => toggleSection("federal")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <CardTitle className="text-base font-semibold">4. Authoritative Federal Return Result</CardTitle>
            </div>
            {expandedSections.federal ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </CardHeader>
        {expandedSections.federal && fed && (
          <CardContent className="pt-2 pb-6 border-t border-surface-100 text-sm space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-emerald-50/50 p-4 rounded-lg border border-emerald-100">
              <div>
                <span className="text-xs text-surface-500 block">Taxable Income</span>
                <span className="font-bold text-surface-900">
                  {formatCurrencyFromCents(fed.taxes.taxableIncomeCents)}
                </span>
              </div>
              <div>
                <span className="text-xs text-surface-500 block">Total Tax Liability</span>
                <span className="font-bold text-surface-900">
                  {formatCurrencyFromCents(fed.taxes.totalTaxLiabilityCents)}
                </span>
              </div>
              <div>
                <span className="text-xs text-surface-500 block">Total Payments & Withholding</span>
                <span className="font-bold text-surface-900">
                  {formatCurrencyFromCents(fed.payments.totalPaymentsAndCreditsCents)}
                </span>
              </div>
              <div>
                <span className="text-xs text-surface-500 block">
                  {fed.refundOrBalanceDue.type === "refund" ? "Estimated Refund" : "Amount You Owe"}
                </span>
                <span
                  className={`text-lg font-extrabold ${
                    fed.refundOrBalanceDue.type === "refund" ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {formatCurrencyFromCents(fed.refundOrBalanceDue.amountCents)}
                </span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* SECTION 10: State Tax Review */}
      <Card>
        <CardHeader
          className="cursor-pointer hover:bg-surface-50 transition-colors py-4"
          onClick={() => toggleSection("state")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <CardTitle className="text-base font-semibold">5. State Tax Situation</CardTitle>
            </div>
            {expandedSections.state ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </CardHeader>
        {expandedSections.state && (
          <CardContent className="pt-2 pb-6 border-t border-surface-100 text-sm">
            {stateSummary ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-xs text-surface-500 block">Resident State</span>
                  <span className="font-semibold text-surface-900">{stateSummary.stateName} ({stateSummary.stateCode})</span>
                </div>
                <div>
                  <span className="text-xs text-surface-500 block">State Income Tax Status</span>
                  <span className="font-semibold text-surface-900">
                    {stateSummary.hasIndividualIncomeTax ? "Levied" : "No State Income Tax"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-surface-500 block">State Net Liability</span>
                  <span className="font-semibold text-surface-900">
                    {formatCurrencyFromCents(stateSummary.financials.netTaxLiabilityCents)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-surface-500 block">State Readiness</span>
                  <Badge variant="outline">{stateSummary.readiness.status}</Badge>
                </div>
              </div>
            ) : (
              <p className="text-surface-500 italic">No state tax residency indicated.</p>
            )}
          </CardContent>
        )}
      </Card>

      {/* SECTION 12: E-file Readiness */}
      <Card>
        <CardHeader
          className="cursor-pointer hover:bg-surface-50 transition-colors py-4"
          onClick={() => toggleSection("efile")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-base font-semibold">6. IRS E-File Readiness</CardTitle>
            </div>
            {expandedSections.efile ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </CardHeader>
        {expandedSections.efile && efile && (
          <CardContent className="pt-2 pb-6 border-t border-surface-100 text-sm space-y-3">
            <div className="flex items-center justify-between p-3 bg-surface-50 rounded-lg">
              <div className="flex items-center gap-2">
                {efile.isReady ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                )}
                <div>
                  <span className="font-semibold text-surface-900">
                    {efile.isReady ? "E-File Ready (MeF Schema Validated)" : "Preparation Pending Checks"}
                  </span>
                  <p className="text-xs text-surface-500">
                    {efile.blockingErrors.length} blocking errors, {efile.warnings.length} warnings
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* SECTION 13: Review Comments & Findings */}
      <Card>
        <CardHeader
          className="cursor-pointer hover:bg-surface-50 transition-colors py-4"
          onClick={() => toggleSection("comments")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-600" />
              <CardTitle className="text-base font-semibold">
                7. Professional Review Findings ({reviewCase.comments.length})
              </CardTitle>
            </div>
            {expandedSections.comments ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </CardHeader>
        {expandedSections.comments && (
          <CardContent className="pt-2 pb-6 border-t border-surface-100 space-y-6">
            {/* List of existing findings */}
            <div className="space-y-3">
              {reviewCase.comments.length === 0 ? (
                <p className="text-sm text-surface-500 italic">No review findings recorded yet.</p>
              ) : (
                reviewCase.comments.map((comment: ProfessionalReviewComment) => (
                  <div
                    key={comment.id}
                    className={`p-4 rounded-xl border text-sm flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      comment.status === "RESOLVED"
                        ? "bg-surface-50 border-surface-200 opacity-75"
                        : comment.severity === "REQUIRES_ACTION"
                        ? "bg-red-50/60 border-red-200"
                        : comment.severity === "WARNING"
                        ? "bg-amber-50/60 border-amber-200"
                        : "bg-blue-50/60 border-blue-200"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            comment.severity === "REQUIRES_ACTION"
                              ? "amber"
                              : comment.severity === "WARNING"
                              ? "amber"
                              : "neutral"
                          }
                          className="text-[10px] uppercase font-bold"
                        >
                          {comment.severity.replace("_", " ")}
                        </Badge>
                        <span className="text-xs font-semibold text-surface-700 capitalize">
                          [{comment.section.replace("_", " ")}]
                        </span>
                        <span className="text-xs text-surface-400">
                          by {comment.authorName} ({comment.authorRole}) • {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-surface-900 font-medium">{comment.message}</p>
                      {comment.status === "RESOLVED" && (
                        <p className="text-xs text-emerald-700 flex items-center gap-1 mt-1">
                          <Check className="w-3.5 h-3.5" /> Resolved by {comment.resolvedByName || "Preparer"} on{" "}
                          {comment.resolvedAt ? new Date(comment.resolvedAt).toLocaleDateString() : ""}
                        </p>
                      )}
                    </div>

                    {comment.status === "OPEN" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 self-start md:self-center text-xs"
                        onClick={() => handleResolveComment(comment.id)}
                        disabled={isProcessing}
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Mark Resolved
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Add Finding Form (Available to Professional / Admin) */}
            {canManage && (
              <form onSubmit={handleAddComment} className="pt-4 border-t border-surface-200 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-500">
                  Add Professional Finding / Comment
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-surface-600 block mb-1">Section</label>
                    <select
                      value={commentSection}
                      onChange={(e) => setCommentSection(e.target.value as ReviewCommentSection)}
                      className="w-full text-xs rounded-lg border-surface-300 p-2 bg-surface-50"
                    >
                      <option value="taxpayer_profile">Taxpayer Profile</option>
                      <option value="filing_status">Filing Status</option>
                      <option value="spouse">Spouse</option>
                      <option value="dependents">Dependents</option>
                      <option value="w2_income">W-2 Income</option>
                      <option value="1099_income">1099 Income</option>
                      <option value="business_income">Business / Gig</option>
                      <option value="adjustments">Adjustments</option>
                      <option value="deductions">Deductions</option>
                      <option value="credits">Credits</option>
                      <option value="federal_return">Federal Return</option>
                      <option value="state_return">State Return</option>
                      <option value="documents">Documents</option>
                      <option value="efile_readiness">E-File Readiness</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-surface-600 block mb-1">Severity</label>
                    <select
                      value={commentSeverity}
                      onChange={(e) => setCommentSeverity(e.target.value as ReviewCommentSeverity)}
                      className="w-full text-xs rounded-lg border-surface-300 p-2 bg-surface-50"
                    >
                      <option value="INFO">INFO (Advisory note)</option>
                      <option value="WARNING">WARNING (Recommended check)</option>
                      <option value="REQUIRES_ACTION">REQUIRES_ACTION (Action needed before completion)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <textarea
                    rows={2}
                    value={commentMessage}
                    onChange={(e) => setCommentMessage(e.target.value)}
                    placeholder="Enter precise professional finding or request..."
                    className="w-full text-xs rounded-lg border-surface-300 p-2.5 bg-surface-50"
                  />
                </div>
                <div className="flex justify-end">
                  <Button size="sm" type="submit" disabled={isAddingComment || !commentMessage.trim()}>
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    Post Finding
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        )}
      </Card>

      {/* SECTION 14: Audit Timeline */}
      <Card>
        <CardHeader
          className="cursor-pointer hover:bg-surface-50 transition-colors py-4"
          onClick={() => toggleSection("timeline")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-surface-500" />
              <CardTitle className="text-base font-semibold">8. Audit & Review Timeline ({reviewCase.events.length})</CardTitle>
            </div>
            {expandedSections.timeline ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </CardHeader>
        {expandedSections.timeline && (
          <CardContent className="pt-2 pb-6 border-t border-surface-100 text-xs space-y-3">
            {reviewCase.events.map((evt) => (
              <div key={evt.id} className="flex items-start gap-3 py-1.5 border-b border-surface-100 last:border-0">
                <span className="font-mono text-surface-400 shrink-0">
                  {new Date(evt.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                <div>
                  <span className="font-semibold text-surface-900">{evt.actorName}</span> ({evt.actorRole}):{" "}
                  <span className="text-surface-700">{evt.description}</span>
                </div>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* Request Changes Modal */}
      {showRequestChangesModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-50 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-surface-900">Request Changes from Taxpayer</h3>
            <p className="text-xs text-surface-600">
              This will transition the case to <strong>CHANGES_REQUESTED</strong> and notify the taxpayer to edit their tax preparation session.
            </p>
            <textarea
              rows={4}
              value={changeNotes}
              onChange={(e) => setChangeNotes(e.target.value)}
              placeholder="Specify the exact numbers, documents, or sections requiring taxpayer adjustment..."
              className="w-full text-xs rounded-lg border-surface-300 p-2.5 bg-white"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRequestChangesModal(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={handleRequestChanges}
                disabled={isProcessing}
              >
                Send Change Request
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Safety Legal Disclaimer */}
      <div className="p-4 bg-surface-100 border border-surface-200 rounded-xl text-xs text-surface-600">
        <p className="font-semibold text-surface-800 mb-1">CPA/EA Professional Review Advisory Notice:</p>
        <p>
          TaxAIHelp CPA/EA review provides structured examination of taxpayer-prepared numbers.
          <strong> NOT FILED WITH THE IRS.</strong> Completion of professional review does not transmit this return to
          the IRS or state taxing authorities. To file your return, download your official Form 1040 package, sign, and
          mail it to the IRS, or transmit via an authorized IRS e-file electronic return originator (ERO).
        </p>
      </div>
    </div>
  );
}
