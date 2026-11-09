
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import clientPromise from "@/lib/mongodb";
import { createEvidenceMetadataSchema } from "@/lib/validation/evidence-metadata";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/evidence/[id]/metadata
export async function GET(
  request: Request,
  { params }: RouteContext
) {
  try {
    // 1. Validate evidence ID
    const { id } = await params;
    const evidenceId = Number(id);

    if (!Number.isSafeInteger(evidenceId) || evidenceId <= 0) {
      return NextResponse.json(
        { error: "Invalid evidence ID." },
        { status: 400 }
      );
    }

    // 2. Authenticate user
    const supabase = await createClient();

    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // 3. Verify evidence exists and is accessible through PostgreSQL
    const { data: evidence, error: evidenceError } = await supabase
      .from("evidence")
      .select("evidence_id, evidence_type")
      .eq("evidence_id", evidenceId)
      .maybeSingle();

    if (evidenceError) {
      console.error("Evidence lookup failed:", evidenceError.message);

      return NextResponse.json(
        { error: "Unable to verify evidence record." },
        { status: 500 }
      );
    }

    if (!evidence) {
      return NextResponse.json(
        { error: "Evidence not found or access denied." },
        { status: 404 }
      );
    }

    // 4. Retrieve metadata from MongoDB
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "casevault");

    const metadata = await db
      .collection("evidence_metadata")
      .findOne({ evidence_id: evidenceId });

    if (!metadata) {
      return NextResponse.json(
        { error: "Metadata not found for this evidence." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      metadata,
    });

  } catch (error) {
    console.error("GET evidence metadata failed:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}


// POST /api/evidence/[id]/metadata
export async function POST(
  request: Request,
  { params }: RouteContext
) {
  try {
    // 1. Validate evidence ID
    const { id } = await params;
    const evidenceId = Number(id);

    if (!Number.isSafeInteger(evidenceId) || evidenceId <= 0) {
      return NextResponse.json(
        { error: "Invalid evidence ID." },
        { status: 400 }
      );
    }

    // 2. Authenticate user
    const supabase = await createClient();

    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // 3. Parse request body
    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    // 4. Validate metadata
    const validation =
      createEvidenceMetadataSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed.",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // 5. Verify evidence exists and is accessible through PostgreSQL
    const { data: evidence, error: evidenceError } = await supabase
      .from("evidence")
      .select("evidence_id, evidence_type")
      .eq("evidence_id", evidenceId)
      .maybeSingle();

    if (evidenceError) {
      console.error("Evidence lookup failed:", evidenceError.message);

      return NextResponse.json(
        { error: "Unable to verify evidence record." },
        { status: 500 }
      );
    }

    if (!evidence) {
      return NextResponse.json(
        { error: "Evidence not found or access denied." },
        { status: 404 }
      );
    }

    // 6. Insert metadata into MongoDB
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "casevault");

    const metadataDocument = {
      evidence_id: evidence.evidence_id,
      evidence_type: evidence.evidence_type,
      attributes: validation.data.attributes,
      tags: validation.data.tags,
    };

    try {
      const result = await db
        .collection("evidence_metadata")
        .insertOne(metadataDocument);

      return NextResponse.json(
        {
          success: true,
          message: "Evidence metadata created successfully.",
          metadata: {
            _id: result.insertedId,
            ...metadataDocument,
          },
        },
        { status: 201 }
      );

    } catch (mongoError: unknown) {
      const mongoCode = (mongoError as { code?: number })?.code;

      if (mongoCode === 11000) {
        return NextResponse.json(
          {
            error: "Metadata already exists for this evidence.",
          },
          { status: 409 }
        );
      }

      throw mongoError;
    }

  } catch (error) {
    console.error("POST evidence metadata failed:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
