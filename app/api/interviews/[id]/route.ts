import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import clientPromise from "@/lib/mongodb";
import { updateInterviewSchema } from "@/lib/validation/interview";
import { ObjectId } from "mongodb";

type RouteContext = { params: Promise<{ id: string }> };

const MONGO_DB = process.env.MONGODB_DB!;
const MONGO_COLLECTION = "interview_transcripts";

const PG_SELECT =
  "interview_id, case_id, person_id, interview_date, location_id, conducted_by, notes, recording_path, mongo_transcript_id";

// ---------------------------------------------------------------------------
// GET /api/interviews/[id]
// ---------------------------------------------------------------------------
export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const interviewId = Number(id);

    if (!Number.isSafeInteger(interviewId) || interviewId <= 0) {
      return NextResponse.json(
        { error: "Invalid interview ID." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { data: interview, error: pgError } = await supabase
      .from("interview")
      .select(PG_SELECT)
      .eq("interview_id", interviewId)
      .maybeSingle();

    if (pgError) {
      console.error("Interview retrieval failed:", pgError.message);
      return NextResponse.json(
        { error: "Unable to retrieve interview." },
        { status: 500 }
      );
    }

    if (!interview) {
      return NextResponse.json(
        { error: "Interview not found or access denied." },
        { status: 404 }
      );
    }

    // Fetch MongoDB transcript if linked.
    // Trim trailing spaces — PostgreSQL char(24) pads with spaces.
    const rawMongoId = interview.mongo_transcript_id;
    const trimmedMongoId = rawMongoId ? rawMongoId.trim() : null;

    if (!trimmedMongoId) {
      return NextResponse.json({
        success: true,
        interview,
        mongo_document: null,
      });
    }

    let mongoDoc = null;
    try {
      const mongo = (await clientPromise).db(MONGO_DB);
      const doc = await mongo
        .collection(MONGO_COLLECTION)
        .findOne({ _id: new ObjectId(trimmedMongoId) });

      if (doc) {
        // Serialize ObjectId to string for JSON response
        mongoDoc = { ...doc, _id: doc._id.toHexString() };
      }
    } catch (mongoErr) {
      // Log but do not expose details — return the PG record with null transcript
      console.error("MongoDB transcript fetch failed:", mongoErr);
    }

    if (!mongoDoc) {
      console.warn(`MongoDB transcript missing for interview_id ${interviewId}`);
      return NextResponse.json({
        success: true,
        interview,
        mongo_document: null,
        warning: "Interview transcript not found.",
      });
    }

    return NextResponse.json({
      success: true,
      interview,
      mongo_document: mongoDoc,
    });
  } catch (error) {
    console.error("GET /api/interviews/[id] failed:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/interviews/[id]
// ---------------------------------------------------------------------------
export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const interviewId = Number(id);

    if (!Number.isSafeInteger(interviewId) || interviewId <= 0) {
      return NextResponse.json(
        { error: "Invalid interview ID." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const validation = updateInterviewSchema.safeParse(body);
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

    const { data: interview, error: updateError } = await supabase
      .from("interview")
      .update(validation.data)
      .eq("interview_id", interviewId)
      .select(PG_SELECT)
      .maybeSingle();

    if (updateError) {
      console.error("Interview update failed:", updateError.message);

      if (updateError.code === "42501") {
        return NextResponse.json(
          { error: "You do not have permission to update this interview." },
          { status: 403 }
        );
      }
      if (updateError.code === "23503") {
        return NextResponse.json(
          { error: "Invalid location_id reference." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Unable to update interview." },
        { status: 500 }
      );
    }

    if (!interview) {
      return NextResponse.json(
        { error: "Interview not found or access denied." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, interview });
  } catch (error) {
    console.error("PATCH /api/interviews/[id] failed:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
