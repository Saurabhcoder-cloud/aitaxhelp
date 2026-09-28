import { z } from "zod";
import { DOCUMENT_STATUSES, DOCUMENT_TYPES } from "@/lib/preparation/documents";

const documentDraftSchema = z
  .object({
    id: z.string().uuid("Each document needs a valid id."),
    documentType: z.enum(DOCUMENT_TYPES),
    displayName: z.string().trim().min(1, "Enter a document name.").max(160),
    taxYear: z.union([z.literal(2023), z.literal(2024), z.literal(2025), z.literal(2026)]),
    sourceName: z.string().trim().max(120).default(""),
    status: z.enum(DOCUMENT_STATUSES),
    notes: z.string().trim().max(500).default(""),
  })
  .strict();

export const documentsInputSchema = z
  .object({
    documents: z.array(documentDraftSchema).max(40),
  })
  .strict()
  .superRefine((value, ctx) => {
    const seen = new Set<string>();
    value.documents.forEach((document, index) => {
      if (seen.has(document.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["documents", index, "id"],
          message: "Duplicate document.",
        });
      }
      seen.add(document.id);
    });
  });

export type DocumentsInput = z.infer<typeof documentsInputSchema>;
