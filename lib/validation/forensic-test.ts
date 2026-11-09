
import { z } from "zod";

const priorityEnum = z.enum(["low", "medium", "high", "urgent"]);

export const createForensicTestSchema = z.object({
  evidence_id: z.number().int().positive(),
  test_type: z.string().trim().min(1, "Test type is required."),
  priority: priorityEnum.optional().default("medium"),
  notes: z.string().nullable().optional(),
}).strict();

export const updateForensicTestSchema = z.object({
  test_type: z.string().trim().min(1).optional(),
  priority: priorityEnum.optional(),
  notes: z.string().nullable().optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided." }
);
