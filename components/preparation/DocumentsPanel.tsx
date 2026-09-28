"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { TaxPreparationSession } from "@/lib/services/tax-preparation-session-store";
import {
  DocumentDraft,
  DocumentStatus,
  DocumentType,
  suggestDocumentsFromIncome,
} from "@/lib/preparation/documents";
import { savePreparationDocuments, updatePreparationProgress } from "@/lib/utils/preparation-session-api";

const STATUS_LABELS: Record<DocumentStatus, string> = {
  expected: "Expected",
  missing: "I don't have this",
  received: "I have this",
  reviewed: "Reviewed",
};

function initialDrafts(session: TaxPreparationSession): DocumentDraft[] {
  if (session.documentsSnapshot.documents.length > 0) {
    return session.documentsSnapshot.documents.map((document) => ({
      id: document.id,
      documentType: document.documentType,
      displayName: document.displayName,
      taxYear: document.taxYear,
      sourceName: document.sourceName,
      status: document.status,
      notes: document.notes,
    }));
  }
  return suggestDocumentsFromIncome(session.incomeSnapshot, session.taxYear);
}

export function DocumentsPanel({
  session,
  onSessionChange,
}: {
  session: TaxPreparationSession;
  onSessionChange: (session: TaxPreparationSession) => void;
}) {
  const [documents, setDocuments] = useState<DocumentDraft[]>(() => initialDrafts(session));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function updateDocument(id: string, patch: Partial<DocumentDraft>) {
    setDocuments((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function persist() {
    setIsSaving(true);
    setError(null);
    const result = await savePreparationDocuments({ documents });
    setIsSaving(false);
    if (!result.success || !result.data) {
      setError(result.error || "Unable to save documents.");
      return null;
    }
    onSessionChange(result.data);
    return result.data;
  }

  async function handleContinue() {
    const saved = await persist();
    if (!saved) return;
    setIsSaving(true);
    const result = await updatePreparationProgress("documents");
    setIsSaving(false);
    if (!result.success || !result.data) {
      setError(result.error || "Unable to continue.");
      return;
    }
    onSessionChange(result.data);
  }

  return (
    <section className="space-y-4" aria-labelledby="documents-heading">
      <div className="space-y-1">
        <h2 id="documents-heading" className="text-base font-semibold text-surface-900">
          Let&apos;s gather your tax documents.
        </h2>
        <p className="text-sm text-surface-700">
          Based on what you told us, you may need these documents. This step records what you have.
          Files are not uploaded.
        </p>
      </div>

      <ul className="space-y-3">
        {documents.map((document) => (
          <li key={document.id} className="rounded-lg border border-surface-200 p-3 space-y-3">
            <FormField label="Document" id={`${document.id}-name`}>
              <Input
                id={`${document.id}-name`}
                value={document.displayName}
                onChange={(event) => updateDocument(document.id, { displayName: event.target.value })}
              />
            </FormField>
            <p className="text-xs text-surface-600">
              {document.sourceName ? `Source: ${document.sourceName}` : "No source named"} · metadata only
            </p>
            <div className="flex flex-wrap gap-2">
              {(["received", "missing", "expected"] as DocumentStatus[]).map((status) => (
                <Button
                  key={status}
                  type="button"
                  variant={document.status === status ? "primary" : "outline"}
                  onClick={() => updateDocument(document.id, { status })}
                >
                  {STATUS_LABELS[status]}
                </Button>
              ))}
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDocuments((items) => items.filter((item) => item.id !== document.id))}
              >
                Remove
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <Button
        type="button"
        variant="outline"
        onClick={() =>
          setDocuments((items) => [
            ...items,
            {
              id: crypto.randomUUID(),
              documentType: "other_income" as DocumentType,
              displayName: "",
              taxYear: session.taxYear,
              sourceName: "",
              status: "expected",
              notes: "",
            },
          ])
        }
      >
        Add another document
      </Button>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="button" onClick={() => void handleContinue()} disabled={isSaving}>
        {isSaving ? "Saving..." : "Continue"}
      </Button>
    </section>
  );
}
