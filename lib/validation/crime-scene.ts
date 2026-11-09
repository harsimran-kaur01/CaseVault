import { z } from "zod";

export const createCrimeSceneSchema = z.object({
  case_id: z.number().int().positive(),
  location_id: z.number().int().positive(),
  scene_name: z.string().trim().min(1, "Scene name is required.").max(100, "Scene name cannot exceed 100 characters."),
  description: z.string().nullable().optional(),
  date_visited: z.string().datetime({
    offset: true,
    message: "date_visited must be an ISO 8601 timestamp with timezone offset.",
  }),
  visited_by: z.number().int().positive(),
  notes: z.string().nullable().optional(),
}).strict();

export const updateCrimeSceneSchema = z.object({
  scene_name: z.string().trim().min(1, "Scene name cannot be empty.").max(100, "Scene name cannot exceed 100 characters.").optional(),
  description: z.string().nullable().optional(),
  date_visited: z.string().datetime({
    offset: true,
    message: "date_visited must be an ISO 8601 timestamp with timezone offset.",
  }).optional(),
  visited_by: z.number().int().positive().optional(),
  notes: z.string().nullable().optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided." }
);
