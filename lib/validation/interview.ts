import { z } from "zod";

// ---------------------------------------------------------------------------
// Transcript sub-schemas
// ---------------------------------------------------------------------------
const transcriptLineSchema = z.object({
  speaker: z.enum(["Investigator", "Interviewee"]),
  offset_sec: z.number().nonnegative("offset_sec must be non-negative."),
  text: z.string().trim().min(1, "Transcript text is required."),
});

const attachmentSchema = z.object({
  type: z.string().trim().min(1, "Attachment type is required."),
  path: z.string().trim().min(1, "Attachment path is required."),
});

const transcriptSchema = z.object({
  language: z.string().trim().min(1, "Language is required."),
  transcript: z.array(transcriptLineSchema),
  summary: z.string(),
  keywords: z.array(z.string().trim().min(1, "Keyword must not be empty.")),
  sentiment: z.string().trim().min(1, "Sentiment is required."),
  attachments: z.array(attachmentSchema),
}).strict();

// ---------------------------------------------------------------------------
// Create schema
// ---------------------------------------------------------------------------
export const createInterviewSchema = z.object({
  case_id: z.number().int().positive(),
  person_id: z.number().int().positive(),
  interview_date: z.string().datetime({
    offset: true,
    message: "interview_date must be an ISO 8601 timestamp with timezone offset.",
  }),
  location_id: z.number().int().positive().nullable().optional(),
  conducted_by: z.number().int().positive(),
  notes: z.string().nullable().optional(),
  recording_path: z.string().nullable().optional(),
  transcript: transcriptSchema,
}).strict();

// ---------------------------------------------------------------------------
// Update schema — only mutable fields
// ---------------------------------------------------------------------------
export const updateInterviewSchema = z.object({
  interview_date: z.string().datetime({
    offset: true,
    message: "interview_date must be an ISO 8601 timestamp with timezone offset.",
  }).optional(),
  location_id: z.number().int().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
  recording_path: z.string().nullable().optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided." }
);
