/**
 * State Document Architecture — Phase 7
 *
 * Provides document provider abstractions for future state tax forms and reports.
 *
 * ARCHITECTURAL INVARIANT:
 * Never generate fake official state tax forms (e.g. Form 540, Form IT-201).
 * Never claim state documents are ready for official submission unless genuine,
 * verified state statutory PDF generators are active.
 */

import { TaxYear } from "@/types/tax";
import { StateTaxSummary } from "./summary";
import { getStateSupportInfo } from "./registry";

export interface StateDocumentItem {
  id: string;
  title: string;
  formNumber: string;
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
 * Baseline State Document Provider that handles all 50 states + DC safely.
 * Discloses genuine form support and provides state revenue department references.
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
    return [];
  }

  public generateDocumentPackage(summary: StateTaxSummary): StateDocumentPackage {
    const info = getStateSupportInfo(this.stateCode);
    const stateName = info?.stateName || this.stateCode;
    const now = new Date().toISOString();

    if (info?.supportStatus === "NO_STATE_INCOME_TAX") {
      return {
        stateCode: this.stateCode,
        stateName,
        taxYear: summary.taxYear,
        isSupported: true,
        documents: [
          {
            id: `doc-${this.stateCode}-exemption`,
            title: `${stateName} State Tax Exemption Certificate`,
            formNumber: "EXEMPT-NO-TAX",
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

    // State has income tax, but official forms are not currently generated
    return {
      stateCode: this.stateCode,
      stateName,
      taxYear: summary.taxYear,
      isSupported: false,
      documents: [
        {
          id: `doc-${this.stateCode}-summary`,
          title: `${stateName} State Filing Advisory Notice`,
          formNumber: "STATE-ADVISORY",
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
