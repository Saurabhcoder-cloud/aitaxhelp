"use client";

import React from "react";
import { TaxPreparationSession } from "@/lib/services/tax-preparation-session-store";

function money(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function TaxSituationSummaryPanel({ session }: { session: TaxPreparationSession }) {
  const summary = session.situationSummary;
  const needed = summary.readiness.missing.length + summary.readiness.errors.length;

  return (
    <section className="rounded-lg border border-surface-200 p-4 space-y-3" aria-labelledby="situation-heading">
      <h2 id="situation-heading" className="text-base font-semibold text-surface-900">
        Your tax situation
      </h2>
      <p className="text-sm text-surface-700">
        {summary.taxYear} · {summary.filingStatus.replaceAll("_", " ")}
        {summary.taxpayerName ? ` · ${summary.taxpayerName}` : ""}
      </p>

      <div>
        <p className="text-sm font-semibold text-surface-900">What you told us</p>
        <ul className="text-sm text-surface-800 space-y-1">
          {summary.whatYouToldUs.incomeSources.map((source) => (
            <li key={source}>✓ {source}</li>
          ))}
          <li>W-2 wages {money(summary.whatYouToldUs.w2WagesCents)}</li>
          <li>1099 income {money(summary.whatYouToldUs.form1099GrossCents)}</li>
          <li>Gig and business receipts {money(summary.whatYouToldUs.gigBusinessGrossCents)}</li>
          <li>Expenses recorded {money(summary.whatYouToldUs.expenseCents)}</li>
        </ul>
      </div>

      <div>
        <p className="text-sm font-semibold text-surface-900">Documents and information received</p>
        <ul className="text-sm text-surface-800">
          {summary.informationReceived.length === 0 && <li>Nothing recorded yet.</li>}
          {summary.informationReceived.map((item) => (
            <li key={item}>✓ {item}</li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-sm font-semibold text-surface-900">Information still needed</p>
        <ul className="text-sm text-surface-800">
          {summary.informationStillNeeded.length === 0 && summary.warnings.length === 0 && (
            <li>Nothing required is missing.</li>
          )}
          {summary.informationStillNeeded.map((item) => (
            <li key={item}>○ {item}</li>
          ))}
          {summary.warnings.map((item) => (
            <li key={item}>○ {item}</li>
          ))}
        </ul>
      </div>

      <p className="text-sm font-semibold text-surface-900">
        {summary.calculationStatus === "ready"
          ? "Ready for your tax calculation"
          : `${needed} thing${needed === 1 ? "" : "s"} still needed before calculation`}
      </p>
      <p className="text-xs text-surface-600">
        Calculation status: {summary.calculationStatus === "ready" ? "ready" : "not ready"}. No tax estimate is shown
        until the tax engine runs.
      </p>
    </section>
  );
}
