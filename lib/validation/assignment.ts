    import { z } from "zod";

const assignmentFields = {
  case_id: z.number().int().positive(),
  investigator_id: z.number().int().positive(),
  date_assigned: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),
  role: z.enum(["lead", "support", "supervisor"]).optional(),
  status: z.enum(["active", "completed", "removed"]).optional(),
};

export const createAssignmentSchema = z.object({
  case_id: assignmentFields.case_id,
  investigator_id: assignmentFields.investigator_id,
  date_assigned: assignmentFields.date_assigned,
  role: assignmentFields.role,
  status: assignmentFields.status,
}).strict();

export const updateAssignmentSchema = z.object({
  case_id: assignmentFields.case_id.optional(),
  investigator_id: assignmentFields.investigator_id.optional(),
  date_assigned: assignmentFields.date_assigned,
  role: assignmentFields.role,
  status: assignmentFields.status,
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided." }
);