import { z } from "zod";

const caseCrimeFields = {
  case_id: z.number().int().positive(),
  crime_id: z.number().int().positive(),
};

export const createCaseCrimeSchema = z.object({
  ...caseCrimeFields,
}).strict();

export const updateCaseCrimeSchema = z.object({
  crime_id: caseCrimeFields.crime_id.optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "At least one field must be provided.",
  }
);