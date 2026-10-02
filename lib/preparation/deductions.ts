import { IncomeDiscovery } from "@/lib/preparation/income";

export const BUSINESS_DEDUCTION_CATEGORIES = [
  "equipment_supplies",
  "software_subscriptions",
  "home_office_vehicle",
  "other_expenses",
  "business_mileage",
  "advertising_marketing",
  "professional_services",
  "business_insurance",
  "phone_internet",
] as const;

export const ITEMIZED_DISCOVERY_CATEGORIES = [
  "mortgage_interest",
  "property_taxes",
  "charitable_cash",
  "charitable_non_cash",
  "medical_dental",
  "state_local_taxes",
] as const;

export const FUTURE_EXTENSION_CATEGORIES = [
  "education_expenses",
  "childcare_expenses",
  "retirement_hsa",
] as const;

export const DEDUCTION_CATEGORIES = [
  ...BUSINESS_DEDUCTION_CATEGORIES,
  ...ITEMIZED_DISCOVERY_CATEGORIES,
  ...FUTURE_EXTENSION_CATEGORIES,
] as const;

export type BusinessDeductionCategory = (typeof BUSINESS_DEDUCTION_CATEGORIES)[number];
export type ItemizedDiscoveryCategory = (typeof ITEMIZED_DISCOVERY_CATEGORIES)[number];
export type FutureExtensionCategory = (typeof FUTURE_EXTENSION_CATEGORIES)[number];
export type DeductionCategory = (typeof DEDUCTION_CATEGORIES)[number];

export const DEDUCTION_CATEGORY_LABELS: Record<DeductionCategory, string> = {
  // Business categories
  equipment_supplies: "Equipment and supplies",
  software_subscriptions: "Software subscriptions",
  home_office_vehicle: "Home office and vehicle",
  other_expenses: "Other work expenses",
  business_mileage: "Business mileage / vehicle use",
  advertising_marketing: "Advertising and marketing",
  professional_services: "Legal and professional services",
  business_insurance: "Business insurance",
  phone_internet: "Phone and internet (business use)",
  // Itemized categories (Schedule A Discovery)
  mortgage_interest: "Home mortgage interest (Form 1098)",
  property_taxes: "Real estate and property taxes",
  charitable_cash: "Charitable donations (cash / check)",
  charitable_non_cash: "Charitable donations (goods / property)",
  medical_dental: "Medical and dental expenses",
  state_local_taxes: "State and local income / sales taxes",
  // Above-the-line / Future extension categories
  education_expenses: "Education / Student loan interest",
  childcare_expenses: "Child and dependent care costs",
  retirement_hsa: "Traditional IRA and HSA contributions",
};

export function isBusinessDeductionCategory(category: DeductionCategory): boolean {
  return (BUSINESS_DEDUCTION_CATEGORIES as readonly string[]).includes(category);
}

export function isItemizedDeductionCategory(category: DeductionCategory): boolean {
  return (ITEMIZED_DISCOVERY_CATEGORIES as readonly string[]).includes(category);
}

export function isFutureExtensionCategory(category: DeductionCategory): boolean {
  return (FUTURE_EXTENSION_CATEGORIES as readonly string[]).includes(category);
}

export interface DeductionEntry {
  id: string;
  category: DeductionCategory;
  amountCents: number;
  description: string;
  relatedIncomeId: string | null;
  confirmed: boolean;
  businessUsePercent?: number; // 1-100, default 100
  subtype?: string;
  notes?: string;
  taxYear?: number;
  status?: "applied_business" | "standard_deduction_used" | "applied_itemized" | "applied_above_the_line" | "unsupported_schedule_a" | "future_extension";
}

export interface GuidedDeductionAnswers {
  home?: {
    ownedHome?: boolean | null;
    mortgageInterestCents?: number;
    propertyTaxesCents?: number;
  };
  charity?: {
    madeDonations?: boolean | null;
    cashCents?: number;
    nonCashCents?: number;
  };
  medical?: {
    hadSignificantMedical?: boolean | null;
    medicalExpensesCents?: number;
  };
  stateLocal?: {
    paidStateLocalTaxes?: boolean | null;
    stateLocalTaxCents?: number;
  };
  education?: {
    paidEducation?: boolean | null;
    studentLoanInterestCents?: number;
    tuitionCents?: number;
  };
  childcare?: {
    paidChildcare?: boolean | null;
    childcareCents?: number;
  };
  retirementHsa?: {
    contributedRetirementHsa?: boolean | null;
    traditionalIraCents?: number;
    hsaCents?: number;
  };
  business?: {
    hadBusinessExpenses?: boolean | null;
    milesDriven?: number;
    homeOfficeSqFt?: number;
  };
}

export interface DeductionDiscovery {
  saved: boolean;
  hasBusinessExpenses: boolean | null;
  standardDeductionAcknowledged: boolean;
  entries: DeductionEntry[];
  guidedAnswers?: GuidedDeductionAnswers;
}

export function emptyDeductionDiscovery(): DeductionDiscovery {
  return {
    saved: false,
    hasBusinessExpenses: null,
    standardDeductionAcknowledged: false,
    entries: [],
    guidedAnswers: {},
  };
}

export function incomeSupportsBusinessExpenses(income: IncomeDiscovery): boolean {
  return income.situations.some((situation) => situation !== "employer");
}

/**
 * Calculates the effective deductible amount for an entry based on its business use percentage.
 * Strictly integer cents.
 */
export function calculateEntryEffectiveAmountCents(entry: DeductionEntry): number {
  if (entry.amountCents <= 0) return 0;
  const pct = entry.businessUsePercent ?? 100;
  if (pct >= 100) return entry.amountCents;
  if (pct <= 0) return 0;
  return Math.round((entry.amountCents * pct) / 100);
}

/**
 * Sums all confirmed business expense entries, applying any business-use percentage.
 * Only applies to business categories that offset self-employment/1099 profit.
 */
export function deductionExpenseCents(discovery: DeductionDiscovery): number {
  return discovery.entries
    .filter((entry) => entry.confirmed && isBusinessDeductionCategory(entry.category))
    .reduce((sum, entry) => sum + calculateEntryEffectiveAmountCents(entry), 0);
}

/**
 * Sums all confirmed itemized discovery entries (e.g. mortgage, charity, medical).
 */
export function itemizedDeductionTotalCents(discovery: DeductionDiscovery): number {
  return discovery.entries
    .filter((entry) => entry.confirmed && isItemizedDeductionCategory(entry.category))
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
        businessUsePercent: 100,
      });
    }
  }
  return entries;
}
