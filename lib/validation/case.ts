import { z } from "zod";

export const createCaseSchema = z.object({
  case_number: z
    .string()
    .regex(/^CS-\d{4}-\d{4}$/, "Invalid case number format"),

  title: z
    .string()
    .trim()
    .min(1, "Case title is required")
    .max(150, "Title cannot exceed 150 characters"),

  description: z
    .string()
    .nullable()
    .optional(),

  status_id: z
    .number()
    .int()
    .positive(),

  location_id: z
    .number()
    .int()
    .positive()
    .nullable()
    .optional(),
});


export const updateCaseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Case title cannot be empty")
    .max(150, "Title cannot exceed 150 characters")
    .optional(),

  description: z
    .string()
    .nullable()
    .optional(),

  status_id: z
    .number()
    .int()
    .positive()
    .optional(),

  location_id: z
    .number()
    .int()
    .positive()
    .nullable()
    .optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided." }
);
