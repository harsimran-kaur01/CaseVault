import { z } from "zod";

export const createLocationSchema = z.object({
  address: z.string().trim().min(1, "Address is required.").max(255, "Address cannot exceed 255 characters."),
  city: z.string().trim().min(1, "City is required.").max(80, "City cannot exceed 80 characters."),
  state: z.string().trim().min(1, "State is required.").max(80, "State cannot exceed 80 characters."),
  pincode: z.string().trim().regex(/^\d{6}$/, "Pincode must be exactly 6 digits."),
}).strict();

export const updateLocationSchema = z.object({
  address: z.string().trim().min(1, "Address cannot be empty.").max(255, "Address cannot exceed 255 characters.").optional(),
  city: z.string().trim().min(1, "City cannot be empty.").max(80, "City cannot exceed 80 characters.").optional(),
  state: z.string().trim().min(1, "State cannot be empty.").max(80, "State cannot exceed 80 characters.").optional(),
  pincode: z.string().trim().regex(/^\d{6}$/, "Pincode must be exactly 6 digits.").optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided." }
);
