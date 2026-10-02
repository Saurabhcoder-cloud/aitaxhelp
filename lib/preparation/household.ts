import { TaxFilingStatus, TaxYear } from "@/types/tax";

export const DEPENDENT_RELATIONSHIPS = [
  "child",
  "son",
  "daughter",
  "stepchild",
  "foster_child",
  "sibling",
  "brother",
  "sister",
  "half_brother",
  "half_sister",
  "stepbrother",
  "stepsister",
  "grandchild",
  "parent",
  "grandparent",
  "niece",
  "nephew",
  "other_relative",
] as const;

export type DependentRelationship = (typeof DEPENDENT_RELATIONSHIPS)[number];
export type RelationshipType = DependentRelationship;

export const DEPENDENT_RELATIONSHIP_LABELS: Record<DependentRelationship, string> = {
  child: "Child",
  son: "Son",
  daughter: "Daughter",
  stepchild: "Stepchild",
  foster_child: "Eligible Foster Child",
  sibling: "Sibling",
  brother: "Brother",
  sister: "Sister",
  half_brother: "Half Brother",
  half_sister: "Half Sister",
  stepbrother: "Stepbrother",
  stepsister: "Stepsister",
  grandchild: "Grandchild",
  parent: "Parent",
  grandparent: "Grandparent",
  niece: "Niece",
  nephew: "Nephew",
  other_relative: "Other Eligible Relative",
};
export const RELATIONSHIP_LABELS = DEPENDENT_RELATIONSHIP_LABELS;

export const FILING_STATUS_LABELS: Record<TaxFilingStatus, string> = {
  single: "Single",
  married_filing_jointly: "Married Filing Jointly",
  married_filing_separately: "Married Filing Separately",
  head_of_household: "Head of Household",
  qualifying_surviving_spouse: "Qualifying Surviving Spouse",
};

export const FILING_STATUS_DESCRIPTIONS: Record<TaxFilingStatus, string> = {
  single: "For unmarried individuals or legally separated persons.",
  married_filing_jointly: "For married couples filing a joint tax return together.",
  married_filing_separately: "For married couples choosing to file separate returns.",
  head_of_household: "For unmarried individuals paying more than half the cost of keeping up a home for a qualifying person.",
  qualifying_surviving_spouse: "For widows/widowers with a dependent child for up to 2 years after spouse's death.",
};

export interface Dependent {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  relationship: DependentRelationship;
  monthsLivedWithTaxpayer: number; // 0 to 12
  isFullTimeStudent?: boolean;
  isPermanentlyDisabled?: boolean;
  providedMoreThanHalfOwnSupport?: boolean;
  providedMoreThanHalfSupport?: boolean;
  claimedByOtherTaxpayer?: boolean;
  isQualifyingChild?: boolean;
  ssnLast4?: string; // 4 digits
}

export interface SpouseInfo {
  firstName: string;
  lastName: string;
  dateOfBirth?: string; // YYYY-MM-DD
  ssnLast4?: string;
  hasIncome?: boolean;
  hasW2Income?: boolean;
  w2WagesCents?: number;
  spouseW2WagesCents?: number;
  federalWithholdingCents?: number;
  hasSelfEmploymentIncome?: boolean;
  gross1099IncomeCents?: number;
  spouse1099GrossCents?: number;
  spouseGross1099IncomeCents?: number;
  businessExpensesCents?: number;
  spouseBusinessExpensesCents?: number;
}

export interface HouseholdSnapshot {
  filingStatus: TaxFilingStatus;
  spouse?: SpouseInfo;
  dependents: Dependent[];
  saved?: boolean;
}

export function emptyHouseholdSnapshot(filingStatus: TaxFilingStatus = "single"): HouseholdSnapshot {
  return {
    filingStatus,
    dependents: [],
    saved: false,
  };
}

/**
 * Calculates age as of December 31 of taxYear from YYYY-MM-DD.
 */
export function getDependentAge(dateOfBirth: string, taxYear: TaxYear): number {
  if (!dateOfBirth) return 0;
  const parts = dateOfBirth.split("-");
  if (parts.length < 3) return 0;
  const birthYear = parseInt(parts[0], 10);
  if (isNaN(birthYear)) return 0;
  return Math.max(0, taxYear - birthYear);
}

const QUALIFYING_CHILD_RELS: DependentRelationship[] = [
  "child",
  "son",
  "daughter",
  "stepchild",
  "foster_child",
  "sibling",
  "brother",
  "sister",
  "half_brother",
  "half_sister",
  "stepbrother",
  "stepsister",
  "grandchild",
  "niece",
  "nephew",
];

/**
 * Checks if a dependent qualifies as a Qualifying Child for Child Tax Credit (under 17).
 */
export function isQualifyingChildForCtc(dependent: Dependent, taxYear: TaxYear): boolean {
  if (dependent.claimedByOtherTaxpayer === true) return false;
  if (dependent.providedMoreThanHalfOwnSupport === true) return false;
  if (dependent.monthsLivedWithTaxpayer < 6) return false;

  if (!QUALIFYING_CHILD_RELS.includes(dependent.relationship)) return false;

  const age = getDependentAge(dependent.dateOfBirth, taxYear);
  return age < 17;
}

/**
 * Checks if a dependent qualifies for Credit for Other Dependents ($500).
 */
export function isQualifyingOtherDependent(dependent: Dependent, taxYear: TaxYear): boolean {
  if (dependent.claimedByOtherTaxpayer === true) return false;
  if (dependent.providedMoreThanHalfOwnSupport === true) return false;
  if (isQualifyingChildForCtc(dependent, taxYear)) return false;

  const age = getDependentAge(dependent.dateOfBirth, taxYear);

  if (QUALIFYING_CHILD_RELS.includes(dependent.relationship)) {
    if (dependent.isPermanentlyDisabled) return true;
    if (age <= 18 && dependent.monthsLivedWithTaxpayer >= 6) return true;
    if (dependent.isFullTimeStudent && age < 24 && dependent.monthsLivedWithTaxpayer >= 6) return true;
  }

  // Parent or other relative
  return true;
}

export interface HouseholdSummary {
  filingStatus: TaxFilingStatus;
  filingStatusLabel: string;
  hasSpouse: boolean;
  spouseName?: string;
  totalDependents: number;
  dependentsCount: number;
  qualifyingChildrenCount: number;
  otherDependentsCount: number;
}

export function getHouseholdSummary(
  household: HouseholdSnapshot | undefined,
  taxYear: TaxYear | number = 2026
): HouseholdSummary {
  const filingStatus = household?.filingStatus || "single";
  const isMarried = filingStatus === "married_filing_jointly" || filingStatus === "married_filing_separately";
  const hasSpouse = Boolean(isMarried && household?.spouse?.firstName && household.spouse.firstName.trim().length > 0);
  const spouseName = hasSpouse
    ? `${household!.spouse!.firstName} ${household!.spouse!.lastName}`.trim()
    : undefined;

  const dependents = household?.dependents || [];
  let qualifyingChildrenCount = 0;
  let otherDependentsCount = 0;
  const year = taxYear as TaxYear;

  for (const dep of dependents) {
    if (isQualifyingChildForCtc(dep, year)) {
      qualifyingChildrenCount++;
    } else if (isQualifyingOtherDependent(dep, year)) {
      otherDependentsCount++;
    }
  }

  return {
    filingStatus,
    filingStatusLabel: FILING_STATUS_LABELS[filingStatus] || "Single",
    hasSpouse,
    spouseName,
    totalDependents: dependents.length,
    dependentsCount: dependents.length,
    qualifyingChildrenCount,
    otherDependentsCount,
  };
}
