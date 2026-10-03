/**
 * State Support Registry — Phase 11
 *
 * Deterministically catalogs all 50 US States + District of Columbia.
 * Identifies states with no individual personal income tax, supported engines,
 * active tax years, statutory filing requirements, and support tiers.
 *
 * ARCHITECTURAL INVARIANT:
 * For unsupported states, deterministically returns NOT_SUPPORTED.
 * Never silently substitutes another state's rules or invents fake calculations.
 */

import { TaxYear } from "@/types/tax";
import { IStateTaxEngine, NoIncomeTaxStateEngine, UnsupportedStateEngine, CaliforniaTaxEngine } from "./engine";
import { StateSupportTier } from "./types";

export type StateSupportStatus =
  | "SUPPORTED"
  | "NO_STATE_INCOME_TAX"
  | "NOT_SUPPORTED";

export interface StateSupportDetails {
  filingStatusSupport: boolean;
  residentSupport: boolean;
  nonresidentSupport: boolean;
  partYearSupport: boolean;
  multiStateSupport: boolean;
  stateReturnDocumentSupport: boolean;
  efileReadiness: "READY" | "IN_DEVELOPMENT" | "OFFLINE";
}

export interface StateSupportInfo {
  stateCode: string;
  stateName: string;
  hasIndividualIncomeTax: boolean;
  supportStatus: StateSupportStatus;
  supportTier?: StateSupportTier;
  supportedYears: TaxYear[];
  activeEngineVersion: string | null;
  filingRequirementSummary: string;
  supportDetails?: StateSupportDetails;
}

// 9 States with no broad individual wage income tax
const NO_INCOME_TAX_STATES: Record<string, string> = {
  AK: "Alaska",
  FL: "Florida",
  NV: "Nevada",
  NH: "New Hampshire", // No tax on earned wage income
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  WA: "Washington",
  WY: "Wyoming",
};

// All other 41 states + DC have individual income taxes
const INCOME_TAX_STATES: Record<string, string> = {
  AL: "Alabama",
  AR: "Arkansas",
  AZ: "Arizona",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DC: "District of Columbia",
  DE: "Delaware",
  GA: "Georgia",
  HI: "Hawaii",
  IA: "Iowa",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  MA: "Massachusetts",
  MD: "Maryland",
  ME: "Maine",
  MI: "Michigan",
  MN: "Minnesota",
  MO: "Missouri",
  MS: "Mississippi",
  MT: "Montana",
  NC: "North Carolina",
  ND: "North Dakota",
  NE: "Nebraska",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  UT: "Utah",
  VA: "Virginia",
  VT: "Vermont",
  WI: "Wisconsin",
  WV: "West Virginia",
};

// Dynamic engine registry
const registeredEngines = new Map<string, IStateTaxEngine>();

function initDefaultEngines() {
  registeredEngines.clear();
  for (const [code, name] of Object.entries(NO_INCOME_TAX_STATES)) {
    registeredEngines.set(code, new NoIncomeTaxStateEngine(code, name));
  }
  // Initialize verified California statutory engine
  registeredEngines.set("CA", new CaliforniaTaxEngine());
}

initDefaultEngines();

/**
 * Resets the engine registry to default baseline (useful for test isolation).
 */
export function resetDefaultEnginesForTesting(): void {
  initDefaultEngines();
}

/**
 * Registers an active certified state tax engine.
 * Allows adding certified state engines without modifying federal logic.
 */
export function registerStateEngine(engine: IStateTaxEngine): void {
  registeredEngines.set(engine.getSupportedStateCode().toUpperCase(), engine);
}

/**
 * Resolves the deterministic engine for a given state code.
 */
export function getStateEngine(stateCode: string): IStateTaxEngine {
  const normalized = (stateCode || "").toUpperCase().trim();
  if (registeredEngines.has(normalized)) {
    return registeredEngines.get(normalized)!;
  }
  const stateName = INCOME_TAX_STATES[normalized] || NO_INCOME_TAX_STATES[normalized] || normalized;
  return new UnsupportedStateEngine(normalized, stateName);
}

/**
 * Returns complete statutory support details for a state.
 */
export function getStateSupportInfo(stateCode: string): StateSupportInfo | null {
  const code = (stateCode || "").toUpperCase().trim();
  const engine = registeredEngines.get(code);
  const isNoTax = code in NO_INCOME_TAX_STATES;
  const isTaxState =
    code in INCOME_TAX_STATES ||
    (engine !== undefined && !(engine instanceof UnsupportedStateEngine));

  if (!isNoTax && !isTaxState) {
    return null;
  }

  const stateName =
    NO_INCOME_TAX_STATES[code] ||
    INCOME_TAX_STATES[code] ||
    engine?.stateName ||
    code;

  if (isNoTax) {
    return {
      stateCode: code,
      stateName,
      hasIndividualIncomeTax: false,
      supportStatus: "NO_STATE_INCOME_TAX",
      supportTier: "NO_INCOME_TAX",
      supportedYears: [2025, 2026],
      activeEngineVersion: engine?.engineVersion || "1.0.0-statutory-no-tax",
      filingRequirementSummary: `${stateName} does not levy personal income taxes on wage earnings. No state income tax return is required.`,
      supportDetails: {
        filingStatusSupport: true,
        residentSupport: true,
        nonresidentSupport: true,
        partYearSupport: true,
        multiStateSupport: true,
        stateReturnDocumentSupport: true,
        efileReadiness: "READY",
      },
    };
  }

  // State has income tax and active engine is registered
  if (engine && !(engine instanceof UnsupportedStateEngine)) {
    return {
      stateCode: code,
      stateName,
      hasIndividualIncomeTax: true,
      supportStatus: "SUPPORTED",
      supportTier: "SUPPORTED",
      supportedYears: engine.getSupportedTaxYears(),
      activeEngineVersion: engine.engineVersion,
      filingRequirementSummary: `Certified ${stateName} statutory income tax engine is available.`,
      supportDetails: {
        filingStatusSupport: true,
        residentSupport: true,
        nonresidentSupport: true,
        partYearSupport: true,
        multiStateSupport: true,
        stateReturnDocumentSupport: true,
        efileReadiness: "READY",
      },
    };
  }

  return {
    stateCode: code,
    stateName,
    hasIndividualIncomeTax: true,
    supportStatus: "NOT_SUPPORTED",
    supportTier: "NOT_SUPPORTED",
    supportedYears: [],
    activeEngineVersion: null,
    filingRequirementSummary: `${stateName} imposes individual income tax, but a certified statutory calculation engine is not currently implemented.`,
    supportDetails: {
      filingStatusSupport: false,
      residentSupport: false,
      nonresidentSupport: false,
      partYearSupport: false,
      multiStateSupport: false,
      stateReturnDocumentSupport: false,
      efileReadiness: "OFFLINE",
    },
  };
}

/**
 * Deterministically checks if a state engine is supported for calculation.
 */
export function isStateSupported(stateCode: string, taxYear?: TaxYear): boolean {
  const info = getStateSupportInfo(stateCode);
  if (!info) return false;
  if (info.supportStatus === "NOT_SUPPORTED") return false;
  if (taxYear && !info.supportedYears.includes(taxYear)) return false;
  return true;
}

/**
 * Deterministically checks if a state levies personal income tax.
 */
export function stateHasIndividualIncomeTax(stateCode: string): boolean {
  const code = (stateCode || "").toUpperCase().trim();
  return code in INCOME_TAX_STATES;
}

/**
 * Assesses whether a state tax return is required based on state statutes and taxpayer data.
 */
export function isStateReturnRequired(
  stateCode: string,
  data?: { grossIncomeCents?: number; stateWithholdingCents?: number }
): { required: boolean; reason: string } {
  const code = (stateCode || "").toUpperCase().trim();
  const info = getStateSupportInfo(code);

  if (!info) {
    return {
      required: false,
      reason: `Unknown state code '${stateCode}'.`,
    };
  }

  if (!info.hasIndividualIncomeTax) {
    const hasErrantWithholding = (data?.stateWithholdingCents || 0) > 0;
    if (hasErrantWithholding) {
      return {
        required: false,
        reason: `${info.stateName} has no personal income tax. However, state withholding was recorded, which may warrant contacting your employer or payroll provider for correction.`,
      };
    }
    return {
      required: false,
      reason: `${info.stateName} does not levy individual income tax. No state tax return is required.`,
    };
  }

  const hasIncome = (data?.grossIncomeCents || 0) > 0;
  const hasWithholding = (data?.stateWithholdingCents || 0) > 0;

  if (hasIncome || hasWithholding) {
    return {
      required: true,
      reason: `${info.stateName} imposes personal income taxes on residents with reported income.`,
    };
  }

  return {
    required: false,
    reason: `No income or withholding recorded for ${info.stateName}.`,
  };
}

/**
 * Returns support info for all 50 states + DC.
 */
export function getAllStates(): StateSupportInfo[] {
  const allCodes = [...Object.keys(NO_INCOME_TAX_STATES), ...Object.keys(INCOME_TAX_STATES)].sort();
  return allCodes.map((code) => getStateSupportInfo(code)!);
}
