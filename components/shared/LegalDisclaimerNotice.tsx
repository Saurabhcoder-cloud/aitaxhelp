import React from "react";
import Link from "next/link";
import { Alert } from "../ui/Alert";

export function LegalDisclaimerNotice({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="text-xs text-surface-600 bg-surface-50 border border-surface-200 rounded-lg p-3 leading-relaxed">
        <span className="font-semibold text-surface-800">Educational Notice:</span> All calculations are deterministic estimates for educational purposes. TaxAIHelp is not affiliated with the IRS or any government agency. Consult a certified CPA or EA.{" "}
        <Link href="/disclaimer" className="text-brand-600 hover:underline">
          Read full disclaimer
        </Link>
      </div>
    );
  }

  return (
    <Alert variant="info" title="Educational Tax Estimation Notice" className="my-6">
      TaxAIHelp calculations are deterministic estimates based on standard IRS federal tax formulas. They are designed to help you understand your general tax obligations and deductions. TaxAIHelp is not an IRS-endorsed service, and our calculations do not replace certified CPA or Enrolled Agent filing reviews. Unsupported tax scenarios (such as complex foreign income or specialty state tax credits) must be evaluated with a qualified tax professional.{" "}
      <Link href="/disclaimer" className="font-semibold text-brand-700 underline ml-1">
        Learn more about our standards
      </Link>
      .
    </Alert>
  );
}
