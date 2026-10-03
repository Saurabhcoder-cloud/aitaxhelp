"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { ProfessionalCaseDetailView } from "@/components/professional/ProfessionalCaseDetailView";
import { ProfessionalReviewCase } from "@/lib/professional/types";

interface PageProps {
  params: Promise<{ caseId: string }> | { caseId: string };
}

export default function ProfessionalReviewCasePage({ params }: PageProps) {
  const resolvedParams = use(Promise.resolve(params));
  const caseId = resolvedParams.caseId;

  const [reviewCase, setReviewCase] = useState<ProfessionalReviewCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCase() {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/v1/tax/preparation/session/professional-review/${caseId}`
        );
        if (!res.ok) {
          if (res.status === 404) throw new Error("Review case not found.");
          if (res.status === 403) throw new Error("You are not authorized to view this review case.");
          throw new Error("Failed to load review case.");
        }
        const json = await res.json();
        if (json.success && json.data) {
          setReviewCase(json.data);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error loading review case.");
      } finally {
        setLoading(false);
      }
    }

    loadCase();
  }, [caseId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <p className="text-sm text-surface-600">Loading professional review workspace...</p>
      </div>
    );
  }

  if (error || !reviewCase) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-red-50 border border-red-200 rounded-xl space-y-4 text-center">
        <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
        <h2 className="text-lg font-bold text-red-900">Unable to Load Review Case</h2>
        <p className="text-sm text-red-700">{error || "Review case not found."}</p>
        <Link
          href="/admin/leads"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface-900 text-white rounded-lg text-xs font-semibold hover:bg-surface-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Leads & Cases
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/leads"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-surface-600 hover:text-surface-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Review Cases
        </Link>
      </div>

      <ProfessionalCaseDetailView
        initialCase={reviewCase}
        isProfessionalUser={true}
        isAdminUser={true}
      />
    </div>
  );
}
