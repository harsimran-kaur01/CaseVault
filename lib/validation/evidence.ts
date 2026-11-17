
import { z } from "zod";

export const createEvidenceSchema = z.object({
  case_id: z.number().int().positive(),

  crime_scene_id: z.number().int().positive().nullable().optional(),

  evidence_code: z
    .string()
    .regex(
      /^EV-[0-9]{4}-[0-9]{3,6}$/,
      "Evidence code must follow EV-YYYY-NNN format."
    ),

  description: z.string().trim().min(1, "Description is required."),

  evidence_type: z.enum([
    "physical",
    "biological",
    "digital",
    "documentary",
    "weapon",
    "trace",
    "other",
  ]),

  condition_status: z.enum([
    "intact",
    "damaged",
    "degraded",
    "contaminated",
    "unknown",
  ]).optional(),

  date_collected: z.string().datetime({
    offset: true,
    message: "Provide a valid date and time with timezone.",
  }),

  // Optional: required for admin registration.
  // Investigators are identified from their authenticated account.
  collected_by: z.number().int().positive().optional(),

  location_found_id: z.number().int().positive().nullable().optional(),

  sealed: z.boolean().optional(),

  notes: z.string().nullable().optional(),
}).strict();
