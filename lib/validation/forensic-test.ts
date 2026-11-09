
import { z } from "zod";

const priorityEnum = z.enum(["low", "medium", "high", "urgent"]);
const statusEnum = z.enum(["requested", "in_progress", "completed", "cancelled"]);

export const createForensicTestSchema = z.object({
  evidence_id: z.number().int().positive(),
  test_type: z.string().trim().min(1),
  requested_by: z.number().int().positive(),
  priority: priorityEnum.optional().default("medium"),
  status: statusEnum.optional().default("requested"),
  notes: z.string().nullable().optional(),
}).strict();

export const updateForensicTestSchema = z.object({
  test_type: z.string().trim().min(1).optional(),
  priority: priorityEnum.optional(),
  status: statusEnum.optional(),
  notes: z.string().nullable().optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided." }
);
