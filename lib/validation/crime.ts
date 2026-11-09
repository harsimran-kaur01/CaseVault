import { z } from "zod";

const crimeFields = {
  crime_type: z.string().trim().min(1).max(60),
  description: z.string().nullable().optional(),
};

export const createCrimeSchema = z.object({
  ...crimeFields,
}).strict();

export const updateCrimeSchema = z.object({
  crime_type: crimeFields.crime_type.optional(),
  description: crimeFields.description,
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "At least one field must be provided.",
  }
);