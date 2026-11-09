
import { z } from "zod";

export const createEvidenceMetadataSchema = z.object({
  attributes: z.record(z.string(), z.unknown()),
  tags: z.array(
    z.string().trim().min(1, "Tags cannot be empty.")
  ),
}).strict();
