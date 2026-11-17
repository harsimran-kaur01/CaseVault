import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import clientPromise from "@/lib/mongodb";
import { createInterviewSchema } from "@/lib/validation/interview";
import { ObjectId } from "mongodb";

const MONGO_DB = process.env.MONGODB_DB!;
const MONGO_COLLECTION = "interview_transcripts";

const PG_SELECT =
  "interview_id, case_id, person_id, interview_date, location_id, conducted_by, notes, recording_path, mongo_transcript_id";

// ---------------------------------------------------------------------------
// GET /api/interviews
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { data: interviews, error: pgError } = await supabase
      .from("interview")
      .select(PG_SELECT)
      .order("interview_date", { ascending: false })
      .limit(50);

    if (pgError) {
      console.error("Interview retrieval failed:", pgError.message);
      return NextResponse.json(
        { error: "Unable to retrieve interviews." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      total: interviews.length,
      interviews,
    });
  } catch (error) {
    console.error("GET /api/interviews failed:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/interviews
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // Parse body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    // Validate
    const validation = createInterviewSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed.",
          details: validation.error.issues.map((i) => ({
            path: i.path,
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const {
      case_id,
      person_id,
      interview_date,
      location_id,
      conducted_by,
      notes,
      recording_path,
      transcript: transcriptPayload,
    } = validation.data;

    // -----------------------------------------------------------------------
    // Step 1: Insert PostgreSQL interview row
    // interview_id is IDENTITY-generated; mongo_transcript_id set after Mongo insert.
    // -----------------------------------------------------------------------
    const { data: pgInterview, error: pgInsertError } = await supabase
      .from("interview")
      .insert({
        case_id,
        person_id,
        interview_date,
        location_id: location_id ?? null,
        conducted_by,
        notes: notes ?? null,
        recording_path: recording_path ?? null,
      })
      .select(PG_SELECT)
      .single();

    if (pgInsertError) {
      console.error("Interview insert failed:", pgInsertError.message);

      if (pgInsertError.code === "42501") {
        return NextResponse.json(
          { error: "You do not have permission to create an interview." },
          { status: 403 }
        );
      }
      if (pgInsertError.code === "23503") {
        return NextResponse.json(
          { error: "Invalid case_id, person_id, conducted_by, or location_id reference." },
          { status: 400 }
        );
      }
      if (pgInsertError.code === "23502") {
        return NextResponse.json(
          { error: "A required field is missing." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Unable to create interview." },
        { status: 500 }
      );
    }

    // Use the server-generated IDs — do not trust client-supplied values.
    const { interview_id, case_id: pg_case_id, person_id: pg_person_id } = pgInterview;

    // -----------------------------------------------------------------------
    // Step 2: Insert MongoDB transcript document
    // -----------------------------------------------------------------------
    const mongo = (await clientPromise).db(MONGO_DB);
    const collection = mongo.collection(MONGO_COLLECTION);

    const mongoDoc = {
      interview_id,
      case_id: pg_case_id,
      person_id: pg_person_id,
      language: transcriptPayload.language,
      transcript: transcriptPayload.transcript,
      summary: transcriptPayload.summary,
      keywords: transcriptPayload.keywords,
      sentiment: transcriptPayload.sentiment,
      attachments: transcriptPayload.attachments,
      created_at: new Date(),
    };

    let mongoInsertedId: ObjectId;
    try {
      const mongoResult = await collection.insertOne(mongoDoc);
      mongoInsertedId = mongoResult.insertedId;
    } catch (mongoErr: unknown) {
      console.error("MongoDB transcript insert failed:", mongoErr);

      // Handle duplicate interview_id (unique index violation)
      const isDuplicate =
        typeof mongoErr === "object" &&
        mongoErr !== null &&
        "code" in mongoErr &&
        (mongoErr as { code: number }).code === 11000;

      // Compensating cleanup: remove the PostgreSQL row
      const { error: cleanupErr } = await supabase
        .from("interview")
        .delete()
        .eq("interview_id", interview_id);

      if (cleanupErr) {
        console.error(
          "PostgreSQL interview cleanup failed after MongoDB error:",
          cleanupErr.message
        );
      }

      if (isDuplicate) {
        return NextResponse.json(
          { error: "A transcript already exists for this interview." },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Failed to store interview transcript. PostgreSQL record rolled back." },
        { status: 500 }
      );
    }

    // -----------------------------------------------------------------------
    // Step 3: Update PostgreSQL mongo_transcript_id
    // -----------------------------------------------------------------------
    const mongoIdHex = mongoInsertedId.toHexString();
    const { data: finalInterview, error: updateErr } = await supabase
      .from("interview")
      .update({ mongo_transcript_id: mongoIdHex })
      .eq("interview_id", interview_id)
      .select(PG_SELECT)
      .single();

    if (updateErr) {
      console.error("mongo_transcript_id update failed:", updateErr.message);

      // Compensating cleanup: remove MongoDB document and PostgreSQL row
      try {
        await collection.deleteOne({ _id: mongoInsertedId });
      } catch (mongoCleanupErr) {
        console.error("MongoDB transcript cleanup failed:", mongoCleanupErr);
      }

      const { error: pgCleanupErr } = await supabase
        .from("interview")
        .delete()
        .eq("interview_id", interview_id);

      if (pgCleanupErr) {
        console.error(
          "PostgreSQL interview cleanup failed after link update error:",
          pgCleanupErr.message
        );
      }

      return NextResponse.json(
        {
          error:
            "Failed to link transcript to interview record. Both records rolled back.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Interview created successfully.",
        interview: finalInterview,
        mongo_document: { ...mongoDoc, _id: mongoInsertedId.toHexString() },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/interviews failed:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
