
import { z } from "zod";

const personFields = {
  first_name: z.string().trim().min(1).max(50),
  middle_name: z.string().max(50).nullable().optional(),
  last_name: z.string().trim().min(1).max(50),
  

  location_id: z.number().int().positive().nullable().optional(),

  date_of_birth: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => {
      const date = new Date(`${value}T00:00:00Z`);
      return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value &&
        value > "1900-01-01"
      );
    }, "Date of birth must be after 1900-01-01")
    .nullable()
    .optional(),

  gender: z.enum(["male", "female", "other"])
    .nullable()
    .optional(),

  email: z.string()
    .email()
    .max(120)
    .nullable()
    .optional(),

  phone_no: z.string()
    .regex(/^\+?[0-9]{10,13}$/)
    .nullable()
    .optional(),
};

export const createPersonSchema = z.object(personFields).strict();

export const updatePersonSchema = z
  .object(personFields)
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided.",
  });
