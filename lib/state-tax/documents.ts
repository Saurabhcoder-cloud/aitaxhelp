/**
 * State Document Architecture — Phase 11
 *
 * Provides document provider abstractions for state tax forms, worksheets, and summaries.
 *
 * ARCHITECTURAL INVARIANT:
 * Never generate documents that falsely claim to be official state tax forms (e.g. Form 540).
 * Instead, generate a clear "State Tax Preparation Summary" labeled:
 * "Preparation Summary — Not an Official State Filing Form"
 */

import { TaxYear } from "@/types/tax";
import { StateTaxSummary } from "./summary";
import { getStateSupportInfo } from "./registry";

export interface StateDocumentItem {
  id: string;
  title: string;
  formNumber: string;
  category?: "MAIN_RETURN" | "SCHEDULE" | "WORKSHEET" | "DISCLOSURE" | "SUMMARY";
  description: string;
  isOfficialForm: boolean;
  status: "ready" | "not_supported" | "not_required";
}

export interface StateDocumentPackage {
  stateCode: string;
  stateName: string;
  taxYear: TaxYear;
  isSupported: boolean;
  documents: StateDocumentItem[];
  summary: StateTaxSummary;
  notice: string;
  generatedAt: string;
}

export interface IStateReturnDocumentProvider {
  readonly stateCode: string;
  getSupportedTaxYears(): TaxYear[];
  getSupportedForms(): string[];
  generateDocumentPackage(summary: StateTaxSummary): StateDocumentPackage;
}

/**
 * State Document Provider that handles all 50 states + DC safely.
 * For supported states (e.g. CA), generates a certified State Tax Preparation Summary.
 * For no-tax states, generates an Exemption Certificate.
 * For unsupported states, generates an Advisory Notice.
 */
export class DefaultStateDocumentProvider implements IStateReturnDocumentProvider {
  constructor(public readonly stateCode: string) {}

  public getSupportedTaxYears(): TaxYear[] {
    return [2025, 2026];
  }

  public getSupportedForms(): string[] {
    const info = getStateSupportInfo(this.stateCode);
    if (info?.supportStatus === "NO_STATE_INCOME_TAX") {
      return ["STATE_EXEMPTION_SUMMARY"];
    }
    if (info?.supportStatus === "SUPPORTED") {
      return ["STATE_PREPARATION_SUMMARY", "STATE_CREDITS_WORKSHEET"];
    }
    return [];
  }

  public generateDocumentPackage(summary: StateTaxSummary): StateDocumentPackage {
    const info = getStateSupportInfo(this.stateCode);
    const stateName = info?.stateName || this.stateCode;
    const now = new Date().toISOString();

    // Case 1: No income tax state
    if (info?.supportStatus === "NO_STATE_INCOME_TAX") {
      return {
        stateCode: this.stateCode,
        stateName,
        taxYear: summary.taxYear,
        isSupported: true,
        documents: [
          {
            id: `doc-${this.stateCode.toLowerCase()}-exemption`,
            title: `${stateName} State Tax Exemption Certificate`,
            formNumber: "EXEMPT-NO-TAX",
            category: "SUMMARY",
            description: `Official documentation that ${stateName} imposes no personal individual income tax on wages for Tax Year ${summary.taxYear}.`,
            isOfficialForm: false,
            status: "not_required",
          },
        ],
        summary,
        notice: `No state income tax return is required for ${stateName}. Keep this summary with your federal tax records.`,
        generatedAt: now,
      };
    }

    // Case 2: Supported state with certified engine (e.g. California)
    if (info?.supportStatus === "SUPPORTED") {
      return {
        stateCode: this.stateCode,
        stateName,
        taxYear: summary.taxYear,
        isSupported: true,
        documents: [
          {
            id: `doc-${this.stateCode.toLowerCase()}-summary`,
            title: `${stateName} State Tax Preparation Summary`,
            formNumber: "STATE-PREP-SUMMARY",
            category: "SUMMARY",
            description: `Preparation Summary — Not an Official State Filing Form. Contains verified deterministic ${stateName} taxable income, exemption credits, and net tax liability.`,
            isOfficialForm: false,
            status: "ready",
          },
          {
            id: `doc-${this.stateCode.toLowerCase()}-credits-worksheet`,
            title: `${stateName} Exemption & Tax Credits Worksheet`,
            formNumber: "STATE-CREDITS-WORKSHEET",
            category: "WORKSHEET",
            description: `Statutory calculation of ${stateName} personal exemption credits, dependent credits, and state refundable credits.`,
            isOfficialForm: false,
            status: "ready",
          },
        ],
        summary,
        notice: `Preparation Summary — Not an Official State Filing Form. TaxAIHelp provides verified deterministic calculation summaries to assist in state tax preparation.`,
        generatedAt: now,
      };
    }

    // Case 3: State has income tax, but official forms are not currently generated
    return {
      stateCode: this.stateCode,
      stateName,
      taxYear: summary.taxYear,
      isSupported: false,
      documents: [
        {
          id: `doc-${this.stateCode.toLowerCase()}-advisory`,
          title: `${stateName} State Filing Advisory Notice`,
          formNumber: "STATE-ADVISORY",
          category: "DISCLOSURE",
          description: `Official ${stateName} state income tax return forms are not provided by TaxAIHelp. Please obtain certified forms from the ${stateName} Department of Revenue.`,
          isOfficialForm: false,
          status: "not_supported",
        },
      ],
      summary,
      notice: `Official ${stateName} state return forms are not available on TaxAIHelp. File your state return directly with the ${stateName} Department of Revenue.`,
      generatedAt: now,
    };
  }
}

export function getStateDocumentProvider(stateCode: string): IStateReturnDocumentProvider {
  return new DefaultStateDocumentProvider(stateCode.toUpperCase().trim());
}
