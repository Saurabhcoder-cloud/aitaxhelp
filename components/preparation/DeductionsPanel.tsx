"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { TaxPreparationSession } from "@/lib/services/tax-preparation-session-store";
import {
  DEDUCTION_CATEGORIES,
  DEDUCTION_CATEGORY_LABELS,
  DeductionCategory,
  DeductionEntry,
  incomeSupportsBusinessExpenses,
  prefillDeductionsFromIncome,
} from "@/lib/preparation/deductions";
import { listIncomeSources } from "@/lib/preparation/income";
import { savePreparationDeductions, updatePreparationProgress } from "@/lib/utils/preparation-session-api";
import { validateCurrencyInput } from "@/lib/utils/calculator-validation";

function dollars(cents: number): string {
  return cents > 0 ? (cents / 100).toFixed(2) : "";
}

export function DeductionsPanel({
  session,
  onSessionChange,
}: {
  session: TaxPreparationSession;
  onSessionChange: (session: TaxPreparationSession) => void;
}) {
  const businessIncome = incomeSupportsBusinessExpenses(session.incomeSnapshot);
  const saved = session.deductionsSnapshot.saved ? session.deductionsSnapshot : null;
  const [hasBusinessExpenses, setHasBusinessExpenses] = useState<boolean | null>(
    saved ? saved.hasBusinessExpenses : businessIncome ? null : false
  );
  const [acknowledged, setAcknowledged] = useState(
    saved?.standardDeductionAcknowledged ?? !businessIncome
  );
  const seededEntries =
    saved?.entries ?? (businessIncome ? prefillDeductionsFromIncome(session.incomeSnapshot) : []);
  const [entries, setEntries] = useState<DeductionEntry[]>(seededEntries);
  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(seededEntries.map((entry) => [entry.id, dollars(entry.amountCents)]))
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const sources = listIncomeSources(session.incomeSnapshot);

  function addEntry() {
    const id = crypto.randomUUID();
    setEntries((items) => [
      ...items,
      {
        id,
        category: "other_expenses",
        amountCents: 0,
        description: "",
        relatedIncomeId: sources[0]?.id ?? null,
        confirmed: true,
      },
    ]);
    setAmounts((current) => ({ ...current, [id]: "" }));
  }

  async function handleContinue() {
    const nextEntries = entries.map((entry) => {
      const parsed = validateCurrencyInput(amounts[entry.id] || "0", {
        required: true,
        fieldName: DEDUCTION_CATEGORY_LABELS[entry.category],
        allowZero: false,
      });
      return {
        ...entry,
        amountCents: parsed.isValid ? parsed.cents : -1,
        confirmed: true,
      };
    });

    if (hasBusinessExpenses && nextEntries.some((entry) => entry.amountCents < 0)) {
      setError("Enter a valid expense amount greater than zero.");
      return;
    }

    setIsSaving(true);
    setError(null);
    const result = await savePreparationDeductions({
      hasBusinessExpenses: businessIncome ? hasBusinessExpenses : false,
      standardDeductionAcknowledged: acknowledged || !businessIncome,
      entries: hasBusinessExpenses ? nextEntries : [],
    });
    if (!result.success || !result.data) {
      setIsSaving(false);
      setError(result.error || "Unable to save deductions.");
      return;
    }
    const progressed = await updatePreparationProgress("deductions");
    setIsSaving(false);
    if (!progressed.success || !progressed.data) {
      onSessionChange(result.data);
      setError(progressed.error || "Unable to continue.");
      return;
    }
    onSessionChange(progressed.data);
  }

  return (
    <section className="space-y-4" aria-labelledby="deductions-heading">
      <div className="space-y-1">
        <h2 id="deductions-heading" className="text-base font-semibold text-surface-900">
          Let&apos;s look for deductions.
        </h2>
        <p className="text-sm text-surface-700">
          {businessIncome
            ? "If you had costs for freelance, gig, or business work, enter the expense categories this tax calculation already supports. The tax engine applies them later."
            : "Wage-only preparation uses the standard deduction for your filing status. This step does not calculate tax."}
        </p>
      </div>

      {businessIncome ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-surface-800">Did you have costs for this work?</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="has-expenses"
              checked={hasBusinessExpenses === true}
              onChange={() => setHasBusinessExpenses(true)}
            />
            Yes, I had work expenses
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="has-expenses"
              checked={hasBusinessExpenses === false}
              onChange={() => setHasBusinessExpenses(false)}
            />
            No costs to enter
          </label>
        </fieldset>
      ) : (
        <label className="flex items-start gap-2 text-sm text-surface-800">
          <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />
          I understand the tax engine will use the standard deduction for my filing status.
        </label>
      )}

      {hasBusinessExpenses && (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.id} className="grid gap-3 rounded-lg border border-surface-200 p-3 md:grid-cols-2">
              <FormField label="Expense type" id={`${entry.id}-category`}>
                <select
                  id={`${entry.id}-category`}
                  className="h-10 w-full rounded-md border border-surface-300 bg-white px-3 text-sm"
                  value={entry.category}
                  onChange={(event) =>
                    setEntries((items) =>
                      items.map((item) =>
                        item.id === entry.id
                          ? { ...item, category: event.target.value as DeductionCategory }
                          : item
                      )
                    )
                  }
                >
                  {DEDUCTION_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {DEDUCTION_CATEGORY_LABELS[category]}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Amount" id={`${entry.id}-amount`} required>
                <Input
                  id={`${entry.id}-amount`}
                  isCurrency
                  inputMode="decimal"
                  value={amounts[entry.id] ?? ""}
                  onChange={(event) => setAmounts((current) => ({ ...current, [entry.id]: event.target.value }))}
                />
              </FormField>
              <FormField label="What was this for?" id={`${entry.id}-description`}>
                <Input
                  id={`${entry.id}-description`}
                  value={entry.description}
                  onChange={(event) =>
                    setEntries((items) =>
                      items.map((item) =>
                        item.id === entry.id ? { ...item, description: event.target.value } : item
                      )
                    )
                  }
                />
              </FormField>
              {sources.length > 0 && (
                <FormField label="Related income" id={`${entry.id}-source`}>
                  <select
                    id={`${entry.id}-source`}
                    className="h-10 w-full rounded-md border border-surface-300 bg-white px-3 text-sm"
                    value={entry.relatedIncomeId ?? ""}
                    onChange={(event) =>
                      setEntries((items) =>
                        items.map((item) =>
                          item.id === entry.id ? { ...item, relatedIncomeId: event.target.value || null } : item
                        )
                      )
                    }
                  >
                    <option value="">Not tied to one source</option>
                    {sources.map((source) => (
                      <option key={source.id} value={source.id}>
                        {source.label}
                      </option>
                    ))}
                  </select>
                </FormField>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addEntry}>
            Add another expense
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="button" onClick={() => void handleContinue()} disabled={isSaving || (businessIncome && hasBusinessExpenses === null)}>
        {isSaving ? "Saving..." : "Continue"}
      </Button>
    </section>
  );
}
