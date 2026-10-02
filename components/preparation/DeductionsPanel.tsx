"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TaxPreparationSession } from "@/lib/services/tax-preparation-session-store";
import {
  DEDUCTION_CATEGORIES,
  DEDUCTION_CATEGORY_LABELS,
  DeductionCategory,
  DeductionEntry,
  GuidedDeductionAnswers,
  incomeSupportsBusinessExpenses,
  isBusinessDeductionCategory,
  isItemizedDeductionCategory,
  isFutureExtensionCategory,
  calculateEntryEffectiveAmountCents,
  deductionExpenseCents,
  itemizedDeductionTotalCents,
  prefillDeductionsFromIncome,
} from "@/lib/preparation/deductions";
import { listIncomeSources } from "@/lib/preparation/income";
import {
  savePreparationDeductions,
  updatePreparationProgress,
  navigateToPreparationStep,
} from "@/lib/utils/preparation-session-api";
import { validateCurrencyInput } from "@/lib/utils/calculator-validation";
import { formatCurrencyFromCents } from "@/lib/utils/currency";
import { getTaxRules } from "@/tax-engine/rules";
import {
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Home,
  Heart,
  Stethoscope,
  Briefcase,
  GraduationCap,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  FileText,
  DollarSign,
  Percent,
} from "lucide-react";

function dollars(cents: number): string {
  return cents > 0 ? (cents / 100).toFixed(2) : "";
}

function parseDollarsToCents(val: string): number {
  const num = parseFloat(val.replace(/[^0-9.]/g, ""));
  if (isNaN(num) || num < 0) return 0;
  return Math.round(num * 100);
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

  // View state: 'guided' or 'review'
  const [activeView, setActiveView] = useState<"guided" | "review">("guided");

  // Standard deduction acknowledgement
  const [acknowledged, setAcknowledged] = useState<boolean>(
    saved?.standardDeductionAcknowledged ?? true
  );

  // Business expenses toggle
  const [hasBusinessExpenses, setHasBusinessExpenses] = useState<boolean | null>(
    saved ? saved.hasBusinessExpenses : businessIncome ? null : false
  );

  // Guided questionnaire answers
  const initialGuided: GuidedDeductionAnswers = saved?.guidedAnswers ?? {};

  // Home & Mortgage
  const [ownedHome, setOwnedHome] = useState<boolean | null>(
    initialGuided.home?.ownedHome ?? null
  );
  const [mortgageInterest, setMortgageInterest] = useState<string>(
    initialGuided.home?.mortgageInterestCents ? dollars(initialGuided.home.mortgageInterestCents) : ""
  );
  const [propertyTaxes, setPropertyTaxes] = useState<string>(
    initialGuided.home?.propertyTaxesCents ? dollars(initialGuided.home.propertyTaxesCents) : ""
  );

  // Charity
  const [madeDonations, setMadeDonations] = useState<boolean | null>(
    initialGuided.charity?.madeDonations ?? null
  );
  const [charityCash, setCharityCash] = useState<string>(
    initialGuided.charity?.cashCents ? dollars(initialGuided.charity.cashCents) : ""
  );
  const [charityNonCash, setCharityNonCash] = useState<string>(
    initialGuided.charity?.nonCashCents ? dollars(initialGuided.charity.nonCashCents) : ""
  );

  // Medical
  const [hadMedical, setHadMedical] = useState<boolean | null>(
    initialGuided.medical?.hadSignificantMedical ?? null
  );
  const [medicalExpenses, setMedicalExpenses] = useState<string>(
    initialGuided.medical?.medicalExpensesCents ? dollars(initialGuided.medical.medicalExpensesCents) : ""
  );

  // State & Local Taxes (SALT)
  const [paidStateLocal, setPaidStateLocal] = useState<boolean | null>(
    initialGuided.stateLocal?.paidStateLocalTaxes ?? null
  );
  const [stateLocalTaxes, setStateLocalTaxes] = useState<string>(
    initialGuided.stateLocal?.stateLocalTaxCents ? dollars(initialGuided.stateLocal.stateLocalTaxCents) : ""
  );

  // Education (Future Extension)
  const [paidEducation, setPaidEducation] = useState<boolean | null>(
    initialGuided.education?.paidEducation ?? null
  );
  const [studentLoanInterest, setStudentLoanInterest] = useState<string>(
    initialGuided.education?.studentLoanInterestCents
      ? dollars(initialGuided.education.studentLoanInterestCents)
      : ""
  );

  // Childcare (Future Extension)
  const [paidChildcare, setPaidChildcare] = useState<boolean | null>(
    initialGuided.childcare?.paidChildcare ?? null
  );
  const [childcareExpenses, setChildcareExpenses] = useState<string>(
    initialGuided.childcare?.childcareCents ? dollars(initialGuided.childcare.childcareCents) : ""
  );

  // Retirement / HSA
  const [contributedRetirement, setContributedRetirement] = useState<boolean | null>(
    initialGuided.retirementHsa?.contributedRetirementHsa ?? null
  );
  const [traditionalIra, setTraditionalIra] = useState<string>(
    initialGuided.retirementHsa?.traditionalIraCents
      ? dollars(initialGuided.retirementHsa.traditionalIraCents)
      : ""
  );
  const [hsaContribution, setHsaContribution] = useState<string>(
    initialGuided.retirementHsa?.hsaCents ? dollars(initialGuided.retirementHsa.hsaCents) : ""
  );

  // Business entries
  const seededEntries =
    saved?.entries && saved.entries.length > 0
      ? saved.entries
      : businessIncome
      ? prefillDeductionsFromIncome(session.incomeSnapshot)
      : [];

  const [businessEntries, setBusinessEntries] = useState<DeductionEntry[]>(
    seededEntries.filter((e) => isBusinessDeductionCategory(e.category))
  );

  const [entryAmounts, setEntryAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      seededEntries
        .filter((e) => isBusinessDeductionCategory(e.category))
        .map((entry) => [entry.id, dollars(entry.amountCents)])
    )
  );

  const [entryPercents, setEntryPercents] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      seededEntries
        .filter((e) => isBusinessDeductionCategory(e.category))
        .map((entry) => [entry.id, entry.businessUsePercent ?? 100])
    )
  );

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const sources = listIncomeSources(session.incomeSnapshot);

  // Standard deduction lookup for display
  const effectiveFilingStatus =
    session.householdSnapshot?.filingStatus || session.profileSnapshot.filingStatus;
  const taxRules = getTaxRules(session.taxYear);
  const statutoryStandardDeductionCents =
    taxRules.standardDeductions[effectiveFilingStatus] ?? 15_000_00;

  // Add a new business expense row
  function addBusinessEntry() {
    const id = `biz-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newEntry: DeductionEntry = {
      id,
      category: "other_expenses",
      amountCents: 0,
      description: "",
      relatedIncomeId: sources[0]?.id ?? null,
      confirmed: true,
      businessUsePercent: 100,
    };
    setBusinessEntries((prev) => [...prev, newEntry]);
    setEntryAmounts((prev) => ({ ...prev, [id]: "" }));
    setEntryPercents((prev) => ({ ...prev, [id]: 100 }));
  }

  function removeBusinessEntry(id: string) {
    setBusinessEntries((prev) => prev.filter((e) => e.id !== id));
    setEntryAmounts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setEntryPercents((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  // Compile all entries (both business and discovered itemized)
  const compiledEntries = useMemo((): DeductionEntry[] => {
    const all: DeductionEntry[] = [];

    // 1. Business entries
    if (hasBusinessExpenses) {
      for (const entry of businessEntries) {
        const amt = parseDollarsToCents(entryAmounts[entry.id] || "0");
        const pct = entryPercents[entry.id] ?? 100;
        if (amt > 0) {
          all.push({
            ...entry,
            amountCents: amt,
            businessUsePercent: pct,
            confirmed: true,
            status: "applied_business",
          });
        }
      }
    }

    // 2. Discovered Itemized entries
    if (ownedHome && mortgageInterest) {
      const amt = parseDollarsToCents(mortgageInterest);
      if (amt > 0) {
        all.push({
          id: "itemized-mortgage",
          category: "mortgage_interest",
          amountCents: amt,
          description: "Home mortgage interest reported on Form 1098",
          relatedIncomeId: null,
          confirmed: true,
          status: "unsupported_schedule_a",
        });
      }
    }

    if (ownedHome && propertyTaxes) {
      const amt = parseDollarsToCents(propertyTaxes);
      if (amt > 0) {
        all.push({
          id: "itemized-prop-tax",
          category: "property_taxes",
          amountCents: amt,
          description: "Real estate and property taxes paid",
          relatedIncomeId: null,
          confirmed: true,
          status: "unsupported_schedule_a",
        });
      }
    }

    if (madeDonations && charityCash) {
      const amt = parseDollarsToCents(charityCash);
      if (amt > 0) {
        all.push({
          id: "itemized-charity-cash",
          category: "charitable_cash",
          amountCents: amt,
          description: "Charitable cash / check donations",
          relatedIncomeId: null,
          confirmed: true,
          status: "unsupported_schedule_a",
        });
      }
    }

    if (madeDonations && charityNonCash) {
      const amt = parseDollarsToCents(charityNonCash);
      if (amt > 0) {
        all.push({
          id: "itemized-charity-noncash",
          category: "charitable_non_cash",
          amountCents: amt,
          description: "Non-cash charitable donations",
          relatedIncomeId: null,
          confirmed: true,
          status: "unsupported_schedule_a",
        });
      }
    }

    if (hadMedical && medicalExpenses) {
      const amt = parseDollarsToCents(medicalExpenses);
      if (amt > 0) {
        all.push({
          id: "itemized-medical",
          category: "medical_dental",
          amountCents: amt,
          description: "Out-of-pocket medical and dental expenses",
          relatedIncomeId: null,
          confirmed: true,
          status: "unsupported_schedule_a",
        });
      }
    }

    if (paidStateLocal && stateLocalTaxes) {
      const amt = parseDollarsToCents(stateLocalTaxes);
      if (amt > 0) {
        all.push({
          id: "itemized-salt",
          category: "state_local_taxes",
          amountCents: amt,
          description: "State and local income or sales taxes paid",
          relatedIncomeId: null,
          confirmed: true,
          status: "unsupported_schedule_a",
        });
      }
    }

    // 3. Future extension entries
    if (paidEducation && studentLoanInterest) {
      const amt = parseDollarsToCents(studentLoanInterest);
      if (amt > 0) {
        all.push({
          id: "future-education",
          category: "education_expenses",
          amountCents: amt,
          description: "Qualified student loan interest",
          relatedIncomeId: null,
          confirmed: true,
          status: "future_extension",
        });
      }
    }

    if (paidChildcare && childcareExpenses) {
      const amt = parseDollarsToCents(childcareExpenses);
      if (amt > 0) {
        all.push({
          id: "future-childcare",
          category: "childcare_expenses",
          amountCents: amt,
          description: "Child and dependent care expenses",
          relatedIncomeId: null,
          confirmed: true,
          status: "future_extension",
        });
      }
    }

    if (contributedRetirement && traditionalIra) {
      const amt = parseDollarsToCents(traditionalIra);
      if (amt > 0) {
        all.push({
          id: "future-ira",
          category: "retirement_hsa",
          amountCents: amt,
          description: "Traditional IRA contributions outside payroll",
          relatedIncomeId: null,
          confirmed: true,
          status: "future_extension",
        });
      }
    }

    if (contributedRetirement && hsaContribution) {
      const amt = parseDollarsToCents(hsaContribution);
      if (amt > 0) {
        all.push({
          id: "future-hsa",
          category: "retirement_hsa",
          amountCents: amt,
          description: "Health Savings Account (HSA) contributions outside payroll",
          relatedIncomeId: null,
          confirmed: true,
          status: "future_extension",
        });
      }
    }

    return all;
  }, [
    hasBusinessExpenses,
    businessEntries,
    entryAmounts,
    entryPercents,
    ownedHome,
    mortgageInterest,
    propertyTaxes,
    madeDonations,
    charityCash,
    charityNonCash,
    hadMedical,
    medicalExpenses,
    paidStateLocal,
    stateLocalTaxes,
    paidEducation,
    studentLoanInterest,
    paidChildcare,
    childcareExpenses,
    contributedRetirement,
    traditionalIra,
    hsaContribution,
  ]);

  // Aggregate stats
  const totalBusinessExpenseCents = useMemo(() => {
    return compiledEntries
      .filter((e) => isBusinessDeductionCategory(e.category))
      .reduce((sum, e) => sum + calculateEntryEffectiveAmountCents(e), 0);
  }, [compiledEntries]);

  const totalDiscoveredItemizedCents = useMemo(() => {
    return compiledEntries
      .filter((e) => isItemizedDeductionCategory(e.category))
      .reduce((sum, e) => sum + e.amountCents, 0);
  }, [compiledEntries]);

  // Handle Save & Continue
  async function handleSaveAndContinue() {
    // Validate business entries if user indicated they had expenses
    if (businessIncome && hasBusinessExpenses === true) {
      const activeBiz = compiledEntries.filter((e) => isBusinessDeductionCategory(e.category));
      if (activeBiz.length === 0) {
        setError("Please add at least one business expense with an amount greater than zero, or select 'No work expenses'.");
        return;
      }
    }

    setIsSaving(true);
    setError(null);

    const guidedAnswers: GuidedDeductionAnswers = {
      home: {
        ownedHome,
        mortgageInterestCents: parseDollarsToCents(mortgageInterest),
        propertyTaxesCents: parseDollarsToCents(propertyTaxes),
      },
      charity: {
        madeDonations,
        cashCents: parseDollarsToCents(charityCash),
        nonCashCents: parseDollarsToCents(charityNonCash),
      },
      medical: {
        hadSignificantMedical: hadMedical,
        medicalExpensesCents: parseDollarsToCents(medicalExpenses),
      },
      stateLocal: {
        paidStateLocalTaxes: paidStateLocal,
        stateLocalTaxCents: parseDollarsToCents(stateLocalTaxes),
      },
      education: {
        paidEducation,
        studentLoanInterestCents: parseDollarsToCents(studentLoanInterest),
      },
      childcare: {
        paidChildcare,
        childcareCents: parseDollarsToCents(childcareExpenses),
      },
      retirementHsa: {
        contributedRetirementHsa: contributedRetirement,
        traditionalIraCents: parseDollarsToCents(traditionalIra),
        hsaCents: parseDollarsToCents(hsaContribution),
      },
      business: {
        hadBusinessExpenses: businessIncome ? hasBusinessExpenses : false,
      },
    };

    const payload = {
      hasBusinessExpenses: businessIncome ? hasBusinessExpenses : false,
      standardDeductionAcknowledged: acknowledged || !businessIncome,
      entries: compiledEntries,
      guidedAnswers,
    };

    const res = await savePreparationDeductions(payload);
    if (!res.success || !res.data) {
      setIsSaving(false);
      setError(res.error || "Unable to save deductions.");
      return;
    }

    const progressed = await updatePreparationProgress("deductions");
    setIsSaving(false);
    if (!progressed.success || !progressed.data) {
      onSessionChange(res.data);
      setError(progressed.error || "Unable to advance to next step.");
      return;
    }

    onSessionChange(progressed.data);
  }

  async function handleBack() {
    await navigateToPreparationStep("documents");
  }

  return (
    <section className="space-y-6" aria-labelledby="deductions-heading">
      {/* Header with Step Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-200 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
              Step 4 of 6
            </span>
            <span className="text-xs text-surface-500">Deductions & Expenses</span>
          </div>
          <h2 id="deductions-heading" className="text-lg font-bold text-surface-900 mt-1">
            Let&apos;s find deductions you may qualify for
          </h2>
          <p className="text-xs text-surface-600 mt-0.5">
            Answer a few plain-language questions. The deterministic tax engine will compare your findings to the statutory standard deduction.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            size="sm"
            variant={activeView === "guided" ? "primary" : "outline"}
            onClick={() => setActiveView("guided")}
          >
            Questionnaire
          </Button>
          <Button
            type="button"
            size="sm"
            variant={activeView === "review" ? "primary" : "outline"}
            onClick={() => setActiveView("review")}
          >
            Review ({compiledEntries.length})
          </Button>
        </div>
      </div>

      {/* Statutory Standard Deduction Guarantee Banner */}
      <Card className="border-brand-200 bg-brand-50/50">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-semibold text-brand-950 text-sm">
                Statutory Standard Deduction: {formatCurrencyFromCents(statutoryStandardDeductionCents)}
              </p>
              <p className="text-brand-900 leading-relaxed">
                As a <strong>{effectiveFilingStatus.replaceAll("_", " ")}</strong> taxpayer in {session.taxYear}, the IRS automatically guarantees a statutory standard deduction of <strong>{formatCurrencyFromCents(statutoryStandardDeductionCents)}</strong>.
                You only itemize if your qualifying personal deductions exceed this amount.
              </p>
              <label className="flex items-center gap-2 mt-2 pt-1 font-medium text-brand-950 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="rounded border-brand-300 text-brand-600 focus:ring-brand-500"
                />
                <span>I understand the tax engine will apply the standard deduction unless itemized deductions provide a larger benefit.</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main View: Guided Questionnaire vs. Review */}
      {activeView === "guided" ? (
        <div className="space-y-5">
          {/* Section 1: Freelance / Business Expenses (Prioritized for 1099/Gig users) */}
          {businessIncome && (
            <Card className="border-surface-200">
              <CardHeader className="pb-3 border-b border-surface-100 flex flex-row items-center gap-2">
                <Briefcase className="w-4 h-4 text-brand-600" />
                <CardTitle className="text-sm font-semibold text-surface-900">
                  Business & Freelance Expenses (Schedule C)
                </CardTitle>
                <Badge variant="brand" size="sm" className="ml-auto">
                  Reduces SE Profit
                </Badge>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 text-xs">
                <fieldset className="space-y-2">
                  <legend className="font-medium text-surface-800 text-sm">
                    Did you have ordinary and necessary business expenses for your freelance, gig, or 1099 work in {session.taxYear}?
                  </legend>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-surface-700">
                      <input
                        type="radio"
                        name="has-business-costs"
                        checked={hasBusinessExpenses === true}
                        onChange={() => setHasBusinessExpenses(true)}
                        className="text-brand-600"
                      />
                      Yes, I had business expenses
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-surface-700">
                      <input
                        type="radio"
                        name="has-business-costs"
                        checked={hasBusinessExpenses === false}
                        onChange={() => setHasBusinessExpenses(false)}
                        className="text-brand-600"
                      />
                      No expenses to report
                    </label>
                  </div>
                </fieldset>

                {hasBusinessExpenses && (
                  <div className="space-y-3 pt-2">
                    <p className="text-surface-500">
                      Enter each expense category. For mixed personal and business items (like cell phones or internet), set the business-use percentage.
                    </p>
                    {businessEntries.map((entry) => {
                      const amountStr = entryAmounts[entry.id] || "";
                      const percent = entryPercents[entry.id] ?? 100;
                      const parsedCents = parseDollarsToCents(amountStr);
                      const effectiveCents = Math.round((parsedCents * percent) / 100);

                      return (
                        <div
                          key={entry.id}
                          className="p-3 rounded-lg border border-surface-200 bg-surface-50/50 space-y-3"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <FormField label="Category" id={`${entry.id}-cat`}>
                              <select
                                id={`${entry.id}-cat`}
                                value={entry.category}
                                onChange={(e) =>
                                  setBusinessEntries((items) =>
                                    items.map((i) =>
                                      i.id === entry.id
                                        ? { ...i, category: e.target.value as DeductionCategory }
                                        : i
                                    )
                                  )
                                }
                                className="h-9 w-full rounded border border-surface-300 bg-white px-2.5 text-xs text-surface-900"
                              >
                                {DEDUCTION_CATEGORIES.filter((c) => isBusinessDeductionCategory(c)).map(
                                  (cat) => (
                                    <option key={cat} value={cat}>
                                      {DEDUCTION_CATEGORY_LABELS[cat]}
                                    </option>
                                  )
                                )}
                              </select>
                            </FormField>

                            <FormField label="Total Cost ($)" id={`${entry.id}-amt`} required>
                              <Input
                                id={`${entry.id}-amt`}
                                isCurrency
                                inputMode="decimal"
                                placeholder="0.00"
                                value={amountStr}
                                onChange={(e) =>
                                  setEntryAmounts((prev) => ({ ...prev, [entry.id]: e.target.value }))
                                }
                                className="h-9 text-xs"
                              />
                            </FormField>

                            <FormField label="Business Use (%)" id={`${entry.id}-pct`}>
                              <div className="flex items-center gap-2">
                                <input
                                  id={`${entry.id}-pct`}
                                  type="number"
                                  min={1}
                                  max={100}
                                  value={percent}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    setEntryPercents((prev) => ({
                                      ...prev,
                                      [entry.id]: isNaN(val) ? 100 : Math.min(100, Math.max(1, val)),
                                    }));
                                  }}
                                  className="h-9 w-20 rounded border border-surface-300 bg-white px-2 text-xs text-surface-900"
                                />
                                <span className="text-surface-500 text-xs">%</span>
                                {percent < 100 && (
                                  <span className="text-[11px] text-brand-700 font-medium">
                                    Deductible: {formatCurrencyFromCents(effectiveCents)}
                                  </span>
                                )}
                              </div>
                            </FormField>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                            <div className="sm:col-span-2">
                              <FormField label="Description / Vendor" id={`${entry.id}-desc`}>
                                <Input
                                  id={`${entry.id}-desc`}
                                  placeholder="e.g. Adobe software, Office supplies, Client mileage"
                                  value={entry.description}
                                  onChange={(e) =>
                                    setBusinessEntries((items) =>
                                      items.map((i) =>
                                        i.id === entry.id ? { ...i, description: e.target.value } : i
                                      )
                                    )
                                  }
                                  className="h-9 text-xs"
                                />
                              </FormField>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-2">
                              {sources.length > 0 && (
                                <select
                                  value={entry.relatedIncomeId ?? ""}
                                  onChange={(e) =>
                                    setBusinessEntries((items) =>
                                      items.map((i) =>
                                        i.id === entry.id
                                          ? { ...i, relatedIncomeId: e.target.value || null }
                                          : i
                                      )
                                    )
                                  }
                                  className="h-9 rounded border border-surface-300 bg-white px-2 text-[11px] text-surface-700 max-w-[140px]"
                                >
                                  <option value="">General (All)</option>
                                  {sources.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.label}
                                    </option>
                                  ))}
                                </select>
                              )}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeBusinessEntry(entry.id)}
                                className="h-9 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addBusinessEntry}
                      className="gap-1.5 text-xs text-brand-700"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Another Expense
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Section 2: Homeownership & Mortgage Interest */}
          <Card className="border-surface-200">
            <CardHeader className="pb-3 border-b border-surface-100 flex flex-row items-center gap-2">
              <Home className="w-4 h-4 text-brand-600" />
              <CardTitle className="text-sm font-semibold text-surface-900">
                Homeownership & Mortgage (Form 1098)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs">
              <div className="space-y-2">
                <p className="font-medium text-surface-800 text-sm">
                  Did you own a home in {session.taxYear}?
                </p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-surface-700">
                    <input
                      type="radio"
                      name="owned-home"
                      checked={ownedHome === true}
                      onChange={() => setOwnedHome(true)}
                      className="text-brand-600"
                    />
                    Yes, I owned a home
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-surface-700">
                    <input
                      type="radio"
                      name="owned-home"
                      checked={ownedHome === false}
                      onChange={() => {
                        setOwnedHome(false);
                        setMortgageInterest("");
                        setPropertyTaxes("");
                      }}
                      className="text-brand-600"
                    />
                    No, I rented or did not own
                  </label>
                </div>
              </div>

              {ownedHome && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <FormField label="Mortgage Interest (Form 1098 Box 1)" id="mortgage-interest">
                    <Input
                      id="mortgage-interest"
                      isCurrency
                      inputMode="decimal"
                      placeholder="0.00"
                      value={mortgageInterest}
                      onChange={(e) => setMortgageInterest(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </FormField>
                  <FormField label="Real Estate / Property Taxes Paid" id="property-taxes">
                    <Input
                      id="property-taxes"
                      isCurrency
                      inputMode="decimal"
                      placeholder="0.00"
                      value={propertyTaxes}
                      onChange={(e) => setPropertyTaxes(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </FormField>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 3: Charitable Giving */}
          <Card className="border-surface-200">
            <CardHeader className="pb-3 border-b border-surface-100 flex flex-row items-center gap-2">
              <Heart className="w-4 h-4 text-brand-600" />
              <CardTitle className="text-sm font-semibold text-surface-900">
                Charitable Contributions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs">
              <div className="space-y-2">
                <p className="font-medium text-surface-800 text-sm">
                  Did you make donations to recognized charities or religious organizations in {session.taxYear}?
                </p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-surface-700">
                    <input
                      type="radio"
                      name="made-donations"
                      checked={madeDonations === true}
                      onChange={() => setMadeDonations(true)}
                      className="text-brand-600"
                    />
                    Yes, I made donations
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-surface-700">
                    <input
                      type="radio"
                      name="made-donations"
                      checked={madeDonations === false}
                      onChange={() => {
                        setMadeDonations(false);
                        setCharityCash("");
                        setCharityNonCash("");
                      }}
                      className="text-brand-600"
                    />
                    No donations
                  </label>
                </div>
              </div>

              {madeDonations && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <FormField label="Cash, Check or Credit Card Donations" id="charity-cash">
                    <Input
                      id="charity-cash"
                      isCurrency
                      inputMode="decimal"
                      placeholder="0.00"
                      value={charityCash}
                      onChange={(e) => setCharityCash(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </FormField>
                  <FormField label="Non-Cash Donations (Goods, Clothing)" id="charity-noncash">
                    <Input
                      id="charity-noncash"
                      isCurrency
                      inputMode="decimal"
                      placeholder="0.00"
                      value={charityNonCash}
                      onChange={(e) => setCharityNonCash(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </FormField>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 4: Medical & Dental Expenses */}
          <Card className="border-surface-200">
            <CardHeader className="pb-3 border-b border-surface-100 flex flex-row items-center gap-2">
              <Stethoscope className="w-4 h-4 text-brand-600" />
              <CardTitle className="text-sm font-semibold text-surface-900">
                Medical & Dental Expenses
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs">
              <div className="space-y-2">
                <p className="font-medium text-surface-800 text-sm">
                  Did you pay significant out-of-pocket medical, dental, or vision expenses not reimbursed by insurance?
                </p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-surface-700">
                    <input
                      type="radio"
                      name="had-medical"
                      checked={hadMedical === true}
                      onChange={() => setHadMedical(true)}
                      className="text-brand-600"
                    />
                    Yes, I had medical costs
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-surface-700">
                    <input
                      type="radio"
                      name="had-medical"
                      checked={hadMedical === false}
                      onChange={() => {
                        setHadMedical(false);
                        setMedicalExpenses("");
                      }}
                      className="text-brand-600"
                    />
                    No significant medical costs
                  </label>
                </div>
              </div>

              {hadMedical && (
                <div className="max-w-xs pt-2">
                  <FormField label="Out-of-pocket Medical & Dental ($)" id="medical-expenses">
                    <Input
                      id="medical-expenses"
                      isCurrency
                      inputMode="decimal"
                      placeholder="0.00"
                      value={medicalExpenses}
                      onChange={(e) => setMedicalExpenses(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </FormField>
                  <p className="text-[11px] text-surface-500 mt-1">
                    IRS rule: Only medical costs exceeding 7.5% of your AGI are deductible when itemizing.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 5: State & Local Taxes (SALT) */}
          <Card className="border-surface-200">
            <CardHeader className="pb-3 border-b border-surface-100 flex flex-row items-center gap-2">
              <FileText className="w-4 h-4 text-brand-600" />
              <CardTitle className="text-sm font-semibold text-surface-900">
                State & Local Taxes (SALT)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs">
              <div className="space-y-2">
                <p className="font-medium text-surface-800 text-sm">
                  Did you pay state or local income or general sales taxes in {session.taxYear}?
                </p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-surface-700">
                    <input
                      type="radio"
                      name="paid-salt"
                      checked={paidStateLocal === true}
                      onChange={() => setPaidStateLocal(true)}
                      className="text-brand-600"
                    />
                    Yes, I paid state/local taxes
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-surface-700">
                    <input
                      type="radio"
                      name="paid-salt"
                      checked={paidStateLocal === false}
                      onChange={() => {
                        setPaidStateLocal(false);
                        setStateLocalTaxes("");
                      }}
                      className="text-brand-600"
                    />
                    No or already on W-2
                  </label>
                </div>
              </div>

              {paidStateLocal && (
                <div className="max-w-xs pt-2">
                  <FormField label="State & Local Taxes Paid ($)" id="salt-taxes">
                    <Input
                      id="salt-taxes"
                      isCurrency
                      inputMode="decimal"
                      placeholder="0.00"
                      value={stateLocalTaxes}
                      onChange={(e) => setStateLocalTaxes(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </FormField>
                  <p className="text-[11px] text-surface-500 mt-1">
                    Subject to statutory $10,000 SALT cap ($5,000 if Married Filing Separately).
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 6: Education & Childcare (Informational / Future Extension) */}
          <Card className="border-surface-200">
            <CardHeader className="pb-3 border-b border-surface-100 flex flex-row items-center gap-2">
              <GraduationCap className="w-4 h-4 text-brand-600" />
              <CardTitle className="text-sm font-semibold text-surface-900">
                Education & Dependent Care
              </CardTitle>
              <Badge variant="neutral" size="sm" className="ml-auto">
                Future Extension
              </Badge>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              <div className="space-y-2">
                <p className="font-medium text-surface-800 text-sm">
                  Did you pay student loan interest or childcare expenses?
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <FormField label="Student Loan Interest Paid ($)" id="student-loan-interest">
                    <Input
                      id="student-loan-interest"
                      isCurrency
                      inputMode="decimal"
                      placeholder="0.00"
                      value={studentLoanInterest}
                      onChange={(e) => {
                        setStudentLoanInterest(e.target.value);
                        setPaidEducation(true);
                      }}
                      className="h-9 text-xs"
                    />
                  </FormField>
                  <FormField label="Childcare / Daycare Expenses ($)" id="childcare-expenses">
                    <Input
                      id="childcare-expenses"
                      isCurrency
                      inputMode="decimal"
                      placeholder="0.00"
                      value={childcareExpenses}
                      onChange={(e) => {
                        setChildcareExpenses(e.target.value);
                        setPaidChildcare(true);
                      }}
                      className="h-9 text-xs"
                    />
                  </FormField>
                </div>
                <p className="text-[11px] text-surface-500">
                  Note: Form 2441 (Child Care Credit) and Schedule 1 student loan deduction calculations are preserved for future engine updates and do not alter the current baseline calculation.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Deduction Review Screen */
        <div className="space-y-4">
          <Card className="border-surface-200">
            <CardHeader className="pb-3 border-b border-surface-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-surface-900">
                  Deductions & Expenses Review
                </CardTitle>
                <p className="text-xs text-surface-500 mt-0.5">
                  Summary of all potential deductions discovered during your preparation session.
                </p>
              </div>
              <Badge variant="brand" size="sm">
                Tax Year {session.taxYear}
              </Badge>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              <div className="divide-y divide-surface-200 rounded-lg border border-surface-200 bg-white">
                {/* Statutory Standard Deduction Row */}
                <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-brand-50/30">
                  <div>
                    <span className="font-semibold text-surface-900 text-sm">
                      Official IRS Standard Deduction
                    </span>
                    <p className="text-xs text-surface-600 mt-0.5">
                      Statutory deduction for {effectiveFilingStatus.replaceAll("_", " ")} status.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-surface-900 text-sm">
                      {formatCurrencyFromCents(statutoryStandardDeductionCents)}
                    </span>
                    <Badge variant="brand" size="sm" className="block sm:inline ml-auto mt-1 sm:mt-0 sm:ml-2">
                      Applied by Engine
                    </Badge>
                  </div>
                </div>

                {/* Compiled Entries */}
                {compiledEntries.length === 0 ? (
                  <div className="p-4 text-center text-surface-500">
                    No additional business expenses or itemized deductions entered. The standard deduction will be applied.
                  </div>
                ) : (
                  compiledEntries.map((entry) => {
                    const isBiz = isBusinessDeductionCategory(entry.category);
                    const isItemized = isItemizedDeductionCategory(entry.category);
                    const effectiveAmount = isBiz
                      ? calculateEntryEffectiveAmountCents(entry)
                      : entry.amountCents;

                    return (
                      <div
                        key={entry.id}
                        className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-surface-900">
                              {DEDUCTION_CATEGORY_LABELS[entry.category]}
                            </span>
                            {entry.businessUsePercent && entry.businessUsePercent < 100 && (
                              <span className="text-[11px] text-surface-500">
                                ({entry.businessUsePercent}% business use)
                              </span>
                            )}
                          </div>
                          {entry.description && (
                            <p className="text-xs text-surface-600 mt-0.5">{entry.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-surface-900 text-sm">
                            {formatCurrencyFromCents(effectiveAmount)}
                          </span>
                          <div className="mt-1">
                            {isBiz ? (
                              <Badge variant="brand" size="sm">
                                Offsets 1099 Profit
                              </Badge>
                            ) : isItemized ? (
                              <Badge variant="neutral" size="sm">
                                Std Deduction Larger
                              </Badge>
                            ) : (
                              <Badge variant="neutral" size="sm">
                                Record Only
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Summary Stats Footer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-lg border border-surface-200 bg-surface-50">
                  <p className="text-xs text-surface-500 font-medium">Business Expenses (Schedule C)</p>
                  <p className="text-base font-bold text-surface-900">
                    {formatCurrencyFromCents(totalBusinessExpenseCents)}
                  </p>
                  <p className="text-[11px] text-surface-600 mt-0.5">
                    Directly reduces gross self-employment receipts prior to income and SE tax.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-surface-200 bg-surface-50">
                  <p className="text-xs text-surface-500 font-medium">Discovered Itemized Deductions</p>
                  <p className="text-base font-bold text-surface-900">
                    {formatCurrencyFromCents(totalDiscoveredItemizedCents)}
                  </p>
                  <p className="text-[11px] text-surface-600 mt-0.5">
                    {totalDiscoveredItemizedCents <= statutoryStandardDeductionCents
                      ? `Standard deduction (${formatCurrencyFromCents(statutoryStandardDeductionCents)}) is larger and provides a higher refund.`
                      : `Itemized deductions exceed standard deduction in discovery.`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-surface-200">
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleBack()}
          disabled={isSaving}
          className="w-full sm:w-auto gap-1.5"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Documents
        </Button>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {activeView === "guided" ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveView("review")}
              className="w-full sm:w-auto"
            >
              Review Deductions ({compiledEntries.length})
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveView("guided")}
              className="w-full sm:w-auto"
            >
              Edit Answers
            </Button>
          )}

          <Button
            type="button"
            onClick={() => void handleSaveAndContinue()}
            disabled={isSaving || (businessIncome && hasBusinessExpenses === null)}
            className="w-full sm:w-auto gap-1.5"
          >
            {isSaving ? "Saving..." : "Save & Continue"}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
