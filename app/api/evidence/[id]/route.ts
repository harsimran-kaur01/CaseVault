
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const evidenceId = Number(id);

    if (!Number.isSafeInteger(evidenceId) || evidenceId <= 0) {
      return NextResponse.json(
        { error: "Invalid evidence ID." },
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

    const { data: evidence, error } = await supabase
      .from("evidence")
      .select(`
        evidence_id,
        case_id,
        crime_scene_id,
        evidence_code,
        description,
        evidence_type,
        condition_status,
        date_collected,
        collected_by,
        location_found_id,
        sealed,
        notes,
        current_holder_id,
        current_location_id
      `)
      .eq("evidence_id", evidenceId)
      .maybeSingle();

    if (error) {
      console.error("Evidence retrieval failed:", error.message);

      return NextResponse.json(
        { error: "Unable to retrieve evidence." },
        { status: 500 }
      );
    }

    if (!evidence) {
      return NextResponse.json(
        { error: "Evidence not found or access denied." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      evidence,
    });

  } catch (error) {
    console.error("GET /api/evidence/[id] failed:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
