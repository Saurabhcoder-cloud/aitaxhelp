"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { TaxPreparationSession } from "@/lib/services/tax-preparation-session-store";
import {
  ActivityKind,
  Form1099IncomeType,
  IncomeDiscovery,
  IncomeSituation,
  listIncomeSources,
} from "@/lib/preparation/income";
import {
  savePreparationIncome,
  updatePreparationProgress,
} from "@/lib/utils/preparation-session-api";
import { validateCurrencyInput } from "@/lib/utils/calculator-validation";

const SITUATION_OPTIONS: { id: IncomeSituation; label: string; why: string }[] = [
  {
    id: "employer",
    label: "I worked for an employer",
    why: "This covers wages reported on a W-2.",
  },
  {
    id: "freelance",
    label: "I did freelance or contract work",
    why: "This covers money a client or company paid you on a 1099.",
  },
  {
    id: "gig",
    label: "I earned money from gig apps or platforms",
    why: "This covers driving, delivery, and other platform work.",
  },
  {
    id: "business",
    label: "I ran my own business",
    why: "This covers a business you operated yourself.",
  },
];

interface W2Draft {
  id: string;
  employerName: string;
  wages: string;
  federalWithholding: string;
}

interface Form1099Draft {
  id: string;
  incomeType: Form1099IncomeType;
  payerName: string;
  grossIncome: string;
  federalWithholding: string;
}

interface ActivityDraft {
  id: string;
  kind: ActivityKind;
  activityName: string;
  grossReceipts: string;
  equipmentSupplies: string;
  softwareSubscriptions: string;
  homeOfficeVehicle: string;
  otherExpenses: string;
}

function dollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

function newId(): string {
  return crypto.randomUUID();
}

function emptyW2(): W2Draft {
  return { id: newId(), employerName: "", wages: "", federalWithholding: "0.00" };
}

function empty1099(): Form1099Draft {
  return {
    id: newId(),
    incomeType: "freelance",
    payerName: "",
    grossIncome: "",
    federalWithholding: "0.00",
  };
}

function emptyActivity(kind: ActivityKind): ActivityDraft {
  return {
    id: newId(),
    kind,
    activityName: "",
    grossReceipts: "",
    equipmentSupplies: "0.00",
    softwareSubscriptions: "0.00",
    homeOfficeVehicle: "0.00",
    otherExpenses: "0.00",
  };
}

function draftsFromSession(income: IncomeDiscovery) {
  return {
    situations: income.situations,
    w2s: income.w2s.map((entry) => ({
      id: entry.id,
      employerName: entry.employerName,
      wages: dollars(entry.wagesCents),
      federalWithholding: dollars(entry.federalWithholdingCents),
    })),
    form1099s: income.form1099s.map((entry) => ({
      id: entry.id,
      incomeType: entry.incomeType,
      payerName: entry.payerName,
      grossIncome: dollars(entry.grossIncomeCents),
      federalWithholding: dollars(entry.federalWithholdingCents),
    })),
    activities: income.activities.map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      activityName: entry.activityName,
      grossReceipts: dollars(entry.grossReceiptsCents),
      equipmentSupplies: dollars(entry.equipmentSuppliesCents),
      softwareSubscriptions: dollars(entry.softwareSubscriptionsCents),
      homeOfficeVehicle: dollars(entry.homeOfficeVehicleCents),
      otherExpenses: dollars(entry.otherExpensesCents),
    })),
  };
}

function moneyCents(raw: string, fieldName: string, allowZero: boolean): { cents: number; error?: string } {
  const parsed = validateCurrencyInput(raw, { required: true, fieldName, allowZero });
  if (!parsed.isValid) {
    return { cents: 0, error: parsed.error };
  }
  return { cents: parsed.cents };
}

export function IncomeDiscoveryPanel({
  session,
  onSessionChange,
}: {
  session: TaxPreparationSession;
  onSessionChange: (session: TaxPreparationSession) => void;
}) {
  const initial = useMemo(() => draftsFromSession(session.incomeSnapshot), [session.incomeSnapshot]);
  const [situations, setSituations] = useState<IncomeSituation[]>(initial.situations);
  const [w2s, setW2s] = useState<W2Draft[]>(initial.w2s);
  const [form1099s, setForm1099s] = useState<Form1099Draft[]>(initial.form1099s);
  const [activities, setActivities] = useState<ActivityDraft[]>(initial.activities);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(session.incomeSnapshot.situations.length > 0);

  const sources = listIncomeSources(session.incomeSnapshot);

  function toggleSituation(situation: IncomeSituation) {
    setSaved(false);
    setSituations((current) => {
      const selected = current.includes(situation);
      if (selected) {
        if (situation === "employer") setW2s([]);
        if (situation === "freelance") setForm1099s([]);
        if (situation === "gig") setActivities((items) => items.filter((item) => item.kind !== "gig"));
        if (situation === "business") {
          setActivities((items) => items.filter((item) => item.kind !== "business"));
        }
        return current.filter((item) => item !== situation);
      }
      if (situation === "employer") setW2s((items) => (items.length > 0 ? items : [emptyW2()]));
      if (situation === "freelance") setForm1099s((items) => (items.length > 0 ? items : [empty1099()]));
      if (situation === "gig") {
        setActivities((items) =>
          items.some((item) => item.kind === "gig") ? items : [...items, emptyActivity("gig")]
        );
      }
      if (situation === "business") {
        setActivities((items) =>
          items.some((item) => item.kind === "business") ? items : [...items, emptyActivity("business")]
        );
      }
      return [...current, situation];
    });
  }

  function buildIncome(): IncomeDiscovery | null {
    const errors: Record<string, string> = {};
    if (situations.length === 0) {
      errors.situations = "Choose at least one way you made money.";
    }

    const nextW2s = situations.includes("employer")
      ? w2s.map((entry) => {
          const wages = moneyCents(entry.wages, "Wages", false);
          const withholding = moneyCents(entry.federalWithholding || "0", "Federal withholding", true);
          if (!entry.employerName.trim()) errors[`${entry.id}-employer`] = "Enter the employer name.";
          if (wages.error) errors[`${entry.id}-wages`] = wages.error;
          if (withholding.error) errors[`${entry.id}-withholding`] = withholding.error;
          return {
            id: entry.id,
            employerName: entry.employerName.trim(),
            wagesCents: wages.cents,
            federalWithholdingCents: withholding.cents,
          };
        })
      : [];

    const next1099s = situations.includes("freelance")
      ? form1099s.map((entry) => {
          const gross = moneyCents(entry.grossIncome, "Gross income", false);
          const withholding = moneyCents(entry.federalWithholding || "0", "Federal withholding", true);
          if (!entry.payerName.trim()) errors[`${entry.id}-payer`] = "Enter who paid you.";
          if (gross.error) errors[`${entry.id}-gross`] = gross.error;
          if (withholding.error) errors[`${entry.id}-withholding`] = withholding.error;
          return {
            id: entry.id,
            incomeType: entry.incomeType,
            payerName: entry.payerName.trim(),
            grossIncomeCents: gross.cents,
            federalWithholdingCents: withholding.cents,
          };
        })
      : [];

    const nextActivities = activities
      .filter((entry) => situations.includes(entry.kind))
      .map((entry) => {
        const gross = moneyCents(entry.grossReceipts, "Gross receipts", false);
        const expenses = [
          moneyCents(entry.equipmentSupplies || "0", "Equipment and supplies", true),
          moneyCents(entry.softwareSubscriptions || "0", "Software subscriptions", true),
          moneyCents(entry.homeOfficeVehicle || "0", "Home office and vehicle", true),
          moneyCents(entry.otherExpenses || "0", "Other expenses", true),
        ];
        if (!entry.activityName.trim()) errors[`${entry.id}-name`] = "Enter the activity name.";
        if (gross.error) errors[`${entry.id}-gross`] = gross.error;
        expenses.forEach((expense, index) => {
          if (expense.error) errors[`${entry.id}-expense-${index}`] = expense.error;
        });
        return {
          id: entry.id,
          kind: entry.kind,
          activityName: entry.activityName.trim(),
          grossReceiptsCents: gross.cents,
          equipmentSuppliesCents: expenses[0].cents,
          softwareSubscriptionsCents: expenses[1].cents,
          homeOfficeVehicleCents: expenses[2].cents,
          otherExpensesCents: expenses[3].cents,
        };
      });

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return null;
    }

    return {
      situations,
      w2s: nextW2s,
      form1099s: next1099s,
      activities: nextActivities,
    };
  }

  async function persist(): Promise<TaxPreparationSession | null> {
    const income = buildIncome();
    if (!income) {
      setError("Complete the highlighted income fields before continuing.");
      return null;
    }
    setIsSaving(true);
    setError(null);
    const result = await savePreparationIncome(income);
    setIsSaving(false);
    if (!result.success || !result.data) {
      setError(result.error || "Unable to save income.");
      return null;
    }
    setSaved(true);
    onSessionChange(result.data);
    return result.data;
  }

  async function handleContinue() {
    if (!saved) {
      const fresh = await persist();
      if (!fresh) return;
    }
    setIsSaving(true);
    const result = await updatePreparationProgress("income");
    setIsSaving(false);
    if (!result.success || !result.data) {
      setError(result.error || "Unable to complete the income step.");
      return;
    }
    onSessionChange(result.data);
  }

  return (
    <section className="space-y-5" aria-labelledby="income-discovery-heading">
      <div className="space-y-1">
        <h2 id="income-discovery-heading" className="text-base font-semibold text-surface-900">
          How did you make money in {session.taxYear}?
        </h2>
        <p className="text-sm text-surface-700">
          Choose every way that applies. TaxAIHelp uses this to ask only for the income that belongs
          in your return. The tax engine calculates the numbers later.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-surface-800">Ways you made money</legend>
        {SITUATION_OPTIONS.map((option) => (
          <label key={option.id} className="flex items-start gap-3 rounded-lg border border-surface-200 p-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={situations.includes(option.id)}
              onChange={() => toggleSituation(option.id)}
            />
            <span>
              <span className="block text-sm font-medium text-surface-900">{option.label}</span>
              <span className="block text-xs text-surface-600">{option.why}</span>
            </span>
          </label>
        ))}
        {fieldErrors.situations && <p className="text-xs text-red-600">{fieldErrors.situations}</p>}
      </fieldset>

      {situations.includes("employer") && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-surface-900">Jobs that sent you a W-2</h3>
          <p className="text-xs text-surface-600">
            Enter the employer name, wages, and federal income tax withheld. Social Security and
            Medicare boxes are not used by the current tax engine.
          </p>
          {w2s.map((entry, index) => (
            <div key={entry.id} className="grid gap-3 rounded-lg border border-surface-200 p-3 md:grid-cols-3">
              <FormField label={`Employer ${index + 1}`} id={`${entry.id}-employer`} required error={fieldErrors[`${entry.id}-employer`]}>
                <Input
                  id={`${entry.id}-employer`}
                  value={entry.employerName}
                  hasError={Boolean(fieldErrors[`${entry.id}-employer`])}
                  onChange={(event) => {
                    setSaved(false);
                    setW2s((items) =>
                      items.map((item) =>
                        item.id === entry.id ? { ...item, employerName: event.target.value } : item
                      )
                    );
                  }}
                />
              </FormField>
              <FormField label="Wages" id={`${entry.id}-wages`} required error={fieldErrors[`${entry.id}-wages`]}>
                <Input
                  id={`${entry.id}-wages`}
                  isCurrency
                  inputMode="decimal"
                  value={entry.wages}
                  hasError={Boolean(fieldErrors[`${entry.id}-wages`])}
                  onChange={(event) => {
                    setSaved(false);
                    setW2s((items) =>
                      items.map((item) => (item.id === entry.id ? { ...item, wages: event.target.value } : item))
                    );
                  }}
                />
              </FormField>
              <FormField
                label="Federal withholding"
                id={`${entry.id}-withholding`}
                error={fieldErrors[`${entry.id}-withholding`]}
              >
                <Input
                  id={`${entry.id}-withholding`}
                  isCurrency
                  inputMode="decimal"
                  value={entry.federalWithholding}
                  hasError={Boolean(fieldErrors[`${entry.id}-withholding`])}
                  onChange={(event) => {
                    setSaved(false);
                    setW2s((items) =>
                      items.map((item) =>
                        item.id === entry.id ? { ...item, federalWithholding: event.target.value } : item
                      )
                    );
                  }}
                />
              </FormField>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSaved(false);
                setW2s((items) => [...items, emptyW2()]);
              }}
            >
              Add another W-2
            </Button>
            {w2s.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSaved(false);
                  setW2s((items) => items.slice(0, -1));
                }}
              >
                Remove last W-2
              </Button>
            )}
          </div>
        </div>
      )}

      {situations.includes("freelance") && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-surface-900">Freelance or contract income</h3>
          {form1099s.map((entry) => (
            <div key={entry.id} className="grid gap-3 rounded-lg border border-surface-200 p-3 md:grid-cols-2">
              <FormField label="Income type" id={`${entry.id}-type`}>
                <select
                  id={`${entry.id}-type`}
                  className="h-10 w-full rounded-md border border-surface-300 bg-white px-3 text-sm"
                  value={entry.incomeType}
                  onChange={(event) => {
                    setSaved(false);
                    setForm1099s((items) =>
                      items.map((item) =>
                        item.id === entry.id
                          ? { ...item, incomeType: event.target.value as Form1099IncomeType }
                          : item
                      )
                    );
                  }}
                >
                  <option value="freelance">Freelance or contract</option>
                  <option value="gig">Gig platform</option>
                  <option value="other">Other 1099 income</option>
                </select>
              </FormField>
              <FormField label="Who paid you" id={`${entry.id}-payer`} required error={fieldErrors[`${entry.id}-payer`]}>
                <Input
                  id={`${entry.id}-payer`}
                  value={entry.payerName}
                  hasError={Boolean(fieldErrors[`${entry.id}-payer`])}
                  onChange={(event) => {
                    setSaved(false);
                    setForm1099s((items) =>
                      items.map((item) =>
                        item.id === entry.id ? { ...item, payerName: event.target.value } : item
                      )
                    );
                  }}
                />
              </FormField>
              <FormField label="Gross income" id={`${entry.id}-gross`} required error={fieldErrors[`${entry.id}-gross`]}>
                <Input
                  id={`${entry.id}-gross`}
                  isCurrency
                  inputMode="decimal"
                  value={entry.grossIncome}
                  hasError={Boolean(fieldErrors[`${entry.id}-gross`])}
                  onChange={(event) => {
                    setSaved(false);
                    setForm1099s((items) =>
                      items.map((item) =>
                        item.id === entry.id ? { ...item, grossIncome: event.target.value } : item
                      )
                    );
                  }}
                />
              </FormField>
              <FormField
                label="Federal withholding"
                id={`${entry.id}-withholding`}
                error={fieldErrors[`${entry.id}-withholding`]}
              >
                <Input
                  id={`${entry.id}-withholding`}
                  isCurrency
                  inputMode="decimal"
                  value={entry.federalWithholding}
                  hasError={Boolean(fieldErrors[`${entry.id}-withholding`])}
                  onChange={(event) => {
                    setSaved(false);
                    setForm1099s((items) =>
                      items.map((item) =>
                        item.id === entry.id ? { ...item, federalWithholding: event.target.value } : item
                      )
                    );
                  }}
                />
              </FormField>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSaved(false);
                setForm1099s((items) => [...items, empty1099()]);
              }}
            >
              Add another 1099
            </Button>
            {form1099s.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSaved(false);
                  setForm1099s((items) => items.slice(0, -1));
                }}
              >
                Remove last 1099
              </Button>
            )}
          </div>
        </div>
      )}

      {activities.filter((entry) => situations.includes(entry.kind)).map((entry) => (
        <div key={entry.id} className="space-y-3 rounded-lg border border-surface-200 p-3">
          <h3 className="text-sm font-semibold text-surface-900">
            {entry.kind === "gig" ? "Gig or platform work" : "Your business"}
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField
              label={entry.kind === "gig" ? "Platform or activity" : "Business name"}
              id={`${entry.id}-name`}
              required
              error={fieldErrors[`${entry.id}-name`]}
            >
              <Input
                id={`${entry.id}-name`}
                value={entry.activityName}
                hasError={Boolean(fieldErrors[`${entry.id}-name`])}
                onChange={(event) => {
                  setSaved(false);
                  setActivities((items) =>
                    items.map((item) =>
                      item.id === entry.id ? { ...item, activityName: event.target.value } : item
                    )
                  );
                }}
              />
            </FormField>
            <FormField label="Gross receipts" id={`${entry.id}-gross`} required error={fieldErrors[`${entry.id}-gross`]}>
              <Input
                id={`${entry.id}-gross`}
                isCurrency
                inputMode="decimal"
                value={entry.grossReceipts}
                hasError={Boolean(fieldErrors[`${entry.id}-gross`])}
                onChange={(event) => {
                  setSaved(false);
                  setActivities((items) =>
                    items.map((item) =>
                      item.id === entry.id ? { ...item, grossReceipts: event.target.value } : item
                    )
                  );
                }}
              />
            </FormField>
            {(
              [
                ["equipmentSupplies", "Equipment and supplies"],
                ["softwareSubscriptions", "Software subscriptions"],
                ["homeOfficeVehicle", "Home office and vehicle"],
                ["otherExpenses", "Other expenses"],
              ] as const
            ).map(([key, label], index) => (
              <FormField key={key} label={label} id={`${entry.id}-${key}`} error={fieldErrors[`${entry.id}-expense-${index}`]}>
                <Input
                  id={`${entry.id}-${key}`}
                  isCurrency
                  inputMode="decimal"
                  value={entry[key]}
                  hasError={Boolean(fieldErrors[`${entry.id}-expense-${index}`])}
                  onChange={(event) => {
                    setSaved(false);
                    setActivities((items) =>
                      items.map((item) =>
                        item.id === entry.id ? { ...item, [key]: event.target.value } : item
                      )
                    );
                  }}
                />
              </FormField>
            ))}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        {situations.includes("gig") && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSaved(false);
              setActivities((items) => [...items, emptyActivity("gig")]);
            }}
          >
            Add another gig source
          </Button>
        )}
        {situations.includes("business") && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSaved(false);
              setActivities((items) => [...items, emptyActivity("business")]);
            }}
          >
            Add another business
          </Button>
        )}
      </div>

      {sources.length > 0 && (
        <div className="rounded-lg bg-surface-50 border border-surface-200 p-4 space-y-2">
          <p className="text-sm font-semibold text-surface-900">Your income sources</p>
          <ul className="space-y-1 text-sm text-surface-800">
            {sources.map((source) => (
              <li key={source.id}>✓ {source.label}</li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={() => void persist()} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save income"}
        </Button>
        <Button type="button" onClick={() => void handleContinue()} disabled={isSaving}>
          Continue
        </Button>
      </div>
    </section>
  );
}
