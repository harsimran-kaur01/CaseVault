import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCrimeSceneSchema } from "@/lib/validation/crime-scene";

const PG_SELECT =
  "crime_scene_id, case_id, location_id, scene_name, description, date_visited, visited_by, notes";

// ---------------------------------------------------------------------------
// GET /api/crime-scenes
// Supports optional ?case_id= filter. Returns up to 50 records.
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const caseIdParam = searchParams.get("case_id");

    let query = supabase
      .from("crime_scene")
      .select(PG_SELECT)
      .order("date_visited", { ascending: false })
      .limit(50);

    if (caseIdParam !== null) {
      const caseId = Number(caseIdParam);
      if (!Number.isSafeInteger(caseId) || caseId <= 0) {
        return NextResponse.json(
          { error: "Invalid case_id filter value." },
          { status: 400 }
        );
      }
      query = query.eq("case_id", caseId);
    }

    const { data: crimeScenes, error: pgError } = await query;

    if (pgError) {
      console.error("Crime scene retrieval failed:", pgError.message);
      return NextResponse.json(
        { error: "Unable to retrieve crime scenes." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      total: crimeScenes.length,
      crime_scenes: crimeScenes,
    });
  } catch (error) {
    console.error("GET /api/crime-scenes failed:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/crime-scenes
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const validation = createCrimeSceneSchema.safeParse(body);
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

    const { data: crimeScene, error: insertError } = await supabase
      .from("crime_scene")
      .insert(validation.data)
      .select(PG_SELECT)
      .single();

    if (insertError) {
      console.error("Crime scene insert failed:", insertError.message);

      if (insertError.code === "42501") {
        return NextResponse.json(
          { error: "You do not have permission to create a crime scene." },
          { status: 403 }
        );
      }
      if (insertError.code === "23503") {
        return NextResponse.json(
          { error: "Invalid case_id, location_id, or visited_by reference." },
          { status: 400 }
        );
      }
      if (insertError.code === "23502") {
        return NextResponse.json(
          { error: "A required field is missing." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Unable to create crime scene." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Crime scene created successfully.",
        crime_scene: crimeScene,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/crime-scenes failed:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
