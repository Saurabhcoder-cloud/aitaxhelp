"use client";

import React, { useState, useEffect, useCallback } from "react";
import { TaxPreparationSession } from "@/lib/services/tax-preparation-session-store";
import { FinalReturnSnapshot } from "@/lib/preparation/final-return-snapshot";
import { FederalReturn } from "@/lib/preparation/federal-return";
import { formatCurrencyFromCents } from "@/lib/utils/currency";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Send,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ShieldCheck,
  FileText,
  X,
} from "lucide-react";
import { ProfessionalReviewCase } from "@/lib/professional/types";

interface EfileSubmissionSectionProps {
  session: TaxPreparationSession;
  federalReturn: FederalReturn;
  frozenSnapshot: FinalReturnSnapshot | null;
  proReviewCase: ProfessionalReviewCase | null;
}

interface EfileStatusResponse {
  lifecycleStatus: string;
  isFrozen: boolean;
  activeSubmission: {
    id: string;
    provider: string;
    providerSubmissionId?: string;
    providerCorrelationId?: string;
    status: string;
    isTestSubmission: boolean;
    submittedAt?: string;
    acknowledgedAt?: string;
    acceptedAt?: string;
    rejectedAt?: string;
    rejectionCode?: string;
    rejectionMessage?: string;
    taxpayerAction?: string;
  } | null;
  provider: {
    providerId: string;
    providerName: string;
    isConnected: boolean;
    isMock: boolean;
    transmissionNotice: string;
  };
}

export function EfileSubmissionSection({
  session,
  federalReturn,
  frozenSnapshot,
  proReviewCase,
}: EfileSubmissionSectionProps) {
  const [statusData, setStatusData] = useState<EfileStatusResponse | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasConfirmedCheckbox, setHasConfirmedCheckbox] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setIsLoadingStatus(true);
      const res = await fetch("/api/v1/tax/preparation/session/federal-return/efile/status");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setStatusData(json.data);
        }
      }
    } catch (_e) {
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus, frozenSnapshot?.checksum]);

  // Handle Submission
  const handleSubmitReturn = async () => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const res = await fetch("/api/v1/tax/preparation/session/federal-return/efile/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userConfirmed: true,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || "Failed to submit federal return.");
      }

      setIsModalOpen(false);
      await fetchStatus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission failed.";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine if CPA review blocks filing
  const isCpaBlocking = Boolean(
    proReviewCase &&
      (proReviewCase.status === "CHANGES_REQUESTED" ||
        proReviewCase.status === "IN_REVIEW" ||
        proReviewCase.status === "ASSIGNED" ||
        proReviewCase.status === "READY_FOR_FINAL_REVIEW")
  );

  const provider = statusData?.provider;
  const activeSub = statusData?.activeSubmission;

  return (
    <div className="p-4 rounded-xl border border-surface-200 bg-white space-y-4 text-xs">
      {/* Header and Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-100 pb-3">
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-brand-600 shrink-0" />
          <span className="font-bold text-surface-900 text-sm">
            Federal Electronic Filing (MeF) Transmission
          </span>
        </div>
        <div className="flex items-center gap-2">
          {provider?.isMock && (
            <Badge variant="amber" className="text-[10px] font-mono uppercase bg-amber-50 text-amber-800 border-amber-300">
              Mock Sandbox Mode
            </Badge>
          )}
          {activeSub ? (
            <Badge
              variant={
                activeSub.status === "ACCEPTED"
                  ? "emerald"
                  : activeSub.status === "REJECTED"
                  ? "amber"
                  : "neutral"
              }
              className="text-[10px] font-semibold uppercase"
            >
              Status: {activeSub.status.replace("_", " ")}
            </Badge>
          ) : frozenSnapshot ? (
            <Badge variant="outline" className="text-[10px] font-semibold text-emerald-700 border-emerald-300 bg-emerald-50">
              Ready to Transmit
            </Badge>
          ) : (
            <Badge variant="neutral" className="text-[10px]">
              Freeze Required
            </Badge>
          )}
        </div>
      </div>

      {/* Provider Connectivity Description */}
      <div className="p-3 rounded-lg bg-surface-50 border border-surface-200 text-[11px] leading-relaxed text-surface-700 space-y-1">
        <p className="font-medium text-surface-900">
          Transmission Provider: {provider?.providerName || "Checking connectivity..."}
        </p>
        <p className="text-surface-600">
          {provider?.transmissionNotice ||
            "Direct transmission to the IRS requires an authorized IRS MeF integration."}
        </p>
      </div>

      {/* CPA Review Gate Banner if blocked */}
      {isCpaBlocking && (
        <div className="p-3 rounded-lg border border-purple-200 bg-purple-50 text-purple-900 space-y-1">
          <div className="flex items-center gap-2 font-semibold text-xs">
            <AlertTriangle className="w-4 h-4 text-purple-600 shrink-0" />
            <span>Filing Locked: Professional Review Pending</span>
          </div>
          <p className="text-[11px] text-purple-800">
            {proReviewCase?.status === "CHANGES_REQUESTED"
              ? "Your CPA or Enrolled Agent has requested adjustments. You must resolve open findings before submitting."
              : "Your return is currently being examined by an assigned tax professional. Submission is locked until review completes."}
          </p>
        </div>
      )}

      {/* Rejection notice if submission failed */}
      {activeSub?.status === "REJECTED" && (
        <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-900 space-y-2">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>Submission Rejected ({activeSub.rejectionCode || "MeF Rule"})</span>
          </div>
          <p className="text-[11px] text-red-800">
            {activeSub.rejectionMessage || "IRS MeF rejected submission with business rule failure."}
          </p>
          {activeSub.taxpayerAction && (
            <p className="text-[11px] font-medium text-red-900">
              Action Required: {activeSub.taxpayerAction}
            </p>
          )}
        </div>
      )}

      {/* Active Submission Summary */}
      {activeSub && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-surface-50 rounded-lg border border-surface-200 text-[11px]">
          <div>
            <span className="text-surface-500 text-[10px] uppercase font-mono">Provider Sub ID</span>
            <p className="font-mono text-surface-800 truncate" title={activeSub.providerSubmissionId}>
              {activeSub.providerSubmissionId || "Pending"}
            </p>
          </div>
          <div>
            <span className="text-surface-500 text-[10px] uppercase font-mono">Transmitted At</span>
            <p className="text-surface-800">
              {activeSub.submittedAt ? new Date(activeSub.submittedAt).toLocaleString() : "Pending"}
            </p>
          </div>
          <div>
            <span className="text-surface-500 text-[10px] uppercase font-mono">Test Submission?</span>
            <p className={activeSub.isTestSubmission ? "text-amber-700 font-semibold" : "text-emerald-700 font-semibold"}>
              {activeSub.isTestSubmission ? "YES (Test Only)" : "NO (Official)"}
            </p>
          </div>
        </div>
      )}

      {/* Action Button: Trigger Confirmation Modal */}
      {frozenSnapshot && (!activeSub || activeSub.status === "FAILED" || activeSub.status === "READY_TO_SUBMIT") && (
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-[11px] text-surface-600">
            Return snapshot is verified and cryptographically frozen. Review and transmit when ready.
          </p>
          <Button
            onClick={() => {
              setHasConfirmedCheckbox(false);
              setSubmitError(null);
              setIsModalOpen(true);
            }}
            disabled={!provider?.isConnected || isCpaBlocking || isLoadingStatus}
            className="bg-brand-600 hover:bg-brand-700 text-white shrink-0 text-xs h-9 px-4 font-semibold"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            {provider?.isMock ? "Transmit E-File Return (Test Mode)" : "Transmit E-File Return"}
          </Button>
        </div>
      )}

      {/* Submission Confirmation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-surface-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-surface-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-surface-900 text-base">
                  Confirm Federal E-File Submission
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-surface-400 hover:text-surface-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Return Summary Verification Card */}
            <div className="p-4 rounded-xl bg-surface-50 border border-surface-200 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-surface-600">Tax Year:</span>
                <span className="font-bold text-surface-900">{session.taxYear}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-600">Filing Status:</span>
                <span className="font-semibold text-surface-800 capitalize">
                  {federalReturn.filingStatus.status.replace(/_/g, " ")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-600">Primary Taxpayer:</span>
                <span className="font-medium text-surface-800">
                  {federalReturn.taxpayer.fullName} ({federalReturn.taxpayer.stateOfResidence || "US"})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-600">Adjusted Gross Income (AGI):</span>
                <span className="font-mono text-surface-900 font-semibold">
                  {formatCurrencyFromCents(federalReturn.adjustments.adjustedGrossIncomeCents)}
                </span>
              </div>
              <div className="flex justify-between border-t border-surface-200/80 pt-2">
                <span className="text-surface-700 font-medium">
                  {federalReturn.refundOrBalanceDue.type === "refund" ? "Estimated Refund:" : "Estimated Tax Due:"}
                </span>
                <span
                  className={
                    federalReturn.refundOrBalanceDue.type === "refund"
                      ? "text-emerald-700 font-bold font-mono text-sm"
                      : "text-amber-700 font-bold font-mono text-sm"
                  }
                >
                  {federalReturn.refundOrBalanceDue.type === "refund"
                    ? formatCurrencyFromCents(federalReturn.refundOrBalanceDue.estimatedRefundCents)
                    : formatCurrencyFromCents(federalReturn.refundOrBalanceDue.estimatedAmountOwedCents)}
                </span>
              </div>
            </div>

            {/* Snapshot Integrity Notice */}
            {frozenSnapshot && (
              <div className="p-3 rounded-lg bg-surface-50/70 border border-surface-200 text-[10px] space-y-1">
                <span className="text-surface-500 uppercase tracking-wider font-mono">Frozen Snapshot Hash</span>
                <p className="font-mono text-emerald-800 truncate" title={frozenSnapshot.checksum}>
                  {frozenSnapshot.checksum}
                </p>
              </div>
            )}

            {/* Legal Notice / Test Notice */}
            <div
              className={
                provider?.isMock
                  ? "p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-[11px] space-y-1"
                  : "p-3 rounded-xl border border-blue-200 bg-blue-50 text-blue-900 text-[11px] space-y-1"
              }
            >
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>
                  {provider?.isMock
                    ? "DEVELOPMENT / TEST TRANSMISSION NOTICE"
                    : "TAXPAYER DECLARATION & CONSENT"}
                </span>
              </div>
              <p className="leading-relaxed">
                {provider?.isMock
                  ? "This environment is configured with a development mock provider. Your return will be processed by test simulation and will NOT be transmitted to the Internal Revenue Service."
                  : "Under penalties of perjury, I declare that I have examined this return, including accompanying schedules and statements, and to the best of my knowledge and belief, it is true, correct, and complete."}
              </p>
            </div>

            {/* Confirmation Checkbox */}
            <label className="flex items-start gap-2.5 cursor-pointer text-xs select-none">
              <input
                type="checkbox"
                checked={hasConfirmedCheckbox}
                onChange={(e) => setHasConfirmedCheckbox(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-brand-600 rounded border-surface-300 focus:ring-brand-500"
              />
              <span className="text-surface-800 font-medium">
                I have reviewed my tax numbers and confirm I want to transmit this federal tax return.
              </span>
            </label>

            {submitError && (
              <p className="text-xs text-red-600 font-medium bg-red-50 p-2.5 rounded-lg border border-red-200">
                {submitError}
              </p>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitReturn}
                disabled={!hasConfirmedCheckbox || isSubmitting}
                className="bg-brand-600 hover:bg-brand-700 text-white text-xs h-9 px-5 font-semibold"
              >
                {isSubmitting ? "Transmitting..." : "Authorize & Submit Return"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
