import { IncomeDiscovery } from "@/lib/preparation/income";

export const DEDUCTION_CATEGORIES = [
  "equipment_supplies",
  "software_subscriptions",
  "home_office_vehicle",
  "other_expenses",
] as const;

export type DeductionCategory = (typeof DEDUCTION_CATEGORIES)[number];

export const DEDUCTION_CATEGORY_LABELS: Record<DeductionCategory, string> = {
  equipment_supplies: "Equipment and supplies",
  software_subscriptions: "Software subscriptions",
  home_office_vehicle: "Home office and vehicle",
  other_expenses: "Other work expenses",
};

export interface DeductionEntry {
  id: string;
  category: DeductionCategory;
  amountCents: number;
  description: string;
  relatedIncomeId: string | null;
  confirmed: boolean;
}

export interface DeductionDiscovery {
  saved: boolean;
  hasBusinessExpenses: boolean | null;
  standardDeductionAcknowledged: boolean;
  entries: DeductionEntry[];
}

export function emptyDeductionDiscovery(): DeductionDiscovery {
  return {
    saved: false,
    hasBusinessExpenses: null,
    standardDeductionAcknowledged: false,
    entries: [],
  };
}

export function incomeSupportsBusinessExpenses(income: IncomeDiscovery): boolean {
  return income.situations.some((situation) => situation !== "employer");
}

export function deductionExpenseCents(discovery: DeductionDiscovery): number {
  return discovery.entries
    .filter((entry) => entry.confirmed)
    .reduce((sum, entry) => sum + entry.amountCents, 0);
}

/**
 * Seeds deduction rows from expense amounts already saved on gig or business activities.
 * This copies cents. It does not calculate tax.
 */
export function prefillDeductionsFromIncome(income: IncomeDiscovery): DeductionEntry[] {
  const entries: DeductionEntry[] = [];
  for (const activity of income.activities) {
    const pairs: [DeductionCategory, number][] = [
      ["equipment_supplies", activity.equipmentSuppliesCents],
      ["software_subscriptions", activity.softwareSubscriptionsCents],
      ["home_office_vehicle", activity.homeOfficeVehicleCents],
      ["other_expenses", activity.otherExpensesCents],
    ];
    for (const [category, amountCents] of pairs) {
      if (amountCents <= 0) continue;
      entries.push({
        id: crypto.randomUUID(),
        category,
        amountCents,
        description: activity.activityName,
        relatedIncomeId: activity.id,
        confirmed: true,
      });
    }
  }
  return entries;
}
