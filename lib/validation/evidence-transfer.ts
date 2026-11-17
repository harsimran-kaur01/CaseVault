
import { z } from "zod";

export const createEvidenceTransferSchema = z.object({
  to_person_id: z.number().int().positive(),

  to_location_id: z.number().int().positive().nullable(),

  purpose: z.string().trim().min(1, "Transfer purpose is required."),

  received_condition: z.enum([
    "intact",
    "damaged",
    "degraded",
    "contaminated",
    "unknown",
  ]).optional(),

  notes: z.string().nullable().optional(),
}).strict();
