import { TaxYear } from "@/types/tax";
import { IncomeDiscovery } from "@/lib/preparation/income";

export const DOCUMENT_TYPES = ["w2", "form_1099", "other_income", "deduction_support"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_STATUSES = ["missing", "expected", "received", "reviewed"] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export interface PreparationDocument {
  id: string;
  preparationSessionId: string;
  userId: string;
  documentType: DocumentType;
  displayName: string;
  taxYear: TaxYear;
  sourceName: string;
  status: DocumentStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentsSnapshot {
  documents: PreparationDocument[];
}

export interface DocumentDraft {
  id: string;
  documentType: DocumentType;
  displayName: string;
  taxYear: TaxYear;
  sourceName: string;
  status: DocumentStatus;
  notes: string;
}

export function emptyDocumentsSnapshot(): DocumentsSnapshot {
  return { documents: [] };
}

function stableUuid(seed: string): string {
  let value = 0x811c9dc5;
  const chunks: string[] = [];
  for (let round = 0; round < 4; round += 1) {
    for (let index = 0; index < seed.length; index += 1) {
      value ^= seed.charCodeAt(index) + round;
      value = Math.imul(value, 0x01000193);
    }
    chunks.push((value >>> 0).toString(16).padStart(8, "0"));
  }
  const hex = chunks.join("").padEnd(32, "0").slice(0, 32);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `a${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join("-");
}

/**
 * Suggests document records from income the taxpayer already entered.
 * These are metadata suggestions. They do not mean a file was uploaded.
 */
export function suggestDocumentsFromIncome(income: IncomeDiscovery, taxYear: TaxYear): DocumentDraft[] {
  const drafts: DocumentDraft[] = [];

  for (const entry of income.w2s) {
    drafts.push({
      id: stableUuid(`w2:${entry.id}`),
      documentType: "w2",
      displayName: `W-2 from ${entry.employerName}`,
      taxYear,
      sourceName: entry.employerName,
      status: "expected",
      notes: "",
    });
  }

  for (const entry of income.form1099s) {
    drafts.push({
      id: stableUuid(`1099:${entry.id}`),
      documentType: "form_1099",
      displayName: `1099 from ${entry.payerName}`,
      taxYear,
      sourceName: entry.payerName,
      status: "expected",
      notes: "",
    });
  }

  for (const entry of income.activities) {
    const label = entry.kind === "gig" ? "Gig platform" : "Business";
    drafts.push({
      id: stableUuid(`activity-statement:${entry.id}`),
      documentType: "other_income",
      displayName: `${label} payment statements — ${entry.activityName}`,
      taxYear,
      sourceName: entry.activityName,
      status: "expected",
      notes: "",
    });
    drafts.push({
      id: stableUuid(`activity-expenses:${entry.id}`),
      documentType: "deduction_support",
      displayName: `Expense records — ${entry.activityName}`,
      taxYear,
      sourceName: entry.activityName,
      status: "expected",
      notes: "",
    });
  }

  return drafts;
}

export function stampDocuments(
  drafts: DocumentDraft[],
  sessionId: string,
  userId: string,
  existing: PreparationDocument[],
  now: string
): PreparationDocument[] {
  const previous = new Map(existing.map((document) => [document.id, document]));
  return drafts.map((draft) => ({
    ...draft,
    preparationSessionId: sessionId,
    userId,
    createdAt: previous.get(draft.id)?.createdAt ?? now,
    updatedAt: now,
  }));
}
