import { z } from "zod";
import { SERVICE_IDS } from "@/types/operations";

export const createIncidentSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(120),
  severity: z.enum(["SEV1", "SEV2", "SEV3", "SEV4"]),
  service: z.enum(SERVICE_IDS),
  summary: z.string().min(10, "Summary must be at least 10 characters").max(2000),
  assignedTo: z.string().optional(),
  customerImpact: z.string().optional(),
  internalNotes: z.string().optional(),
});

export const updateIncidentSchema = z.object({
  title: z.string().min(3).max(120).optional(),
  severity: z.enum(["SEV1", "SEV2", "SEV3", "SEV4"]).optional(),
  status: z
    .enum([
      "DETECTED",
      "INVESTIGATING",
      "IDENTIFIED",
      "MITIGATING",
      "MONITORING",
      "RESOLVED",
      "CLOSED",
    ])
    .optional(),
  service: z.enum(SERVICE_IDS).optional(),
  summary: z.string().min(10).max(2000).optional(),
  assignedTo: z.string().optional(),
  rootCause: z.string().max(2000).optional(),
  resolutionSummary: z.string().max(2000).optional(),
  customerImpact: z.string().max(2000).optional(),
  internalNotes: z.string().max(4000).optional(),
});

export const addIncidentEventSchema = z.object({
  eventType: z.string().min(2, "Event type is required"),
  note: z.string().min(3, "Note must be at least 3 characters").max(2000),
});
