import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateCrimeSceneSchema } from "@/lib/validation/crime-scene";

type RouteContext = { params: Promise<{ id: string }> };

const PG_SELECT =
  "crime_scene_id, case_id, location_id, scene_name, description, date_visited, visited_by, notes";

// ---------------------------------------------------------------------------
// GET /api/crime-scenes/[id]
// ---------------------------------------------------------------------------
export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const crimeSceneId = Number(id);

    if (!Number.isSafeInteger(crimeSceneId) || crimeSceneId <= 0) {
      return NextResponse.json(
        { error: "Invalid crime scene ID." },
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

    const { data: crimeScene, error: pgError } = await supabase
      .from("crime_scene")
      .select(PG_SELECT)
      .eq("crime_scene_id", crimeSceneId)
      .maybeSingle();

    if (pgError) {
      console.error("Crime scene retrieval failed:", pgError.message);
      return NextResponse.json(
        { error: "Unable to retrieve crime scene." },
        { status: 500 }
      );
    }

    if (!crimeScene) {
      return NextResponse.json(
        { error: "Crime scene not found or access denied." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, crime_scene: crimeScene });
  } catch (error) {
    console.error("GET /api/crime-scenes/[id] failed:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/crime-scenes/[id]
// Updatable: scene_name, description, date_visited, visited_by, notes
// Not updatable: crime_scene_id, case_id, location_id
// ---------------------------------------------------------------------------
export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const crimeSceneId = Number(id);

    if (!Number.isSafeInteger(crimeSceneId) || crimeSceneId <= 0) {
      return NextResponse.json(
        { error: "Invalid crime scene ID." },
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

    const validation = updateCrimeSceneSchema.safeParse(body);
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

    const { data: crimeScene, error: updateError } = await supabase
      .from("crime_scene")
      .update(validation.data)
      .eq("crime_scene_id", crimeSceneId)
      .select(PG_SELECT)
      .maybeSingle();

    if (updateError) {
      console.error("Crime scene update failed:", updateError.message);

      if (updateError.code === "42501") {
        return NextResponse.json(
          { error: "You do not have permission to update this crime scene." },
          { status: 403 }
        );
      }
      if (updateError.code === "23503") {
        return NextResponse.json(
          { error: "Invalid visited_by reference." },
          { status: 400 }
        );
      }
      if (updateError.code === "22001") {
        return NextResponse.json(
          { error: "A field value exceeds the maximum allowed length." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Unable to update crime scene." },
        { status: 500 }
      );
    }

    if (!crimeScene) {
      return NextResponse.json(
        { error: "Crime scene not found or access denied." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, crime_scene: crimeScene });
  } catch (error) {
    console.error("PATCH /api/crime-scenes/[id] failed:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}


// ---------------------------------------------------------------------------
// DELETE /api/crime-scenes/[id]
// Admin only. Scenes linked to evidence cannot be deleted.
// ---------------------------------------------------------------------------
export async function DELETE(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const crimeSceneId = Number(id);

    if (!Number.isSafeInteger(crimeSceneId) || crimeSceneId <= 0) {
      return NextResponse.json(
        { error: "Invalid crime scene ID." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // Check whether the crime scene exists.
    const { data: crimeScene, error: lookupError } = await supabase
      .from("crime_scene")
      .select("crime_scene_id")
      .eq("crime_scene_id", crimeSceneId)
      .maybeSingle();

    if (lookupError) {
      console.error("Crime scene lookup failed:", lookupError.message);

      return NextResponse.json(
        { error: "Unable to retrieve crime scene." },
        { status: 500 }
      );
    }

    if (!crimeScene) {
      return NextResponse.json(
        { error: "Crime scene not found or access denied." },
        { status: 404 }
      );
    }

    // Check for dependent evidence records.
    const { data: linkedEvidence, error: evidenceError } = await supabase
      .from("evidence")
      .select("evidence_id")
      .eq("crime_scene_id", crimeSceneId)
      .limit(1);

    if (evidenceError) {
      console.error("Crime scene evidence lookup failed:", evidenceError.message);

      return NextResponse.json(
        { error: "Unable to verify associated evidence." },
        { status: 500 }
      );
    }

    if (linkedEvidence && linkedEvidence.length > 0) {
      return NextResponse.json(
        {
          error:
            "This crime scene cannot be deleted because evidence is associated with it.",
        },
        { status: 409 }
      );
    }

    // RLS enforces administrator-only deletion.
    const { data: deletedScene, error: deleteError } = await supabase
      .from("crime_scene")
      .delete()
      .eq("crime_scene_id", crimeSceneId)
      .select("crime_scene_id")
      .maybeSingle();

    if (deleteError) {
      console.error("Crime scene deletion failed:", deleteError.message);

      if (deleteError.code === "42501") {
        return NextResponse.json(
          { error: "You do not have permission to delete this crime scene." },
          { status: 403 }
        );
      }

      if (deleteError.code === "23503") {
        return NextResponse.json(
          {
            error:
              "This crime scene cannot be deleted because dependent records exist.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Unable to delete crime scene." },
        { status: 500 }
      );
    }

    if (!deletedScene) {
      return NextResponse.json(
        { error: "Crime scene not found or deletion not permitted." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Crime scene deleted successfully.",
      crime_scene_id: deletedScene.crime_scene_id,
    });
  } catch (error) {
    console.error("DELETE /api/crime-scenes/[id] failed:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
