import { z } from "zod";

const casePersonFields = {
  case_id: z.number().int().positive(),
  person_id: z.number().int().positive(),
  role_in_case: z.enum([
    "victim",
    "suspect",
    "witness",
    "complainant",
    "informant",
  ]),
  date_associated: z.string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "Date must be in YYYY-MM-DD format"
    )
    .optional(),
  notes: z.string().nullable().optional(),
};

export const createCasePersonSchema = z.object({
  ...casePersonFields,
}).strict();

export const updateCasePersonSchema = z.object({
  role_in_case: casePersonFields.role_in_case.optional(),
  date_associated: casePersonFields.date_associated,
  notes: casePersonFields.notes,
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "At least one field must be provided.",
  }
);