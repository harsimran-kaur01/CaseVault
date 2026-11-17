
import { z } from "zod";

const findingSchema = z.object({
  description: z.string().trim().min(1, "Finding description is required."),
  significance: z.string().trim().min(1, "Finding significance is required."),
});

export const createForensicReportSchema = z.object({
  test_id: z.number().int().positive(),
  conclusion: z.string().trim().min(1, "Conclusion is required."),
  summary: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),

  report_type: z.enum([
    "DNA",
    "FINGERPRINT",
    "DIGITAL",
    "CHEMICAL",
    "TOOLMARK",
    "BALLISTICS",
  ]),

  confidence: z.number().min(0).max(1),
  details: z.record(z.string(), z.unknown()),
  findings: z.array(findingSchema),
}).strict();
